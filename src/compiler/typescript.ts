//
// Copyright (c) Microsoft Corporation.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

///<reference path='resources\references.ts' />
///<reference path='core\references.ts' />
///<reference path='text\references.ts' />
///<reference path='syntax\references.ts' />
///<reference path='diagnostics.ts' />
///<reference path='flags.ts' />
///<reference path='nodeTypes.ts' />
///<reference path='hashTable.ts' />
///<reference path='ast.ts' />
///<reference path='astWalker.ts' />
///<reference path='astPath.ts' />
///<reference path='base64.ts' />
///<reference path='sourceMapping.ts' />
///<reference path='emitter.ts' />
///<reference path='types.ts' />
///<reference path='pathUtils.ts' />
///<reference path='referenceResolution.ts' />
///<reference path='precompile.ts' />
///<reference path='referenceResolver.ts' />
///<reference path='declarationEmitter.ts' />
///<reference path='bloomFilter.ts' />
///<reference path='identifierWalker.ts' />
///<reference path='typecheck\dataMap.ts' />
///<reference path='typecheck\pullFlags.ts' />
///<reference path='typecheck\pullDecls.ts' />
///<reference path='typecheck\pullSymbols.ts' />
///<reference path='typecheck\pullSymbolBindingContext.ts' />
///<reference path='typecheck\pullTypeResolutionContext.ts' />
///<reference path='typecheck\pullTypeResolution.ts' />
///<reference path='typecheck\pullSemanticInfo.ts' />
///<reference path='typecheck\pullDeclCollection.ts' />
///<reference path='typecheck\pullSymbolBinder.ts' />
///<reference path='typecheck\pullHelpers.ts' />
///<reference path='syntaxTreeToAstVisitor.ts' />

module TypeScript {

    declare var IO: any;

    export var fileResolutionTime = 0;
    export var sourceCharactersCompiled = 0;
    export var syntaxTreeParseTime = 0;
    export var syntaxDiagnosticsTime = 0;
    export var astTranslationTime = 0;
    export var typeCheckTime = 0;

    export var emitTime = 0;
    export var emitWriteFileTime = 0;
    export var emitDirectoryExistsTime = 0;
    export var emitFileExistsTime = 0;
    export var emitResolvePathTime = 0;

    export var declarationEmitTime = 0;
    export var declarationEmitIsExternallyVisibleTime = 0;
    export var declarationEmitTypeSignatureTime = 0;
    export var declarationEmitGetBoundDeclTypeTime = 0;
    export var declarationEmitIsOverloadedCallSignatureTime = 0;
    export var declarationEmitFunctionDeclarationGetSymbolTime = 0;
    export var declarationEmitGetBaseTypeTime = 0;
    export var declarationEmitGetAccessorFunctionTime = 0;
    export var declarationEmitGetTypeParameterSymbolTime = 0;
    export var declarationEmitGetImportDeclarationSymbolTime = 0;

    export var ioHostResolvePathTime = 0;
    export var ioHostDirectoryNameTime = 0;
    export var ioHostCreateDirectoryStructureTime = 0;
    export var ioHostWriteFileTime = 0;

    export interface EmitterIOHost {
        // function that can even create a folder structure if needed
        writeFile(path: string, contents: string, writeByteOrderMark: boolean): void;

        // function to check if file exists on the disk
        fileExists(path: string): boolean;

        // Function to check if the directory exists on the disk
        directoryExists(path: string): boolean;

        // Resolves the path
        resolvePath(path: string): string;
    }

    export interface PullTypeInfoAtPositionInfo {
        symbol: PullSymbol;
        ast: IAST;
        enclosingScopeSymbol: PullSymbol;
        candidateSignature: PullSignatureSymbol;
        callSignatures: PullSignatureSymbol[];
        isConstructorCall: boolean;
    }

    export interface PullSymbolInfo {
        symbol: PullSymbol;
        aliasSymbol: PullTypeAliasSymbol;
        ast: AST;
        enclosingScopeSymbol: PullSymbol;
    }

    export interface PullCallSymbolInfo {
        targetSymbol: PullSymbol;
        resolvedSignatures: TypeScript.PullSignatureSymbol[];
        candidateSignature: TypeScript.PullSignatureSymbol;
        isConstructorCall: boolean;
        ast: AST;
        enclosingScopeSymbol: PullSymbol;
    }

    export interface PullVisibleSymbolsInfo {
        symbols: PullSymbol[];
        enclosingScopeSymbol: PullSymbol;
    }

    export class Document {
        private _diagnostics: Diagnostic[] = null;
        private _syntaxTree: SyntaxTree = null;
        private _bloomFilter: BloomFilter = null;
        public script: Script;
        public lineMap: LineMap;

        constructor(public fileName: string,
                    private compilationSettings: CompilationSettings,
                    public scriptSnapshot: IScriptSnapshot,
                    public byteOrderMark: ByteOrderMark,
                    public version: number,
                    public isOpen: boolean,
                    syntaxTree: SyntaxTree) {

            if (isOpen) {
                this._syntaxTree = syntaxTree;
            }
            else {
                // Don't store the syntax tree for a closed file.
                var start = new Date().getTime();
                this._diagnostics = syntaxTree.diagnostics();
                TypeScript.syntaxDiagnosticsTime += new Date().getTime() - start;
            }

            this.lineMap = syntaxTree.lineMap();

            var start = new Date().getTime();
            this.script = SyntaxTreeToAstVisitor.visit(syntaxTree, fileName, compilationSettings, isOpen);
            TypeScript.astTranslationTime += new Date().getTime() - start;
        }

        public diagnostics(): Diagnostic[] {
            if (this._diagnostics === null) {
                this._diagnostics = this._syntaxTree.diagnostics();
            }

            return this._diagnostics;
        }

        public syntaxTree(): SyntaxTree {
            if (this._syntaxTree) {
                return this._syntaxTree;
            }

            return Parser.parse(
                this.fileName,
                SimpleText.fromScriptSnapshot(this.scriptSnapshot),
                TypeScript.isDTSFile(this.fileName),
                getParseOptions(this.compilationSettings));
        }

        public bloomFilter(): BloomFilter {
            if (!this._bloomFilter) {
                var identifiers = new BlockIntrinsics<boolean>();
                var pre = function (cur: TypeScript.AST, parent: TypeScript.AST, walker: IAstWalker) {
                    if (isValidAstNode(cur)) {
                        if (cur.nodeType() === NodeType.Name) {
                            var nodeText = (<TypeScript.Identifier>cur).text();

                            identifiers[nodeText] = true;
                        }
                    }

                    return cur;
                };

                TypeScript.getAstWalkerFactory().walk(this.script, pre, null, null, identifiers);

                var identifierCount = 0;
                for (var name in identifiers) {
                    if (identifiers[name]) {
                        identifierCount++;
                    }
                }

                this._bloomFilter = new BloomFilter(identifierCount);
                this._bloomFilter.addKeys(identifiers);
            }
            return this._bloomFilter;
        }

        public update(scriptSnapshot: IScriptSnapshot, version: number, isOpen: boolean, textChangeRange: TextChangeRange, settings: CompilationSettings): Document {

            var oldScript = this.script;
            var oldSyntaxTree = this._syntaxTree;

            var text = SimpleText.fromScriptSnapshot(scriptSnapshot);

            // If we don't have a text change, or we don't have an old syntax tree, then do a full
            // parse.  Otherwise, do an incremental parse.
            var newSyntaxTree = textChangeRange === null || oldSyntaxTree === null
                ? TypeScript.Parser.parse(this.fileName, text, TypeScript.isDTSFile(this.fileName), getParseOptions(this.compilationSettings))
                : TypeScript.Parser.incrementalParse(oldSyntaxTree, textChangeRange, text);

            return new Document(this.fileName, this.compilationSettings, scriptSnapshot, this.byteOrderMark, version, isOpen, newSyntaxTree);
        }

