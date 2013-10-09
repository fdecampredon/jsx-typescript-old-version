// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
// See LICENSE.txt in the project root for complete license information.

///<reference path='..\references.ts' />

module TypeScript {

    // per-file info on 
    //  decls
    //  bindings
    //  scopes

    // PULLTODO: Get rid of these
    export var declCacheHit = 0;
    export var declCacheMiss = 0;
    export var symbolCacheHit = 0;
    export var symbolCacheMiss = 0;

    var sentinalEmptyArray: any[] = [];

    class SemanticInfo {
        private declASTMap = new DataMap<AST>();
        private astDeclMap = new DataMap<PullDecl>();

        constructor(private _semanticInfoChain: SemanticInfoChain,
                    private _fileName: string,
                    private _script: Script,
                    private _topLevelDecl: PullDecl = null) {
        }

        public topLevelDecl(): PullDecl {
            if (this._topLevelDecl === null) {
                this._topLevelDecl = PullDeclWalker.create(this._script, this._semanticInfoChain);

                // Now that we've computed the decls, there's no need to hold onto the script.
                this._script = null;
            }

            return this._topLevelDecl;
        }

        public fileName(): string {
            return this._fileName;
        }

        public _getDeclForAST(ast: AST): PullDecl {
            return this.astDeclMap.read(ast.astIDString);
        }

        public _setDeclForAST(ast: AST, decl: PullDecl): void {
            Debug.assert(decl.fileName() === this._fileName);
            this.astDeclMap.link(ast.astIDString, decl);
        }

        public _getASTForDecl(decl: PullDecl): AST {
            return this.declASTMap.read(decl.declIDString);
        }

        public _setASTForDecl(decl: PullDecl, ast: AST): void {
            Debug.assert(decl.fileName() === this._fileName);
            this.declASTMap.link(decl.declIDString, ast);
        }
    }

    export class SemanticInfoChain {
        private units: SemanticInfo[] = [];
        private fileNameToSemanticInfo = new BlockIntrinsics<SemanticInfo>();

        public anyTypeSymbol: PullTypeSymbol = null;
        public booleanTypeSymbol: PullTypeSymbol = null;
        public numberTypeSymbol: PullTypeSymbol = null;
        public stringTypeSymbol: PullTypeSymbol = null;
        public nullTypeSymbol: PullTypeSymbol = null;
        public undefinedTypeSymbol: PullTypeSymbol = null;
        public voidTypeSymbol: PullTypeSymbol = null;
        public emptyTypeSymbol: PullTypeSymbol = null;

        // <-- Data to clear when we get invalidated
        private astSymbolMap: DataMap<PullSymbol> = null;
        private astAliasSymbolMap = new DataMap<PullTypeAliasSymbol>();
        private symbolASTMap = new DataMap<AST>();
        private astCallResolutionDataMap: Collections.HashTable<number, PullAdditionalCallResolutionData> = null;

        private declSymbolMap = new DataMap<PullSymbol>();
        private declSignatureSymbolMap = new DataMap<PullSignatureSymbol>();
        private declSpecializingSignatureSymbolMap = new DataMap<PullSignatureSymbol>();

        private declCache: BlockIntrinsics<PullDecl[]> = null;
        private symbolCache: BlockIntrinsics<PullSymbol> = null;
        private fileNameToDiagnostics: BlockIntrinsics<Diagnostic[]> = null;
        private binder: PullSymbolBinder = null;

        private _topLevelDecls: PullDecl[] = null;

        private addPrimitiveType(name: string, globalDecl: PullDecl) {
            var span = new TextSpan(0, 0);

            var decl = globalDecl
                ? <PullDecl>new NormalPullDecl(name, name, PullElementKind.Primitive, PullElementFlags.None, globalDecl, span)
                : new RootPullDecl(name, "", PullElementKind.Primitive, PullElementFlags.None, span, this, /*isExternalModule:*/ false);
            var symbol = new PullPrimitiveTypeSymbol(name);

            symbol.addDeclaration(decl);
            decl.setSymbol(symbol);

            symbol.setResolved();

            return symbol;
        }

