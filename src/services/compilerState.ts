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
///<reference path='typescriptServices.ts' />

module Services {

    //
    // An cache entry in HostCache 
    //
    export class HostCacheEntry {
        private _sourceText: TypeScript.IScriptSnapshot;

        constructor(
            public fileName: string,
            private host: ILanguageServiceHost,
            public version: number,
            public isOpen: boolean,
            public byteOrderMark: ByteOrderMark) {
            this._sourceText = null;
        }
        
        public getScriptSnapshot(): TypeScript.IScriptSnapshot {
            if (this._sourceText === null) {
                this._sourceText = this.host.getScriptSnapshot(this.fileName);
            }

            return this._sourceText;
        }
    }

    //
    // Cache host information about scripts. Should be refreshed 
    // at each language service public entry point, since we don't know when 
    // set of scripts handled by the host changes.
    //
    export class HostCache {
        private fileNameToEntry: TypeScript.StringHashTable<HostCacheEntry>;

        constructor(public host: ILanguageServiceHost) {
            // script id => script index
            this.fileNameToEntry = new TypeScript.StringHashTable<HostCacheEntry>();

            var fileNames = this.host.getScriptFileNames();
            for (var i = 0, n = fileNames.length; i < n; i++) {
                var fileName = fileNames[i];
                this.fileNameToEntry.add(TypeScript.switchToForwardSlashes(fileName), new HostCacheEntry(
                    fileName, this.host, this.host.getScriptVersion(fileName), this.host.getScriptIsOpen(fileName), this.host.getScriptByteOrderMark(fileName)));
            }
        }

        public contains(fileName: string): boolean {
            return this.fileNameToEntry.lookup(TypeScript.switchToForwardSlashes(fileName)) !== null;
        }

        public getHostFileName(fileName: string) {
            var hostCacheEntry = this.fileNameToEntry.lookup(TypeScript.switchToForwardSlashes(fileName));
            if (hostCacheEntry) {
                return hostCacheEntry.fileName;
            }
            return fileName;
        }

        public getFileNames(): string[]{
            return this.fileNameToEntry.getAllKeys();
        }

        public getVersion(fileName: string): number {
            return this.fileNameToEntry.lookup(TypeScript.switchToForwardSlashes(fileName)).version;
        }

        public isOpen(fileName: string): boolean {
            return this.fileNameToEntry.lookup(TypeScript.switchToForwardSlashes(fileName)).isOpen;
        }

        public getByteOrderMark(fileName: string): ByteOrderMark {
            return this.fileNameToEntry.lookup(TypeScript.switchToForwardSlashes(fileName)).byteOrderMark;
        }

        public getScriptSnapshot(fileName: string): TypeScript.IScriptSnapshot {
            return this.fileNameToEntry.lookup(TypeScript.switchToForwardSlashes(fileName)).getScriptSnapshot();
        }
    }

    export class CompilerState {
        private logger: TypeScript.ILogger;

        //
        // State related to compiler instance
        //
        public compiler: TypeScript.TypeScriptCompiler = null;
        private hostCache: HostCache = null;

        constructor(private host: ILanguageServiceHost) {
            this.logger = this.host;
        }

        public getHostCompilationSettings(): TypeScript.CompilationSettings {
            var settings = this.host.getCompilationSettings();
            if (settings !== null) {
                return settings;
            }

            // Set "ES5" target by default for language service
            settings = new TypeScript.CompilationSettings();
            settings.codeGenTarget = TypeScript.LanguageVersion.EcmaScript5;

            return settings;
        }

        public getResolver(): TypeScript.PullTypeResolver {
            return null;
        }