        public static create(fileName: string, scriptSnapshot: IScriptSnapshot, byteOrderMark: ByteOrderMark, version: number, isOpen: boolean, referencedFiles: string[], compilationSettings: CompilationSettings): Document {
            // for an open file, make a syntax tree and a script, and store both around.
            var start = new Date().getTime();
            var syntaxTree = Parser.parse(fileName, SimpleText.fromScriptSnapshot(scriptSnapshot), TypeScript.isDTSFile(fileName), getParseOptions(compilationSettings));
            TypeScript.syntaxTreeParseTime += new Date().getTime() - start;

            var document = new Document(fileName, compilationSettings, scriptSnapshot, byteOrderMark, version, isOpen, syntaxTree);
            document.script.referencedFiles = referencedFiles;

            return document;
        }

        //public static fromClosed(fileName: string, scriptSnapshot: IScriptSnapshot, script: Script, syntaxTree: SyntaxTree): Document {
        //    return new Document(fileName, scriptSnapshot, script, null, syntaxTree.diagnostics());
        //}
    }

    export var globalSemanticInfoChain: SemanticInfoChain = null;
    export var globalBinder: PullSymbolBinder = null;
    export var globalLogger: ILogger = null;

    export var useDirectTypeStorage = false;

    export class TypeScriptCompiler {

        public resolver: PullTypeResolver = null;

        public semanticInfoChain: SemanticInfoChain = null;

        public emitOptions: EmitOptions;

        public fileNameToDocument = new TypeScript.StringHashTable<Document>();

        constructor(public logger: ILogger = new NullLogger(),
                    public settings: CompilationSettings = new CompilationSettings()) {
            this.emitOptions = new EmitOptions(this.settings);
            globalLogger = logger;
        }

        public getDocument(fileName: string): Document {
            return this.fileNameToDocument.lookup(TypeScript.switchToForwardSlashes(fileName));
        }

        public timeFunction(funcDescription: string, func: () => any): any {
            return TypeScript.timeFunction(this.logger, funcDescription, func);
        }

        public addSourceUnit(fileName: string,
            scriptSnapshot: IScriptSnapshot,
            byteOrderMark: ByteOrderMark,
            version: number,
            isOpen: boolean,
            referencedFiles: string[]= []): Document {

            fileName = TypeScript.switchToForwardSlashes(fileName);

            TypeScript.sourceCharactersCompiled += scriptSnapshot.getLength();

            var document = Document.create(fileName, scriptSnapshot, byteOrderMark, version, isOpen, referencedFiles, this.emitOptions.compilationSettings);
            this.fileNameToDocument.addOrUpdate(fileName, document);

            return document;
        }

        public updateSourceUnit(fileName: string, scriptSnapshot: IScriptSnapshot, version: number, isOpen: boolean, textChangeRange: TextChangeRange): Document {
            fileName = TypeScript.switchToForwardSlashes(fileName);
            return this.timeFunction("pullUpdateUnit(" + fileName + ")", () => {
                var document = this.getDocument(fileName);
                var updatedDocument = document.update(scriptSnapshot, version, isOpen, textChangeRange, this.settings);

                this.fileNameToDocument.addOrUpdate(fileName, updatedDocument);

                this.pullUpdateScript(document, updatedDocument);

                return updatedDocument;
            });
        }

        private isDynamicModuleCompilation(): boolean {
            var fileNames = this.fileNameToDocument.getAllKeys();
            for (var i = 0, n = fileNames.length; i < n; i++) {
                var document = this.getDocument(fileNames[i]);
                var script = document.script;
                if (!script.isDeclareFile && script.topLevelMod !== null) {
                    return true;
                }
            }
            return false;
        }

        private updateCommonDirectoryPath(): Diagnostic {
            var commonComponents: string[] = [];
            var commonComponentsLength = -1;

            var fileNames = this.fileNameToDocument.getAllKeys();
            for (var i = 0, len = fileNames.length; i < len; i++) {
                var fileName = fileNames[i];
                var document = this.getDocument(fileNames[i]);
                var script = document.script;

                if (!script.isDeclareFile) {
                    var fileComponents = filePathComponents(fileName);
                    if (commonComponentsLength === -1) {
                        // First time at finding common path
                        // So common path = directory of file
                        commonComponents = fileComponents;
                        commonComponentsLength = commonComponents.length;
                    } else {
                        var updatedPath = false;
                        for (var j = 0; j < commonComponentsLength && j < fileComponents.length; j++) {
                            if (commonComponents[j] !== fileComponents[j]) {
                                // The new components = 0 ... j -1
                                commonComponentsLength = j;
                                updatedPath = true;

                                if (j === 0) {
                                    if (this.emitOptions.compilationSettings.outDirOption || this.emitOptions.compilationSettings.sourceRoot) {
                                        // Its error to not have common path
                                        return new Diagnostic(null, 0, 0, DiagnosticCode.Cannot_find_the_common_subdirectory_path_for_the_input_files, null);
                                    } else {
                                        this.emitOptions.commonDirectoryPath = "";
                                        return null;
                                    }
                                }

                                break;
                            }
                        }

                        // If the fileComponent path completely matched and less than already found update the length
                        if (!updatedPath && fileComponents.length < commonComponentsLength) {
                            commonComponentsLength = fileComponents.length;
                        }
                    }
                }
            }

            this.emitOptions.commonDirectoryPath = commonComponents.slice(0, commonComponentsLength).join("/") + "/";
            return null;
        }

        public setEmitOptions(ioHost: EmitterIOHost): Diagnostic {
            this.emitOptions.ioHost = ioHost;

            if (this.emitOptions.compilationSettings.moduleGenTarget === ModuleGenTarget.Unspecified && this.isDynamicModuleCompilation()) {
                return new Diagnostic(null, 0, 0, DiagnosticCode.Cannot_compile_external_modules_unless_the_module_flag_is_provided, null);
            }

            if (!this.emitOptions.compilationSettings.mapSourceFiles) {
                // Error to specify --mapRoot or --sourceRoot without mapSourceFiles
                if (this.emitOptions.compilationSettings.mapRoot) {
                    if (this.emitOptions.compilationSettings.sourceRoot) {
                        return new Diagnostic(null, 0, 0, DiagnosticCode.Options_mapRoot_and_sourceRoot_cannot_be_specified_without_specifying_sourcemap_option, null);
                    } else {
                        return new Diagnostic(null, 0, 0, DiagnosticCode.Option_mapRoot_cannot_be_specified_without_specifying_sourcemap_option, null);
                    }
                } else if (this.emitOptions.compilationSettings.sourceRoot) {
                    return new Diagnostic(null, 0, 0, DiagnosticCode.Option_sourceRoot_cannot_be_specified_without_specifying_sourcemap_option, null);
                }
            }

            this.emitOptions.compilationSettings.mapRoot = convertToDirectoryPath(switchToForwardSlashes(this.emitOptions.compilationSettings.mapRoot));
            this.emitOptions.compilationSettings.sourceRoot = convertToDirectoryPath(switchToForwardSlashes(this.emitOptions.compilationSettings.sourceRoot));

            if (!this.emitOptions.compilationSettings.outFileOption && !this.emitOptions.compilationSettings.outDirOption && !this.emitOptions.compilationSettings.mapRoot && !this.emitOptions.compilationSettings.sourceRoot) {
                this.emitOptions.outputMany = true;
                this.emitOptions.commonDirectoryPath = "";
                return null;
            }

            if (this.emitOptions.compilationSettings.outFileOption) {
                this.emitOptions.compilationSettings.outFileOption = switchToForwardSlashes(this.emitOptions.ioHost.resolvePath(this.emitOptions.compilationSettings.outFileOption));
                this.emitOptions.outputMany = false;
            } else {
                this.emitOptions.outputMany = true;
            } 

            if (this.emitOptions.compilationSettings.outDirOption) {
                this.emitOptions.compilationSettings.outDirOption = switchToForwardSlashes(this.emitOptions.ioHost.resolvePath(this.emitOptions.compilationSettings.outDirOption));
                this.emitOptions.compilationSettings.outDirOption = convertToDirectoryPath(this.emitOptions.compilationSettings.outDirOption);
            }
           
            // Parse the directory structure
            if (this.emitOptions.compilationSettings.outDirOption || this.emitOptions.compilationSettings.mapRoot || this.emitOptions.compilationSettings.sourceRoot) {
                return this.updateCommonDirectoryPath();
            }

            return null;
        }