        private addPrimitiveValue(name: string, type: PullTypeSymbol, globalDecl: PullDecl) {
            var span = new TextSpan(0, 0);
            var decl = new NormalPullDecl(name, name, PullElementKind.Variable, PullElementFlags.Ambient, globalDecl, span);
            var symbol = new PullSymbol(name, PullElementKind.Variable);

            symbol.addDeclaration(decl);
            decl.setSymbol(symbol);
            symbol.type = type;
            symbol.setResolved();
        }

        private getGlobalDecl() {
            var span = new TextSpan(0, 0);
            var globalDecl = new RootPullDecl(/*name:*/ "", /*fileName:*/ "", PullElementKind.Global, PullElementFlags.None, span, this, /*isExternalModule:*/ false);

            // add primitive types
            this.anyTypeSymbol = this.addPrimitiveType("any", globalDecl);
            this.booleanTypeSymbol = this.addPrimitiveType("boolean", globalDecl);
            this.numberTypeSymbol = this.addPrimitiveType("number", globalDecl);
            this.stringTypeSymbol = this.addPrimitiveType("string", globalDecl);
            this.voidTypeSymbol = this.addPrimitiveType("void", globalDecl);

            // add the global primitive values for "null" and "undefined"
            // Because you cannot reference them by name, they're not parented by any actual decl.
            this.nullTypeSymbol = this.addPrimitiveType("null", null);
            this.undefinedTypeSymbol = this.addPrimitiveType("undefined", null);
            this.addPrimitiveValue("undefined", this.undefinedTypeSymbol, globalDecl);

            // other decls not reachable from the globalDecl
            var emptyTypeDecl = new PullSynthesizedDecl("{}", "{}", PullElementKind.ObjectType, PullElementFlags.None, null, span, this);
            var emptyTypeSymbol = new PullTypeSymbol("{}", PullElementKind.ObjectType);
            emptyTypeDecl.setSymbol(emptyTypeSymbol);
            emptyTypeSymbol.addDeclaration(emptyTypeDecl);
            emptyTypeSymbol.setResolved();
            this.emptyTypeSymbol = emptyTypeSymbol;

            return globalDecl;
        }

        constructor(private logger: ILogger) {
            this.invalidate();
        }

        private getSemanticInfo(fileName: string): SemanticInfo {
            return this.fileNameToSemanticInfo[fileName];
        }

        public addScript(script: Script): void {
            var fileName = script.fileName();
            var semanticInfo = new SemanticInfo(this, fileName, script);

            var existingIndex = ArrayUtilities.indexOf(this.units, u => u.fileName() === fileName);
            if (existingIndex < 0) {
                // Adding the script for the first time.
                this.units.push(semanticInfo);
            }
            else {
                this.units[existingIndex] = semanticInfo;
            }

            this.fileNameToSemanticInfo[fileName] = semanticInfo;

            // We changed the scripts we're responsible for.  Invalidate all existing cached
            // semantic information.
            this.invalidate();
        }

        public removeScript(fileName: string): void {
            Debug.assert(fileName !== "", "Can't remove the semantic info for the global decl.");
            var index = ArrayUtilities.indexOf(this.units, u => u.fileName() === fileName);
            if (index > 0) {
                this.fileNameToSemanticInfo[fileName] = undefined;
                this.units.splice(index, 1);
                this.invalidate();
            }
        }

        private getDeclPathCacheID(declPath: string[], declKind: PullElementKind) {
            var cacheID = "";

            for (var i = 0; i < declPath.length; i++) {
                cacheID += "#" + declPath[i];
            }

            return cacheID + "#" + declKind.toString();
        }

        public findTopLevelSymbol(name: string, kind: PullElementKind, stopAtFile: string): PullSymbol {
            var cacheID = this.getDeclPathCacheID([name], kind);

            var symbol = this.symbolCache[cacheID];

            if (!symbol) {
                var topLevelDecls = this.topLevelDecls();
                var foundDecls: PullDecl[] = null;

                for (var i = 0; i < topLevelDecls.length; i++) {

                    foundDecls = topLevelDecls[i].searchChildDecls(name, kind);

                    for (var j = 0; j < foundDecls.length; j++) {
                        if (foundDecls[j].hasSymbol()) {
                            symbol = foundDecls[j].getSymbol();
                            break;
                        }
                    }
                    if (symbol || topLevelDecls[i].name == stopAtFile) {
                        break;
                    }
                }

                if (symbol) {
                    this.symbolCache[cacheID] = symbol;
                }
            }

            return symbol;
        }