        public synchronizeHostData(updateCompiler: boolean): void {
            // Reset the cache at start of every refresh
            this.hostCache = new HostCache(this.host);

            if (updateCompiler) {
                var hostCompilationSettings = this.getHostCompilationSettings();
                var compilationSettings = TypeScript.ImmutableCompilationSettings.fromCompilationSettings(hostCompilationSettings);

                    // If we don't have a compiler, then create a new one.
                if (this.compiler === null) {
                    this.compiler = new TypeScript.TypeScriptCompiler(this.logger, compilationSettings);
                }

                // let the compiler know about the current compilation settings.  
                this.compiler.setCompilationSettings(compilationSettings);

                // Now, remove any files from the compiler that are no longer in hte host.
                var compilerFileNames = this.compiler.fileNames();
                for (var i = 0, n = compilerFileNames.length; i < n; i++) {
                    var fileName = compilerFileNames[i];

                    if (!this.hostCache.contains(fileName)) {
                        this.compiler.removeFile(fileName);
                    }
                }

                // Now, for every file the host knows about, either add the file (if the compiler
                // doesn't know about it.).  Or notify the compiler about any changes (if it does
                // know about it.)
                var cache = this.hostCache;
                var hostFileNames = cache.getFileNames();
                for (var i = 0, n = hostFileNames.length; i < n; i++) {
                    var fileName = hostFileNames[i];

                    if (this.compiler.getDocument(fileName)) {
                        this.tryUpdateFile(this.compiler, fileName);
                    }
                    else {
                        this.compiler.addFile(fileName,
                            cache.getScriptSnapshot(fileName), cache.getByteOrderMark(fileName), cache.getVersion(fileName), cache.isOpen(fileName));
                    }
                }
            }
        }

        private tryUpdateFile(compiler: TypeScript.TypeScriptCompiler, fileName: string): void {
            var document: TypeScript.Document = this.compiler.getDocument(fileName);

            //
            // If the document is the same, assume no update
            //
            var version = this.hostCache.getVersion(fileName);
            var isOpen = this.hostCache.isOpen(fileName);
            if (document.version === version && document.isOpen === isOpen) {
                return;
            }

            var textChangeRange = this.getScriptTextChangeRangeSinceVersion(fileName, document.version);
            compiler.updateFile(fileName,
                this.hostCache.getScriptSnapshot(fileName),
                version, isOpen, textChangeRange);
        }

        private getAllSyntacticDiagnostics(): TypeScript.Diagnostic[]{
            var diagnostics: TypeScript.Diagnostic[] = [];

            this.compiler.fileNames().forEach(fileName =>
                diagnostics.push.apply(diagnostics, this.compiler.getSyntacticDiagnostics(fileName)));

            return diagnostics;
        }

        private getAllSemanticDiagnostics(): TypeScript.Diagnostic[]{
            var diagnostics: TypeScript.Diagnostic[] = [];

            this.compiler.fileNames().map(fileName =>
                diagnostics.push.apply(diagnostics, this.compiler.getSemanticDiagnostics(fileName)));

            return diagnostics;
        }

        public getEmitOutput(fileName: string): TypeScript.EmitOutput {
            var resolvePath = (fileName: string) => this.host.resolveRelativePath(fileName, null);

            var document = this.getDocument(fileName);
            var emitToSingleFile = document.emitToOwnOutputFile();

            // Check for syntactic errors
            var syntacticDiagnostics = emitToSingleFile
                ? this.getSyntacticDiagnostics(fileName)
                : this.getAllSyntacticDiagnostics();
            if (this.containErrors(syntacticDiagnostics)) {
                // This file has at least one syntactic error, return and do not emit code.
                return new TypeScript.EmitOutput();
            }

            // Force a type check before emit to ensure that all symbols have been resolved
            var document = this.getDocument(fileName);
            var semanticDiagnostics = emitToSingleFile ? this.getSemanticDiagnostics(fileName) : this.getAllSemanticDiagnostics();

            // Emit output files and source maps
                // Emit declarations, if there are no semantic errors
            var emitResult = this.compiler.emit(fileName, resolvePath);
            if (!this.containErrors(emitResult.diagnostics) &&
                !this.containErrors(semanticDiagnostics)) {

                // Merge the results
                var declarationEmitOutput = this.compiler.emitDeclarations(fileName, resolvePath);
                emitResult.outputFiles.push.apply(emitResult.outputFiles, declarationEmitOutput.outputFiles);
                emitResult.diagnostics.push.apply(emitResult.diagnostics, declarationEmitOutput.diagnostics);
            }

            return emitResult;
        }

