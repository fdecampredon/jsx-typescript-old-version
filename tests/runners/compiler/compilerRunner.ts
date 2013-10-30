/// <reference path='..\..\..\src\harness\harness.ts' />
/// <reference path='..\..\..\src\compiler\diagnostics.ts' />
/// <reference path='..\runnerBase.ts' />
/// <reference path='typeWriter.ts' />

enum CompilerTestType {
    Conformance,
    Regressions
}

class CompilerBaselineRunner extends RunnerBase {
    private basePath = 'tests/cases';
    private errors: boolean;
    private emit: boolean;
    private decl: boolean;
    private output: boolean;

    public options: string;

    constructor(public testType?: CompilerTestType) {
        super();
        this.errors = true;
        this.emit = true;
        this.decl = true;
        this.output = true;
        if (testType === CompilerTestType.Conformance) {
            this.basePath += '/conformance';
        }
        else if (testType === CompilerTestType.Regressions) {
            this.basePath += '/compiler';
        } else {
            this.basePath += '/compiler'; // default to this for historical reasons
        }
    }    

    /** Replaces instances of full paths with filenames only */
    static removeFullPaths(text: string) {
        var fullPath = /(\w+:)?(\/|\\)([\w+\-\.]|\/)*\.ts/g;
        var fullPathList = text.match(fullPath);
        if (fullPathList) {
            fullPathList.forEach((match: string) => text = text.replace(match, Harness.getFileName(match)));
        }
        return text;
    }