        public getScripts(): Script[] {
            var result: TypeScript.Script[] = [];
            var fileNames = this.fileNameToDocument.getAllKeys();

            for (var i = 0, n = fileNames.length; i < n; i++) {
                var document = this.getDocument(fileNames[i]);
                result.push(document.script);
            }

            return result;
        }

        public getDocuments(): Document[] {
            var result: TypeScript.Document[] = [];
            var fileNames = this.fileNameToDocument.getAllKeys();

            for (var i = 0, n = fileNames.length; i < n; i++) {
                var document = this.getDocument(fileNames[i]);
                result.push(document);
            }

            return result;
        }

        private writeByteOrderMarkForDocument(document: Document) {
            // If module its always emitted in its own file
            if (this.emitOptions.outputMany || document.script.topLevelMod) {
                return document.byteOrderMark !== ByteOrderMark.None;
            } else {
                var fileNames = this.fileNameToDocument.getAllKeys();

                for (var i = 0, n = fileNames.length; i < n; i++) {
                    if (document.script.topLevelMod) {
                        // Dynamic module never contributes to the single file
                        continue;
                    }
                    var document = this.getDocument(fileNames[i]);
                    if (document.byteOrderMark !== ByteOrderMark.None) {
                        return true;
                    }
                }

                return false;
            }
        }

        static mapToDTSFileName(fileName: string, wholeFileNameReplaced: boolean) {
            return getDeclareFilePath(fileName);
        }

        public shouldEmitDeclarations(script?: Script) {
            if (!this.settings.generateDeclarationFiles) {
                return false;
            }

            // If its already a declare file or is resident or does not contain body 
            if (!!script && (script.isDeclareFile || script.moduleElements === null)) {
                return false;
            }

            return true;
        }

        // Caller is responsible for closing emitter.
        private emitDeclarations(document: Document, declarationEmitter?: DeclarationEmitter): DeclarationEmitter {
            var script = document.script;
            if (this.shouldEmitDeclarations(script)) {
                if (declarationEmitter) {
                    declarationEmitter.document = document;
                } else {
                    var declareFileName = this.emitOptions.mapOutputFileName(document, TypeScriptCompiler.mapToDTSFileName);
                    declarationEmitter = new DeclarationEmitter(declareFileName, document, this);
                }

                declarationEmitter.emitDeclarations(script);
            }

            return declarationEmitter;
        }

        // Will not throw exceptions.
        public emitAllDeclarations(): Diagnostic[] {
            var start = new Date().getTime();

            if (this.shouldEmitDeclarations()) {
                var sharedEmitter: DeclarationEmitter = null;
                var fileNames = this.fileNameToDocument.getAllKeys();

                for (var i = 0, n = fileNames.length; i < n; i++) {
                    var fileName = fileNames[i];

                    try {
                        var document = this.getDocument(fileNames[i]);

                        // Emitting module or multiple files, always goes to single file
                        if (this.emitOptions.outputMany || document.script.topLevelMod) {
                            var singleEmitter = this.emitDeclarations(document);
                            if (singleEmitter) {
                                singleEmitter.close();
                            }
                        }
                        else {
                            // Create or reuse file
                            sharedEmitter = this.emitDeclarations(document, sharedEmitter);
                        }
                    }
                    catch (ex1) {
                        return Emitter.handleEmitterError(fileName, ex1);
                    }
                }

                if (sharedEmitter) {
                    try {
                        sharedEmitter.close();
                    }
                    catch (ex2) {
                        return Emitter.handleEmitterError(sharedEmitter.document.fileName, ex2);
                    }
                }
            }

            declarationEmitTime += new Date().getTime() - start;

            return [];
        }

        // Will not throw exceptions.
        public emitUnitDeclarations(fileName: string): Diagnostic[] {
            var document = this.getDocument(fileName);

            if (this.shouldEmitDeclarations(document.script)) {
                // Emitting module or multiple files, always goes to single file
                if (this.emitOptions.outputMany || document.script.topLevelMod) {
                    try {
                        var emitter = this.emitDeclarations(document);
                        if (emitter) {
                            emitter.close();
                        }
                    }
                    catch (ex1) {
                        return Emitter.handleEmitterError(fileName, ex1);
                    }
                }
                else
                {
                    return this.emitAllDeclarations();
                }
            }

            return [];
        }

        static mapToFileNameExtension(extension: string, fileName: string, wholeFileNameReplaced: boolean) {
            if (wholeFileNameReplaced) {
                // The complete output is redirected in this file so do not change extension
                return fileName;
            } else {
                // Change the extension of the file
                var splitFname = fileName.split(".");
                splitFname.pop();
                return splitFname.join(".") + extension;
            }
        }

        static mapToJSFileName(fileName: string, wholeFileNameReplaced: boolean) {
            return TypeScriptCompiler.mapToFileNameExtension(".js", fileName, wholeFileNameReplaced);
        }

        // Caller is responsible for closing the returned emitter.
        // May throw exceptions.
        private emit(document: Document,
                     inputOutputMapper?: (inputName: string, outputName: string) => void ,
                     emitter?: Emitter): Emitter {

            var script = document.script;
            if (!script.isDeclareFile) {
                var typeScriptFileName = document.fileName;
                if (!emitter) {
                    var javaScriptFileName = this.emitOptions.mapOutputFileName(document, TypeScriptCompiler.mapToJSFileName);
                    var outFile = this.createFile(javaScriptFileName, this.writeByteOrderMarkForDocument(document));

                    emitter = new Emitter(javaScriptFileName, outFile, this.emitOptions, this.semanticInfoChain);

                    if (this.settings.mapSourceFiles) {
                        // We always create map files next to the jsFiles
                        var sourceMapFile = this.createFile(javaScriptFileName + SourceMapper.MapFileExtension, /*writeByteOrderMark:*/ false); 
                        emitter.createSourceMapper(document, javaScriptFileName, outFile, sourceMapFile);
                    }

                    if (inputOutputMapper) {
                        // Remember the name of the outfile for this source file
                        inputOutputMapper(typeScriptFileName, javaScriptFileName);
                    }
                }
                else if (this.settings.mapSourceFiles) {
                    // Already emitting into js file, update the mapper for new source info
                    emitter.setSourceMapperNewSourceFile(document);
                }

                // Set location info
                emitter.setDocument(document);
                emitter.emitJavascript(script, /*startLine:*/false);
            }

            return emitter;
        }

        // Will not throw exceptions.
        public emitAll(ioHost: EmitterIOHost, inputOutputMapper?: (inputFile: string, outputFile: string) => void ): Diagnostic[] {
            var start = new Date().getTime();

            var optionsDiagnostic = this.setEmitOptions(ioHost);
            if (optionsDiagnostic) {
                return [optionsDiagnostic];
            }

            var fileNames = this.fileNameToDocument.getAllKeys();
            var sharedEmitter: Emitter = null;

            // Iterate through the files, as long as we don't get an error.
            for (var i = 0, n = fileNames.length; i < n; i++) {
                var fileName = fileNames[i];

                var document = this.getDocument(fileName);

                try {
                    // Emitting module or multiple files, always goes to single file
                    if (this.emitOptions.outputMany || document.script.topLevelMod) {
                        // We're outputting to mulitple files.  We don't want to reuse an emitter in that case.
                        var singleEmitter = this.emit(document, inputOutputMapper);

                        // Close the emitter after each emitted file.
                        if (singleEmitter) {
                            singleEmitter.emitSourceMapsAndClose();
                        }
                    }
                    else {
                        // We're not outputting to multiple files.  Keep using the same emitter and don't
                        // close until below.
                        sharedEmitter = this.emit(document, inputOutputMapper, sharedEmitter);
                    }
                }
                catch (ex1) {
                    return Emitter.handleEmitterError(fileName, ex1);
                }
            }

            if (sharedEmitter) {
                try {
                    sharedEmitter.emitSourceMapsAndClose();
                }
                catch (ex2) {
                    return Emitter.handleEmitterError(sharedEmitter.document.fileName, ex2);
                }
            }

            emitTime += new Date().getTime() - start;
            return [];
        }