        public findExternalModule(id: string) {
            id = normalizePath(id);

            var dtsFile = id + ".d.ts";
            var dtsCacheID = this.getDeclPathCacheID([dtsFile], PullElementKind.DynamicModule);
            var symbol = <PullContainerSymbol>this.symbolCache[dtsCacheID];
            if (symbol) {
                return symbol;
            }

            var tsFile = id + ".ts"
            var tsCacheID = this.getDeclPathCacheID([tsFile], PullElementKind.DynamicModule);
            symbol = <PullContainerSymbol>this.symbolCache[tsCacheID]
            if (symbol != undefined) {
                return symbol;
            }

            symbol = null;
            for (var i = 0; i < this.units.length; i++) {
                var unit = this.units[i];
                var topLevelDecl = unit.topLevelDecl(); // Script

                if (topLevelDecl.isExternalModule()) {
                    var unitPath = unit.fileName();
                    var isDtsFile = unitPath == dtsFile;
                    if (isDtsFile || unitPath == tsFile) {
                        var dynamicModuleDecl = topLevelDecl.getChildDecls()[0];
                        symbol = <PullContainerSymbol>dynamicModuleDecl.getSymbol();
                        this.symbolCache[dtsCacheID] = isDtsFile ? symbol : null;
                        this.symbolCache[tsCacheID] = !isDTSFile ? symbol : null;
                        return symbol;
                    }
                }
            }

            this.symbolCache[dtsCacheID] = null;
            this.symbolCache[tsCacheID] = null;

            return symbol;
        }

        public findAmbientExternalModuleInGlobalContext(id: string) {
            var cacheID = this.getDeclPathCacheID([id], PullElementKind.DynamicModule);

            var symbol = <PullContainerSymbol>this.symbolCache[cacheID];
            if (symbol == undefined) {
                symbol = null;
                for (var i = 0; i < this.units.length; i++) {
                    var unit = this.units[i];
                    var topLevelDecl = unit.topLevelDecl();

                    if (!topLevelDecl.isExternalModule()) {
                        var dynamicModules = topLevelDecl.searchChildDecls(id, PullElementKind.DynamicModule);
                        if (dynamicModules.length) {
                            symbol = <PullContainerSymbol>dynamicModules[0].getSymbol();
                            break;
                        }
                    }
                }

                this.symbolCache[cacheID] = symbol;
            }

            return symbol;
        }

        // a decl path is a list of decls that reference the components of a declaration from the global scope down
        // E.g., string would be "['string']" and "A.B.C" would be "['A','B','C']"
        public findDecls(declPath: string[], declKind: PullElementKind): PullDecl[] {

            var cacheID = this.getDeclPathCacheID(declPath, declKind);

            if (declPath.length) {
                var cachedDecls = this.declCache[cacheID];

                if (cachedDecls && cachedDecls.length) {
                    declCacheHit++;
                    return <PullDecl[]> cachedDecls;
                }
            }

            declCacheMiss++;

            var declsToSearch = this.topLevelDecls();

            var decls: PullDecl[] = sentinelEmptyArray;
            var path: string;
            var foundDecls: PullDecl[] = sentinelEmptyArray;
            var keepSearching = (declKind & PullElementKind.SomeContainer) || (declKind & PullElementKind.Interface);

            for (var i = 0; i < declPath.length; i++) {
                path = declPath[i];
                decls = sentinelEmptyArray;

                for (var j = 0; j < declsToSearch.length; j++) {
                    //var kind = (i === declPath.length - 1) ? declKind : PullElementKind.SomeType;
                    foundDecls = declsToSearch[j].searchChildDecls(path, declKind);

                    for (var k = 0; k < foundDecls.length; k++) {
                        if (decls == sentinelEmptyArray) {
                            decls = [];
                        }
                        decls[decls.length] = foundDecls[k];
                    }

                    // Unless we're searching for an interface or module, we've found the one true
                    // decl, so don't bother searching the rest of the top-level decls
                    if (foundDecls.length && !keepSearching) {
                        break;
                    }
                }

                declsToSearch = decls;

                if (!declsToSearch) {
                    break;
                }
            }

            if (decls.length) {
                this.declCache[cacheID] = decls;
            }

            return decls;
        }