    public checkTestCodeOutput(fileName: string) {
        // strips the fileName from the path.
        var justName = fileName.replace(/^.*[\\\/]/, '');
        var content = TypeScript.IO.readFile(fileName, /*codepage:*/ null).contents;
        var testCaseContent = Harness.TestCaseParser.makeUnitsFromTest(content, fileName);

        var units = testCaseContent.testUnitData;
        var tcSettings = testCaseContent.settings;
        var createNewInstance = false;

        var lastUnit = units[units.length - 1];

        describe('JS output and errors for ' + fileName, () => {
            Harness.Assert.bugs(content);

            /** Compiled JavaScript emit, if any */
            var jsOutput = '';
            /** Source map content, if any */
            var sourceMapContent = "";
            /** Newline-delimited string describing compilation errors */
            var errorDescription = '';

            var createNewInstance = false;

            var harnessCompiler = Harness.Compiler.getCompiler(Harness.Compiler.CompilerInstance.RunTime);
            for (var i = 0; i < tcSettings.length; ++i) {
                // The compiler doesn't handle certain flags flipping during a single compilation setting. Tests on these flags will need 
                // a fresh compiler instance for themselves and then create a fresh one for the next test. Would be nice to get dev fixes
                // eventually to remove this limitation.
                if (!createNewInstance && (tcSettings[i].flag == "noimplicitany" || tcSettings[i].flag === 'target')) {                    
                    Harness.Compiler.recreate(Harness.Compiler.CompilerInstance.RunTime, { useMinimalDefaultLib: true, noImplicitAny: tcSettings[i].flag == "noimplicitany" });
                    harnessCompiler.setCompilerSettings(tcSettings);
                    createNewInstance = true;
                }
            }

            // We need to assemble the list of input files for the compiler and other related files on the 'filesystem' (ie in a multi-file test)
            // If the last file in a test uses require or a triple slash reference we'll assume all other files will be brought in via references,
            // otherwise, assume all files are just meant to be in the same compilation session without explicit references to one another.
            var toBeCompiled: { unitName: string; content: string }[] = [];
            var otherFiles: { unitName: string; content: string }[] = [];
            if (/require\(/.test(lastUnit.content) || /reference\spath/.test(lastUnit.content)) {
                toBeCompiled.push({ unitName: 'tests/cases/compiler/' + lastUnit.name, content: lastUnit.content });
                units.forEach(unit => {
                    if (unit.name !== lastUnit.name) {
                        otherFiles.push({ unitName: 'tests/cases/compiler/' + unit.name, content: unit.content });
                    }
                });
            } else {
                toBeCompiled = units.map(unit => {
                    return { unitName: 'tests/cases/compiler/' + unit.name, content: unit.content };
                });
            }

            var result: Harness.Compiler.CompilerResult;
            harnessCompiler.compileFiles(toBeCompiled, otherFiles, function (compileResult) {
                result = compileResult;
            }, function (settings) {
                harnessCompiler.setCompilerSettings(tcSettings);
            });

            // check errors
            if (this.errors) {
                // Surface some errors that indicate test authoring failure
                var badErrors = result.errors.filter(err => err.errorType === Harness.Compiler.ErrorType.Emit);
                if (badErrors.length > 0) {
                    throw new Error('Emit errors in ' + fileName + ': ' + badErrors.map(e => JSON.stringify(e)).join('\r\n'));
                }

                Harness.Baseline.runBaseline('Correct errors for ' + fileName, justName.replace(/\.ts/, '.errors.txt'), () => {
                    if (result.errors.length === 0) {
                        return null;
                    } else {
                        var errorDescr = result.errors.map(err => CompilerBaselineRunner.removeFullPaths(Harness.getFileName(err.fileName) + ' line ' + err.line + ' col ' + err.column + ': ' + err.message)).join('\r\n');
                        return errorDescr;
                    }
                });
            }

            // if the .d.ts is non-empty, confirm it compiles correctly as well
            if (this.decl && result.declFilesCode.length > 0 && result.errors.length === 0) {
                var declErrors: string[] = undefined;

                var declOtherFiles: { unitName: string; content: string }[] = [];

                // use other files if it is dts
                for (var i = 0; i < otherFiles.length; i++) {
                    if (TypeScript.isDTSFile(otherFiles[i].unitName)) {
                        declOtherFiles.push(otherFiles[i]);
                    }
                }

                for (var i = 0; i < result.declFilesCode.length; i++) {
                    var declCode = result.declFilesCode[i];
                    // don't want to use the fullpath for the unitName or the file won't be resolved correctly
                    var declFile = { unitName: 'tests/cases/compiler/' + Harness.getFileName(declCode.fileName), content: declCode.code };
                    if (i != result.declFilesCode.length - 1) {
                        declOtherFiles.push(declFile);
                    }
                }

                harnessCompiler.compileFiles(
                    [declFile],
                    declOtherFiles,
                    function (result) {
                        declErrors = result.errors.map(err => Harness.getFileName(err.fileName) + ' line ' + err.line + ' col ' + err.column + ': ' + err.message + '\r\n');
                    },
                    function (settings) {
                        harnessCompiler.setCompilerSettings(tcSettings);
                    });

                if (declErrors && declErrors.length) {
                    throw new Error('.d.ts file output of ' + fileName + ' did not compile. Errors: ' + declErrors.map(err => JSON.stringify(err)).join('\r\n'));
                }
            }

            if (!TypeScript.isDTSFile(lastUnit.name)) {
                if (this.emit) {
                    if (result.files.length === 0) {
                        throw new Error('Expected at least 1 js file to be emitted');
                    }

                    // check js output
                    Harness.Baseline.runBaseline('Correct JS output for ' + fileName, justName.replace(/\.ts/, '.js'), () => {
                        var code = '';
                        for (var i = 0; i < result.files.length; i++) {
                            if (result.files.length > 1 || result.declFilesCode.length > 0) {
                                code += '//// [' + Harness.getFileName(result.files[i].fileName) + ']\r\n';
                            }
                            code += result.files[i].code;
                        }

                        if (result.declFilesCode.length > 0) {
                            code += '\r\n\r\n';
                            for (var i = 0; i < result.files.length; i++) {
                                code += result.declFilesCode[i].code;
                            }
                        }
                        return code;
                    });
                }
            }

            if (result.errors.length === 0) {
                Harness.Baseline.runBaseline('Correct expression types for ' + fileName, justName.replace(/\.ts/, '.types'), () => {
                    var compiler = new TypeScript.TypeScriptCompiler(
                        new TypeScript.NullLogger(), TypeScript.ImmutableCompilationSettings.defaultSettings());

                    compiler.addFile('lib.d.ts', TypeScript.ScriptSnapshot.fromString(Harness.Compiler.libTextMinimal),
                        TypeScript.ByteOrderMark.None, /*version:*/ 0, /*isOpen:*/ true);

                    var allFiles = toBeCompiled.concat(otherFiles);
                    allFiles.forEach(file => {
                        compiler.addFile(file.unitName, TypeScript.ScriptSnapshot.fromString(file.content),
                            TypeScript.ByteOrderMark.None, /*version:*/ 0, /*isOpen:*/ true);
                    });

                    allFiles.forEach(file => {
                        compiler.getSemanticDiagnostics(file.unitName);
                    });

                    var typeLines: string[] = [];
                    allFiles.forEach(file => {
                        typeLines.push('=== ' + file.unitName + ' ===');
                        var walker = new TypeWriterWalker(file.unitName, compiler);
                        walker.run();
                        walker.results.forEach(line => typeLines.push(line));
                    });

                    return typeLines.join('\r\n');
                });
            }

            if (createNewInstance) {
                Harness.Compiler.recreate(Harness.Compiler.CompilerInstance.RunTime, { useMinimalDefaultLib: true, noImplicitAny: false });
                createNewInstance = false;
            }
        });
    }

    public initializeTests() {       
        describe("Setup compiler for compiler baselines", () => {
            // REVIEW: would like to use the minimal lib.d.ts but a bunch of tests need to be converted to use non-DOM APIs
            Harness.Compiler.recreate(Harness.Compiler.CompilerInstance.RunTime, { useMinimalDefaultLib: true, noImplicitAny: false });
            this.parseOptions();
        });

        if (this.tests.length === 0) {
            var testFiles = this.enumerateFiles(this.basePath, { recursive: true });
            testFiles.forEach(fn => {
                fn = fn.replace(/\\/g, "/");
                this.checkTestCodeOutput(fn);
            });
        }
        else {
            this.tests.forEach(test => this.checkTestCodeOutput(test));
        }
    }

    private parseOptions() {
        if (this.options && this.options.length > 0) {
            this.errors = false;
            this.emit = false;
            this.decl = false;
            this.output = false;

            var opts = this.options.split(',');
            for (var i = 0; i < opts.length; i++) {
                switch (opts[i]) {
                    case 'error':
                        this.errors = true;
                        break;
                    case 'emit':
                        this.emit = true;
                        break;
                    case 'decl':
                        this.decl = true;
                        break;
                    case 'output':
                        this.output = true;
                        break;
                    default:
                        throw new Error('unsupported flag');
                }
            }
        }
    }
}