        // Emit single file if outputMany is specified, else emit all
        // Will not throw exceptions.
        public emitUnit(fileName: string, ioHost: EmitterIOHost, inputOutputMapper?: (inputFile: string, outputFile: string) => void ): Diagnostic[] {
            var optionsDiagnostic = this.setEmitOptions(ioHost);
            if (optionsDiagnostic) {
                return [optionsDiagnostic];
            }

            var document = this.getDocument(fileName);
            // Emitting module or multiple files, always goes to single file
            if (this.emitOptions.outputMany || document.script.topLevelMod) {
                // In outputMany mode, only emit the document specified and its sourceMap if needed
                try {
                    var emitter = this.emit(document, inputOutputMapper);

                    // Close the emitter
                    if (emitter) {
                        emitter.emitSourceMapsAndClose();
                    }
                }
                catch (ex1) {
                    return Emitter.handleEmitterError(fileName, ex1);
                }

                return [];
            }
            else {
                // In output Single file mode, emit everything
                return this.emitAll(ioHost, inputOutputMapper);
            }
        }

        private createFile(fileName: string, writeByteOrderMark: boolean): ITextWriter {
            return new TextWriter(this.emitOptions.ioHost, fileName, writeByteOrderMark);
        }

        //
        // Pull typecheck infrastructure
        //

        public getSyntacticDiagnostics(fileName: string): Diagnostic[]{
            return this.getDocument(fileName).diagnostics();
        }

        /** Used for diagnostics in tests */
        private getSyntaxTree(fileName: string): SyntaxTree {
            return this.getDocument(fileName).syntaxTree();
        }
        private getScript(fileName: string): Script {
            return this.getDocument(fileName).script;
        }

        public getSemanticDiagnostics(fileName: string): Diagnostic[] {
            var errors: Diagnostic[] = [];
            var unit = this.semanticInfoChain.getUnit(fileName);

            globalSemanticInfoChain = this.semanticInfoChain;
            if (globalBinder) {
                globalBinder.semanticInfoChain = this.semanticInfoChain;
            }

            if (unit) {
                var document = this.getDocument(fileName);
                var script = document.script;

                if (script) {
                    var startTime = (new Date()).getTime();
                    PullTypeResolver.typeCheck(this.settings, this.semanticInfoChain, fileName, script)
                    var endTime = (new Date()).getTime();

                    typeCheckTime += endTime - startTime;

                    unit.getDiagnostics(errors);
                }
            }

            errors = ArrayUtilities.distinct(errors, Diagnostic.equals);
            errors.sort((d1, d2) => {
                if (d1.fileName() < d2.fileName()) {
                    return -1;
                }
                else if (d1.fileName() > d2.fileName()) {
                    return 1;
                }

                if (d1.start() < d2.start()) {
                    return -1;
                }
                else if (d1.start() > d2.start()) {
                    return 1;
                }

                // For multiple errors reported on the same file at the same position.
                var code1 = diagnosticInformationMap[d1.diagnosticKey()].code;
                var code2 = diagnosticInformationMap[d2.diagnosticKey()].code;
                if (code1 < code2) {
                    return -1;
                }
                else if (code1 > code2) {
                    return 1;
                }

                return 0;
            });

            return errors;
        }

        public resolveAllFiles() {
            var fileNames = this.fileNameToDocument.getAllKeys();
            for (var i = 0, n = fileNames.length; i < n; i++) {
                this.getSemanticDiagnostics(fileNames[i]);
            }
        }

        public setUnit(unitPath: string) {
            if (!this.resolver) {
                this.resolver = new PullTypeResolver(this.settings, this.semanticInfoChain, unitPath);
            }

            this.resolver.setUnitPath(unitPath);
        }

        public pullTypeCheck() {
            var start = new Date().getTime();

            this.semanticInfoChain = new SemanticInfoChain();
            globalSemanticInfoChain = this.semanticInfoChain;

            if (this.resolver) {
                this.resolver.semanticInfoChain = this.semanticInfoChain;
            }

            var declCollectionContext: DeclCollectionContext = null;
            var i: number, n: number;

            var createDeclsStartTime = new Date().getTime();

            var fileNames = this.fileNameToDocument.getAllKeys();
            var n = fileNames.length;
            for (var i = 0; i < n; i++) {
                var fileName = fileNames[i];
                var document = this.getDocument(fileName);
                var semanticInfo = new SemanticInfo(fileName);

                declCollectionContext = new DeclCollectionContext(semanticInfo, fileName);

                // create decls
                getAstWalkerFactory().walk(document.script, preCollectDecls, postCollectDecls, null, declCollectionContext);

                semanticInfo.addTopLevelDecl(declCollectionContext.getParent());

                this.semanticInfoChain.addUnit(semanticInfo);
            }

            var createDeclsEndTime = new Date().getTime();

            // bind declaration symbols
            var bindStartTime = new Date().getTime();

            var binder = new PullSymbolBinder(this.semanticInfoChain);
            globalBinder = binder;

            // start at '1', so as to skip binding for global primitives such as 'any'
            for (var i = 1; i < this.semanticInfoChain.units.length; i++) {
                binder.bindDeclsForUnit(this.semanticInfoChain.units[i].getPath());
            }

            var bindEndTime = new Date().getTime();

            this.logger.log("Decl creation: " + (createDeclsEndTime - createDeclsStartTime));
            this.logger.log("Binding: " + (bindEndTime - bindStartTime));
            this.logger.log("    Time in findSymbol: " + time_in_findSymbol);
            this.logger.log("Number of symbols created: " + pullSymbolID);
            this.logger.log("Number of specialized types created: " + nSpecializationsCreated);
            this.logger.log("Number of specialized signatures created: " + nSpecializedSignaturesCreated);
        }

        private pullUpdateScript(oldDocument: Document, newDocument: Document): void {
            this.timeFunction("pullUpdateScript: ", () => {

                var oldScript = oldDocument.script;
                var newScript = newDocument.script;
                
                // want to name the new script semantic info the same as the old one
                var newScriptSemanticInfo = new SemanticInfo(oldDocument.fileName);
                var oldScriptSemanticInfo = this.semanticInfoChain.getUnit(oldDocument.fileName);

                lastBoundPullDeclId = pullDeclID;

                var declCollectionContext = new DeclCollectionContext(newScriptSemanticInfo, oldDocument.fileName);

                // create decls
                getAstWalkerFactory().walk(newScript, preCollectDecls, postCollectDecls, null, declCollectionContext);

                var oldTopLevelDecl = oldScriptSemanticInfo.getTopLevelDecl();
                var newTopLevelDecl = declCollectionContext.getParent();

                newScriptSemanticInfo.addTopLevelDecl(newTopLevelDecl);

                // If we havne't yet created a new resolver, clean any cached symbols
                if (this.resolver) {
                    this.resolver.cleanCachedGlobals();
                }

                // replace the old semantic info               
                this.semanticInfoChain.updateUnit(oldScriptSemanticInfo, newScriptSemanticInfo);

                this.logger.log("Cleaning symbols...");
                var cleanStart = new Date().getTime();
                this.semanticInfoChain.update();
                var cleanEnd = new Date().getTime();
                this.logger.log("   time to clean: " +(cleanEnd - cleanStart));

                // reset the resolver's current unit, since we've replaced those decls they won't
                // be cleaned
                if (this.resolver) {
                    this.resolver.setUnitPath(oldDocument.fileName);
                }
            } );
        }