        public findDeclsFromPath(declPath: PullDecl[], declKind: PullElementKind): PullDecl[]{
            var declString: string[] = [];

            for (var i = 0, n = declPath.length; i < n; i++) {
                if (declPath[i].kind & PullElementKind.Script) {
                    continue;
                }

                declString.push(declPath[i].name);
            }
            
            return this.findDecls(declString, declKind);
        }

        public findSymbol(declPath: string[], declType: PullElementKind): PullSymbol {
            var cacheID = this.getDeclPathCacheID(declPath, declType);

            if (declPath.length) {

                var cachedSymbol = this.symbolCache[cacheID];

                if (cachedSymbol) {
                    symbolCacheHit++;
                    return cachedSymbol;
                }
            }

            symbolCacheMiss++;

            // symbol wasn't cached, so get the decl
            var decls: PullDecl[] = this.findDecls(declPath, declType);
            var symbol: PullSymbol = null;

            if (decls.length) {

                symbol = decls[0].getSymbol();

                if (symbol) {
                    this.symbolCache[cacheID] = symbol;
                }
            }

            return symbol;
        }

        public cacheGlobalSymbol(symbol: PullSymbol, kind: PullElementKind) {
            var cacheID1 = this.getDeclPathCacheID([symbol.name], kind);
            var cacheID2 = this.getDeclPathCacheID([symbol.name], symbol.kind);

            if (!this.symbolCache[cacheID1]) {
                this.symbolCache[cacheID1] = symbol;
            }

            if (!this.symbolCache[cacheID2]) {
                this.symbolCache[cacheID2] = symbol;
            }
        }

        private invalidate() {
            // A file has changed, increment the type check phase so that future type chech
            // operations will proceed.
            PullTypeResolver.globalTypeCheckPhase++;

            this.logger.log("Invalidating SemanticInfoChain...");
            var cleanStart = new Date().getTime();

            this.astSymbolMap = new DataMap<PullSymbol>();
            this.astAliasSymbolMap = new DataMap<PullTypeAliasSymbol>();
            this.symbolASTMap = new DataMap<AST>();
            this.astCallResolutionDataMap = Collections.createHashTable<number, PullAdditionalCallResolutionData>(Collections.DefaultHashTableCapacity, k => k);

            this.declCache = new BlockIntrinsics();
            this.symbolCache = new BlockIntrinsics();
            this.fileNameToDiagnostics = new BlockIntrinsics();
            this.binder = null;
            this._topLevelDecls = null;

            this.declSymbolMap = new DataMap<PullSymbol>();
            this.declSignatureSymbolMap = new DataMap<PullSignatureSymbol>();
            this.declSpecializingSignatureSymbolMap = new DataMap<PullSignatureSymbol>();

            this.units[0] = new SemanticInfo(this, "", /*script:*/ null, this.getGlobalDecl());

            var cleanEnd = new Date().getTime();
            this.logger.log("   time to invalidate: " + (cleanEnd - cleanStart));
        }

        public setSymbolForAST(ast: AST, symbol: PullSymbol): void {
            this.astSymbolMap.link(ast.astIDString, symbol);
            this.symbolASTMap.link(symbol.pullSymbolIDString, ast);
        }

        public getSymbolForAST(ast: IAST): PullSymbol {
            return this.astSymbolMap.read(ast.astIDString);
        }

        public getASTForSymbol(symbol: PullSymbol): AST {
            return this.symbolASTMap.read(symbol.pullSymbolIDString);
        }

        public setAliasSymbolForAST(ast: AST, symbol: PullTypeAliasSymbol): void {
            this.astAliasSymbolMap.link(ast.astIDString, symbol);
        }

        public getAliasSymbolForAST(ast: IAST): PullTypeAliasSymbol {
            return this.astAliasSymbolMap.read(ast.astIDString);
        }

        public getCallResolutionDataForAST(ast: AST): PullAdditionalCallResolutionData {
            return <PullAdditionalCallResolutionData>this.astCallResolutionDataMap.get(ast.astID);
        }

        public setCallResolutionDataForAST(ast: AST, callResolutionData: PullAdditionalCallResolutionData) {
            if (callResolutionData) {
                this.astCallResolutionDataMap.set(ast.astID, callResolutionData);
            }
        }

        public setSymbolForDecl(decl: PullDecl, symbol: PullSymbol): void {
            this.declSymbolMap.link(decl.declIDString, symbol);
        }

