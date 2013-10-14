///<reference path="../../../src/harness/harness.ts" />
///<reference path="../runnerbase.ts" />

class UnitTestRunner extends RunnerBase {

    constructor(public testType?: string) {
        super(testType);
    }

    public initializeTests() {
        switch (this.testType) {
            case 'compiler':
                this.tests = this.enumerateFiles('tests/cases/unittests/compiler');
                break;
            case 'ls':
                this.tests = this.enumerateFiles('tests/cases/unittests/ls');
                break;
            case 'services':
                this.tests = this.enumerateFiles('tests/cases/unittests/services');
                break;
            case 'harness':
                this.tests = this.enumerateFiles('tests/cases/unittests/harness');
                break;
            case 'samples':
                this.tests = this.enumerateFiles('tests/cases/unittests/samples');
                break;
            default:
                if (this.tests.length === 0) {
                    throw new Error('Unsupported test cases: ' + this.testType);
                }
                break;
        }

        var outfile = new Harness.Compiler.WriterAggregator()
        var outerr = new Harness.Compiler.WriterAggregator();
        var harnessCompiler = Harness.Compiler.getCompiler(Harness.Compiler.CompilerInstance.DesignTime);

        var toBeAdded = this.tests.map(test => {
            return { unitName: test, content: IO.readFile(test, /*codepage:*/ null).contents }
        });
        harnessCompiler.addInputFiles(toBeAdded);
        harnessCompiler.compile(false);
        
        var stdout = new Harness.Compiler.EmitterIOHost();
        var emitDiagnostics = harnessCompiler.emitAll(stdout);
        var results = stdout.toArray();
        var lines: string[] = [];
        results.forEach(v => lines = lines.concat(v.file.lines));
        var code = lines.join("\n")

        describe("Setup compiler for compiler unittests", () => {
            var useMinimalDefaultLib = this.testType !== 'samples'
            Harness.Compiler.recreate(Harness.Compiler.CompilerInstance.RunTime, useMinimalDefaultLib);
        });
        
        if (typeof require !== "undefined") {
            var vm = require('vm');
            vm.runInNewContext(code,
                {
                    require: require,
                    TypeScript: TypeScript,
                    process: process,
                    describe: describe,
                    it: it,
                    assert: Harness.Assert,
                    Harness: Harness,
                    IO: IO,
                    Exec: Exec,
                    Services: Services,
                    // Formatting: Formatting,
                    Diff: Diff,
                    FourSlash: FourSlash
                },
                "generated_test_code.js"
            );
        } else {
            eval(code);
        }

        // make sure the next unittestrunner doesn't include the previous one's stuff
        Harness.Compiler.recreate(Harness.Compiler.CompilerInstance.DesignTime);
    }
}