        public getSymbolOfDeclaration(decl: PullDecl): PullSymbol {
            if (!decl) {
                return null;
            }

            var ast = this.resolver.getASTForDecl(decl);
            if (!ast) {
                return null;
            }

            var enlosingDecl = this.resolver.getEnclosingDecl(decl);
            if (ast.nodeType() === NodeType.Member) {
                return this.getSymbolOfDeclaration(enlosingDecl);
            }

            return this.resolver.resolveAST(ast, /*inContextuallyTypedAssignment:*/false, enlosingDecl, new PullTypeResolutionContext(this.resolver));
        }

        public resolvePosition(pos: number, document: Document): PullTypeInfoAtPositionInfo {

            // find the enclosing decl
            var declStack: PullDecl[] = [];
            var resultASTs: AST[] = [];
            var script = document.script;
            var scriptName = document.fileName;

            var semanticInfo = this.semanticInfoChain.getUnit(scriptName);
            var lastDeclAST: AST = null;
            var foundAST: AST = null;
            var symbol: PullSymbol = null;
            var candidateSignature: PullSignatureSymbol = null;
            var callSignatures: PullSignatureSymbol[] = null;

            // these are used to track intermediate nodes so that we can properly apply contextual types
            var lambdaAST: FunctionDeclaration = null;
            var declarationInitASTs: VariableDeclarator[] = [];
            var objectLitAST: UnaryExpression = null;
            var asgAST: BinaryExpression = null;
            var typeAssertionASTs: UnaryExpression[] = [];
            var resolutionContext = new PullTypeResolutionContext(this.resolver);
            var inTypeReference = false;
            var enclosingDecl: PullDecl = null;
            var isConstructorCall = false;

            globalSemanticInfoChain = this.semanticInfoChain;
            if (globalBinder) {
                globalBinder.semanticInfoChain = this.semanticInfoChain;
            }            

            var pre = (cur: AST, parent: AST): AST => {
                if (isValidAstNode(cur)) {
                    if (pos >= cur.minChar && pos <= cur.limChar) {

                        var previous = resultASTs[resultASTs.length - 1];

                        if (previous === undefined || (cur.minChar >= previous.minChar && cur.limChar <= previous.limChar)) {

                            var decl = semanticInfo.getDeclForAST(cur);

                            if (decl) {
                                declStack[declStack.length] = decl;
                                lastDeclAST = cur;
                            }

                            if (cur.nodeType() === NodeType.FunctionDeclaration && hasFlag((<FunctionDeclaration>cur).getFunctionFlags(), FunctionFlags.IsFunctionExpression)) {
                                lambdaAST = <FunctionDeclaration>cur;
                            }
                            else if (cur.nodeType() === NodeType.VariableDeclarator) {
                                declarationInitASTs[declarationInitASTs.length] = <VariableDeclarator>cur;
                            }
                            else if (cur.nodeType() === NodeType.ObjectLiteralExpression) {
                                objectLitAST = <UnaryExpression>cur;
                            }
                            else if (cur.nodeType() === NodeType.CastExpression) {
                                typeAssertionASTs[typeAssertionASTs.length] = <UnaryExpression>cur;
                            }
                            else if (cur.nodeType() === NodeType.AssignmentExpression) {
                                asgAST = <BinaryExpression>cur;
                            }
                            else if (cur.nodeType() === NodeType.TypeRef) {
                                inTypeReference = true;
                            }

                            resultASTs[resultASTs.length] = cur;
                        }
                    }
                }
                return cur;
            };

            getAstWalkerFactory().walk(script, pre);

            if (resultASTs.length) {

                this.setUnit(scriptName);

                foundAST = resultASTs[resultASTs.length - 1];

                // Check if is a name of a container
                if (foundAST.nodeType() === NodeType.Name && resultASTs.length > 1) {
                    var previousAST = resultASTs[resultASTs.length - 2];
                    switch (previousAST.nodeType()) {
                        case NodeType.InterfaceDeclaration:
                            if (foundAST === (<InterfaceDeclaration>previousAST).name) {
                                foundAST = previousAST;
                            }
                            break;
                        case NodeType.ClassDeclaration:
                            if (foundAST === (<ClassDeclaration>previousAST).name) {
                                foundAST = previousAST;
                            }
                            break;
                        case NodeType.ModuleDeclaration:
                            if (foundAST === (<ModuleDeclaration>previousAST).name) {
                                foundAST = previousAST;
                            }
                            break;

                        case NodeType.VariableDeclarator:
                            if (foundAST === (<VariableDeclarator>previousAST).id) {
                                foundAST = previousAST;
                            }
                            break;

                        case NodeType.FunctionDeclaration:
                            if (foundAST === (<FunctionDeclaration>previousAST).name) {
                                foundAST = previousAST;
                            }
                            break;
                    }
                }

                // are we within a decl?  if so, just grab its symbol
                var funcDecl: FunctionDeclaration = null;
                if (lastDeclAST === foundAST) {
                    symbol = declStack[declStack.length - 1].getSymbol();
                    this.resolver.resolveDeclaredSymbol(symbol, null, resolutionContext);
                    symbol.setUnresolved();
                    enclosingDecl = declStack[declStack.length - 1].getParentDecl();
                    if (foundAST.nodeType() === NodeType.FunctionDeclaration) {
                        funcDecl = <FunctionDeclaration>foundAST;
                    }
                }
                else {
                    // otherwise, it's an expression that needs to be resolved, so we must pull...

                    // first, find the enclosing decl
                    for (var i = declStack.length - 1; i >= 0; i--) {
                        if (!(declStack[i].kind & (PullElementKind.Variable | PullElementKind.Parameter))) {
                            enclosingDecl = declStack[i];
                            break;
                        }
                    }

                    // next, obtain the assigning AST, if applicable
                    // (this would be the ast for the last decl on the decl stack)

                    // if the found AST is a named, we want to check for previous dotted expressions,
                    // since those will give us the right typing
                    var callExpression: ICallExpression = null;
                    if ((foundAST.nodeType() === NodeType.SuperExpression || foundAST.nodeType() === NodeType.ThisExpression || foundAST.nodeType() === NodeType.Name) &&
                    resultASTs.length > 1) {
                        for (var i = resultASTs.length - 2; i >= 0; i--) {
                            if (resultASTs[i].nodeType() === NodeType.MemberAccessExpression &&
                            (<BinaryExpression>resultASTs[i]).operand2 === resultASTs[i + 1]) {
                                foundAST = resultASTs[i];
                            }
                            else if ((resultASTs[i].nodeType() === NodeType.InvocationExpression || resultASTs[i].nodeType() === NodeType.ObjectCreationExpression) &&
                                (<InvocationExpression>resultASTs[i]).target === resultASTs[i + 1]) {
                                callExpression = <ICallExpression><any>resultASTs[i];
                                break;
                            } else if (resultASTs[i].nodeType() === NodeType.FunctionDeclaration && (<FunctionDeclaration>resultASTs[i]).name === resultASTs[i + 1]) {
                                funcDecl = <FunctionDeclaration>resultASTs[i];
                                break;
                            } else {
                                break;
                            }
                        }
                    }

                    // if it's a list, we may not have an exact AST, so find the next nearest one
                    if (foundAST.nodeType() === NodeType.List) {
                        for (var i = 0; i < (<ASTList>foundAST).members.length; i++) {
                            if ((<ASTList>foundAST).members[i].minChar > pos) {
                                foundAST = (<ASTList>foundAST).members[i];
                                break;
                            }
                        }
                    }

                    resolutionContext.resolvingTypeReference = inTypeReference;

                    var inContextuallyTypedAssignment = false;

                    if (declarationInitASTs.length) {
                        var assigningAST: VariableDeclarator;

                        for (var i = 0; i < declarationInitASTs.length; i++) {

                            assigningAST = declarationInitASTs[i];
                            inContextuallyTypedAssignment = (assigningAST !== null) && (assigningAST.typeExpr !== null);

                            this.resolver.resolveAST(assigningAST, /*inContextuallyTypedAssignment:*/false, null, resolutionContext);
                            var varSymbol = this.semanticInfoChain.getSymbolForAST(assigningAST, scriptName);

                            if (varSymbol && inContextuallyTypedAssignment) {
                                var contextualType = varSymbol.type;
                                resolutionContext.pushContextualType(contextualType, false, null);
                            }

                            if (assigningAST.init) {
                                this.resolver.resolveAST(assigningAST.init, inContextuallyTypedAssignment, enclosingDecl, resolutionContext);
                            }
                        }
                    }

                    if (typeAssertionASTs.length) {
                        for (var i = 0; i < typeAssertionASTs.length; i++) {
                            this.resolver.resolveAST(typeAssertionASTs[i], inContextuallyTypedAssignment, enclosingDecl, resolutionContext);
                        }
                    }

                    if (asgAST) {
                        this.resolver.resolveAST(asgAST, inContextuallyTypedAssignment, enclosingDecl, resolutionContext);
                    }

                    if (objectLitAST) {
                        this.resolver.resolveAST(objectLitAST, inContextuallyTypedAssignment, enclosingDecl, resolutionContext);
                    }

                    if (lambdaAST) {
                        this.resolver.resolveAST(lambdaAST, true, enclosingDecl, resolutionContext);
                        enclosingDecl = semanticInfo.getDeclForAST(lambdaAST);
                    }

                    symbol = this.resolver.resolveAST(foundAST, inContextuallyTypedAssignment, enclosingDecl, resolutionContext);
                    if (callExpression) {
                        var isPropertyOrVar = symbol.kind === PullElementKind.Property || symbol.kind === PullElementKind.Variable;
                        var typeSymbol = symbol.type;
                        if (isPropertyOrVar) {
                            isPropertyOrVar = (typeSymbol.kind !== PullElementKind.Interface && typeSymbol.kind !== PullElementKind.ObjectType) || typeSymbol.name === "";
                        }

                        if (!isPropertyOrVar) {
                            isConstructorCall = foundAST.nodeType() === NodeType.SuperExpression || callExpression.nodeType() === NodeType.ObjectCreationExpression;

                            if (foundAST.nodeType() === NodeType.SuperExpression) {
                                if (symbol.kind === PullElementKind.Class) {
                                    callSignatures = (<PullTypeSymbol>symbol).getConstructorMethod().type.getConstructSignatures();
                                }
                            } else {
                                callSignatures = callExpression.nodeType() === NodeType.InvocationExpression ? typeSymbol.getCallSignatures() : typeSymbol.getConstructSignatures();
                            }

                            var callResolutionResults = new PullAdditionalCallResolutionData();
                            if (callExpression.nodeType() === NodeType.InvocationExpression) {
                                this.resolver.resolveInvocationExpression(<InvocationExpression>callExpression, inContextuallyTypedAssignment, enclosingDecl, resolutionContext, callResolutionResults);
                            } else {
                                this.resolver.resolveObjectCreationExpression(<ObjectCreationExpression>callExpression, inContextuallyTypedAssignment, enclosingDecl, resolutionContext, callResolutionResults);
                            }

                            if (callResolutionResults.candidateSignature) {
                                candidateSignature = callResolutionResults.candidateSignature;
                            }
                            if (callResolutionResults.targetSymbol && callResolutionResults.targetSymbol.name !== "") {
                                symbol = callResolutionResults.targetSymbol;
                            }
                            foundAST = <AST><any>callExpression;
                        }
                    }
                }

                if (funcDecl) {
                    if (symbol && symbol.kind !== PullElementKind.Property) {
                        var signatureInfo = PullHelpers.getSignatureForFuncDecl(funcDecl, this.semanticInfoChain.getUnit(scriptName));
                        candidateSignature = signatureInfo.signature;
                        callSignatures = signatureInfo.allSignatures;
                    }
                } else if (!callSignatures && symbol &&
                (symbol.kind === PullElementKind.Method || symbol.kind === PullElementKind.Function)) {
                    var typeSym = symbol.type;
                    if (typeSym) {
                        callSignatures = typeSym.getCallSignatures();
                    }
                }
            }

            var enclosingScopeSymbol = this.getSymbolOfDeclaration(enclosingDecl);

            return {
                symbol: symbol,
                ast: foundAST,
                enclosingScopeSymbol: enclosingScopeSymbol,
                candidateSignature: candidateSignature,
                callSignatures: callSignatures,
                isConstructorCall: isConstructorCall
            };
        }

