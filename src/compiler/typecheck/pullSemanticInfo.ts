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

    export class SemanticInfo {
        private compilationUnitPath: string;  // the "file" this is associated with

        private topLevelDecl: PullDecl = null;
        private topLevelSynthesizedDecls: PullDecl[] = [];

        private declASTMap = new DataMap<AST>();
        private astDeclMap = new DataMap<PullDecl>();

        // <-- Data to clear when we get invalidated
        private astSymbolMap = new DataMap<PullSymbol>();
        private astAliasSymbolMap = new DataMap<PullTypeAliasSymbol>();
        private symbolASTMap = new DataMap<AST>();
        private diagnostics: Diagnostic[] = null;
        public hasBeenTypeChecked = false;

        private astCallResolutionDataMap: Collections.HashTable<number, PullAdditionalCallResolutionData> =
            Collections.createHashTable<number, PullAdditionalCallResolutionData>(Collections.DefaultHashTableCapacity, k => k);

        private importDeclarationNames: BlockIntrinsics<boolean> = null;
        // Data to clear when we get invalidated --> 

        constructor(compilationUnitPath: string) {
            this.compilationUnitPath = compilationUnitPath;
        }

        public invalidate() {
            this.astSymbolMap = new DataMap<PullSymbol>();
            this.astAliasSymbolMap = new DataMap<PullTypeAliasSymbol>();
            this.symbolASTMap = new DataMap<AST>();
            this.diagnostics = null;
            this.astCallResolutionDataMap = Collections.createHashTable<number, PullAdditionalCallResolutionData>(Collections.DefaultHashTableCapacity, k => k);
            this.importDeclarationNames = null;
            this.hasBeenTypeChecked = false;
        }

        public addDiagnostic(diagnostic: Diagnostic): void {
            if (this.diagnostics === null) {
                this.diagnostics = [];
            }

            this.diagnostics.push(diagnostic);
        }

        public addTopLevelDecl(decl: PullDecl) {
            this.topLevelDecl = decl;
        }

        public getTopLevelDecl() { return this.topLevelDecl; }

        public getPath(): string {
            return this.compilationUnitPath;
        }

        public addSynthesizedDecl(decl: PullDecl) {
            //if (!decl.getParentDecl()) {
                this.topLevelSynthesizedDecls[this.topLevelSynthesizedDecls.length] = decl;
            //}
        }

        public getSynthesizedDecls() {
            return this.topLevelSynthesizedDecls;
        }

        public cleanSynthesizedDecls() {
            this.topLevelSynthesizedDecls = [];
        }

        public getDeclForAST(ast: AST): PullDecl {
            if (useDirectTypeStorage) {
                return ast.decl ? ast.decl : null;
            }

            return this.astDeclMap.read(ast.astIDString);
        }

        public setDeclForAST(ast: AST, decl: PullDecl): void {

            if (useDirectTypeStorage) {
                ast.decl = decl;
                return;
            }

            this.astDeclMap.link(ast.astIDString, decl);
        }

        public getASTForDecl(decl: PullDecl): AST {
            if (useDirectTypeStorage) {
                return decl.ast;
            }

            return this.declASTMap.read(decl.declIDString);
        }

        public setASTForDecl(decl: PullDecl, ast: AST): void {

            if (useDirectTypeStorage) {
                decl.ast = ast;
                return;
            }

            this.declASTMap.link(decl.declIDString, ast);
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


        public getDiagnostics(semanticErrors: Diagnostic[]) {
            if (this.diagnostics) {
                semanticErrors.push.apply(semanticErrors, this.diagnostics);
            }
        }

        public getImportDeclarationNames(): BlockIntrinsics<boolean> {
            if (this.importDeclarationNames === null) {
                this.importDeclarationNames = new BlockIntrinsics();
                this.populateImportDeclarationNames([this.topLevelDecl]);
            }

            return this.importDeclarationNames;
        }

        private populateImportDeclarationNames(decls: PullDecl[]): void {
            for (var i = 0, n = decls.length; i < n; i++) {
                var decl = decls[i];
                if (decl.kind === PullElementKind.TypeAlias) {
                    this.importDeclarationNames[decl.name] = true;
                }
                else {
                    this.populateImportDeclarationNames(decl.getChildDecls());
                }
            }
        }

        public isExternalModule() {
            var topLevelDecl = this.getTopLevelDecl();
            if (topLevelDecl.kind == PullElementKind.Script) {
                var script = <Script>this.getASTForDecl(topLevelDecl);
                return script.isExternalModule;
            }

            // Global context
            return false;
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
            var indexSigDecl = new PullDecl("", "", PullElementKind.IndexSignature, PullElementFlags.Index | PullElementFlags.Signature, span, this.getPath());
            var indexParamDecl = new PullDecl(indexParamName, indexParamName, PullElementKind.Parameter, PullElementFlags.None, span, this.getPath());
            indexSigDecl.addChildDecl(indexParamDecl);
            indexParamDecl.setParentDecl(indexSigDecl);
            containingDecl.addChildDecl(indexSigDecl);
            indexSigDecl.setParentDecl(containingDecl);
            this.addSynthesizedDecl(indexSigDecl);
            this.addSynthesizedDecl(indexParamDecl);
            indexSigDecl.setSignatureSymbol(indexSignature);
            indexParamDecl.setSymbol(indexParameterSymbol);
            indexSignature.addDeclaration(indexSigDecl);
            indexParameterSymbol.addDeclaration(indexParamDecl);
            this.setASTForDecl(indexSigDecl, ast);
            this.setASTForDecl(indexParamDecl, ast);
            indexSigDecl.setIsBound(true);
            indexParamDecl.setIsBound(true);
        }
    }

    export class SemanticInfoChain {
        public units: SemanticInfo[] = [new SemanticInfo("")];
        private declCache = new BlockIntrinsics<PullDecl[]>();
        private symbolCache = new BlockIntrinsics<PullSymbol>();
        private unitCache = new BlockIntrinsics<SemanticInfo>();
        private topLevelDecls: PullDecl[] = [];

        public anyTypeSymbol: PullTypeSymbol = null;
        public booleanTypeSymbol: PullTypeSymbol = null;
        public numberTypeSymbol: PullTypeSymbol = null;
        public stringTypeSymbol: PullTypeSymbol = null;
        public nullTypeSymbol: PullTypeSymbol = null;
        public undefinedTypeSymbol: PullTypeSymbol = null;
        public voidTypeSymbol: PullTypeSymbol = null;

        public addPrimitiveType(name: string, globalDecl: PullDecl) {
            var span = new TextSpan(0, 0);
            var decl = new PullDecl(name, name, PullElementKind.Primitive, PullElementFlags.None, span, "");
            var symbol = new PullPrimitiveTypeSymbol(name);

            symbol.addDeclaration(decl);
            decl.setSymbol(symbol);

            symbol.setResolved();

            if (globalDecl) {
                globalDecl.addChildDecl(decl);
            }

            return symbol;
        }

        public addPrimitiveValue(name: string, type: PullTypeSymbol, globalDecl: PullDecl) {
            var span = new TextSpan(0, 0);
            var decl = new PullDecl(name, name, PullElementKind.Variable, PullElementFlags.Ambient, span, "");
            var symbol = new PullSymbol(name, PullElementKind.Variable);

            symbol.addDeclaration(decl);
            decl.setSymbol(symbol);
            symbol.type = type;
            symbol.setResolved();

            globalDecl.addChildDecl(decl);
        }

        public getGlobalDecl() {
            var span = new TextSpan(0, 0);
            var globalDecl = new PullDecl("", "", PullElementKind.Global, PullElementFlags.None, span, "");

            // add primitive types
            this.anyTypeSymbol = this.addPrimitiveType("any", globalDecl);
            this.booleanTypeSymbol = this.addPrimitiveType("boolean", globalDecl);
            this.numberTypeSymbol = this.addPrimitiveType("number", globalDecl);
            this.stringTypeSymbol = this.addPrimitiveType("string", globalDecl);
            this.voidTypeSymbol = this.addPrimitiveType("void", globalDecl);

            // add the global primitive values for "null" and "undefined"
            this.nullTypeSymbol = this.addPrimitiveType("null", null);
            this.undefinedTypeSymbol = this.addPrimitiveType("undefined", null);
            this.addPrimitiveValue("undefined", this.undefinedTypeSymbol, globalDecl);

            return globalDecl;
        }

        constructor() {
            if (globalBinder) {
                globalBinder.semanticInfoChain = this;
            }

            var globalDecl = this.getGlobalDecl();
            var globalInfo = this.units[0];
            globalInfo.addTopLevelDecl(globalDecl);
        }

        public addUnit(unit: SemanticInfo) {
            this.units[this.units.length] = unit;
            this.unitCache[unit.getPath()] = unit;
        }

        public getUnit(compilationUnitPath: string): SemanticInfo {
            return this.unitCache[compilationUnitPath];
        }

        // PULLTODO: compilationUnitPath is only really there for debug purposes
        public updateUnit(oldUnit: SemanticInfo, newUnit: SemanticInfo) {
            for (var i = 0; i < this.units.length; i++) {
                if (this.units[i].getPath() === oldUnit.getPath()) {
                    this.units[i] = newUnit;
                    this.unitCache[oldUnit.getPath()] = newUnit;
                    return;
                }
            }
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

        private collectAllSynthesizedDecls() {
            var decls: PullDecl[] = [];
            var synthDecls: PullDecl[];

            for (var i = 0; i < this.units.length; i++) {
                synthDecls = this.units[i].getSynthesizedDecls();
                for (var j = 0; j < synthDecls.length; j++) {
                    decls[decls.length] = synthDecls[j];
                }
            }

            return decls;
        }        

        private getDeclPathCacheID(declPath: string[], declKind: PullElementKind) {
            var cacheID = "";

            for (var i = 0; i < declPath.length; i++) {
                cacheID += "#" + declPath[i];
            }

            return cacheID + "#" + declKind.toString();
        }
        
        // REVIEW: The method below is part of an experiment on how to speed up up dynamic module lookup
        //public findExternalModuleSymbol(name) {
        //    var cacheID = this.getDeclPathCacheID([name], PullElementKind.DynamicModule);

        //    var symbol = this.symbolCache[name];

        //    if (!symbol) {
        //        var unit = <SemanticInfo>this.unitCache[name];
        //        var symbol: PullContainerTypeSymbol = null;
        //        if (unit) {
        //            // the dynamic module will be the only child
        //            var decl = unit.getTopLevelDecls()[0].getChildDecls()[0];

        //            if (decl.kind == PullElementKind.DynamicModule) {
        //                symbol = decl.getSymbol();
        //            }
        //        }
        //    }

        //    if (symbol) {
        //        this.symbolCache[cacheID] = symbol;

        //        symbol.addCacheID(cacheID);
        //    }

        //    return symbol;
        //}

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
                if (unit.isExternalModule()) {
                    var unitPath = unit.getPath();
                    var isDtsFile = unitPath == dtsFile;
                    if (isDtsFile || unitPath == tsFile) {
                        var topLevelDecl = unit.getTopLevelDecl(); // Script
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
                    if (!unit.isExternalModule()) {
                        var topLevelDecl = unit.getTopLevelDecl();
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
            var unitPath = invalidatedDecl.getScriptName();
            var unit = this.getUnit(unitPath);
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

        private cleanDecl(decl: PullDecl) {
            decl.setSymbol(null);
            decl.setSignatureSymbol(null);
            decl.setSpecializingSignatureSymbol(null);
            decl.setIsBound(false);

            var children = decl.getChildDecls();

            for (var i = 0; i < children.length; i++) {
                this.cleanDecl(children[i]);
            }

            var typeParameters = decl.getTypeParameters();

            for (var i = 0; i < typeParameters.length; i++) {
                this.cleanDecl(typeParameters[i]);
            }

            var valueDecl = decl.getValueDecl();

            if (valueDecl) {
                this.cleanDecl(valueDecl);
            }
        }

        private cleanAllDecls() {
            var topLevelDecls = this.collectAllTopLevelDecls();

            // skip the first tld, which contains global primitive symbols
            for (var i = 1; i < topLevelDecls.length; i++) {
                this.cleanDecl(topLevelDecls[i]);
            }

            var synthesizedDecls = this.collectAllSynthesizedDecls();

            for (var i = 0; i < synthesizedDecls.length; i++) {
                this.cleanDecl(synthesizedDecls[i]);
            }

            this.cleanAllSynthesizedDecls();
            this.topLevelDecls = [];
        }

        private cleanAllSynthesizedDecls() {
            for (var i = 0; i < this.units.length; i++) {
                this.units[i].cleanSynthesizedDecls();
            }
        }

        public update() {

            // PULLTODO: Be less aggressive about clearing the cache
            this.declCache = new BlockIntrinsics();
            this.symbolCache = new BlockIntrinsics();
            this.units[0] = new SemanticInfo("");
            this.units[0].addTopLevelDecl(this.getGlobalDecl());
            this.cleanAllDecls();
            for (var unit in this.unitCache) {
                if (this.unitCache[unit]) {
                    this.unitCache[unit].invalidate();
                }
            } 
        }

        public invalidateUnit(compilationUnitPath: string) {
            var unit: SemanticInfo = this.unitCache[compilationUnitPath];
            if (unit) {
                unit.invalidate();
            }
        }

        public getDeclForAST(ast: AST, unitPath: string): PullDecl {
            var unit = <SemanticInfo>this.unitCache[unitPath];

            if (unit) {
                return unit.getDeclForAST(ast);
            }

            return null;
        }

        public getASTForDecl(decl: PullDecl): AST {
            var unit = <SemanticInfo>this.unitCache[decl.getScriptName()];

            if (unit) {
                return unit.getASTForDecl(decl);
            }

            return null;
        }

        public getSymbolForAST(ast: IAST, unitPath: string): PullSymbol {

            if (useDirectTypeStorage) {
                return (<AST>ast).symbol;
            }

            var unit = <SemanticInfo>this.unitCache[unitPath];

            if (unit) {
                return unit.getSymbolForAST(ast);
            }

            return null;
        }

        public getASTForSymbol(symbol: PullSymbol, unitPath: string) {

            if (useDirectTypeStorage) {
                return symbol.ast;
            }

            var unit = <SemanticInfo>this.unitCache[unitPath];

            if (unit) {
                return unit.getASTForSymbol(symbol);
            }

            return null;
        }

        public setSymbolForAST(ast: AST, symbol: PullSymbol, unitPath: string): void {
            if (useDirectTypeStorage) {
                ast.symbol = symbol;
                return;
            }

            var unit = <SemanticInfo>this.unitCache[unitPath];

            if (unit) {
                unit.setSymbolForAST(ast, symbol);
            }
        }

        public getAliasSymbolForAST(ast: IAST, unitPath: string): PullTypeAliasSymbol {
            if (useDirectTypeStorage) {
                return <PullTypeAliasSymbol>(<AST>ast).aliasSymbol;
            }

            var unit = <SemanticInfo>this.unitCache[unitPath];

            if (unit) {
                return unit.getAliasSymbolForAST(ast);
            }

            return null;
        }

        public removeSymbolFromCache(symbol: PullSymbol) {

            var path = [symbol.name];
            var kind = (symbol.kind & PullElementKind.SomeType) !== 0 ? PullElementKind.SomeType : PullElementKind.SomeValue;

            var kindID = this.getDeclPathCacheID(path, kind);
            var symID = this.getDeclPathCacheID(path, symbol.kind);
        }

        public postDiagnostics(): Diagnostic[] {
            var errors: Diagnostic[] = [];

            // PULLTODO: Why are we indexing from 1?
            for (var i = 1; i < this.units.length; i++) {
                this.units[i].getDiagnostics(errors);
            }

            return errors;
        }
    }
}