        private containErrors(diagnostics: TypeScript.Diagnostic[]): boolean {
            if (diagnostics && diagnostics.length > 0) {
                for (var i = 0; i < diagnostics.length; i++) {
                    var diagnosticInfo = TypeScript.getDiagnosticInfoFromKey(diagnostics[i].diagnosticKey());
                    if (diagnosticInfo.category === TypeScript.DiagnosticCategory.Error) {
                        return true;
                    }
                }
            }

            return false;
        }

        public getScriptTextChangeRangeSinceVersion(fileName: string, lastKnownVersion: number): TypeScript.TextChangeRange {
            var currentVersion = this.hostCache.getVersion(fileName);
            if (lastKnownVersion === currentVersion) {
                return TypeScript.TextChangeRange.unchanged; // "No changes"
            }

            var scriptSnapshot = this.hostCache.getScriptSnapshot(fileName);
            return scriptSnapshot.getTextChangeRangeSinceVersion(lastKnownVersion);
        }

        // Methods that defer to the host cache to get the result.

        public getScriptSnapshot(fileName: string): TypeScript.IScriptSnapshot {
            return this.hostCache.getScriptSnapshot(fileName);
        }

        public getHostFileName(fileName: string) {
            return this.hostCache.getHostFileName(fileName);
        }

        public getScriptVersion(fileName: string) {
            return this.hostCache.getVersion(fileName);
        }

        // Methods that defer to the compiler to get the result.

        public compilationSettings(): TypeScript.ImmutableCompilationSettings {
            return this.compiler.compilationSettings();
        }

        public getFileNames(): string[] {
            return this.compiler.fileNames();
        }

        public getDocument(fileName: string): TypeScript.Document {
            return this.compiler.getDocument(fileName);
        }

        public getSyntacticDiagnostics(fileName: string): TypeScript.Diagnostic[] {
            return this.compiler.getSyntacticDiagnostics(fileName);
        }

        public getSemanticDiagnostics(fileName: string): TypeScript.Diagnostic[] {
            return this.compiler.getSemanticDiagnostics(fileName);
        }

        public getSymbolInformationFromAST(ast: TypeScript.AST, document: TypeScript.Document) {
            return this.compiler.pullGetSymbolInformationFromAST(ast, document);
        }

        public getCallInformationFromAST(ast: TypeScript.AST, document: TypeScript.Document) {
            return this.compiler.pullGetCallInformationFromAST(ast, document);
        }

        public getVisibleMemberSymbolsFromAST(ast: TypeScript.AST, document: TypeScript.Document) {
            return this.compiler.pullGetVisibleMemberSymbolsFromAST(ast, document);
        }

        public getVisibleDeclsFromAST(ast: TypeScript.AST, document: TypeScript.Document) {
            return this.compiler.pullGetVisibleDeclsFromAST(ast, document);
        }

        public getContextualMembersFromAST(ast: TypeScript.AST, document: TypeScript.Document) {
            return this.compiler.pullGetContextualMembersFromAST(ast, document);
        }

        public pullGetDeclInformation(decl: TypeScript.PullDecl, ast: TypeScript.AST, document: TypeScript.Document) {
            return this.compiler.pullGetDeclInformation(decl, ast, document);
        }

        public getTopLevelDeclaration(fileName: string) {
            return this.compiler.getTopLevelDeclaration(fileName);
        }

        public getDeclForAST(ast: TypeScript.AST): TypeScript.PullDecl {
            return this.compiler.getDeclForAST(ast);
        }
    }
}
