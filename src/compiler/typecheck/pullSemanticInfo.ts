// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
// See LICENSE.txt in the project root for complete license information.

///<reference path='..\typescript.ts' />

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
        private _fileName: string;  // the "file" this is associated with

        private topLevelDecl: PullDecl = null;

        private declASTMap = new DataMap<AST>();
        private astDeclMap = new DataMap<PullDecl>();

        constructor(fileName: string) {
            this._fileName = fileName;
        }

        public addTopLevelDecl(decl: PullDecl) {
            this.topLevelDecl = decl;
        }

        public getTopLevelDecl() { return this.topLevelDecl; }

        public fileName(): string {
            return this._fileName;
        }

        public _getDeclForAST(ast: AST): PullDecl {
            if (useDirectTypeStorage) {
                return ast.decl ? ast.decl : null;
            }

            return this.astDeclMap.read(ast.astIDString);
        }

        public _setDeclForAST(ast: AST, decl: PullDecl): void {
            Debug.assert(decl.fileName() === this._fileName);

            if (useDirectTypeStorage) {
                ast.decl = decl;
                return;
            }

            this.astDeclMap.link(ast.astIDString, decl);
        }

        public _getASTForDecl(decl: PullDecl): AST {
            if (useDirectTypeStorage) {
                return decl.ast;
            }

            return this.declASTMap.read(decl.declIDString);
        }

        public _setASTForDecl(decl: PullDecl, ast: AST): void {
            Debug.assert(decl.fileName() === this._fileName);

            if (useDirectTypeStorage) {
                decl.ast = ast;
                return;
            }

            this.declASTMap.link(decl.declIDString, ast);
        }
    }

    export class SemanticInfoChain {
        private units: SemanticInfo[] = [new SemanticInfo("")];
        private declCache = new BlockIntrinsics<PullDecl[]>();
        private symbolCache = new BlockIntrinsics<PullSymbol>();
        private fileNameToSemanticInfo = new BlockIntrinsics<SemanticInfo>();
        private fileNameToDiagnostics = new BlockIntrinsics<Diagnostic[]>();
        private binder: PullSymbolBinder = null;

        private topLevelDecls: PullDecl[] = [];

        public anyTypeSymbol: PullTypeSymbol = null;
        public booleanTypeSymbol: PullTypeSymbol = null;
        public numberTypeSymbol: PullTypeSymbol = null;
        public stringTypeSymbol: PullTypeSymbol = null;
        public nullTypeSymbol: PullTypeSymbol = null;
        public undefinedTypeSymbol: PullTypeSymbol = null;
        public voidTypeSymbol: PullTypeSymbol = null;
        public emptyTypeSymbol: PullTypeSymbol = null;

        // <-- Data to clear when we get invalidated
        private astSymbolMap = new DataMap<PullSymbol>();
        private astAliasSymbolMap = new DataMap<PullTypeAliasSymbol>();
        private symbolASTMap = new DataMap<AST>();
        private astCallResolutionDataMap: Collections.HashTable<number, PullAdditionalCallResolutionData> =
            Collections.createHashTable<number, PullAdditionalCallResolutionData>(Collections.DefaultHashTableCapacity, k => k);

        private addPrimitiveType(name: string, globalDecl: PullDecl) {
            var span = new TextSpan(0, 0);
            var decl = new NormalPullDecl(name, name, PullElementKind.Primitive, PullElementFlags.None, globalDecl, span);
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
            var globalDecl = new RootPullDecl(/*fileName:*/ "", PullElementKind.Global, PullElementFlags.None, span, this, /*isExternalModule:*/ false);

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
            var emptyTypeDecl = new PullSynthesizedDecl("{}", "{}", PullElementKind.ObjectType, PullElementFlags.None, null, span);
            var emptyTypeSymbol = new PullTypeSymbol("{}", PullElementKind.ObjectType);
            emptyTypeDecl.setSymbol(emptyTypeSymbol);
            emptyTypeSymbol.addDeclaration(emptyTypeDecl);
            emptyTypeSymbol.setResolved();
            this.emptyTypeSymbol = emptyTypeSymbol;

            return globalDecl;
        }

        constructor(private logger: ILogger) {
            var globalDecl = this.getGlobalDecl();
            var globalInfo = this.units[0];
            globalInfo.addTopLevelDecl(globalDecl);
        }

        public addScript(script: Script) {
            var fileName = script.fileName();

            var semanticInfo = new SemanticInfo(fileName);
            this.units.push(semanticInfo);
            this.fileNameToSemanticInfo[fileName] = semanticInfo;

            this.createTopLevelDecl(semanticInfo, script);
        }

        private createTopLevelDecl(semanticInfo: SemanticInfo, script: Script): void {
            var declCollectionContext = new DeclCollectionContext(this);

            // create decls
            getAstWalkerFactory().walk(script, preCollectDecls, postCollectDecls, null, declCollectionContext);

            semanticInfo.addTopLevelDecl(declCollectionContext.getParent());
        }

        private getSemanticInfo(fileName: string): SemanticInfo {
            return this.fileNameToSemanticInfo[fileName];
        }

        public updateScript(newScript: Script): void {
            var newSemanticInfo = this.updateScriptWorker(newScript);
            this.createTopLevelDecl(newSemanticInfo, newScript);

            this.invalidate();
        }

        private updateScriptWorker(newScript: Script): SemanticInfo {
            var fileName = newScript.fileName();
            var newSemanticInfo = new SemanticInfo(fileName);

            for (var i = 0; i < this.units.length; i++) {
                if (this.units[i].fileName() === fileName) {
                    this.units[i] = newSemanticInfo;
                    this.fileNameToSemanticInfo[fileName] = newSemanticInfo;
                    break;
                }
            }

            return newSemanticInfo;
        }

        private collectAllTopLevelDecls() {

            if (this.topLevelDecls.length) {
                return this.topLevelDecls;
            }

            for (var i = 0; i < this.units.length; i++) {
                this.topLevelDecls[this.topLevelDecls.length] = this.units[i].getTopLevelDecl();
            }

            return this.topLevelDecls;
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
                var topLevelDecls = this.collectAllTopLevelDecls();
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
                var topLevelDecl = unit.getTopLevelDecl(); // Script

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
                    var topLevelDecl = unit.getTopLevelDecl();

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

            var declsToSearch = this.collectAllTopLevelDecls();

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

        public findMatchingValidDecl(invalidatedDecl: PullDecl): PullDecl[]{
            var unitPath = invalidatedDecl.fileName();
            var unit = this.getSemanticInfo(unitPath);
            if (!unit) {
                return null;
            }

            var declsInPath: PullDecl[] = [];
            var current = invalidatedDecl;
            while (current) {
                if (current.kind !== PullElementKind.Script) {
                    declsInPath.unshift(current);
                }

                current = current.getParentDecl();
            }

            // now search for that decl
            var declsToSearch = [unit.getTopLevelDecl()];
            var foundDecls: PullDecl[] = [];
            var keepSearching = (invalidatedDecl.kind & PullElementKind.Container) || 
                (invalidatedDecl.kind & PullElementKind.Interface) ||
                (invalidatedDecl.kind & PullElementKind.Class) ||
                (invalidatedDecl.kind & PullElementKind.Enum);

            for (var i = 0; i < declsInPath.length; i++) {
                var declInPath = declsInPath[i];
                var decls: PullDecl[] = [];

                for (var j = 0; j < declsToSearch.length; j++) {
                    foundDecls = declsToSearch[j].searchChildDecls(declInPath.name, declInPath.kind);

                    decls.push.apply(decls, foundDecls);

                    // Unless we're searching for an interface or module, we've found the one true
                    // decl, so don't bother searching the rest of the top-level decls
                    if (foundDecls.length && !keepSearching) {
                        break;
                    }
                }

                declsToSearch = decls;

                if (declsToSearch.length == 0) {
                    break;
                }
            }

            return declsToSearch;
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

        private cleanAllDecls() {
            var topLevelDecls = this.collectAllTopLevelDecls();

            // skip the first tld, which contains global primitive symbols
            for (var i = 1; i < topLevelDecls.length; i++) {
                topLevelDecls[i].clean();
            }

            this.topLevelDecls = [];
        }

        private invalidate() {
            this.logger.log("Cleaning symbols...");
            var cleanStart = new Date().getTime();

            this.declCache = new BlockIntrinsics();
            this.symbolCache = new BlockIntrinsics();
            this.fileNameToDiagnostics = new BlockIntrinsics();
            this.binder = null;

            this.units[0] = new SemanticInfo("");
            this.units[0].addTopLevelDecl(this.getGlobalDecl());
            this.cleanAllDecls();

            this.astSymbolMap = new DataMap<PullSymbol>();
            this.astAliasSymbolMap = new DataMap<PullTypeAliasSymbol>();
            this.symbolASTMap = new DataMap<AST>();
            this.astCallResolutionDataMap = Collections.createHashTable<number, PullAdditionalCallResolutionData>(Collections.DefaultHashTableCapacity, k => k);

            var cleanEnd = new Date().getTime();
            this.logger.log("   time to clean: " + (cleanEnd - cleanStart));
        }

        public setSymbolForAST(ast: AST, symbol: PullSymbol): void {
            if (useDirectTypeStorage) {
                ast.symbol = symbol;
                symbol.ast = ast;
                return;
            }

            this.astSymbolMap.link(ast.astIDString, symbol);
            this.symbolASTMap.link(symbol.pullSymbolIDString, ast);
        }

        public getSymbolForAST(ast: IAST): PullSymbol {
            if (useDirectTypeStorage) {
                return (<AST>ast).symbol;
            }

            return this.astSymbolMap.read(ast.astIDString);
        }

        public getASTForSymbol(symbol: PullSymbol): AST {
            if (useDirectTypeStorage) {
                return symbol.ast;
            }

            return this.symbolASTMap.read(symbol.pullSymbolIDString);
        }

        public setAliasSymbolForAST(ast: AST, symbol: PullTypeAliasSymbol): void {
            if (useDirectTypeStorage) {
                ast.aliasSymbol = symbol;
                return;
            }
            this.astAliasSymbolMap.link(ast.astIDString, symbol);
        }

        public getAliasSymbolForAST(ast: IAST): PullTypeAliasSymbol {
            if (useDirectTypeStorage) {
                return <PullTypeAliasSymbol>(<AST>ast).aliasSymbol;
            }

            return this.astAliasSymbolMap.read(ast.astIDString);
        }

        public getCallResolutionDataForAST(ast: AST): PullAdditionalCallResolutionData {
            if (useDirectTypeStorage) {
                return (<InvocationExpression>ast).callResolutionData;
            }
            return <PullAdditionalCallResolutionData>this.astCallResolutionDataMap.get(ast.astID);
        }

        public setCallResolutionDataForAST(ast: AST, callResolutionData: PullAdditionalCallResolutionData) {
            if (callResolutionData) {
                if (useDirectTypeStorage) {
                    (<InvocationExpression>ast).callResolutionData = callResolutionData;
                    return;
                }
                this.astCallResolutionDataMap.set(ast.astID, callResolutionData);
            }
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
            var indexSigDecl = new PullSynthesizedDecl("", "", PullElementKind.IndexSignature, PullElementFlags.Signature, containingDecl, span);
            var indexParamDecl = new PullSynthesizedDecl(indexParamName, indexParamName, PullElementKind.Parameter, PullElementFlags.None, indexSigDecl, span);
            indexSigDecl.setSignatureSymbol(indexSignature);
            indexParamDecl.setSymbol(indexParameterSymbol);
            indexSignature.addDeclaration(indexSigDecl);
            indexParameterSymbol.addDeclaration(indexParamDecl);
            this.setASTForDecl(indexSigDecl, ast);
            this.setASTForDecl(indexParamDecl, ast);
            indexSigDecl.setIsBound(true);
            indexParamDecl.setIsBound(true);
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

        public getTopLevelDecl(fileName: string): PullDecl {
            return this.getSemanticInfo(fileName).getTopLevelDecl();
        }

        public getTopLevelDecls(): PullDecl[] {
            return ArrayUtilities.select(this.units, u => u.getTopLevelDecl());
        }
    }
}