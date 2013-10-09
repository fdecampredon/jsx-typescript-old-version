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
///<reference path='references.ts' />

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

    export class EmitOutput {
        public outputFiles: OutputFile[] = [];
        public diagnostics: TypeScript.Diagnostic[] = [];
    }

    export class OutputFile {
        constructor(public name: string,
            public writeByteOrderMark: boolean,
            public text: string) {
        }
    }

    export class TypeScriptCompiler {
        public resolver: PullTypeResolver = null;

        private semanticInfoChain: SemanticInfoChain = null;

        public emitOptions: EmitOptions;

        private fileNameToDocument = new TypeScript.StringHashTable<Document>();

        constructor(public logger: ILogger = new NullLogger(),
                    public settings: CompilationSettings = new CompilationSettings()) {
            this.emitOptions = new EmitOptions(this.settings);
            this.semanticInfoChain = new SemanticInfoChain(logger);
        }

        public getDocument(fileName: string): Document {
            fileName = TypeScript.switchToForwardSlashes(fileName);
            return this.fileNameToDocument.lookup(fileName);
        }

        public addFile(fileName: string,
            scriptSnapshot: IScriptSnapshot,
            byteOrderMark: ByteOrderMark,
            version: number,
            isOpen: boolean,
            referencedFiles: string[] = []): void {

            fileName = TypeScript.switchToForwardSlashes(fileName);

            TypeScript.sourceCharactersCompiled += scriptSnapshot.getLength();

            var document = Document.create(fileName, scriptSnapshot, byteOrderMark, version, isOpen, referencedFiles, this.emitOptions.compilationSettings);
            this.fileNameToDocument.addOrUpdate(fileName, document);
        }

        public updateFile(fileName: string, scriptSnapshot: IScriptSnapshot, version: number, isOpen: boolean, textChangeRange: TextChangeRange): void {
            fileName = TypeScript.switchToForwardSlashes(fileName);

            var document = this.getDocument(fileName);
            var updatedDocument = document.update(scriptSnapshot, version, isOpen, textChangeRange, this.settings);

            this.fileNameToDocument.addOrUpdate(fileName, updatedDocument);

            var updatedScript = updatedDocument.script;

            // Note: the semantic info chain will recognize that this is a replacement of an
            // existing script, and will handle it appropriately.
            this.semanticInfoChain.addScript(updatedScript);

            // If we havne't yet created a new resolver, clean any cached symbols
            this.resolver = new PullTypeResolver(
                this.settings, this.semanticInfoChain, fileName);
        }

        public removeFile(fileName: string): void {
            fileName = TypeScript.switchToForwardSlashes(fileName);
            this.fileNameToDocument.remove(fileName);
            this.semanticInfoChain.removeScript(fileName);
        }

        private isDynamicModuleCompilation(): boolean {
            var fileNames = this.fileNames();
            for (var i = 0, n = fileNames.length; i < n; i++) {
                var document = this.getDocument(fileNames[i]);
                var script = document.script;
                if (!script.isDeclareFile() && script.isExternalModule) {
                    return true;
                }
            }
            return false;
        }

        private updateCommonDirectoryPath(): Diagnostic {
            var commonComponents: string[] = [];
            var commonComponentsLength = -1;

            var fileNames = this.fileNames();
            for (var i = 0, len = fileNames.length; i < len; i++) {
                var fileName = fileNames[i];
                var document = this.getDocument(fileNames[i]);
                var script = document.script;

                if (!script.isDeclareFile()) {
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

        private validateEmitOptions(resolvePath: (path: string) => string): Diagnostic {
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
                this.emitOptions.compilationSettings.outFileOption = switchToForwardSlashes(resolvePath(this.emitOptions.compilationSettings.outFileOption));
                this.emitOptions.outputMany = false;
            } else {
                this.emitOptions.outputMany = true;
            } 

            if (this.emitOptions.compilationSettings.outDirOption) {
                this.emitOptions.compilationSettings.outDirOption = switchToForwardSlashes(resolvePath(this.emitOptions.compilationSettings.outDirOption));
                this.emitOptions.compilationSettings.outDirOption = convertToDirectoryPath(this.emitOptions.compilationSettings.outDirOption);
            }
           
            // Parse the directory structure
            if (this.emitOptions.compilationSettings.outDirOption || this.emitOptions.compilationSettings.mapRoot || this.emitOptions.compilationSettings.sourceRoot) {
                return this.updateCommonDirectoryPath();
            }

            return null;
        }

        private writeByteOrderMarkForDocument(document: Document) {
            // If module its always emitted in its own file
            if (this.emitOptions.outputMany || document.script.isExternalModule) {
                return document.byteOrderMark !== ByteOrderMark.None;
            } else {
                var fileNames = this.fileNames();

                for (var i = 0, n = fileNames.length; i < n; i++) {
                    if (document.script.isExternalModule) {
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

        private shouldEmitDeclarations(script?: Script) {
            if (!this.settings.generateDeclarationFiles) {
                return false;
            }

            // If its already a declare file or is resident or does not contain body 
            if (!!script && (script.isDeclareFile() || script.moduleElements === null)) {
                return false;
            }

            return true;
        }

        // Caller is responsible for closing emitter.
        private emitDeclarationsWorker(
            resolvePath: (path: string) => string,
            document: Document,
            declarationEmitter?: DeclarationEmitter): DeclarationEmitter {

            var script = document.script;
            if (this.shouldEmitDeclarations(script)) {
                if (declarationEmitter) {
                    declarationEmitter.document = document;
                } else {
                    var declareFileName = this.emitOptions.mapOutputFileName(document, TypeScriptCompiler.mapToDTSFileName);
                    declarationEmitter = new DeclarationEmitter(declareFileName, document, this, this.semanticInfoChain, resolvePath);
                }

                declarationEmitter.emitDeclarations(script);
            }

            return declarationEmitter;
        }

        // Will not throw exceptions.
        public emitAllDeclarations(resolvePath: (path: string) => string): EmitOutput {
            var start = new Date().getTime();
            var emitOutput = new EmitOutput();

            var optionsDiagnostic = this.validateEmitOptions(resolvePath);
            if (optionsDiagnostic) {
                emitOutput.diagnostics.push(optionsDiagnostic);
                return emitOutput;
            }

            if (this.shouldEmitDeclarations()) {
                var sharedEmitter: DeclarationEmitter = null;
                var fileNames = this.fileNames();

                for (var i = 0, n = fileNames.length; i < n; i++) {
                    var fileName = fileNames[i];

                    var document = this.getDocument(fileNames[i]);

                    // Emitting module or multiple files, always goes to single file
                    if (this.emitOptions.outputMany || document.script.isExternalModule) {
                        var singleEmitter = this.emitDeclarationsWorker(resolvePath, document);
                        if (singleEmitter) {
                            emitOutput.outputFiles.push(singleEmitter.getOutputFile());
                        }
                    }
                    else {
                        // Create or reuse file
                        sharedEmitter = this.emitDeclarationsWorker(resolvePath, document, sharedEmitter);
                    }
                }

                if (sharedEmitter) {
                    emitOutput.outputFiles.push(sharedEmitter.getOutputFile());
                }
            }

            declarationEmitTime += new Date().getTime() - start;

            return emitOutput;
        }

        // Will not throw exceptions.
        public emitDeclarations(fileName: string, resolvePath: (path: string) => string): EmitOutput {
            fileName = TypeScript.switchToForwardSlashes(fileName);
            var emitOutput = new EmitOutput();

            var optionsDiagnostic = this.validateEmitOptions(resolvePath);
            if (optionsDiagnostic) {
                emitOutput.diagnostics.push(optionsDiagnostic);
                return emitOutput;
            }

            var document = this.getDocument(fileName);

            if (this.shouldEmitDeclarations(document.script)) {
                // Emitting module or multiple files, always goes to single file
                if (this.emitOptions.outputMany || document.script.isExternalModule) {
                    var emitter = this.emitDeclarationsWorker(resolvePath, document);
                    if (emitter) {
                        emitOutput.outputFiles.push.apply(emitOutput.outputFiles, emitter.getOutputFile());
                    }
                }
                else {
                    return this.emitAllDeclarations(resolvePath);
                }
            }

            return emitOutput;
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
        private emitWorker(resolvePath: (path: string) => string, document: Document, emitter?: Emitter): Emitter {
            var script = document.script;
            if (!script.isDeclareFile()) {
                var typeScriptFileName = document.fileName;
                if (!emitter) {
                    var javaScriptFileName = this.emitOptions.mapOutputFileName(document, TypeScriptCompiler.mapToJSFileName);
                    var outFile = new TextWriter(javaScriptFileName, this.writeByteOrderMarkForDocument(document));

                    emitter = new Emitter(javaScriptFileName, outFile, this.emitOptions, this.semanticInfoChain);

                    if (this.settings.mapSourceFiles) {
                        // We always create map files next to the jsFiles
                        var sourceMapFile = new TextWriter(javaScriptFileName + SourceMapper.MapFileExtension, /*writeByteOrderMark:*/ false); 
                        emitter.createSourceMapper(document, javaScriptFileName, outFile, sourceMapFile, resolvePath);
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
        public emitAll(resolvePath: (path: string) => string): EmitOutput {
            var start = new Date().getTime();
            var emitOutput = new EmitOutput();

            var optionsDiagnostic = this.validateEmitOptions(resolvePath);
            if (optionsDiagnostic) {
                emitOutput.diagnostics.push(optionsDiagnostic);
                return emitOutput;
            }

            var fileNames = this.fileNames();
            var sharedEmitter: Emitter = null;

            // Iterate through the files, as long as we don't get an error.
            for (var i = 0, n = fileNames.length; i < n; i++) {
                var fileName = fileNames[i];

                var document = this.getDocument(fileName);

                // Emitting module or multiple files, always goes to single file
                if (this.emitOptions.outputMany || document.script.isExternalModule) {
                    // We're outputting to mulitple files.  We don't want to reuse an emitter in that case.
                    var singleEmitter = this.emitWorker(resolvePath, document);
                    if (singleEmitter) {
                        emitOutput.outputFiles.push.apply(emitOutput.outputFiles, singleEmitter.getOutputFiles());
                    }
                }
                else {
                    // We're not outputting to multiple files.  Keep using the same emitter and don't
                    // close until below.
                    sharedEmitter = this.emitWorker(resolvePath, document, sharedEmitter);
                }
            }

            if (sharedEmitter) {
                emitOutput.outputFiles.push.apply(emitOutput.outputFiles, sharedEmitter.getOutputFiles());
            }

            emitTime += new Date().getTime() - start;
            return emitOutput;
        }

        // Emit single file if outputMany is specified, else emit all
        // Will not throw exceptions.
        public emit(fileName: string, resolvePath: (path: string) => string): EmitOutput {
            fileName = TypeScript.switchToForwardSlashes(fileName);
            var emitOutput = new EmitOutput();

            var optionsDiagnostic = this.validateEmitOptions(resolvePath);
            if (optionsDiagnostic) {
                emitOutput.diagnostics.push(optionsDiagnostic);
                return emitOutput;
            }

            var document = this.getDocument(fileName);
            // Emitting module or multiple files, always goes to single file
            if (this.emitOptions.outputMany || document.script.isExternalModule) {
                // In outputMany mode, only emit the document specified and its sourceMap if needed

                var emitter = this.emitWorker(resolvePath, document);
                if (emitter) {
                    emitOutput.outputFiles.push.apply(emitOutput.outputFiles, emitter.getOutputFiles());
                }

                return emitOutput;
            }
            else {
                // In output Single file mode, emit everything
                return this.emitAll(resolvePath);
            }
        }

        //
        // Pull typecheck infrastructure
        //

        public getSyntacticDiagnostics(fileName: string): Diagnostic[] {
            fileName = TypeScript.switchToForwardSlashes(fileName)
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
            fileName = TypeScript.switchToForwardSlashes(fileName);

            var document = this.getDocument(fileName);
            var script = document.script;

            var startTime = (new Date()).getTime();
            PullTypeResolver.typeCheck(this.settings, this.semanticInfoChain, fileName, script)
                    var endTime = (new Date()).getTime();

            typeCheckTime += endTime - startTime;

            var errors = this.semanticInfoChain.getDiagnostics(fileName);

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
            var fileNames = this.fileNames();
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

            this.semanticInfoChain = new SemanticInfoChain(this.logger);
            if (this.resolver) {
                this.resolver.semanticInfoChain = this.semanticInfoChain;
            }

            var createDeclsStartTime = new Date().getTime();

            var fileNames = this.fileNames();
            for (var i = 0, n = fileNames.length; i < n; i++) {
                var fileName = fileNames[i];
                var document = this.getDocument(fileName);
                this.semanticInfoChain.addScript(document.script);
            }

            var createDeclsEndTime = new Date().getTime();

            // bind declaration symbols
            var bindStartTime = new Date().getTime();

            // start at '1', so as to skip binding for global primitives such as 'any'
            var topLevelDecls = this.semanticInfoChain.topLevelDecls();
            for (var i = 0, n = topLevelDecls.length; i < n; i++) {
                var topLevelDecl = topLevelDecls[i];

                var binder = this.semanticInfoChain.getBinder();
                binder.bindDeclToPullSymbol(topLevelDecl);
            }

            var bindEndTime = new Date().getTime();

            this.logger.log("Decl creation: " + (createDeclsEndTime - createDeclsStartTime));
            this.logger.log("Binding: " + (bindEndTime - bindStartTime));
            this.logger.log("Number of symbols created: " + pullSymbolID);
            this.logger.log("Number of specialized types created: " + nSpecializationsCreated);
            this.logger.log("Number of specialized signatures created: " + nSpecializedSignaturesCreated);
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

        public getTypeInfoAtPosition(pos: number, document: Document): PullTypeInfoAtPositionInfo {
            // find the enclosing decl
            var declStack: PullDecl[] = [];
            var resultASTs: AST[] = [];
            var script = document.script;
            var scriptName = document.fileName;

            var lastDeclAST: AST = null;
            var foundAST: AST = null;
            var symbol: PullSymbol = null;
            var candidateSignature: PullSignatureSymbol = null;
            var callSignatures: PullSignatureSymbol[] = null;

            // these are used to track intermediate nodes so that we can properly apply contextual types
            var lambdaAST: AST = null;
            var declarationInitASTs: VariableDeclarator[] = [];
            var objectLitAST: ObjectLiteralExpression = null;
            var asgAST: BinaryExpression = null;
            var typeAssertionASTs: CastExpression[] = [];
            var resolutionContext = new PullTypeResolutionContext(this.resolver);
            var inTypeReference = false;
            var enclosingDecl: PullDecl = null;
            var isConstructorCall = false;

            var pre = (cur: AST) => {
                if (isValidAstNode(cur)) {
                    if (pos >= cur.minChar && pos <= cur.limChar) {

                        var previous = resultASTs[resultASTs.length - 1];

                        if (previous === undefined || (cur.minChar >= previous.minChar && cur.limChar <= previous.limChar)) {

                            var decl = this.semanticInfoChain.getDeclForAST(cur);

                            if (decl) {
                                declStack[declStack.length] = decl;
                                lastDeclAST = cur;
                            }

                            if (cur.nodeType() === NodeType.FunctionDeclaration && hasFlag((<FunctionDeclaration>cur).getFunctionFlags(), FunctionFlags.IsFunctionExpression)) {
                                lambdaAST = cur;
                            }
                            else if (cur.nodeType() === NodeType.ArrowFunctionExpression) {
                                lambdaAST = cur;
                            }
                            else if (cur.nodeType() === NodeType.VariableDeclarator) {
                                declarationInitASTs[declarationInitASTs.length] = <VariableDeclarator>cur;
                            }
                            else if (cur.nodeType() === NodeType.ObjectLiteralExpression) {
                                objectLitAST = <ObjectLiteralExpression>cur;
                            }
                            else if (cur.nodeType() === NodeType.CastExpression) {
                                typeAssertionASTs.push(<CastExpression>cur);
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
                            if (foundAST === (<InterfaceDeclaration>previousAST).identifier) {
                                foundAST = previousAST;
                            }
                            break;
                        case NodeType.ClassDeclaration:
                            if (foundAST === (<ClassDeclaration>previousAST).identifier) {
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
                    this.resolver.resolveDeclaredSymbol(symbol, resolutionContext);
                    symbol.setUnresolved();
                    enclosingDecl = declStack[declStack.length - 1].getParentDecl();
                    if (foundAST.nodeType() === NodeType.FunctionDeclaration ||
                        foundAST.nodeType() === NodeType.ArrowFunctionExpression) {
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
                                (<MemberAccessExpression>resultASTs[i]).name === resultASTs[i + 1]) {
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
                            var varSymbol = this.semanticInfoChain.getSymbolForAST(assigningAST);

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
                        enclosingDecl = this.semanticInfoChain.getDeclForAST(lambdaAST);
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
                                this.resolver.resolveInvocationExpression(<InvocationExpression>callExpression, enclosingDecl, resolutionContext, callResolutionResults);
                            } else {
                                this.resolver.resolveObjectCreationExpression(<ObjectCreationExpression>callExpression, enclosingDecl, resolutionContext, callResolutionResults);
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
                        var signatureInfo = PullHelpers.getSignatureForFuncDecl(this.getDeclForAST(funcDecl));
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

        private extractResolutionContextFromAST(ast: AST, document: Document, propagateContextualTypes: boolean): { ast: AST; enclosingDecl: PullDecl; resolutionContext: PullTypeResolutionContext; inContextuallyTypedAssignment: boolean; inWithBlock: boolean; } {
            var script = document.script;
            var scriptName = document.fileName;

            var enclosingDecl: PullDecl = null;
            var enclosingDeclAST: AST = null;
            var inContextuallyTypedAssignment = false;
            var inWithBlock = false;

            var resolutionContext = new PullTypeResolutionContext(this.resolver);

            if (!ast) {
                return null;
            }

            this.setUnit(scriptName);

            var path = this.getASTPath(ast);

            // Extract infromation from path
            for (var i = 0 , n = path.length; i < n; i++) {
                var current = path[i];

                switch (current.nodeType()) {
                    case NodeType.FunctionDeclaration:
                        // A function expression does not have a decl, so we need to resolve it first to get the decl created.
                        if (hasFlag((<FunctionDeclaration>current).getFunctionFlags(), FunctionFlags.IsFunctionExpression)) {
                            this.resolver.resolveAST(current, true, enclosingDecl, resolutionContext);
                        }

                        break;

                    case NodeType.ArrowFunctionExpression:
                        this.resolver.resolveAST(current, true, enclosingDecl, resolutionContext);
                        break;

                    case NodeType.VariableDeclarator:
                        var assigningAST = <VariableDeclarator> current;
                        inContextuallyTypedAssignment = (assigningAST.typeExpr !== null);

                        if (inContextuallyTypedAssignment) {
                            if (propagateContextualTypes) {
                                this.resolver.resolveAST(assigningAST, /*inContextuallyTypedAssignment*/false, null, resolutionContext);
                                var varSymbol = this.semanticInfoChain.getSymbolForAST(assigningAST);

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
                            if ((i + 1 < n) && callExpression.arguments === path[i + 1]) {
                                var callResolutionResults = new PullAdditionalCallResolutionData();
                                if (isNew) {
                                    this.resolver.resolveObjectCreationExpression(callExpression, enclosingDecl, resolutionContext, callResolutionResults);
                                }
                                else {
                                    this.resolver.resolveInvocationExpression(callExpression, enclosingDecl, resolutionContext, callResolutionResults);
                                }

                                // Find the index in the arguments list
                                if (callResolutionResults.actualParametersContextTypeSymbols) {
                                    var argExpression = (path[i + 1] && path[i + 1].nodeType() === NodeType.List) ? path[i + 2] : path[i + 1];
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
                                    this.resolver.resolveObjectCreationExpression(callExpression, enclosingDecl, resolutionContext);
                                }
                                else {
                                    this.resolver.resolveInvocationExpression(callExpression, enclosingDecl, resolutionContext);
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
                            if (currentContextualType && currentContextualType.isArrayNamedTypeReference()) {
                                contextualType = currentContextualType.getElementType();
                            }

                            resolutionContext.pushContextualType(contextualType, false, null);
                        }

                        break;

                    case NodeType.ObjectLiteralExpression:
                        if (propagateContextualTypes) {
                            var objectLiteralExpression = <ObjectLiteralExpression>current;
                            var objectLiteralResolutionContext = new PullAdditionalObjectLiteralResolutionData();
                            this.resolver.resolveObjectLiteralExpression(objectLiteralExpression, inContextuallyTypedAssignment, enclosingDecl, resolutionContext, objectLiteralResolutionContext);

                            // find the member in the path
                            var memeberAST = (path[i + 1] && path[i + 1].nodeType() === NodeType.List) ? path[i + 2] : path[i + 1];
                            if (memeberAST) {
                                // Propagate the member contextual type
                                var contextualType: PullTypeSymbol = null;
                                var memberDecls = objectLiteralExpression.propertyAssignments;
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

                            if (path[i + 1] && path[i + 1] === assignmentExpression.operand2) {
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
                                    var returnTypeSymbol = this.resolver.resolveTypeReference(functionDeclaration.returnTypeAnnotation, enclosingDecl, resolutionContext);
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
                        break;

                    case NodeType.TypeRef:
                        var typeExpressionNode = path[i + 1];

                        // ObjectType are just like Object Literals are bound when needed, ensure we have a decl, by forcing it to be 
                        // resolved before descending into it.
                        if (typeExpressionNode && typeExpressionNode.nodeType() === NodeType.ObjectType) {
                            this.resolver.resolveAST(current, /*inContextuallyTypedAssignment*/ false, enclosingDecl, resolutionContext);
                        }

                        // Set the resolvingTypeReference to true if this a name (e.g. var x: Type) but not 
                        // when we are looking at a function type (e.g. var y : (a) => void)
                        if (!typeExpressionNode ||
                            typeExpressionNode.nodeType() === NodeType.Name ||
                            typeExpressionNode.nodeType() === NodeType.QualifiedName ||
                            typeExpressionNode.nodeType() === NodeType.MemberAccessExpression) {
                            resolutionContext.resolvingTypeReference = true;
                        }

                        break;

                    case NodeType.TypeParameter:
                        // Set the resolvingTypeReference to true if this a name (e.g. var x: Type) but not 
                        // when we are looking at a function type (e.g. var y : (a) => void)
                        var typeExpressionNode = path[i + 1];
                        if (!typeExpressionNode ||
                            typeExpressionNode.nodeType() === NodeType.Name ||
                            typeExpressionNode.nodeType() === NodeType.QualifiedName ||
                            typeExpressionNode.nodeType() === NodeType.MemberAccessExpression) {
                            resolutionContext.resolvingTypeReference = true;
                        }

                        break;

                    case NodeType.ClassDeclaration:
                        var classDeclaration = <ClassDeclaration>current;
                        if (path[i + 1]) {
                            if (path[i + 1] === classDeclaration.heritageClauses) {
                                resolutionContext.resolvingTypeReference = true;
                            }
                        }

                        break;

                    case NodeType.InterfaceDeclaration:
                        var interfaceDeclaration = <InterfaceDeclaration>current;
                        if (path[i + 1]) {
                            if (path[i + 1] === interfaceDeclaration.heritageClauses ||
                                path[i + 1] === interfaceDeclaration.identifier) {
                                resolutionContext.resolvingTypeReference = true;
                            }
                        }

                        break;

                    case NodeType.WithStatement:
                        inWithBlock = true;
                        break;
                }

                // Record enclosing Decl
                var decl = this.semanticInfoChain.getDeclForAST(current);
                if (decl && !(decl.kind & (PullElementKind.Variable | PullElementKind.Parameter | PullElementKind.TypeParameter))) {
                    enclosingDecl = decl;
                    enclosingDeclAST = current;
                }
            }

            // if the found AST is a named, we want to check for previous dotted expressions,
            // since those will give us the right typing
            if (ast && ast.parent && ast.nodeType() === NodeType.Name) {
                if (ast.parent.nodeType() === NodeType.MemberAccessExpression) {
                    if ((<MemberAccessExpression>ast.parent).name === ast) {
                        ast = ast.parent;
                    }
                }
                else if (ast.parent.nodeType() === NodeType.QualifiedName) {
                    if ((<QualifiedName>ast.parent).right === ast) {
                        ast = ast.parent;
                    }
                }
            }

            return {
                ast: ast,
                enclosingDecl: enclosingDecl,
                resolutionContext: resolutionContext,
                inContextuallyTypedAssignment: inContextuallyTypedAssignment,
                inWithBlock: inWithBlock
            };
        }

        private getASTPath(ast: AST): AST[] {
            var result: AST[] = [];

            while (ast) {
                result.unshift(ast);
                ast = ast.parent;
            }

            return result;
        }

        public pullGetSymbolInformationFromAST(ast: AST, document: Document): PullSymbolInfo {
            var context = this.extractResolutionContextFromAST(ast, document, /*propagateContextualTypes*/ true);
            if (!context || context.inWithBlock) {
                return null;
            }

            ast = context.ast;
            var symbol = this.resolver.resolveAST(ast, context.inContextuallyTypedAssignment, context.enclosingDecl, context.resolutionContext);
            var aliasSymbol = this.semanticInfoChain.getAliasSymbolForAST(ast);

            return {
                symbol: symbol,
                aliasSymbol: aliasSymbol,
                ast: ast,
                enclosingScopeSymbol: this.getSymbolOfDeclaration(context.enclosingDecl)
            };
        }

        public pullGetDeclarationSymbolInformation(ast: AST, document: Document): PullSymbolInfo {
            var script = document.script;
            var scriptName = document.fileName;

            if (ast.nodeType() !== NodeType.ClassDeclaration &&
                ast.nodeType() !== NodeType.InterfaceDeclaration &&
                ast.nodeType() !== NodeType.ModuleDeclaration &&
                ast.nodeType() !== NodeType.ConstructorDeclaration &&
                ast.nodeType() !== NodeType.FunctionDeclaration &&
                ast.nodeType() !== NodeType.ArrowFunctionExpression &&
                ast.nodeType() !== NodeType.VariableDeclarator) {
                return null;
            }

            var context = this.extractResolutionContextFromAST(ast, document, /*propagateContextualTypes*/ true);
            if (!context || context.inWithBlock) {
                return null;
            }

            var decl = this.semanticInfoChain.getDeclForAST(ast);
            var symbol = (decl.kind & PullElementKind.SomeSignature) ? decl.getSignatureSymbol() : decl.getSymbol();
            this.resolver.resolveDeclaredSymbol(symbol, context.resolutionContext);

            // we set the symbol as unresolved so as not to interfere with typecheck
            symbol.setUnresolved();

            return {
                symbol: symbol,
                aliasSymbol: null,
                ast: ast,
                enclosingScopeSymbol: this.getSymbolOfDeclaration(context.enclosingDecl)
            };
        }

        public pullGetCallInformationFromAST(ast: AST, document: Document): PullCallSymbolInfo {
            // AST has to be a call expression
            if (ast.nodeType() !== NodeType.InvocationExpression && ast.nodeType() !== NodeType.ObjectCreationExpression) {
                return null;
            }

            var isNew = ast.nodeType() === NodeType.ObjectCreationExpression;

            var context = this.extractResolutionContextFromAST(ast, document, /*propagateContextualTypes*/ true);
            if (!context || context.inWithBlock) {
                return null;
            }

            var callResolutionResults = new PullAdditionalCallResolutionData();

            if (isNew) {
                this.resolver.resolveObjectCreationExpression(<ObjectCreationExpression>ast, context.enclosingDecl, context.resolutionContext, callResolutionResults);
            }
            else {
                this.resolver.resolveInvocationExpression(<InvocationExpression>ast, context.enclosingDecl, context.resolutionContext, callResolutionResults);
            }

            return {
                targetSymbol: callResolutionResults.targetSymbol,
                resolvedSignatures: callResolutionResults.resolvedSignatures,
                candidateSignature: callResolutionResults.candidateSignature,
                ast: ast,
                enclosingScopeSymbol: this.getSymbolOfDeclaration(context.enclosingDecl),
                isConstructorCall: isNew
            };
        }

        public pullGetVisibleMemberSymbolsFromAST(ast: AST, document: Document): PullVisibleSymbolsInfo {
            var context = this.extractResolutionContextFromAST(ast, document, /*propagateContextualTypes*/ true);
            if (!context || context.inWithBlock) {
                return null;
            }

            var symbols = this.resolver.getVisibleMembersFromExpression(ast, context.enclosingDecl, context.resolutionContext);
            if (!symbols) {
                return null;
            }

            return {
                symbols: symbols,
                enclosingScopeSymbol: this.getSymbolOfDeclaration(context.enclosingDecl)
            };
        }

        public pullGetVisibleDeclsFromAST(ast: AST, document: Document): PullDecl[] {
            var context = this.extractResolutionContextFromAST(ast, document, /*propagateContextualTypes*/ false);
            if (!context || context.inWithBlock) {
                return null;
            }

            return this.resolver.getVisibleDecls(context.enclosingDecl);
        }

        public pullGetContextualMembersFromAST(ast: AST, document: Document): PullVisibleSymbolsInfo {
            // Input has to be an object literal
            if (ast.nodeType() !== NodeType.ObjectLiteralExpression) {
                return null;
            }

            var context = this.extractResolutionContextFromAST(ast, document, /*propagateContextualTypes*/ true);
            if (!context || context.inWithBlock) {
                return null;
            }

            var members = this.resolver.getVisibleContextSymbols(context.enclosingDecl, context.resolutionContext);

            return {
                symbols: members,
                enclosingScopeSymbol: this.getSymbolOfDeclaration(context.enclosingDecl)
            };
        }

        public pullGetDeclInformation(decl: PullDecl, ast: AST, document: Document): PullSymbolInfo {
            var context = this.extractResolutionContextFromAST(ast, document, /*propagateContextualTypes*/ true);
            if (!context || context.inWithBlock) {
                return null;
            }

            var symbol = decl.getSymbol();
            this.resolver.resolveDeclaredSymbol(symbol, context.resolutionContext);
            symbol.setUnresolved();

            return {
                symbol: symbol,
                aliasSymbol: null,
                ast: ast,
                enclosingScopeSymbol: this.getSymbolOfDeclaration(context.enclosingDecl)
            };
        }

        public getTopLevelDeclaration(fileName: string) : PullDecl {
            return this.semanticInfoChain.topLevelDecl(fileName);
        }

        public getDeclForAST(ast: AST): PullDecl {
            return this.semanticInfoChain.getDeclForAST(ast);
        }

        public fileNames(): string[] {
            return this.fileNameToDocument.getAllKeys();
        }

        public topLevelDecl(fileName: string): PullDecl {
            return this.semanticInfoChain.topLevelDecl(fileName);
        }
    }
}