        public getSymbolForDecl(decl: PullDecl): PullSymbol {
            return this.declSymbolMap.read(decl.declIDString);
        }

        public setSignatureSymbolForDecl(decl: PullDecl, signatureSymbol: PullSignatureSymbol): void {
            this.declSignatureSymbolMap.link(decl.declIDString, signatureSymbol);
        }

        public getSignatureSymbolForDecl(decl: PullDecl): PullSignatureSymbol {
            return this.declSignatureSymbolMap.read(decl.declIDString);
        }

        public setSpecializingSignatureSymbolForDecl(decl: PullDecl, signatureSymbol: PullSignatureSymbol): void {
            this.declSpecializingSignatureSymbolMap.link(decl.declIDString, signatureSymbol);
        }

        public getSpecializingSignatureSymbolForDecl(decl: PullDecl): PullSignatureSymbol {
            return this.declSpecializingSignatureSymbolMap.read(decl.declIDString);
        }

        public addDiagnostic(diagnostic: Diagnostic): void {
            var fileName = diagnostic.fileName();
            var diagnostics = this.fileNameToDiagnostics[fileName];
            if (!diagnostics) {
                diagnostics = [];
                this.fileNameToDiagnostics[fileName] = diagnostics;
            }

            diagnostics.push(diagnostic);
        }

        public getDiagnostics(fileName: string): Diagnostic[] {
            var diagnostics = this.fileNameToDiagnostics[fileName];
            return diagnostics ? diagnostics : [];
        }

        public getBinder(): PullSymbolBinder {
            if (!this.binder) {
                this.binder = new PullSymbolBinder(this);
            }

            return this.binder;
        }

        public addSyntheticIndexSignature(containingDecl: PullDecl, containingSymbol: PullTypeSymbol, ast: AST,
            indexParamName: string, indexParamType: PullTypeSymbol, returnType: PullTypeSymbol): void {

            var indexSignature = new PullSignatureSymbol(PullElementKind.IndexSignature);
            var indexParameterSymbol = new PullSymbol(indexParamName, PullElementKind.Parameter);
            indexParameterSymbol.type = indexParamType;
            indexSignature.addParameter(indexParameterSymbol);
            indexSignature.returnType = returnType;
            indexSignature.setResolved();
            indexParameterSymbol.setResolved();

            containingSymbol.addIndexSignature(indexSignature);

            var span = TextSpan.fromBounds(ast.minChar, ast.limChar);
            var indexSigDecl = new PullSynthesizedDecl("", "", PullElementKind.IndexSignature, PullElementFlags.Signature, containingDecl, span, containingDecl.semanticInfoChain());
            var indexParamDecl = new PullSynthesizedDecl(indexParamName, indexParamName, PullElementKind.Parameter, PullElementFlags.None, indexSigDecl, span, containingDecl.semanticInfoChain());
            indexSigDecl.setSignatureSymbol(indexSignature);
            indexParamDecl.setSymbol(indexParameterSymbol);
            indexSignature.addDeclaration(indexSigDecl);
            indexParameterSymbol.addDeclaration(indexParamDecl);
            this.setASTForDecl(indexSigDecl, ast);
            this.setASTForDecl(indexParamDecl, ast);
        }

        public getDeclForAST(ast: AST): PullDecl {
            var unit = this.getSemanticInfo(ast.fileName());

            if (unit) {
                return unit._getDeclForAST(ast);
            }

            return null;
        }

        public setDeclForAST(ast: AST, decl: PullDecl): void {
            this.getSemanticInfo(decl.fileName())._setDeclForAST(ast, decl);
        }

        public getASTForDecl(decl: PullDecl): AST {
            var unit = this.getSemanticInfo(decl.fileName());
            if (unit) {
                return unit._getASTForDecl(decl);
            }

            return null;
        }

        public setASTForDecl(decl: PullDecl, ast: AST): void {
            this.getSemanticInfo(decl.fileName())._setASTForDecl(decl, ast);
        }

        public topLevelDecl(fileName: string): PullDecl {
            var info = this.getSemanticInfo(fileName);
            if (info) {
                return info.topLevelDecl();
            }

            return null;
        }

        public topLevelDecls(): PullDecl[] {
            if (!this._topLevelDecls) {
                this._topLevelDecls = ArrayUtilities.select(this.units, u => u.topLevelDecl());
            }

            return this._topLevelDecls;
        }
    }
}