        private extractResolutionContextFromPath(path: AstPath, document: Document, propagateContextualTypes: boolean): { ast: AST; enclosingDecl: PullDecl; resolutionContext: PullTypeResolutionContext; inContextuallyTypedAssignment: boolean; } {
            var script = document.script;
            var scriptName = document.fileName;

            var semanticInfo = this.semanticInfoChain.getUnit(scriptName);
            var enclosingDecl: PullDecl = null;
            var enclosingDeclAST: AST = null;
            var inContextuallyTypedAssignment = false;

            globalSemanticInfoChain = this.semanticInfoChain;
            if (globalBinder) {
                globalBinder.semanticInfoChain = this.semanticInfoChain;
            }

            var resolutionContext = new PullTypeResolutionContext(this.resolver);
            resolutionContext.resolveAggressively = true;

            if (path.count() === 0) {
                return null;
            }

            this.setUnit(semanticInfo.getPath());

            // Extract infromation from path
            for (var i = 0 , n = path.count(); i < n; i++) {
                var current = path.asts[i];

                switch (current.nodeType()) {
                    case NodeType.FunctionDeclaration:
                        // A function expression does not have a decl, so we need to resolve it first to get the decl created.
                        if (hasFlag((<FunctionDeclaration>current).getFunctionFlags(), FunctionFlags.IsFunctionExpression)) {
                            this.resolver.resolveAST((<FunctionDeclaration>current), true, enclosingDecl, resolutionContext);
                        }

                        break;

                    case NodeType.VariableDeclarator:
                        var assigningAST = <VariableDeclarator> current;
                        inContextuallyTypedAssignment = (assigningAST.typeExpr !== null);

                        if (inContextuallyTypedAssignment) {
                            if (propagateContextualTypes) {
                                this.resolver.resolveAST(assigningAST, /*inContextuallyTypedAssignment*/false, null, resolutionContext);
                                var varSymbol = this.semanticInfoChain.getSymbolForAST(assigningAST, scriptName);

                                var contextualType: PullTypeSymbol = null;
                                if (varSymbol && inContextuallyTypedAssignment) {
                                    contextualType = varSymbol.type;
                                }

                                resolutionContext.pushContextualType(contextualType, false, null);

                                if (assigningAST.init) {
                                    this.resolver.resolveAST(assigningAST.init, inContextuallyTypedAssignment, enclosingDecl, resolutionContext);
                                }
                            }
                        }

                        break;

                    case NodeType.InvocationExpression:
                    case NodeType.ObjectCreationExpression:
                        if (propagateContextualTypes) {
                            var isNew = current.nodeType() === NodeType.ObjectCreationExpression;
                            var callExpression = <InvocationExpression>current;
                            var contextualType: PullTypeSymbol = null;

                            // Check if we are in an argumnt for a call, propagate the contextual typing
                            if ((i + 1 < n) && callExpression.arguments === path.asts[i + 1]) {
                                var callResolutionResults = new PullAdditionalCallResolutionData();
                                if (isNew) {
                                    this.resolver.resolveObjectCreationExpression(callExpression, inContextuallyTypedAssignment, enclosingDecl, resolutionContext, callResolutionResults);
                                }
                                else {
                                    this.resolver.resolveInvocationExpression(callExpression, inContextuallyTypedAssignment, enclosingDecl, resolutionContext, callResolutionResults);
                                }

                                // Find the index in the arguments list
                                if (callResolutionResults.actualParametersContextTypeSymbols) {
                                    var argExpression = (path.asts[i + 1] && path.asts[i + 1].nodeType() === NodeType.List) ? path.asts[i + 2] : path.asts[i + 1];
                                    if (argExpression) {
                                        for (var j = 0, m = callExpression.arguments.members.length; j < m; j++) {
                                            if (callExpression.arguments.members[j] === argExpression) {
                                                var callContextualType = callResolutionResults.actualParametersContextTypeSymbols[j];
                                                if (callContextualType) {
                                                    contextualType = callContextualType;
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            else {
                                // Just resolve the call expression
                                if (isNew) {
                                    this.resolver.resolveObjectCreationExpression(callExpression, inContextuallyTypedAssignment, enclosingDecl, resolutionContext);
                                }
                                else {
                                    this.resolver.resolveInvocationExpression(callExpression, inContextuallyTypedAssignment, enclosingDecl, resolutionContext);
                                }
                            }

                            resolutionContext.pushContextualType(contextualType, false, null);
                        }

                        break;

                    case NodeType.ArrayLiteralExpression:
                        if (propagateContextualTypes) {
                            // Propagate the child element type
                            var contextualType: PullTypeSymbol = null;
                            var currentContextualType = resolutionContext.getContextualType();
                            if (currentContextualType && currentContextualType.isArray()) {
                                contextualType = currentContextualType.getElementType();
                            }

                            resolutionContext.pushContextualType(contextualType, false, null);
                        }

                        break;

                    case NodeType.ObjectLiteralExpression:
                        if (propagateContextualTypes) {
                            var objectLiteralExpression = <UnaryExpression>current;
                            var objectLiteralResolutionContext = new PullAdditionalObjectLiteralResolutionData();
                            this.resolver.resolveObjectLiteralExpression(objectLiteralExpression, inContextuallyTypedAssignment, enclosingDecl, resolutionContext, objectLiteralResolutionContext);

                            // find the member in the path
                            var memeberAST = (path.asts[i + 1] && path.asts[i + 1].nodeType() === NodeType.List) ? path.asts[i + 2] : path.asts[i + 1];
                            if (memeberAST) {
                                // Propagate the member contextual type
                                var contextualType: PullTypeSymbol = null;
                                var memberDecls = <ASTList>objectLiteralExpression.operand;
                                if (memberDecls && objectLiteralResolutionContext.membersContextTypeSymbols) {
                                    for (var j = 0, m = memberDecls.members.length; j < m; j++) {
                                        if (memberDecls.members[j] === memeberAST) {
                                            var memberContextualType = objectLiteralResolutionContext.membersContextTypeSymbols[j];
                                            if (memberContextualType) {
                                                contextualType = memberContextualType;
                                                break;
                                            }
                                        }
                                    }
                                }

                                resolutionContext.pushContextualType(contextualType, false, null);
                            }
                        }

                        break;

                    case NodeType.AssignmentExpression:
                        if (propagateContextualTypes) {
                            var assignmentExpression = <BinaryExpression>current;
                            var contextualType: PullTypeSymbol = null;

                            if (path.asts[i + 1] && path.asts[i + 1] === assignmentExpression.operand2) {
                                // propagate the left hand side type as a contextual type
                                var leftType = this.resolver.resolveAST(assignmentExpression.operand1, inContextuallyTypedAssignment, enclosingDecl, resolutionContext).type;
                                if (leftType) {
                                    inContextuallyTypedAssignment = true;
                                    contextualType = leftType;
                                }
                            }

                            resolutionContext.pushContextualType(contextualType, false, null);
                        }

                        break;

                    case NodeType.CastExpression:
                        var castExpression = <UnaryExpression>current;

                        if (!(i + 1 < n && path.asts[i + 1] === castExpression.castTerm)) {
                            // We are outside the cast term
                            if (propagateContextualTypes) {
                                var contextualType: PullTypeSymbol = null;
                                var typeSymbol = this.resolver.resolveCastExpression(castExpression, enclosingDecl, resolutionContext);

                                // Set the context type
                                if (typeSymbol) {
                                    inContextuallyTypedAssignment = true;
                                    contextualType = typeSymbol;
                                }

                                resolutionContext.pushContextualType(contextualType, false, null);
                            }
                        }

                        break;

                    case NodeType.ReturnStatement:
                        if (propagateContextualTypes) {
                            var returnStatement = <ReturnStatement>current;
                            var contextualType: PullTypeSymbol = null;

                            if (enclosingDecl && (enclosingDecl.kind & PullElementKind.SomeFunction)) {
                                var functionDeclaration = <FunctionDeclaration>enclosingDeclAST;
                                if (functionDeclaration.returnTypeAnnotation) {
                                    // The containing function has a type annotation, propagate it as the contextual type
                                    var currentResolvingTypeReference = resolutionContext.resolvingTypeReference;
                                    resolutionContext.resolvingTypeReference = true;
                                    var returnTypeSymbol = this.resolver.resolveTypeReference(<TypeReference>functionDeclaration.returnTypeAnnotation, enclosingDecl, resolutionContext);
                                    resolutionContext.resolvingTypeReference = currentResolvingTypeReference;
                                    if (returnTypeSymbol) {
                                        inContextuallyTypedAssignment = true;
                                        contextualType = returnTypeSymbol;
                                    }
                                }
                                else {
                                    // No type annotation, check if there is a contextual type enforced on the function, and propagate that
                                    var currentContextualType = resolutionContext.getContextualType();
                                    if (currentContextualType && currentContextualType.isFunction()) {
                                        var currentContextualTypeSignatureSymbol = currentContextualType.getDeclarations()[0].getSignatureSymbol();
                                        var currentContextualTypeReturnTypeSymbol = currentContextualTypeSignatureSymbol.returnType;
                                        if (currentContextualTypeReturnTypeSymbol) {
                                            inContextuallyTypedAssignment = true;
                                            contextualType = currentContextualTypeReturnTypeSymbol;
                                        }
                                    }
                                }
                            }

                            resolutionContext.pushContextualType(contextualType, false, null);
                        }

                        break;

                    case NodeType.TypeQuery:
                        resolutionContext.resolvingTypeReference = false;
                        resolutionContext.resolvingTypeQueryExpression = true;
                        break;

                    case NodeType.TypeRef:
                    case NodeType.TypeParameter:
                        // Set the resolvingTypeReference to true if this a name (e.g. var x: Type) but not 
                        // when we are looking at a function type (e.g. var y : (a) => void)
                        var typeExpressionNode = path.asts[i + 1];
                        if (!typeExpressionNode ||
                            typeExpressionNode.nodeType() == NodeType.Name ||
                            typeExpressionNode.nodeType() == NodeType.MemberAccessExpression) {
                            resolutionContext.resolvingTypeReference = true;
                        }

                        break;

                    case NodeType.ClassDeclaration:
                        var classDeclaration = <ClassDeclaration>current;
                        if (path.asts[i + 1]) {
                            if (path.asts[i + 1] === classDeclaration.extendsList ||
                                path.asts[i + 1] === classDeclaration.implementsList) {
                                resolutionContext.resolvingTypeReference = true;
                            }
                        }

                        break;

                    case NodeType.InterfaceDeclaration:
                        var interfaceDeclaration = <InterfaceDeclaration>current;
                        if (path.asts[i + 1]) {
                            if (path.asts[i + 1] === interfaceDeclaration.extendsList ||
                                path.asts[i + 1] === interfaceDeclaration.implementsList ||
                                path.asts[i + 1] === interfaceDeclaration.name) {
                                resolutionContext.resolvingTypeReference = true;
                            }
                        }

                        break;
                }

                // Record enclosing Decl
                var decl = semanticInfo.getDeclForAST(current);
                if (decl && !(decl.kind & (PullElementKind.Variable | PullElementKind.Parameter | PullElementKind.TypeParameter))) {
                    enclosingDecl = decl;
                    enclosingDeclAST = current;
                }
            }

            // if the found AST is a named, we want to check for previous dotted expressions,
            // since those will give us the right typing
            if (path.ast().nodeType() === NodeType.Name && path.count() > 1) {
                for (var i = path.count() - 1; i >= 0; i--) {
                    if (path.asts[path.top - 1].nodeType() === NodeType.MemberAccessExpression &&
                    (<BinaryExpression>path.asts[path.top - 1]).operand2 === path.asts[path.top]) {
                        path.pop();
                    }
                    else {
                        break;
                    }
                }
            }

            return {
                ast: path.ast(),
                enclosingDecl: enclosingDecl,
                resolutionContext: resolutionContext,
                inContextuallyTypedAssignment: inContextuallyTypedAssignment
            };
        }

        public pullGetSymbolInformationFromPath(path: AstPath, document: Document): PullSymbolInfo {
            var context = this.extractResolutionContextFromPath(path, document, /*propagateContextualTypes*/ true);
            if (!context) {
                return null;
            }

            globalSemanticInfoChain = this.semanticInfoChain;
            if (globalBinder) {
                globalBinder.semanticInfoChain = this.semanticInfoChain;
            }            

            var ast = path.ast();
            var symbol = this.resolver.resolveAST(ast, context.inContextuallyTypedAssignment, context.enclosingDecl, context.resolutionContext);
            var aliasSymbol = this.semanticInfoChain.getUnit(document.fileName).getAliasSymbolForAST(ast);

            return {
                symbol: symbol,
                aliasSymbol: aliasSymbol,
                ast: path.ast(),
                enclosingScopeSymbol: this.getSymbolOfDeclaration(context.enclosingDecl)
            };
        }

        public pullGetDeclarationSymbolInformation(path: AstPath, document: Document): PullSymbolInfo {
            var script = document.script;
            var scriptName = document.fileName;

            var ast = path.ast();

            if (ast.nodeType() !== NodeType.ClassDeclaration && ast.nodeType() !== NodeType.InterfaceDeclaration && ast.nodeType() !== NodeType.ModuleDeclaration && ast.nodeType() !== NodeType.FunctionDeclaration && ast.nodeType() !== NodeType.VariableDeclarator) {
                return null;
            }

            var context = this.extractResolutionContextFromPath(path, document, /*propagateContextualTypes*/ true);
            if (!context) {
                return null;
            }

            globalSemanticInfoChain = this.semanticInfoChain;
            if (globalBinder) {
                globalBinder.semanticInfoChain = this.semanticInfoChain;
            }

            var semanticInfo = this.semanticInfoChain.getUnit(scriptName);
            var decl = semanticInfo.getDeclForAST(ast);
            var symbol = (decl.kind & PullElementKind.SomeSignature) ? decl.getSignatureSymbol() : decl.getSymbol();
            this.resolver.resolveDeclaredSymbol(symbol, null, context.resolutionContext);

            // we set the symbol as unresolved so as not to interfere with typecheck
            symbol.setUnresolved();

            return {
                symbol: symbol,
                aliasSymbol: null,
                ast: path.ast(),
                enclosingScopeSymbol: this.getSymbolOfDeclaration(context.enclosingDecl)
            };
        }

        public pullGetCallInformationFromPath(path: AstPath, document: Document): PullCallSymbolInfo {
            // AST has to be a call expression
            if (path.ast().nodeType() !== NodeType.InvocationExpression && path.ast().nodeType() !== NodeType.ObjectCreationExpression) {
                return null;
            }

            var isNew = (path.ast().nodeType() === NodeType.ObjectCreationExpression);

            var context = this.extractResolutionContextFromPath(path, document, /*propagateContextualTypes*/ true);
            if (!context) {
                return null;
            }

            globalSemanticInfoChain = this.semanticInfoChain;
            if (globalBinder) {
                globalBinder.semanticInfoChain = this.semanticInfoChain;
            }            

            var callResolutionResults = new PullAdditionalCallResolutionData();

            if (isNew) {
                this.resolver.resolveObjectCreationExpression(<ObjectCreationExpression>path.ast(), context.inContextuallyTypedAssignment, context.enclosingDecl, context.resolutionContext, callResolutionResults);
            }
            else {
                this.resolver.resolveInvocationExpression(<InvocationExpression>path.ast(), context.inContextuallyTypedAssignment, context.enclosingDecl, context.resolutionContext, callResolutionResults);
            }

            return {
                targetSymbol: callResolutionResults.targetSymbol,
                resolvedSignatures: callResolutionResults.resolvedSignatures,
                candidateSignature: callResolutionResults.candidateSignature,
                ast: path.ast(),
                enclosingScopeSymbol: this.getSymbolOfDeclaration(context.enclosingDecl),
                isConstructorCall: isNew
            };
        }

        public pullGetVisibleMemberSymbolsFromPath(path: AstPath, document: Document): PullVisibleSymbolsInfo {

            globalSemanticInfoChain = this.semanticInfoChain;
            if (globalBinder) {
                globalBinder.semanticInfoChain = this.semanticInfoChain;
            }

            var context = this.extractResolutionContextFromPath(path, document, /*propagateContextualTypes*/ true);
            if (!context) {
                return null;
            }

            var symbols = this.resolver.getVisibleMembersFromExpression(path.ast(), context.enclosingDecl, context.resolutionContext);
            if (!symbols) {
                return null;
            }

            return {
                symbols: symbols,
                enclosingScopeSymbol: this.getSymbolOfDeclaration(context.enclosingDecl)
            };
        }

        public pullGetVisibleDeclsFromPath(path: AstPath, document: Document): PullDecl[] {

            globalSemanticInfoChain = this.semanticInfoChain;
            if (globalBinder) {
                globalBinder.semanticInfoChain = this.semanticInfoChain;
            }

            var context = this.extractResolutionContextFromPath(path, document, /*propagateContextualTypes*/ false);
            if (!context) {
                return null;
            }

            return this.resolver.getVisibleDecls(context.enclosingDecl, context.resolutionContext);
        }

        public pullGetContextualMembersFromPath(path: AstPath, document: Document): PullVisibleSymbolsInfo {

            globalSemanticInfoChain = this.semanticInfoChain;
            if (globalBinder) {
                globalBinder.semanticInfoChain = this.semanticInfoChain;
            }

            // Input has to be an object literal
            if (path.ast().nodeType() !== NodeType.ObjectLiteralExpression) {
                return null;
            }

            var context = this.extractResolutionContextFromPath(path, document, /*propagateContextualTypes*/ true);
            if (!context) {
                return null;
            }

            var members = this.resolver.getVisibleContextSymbols(context.enclosingDecl, context.resolutionContext);

            return {
                symbols: members,
                enclosingScopeSymbol: this.getSymbolOfDeclaration(context.enclosingDecl)
            };
        }

        public pullGetDeclInformation(decl: PullDecl, path: AstPath, document: Document): PullSymbolInfo {
            var context = this.extractResolutionContextFromPath(path, document, /*propagateContextualTypes*/ true);
            if (!context) {
                return null;
            }

            globalSemanticInfoChain = this.semanticInfoChain;
            if (globalBinder) {
                globalBinder.semanticInfoChain = this.semanticInfoChain;
            }

            var symbol = decl.getSymbol();
            this.resolver.resolveDeclaredSymbol(symbol, context.enclosingDecl, context.resolutionContext);
            symbol.setUnresolved();

            return {
                symbol: symbol,
                aliasSymbol: null,
                ast: path.ast(),
                enclosingScopeSymbol: this.getSymbolOfDeclaration(context.enclosingDecl)
            };
        }

        public pullGetTypeInfoAtPosition(pos: number, document: Document): PullTypeInfoAtPositionInfo {
            return this.timeFunction("pullGetTypeInfoAtPosition for pos " + pos + ":", () => {
                return this.resolvePosition(pos, document);
            });
        }

        public getTopLevelDeclaration(scriptName: string) : PullDecl {
            var unit = this.semanticInfoChain.getUnit(scriptName);

            if (!unit) {
                return null;
            }

            return unit.getTopLevelDecl();
        }

        public reportDiagnostics(errors: Diagnostic[], errorReporter: TypeScript.IDiagnosticReporter): void {
            for (var i = 0; i < errors.length; i++) {
                errorReporter.addDiagnostic(errors[i]);
            }
        }
    }
}