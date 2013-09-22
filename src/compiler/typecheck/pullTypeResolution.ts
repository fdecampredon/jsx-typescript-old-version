///<reference path='..\typescript.ts' />

module TypeScript {

    export interface IPullTypeCollection {
        getLength(): number;
        getTypeAtIndex(index: number): PullTypeSymbol;
    }

    export interface IPullResolutionData {
        actuals: PullTypeSymbol[];
        exactCandidates: PullSignatureSymbol[];
        conversionCandidates: PullSignatureSymbol[];

        id: number;
    }

    export interface PullApplicableSignature {
        signature: PullSignatureSymbol;
        hasProvisionalErrors: boolean;
    }

    export class PullAdditionalCallResolutionData {
        public targetSymbol: PullSymbol = null;
        public targetTypeSymbol: PullTypeSymbol = null;
        public resolvedSignatures: PullSignatureSymbol[] = null;
        public candidateSignature: PullSignatureSymbol = null;
        public actualParametersContextTypeSymbols: PullTypeSymbol[] = null;
    }

    export class PullAdditionalObjectLiteralResolutionData {
        public membersContextTypeSymbols: PullTypeSymbol[] = null;
    }

    // The resolver associates types with a given AST
    export class PullTypeResolver {
        private _cachedArrayInterfaceType: PullTypeSymbol = null;
        private _cachedNumberInterfaceType: PullTypeSymbol = null;
        private _cachedStringInterfaceType: PullTypeSymbol = null;
        private _cachedBooleanInterfaceType: PullTypeSymbol = null;
        private _cachedObjectInterfaceType: PullTypeSymbol = null;
        private _cachedFunctionInterfaceType: PullTypeSymbol = null;
        private _cachedIArgumentsInterfaceType: PullTypeSymbol = null;
        private _cachedRegExpInterfaceType: PullTypeSymbol = null;

        static typeCheckCallBacks: { (context: PullTypeResolutionContext): void; }[] = [];
        private static postTypeCheckWorkitems: { ast: AST; enclosingDecl: PullDecl; }[] = [];

        private cachedFunctionArgumentsSymbol: PullSymbol = null;

        private seenSuperConstructorCall = false;

        private assignableCache: any[] = <any>{};
        private subtypeCache: any[] = <any>{};
        private identicalCache: any[] = <any>{};

        public currentUnit: SemanticInfo = null;

        public cleanCachedGlobals() {
            this._cachedArrayInterfaceType = null;
            this._cachedNumberInterfaceType = null;
            this._cachedStringInterfaceType = null;
            this._cachedBooleanInterfaceType = null;
            this._cachedObjectInterfaceType = null;
            this._cachedFunctionInterfaceType = null;
            this._cachedIArgumentsInterfaceType = null;
            this._cachedRegExpInterfaceType = null;
            this.cachedFunctionArgumentsSymbol = null;

            this.identicalCache = <any[]>{};
            this.subtypeCache = <any[]>{};
            this.assignableCache = <any[]>{};
        }

        private cachedArrayInterfaceType() {
            if (!this._cachedArrayInterfaceType) {
                this._cachedArrayInterfaceType = <PullTypeSymbol>this.getSymbolFromDeclPath("Array", [], PullElementKind.Interface);
            }

            if (!this._cachedArrayInterfaceType) {
                this._cachedArrayInterfaceType = this.semanticInfoChain.anyTypeSymbol;
            }

            if (!this._cachedArrayInterfaceType.isResolved) {
                this.resolveDeclaredSymbol(this._cachedArrayInterfaceType, null, new PullTypeResolutionContext(this));
            }

            return this._cachedArrayInterfaceType;
        }

        public getCachedArrayType() {
            return this.cachedArrayInterfaceType();
        }

        private cachedNumberInterfaceType() {
            if (!this._cachedNumberInterfaceType) {
                this._cachedNumberInterfaceType = <PullTypeSymbol>this.getSymbolFromDeclPath("Number", [], PullElementKind.Interface);
            }

            if (this._cachedNumberInterfaceType && !this._cachedNumberInterfaceType.isResolved) {
                this.resolveDeclaredSymbol(this._cachedNumberInterfaceType, null, new PullTypeResolutionContext(this));
            }

            return this._cachedNumberInterfaceType;
        }

        private cachedStringInterfaceType() {
            if (!this._cachedStringInterfaceType) {
                this._cachedStringInterfaceType = <PullTypeSymbol>this.getSymbolFromDeclPath("String", [], PullElementKind.Interface);
            }

            if (this._cachedStringInterfaceType && !this._cachedStringInterfaceType.isResolved) {
                this.resolveDeclaredSymbol(this._cachedStringInterfaceType, null, new PullTypeResolutionContext(this));
            }

            return this._cachedStringInterfaceType;
        }

        private cachedBooleanInterfaceType() {
            if (!this._cachedBooleanInterfaceType) {
                this._cachedBooleanInterfaceType = <PullTypeSymbol>this.getSymbolFromDeclPath("Boolean", [], PullElementKind.Interface);
            }

            if (this._cachedBooleanInterfaceType && !this._cachedBooleanInterfaceType.isResolved) {
                this.resolveDeclaredSymbol(this._cachedBooleanInterfaceType, null, new PullTypeResolutionContext(this));
            }

            return this._cachedBooleanInterfaceType;
        }

        private cachedObjectInterfaceType() {
            if (!this._cachedObjectInterfaceType) {
                this._cachedObjectInterfaceType = <PullTypeSymbol>this.getSymbolFromDeclPath("Object", [], PullElementKind.Interface);
            }

            if (!this._cachedObjectInterfaceType) {
                this._cachedObjectInterfaceType = this.semanticInfoChain.anyTypeSymbol;
            }

            if (!this._cachedObjectInterfaceType.isResolved) {
                this.resolveDeclaredSymbol(this._cachedObjectInterfaceType, null, new PullTypeResolutionContext(this));
            }

            return this._cachedObjectInterfaceType;
        }

        private cachedFunctionInterfaceType() {
            if (!this._cachedFunctionInterfaceType) {
                this._cachedFunctionInterfaceType = <PullTypeSymbol>this.getSymbolFromDeclPath("Function", [], PullElementKind.Interface);
            }

            if (this._cachedFunctionInterfaceType && !this._cachedFunctionInterfaceType.isResolved) {
                this.resolveDeclaredSymbol(this._cachedFunctionInterfaceType, null, new PullTypeResolutionContext(this));
            }

            return this._cachedFunctionInterfaceType;
        }

        private cachedIArgumentsInterfaceType() {
            if (!this._cachedIArgumentsInterfaceType) {
                this._cachedIArgumentsInterfaceType = <PullTypeSymbol>this.getSymbolFromDeclPath("IArguments", [], PullElementKind.Interface);
            }

            if (this._cachedIArgumentsInterfaceType && !this._cachedIArgumentsInterfaceType.isResolved) {
                this.resolveDeclaredSymbol(this._cachedIArgumentsInterfaceType, null, new PullTypeResolutionContext(this));
            }

            return this._cachedIArgumentsInterfaceType;
        }

        private cachedRegExpInterfaceType() {
            if (!this._cachedRegExpInterfaceType) {
                this._cachedRegExpInterfaceType = <PullTypeSymbol>this.getSymbolFromDeclPath("RegExp", [], PullElementKind.Interface);
            }

            if (this._cachedRegExpInterfaceType && !this._cachedRegExpInterfaceType.isResolved) {
                this.resolveDeclaredSymbol(this._cachedRegExpInterfaceType, null, new PullTypeResolutionContext(this));
            }

            return this._cachedRegExpInterfaceType;
        }

        constructor(private compilationSettings: CompilationSettings, public semanticInfoChain: SemanticInfoChain, private unitPath: string, inTypeCheck: boolean = false) {

            this.cachedFunctionArgumentsSymbol = new PullSymbol("arguments", PullElementKind.Variable);
            this.cachedFunctionArgumentsSymbol.type = this.cachedIArgumentsInterfaceType() ? this.cachedIArgumentsInterfaceType() : this.semanticInfoChain.anyTypeSymbol;
            this.cachedFunctionArgumentsSymbol.setResolved();

            var functionArgumentsDecl = new PullDecl("arguments", "arguments", PullElementKind.Parameter, PullElementFlags.None, new TextSpan(0, 0), unitPath);
            functionArgumentsDecl.setSymbol(this.cachedFunctionArgumentsSymbol);
            this.cachedFunctionArgumentsSymbol.addDeclaration(functionArgumentsDecl);

            this.currentUnit = this.semanticInfoChain.getUnit(unitPath);
        }

        public getUnitPath() { return this.unitPath; }

        public setUnitPath(unitPath: string) {
            this.unitPath = unitPath;

            this.currentUnit = this.semanticInfoChain.getUnit(unitPath);
        }

        private setTypeChecked(ast: AST, context: PullTypeResolutionContext) {
            if (!context || !context.inProvisionalResolution()) {
                ast.typeCheckPhase = PullTypeResolver.globalTypeCheckPhase;
            }
        }

        private canTypeCheckAST(ast: AST, context: PullTypeResolutionContext) {
            return ast.typeCheckPhase !== PullTypeResolver.globalTypeCheckPhase && context && context.typeCheck() && this.unitPath == context.typeCheckUnitPath;
        }

        public getDeclForAST(ast: AST): PullDecl {
            return this.semanticInfoChain.getDeclForAST(ast, this.unitPath);
        }

        public getSymbolForAST(ast: IAST): PullSymbol {
            return this.semanticInfoChain.getSymbolForAST(ast, this.unitPath);
        }

        private setSymbolForAST(ast: AST, symbol: PullSymbol, context: PullTypeResolutionContext): void {
            if (context && (context.inProvisionalResolution() || context.inSpecialization)) {
                return;
            }

            this.semanticInfoChain.setSymbolForAST(ast, symbol, this.unitPath);
        }

        public getASTForSymbol(symbol: PullSymbol): AST {
            return this.semanticInfoChain.getASTForSymbol(symbol, this.unitPath);
        }

        public getASTForDecl(decl: PullDecl): AST {
            return this.semanticInfoChain.getASTForDecl(decl);
        }

        public getNewErrorTypeSymbol(name: string = null): PullErrorTypeSymbol {
            return new PullErrorTypeSymbol(this.semanticInfoChain.anyTypeSymbol, name);
        }

        public getEnclosingDecl(decl: PullDecl): PullDecl {
            var declPath = getPathToDecl(decl);

            if (!declPath.length) {
                return null;
            }
            else if (declPath.length > 1 && declPath[declPath.length - 1] === decl) {
                return declPath[declPath.length - 2];
            }
            else {
                return declPath[declPath.length - 1];
            }
        }

        private getExportedMemberSymbol(symbol: PullSymbol, parent: PullTypeSymbol): PullSymbol {

            if (!(symbol.kind & (PullElementKind.Method | PullElementKind.Property))) {
                var isContainer = (parent.kind & (PullElementKind.Container | PullElementKind.DynamicModule)) != 0;
                var containerType = !isContainer ? parent.getAssociatedContainerType() : parent;

                if (isContainer && containerType) {
                    if (symbol.hasFlag(PullElementFlags.Exported)) {
                        return symbol;
                    }

                    return null;
                }
            }

            return symbol;
        }

        private getMemberSymbol(symbolName: string, declSearchKind: PullElementKind, parent: PullTypeSymbol) {

            var member: PullSymbol = null;

            if (declSearchKind & PullElementKind.SomeValue) {
                member = parent.findMember(symbolName);
            }
            else if (declSearchKind & PullElementKind.SomeType) {
                member = parent.findNestedType(symbolName);
            }
            else if (declSearchKind & PullElementKind.SomeContainer) {
                member = parent.findNestedContainer(symbolName);
            }

            if (member) {
                return this.getExportedMemberSymbol(member, parent);
            }

            var containerType = parent.getAssociatedContainerType();

            if (containerType) {

                // If we were searching over the constructor type, we don't want to also search
                // over the class instance type (we only want to consider static fields)
                if (containerType.isClass()) {
                    return null;
                }

                parent = containerType;

                if (declSearchKind & PullElementKind.SomeValue) {
                    member = parent.findMember(symbolName);
                }
                else if (declSearchKind & PullElementKind.SomeType) {
                    member = parent.findNestedType(symbolName);
                }
                else if (declSearchKind & PullElementKind.SomeContainer) {
                    member = parent.findNestedContainer(symbolName);
                }

                if (member) {
                    return this.getExportedMemberSymbol(member, parent);
                }
            }

            if (parent.kind & PullElementKind.SomeContainer) {
                var typeDeclarations = parent.getDeclarations();
                var childDecls: PullDecl[] = null;

                for (var j = 0; j < typeDeclarations.length; j++) {
                    childDecls = typeDeclarations[j].searchChildDecls(symbolName, declSearchKind);

                    if (childDecls.length) {
                        member = childDecls[0].getSymbol();

                        if (!member) {
                            member = childDecls[0].getSignatureSymbol();
                        }
                        return this.getExportedMemberSymbol(member, parent);
                    }

                    // If we were looking  for some type or value, we need to look for alias so we can see if it has associated value or type symbol with it
                    if ((declSearchKind & PullElementKind.SomeType) != 0 || (declSearchKind & PullElementKind.SomeValue) != 0) {
                        childDecls = typeDeclarations[j].searchChildDecls(symbolName, PullElementKind.TypeAlias);
                        if (childDecls.length && childDecls[0].kind == PullElementKind.TypeAlias) { // this can return container or dynamic module
                            var aliasSymbol = <PullTypeAliasSymbol>this.getExportedMemberSymbol(childDecls[0].getSymbol(), parent);
                            if (aliasSymbol) {
                                if ((declSearchKind & PullElementKind.SomeType) != 0) {
                                    // Some type
                                    var typeSymbol = aliasSymbol.getExportAssignedTypeSymbol();
                                    if (typeSymbol) {
                                        return typeSymbol;
                                    }
                                } else {
                                    // Some value
                                    var valueSymbol = aliasSymbol.getExportAssignedValueSymbol();
                                    if (valueSymbol) {
                                        return valueSymbol;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // search for an unqualified symbol name within a given decl path
        private getSymbolFromDeclPath(symbolName: string, declPath: PullDecl[], declSearchKind: PullElementKind): PullSymbol {
            var symbol: PullSymbol = null;

            // search backwards through the decl list
            //  - if the decl in question is a function, search its members
            //  - if the decl in question is a module, search the decl then the symbol
            //  - Otherwise, search globally

            var decl: PullDecl = null;
            var childDecls: PullDecl[];
            var declSymbol: PullTypeSymbol = null;
            var declMembers: PullSymbol[];
            var pathDeclKind: PullElementKind;
            var valDecl: PullDecl = null;
            var kind: PullElementKind;
            var instanceSymbol: PullSymbol = null;
            var instanceType: PullTypeSymbol = null;
            var childSymbol: PullSymbol = null;

            for (var i = declPath.length - 1; i >= 0; i--) {
                decl = declPath[i];
                pathDeclKind = decl.kind;

                if (decl.flags & PullElementFlags.DeclaredInAWithBlock) {
                    return this.semanticInfoChain.anyTypeSymbol;
                }

                if (pathDeclKind & (PullElementKind.Container | PullElementKind.DynamicModule)) {

                    // first check locally
                    childDecls = decl.searchChildDecls(symbolName, declSearchKind);

                    if (childDecls.length) {
                        return childDecls[0].getSymbol();
                    }

                    if (declSearchKind & PullElementKind.SomeValue) {

                        // search "split" exported members
                        instanceSymbol = (<PullContainerSymbol>decl.getSymbol()).getInstanceSymbol();

                        // Maybe there's an import statement aliasing an initalized value?
                        childDecls = decl.searchChildDecls(symbolName, PullElementKind.TypeAlias);

                        if (childDecls.length) {
                            var sym = childDecls[0].getSymbol();

                            if (sym.isAlias()) {
                                return sym;
                            }
                        }

                        if (instanceSymbol) {
                            instanceType = instanceSymbol.type;

                            childSymbol = this.getMemberSymbol(symbolName, declSearchKind, instanceType);

                            // Make sure we are not picking up a static from a class (it is never in scope)
                            if (childSymbol && (childSymbol.kind & declSearchKind) && !childSymbol.hasFlag(PullElementFlags.Static)) {
                                return childSymbol;
                            }
                        }

                        valDecl = decl.getValueDecl();

                        if (valDecl) {
                            decl = valDecl;
                        }
                    }

                    // otherwise, check the members
                    declSymbol = decl.getSymbol().type;

                    var childSymbol = this.getMemberSymbol(symbolName, declSearchKind, declSymbol);

                    if (childSymbol && (childSymbol.kind & declSearchKind) && !childSymbol.hasFlag(PullElementFlags.Static)) {
                        return childSymbol;
                    }
                }
                else if ((declSearchKind & (PullElementKind.SomeType | PullElementKind.SomeContainer)) || !(pathDeclKind & PullElementKind.Class)) {
                    var candidateSymbol: PullSymbol = null;

                    // If the decl is a function expression, we still want to check its children since it may be shadowed by one
                    // of its parameters
                    if (pathDeclKind === PullElementKind.FunctionExpression && symbolName === (<PullFunctionExpressionDecl>decl).getFunctionExpressionName()) {
                        candidateSymbol = decl.getSymbol();
                    }

                    childDecls = decl.searchChildDecls(symbolName, declSearchKind);

                    if (childDecls.length) {
                        // if the enclosing decl is a function of some sort, we need to ensure that it's bound
                        // otherwise, the child decl may not be properly bound if it's a parameter (since they're
                        // bound when binding the function symbol)
                        if (decl.kind & PullElementKind.SomeFunction) {
                            decl.ensureSymbolIsBound();
                        }
                        return childDecls[0].getSymbol();
                    }

                    if (candidateSymbol) {
                        return candidateSymbol;
                    }

                    if (declSearchKind & PullElementKind.SomeValue) {
                        childDecls = decl.searchChildDecls(symbolName, PullElementKind.TypeAlias);

                        if (childDecls.length) {
                            var sym = childDecls[0].getSymbol();

                            if (sym.isAlias()) {
                                return sym;
                            }
                        }
                    }
                }
            }

            // otherwise, search globally
            symbol = this.semanticInfoChain.findSymbol([symbolName], declSearchKind);

            return symbol;
        }

        private getVisibleDeclsFromDeclPath(declPath: PullDecl[], declSearchKind: PullElementKind): PullDecl[] {
            var result: PullDecl[] = [];
            var decl: PullDecl = null;
            var childDecls: PullDecl[];
            var pathDeclKind: PullElementKind;

            for (var i = declPath.length - 1; i >= 0; i--) {
                decl = declPath[i];
                pathDeclKind = decl.kind;

                var declKind = decl.kind;

                // First add locals
                // Child decls of classes and interfaces are members, and should only be visible as members of 'this'
                if (declKind !== PullElementKind.Class && declKind !== PullElementKind.Interface) {
                    this.addFilteredDecls(decl.getChildDecls(), declSearchKind, result);
                }

                switch (declKind) {
                    case PullElementKind.Container:
                    case PullElementKind.DynamicModule:
                        // Add members from other instances
                        var otherDecls = this.semanticInfoChain.findDeclsFromPath(declPath.slice(0, i + 1), PullElementKind.SomeContainer);
                        for (var j = 0, m = otherDecls.length; j < m; j++) {
                            var otherDecl = otherDecls[j];
                            if (otherDecl === decl) {
                                continue;
                            }

                            var otherDeclChildren = otherDecl.getChildDecls();
                            for (var k = 0, s = otherDeclChildren.length; k < s; k++) {
                                var otherDeclChild = otherDeclChildren[k];
                                if ((otherDeclChild.flags & PullElementFlags.Exported) && (otherDeclChild.kind & declSearchKind)) {
                                    result.push(otherDeclChild);
                                }
                            }
                        }

                        break;

                    case PullElementKind.Class:
                    case PullElementKind.Interface:
                        // Add generic types prameters
                        var parameters = decl.getTypeParameters();
                        if (parameters && parameters.length) {
                            this.addFilteredDecls(parameters, declSearchKind, result);
                        }

                        break;

                    case PullElementKind.FunctionExpression:
                        var functionExpressionName = (<PullFunctionExpressionDecl>decl).getFunctionExpressionName();
                        if (functionExpressionName) {
                            result.push(decl);
                        }
                    // intentional fall through

                    case PullElementKind.Function:
                    case PullElementKind.ConstructorMethod:
                    case PullElementKind.Method:
                        // Add generic types prameters
                        var parameters = decl.getTypeParameters();
                        if (parameters && parameters.length) {
                            this.addFilteredDecls(parameters, declSearchKind, result);
                        }

                        break;
                }
            }

            // Get the global decls
            var units = this.semanticInfoChain.units;
            for (var i = 0, n = units.length; i < n; i++) {
                var unit = units[i];
                if (unit === this.currentUnit && declPath.length != 0) {
                    // Current unit has already been processed. skip it.
                    continue;
                }

                if (!unit.isExternalModule()) {
                    var topLevelDecl = unit.getTopLevelDecl();
                    this.addFilteredDecls(topLevelDecl.getChildDecls(), declSearchKind, result)
                }
            }

            return result;
        }

        private addFilteredDecls(decls: PullDecl[], declSearchKind: PullElementKind, result: PullDecl[]): void {
            if (decls.length) {
                for (var i = 0, n = decls.length; i < n; i++) {
                    var decl = decls[i];
                    if (decl.kind & declSearchKind) {
                        result.push(decl);
                    }
                }
            }
        }

        public getVisibleDecls(enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullDecl[] {

            var declPath: PullDecl[] = enclosingDecl !== null ? getPathToDecl(enclosingDecl) : <PullDecl[]>[];

            if (enclosingDecl && !declPath.length) {
                declPath = [enclosingDecl];
            }

            var declSearchKind: PullElementKind = PullElementKind.SomeType | PullElementKind.SomeContainer | PullElementKind.SomeValue;

            return this.getVisibleDeclsFromDeclPath(declPath, declSearchKind);
        }

        public getVisibleContextSymbols(enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol[] {
            var contextualTypeSymbol = context.getContextualType();
            if (!contextualTypeSymbol || this.isAnyOrEquivalent(contextualTypeSymbol)) {
                return null;
            }

            var declSearchKind: PullElementKind = PullElementKind.SomeType | PullElementKind.SomeContainer | PullElementKind.SomeValue;
            var members: PullSymbol[] = contextualTypeSymbol.getAllMembers(declSearchKind, GetAllMembersVisiblity.externallyVisible);

            for (var i = 0; i < members.length; i++) {
                members[i].setUnresolved();
            }

            return members;
        }

        public getVisibleMembersFromExpression(expression: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol[] {

            var prevCanUseTypeSymbol = context.canUseTypeSymbol;
            var prevResolvingNamespaceMemberAccess = context.resolvingNamespaceMemberAccess;
            context.canUseTypeSymbol = true;
            context.resolvingNamespaceMemberAccess = true;
            var lhs = this.resolveAST(expression, false, enclosingDecl, context);
            context.canUseTypeSymbol = prevCanUseTypeSymbol;
            context.resolvingNamespaceMemberAccess = prevResolvingNamespaceMemberAccess;

            if (context.resolvingTypeReference && (lhs.kind === PullElementKind.Class || lhs.kind === PullElementKind.Interface)) {
                // No more sub types in these types
                return null;
            }

            var lhsType = lhs.type;
            if (!lhsType) {
                return null;
            }

            if (!lhsType.isResolved) {
                this.resolveDeclaredSymbol(lhsType, enclosingDecl, context);
            }

            if (lhsType.isContainer() && lhsType.isAlias()) {
                lhsType = (<PullTypeAliasSymbol>lhsType).getExportAssignedTypeSymbol();
            }

            if (this.isAnyOrEquivalent(lhsType)) {
                return null;
            }

            // Figure out if privates are available under the current scope
            var memberVisibilty = GetAllMembersVisiblity.externallyVisible;
            var containerSymbol = lhsType;
            if (containerSymbol.kind === PullElementKind.ConstructorType) {
                containerSymbol = containerSymbol.getConstructSignatures()[0].returnType;
            }

            if (containerSymbol && containerSymbol.isClass()) {
                var declPath = getPathToDecl(enclosingDecl);
                if (declPath && declPath.length) {
                    var declarations = containerSymbol.getDeclarations();
                    for (var i = 0, n = declarations.length; i < n; i++) {
                        var declaration = declarations[i];
                        if (ArrayUtilities.contains(declPath, declaration)) {
                            memberVisibilty = GetAllMembersVisiblity.internallyVisible;
                            break;
                        }
                    }
                }
            }

            var declSearchKind: PullElementKind = PullElementKind.SomeType | PullElementKind.SomeContainer | PullElementKind.SomeValue;

            var members: PullSymbol[] = [];

            if (lhsType.isContainer()) {
                var exportedAssignedContainerSymbol = (<PullContainerSymbol>lhsType).getExportAssignedContainerSymbol();
                if (exportedAssignedContainerSymbol) {
                    lhsType = exportedAssignedContainerSymbol;
                }
            }

            // could be a type parameter with a contraint
            if (lhsType.isTypeParameter()) {
                var constraint = (<PullTypeParameterSymbol>lhsType).getConstraint();

                if (constraint) {
                    lhsType = constraint;
                    members = lhsType.getAllMembers(declSearchKind, GetAllMembersVisiblity.externallyVisible);
                }
            }
            else {
                // could be an enum member
                if (lhs.kind == PullElementKind.EnumMember) {
                    lhsType = this.semanticInfoChain.numberTypeSymbol;
                }

                // could be a number
                if (lhsType === this.semanticInfoChain.numberTypeSymbol && this.cachedNumberInterfaceType()) {
                    lhsType = this.cachedNumberInterfaceType();
                }
                // could be a string
                else if (lhsType === this.semanticInfoChain.stringTypeSymbol && this.cachedStringInterfaceType()) {
                    lhsType = this.cachedStringInterfaceType();
                }
                // could be a boolean
                else if (lhsType === this.semanticInfoChain.booleanTypeSymbol && this.cachedBooleanInterfaceType()) {
                    lhsType = this.cachedBooleanInterfaceType();
                }

                if (!lhsType.isResolved) {
                    var potentiallySpecializedType = <PullTypeSymbol>this.resolveDeclaredSymbol(lhsType, enclosingDecl, context);

                    if (potentiallySpecializedType != lhsType) {
                        if (!lhs.isType()) {
                            context.setTypeInContext(lhs, potentiallySpecializedType);
                        }

                        lhsType = potentiallySpecializedType;
                    }
                }

                members = lhsType.getAllMembers(declSearchKind, memberVisibilty);

                if (lhsType.isContainer()) {
                    var associatedInstance = (<PullContainerSymbol>lhsType).getInstanceSymbol();
                    if (associatedInstance) {
                        var instanceType = associatedInstance.type;
                        if (!instanceType.isResolved) {
                            this.resolveDeclaredSymbol(instanceType, enclosingDecl, context);
                        }
                        var instanceMembers = instanceType.getAllMembers(declSearchKind, memberVisibilty);
                        members = members.concat(instanceMembers);

                        if (instanceType.isConstructor()) {
                            // If this is a cladule
                            members.push(this.createPrototypeSymbol(instanceType));
                        }
                    }

                    var exportedContainer = (<PullContainerSymbol>lhsType).getExportAssignedContainerSymbol();
                    if (exportedContainer) {
                        var exportedContainerMembers = exportedContainer.getAllMembers(declSearchKind, memberVisibilty);
                        members = members.concat(exportedContainerMembers);
                    }
                }
                // Constructor types have a "prototype" property
                else if (lhsType.isConstructor()) {
                    members.push(this.createPrototypeSymbol(lhsType));
                }
                else {
                    var associatedContainerSymbol = lhsType.getAssociatedContainerType();
                    if (associatedContainerSymbol) {
                        var containerType = associatedContainerSymbol.type;
                        if (!containerType.isResolved) {
                            this.resolveDeclaredSymbol(containerType, enclosingDecl, context);
                        }
                        var containerMembers = containerType.getAllMembers(declSearchKind, memberVisibilty);
                        members = members.concat(containerMembers);
                    }
                }
            }

            // could be a function symbol
            if ((lhsType.getCallSignatures().length || lhsType.getConstructSignatures().length) && this.cachedFunctionInterfaceType()) { 
                members = members.concat(this.cachedFunctionInterfaceType().getAllMembers(declSearchKind, GetAllMembersVisiblity.externallyVisible));
            }

            return members;
        }

        private createPrototypeSymbol(constructorTypeSymbol: PullTypeSymbol): PullSymbol {
            var prototypeStr = "prototype";
            var prototypeSymbol = new PullSymbol(prototypeStr, PullElementKind.Property);
            var parentDecl = constructorTypeSymbol.getDeclarations()[0];
            var prototypeDecl = new PullDecl(prototypeStr, prototypeStr, parentDecl.kind, parentDecl.flags, parentDecl.getSpan(), parentDecl.getScriptName());

            this.currentUnit.addSynthesizedDecl(prototypeDecl);

            prototypeDecl.setParentDecl(parentDecl);
            prototypeSymbol.addDeclaration(prototypeDecl);
            prototypeSymbol.type = constructorTypeSymbol.getAssociatedContainerType();
            prototypeSymbol.isResolved = true;

            return prototypeSymbol;
        }

        public isAnyOrEquivalent(type: PullTypeSymbol) {
            return (type === this.semanticInfoChain.anyTypeSymbol) || type.isError();
        }

        public isNumberOrEquivalent(type: PullTypeSymbol) {
            return (type === this.semanticInfoChain.numberTypeSymbol) || (this.cachedNumberInterfaceType() && type === this.cachedNumberInterfaceType());
        }

        public isTypeArgumentOrWrapper(type: PullTypeSymbol) {
            if (!type) {
                return false;
            }

            if (!type.isGeneric()) {
                return false;
            }

            if (type.isTypeParameter()) {
                return true;
            }

            if (type.isArray()) {
                return this.isTypeArgumentOrWrapper(type.getElementType());
            }

            var typeArguments = type.getTypeArguments();

            if (typeArguments) {
                for (var i = 0; i < typeArguments.length; i++) {
                    if (this.isTypeArgumentOrWrapper(typeArguments[i])) {
                        return true;
                    }
                }
            }
            else {
                // if there are no type arguments, but the type is generic, we're just returning
                // the unspecialized version of the type (e.g., via a recursive call)
                return true;
            }

            if (type.kind & (PullElementKind.ObjectLiteral | PullElementKind.ObjectType)) {
                return type.getHasGenericMember();
            }

            return false;
        }

        private resolveExternalModuleReference(idText: string, currentFileName: string): PullContainerSymbol {
            var originalIdText = idText;
            var symbol: PullContainerSymbol = null;

            if (isRelative(originalIdText)) {
                // Find the module relative to current file
                var path = getRootFilePath(switchToForwardSlashes(currentFileName));
                symbol = this.semanticInfoChain.findExternalModule(path + idText);
            } else {
                idText = originalIdText;

                // Search in global context if there exists ambient module
                symbol = this.semanticInfoChain.findAmbientExternalModuleInGlobalContext(quoteStr(originalIdText));

                if (!symbol) {
                    // REVIEW: Technically, we shouldn't have to normalize here - we should normalize in addUnit.
                    // Still, normalizing here alows any language services to be free of assumptions
                    var path = getRootFilePath(switchToForwardSlashes(currentFileName));

                    // Search for external modules compiled (.d.ts or .ts files) starting with current files directory to root directory until we find the module
                    while (symbol === null && path != "") {
                        symbol = this.semanticInfoChain.findExternalModule(path + idText);
                        if (symbol === null) {
                            if (path === '/') {
                                path = '';
                            } else {
                                path = normalizePath(path + "..");
                                path = path && path != '/' ? path + '/' : path;
                            }
                        }
                    }
                }
            }

            return symbol;
        }

        // PULLTODO: VERY IMPORTANT
        // Right now, the assumption is that the declaration's parse tree is still in memory
        // we need to add a cache-in/cache-out mechanism so that we can break the dependency on in-memory ASTs
        public resolveDeclaredSymbol(symbol: PullSymbol, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            if (!symbol || symbol.isResolved) {
                return symbol;
            }

            // This is called while we're resolving type references.  Make sure we're no longer
            // considered to be in that state when we resolve the actual declaration.
            var savedResolvingTypeReference = context.resolvingTypeReference;
            context.resolvingTypeReference = false;

            var savedIsInStaticInitializer = context.isInStaticInitializer
            context.isInStaticInitializer = false;

            var savedIsResolvingSuperConstructorCallArgument = context.isResolvingSuperConstructorCallArgument;
            context.isResolvingSuperConstructorCallArgument = false;

            var savedInConstructorArguments = context.inConstructorArguments;
            context.inConstructorArguments = false;

            var savedResolvingTypeNameAsNameExpression = context.resolvingTypeNameAsNameExpression;
            context.resolvingTypeNameAsNameExpression = false;

            var savedTypeSpecializationStack = context.getTypeSpecializationStack();
            context.setTypeSpecializationStack([]);

            var savedResolvingNamespaceMemberAccess = context.resolvingNamespaceMemberAccess;
            context.resolvingNamespaceMemberAccess = false;

            var result = this.resolveDeclaredSymbolWorker(symbol, enclosingDecl, context);

            context.resolvingNamespaceMemberAccess = savedResolvingNamespaceMemberAccess;
            context.setTypeSpecializationStack(savedTypeSpecializationStack);
            context.resolvingTypeNameAsNameExpression = savedResolvingTypeNameAsNameExpression;
            context.inConstructorArguments = savedInConstructorArguments;
            context.isResolvingSuperConstructorCallArgument = savedIsResolvingSuperConstructorCallArgument;
            context.isInStaticInitializer = savedIsInStaticInitializer;
            context.resolvingTypeReference = savedResolvingTypeReference;

            return result;
        }

        private resolveDeclaredSymbolWorker(symbol: PullSymbol, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            if (!symbol || symbol.isResolved) {
                return symbol;
            }

            if (symbol.inResolution) {
                if (!symbol.currentlyBeingSpecialized()) {
                    if (!symbol.type && !symbol.isType()) {
                        symbol.type = this.semanticInfoChain.anyTypeSymbol;
                    }

                    return symbol;
                }
            }

            var thisUnit = this.unitPath;

            var decls = symbol.getDeclarations();

            var ast: AST = null;

            // We want to walk and resolve all associated decls, so we can catch
            // cases like function overloads that may be spread across multiple
            // logical declarations
            for (var i = 0; i < decls.length; i++) {
                var decl = decls[i];

                ast = this.semanticInfoChain.getASTForDecl(decl);

                // if it's an object literal member, just return the symbol and wait for
                // the object lit to be resolved
                if (!ast || ast.nodeType() === NodeType.Member) {
                    // We'll return the cached results, and let the decl be corrected on the next invalidation
                    this.setUnitPath(thisUnit);
                    return symbol;
                }

                this.setUnitPath(decl.getScriptName());
                var resolvedSymbol = this.resolveAST(ast, /*inContextuallyTypedAssignment*/false, enclosingDecl, context);

                // if the symbol is a parameter property referenced in an out-of-order fashion, it may not have been resolved
                // along with the original property, so we need to "fix" its type here
                if (decl.kind == PullElementKind.Parameter &&
                    !symbol.isResolved &&
                    !symbol.type &&
                    resolvedSymbol &&
                    symbol.hasFlag(PullElementFlags.PropertyParameter | PullElementFlags.ConstructorParameter)) {

                    symbol.type = resolvedSymbol.type;
                    symbol.setResolved();
                }
            }

            var typeArgs = symbol.isType() ? (<PullTypeSymbol>symbol).getTypeArguments() : null;

            if (typeArgs && typeArgs.length) {
                var typeParameters = (<PullTypeSymbol>symbol).getTypeParameters();
                var typeCache: any = {};

                for (var i = 0; i < typeParameters.length; i++) {
                    typeCache[typeParameters[i].pullSymbolIDString] = typeArgs[i];
                }

                context.pushTypeSpecializationCache(typeCache);
                var rootType = getRootType(symbol.type);

                var specializedSymbol = specializeType(rootType, typeArgs, this, enclosingDecl, context);

                context.popTypeSpecializationCache();

                symbol = specializedSymbol;
            }

            this.setUnitPath(thisUnit);

            return symbol;
        }

        private resolveOtherDeclarations(ast: AST, context: PullTypeResolutionContext) {
            var resolvedDecl = this.getDeclForAST(ast);
            var symbol = resolvedDecl.getSymbol();

            var allDecls = symbol.getDeclarations();
            for (var i = 0; i < allDecls.length; i++) {
                var currentDecl = allDecls[i];
                var astForCurrentDecl = this.getASTForDecl(currentDecl);
                if (astForCurrentDecl != ast) {
                    var unitPath = this.unitPath;
                    this.setUnitPath(currentDecl.getScriptName());
                    this.resolveAST(astForCurrentDecl, false, this.getEnclosingDecl(currentDecl), context);
                    this.setUnitPath(unitPath);
                }
            }
        }

        //
        // Resolve a module declaration
        //
        //
        private resolveModuleDeclaration(ast: ModuleDeclaration, context: PullTypeResolutionContext): PullTypeSymbol {
            var containerDecl = this.getDeclForAST(ast);
            var containerSymbol = <PullContainerSymbol>containerDecl.getSymbol();

            if (containerSymbol.isResolved || containerSymbol.inResolution) {
                return containerSymbol;
            }

            containerSymbol.inResolution = true;

            var containerDecls = containerSymbol.getDeclarations();

            for (var i = 0; i < containerDecls.length; i++) {

                var childDecls = containerDecls[i].getChildDecls();

                for (var j = 0; j < childDecls.length; j++) {
                    childDecls[j].ensureSymbolIsBound();
                }
            }

            var members = ast.members.members;

            if (containerDecl.kind != PullElementKind.Enum) {

                var instanceSymbol = containerSymbol.getInstanceSymbol();

                // resolve the instance variable, if neccesary
                if (instanceSymbol) {
                    this.resolveDeclaredSymbol(instanceSymbol, containerDecl.getParentDecl(), context);
                }

                for (var i = 0; i < members.length; i++) {
                    if (members[i].nodeType() == NodeType.ExportAssignment) {
                        this.resolveExportAssignmentStatement(<ExportAssignment>members[i], containerDecl, context);
                        break;
                    }
                }
            }

            containerSymbol.setResolved();

            this.resolveOtherDeclarations(ast, context);

            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckModuleDeclaration(ast, context);
            }

            return containerSymbol;
        }

        private typeCheckModuleDeclaration(ast: ModuleDeclaration, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);

            var containerDecl = this.getDeclForAST(ast);
            this.resolveAST(ast.members, false, containerDecl, context);
            this.validateVariableDeclarationGroups(containerDecl, context);

            if (isRelative(stripStartAndEndQuotes(ast.name.actualText))) {
                this.currentUnit.addDiagnostic(new Diagnostic(this.currentUnit.getPath(),
                    ast.name.minChar, ast.name.getLength(), DiagnosticCode.Ambient_external_module_declaration_cannot_specify_relative_module_name));
            }
        }

        public isTypeRefWithoutTypeArgs(typeRef: TypeReference) {
            if (typeRef.nodeType() != NodeType.TypeRef) {
                return false;
            }

            if (typeRef.term.nodeType() == NodeType.Name) {
                return true;
            }
            else if (typeRef.term.nodeType() == NodeType.MemberAccessExpression) {
                var binex = <BinaryExpression>typeRef.term;

                if (binex.operand2.nodeType() == NodeType.Name) {
                    return true;
                }
            }

            return false;
        }

        //
        // Resolve a reference type (class or interface) type parameters, implements and extends clause, members, call, construct and index signatures
        //
        private resolveReferenceTypeDeclaration(typeDeclAST: TypeDeclaration, context: PullTypeResolutionContext): PullSymbol {
            var typeDecl: PullDecl = this.getDeclForAST(typeDeclAST);
            var enclosingDecl = this.getEnclosingDecl(typeDecl);
            var typeDeclSymbol = <PullTypeSymbol>typeDecl.getSymbol();
            var typeDeclIsClass = typeDeclAST.nodeType() === NodeType.ClassDeclaration;
            var hasVisited = this.getSymbolForAST(typeDeclAST) != null;

            if ((typeDeclSymbol.isResolved && hasVisited) || (typeDeclSymbol.inResolution && !context.isInBaseTypeResolution())) {
                return typeDeclSymbol;
            }

            var wasResolving = typeDeclSymbol.inResolution;
            typeDeclSymbol.startResolving();

            // Resolve Type Parameters

            if (!typeDeclSymbol.isResolved) {
                var typeDeclTypeParameters = typeDeclSymbol.getTypeParameters();
                for (var i = 0; i < typeDeclTypeParameters.length; i++) {
                    this.resolveDeclaredSymbol(typeDeclTypeParameters[i], typeDecl, context);
                }
            }

            // ensure that all members are bound
            var typeRefDecls = typeDeclSymbol.getDeclarations();

            for (var i = 0; i < typeRefDecls.length; i++) {

                var childDecls = typeRefDecls[i].getChildDecls();

                for (var j = 0; j < childDecls.length; j++) {
                    childDecls[j].ensureSymbolIsBound();
                }
            }

            var wasInBaseTypeResolution = context.startBaseTypeResolution();

            // if it's a "split" interface type, we'll need to consider constituent extends lists separately
            if (!typeDeclIsClass && !hasVisited) {
                typeDeclSymbol.resetKnownBaseTypeCount();
            }

            // Extends list
            if (typeDeclAST.extendsList) {
                var savedIsResolvingClassExtendedType = context.isResolvingClassExtendedType;
                if (typeDeclIsClass) {
                    context.isResolvingClassExtendedType = true;
                }

                for (var i = typeDeclSymbol.getKnownBaseTypeCount(); i < typeDeclAST.extendsList.members.length; i = typeDeclSymbol.getKnownBaseTypeCount()) {
                    typeDeclSymbol.incrementKnownBaseCount();
                    var parentType = this.resolveTypeReference(new TypeReference(typeDeclAST.extendsList.members[i], 0), typeDecl, context);

                    if (typeDeclSymbol.isValidBaseKind(parentType, true)) {
                        this.setSymbolForAST(typeDeclAST.extendsList.members[i], parentType, null /* setting it without context so that we record the baseType associated with the members */);

                        // Do not add parentType as a base if it already added, or if it will cause a cycle as it already inherits from typeDeclSymbol
                        if (!typeDeclSymbol.hasBase(parentType) && !parentType.hasBase(typeDeclSymbol)) {
                            typeDeclSymbol.addExtendedType(parentType);

                            var specializations = typeDeclSymbol.getKnownSpecializations();

                            for (var j = 0; j < specializations.length; j++) {
                                specializations[j].addExtendedType(parentType);
                            }
                        }
                    } else if (parentType && !this.getSymbolForAST(typeDeclAST.extendsList.members[i])) {
                        this.setSymbolForAST(typeDeclAST.extendsList.members[i], parentType, null /* setting it without context so that we record the baseType associated with the members */);
                    }
                }

                context.isResolvingClassExtendedType = savedIsResolvingClassExtendedType;
            }

            if (typeDeclAST.implementsList && typeDeclIsClass) {
                var extendsCount = typeDeclAST.extendsList ? typeDeclAST.extendsList.members.length : 0;
                for (var i = typeDeclSymbol.getKnownBaseTypeCount(); ((i - extendsCount) >= 0) && ((i - extendsCount) < typeDeclAST.implementsList.members.length); i = typeDeclSymbol.getKnownBaseTypeCount()) {
                    typeDeclSymbol.incrementKnownBaseCount();
                    var implementedTypeAST = typeDeclAST.implementsList.members[i - extendsCount];
                    var implementedType = this.resolveTypeReference(new TypeReference(implementedTypeAST, 0), typeDecl, context);
                    
                    if (typeDeclSymbol.isValidBaseKind(implementedType, false)) {
                        this.setSymbolForAST(typeDeclAST.implementsList.members[i - extendsCount], implementedType, null /* setting it without context so that we record the baseType associated with the members */);

                        // Do not add parentType as a base if it already added, or if it will cause a cycle as it already inherits from typeDeclSymbol
                        if (!typeDeclSymbol.hasBase(implementedType) && !implementedType.hasBase(typeDeclSymbol)) {
                            typeDeclSymbol.addImplementedType(implementedType);
                        }
                    } else if (implementedType && !this.getSymbolForAST(typeDeclAST.implementsList.members[i - extendsCount])) {
                        this.setSymbolForAST(typeDeclAST.implementsList.members[i - extendsCount], implementedType, null /* setting it without context so that we record the baseType associated with the members */);
                    }
                }
            }

            context.doneBaseTypeResolution(wasInBaseTypeResolution);
            
            if (wasInBaseTypeResolution) {

                // Do not resolve members as yet
                typeDeclSymbol.inResolution = false;

                // Store off and resolve the reference type after we've finished checking the file
                // (This way, we'll still properly resolve the type even if its parent was already resolved during
                // base type resolution, making the type otherwise inaccessible).
                PullTypeResolver.typeCheckCallBacks.push((context) => {
                    var currentUnitPath = this.unitPath;
                    this.setUnitPath(typeDecl.getScriptName());

                    if (typeDeclAST.nodeType() == NodeType.ClassDeclaration) {
                        this.resolveClassDeclaration(<ClassDeclaration>typeDeclAST, context);
                    } else {
                        this.resolveInterfaceDeclaration(typeDeclAST, context);
                    }

                    this.setUnitPath(currentUnitPath);
                });

                return typeDeclSymbol;
            }

            if (!typeDeclSymbol.isResolved) {
                if (globalBinder) {
                    globalBinder.resetTypeParameterCache();
                }

                if (!typeDeclIsClass) {
                    // Resolve call, construct and index signatures
                    var callSignatures = typeDeclSymbol.getCallSignatures();
                    for (var i = 0; i < callSignatures.length; i++) {
                        this.resolveDeclaredSymbol(callSignatures[i], typeDecl, context);
                    }

                    var constructSignatures = typeDeclSymbol.getConstructSignatures();
                    for (var i = 0; i < constructSignatures.length; i++) {
                        this.resolveDeclaredSymbol(constructSignatures[i], typeDecl, context);
                    }

                    var indexSignatures = typeDeclSymbol.getIndexSignatures();
                    for (var i = 0; i < indexSignatures.length; i++) {
                        this.resolveDeclaredSymbol(indexSignatures[i], typeDecl, context);
                    }
                }
            }

            this.setSymbolForAST(typeDeclAST.name, typeDeclSymbol, context);
            this.setSymbolForAST(typeDeclAST, typeDeclSymbol, context);

            typeDeclSymbol.setResolved();

            return typeDeclSymbol;
        }

        //
        // Resolve a class declaration
        //
        // A class's implements and extends lists are not pre-bound, so they must be bound here
        // Once bound, we can add the parent type's members to the class
        //
        private resolveClassDeclaration(classDeclAST: ClassDeclaration, context: PullTypeResolutionContext): PullTypeSymbol {
            var classDecl: PullDecl = this.getDeclForAST(classDeclAST);
            var classDeclSymbol = <PullTypeSymbol>classDecl.getSymbol();
            if (!classDeclSymbol.isResolved) {
                this.resolveReferenceTypeDeclaration(classDeclAST, context);

                var constructorMethod = classDeclSymbol.getConstructorMethod();
                var extendedTypes = classDeclSymbol.getExtendedTypes();
                var parentType = extendedTypes.length ? extendedTypes[0] : null;

                if (constructorMethod) {
                    var constructorTypeSymbol = constructorMethod.type;

                    var constructSignatures = constructorTypeSymbol.getConstructSignatures();

                    if (!constructSignatures.length) {
                        var constructorSignature: PullSignatureSymbol;

                        var parentConstructor = parentType ? parentType.getConstructorMethod() : null;

                        // inherit parent's constructor signatures   
                        if (parentConstructor) {
                            var parentConstructorType = parentConstructor.type;
                            var parentConstructSignatures = parentConstructorType.getConstructSignatures();

                            var parentConstructSignature: PullSignatureSymbol;
                            var parentParameters: PullSymbol[];

                            if (!parentConstructSignatures.length) {
                                // If neither we nor our parent have a construct signature then we've entered this call recursively,
                                // so just create the parent's constructor now rather than later.
                                // (We'll have begun resolving this symbol because of the call to resolveReferenceTypeDeclaration above, so this
                                // is safe to do here and now.)

                                parentConstructSignature = new PullSignatureSymbol(PullElementKind.ConstructSignature);
                                parentConstructSignature.returnType = parentType;
                                parentConstructorType.addConstructSignature(parentConstructSignature);
                                parentConstructSignature.addDeclaration(parentType.getDeclarations()[0]);

                                var parentTypeParameters = parentConstructorType.getTypeParameters();

                                for (var i = 0; i < parentTypeParameters.length; i++) {
                                    parentConstructSignature.addTypeParameter(parentTypeParameters[i]);
                                }

                                parentConstructSignatures = [parentConstructSignature];
                            }

                            for (var i = 0; i < parentConstructSignatures.length; i++) {
                                // create a new signature for each parent constructor   
                                parentConstructSignature = parentConstructSignatures[i];
                                parentParameters = parentConstructSignature.parameters;

                                constructorSignature = parentConstructSignature.isDefinition() ?
                                new PullDefinitionSignatureSymbol(PullElementKind.ConstructSignature) : new PullSignatureSymbol(PullElementKind.ConstructSignature);
                                constructorSignature.returnType = classDeclSymbol;

                                for (var j = 0; j < parentParameters.length; j++) {
                                    constructorSignature.addParameter(parentParameters[j], parentParameters[j].isOptional);
                                }

                                var typeParameters = constructorTypeSymbol.getTypeParameters();

                                for (var j = 0; j < typeParameters.length; j++) {
                                    constructorSignature.addTypeParameter(typeParameters[j]);
                                }

                                constructorTypeSymbol.addConstructSignature(constructorSignature);
                                constructorSignature.addDeclaration(classDecl);
                            }
                        }
                        else { // PULLREVIEW: This likely won't execute, unless there's some serious out-of-order resolution issues   
                            constructorSignature = new PullSignatureSymbol(PullElementKind.ConstructSignature);
                            constructorSignature.returnType = classDeclSymbol;
                            constructorTypeSymbol.addConstructSignature(constructorSignature);
                            constructorSignature.addDeclaration(classDecl);

                            var typeParameters = constructorTypeSymbol.getTypeParameters();

                            for (var i = 0; i < typeParameters.length; i++) {
                                constructorSignature.addTypeParameter(typeParameters[i]);
                            }
                        }
                    }

                    if (!classDeclSymbol.isResolved) {
                        return classDeclSymbol;
                    }

                    // Need to ensure our constructor type can properly see our parent type's 
                    // constructor type before going and resolving our members.
                    if (parentType) {
                        var parentConstructorSymbol = parentType.getConstructorMethod();

                        // this will only be null if we have upstream errors
                        if (parentConstructorSymbol) {
                            var parentConstructorTypeSymbol = parentConstructorSymbol.type;

                            if (!constructorTypeSymbol.hasBase(parentConstructorTypeSymbol)) {
                                constructorTypeSymbol.addExtendedType(parentConstructorTypeSymbol);
                            }
                        }
                    }
                }

                this.resolveOtherDeclarations(classDeclAST, context);
            }

            if (this.canTypeCheckAST(classDeclAST, context)) {
                this.typeCheckClassDeclaration(classDeclAST, context);
            }

            return classDeclSymbol;
        }

        private typeCheckClassDeclaration(classDeclAST: ClassDeclaration, context: PullTypeResolutionContext) {
            this.setTypeChecked(classDeclAST, context);

            var classDecl: PullDecl = this.getDeclForAST(classDeclAST);
            var classDeclSymbol = <PullTypeSymbol>classDecl.getSymbol();

            // Add for post typeChecking if we want to verify name collision with _this
            if ((/* In global context*/ !classDeclSymbol.getContainer() ||
                /* In Dynamic Module */ classDeclSymbol.getContainer().kind == PullElementKind.DynamicModule) &&
                classDeclAST.name.text() == "_this") {
                PullTypeResolver.postTypeCheckWorkitems.push({ ast: classDeclAST, enclosingDecl: this.getEnclosingDecl(classDecl) });
            }

            this.resolveAST(classDeclAST.members, false, classDecl, context);

            this.typeCheckBases(classDeclAST, classDeclSymbol, this.getEnclosingDecl(classDecl), context);
            if (!classDeclSymbol.hasBaseTypeConflict()) {
                this.typeCheckMembersAgainstIndexer(classDeclSymbol, classDecl, context);
            }

            var classConstructorTypeSymbol = classDeclSymbol.getConstructorMethod().type;
            if (!classConstructorTypeSymbol.hasBaseTypeConflict()) {
                this.typeCheckMembersAgainstIndexer(classConstructorTypeSymbol, classDecl, context);
            }
        }

        private postTypeCheckClassDeclaration(classDeclAST: ClassDeclaration, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.checkThisCaptureVariableCollides(classDeclAST, true, enclosingDecl, context);
        }

        private resolveInterfaceDeclaration(interfaceDeclAST: TypeDeclaration, context: PullTypeResolutionContext): PullTypeSymbol {
            this.resolveReferenceTypeDeclaration(interfaceDeclAST, context);

            var interfaceDecl: PullDecl = this.getDeclForAST(interfaceDeclAST);
            var interfaceDeclSymbol = <PullTypeSymbol>interfaceDecl.getSymbol();

            if (interfaceDeclSymbol.isResolved) {
                this.resolveOtherDeclarations(interfaceDeclAST, context);

                if (this.canTypeCheckAST(interfaceDeclAST, context)) {
                    this.typeCheckInterfaceDeclaration(interfaceDeclAST, context);
                }
            }

            return interfaceDeclSymbol;
        }

        private typeCheckInterfaceDeclaration(interfaceDeclAST: TypeDeclaration, context: PullTypeResolutionContext) {
            this.setTypeChecked(interfaceDeclAST, context);

            var interfaceDecl: PullDecl = this.getDeclForAST(interfaceDeclAST);
            var interfaceDeclSymbol = <PullTypeSymbol>interfaceDecl.getSymbol();

            this.resolveAST(interfaceDeclAST.members, false, interfaceDecl, context);

            this.typeCheckBases(interfaceDeclAST, interfaceDeclSymbol, this.getEnclosingDecl(interfaceDecl), context);

            if (!interfaceDeclSymbol.hasBaseTypeConflict()) {
                this.typeCheckMembersAgainstIndexer(interfaceDeclSymbol, interfaceDecl, context);
            }
        }

        private filterSymbol(symbol: PullSymbol, kind: PullElementKind, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            if (symbol) {
                if (symbol.kind & kind) {
                    return symbol;
                }

                if (symbol.isAlias()) {
                    if (!symbol.isResolved) {
                        this.resolveDeclaredSymbol(symbol, enclosingDecl, context);
                    }

                    var alias = <PullTypeAliasSymbol>symbol;
                    if (kind & PullElementKind.SomeContainer) {
                        return alias.getExportAssignedContainerSymbol();
                    } else if (kind & PullElementKind.SomeType) {
                        return alias.getExportAssignedTypeSymbol();
                    } else if (kind & PullElementKind.SomeValue) {
                        return alias.getExportAssignedValueSymbol();
                    }
                }
            }
            return null;
        }

        private getMemberSymbolOfKind(symbolName: string, kind: PullElementKind, pullTypeSymbol: PullTypeSymbol, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            var symbol = this.getMemberSymbol(symbolName, kind, pullTypeSymbol);
            // Verify that the symbol is actually of the given kind
            return this.filterSymbol(symbol, kind, enclosingDecl, context);
        }

        private resolveIdentifierOfInternalModuleReference(importDecl: PullDecl, identifier: Identifier, moduleSymbol: PullSymbol, enclosingDecl: PullDecl, context: PullTypeResolutionContext):
            {
                valueSymbol: PullSymbol; typeSymbol: PullTypeSymbol; containerSymbol: PullContainerSymbol;
            } {
            if (identifier.isMissing()) {
                return null;
            }

            var moduleTypeSymbol = <PullContainerSymbol>moduleSymbol.type;
            var rhsName = identifier.text();
            var containerSymbol = this.getMemberSymbolOfKind(rhsName, PullElementKind.SomeContainer, moduleTypeSymbol, enclosingDecl, context);
            var valueSymbol: PullSymbol = null;
            var typeSymbol: PullSymbol = null;

            var acceptableAlias = true;

            if (containerSymbol) {
                acceptableAlias = (containerSymbol.kind & PullElementKind.AcceptableAlias) != 0;
            }

            if (!acceptableAlias && containerSymbol && containerSymbol.kind == PullElementKind.TypeAlias) {
                if (!containerSymbol.isResolved) {
                    this.resolveDeclaredSymbol(containerSymbol, enclosingDecl, context);
                }
                var aliasedAssignedValue = (<PullTypeAliasSymbol>containerSymbol).getExportAssignedValueSymbol();
                var aliasedAssignedType = (<PullTypeAliasSymbol>containerSymbol).getExportAssignedTypeSymbol();
                var aliasedAssignedContainer = (<PullTypeAliasSymbol>containerSymbol).getExportAssignedContainerSymbol();

                if (aliasedAssignedValue || aliasedAssignedType || aliasedAssignedContainer) {
                    valueSymbol = aliasedAssignedValue;
                    typeSymbol = aliasedAssignedType;
                    containerSymbol = aliasedAssignedContainer;
                    acceptableAlias = true;
                }
            }

            // check for valid export assignment type (variable, function, class, interface, enum, internal module)
            if (!acceptableAlias) {
                this.currentUnit.addDiagnostic(
                    new Diagnostic(importDecl.getScriptName(), identifier.minChar, identifier.getLength(), DiagnosticCode.Import_declaration_referencing_identifier_from_internal_module_can_only_be_made_with_variables_functions_classes_interfaces_enums_and_internal_modules));
                return null;
            }

            // if we haven't already gotten a value or type from the alias, look for them now
            if (!valueSymbol) {
                if (moduleTypeSymbol.getInstanceSymbol()) {
                    valueSymbol = this.getMemberSymbolOfKind(rhsName, PullElementKind.SomeValue, moduleTypeSymbol.getInstanceSymbol().type, enclosingDecl, context);
                }
            }

            if (!typeSymbol) {
                typeSymbol = this.getMemberSymbolOfKind(rhsName, PullElementKind.SomeType, moduleTypeSymbol, enclosingDecl, context);
            }

            if (!valueSymbol && !typeSymbol && !containerSymbol) {
                this.currentUnit.addDiagnostic(
                    new Diagnostic(importDecl.getScriptName(), identifier.minChar, identifier.getLength(), DiagnosticCode.Could_not_find_symbol_0_in_module_1, [rhsName, moduleSymbol.toString()]));
                return null;
            }

            if (!typeSymbol && containerSymbol) {
                typeSymbol = containerSymbol;
            }

            return {
                valueSymbol: valueSymbol,
                typeSymbol: <PullTypeSymbol>typeSymbol,
                containerSymbol: <PullContainerSymbol>containerSymbol
            };
        }

        private resolveModuleReference(importDecl: PullDecl, moduleNameExpr: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext, declPath: PullDecl[]) {
            CompilerDiagnostics.assert(moduleNameExpr.nodeType() == NodeType.MemberAccessExpression || moduleNameExpr.nodeType() == NodeType.Name, "resolving module reference should always be either name or member reference");

            var moduleSymbol: PullSymbol = null;
            var moduleName: string;

            if (moduleNameExpr.nodeType() == NodeType.MemberAccessExpression) {
                var dottedNameAST = <BinaryExpression>moduleNameExpr;
                var moduleContainer = this.resolveModuleReference(importDecl, dottedNameAST.operand1, enclosingDecl, context, declPath);
                if (moduleContainer) {
                    moduleName = (<Identifier>dottedNameAST.operand2).text();
                    moduleSymbol = this.getMemberSymbolOfKind(moduleName, PullElementKind.Container, moduleContainer.type, enclosingDecl, context);
                    if (!moduleSymbol) {
                        this.currentUnit.addDiagnostic(
                            new Diagnostic(importDecl.getScriptName(), dottedNameAST.operand2.minChar, dottedNameAST.operand2.getLength(), DiagnosticCode.Could_not_find_module_0_in_module_1, [moduleName, moduleContainer.toString()]));
                    }
                }
            } else if (!(<Identifier>moduleNameExpr).isMissing()) {
                moduleName = (<Identifier>moduleNameExpr).text();
                moduleSymbol = this.filterSymbol(this.getSymbolFromDeclPath(moduleName, declPath, PullElementKind.Container), PullElementKind.Container, enclosingDecl, context);
                if (!moduleSymbol) {
                    this.currentUnit.addDiagnostic(
                        new Diagnostic(importDecl.getScriptName(), moduleNameExpr.minChar, moduleNameExpr.getLength(), DiagnosticCode.Unable_to_resolve_module_reference_0, [moduleName]));
                }
            }

            return moduleSymbol;
        }

        private resolveInternalModuleReference(importStatementAST: ImportDeclaration, context: PullTypeResolutionContext) {
            // ModuleName or ModuleName.Identifier or ModuleName.ModuleName....Identifier
            var importDecl: PullDecl = this.getDeclForAST(importStatementAST);
            var enclosingDecl = this.getEnclosingDecl(importDecl);

            var aliasExpr = importStatementAST.alias.nodeType() == NodeType.TypeRef ? (<TypeReference>importStatementAST.alias).term : importStatementAST.alias;
            var declPath: PullDecl[] = enclosingDecl !== null ? getPathToDecl(enclosingDecl) : <PullDecl[]>[];
            var aliasedType: PullTypeSymbol = null;

            if (aliasExpr.nodeType() == NodeType.Name) {
                var moduleSymbol = this.resolveModuleReference(importDecl, aliasExpr, enclosingDecl, context, declPath);
                if (moduleSymbol) {
                    aliasedType = moduleSymbol.type;
                    if (aliasedType.hasFlag(PullElementFlags.InitializedModule)) {
                        var moduleName = (<Identifier>aliasExpr).text();
                        var valueSymbol = this.getSymbolFromDeclPath(moduleName, declPath, PullElementKind.SomeValue);
                        var instanceSymbol = (<PullContainerSymbol>aliasedType).getInstanceSymbol();
                        if (valueSymbol && (instanceSymbol != valueSymbol || valueSymbol.type == aliasedType)) {
                            context.postError(this.unitPath, aliasExpr.minChar, aliasExpr.getLength(), DiagnosticCode.Internal_module_reference_0_in_import_declaration_doesn_t_reference_module_instance_for_1, [(<Identifier>aliasExpr).actualText, moduleSymbol.type.toString(enclosingDecl ? enclosingDecl.getSymbol() : null)]);
                        }
                    }
                } else {
                    aliasedType = this.semanticInfoChain.anyTypeSymbol;
                }
            } else if (aliasExpr.nodeType() == NodeType.MemberAccessExpression) {
                var importDeclSymbol = <PullTypeAliasSymbol>importDecl.getSymbol();
                var dottedNameAST = <BinaryExpression>aliasExpr;
                var moduleSymbol = this.resolveModuleReference(importDecl, dottedNameAST.operand1, enclosingDecl, context, declPath);
                if (moduleSymbol) {
                    var identifierResolution = this.resolveIdentifierOfInternalModuleReference(importDecl, <Identifier>dottedNameAST.operand2, moduleSymbol, enclosingDecl, context);
                    if (identifierResolution) {
                        importDeclSymbol.setAssignedValueSymbol(identifierResolution.valueSymbol);
                        importDeclSymbol.setAssignedTypeSymbol(identifierResolution.typeSymbol);
                        importDeclSymbol.setAssignedContainerSymbol(identifierResolution.containerSymbol);
                        if (identifierResolution.valueSymbol) {
                            importDeclSymbol.isUsedAsValue = true;
                        }
                        this.semanticInfoChain.setSymbolForAST(importStatementAST.alias, importDeclSymbol, this.unitPath);
                        return null;
                    }
                }

                // Error in resolving the indentifier
                importDeclSymbol.setAssignedTypeSymbol(this.semanticInfoChain.anyTypeSymbol);
            }

            return aliasedType;
        }

        private resolveImportDeclaration(importStatementAST: ImportDeclaration, context: PullTypeResolutionContext): PullTypeSymbol {
            // internal or external? (Does it matter?)
            var importDecl: PullDecl = this.getDeclForAST(importStatementAST);
            var enclosingDecl = this.getEnclosingDecl(importDecl);
            var importDeclSymbol = <PullTypeAliasSymbol>importDecl.getSymbol();

            var aliasedType: PullTypeSymbol = null;

            if (importDeclSymbol.isResolved) {
                return importDeclSymbol;
            }

            importDeclSymbol.startResolving();

            // the alias name may be a string literal, in which case we'll need to convert it to a type
            // reference
            if (importStatementAST.isExternalImportDeclaration()) {
                // dynamic module name (string literal)
                var modPath = (<Identifier>importStatementAST.alias).text();
                var declPath = getPathToDecl(enclosingDecl);

                aliasedType = this.resolveExternalModuleReference(modPath, importDecl.getScriptName());

                if (!aliasedType) {
                    this.currentUnit.addDiagnostic(
                        new Diagnostic(this.currentUnit.getPath(), importStatementAST.minChar, importStatementAST.getLength(), DiagnosticCode.Unable_to_resolve_external_module_0, [(<Identifier>importStatementAST.alias).actualText]));
                    aliasedType = this.semanticInfoChain.anyTypeSymbol;
                }
            } else {
                aliasedType = this.resolveInternalModuleReference(importStatementAST, context);
            }

            if (aliasedType) {
                if (!aliasedType.isContainer()) {
                    this.currentUnit.addDiagnostic(
                        new Diagnostic(this.currentUnit.getPath(), importStatementAST.minChar, importStatementAST.getLength(), DiagnosticCode.Module_cannot_be_aliased_to_a_non_module_type));
                    aliasedType = this.semanticInfoChain.anyTypeSymbol;
                }
                else if ((<PullContainerSymbol>aliasedType).getExportAssignedValueSymbol()) {
                    importDeclSymbol.isUsedAsValue = true;
                }

                if (aliasedType.isContainer()) {
                    importDeclSymbol.setAssignedContainerSymbol(<PullContainerSymbol>aliasedType);
                }
                importDeclSymbol.setAssignedTypeSymbol(aliasedType);

                // Import declaration isn't contextual so set the symbol and diagnostic message irrespective of the context
                this.semanticInfoChain.setSymbolForAST(importStatementAST.alias, aliasedType, this.unitPath);
            }

            importDeclSymbol.setResolved();

            this.resolveDeclaredSymbol(importDeclSymbol.assignedValue, enclosingDecl, context);
            this.resolveDeclaredSymbol(importDeclSymbol.assignedType, enclosingDecl, context);
            this.resolveDeclaredSymbol(importDeclSymbol.assignedContainer, enclosingDecl, context);

            if (this.canTypeCheckAST(importStatementAST, context)) {
                this.typeCheckImportDeclaration(importStatementAST, context);
            }

            return importDeclSymbol;
        }

        private typeCheckImportDeclaration(importStatementAST: ImportDeclaration, context: PullTypeResolutionContext) {
            this.setTypeChecked(importStatementAST, context);

            var importDecl: PullDecl = this.getDeclForAST(importStatementAST);
            var enclosingDecl = this.getEnclosingDecl(importDecl);
            var importDeclSymbol = <PullTypeAliasSymbol>importDecl.getSymbol();

            if (importStatementAST.isExternalImportDeclaration()) {
                if (this.compilationSettings.noResolve) {
                    context.postError(this.unitPath, importStatementAST.minChar, importStatementAST.getLength(),
                        DiagnosticCode.Import_declaration_cannot_refer_to_external_module_reference_when_noResolve_option_is_set, null);
                }

                var modPath = (<Identifier>importStatementAST.alias).text();
                if (enclosingDecl.kind === PullElementKind.DynamicModule) {
                    var ast = this.getASTForDecl(enclosingDecl);
                    if (ast.nodeType() === NodeType.ModuleDeclaration && (<ModuleDeclaration>ast).endingToken) {
                        if (isRelative(modPath)) {
                            context.postError(this.unitPath, importStatementAST.minChar, importStatementAST.getLength(),
                                DiagnosticCode.Import_declaration_in_an_ambient_external_module_declaration_cannot_reference_external_module_through_relative_external_module_name, null);
                        }
                    }
                }
            }

            var checkPrivacy: boolean;
            if (importStatementAST.isExternalImportDeclaration()) {
                var containerSymbol = importDeclSymbol.getExportAssignedContainerSymbol();
                var container = containerSymbol ? containerSymbol.getContainer() : null;
                if (container && container.kind == PullElementKind.DynamicModule) {
                    checkPrivacy = true;
                }
            } else {
                checkPrivacy = true;
            }

            if (checkPrivacy) {
                // Check if import satisfies type privacy
                var typeSymbol = importDeclSymbol.getExportAssignedTypeSymbol();
                var containerSymbol = importDeclSymbol.getExportAssignedContainerSymbol();
                var valueSymbol = importDeclSymbol.getExportAssignedValueSymbol();

                this.checkSymbolPrivacy(importDeclSymbol, containerSymbol, context, (symbol: PullSymbol) => {
                    var messageCode = DiagnosticCode.Exported_import_declaration_0_is_assigned_container_that_is_or_is_using_inaccessible_module_1;
                    var messageArguments = [importDeclSymbol.getScopedName(enclosingDecl ? enclosingDecl.getSymbol() : null), symbol.getScopedName(enclosingDecl ? enclosingDecl.getSymbol() : null)];
                    context.postError(this.unitPath, importStatementAST.minChar, importStatementAST.getLength(), messageCode, messageArguments);
                });

                if (typeSymbol != containerSymbol) {
                    this.checkSymbolPrivacy(importDeclSymbol, typeSymbol, context, (symbol: PullSymbol) => {
                        var messageCode = symbol.isContainer() && !(<PullTypeSymbol>symbol).isEnum() ?
                            DiagnosticCode.Exported_import_declaration_0_is_assigned_type_that_is_using_inaccessible_module_1 :
                            DiagnosticCode.Exported_import_declaration_0_is_assigned_type_that_has_or_is_using_private_type_1;

                        var messageArguments = [importDeclSymbol.getScopedName(enclosingDecl ? enclosingDecl.getSymbol() : null), symbol.getScopedName(enclosingDecl ? enclosingDecl.getSymbol() : null)];
                        context.postError(this.unitPath, importStatementAST.minChar, importStatementAST.getLength(), messageCode, messageArguments);
                    });
                }

                if (valueSymbol) {
                    this.checkSymbolPrivacy(importDeclSymbol, valueSymbol.type, context, (symbol: PullSymbol) => {
                        var messageCode = symbol.isContainer() && !(<PullTypeSymbol>symbol).isEnum() ?
                            DiagnosticCode.Exported_import_declaration_0_is_assigned_value_with_type_that_is_using_inaccessible_module_1 :
                            DiagnosticCode.Exported_import_declaration_0_is_assigned_value_with_type_that_has_or_is_using_private_type_1;
                        var messageArguments = [importDeclSymbol.getScopedName(enclosingDecl ? enclosingDecl.getSymbol() : null), symbol.getScopedName(enclosingDecl ? enclosingDecl.getSymbol() : null)];
                        context.postError(this.unitPath, importStatementAST.minChar, importStatementAST.getLength(), messageCode, messageArguments);
                    });
                }
            }
        }

        public resolveExportAssignmentStatement(exportAssignmentAST: ExportAssignment, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            if (exportAssignmentAST.id.isMissing()) {
                // No point trying to resolve an export assignment without an actual identifier.
                return this.semanticInfoChain.anyTypeSymbol;
            }

            // get the identifier text
            var id = exportAssignmentAST.id.text();
            var valueSymbol: PullSymbol = null;
            var typeSymbol: PullSymbol = null;
            var containerSymbol: PullSymbol = null;

            var parentSymbol = enclosingDecl.getSymbol();

            if (!parentSymbol.isType() && (<PullTypeSymbol>parentSymbol).isContainer()) {
                // Error
                // Export assignments may only be used at the top-level of external modules
                this.currentUnit.addDiagnostic(
                    new Diagnostic(enclosingDecl.getScriptName(), exportAssignmentAST.minChar, exportAssignmentAST.getLength(), DiagnosticCode.Export_assignments_may_only_be_used_at_the_top_level_of_external_modules));
                return this.semanticInfoChain.anyTypeSymbol;
            }

            // The Identifier of an export assignment must name a variable, function, class, interface, 
            // enum, or internal module declared at the top level in the external module.
            // So look for the id only from this dynamic module
            var declPath: PullDecl[] = enclosingDecl !== null ? [enclosingDecl] : <PullDecl[]>[];

            containerSymbol = this.getSymbolFromDeclPath(id, declPath, PullElementKind.SomeContainer);

            var acceptableAlias = true;

            if (containerSymbol) {
                acceptableAlias = (containerSymbol.kind & PullElementKind.AcceptableAlias) != 0;
            }

            if (!acceptableAlias && containerSymbol && containerSymbol.kind == PullElementKind.TypeAlias) {
                if (!containerSymbol.isResolved) {
                    this.resolveDeclaredSymbol(containerSymbol, enclosingDecl, context);
                }

                var aliasedAssignedValue = (<PullTypeAliasSymbol>containerSymbol).getExportAssignedValueSymbol();
                var aliasedAssignedType = (<PullTypeAliasSymbol>containerSymbol).getExportAssignedTypeSymbol();
                var aliasedAssignedContainer = (<PullTypeAliasSymbol>containerSymbol).getExportAssignedContainerSymbol();

                if (aliasedAssignedValue || aliasedAssignedType || aliasedAssignedContainer) {
                    valueSymbol = aliasedAssignedValue;
                    typeSymbol = aliasedAssignedType;
                    containerSymbol = aliasedAssignedContainer;
                    acceptableAlias = true;
                }
            }

            // check for valid export assignment type (variable, function, class, interface, enum, internal module)
            if (!acceptableAlias) {
                // Error
                // Export assignments may only be made with variables, functions, classes, interfaces, enums and internal modules
                this.currentUnit.addDiagnostic(
                    new Diagnostic(enclosingDecl.getScriptName(), exportAssignmentAST.minChar, exportAssignmentAST.getLength(), DiagnosticCode.Export_assignments_may_only_be_made_with_variables_functions_classes_interfaces_enums_and_internal_modules));
                return this.semanticInfoChain.voidTypeSymbol;
            }

            // if we haven't already gotten a value or type from the alias, look for them now
            if (!valueSymbol) {
                valueSymbol = this.getSymbolFromDeclPath(id, declPath, PullElementKind.SomeValue);
            }
            if (!typeSymbol) {
                typeSymbol = this.getSymbolFromDeclPath(id, declPath, PullElementKind.SomeType);
            }

            if (!valueSymbol && !typeSymbol && !containerSymbol) {
                // Error
                context.postError(enclosingDecl.getScriptName(), exportAssignmentAST.minChar, exportAssignmentAST.getLength(), DiagnosticCode.Could_not_find_symbol_0, [id]);
                return this.semanticInfoChain.voidTypeSymbol;
            }

            if (valueSymbol) {
                (<PullContainerSymbol>parentSymbol).setExportAssignedValueSymbol(valueSymbol);
            }
            if (typeSymbol) {
                (<PullContainerSymbol>parentSymbol).setExportAssignedTypeSymbol(<PullTypeSymbol>typeSymbol);
            }
            if (containerSymbol) {
                (<PullContainerSymbol>parentSymbol).setExportAssignedContainerSymbol(<PullContainerSymbol>containerSymbol);
            }

            if (valueSymbol && !valueSymbol.isResolved) {
                this.resolveDeclaredSymbol(valueSymbol, enclosingDecl, context);
            }
            if (typeSymbol && !typeSymbol.isResolved) {
                this.resolveDeclaredSymbol(typeSymbol, enclosingDecl, context);
            }
            if (containerSymbol && !containerSymbol.isResolved) {
                this.resolveDeclaredSymbol(containerSymbol, enclosingDecl, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        public resolveFunctionTypeSignature(funcDeclAST: FunctionDeclaration, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullTypeSymbol {

            var funcDeclSymbol: PullTypeSymbol = null;

            var functionDecl = this.getDeclForAST(funcDeclAST);

            if (!functionDecl) {
                var semanticInfo = this.semanticInfoChain.getUnit(this.unitPath);
                var declCollectionContext = new DeclCollectionContext(semanticInfo, this.unitPath);

                if (enclosingDecl) {
                    declCollectionContext.pushParent(enclosingDecl);
                }

                getAstWalkerFactory().walk(funcDeclAST, preCollectDecls, postCollectDecls, null, declCollectionContext);

                functionDecl = this.getDeclForAST(funcDeclAST);
                this.currentUnit.addSynthesizedDecl(functionDecl);
            }

            if (!functionDecl.hasSymbol()) {
                var binder = new PullSymbolBinder(this.semanticInfoChain);
                binder.setUnit(this.unitPath);
                if (functionDecl.kind === PullElementKind.ConstructorType) {
                    binder.bindConstructorTypeDeclarationToPullSymbol(functionDecl);
                }
                else {
                    binder.bindFunctionTypeDeclarationToPullSymbol(functionDecl);
                }
            }

            funcDeclSymbol = <PullTypeSymbol>functionDecl.getSymbol();

            var signature = funcDeclSymbol.kind === PullElementKind.ConstructorType ? funcDeclSymbol.getConstructSignatures()[0] : funcDeclSymbol.getCallSignatures()[0];

            // resolve the return type annotation
            if (funcDeclAST.returnTypeAnnotation) {
                signature.returnType = this.resolveTypeReference(<TypeReference>funcDeclAST.returnTypeAnnotation, functionDecl, context);

                if (this.isTypeArgumentOrWrapper(signature.returnType)) {
                    signature.hasAGenericParameter = true;

                    if (funcDeclSymbol) {
                        funcDeclSymbol.type.setHasGenericSignature();
                    }
                }
            }

            if (funcDeclAST.typeArguments) {
                for (var i = 0; i < funcDeclAST.typeArguments.members.length; i++) {
                    this.resolveTypeParameterDeclaration(<TypeParameter>funcDeclAST.typeArguments.members[i], context);
                }
            }

            // link parameters and resolve their annotations
            if (funcDeclAST.arguments) {
                for (var i = 0; i < funcDeclAST.arguments.members.length; i++) {
                    this.resolveFunctionTypeSignatureParameter(<Parameter>funcDeclAST.arguments.members[i], signature, functionDecl, context);
                }
            }

            // Flag if one of the arguments has a generic parameter
            if (funcDeclSymbol && signature.hasAGenericParameter) {
                funcDeclSymbol.type.setHasGenericSignature();
            }

            if (signature.hasAGenericParameter) {
                // PULLREVIEW: This is split into a spearate if statement to make debugging slightly easier...
                if (funcDeclSymbol) {
                    funcDeclSymbol.type.setHasGenericSignature();
                }
            }

            funcDeclSymbol.setResolved();

            if (this.canTypeCheckAST(funcDeclAST, context)) {
                this.setTypeChecked(funcDeclAST, context);
                this.typeCheckFunctionOverloads(funcDeclAST, context);
            }

            return funcDeclSymbol;
        }

        private resolveFunctionTypeSignatureParameter(argDeclAST: Parameter, signature: PullSignatureSymbol, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            var paramDecl = this.getDeclForAST(argDeclAST);
            var paramSymbol = paramDecl.getSymbol();

            if (argDeclAST.typeExpr) {
                var typeRef = this.resolveTypeReference(<TypeReference>argDeclAST.typeExpr, enclosingDecl, context);

                if (paramSymbol.isVarArg && !(typeRef.isArray() || typeRef == this.cachedArrayInterfaceType())) {
                    var diagnostic = context.postError(this.unitPath, argDeclAST.minChar, argDeclAST.getLength(), DiagnosticCode.Rest_parameters_must_be_array_types, null);
                    typeRef = this.getNewErrorTypeSymbol();
                }

                context.setTypeInContext(paramSymbol, typeRef);

                // if the typeExprSymbol is generic, set the "hasGenericParameter" field on the enclosing signature
                if (this.isTypeArgumentOrWrapper(typeRef)) {
                    signature.hasAGenericParameter = true;
                }
            }
            else {
                if (paramSymbol.isVarArg && paramSymbol.type) {
                    if (this.cachedArrayInterfaceType()) {
                        context.setTypeInContext(paramSymbol, specializeType(this.cachedArrayInterfaceType(), [paramSymbol.type], this, this.cachedArrayInterfaceType().getDeclarations()[0], context));
                    }
                    else {
                        context.setTypeInContext(paramSymbol, paramSymbol.type);
                    }
                }
                else {
                    context.setTypeInContext(paramSymbol, this.semanticInfoChain.anyTypeSymbol);

                    // if the noImplicitAny flag is set to be true, report an error 
                    if (this.compilationSettings.noImplicitAny) {
                        context.postError(this.unitPath, argDeclAST.minChar, argDeclAST.getLength(), DiagnosticCode.Parameter_0_of_function_type_implicitly_has_an_any_type,
                            [argDeclAST.id.actualText])
                    }
                }
            }

            paramSymbol.setResolved();
        }

        private resolveFunctionExpressionParameter(argDeclAST: Parameter, contextParam: PullSymbol, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            var paramDecl = this.getDeclForAST(argDeclAST);
            var paramSymbol = paramDecl.getSymbol();
            var contextualType = contextParam && contextParam.type;
            var isImplicitAny = false;

            if (argDeclAST.typeExpr) {
                var typeRef = this.resolveTypeReference(<TypeReference>argDeclAST.typeExpr, enclosingDecl, context);

                if (paramSymbol.isVarArg && !(typeRef.isArray() || typeRef == this.cachedArrayInterfaceType())) {
                    var diagnostic = context.postError(this.unitPath, argDeclAST.minChar, argDeclAST.getLength(), DiagnosticCode.Rest_parameters_must_be_array_types, null);
                    typeRef = this.getNewErrorTypeSymbol();
                }

                // The contextual type now gets overriden by the type annotation
                contextualType = typeRef || contextualType;
            }
            if (contextualType) {
                context.setTypeInContext(paramSymbol, contextualType);
            }
            else if (paramSymbol.isVarArg && this.cachedArrayInterfaceType()) {
                context.setTypeInContext(paramSymbol, specializeType(this.cachedArrayInterfaceType(), [this.semanticInfoChain.anyTypeSymbol], this, this.cachedArrayInterfaceType().getDeclarations()[0], context));
                isImplicitAny = true;
            }

            // Resolve the function expression parameter init only if we have contexual type to evaluate the expression in or we are in typeCheck
            var canTypeCheckAST = this.canTypeCheckAST(argDeclAST, context);
            if (argDeclAST.init && (canTypeCheckAST || !contextualType)) {
                if (contextualType) {
                    context.pushContextualType(contextualType, context.inProvisionalResolution(), null);
                }

                var initExprSymbol = this.resolveAST(argDeclAST.init, contextualType != null, enclosingDecl, context);

                if (contextualType) {
                    context.popContextualType();
                }

                if (!initExprSymbol || !initExprSymbol.type) {
                    context.postError(this.unitPath, argDeclAST.minChar, argDeclAST.getLength(), DiagnosticCode.Unable_to_resolve_type_of_0, [argDeclAST.id.actualText]);

                    if (!contextualType) {
                        context.setTypeInContext(paramSymbol, this.getNewErrorTypeSymbol(paramSymbol.name));
                    }
                }
                else {
                    var initTypeSymbol = this.getInstanceTypeForAssignment(argDeclAST, initExprSymbol.type, enclosingDecl, context);
                    if (!contextualType) {
                        // Set the type to the inferred initializer type
                        context.setTypeInContext(paramSymbol, this.widenType(initTypeSymbol, enclosingDecl, context));
                        isImplicitAny = initTypeSymbol !== paramSymbol.type;
                    }
                    else {
                        var comparisonInfo = new TypeComparisonInfo();

                        var isAssignable = this.sourceIsAssignableToTarget(initTypeSymbol, contextualType, context, comparisonInfo);

                        if (!isAssignable) {
                            if (comparisonInfo.message) {
                                context.postError(this.unitPath, argDeclAST.minChar, argDeclAST.getLength(), DiagnosticCode.Cannot_convert_0_to_1_NL_2, [initTypeSymbol.toString(), contextualType.toString(), comparisonInfo.message]);
                            } else {
                                context.postError(this.unitPath, argDeclAST.minChar, argDeclAST.getLength(), DiagnosticCode.Cannot_convert_0_to_1, [initTypeSymbol.toString(), contextualType.toString()]);
                            }
                        }
                    }
                }
            }

            // If we do not have any type for it, set it to any
            if (!contextualType && !paramSymbol.isVarArg && !initTypeSymbol) {
                context.setTypeInContext(paramSymbol, this.semanticInfoChain.anyTypeSymbol);
                isImplicitAny = true;
            }
               
            // if the noImplicitAny flag is set to be true, report an error
            if (isImplicitAny && this.compilationSettings.noImplicitAny) {

                // there is a name for function expression then use the function expression name otherwise use "lambda"
                var functionExpressionName = (<PullFunctionExpressionDecl>paramDecl.getParentDecl()).getFunctionExpressionName();
                if (functionExpressionName) {
                    context.postError(this.unitPath, argDeclAST.minChar, argDeclAST.getLength(),
                        DiagnosticCode.Parameter_0_of_1_implicitly_has_an_any_type, [argDeclAST.id.actualText, functionExpressionName]);
                }
                else {
                    context.postError(this.unitPath, argDeclAST.minChar, argDeclAST.getLength(),
                        DiagnosticCode.Parameter_0_of_lambda_function_implicitly_has_an_any_type,
                        [argDeclAST.id.actualText]);
                }
            }

            if (canTypeCheckAST) {
                this.checkNameForCompilerGeneratedDeclarationCollision(argDeclAST, /*isDeclaration*/ true, argDeclAST.id, enclosingDecl, context); 
            }
            paramSymbol.setResolved();
        }

        private checkNameForCompilerGeneratedDeclarationCollision(astWithName: AST, isDeclaration: boolean, name: Identifier, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            var nameText = name.text();
            if (nameText == "_this") {
                PullTypeResolver.postTypeCheckWorkitems.push({ ast: astWithName, enclosingDecl: enclosingDecl });
            } else if (nameText == "_super") {
                this.checkSuperCaptureVariableCollides(astWithName, isDeclaration, enclosingDecl, context);
            }
        }

        public resolveInterfaceTypeReference(interfaceDeclAST: InterfaceDeclaration, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullTypeSymbol {
            var interfaceSymbol: PullTypeSymbol = null;

            var interfaceDecl = this.getDeclForAST(interfaceDeclAST);

            if (!interfaceDecl) {

                var semanticInfo = this.semanticInfoChain.getUnit(this.unitPath);
                var declCollectionContext = new DeclCollectionContext(semanticInfo, this.unitPath);

                if (enclosingDecl) {
                    declCollectionContext.pushParent(enclosingDecl);
                }

                getAstWalkerFactory().walk(interfaceDeclAST, preCollectDecls, postCollectDecls, null, declCollectionContext);

                var interfaceDecl = this.getDeclForAST(interfaceDeclAST);
                this.currentUnit.addSynthesizedDecl(interfaceDecl);

                var binder = new PullSymbolBinder(this.semanticInfoChain);

                binder.setUnit(this.unitPath);
                binder.bindObjectTypeDeclarationToPullSymbol(interfaceDecl);
            }

            interfaceSymbol = <PullTypeSymbol>interfaceDecl.getSymbol();

            if (interfaceDeclAST.members) {
                var memberDecl: PullDecl = null;
                var memberSymbol: PullSymbol = null;
                var memberType: PullTypeSymbol = null;
                var typeMembers = <ASTList> interfaceDeclAST.members;

                for (var i = 0; i < typeMembers.members.length; i++) {
                    memberDecl = this.getDeclForAST(typeMembers.members[i]);
                    memberSymbol = (memberDecl.kind & PullElementKind.SomeSignature) ? memberDecl.getSignatureSymbol() : memberDecl.getSymbol();

                    this.resolveAST(typeMembers.members[i], false, enclosingDecl, context);

                    memberType = memberSymbol.type;

                    if ((memberType && memberType.isGeneric()) || (memberSymbol.isSignature() && (<PullSignatureSymbol>memberSymbol).isGeneric())) {
                        interfaceSymbol.setHasGenericMember();
                    }
                }
            }

            interfaceSymbol.setResolved();

            if (this.canTypeCheckAST(interfaceDeclAST, context)) {
                this.typeCheckInterfaceTypeReference(interfaceDeclAST, context);
            }

            return interfaceSymbol;
        }

        private typeCheckInterfaceTypeReference(interfaceDeclAST: InterfaceDeclaration, context: PullTypeResolutionContext) {
            this.setTypeChecked(interfaceDeclAST, context);
            var interfaceDecl = this.getDeclForAST(interfaceDeclAST);
            var interfaceSymbol = <PullTypeSymbol>interfaceDecl.getSymbol();
            if (!interfaceSymbol.hasBaseTypeConflict()) {
                this.typeCheckMembersAgainstIndexer(interfaceSymbol, interfaceDecl, context);
            }
        }

        public resolveTypeReference(typeRef: TypeReference, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullTypeSymbol {
            if (typeRef === null) {
                return null;
            }

            var type = <PullTypeSymbol>this.getSymbolForAST(typeRef);
            var aliasType: PullTypeAliasSymbol = null;
            if (!type || this.canTypeCheckAST(typeRef, context)) {
                if (this.canTypeCheckAST(typeRef, context)) {
                    this.setTypeChecked(typeRef, context);
                }

                type = this.computeTypeReferenceSymbol(typeRef, enclosingDecl, context);

                if (type.kind == PullElementKind.Container) {
                    var container = <PullContainerSymbol>type;
                    var instanceSymbol = container.getInstanceSymbol();
                    // check if it is actually merged with class
                    if (instanceSymbol &&
                        (instanceSymbol.hasFlag(PullElementFlags.ClassConstructorVariable) || instanceSymbol.kind == PullElementKind.ConstructorMethod)) {
                        type = instanceSymbol.type.getAssociatedContainerType();
                    }
                }

                if (type && type.isAlias()) {
                    aliasType = <PullTypeAliasSymbol>type;
                    type = aliasType.getExportAssignedTypeSymbol();
                }

                if (type && !type.isGeneric()) {
                    this.setSymbolForAST(typeRef, type, context);
                    if (aliasType) {
                        this.currentUnit.setAliasSymbolForAST(typeRef, aliasType);
                    }
                }

                if (type && !type.isError()) {
                    if ((type.kind & PullElementKind.SomeType) === 0) {
                        // Provide some helper messages for common cases.
                        if (type.kind & PullElementKind.SomeContainer) {
                            context.postError(this.unitPath, typeRef.minChar, typeRef.getLength(),
                                DiagnosticCode.Type_reference_cannot_refer_to_container_0, [aliasType ? aliasType.toString() : type.toString()]);
                        } else {
                            context.postError(this.unitPath, typeRef.minChar, typeRef.getLength(),
                                DiagnosticCode.Type_reference_must_refer_to_type, null);
                        }
                    }
                }
            }

            return type;
        }

        private computeTypeReferenceSymbol(typeRef: TypeReference, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullTypeSymbol {
            // the type reference can be
            // a name
            // a function
            // an interface
            // a dotted name
            // an array of any of the above
            // a type query

            var typeDeclSymbol: PullTypeSymbol = null;
            var typeSymbol: PullTypeSymbol = null;

            // a name
            if (typeRef.term.nodeType() === NodeType.Name) {
                var prevResolvingTypeReference = context.resolvingTypeReference;
                context.resolvingTypeReference = true;
                typeSymbol = this.resolveTypeNameExpression(<Identifier>typeRef.term, enclosingDecl, context);
                typeDeclSymbol = <PullTypeSymbol>typeSymbol;

                context.resolvingTypeReference = prevResolvingTypeReference;

            }
            // a function
            else if (typeRef.term.nodeType() === NodeType.FunctionDeclaration) {
                typeDeclSymbol = this.resolveFunctionTypeSignature(<FunctionDeclaration>typeRef.term, enclosingDecl, context);
            }
            // an interface
            else if (typeRef.term.nodeType() === NodeType.InterfaceDeclaration) {
                typeDeclSymbol = this.resolveInterfaceTypeReference(<InterfaceDeclaration>typeRef.term, enclosingDecl, context);
            }
            else if (typeRef.term.nodeType() === NodeType.GenericType) {
                typeSymbol = this.resolveGenericTypeReference(<GenericType>typeRef.term, enclosingDecl, context);
                typeDeclSymbol = typeSymbol;
            }
            // a dotted name
            else if (typeRef.term.nodeType() === NodeType.MemberAccessExpression) {
                // assemble the dotted name path
                var dottedName = <BinaryExpression> typeRef.term;

                // find the decl
                prevResolvingTypeReference = context.resolvingTypeReference;
                var prevResolvingNamespaceMemberAccess = context.resolvingNamespaceMemberAccess;
                context.resolvingNamespaceMemberAccess = false;
                typeSymbol = this.resolveDottedTypeNameExpression(dottedName, enclosingDecl, context);
                typeDeclSymbol = typeSymbol;
                context.resolvingNamespaceMemberAccess = prevResolvingNamespaceMemberAccess;
                context.resolvingTypeReference = prevResolvingTypeReference;
            }
            else if (typeRef.term.nodeType() === NodeType.StringLiteral) {
                var stringConstantAST = <StringLiteral>typeRef.term;
                typeDeclSymbol = new PullStringConstantTypeSymbol(stringConstantAST.actualText);
                var decl = new PullDecl(stringConstantAST.actualText, stringConstantAST.actualText,
                    typeDeclSymbol.kind, null,
                    new TextSpan(stringConstantAST.minChar, stringConstantAST.getLength()), enclosingDecl.getScriptName());
                this.currentUnit.addSynthesizedDecl(decl);
                typeDeclSymbol.addDeclaration(decl);
            }
            else if (typeRef.term.nodeType() === NodeType.TypeQuery) {
                var typeQuery = <TypeQuery>typeRef.term;

                // TODO: This is a workaround if we encounter a TypeReference AST node. Remove it when we remove the AST.
                var typeQueryTerm = typeQuery.name;
                if (typeQueryTerm.nodeType() === NodeType.TypeRef) {
                    typeQueryTerm = (<TypeReference>typeQueryTerm).term;
                }

                var savedResolvingTypeReference = context.resolvingTypeReference;
                context.resolvingTypeReference = false;
                var savedResolvingTypeQueryExpression = context.resolvingTypeQueryExpression;
                context.resolvingTypeQueryExpression = true;
                var valueSymbol = this.resolveAST(typeQueryTerm, false, enclosingDecl, context);
                context.resolvingTypeQueryExpression = savedResolvingTypeQueryExpression;
                context.resolvingTypeReference = savedResolvingTypeReference;

                if (valueSymbol && valueSymbol.isAlias()) {
                    if ((<PullTypeAliasSymbol>valueSymbol).assignedValue) {
                        valueSymbol = (<PullTypeAliasSymbol>valueSymbol).assignedValue;
                    } else {
                        var containerSymbol = (<PullTypeAliasSymbol>valueSymbol).getExportAssignedContainerSymbol();
                        valueSymbol = (containerSymbol && containerSymbol.isContainer() && !containerSymbol.isEnum()) ? containerSymbol.getInstanceSymbol() : null;
                    }
                }

                // Get the type of the symbol
                if (valueSymbol) {
                    typeDeclSymbol = valueSymbol.type;
                }
                else {
                    typeDeclSymbol = this.getNewErrorTypeSymbol();
                }
            }

            if (!typeDeclSymbol) {
                context.postError(this.unitPath, typeRef.term.minChar, typeRef.term.getLength(), DiagnosticCode.Unable_to_resolve_type, null);
                return this.getNewErrorTypeSymbol();
            }

            if (typeDeclSymbol.isError()) {
                // TODO(cyrusn): We shouldn't be returning early here.  Even if we couldn't resolve 
                // the type name, we still want to be able to create an array from it if it had
                // array parameters.
                // 
                return typeDeclSymbol;
            }

            if (this.genericTypeIsUsedWithoutRequiredTypeArguments(typeDeclSymbol, typeRef, context)) {
                context.postError(this.unitPath, typeRef.minChar, typeRef.getLength(), DiagnosticCode.Generic_type_references_must_include_all_type_arguments, null);
                typeDeclSymbol = this.specializeTypeToAny(typeDeclSymbol, enclosingDecl, context);
            }

            // an array of any of the above
            if (typeRef.arrayCount) {

                var arraySymbol: PullTypeSymbol = typeDeclSymbol.getArrayType();

                // otherwise, create a new array symbol
                if (!arraySymbol) {
                    // for each member in the array interface symbol, substitute in the the typeDecl symbol for "_element"

                    if (!this.cachedArrayInterfaceType().isResolved) {
                        this.resolveDeclaredSymbol(this.cachedArrayInterfaceType(), enclosingDecl, context);
                    }

                    arraySymbol = specializeType(this.cachedArrayInterfaceType(), [typeDeclSymbol], this, this.cachedArrayInterfaceType().getDeclarations()[0], context);

                    if (!arraySymbol) {
                        arraySymbol = this.semanticInfoChain.anyTypeSymbol;
                    }
                }

                if (typeRef.arrayCount > 1) {
                    for (var arity = typeRef.arrayCount - 1; arity > 0; arity--) {
                        var existingArraySymbol = arraySymbol.getArrayType();

                        if (!existingArraySymbol) {
                            arraySymbol = specializeType(this.cachedArrayInterfaceType(), [arraySymbol], this, this.cachedArrayInterfaceType().getDeclarations()[0], context);
                        }
                        else {
                            arraySymbol = existingArraySymbol;
                        }
                    }
                }

                typeDeclSymbol = arraySymbol;
            }

            return typeDeclSymbol;
        }

        private genericTypeIsUsedWithoutRequiredTypeArguments(typeSymbol: PullTypeSymbol, typeReference: TypeReference, context: PullTypeResolutionContext): boolean {
            return typeSymbol.isNamedTypeSymbol() &&
                typeSymbol.isGeneric() &&
                !typeSymbol.isTypeParameter() &&
                (typeSymbol.isResolved || (typeSymbol.inResolution && !context.inSpecialization)) &&
                !typeSymbol.getIsSpecialized() &&
                typeSymbol.getTypeParameters().length &&
                typeSymbol.getTypeArguments() == null &&
                this.isTypeRefWithoutTypeArgs(typeReference);
        }

        private resolveVariableDeclaration(varDecl: BoundDecl, context: PullTypeResolutionContext, enclosingDecl?: PullDecl): PullSymbol {
            var decl: PullDecl = this.getDeclForAST(varDecl);

            // if the enlosing decl is a lambda, we may not have bound the parent symbol
            if (enclosingDecl && decl.kind == PullElementKind.Parameter) {
                enclosingDecl.ensureSymbolIsBound();
            }

            var declSymbol = decl.getSymbol();
            var declParameterSymbol: PullSymbol = decl.getValueDecl() ? decl.getValueDecl().getSymbol() : null;

            if (declSymbol.isResolved) {
                var declType = declSymbol.type;
                var valDecl = decl.getValueDecl();

                if (valDecl) {
                    var valSymbol = valDecl.getSymbol();

                    if (valSymbol && !valSymbol.isResolved) {
                        valSymbol.type = declType;
                        valSymbol.setResolved();
                    }
                }
            } else {
                if (declSymbol.inResolution) {
                    // PULLTODO: Error or warning?
                    if (!context.inSpecialization) {
                        declSymbol.type = this.semanticInfoChain.anyTypeSymbol;
                        declSymbol.setResolved();
                        return declSymbol;
                    }
                }

                declSymbol.startResolving();

                var typeExprSymbol: PullTypeSymbol = null;
                var inConstructorArgumentList = context.inConstructorArguments;
                context.inConstructorArguments = false;

                // Does this have a type expression? If so, that's the type
                typeExprSymbol = this.resolveAndTypeCheckVariableDeclarationTypeExpr(varDecl, context, enclosingDecl);

                // If we're not type checking, and have a type expression, don't bother looking at the initializer expression
                if (!varDecl.typeExpr) {
                    this.resolveAndTypeCheckVariableDeclarationInitExpr(varDecl, context, enclosingDecl, typeExprSymbol);
                }

                // if we're lacking both a type annotation and an initialization expression, the type is 'any'
                if (!(varDecl.typeExpr || varDecl.init)) {
                    var defaultType = this.semanticInfoChain.anyTypeSymbol;

                    if (declSymbol.isVarArg) {
                        defaultType = specializeType(this.cachedArrayInterfaceType(), [defaultType], this, this.cachedArrayInterfaceType().getDeclarations()[0], context);
                    }

                    context.setTypeInContext(declSymbol, defaultType);

                    if (declParameterSymbol) {
                        declParameterSymbol.type = defaultType;
                    }
                }
                declSymbol.setResolved();

                if (declParameterSymbol) {
                    declParameterSymbol.setResolved();
                }
            }

            if (this.canTypeCheckAST(varDecl, context)) {
                this.typeCheckVariableDeclaration(varDecl, context, enclosingDecl);
            }

            return declSymbol;
        }

        private resolveAndTypeCheckVariableDeclarationTypeExpr(varDecl: BoundDecl, context: PullTypeResolutionContext, enclosingDecl: PullDecl) {
            if (!varDecl.typeExpr) {
                return null;
            }

            var decl: PullDecl = this.getDeclForAST(varDecl);
            var declSymbol = decl.getSymbol();
            var declParameterSymbol: PullSymbol = decl.getValueDecl() ? decl.getValueDecl().getSymbol() : null;

            var wrapperDecl = this.getEnclosingDecl(decl);
            wrapperDecl = wrapperDecl ? wrapperDecl : enclosingDecl;

            var typeExprSymbol = this.resolveTypeReference(<TypeReference>varDecl.typeExpr, wrapperDecl, context);

            if (!typeExprSymbol) {
                context.postError(this.unitPath, varDecl.minChar, varDecl.getLength(), DiagnosticCode.Unable_to_resolve_type_of_0, [varDecl.id.actualText]);
                declSymbol.type = this.getNewErrorTypeSymbol();

                if (declParameterSymbol) {
                    context.setTypeInContext(declParameterSymbol, this.semanticInfoChain.anyTypeSymbol);
                }
            }
            else if (typeExprSymbol.isError()) {
                context.setTypeInContext(declSymbol, typeExprSymbol);
                if (declParameterSymbol) {
                    context.setTypeInContext(declParameterSymbol, typeExprSymbol);
                }
            }
            else {
                if (typeExprSymbol == this.semanticInfoChain.anyTypeSymbol) {
                    decl.setFlag(PullElementFlags.IsAnnotatedWithAny);
                }

                // PULLREVIEW: If the type annotation is a container type, use the module instance type
                if (typeExprSymbol.isContainer()) {
                    var exportedTypeSymbol = (<PullContainerSymbol>typeExprSymbol).getExportAssignedTypeSymbol();

                    if (exportedTypeSymbol) {
                        typeExprSymbol = exportedTypeSymbol;
                    }
                    else {
                        typeExprSymbol = typeExprSymbol.type;

                        if (typeExprSymbol.isAlias()) {
                            typeExprSymbol = (<PullTypeAliasSymbol>typeExprSymbol).getExportAssignedTypeSymbol();
                        }

                        if (typeExprSymbol && typeExprSymbol.isContainer() && !typeExprSymbol.isEnum()) {
                            // aliased type could still be 'any' as the result of an error
                            var instanceSymbol = (<PullContainerSymbol>typeExprSymbol).getInstanceSymbol();

                            if (!instanceSymbol || !PullHelpers.symbolIsEnum(instanceSymbol)) {
                                typeExprSymbol = this.getNewErrorTypeSymbol();
                            }
                            else {
                                typeExprSymbol = instanceSymbol.type;
                            }
                        }
                    }
                }
                else if (declSymbol.isVarArg && !(typeExprSymbol.isArray() || typeExprSymbol == this.cachedArrayInterfaceType())) {
                    context.postError(this.unitPath, varDecl.minChar, varDecl.getLength(), DiagnosticCode.Rest_parameters_must_be_array_types, null);
                    typeExprSymbol = this.getNewErrorTypeSymbol();
                }

                context.setTypeInContext(declSymbol, typeExprSymbol);

                if (declParameterSymbol) {
                    declParameterSymbol.type = typeExprSymbol;
                }

                // We associate the value with the function type here because we couldn't do so at biding
                // but need this information to get correct doc comments
                if (typeExprSymbol.kind == PullElementKind.FunctionType) {
                    typeExprSymbol.setFunctionSymbol(declSymbol);
                }

                // if the typeExprSymbol is generic, set the "hasGenericParameter" field on the enclosing signature
                // we filter out arrays, since for those we just want to know if their element type is a type parameter...
                if ((varDecl.nodeType() === NodeType.Parameter) && enclosingDecl && ((typeExprSymbol.isGeneric() && !typeExprSymbol.isArray()) || this.isTypeArgumentOrWrapper(typeExprSymbol))) {
                    var signature = enclosingDecl.getSpecializingSignatureSymbol();

                    if (signature) {
                        signature.hasAGenericParameter = true;
                    }
                }

            }

            return typeExprSymbol;
        }

        private resolveAndTypeCheckVariableDeclarationInitExpr(varDecl: BoundDecl, context: PullTypeResolutionContext, enclosingDecl: PullDecl, typeExprSymbol: PullTypeSymbol) {
            if (!varDecl.init) {
                return null;
            }

            if (typeExprSymbol) {
                context.pushContextualType(typeExprSymbol, context.inProvisionalResolution(), null);
            }

            var decl: PullDecl = this.getDeclForAST(varDecl);
            var declSymbol = decl.getSymbol();
            var declParameterSymbol: PullSymbol = decl.getValueDecl() ? decl.getValueDecl().getSymbol() : null;

            var wrapperDecl = this.getEnclosingDecl(decl);
            wrapperDecl = wrapperDecl ? wrapperDecl : enclosingDecl;

            var inConstructorArgumentList = context.inConstructorArguments;
            context.inConstructorArguments = inConstructorArgumentList || (decl.flags & PullElementFlags.PropertyParameter) !== 0;
            context.isInStaticInitializer = (decl.flags & PullElementFlags.Static) != 0;
            var initExprSymbol = this.resolveAST(varDecl.init, typeExprSymbol != null, wrapperDecl, context);
            context.isInStaticInitializer = false;
            context.inConstructorArguments = inConstructorArgumentList;

            if (typeExprSymbol) {
                context.popContextualType();
            }

            if (!initExprSymbol) {
                context.postError(this.unitPath, varDecl.minChar, varDecl.getLength(), DiagnosticCode.Unable_to_resolve_type_of_0, [varDecl.id.actualText]);

                if (!varDecl.typeExpr) {
                    context.setTypeInContext(declSymbol, this.getNewErrorTypeSymbol());

                    if (declParameterSymbol) {
                        context.setTypeInContext(declParameterSymbol, this.semanticInfoChain.anyTypeSymbol);
                    }
                }

            }
            else {
                var initTypeSymbol = initExprSymbol.type;
                var widenedInitTypeSymbol = this.widenType(initTypeSymbol, enclosingDecl, context);

                // Don't reset the type if we already have one from the type expression
                if (!varDecl.typeExpr) {
                    context.setTypeInContext(declSymbol, widenedInitTypeSymbol);

                    if (declParameterSymbol) {
                        context.setTypeInContext(declParameterSymbol, widenedInitTypeSymbol);
                    }

                    // if the noImplicitAny flag is set to be true, report an error
                    if (this.compilationSettings.noImplicitAny) {
                        // initializer is resolved to any type from widening variable declaration (i.e var x = null)
                        if ((widenedInitTypeSymbol != initTypeSymbol) && (widenedInitTypeSymbol == this.semanticInfoChain.anyTypeSymbol)) {
                            context.postError(this.unitPath, varDecl.minChar, varDecl.getLength(), DiagnosticCode.Variable_0_implicitly_has_an_any_type,
                                [varDecl.id.actualText]);
                        }
                    }
                }
            }

            return widenedInitTypeSymbol;
        }

        private typeCheckVariableDeclaration(varDecl: BoundDecl, context: PullTypeResolutionContext, enclosingDecl?: PullDecl) {
            this.setTypeChecked(varDecl, context);

            var decl: PullDecl = this.getDeclForAST(varDecl);
            var declSymbol = decl.getSymbol();

            var typeExprSymbol = this.resolveAndTypeCheckVariableDeclarationTypeExpr(varDecl, context, enclosingDecl);

            // Report errors on init Expr only if typeExpr is present because we wouldnt have resolved the initExpr when just resolving
            var initTypeSymbol = this.resolveAndTypeCheckVariableDeclarationInitExpr(varDecl, context, enclosingDecl, typeExprSymbol);

            // If we're type checking, test the initializer and type annotation for assignment compatibility
            if (varDecl.typeExpr || varDecl.init) {
                if (typeExprSymbol && typeExprSymbol.isAlias()) {
                    typeExprSymbol = (<PullTypeAliasSymbol>typeExprSymbol).getExportAssignedTypeSymbol();
                }

                if (typeExprSymbol && typeExprSymbol.kind === PullElementKind.DynamicModule) {

                    var exportedTypeSymbol = (<PullContainerSymbol>typeExprSymbol).getExportAssignedTypeSymbol();

                    if (exportedTypeSymbol) {
                        typeExprSymbol = exportedTypeSymbol;
                    }
                    else {
                        var instanceTypeSymbol = (<PullContainerSymbol>typeExprSymbol).getInstanceType();

                        if (!instanceTypeSymbol) {
                            context.postError(this.unitPath, varDecl.minChar, varDecl.getLength(), DiagnosticCode.Tried_to_set_variable_type_to_uninitialized_module_type_0, [typeExprSymbol.toString()]);
                            typeExprSymbol = null;
                        }
                        else {
                            typeExprSymbol = instanceTypeSymbol;
                        }
                    }
                }

                initTypeSymbol = this.getInstanceTypeForAssignment(varDecl, initTypeSymbol, enclosingDecl, context);

                if (initTypeSymbol && typeExprSymbol) {
                    var comparisonInfo = new TypeComparisonInfo();

                    var isAssignable = this.sourceIsAssignableToTarget(initTypeSymbol, typeExprSymbol, context, comparisonInfo);

                    if (!isAssignable) {
                        if (comparisonInfo.message) {
                            context.postError(this.unitPath, varDecl.minChar, varDecl.getLength(), DiagnosticCode.Cannot_convert_0_to_1_NL_2, [initTypeSymbol.toString(), typeExprSymbol.toString(), comparisonInfo.message]);
                        } else {
                            context.postError(this.unitPath, varDecl.minChar, varDecl.getLength(), DiagnosticCode.Cannot_convert_0_to_1, [initTypeSymbol.toString(), typeExprSymbol.toString()]);
                        }
                    }
                }
            } else if (this.compilationSettings.noImplicitAny && !TypeScript.hasFlag(varDecl.getVarFlags(), VariableFlags.ForInVariable)) {
                // if we're lacking both a type annotation and an initialization expression, the type is 'any'
                // if the noImplicitAny flag is set to be true, report an error
                // Do not report an error if the variable declaration is declared in ForIn statement

                var wrapperDecl = this.getEnclosingDecl(decl);
                wrapperDecl = wrapperDecl ? wrapperDecl : enclosingDecl;

                // check what enclosingDecl the varDecl is in and report an appropriate error message
                // varDecl is a function/constructor/constructor-signature parameter
                if ((wrapperDecl.kind === TypeScript.PullElementKind.Function ||
                    wrapperDecl.kind === TypeScript.PullElementKind.ConstructorMethod ||
                    wrapperDecl.kind === TypeScript.PullElementKind.ConstructSignature)) {
                    context.postError(this.unitPath, varDecl.minChar, varDecl.getLength(),
                        DiagnosticCode.Parameter_0_of_1_implicitly_has_an_any_type, [varDecl.id.actualText, enclosingDecl.name]);
                }
                // varDecl is a method paremeter
                else if (wrapperDecl.kind === TypeScript.PullElementKind.Method) {
                    // check if the parent of wrapperDecl is ambient class declaration
                    var parentDecl = wrapperDecl.getParentDecl();
                    // parentDecl is not an ambient declaration; so report an error
                    if (!TypeScript.hasFlag(parentDecl.flags, TypeScript.PullElementFlags.Ambient)) {
                        context.postError(this.unitPath, varDecl.minChar, varDecl.getLength(),
                            DiagnosticCode.Parameter_0_of_1_implicitly_has_an_any_type, [varDecl.id.actualText, enclosingDecl.name]);
                    }
                    // parentDecl is an ambient declaration, but the wrapperDecl(method) is a not private; so report an error
                    else if (TypeScript.hasFlag(parentDecl.flags, TypeScript.PullElementFlags.Ambient) &&
                        !TypeScript.hasFlag(wrapperDecl.flags, TypeScript.PullElementFlags.Private)) {
                        context.postError(this.unitPath, varDecl.minChar, varDecl.getLength(),
                            DiagnosticCode.Parameter_0_of_1_implicitly_has_an_any_type, [varDecl.id.actualText, enclosingDecl.name]);
                    }
                }
                // varDecl is a property in object type
                else if (wrapperDecl.kind === TypeScript.PullElementKind.ObjectType) {
                    context.postError(this.unitPath, varDecl.minChar, varDecl.getLength(),
                        DiagnosticCode.Member_0_of_object_type_implicitly_has_an_any_type, [varDecl.id.actualText]);
                }
                // varDecl is a variable declartion or class/interface property; Ignore variable in catch block or in the ForIn Statement
                else if (wrapperDecl.kind !== TypeScript.PullElementKind.CatchBlock) {
                    // varDecl is not declared in ambient declaration; so report an error
                    if (!TypeScript.hasFlag(wrapperDecl.flags, TypeScript.PullElementFlags.Ambient)) {
                        context.postError(this.unitPath, varDecl.minChar, varDecl.getLength(),
                            DiagnosticCode.Variable_0_implicitly_has_an_any_type, [varDecl.id.actualText]);
                    }
                    // varDecl is delcared in ambient declaration but it is not private; so report an error
                    else if (TypeScript.hasFlag(wrapperDecl.flags, TypeScript.PullElementFlags.Ambient) &&
                        !TypeScript.hasFlag(varDecl.getVarFlags(), VariableFlags.Private)) {
                        context.postError(this.unitPath, varDecl.minChar, varDecl.getLength(),
                            DiagnosticCode.Variable_0_implicitly_has_an_any_type, [varDecl.id.actualText]);
                    }
                }
            }

            if (varDecl.init && varDecl.nodeType() === NodeType.Parameter) {
                var containerSignature = enclosingDecl.getSignatureSymbol();
                if (containerSignature && !containerSignature.isDefinition()) {
                    context.postError(this.unitPath, varDecl.minChar, varDecl.getLength(), DiagnosticCode.Default_arguments_are_not_allowed_in_an_overload_parameter, null);
                }
            }
            if (declSymbol.kind != PullElementKind.Parameter &&
                (declSymbol.kind != PullElementKind.Property || declSymbol.getContainer().isNamedTypeSymbol())) {
                this.checkSymbolPrivacy(declSymbol, declSymbol.type, context, (symbol: PullSymbol) =>
                    this.variablePrivacyErrorReporter(declSymbol, symbol, context));
            }

            if (declSymbol.kind != PullElementKind.Property) {
                // Non property variable with _this name, we need to verify if this would be ok
                this.checkNameForCompilerGeneratedDeclarationCollision(varDecl, /*isDeclaration*/ true, varDecl.id, enclosingDecl, context); 
            }
        }

        private checkSuperCaptureVariableCollides(superAST: AST, isDeclaration: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            var declPath: PullDecl[] = getPathToDecl(enclosingDecl);


            var classSymbol = this.getContextualClassSymbolForEnclosingDecl(enclosingDecl, context);

            if (classSymbol) {
                if (!classSymbol.isResolved) {
                    this.resolveDeclaredSymbol(classSymbol, enclosingDecl, context);
                }

                var parents = classSymbol.getExtendedTypes();
                if (parents.length) {
                    context.postError(this.unitPath, superAST.minChar, superAST.getLength(),
                        isDeclaration ? DiagnosticCode.Duplicate_identifier_super_Compiler_uses_super_to_capture_base_class_reference :
                        DiagnosticCode.Expression_resolves_to_super_that_compiler_uses_to_capture_base_class_reference,
                        null);
                }
            }
        }

        private checkThisCaptureVariableCollides(_thisAST: AST, isDeclaration: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            // Verify if this variable name conflicts with the _this that would be emitted to capture this in any of the enclosing context
            var declPath: PullDecl[] = getPathToDecl(enclosingDecl);

            for (var i = declPath.length - 1; i >= 0; i--) {
                var decl = declPath[i];
                var declKind = decl.kind;
                if (declKind === PullElementKind.FunctionExpression && hasFlag(decl.flags, PullElementFlags.FatArrow)) {
                    continue;
                }

                if (declKind === PullElementKind.Function ||
                    declKind === PullElementKind.Method ||
                    declKind === PullElementKind.ConstructorMethod ||
                    declKind === PullElementKind.GetAccessor ||
                    declKind === PullElementKind.SetAccessor ||
                    declKind === PullElementKind.FunctionExpression ||
                    declKind === PullElementKind.Class ||
                    declKind === PullElementKind.Container ||
                    declKind === PullElementKind.DynamicModule ||
                    declKind === PullElementKind.Script) {
                    if (hasFlag(decl.flags, PullElementFlags.MustCaptureThis)) {
                        context.postError(this.unitPath, _thisAST.minChar, _thisAST.getLength(),
                            isDeclaration ? DiagnosticCode.Duplicate_identifier_this_Compiler_uses_variable_declaration_this_to_capture_this_reference :
                            DiagnosticCode.Expression_resolves_to_variable_declaration_this_that_compiler_uses_to_capture_this_reference,
                            null);
                    }
                    break;
                }
            }
        }

        private postTypeCheckVariableDeclaration(varDecl: BoundDecl, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.checkThisCaptureVariableCollides(varDecl, true, enclosingDecl, context);
        }

        private resolveTypeParameterDeclaration(typeParameterAST: TypeParameter, context: PullTypeResolutionContext): PullTypeSymbol {
            var typeParameterDecl = this.getDeclForAST(typeParameterAST);
            var typeParameterSymbol = <PullTypeParameterSymbol>typeParameterDecl.getSymbol();

            // REVIEW: We shouldn't bail if we're specializing
            if (typeParameterSymbol.isResolved || typeParameterSymbol.inResolution) {
                if (typeParameterSymbol.isResolved && this.canTypeCheckAST(typeParameterAST, context)) {
                    this.typeCheckTypeParameterDeclaration(typeParameterAST, context);
                }
                return typeParameterSymbol;
            }

            typeParameterSymbol.startResolving();

            if (typeParameterAST.constraint) {
                var enclosingDecl = this.getEnclosingDecl(typeParameterDecl);
                var constraintTypeSymbol = this.resolveTypeReference(<TypeReference>typeParameterAST.constraint, enclosingDecl, context);

                if (constraintTypeSymbol) {
                    typeParameterSymbol.setConstraint(constraintTypeSymbol);
                }
            }

            typeParameterSymbol.setResolved();

            if (this.canTypeCheckAST(typeParameterAST, context)) {
                this.setTypeChecked(typeParameterAST, context);
            }

            return typeParameterSymbol;
        }

        private typeCheckTypeParameterDeclaration(typeParameterAST: TypeParameter, context: PullTypeResolutionContext) {
            this.setTypeChecked(typeParameterAST, context);

            var typeParameterDecl = this.getDeclForAST(typeParameterAST);
            var enclosingDecl = this.getEnclosingDecl(typeParameterDecl);
            this.resolveTypeReference(<TypeReference>typeParameterAST.constraint, enclosingDecl, context);
        }

        private resolveFunctionBodyReturnTypes(funcDeclAST: FunctionDeclaration, signature: PullSignatureSymbol, useContextualType: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            var returnStatements: {
                returnStatement: ReturnStatement; enclosingDecl: PullDecl;
            }[] = [];

            var enclosingDeclStack: PullDecl[] = [enclosingDecl];

            var preFindReturnExpressionTypes = (ast: AST, parent: AST, walker: IAstWalker) => {
                var go = true;

                switch (ast.nodeType()) {
                    case NodeType.FunctionDeclaration:
                        // don't recurse into a function decl - we don't want to confuse a nested
                        // return type with the top-level function's return type
                        go = false;
                        break;

                    case NodeType.ReturnStatement:
                        var returnStatement: ReturnStatement = <ReturnStatement>ast;
                        enclosingDecl.setFlag(PullElementFlags.HasReturnStatement);
                        returnStatements[returnStatements.length] = { returnStatement: returnStatement, enclosingDecl: enclosingDeclStack[enclosingDeclStack.length - 1] };
                        go = false;
                        break;

                    case NodeType.CatchClause:
                    case NodeType.WithStatement:
                        enclosingDeclStack[enclosingDeclStack.length] = this.getDeclForAST(ast);
                        break;

                    default:
                        break;
                }

                walker.options.goChildren = go;

                return ast;
            };

            var postFindReturnExpressionEnclosingDecls = function (ast: AST, parent: AST, walker: IAstWalker) {
                switch (ast.nodeType()) {
                    case NodeType.CatchClause:
                    case NodeType.WithStatement:
                        enclosingDeclStack.length--;
                        break;
                    default:
                        break;
                }

                walker.options.goChildren = true;

                return ast;
            };

            getAstWalkerFactory().walk(funcDeclAST.block, preFindReturnExpressionTypes, postFindReturnExpressionEnclosingDecls);

            if (!returnStatements.length) {
                signature.returnType = this.semanticInfoChain.voidTypeSymbol;
            }

            else {
                var returnExpressionSymbols: PullTypeSymbol[] = [];
                var returnType: PullTypeSymbol;

                for (var i = 0; i < returnStatements.length; i++) {
                    if (returnStatements[i].returnStatement.returnExpression) {
                        returnType = this.resolveAST(returnStatements[i].returnStatement.returnExpression, useContextualType, returnStatements[i].enclosingDecl, context).type;

                        if (returnType.isError()) {
                            signature.returnType = returnType;
                            return;
                        }
                        else {
                            this.setSymbolForAST(returnStatements[i].returnStatement, returnType, context);
                        }

                        returnExpressionSymbols[returnExpressionSymbols.length] = returnType;
                    }
                }

                if (!returnExpressionSymbols.length) {
                    signature.returnType = this.semanticInfoChain.voidTypeSymbol;
                }
                else {

                    // combine return expression types for best common type
                    var collection: IPullTypeCollection = {
                        getLength: () => { return returnExpressionSymbols.length; },
                        getTypeAtIndex: (index: number) => {
                            return returnExpressionSymbols[index].type;
                        }
                    };

                    var bestCommonReturnType = this.findBestCommonType(returnExpressionSymbols[0], collection, context, new TypeComparisonInfo());
                    returnType = bestCommonReturnType;

                    if (useContextualType && returnType == this.semanticInfoChain.anyTypeSymbol) {
                        var contextualType = context.getContextualType();

                        if (contextualType) {
                            returnType = contextualType;
                        }
                    }

                    var functionDecl = this.getDeclForAST(funcDeclAST);
                    var functionSymbol = functionDecl.getSymbol();

                    if (returnType) {
                        var previousReturnType = returnType;
                        var newReturnType = this.widenType(returnType, enclosingDecl, context);
                        signature.returnType = newReturnType;

                        if (!ArrayUtilities.contains(returnExpressionSymbols, bestCommonReturnType)) {
                            context.postError(this.unitPath, funcDeclAST.minChar, funcDeclAST.getLength(),
                                DiagnosticCode.Could_not_find_the_best_common_type_of_types_of_all_return_statement_expressions, null);
                        }

                        // if noImplicitAny flag is set to be true and return statements are not cast expressions, report an error
                        if (this.compilationSettings.noImplicitAny) {
                            // if the returnType got widen to Any
                            if (previousReturnType !== newReturnType && newReturnType === this.semanticInfoChain.anyTypeSymbol) {
                                var functionName = enclosingDecl.name;
                                if (functionName == "") {
                                    functionName = (<PullFunctionExpressionDecl>enclosingDecl).getFunctionExpressionName();
                                }

                                if (functionName != "") {
                                    context.postError(this.unitPath, funcDeclAST.minChar, funcDeclAST.getLength(),
                                        DiagnosticCode._0_which_lacks_return_type_annotation_implicitly_has_an_any_return_type, [functionName]);
                                }
                                else {
                                    context.postError(this.unitPath, funcDeclAST.minChar, funcDeclAST.getLength(),
                                        DiagnosticCode.Function_expression_which_lacks_return_type_annotation_implicitly_has_an_any_return_type, null);
                                }
                            }
                        }
                    }

                    // If the accessor is referenced via a recursive chain, we may not have set the accessor's type just yet and we'll
                    // need to do so before setting the 'isGeneric' flag
                    if (!functionSymbol.type && functionSymbol.isAccessor()) {
                        functionSymbol.type = signature.returnType;
                    }

                    if (this.isTypeArgumentOrWrapper(returnType) && functionSymbol) {
                        functionSymbol.type.setHasGenericSignature();
                    }
                }
            }
        }

        private typeCheckFunctionDeclaration(
            funcDeclAST: FunctionDeclaration,
            context: PullTypeResolutionContext) {
            this.setTypeChecked(funcDeclAST, context);

            var funcDecl: PullDecl = this.getDeclForAST(funcDeclAST);

            if (funcDeclAST.typeArguments) {
                for (var i = 0; i < funcDeclAST.typeArguments.members.length; i++) {
                    this.resolveTypeParameterDeclaration(<TypeParameter>funcDeclAST.typeArguments.members[i], context);
                }
            }

            // resolve parameter type annotations as necessary
            if (funcDeclAST.arguments) {
                var isConstructor = funcDeclAST.isConstructor || hasFlag(funcDeclAST.getFunctionFlags(), FunctionFlags.ConstructMember);
                var prevInConstructorArguments = context.inConstructorArguments;
                context.inConstructorArguments = isConstructor;
                var hasDefaultArgs = (funcDecl.flags & PullElementFlags.HasDefaultArgs) !== 0;
                if (hasDefaultArgs) {
                    context.pushParameterIndexContext(funcDeclAST);
                }
                for (var i = 0; i < funcDeclAST.arguments.members.length; i++) {
                    this.resolveAST(funcDeclAST.arguments.members[i], false, funcDecl, context);
                    if (hasDefaultArgs) {
                        context.incrementParameterIndex();
                    }
                }
                if (hasDefaultArgs) {
                    context.popParameterIndexContext();
                }
                context.inConstructorArguments = prevInConstructorArguments;
            }


            var prevSeenSuperConstructorCall = this.seenSuperConstructorCall;
            this.seenSuperConstructorCall = false;
            this.resolveAST(funcDeclAST.block, false, funcDecl, context);
            var enclosingDecl = this.getEnclosingDecl(funcDecl);
            if (funcDeclAST.isConstructor || hasFlag(funcDeclAST.getFunctionFlags(), FunctionFlags.ConstructMember)) {
                if (funcDecl.getSignatureSymbol() && funcDecl.getSignatureSymbol().isDefinition() && this.enclosingClassIsDerived(funcDecl)) {
                    // Constructors for derived classes must contain a call to the class's 'super' constructor
                    if (!this.seenSuperConstructorCall) {
                        context.postError(this.unitPath, funcDeclAST.minChar, 11 /* "constructor" */,
                            DiagnosticCode.Constructors_for_derived_classes_must_contain_a_super_call, null);
                    }
                    // The first statement in the body of a constructor must be a super call if both of the following are true:
                    //  - The containing class is a derived class.
                    //  - The constructor declares parameter properties or the containing class declares instance member variables with initializers.
                    else if (this.superCallMustBeFirstStatementInConstructor(funcDecl, enclosingDecl)) {
                        var firstStatement = this.getFirstStatementFromFunctionDeclAST(funcDeclAST);
                        if (!firstStatement || !this.isSuperCallNode(firstStatement)) {
                            context.postError(this.unitPath, funcDeclAST.minChar, 11 /* "constructor" */,
                                DiagnosticCode.A_super_call_must_be_the_first_statement_in_the_constructor_when_a_class_contains_initialized_properties_or_has_parameter_properties, null);
                        }
                    }
                }
            }
            this.seenSuperConstructorCall = prevSeenSuperConstructorCall;
            this.resolveReturnTypeAnnotationOfFunctionDeclaration(funcDeclAST, context);

            this.validateVariableDeclarationGroups(funcDecl, context);

            this.checkFunctionTypePrivacy(funcDeclAST, context);

            var signature: PullSignatureSymbol = funcDecl.getSpecializingSignatureSymbol();
            if (!hasFlag(funcDeclAST.getFunctionFlags(), FunctionFlags.IndexerMember)) {
                // It is a constructor or function
                var hasReturn = (funcDecl.flags & (PullElementFlags.Signature | PullElementFlags.HasReturnStatement)) != 0;

                // If this is a function and it has returnType annotation, check if block contains non void return expression
                if (!funcDeclAST.isConstructor && !hasFlag(funcDeclAST.getFunctionFlags(), FunctionFlags.ConstructMember)
                    && funcDeclAST.block && funcDeclAST.returnTypeAnnotation != null && !hasReturn) {
                    var isVoidOrAny = this.isAnyOrEquivalent(signature.returnType) || signature.returnType === this.semanticInfoChain.voidTypeSymbol;

                    if (!isVoidOrAny && !(funcDeclAST.block.statements.members.length > 0 && funcDeclAST.block.statements.members[0].nodeType() === NodeType.ThrowStatement)) {
                        var funcName = funcDecl.getDisplayName();
                        funcName = funcName ? funcName : "expression";

                        context.postError(this.unitPath, funcDeclAST.returnTypeAnnotation.minChar, funcDeclAST.returnTypeAnnotation.getLength(), DiagnosticCode.Function_0_declared_a_non_void_return_type_but_has_no_return_expression, [funcName]);
                    }
                }
            }

            if (funcDecl.kind == PullElementKind.Function) {
                // Non property variable with _this name, we need to verify if this would be ok
                var funcNameText = funcDeclAST.name.text();
                if (funcNameText == "_super") {
                    this.checkSuperCaptureVariableCollides(funcDeclAST, /*isDeclaration*/ true, enclosingDecl, context);
                }
            }

            PullTypeResolver.typeCheckCallBacks.push((context) => {
                var currentUnitPath = this.unitPath;
                this.setUnitPath(funcDecl.getScriptName());

                if (!hasFlag(funcDeclAST.getFunctionFlags(), FunctionFlags.IndexerMember)) {
                    // Function or constructor
                    this.typeCheckFunctionOverloads(funcDeclAST, context);
                } else {
                    // Index signatures
                    var parentSymbol = funcDecl.getSignatureSymbol().getContainer();
                    var allIndexSignatures = this.getBothKindsOfIndexSignatures(parentSymbol, context);
                    var stringIndexSignature = allIndexSignatures.stringSignature;
                    var numberIndexSignature = allIndexSignatures.numericSignature;
                    var isNumericIndexer = numberIndexSignature === signature;

                    // Check that the number signature is a subtype of the string index signature. To ensure that we only check this once,
                    // we make sure that if the two signatures share a container, we only check this when type checking the number signature.
                    if (numberIndexSignature && stringIndexSignature &&
                        (isNumericIndexer || stringIndexSignature.getDeclarations()[0].getParentDecl() !== numberIndexSignature.getDeclarations()[0].getParentDecl())) {
                        var comparisonInfo = new TypeComparisonInfo();
                        var resolutionContext = new PullTypeResolutionContext(this);
                        if (!this.sourceIsSubtypeOfTarget(numberIndexSignature.returnType, stringIndexSignature.returnType, resolutionContext, comparisonInfo)) {
                            if (comparisonInfo.message) {
                                context.postError(this.unitPath, funcDeclAST.minChar, funcDeclAST.getLength(), DiagnosticCode.Numeric_indexer_type_0_must_be_a_subtype_of_string_indexer_type_1_NL_2,
                                    [numberIndexSignature.returnType.toString(), stringIndexSignature.returnType.toString(), comparisonInfo.message]);
                            } else {
                                context.postError(this.unitPath, funcDeclAST.minChar, funcDeclAST.getLength(), DiagnosticCode.Numeric_indexer_type_0_must_be_a_subtype_of_string_indexer_type_1,
                                    [numberIndexSignature.returnType.toString(), stringIndexSignature.returnType.toString()]);
                            }
                        }
                    }

                    // Check that property names comply with indexer constraints (either string or numeric)
                    var allMembers = parentSymbol.type.getAllMembers(PullElementKind.All, GetAllMembersVisiblity.all);
                    for (var i = 0; i < allMembers.length; i++) {
                        var name = allMembers[i].name;
                        if (name) {
                            if (!allMembers[i].isResolved) {
                                this.resolveDeclaredSymbol(allMembers[i], allMembers[i].getDeclarations()[0].getParentDecl(), context);
                            }
                            // Skip members in the same container, they will be checked during their member type check
                            if (parentSymbol !== allMembers[i].getContainer()) {
                                // Check if the member name kind (number or string), matches the index signature kind. If it does give an error.
                                // If it doesn't we only want to give an error if this is a string signature, and we don't have a numeric signature
                                var isMemberNumeric = PullHelpers.isNameNumeric(name);
                                var indexerKindMatchesMemberNameKind = isNumericIndexer === isMemberNumeric;
                                var onlyStringIndexerIsPresent = !numberIndexSignature;

                                if (indexerKindMatchesMemberNameKind || onlyStringIndexerIsPresent) {
                                    this.checkThatMemberIsSubtypeOfIndexer(allMembers[i], signature, funcDeclAST, context, enclosingDecl, isNumericIndexer);
                                }
                            }
                        }
                    }
                }

                this.setUnitPath(currentUnitPath);
            });
        }

        private resolveReturnTypeAnnotationOfFunctionDeclaration(funcDeclAST: FunctionDeclaration, context: PullTypeResolutionContext): PullTypeSymbol {
            var returnTypeSymbol: PullTypeSymbol = null;

            // resolve the return type annotation
            if (funcDeclAST.returnTypeAnnotation) {
                var funcDecl: PullDecl = this.getDeclForAST(funcDeclAST);

                // use the funcDecl for the enclosing decl, since we want to pick up any type parameters 
                // on the function when resolving the return type
                returnTypeSymbol = this.resolveTypeReference(<TypeReference>funcDeclAST.returnTypeAnnotation, funcDecl, context);

                if (!returnTypeSymbol) {
                    context.postError(this.unitPath, funcDeclAST.returnTypeAnnotation.minChar, funcDeclAST.returnTypeAnnotation.getLength(), DiagnosticCode.Cannot_resolve_return_type_reference, null);
                }
                else {
                    var isConstructor = funcDeclAST.isConstructor || hasFlag(funcDeclAST.getFunctionFlags(), FunctionFlags.ConstructMember);
                    if (isConstructor && returnTypeSymbol === this.semanticInfoChain.voidTypeSymbol) {
                        context.postError(this.unitPath, funcDeclAST.minChar, funcDeclAST.getLength(), DiagnosticCode.Constructors_cannot_have_a_return_type_of_void, null);
                    }
                }
            }

            return returnTypeSymbol;
        }

        private resolveAnyFunctionDeclaration(funcDecl: FunctionDeclaration, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            context.jumpRecordStack.push(new JumpRecord());

            var result: PullSymbol;
            if (funcDecl.isGetAccessor()) {
                result = this.resolveGetAccessorDeclaration(funcDecl, context);
            }
            else if (funcDecl.isSetAccessor()) {
                result = this.resolveSetAccessorDeclaration(funcDecl, context);
            }
            else if (inContextuallyTypedAssignment ||
                (funcDecl.getFunctionFlags() & FunctionFlags.IsFunctionExpression) ||
                (funcDecl.getFunctionFlags() & FunctionFlags.IsFatArrowFunction) ||
                (funcDecl.getFunctionFlags() & FunctionFlags.IsFunctionProperty)) {

                result = this.resolveFunctionExpression(funcDecl, inContextuallyTypedAssignment, enclosingDecl, context);
            }
            else {
                result = this.resolveFunctionDeclaration(funcDecl, context);
            }

            context.jumpRecordStack.pop();

            return result;
        }

        private resolveFunctionDeclaration(funcDeclAST: FunctionDeclaration, context: PullTypeResolutionContext): PullSymbol {

            var funcDecl: PullDecl = this.getDeclForAST(funcDeclAST);

            var funcSymbol = funcDecl.getSymbol();

            var signature: PullSignatureSymbol = funcDecl.getSpecializingSignatureSymbol();

            var hadError = false;

            var isConstructor = funcDeclAST.isConstructor || hasFlag(funcDeclAST.getFunctionFlags(), FunctionFlags.ConstructMember);

            if (signature) {

                if (signature.isResolved) {
                    if (this.canTypeCheckAST(funcDeclAST, context)) {
                        this.typeCheckFunctionDeclaration(funcDeclAST, context);
                    }
                    return funcSymbol;
                }

                if (isConstructor && !signature.inResolution) {
                    var classAST = funcDeclAST.classDecl;

                    if (classAST) {
                        var classDecl = this.getDeclForAST(classAST);
                        var classSymbol = classDecl.getSymbol();

                        if (!classSymbol.isResolved && !classSymbol.inResolution) {
                            this.resolveDeclaredSymbol(classSymbol, this.getEnclosingDecl(classDecl), context);
                        }
                    }
                }

                // Save this in case we had set the function type to any because of a recursive reference.
                var functionTypeSymbol = funcSymbol && funcSymbol.type;

                if (signature.inResolution) {

                    // try to set the return type, even though we may be lacking in some information
                    if (funcDeclAST.returnTypeAnnotation) {
                        var returnTypeSymbol = this.resolveTypeReference(<TypeReference>funcDeclAST.returnTypeAnnotation, funcDecl, context);
                        if (!returnTypeSymbol) {
                            context.postError(this.unitPath, funcDeclAST.returnTypeAnnotation.minChar, funcDeclAST.returnTypeAnnotation.getLength(), DiagnosticCode.Cannot_resolve_return_type_reference, null);
                            signature.returnType = this.getNewErrorTypeSymbol();
                            hadError = true;
                        } else {
                            if (this.isTypeArgumentOrWrapper(returnTypeSymbol)) {
                                signature.hasAGenericParameter = true;
                                if (funcSymbol) {
                                    funcSymbol.type.setHasGenericSignature();
                                }
                            }
                            signature.returnType = returnTypeSymbol;

                            if (isConstructor && returnTypeSymbol === this.semanticInfoChain.voidTypeSymbol) {
                                context.postError(this.unitPath, funcDeclAST.minChar, funcDeclAST.getLength(), DiagnosticCode.Constructors_cannot_have_a_return_type_of_void, null);
                            }
                        }
                    }
                    else {
                        signature.returnType = this.semanticInfoChain.anyTypeSymbol;
                    }

                    if (funcSymbol) {
                        funcSymbol.setUnresolved();
                        if (funcSymbol.type === this.semanticInfoChain.anyTypeSymbol) {
                            funcSymbol.type = functionTypeSymbol;
                        }
                    }
                    signature.setResolved();
                    return funcSymbol;
                }

                if (funcSymbol) {
                    funcSymbol.startResolving();
                }
                signature.startResolving();

                if (funcDeclAST.typeArguments) {
                    for (var i = 0; i < funcDeclAST.typeArguments.members.length; i++) {
                        this.resolveTypeParameterDeclaration(<TypeParameter>funcDeclAST.typeArguments.members[i], context);
                    }
                }

                // resolve parameter type annotations as necessary

                if (funcDeclAST.arguments) {
                    var prevInConstructorArguments = context.inConstructorArguments;
                    var prevInTypeCheck = context.inTypeCheck;
                    context.inConstructorArguments = isConstructor;
                    context.inTypeCheck = false;
                    var hasDefaultArgs = (funcDecl.flags & PullElementFlags.HasDefaultArgs) !== 0;
                    if (hasDefaultArgs) {
                        context.pushParameterIndexContext(funcDeclAST);
                    }
                    for (var i = 0; i < funcDeclAST.arguments.members.length; i++) {
                        this.resolveVariableDeclaration(<BoundDecl>funcDeclAST.arguments.members[i], context, funcDecl);
                        if (hasDefaultArgs) {
                            context.incrementParameterIndex();
                        }
                    }
                    if (hasDefaultArgs) {
                        context.popParameterIndexContext();
                    }
                    context.inConstructorArguments = prevInConstructorArguments;
                    context.inTypeCheck = prevInTypeCheck;
                }

                if (signature.isGeneric()) {
                    // PULLREVIEW: This is split into a spearate if statement to make debugging slightly easier...
                    if (funcSymbol) {
                        funcSymbol.type.setHasGenericSignature();
                    }
                }

                // resolve the return type annotation
                if (funcDeclAST.returnTypeAnnotation) {

                    // We may have a return type from a previous resolution - if the function's generic,
                    // we can reuse it
                    var prevReturnTypeSymbol = signature.returnType;

                    returnTypeSymbol = this.resolveReturnTypeAnnotationOfFunctionDeclaration(funcDeclAST, context);

                    if (!returnTypeSymbol) {
                        signature.returnType = this.getNewErrorTypeSymbol();
                        hadError = true;
                    }
                    else if (!(this.isTypeArgumentOrWrapper(returnTypeSymbol) && prevReturnTypeSymbol && !this.isTypeArgumentOrWrapper(prevReturnTypeSymbol))) {
                        if (this.isTypeArgumentOrWrapper(returnTypeSymbol)) {
                            signature.hasAGenericParameter = true;

                            if (funcSymbol) {
                                funcSymbol.type.setHasGenericSignature();
                            }
                        }

                        signature.returnType = returnTypeSymbol;
                    }
                }
                // if there's no return-type annotation
                //     - if it's not a definition signature, set the return type to 'any'
                //     - if it's a definition sigature, take the best common type of all return expressions
                //     - if it's a constructor, we set the return type link during binding
                else if (!funcDeclAST.isConstructor && !funcDeclAST.isConstructMember()) {
                    if (funcDeclAST.isSignature()) {
                        signature.returnType = this.semanticInfoChain.anyTypeSymbol;
                        var parentDeclFlags = TypeScript.PullElementFlags.None;
                        if (TypeScript.hasFlag(funcDecl.kind, TypeScript.PullElementKind.Method) ||
                            TypeScript.hasFlag(funcDecl.kind, TypeScript.PullElementKind.ConstructorMethod)) {
                            var parentDecl = funcDecl.getParentDecl();
                            parentDeclFlags = parentDecl.flags;
                        }

                        // if the noImplicitAny flag is set to be true, report an error
                        if (this.compilationSettings.noImplicitAny &&
                            (!TypeScript.hasFlag(parentDeclFlags, PullElementFlags.Ambient) ||
                            (TypeScript.hasFlag(parentDeclFlags, PullElementFlags.Ambient) && !TypeScript.hasFlag(funcDecl.flags, PullElementFlags.Private)))) {
                            var funcDeclASTName = funcDeclAST.name;
                            if (funcDeclASTName) {
                                context.postError(this.unitPath, funcDeclAST.minChar, funcDeclAST.getLength(), DiagnosticCode._0_which_lacks_return_type_annotation_implicitly_has_an_any_return_type,
                                    [funcDeclASTName.actualText]);
                            }
                            else {
                                context.postError(this.unitPath, funcDeclAST.minChar, funcDeclAST.getLength(),
                                    DiagnosticCode.Lambda_Function_which_lacks_return_type_annotation_implicitly_has_an_any_return_type, null);
                            }
                        }
                    }
                    else {
                        this.resolveFunctionBodyReturnTypes(funcDeclAST, signature, false, funcDecl, context);
                    }
                } else if (funcDeclAST.isConstructMember()) {
                    if (funcDeclAST.isSignature()) {
                        signature.returnType = this.semanticInfoChain.anyTypeSymbol;

                        // if the noImplicitAny flag is set to be true, report an error
                        if (this.compilationSettings.noImplicitAny) {
                            context.postError(this.unitPath, funcDeclAST.minChar, funcDeclAST.getLength(), DiagnosticCode.Constructor_signature_which_lacks_return_type_annotation_implicitly_has_an_any_return_type, null);
                        }
                    }
                }

                if (!hadError) {
                    if (funcSymbol) {
                        funcSymbol.setUnresolved();
                        if (funcSymbol.type === this.semanticInfoChain.anyTypeSymbol) {
                            funcSymbol.type = functionTypeSymbol;
                        }
                    }
                    signature.setResolved();
                }
            }

            if (funcSymbol) {
                this.resolveOtherDeclarations(funcDeclAST, context);
            }

            if (this.canTypeCheckAST(funcDeclAST, context)) {
                this.typeCheckFunctionDeclaration(funcDeclAST, context);
            }

            return funcSymbol;
        }


        private resolveGetAccessorDeclaration(funcDeclAST: FunctionDeclaration, context: PullTypeResolutionContext): PullSymbol {

            var funcDecl: PullDecl = this.getDeclForAST(funcDeclAST);
            var accessorSymbol = <PullAccessorSymbol> funcDecl.getSymbol();

            var getterSymbol = accessorSymbol.getGetter();
            var getterTypeSymbol = <PullTypeSymbol>getterSymbol.type;

            var signature: PullSignatureSymbol = getterTypeSymbol.getCallSignatures()[0];

            var hadError = false;

            if (signature) {

                if (signature.isResolved) {

                    if (!accessorSymbol.type) {
                        accessorSymbol.type = signature.returnType;
                    }
                    return accessorSymbol;
                }

                if (signature.inResolution) {
                    // PULLTODO: Error or warning?
                    signature.returnType = this.semanticInfoChain.anyTypeSymbol;
                    signature.setResolved();

                    if (!accessorSymbol.type) {
                        accessorSymbol.type = signature.returnType;
                    }

                    return accessorSymbol;
                }

                signature.startResolving();

                // resolve parameter type annotations as necessary
                if (funcDeclAST.arguments) {
                    for (var i = 0; i < funcDeclAST.arguments.members.length; i++) {
                        this.resolveVariableDeclaration(<BoundDecl>funcDeclAST.arguments.members[i], context, funcDecl);
                    }
                }

                if (signature.hasAGenericParameter) {
                    // PULLREVIEW: This is split into a spearate if statement to make debugging slightly easier...
                    if (getterSymbol) {
                        getterTypeSymbol.setHasGenericSignature();
                    }
                }

                // resolve the return type annotation
                if (funcDeclAST.returnTypeAnnotation) {
                    var returnTypeSymbol = this.resolveReturnTypeAnnotationOfFunctionDeclaration(funcDeclAST, context);

                    if (!returnTypeSymbol) {
                        signature.returnType = this.getNewErrorTypeSymbol();

                        hadError = true;
                    }
                    else {

                        if (this.isTypeArgumentOrWrapper(returnTypeSymbol)) {
                            signature.hasAGenericParameter = true;

                            if (getterSymbol) {
                                getterTypeSymbol.setHasGenericSignature();
                            }
                        }

                        signature.returnType = returnTypeSymbol;
                    }
                }

                // if there's no return-type annotation
                //     - if it's not a definition signature, set the return type to 'any'
                //     - if it's a definition sigature, take the best common type of all return expressions
                else {
                    if (funcDeclAST.isSignature()) {
                        signature.returnType = this.semanticInfoChain.anyTypeSymbol;
                    }
                    else {
                        this.resolveFunctionBodyReturnTypes(funcDeclAST, signature, false, funcDecl, context);
                    }
                }


                if (!hadError) {
                    signature.setResolved();
                }
            }

            var accessorType = signature.returnType;

            var setter = accessorSymbol.getSetter();

            if (setter) {
                var setterType = setter.type;
                var setterSig = setterType.getCallSignatures()[0];

                if (setterSig.isResolved) {
                    // compare setter parameter type and getter return type
                    var setterParameters = setterSig.parameters;

                    if (setterParameters.length) {
                        var setterParameter = setterParameters[0];
                        var setterParameterType = setterParameter.type;

                        if (!this.typesAreIdentical(accessorType, setterParameterType)) {
                            context.postError(this.unitPath, funcDeclAST.minChar, funcDeclAST.getLength(), DiagnosticCode.get_and_set_accessor_must_have_the_same_type, null);
                            accessorSymbol.type = this.getNewErrorTypeSymbol();
                        }
                    }
                }
                else {
                    accessorSymbol.type = accessorType;
                }

            }
            else {
                accessorSymbol.type = accessorType;
            }

            if (this.canTypeCheckAST(funcDeclAST, context)) {
                this.typeCheckGetAccessorDeclaration(funcDeclAST, context);
            }

            return accessorSymbol;
        }

        private typeCheckGetAccessorDeclaration(funcDeclAST: FunctionDeclaration, context: PullTypeResolutionContext) {
            this.setTypeChecked(funcDeclAST, context);

            var funcDecl: PullDecl = this.getDeclForAST(funcDeclAST);
            var accessorSymbol = <PullAccessorSymbol> funcDecl.getSymbol();

            // resolve parameter type annotations as necessary
            if (funcDeclAST.arguments) {
                for (var i = 0; i < funcDeclAST.arguments.members.length; i++) {
                    this.resolveVariableDeclaration(<BoundDecl>funcDeclAST.arguments.members[i], context, funcDecl);
                }
            }

            this.resolveReturnTypeAnnotationOfFunctionDeclaration(funcDeclAST, context);

            var prevSeenSuperConstructorCall = this.seenSuperConstructorCall;
            this.seenSuperConstructorCall = false;
            this.resolveAST(funcDeclAST.block, false, funcDecl, context);
            this.seenSuperConstructorCall = prevSeenSuperConstructorCall;

            this.validateVariableDeclarationGroups(funcDecl, context);

            var enclosingDecl = this.getEnclosingDecl(funcDecl);

            var hasReturn = (funcDecl.flags & (PullElementFlags.Signature | PullElementFlags.HasReturnStatement)) != 0;

            var isGetter = hasFlag(funcDeclAST.getFunctionFlags(), FunctionFlags.GetAccessor);
            var isSetter = !isGetter;

            var getter = accessorSymbol.getGetter();
            var setter = accessorSymbol.getSetter();

            var funcNameAST = funcDeclAST.name;

            if (!hasReturn) {
                if (!(funcDeclAST.block.statements.members.length > 0 && funcDeclAST.block.statements.members[0].nodeType() === NodeType.ThrowStatement)) {
                    context.postError(this.unitPath, funcNameAST.minChar, funcNameAST.getLength(), DiagnosticCode.Getters_must_return_a_value, null);
                }
            }

            // Setter with return value is checked in typeCheckReturnExpression

            if (getter && setter) {
                var getterDecl = getter.getDeclarations()[0];
                var setterDecl = setter.getDeclarations()[0];

                var getterIsPrivate = getterDecl.flags & PullElementFlags.Private;
                var setterIsPrivate = setterDecl.flags & PullElementFlags.Private;

                if (getterIsPrivate != setterIsPrivate) {
                    context.postError(this.unitPath, funcNameAST.minChar, funcNameAST.getLength(), DiagnosticCode.Getter_and_setter_accessors_do_not_agree_in_visibility, null);
                }
            }

            this.checkFunctionTypePrivacy(funcDeclAST, context);
        }

        private resolveSetAccessorDeclaration(funcDeclAST: FunctionDeclaration, context: PullTypeResolutionContext): PullSymbol {

            var funcDecl: PullDecl = this.getDeclForAST(funcDeclAST);
            var accessorSymbol = <PullAccessorSymbol> funcDecl.getSymbol();

            var setterSymbol = accessorSymbol.getSetter();
            var setterTypeSymbol = <PullTypeSymbol>setterSymbol.type;

            var signature: PullSignatureSymbol = funcDecl.getSpecializingSignatureSymbol();

            var hadError = false;

            if (signature) {

                if (signature.isResolved) {
                    if (!accessorSymbol.type) {
                        accessorSymbol.type = signature.parameters[0].type;
                    }
                    return accessorSymbol;
                }

                if (signature.inResolution) {
                    // PULLTODO: Error or warning?
                    signature.returnType = this.semanticInfoChain.anyTypeSymbol;
                    signature.setResolved();

                    if (!accessorSymbol.type) {
                        accessorSymbol.type = this.semanticInfoChain.anyTypeSymbol;
                    }

                    return accessorSymbol;
                }

                signature.startResolving();

                // resolve parameter type annotations as necessary
                if (funcDeclAST.arguments) {
                    for (var i = 0; i < funcDeclAST.arguments.members.length; i++) {
                        this.resolveVariableDeclaration(<BoundDecl>funcDeclAST.arguments.members[i], context, funcDecl);
                    }
                }

                if (signature.hasAGenericParameter) {
                    // PULLREVIEW: This is split into a spearate if statement to make debugging slightly easier...
                    if (setterSymbol) {
                        setterTypeSymbol.setHasGenericSignature();
                    }
                }

                if (!hadError) {
                    signature.setResolved();
                }
            }

            var parameters = signature.parameters;

            var getter = accessorSymbol.getGetter();

            var accessorType = parameters.length ? parameters[0].type : getter ? getter.type : this.semanticInfoChain.undefinedTypeSymbol;

            if (getter) {
                var getterType = getter.type;
                var getterSig = getterType.getCallSignatures()[0];

                if (accessorType == this.semanticInfoChain.undefinedTypeSymbol) {
                    accessorType = getterType;
                }

                if (getterSig.isResolved) {
                    // compare setter parameter type and getter return type
                    var getterReturnType = getterSig.returnType;

                    if (!this.typesAreIdentical(accessorType, getterReturnType)) {
                        if (this.isAnyOrEquivalent(accessorType)) {
                            accessorSymbol.type = getterReturnType;
                            if (!accessorType.isError()) {
                                parameters[0].type = getterReturnType;
                            }
                        }
                        else {
                            context.postError(this.unitPath, funcDeclAST.minChar, funcDeclAST.getLength(), DiagnosticCode.get_and_set_accessor_must_have_the_same_type, null);
                            accessorSymbol.type = this.getNewErrorTypeSymbol();
                        }
                    }
                }
                else {
                    accessorSymbol.type = accessorType;
                }
            }
            else {
                accessorSymbol.type = accessorType;

                // Only report noImplicitAny error message on setter if there is no getter
                // if the noImplicitAny flag is set to be true, report an error
                if (this.compilationSettings.noImplicitAny) {
                    // if setter has an any type, it must be implicit any
                    if (accessorSymbol.type == this.semanticInfoChain.anyTypeSymbol) {
                        context.postError(this.unitPath, funcDeclAST.minChar, funcDeclAST.getLength(),
                            DiagnosticCode._0_which_lacks_return_type_annotation_implicitly_has_an_any_return_type, [funcDeclAST.name.actualText]);
                    }
                }
            }

            if (this.canTypeCheckAST(funcDeclAST, context)) {
                this.typeCheckSetAccessorDeclaration(funcDeclAST, context);
            }

            return accessorSymbol;
        }

        private typeCheckSetAccessorDeclaration(funcDeclAST: FunctionDeclaration, context: PullTypeResolutionContext) {
            this.setTypeChecked(funcDeclAST, context);

            var funcDecl: PullDecl = this.getDeclForAST(funcDeclAST);
            var accessorSymbol = <PullAccessorSymbol> funcDecl.getSymbol();

            if (funcDeclAST.arguments) {
                for (var i = 0; i < funcDeclAST.arguments.members.length; i++) {
                    this.resolveVariableDeclaration(<BoundDecl>funcDeclAST.arguments.members[i], context, funcDecl);
                }
            }

            var prevSeenSuperConstructorCall = this.seenSuperConstructorCall;
            this.seenSuperConstructorCall = false;
            this.resolveAST(funcDeclAST.block, false, funcDecl, context);
            this.seenSuperConstructorCall = prevSeenSuperConstructorCall;

            this.validateVariableDeclarationGroups(funcDecl, context);

            var enclosingDecl = this.getEnclosingDecl(funcDecl);

            var hasReturn = (funcDecl.flags & (PullElementFlags.Signature | PullElementFlags.HasReturnStatement)) != 0;

            var isGetter = hasFlag(funcDeclAST.getFunctionFlags(), FunctionFlags.GetAccessor);
            var isSetter = !isGetter;

            var getter = accessorSymbol.getGetter();
            var setter = accessorSymbol.getSetter();

            var funcNameAST = funcDeclAST.name;

            // Setter with return value is checked in typeCheckReturnExpression

            if (getter && setter) {
                var getterDecl = getter.getDeclarations()[0];
                var setterDecl = setter.getDeclarations()[0];

                var getterIsPrivate = getterDecl.flags & PullElementFlags.Private;
                var setterIsPrivate = setterDecl.flags & PullElementFlags.Private;

                if (getterIsPrivate != setterIsPrivate) {
                    context.postError(this.unitPath, funcNameAST.minChar, funcNameAST.getLength(), DiagnosticCode.Getter_and_setter_accessors_do_not_agree_in_visibility, null);
                }
            }

            this.checkFunctionTypePrivacy(funcDeclAST, context);
        }

        private resolveList(list: ASTList, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(list, context)) {
                this.setTypeChecked(list, context);

                // Visit members   
                for (var i = 0; i < list.members.length; i++) {
                    this.resolveAST(list.members[i], /*inContextuallyTypedAssignment*/ false, enclosingDecl, context);
                }
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private resolveVoidExpression(ast: UnaryExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckVoidExpression(ast, enclosingDecl, context);
            }

            // September 17, 2013: The void operator takes an operand of any type and produces the 
            // value undefined.The type of the result is the Undefined type(3.2.6).
            return this.semanticInfoChain.undefinedTypeSymbol;
        }

        private typeCheckVoidExpression(ast: UnaryExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);
            this.resolveAST(ast.operand, /*inContextuallyTypedAssignment:*/ false, enclosingDecl, context);
        }

        private resolveLogicalOperation(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            this.setSymbolForAST(ast, this.semanticInfoChain.booleanTypeSymbol, context);

            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckLogicalOperation(ast, enclosingDecl, context);
            }

            return this.semanticInfoChain.booleanTypeSymbol;
        }

        private typeCheckLogicalOperation(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);

            var binex = <BinaryExpression>ast;

            var leftType = this.resolveAST(binex.operand1, false, enclosingDecl, context).type;
            var rightType = this.resolveAST(binex.operand2, false, enclosingDecl, context).type;

            var comparisonInfo = new TypeComparisonInfo();
            if (!this.sourceIsAssignableToTarget(leftType, rightType, context, comparisonInfo) &&
                !this.sourceIsAssignableToTarget(rightType, leftType, context, comparisonInfo)) {
                context.postError(this.unitPath, binex.minChar, binex.getLength(),
                    DiagnosticCode.Operator_0_cannot_be_applied_to_types_1_and_2, [BinaryExpression.getTextForBinaryToken(binex.nodeType()), leftType.toString(), rightType.toString()]);
            }
        }

        private resolveUnaryLogicalOperation(ast: UnaryExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckUnaryLogicalOperation(ast, enclosingDecl, context);
            }

            // September 17, 2013: The ! operator permits its operand to be of any type and 
            // produces a result of the Boolean primitive type.
            return this.semanticInfoChain.booleanTypeSymbol;
        }

        private typeCheckUnaryLogicalOperation(ast: UnaryExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);
            this.resolveAST(ast.operand, false, enclosingDecl, context);
        }

        private resolveUnaryArithmeticOperation(ast: UnaryExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckUnaryArithmeticOperation(ast, enclosingDecl, context);
            }

            // September 17, 2013:
            // The ++ and-- operators ... produce a result of the Number primitive type.
            // The +, –, and ~ operators ... produce a result of the Number primitive type.
            return this.semanticInfoChain.numberTypeSymbol;
        }

        private isAnyOrNumberOrEnum(type: PullTypeSymbol): boolean {
            return this.isAnyOrEquivalent(type) || type === this.semanticInfoChain.numberTypeSymbol || PullHelpers.symbolIsEnum(type);
        }

        private typeCheckUnaryArithmeticOperation(unaryExpression: UnaryExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext): void {
            this.setTypeChecked(unaryExpression, context);

            var nodeType = unaryExpression.nodeType();
            var expression = this.resolveAST(unaryExpression.operand, /*inContextuallyTypedAssignment:*/ false, enclosingDecl, context);
            
            // September 17, 2013: The +, –, and ~ operators
            // These operators permit their operand to be of any type and produce a result of the 
            // Number primitive type.
            if (nodeType == NodeType.PlusExpression || nodeType == NodeType.NegateExpression || nodeType == NodeType.BitwiseNotExpression) {
                return;
            }

            Debug.assert(
                nodeType === NodeType.PostIncrementExpression ||
                nodeType === NodeType.PreIncrementExpression ||
                nodeType === NodeType.PostDecrementExpression ||
                nodeType === NodeType.PreDecrementExpression);

            // September 17, 2013: 4.14.1	The ++ and -- operators
            // These operators, in prefix or postfix form, require their operand to be of type Any,
            // the Number primitive type, or an enum type, and classified as a reference(section 4.1).
            var operandType = expression.type;
            if (!this.isAnyOrNumberOrEnum(operandType)) {
                context.postError(this.unitPath, unaryExpression.operand.minChar, unaryExpression.operand.getLength(), DiagnosticCode.The_type_of_a_unary_arithmetic_operation_operand_must_be_of_type_any_number_or_an_enum_type, null);
            }

            // September 17, ... and classified as a reference(section 4.1).
            if (!this.isReference(unaryExpression.operand, expression)) {
                context.postError(this.unitPath, unaryExpression.operand.minChar, unaryExpression.operand.getLength(), DiagnosticCode.The_operand_of_an_increment_or_decrement_operator_must_be_a_variable_property_or_indexer, null);
            }
        }

        private resolveBinaryArithmeticExpression(binaryExpression: BinaryExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(binaryExpression, context)) {
                this.typeCheckBinaryArithmeticExpression(binaryExpression, enclosingDecl, context);
            }

            // September 17, 2013: The result is always of the Number primitive type.
            return this.semanticInfoChain.numberTypeSymbol;
        }

        private typeCheckBinaryArithmeticExpression(binaryExpression: BinaryExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(binaryExpression, context);

            var lhsSymbol = this.resolveAST(binaryExpression.operand1, /*inContextuallyTypedAssignment:*/ false, enclosingDecl, context);

            var lhsType = lhsSymbol.type;
            var rhsType = this.resolveAST(binaryExpression.operand2, /*inContextuallyTypedAssignment:*/false, enclosingDecl, context).type;

            // September 17, 2013:
            // If one operand is the null or undefined value, it is treated as having the 
            // type of the other operand.
            if (lhsType === this.semanticInfoChain.nullTypeSymbol || lhsType === this.semanticInfoChain.undefinedTypeSymbol) {
                lhsType = rhsType;
            }

            if (rhsType === this.semanticInfoChain.nullTypeSymbol || rhsType === this.semanticInfoChain.undefinedTypeSymbol) {
                rhsType = lhsType;
            }

            // September 17, 2013:
            // 4.15.1	The *, /, %, –, <<, >>, >>>, &, ^, and | operators
            // These operators require their operands to be of type Any, the Number primitive type,
            // or an enum type
            var lhsIsFit = this.isAnyOrNumberOrEnum(lhsType);
            var rhsIsFit = this.isAnyOrNumberOrEnum(rhsType);

            if (!rhsIsFit) {
                context.postError(this.unitPath, binaryExpression.operand2.minChar, binaryExpression.operand2.getLength(), DiagnosticCode.The_right_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_or_an_enum_type, null);
            }

            if (!lhsIsFit) {
                context.postError(this.unitPath, binaryExpression.operand1.minChar, binaryExpression.operand1.getLength(), DiagnosticCode.The_left_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_or_an_enum_type, null);
            }

            if (lhsIsFit && rhsIsFit) {
                switch (binaryExpression.nodeType()) {
                    case NodeType.LeftShiftAssignmentExpression:
                    case NodeType.SignedRightShiftAssignmentExpression:
                    case NodeType.UnsignedRightShiftAssignmentExpression:
                    case NodeType.SubtractAssignmentExpression:
                    case NodeType.MultiplyAssignmentExpression:
                    case NodeType.DivideAssignmentExpression:
                    case NodeType.ModuloAssignmentExpression:
                    case NodeType.OrAssignmentExpression:
                    case NodeType.AndAssignmentExpression:
                    case NodeType.ExclusiveOrAssignmentExpression:
                        // Check if LHS is a valid target
                        if (!this.isReference(binaryExpression.operand1, lhsSymbol)) {
                            context.postError(this.unitPath, binaryExpression.operand1.minChar, binaryExpression.operand1.getLength(), DiagnosticCode.Invalid_left_hand_side_of_assignment_expression, null);
                        }

                        this.checkAssignability(binaryExpression.operand1, rhsType, lhsType, enclosingDecl, context);
                }
            }
        }

        private resolveTypeOfExpression(ast: UnaryExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckTypeOfExpression(ast, enclosingDecl, context);
            }

            // September 17, 2013: The typeof operator takes an operand of any type and produces 
            // a value of the String primitive type
            return this.semanticInfoChain.stringTypeSymbol;
        }

        private typeCheckTypeOfExpression(ast: UnaryExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);
            this.resolveAST(ast.operand, /*inContextuallyTypedAssignment*/ false, enclosingDecl, context);
        }

        private resolveThrowStatement(ast: ThrowStatement, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckThrowStatement(ast, enclosingDecl, context);
            }

            // All statements have the 'void' type.
            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckThrowStatement(ast: ThrowStatement, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);
            this.resolveAST(ast.expression, /*inContextuallyTypedAssignment:*/ false, enclosingDecl, context);
        }

        private resolveDeleteExpression(ast: UnaryExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckDeleteExpression(ast, enclosingDecl, context);
            }

            // September 17, 2013: he delete operator takes an operand of any type and produces a
            // result of the Boolean primitive type.
            return this.semanticInfoChain.booleanTypeSymbol;
        }

        private typeCheckDeleteExpression(ast: UnaryExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);
            this.resolveAST(ast.operand, false, enclosingDecl, context);
        }

        private resolveInstanceOfExpression(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            this.setSymbolForAST(ast, this.semanticInfoChain.booleanTypeSymbol, context);

            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckInstanceOfExpression(ast, enclosingDecl, context);
            }

            return this.semanticInfoChain.booleanTypeSymbol;
        }

        private typeCheckInstanceOfExpression(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);
            var binaryExpression = <BinaryExpression>ast;

            var lhsType = this.resolveAST(binaryExpression.operand1, false, enclosingDecl, context).type;
            var rhsType = this.resolveAST(binaryExpression.operand2, false, enclosingDecl, context).type;

            var isValidLHS = lhsType && (this.isAnyOrEquivalent(lhsType) || !lhsType.isPrimitive());
            var isValidRHS = rhsType && (this.isAnyOrEquivalent(rhsType) || rhsType.isClass() || this.typeIsSubtypeOfFunction(rhsType, context));

            if (!isValidLHS) {
                context.postError(this.unitPath, binaryExpression.operand1.minChar, binaryExpression.operand1.getLength(), DiagnosticCode.The_left_hand_side_of_an_instanceof_expression_must_be_of_type_any_an_object_type_or_a_type_parameter, null);
            }

            if (!isValidRHS) {
                context.postError(this.unitPath, binaryExpression.operand1.minChar, binaryExpression.operand1.getLength(), DiagnosticCode.The_right_hand_side_of_an_instanceof_expression_must_be_of_type_any_or_a_subtype_of_the_Function_interface_type, null);
            }
        }

        private resolveCommaExpression(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            var rhsType = this.resolveAST((<BinaryExpression>ast).operand2, false, enclosingDecl, context).type;

            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckCommaExpression(ast, enclosingDecl, context);
            }

            this.setSymbolForAST(ast, rhsType, context);
            return rhsType;
        }

        private typeCheckCommaExpression(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);

            this.resolveAST((<BinaryExpression>ast).operand1, false, enclosingDecl, context)
            this.resolveAST((<BinaryExpression>ast).operand2, false, enclosingDecl, context)
        }

        private resolveInExpression(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            this.setSymbolForAST(ast, this.semanticInfoChain.booleanTypeSymbol, context);

            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckInExpression(ast, enclosingDecl, context);
            }

            return this.semanticInfoChain.booleanTypeSymbol;
        }

        private typeCheckInExpression(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);

            var binaryExpression = <BinaryExpression>ast;
            var lhsType = this.resolveAST(binaryExpression.operand1, false, enclosingDecl, context).type;
            var rhsType = this.resolveAST(binaryExpression.operand2, false, enclosingDecl, context).type;

            var isStringAnyOrNumber = lhsType.type === this.semanticInfoChain.stringTypeSymbol ||
                this.isAnyOrEquivalent(lhsType.type) ||
                this.isNumberOrEquivalent(lhsType.type);
            var isValidRHS = rhsType && (this.isAnyOrEquivalent(rhsType) || !rhsType.isPrimitive());

            if (!isStringAnyOrNumber) {
                context.postError(this.unitPath, binaryExpression.operand1.minChar, binaryExpression.operand1.getLength(), DiagnosticCode.The_left_hand_side_of_an_in_expression_must_be_of_types_string_or_any, null);
            }

            if (!isValidRHS) {

                context.postError(this.unitPath, binaryExpression.operand1.minChar, binaryExpression.operand1.getLength(), DiagnosticCode.The_right_hand_side_of_an_in_expression_must_be_of_type_any_an_object_type_or_a_type_parameter, null);
            }
        }
        
        private resolveForStatement(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            this.setSymbolForAST(ast, this.semanticInfoChain.voidTypeSymbol, context);

            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckForStatement(ast, enclosingDecl, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckForStatement(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);

            this.resolveAST((<ForStatement>ast).init, false, enclosingDecl, context);
            this.resolveAST((<ForStatement>ast).cond, false, enclosingDecl, context);
            this.resolveAST((<ForStatement>ast).incr, false, enclosingDecl, context);

            var jumpRecord = context.currentJumpRecord();
            var savedInIterationStatement = jumpRecord.inIterationStatement;
            jumpRecord.inIterationStatement = true;
            this.resolveAST((<ForStatement>ast).body, false, enclosingDecl, context);
            jumpRecord.inIterationStatement = savedInIterationStatement;
        }

        private resolveForInStatement(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            this.setSymbolForAST(ast, this.semanticInfoChain.voidTypeSymbol, context);

            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckForInStatement(ast, enclosingDecl, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckForInStatement(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);

            var forInStatement = <ForInStatement>ast;

            var rhsType = this.resolveAST(forInStatement.obj, false, enclosingDecl, context).type;
            var lval = forInStatement.lval;

            if (lval.nodeType() === NodeType.VariableDeclaration) {
                var declaration = <VariableDeclaration>forInStatement.lval;
                var varDecl = <VariableDeclarator>declaration.declarators.members[0];

                if (varDecl.typeExpr) {
                    context.postError(this.unitPath, lval.minChar, lval.getLength(), DiagnosticCode.Variable_declarations_of_a_for_statement_cannot_use_a_type_annotation, null);
                }
            }

            var varSym = this.resolveAST(forInStatement.lval, false, enclosingDecl, context);

            if (lval.nodeType() === NodeType.VariableDeclaration) {
                varSym = this.getSymbolForAST((<VariableDeclaration>forInStatement.lval).declarators.members[0]);
            }

            var isStringOrNumber = varSym.type === this.semanticInfoChain.stringTypeSymbol || this.isAnyOrEquivalent(varSym.type);

            var isValidRHS = rhsType && (this.isAnyOrEquivalent(rhsType) || !rhsType.isPrimitive());

            if (!isStringOrNumber) {
                context.postError(this.unitPath, lval.minChar, lval.getLength(), DiagnosticCode.Variable_declarations_of_a_for_statement_must_be_of_types_string_or_any, null);
            }

            if (!isValidRHS) {
                context.postError(this.unitPath, forInStatement.obj.minChar, forInStatement.obj.getLength(), DiagnosticCode.The_right_hand_side_of_a_for_in_statement_must_be_of_type_any_an_object_type_or_a_type_parameter, null);
            }

            var jumpRecord = context.currentJumpRecord();
            var savedInIterationStatement = jumpRecord.inIterationStatement;
            jumpRecord.inIterationStatement = true;
            this.resolveAST(forInStatement.body, false, enclosingDecl, context);
            jumpRecord.inIterationStatement = savedInIterationStatement;
        }

        private resolveWhileStatement(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            this.setSymbolForAST(ast, this.semanticInfoChain.voidTypeSymbol, context);

            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckWhileStatement(ast, enclosingDecl, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckWhileStatement(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);

            this.resolveAST((<WhileStatement>ast).cond, false, enclosingDecl, context);

            var jumpRecord = context.currentJumpRecord();
            var savedInIterationStatement = jumpRecord.inIterationStatement;
            jumpRecord.inIterationStatement = true;
            this.resolveAST((<WhileStatement>ast).body, false, enclosingDecl, context);
            jumpRecord.inIterationStatement = savedInIterationStatement;
        }

        private resolveDoStatement(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            this.setSymbolForAST(ast, this.semanticInfoChain.voidTypeSymbol, context);

            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckDoStatement(ast, enclosingDecl, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckDoStatement(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);

            this.resolveAST((<DoStatement>ast).cond, false, enclosingDecl, context);

            var jumpRecord = context.currentJumpRecord();
            var savedInIterationStatement = jumpRecord.inIterationStatement;
            jumpRecord.inIterationStatement = true;
            this.resolveAST((<DoStatement>ast).body, false, enclosingDecl, context);
            jumpRecord.inIterationStatement = savedInIterationStatement;
        }

        private resolveIfStatement(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            this.setSymbolForAST(ast, this.semanticInfoChain.voidTypeSymbol, context);

            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckIfStatement(ast, enclosingDecl, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckIfStatement(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);

            this.resolveAST((<IfStatement>ast).cond, false, enclosingDecl, context);
            this.resolveAST((<IfStatement>ast).thenBod, false, enclosingDecl, context);
            this.resolveAST((<IfStatement>ast).elseBod, false, enclosingDecl, context);
        }

        private resolveBlock(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.setTypeChecked(ast, context);
                this.resolveAST((<Block>ast).statements, false, enclosingDecl, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private resolveVariableStatement(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.setTypeChecked(ast, context);
                this.resolveAST((<VariableStatement>ast).declaration, false, enclosingDecl, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private resolveVariableDeclarationList(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.setTypeChecked(ast, context);
                this.resolveAST((<VariableDeclaration>ast).declarators, false, enclosingDecl, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private resolveWithStatement(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            this.setSymbolForAST(ast, this.semanticInfoChain.voidTypeSymbol, context);

            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckWithStatement(ast, enclosingDecl, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckWithStatement(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);
            var withStatement = <WithStatement>ast;
            context.postError(this.unitPath, withStatement.expr.minChar, withStatement.expr.getLength(), DiagnosticCode.All_symbols_within_a_with_block_will_be_resolved_to_any, null);
        }

        private resolveTryStatement(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            this.setSymbolForAST(ast, this.semanticInfoChain.voidTypeSymbol, context);

            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckTryStatement(ast, enclosingDecl, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckTryStatement(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);
            var tryStatement = <TryStatement>ast;

            this.resolveAST(tryStatement.tryBody, false, enclosingDecl, context);
            this.resolveAST(tryStatement.catchClause, false, enclosingDecl, context);
            this.resolveAST(tryStatement.finallyBody, false, enclosingDecl, context);
        }

        private resolveCatchClause(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            this.setSymbolForAST(ast, this.semanticInfoChain.voidTypeSymbol, context);

            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckCatchClause(ast, enclosingDecl, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckCatchClause(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);
            var catchDecl = this.getDeclForAST(ast);
            this.resolveAST((<CatchClause>ast).body, false, catchDecl, context);
            this.validateVariableDeclarationGroups(catchDecl, context);
        }

        private resolveReturnStatement(ast: AST, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            var parentDecl = enclosingDecl;
            var returnAST = <ReturnStatement>ast;
            var returnExpr = returnAST.returnExpression;

            var returnType = <PullTypeSymbol>this.getSymbolForAST(ast);
            var canTypeCheckAST = this.canTypeCheckAST(ast, context);
            if (!returnType || canTypeCheckAST) {
                while (parentDecl) {
                    if (parentDecl.kind & PullElementKind.SomeFunction) {
                        parentDecl.setFlag(PullElementFlags.HasReturnStatement);
                        break;
                    }

                    parentDecl = parentDecl.getParentDecl();
                }

                // push contextual type
                var inContextuallyTypedAssignment = false;
                var enclosingDeclAST: FunctionDeclaration;

                if (enclosingDecl.kind & PullElementKind.SomeFunction) {
                    enclosingDeclAST = <FunctionDeclaration>this.getASTForDecl(enclosingDecl);
                    if (enclosingDeclAST.returnTypeAnnotation) {
                        // The containing function has a type annotation, propagate it as the contextual type
                        var returnTypeAnnotationSymbol = this.resolveTypeReference(<TypeReference>enclosingDeclAST.returnTypeAnnotation, enclosingDecl, context);
                        if (returnTypeAnnotationSymbol) {
                            inContextuallyTypedAssignment = true;
                            context.pushContextualType(returnTypeAnnotationSymbol, context.inProvisionalResolution(), null);
                        }
                    }
                    else {
                        // No type annotation, check if there is a contextual type enforced on the function, and propagate that
                        var currentContextualType = context.getContextualType();
                        if (currentContextualType && currentContextualType.isFunction()) {
                            var currentContextualTypeSignatureSymbol = currentContextualType.getDeclarations()[0].getSignatureSymbol();
                            var currentContextualTypeReturnTypeSymbol = currentContextualTypeSignatureSymbol.returnType;
                            if (currentContextualTypeReturnTypeSymbol) {
                                inContextuallyTypedAssignment = true;
                                context.pushContextualType(currentContextualTypeReturnTypeSymbol, context.inProvisionalResolution(), null);
                            }
                        }
                    }
                }

                var resolvedReturnType = returnExpr ? this.resolveAST(returnExpr, inContextuallyTypedAssignment, enclosingDecl, context).type : this.semanticInfoChain.voidTypeSymbol;
                if (inContextuallyTypedAssignment) {
                    context.popContextualType();
                }

                if (!returnType) {
                    returnType = resolvedReturnType;
                    this.setSymbolForAST(ast, resolvedReturnType, context);
                }

                if (returnExpr && canTypeCheckAST) {
                    this.setTypeChecked(ast, context);
                    // Return type of constructor signature must be assignable to the instance type of the class.
                    if (parentDecl && parentDecl.kind === PullElementKind.ConstructorMethod) {
                        var classDecl = parentDecl.getParentDecl();
                        if (classDecl) {
                            var classSymbol = classDecl.getSymbol();
                            if (!classSymbol.isResolved) {
                                this.resolveDeclaredSymbol(classSymbol, classDecl, context);
                            }

                            var comparisonInfo = new TypeComparisonInfo();
                            var isAssignable = this.sourceIsAssignableToTarget(resolvedReturnType, classSymbol.type, context, comparisonInfo);
                            if (!isAssignable) {
                                context.postError(this.unitPath, returnExpr.minChar, returnExpr.getLength(), DiagnosticCode.Return_type_of_constructor_signature_must_be_assignable_to_the_instance_type_of_the_class, null);
                            }
                        }
                    }

                    if (enclosingDecl.kind === PullElementKind.SetAccessor) {
                        context.postError(this.unitPath, returnExpr.minChar, returnExpr.getLength(), DiagnosticCode.Setters_cannot_return_a_value, null);
                    }

                    if (enclosingDecl.kind & PullElementKind.SomeFunction) {
                        var enclosingDeclAST = <FunctionDeclaration>this.getASTForDecl(enclosingDecl);

                        if (enclosingDeclAST.returnTypeAnnotation) {
                            var signatureSymbol = enclosingDecl.getSignatureSymbol();
                            var sigReturnType = signatureSymbol.returnType;

                            if (resolvedReturnType && sigReturnType) {
                                var comparisonInfo = new TypeComparisonInfo();
                                var upperBound: PullTypeSymbol = null;

                                if (resolvedReturnType.isTypeParameter()) {
                                    upperBound = (<PullTypeParameterSymbol>resolvedReturnType).getConstraint();

                                    if (upperBound) {
                                        resolvedReturnType = upperBound;
                                    }
                                }

                                if (sigReturnType.isTypeParameter()) {
                                    upperBound = (<PullTypeParameterSymbol>sigReturnType).getConstraint();

                                    if (upperBound) {
                                        sigReturnType = upperBound;
                                    }
                                }

                                if (!resolvedReturnType.isResolved) {
                                    this.resolveDeclaredSymbol(resolvedReturnType, enclosingDecl, context);
                                }

                                if (!sigReturnType.isResolved) {
                                    this.resolveDeclaredSymbol(resolvedReturnType, enclosingDecl, context);
                                }

                                var isAssignable = this.sourceIsAssignableToTarget(resolvedReturnType, sigReturnType, context, comparisonInfo);

                                if (!isAssignable) {
                                    if (comparisonInfo.message) {
                                        context.postError(this.unitPath, returnExpr.minChar, returnExpr.getLength(), DiagnosticCode.Cannot_convert_0_to_1_NL_2, [resolvedReturnType.toString(), sigReturnType.toString(), comparisonInfo.message]);
                                    } else {
                                        context.postError(this.unitPath, returnExpr.minChar, returnExpr.getLength(), DiagnosticCode.Cannot_convert_0_to_1, [resolvedReturnType.toString(), sigReturnType.toString()]);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            return returnType;
        }
        
        private resolveSwitchStatement(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            this.setSymbolForAST(ast, this.semanticInfoChain.voidTypeSymbol, context);

            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckSwitchStatement(ast, enclosingDecl, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckSwitchStatement(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);

            var switchStatement = <SwitchStatement>ast;

            var expressionType = this.resolveAST(switchStatement.val, false, enclosingDecl, context).type;

            var jumpRecord = context.currentJumpRecord();
            var savedInSwitchStatement = jumpRecord.inSwitchStatement;
            jumpRecord.inSwitchStatement = true;

            this.resolveAST(switchStatement.caseList, false, enclosingDecl, context);
            this.resolveAST(switchStatement.defaultCase, false, enclosingDecl, context);

            jumpRecord.inSwitchStatement = savedInSwitchStatement;

            if (switchStatement.caseList && switchStatement.caseList.members) {
                for (var i = 0, n = switchStatement.caseList.members.length; i < n; i++) {
                    var caseClause = <CaseClause>switchStatement.caseList.members[i];
                    if (caseClause !== switchStatement.defaultCase) {
                        var caseClauseExpressionType = this.resolveAST(caseClause.expr, /*inContextuallyTypedAssignment:*/ false, enclosingDecl, context).type;

                        var comparisonInfo = new TypeComparisonInfo();
                        if (!this.sourceIsAssignableToTarget(expressionType, caseClauseExpressionType, context, comparisonInfo) &&
                            !this.sourceIsAssignableToTarget(caseClauseExpressionType, expressionType, context, comparisonInfo)) {
                            if (comparisonInfo.message) {
                                context.postError(this.unitPath, caseClause.expr.minChar, caseClause.expr.getLength(),
                                    DiagnosticCode.Cannot_convert_0_to_1_NL_2, [caseClauseExpressionType.toString(), expressionType.toString(), comparisonInfo.message]);
                            }
                            else {
                                context.postError(this.unitPath, caseClause.expr.minChar, caseClause.expr.getLength(),
                                    DiagnosticCode.Cannot_convert_0_to_1, [caseClauseExpressionType.toString(), expressionType.toString()]);
                            }
                        }
                    }
                }
            }
        }

        private resolveCaseClause(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            this.setSymbolForAST(ast, this.semanticInfoChain.voidTypeSymbol, context);

            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckCaseClause(ast, enclosingDecl, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckCaseClause(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);

            this.resolveAST((<CaseClause>ast).expr, false, enclosingDecl, context);
            this.resolveAST((<CaseClause>ast).body, false, enclosingDecl, context);
        }

        private resolveLabeledStatement(ast: LabeledStatement, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckLabeledStatement(ast, enclosingDecl, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckLabeledStatement(ast: LabeledStatement, enclosingDecl: PullDecl, context: PullTypeResolutionContext): void {
            this.setTypeChecked(ast, context);

            // Note that break/continue are treated differently.  ES5 says this about a break statement:
            // A program is considered syntactically incorrect if ...:
            //
            // The program contains a break statement with the optional Identifier, where Identifier 
            // does not appear in the label set of an enclosing (but not crossing function boundaries) 
            // **Statement.**
            // 
            // However, it says this about continue statements:
            //
            // The program contains a continue statement with the optional Identifier, where Identifier
            // does not appear in the label set of an enclosing (but not crossing function boundaries) 
            // **IterationStatement.**

            // In other words, you can 'break' to any enclosing statement.  But you can only 'continue'
            // to an enclosing *iteration* statement.
            var labelIdentifier = ast.identifier.text();
            var jumpRecord = context.currentJumpRecord();

            var breakableLabels = jumpRecord.breakableLabels;
            var continuableLabels = jumpRecord.continuableLabels;

            // It is invalid to have a label enclosed in a label of the same name.
            if (ArrayUtilities.contains(breakableLabels, labelIdentifier)) {
                context.postError(this.unitPath, ast.identifier.minChar, ast.identifier.getLength(),
                    DiagnosticCode.Duplicate_identifier_0, [labelIdentifier]);
            }

            breakableLabels.push(labelIdentifier);

            var isContinuableLabel = this.labelIsOnContinuableConstruct(ast.statement);
            if (isContinuableLabel) {
                continuableLabels.push(labelIdentifier);
            }

            this.resolveAST(ast.statement, /*inContextuallyTypedAssignment*/ false, enclosingDecl, context);

            breakableLabels.pop();

            if (isContinuableLabel) {
                continuableLabels.pop();
            }
        }

        private labelIsOnContinuableConstruct(statement: AST): boolean {
            switch (statement.nodeType()) {
                case NodeType.LabeledStatement:
                    // Labels work transitively.  i.e. if you have:
                    //      foo:
                    //      bar:
                    //      while(...)
                    //
                    // Then both 'foo' and 'bar' are in the label set for 'while' and are thus
                    // continuable.
                    return this.labelIsOnContinuableConstruct((<LabeledStatement>statement).statement);

                case NodeType.WhileStatement:
                case NodeType.ForStatement:
                case NodeType.ForInStatement:
                case NodeType.DoStatement:
                    return true;

                default:
                    return false;
            }
        }

        private resolveContinueStatement(ast: Jump, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckContinueStatement(ast, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckContinueStatement(ast: Jump, context: PullTypeResolutionContext): void {
            this.setTypeChecked(ast, context);

            var jumpRecord = context.currentJumpRecord();
            if (!jumpRecord.inIterationStatement) {
                context.postError(this.unitPath, ast.minChar, ast.getLength(),
                    DiagnosticCode.continue_statement_can_only_be_used_within_an_enclosing_iteration_statement);
            }
            else if (ast.target) {
                var continuableLabels = jumpRecord.continuableLabels;

                if (!ArrayUtilities.contains(continuableLabels, ast.target)) {
                    // The target of the continue statement wasn't to a reachable label.
                    //
                    // Let hte user know, with a specialized message if the target was to an
                    // unreachable label (as opposed to a non-existed label)
                    if (ArrayUtilities.any(context.jumpRecordStack, jr => ArrayUtilities.contains(jr.continuableLabels, ast.target))) {
                        context.postError(this.unitPath, ast.minChar, ast.getLength(),
                            DiagnosticCode.Jump_target_cannot_cross_function_boundary);
                    }
                    else {
                        context.postError(this.unitPath, ast.minChar, ast.getLength(),
                            DiagnosticCode.Jump_target_not_found);
                    }
                }
            }
        }

        private resolveBreakStatement(ast: Jump, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckBreakStatement(ast, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckBreakStatement(ast: Jump, context: PullTypeResolutionContext): void {
            this.setTypeChecked(ast, context);

            // Note: the order here is important.  If the 'break' has a target, then it can jump to
            // any enclosing laballed statment.  If it has no target, it must be in an iteration or
            // swtich statement.
            var jumpRecord = context.currentJumpRecord();
            if (ast.target) {
                var breakableLabels = jumpRecord.breakableLabels;

                if (!ArrayUtilities.contains(breakableLabels, ast.target)) {
                    // The target of the continue statement wasn't to a reachable label.
                    //
                    // Let hte user know, with a specialized message if the target was to an
                    // unreachable label (as opposed to a non-existed label)
                    if (ArrayUtilities.any(context.jumpRecordStack, jr => ArrayUtilities.contains(jr.breakableLabels, ast.target))) {
                        context.postError(this.unitPath, ast.minChar, ast.getLength(),
                            DiagnosticCode.Jump_target_cannot_cross_function_boundary);
                    }
                    else {
                        context.postError(this.unitPath, ast.minChar, ast.getLength(),
                            DiagnosticCode.Jump_target_not_found);
                    }
                }
            }
            else if (!jumpRecord.inIterationStatement && !jumpRecord.inSwitchStatement) {
                context.postError(this.unitPath, ast.minChar, ast.getLength(),
                    DiagnosticCode.break_statement_can_only_be_used_within_an_enclosing_iteration_or_switch_statement);
            }
        }

        // Expression resolution

        public resolveAST(ast: AST, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext, specializingSignature= false): PullSymbol {
            globalSemanticInfoChain = this.semanticInfoChain;

            if (globalBinder) {
                globalBinder.semanticInfoChain = this.semanticInfoChain;
            }

            if (!ast) {
                return;
            }

            var symbol = specializingSignature ? null : this.semanticInfoChain.getSymbolForAST(ast, this.unitPath);
            if (symbol && symbol.type && (symbol.isResolved /* || symbol.inResolution*/)) {
                this.typeCheckAST(ast, inContextuallyTypedAssignment, enclosingDecl, context);
                return symbol;
            }

            var nodeType = ast.nodeType();

            switch (nodeType) {
                case NodeType.List:
                    return this.resolveList(<ASTList>ast, enclosingDecl, context);

                case NodeType.Script:
                    return null;

                case NodeType.ModuleDeclaration:
                    return this.resolveModuleDeclaration(<ModuleDeclaration>ast, context);

                case NodeType.InterfaceDeclaration:
                    return this.resolveInterfaceDeclaration(<TypeDeclaration>ast, context);

                case NodeType.ClassDeclaration:
                    return this.resolveClassDeclaration(<ClassDeclaration>ast, context);

                case NodeType.VariableDeclaration:
                    return this.resolveVariableDeclarationList(ast, enclosingDecl, context);

                case NodeType.VariableDeclarator:
                case NodeType.Parameter:
                    return this.resolveVariableDeclaration(<BoundDecl>ast, context, enclosingDecl);

                case NodeType.TypeParameter:
                    return this.resolveTypeParameterDeclaration(<TypeParameter>ast, context);

                case NodeType.ImportDeclaration:
                    return this.resolveImportDeclaration(<ImportDeclaration>ast, context);

                case NodeType.ObjectLiteralExpression:
                    return this.resolveObjectLiteralExpression(ast, inContextuallyTypedAssignment, enclosingDecl, context);

                case NodeType.GenericType:
                    return this.resolveGenericTypeReference(<GenericType>ast, enclosingDecl, context);

                case NodeType.Name:
                    if (context.resolvingTypeReference) {
                        return this.resolveTypeNameExpression(<Identifier>ast, enclosingDecl, context);
                    }
                    else {
                        return this.resolveNameExpression(<Identifier>ast, enclosingDecl, context);
                    }

                case NodeType.MemberAccessExpression:
                    if (context.resolvingTypeReference) {
                        return this.resolveDottedTypeNameExpression(<BinaryExpression>ast, enclosingDecl, context);
                    }
                    else {
                        return this.resolveDottedNameExpression(<BinaryExpression>ast, enclosingDecl, context);
                    }

                case NodeType.FunctionDeclaration:
                    return this.resolveAnyFunctionDeclaration(<FunctionDeclaration>ast, inContextuallyTypedAssignment, enclosingDecl, context);

                case NodeType.ArrayLiteralExpression:
                    return this.resolveArrayLiteralExpression(<UnaryExpression>ast, inContextuallyTypedAssignment, enclosingDecl, context);

                case NodeType.ThisExpression:
                    return this.resolveThisExpression(ast, enclosingDecl, context);

                case NodeType.SuperExpression:
                    return this.resolveSuperExpression(ast, enclosingDecl, context);

                case NodeType.InvocationExpression:
                    return this.resolveInvocationExpression(<InvocationExpression>ast, inContextuallyTypedAssignment, enclosingDecl, context);

                case NodeType.ObjectCreationExpression:
                    return this.resolveObjectCreationExpression(<ObjectCreationExpression>ast, inContextuallyTypedAssignment, enclosingDecl, context);

                case NodeType.CastExpression:
                    return this.resolveTypeAssertionExpression(<UnaryExpression>ast, enclosingDecl, context);

                case NodeType.TypeRef:
                    return this.resolveTypeReference(<TypeReference>ast, enclosingDecl, context);

                case NodeType.ExportAssignment:
                    return this.resolveExportAssignmentStatement(<ExportAssignment>ast, enclosingDecl, context);

                // primitives
                case NodeType.NumericLiteral:
                    return this.semanticInfoChain.numberTypeSymbol;
                case NodeType.StringLiteral:
                    return this.semanticInfoChain.stringTypeSymbol;
                case NodeType.NullLiteral:
                    return this.semanticInfoChain.nullTypeSymbol;
                case NodeType.TrueLiteral:
                case NodeType.FalseLiteral:
                    return this.semanticInfoChain.booleanTypeSymbol;

                case NodeType.VoidExpression:
                    return this.resolveVoidExpression(<UnaryExpression>ast, enclosingDecl, context);

                // assignment
                case NodeType.AssignmentExpression:
                    return this.resolveAssignmentStatement(<BinaryExpression>ast, enclosingDecl, context);

                // boolean operations
                case NodeType.LogicalNotExpression:
                    return this.resolveUnaryLogicalOperation(<UnaryExpression>ast, enclosingDecl, context);

                case NodeType.NotEqualsWithTypeConversionExpression:
                case NodeType.EqualsWithTypeConversionExpression:
                case NodeType.EqualsExpression:
                case NodeType.NotEqualsExpression:
                case NodeType.LessThanExpression:
                case NodeType.LessThanOrEqualExpression:
                case NodeType.GreaterThanOrEqualExpression:
                case NodeType.GreaterThanExpression:
                    // PERFREVIEW   
                    return this.resolveLogicalOperation(ast, enclosingDecl, context);
                //return this.semanticInfoChain.booleanTypeSymbol;

                case NodeType.AddExpression:
                case NodeType.AddAssignmentExpression:
                    return this.resolveBinaryAdditionOperation(<BinaryExpression>ast, enclosingDecl, context);

                case NodeType.PlusExpression:
                case NodeType.NegateExpression:
                case NodeType.BitwiseNotExpression:
                case NodeType.PostIncrementExpression:
                case NodeType.PreIncrementExpression:
                case NodeType.PostDecrementExpression:
                case NodeType.PreDecrementExpression:
                    return this.resolveUnaryArithmeticOperation(<UnaryExpression>ast, enclosingDecl, context);

                case NodeType.SubtractExpression:
                case NodeType.MultiplyExpression:
                case NodeType.DivideExpression:
                case NodeType.ModuloExpression:
                case NodeType.BitwiseOrExpression:
                case NodeType.BitwiseAndExpression:
                case NodeType.LeftShiftExpression:
                case NodeType.SignedRightShiftExpression:
                case NodeType.UnsignedRightShiftExpression:
                case NodeType.BitwiseExclusiveOrExpression:
                case NodeType.ExclusiveOrAssignmentExpression:
                case NodeType.LeftShiftAssignmentExpression:
                case NodeType.SignedRightShiftAssignmentExpression:
                case NodeType.UnsignedRightShiftAssignmentExpression:
                case NodeType.SubtractAssignmentExpression:
                case NodeType.MultiplyAssignmentExpression:
                case NodeType.DivideAssignmentExpression:
                case NodeType.ModuloAssignmentExpression:
                case NodeType.OrAssignmentExpression:
                case NodeType.AndAssignmentExpression:
                    return this.resolveBinaryArithmeticExpression(<BinaryExpression>ast, enclosingDecl, context);

                case NodeType.ElementAccessExpression:
                    return this.resolveIndexExpression(<BinaryExpression>ast, inContextuallyTypedAssignment, enclosingDecl, context);

                case NodeType.LogicalOrExpression:
                    return this.resolveLogicalOrExpression(<BinaryExpression>ast, inContextuallyTypedAssignment, enclosingDecl, context);

                case NodeType.LogicalAndExpression:
                    return this.resolveLogicalAndExpression(<BinaryExpression>ast, inContextuallyTypedAssignment, enclosingDecl, context);

                case NodeType.TypeOfExpression:
                    return this.resolveTypeOfExpression(<UnaryExpression>ast, enclosingDecl, context);

                case NodeType.ThrowStatement:
                    return this.resolveThrowStatement(<ThrowStatement>ast, enclosingDecl, context);

                case NodeType.DeleteExpression:
                    return this.resolveDeleteExpression(<UnaryExpression>ast, enclosingDecl, context);

                case NodeType.ConditionalExpression:
                    return this.resolveConditionalExpression(<ConditionalExpression>ast, enclosingDecl, context);

                case NodeType.RegularExpressionLiteral:
                    return this.resolveRegularExpressionLiteral();

                case NodeType.ParenthesizedExpression:
                    return this.resolveParenthesizedExpression(<ParenthesizedExpression>ast, enclosingDecl, context);

                case NodeType.ExpressionStatement:
                    return this.resolveExpressionStatement(<ExpressionStatement>ast, inContextuallyTypedAssignment, enclosingDecl, context);

                case NodeType.InstanceOfExpression:
                    return this.resolveInstanceOfExpression(ast, enclosingDecl, context);

                case NodeType.CommaExpression:
                    return this.resolveCommaExpression(ast, enclosingDecl, context);

                case NodeType.InExpression:
                    return this.resolveInExpression(ast, enclosingDecl, context);

                case NodeType.ForStatement:
                    return this.resolveForStatement(ast, enclosingDecl, context);

                case NodeType.ForInStatement:
                    return this.resolveForInStatement(ast, enclosingDecl, context);

                case NodeType.WhileStatement:
                    return this.resolveWhileStatement(ast, enclosingDecl, context);

                case NodeType.DoStatement:
                    return this.resolveDoStatement(ast, enclosingDecl, context);

                case NodeType.IfStatement:
                    return this.resolveIfStatement(ast, enclosingDecl, context);

                case NodeType.Block:
                    return this.resolveBlock(ast, enclosingDecl, context);

                case NodeType.VariableStatement:
                    return this.resolveVariableStatement(ast, enclosingDecl, context);

                case NodeType.WithStatement:
                    return this.resolveWithStatement(ast, enclosingDecl, context);

                case NodeType.TryStatement:
                    return this.resolveTryStatement(ast, enclosingDecl, context);

                case NodeType.CatchClause:
                    return this.resolveCatchClause(ast, enclosingDecl, context);

                case NodeType.ReturnStatement:
                    return this.resolveReturnStatement(ast, inContextuallyTypedAssignment, enclosingDecl, context);

                case NodeType.SwitchStatement:
                    return this.resolveSwitchStatement(ast, enclosingDecl, context);

                case NodeType.ContinueStatement:
                    return this.resolveContinueStatement(<Jump>ast, context);

                case NodeType.BreakStatement:
                    return this.resolveBreakStatement(<Jump>ast, context);

                case NodeType.CaseClause:
                    return this.resolveCaseClause(ast, enclosingDecl, context);

                case NodeType.LabeledStatement:
                    return this.resolveLabeledStatement(<LabeledStatement>ast, enclosingDecl, context);
            }

            return this.semanticInfoChain.anyTypeSymbol;
        }

        private typeCheckAST(ast: AST, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            if (!this.canTypeCheckAST(ast, context)) {
                return;
            }

            var nodeType = ast.nodeType();
            switch (nodeType) {
                case NodeType.Script:
                    return;

                case NodeType.ModuleDeclaration:
                    this.typeCheckModuleDeclaration(<ModuleDeclaration>ast, context);
                    return;

                case NodeType.InterfaceDeclaration:
                    this.typeCheckInterfaceDeclaration(<TypeDeclaration>ast, context);
                    return;

                case NodeType.ClassDeclaration:
                    this.typeCheckClassDeclaration(<ClassDeclaration>ast, context);
                    return;

                case NodeType.VariableDeclarator:
                case NodeType.Parameter:
                    this.typeCheckVariableDeclaration(<BoundDecl>ast, context, enclosingDecl);
                    return;

                case NodeType.TypeParameter:
                    this.typeCheckTypeParameterDeclaration(<TypeParameter>ast, context);
                    return;

                case NodeType.ImportDeclaration:
                    this.typeCheckImportDeclaration(<ImportDeclaration>ast, context);
                    return;

                case NodeType.ObjectLiteralExpression:
                    this.resolveObjectLiteralExpression(ast, inContextuallyTypedAssignment, enclosingDecl, context);
                    return;

                case NodeType.GenericType:
                    // No need to typecheck separately just do resolution again
                    this.resolveGenericTypeReference(<GenericType>ast, enclosingDecl, context);
                    return;

                case NodeType.Name:
                    if (context.resolvingTypeReference) {
                        this.resolveTypeNameExpression(<Identifier>ast, enclosingDecl, context);
                    }
                    else {
                        this.resolveNameExpression(<Identifier>ast, enclosingDecl, context);
                    }
                    return;

                case NodeType.MemberAccessExpression:
                    if (context.resolvingTypeReference) {
                        this.resolveDottedTypeNameExpression(<BinaryExpression>ast, enclosingDecl, context);
                    }
                    else {
                        this.resolveDottedNameExpression(<BinaryExpression>ast, enclosingDecl, context);
                    }
                    return;

                case NodeType.FunctionDeclaration:
                    {
                        var funcDecl = <FunctionDeclaration>ast;
                        if (funcDecl.isGetAccessor()) {
                            this.typeCheckGetAccessorDeclaration(funcDecl, context);
                        }
                        else if (funcDecl.isSetAccessor()) {
                            this.typeCheckSetAccessorDeclaration(funcDecl, context);
                        }
                        else if (inContextuallyTypedAssignment ||
                            (funcDecl.getFunctionFlags() & FunctionFlags.IsFunctionExpression) ||
                            (funcDecl.getFunctionFlags() & FunctionFlags.IsFatArrowFunction) ||
                            (funcDecl.getFunctionFlags() & FunctionFlags.IsFunctionProperty)) {
                            this.typeCheckFunctionExpression(funcDecl, context);
                        }
                        else {
                            this.typeCheckFunctionDeclaration(funcDecl, context);
                        }
                        return;
                    }

                case NodeType.ArrayLiteralExpression:
                    this.resolveArrayLiteralExpression(<UnaryExpression>ast, inContextuallyTypedAssignment, enclosingDecl, context);
                    return;

                case NodeType.ThisExpression:
                    /* follow same as resolving */
                    this.resolveThisExpression(ast, enclosingDecl, context);
                    return;

                case NodeType.SuperExpression:
                    this.typeCheckSuperExpression(ast, enclosingDecl, context);
                    return;

                case NodeType.InvocationExpression:
                    this.typeCheckInvocationExpression(<InvocationExpression>ast, inContextuallyTypedAssignment, enclosingDecl, context);
                    return;

                case NodeType.ObjectCreationExpression:
                    this.typeCheckObjectCreationExpression(<ObjectCreationExpression>ast, inContextuallyTypedAssignment, enclosingDecl, context);
                    return;

                case NodeType.CastExpression:
                    /* resolveTypeAssertionExpression will take care of correctly walking and resolving/typeChecking actions */
                    this.resolveTypeAssertionExpression(<UnaryExpression>ast, enclosingDecl, context);
                    return;

                case NodeType.TypeRef:
                    this.resolveTypeReference(<TypeReference>ast, enclosingDecl, context);
                    return;

                case NodeType.VoidExpression:
                    this.typeCheckVoidExpression(<UnaryExpression>ast, enclosingDecl, context);
                    return;

                // boolean operations
                case NodeType.LogicalNotExpression:
                    this.typeCheckUnaryLogicalOperation(<UnaryExpression>ast, enclosingDecl, context);
                    return;

                case NodeType.NotEqualsWithTypeConversionExpression:
                case NodeType.EqualsWithTypeConversionExpression:
                case NodeType.EqualsExpression:
                case NodeType.NotEqualsExpression:
                case NodeType.LessThanExpression:
                case NodeType.LessThanOrEqualExpression:
                case NodeType.GreaterThanOrEqualExpression:
                case NodeType.GreaterThanExpression:
                    this.typeCheckLogicalOperation(ast, enclosingDecl, context);
                    return;

                case NodeType.PlusExpression:
                case NodeType.NegateExpression:
                case NodeType.BitwiseNotExpression:
                case NodeType.PostIncrementExpression:
                case NodeType.PreIncrementExpression:
                case NodeType.PostDecrementExpression:
                case NodeType.PreDecrementExpression:
                    this.typeCheckUnaryArithmeticOperation(<UnaryExpression>ast, enclosingDecl, context);
                    return;

                case NodeType.SubtractExpression:
                case NodeType.MultiplyExpression:
                case NodeType.DivideExpression:
                case NodeType.ModuloExpression:
                case NodeType.BitwiseOrExpression:
                case NodeType.BitwiseAndExpression:
                case NodeType.LeftShiftExpression:
                case NodeType.SignedRightShiftExpression:
                case NodeType.UnsignedRightShiftExpression:
                case NodeType.BitwiseExclusiveOrExpression:
                case NodeType.ExclusiveOrAssignmentExpression:
                case NodeType.LeftShiftAssignmentExpression:
                case NodeType.SignedRightShiftAssignmentExpression:
                case NodeType.UnsignedRightShiftAssignmentExpression:
                case NodeType.SubtractAssignmentExpression:
                case NodeType.MultiplyAssignmentExpression:
                case NodeType.DivideAssignmentExpression:
                case NodeType.ModuloAssignmentExpression:
                case NodeType.OrAssignmentExpression:
                case NodeType.AndAssignmentExpression:
                    this.typeCheckBinaryArithmeticExpression(<BinaryExpression>ast, enclosingDecl, context);
                    return;

                case NodeType.ElementAccessExpression:
                    this.typeCheckIndexExpression(<BinaryExpression>ast, inContextuallyTypedAssignment, enclosingDecl, context);
                    return;

                case NodeType.LogicalOrExpression:
                    this.typeCheckLogicalOrExpression(<BinaryExpression>ast, inContextuallyTypedAssignment, enclosingDecl, context);
                    return;

                case NodeType.TypeOfExpression:
                    this.typeCheckTypeOfExpression(<UnaryExpression>ast, enclosingDecl, context);
                    return;

                case NodeType.ThrowStatement:
                    this.typeCheckThrowStatement(<ThrowStatement>ast, enclosingDecl, context);
                    return;

                case NodeType.DeleteExpression:
                    this.typeCheckDeleteExpression(<UnaryExpression>ast, enclosingDecl, context);
                    return;

                case NodeType.ConditionalExpression:
                    this.typeCheckConditionalExpression(<ConditionalExpression>ast, enclosingDecl, context);
                    return;

                case NodeType.InstanceOfExpression:
                    this.typeCheckInstanceOfExpression(ast, enclosingDecl, context);
                    return;

                case NodeType.CommaExpression:
                    this.typeCheckCommaExpression(ast, enclosingDecl, context);
                    return;

                case NodeType.InExpression:
                    this.typeCheckInExpression(ast, enclosingDecl, context);
                    return;

                case NodeType.ForStatement:
                    this.typeCheckForStatement(ast, enclosingDecl, context);
                    return;

                case NodeType.ForInStatement:
                    this.typeCheckForInStatement(ast, enclosingDecl, context);
                    return;

                case NodeType.WhileStatement:
                    this.typeCheckWhileStatement(ast, enclosingDecl, context);
                    return;

                case NodeType.DoStatement:
                    this.typeCheckDoStatement(ast, enclosingDecl, context);
                    return;

                case NodeType.IfStatement:
                    this.typeCheckIfStatement(ast, enclosingDecl, context);
                    return;

                case NodeType.WithStatement:
                    this.typeCheckWithStatement(ast, enclosingDecl, context);
                    return;

                case NodeType.TryStatement:
                    this.typeCheckTryStatement(ast, enclosingDecl, context);
                    return;

                case NodeType.CatchClause:
                    this.typeCheckCatchClause(ast, enclosingDecl, context);
                    return;

                case NodeType.ReturnStatement:
                    // Since we want to resolve the return expression to traverse parents, resolve will take care of typeChecking
                    this.resolveReturnStatement(ast, inContextuallyTypedAssignment, enclosingDecl, context);
                    return;

                case NodeType.SwitchStatement:
                    this.typeCheckSwitchStatement(ast, enclosingDecl, context);
                    return;

                case NodeType.CaseClause:
                    this.typeCheckCaseClause(ast, enclosingDecl, context);
                    return;

                // Below ones should never reach because we never cache these symbols

                //case NodeType.List:
                //case NodeType.VariableDeclaration:
                //case NodeType.Block:
                //case NodeType.VariableStatement:
                //case NodeType.NumericLiteral:
                //case NodeType.StringLiteral:
                //case NodeType.NullLiteral:
                //case NodeType.TrueLiteral:
                //case NodeType.FalseLiteral:
                //case NodeType.LabeledStatement: 
                //case NodeType.ParenthesizedExpression:
                //case NodeType.ExpressionStatement:
                //case NodeType.LogicalAndExpression:
                //case NodeType.RegularExpressionLiteral:
                //case NodeType.AddExpression:
                //case NodeType.AddAssignmentExpression:
                //case NodeType.AssignmentExpression:
                //case NodeType.ExportAssignment:

                default:
                    Debug.assert(false, "Implement typeCheck clause if symbol is cached");
            }
        }

        public processPostTypeCheckWorkItems(context: PullTypeResolutionContext) {
            while (PullTypeResolver.postTypeCheckWorkitems.length) {
                var workItem = PullTypeResolver.postTypeCheckWorkitems.pop();
                this.postTypeCheck(workItem.ast, workItem.enclosingDecl, context);
            }
        }

        private postTypeCheck(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            var nodeType = ast.nodeType();

            switch (nodeType) {
                case NodeType.Parameter:
                case NodeType.VariableDeclarator:
                    this.postTypeCheckVariableDeclaration(<BoundDecl>ast, enclosingDecl, context);
                    return;

                case NodeType.ClassDeclaration:
                    this.postTypeCheckClassDeclaration(<ClassDeclaration>ast, enclosingDecl, context);
                    return;

                case NodeType.Name:
                    this.postTypeCheckNameExpression(<Identifier>ast, enclosingDecl, context);
                    return;

                default:
                    Debug.assert(false, "Implement postTypeCheck clause to handle the postTypeCheck work");
            }
        }

        private resolveRegularExpressionLiteral(): PullTypeSymbol {
            if (this.cachedRegExpInterfaceType()) {
                return this.cachedRegExpInterfaceType();
            }
            else {
                return this.semanticInfoChain.anyTypeSymbol;
            }
        }

        private isNameOrMemberAccessExpression(ast: AST): boolean {

            var checkAST = ast;

            while (checkAST) {
                if (checkAST.nodeType() === NodeType.ExpressionStatement) {
                    checkAST = (<ExpressionStatement>checkAST).expression;
                }
                else if (checkAST.nodeType() === NodeType.ParenthesizedExpression) {
                    checkAST = (<ParenthesizedExpression>checkAST).expression;
                }
                else if (checkAST.nodeType() === NodeType.Name) {
                    return true;
                }
                else if (checkAST.nodeType() === NodeType.MemberAccessExpression) {
                    return true;
                }
                else {
                    return false;
                }
            }
        }

        private resolveNameSymbol(nameSymbol: PullSymbol, context: PullTypeResolutionContext) {
            if (nameSymbol &&
                !context.canUseTypeSymbol &&
                nameSymbol != this.semanticInfoChain.undefinedTypeSymbol &&
                nameSymbol != this.semanticInfoChain.nullTypeSymbol &&
                (nameSymbol.isPrimitive() || !(nameSymbol.kind & TypeScript.PullElementKind.SomeValue))) {
                var valueSymbol = nameSymbol.isAlias() ? (<PullTypeAliasSymbol>nameSymbol).getExportAssignedValueSymbol() : null;
                if (valueSymbol) {
                    nameSymbol = valueSymbol;
                } else {
                    nameSymbol = null;
                }
            }

            return nameSymbol;
        }

        private postTypeCheckNameExpression(nameAST: Identifier, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.checkThisCaptureVariableCollides(nameAST, false, enclosingDecl, context);
        }

        private typeCheckNameExpression(nameAST: Identifier, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(nameAST, context);
            this.checkNameForCompilerGeneratedDeclarationCollision(nameAST, /*isDeclaration*/ false, nameAST, enclosingDecl, context); 
        }

        public resolveNameExpression(nameAST: Identifier, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            var nameSymbol = this.getSymbolForAST(nameAST);
            var foundCached = nameSymbol != null;

            if (!foundCached || this.canTypeCheckAST(nameAST, context)) {
                if (this.canTypeCheckAST(nameAST, context)) {
                    this.typeCheckNameExpression(nameAST, enclosingDecl, context);
                }
                nameSymbol = this.computeNameExpression(nameAST, enclosingDecl, context);
            }

            if (!nameSymbol.isResolved) {
                this.resolveDeclaredSymbol(nameSymbol, enclosingDecl, context);
            }

            // We don't want to capture an intermediate 'any' from a recursive resolution
            if (nameSymbol &&
                (nameSymbol.type != this.semanticInfoChain.anyTypeSymbol ||
                nameSymbol.hasFlag(PullElementFlags.IsAnnotatedWithAny | PullElementFlags.Exported))/*&& !nameSymbol.inResolution*/) {
                this.setSymbolForAST(nameAST, nameSymbol, context);
            }

            return nameSymbol;
        }

        private computeNameExpression(nameAST: Identifier, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            if (nameAST.isMissing()) {
                return this.semanticInfoChain.anyTypeSymbol;
            }

            var id = nameAST.text();

            var declPath: PullDecl[] = enclosingDecl !== null ? getPathToDecl(enclosingDecl) : <PullDecl[]>[];

            if (enclosingDecl && !declPath.length) {
                declPath = [enclosingDecl];
            }

            var aliasSymbol: PullTypeAliasSymbol = null;
            var nameSymbol = this.getSymbolFromDeclPath(id, declPath, PullElementKind.SomeValue);

            if (!nameSymbol && id === "arguments" && enclosingDecl && (enclosingDecl.kind & PullElementKind.SomeFunction)) {
                nameSymbol = this.cachedFunctionArgumentsSymbol;

                if (this.cachedIArgumentsInterfaceType() && !this.cachedIArgumentsInterfaceType().isResolved) {
                    this.resolveDeclaredSymbol(this.cachedIArgumentsInterfaceType(), enclosingDecl, context);
                }
            }

            // Try looking up a type alias with an associated instance type
            if (!nameSymbol) {
                nameSymbol = this.getSymbolFromDeclPath(id, declPath, PullElementKind.TypeAlias);

                // Modules are also picked up when searching for aliases
                if (nameSymbol && !nameSymbol.isAlias()) {
                    nameSymbol = null;
                }
            }

            if (!nameSymbol) {
                if (context.resolvingTypeNameAsNameExpression) {
                    return null;
                } else {
                    context.postError(this.unitPath, nameAST.minChar, nameAST.getLength(), DiagnosticCode.Could_not_find_symbol_0, [nameAST.actualText]);
                    return this.getNewErrorTypeSymbol(id);
                }
            }

            // Make sure that if we found the symbol in a function's scope, it is a parameter to the left of us
            var nameParentDecl = nameSymbol.getDeclarations()[0].getParentDecl();
            if (nameParentDecl &&
                (nameParentDecl.kind & PullElementKind.SomeFunction) &&
                (nameParentDecl.flags & PullElementFlags.HasDefaultArgs)) {
                // Get the AST and look it up in the parameter index context to find which parameter we are in
                var enclosingFunctionAST = <FunctionDeclaration>this.semanticInfoChain.getASTForDecl(nameParentDecl);
                var currentParameterIndex = context.getCurrentParameterIndexForFunction(enclosingFunctionAST);

                // Short circuit if we are located in the function body, since all child decls of the function are accessible there
                if (currentParameterIndex >= 0) {
                    // Search the enclosing function AST for a parameter with the right name, but stop once we hit our current context
                    var foundMatchingParameter = false;
                    if (enclosingFunctionAST.arguments) {
                        for (var i = 0; i <= currentParameterIndex; i++) {
                            var candidateParameter = <Parameter>enclosingFunctionAST.arguments.members[i];
                            if (candidateParameter && candidateParameter.id.text() === id) {
                                foundMatchingParameter = true;
                            }
                        }
                    }
                    if (!foundMatchingParameter) {
                        // We didn't find a matching parameter to the left, so error
                        context.postError(this.unitPath, nameAST.minChar, nameAST.getLength(),
                            DiagnosticCode.Initializer_of_parameter_0_cannot_reference_identifier_1_declared_after_it,
                            [(<Parameter>enclosingFunctionAST.arguments.members[currentParameterIndex]).id.actualText, nameAST.actualText]);
                        return this.getNewErrorTypeSymbol(id);
                    }
                }
            }

            if (nameSymbol.isType() && nameSymbol.isAlias()) {
                aliasSymbol = <PullTypeAliasSymbol>nameSymbol;
                if (!context.resolvingTypeQueryExpression) {
                    aliasSymbol.isUsedAsValue = true;
                }

                if (!nameSymbol.isResolved) {
                    this.resolveDeclaredSymbol(nameSymbol, enclosingDecl, context);
                }

                if (aliasSymbol.assignedValue) {
                    if (!aliasSymbol.assignedValue.isResolved) {
                        this.resolveDeclaredSymbol(aliasSymbol.assignedValue, enclosingDecl, context);
                    }
                } else if (aliasSymbol.assignedContainer && !aliasSymbol.assignedContainer.isResolved) {
                    this.resolveDeclaredSymbol(aliasSymbol.assignedContainer, enclosingDecl, context);
                }

                var exportAssignmentSymbol = (<PullTypeAliasSymbol>nameSymbol).getExportAssignedValueSymbol();

                if (exportAssignmentSymbol) {
                    nameSymbol = exportAssignmentSymbol;
                }
                else {
                    aliasSymbol = null;
                }
            }

            if (aliasSymbol) {
                this.currentUnit.setAliasSymbolForAST(nameAST, aliasSymbol);
            }

            return nameSymbol;
        }

        public resolveDottedNameExpression(dottedNameAST: BinaryExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            var symbol = this.getSymbolForAST(dottedNameAST);
            var foundCached = symbol != null;

            if (!foundCached || this.canTypeCheckAST(dottedNameAST, context)) {
                var canTypeCheckDottedNameAST = this.canTypeCheckAST(dottedNameAST, context);
                if (canTypeCheckDottedNameAST) {
                    this.setTypeChecked(dottedNameAST, context);
                }
                symbol = this.computeDottedNameExpressionSymbol(dottedNameAST, enclosingDecl, context, canTypeCheckDottedNameAST);
            }

            if (symbol && !symbol.isResolved) {
                this.resolveDeclaredSymbol(symbol, enclosingDecl, context);
            }

            if (symbol &&
                (symbol.type != this.semanticInfoChain.anyTypeSymbol ||
                symbol.hasFlag(PullElementFlags.IsAnnotatedWithAny | PullElementFlags.Exported))/*&& !symbol.inResolution*/) {
                this.setSymbolForAST(dottedNameAST, symbol, context);
                this.setSymbolForAST(dottedNameAST.operand2, symbol, context);
            }

            return symbol;
        }

        public isPrototypeMember(dottedNameAST: BinaryExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext): boolean {
            var rhsName = (<Identifier>dottedNameAST.operand2).text();
            if (rhsName === "prototype") {
                var prevCanUseTypeSymbol = context.canUseTypeSymbol;
                context.canUseTypeSymbol = true;
                var lhsType = this.resolveAST(dottedNameAST.operand1, /*inContextuallyTypedAssignment*/false, enclosingDecl, context).type;
                context.canUseTypeSymbol = prevCanUseTypeSymbol;

                if (lhsType) {
                    if (lhsType.isClass() || lhsType.isConstructor()) {
                        return true;
                    }
                    else {
                        var classInstanceType = lhsType.getAssociatedContainerType();

                        if (classInstanceType && classInstanceType.isClass()) {
                            return true;
                        }
                    }
                }
            }

            return false;
        }

        private computeDottedNameExpressionSymbol(dottedNameAST: BinaryExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext, checkSuperPrivateAndStaticAccess: boolean): PullSymbol {
            if ((<Identifier>dottedNameAST.operand2).isMissing()) {
                return this.semanticInfoChain.anyTypeSymbol;
            }

            // assemble the dotted name path
            var rhsName = (<Identifier>dottedNameAST.operand2).text();
            var prevCanUseTypeSymbol = context.canUseTypeSymbol;
            context.canUseTypeSymbol = true;
            var lhs = this.resolveAST(dottedNameAST.operand1, /*inContextuallyTypedAssignment*/false, enclosingDecl, context);
            context.canUseTypeSymbol = prevCanUseTypeSymbol;
            var lhsType = lhs.type;

            if (lhs.isAlias()) {
                if (!context.resolvingTypeQueryExpression) {
                    (<PullTypeAliasSymbol>lhs).isUsedAsValue = true;
                }
                lhsType = (<PullTypeAliasSymbol>lhs).getExportAssignedTypeSymbol();
            }

            if (this.isAnyOrEquivalent(lhsType)) {
                return lhsType;
            }

            // this could happen if a module exports an import statement
            if (lhsType.isAlias()) {
                lhsType = (<PullTypeAliasSymbol>lhsType).getExportAssignedTypeSymbol();
            }

            if (!lhsType) {
                context.postError(this.unitPath, dottedNameAST.operand2.minChar, dottedNameAST.operand2.getLength(), DiagnosticCode.Could_not_find_enclosing_symbol_for_dotted_name_0, [(<Identifier>dottedNameAST.operand2).actualText]);
                return this.getNewErrorTypeSymbol();
            }

            if (!lhsType.isResolved) {
                var potentiallySpecializedType = <PullTypeSymbol>this.resolveDeclaredSymbol(lhsType, enclosingDecl, context);

                if (potentiallySpecializedType != lhsType) {
                    if (!lhs.isType()) {
                        context.setTypeInContext(lhs, potentiallySpecializedType);
                    }

                    lhsType = potentiallySpecializedType;
                }
            }

            if (lhsType.isContainer() && !lhsType.isAlias() && !lhsType.isEnum()) {
                // we're searching in the value space, so we should try to use the
                // instance value type
                var instanceSymbol = (<PullContainerSymbol>lhsType).getInstanceSymbol();

                if (instanceSymbol) {
                    lhsType = instanceSymbol.type;
                }
            }

            if (this.isPrototypeMember(dottedNameAST, enclosingDecl, context)) {
                if (lhsType.isClass()) {
                    this.checkForStaticMemberAccess(dottedNameAST, lhsType, lhsType, enclosingDecl, context);

                    if (lhsType.isGeneric()) {
                        return this.specializeTypeToAny(lhsType, enclosingDecl, context);
                    }

                    return lhsType;
                }
                else {

                    var instanceType = lhsType.getAssociatedContainerType();

                    if (instanceType) {
                        if (instanceType.isGeneric()) {
                            instanceType = this.specializeTypeToAny(instanceType, enclosingDecl, context);
                        }
                    }
                    else {
                        instanceType = lhsType;
                    }

                    if (instanceType && instanceType.isClass()) {
                        this.checkForStaticMemberAccess(dottedNameAST, lhsType, instanceType, enclosingDecl, context);

                        return instanceType;
                    }
                }
            }

            // If the type parameter has a constraint, we'll need to sub it in
            if (lhsType.isTypeParameter()) {
                lhsType = this.substituteUpperBoundForType(lhsType);
            }

            if ((lhsType === this.semanticInfoChain.numberTypeSymbol || lhsType.isEnum()) && this.cachedNumberInterfaceType()) {
                lhsType = this.cachedNumberInterfaceType();
            }
            else if (lhsType === this.semanticInfoChain.stringTypeSymbol && this.cachedStringInterfaceType()) {
                lhsType = this.cachedStringInterfaceType();
            }
            else if (lhsType === this.semanticInfoChain.booleanTypeSymbol && this.cachedBooleanInterfaceType()) {
                lhsType = this.cachedBooleanInterfaceType();
            }

            // now for the name...
            var nameSymbol = this.getMemberSymbol(rhsName, PullElementKind.SomeValue, lhsType);
            nameSymbol = this.resolveNameSymbol(nameSymbol, context);

            if (!nameSymbol) {
                // could be a function symbol
                if ((lhsType.getCallSignatures().length || lhsType.getConstructSignatures().length) && this.cachedFunctionInterfaceType()) {
                    nameSymbol = this.getMemberSymbol(rhsName, PullElementKind.SomeValue, this.cachedFunctionInterfaceType());
                }
                else if (lhsType.kind === PullElementKind.DynamicModule) {
                    var container = <PullContainerSymbol>lhsType;
                    var associatedInstance = container.getInstanceSymbol();

                    if (associatedInstance) {
                        var instanceType = associatedInstance.type;

                        nameSymbol = this.getMemberSymbol(rhsName, PullElementKind.SomeValue, instanceType);
                    }
                }
                // could be a module instance
                else {
                    var associatedType = lhsType.getAssociatedContainerType();

                    if (associatedType && !associatedType.isClass()) {
                        nameSymbol = this.getMemberSymbol(rhsName, PullElementKind.SomeValue, associatedType);
                    }
                }

                nameSymbol = this.resolveNameSymbol(nameSymbol, context);

                // could be an object member
                if (!nameSymbol && !lhsType.isPrimitive() && this.cachedObjectInterfaceType()) {
                    nameSymbol = this.getMemberSymbol(rhsName, PullElementKind.SomeValue, this.cachedObjectInterfaceType());
                }

                if (!nameSymbol) {
                    context.postError(this.unitPath, dottedNameAST.operand2.minChar, dottedNameAST.operand2.getLength(), DiagnosticCode.The_property_0_does_not_exist_on_value_of_type_1, [(<Identifier>dottedNameAST.operand2).actualText, lhsType.toString(enclosingDecl ? enclosingDecl.getSymbol() : null)])
                    return this.getNewErrorTypeSymbol(rhsName);
                }
            }

            if (checkSuperPrivateAndStaticAccess) {
                this.checkForSuperMemberAccess(dottedNameAST, nameSymbol, enclosingDecl, context) ||
                this.checkForPrivateMemberAccess(dottedNameAST, lhsType, nameSymbol, enclosingDecl, context) ||
                this.checkForStaticMemberAccess(dottedNameAST, lhsType, nameSymbol, enclosingDecl, context);
            }

            return nameSymbol;
        }

        public resolveTypeNameExpression(nameAST: Identifier, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullTypeSymbol {
            var typeNameSymbol = <PullTypeSymbol>this.getSymbolForAST(nameAST);

            // TODO(cyrusn): We really shouldn't be checking "isType" here.  However, we currently
            // have a bug where some part of the system calls resolveNameExpression on this node
            // and we cache the wrong thing.  We need to add appropriate checks to ensure that
            // resolveNameExpression is never called on a node that we should be calling 
            // resolveTypeNameExpression (and vice versa).
            if (!typeNameSymbol || !typeNameSymbol.isType() || this.canTypeCheckAST(nameAST, context)) {
                if (this.canTypeCheckAST(nameAST, context)) {
                    this.setTypeChecked(nameAST, context);
                }
                typeNameSymbol = this.computeTypeNameExpression(nameAST, enclosingDecl, context);
                this.setSymbolForAST(nameAST, typeNameSymbol, context);
            }

            if (!typeNameSymbol.isResolved) {
                this.resolveDeclaredSymbol(typeNameSymbol, enclosingDecl, context);
            }

            if (typeNameSymbol && !(typeNameSymbol.isTypeParameter() && (<PullTypeParameterSymbol>typeNameSymbol).isFunctionTypeParameter() && context.isSpecializingSignatureTypeParameters && !context.isSpecializingConstructorMethod)) {
                var substitution = context.findSpecializationForType(typeNameSymbol);

                if (typeNameSymbol.isTypeParameter() && (substitution != typeNameSymbol)) {
                    if (shouldSpecializeTypeParameterForTypeParameter(<PullTypeParameterSymbol>substitution, <PullTypeParameterSymbol>typeNameSymbol)) {
                        typeNameSymbol = substitution;
                    }
                }
            }

            return typeNameSymbol;
        }

        private computeTypeNameExpression(nameAST: Identifier, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullTypeSymbol {
            if (nameAST.isMissing()) {
                return this.semanticInfoChain.anyTypeSymbol;
            }

            var id = nameAST.text();

            // if it's a known primitive name, cheat
            if (id === "any") {
                return this.semanticInfoChain.anyTypeSymbol;
            }
            else if (id === "string") {
                return this.semanticInfoChain.stringTypeSymbol;
            }
            else if (id === "number") {
                return this.semanticInfoChain.numberTypeSymbol;
            }
            else if (id === "boolean") {
                return this.semanticInfoChain.booleanTypeSymbol;
            }
            else if (id === "void") {
                return this.semanticInfoChain.voidTypeSymbol;
            }
            else {
                var declPath: PullDecl[] = enclosingDecl !== null ? getPathToDecl(enclosingDecl) : <PullDecl[]>[];

                if (enclosingDecl && !declPath.length) {
                    declPath = [enclosingDecl];
                }

                // If we're resolving a dotted type name, every dotted name but the last will be a container type, so we'll search those
                // first if need be, and then fall back to type names.  Otherwise, look for a type first, since we are probably looking for
                // a type reference (the exception being an alias or export assignment)
                var kindToCheckFirst = context.resolvingNamespaceMemberAccess ? PullElementKind.SomeContainer : PullElementKind.SomeType;
                var kindToCheckSecond = context.resolvingNamespaceMemberAccess ? PullElementKind.SomeType : PullElementKind.SomeContainer;

                var typeNameSymbol = <PullTypeSymbol>this.getSymbolFromDeclPath(id, declPath, kindToCheckFirst);

                if (!typeNameSymbol) {
                    typeNameSymbol = <PullTypeSymbol>this.getSymbolFromDeclPath(id, declPath, kindToCheckSecond);
                }

                if (!typeNameSymbol) {
                    context.postError(this.unitPath, nameAST.minChar, nameAST.getLength(), DiagnosticCode.Could_not_find_symbol_0, [nameAST.actualText]);
                    return this.getNewErrorTypeSymbol(id);
                }

                var typeNameSymbolAlias: PullTypeAliasSymbol = null;
                if (typeNameSymbol.isAlias()) {
                    typeNameSymbolAlias = <PullTypeAliasSymbol>typeNameSymbol;
                    if (!typeNameSymbol.isResolved) {
                        this.resolveDeclaredSymbol(typeNameSymbol, enclosingDecl, context);
                    }

                    var aliasedType = typeNameSymbolAlias.getExportAssignedTypeSymbol();

                    if (aliasedType && !aliasedType.isResolved) {
                        this.resolveDeclaredSymbol(aliasedType, enclosingDecl, context);
                    }
                }

                if (typeNameSymbol.isTypeParameter()) {
                    if (enclosingDecl && (enclosingDecl.kind & PullElementKind.SomeFunction) && (enclosingDecl.flags & PullElementFlags.Static)) {
                        var parentDecl = typeNameSymbol.getDeclarations()[0].getParentDecl();

                        if (parentDecl.kind == PullElementKind.Class) {
                            context.postError(this.unitPath, nameAST.minChar, nameAST.getLength(), DiagnosticCode.Static_methods_cannot_reference_class_type_parameters, null);
                            return this.getNewErrorTypeSymbol();
                        }
                    }
                }
            }

            return typeNameSymbol;
        }

        private resolveGenericTypeReference(genericTypeAST: GenericType, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullTypeSymbol {
            var savedResolvingTypeReference = context.resolvingTypeReference;
            var savedResolvingNamespaceMemberAccess = context.resolvingNamespaceMemberAccess;
            context.resolvingNamespaceMemberAccess = false;
            context.resolvingTypeReference = true;
            var genericTypeSymbol = this.resolveAST(genericTypeAST.name, false, enclosingDecl, context).type;
            context.resolvingTypeReference = savedResolvingTypeReference;
            context.resolvingNamespaceMemberAccess = savedResolvingNamespaceMemberAccess;

            if (genericTypeSymbol.isError()) {
                return genericTypeSymbol;
            }

            if (!genericTypeSymbol.inResolution && !genericTypeSymbol.isResolved) {
                this.resolveDeclaredSymbol(genericTypeSymbol, enclosingDecl, context);
            }

            if (genericTypeSymbol.isAlias()) {
                genericTypeSymbol = (<PullTypeAliasSymbol>genericTypeSymbol).getExportAssignedTypeSymbol();
            }

            // specialize the type arguments
            var typeArgs: PullTypeSymbol[] = [];

            if (!context.isResolvingTypeArguments(genericTypeAST)) {
                context.startResolvingTypeArguments(genericTypeAST);
                var savedIsResolvingClassExtendedType = context.isResolvingClassExtendedType;
                context.isResolvingClassExtendedType = false;

                if (genericTypeAST.typeArguments && genericTypeAST.typeArguments.members.length) {
                    for (var i = 0; i < genericTypeAST.typeArguments.members.length; i++) {
                        var typeArg = this.resolveTypeReference(<TypeReference>genericTypeAST.typeArguments.members[i], enclosingDecl, context);

                        if (!(typeArg.isTypeParameter() && (<PullTypeParameterSymbol>typeArg).isFunctionTypeParameter() && context.isSpecializingSignatureTypeParameters && !context.isSpecializingConstructorMethod)) {   
                            typeArgs[i] = context.findSpecializationForType(typeArg);   
                        }   
                        else {   
                            typeArgs[i] = typeArg;   
                        }

                        if (typeArgs[i].isError()) {
                            typeArgs[i] = this.semanticInfoChain.anyTypeSymbol;
                        }
                    }
                }
                context.isResolvingClassExtendedType = savedIsResolvingClassExtendedType;
                context.doneResolvingTypeArguments();
            }

            var typeParameters = genericTypeSymbol.getTypeParameters()

            if (typeArgs.length && typeArgs.length != typeParameters.length) {
                context.postError(this.unitPath, genericTypeAST.minChar, genericTypeAST.getLength(), DiagnosticCode.Generic_type_0_requires_1_type_argument_s, [genericTypeSymbol.toString(), genericTypeSymbol.getTypeParameters().length]);
                return this.getNewErrorTypeSymbol();
            }

            // if the generic type symbol is not resolved, we need to ensure that all of its members are bound before specializing
            if (!genericTypeSymbol.isResolved) {
                var typeDecls = genericTypeSymbol.getDeclarations();
                var childDecls: PullDecl[] = null;

                for (var i = 0; i < typeDecls.length; i++) {
                    childDecls = typeDecls[i].getChildDecls();

                    for (var j = 0; j < childDecls.length; j++) {
                        childDecls[j].ensureSymbolIsBound();
                    }
                }
            }

            var specializedSymbol = specializeType(genericTypeSymbol, typeArgs, this, enclosingDecl, context);

            // check constraints, if appropriate
            var typeConstraint: PullTypeSymbol = null;
            var upperBound: PullTypeSymbol = null;

            // Get the instantiated versions of the type parameters (in case their constraints were generic)
            typeParameters = specializedSymbol.getTypeParameters();

            for (var iArg = 0; (iArg < typeArgs.length) && (iArg < typeParameters.length); iArg++) {
                typeArg = typeArgs[iArg];
                typeConstraint = typeParameters[iArg].getConstraint();

                // test specialization type for assignment compatibility with the constraint
                if (typeConstraint) {

                    if (typeConstraint.isTypeParameter()) {
                        for (var j = 0; j < typeParameters.length && j < typeArgs.length; j++) {
                            if (typeParameters[j] == typeConstraint) {
                                typeConstraint = typeArgs[j];
                            }
                        }
                    }

                    if (typeArg.isTypeParameter()) {
                        upperBound = (<PullTypeParameterSymbol>typeArg).getConstraint();

                        if (upperBound) {
                            typeArg = upperBound;
                        }
                    }

                    if (typeArg.inResolution) {
                        return specializedSymbol;
                    }
                    if (!this.sourceIsAssignableToTarget(typeArg, typeConstraint, context)) {
                        context.postError(this.unitPath, genericTypeAST.minChar, genericTypeAST.getLength(), DiagnosticCode.Type_0_does_not_satisfy_the_constraint_1_for_type_parameter_2, [typeArg.toString(null, true), typeConstraint.toString(null, true), typeParameters[iArg].toString(null, true)]);
                    }
                }
            }

            return specializedSymbol;
        }

        private resolveDottedTypeNameExpression(dottedNameAST: BinaryExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullTypeSymbol {
            var symbol = <PullTypeSymbol>this.getSymbolForAST(dottedNameAST);
            if (!symbol || this.canTypeCheckAST(dottedNameAST, context)) {
                if (this.canTypeCheckAST(dottedNameAST, context)) {
                    this.setTypeChecked(dottedNameAST, context);
                }
                symbol = this.computeDottedTypeNameExpression(dottedNameAST, enclosingDecl, context);
                this.setSymbolForAST(dottedNameAST, symbol, context);
            }

            if (!symbol.isResolved) {
                this.resolveDeclaredSymbol(symbol, enclosingDecl, context);
            }

            return symbol;
        }

        private computeDottedTypeNameExpression(dottedNameAST: BinaryExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullTypeSymbol {
            if ((<Identifier>dottedNameAST.operand2).isMissing()) {
                return this.semanticInfoChain.anyTypeSymbol;
            }

            // assemble the dotted name path
            var rhsName = (<Identifier>dottedNameAST.operand2).text();

            // TODO(cyrusn): Setting this context value should not be necessary.  We could have only
            // gotten into this code path if it was already set.
            var savedResolvingTypeReference = context.resolvingTypeReference;
            var savedResolvingNamespaceMemberAccess = context.resolvingNamespaceMemberAccess;
            context.resolvingNamespaceMemberAccess = true;
            context.resolvingTypeReference = true;
            var lhs = this.resolveAST(dottedNameAST.operand1, false, enclosingDecl, context);
            context.resolvingTypeReference = savedResolvingTypeReference;
            context.resolvingNamespaceMemberAccess = savedResolvingNamespaceMemberAccess;

            var lhsType = lhs.isAlias() ? (<PullTypeAliasSymbol>lhs).getExportAssignedContainerSymbol() : lhs.type;

            if (context.isResolvingClassExtendedType) {
                if (lhs.isAlias()) {
                    (<PullTypeAliasSymbol>lhs).isUsedAsValue = true;
                }
            }

            if (!lhsType) {
                return this.getNewErrorTypeSymbol();
            }

            if (this.isAnyOrEquivalent(lhsType)) {
                return lhsType;
            }

            // now for the name...
            var memberKind = context.resolvingNamespaceMemberAccess ? PullElementKind.SomeContainer : PullElementKind.SomeType;
            var childTypeSymbol = <PullTypeSymbol>this.getMemberSymbol(rhsName, memberKind, lhsType);

            // if the lhs exports a container type, but not a type, we should check the container type
            if (!childTypeSymbol && lhsType.isContainer()) {
                var exportedContainer = (<PullContainerSymbol>lhsType).getExportAssignedContainerSymbol();

                if (exportedContainer) {
                    childTypeSymbol = <PullTypeSymbol>this.getMemberSymbol(rhsName, memberKind, exportedContainer);
                }
            }

            // If the name is expressed as a dotted name within the parent type,
            // then it will be considered a contained member, so back up to the nearest
            // enclosing symbol and look there
            if (!childTypeSymbol && enclosingDecl) {
                var parentDecl = enclosingDecl;

                while (parentDecl) {
                    if (parentDecl.kind & PullElementKind.SomeContainer) {
                        break;
                    }

                    parentDecl = parentDecl.getParentDecl();
                }

                if (parentDecl) {
                    var enclosingSymbolType = parentDecl.getSymbol().type;

                    if (enclosingSymbolType === lhsType) {
                        childTypeSymbol = <PullTypeSymbol>this.getMemberSymbol(rhsName, memberKind, lhsType);//lhsType.findContainedMember(rhsName);
                    }
                }
            }

            if (!childTypeSymbol) {
                context.postError(this.unitPath, dottedNameAST.operand2.minChar, dottedNameAST.operand2.getLength(), DiagnosticCode.The_property_0_does_not_exist_on_value_of_type_1, [(<Identifier>dottedNameAST.operand2).actualText, lhsType.toString(enclosingDecl ? enclosingDecl.getSymbol() : null)]);
                return this.getNewErrorTypeSymbol(rhsName);
            }

            return childTypeSymbol;
        }

        private resolveFunctionExpression(funcDeclAST: FunctionDeclaration, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {

            var funcDeclSymbol: PullSymbol = null;
            var functionDecl: PullDecl = this.getDeclForAST(funcDeclAST);

            if (functionDecl && functionDecl.hasSymbol()) {
                funcDeclSymbol = functionDecl.getSymbol();
                if (funcDeclSymbol.isResolved || funcDeclSymbol.inResolution) {
                    return funcDeclSymbol;
                }
            }

            // if we have an assigning AST with a type, and the funcDecl has no parameter types or return type annotation
            // we'll contextually type it
            // otherwise, just process it as a normal function declaration

            var shouldContextuallyType = inContextuallyTypedAssignment;

            var assigningFunctionTypeSymbol: PullTypeSymbol = null;
            var assigningFunctionSignature: PullSignatureSymbol = null;

            if (funcDeclAST.returnTypeAnnotation) {
                shouldContextuallyType = false;
            }

            if (shouldContextuallyType && funcDeclAST.arguments) {

                for (var i = 0; i < funcDeclAST.arguments.members.length; i++) {
                    var parameter = <Parameter>funcDeclAST.arguments.members[i];
                    if (parameter.typeExpr) {
                        shouldContextuallyType = false;
                        break;
                    }
                }
            }

            if (shouldContextuallyType) {

                assigningFunctionTypeSymbol = context.getContextualType();

                if (assigningFunctionTypeSymbol) {
                    this.resolveDeclaredSymbol(assigningFunctionTypeSymbol, enclosingDecl, context);

                    if (assigningFunctionTypeSymbol) {
                        assigningFunctionSignature = assigningFunctionTypeSymbol.getCallSignatures()[0];
                    }
                }
            }

            // If necessary, create a new function decl and symbol
            if (!functionDecl) {
                var semanticInfo = this.semanticInfoChain.getUnit(this.unitPath);
                var declCollectionContext = new DeclCollectionContext(semanticInfo, this.unitPath);

                if (enclosingDecl) {
                    declCollectionContext.pushParent(enclosingDecl);
                }

                getAstWalkerFactory().walk(funcDeclAST, preCollectDecls, postCollectDecls, null, declCollectionContext);

                functionDecl = this.getDeclForAST(funcDeclAST);
                this.currentUnit.addSynthesizedDecl(functionDecl);

                var binder = new PullSymbolBinder(this.semanticInfoChain);
                binder.setUnit(this.unitPath);
                binder.bindFunctionExpressionToPullSymbol(functionDecl);
            }

            funcDeclSymbol = <PullTypeSymbol>functionDecl.getSymbol();
            var funcDeclType = funcDeclSymbol.type;
            var signature = funcDeclType.getCallSignatures()[0];
            funcDeclSymbol.startResolving();

            if (funcDeclAST.typeArguments) {
                for (var i = 0; i < funcDeclAST.typeArguments.members.length; i++) {
                    this.resolveTypeParameterDeclaration(<TypeParameter>funcDeclAST.typeArguments.members[i], context);
                }
            }

            // link parameters and resolve their annotations
            if (funcDeclAST.arguments) {
                var contextParams: PullSymbol[] = [];

                if (assigningFunctionSignature) {
                    contextParams = assigningFunctionSignature.parameters;
                }

                // Push the function onto the parameter index stack
                var hasDefaultArgs = (functionDecl.flags & PullElementFlags.HasDefaultArgs) !== 0;
                if (hasDefaultArgs) {
                    context.pushParameterIndexContext(funcDeclAST);
                }

                var contextualParametersCount = contextParams.length;
                for (var i = 0, n = funcDeclAST.arguments.members.length; i < n; i++) {
                    var actualParameter = <Parameter>funcDeclAST.arguments.members[i];
                    // Function has a variable argument list, and this paramter is the last
                    var actualParameterIsVarArgParameter = funcDeclAST.variableArgList && i === n - 1;
                    var correspondingContextualParameter: PullSymbol = null;
                    var contextualParameterType: PullTypeSymbol = null;

                    // Find the matching contextual paramter
                    if (i < contextualParametersCount) {
                        correspondingContextualParameter = contextParams[i];
                    }
                    else if (contextualParametersCount && contextParams[contextualParametersCount - 1].isVarArg) {
                        correspondingContextualParameter = contextParams[contextualParametersCount - 1];
                    }

                    // Find the contextual type from the paramter
                    if (correspondingContextualParameter) {
                        if (correspondingContextualParameter.isVarArg === actualParameterIsVarArgParameter) {
                            contextualParameterType = correspondingContextualParameter.type;
                        }
                        else if (correspondingContextualParameter.isVarArg) {
                            contextualParameterType = correspondingContextualParameter.type.getElementType();
                        }
                    }

                    // use the function decl as the enclosing decl, so as to properly resolve type parameters
                    this.resolveFunctionExpressionParameter(actualParameter, contextualParameterType, functionDecl, context);
                    if (hasDefaultArgs) {
                        context.incrementParameterIndex();
                    }
                }

                if (hasDefaultArgs) {
                    context.popParameterIndexContext();
                }
            }

            // resolve the return type annotation
            if (funcDeclAST.returnTypeAnnotation) {
                signature.returnType = this.resolveTypeReference(<TypeReference>funcDeclAST.returnTypeAnnotation, functionDecl, context);
            }
            else {
                if (assigningFunctionSignature) {
                    var returnType = assigningFunctionSignature.returnType;

                    if (returnType) {
                        context.pushContextualType(returnType, context.inProvisionalResolution(), null);
                        //signature.setReturnType(returnType);
                        this.resolveFunctionBodyReturnTypes(funcDeclAST, signature, true, functionDecl, context);
                        context.popContextualType();
                    }
                    else {
                        signature.returnType = this.semanticInfoChain.anyTypeSymbol;

                        // if noimplictiany flag is set to be true, report an error
                        if (this.compilationSettings.noImplicitAny) {
                            var functionExpressionName = (<PullFunctionExpressionDecl>functionDecl).getFunctionExpressionName();

                            // If there is a function name for the funciton expression, report an error with that name
                            if (functionExpressionName != "") {
                                context.postError(this.unitPath, funcDeclAST.minChar, funcDeclAST.getLength(),
                                    DiagnosticCode._0_which_lacks_return_type_annotation_implicitly_has_an_any_return_type, [functionExpressionName]);
                            }
                            else {
                                context.postError(this.unitPath, funcDeclAST.minChar, funcDeclAST.getLength(),
                                    DiagnosticCode.Function_expression_which_lacks_return_type_annotation_implicitly_has_an_any_return_type, null);
                            }
                        }
                    }
                }
                else {
                    this.resolveFunctionBodyReturnTypes(funcDeclAST, signature, false, functionDecl, context);
                }
            }
            // reset the type to the one we already had, 
            // this makes sure if we had short - circuited the type of this symbol to any, we would get back to the function type
            context.setTypeInContext(funcDeclSymbol, funcDeclType);
            funcDeclSymbol.setResolved();

            if (this.canTypeCheckAST(funcDeclAST, context)) {
                this.typeCheckFunctionExpression(funcDeclAST, context);
            }

            return funcDeclSymbol;
        }

        private typeCheckFunctionExpression(funcDeclAST: FunctionDeclaration, context: PullTypeResolutionContext) {
            this.setTypeChecked(funcDeclAST, context);

            var functionDecl: PullDecl = this.getDeclForAST(funcDeclAST);

            var funcDeclSymbol = <PullTypeSymbol>functionDecl.getSymbol();
            var funcDeclType = funcDeclSymbol.type;
            var signature = funcDeclType.getCallSignatures()[0];
            var returnTypeSymbol = signature.returnType;

            if (funcDeclAST.typeArguments) {
                for (var i = 0; i < funcDeclAST.typeArguments.members.length; i++) {
                    this.resolveTypeParameterDeclaration(<TypeParameter>funcDeclAST.typeArguments.members[i], context);
                }
            }

            var prevSeenSuperConstructorCall = this.seenSuperConstructorCall;
            this.seenSuperConstructorCall = false;
            // Make sure there is no contextual type on the stack when resolving the block
            context.pushContextualType(null, context.inProvisionalResolution(), null);
            this.resolveAST(funcDeclAST.block, false, functionDecl, context);
            context.popContextualType();
            this.seenSuperConstructorCall = prevSeenSuperConstructorCall;

            var hasReturn = (functionDecl.flags & (PullElementFlags.Signature | PullElementFlags.HasReturnStatement)) != 0;

            if (funcDeclAST.block && funcDeclAST.returnTypeAnnotation != null && !hasReturn) {
                var isVoidOrAny = this.isAnyOrEquivalent(returnTypeSymbol) || returnTypeSymbol === this.semanticInfoChain.voidTypeSymbol;

                if (!isVoidOrAny && !(funcDeclAST.block.statements.members.length > 0 && funcDeclAST.block.statements.members[0].nodeType() === NodeType.ThrowStatement)) {
                    var funcName = functionDecl.getDisplayName();
                    funcName = funcName ? "'" + funcName + "'" : "expression";

                    context.postError(this.unitPath, funcDeclAST.returnTypeAnnotation.minChar, funcDeclAST.returnTypeAnnotation.getLength(), DiagnosticCode.Function_0_declared_a_non_void_return_type_but_has_no_return_expression, [funcName]);
                }
            }

            this.validateVariableDeclarationGroups(functionDecl, context);

            PullTypeResolver.typeCheckCallBacks.push((context) => {
                var currentUnitPath = this.unitPath;
                this.setUnitPath(functionDecl.getScriptName());
                this.typeCheckFunctionOverloads(funcDeclAST, context);
                this.setUnitPath(currentUnitPath);
            });
        }

        private resolveThisExpression(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            var thisTypeSymbol = <PullTypeSymbol>this.getSymbolForAST(ast);
            var canTypeCheckAST = this.canTypeCheckAST(ast, context);
            if (enclosingDecl && (!thisTypeSymbol || canTypeCheckAST)) {
                thisTypeSymbol = this.semanticInfoChain.anyTypeSymbol;
                var enclosingDeclKind = enclosingDecl.kind;
                var diagnostics: Diagnostic[];
                var classDecl: PullDecl = null;

                if (!(enclosingDeclKind & (PullElementKind.SomeFunction | PullElementKind.Script | PullElementKind.SomeBlock | PullElementKind.Class))) {
                    thisTypeSymbol = this.getNewErrorTypeSymbol();
                }
                else {
                    thisTypeSymbol = this.getContextualClassSymbolForEnclosingDecl(enclosingDecl, context) || thisTypeSymbol;
                    var decls = thisTypeSymbol.getDeclarations();
                    classDecl = decls && decls[0];
                }

                this.setSymbolForAST(ast, thisTypeSymbol, context);
                if (canTypeCheckAST) {
                    this.setTypeChecked(ast, context);
                    var thisExpressionAST = <ThisExpression>ast;
                    var enclosingNonLambdaDecl = this.getEnclosingNonLambdaDecl(enclosingDecl);

                    if (context.isResolvingSuperConstructorCallArgument &&
                        this.superCallMustBeFirstStatementInConstructor(enclosingDecl, classDecl)) {

                        context.postError(this.unitPath, thisExpressionAST.minChar, thisExpressionAST.getLength(), DiagnosticCode.this_cannot_be_referenced_in_current_location, null);
                    }
                    else if (enclosingNonLambdaDecl) {
                        if (enclosingNonLambdaDecl.kind === PullElementKind.Class && context.isInStaticInitializer) {
                            context.postError(this.unitPath, thisExpressionAST.minChar, thisExpressionAST.getLength(), DiagnosticCode.this_cannot_be_referenced_in_static_initializers_in_a_class_body, null);
                        }
                        else if (enclosingNonLambdaDecl.kind === PullElementKind.Container || enclosingNonLambdaDecl.kind === PullElementKind.DynamicModule) {
                            context.postError(this.unitPath, thisExpressionAST.minChar, thisExpressionAST.getLength(), DiagnosticCode.this_cannot_be_referenced_within_module_bodies, null);
                        }
                        else if (context.inConstructorArguments) {
                            context.postError(this.unitPath, thisExpressionAST.minChar, thisExpressionAST.getLength(), DiagnosticCode.this_cannot_be_referenced_in_constructor_arguments, null);
                        }
                    }
                    this.checkForThisCaptureInArrowFunction(ast, enclosingDecl);
                }
            } else if (!thisTypeSymbol) {
                thisTypeSymbol = this.semanticInfoChain.anyTypeSymbol;
                this.setSymbolForAST(ast, thisTypeSymbol, context);
            }

            return thisTypeSymbol;
        }

        private getContextualClassSymbolForEnclosingDecl(enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullTypeSymbol {
            var declPath: PullDecl[] = getPathToDecl(enclosingDecl);

            // work back up the decl path, until you can find a class
            if (declPath.length) {
                var isStaticContext = false;
                for (var i = declPath.length - 1; i >= 0; i--) {
                    var decl = declPath[i];
                    var declKind = decl.kind;
                    var declFlags = decl.flags;

                    if (declFlags & PullElementFlags.Static) {
                        isStaticContext = true;
                    }
                    else if (declKind === PullElementKind.FunctionExpression && !hasFlag(declFlags, PullElementFlags.FatArrow)) {
                        return null;
                    }
                    else if (declKind === PullElementKind.Function) {
                        return null;
                    }
                    else if (declKind === PullElementKind.Class) {
                        if (context.isInStaticInitializer) {
                            return this.getNewErrorTypeSymbol();
                        }
                        else {
                            var classSymbol = <PullTypeSymbol>decl.getSymbol();
                            if (isStaticContext) {
                                var constructorSymbol = classSymbol.getConstructorMethod();
                                return constructorSymbol.type;
                            }
                            else {
                                return classSymbol;
                            }
                        }
                        break;
                    }
                }
            }

            return null;
        }

        private getEnclosingNonLambdaDecl(enclosingDecl: PullDecl) {
            var declPath: PullDecl[] = enclosingDecl !== null ? getPathToDecl(enclosingDecl) : <PullDecl[]>[];

            if (declPath.length) {
                for (var i = declPath.length - 1; i >= 0; i--) {
                    var decl = declPath[i];
                    if (!(decl.kind === PullElementKind.FunctionExpression && (decl.flags & PullElementFlags.FatArrow))) {
                        return decl;
                    }
                }
            }

            return null;
        }

        // PULLTODO: Optimization: cache this for a given decl path
        private resolveSuperExpression(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            var superType = this.semanticInfoChain.anyTypeSymbol;
            if (enclosingDecl) {
                var declPath: PullDecl[] = enclosingDecl !== null ? getPathToDecl(enclosingDecl) : <PullDecl[]>[];
                var superType = this.semanticInfoChain.anyTypeSymbol;

                var classSymbol = this.getContextualClassSymbolForEnclosingDecl(enclosingDecl, context);

                if (classSymbol) {

                    if (!classSymbol.isResolved) {
                        this.resolveDeclaredSymbol(classSymbol, enclosingDecl, context);
                    }

                    var parents = classSymbol.getExtendedTypes();

                    if (parents.length) {
                        superType = parents[0];
                    }
                }
            }
            this.setSymbolForAST(ast, superType, context);

            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckSuperExpression(ast, enclosingDecl, context);
            }

            return superType;
        }

        private typeCheckSuperExpression(ast: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);

            this.checkForThisCaptureInArrowFunction(ast, enclosingDecl);

            if (!enclosingDecl) {
                return;
            }

            var nonLambdaEnclosingDecl: PullDecl = this.getEnclosingNonLambdaDecl(enclosingDecl);

            if (nonLambdaEnclosingDecl) {

                var nonLambdaEnclosingDeclKind = nonLambdaEnclosingDecl.kind;
                var inSuperConstructorTarget = context.isResolvingSuperConstructorCallArgument;

                // Super calls are not permitted outside constructors or in local functions inside constructors.
                if (inSuperConstructorTarget && enclosingDecl.kind !== PullElementKind.ConstructorMethod) {
                    context.postError(this.unitPath, ast.minChar, ast.getLength(), DiagnosticCode.Super_calls_are_not_permitted_outside_constructors_or_in_local_functions_inside_constructors, null);
                }
                // A super property access is permitted only in a constructor, instance member function, or instance member accessor
                else if ((nonLambdaEnclosingDeclKind !== PullElementKind.Class && nonLambdaEnclosingDeclKind !== PullElementKind.Method && nonLambdaEnclosingDeclKind !== PullElementKind.GetAccessor && nonLambdaEnclosingDeclKind !== PullElementKind.SetAccessor && nonLambdaEnclosingDeclKind !== PullElementKind.ConstructorMethod) ||
                    context.isInStaticInitializer) {
                    context.postError(this.unitPath, ast.minChar, ast.getLength(), DiagnosticCode.super_property_access_is_permitted_only_in_a_constructor_member_function_or_member_accessor_of_a_derived_class, null);
                }
                // A super is permitted only in a derived class 
                else if (!this.enclosingClassIsDerived(enclosingDecl)) {
                    context.postError(this.unitPath, ast.minChar, ast.getLength(), DiagnosticCode.super_cannot_be_referenced_in_non_derived_classes, null);
                }
                // Cannot be referenced in constructor arguments
                else if (context.inConstructorArguments) {
                    context.postError(this.unitPath, ast.minChar, ast.getLength(), DiagnosticCode.super_cannot_be_referenced_in_constructor_arguments, null);
                }
            }
        }

        public resolveObjectLiteralExpression(expressionAST: AST, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext, additionalResults?: PullAdditionalObjectLiteralResolutionData): PullSymbol {
            var symbol = this.getSymbolForAST(expressionAST);

            if (!symbol || additionalResults || this.canTypeCheckAST(expressionAST, context)) {
                if (this.canTypeCheckAST(expressionAST, context)) {
                    this.setTypeChecked(expressionAST, context);
                }
                symbol = this.computeObjectLiteralExpression(expressionAST, inContextuallyTypedAssignment, enclosingDecl, context, additionalResults);
                this.setSymbolForAST(expressionAST, symbol, context);
            }

            return symbol;
        }

        // if there's no type annotation on the assigning AST, we need to create a type from each binary expression
        // in the object literal
        private computeObjectLiteralExpression(expressionAST: AST, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext, additionalResults?: PullAdditionalObjectLiteralResolutionData): PullSymbol {
            // PULLTODO: Create a decl for the object literal

            // walk the members of the object literal,
            // create fields for each based on the value assigned in
            var objectLitAST = <UnaryExpression>expressionAST;
            var span = TextSpan.fromBounds(objectLitAST.minChar, objectLitAST.limChar);

            var objectLitDecl = this.getDeclForAST(expressionAST);
            var typeSymbol = <PullTypeSymbol>this.getSymbolForAST(objectLitAST);
            var isUsingExistingDecl = !!objectLitDecl;
            var isUsingExistingSymbol = !!typeSymbol;

            if (!objectLitDecl) {
                objectLitDecl = new PullDecl("", "", PullElementKind.ObjectLiteral, PullElementFlags.None, span, this.unitPath);
                this.currentUnit.addSynthesizedDecl(objectLitDecl);

                if (enclosingDecl) {
                    objectLitDecl.setParentDecl(enclosingDecl);
                }

                this.currentUnit.setDeclForAST(objectLitAST, objectLitDecl);
                this.currentUnit.setASTForDecl(objectLitDecl, objectLitAST);
            }

            if (!typeSymbol) {
                typeSymbol = new PullTypeSymbol("", PullElementKind.Interface);
                typeSymbol.addDeclaration(objectLitDecl);
                this.setSymbolForAST(objectLitAST, typeSymbol, context);
                objectLitDecl.setSymbol(typeSymbol);
            }

            var memberDecls = <ASTList>objectLitAST.operand;

            var contextualType: PullTypeSymbol = null;

            if (inContextuallyTypedAssignment) {
                contextualType = context.getContextualType();

                this.resolveDeclaredSymbol(contextualType, enclosingDecl, context);
            }

            // Get the index signatures for contextual typing
            if (contextualType) {
                var indexSignatures = this.getBothKindsOfIndexSignatures(contextualType, context);
                var stringSignature = indexSignatures.stringSignature;
                var numberSignature = indexSignatures.numericSignature;

                // Start collecting the types of all the members so we can stamp the object literal with the proper index signatures
                var allMemberTypes: PullTypeSymbol[] = null;
                var allNumericMemberTypes: PullTypeSymbol[] = null;
                if (stringSignature) {
                    allMemberTypes = [stringSignature.returnType];
                }
                if (numberSignature) {
                    allNumericMemberTypes = [numberSignature.returnType];
                }
            }

            if (memberDecls) {
                var binex: BinaryExpression;
                var memberSymbol: PullSymbol;
                var assigningSymbol: PullSymbol = null;
                var acceptedContextualType = false;

                if (additionalResults) {
                    additionalResults.membersContextTypeSymbols = [];
                }

                for (var i = 0, len = memberDecls.members.length; i < len; i++) {
                    binex = <BinaryExpression>memberDecls.members[i];

                    var id = binex.operand1;
                    var text: string;
                    var actualText: string;

                    if (id.nodeType() === NodeType.Name) {
                        actualText = (<Identifier>id).actualText;
                        text = (<Identifier>id).text();
                    }
                    else if (id.nodeType() === NodeType.StringLiteral) {
                        actualText = (<StringLiteral>id).actualText;
                        text = (<StringLiteral>id).text();
                    }
                    else if (id.nodeType() === NodeType.NumericLiteral) {
                        actualText = text = (<NumberLiteral>id).text();
                    }
                    else {
                        // TODO: no error for this?
                        return this.semanticInfoChain.anyTypeSymbol;
                    }

                    // PULLTODO: Collect these at decl collection time, add them to the var decl
                    span = TextSpan.fromBounds(binex.minChar, binex.limChar);

                    var isAccessor = binex.operand2.nodeType() === NodeType.FunctionDeclaration && (<FunctionDeclaration>binex.operand2).isAccessor();

                    var decl = this.getDeclForAST(binex);
                    if (!isAccessor) {
                        if (!isUsingExistingDecl) {
                            decl = new PullDecl(text, actualText, PullElementKind.Property, PullElementFlags.Public, span, this.unitPath);
                            this.currentUnit.addSynthesizedDecl(decl);

                            objectLitDecl.addChildDecl(decl);
                            decl.setParentDecl(objectLitDecl);

                            this.semanticInfoChain.getUnit(this.unitPath).setDeclForAST(binex, decl);
                            this.semanticInfoChain.getUnit(this.unitPath).setASTForDecl(decl, binex);

                        }

                        if (!isUsingExistingSymbol) {
                            memberSymbol = new PullSymbol(text, PullElementKind.Property);
                            memberSymbol.addDeclaration(decl);
                            decl.setSymbol(memberSymbol);
                        } else {
                            memberSymbol = decl.getSymbol();
                        }
                    }

                    if (contextualType) {
                        assigningSymbol = this.getMemberSymbol(text, PullElementKind.SomeValue, contextualType);

                        // Consider index signatures as potential contextual types
                        if (!assigningSymbol) {
                            if (numberSignature && PullHelpers.isNameNumeric(text)) {
                                assigningSymbol = numberSignature;
                            }
                            else if (stringSignature) {
                                assigningSymbol = stringSignature;
                            }
                        }

                        if (assigningSymbol) {

                            this.resolveDeclaredSymbol(assigningSymbol, enclosingDecl, context);

                            var contextualMemberType = assigningSymbol.kind === PullElementKind.IndexSignature ? (<PullSignatureSymbol>assigningSymbol).returnType : assigningSymbol.type;
                            context.pushContextualType(contextualMemberType, context.inProvisionalResolution(), null);

                            acceptedContextualType = true;

                            if (additionalResults) {
                                additionalResults.membersContextTypeSymbols[i] = contextualMemberType;
                            }
                        }
                    }

                    // if operand 2 is a getter or a setter, we need to resolve it properly
                    if (isAccessor) {
                        var funcDeclAST = <FunctionDeclaration>binex.operand2;
                        if (!isUsingExistingDecl) {
                            var semanticInfo = this.semanticInfoChain.getUnit(this.unitPath);
                            var declCollectionContext = new DeclCollectionContext(semanticInfo, this.unitPath);

                            declCollectionContext.pushParent(objectLitDecl);

                            getAstWalkerFactory().walk(funcDeclAST, preCollectDecls, postCollectDecls, null, declCollectionContext);

                            var functionDecl = this.getDeclForAST(funcDeclAST);
                            this.currentUnit.addSynthesizedDecl(functionDecl);
                        }

                        if (!isUsingExistingSymbol) {
                            var binder = new PullSymbolBinder(this.semanticInfoChain);
                            binder.setUnit(this.unitPath);

                            if (funcDeclAST.isGetAccessor()) {
                                binder.bindGetAccessorDeclarationToPullSymbol(functionDecl);
                            }
                            else {
                                binder.bindSetAccessorDeclarationToPullSymbol(functionDecl);
                            }
                        }
                    }

                    var memberExpr = this.widenType(this.resolveAST(binex.operand2, contextualMemberType != null, enclosingDecl, context).type, enclosingDecl, context);

                    if (memberExpr.type) {
                        if (memberExpr.type.isGeneric()) {
                            typeSymbol.setHasGenericMember();
                        }

                        // Add the member to the appropriate member type lists to compute the type of the synthesized index signatures
                        if (stringSignature) {
                            allMemberTypes.push(memberExpr.type);
                        }
                        if (numberSignature && PullHelpers.isNameNumeric(memberSymbol.name)) {
                            allNumericMemberTypes.push(memberExpr.type);
                        }
                    }

                    if (acceptedContextualType) {
                        context.popContextualType();
                        acceptedContextualType = false;
                    }

                    if (!isUsingExistingSymbol) {
                        if (isAccessor) {
                            this.setSymbolForAST(binex.operand1, memberExpr, context);
                        } else {
                            // Make sure this was not defined before
                            if (typeSymbol.findMember(memberSymbol.name)) {
                                context.postError(this.getUnitPath(), binex.minChar, binex.getLength(), DiagnosticCode.Duplicate_identifier_0, [actualText]);
                            }

                            context.setTypeInContext(memberSymbol, memberExpr.type);
                            memberSymbol.setResolved();

                            this.setSymbolForAST(binex.operand1, memberSymbol, context);
                            typeSymbol.addMember(memberSymbol);
                        }
                    }
                }

                if (!isUsingExistingSymbol) {
                    this.stampObjectLiteralWithIndexSignature(typeSymbol, allMemberTypes, stringSignature, context);
                    this.stampObjectLiteralWithIndexSignature(typeSymbol, allNumericMemberTypes, numberSignature, context);
                }
            }

            if (!this.getSymbolForAST(objectLitAST)) {
                objectLitDecl.setSymbol(null);
            }
            typeSymbol.setResolved();
            return typeSymbol;
        }

        private stampObjectLiteralWithIndexSignature(objectLiteralSymbol: PullTypeSymbol, indexerTypeCandidates: PullTypeSymbol[],
            contextualIndexSignature: PullSignatureSymbol, context: PullTypeResolutionContext): void {
            if (contextualIndexSignature) {
                var typeCollection: IPullTypeCollection = {
                    getLength: () => indexerTypeCandidates.length,
                    getTypeAtIndex: (index: number) => indexerTypeCandidates[index]
                };
                var decl = objectLiteralSymbol.getDeclarations()[0];
                var indexerReturnType = this.widenType(this.findBestCommonType(indexerTypeCandidates[0], typeCollection, context), decl, context);
                if (indexerReturnType == contextualIndexSignature.returnType) {
                    objectLiteralSymbol.addIndexSignature(contextualIndexSignature);
                }
                else {
                    // Create an index signature
                    this.currentUnit.addSyntheticIndexSignature(decl, objectLiteralSymbol, this.getASTForDecl(decl),
                        contextualIndexSignature.parameters[0].name, /*indexParamType*/ contextualIndexSignature.parameters[0].type, /*returnType*/ indexerReturnType);
                }
            }
        }

        private resolveArrayLiteralExpression(arrayLit: UnaryExpression, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            var symbol = this.getSymbolForAST(arrayLit);
            if (!symbol || this.canTypeCheckAST(arrayLit, context)) {
                if (this.canTypeCheckAST(arrayLit, context)) {
                    this.setTypeChecked(arrayLit, context);
                }
                symbol = this.computeArrayLiteralExpressionSymbol(arrayLit, inContextuallyTypedAssignment, enclosingDecl, context);
                this.setSymbolForAST(arrayLit, symbol, context);
            }

            return symbol;
        }

        private computeArrayLiteralExpressionSymbol(arrayLit: UnaryExpression, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            var elements = <ASTList>arrayLit.operand;
            var elementType: PullTypeSymbol = null;
            var elementTypes: PullTypeSymbol[] = [];
            var comparisonInfo = new TypeComparisonInfo();
            var contextualElementType: PullTypeSymbol = null;
            comparisonInfo.onlyCaptureFirstError = true;

            // if the target type is an array type, extract the element type
            if (inContextuallyTypedAssignment) {
                var contextualType = context.getContextualType();

                this.resolveDeclaredSymbol(contextualType, enclosingDecl, context);

                if (contextualType) {
                    if (contextualType.isArray()) {
                        contextualElementType = contextualType.getElementType();
                    }
                    else {
                        // Collect the index signatures
                        var indexSignatures = contextualType.getIndexSignatures();
                        for (var i = 0; i < indexSignatures.length; i++) {
                            var signature = indexSignatures[i];
                            if (signature.parameters[0].type === this.semanticInfoChain.numberTypeSymbol) {
                                contextualElementType = signature.returnType;
                                break;
                            }
                        }
                    }
                }
            }

            // Resolve element types
            if (elements) {
                if (inContextuallyTypedAssignment) {
                    context.pushContextualType(contextualElementType, context.inProvisionalResolution(), null);
                }

                for (var i = 0; i < elements.members.length; i++) {
                    elementTypes[elementTypes.length] = this.resolveAST(elements.members[i], inContextuallyTypedAssignment, enclosingDecl, context).type;
                }

                if (inContextuallyTypedAssignment) {
                    context.popContextualType();
                }
            }

            // if noImplicitAny flag is set to be true and array is not declared in the function invocation or object creation invocation, report an error
            if (this.compilationSettings.noImplicitAny) {
                // if it is an empty array and there is no contextual type
                if (!inContextuallyTypedAssignment && elements.members.length == 0) {
                    context.postError(this.unitPath, arrayLit.minChar, arrayLit.getLength(), DiagnosticCode.Array_Literal_implicitly_has_an_any_type_from_widening, null);

                }
            }

            // If there is no contextual type to apply attempt to find the best common type
            if (elementTypes.length) {
                elementType = elementTypes[0];
            }
            var collection: IPullTypeCollection;
            if (contextualElementType) {
                if (!elementType) { // we have an empty array
                    elementType = contextualElementType;
                }
                // Add the contextual type to the collection as one of the types to be considered for best common type
                collection = {
                    getLength: () => { return elements.members.length + 1; },
                    getTypeAtIndex: (index: number) => { return index === elementTypes.length ? contextualElementType : elementTypes[index]; }
                };
            }
            else {
                collection = {
                    getLength: () => { return elements.members.length; },
                    getTypeAtIndex: (index: number) => { return elementTypes[index]; }
                };
            }

            elementType = elementType ? this.findBestCommonType(elementType, collection, context, comparisonInfo) : elementType;

            if (elementType === this.semanticInfoChain.undefinedTypeSymbol || elementType === this.semanticInfoChain.nullTypeSymbol) {
                // if noImplicitAny flag is set to be true and array is not declared in the function invocation or object creation invocation, report an error
                if (this.compilationSettings.noImplicitAny && !inContextuallyTypedAssignment) {
                    context.postError(this.unitPath, arrayLit.minChar, arrayLit.getLength(), DiagnosticCode.Array_Literal_implicitly_has_an_any_type_from_widening, null);
                }
            }

            if (!elementType) {
                elementType = this.semanticInfoChain.undefinedTypeSymbol;

                // if noImplicitAny flag is set to be true and array is not declared in the function invocation or object creation invocation, report an error
                if (this.compilationSettings.noImplicitAny && !inContextuallyTypedAssignment) {
                    context.postError(this.unitPath, arrayLit.minChar, arrayLit.getLength(), DiagnosticCode.Array_Literal_implicitly_has_an_any_type_from_widening, null);
                }
            }

            var arraySymbol = elementType.getArrayType();

            // ...But in case we haven't...
            if (!arraySymbol) {

                if (!this.cachedArrayInterfaceType().isResolved) {
                    this.resolveDeclaredSymbol(this.cachedArrayInterfaceType(), enclosingDecl, context);
                }

                arraySymbol = specializeType(this.cachedArrayInterfaceType(), [elementType], this, this.cachedArrayInterfaceType().getDeclarations()[0], context);

                if (!arraySymbol) {
                    arraySymbol = this.semanticInfoChain.anyTypeSymbol;
                }
            }

            return arraySymbol;
        }

        private resolveIndexExpression(callEx: BinaryExpression, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            var symbol = this.getSymbolForAST(callEx);
            if (!symbol) {
                symbol = this.computeIndexExpressionSymbol(callEx, inContextuallyTypedAssignment, enclosingDecl, context);
                this.setSymbolForAST(callEx, symbol, context);
                if (this.canTypeCheckAST(callEx, context)) {
                    this.setTypeChecked(callEx, context);
                }
            } else if (this.canTypeCheckAST(callEx, context)) {
                this.typeCheckIndexExpression(callEx, inContextuallyTypedAssignment, enclosingDecl, context);
            }

            return symbol;
        }

        private typeCheckIndexExpression(callEx: BinaryExpression, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(callEx, context);
            this.resolveAST(callEx.operand1, inContextuallyTypedAssignment, enclosingDecl, context);
            this.resolveAST(callEx.operand2, inContextuallyTypedAssignment, enclosingDecl, context);
        }

        private computeIndexExpressionSymbol(callEx: BinaryExpression, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            // resolve the target
            var targetSymbol = this.resolveAST(callEx.operand1, inContextuallyTypedAssignment, enclosingDecl, context);
            var indexType = this.resolveAST(callEx.operand2, inContextuallyTypedAssignment, enclosingDecl, context).type;

            var targetTypeSymbol = targetSymbol.type;

            if (this.isAnyOrEquivalent(targetTypeSymbol)) {
                return targetTypeSymbol;
            }

            var elementType = targetTypeSymbol.getElementType();

            var isNumberIndex = indexType === this.semanticInfoChain.numberTypeSymbol || PullHelpers.symbolIsEnum(indexType);

            if (elementType && isNumberIndex) {
                return elementType;
            }

            // if the index expression is a string literal or a numberic literal and the object expression has
            // a property with that name,  the property access is the type of that property
            if (callEx.operand2.nodeType() === NodeType.StringLiteral || callEx.operand2.nodeType() === NodeType.NumericLiteral) {
                var memberName = callEx.operand2.nodeType() === NodeType.StringLiteral
                    ? stripStartAndEndQuotes((<StringLiteral>callEx.operand2).actualText)
                    : (<NumberLiteral>callEx.operand2).value.toString();

                var member = this.getMemberSymbol(memberName, PullElementKind.SomeValue, targetTypeSymbol);

                if (member) {
                    if (!member.isResolved) {
                        this.resolveDeclaredSymbol(member, enclosingDecl, context);
                    }
                    
                    return member.type;
                }
            }

            // Substitute the String interface type if the target type is a string (it has a numeric index signature)
            if (targetTypeSymbol == this.semanticInfoChain.stringTypeSymbol && this.cachedStringInterfaceType()) {
                targetTypeSymbol = this.cachedStringInterfaceType();
            }

            var signatures = this.getBothKindsOfIndexSignatures(targetTypeSymbol, context);

            var stringSignature = signatures.stringSignature;
            var numberSignature = signatures.numericSignature;

            // otherwise, if the object expression has a numeric index signature and the index expression is
            // of type Any, the Number primitive type or an enum type, the property access is of the type of that index
            // signature
            if (numberSignature && (isNumberIndex || indexType === this.semanticInfoChain.anyTypeSymbol)) {
                var returnType = numberSignature.returnType;

                if (!returnType) {
                    returnType = this.semanticInfoChain.anyTypeSymbol;
                }

                return returnType;
            }
            // otherwise, if the object expression has a string index signature and the index expression is
            // of type Any, the String or Number primitive type or an enum type, the property access of the type of
            // that index signature
            else if (stringSignature && (isNumberIndex || indexType === this.semanticInfoChain.anyTypeSymbol || indexType === this.semanticInfoChain.stringTypeSymbol)) {
                var returnType = stringSignature.returnType;

                if (!returnType) {
                    returnType = this.semanticInfoChain.anyTypeSymbol;
                }

                return returnType;
            }
            // otherwise, if indexExpr is of type Any, the String or Number primitive type or an enum type,
            // the property access is of type Any
            else if (isNumberIndex || indexType === this.semanticInfoChain.anyTypeSymbol || indexType === this.semanticInfoChain.stringTypeSymbol) {
                var returnType = this.semanticInfoChain.anyTypeSymbol;
                return returnType;
            }
            // otherwise, the property acess is invalid and a compile-time error occurs
            else {
                context.postError(this.getUnitPath(), callEx.minChar, callEx.getLength(), DiagnosticCode.Value_of_type_0_is_not_indexable_by_type_1, [targetTypeSymbol.toString(), indexType.toString()]);
                return this.getNewErrorTypeSymbol();
            }
        }

        private getBothKindsOfIndexSignatures(enclosingType: PullTypeSymbol, context: PullTypeResolutionContext): { numericSignature: PullSignatureSymbol; stringSignature: PullSignatureSymbol } {
            var signatures = enclosingType.getIndexSignatures();

            var stringSignature: PullSignatureSymbol = null;
            var numberSignature: PullSignatureSymbol = null;
            var signature: PullSignatureSymbol = null;
            var paramSymbols: PullSymbol[];
            var paramType: PullTypeSymbol;

            for (var i = 0; i < signatures.length; i++) {
                if (stringSignature && numberSignature) {
                    break;
                }

                signature = signatures[i];
                if (!signature.isResolved) {
                    this.resolveDeclaredSymbol(signature, signature.getDeclarations()[0].getParentDecl(), context);
                }

                paramSymbols = signature.parameters;

                if (paramSymbols.length) {
                    paramType = paramSymbols[0].type;

                    if (!stringSignature && paramType === this.semanticInfoChain.stringTypeSymbol) {
                        stringSignature = signature;
                        continue;
                    }
                    else if (!numberSignature && paramType === this.semanticInfoChain.numberTypeSymbol) {
                        numberSignature = signature;
                        continue;
                    }
                }
            }

            return {
                numericSignature: numberSignature,
                stringSignature: stringSignature
            };
        }

        private resolveBinaryAdditionOperation(binaryExpression: BinaryExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {

            var lhsType = this.resolveAST(binaryExpression.operand1, false, enclosingDecl, context).type;
            var rhsType = this.resolveAST(binaryExpression.operand2, false, enclosingDecl, context).type;

            if (PullHelpers.symbolIsEnum(lhsType)) {
                lhsType = this.semanticInfoChain.numberTypeSymbol;
            }
            else if (lhsType === this.semanticInfoChain.nullTypeSymbol || lhsType === this.semanticInfoChain.undefinedTypeSymbol) {
                if (rhsType != this.semanticInfoChain.nullTypeSymbol && rhsType != this.semanticInfoChain.undefinedTypeSymbol) {
                    lhsType = rhsType;
                }
                else {
                    lhsType = this.semanticInfoChain.anyTypeSymbol;
                }
            }

            if (PullHelpers.symbolIsEnum(rhsType)) {
                rhsType = this.semanticInfoChain.numberTypeSymbol;
            }
            else if (rhsType === this.semanticInfoChain.nullTypeSymbol || rhsType === this.semanticInfoChain.undefinedTypeSymbol) {
                if (lhsType != this.semanticInfoChain.nullTypeSymbol && lhsType != this.semanticInfoChain.undefinedTypeSymbol) {
                    rhsType = lhsType;
                }
                else {
                    rhsType = this.semanticInfoChain.anyTypeSymbol;
                }
            }

            var exprType: PullTypeSymbol = null;

            if (lhsType === this.semanticInfoChain.stringTypeSymbol || rhsType === this.semanticInfoChain.stringTypeSymbol) {
                exprType = this.semanticInfoChain.stringTypeSymbol;
            }
            else if (this.isAnyOrEquivalent(lhsType) || this.isAnyOrEquivalent(rhsType)) {
                exprType = this.semanticInfoChain.anyTypeSymbol;
            }
            else if (rhsType === this.semanticInfoChain.numberTypeSymbol && lhsType === this.semanticInfoChain.numberTypeSymbol) {
                exprType = this.semanticInfoChain.numberTypeSymbol;
            }

            if (exprType) {
                if (binaryExpression.nodeType() === NodeType.AddAssignmentExpression) {
                    // Check if LHS is a valid target
                    var lhsExpression = this.resolveAST(binaryExpression.operand1, false, enclosingDecl, context);
                    if (!this.isReference(binaryExpression.operand1, lhsExpression)) {
                        context.postError(this.unitPath, binaryExpression.operand1.minChar, binaryExpression.operand1.getLength(), DiagnosticCode.Invalid_left_hand_side_of_assignment_expression, null);
                    }

                    this.checkAssignability(binaryExpression.operand1, exprType, lhsType, enclosingDecl, context);
                }
            }
            else {
                context.postError(this.unitPath, binaryExpression.operand1.minChar, binaryExpression.operand1.getLength(), DiagnosticCode.Invalid_expression_types_not_known_to_support_the_addition_operator, null);
                exprType = this.semanticInfoChain.anyTypeSymbol;
            }

            if (this.canTypeCheckAST(binaryExpression, context)) {
                this.setTypeChecked(binaryExpression, context);
            }

            return exprType;
        }

        private resolveLogicalOrExpression(binex: BinaryExpression, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            var symbol = this.getSymbolForAST(binex);
            if (!symbol) {
                symbol = this.computeLogicalOrExpressionSymbol(binex, inContextuallyTypedAssignment, enclosingDecl, context);
                this.setSymbolForAST(binex, symbol, context);
                if (this.canTypeCheckAST(binex, context)) {
                    this.setTypeChecked(binex, context);
                }
            } else if (this.canTypeCheckAST(binex, context)) {
                this.typeCheckLogicalOrExpression(binex, inContextuallyTypedAssignment, enclosingDecl, context);
            }

            return symbol;
        }

        private typeCheckLogicalOrExpression(binex: BinaryExpression, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(binex, context);

            this.resolveAST(binex.operand1, inContextuallyTypedAssignment, enclosingDecl, context);
            this.resolveAST(binex.operand2, inContextuallyTypedAssignment, enclosingDecl, context);
        }

        private computeLogicalOrExpressionSymbol(binex: BinaryExpression, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            var leftType = <PullTypeSymbol>this.resolveAST(binex.operand1, inContextuallyTypedAssignment, enclosingDecl, context).type;
            var rightType = <PullTypeSymbol>this.resolveAST(binex.operand2, inContextuallyTypedAssignment, enclosingDecl, context).type;

            if (this.isAnyOrEquivalent(leftType) || this.isAnyOrEquivalent(rightType)) {
                return this.semanticInfoChain.anyTypeSymbol;
            }
            else if (leftType === this.semanticInfoChain.booleanTypeSymbol) {
                if (rightType === this.semanticInfoChain.booleanTypeSymbol) {
                    return this.semanticInfoChain.booleanTypeSymbol;
                }
                else {
                    return this.semanticInfoChain.anyTypeSymbol;
                }
            }
            else if (leftType === this.semanticInfoChain.numberTypeSymbol) {
                if (rightType === this.semanticInfoChain.numberTypeSymbol) {
                    return this.semanticInfoChain.numberTypeSymbol;
                }
                else {
                    return this.semanticInfoChain.anyTypeSymbol;
                }
            }
            else if (leftType === this.semanticInfoChain.stringTypeSymbol) {
                if (rightType === this.semanticInfoChain.stringTypeSymbol) {
                    return this.semanticInfoChain.stringTypeSymbol;
                }
                else {
                    return this.semanticInfoChain.anyTypeSymbol;
                }
            }
            else if (this.sourceIsSubtypeOfTarget(leftType, rightType, context)) {
                return rightType;
            }
            else if (this.sourceIsSubtypeOfTarget(rightType, leftType, context)) {
                return leftType;
            }

            return this.semanticInfoChain.anyTypeSymbol;
        }

        private resolveLogicalAndExpression(binex: BinaryExpression, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(binex, context)) {
                this.setTypeChecked(binex, context);
                this.resolveAST(binex.operand1, inContextuallyTypedAssignment, enclosingDecl, context);
            }

            return this.resolveAST(binex.operand2, inContextuallyTypedAssignment, enclosingDecl, context).type;
        }

        private resolveConditionalExpression(trinex: ConditionalExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            var symbol = this.getSymbolForAST(trinex);
            if (!symbol) {
                symbol = this.computeConditionalExpressionSymbol(trinex, enclosingDecl, context);
                this.setSymbolForAST(trinex, symbol, context);
                if (this.canTypeCheckAST(trinex, context)) {
                    this.setTypeChecked(trinex, context);
                }
            } else if (this.canTypeCheckAST(trinex, context)) {
                this.typeCheckConditionalExpression(trinex, enclosingDecl, context);
            }

            return symbol;
        }

        private typeCheckConditionalExpression(trinex: ConditionalExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(trinex, context);

            this.resolveAST(trinex.operand1, false, enclosingDecl, context);
            this.resolveAST(trinex.operand2, false, enclosingDecl, context);
            this.resolveAST(trinex.operand3, false, enclosingDecl, context);
        }

        private computeConditionalExpressionSymbol(trinex: ConditionalExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(trinex, context)) {
                this.resolveAST(trinex.operand1, false, enclosingDecl, context);
            }

            var leftType = this.resolveAST(trinex.operand2, false, enclosingDecl, context).type;
            var rightType = this.resolveAST(trinex.operand3, false, enclosingDecl, context).type;

            var symbol: PullSymbol = null;
            if (this.typesAreIdentical(leftType, rightType)) {
                symbol = leftType;
            }
            else if (this.sourceIsSubtypeOfTarget(leftType, rightType, context) || this.sourceIsSubtypeOfTarget(rightType, leftType, context)) {
                var collection: IPullTypeCollection = {
                    getLength: () => { return 2; },
                    getTypeAtIndex: (index: number) => { return rightType; } // we only want the "second" type - the "first" is skipped
                };

                var bestCommonType = this.findBestCommonType(leftType, collection, context);

                if (bestCommonType) {
                    symbol = bestCommonType;
                }
            }

            if (!symbol) {
                context.postError(this.getUnitPath(), trinex.minChar, trinex.getLength(), DiagnosticCode.Type_of_conditional_expression_cannot_be_determined_Best_common_type_could_not_be_found_between_0_and_1, [leftType.toString(), rightType.toString()]);
                return this.getNewErrorTypeSymbol();
            }

            return symbol;
        }

        private resolveParenthesizedExpression(ast: ParenthesizedExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            // Note: we don't want to consider errors at a lower node to also be happening at this
            // node.  If we did that, then we'd end up reporting an error multiple times in type check.
            // First as we hit this node, then as we hit the lower node that actually produced the
            // error.
            return this.resolveAST(ast.expression, false, enclosingDecl, context);
        }

        private resolveExpressionStatement(ast: ExpressionStatement, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            // Note: we don't want to consider errors at a lower node to also be happening at this
            // node.  If we did that, then we'd end up reporting an error multiple times in type check.
            // First as we hit this node, then as we hit the lower node that actually produced the
            // error.
            return this.resolveAST(ast.expression, inContextuallyTypedAssignment, enclosingDecl, context);
        }

        public resolveInvocationExpression(callEx: InvocationExpression, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext, additionalResults?: PullAdditionalCallResolutionData): PullSymbol {
            var symbol = this.getSymbolForAST(callEx);

            if (!symbol || !symbol.isResolved) {
                if (!additionalResults) {
                    additionalResults = new PullAdditionalCallResolutionData();
                }
                symbol = this.computeInvocationExpressionSymbol(callEx, inContextuallyTypedAssignment, enclosingDecl, context, additionalResults);
                if (this.canTypeCheckAST(callEx, context)) {
                    this.setTypeChecked(callEx, context);
                }
                if (symbol != this.semanticInfoChain.anyTypeSymbol) {
                    this.setSymbolForAST(callEx, symbol, context);
                }
                this.currentUnit.setCallResolutionDataForAST(callEx, additionalResults);
            }
            else {
                if (this.canTypeCheckAST(callEx, context)) {
                    this.typeCheckInvocationExpression(callEx, inContextuallyTypedAssignment, enclosingDecl, context);
                }

                var callResolutionData = this.currentUnit.getCallResolutionDataForAST(callEx);
                if (additionalResults && (callResolutionData != additionalResults)) {
                    additionalResults.actualParametersContextTypeSymbols = callResolutionData.actualParametersContextTypeSymbols;
                    additionalResults.candidateSignature = callResolutionData.candidateSignature;
                    additionalResults.resolvedSignatures = callResolutionData.resolvedSignatures;
                    additionalResults.targetSymbol = callResolutionData.targetSymbol;
                    additionalResults.targetTypeSymbol = callResolutionData.targetTypeSymbol;
                }
            }

            return symbol;
        }

        private typeCheckInvocationExpression(callEx: InvocationExpression, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(callEx, context);
            var targetSymbol = this.resolveAST(callEx.target, inContextuallyTypedAssignment, enclosingDecl, context);
            if (targetSymbol && callEx.target.nodeType() === NodeType.SuperExpression) {
                var targetTypeSymbol = targetSymbol.type;
                if (targetTypeSymbol.isClass()) {
                    this.seenSuperConstructorCall = true;
                }
            }
            
            if (callEx.arguments) {
                var callResolutionData = this.currentUnit.getCallResolutionDataForAST(callEx);
                var isSuperCall = callEx.target.nodeType() === NodeType.SuperExpression;

                var len = callEx.arguments.members.length;
                for (var i = 0; i < len; i++) {
                    var contextualType = callResolutionData.actualParametersContextTypeSymbols[i];
                    if (contextualType) {
                        context.pushContextualType(contextualType, context.inProvisionalResolution(), null);
                    }
                    var prevIsResolvingSuperConstructorCallArgument = context.isResolvingSuperConstructorCallArgument;

                    if (isSuperCall) {
                        context.isResolvingSuperConstructorCallArgument = true;
                    }

                    this.resolveAST(callEx.arguments.members[i], contextualType != null, enclosingDecl, context);

                    if (isSuperCall) {
                        context.isResolvingSuperConstructorCallArgument = prevIsResolvingSuperConstructorCallArgument;
                    }

                    if (contextualType) {
                        context.popContextualType();
                        contextualType = null;
                    }
                }
            }
        }

        public computeInvocationExpressionSymbol(callEx: InvocationExpression, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext, additionalResults: PullAdditionalCallResolutionData): PullSymbol {
            // resolve the target
            var targetSymbol = this.resolveAST(callEx.target, inContextuallyTypedAssignment, enclosingDecl, context);
            var targetAST = this.getCallTargetErrorSpanAST(callEx);

            // don't be fooled
            //if (target === this.semanticInfoChain.anyTypeSymbol) {
            //    diagnostic = context.postError(callEx.minChar, callEx.getLength(), this.unitPath, "Invalid call expression", enclosingDecl);
            //    return this.getNewErrorTypeSymbol(diagnostic); 
            //}

            var targetTypeSymbol = targetSymbol.type;
            if (this.isAnyOrEquivalent(targetTypeSymbol)) {
                // Note: targetType is either any or an error.

                // resolve any arguments.
                this.resolveAST(callEx.arguments, inContextuallyTypedAssignment, enclosingDecl, context);

                if (callEx.typeArguments && callEx.typeArguments.members.length) {
                    // Can't invoke 'any' generically.
                    if (targetTypeSymbol === this.semanticInfoChain.anyTypeSymbol) {
                        context.postError(this.unitPath, targetAST.minChar, targetAST.getLength(), DiagnosticCode.Untyped_function_calls_may_not_accept_type_arguments, null)
                        return this.getNewErrorTypeSymbol();
                    }

                    // Note: if we get here, targetType is an error type.  In that case we don't
                    // want to report *another* error since the user will have already gotten 
                    // the first error about the target not resolving properly.
                }

                return this.semanticInfoChain.anyTypeSymbol;
            }

            var isSuperCall = false;

            if (callEx.target.nodeType() === NodeType.SuperExpression) {

                isSuperCall = true;

                if (targetTypeSymbol.isClass()) {
                    this.seenSuperConstructorCall = true;
                    targetSymbol = targetTypeSymbol.getConstructorMethod();
                    targetTypeSymbol = targetSymbol.type;
                }
                else {
                    context.postError(this.unitPath, targetAST.minChar, targetAST.getLength(), DiagnosticCode.Calls_to_super_are_only_valid_inside_a_class, null);
                    this.resolveAST(callEx.arguments, inContextuallyTypedAssignment, enclosingDecl, context);
                    // POST diagnostics
                    return this.getNewErrorTypeSymbol();
                }
            }

            var signatures = isSuperCall ? targetTypeSymbol.getConstructSignatures() : targetTypeSymbol.getCallSignatures();

            if (!signatures.length && (targetTypeSymbol.kind == PullElementKind.ConstructorType)) {
                context.postError(this.unitPath, targetAST.minChar, targetAST.getLength(), DiagnosticCode.Value_of_type_0_is_not_callable_Did_you_mean_to_include_new, [targetTypeSymbol.toString()]);
            }

            var typeArgs: PullTypeSymbol[] = null;
            var typeReplacementMap: any = null;
            var couldNotFindGenericOverload = false;
            var couldNotAssignToConstraint: boolean;
            var constraintDiagnostic: Diagnostic = null;
            var diagnostics: Diagnostic[] = [];

            // resolve the type arguments, specializing if necessary
            if (callEx.typeArguments) {

                // specialize the type arguments
                typeArgs = [];

                if (callEx.typeArguments && callEx.typeArguments.members.length) {
                    for (var i = 0; i < callEx.typeArguments.members.length; i++) {
                        var typeArg = this.resolveTypeReference(<TypeReference>callEx.typeArguments.members[i], enclosingDecl, context);
                        typeArgs[i] = context.findSpecializationForType(typeArg);
                    }
                }
            }
            else if (isSuperCall && targetTypeSymbol.isGeneric()) {
                typeArgs = targetTypeSymbol.getTypeArguments();
            }

            var triedToInferTypeArgs: boolean = false;

            // next, walk the available signatures
            // if any are generic, and we don't have type arguments, try to infer
            // otherwise, try to specialize to the type arguments above
            if (targetTypeSymbol.isGeneric()) {

                var resolvedSignatures: PullSignatureSymbol[] = [];
                var inferredTypeArgs: PullTypeSymbol[];
                var specializedSignature: PullSignatureSymbol;
                var typeParameters: PullTypeParameterSymbol[];
                var typeConstraint: PullTypeSymbol = null;
                var prevSpecializingToAny = context.specializingToAny;
                var prevSpecializing: boolean = context.isSpecializingSignatureTypeParameters;
                var beforeResolutionSignatures = signatures;

                for (var i = 0; i < signatures.length; i++) {
                    typeParameters = signatures[i].getTypeParameters();
                    couldNotAssignToConstraint = false;
                    triedToInferTypeArgs = false;

                    if (signatures[i].isGeneric() && typeParameters.length && (!signatures[i].isFixed() || typeArgs)) {
                        if (typeArgs) {
                            inferredTypeArgs = typeArgs;
                        }
                        else if (callEx.arguments) {
                            inferredTypeArgs = this.inferArgumentTypesForSignature(signatures[i], callEx.arguments, new TypeComparisonInfo(), enclosingDecl, context);
                            triedToInferTypeArgs = true;
                        }
                        else {
                            inferredTypeArgs = [];
                        }

                        // if we could infer Args, or we have type arguments, then attempt to specialize the signature
                        if (inferredTypeArgs) {

                            typeReplacementMap = {};

                            if (inferredTypeArgs.length) {

                                if (inferredTypeArgs.length != typeParameters.length) {
                                    continue;
                                }

                                for (var j = 0; j < typeParameters.length; j++) {
                                    typeReplacementMap[typeParameters[j].pullSymbolIDString] = inferredTypeArgs[j];
                                }
                                for (var j = 0; j < typeParameters.length; j++) {
                                    typeConstraint = typeParameters[j].getConstraint();

                                    // test specialization type for assignment compatibility with the constraint
                                    if (typeConstraint) {
                                        if (typeConstraint.isTypeParameter()) {
                                            for (var k = 0; k < typeParameters.length && k < inferredTypeArgs.length; k++) {
                                                if (typeParameters[k] == typeConstraint) {
                                                    typeConstraint = inferredTypeArgs[k];
                                                }
                                            }
                                        }
                                        if (typeConstraint.isTypeParameter()) {
                                            context.pushTypeSpecializationCache(typeReplacementMap);
                                            typeConstraint = specializeType(typeConstraint, null, this, enclosingDecl, context);  //<PullTypeSymbol>this.resolveDeclaredSymbol(typeConstraint, enclosingDecl, context);
                                            context.popTypeSpecializationCache();
                                        }
                                        context.isComparingSpecializedSignatures = true;
                                        if (!this.sourceIsAssignableToTarget(inferredTypeArgs[j], typeConstraint, context)) {
                                            constraintDiagnostic = new Diagnostic(this.unitPath, targetAST.minChar, targetAST.getLength(), DiagnosticCode.Type_0_does_not_satisfy_the_constraint_1_for_type_parameter_2, [inferredTypeArgs[j].toString(null, true), typeConstraint.toString(null, true), typeParameters[j].toString(null, true)]);
                                            couldNotAssignToConstraint = true;
                                        }
                                        context.isComparingSpecializedSignatures = false;

                                        if (couldNotAssignToConstraint) {
                                            break;
                                        }
                                    }
                                }
                            }
                            else {

                                // if we tried to infer type arguments but could not, this overload should not be considered to be a candidate
                                if (triedToInferTypeArgs) {

                                    if (signatures[i].isFixed()) {
                                        if (signatures[i].hasAGenericParameter) {
                                            context.specializingToAny = true;
                                        }
                                        else {
                                            resolvedSignatures[resolvedSignatures.length] = signatures[i];
                                        }
                                    }
                                    else {
                                        continue;
                                    }
                                }

                                context.specializingToAny = true;
                            }

                            if (couldNotAssignToConstraint) {
                                continue;
                            }

                            context.isSpecializingSignatureTypeParameters = true;
                            specializedSignature = specializeSignature(signatures[i], false, typeReplacementMap, inferredTypeArgs, this, enclosingDecl, context);

                            context.isSpecializingSignatureTypeParameters = prevSpecializing;
                            context.specializingToAny = prevSpecializingToAny;

                            if (specializedSignature) {
                                resolvedSignatures[resolvedSignatures.length] = specializedSignature;
                            }
                        }
                    }
                    else {
                        if (!(callEx.typeArguments && callEx.typeArguments.members.length)) {
                            resolvedSignatures[resolvedSignatures.length] = signatures[i];
                        }
                    }
                }
                // PULLTODO: Try to avoid copying here...

                if (signatures.length && !resolvedSignatures.length) {
                    couldNotFindGenericOverload = true;
                }

                signatures = resolvedSignatures;
            }

            // the target should be a function
            //if (!targetTypeSymbol.isType()) {
            //    this.log("Attempting to call a non-function symbol");
            //    return this.semanticInfoChain.anyTypeSymbol;
            //}
            var errorCondition: PullSymbol = null;

            if (!signatures.length) {
                additionalResults.targetSymbol = targetSymbol;
                additionalResults.targetTypeSymbol = targetTypeSymbol;
                additionalResults.resolvedSignatures = beforeResolutionSignatures;
                additionalResults.candidateSignature = beforeResolutionSignatures && beforeResolutionSignatures.length ? beforeResolutionSignatures[0] : null;

                additionalResults.actualParametersContextTypeSymbols = actualParametersContextTypeSymbols;

                var prevIsResolvingSuperConstructorCallArgument = context.isResolvingSuperConstructorCallArgument;
                if (isSuperCall) {
                    context.isResolvingSuperConstructorCallArgument = true;
                }
                this.resolveAST(callEx.arguments, inContextuallyTypedAssignment, enclosingDecl, context);
                if (isSuperCall) {
                    context.isResolvingSuperConstructorCallArgument = prevIsResolvingSuperConstructorCallArgument;
                }

                if (!couldNotFindGenericOverload) {

                    // if there are no call signatures, but the target is a subtype of 'Function', return 'any'
                    if (this.cachedFunctionInterfaceType() && this.sourceIsSubtypeOfTarget(targetTypeSymbol, this.cachedFunctionInterfaceType(), context)) {
                        if (callEx.typeArguments) {
                            context.postError(this.unitPath, targetAST.minChar, targetAST.getLength(), DiagnosticCode.Non_generic_functions_may_not_accept_type_arguments, null);
                        }
                        return this.semanticInfoChain.anyTypeSymbol;
                    }

                    context.postError(this.unitPath, callEx.minChar, callEx.getLength(), DiagnosticCode.Cannot_invoke_an_expression_whose_type_lacks_a_call_signature, null);
                    errorCondition = this.getNewErrorTypeSymbol();
                }
                else {
                    context.postError(this.unitPath, callEx.minChar, callEx.getLength(), DiagnosticCode.Could_not_select_overload_for_call_expression, null);
                    errorCondition = this.getNewErrorTypeSymbol();
                }

                if (constraintDiagnostic) {
                    context.postDiagnostic(constraintDiagnostic);
                }

                return errorCondition;
            }

            var prevIsResolvingSuperConstructorCallArgument = context.isResolvingSuperConstructorCallArgument;

            if (isSuperCall) {
                context.isResolvingSuperConstructorCallArgument = true;
            }

            var signature = this.resolveOverloads(callEx, signatures, enclosingDecl, callEx.typeArguments != null, context, diagnostics);
            var useBeforeResolutionSignatures = signature == null;

            if (isSuperCall) {
                context.isResolvingSuperConstructorCallArgument = prevIsResolvingSuperConstructorCallArgument;
            }

            if (!signature) {
                for (var i = 0; i < diagnostics.length; i++) {
                    context.postDiagnostic(diagnostics[i]);
                }

                context.postError(this.unitPath, targetAST.minChar, targetAST.getLength(), DiagnosticCode.Could_not_select_overload_for_call_expression, null);

                // Remember the error state
                // POST diagnostics
                errorCondition = this.getNewErrorTypeSymbol();

                if (!signatures.length) {
                    return errorCondition;
                }

                // Attempt to recover from the error condition
                // First, pick the first signature as the candidate signature
                signature = signatures[0];
            }

            if (!signature.isGeneric() && callEx.typeArguments) {
                context.postError(this.unitPath, targetAST.minChar, targetAST.getLength(), DiagnosticCode.Non_generic_functions_may_not_accept_type_arguments, null);
            }
            else if (signature.isGeneric() && callEx.typeArguments && signature.getTypeParameters() && (callEx.typeArguments.members.length > signature.getTypeParameters().length)) {
                context.postError(this.unitPath, targetAST.minChar, targetAST.getLength(), DiagnosticCode.Signature_expected_0_type_arguments_got_1_instead, [signature.getTypeParameters().length, callEx.typeArguments.members.length]);
            }

            var returnType = isSuperCall ? this.semanticInfoChain.voidTypeSymbol : signature.returnType;

            // contextually type arguments
            var actualParametersContextTypeSymbols: PullTypeSymbol[] = [];
            if (callEx.arguments) {
                var len = callEx.arguments.members.length;
                var params = signature.parameters;
                var contextualType: PullTypeSymbol = null;
                var signatureDecl = signature.getDeclarations()[0];

                for (var i = 0; i < len; i++) {
                    // account for varargs
                    if (params.length) {
                        if (i < params.length - 1 || (i < params.length && !signature.hasVarArgs)) {
                            if (typeReplacementMap) {
                                context.pushTypeSpecializationCache(typeReplacementMap);
                            }
                            this.resolveDeclaredSymbol(params[i], signatureDecl, context);
                            if (typeReplacementMap) {
                                context.popTypeSpecializationCache();
                            }
                            contextualType = params[i].type;
                        }
                        else if (signature.hasVarArgs) {
                            contextualType = params[params.length - 1].type;
                            if (contextualType.isArray()) {
                                contextualType = contextualType.getElementType();
                            }
                        }
                    }

                    if (contextualType) {
                        context.pushContextualType(contextualType, context.inProvisionalResolution(), null);
                        actualParametersContextTypeSymbols[i] = contextualType;
                    }

                    var prevIsResolvingSuperConstructorCallArgument = context.isResolvingSuperConstructorCallArgument;

                    if (isSuperCall) {
                        context.isResolvingSuperConstructorCallArgument = true;
                    }

                    this.resolveAST(callEx.arguments.members[i], contextualType != null, enclosingDecl, context);

                    if (isSuperCall) {
                        context.isResolvingSuperConstructorCallArgument = prevIsResolvingSuperConstructorCallArgument;
                    }

                    if (contextualType) {
                        context.popContextualType();
                        contextualType = null;
                    }
                }
            }

            // Store any additional resolution results if needed before we return
            additionalResults.targetSymbol = targetSymbol;
            additionalResults.targetTypeSymbol = targetTypeSymbol;
            if (useBeforeResolutionSignatures && beforeResolutionSignatures) {
                additionalResults.resolvedSignatures = beforeResolutionSignatures;
                additionalResults.candidateSignature = beforeResolutionSignatures[0];

            } else {
                additionalResults.resolvedSignatures = signatures;
                additionalResults.candidateSignature = signature;
            }
            additionalResults.actualParametersContextTypeSymbols = actualParametersContextTypeSymbols;

            if (errorCondition) {
                return errorCondition;
            }

            if (!returnType) {
                returnType = this.semanticInfoChain.anyTypeSymbol;
            }

            return returnType;
        }

        public resolveObjectCreationExpression(callEx: ObjectCreationExpression, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext, additionalResults?: PullAdditionalCallResolutionData): PullSymbol {
            var symbol = this.getSymbolForAST(callEx);

            if (!symbol || !symbol.isResolved) {
                if (!additionalResults) {
                    additionalResults = new PullAdditionalCallResolutionData();
                }
                symbol = this.computeObjectCreationExpressionSymbol(callEx, inContextuallyTypedAssignment, enclosingDecl, context, additionalResults);
                if (this.canTypeCheckAST(callEx, context)) {
                    this.setTypeChecked(callEx, context);
                }
                this.setSymbolForAST(callEx, symbol, context);
                this.currentUnit.setCallResolutionDataForAST(callEx, additionalResults);
            }
            else {
                if (this.canTypeCheckAST(callEx, context)) {
                    this.typeCheckObjectCreationExpression(callEx, inContextuallyTypedAssignment, enclosingDecl, context);
                }

                var callResolutionData = this.currentUnit.getCallResolutionDataForAST(callEx);
                if (additionalResults && (callResolutionData != additionalResults)) {
                    additionalResults.actualParametersContextTypeSymbols = callResolutionData.actualParametersContextTypeSymbols;
                    additionalResults.candidateSignature = callResolutionData.candidateSignature;
                    additionalResults.resolvedSignatures = callResolutionData.resolvedSignatures;
                    additionalResults.targetSymbol = callResolutionData.targetSymbol;
                    additionalResults.targetTypeSymbol = callResolutionData.targetTypeSymbol;
                }
            }

            return symbol;
        }

        private typeCheckObjectCreationExpression(callEx: ObjectCreationExpression, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            this.setTypeChecked(callEx, context);
            this.resolveAST(callEx.target, inContextuallyTypedAssignment, enclosingDecl, context);
            var callResolutionData = this.currentUnit.getCallResolutionDataForAST(callEx);
            if (callEx.arguments) {
                var callResolutionData = this.currentUnit.getCallResolutionDataForAST(callEx);
                var len = callEx.arguments.members.length;

                for (var i = 0; i < len; i++) {
                    var contextualType = callResolutionData.actualParametersContextTypeSymbols[i];
                    if (contextualType) {
                        context.pushContextualType(contextualType, context.inProvisionalResolution(), null);
                    }

                    this.resolveAST(callEx.arguments.members[i], contextualType != null, enclosingDecl, context);

                    if (contextualType) {
                        context.popContextualType();
                        contextualType = null;
                    }
                }
            }
        }

        public computeObjectCreationExpressionSymbol(callEx: ObjectCreationExpression, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext, additionalResults: PullAdditionalCallResolutionData): PullSymbol {
            var returnType: PullTypeSymbol = null;

            // resolve the target
            var targetSymbol = this.resolveAST(callEx.target, inContextuallyTypedAssignment, enclosingDecl, context);
            var targetTypeSymbol = targetSymbol.isType() ? <PullTypeSymbol>targetSymbol : targetSymbol.type;

            var targetAST = this.getCallTargetErrorSpanAST(callEx);

            var constructSignatures = targetTypeSymbol.getConstructSignatures();

            var typeArgs: PullTypeSymbol[] = null;
            var typeReplacementMap: any = null;
            var usedCallSignaturesInstead = false;
            var couldNotAssignToConstraint: boolean;
            var constraintDiagnostic: Diagnostic = null;
            var diagnostics: Diagnostic[] = [];

            if (this.isAnyOrEquivalent(targetTypeSymbol)) {
                // resolve any arguments
                this.resolveAST(callEx.arguments, inContextuallyTypedAssignment, enclosingDecl, context);
                return targetTypeSymbol;
            }

            if (!constructSignatures.length) {
                constructSignatures = targetTypeSymbol.getCallSignatures();
                usedCallSignaturesInstead = true;

                // if noImplicitAny flag is set to be true, report an error
                if (this.compilationSettings.noImplicitAny) {
                    context.postError(this.unitPath, callEx.minChar, callEx.getLength(),
                        DiagnosticCode.new_expression_which_lacks_a_constructor_signature_implicitly_has_an_any_type, null);
                }
            }

            if (constructSignatures.length) {
                // resolve the type arguments, specializing if necessary
                if (callEx.typeArguments) {
                    // specialize the type arguments
                    typeArgs = [];

                    if (callEx.typeArguments && callEx.typeArguments.members.length) {
                        for (var i = 0; i < callEx.typeArguments.members.length; i++) {
                            var typeArg = this.resolveTypeReference(<TypeReference>callEx.typeArguments.members[i], enclosingDecl, context);
                            typeArgs[i] = context.findSpecializationForType(typeArg);
                        }
                    }
                }

                // next, walk the available signatures
                // if any are generic, and we don't have type arguments, try to infer
                // otherwise, try to specialize to the type arguments above
                if (targetTypeSymbol.isGeneric()) {
                    var resolvedSignatures: PullSignatureSymbol[] = [];
                    var inferredTypeArgs: PullTypeSymbol[];
                    var specializedSignature: PullSignatureSymbol;
                    var typeParameters: PullTypeParameterSymbol[];
                    var typeConstraint: PullTypeSymbol = null;
                    var prevSpecializingToAny = context.specializingToAny;
                    var prevIsSpecializing = context.isSpecializingSignatureTypeParameters = true;
                    var triedToInferTypeArgs: boolean;

                    for (var i = 0; i < constructSignatures.length; i++) {
                        couldNotAssignToConstraint = false;

                        if (constructSignatures[i].isGeneric() && (!constructSignatures[i].isFixed() || typeArgs)) {
                            if (typeArgs) {
                                inferredTypeArgs = typeArgs;
                            }
                            else if (callEx.arguments) {
                                inferredTypeArgs = this.inferArgumentTypesForSignature(constructSignatures[i], callEx.arguments, new TypeComparisonInfo(), enclosingDecl, context);
                                triedToInferTypeArgs = true;
                            }
                            else {
                                inferredTypeArgs = [];
                            }

                            // if we could infer Args, or we have type arguments, then attempt to specialize the signature
                            if (inferredTypeArgs) {
                                typeParameters = constructSignatures[i].getTypeParameters();

                                typeReplacementMap = {};

                                if (inferredTypeArgs.length) {

                                    if (inferredTypeArgs.length < typeParameters.length) {
                                        continue;
                                    }

                                    for (var j = 0; j < typeParameters.length; j++) {
                                        typeReplacementMap[typeParameters[j].pullSymbolIDString] = inferredTypeArgs[j];
                                    }
                                    for (var j = 0; j < typeParameters.length; j++) {
                                        typeConstraint = typeParameters[j].getConstraint();

                                        // test specialization type for assignment compatibility with the constraint
                                        if (typeConstraint) {
                                            if (typeConstraint.isTypeParameter()) {
                                                for (var k = 0; k < typeParameters.length && k < inferredTypeArgs.length; k++) {
                                                    if (typeParameters[k] == typeConstraint) {
                                                        typeConstraint = inferredTypeArgs[k];
                                                    }
                                                }
                                            }
                                            if (typeConstraint.isTypeParameter()) {
                                                context.pushTypeSpecializationCache(typeReplacementMap);
                                                typeConstraint = specializeType(typeConstraint, null, this, enclosingDecl, context);
                                                context.popTypeSpecializationCache();
                                            }

                                            context.isComparingSpecializedSignatures = true;
                                            if (!this.sourceIsAssignableToTarget(inferredTypeArgs[j], typeConstraint, context)) {
                                                constraintDiagnostic = new Diagnostic(this.unitPath, targetAST.minChar, targetAST.getLength(), DiagnosticCode.Type_0_does_not_satisfy_the_constraint_1_for_type_parameter_2, [inferredTypeArgs[j].toString(null, true), typeConstraint.toString(null, true), typeParameters[j].toString(null, true)]);
                                                couldNotAssignToConstraint = true;
                                            }
                                            context.isComparingSpecializedSignatures = false;

                                            if (couldNotAssignToConstraint) {
                                                break;
                                            }

                                        }
                                    }
                                }
                                else {

                                    if (triedToInferTypeArgs) {

                                        if (constructSignatures[i].isFixed()) {
                                            if (!constructSignatures[i].hasAGenericParameter) {
                                                resolvedSignatures[resolvedSignatures.length] = constructSignatures[i];
                                            }
                                        }
                                        else {
                                            continue;
                                        }
                                    } else {
                                        context.specializingToAny = true;
                                    }
                                }

                                if (couldNotAssignToConstraint) {
                                    continue;
                                }

                                context.isSpecializingSignatureTypeParameters = true;
                                specializedSignature = specializeSignature(constructSignatures[i], false, typeReplacementMap, inferredTypeArgs, this, enclosingDecl, context);

                                context.specializingToAny = prevSpecializingToAny;
                                context.isSpecializingSignatureTypeParameters = prevIsSpecializing;

                                if (specializedSignature) {
                                    resolvedSignatures[resolvedSignatures.length] = specializedSignature;
                                }
                            }
                        }
                        else {
                            if (!(callEx.typeArguments && callEx.typeArguments.members.length)) {
                                resolvedSignatures[resolvedSignatures.length] = constructSignatures[i];
                            }
                        }
                    }

                    // PULLTODO: Try to avoid copying here...
                    constructSignatures = resolvedSignatures;
                }

                // the target should be a function
                //if (!targetSymbol.isType()) {
                //    this.log("Attempting to call a non-function symbol");
                //    return this.semanticInfoChain.anyTypeSymbol;
                //}

                var signature = this.resolveOverloads(callEx, constructSignatures, enclosingDecl, callEx.typeArguments != null, context, diagnostics);

                // Store any additional resolution results if needed before we return
                additionalResults.targetSymbol = targetSymbol;
                additionalResults.targetTypeSymbol = targetTypeSymbol;
                additionalResults.resolvedSignatures = constructSignatures;
                additionalResults.candidateSignature = signature;
                additionalResults.actualParametersContextTypeSymbols = [];

                if (!constructSignatures.length) {

                    if (constraintDiagnostic) {
                        context.postDiagnostic(constraintDiagnostic);
                    }

                    return this.getNewErrorTypeSymbol();
                }

                var errorCondition: PullSymbol = null;

                // if we haven't been able to choose an overload, default to the first one
                if (!signature) {

                    for (var i = 0; i < diagnostics.length; i++) {
                        context.postDiagnostic(diagnostics[i]);
                    }

                    context.postError(this.unitPath, targetAST.minChar, targetAST.getLength(), DiagnosticCode.Could_not_select_overload_for_new_expression, null);

                    // Remember the error
                    errorCondition = this.getNewErrorTypeSymbol();

                    if (!constructSignatures.length) {
                        // POST diagnostics
                        return errorCondition;
                    }

                    // First, pick the first signature as the candidate signature
                    signature = constructSignatures[0];
                }

                if (signature.isGeneric() && callEx.typeArguments && signature.getTypeParameters() && (callEx.typeArguments.members.length > signature.getTypeParameters().length)) {
                    context.postError(this.unitPath, targetAST.minChar, targetAST.getLength(), DiagnosticCode.Signature_expected_0_type_arguments_got_1_instead, [signature.getTypeParameters().length, callEx.typeArguments.members.length]);
                }

                returnType = signature.returnType;

                // if it's a default constructor, and we have a type argument, we need to specialize
                if (returnType && !signature.isGeneric() && returnType.isGeneric() && !returnType.getIsSpecialized()) {
                    if (typeArgs && typeArgs.length) {
                        returnType = specializeType(returnType, typeArgs, this, enclosingDecl, context);
                    }
                    else {
                        returnType = this.specializeTypeToAny(returnType, enclosingDecl, context);
                    }
                }

                if (usedCallSignaturesInstead) {
                    if (returnType != this.semanticInfoChain.voidTypeSymbol) {
                        context.postError(this.unitPath, targetAST.minChar, targetAST.getLength(), DiagnosticCode.Call_signatures_used_in_a_new_expression_must_have_a_void_return_type, null);
                        // POST diagnostics
                        return this.getNewErrorTypeSymbol();
                    }
                    else {
                        returnType = this.semanticInfoChain.anyTypeSymbol;
                    }
                }

                if (!returnType) {
                    returnType = signature.returnType;

                    if (!returnType) {
                        returnType = targetTypeSymbol;
                    }
                }

                // contextually type arguments
                var actualParametersContextTypeSymbols: PullTypeSymbol[] = [];
                if (callEx.arguments) {
                    var len = callEx.arguments.members.length;
                    var params = signature.parameters;
                    var contextualType: PullTypeSymbol = null;
                    var signatureDecl = signature.getDeclarations()[0];

                    for (var i = 0; i < len; i++) {

                        if (params.length) {
                            if (i < params.length - 1 || (i < params.length && !signature.hasVarArgs)) {
                                if (typeReplacementMap) {
                                    context.pushTypeSpecializationCache(typeReplacementMap);
                                }
                                this.resolveDeclaredSymbol(params[i], signatureDecl, context);
                                if (typeReplacementMap) {
                                    context.popTypeSpecializationCache();
                                }
                                contextualType = params[i].type;
                            }
                            else if (signature.hasVarArgs) {
                                contextualType = params[params.length - 1].type;
                                if (contextualType.isArray()) {
                                    contextualType = contextualType.getElementType();
                                }
                            }
                        }

                        if (contextualType) {
                            context.pushContextualType(contextualType, context.inProvisionalResolution(), null);
                            actualParametersContextTypeSymbols[i] = contextualType;
                        }

                        this.resolveAST(callEx.arguments.members[i], contextualType != null, enclosingDecl, context);

                        if (contextualType) {
                            context.popContextualType();
                            contextualType = null;
                        }
                    }
                }

                // Store any additional resolution results if needed before we return
                additionalResults.targetSymbol = targetSymbol;
                additionalResults.targetTypeSymbol = targetTypeSymbol;
                additionalResults.resolvedSignatures = constructSignatures;
                additionalResults.candidateSignature = signature;
                additionalResults.actualParametersContextTypeSymbols = actualParametersContextTypeSymbols;

                if (errorCondition) {
                    // POST diagnostics
                    return errorCondition;
                }

                if (!returnType) {
                    returnType = this.semanticInfoChain.anyTypeSymbol;
                }

                return returnType
            } else {
                this.resolveAST(callEx.arguments, inContextuallyTypedAssignment, enclosingDecl, context);
            }

            context.postError(this.unitPath, targetAST.minChar, targetAST.getLength(), DiagnosticCode.Invalid_new_expression, null);

            // POST diagnostics
            return this.getNewErrorTypeSymbol();
        }

        public resolveTypeAssertionExpression(assertionExpression: UnaryExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullTypeSymbol {
            var typeAssertionType = <PullTypeSymbol>this.getSymbolForAST(assertionExpression);
            var canTypeCheckAST = this.canTypeCheckAST(assertionExpression, context);
            if (!typeAssertionType) {
                typeAssertionType = this.resolveAST(assertionExpression.castTerm, false, enclosingDecl, context).type;
                this.setSymbolForAST(assertionExpression, typeAssertionType, context);
            } else if (canTypeCheckAST) {
                this.resolveAST(assertionExpression.castTerm, false, enclosingDecl, context);
            }

            if (canTypeCheckAST) {
                if (typeAssertionType.isError()) {
                    var symbolName = (<PullErrorTypeSymbol>typeAssertionType).name;
                    context.postError(this.unitPath, assertionExpression.minChar, assertionExpression.getLength(), DiagnosticCode.Could_not_find_symbol_0, [symbolName]);
                }

                context.pushContextualType(typeAssertionType, context.inProvisionalResolution(), null);
                var exprType = this.resolveAST(assertionExpression.operand, true, enclosingDecl, context).type;
                context.popContextualType();

                if (!exprType.isResolved) {
                    this.resolveDeclaredSymbol(exprType, enclosingDecl, context);
                }

                var comparisonInfo = new TypeComparisonInfo();

                var isAssignable = this.sourceIsAssignableToTarget(typeAssertionType, exprType, context, comparisonInfo) ||
                    this.sourceIsAssignableToTarget(exprType, typeAssertionType, context, comparisonInfo);

                if (!isAssignable) {
                    var message: string;
                    if (comparisonInfo.message) {
                        context.postError(this.unitPath, assertionExpression.minChar, assertionExpression.getLength(), DiagnosticCode.Cannot_convert_0_to_1_NL_2, [exprType.toString(), typeAssertionType.toString(), comparisonInfo.message]);
                    } else {
                        context.postError(this.unitPath, assertionExpression.minChar, assertionExpression.getLength(), DiagnosticCode.Cannot_convert_0_to_1, [exprType.toString(), typeAssertionType.toString()]);
                    }
                }
            }

            return typeAssertionType;
        }

        private resolveAssignmentStatement(binaryExpression: BinaryExpression, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {

            var leftExpr = this.resolveAST(binaryExpression.operand1, false, enclosingDecl, context);
            var leftType = leftExpr.type;

            context.pushContextualType(leftType, context.inProvisionalResolution(), null);
            var rightType = this.resolveAST(binaryExpression.operand2, true, enclosingDecl, context).type;
            context.popContextualType();

            rightType = this.getInstanceTypeForAssignment(binaryExpression.operand1, rightType, enclosingDecl, context);

            // Check if LHS is a valid target
            if (this.canTypeCheckAST(binaryExpression, context)) {
                this.setTypeChecked(binaryExpression, context);
                if (!this.isReference(binaryExpression.operand1, leftExpr)) {
                    context.postError(this.unitPath, binaryExpression.operand1.minChar, binaryExpression.operand1.getLength(), DiagnosticCode.Invalid_left_hand_side_of_assignment_expression, null);
                }
                else {
                    this.checkAssignability(binaryExpression.operand1, rightType, leftType, enclosingDecl, context);
                }
            }
            return rightType;
        }

        private computeAssignmentStatementSymbol(binex: BinaryExpression, inContextuallyTypedAssignment: boolean, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSymbol {
            var leftType = this.resolveAST(binex.operand1, inContextuallyTypedAssignment, enclosingDecl, context).type;

            context.pushContextualType(leftType, context.inProvisionalResolution(), null);
            this.resolveAST(binex.operand2, true, enclosingDecl, context);
            context.popContextualType();

            return leftType;
        }

        private getInstanceTypeForAssignment(lhs: AST, type: PullTypeSymbol, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullTypeSymbol {
            var typeToReturn = type;
            if (typeToReturn && typeToReturn.isAlias()) {
                typeToReturn = (<PullTypeAliasSymbol>typeToReturn).getExportAssignedTypeSymbol();
            }

            if (typeToReturn && typeToReturn.isContainer() && !typeToReturn.isEnum()) {
                var instanceTypeSymbol = (<PullContainerSymbol>typeToReturn).getInstanceType();

                if (!instanceTypeSymbol) {
                    context.postError(this.unitPath, lhs.minChar, lhs.getLength(), DiagnosticCode.Tried_to_set_variable_type_to_uninitialized_module_type_0, [type.toString()]);
                    typeToReturn = null;
                }
                else {
                    typeToReturn = instanceTypeSymbol;
                }
            }

            return typeToReturn;
        }

        // type relationships

        private mergeOrdered(a: PullTypeSymbol, b: PullTypeSymbol, context: PullTypeResolutionContext, comparisonInfo?: TypeComparisonInfo): PullTypeSymbol {
            if (this.isAnyOrEquivalent(a) || this.isAnyOrEquivalent(b)) {
                return this.semanticInfoChain.anyTypeSymbol;
            }
            else if (a === b) {
                return a;
            }
            else if ((b === this.semanticInfoChain.nullTypeSymbol) && a != this.semanticInfoChain.nullTypeSymbol) {
                return a;
            }
            else if ((a === this.semanticInfoChain.nullTypeSymbol) && (b != this.semanticInfoChain.nullTypeSymbol)) {
                return b;
            }
            else if ((a === this.semanticInfoChain.voidTypeSymbol) && (b === this.semanticInfoChain.voidTypeSymbol || b === this.semanticInfoChain.undefinedTypeSymbol || b === this.semanticInfoChain.nullTypeSymbol)) {
                return a;
            }
            else if ((a === this.semanticInfoChain.voidTypeSymbol) && (b === this.semanticInfoChain.anyTypeSymbol)) {
                return b;
            }
            else if ((b === this.semanticInfoChain.undefinedTypeSymbol) && a != this.semanticInfoChain.voidTypeSymbol) {
                return a;
            }
            else if ((a === this.semanticInfoChain.undefinedTypeSymbol) && (b != this.semanticInfoChain.undefinedTypeSymbol)) {
                return b;
            }
            else if (a.isTypeParameter() && !b.isTypeParameter()) {
                return b;
            }
            else if (!a.isTypeParameter() && b.isTypeParameter()) {
                return a;
            }
            else if (a.isArray() && b.isArray()) {
                if (a.getElementType() === b.getElementType()) {
                    return a;
                }
                else {
                    var mergedET = this.mergeOrdered(a.getElementType(), b.getElementType(), context, comparisonInfo);
                    if (mergedET) {
                        var mergedArrayType = mergedET.getArrayType();

                        if (!mergedArrayType) {
                            mergedArrayType = specializeType(this.cachedArrayInterfaceType(), [mergedET], this, this.cachedArrayInterfaceType().getDeclarations()[0], context);
                        }

                        return mergedArrayType;
                    }
                }
            }
            else if (this.sourceIsSubtypeOfTarget(a, b, context, comparisonInfo)) {
                return b;
            }
            else if (this.sourceIsSubtypeOfTarget(b, a, context, comparisonInfo)) {
                return a;
            }

            return null;
        }

        public widenType(type: PullTypeSymbol, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullTypeSymbol {
            if (type === this.semanticInfoChain.undefinedTypeSymbol ||
                type === this.semanticInfoChain.nullTypeSymbol ||
                type.isError()) {

                return this.semanticInfoChain.anyTypeSymbol;
            }

            if (type.isArray()) {
                var elementType = this.widenType(type.getElementType(), enclosingDecl, context);

                var arraySymbol: PullTypeSymbol = elementType.getArrayType();

                // otherwise, create a new array symbol
                if (!arraySymbol) {
                    // for each member in the array interface symbol, substitute in the the typeDecl symbol for "_element"

                    if (!this.cachedArrayInterfaceType().isResolved) {
                        this.resolveDeclaredSymbol(this.cachedArrayInterfaceType(), enclosingDecl, context);
                    }

                    arraySymbol = specializeType(this.cachedArrayInterfaceType(), [elementType], this, this.cachedArrayInterfaceType().getDeclarations()[0], context);

                    if (!arraySymbol) {
                        arraySymbol = this.semanticInfoChain.anyTypeSymbol;
                    }
                }

                return arraySymbol;
            }

            return type;
        }

        private isNullOrUndefinedType(type: PullTypeSymbol) {
            return type === this.semanticInfoChain.nullTypeSymbol ||
                type === this.semanticInfoChain.undefinedTypeSymbol;
        }

        private canApplyContextualType(type: PullTypeSymbol) {

            if (!type) {
                return true;
            }

            var kind = type.kind;

            if ((kind & PullElementKind.ObjectType) != 0) {
                return true;
            }
            if ((kind & PullElementKind.Interface) != 0) {
                return true;
            }
            else if ((kind & PullElementKind.SomeFunction) != 0) {
                return this.canApplyContextualTypeToFunction(type, <FunctionDeclaration>this.semanticInfoChain.getASTForDecl(type.getDeclarations[0]), true);
            }
            else if ((kind & PullElementKind.Array) != 0) {
                return true;
            }
            else if (type == this.semanticInfoChain.anyTypeSymbol || kind != PullElementKind.Primitive) {
                return true;
            }

            return false;
        }

        public findBestCommonType(initialType: PullTypeSymbol, collection: IPullTypeCollection, context: PullTypeResolutionContext, comparisonInfo?: TypeComparisonInfo) {
            var len = collection.getLength();
            var nlastChecked = 0;
            var bestCommonType = initialType;

            // it's important that we set the convergence type here, and not in the loop,
            // since the first element considered may be the contextual type
            var convergenceType: PullTypeSymbol = bestCommonType;

            while (nlastChecked < len) {

                for (var i = 0; i < len; i++) {

                    // no use in comparing a type against itself
                    if (i === nlastChecked) {
                        continue;
                    }

                    if (convergenceType && (bestCommonType = this.mergeOrdered(convergenceType, collection.getTypeAtIndex(i), context, comparisonInfo))) {
                        convergenceType = bestCommonType;
                    }

                    if (bestCommonType === null || this.isAnyOrEquivalent(bestCommonType)) {
                        break;
                    }
                }

                // use the type if we've agreed upon it
                if (convergenceType && bestCommonType) {
                    break;
                }

                nlastChecked++;
                if (nlastChecked < len) {
                    convergenceType = collection.getTypeAtIndex(nlastChecked);
                }
            }

            if (!bestCommonType) {
                // if no best common type can be determined, use "{}"
                var emptyTypeDecl = new PullDecl("{}", "{}", PullElementKind.ObjectType, PullElementFlags.None, new TextSpan(0, 0), this.currentUnit.getPath());
                var emptyType = new PullTypeSymbol("{}", PullElementKind.ObjectType);

                emptyTypeDecl.setSymbol(emptyType);
                emptyType.addDeclaration(emptyTypeDecl);

                bestCommonType = emptyType;
            }

            return bestCommonType;
        }

        // Type Identity

        public typesAreIdentical(t1: PullTypeSymbol, t2: PullTypeSymbol, val?: AST) {

            // This clause will cover both primitive types (since the type objects are shared),
            // as well as shared brands
            if (t1 === t2) {
                return true;
            }

            if (!t1 || !t2) {
                return false;
            }

            if (val && t1.isPrimitive() && (<PullPrimitiveTypeSymbol>t1).isStringConstant() && t2 === this.semanticInfoChain.stringTypeSymbol) {
                return (val.nodeType() === NodeType.StringLiteral) && (stripStartAndEndQuotes((<StringLiteral>val).actualText) === stripStartAndEndQuotes(t1.name));
            }

            if (val && t2.isPrimitive() && (<PullPrimitiveTypeSymbol>t2).isStringConstant() && t2 === this.semanticInfoChain.stringTypeSymbol) {
                return (val.nodeType() === NodeType.StringLiteral) && (stripStartAndEndQuotes((<StringLiteral>val).actualText) === stripStartAndEndQuotes(t2.name));
            }

            if (t1.isPrimitive() && (<PullPrimitiveTypeSymbol>t1).isStringConstant() && t2.isPrimitive() && (<PullPrimitiveTypeSymbol>t2).isStringConstant()) {
                // Both are string constants
                return TypeScript.stripStartAndEndQuotes(t1.name) === TypeScript.stripStartAndEndQuotes(t2.name);
            }

            if (t1.isPrimitive() || t2.isPrimitive()) {
                return false;
            }

            if (t1.isError() && t2.isError()) {
                return true;
            }

            if (t1.isTypeParameter()) {

                if (!t2.isTypeParameter()) {
                    return false;
                }

                // We compare parent declarations instead of container symbols because type parameter symbols are shared
                // accross overload groups
                var t1ParentDeclaration = t1.getDeclarations()[0].getParentDecl();
                var t2ParentDeclaration = t2.getDeclarations()[0].getParentDecl();

                if (t1ParentDeclaration === t2ParentDeclaration) {
                    return this.symbolsShareDeclaration(t1, t2);
                }
                else {
                    return false;
                }
            }

            var comboId = t2.pullSymbolIDString + "#" + t1.pullSymbolIDString;

            if (this.identicalCache[comboId] != undefined) {
                return true;
            }

            // If one is an enum, and they're not the same type, they're not identical
            if ((t1.kind & PullElementKind.Enum) || (t2.kind & PullElementKind.Enum)) {
                return t1.getAssociatedContainerType() === t2 || t2.getAssociatedContainerType() === t1;
            }

            if (t1.isArray() || t2.isArray()) {
                if (!(t1.isArray() && t2.isArray())) {
                    return false;
                }
                this.identicalCache[comboId] = false;
                var ret = this.typesAreIdentical(t1.getElementType(), t2.getElementType());
                if (ret) {
                    this.identicalCache[comboId] = true;
                }
                else {
                    this.identicalCache[comboId] = undefined;
                }

                return ret;
            }

            if (t1.isPrimitive() != t2.isPrimitive()) {
                return false;
            }

            this.identicalCache[comboId] = false;

            // properties are identical in name, optionality, and type
            if (t1.hasMembers() && t2.hasMembers()) {
                var t1Members = t1.getMembers();
                var t2Members = t2.getMembers();

                if (t1Members.length != t2Members.length) {
                    this.identicalCache[comboId] = undefined;
                    return false;
                }

                var t1MemberSymbol: PullSymbol = null;
                var t2MemberSymbol: PullSymbol = null;

                var t1MemberType: PullTypeSymbol = null;
                var t2MemberType: PullTypeSymbol = null;

                for (var iMember = 0; iMember < t1Members.length; iMember++) {

                    t1MemberSymbol = t1Members[iMember];
                    t2MemberSymbol = this.getMemberSymbol(t1MemberSymbol.name, PullElementKind.SomeValue, t2);

                    if (!t2MemberSymbol || (t1MemberSymbol.isOptional != t2MemberSymbol.isOptional)) {
                        this.identicalCache[comboId] = undefined;
                        return false;
                    }

                    t1MemberType = t1MemberSymbol.type;
                    t2MemberType = t2MemberSymbol.type;

                    // catch the mutually recursive or cached cases
                    if (t1MemberType && t2MemberType && (this.identicalCache[t2MemberType.pullSymbolIDString + "#" + t1MemberType.pullSymbolIDString] != undefined)) {
                        continue;
                    }

                    if (!this.typesAreIdentical(t1MemberType, t2MemberType)) {
                        this.identicalCache[comboId] = undefined;
                        return false;
                    }
                }
            }
            else if (t1.hasMembers() || t2.hasMembers()) {
                this.identicalCache[comboId] = undefined;
                return false;
            }

            var t1CallSigs = t1.getCallSignatures();
            var t2CallSigs = t2.getCallSignatures();

            var t1ConstructSigs = t1.getConstructSignatures();
            var t2ConstructSigs = t2.getConstructSignatures();

            var t1IndexSigs = t1.getIndexSignatures();
            var t2IndexSigs = t2.getIndexSignatures();

            if (!this.signatureGroupsAreIdentical(t1CallSigs, t2CallSigs)) {
                this.identicalCache[comboId] = undefined;
                return false;
            }

            if (!this.signatureGroupsAreIdentical(t1ConstructSigs, t2ConstructSigs)) {
                this.identicalCache[comboId] = undefined;
                return false;
            }

            if (!this.signatureGroupsAreIdentical(t1IndexSigs, t2IndexSigs)) {
                this.identicalCache[comboId] = undefined;
                return false;
            }

            this.identicalCache[comboId] = true;
            return true;
        }

        private signatureGroupsAreIdentical(sg1: PullSignatureSymbol[], sg2: PullSignatureSymbol[]) {

            // covers the null case
            if (sg1 === sg2) {
                return true;
            }

            // covers the mixed-null case
            if (!sg1 || !sg2) {
                return false;
            }

            if (sg1.length != sg2.length) {
                return false;
            }

            var sig1: PullSignatureSymbol = null;
            var sig2: PullSignatureSymbol = null;
            var sigsMatch = false;

            // The signatures in the signature group may not be ordered...
            // REVIEW: Should definition signatures be required to be identical as well?
            for (var iSig1 = 0; iSig1 < sg1.length; iSig1++) {
                sig1 = sg1[iSig1];

                for (var iSig2 = 0; iSig2 < sg2.length; iSig2++) {
                    sig2 = sg2[iSig2];

                    if (this.signaturesAreIdentical(sig1, sig2)) {
                        sigsMatch = true;
                        break;
                    }
                }

                if (sigsMatch) {
                    sigsMatch = false;
                    continue;
                }

                // no match found for a specific signature
                return false;
            }

            return true;
        }

        public signaturesAreIdentical(s1: PullSignatureSymbol, s2: PullSignatureSymbol, includingReturnType = true) {

            if (s1.hasVarArgs != s2.hasVarArgs) {
                return false;
            }

            if (s1.nonOptionalParamCount != s2.nonOptionalParamCount) {
                return false;
            }

            if (!!(s1.typeParameters && s1.typeParameters.length) != !!(s2.typeParameters && s2.typeParameters.length)) {
                return false;
            }

            if (s1.typeParameters && s2.typeParameters && (s1.typeParameters.length != s2.typeParameters.length)) {
                return false;
            }

            var s1Params = s1.parameters;
            var s2Params = s2.parameters;

            if (s1Params.length != s2Params.length) {
                return false;
            }

            if (includingReturnType && !this.typesAreIdentical(s1.returnType, s2.returnType)) {
                return false;
            }

            for (var iParam = 0; iParam < s1Params.length; iParam++) {
                if (!this.typesAreIdentical(s1Params[iParam].type, s2Params[iParam].type)) {
                    return false;
                }
            }

            return true;
        }

        // Assignment Compatibility and Subtyping

        public substituteUpperBoundForType(type: PullTypeSymbol) {
            if (!type || !type.isTypeParameter()) {
                return type;
            }

            var constraint = (<PullTypeParameterSymbol>type).getConstraint();

            if (constraint) {
                return this.substituteUpperBoundForType(constraint);
            }

            return type;
        }

        private symbolsShareDeclaration(symbol1: PullSymbol, symbol2: PullSymbol) {
            var decls1 = symbol1.getDeclarations();
            var decls2 = symbol2.getDeclarations();

            if (decls1.length && decls2.length) {
                return decls1[0].isEqual(decls2[0]);
            }

            return false;
        }

        private sourceExtendsTarget(source: PullTypeSymbol, target: PullTypeSymbol, context: PullTypeResolutionContext) {
            // if one is generic and the other is not, we'll need to do a member-wise comparison
            if (source.isGeneric() != target.isGeneric()) {
                return false;
            }

            if (source.hasBase(target)) {
                return true;
            }

            // We need to jump through hoops here because, if we're type checking, we may attempt to compare a child type against
            // its parent before we've finished resolving either.  (Say, through a recursive resolution of the return type of a
            // child type's method)
            if (context.isInBaseTypeResolution() &&
                (source.kind & (PullElementKind.Interface | PullElementKind.Class)) &&
                (target.kind & (PullElementKind.Interface | PullElementKind.Class))) {
                var sourceDecls = source.getDeclarations();
                var sourceAST: TypeDeclaration = null;
                var extendsSymbol: PullTypeSymbol = null;
                var extendsList: ASTList = null;

                for (var i = 0; i < sourceDecls.length; i++) {
                    sourceAST = <TypeDeclaration>this.semanticInfoChain.getASTForDecl(sourceDecls[i]);
                    extendsList = sourceAST.extendsList;

                    if (extendsList && extendsList.members && extendsList.members.length) {
                        for (var j = 0; j < extendsList.members.length; j++) {
                            extendsSymbol = <PullTypeSymbol>this.semanticInfoChain.getSymbolForAST(extendsList.members[j], sourceDecls[i].getScriptName());

                            if (extendsSymbol && (extendsSymbol == target || this.sourceExtendsTarget(extendsSymbol, target, context))) {
                                return true;
                            }
                        }
                    }
                }

                return false;
            }
        }

        public sourceIsSubtypeOfTarget(source: PullTypeSymbol, target: PullTypeSymbol, context: PullTypeResolutionContext, comparisonInfo?: TypeComparisonInfo) {
            return this.sourceIsRelatableToTarget(source, target, false, this.subtypeCache, context, comparisonInfo);
        }

        public sourceMembersAreSubtypeOfTargetMembers(source: PullTypeSymbol, target: PullTypeSymbol, context: PullTypeResolutionContext, comparisonInfo?: TypeComparisonInfo) {
            return this.sourceMembersAreRelatableToTargetMembers(source, target, false, this.subtypeCache, context, comparisonInfo);
        }

        public sourcePropertyIsSubtypeOfTargetProperty(source: PullTypeSymbol, target: PullTypeSymbol,
            sourceProp: PullSymbol, targetProp: PullSymbol, context: PullTypeResolutionContext,
            comparisonInfo?: TypeComparisonInfo) {
            return this.sourcePropertyIsRelatableToTargetProperty(source, target, sourceProp, targetProp,
                false, this.subtypeCache, context, comparisonInfo);
        }

        public sourceCallSignaturesAreSubtypeOfTargetCallSignatures(source: PullTypeSymbol, target: PullTypeSymbol,
            context: PullTypeResolutionContext, comparisonInfo?: TypeComparisonInfo) {
            return this.sourceCallSignaturesAreRelatableToTargetCallSignatures(source, target, false, this.subtypeCache, context, comparisonInfo);
        }

        public sourceConstructSignaturesAreSubtypeOfTargetConstructSignatures(source: PullTypeSymbol, target: PullTypeSymbol,
            context: PullTypeResolutionContext, comparisonInfo?: TypeComparisonInfo) {
            return this.sourceConstructSignaturesAreRelatableToTargetConstructSignatures(source, target, false, this.subtypeCache, context, comparisonInfo);
        }

        public sourceIndexSignaturesAreSubtypeOfTargetIndexSignatures(source: PullTypeSymbol, target: PullTypeSymbol,
            context: PullTypeResolutionContext, comparisonInfo?: TypeComparisonInfo) {
            return this.sourceIndexSignaturesAreRelatableToTargetIndexSignatures(source, target, false, this.subtypeCache, context, comparisonInfo);
        }

        public typeIsSubtypeOfFunction(source: PullTypeSymbol, context: PullTypeResolutionContext): boolean {

            var callSignatures = source.getCallSignatures();

            if (callSignatures.length) {
                return true;
            }

            var constructSignatures = source.getConstructSignatures();

            if (constructSignatures.length) {
                return true;
            }

            if (this.cachedFunctionInterfaceType()) {
                return this.sourceIsSubtypeOfTarget(source, this.cachedFunctionInterfaceType(), context);
            }

            return false;
        }

        private signatureGroupIsSubtypeOfTarget(sg1: PullSignatureSymbol[], sg2: PullSignatureSymbol[], context: PullTypeResolutionContext, comparisonInfo?: TypeComparisonInfo) {
            return this.signatureGroupIsRelatableToTarget(sg1, sg2, false, this.subtypeCache, context, comparisonInfo);
        }

        public signatureIsSubtypeOfTarget(s1: PullSignatureSymbol, s2: PullSignatureSymbol, context: PullTypeResolutionContext, comparisonInfo?: TypeComparisonInfo) {
            return this.signatureIsRelatableToTarget(s1, s2, false, this.subtypeCache, context, comparisonInfo);
        }

        public sourceIsAssignableToTarget(source: PullTypeSymbol, target: PullTypeSymbol, context: PullTypeResolutionContext, comparisonInfo?: TypeComparisonInfo, isInProvisionalResolution: boolean = false): boolean {
            var cache = isInProvisionalResolution ? {} : this.assignableCache;
            return this.sourceIsRelatableToTarget(source, target, true, cache, context, comparisonInfo);
        }

        private signatureGroupIsAssignableToTarget(sg1: PullSignatureSymbol[], sg2: PullSignatureSymbol[], context: PullTypeResolutionContext, comparisonInfo?: TypeComparisonInfo): boolean {
            return this.signatureGroupIsRelatableToTarget(sg1, sg2, true, this.assignableCache, context, comparisonInfo);
        }

        public signatureIsAssignableToTarget(s1: PullSignatureSymbol, s2: PullSignatureSymbol, context: PullTypeResolutionContext, comparisonInfo?: TypeComparisonInfo): boolean {
            return this.signatureIsRelatableToTarget(s1, s2, true, this.assignableCache, context, comparisonInfo);
        }

        private sourceIsRelatableToTarget(source: PullTypeSymbol, target: PullTypeSymbol, assignableTo: boolean, comparisonCache: any, context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo): boolean {

            // REVIEW: Does this check even matter?
            //if (this.typesAreIdentical(source, target)) {
            //    return true;
            //}
            if (source === target) {
                return true;
            }

            // An error has already been reported in this case
            if (!(source && target)) {
                return true;
            }

            if (context.specializingToAny && (target.isTypeParameter() || source.isTypeParameter())) {
                return true;
            }

            //source = this.substituteUpperBoundForType(source);
            //target = this.substituteUpperBoundForType(target);

            var sourceSubstitution: PullTypeSymbol = source;

            // We substitute for the source in the following ways:
            //  - When source is the primitive type Number, Boolean, or String, sourceSubstitution is the global interface type
            //      'Number', 'Boolean', or 'String'
            //  - When source is an enum type, sourceSubstitution is the global interface type 'Number'
            //  - When source is a type parameter, sourceSubstituion is the constraint of that type parameter
            if (source == this.semanticInfoChain.stringTypeSymbol && this.cachedStringInterfaceType()) {
                if (!this.cachedStringInterfaceType().isResolved) {
                    this.resolveDeclaredSymbol(this.cachedStringInterfaceType(), null, context);
                }
                sourceSubstitution = this.cachedStringInterfaceType();
            }
            else if (source == this.semanticInfoChain.numberTypeSymbol && this.cachedNumberInterfaceType()) {
                if (!this.cachedNumberInterfaceType().isResolved) {
                    this.resolveDeclaredSymbol(this.cachedNumberInterfaceType(), null, context);
                }
                sourceSubstitution = this.cachedNumberInterfaceType();
            }
            else if (source == this.semanticInfoChain.booleanTypeSymbol && this.cachedBooleanInterfaceType()) {
                if (!this.cachedBooleanInterfaceType().isResolved) {
                    this.resolveDeclaredSymbol(this.cachedBooleanInterfaceType(), null, context);
                }
                sourceSubstitution = this.cachedBooleanInterfaceType();
            }
            else if (PullHelpers.symbolIsEnum(source) && this.cachedNumberInterfaceType()) {
                sourceSubstitution = this.cachedNumberInterfaceType();
            }
            else if (source.isTypeParameter()) {
                sourceSubstitution = this.substituteUpperBoundForType(source);
            }

            var comboId = source.pullSymbolIDString + "#" + target.pullSymbolIDString;

            // In the case of a 'false', we want to short-circuit a recursive typecheck
            if (comparisonCache[comboId] != undefined) {
                return true;
            }

            // this is one difference between subtyping and assignment compatibility
            if (assignableTo) {
                if (this.isAnyOrEquivalent(source) || this.isAnyOrEquivalent(target)) {
                    return true;
                }

                if (source === this.semanticInfoChain.stringTypeSymbol && target.isPrimitive() && (<PullPrimitiveTypeSymbol>target).isStringConstant()) {
                    return comparisonInfo &&
                        comparisonInfo.stringConstantVal &&
                        (comparisonInfo.stringConstantVal.nodeType() === NodeType.StringLiteral) &&
                        (stripStartAndEndQuotes((<StringLiteral>comparisonInfo.stringConstantVal).actualText) === stripStartAndEndQuotes(target.name));
                }
            }
            else {
                // This is one difference between assignment compatibility and subtyping
                if (this.isAnyOrEquivalent(target)) {
                    return true;
                }

                if (target === this.semanticInfoChain.stringTypeSymbol && source.isPrimitive() && (<PullPrimitiveTypeSymbol>source).isStringConstant()) {
                    return true;
                }
            }

            if (source.isPrimitive() && (<PullPrimitiveTypeSymbol>source).isStringConstant() && target.isPrimitive() && (<PullPrimitiveTypeSymbol>target).isStringConstant()) {
                // Both are string constants
                return TypeScript.stripStartAndEndQuotes(source.name) === TypeScript.stripStartAndEndQuotes(target.name);
            }

            if (source === this.semanticInfoChain.undefinedTypeSymbol) {
                return true;
            }

            if ((source === this.semanticInfoChain.nullTypeSymbol) && (target != this.semanticInfoChain.undefinedTypeSymbol && target != this.semanticInfoChain.voidTypeSymbol)) {
                return true;
            }

            if (target == this.semanticInfoChain.voidTypeSymbol) {
                if (source == this.semanticInfoChain.anyTypeSymbol || source == this.semanticInfoChain.undefinedTypeSymbol || source == this.semanticInfoChain.nullTypeSymbol) {
                    return true;
                }

                return false;
            }
            else if (source == this.semanticInfoChain.voidTypeSymbol) {
                if (target == this.semanticInfoChain.anyTypeSymbol) {
                    return true;
                }

                return false;
            }

            if (target === this.semanticInfoChain.numberTypeSymbol && PullHelpers.symbolIsEnum(source)) {
                return true;
            }

            // REVIEW: We allow this only for enum initialization purposes
            if (source === this.semanticInfoChain.numberTypeSymbol && PullHelpers.symbolIsEnum(target)) {
                return true;
            }

            if (PullHelpers.symbolIsEnum(target) && PullHelpers.symbolIsEnum(source)) {
                return this.symbolsShareDeclaration(target, source);
            }

            if ((source.kind & PullElementKind.Enum) || (target.kind & PullElementKind.Enum)) {
                return false;
            }

            if (source.isArray() && target.isArray()) {
                comparisonCache[comboId] = false;
                var ret = this.sourceIsRelatableToTarget(source.getElementType(), target.getElementType(), assignableTo, comparisonCache, context, comparisonInfo);
                if (ret) {
                    comparisonCache[comboId] = true;
                }
                else {
                    comparisonCache[comboId] = undefined;
                }

                return ret;
            }
            else if (source.isArray() && target == this.cachedArrayInterfaceType()) {
                return true;
            }
            else if (target.isArray() && source == this.cachedArrayInterfaceType()) {
                return true;
            }

            // this check ensures that we only operate on object types from this point forward,
            // since the checks involving primitives occurred above
            if (source.isPrimitive() && target.isPrimitive()) {

                // we already know that they're not the same, and that neither is 'any'
                return false;
            }
            else if (source.isPrimitive() != target.isPrimitive()) {
                if (target.isPrimitive()) {
                    return false;
                }
            }

            if (target.isTypeParameter()) {

                // if the source is another type parameter (with no constraints), they can only be assignable if they share
                // a declaration
                if (source.isTypeParameter() && (source == sourceSubstitution)) {
                    // We compare parent declarations instead of container symbols because type parameter symbols are shared
                    // accross overload groups
                    var targetParentDeclaration = target.getDeclarations()[0].getParentDecl();
                    var sourceParentDeclaration = source.getDeclarations()[0].getParentDecl();

                    if (targetParentDeclaration !== sourceParentDeclaration) {
                        return this.symbolsShareDeclaration(target, source);
                    }
                    else {
                        return this.typesAreIdentical(target, sourceSubstitution);
                    }
                }
                else {
                    // if the source is not another type parameter, and we're specializing at a constraint site, we consider the
                    // target to be a subtype of its constraint
                    if (context.isComparingSpecializedSignatures) {
                        target = this.substituteUpperBoundForType(target);
                    }
                    else {
                        return this.typesAreIdentical(target, sourceSubstitution);
                    }
                }
            }

            comparisonCache[comboId] = false;

            if (this.sourceExtendsTarget(source, target, context)) {
                return true;
            }

            if (this.cachedObjectInterfaceType() && target === this.cachedObjectInterfaceType()) {
                return true;
            }

            if (this.cachedFunctionInterfaceType() && (sourceSubstitution.getCallSignatures().length || sourceSubstitution.getConstructSignatures().length) && target === this.cachedFunctionInterfaceType()) {
                return true;
            }

            if (target.hasMembers() && !this.sourceMembersAreRelatableToTargetMembers(sourceSubstitution, target, assignableTo, comparisonCache, context, comparisonInfo)) {
                comparisonCache[comboId] = undefined;
                return false;
            }

            if (!this.sourceCallSignaturesAreRelatableToTargetCallSignatures(sourceSubstitution, target, assignableTo, comparisonCache, context, comparisonInfo)) {
                comparisonCache[comboId] = undefined;
                return false;
            }

            if (!this.sourceConstructSignaturesAreRelatableToTargetConstructSignatures(sourceSubstitution, target, assignableTo, comparisonCache, context, comparisonInfo)) {
                comparisonCache[comboId] = undefined;
                return false;
            }

            if (!this.sourceIndexSignaturesAreRelatableToTargetIndexSignatures(sourceSubstitution, target, assignableTo, comparisonCache, context, comparisonInfo)) {
                comparisonCache[comboId] = undefined;
                return false;
            }

            comparisonCache[comboId] = true;
            return true;
        }

        private sourceMembersAreRelatableToTargetMembers(source: PullTypeSymbol, target: PullTypeSymbol, assignableTo: boolean,
            comparisonCache: any, context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo): boolean {
             var targetProps = target.getAllMembers(PullElementKind.SomeValue, GetAllMembersVisiblity.all);

            for (var itargetProp = 0; itargetProp < targetProps.length; itargetProp++) {

                var targetProp = targetProps[itargetProp];
                var sourceProp = this.getMemberSymbol(targetProp.name, PullElementKind.SomeValue, source);

                if (!targetProp.isResolved) {
                    this.resolveDeclaredSymbol(targetProp, null, context);
                }

                var targetPropType = targetProp.type;

                if (sourceProp && sourceProp.hasFlag(PullElementFlags.Static) && source.isClass()) {
                    // static source prop is not really member of the source which is class instance
                    sourceProp = null;
                }

                if (!sourceProp) {
                    // If it's not present on the type in question, look for the property on 'Object'
                    if (this.cachedObjectInterfaceType()) {
                        sourceProp = this.getMemberSymbol(targetProp.name, PullElementKind.SomeValue, this.cachedObjectInterfaceType());
                    }

                    if (!sourceProp) {
                        // Now, the property was not found on Object, but the type in question is a function, look
                        // for it on function
                        if (this.cachedFunctionInterfaceType() && (targetPropType.getCallSignatures().length || targetPropType.getConstructSignatures().length)) {
                            sourceProp = this.getMemberSymbol(targetProp.name, PullElementKind.SomeValue, this.cachedFunctionInterfaceType());
                        }

                        // finally, check to see if the property is optional
                        if (!sourceProp) {
                            if (!(targetProp.isOptional)) {
                                if (comparisonInfo) { // only surface the first error
                                    comparisonInfo.flags |= TypeRelationshipFlags.RequiredPropertyIsMissing;
                                    comparisonInfo.addMessage(getDiagnosticMessage(DiagnosticCode.Type_0_is_missing_property_1_from_type_2,
                                        [source.toString(), targetProp.getScopedNameEx().toString(), target.toString()]));
                                }
                                return false;
                            }
                            continue;
                        }
                    }
                }

                if (!this.sourcePropertyIsRelatableToTargetProperty(source, target, sourceProp, targetProp, assignableTo,
                    comparisonCache, context, comparisonInfo)) {
                    return false;
                }
            }

            return true;
        }

        private sourcePropertyIsRelatableToTargetProperty(source: PullTypeSymbol, target: PullTypeSymbol,
            sourceProp: PullSymbol, targetProp: PullSymbol, assignableTo: boolean, comparisonCache: any,
            context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo): boolean {
            var targetPropIsPrivate = targetProp.hasFlag(PullElementFlags.Private);
            var sourcePropIsPrivate = sourceProp.hasFlag(PullElementFlags.Private);

            // if visibility doesn't match, the types don't match
            if (targetPropIsPrivate != sourcePropIsPrivate) {
                if (comparisonInfo) { // only surface the first error
                    if (targetPropIsPrivate) {
                        // Overshadowing property in source that is already defined as private in target
                        comparisonInfo.addMessage(getDiagnosticMessage(DiagnosticCode.Property_0_defined_as_public_in_type_1_is_defined_as_private_in_type_2,
                            [targetProp.getScopedNameEx().toString(), sourceProp.getContainer().toString(), targetProp.getContainer().toString()]));
                    } else {
                        // Public property of target is private in source
                        comparisonInfo.addMessage(getDiagnosticMessage(DiagnosticCode.Property_0_defined_as_private_in_type_1_is_defined_as_public_in_type_2,
                            [targetProp.getScopedNameEx().toString(), sourceProp.getContainer().toString(), targetProp.getContainer().toString()]));
                    }
                    comparisonInfo.flags |= TypeRelationshipFlags.InconsistantPropertyAccesibility;
                }
                return false;
            }
            // if both are private members, test to ensure that they share a declaration
            else if (sourcePropIsPrivate && targetPropIsPrivate) {
                var targetDecl = targetProp.getDeclarations()[0];
                var sourceDecl = sourceProp.getDeclarations()[0];

                if (!targetDecl.isEqual(sourceDecl)) {
                    if (comparisonInfo) {
                        // Both types define property with same name as private
                        comparisonInfo.flags |= TypeRelationshipFlags.InconsistantPropertyAccesibility;
                        comparisonInfo.addMessage(getDiagnosticMessage(DiagnosticCode.Types_0_and_1_define_property_2_as_private,
                            [sourceProp.getContainer().toString(), targetProp.getContainer().toString(), targetProp.getScopedNameEx().toString()]));
                    }

                    return false;
                }
            }

            if (!sourceProp.isResolved) {
                this.resolveDeclaredSymbol(sourceProp, null, context);
            }

            var sourcePropType = sourceProp.type;
            var targetPropType = targetProp.type;

            // catch the mutually recursive or cached cases
            if (targetPropType && sourcePropType && (comparisonCache[sourcePropType.pullSymbolIDString + "#" + targetPropType.pullSymbolIDString] != undefined)) {
                return true;
            }

            var comparisonInfoPropertyTypeCheck: TypeComparisonInfo = null;
            if (comparisonInfo && !comparisonInfo.onlyCaptureFirstError) {
                comparisonInfoPropertyTypeCheck = new TypeComparisonInfo(comparisonInfo);
            }
            if (!this.sourceIsRelatableToTarget(sourcePropType, targetPropType, assignableTo, comparisonCache, context, comparisonInfoPropertyTypeCheck)) {
                if (comparisonInfo) {
                    comparisonInfo.flags |= TypeRelationshipFlags.IncompatiblePropertyTypes;
                    var message: string;
                    if (comparisonInfoPropertyTypeCheck && comparisonInfoPropertyTypeCheck.message) {
                        message = getDiagnosticMessage(DiagnosticCode.Types_of_property_0_of_types_1_and_2_are_incompatible_NL_3,
                            [targetProp.getScopedNameEx().toString(), source.toString(), target.toString(), comparisonInfoPropertyTypeCheck.message]);
                    } else {
                        message = getDiagnosticMessage(DiagnosticCode.Types_of_property_0_of_types_1_and_2_are_incompatible,
                            [targetProp.getScopedNameEx().toString(), source.toString(), target.toString()]);
                    }
                    comparisonInfo.addMessage(message);
                }

                return false;
            }

            return true;
        }

        private sourceCallSignaturesAreRelatableToTargetCallSignatures(source: PullTypeSymbol, target: PullTypeSymbol,
            assignableTo: boolean, comparisonCache: any, context: PullTypeResolutionContext,
            comparisonInfo: TypeComparisonInfo): boolean {

            var targetCallSigs = target.getCallSignatures();

            // check signature groups
            if (targetCallSigs.length) {
                var comparisonInfoSignatuesTypeCheck: TypeComparisonInfo = null;
                if (comparisonInfo && !comparisonInfo.onlyCaptureFirstError) {
                    comparisonInfoSignatuesTypeCheck = new TypeComparisonInfo(comparisonInfo);
                }

                var sourceCallSigs = source.getCallSignatures();
                if (!this.signatureGroupIsRelatableToTarget(sourceCallSigs, targetCallSigs, assignableTo, comparisonCache, context, comparisonInfoSignatuesTypeCheck)) {
                    if (comparisonInfo) {
                        var message: string;
                        if (sourceCallSigs.length && targetCallSigs.length) {
                            if (comparisonInfoSignatuesTypeCheck && comparisonInfoSignatuesTypeCheck.message) {
                                message = getDiagnosticMessage(DiagnosticCode.Call_signatures_of_types_0_and_1_are_incompatible_NL_2,
                                    [source.toString(), target.toString(), comparisonInfoSignatuesTypeCheck.message]);
                            } else {
                                message = getDiagnosticMessage(DiagnosticCode.Call_signatures_of_types_0_and_1_are_incompatible,
                                    [source.toString(), target.toString()]);
                            }
                        } else {
                            var hasSig = targetCallSigs.length ? target.toString() : source.toString();
                            var lacksSig = !targetCallSigs.length ? target.toString() : source.toString();
                            message = getDiagnosticMessage(DiagnosticCode.Type_0_requires_a_call_signature_but_type_1_lacks_one, [hasSig, lacksSig]);
                        }
                        comparisonInfo.flags |= TypeRelationshipFlags.IncompatibleSignatures;
                        comparisonInfo.addMessage(message);
                    }
                    return false;
                }
            }

            return true;
        }

        private sourceConstructSignaturesAreRelatableToTargetConstructSignatures(source: PullTypeSymbol, target: PullTypeSymbol,
            assignableTo: boolean, comparisonCache: any, context: PullTypeResolutionContext,
            comparisonInfo: TypeComparisonInfo): boolean {

            // check signature groups
            var targetConstructSigs = target.getConstructSignatures();
            if (targetConstructSigs.length) {
                var comparisonInfoSignatuesTypeCheck: TypeComparisonInfo = null;
                if (comparisonInfo && !comparisonInfo.onlyCaptureFirstError) {
                    comparisonInfoSignatuesTypeCheck = new TypeComparisonInfo(comparisonInfo);
                }

                var sourceConstructSigs = source.getConstructSignatures();
                if (!this.signatureGroupIsRelatableToTarget(sourceConstructSigs, targetConstructSigs, assignableTo, comparisonCache, context, comparisonInfoSignatuesTypeCheck)) {
                    if (comparisonInfo) {
                        var message: string;
                        if (sourceConstructSigs.length && targetConstructSigs.length) {
                            if (comparisonInfoSignatuesTypeCheck && comparisonInfoSignatuesTypeCheck.message) {
                                message = getDiagnosticMessage(DiagnosticCode.Construct_signatures_of_types_0_and_1_are_incompatible_NL_2,
                                    [source.toString(), target.toString(), comparisonInfoSignatuesTypeCheck.message]);
                            } else {
                                message = getDiagnosticMessage(DiagnosticCode.Construct_signatures_of_types_0_and_1_are_incompatible,
                                    [source.toString(), target.toString()]);
                            }
                        } else {
                            var hasSig = targetConstructSigs.length ? target.toString() : source.toString();
                            var lacksSig = !targetConstructSigs.length ? target.toString() : source.toString();
                            message = getDiagnosticMessage(DiagnosticCode.Type_0_requires_a_construct_signature_but_type_1_lacks_one, [hasSig, lacksSig]);
                        }
                        comparisonInfo.flags |= TypeRelationshipFlags.IncompatibleSignatures;
                        comparisonInfo.addMessage(message);
                    }
                    return false;
                }
            }

            return true;
        }

        private sourceIndexSignaturesAreRelatableToTargetIndexSignatures(source: PullTypeSymbol, target: PullTypeSymbol,
            assignableTo: boolean, comparisonCache: any, context: PullTypeResolutionContext,
            comparisonInfo: TypeComparisonInfo): boolean {

            var targetIndexSigs = this.getBothKindsOfIndexSignatures(target, context);
            var targetStringSig = targetIndexSigs.stringSignature;
            var targetNumberSig = targetIndexSigs.numericSignature;

            if (targetStringSig || targetNumberSig) {
                var sourceIndexSigs = this.getBothKindsOfIndexSignatures(source, context);
                var sourceStringSig = sourceIndexSigs.stringSignature;
                var sourceNumberSig = sourceIndexSigs.numericSignature;

                var comparable = true;
                var comparisonInfoSignatuesTypeCheck: TypeComparisonInfo = null;
                if (comparisonInfo && !comparisonInfo.onlyCaptureFirstError) {
                    comparisonInfoSignatuesTypeCheck = new TypeComparisonInfo(comparisonInfo);
                }

                if (targetStringSig) {
                    if (sourceStringSig) {
                        comparable = this.signatureIsAssignableToTarget(sourceStringSig, targetStringSig, context, comparisonInfoSignatuesTypeCheck);
                    }
                    else {
                        comparable = false;
                    }
                }

                if (comparable && targetNumberSig) {
                    if (sourceNumberSig) {
                        comparable = this.signatureIsAssignableToTarget(sourceNumberSig, targetNumberSig, context, comparisonInfoSignatuesTypeCheck);
                    }
                    else if (sourceStringSig) {
                        comparable = this.sourceIsAssignableToTarget(sourceStringSig.returnType, targetNumberSig.returnType, context, comparisonInfoSignatuesTypeCheck);
                    }
                    else {
                        comparable = false;
                    }
                }

                if (!comparable) {
                    if (comparisonInfo) {
                        var message: string;
                        if (comparisonInfoSignatuesTypeCheck && comparisonInfoSignatuesTypeCheck.message) {
                            message = getDiagnosticMessage(DiagnosticCode.Index_signatures_of_types_0_and_1_are_incompatible_NL_2,
                                [source.toString(), target.toString(), comparisonInfoSignatuesTypeCheck.message]);
                        } else {
                            message = getDiagnosticMessage(DiagnosticCode.Index_signatures_of_types_0_and_1_are_incompatible,
                                [source.toString(), target.toString()]);
                        }
                        comparisonInfo.flags |= TypeRelationshipFlags.IncompatibleSignatures;
                        comparisonInfo.addMessage(message);
                    }
                    return false;
                }
            }

            return true;
        }

        // REVIEW: TypeChanges: Return an error context object so the user can get better diagnostic info
        private signatureGroupIsRelatableToTarget(sourceSG: PullSignatureSymbol[], targetSG: PullSignatureSymbol[], assignableTo: boolean, comparisonCache: any, context: PullTypeResolutionContext, comparisonInfo?: TypeComparisonInfo) {
            if (sourceSG === targetSG) {
                return true;
            }

            if (!(sourceSG.length && targetSG.length)) {
                return false;
            }

            var mSig: PullSignatureSymbol = null;
            var nSig: PullSignatureSymbol = null;
            var foundMatch = false;

            var targetExcludeDefinition = targetSG.length > 1;
            var sourceExcludeDefinition = sourceSG.length > 1;
            for (var iMSig = 0; iMSig < targetSG.length; iMSig++) {
                mSig = targetSG[iMSig];

                if (mSig.isStringConstantOverloadSignature() || (targetExcludeDefinition && mSig.isDefinition())) {
                    continue;
                }

                for (var iNSig = 0; iNSig < sourceSG.length; iNSig++) {
                    nSig = sourceSG[iNSig];

                    if (nSig.isStringConstantOverloadSignature() || (sourceExcludeDefinition && nSig.isDefinition())) {
                        continue;
                    }

                    if (this.signatureIsRelatableToTarget(nSig, mSig, assignableTo, comparisonCache, context, comparisonInfo)) {
                        foundMatch = true;
                        break;
                    }
                }

                if (foundMatch) {
                    foundMatch = false;
                    continue;
                }
                return false;
            }

            return true;
        }

        private signatureIsRelatableToTarget(sourceSig: PullSignatureSymbol, targetSig: PullSignatureSymbol, assignableTo: boolean, comparisonCache: any, context: PullTypeResolutionContext, comparisonInfo?: TypeComparisonInfo) {

            sourceSig = this.specializeSignatureToObject(sourceSig, sourceSig.getDeclarations()[0].getParentDecl(), context);
            targetSig = this.specializeSignatureToObject(targetSig, targetSig.getDeclarations()[0].getParentDecl(), context);

            var sourceParameters = sourceSig.parameters;
            var targetParameters = targetSig.parameters;

            if (!sourceParameters || !targetParameters) {
                return false;
            }

            var targetVarArgCount = targetSig.nonOptionalParamCount;
            var sourceVarArgCount = sourceSig.nonOptionalParamCount;

            if (sourceVarArgCount > targetVarArgCount && !targetSig.hasVarArgs) {
                if (comparisonInfo) {
                    comparisonInfo.flags |= TypeRelationshipFlags.SourceSignatureHasTooManyParameters;
                    comparisonInfo.addMessage(getDiagnosticMessage(DiagnosticCode.Call_signature_expects_0_or_fewer_parameters, [targetVarArgCount]));
                }
                return false;
            }

            var sourceReturnType = sourceSig.returnType;
            var targetReturnType = targetSig.returnType;             
                                            
            if (targetReturnType != this.semanticInfoChain.voidTypeSymbol) {
                if (!this.sourceIsRelatableToTarget(sourceReturnType, targetReturnType, assignableTo, comparisonCache, context, comparisonInfo)) {
                    if (comparisonInfo) {
                        comparisonInfo.flags |= TypeRelationshipFlags.IncompatibleReturnTypes;
                        // No need to print this one here - it's printed as part of the signature error in sourceIsRelatableToTarget
                        //comparisonInfo.addMessage("Incompatible return types: '" + sourceReturnType.getTypeName() + "' and '" + targetReturnType.getTypeName() + "'");
                    }
                    
                    return false;
                }
            }

            // the clause 'sourceParameters.length > sourceVarArgCount' covers optional parameters, since even though the parameters are optional
            // they need to agree with the target params
            var len = (sourceVarArgCount < targetVarArgCount && (sourceSig.hasVarArgs || (sourceParameters.length > sourceVarArgCount))) ? targetVarArgCount : sourceVarArgCount;

            if (!len) {
                len = (sourceParameters.length < targetParameters.length) ? sourceParameters.length : targetParameters.length;
            }

            var sourceParamType: PullTypeSymbol = null;
            var targetParamType: PullTypeSymbol = null;
            var sourceParamName = "";
            var targetParamName = "";

            for (var iSource = 0, iTarget = 0; iSource < len; iSource++, iTarget++) {

                if (iSource < sourceParameters.length && (!sourceSig.hasVarArgs || iSource < sourceVarArgCount)) {
                    sourceParamType = sourceParameters[iSource].type;
                    sourceParamName = sourceParameters[iSource].name;
                }
                else if (iSource === sourceVarArgCount) {
                    sourceParamType = sourceParameters[iSource].type;
                    if (sourceParamType.isArray()) {
                        sourceParamType = sourceParamType.getElementType();
                    }
                    sourceParamName = sourceParameters[iSource].name;
                }

                if (iTarget < targetParameters.length && !targetSig.hasVarArgs  && (!targetVarArgCount || (iTarget < targetVarArgCount))) {
                    targetParamType = targetParameters[iTarget].type;
                    targetParamName = targetParameters[iTarget].name;
                }
                else if (targetSig.hasVarArgs && iTarget === targetVarArgCount) {
                    targetParamType = targetParameters[iTarget].type;

                    if (targetParamType.isArray()) {
                        targetParamType = targetParamType.getElementType();
                    }
                    targetParamName = targetParameters[iTarget].name;
                }

                if (!(this.sourceIsRelatableToTarget(sourceParamType, targetParamType, assignableTo, comparisonCache, context, comparisonInfo) ||
                    this.sourceIsRelatableToTarget(targetParamType, sourceParamType, assignableTo, comparisonCache, context, comparisonInfo))) {

                    if (comparisonInfo) {
                        comparisonInfo.flags |= TypeRelationshipFlags.IncompatibleParameterTypes;
                    }

                    return false;
                }
            }

            return true;
        }

        // Overload resolution

        private resolveOverloads(
            application: ICallExpression,
            group: PullSignatureSymbol[],
            enclosingDecl: PullDecl,
            haveTypeArgumentsAtCallSite: boolean,
            context: PullTypeResolutionContext,
            diagnostics: Diagnostic[]): PullSignatureSymbol {
            var finalDecision: PullSignatureSymbol = null;
            var hasOverloads = group.length > 1;
            var comparisonInfo = new TypeComparisonInfo();
            var args: ASTList = application.arguments;

            var signature: PullSignatureSymbol;
            var returnType: PullTypeSymbol;
            var initialCandidates = ArrayUtilities.where(group, signature => 
                // Filter out definition if overloads are available, and nongeneric signatures if type arguments are supplied
                !(hasOverloads && signature.isDefinition() || (haveTypeArgumentsAtCallSite && !signature.isGeneric()))
            );

            var applicableCandidates = this.getApplicableSignatures(initialCandidates, args, comparisonInfo, enclosingDecl, context);
            if (applicableCandidates.length > 0) {
                finalDecision = this.findMostApplicableSignature(applicableCandidates, args, enclosingDecl, context);
            }
            else {
                var target: AST = this.getCallTargetErrorSpanAST(application);
                if (comparisonInfo.message) {
                    diagnostics.push(new Diagnostic(this.unitPath, target.minChar, target.getLength(),
                        DiagnosticCode.Supplied_parameters_do_not_match_any_signature_of_call_target_NL_0, [comparisonInfo.message]));
                }
                else {
                    diagnostics.push(new Diagnostic(this.unitPath, target.minChar, target.getLength(),
                        DiagnosticCode.Supplied_parameters_do_not_match_any_signature_of_call_target, null));
                }
            }

            return finalDecision;
        }

        private getCallTargetErrorSpanAST(callEx: ICallExpression): AST {
            return (callEx.target.nodeType() === NodeType.MemberAccessExpression) ? (<BinaryExpression>callEx.target).operand2 : callEx.target;
        }

        private overloadHasCorrectArity(signature: PullSignatureSymbol, args: ASTList): boolean {
            if (args == null) {
                return signature.nonOptionalParamCount === 0;
            }

            // First, figure out how many arguments there are. This is usually args.members.length, but if we have trailing separators,
            // we need to pretend we have one more "phantom" argument that the user is currently typing. This is useful for signature help.
            // Example: foo(1, 2, 
            // should have 3 arguments
            var numberOfArgs = (args.members.length && args.members.length === args.separatorCount) ?
                args.separatorCount + 1 :
                args.members.length;
            if (numberOfArgs < signature.nonOptionalParamCount) {
                return false;
            }
            if (!signature.hasVarArgs && numberOfArgs > signature.parameters.length) {
                return false;
            }

            return true;
        }

        private overloadIsApplicable(signature: PullSignatureSymbol, args: ASTList, enclosingDecl: PullDecl, context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo): OverloadApplicabilityStatus {
            if (args == null) {
                // If arguments are required in this signature, the signature doesn't fit
                if (signature.nonOptionalParamCount > 0) {
                    return OverloadApplicabilityStatus.NotApplicable;
                }
                else {
                    return OverloadApplicabilityStatus.ApplicableWithNoProvisionalErrors;
                }
            }
            else {
                // Check arity bounds
                if (!this.overloadHasCorrectArity(signature, args)) {
                    return OverloadApplicabilityStatus.NotApplicable;
                }

                var isInVarArg = false;
                var hasProvisionalErrors = false;
                var parameters = signature.parameters;
                var hasProvisionalErrors = false;
                var paramType: PullTypeSymbol = null;

                for (var i = 0; i < args.members.length; i++) {
                    if (!isInVarArg) {
                        if (!parameters[i].isResolved) {
                            this.resolveDeclaredSymbol(parameters[i], enclosingDecl, context);
                        }

                        if (parameters[i].isVarArg) {
                            // If the vararg has no element type, it is malformed, so just use the any symbol (we will have errored when resolving the signature).
                            paramType = parameters[i].type.getElementType() || this.semanticInfoChain.anyTypeSymbol;
                            isInVarArg = true;
                        }
                        else {
                            paramType = parameters[i].type;
                        }
                    }

                    var applicability = this.overloadIsApplicableForArgument(paramType, args.members[i], i, enclosingDecl, context, comparisonInfo);
                    if (applicability === OverloadApplicabilityStatus.NotApplicable) {
                        return applicability;
                    }
                    else {
                        hasProvisionalErrors = hasProvisionalErrors || (applicability === OverloadApplicabilityStatus.ApplicableButWithProvisionalErrors);
                    }
                }

                return hasProvisionalErrors ?
                    OverloadApplicabilityStatus.ApplicableButWithProvisionalErrors :
                    OverloadApplicabilityStatus.ApplicableWithNoProvisionalErrors;
            }
        }

        private overloadIsApplicableForArgument(paramType: PullTypeSymbol, arg: AST, argIndex: number, enclosingDecl: PullDecl, context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo): OverloadApplicabilityStatus {
            if (this.isAnyOrEquivalent(paramType)) {
                return OverloadApplicabilityStatus.ApplicableWithNoProvisionalErrors;
            }
            else if (arg.nodeType() === NodeType.FunctionDeclaration) {
                return this.overloadIsApplicableForFunctionExpressionArgument(paramType, arg, argIndex, enclosingDecl, context, comparisonInfo);
            }
            else if (arg.nodeType() === NodeType.ObjectLiteralExpression) {
                return this.overloadIsApplicableForObjectLiteralArgument(paramType, arg, argIndex, enclosingDecl, context, comparisonInfo);
            }
            else if (arg.nodeType() === NodeType.ArrayLiteralExpression) {
                return this.overloadIsApplicableForArrayLiteralArgument(paramType, arg, argIndex, enclosingDecl, context, comparisonInfo);
            }
            else {
                return this.overloadIsApplicableForOtherArgument(paramType, arg, argIndex, enclosingDecl, context, comparisonInfo);
            }
        }

        private overloadIsApplicableForFunctionExpressionArgument(paramType: PullTypeSymbol, arg: AST, argIndex: number, enclosingDecl: PullDecl, context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo): OverloadApplicabilityStatus {
            if (this.cachedFunctionInterfaceType() && paramType === this.cachedFunctionInterfaceType()) {
                return OverloadApplicabilityStatus.ApplicableWithNoProvisionalErrors;
            }

            context.pushContextualType(paramType, true, null);

            var argSym = this.resolveFunctionExpression(<FunctionDeclaration>arg, true, enclosingDecl, context);

            var applicable = this.overloadIsApplicableForArgumentHelper(paramType, argSym.type, argIndex, comparisonInfo, context);
            var cxt = context.popContextualType();

            if (applicable) {
                return cxt.hasProvisionalErrors ?
                    OverloadApplicabilityStatus.ApplicableButWithProvisionalErrors :
                    OverloadApplicabilityStatus.ApplicableWithNoProvisionalErrors;
            }
            else {
                return OverloadApplicabilityStatus.NotApplicable;
            }
        }

        private overloadIsApplicableForObjectLiteralArgument(paramType: PullTypeSymbol, arg: AST, argIndex: number, enclosingDecl: PullDecl, context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo): OverloadApplicabilityStatus {
            // attempt to contextually type the object literal
            if (this.cachedObjectInterfaceType() && paramType === this.cachedObjectInterfaceType()) {
                return OverloadApplicabilityStatus.ApplicableWithNoProvisionalErrors;
            }

            context.pushContextualType(paramType, true, null);
            var argSym = this.resolveObjectLiteralExpression(arg, true, enclosingDecl, context);

            var applicable = this.overloadIsApplicableForArgumentHelper(paramType, argSym.type, argIndex, comparisonInfo, context);

            var cxt = context.popContextualType();
            if (applicable) {
                return cxt.hasProvisionalErrors ?
                    OverloadApplicabilityStatus.ApplicableButWithProvisionalErrors :
                    OverloadApplicabilityStatus.ApplicableWithNoProvisionalErrors;
            }
            else {
                return OverloadApplicabilityStatus.NotApplicable;
            }
        }

        private overloadIsApplicableForArrayLiteralArgument(paramType: PullTypeSymbol, arg: AST, argIndex: number, enclosingDecl: PullDecl, context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo): OverloadApplicabilityStatus {
            // attempt to contextually type the array literal
            if (paramType === this.cachedArrayInterfaceType()) {
                return OverloadApplicabilityStatus.ApplicableWithNoProvisionalErrors;
            }

            context.pushContextualType(paramType, true, null);
            var argSym = this.resolveArrayLiteralExpression(<UnaryExpression>arg, true, enclosingDecl, context);

            var applicable = this.overloadIsApplicableForArgumentHelper(paramType, argSym.type, argIndex, comparisonInfo, context);

            var cxt = context.popContextualType();

            if (applicable) {
                return cxt.hasProvisionalErrors ?
                    OverloadApplicabilityStatus.ApplicableButWithProvisionalErrors :
                    OverloadApplicabilityStatus.ApplicableWithNoProvisionalErrors;
            }
            else {
                return OverloadApplicabilityStatus.NotApplicable;
            }
        }

        private overloadIsApplicableForOtherArgument(paramType: PullTypeSymbol, arg: AST, argIndex: number, enclosingDecl: PullDecl, context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo): OverloadApplicabilityStatus {
            // No need to contextually type or mark as provisional
            var argSym = this.resolveAST(arg, false, enclosingDecl, context);

            // If it is an alias, get its type
            if (argSym.type.isAlias()) {
                var aliasSym = <PullTypeAliasSymbol>argSym.type;
                argSym = aliasSym.getExportAssignedTypeSymbol();
            }

            // Just in case the argument is a string literal, and are checking overload on const, we set this stringConstantVal
            // (sourceIsAssignableToTarget will internally check if the argument is actually a string)
            comparisonInfo.stringConstantVal = arg;
            return this.overloadIsApplicableForArgumentHelper(paramType, argSym.type, argIndex, comparisonInfo, context)
                ? OverloadApplicabilityStatus.ApplicableWithNoProvisionalErrors
                : OverloadApplicabilityStatus.NotApplicable;
        }

        private overloadIsApplicableForArgumentHelper(paramType: PullTypeSymbol, argSym: PullSymbol, argumentIndex: number, comparisonInfo: TypeComparisonInfo, context: PullTypeResolutionContext): boolean {
            if (this.sourceIsAssignableToTarget(argSym.type, paramType, context, comparisonInfo, /*isInProvisionalResolution*/ true)) {
                return true;
            }

            if (comparisonInfo && !comparisonInfo.message) {
                comparisonInfo.addMessage(getDiagnosticMessage(DiagnosticCode.Could_not_apply_type_0_to_argument_1_which_is_of_type_2,
                    [paramType.toString(), (argumentIndex + 1), argSym.getTypeName()]));
            }

            return false;
        }

        private getApplicableSignatures(candidateSignatures: PullSignatureSymbol[],
            args: ASTList,
            comparisonInfo: TypeComparisonInfo,
            enclosingDecl: PullDecl,
            context: PullTypeResolutionContext): PullApplicableSignature[] {

            var applicableSigs: PullApplicableSignature[] = [];

            for (var i = 0; i < candidateSignatures.length; i++) {
                var applicability = this.overloadIsApplicable(candidateSignatures[i], args, enclosingDecl, context, comparisonInfo);
                if (applicability !== OverloadApplicabilityStatus.NotApplicable) {
                    applicableSigs[applicableSigs.length] = { signature: candidateSignatures[i], hasProvisionalErrors: applicability === OverloadApplicabilityStatus.ApplicableButWithProvisionalErrors };
                }
            }

            return applicableSigs;
        }

        private findMostApplicableSignature(signatures: PullApplicableSignature[], args: ASTList, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSignatureSymbol {

            if (signatures.length === 1) {
                return signatures[0].signature;
            }

            var best: PullApplicableSignature = signatures[0];
            var Q: PullApplicableSignature = null;

            var PType: PullTypeSymbol = null;
            var QType: PullTypeSymbol = null;

            var ambiguous = false;

            var bestParams: PullSymbol[];
            var qParams: PullSymbol[];

            // Make sure the first signature has every parameter resolved
            for (var p = 0; p < best.signature.parameters.length; p++) {
                if (!best.signature.parameters[p].isResolved) {
                    this.resolveDeclaredSymbol(best.signature.parameters[p], enclosingDecl, context);
                }
            }

            // Resolve the argument types with a provisional any (this is a hack to make sure the symbol does not get cached when we resolve the AST)
            // Ideally, we would have a way to switch into provisional mode *without* pushing a contextual type on the stack
            if (args) {
                var ATypes = new Array<PullTypeSymbol>(args.members.length);
                context.pushContextualType(this.semanticInfoChain.anyTypeSymbol, /*provisional*/ true, /*substitutions*/ null);
                for (var i = 0; i < args.members.length; i++) {
                    ATypes[i] = this.resolveAST(args.members[i], /*inContextuallyTypedAssignment*/ true, enclosingDecl, context).type;
                }
                context.popContextualType();
            }

            for (var qSig = 1; qSig < signatures.length; qSig++) {
                Q = signatures[qSig];

                // find the better conversion
                for (var i = 0; args && i < args.members.length; i++) {

                    bestParams = best.signature.parameters;
                    qParams = Q.signature.parameters;

                    PType = i < bestParams.length ? bestParams[i].type : bestParams[bestParams.length - 1].type.getElementType();
                    QType = i < qParams.length ? qParams[i].type : qParams[qParams.length - 1].type.getElementType();

                    if (this.typesAreIdentical(PType, QType) && !(QType.isPrimitive() && (<PullPrimitiveTypeSymbol>QType).isStringConstant())) {
                        continue;
                    }
                    else if (PType.isPrimitive() &&
                        (<PullPrimitiveTypeSymbol>PType).isStringConstant() &&
                        args.members[i].nodeType() === NodeType.StringLiteral &&
                        stripStartAndEndQuotes((<StringLiteral>args.members[i]).actualText) === stripStartAndEndQuotes((<PullStringConstantTypeSymbol>PType).name)) {
                        break;
                    }
                    else if (QType.isPrimitive() &&
                        (<PullPrimitiveTypeSymbol>QType).isStringConstant() &&
                        args.members[i].nodeType() === NodeType.StringLiteral &&
                        stripStartAndEndQuotes((<StringLiteral>args.members[i]).actualText) === stripStartAndEndQuotes((<PullStringConstantTypeSymbol>QType).name)) {
                        best = Q;
                    }
                    else if (this.typesAreIdentical(ATypes[i], PType)) {
                        break;
                    }
                    else if (this.typesAreIdentical(ATypes[i], QType)) {
                        best = Q;
                        break;
                    }
                    else if (this.sourceIsSubtypeOfTarget(PType, QType, context)) {
                        break;
                    }
                    else if (this.sourceIsSubtypeOfTarget(QType, PType, context)) {
                        best = Q;
                        break;
                    }
                    else if (Q.hasProvisionalErrors) {
                        break;
                    }
                    else if (best.hasProvisionalErrors) {
                        best = Q;
                        break;
                    }
                }
            }

            return best.signature;
        }

        private canApplyContextualTypeToFunction(candidateType: PullTypeSymbol, funcDecl: FunctionDeclaration, beStringent: boolean): boolean {

            // in these cases, we do not attempt to apply a contextual type
            //  RE: isInlineCallLiteral - if the call target is a function literal, we don't want to apply the target type
            //  to its body - instead, it should be applied to its return type
            if (funcDecl.isMethod() ||
                beStringent && funcDecl.returnTypeAnnotation) {
                return false;
            }

            beStringent = beStringent || (this.cachedFunctionInterfaceType() === candidateType);

            // At this point, if we're not being stringent, there's no need to check for multiple call sigs
            // or count parameters - we just want to unblock typecheck
            if (!beStringent) {
                return true;
            }
            var functionSymbol = this.getDeclForAST(funcDecl).getSymbol();
            var signature = functionSymbol.type.getCallSignatures()[0];
            var parameters = signature.parameters;
            var paramLen = parameters.length;

            // Check that the argument declarations have no type annotations
            for (var i = 0; i < paramLen; i++) {
                var param = parameters[i];
                var argDecl = <Parameter>this.getASTForDecl(param.getDeclarations()[0]);

                // REVIEW: a valid typeExpr is a requirement for varargs,
                // so we may want to revise our invariant
                if (beStringent && argDecl.typeExpr) {
                    return false;
                }
            }

            if (candidateType.getConstructSignatures().length && candidateType.getCallSignatures().length) {
                return false;
            }

            var candidateSigs = candidateType.getConstructSignatures().length ? candidateType.getConstructSignatures() : candidateType.getCallSignatures();

            if (!candidateSigs || candidateSigs.length > 1) {
                return false;
            }

            // if we're here, the contextual type can be applied to the function
            return true;
        }

        private inferArgumentTypesForSignature(signature: PullSignatureSymbol,
            args: ASTList,
            comparisonInfo: TypeComparisonInfo,
            enclosingDecl: PullDecl,
            context: PullTypeResolutionContext): PullTypeSymbol[] {

            var cxt: PullContextualTypeContext = null;

            var parameters = signature.parameters;
            var typeParameters = signature.getTypeParameters();
            var argContext = new ArgumentInferenceContext();

            var parameterType: PullTypeSymbol = null;

            // seed each type parameter with the undefined type, so that we can widen it to 'any'
            // if no inferences can be made
            for (var i = 0; i < typeParameters.length; i++) {
                argContext.addInferenceRoot(typeParameters[i]);
            }

            var substitutions: any;
            var inferenceCandidates: PullTypeSymbol[];
            var inferenceCandidate: PullTypeSymbol;

            for (var i = 0; i < args.members.length; i++) {

                if (i >= parameters.length) {
                    break;
                }

                parameterType = parameters[i].type;

                // account for varargs
                if (signature.hasVarArgs && (i >= signature.nonOptionalParamCount - 1) && parameterType.isArray()) {
                    parameterType = parameterType.getElementType();
                }

                inferenceCandidates = argContext.getInferenceCandidates();
                substitutions = {};

                if (inferenceCandidates.length) {
                    for (var j = 0; j < inferenceCandidates.length; j++) {

                        argContext.resetRelationshipCache();

                        inferenceCandidate = inferenceCandidates[j];

                        substitutions = inferenceCandidates[j];

                        context.pushContextualType(parameterType, true, substitutions);

                        var argSym = this.resolveAST(args.members[i], true, enclosingDecl, context);

                        this.relateTypeToTypeParameters(argSym.type, parameterType, false, argContext, enclosingDecl, context);

                        cxt = context.popContextualType();
                    }
                }
                else {
                    context.pushContextualType(parameterType, true, {});
                    var argSym = this.resolveAST(args.members[i], true, enclosingDecl, context);

                    this.relateTypeToTypeParameters(argSym.type, parameterType, false, argContext, enclosingDecl, context);

                    cxt = context.popContextualType();
                }
            }

            var inferenceResults = argContext.inferArgumentTypes(this, enclosingDecl, context);

            if (inferenceResults.unfit) {
                return null;
            }

            var resultTypes: PullTypeSymbol[] = [];

            // match inferred types in-order to type parameters
            for (var i = 0; i < typeParameters.length; i++) {
                for (var j = 0; j < inferenceResults.results.length; j++) {
                    if (inferenceResults.results[j].param == typeParameters[i]) {
                        resultTypes[resultTypes.length] = inferenceResults.results[j].type;
                        break;
                    }
                }
            }

            if (!args.members.length && !resultTypes.length && typeParameters.length) {
                for (var i = 0; i < typeParameters.length; i++) {
                    resultTypes[resultTypes.length] = this.semanticInfoChain.anyTypeSymbol;
                }
            }
            else if (resultTypes.length && resultTypes.length < typeParameters.length) {
                for (var i = resultTypes.length; i < typeParameters.length; i++) {
                    resultTypes[i] = this.semanticInfoChain.anyTypeSymbol;
                }
            }

            return resultTypes;
        }

        private relateTypeToTypeParameters(expressionType: PullTypeSymbol,
            parameterType: PullTypeSymbol,
            shouldFix: boolean,
            argContext: ArgumentInferenceContext,
            enclosingDecl: PullDecl,
            context: PullTypeResolutionContext): void {

            if (!expressionType || !parameterType) {
                return;
            }

            if (expressionType.isError()) {
                expressionType = this.semanticInfoChain.anyTypeSymbol;
            }

            if (parameterType === expressionType) {
                //if (parameterType.isTypeParameter() && shouldFix) {
                //    argContext.addCandidateForInference(<PullTypeParameterSymbol>parameterType, this.semanticInfoChain.anyTypeSymbol, shouldFix);
                //}
                return;
            }

            if (parameterType.isTypeParameter()) {
                if (expressionType.isGeneric() && !expressionType.isFixed() && !expressionType.isTypeParameter()) {
                    expressionType = this.specializeTypeToAny(expressionType, enclosingDecl, context);
                }
                argContext.addCandidateForInference(<PullTypeParameterSymbol>parameterType, expressionType, shouldFix);
                return;
            }
            var parameterDeclarations = parameterType.getDeclarations();
            var expressionDeclarations = expressionType.getDeclarations();
            if (!parameterType.isArray() &&
                parameterDeclarations.length &&
                expressionDeclarations.length &&
                !(parameterType.isTypeParameter() || expressionType.isTypeParameter()) &&
                (parameterDeclarations[0].isEqual(expressionDeclarations[0]) ||
                (expressionType.isGeneric() && parameterType.isGeneric() && this.sourceIsSubtypeOfTarget(expressionType, parameterType, context, null))) &&
                expressionType.isGeneric()) {
                var typeParameters: PullTypeSymbol[] = parameterType.getIsSpecialized() ? parameterType.getTypeArguments() : parameterType.getTypeParameters();
                var typeArguments: PullTypeSymbol[] = expressionType.getTypeArguments();

                // If we're relating an out-of-order resolution of a function call within the body
                // of a generic type's method, the relationship will actually be in reverse.
                if (!typeArguments) {
                    typeParameters = parameterType.getTypeArguments();
                    typeArguments = expressionType.getIsSpecialized() ? expressionType.getTypeArguments() : expressionType.getTypeParameters();
                }

                if (typeParameters && typeArguments && typeParameters.length === typeArguments.length) {
                    for (var i = 0; i < typeParameters.length; i++) {
                        if (typeArguments[i] != typeParameters[i]) {
                            // relate and fix
                            this.relateTypeToTypeParameters(typeArguments[i], typeParameters[i], true, argContext, enclosingDecl, context);
                        }
                    }
                }
            }

            // if the expression and parameter type, with type arguments of 'any', are not assignment compatible, ignore
            //var anyExpressionType = this.specializeTypeToAny(expressionType, enclosingDecl, context);
            //var anyParameterType = this.specializeTypeToAny(parameterType, enclosingDecl, context);

            //if (!this.sourceIsAssignableToTarget(anyExpressionType, anyParameterType, context)) {
            //    return;
            //}
            var prevSpecializingToAny = context.specializingToAny;
            context.specializingToAny = true;

            if (!this.sourceIsAssignableToTarget(expressionType, parameterType, context)) {
                context.specializingToAny = prevSpecializingToAny;
                return;
            }
            context.specializingToAny = prevSpecializingToAny;

            if (expressionType.isArray() && parameterType.isArray()) {
                this.relateArrayTypeToTypeParameters(expressionType, parameterType, shouldFix, argContext, enclosingDecl, context);

                return;
            }

            this.relateObjectTypeToTypeParameters(expressionType, parameterType, shouldFix, argContext, enclosingDecl, context);
        }

        private relateFunctionSignatureToTypeParameters(expressionSignature: PullSignatureSymbol,
            parameterSignature: PullSignatureSymbol,
            argContext: ArgumentInferenceContext,
            enclosingDecl: PullDecl,
            context: PullTypeResolutionContext): void {
            // Sub in 'any' for type parameters

            //var anyExpressionSignature = this.specializeSignatureToAny(expressionSignature, enclosingDecl, context);
            //var anyParamExpressionSignature = this.specializeSignatureToAny(parameterSignature, enclosingDecl, context);

            //if (!this.signatureIsAssignableToTarget(anyExpressionSignature, anyParamExpressionSignature, context)) {
            //    return;
            //}

            var expressionParams = expressionSignature.parameters;
            var expressionReturnType = expressionSignature.returnType;

            var parameterParams = parameterSignature.parameters;
            var parameterReturnType = parameterSignature.returnType;

            var len = parameterParams.length < expressionParams.length ? parameterParams.length : expressionParams.length;

            for (var i = 0; i < len; i++) {
                this.relateTypeToTypeParameters(expressionParams[i].type, parameterParams[i].type, true, argContext, enclosingDecl, context);
            }

            this.relateTypeToTypeParameters(expressionReturnType, parameterReturnType, false, argContext, enclosingDecl, context);
        }

        private relateObjectTypeToTypeParameters(objectType: PullTypeSymbol,
            parameterType: PullTypeSymbol,
            shouldFix: boolean,
            argContext: ArgumentInferenceContext,
            enclosingDecl: PullDecl,
            context: PullTypeResolutionContext): void {

            var parameterTypeMembers = parameterType.getMembers();
            var parameterSignatures: PullSignatureSymbol[];
            var parameterSignature: PullSignatureSymbol;

            var objectMember: PullSymbol;
            var objectSignatures: PullSignatureSymbol[];


            if (argContext.alreadyRelatingTypes(objectType, parameterType)) {
                return;
            }

            var objectTypeArguments = objectType.getTypeArguments();
            var parameterTypeParameters = parameterType.getTypeParameters();

            if (objectTypeArguments && (objectTypeArguments.length === parameterTypeParameters.length)) {
                for (var i = 0; i < objectTypeArguments.length; i++) {
                    // PULLREVIEW: This may lead to duplicate inferences for type argument parameters, if the two are the same
                    // (which could occur via mutually recursive method calls within a generic class declaration)
                    argContext.addCandidateForInference(parameterTypeParameters[i], objectTypeArguments[i], shouldFix);
                }
            }

            for (var i = 0; i < parameterTypeMembers.length; i++) {
                objectMember = this.getMemberSymbol(parameterTypeMembers[i].name, PullElementKind.SomeValue, objectType);

                if (objectMember) {
                    this.relateTypeToTypeParameters(objectMember.type, parameterTypeMembers[i].type, shouldFix, argContext, enclosingDecl, context);
                }
            }

            parameterSignatures = parameterType.getCallSignatures();
            objectSignatures = objectType.getCallSignatures();

            for (var i = 0; i < parameterSignatures.length; i++) {
                parameterSignature = parameterSignatures[i];

                for (var j = 0; j < objectSignatures.length; j++) {
                    this.relateFunctionSignatureToTypeParameters(objectSignatures[j], parameterSignature, argContext, enclosingDecl, context);
                }
            }

            parameterSignatures = parameterType.getConstructSignatures();
            objectSignatures = objectType.getConstructSignatures();

            for (var i = 0; i < parameterSignatures.length; i++) {
                parameterSignature = parameterSignatures[i];

                for (var j = 0; j < objectSignatures.length; j++) {
                    this.relateFunctionSignatureToTypeParameters(objectSignatures[j], parameterSignature, argContext, enclosingDecl, context);
                }
            }

            parameterSignatures = parameterType.getIndexSignatures();
            objectSignatures = objectType.getIndexSignatures();

            for (var i = 0; i < parameterSignatures.length; i++) {
                parameterSignature = parameterSignatures[i];

                for (var j = 0; j < objectSignatures.length; j++) {
                    this.relateFunctionSignatureToTypeParameters(objectSignatures[j], parameterSignature, argContext, enclosingDecl, context);
                }
            }
        }

        private relateArrayTypeToTypeParameters(argArrayType: PullTypeSymbol,
            parameterArrayType: PullTypeSymbol,
            shouldFix: boolean,
            argContext: ArgumentInferenceContext,
            enclosingDecl: PullDecl,
            context: PullTypeResolutionContext): void {

            var argElement = argArrayType.getElementType();
            var paramElement = parameterArrayType.getElementType();

            this.relateTypeToTypeParameters(argElement, paramElement, shouldFix, argContext, enclosingDecl, context);
        }

        public specializeTypeToAny(typeToSpecialize: PullTypeSymbol, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullTypeSymbol {
            var prevSpecialize = context.specializingToAny;

            context.specializingToAny = true;

            // get the "root" unspecialized type, since even generic types may already be partially specialize
            var rootType = getRootType(typeToSpecialize);

            var type = specializeType(rootType, [], this, enclosingDecl, context);

            context.specializingToAny = prevSpecialize;

            return type;
        }

        private specializeSignatureToAny(signatureToSpecialize: PullSignatureSymbol, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSignatureSymbol {
            var typeParameters = signatureToSpecialize.getTypeParameters();
            var typeReplacementMap: any = {};
            var typeArguments: PullTypeSymbol[] = []; // PULLTODO - may be expensive, but easy to cache

            for (var i = 0; i < typeParameters.length; i++) {
                typeArguments[i] = this.semanticInfoChain.anyTypeSymbol;
                typeReplacementMap[typeParameters[i].pullSymbolIDString] = typeArguments[i];
            }
            if (!typeArguments.length) {
                typeArguments[0] = this.semanticInfoChain.anyTypeSymbol;
            }

            var prevSpecialize = context.specializingToAny;

            context.specializingToAny = true;
            // no need to worry about returning 'null', since 'any' satisfies all constraints
            var sig = specializeSignature(signatureToSpecialize, false, typeReplacementMap, typeArguments, this, enclosingDecl, context);
            context.specializingToAny = prevSpecialize;

            return sig;
        }

        public specializeSignatureToObject(signatureToSpecialize: PullSignatureSymbol, enclosingDecl: PullDecl, context: PullTypeResolutionContext): PullSignatureSymbol {
            if (!signatureToSpecialize.cachedObjectSpecialization) {
                var typeParameters = signatureToSpecialize.getTypeParameters();

                if (typeParameters.length) {
                    var typeReplacementMap: any = {};
                    var typeArguments: PullTypeSymbol[] = [];

                    for (var i = 0; i < typeParameters.length; i++) {
                        typeArguments[i] = this.cachedObjectInterfaceType();
                        typeReplacementMap[typeParameters[i].pullSymbolIDString] = typeArguments[i];
                    }

                    signatureToSpecialize.cachedObjectSpecialization = specializeSignature(signatureToSpecialize, false, typeReplacementMap, typeArguments, this, enclosingDecl, context);
                }
                else {
                    signatureToSpecialize.cachedObjectSpecialization = signatureToSpecialize;
                }
            }

            return signatureToSpecialize.cachedObjectSpecialization;
        }

        public static globalTypeCheckPhase = 0;

        // type check infrastructure
        public static typeCheck(compilationSettings: CompilationSettings, semanticInfoChain: SemanticInfoChain, scriptName: string, script: Script): void {
            var unit = semanticInfoChain.getUnit(scriptName);

            if (!unit.hasBeenTypeChecked) {
                unit.hasBeenTypeChecked = true;

                var scriptDecl = unit.getTopLevelDecl();

                var resolver = new PullTypeResolver(compilationSettings, semanticInfoChain, scriptName);
                var context = new PullTypeResolutionContext(resolver, /*inTypeCheck*/ true, scriptName);

                resolver.resolveAST(script.moduleElements, false, scriptDecl, context);
                resolver.validateVariableDeclarationGroups(scriptDecl, context);

                while (PullTypeResolver.typeCheckCallBacks.length) {
                    var callBack = PullTypeResolver.typeCheckCallBacks.pop();
                    callBack(context);
                }

                resolver.processPostTypeCheckWorkItems(context);

                PullTypeResolver.globalTypeCheckPhase++;
            }
        }

        private validateVariableDeclarationGroups(enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            // If we're inside a module, collect the names of imports so we can ensure they don't 
            // conflict with any variable declaration names.
            var importDeclarationNames: BlockIntrinsics<boolean> = null;
            if (enclosingDecl.kind & (PullElementKind.Container | PullElementKind.DynamicModule | PullElementKind.Script)) {
                var childDecls = enclosingDecl.getChildDecls();
                for (var i = 0, n = childDecls.length; i < n; i++) {
                    var childDecl = childDecls[i];
                    if (childDecl.kind === PullElementKind.TypeAlias) {
                        importDeclarationNames = importDeclarationNames || new BlockIntrinsics();
                        importDeclarationNames[childDecl.name] = true;
                    }
                }
            }

            var declGroups: PullDecl[][] = enclosingDecl.getVariableDeclGroups();

            for (var i = 0, i_max = declGroups.length; i < i_max; i++) {
                var firstSymbol: PullSymbol = null;
                var firstSymbolType: PullTypeSymbol = null;

                // If we are in a script context, we need to check more than just the current file. We need to check var type identity between files as well.
                if (enclosingDecl.kind === PullElementKind.Script && declGroups[i].length) {
                    var name = declGroups[i][0].name;
                    var candidateSymbol = this.semanticInfoChain.findTopLevelSymbol(name, PullElementKind.Variable, enclosingDecl.getScriptName());
                    if (candidateSymbol && candidateSymbol.isResolved) {
                        if (!candidateSymbol.hasFlag(PullElementFlags.ImplicitVariable)) {
                            firstSymbol = candidateSymbol;
                            firstSymbolType = candidateSymbol.type;
                        }
                    }

                    // Also collect any imports with this name (throughout any of the files)
                    var importSymbol = this.semanticInfoChain.findTopLevelSymbol(name, PullElementKind.TypeAlias, null);
                    if (importSymbol && importSymbol.isAlias()) {
                        importDeclarationNames = importDeclarationNames || new BlockIntrinsics();
                        importDeclarationNames[name] = true;
                    }
                }

                for (var j = 0, j_max = declGroups[i].length; j < j_max; j++) {
                    var decl = declGroups[i][j];
                    var boundDeclAST = this.semanticInfoChain.getASTForDecl(decl);

                    var name = decl.name;

                    // Make sure the variable declaration doesn't conflict with an import declaration.
                    if (importDeclarationNames && importDeclarationNames[name]) {
                        context.postError(this.currentUnit.getPath(), boundDeclAST.minChar, boundDeclAST.getLength(),
                            DiagnosticCode.Variable_declaration_cannot_have_the_same_name_as_an_import_declaration, null);
                        continue;
                    }

                    var symbol = decl.getSymbol();
                    var symbolType = symbol.type;

                    if (j === 0 && !firstSymbol) {
                        firstSymbol = symbol;
                        firstSymbolType = symbolType;
                        continue;
                    }

                    if (symbolType && firstSymbolType && symbolType !== firstSymbolType && !this.typesAreIdentical(symbolType, firstSymbolType)) {
                        context.postError(this.currentUnit.getPath(), boundDeclAST.minChar, boundDeclAST.getLength(), DiagnosticCode.Subsequent_variable_declarations_must_have_the_same_type_Variable_0_must_be_of_type_1_but_here_has_type_2, [symbol.getScopedName(), firstSymbolType.toString(), symbolType.toString()]);
                        continue;
                    }
                }
            }
        }

        private typeCheckFunctionOverloads(funcDecl: FunctionDeclaration, context: PullTypeResolutionContext, signature?: PullSignatureSymbol, allSignatures?: PullSignatureSymbol[]) {
            if (!signature) {
                var functionSignatureInfo = PullHelpers.getSignatureForFuncDecl(funcDecl, this.currentUnit);
                signature = functionSignatureInfo.signature;
                allSignatures = functionSignatureInfo.allSignatures;
            }
            var functionDeclaration = this.currentUnit.getDeclForAST(funcDecl);
            var funcSymbol = functionDeclaration.getSymbol();

            // Find the definition signature for this signature group
            var definitionSignature: PullSignatureSymbol = null;
            for (var i = allSignatures.length - 1; i >= 0; i--) {
                if (allSignatures[i].isDefinition()) {
                    definitionSignature = allSignatures[i];
                    break;
                }
            }

            if (!signature.isDefinition()) {
                // Check for if the signatures are identical, check with the signatures before the current current one
                for (var i = 0; i < allSignatures.length; i++) {
                    if (allSignatures[i] === signature) {
                        break;
                    }

                    if (this.signaturesAreIdentical(allSignatures[i], signature, /*includingReturnType*/ false)) {
                        if (!this.typesAreIdentical(allSignatures[i].returnType, signature.returnType)) {
                            context.postError(this.unitPath, funcDecl.minChar, funcDecl.getLength(), DiagnosticCode.Overloads_cannot_differ_only_by_return_type, null);
                        } else if (funcDecl.isConstructor) {
                            context.postError(this.unitPath, funcDecl.minChar, funcDecl.getLength(), DiagnosticCode.Duplicate_constructor_overload_signature, null);
                        } else if (funcDecl.isConstructMember()) {
                            context.postError(this.unitPath, funcDecl.minChar, funcDecl.getLength(), DiagnosticCode.Duplicate_overload_construct_signature, null);
                        } else if (funcDecl.isCallMember()) {
                            context.postError(this.unitPath, funcDecl.minChar, funcDecl.getLength(), DiagnosticCode.Duplicate_overload_call_signature, null);
                        } else {
                            context.postError(this.unitPath, funcDecl.minChar, funcDecl.getLength(), DiagnosticCode.Duplicate_overload_signature_for_0, [funcSymbol.getScopedNameEx().toString()]);
                        }

                        break;
                    }
                }
            }

            // Verify assignment compatibility or in case of constantOverload signature, if its subtype of atleast one signature
            var isConstantOverloadSignature = signature.isStringConstantOverloadSignature();
            if (isConstantOverloadSignature) {
                if (signature.isDefinition()) {
                    // Report error - definition signature cannot specify constant type
                    context.postError(this.unitPath, funcDecl.minChar, funcDecl.getLength(), DiagnosticCode.Overload_signature_implementation_cannot_use_specialized_type, null);
                } else {
                    // PERFREVIEW: Why create a new resolution context?
                    //var resolutionContext = new PullTypeResolutionContext(true);
                    var foundSubtypeSignature = false;
                    for (var i = 0; i < allSignatures.length; i++) {
                        if (allSignatures[i].isDefinition() || allSignatures[i] === signature) {
                            continue;
                        }

                        if (!allSignatures[i].isResolved) {
                            this.resolveDeclaredSymbol(allSignatures[i], this.getEnclosingDecl(functionDeclaration), context);
                        }

                        if (allSignatures[i].isStringConstantOverloadSignature()) {
                            continue;
                        }

                        if (this.signatureIsSubtypeOfTarget(signature, allSignatures[i], context)) {
                            foundSubtypeSignature = true;
                            break;
                        }
                    }

                    if (!foundSubtypeSignature) {
                        // Could not find the overload signature subtype
                        context.postError(this.unitPath, funcDecl.minChar, funcDecl.getLength(), DiagnosticCode.Specialized_overload_signature_is_not_subtype_of_any_non_specialized_signature, null);
                    }
                }
            } else if (definitionSignature && definitionSignature != signature) {
                var comparisonInfo = new TypeComparisonInfo();
                //var resolutionContext = new PullTypeResolutionContext();
                if (!definitionSignature.isResolved) {
                    this.resolveDeclaredSymbol(definitionSignature, this.getEnclosingDecl(functionDeclaration), context);
                }

                if (!this.signatureIsAssignableToTarget(definitionSignature, signature, context, comparisonInfo)) {
                    // definition signature is not assignable to functionSignature then its incorrect overload signature
                    if (comparisonInfo.message) {
                        context.postError(this.unitPath, funcDecl.minChar, funcDecl.getLength(), DiagnosticCode.Overload_signature_is_not_compatible_with_function_definition_NL_0, [comparisonInfo.message]);
                    } else {
                        context.postError(this.unitPath, funcDecl.minChar, funcDecl.getLength(), DiagnosticCode.Overload_signature_is_not_compatible_with_function_definition, null);
                    }
                }
            }

            var signatureForVisibilityCheck = definitionSignature;
            if (!definitionSignature) {
                if (allSignatures[0] === signature) {
                    return;
                }
                signatureForVisibilityCheck = allSignatures[0];
            }

            if (!funcDecl.isConstructor && !funcDecl.isConstructMember() && signatureForVisibilityCheck && signature != signatureForVisibilityCheck) {
                var errorCode: string;
                // verify it satisfies all the properties of first signature
                if (signatureForVisibilityCheck.hasFlag(PullElementFlags.Private) != signature.hasFlag(PullElementFlags.Private)) {
                    errorCode = DiagnosticCode.Overload_signatures_must_all_be_public_or_private;
                }
                else if (signatureForVisibilityCheck.hasFlag(PullElementFlags.Exported) != signature.hasFlag(PullElementFlags.Exported)) {
                    errorCode = DiagnosticCode.Overload_signatures_must_all_be_exported_or_not_exported;
                }
                else if (signatureForVisibilityCheck.hasFlag(PullElementFlags.Ambient) != signature.hasFlag(PullElementFlags.Ambient)) {
                    errorCode = DiagnosticCode.Overload_signatures_must_all_be_ambient_or_non_ambient;
                }
                else if (signatureForVisibilityCheck.hasFlag(PullElementFlags.Optional) != signature.hasFlag(PullElementFlags.Optional)) {
                    errorCode = DiagnosticCode.Overload_signatures_must_all_be_optional_or_required;
                }

                if (errorCode) {
                    context.postError(this.unitPath, funcDecl.minChar, funcDecl.getLength(), errorCode, null);
                }
            }
        }

        // Privacy checking

        private checkSymbolPrivacy(declSymbol: PullSymbol, symbol: PullSymbol, context: PullTypeResolutionContext, privacyErrorReporter: (symbol: PullSymbol) => void) {
            if (!symbol || symbol.kind === PullElementKind.Primitive) {
                return;
            }

            if (symbol.isType()) {
                var typeSymbol = <PullTypeSymbol>symbol;
                if (typeSymbol.isArray()) {
                    this.checkSymbolPrivacy(declSymbol, typeSymbol.getElementType(), context, privacyErrorReporter);
                    return;
                }

                if (!typeSymbol.isNamedTypeSymbol()) {
                    if (typeSymbol.inSymbolPrivacyCheck) {
                        var associatedContainerType = typeSymbol.getAssociatedContainerType();
                        if (associatedContainerType && associatedContainerType.isNamedTypeSymbol()) {
                            this.checkSymbolPrivacy(declSymbol, associatedContainerType, context, privacyErrorReporter);
                        }
                        return;
                    }

                    typeSymbol.inSymbolPrivacyCheck = true;

                    // Check the privacy of members, constructors, calls, index signatures
                    var members = typeSymbol.getMembers();
                    for (var i = 0; i < members.length; i++) {
                        this.checkSymbolPrivacy(declSymbol, members[i].type, context, privacyErrorReporter);
                    }

                    this.checkTypePrivacyOfSignatures(declSymbol, typeSymbol.getCallSignatures(), context, privacyErrorReporter);
                    this.checkTypePrivacyOfSignatures(declSymbol, typeSymbol.getConstructSignatures(), context, privacyErrorReporter);
                    this.checkTypePrivacyOfSignatures(declSymbol, typeSymbol.getIndexSignatures(), context, privacyErrorReporter);

                    typeSymbol.inSymbolPrivacyCheck = false;

                    return;
                }
            }

            // Check flags for the symbol itself
            if (declSymbol.isExternallyVisible()) {
                // Check if type symbol is externally visible
                var symbolIsVisible = symbol.isExternallyVisible();
                // If Visible check if the type is part of dynamic module
                if (symbolIsVisible && symbol.kind != PullElementKind.Primitive && symbol.kind != PullElementKind.TypeParameter) {
                    var symbolPath = symbol.pathToRoot();
                    var declSymbolPath = declSymbol.pathToRoot();
                    // Symbols are from different dynamic modules
                    if (symbolPath[symbolPath.length - 1].kind === PullElementKind.DynamicModule &&
                        declSymbolPath[declSymbolPath.length - 1].kind == PullElementKind.DynamicModule &&
                        declSymbolPath[declSymbolPath.length - 1] != symbolPath[symbolPath.length - 1]) {
                        // Declaration symbol is from different modules
                        // Type may not be visible without import statement
                        symbolIsVisible = false;
                        for (var i = symbolPath.length - 1; i >= 0; i--) {
                            var aliasSymbol = symbolPath[i].getAliasedSymbol(declSymbol);
                            if (aliasSymbol) {
                                // Visible type.
                                symbolIsVisible = true;
                                aliasSymbol.typeUsedExternally = true;
                                break;
                            }
                        }
                        symbol = symbolPath[symbolPath.length - 1];
                    }
                } else if (symbol.kind == PullElementKind.TypeAlias) {
                    var aliasSymbol = <PullTypeAliasSymbol>symbol;
                    symbolIsVisible = true;
                    aliasSymbol.typeUsedExternally = true;
                }

                if (!symbolIsVisible) {
                    // declaration is visible from outside but the type isnt - Report error
                    privacyErrorReporter(symbol);
                }
            }
        }

        private checkTypePrivacyOfSignatures(declSymbol: PullSymbol, signatures: PullSignatureSymbol[], context: PullTypeResolutionContext, privacyErrorReporter: (symbol: PullSymbol) => void) {
            for (var i = 0; i < signatures.length; i++) {
                var signature = signatures[i];
                if (signatures.length > 1 && signature.isDefinition()) {
                    continue;
                }

                var typeParams = signature.getTypeParameters();
                for (var j = 0; j < typeParams.length; j++) {
                    this.checkSymbolPrivacy(declSymbol, typeParams[j], context, privacyErrorReporter);
                }

                var params = signature.parameters;
                for (var j = 0; j < params.length; j++) {
                    var paramType = params[j].type;
                    this.checkSymbolPrivacy(declSymbol, paramType, context, privacyErrorReporter);
                }

                var returnType = signature.returnType;
                this.checkSymbolPrivacy(declSymbol, returnType, context, privacyErrorReporter);
            }
        }

        private baseListPrivacyErrorReporter(declAST: TypeDeclaration, declSymbol: PullTypeSymbol, baseAst: AST, isExtendedType: boolean, symbol: PullSymbol, context: PullTypeResolutionContext) {
            var decl: PullDecl = this.getDeclForAST(declAST);
            var enclosingDecl = this.getEnclosingDecl(decl);
            var enclosingSymbol = enclosingDecl ? enclosingDecl.getSymbol() : null;
            var messageCode: string;

            var typeSymbol = <PullTypeSymbol>symbol;
            var typeSymbolName = typeSymbol.getScopedName(enclosingSymbol);
            if (typeSymbol.isContainer() && !typeSymbol.isEnum()) {
                if (!isQuoted(typeSymbolName)) {
                    typeSymbolName = "'" + typeSymbolName + "'";
                }
                if (declAST.nodeType() === NodeType.ClassDeclaration) {
                    // Class
                    if (isExtendedType) {
                        messageCode = DiagnosticCode.Exported_class_0_extends_class_from_inaccessible_module_1;
                    } else {
                        messageCode = DiagnosticCode.Exported_class_0_implements_interface_from_inaccessible_module_1;
                    }
                } else {
                    // Interface
                    messageCode = DiagnosticCode.Exported_interface_0_extends_interface_from_inaccessible_module_1;
                }
            } else {
                if (declAST.nodeType() === NodeType.ClassDeclaration) {
                    // Class
                    if (isExtendedType) {
                        messageCode = DiagnosticCode.Exported_class_0_extends_private_class_1;
                    } else {
                        messageCode = DiagnosticCode.Exported_class_0_implements_private_interface_1;
                    }
                } else {
                    // Interface
                    messageCode = DiagnosticCode.Exported_interface_0_extends_private_interface_1;
                }
            }

            var messageArguments = [declSymbol.getScopedName(enclosingSymbol), typeSymbolName];
            context.postError(this.unitPath, baseAst.minChar, baseAst.getLength(), messageCode, messageArguments);
        }

        private variablePrivacyErrorReporter(declSymbol: PullSymbol, symbol: PullSymbol, context: PullTypeResolutionContext) {
            var typeSymbol = <PullTypeSymbol>symbol;
            var declAST = <VariableDeclarator>this.getASTForSymbol(declSymbol);
            var enclosingDecl = this.getEnclosingDecl(declSymbol.getDeclarations()[0]);
            var enclosingSymbol = enclosingDecl ? enclosingDecl.getSymbol() : null;

            var isProperty = declSymbol.kind === PullElementKind.Property;
            var isPropertyOfClass = false;
            var declParent = declSymbol.getContainer();
            if (declParent && (declParent.kind === PullElementKind.Class || declParent.kind === PullElementKind.ConstructorMethod)) {
                isPropertyOfClass = true;
            }

            var messageCode: string;
            var typeSymbolName = typeSymbol.getScopedName(enclosingSymbol);
            if (typeSymbol.isContainer() && !typeSymbol.isEnum()) {
                if (!isQuoted(typeSymbolName)) {
                    typeSymbolName = "'" + typeSymbolName + "'";
                }

                if (declSymbol.hasFlag(PullElementFlags.Static)) {
                    messageCode = DiagnosticCode.Public_static_property_0_of_exported_class_is_using_inaccessible_module_1;
                } else if (isProperty) {
                    if (isPropertyOfClass) {
                        messageCode = DiagnosticCode.Public_property_0_of_exported_class_is_using_inaccessible_module_1;
                    } else {
                        messageCode = DiagnosticCode.Property_0_of_exported_interface_is_using_inaccessible_module_1;
                    }
                } else {
                    messageCode = DiagnosticCode.Exported_variable_0_is_using_inaccessible_module_1;
                }
            } else {
                if (declSymbol.hasFlag(PullElementFlags.Static)) {
                    messageCode = DiagnosticCode.Public_static_property_0_of_exported_class_has_or_is_using_private_type_1;
                } else if (isProperty) {
                    if (isPropertyOfClass) {
                        messageCode = DiagnosticCode.Public_property_0_of_exported_class_has_or_is_using_private_type_1;
                    } else {
                        messageCode = DiagnosticCode.Property_0_of_exported_interface_has_or_is_using_private_type_1;
                    }
                } else {
                    messageCode = DiagnosticCode.Exported_variable_0_has_or_is_using_private_type_1;
                }
            }

            var messageArguments = [declSymbol.getScopedName(enclosingSymbol), typeSymbolName];
            context.postError(this.unitPath, declAST.minChar, declAST.getLength(), messageCode, messageArguments);
        }

        private checkFunctionTypePrivacy(funcDeclAST: FunctionDeclaration, context: PullTypeResolutionContext) {
            if ((funcDeclAST.getFunctionFlags() & FunctionFlags.IsFunctionExpression) ||
                (funcDeclAST.getFunctionFlags() & FunctionFlags.IsFunctionProperty)) {
                return;
            }

            var functionDecl = this.currentUnit.getDeclForAST(funcDeclAST);
            var functionSymbol = functionDecl.getSymbol();;
            var functionSignature: PullSignatureSymbol;

            var isGetter = funcDeclAST.isGetAccessor();
            var isSetter = funcDeclAST.isSetAccessor();

            if (isGetter || isSetter) {
                var accessorSymbol = <PullAccessorSymbol> functionSymbol;
                functionSignature = (isGetter ? accessorSymbol.getGetter() : accessorSymbol.getSetter()).type.getCallSignatures()[0];
            } else {
                if (!functionSymbol) {
                    var parentDecl = functionDecl.getParentDecl();
                    functionSymbol = parentDecl.getSymbol();
                    if (functionSymbol && functionSymbol.isType() && !(<PullTypeSymbol>functionSymbol).isNamedTypeSymbol()) {
                        // Call Signature from the non named type
                        return;
                    }
                } else if (functionSymbol.kind == PullElementKind.Method && !functionSymbol.getContainer().isNamedTypeSymbol()) {
                    // method of the unnmaed type
                    return;
                }
                functionSignature = functionDecl.getSignatureSymbol();
            }

            // Check function parameters
            if (!isGetter) {
                var funcParams = functionSignature.parameters;
                for (var i = 0; i < funcParams.length; i++) {
                    this.checkSymbolPrivacy(functionSymbol, funcParams[i].type, context, (symbol: PullSymbol) =>
                        this.functionArgumentTypePrivacyErrorReporter(funcDeclAST, i, funcParams[i], symbol, context));
                }
            }

            // Check return type
            if (!isSetter) {
                this.checkSymbolPrivacy(functionSymbol, functionSignature.returnType, context, (symbol: PullSymbol) =>
                    this.functionReturnTypePrivacyErrorReporter(funcDeclAST, functionSignature.returnType, symbol, context));
            }
        }

        private functionArgumentTypePrivacyErrorReporter(declAST: FunctionDeclaration, argIndex: number, paramSymbol: PullSymbol, symbol: PullSymbol, context: PullTypeResolutionContext) {
            var decl: PullDecl = this.getDeclForAST(declAST);
            var enclosingDecl = this.getEnclosingDecl(decl);
            var enclosingSymbol = enclosingDecl ? enclosingDecl.getSymbol() : null;

            var isGetter = declAST.isAccessor() && hasFlag(declAST.getFunctionFlags(), FunctionFlags.GetAccessor);
            var isSetter = declAST.isAccessor() && hasFlag(declAST.getFunctionFlags(), FunctionFlags.SetAccessor);
            var isStatic = (decl.flags & PullElementFlags.Static) === PullElementFlags.Static;
            var isMethod = decl.kind === PullElementKind.Method;
            var isMethodOfClass = false;
            var declParent = decl.getParentDecl();
            if (declParent && (declParent.kind === PullElementKind.Class || declParent.kind === PullElementKind.ConstructorMethod)) {
                isMethodOfClass = true;
            }

            var start = declAST.arguments.members[argIndex].minChar;
            var length = declAST.arguments.members[argIndex].getLength();

            var typeSymbol = <PullTypeSymbol>symbol;
            var typeSymbolName = typeSymbol.getScopedName(enclosingSymbol);
            var messageCode: string;
            if (typeSymbol.isContainer() && !typeSymbol.isEnum()) {
                if (!isQuoted(typeSymbolName)) {
                    typeSymbolName = "'" + typeSymbolName + "'";
                }

                if (declAST.isConstructor) {
                    messageCode = DiagnosticCode.Parameter_0_of_constructor_from_exported_class_is_using_inaccessible_module_1;
                } else if (isSetter) {
                    if (isStatic) {
                        messageCode = DiagnosticCode.Parameter_0_of_public_static_property_setter_from_exported_class_is_using_inaccessible_module_1;
                    } else {
                        messageCode = DiagnosticCode.Parameter_0_of_public_property_setter_from_exported_class_is_using_inaccessible_module_1;
                    }
                } else if (declAST.isConstructMember()) {
                    messageCode = DiagnosticCode.Parameter_0_of_constructor_signature_from_exported_interface_is_using_inaccessible_module_1;
                } else if (declAST.isCallMember()) {
                    messageCode = DiagnosticCode.Parameter_0_of_call_signature_from_exported_interface_is_using_inaccessible_module_1;
                } else if (isMethod) {
                    if (isStatic) {
                        messageCode = DiagnosticCode.Parameter_0_of_public_static_method_from_exported_class_is_using_inaccessible_module_1;
                    } else if (isMethodOfClass) {
                        messageCode = DiagnosticCode.Parameter_0_of_public_method_from_exported_class_is_using_inaccessible_module_1;
                    } else {
                        messageCode = DiagnosticCode.Parameter_0_of_method_from_exported_interface_is_using_inaccessible_module_1;
                    }
                } else if (!isGetter) {
                    messageCode = DiagnosticCode.Parameter_0_of_exported_function_is_using_inaccessible_module_1;
                }
            } else {
                if (declAST.isConstructor) {
                    messageCode = DiagnosticCode.Parameter_0_of_constructor_from_exported_class_has_or_is_using_private_type_1;
                } else if (isSetter) {
                    if (isStatic) {
                        messageCode = DiagnosticCode.Parameter_0_of_public_static_property_setter_from_exported_class_has_or_is_using_private_type_1;
                    } else {
                        messageCode = DiagnosticCode.Parameter_0_of_public_property_setter_from_exported_class_has_or_is_using_private_type_1;
                    }
                } else if (declAST.isConstructMember()) {
                    messageCode = DiagnosticCode.Parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_type_1;
                } else if (declAST.isCallMember()) {
                    messageCode = DiagnosticCode.Parameter_0_of_call_signature_from_exported_interface_has_or_is_using_private_type_1;
                } else if (isMethod) {
                    if (isStatic) {
                        messageCode = DiagnosticCode.Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_private_type_1;
                    } else if (isMethodOfClass) {
                        messageCode = DiagnosticCode.Parameter_0_of_public_method_from_exported_class_has_or_is_using_private_type_1;
                    } else {
                        messageCode = DiagnosticCode.Parameter_0_of_method_from_exported_interface_has_or_is_using_private_type_1;
                    }
                } else if (!isGetter && !declAST.isIndexerMember()) {
                    messageCode = DiagnosticCode.Parameter_0_of_exported_function_has_or_is_using_private_type_1;
                }
            }

            if (messageCode) {
                var messageArgs = [paramSymbol.getScopedName(enclosingSymbol), typeSymbolName];
                context.postError(this.unitPath, start, length, messageCode, messageArgs);
            }
        }

        private functionReturnTypePrivacyErrorReporter(declAST: FunctionDeclaration, funcReturnType: PullTypeSymbol, symbol: PullSymbol, context: PullTypeResolutionContext) {
            var decl: PullDecl = this.getDeclForAST(declAST);
            var enclosingDecl = this.getEnclosingDecl(decl);

            var isGetter = declAST.isAccessor() && hasFlag(declAST.getFunctionFlags(), FunctionFlags.GetAccessor);
            var isSetter = declAST.isAccessor() && hasFlag(declAST.getFunctionFlags(), FunctionFlags.SetAccessor);
            var isStatic = (decl.flags & PullElementFlags.Static) === PullElementFlags.Static;
            var isMethod = decl.kind === PullElementKind.Method;
            var isMethodOfClass = false;
            var declParent = decl.getParentDecl();
            if (declParent && (declParent.kind === PullElementKind.Class || declParent.kind === PullElementKind.ConstructorMethod)) {
                isMethodOfClass = true;
            }

            var messageCode: string = null;
            var typeSymbol = <PullTypeSymbol>symbol;
            var typeSymbolName = typeSymbol.getScopedName(enclosingDecl ? enclosingDecl.getSymbol() : null);
            if (typeSymbol.isContainer() && !typeSymbol.isEnum()) {
                if (!isQuoted(typeSymbolName)) {
                    typeSymbolName = "'" + typeSymbolName + "'";
                }

                if (isGetter) {
                    if (isStatic) {
                        messageCode = DiagnosticCode.Return_type_of_public_static_property_getter_from_exported_class_is_using_inaccessible_module_0;
                    } else {
                        messageCode = DiagnosticCode.Return_type_of_public_property_getter_from_exported_class_is_using_inaccessible_module_0;
                    }
                } else if (declAST.isConstructMember()) {
                    messageCode = DiagnosticCode.Return_type_of_constructor_signature_from_exported_interface_is_using_inaccessible_module_0;
                } else if (declAST.isCallMember()) {
                    messageCode = DiagnosticCode.Return_type_of_call_signature_from_exported_interface_is_using_inaccessible_module_0;
                } else if (declAST.isIndexerMember()) {
                    messageCode = DiagnosticCode.Return_type_of_index_signature_from_exported_interface_is_using_inaccessible_module_0;
                } else if (isMethod) {
                    if (isStatic) {
                        messageCode = DiagnosticCode.Return_type_of_public_static_method_from_exported_class_is_using_inaccessible_module_0;
                    } else if (isMethodOfClass) {
                        messageCode = DiagnosticCode.Return_type_of_public_method_from_exported_class_is_using_inaccessible_module_0;
                    } else {
                        messageCode = DiagnosticCode.Return_type_of_method_from_exported_interface_is_using_inaccessible_module_0;
                    }
                } else if (!isSetter && !declAST.isConstructor) {
                    messageCode = DiagnosticCode.Return_type_of_exported_function_is_using_inaccessible_module_0;
                }
            } else {
                if (isGetter) {
                    if (isStatic) {
                        messageCode = DiagnosticCode.Return_type_of_public_static_property_getter_from_exported_class_has_or_is_using_private_type_0;
                    } else {
                        messageCode = DiagnosticCode.Return_type_of_public_property_getter_from_exported_class_has_or_is_using_private_type_0;
                    }
                } else if (declAST.isConstructMember()) {
                    messageCode = DiagnosticCode.Return_type_of_constructor_signature_from_exported_interface_has_or_is_using_private_type_0;
                } else if (declAST.isCallMember()) {
                    messageCode = DiagnosticCode.Return_type_of_call_signature_from_exported_interface_has_or_is_using_private_type_0;
                } else if (declAST.isIndexerMember()) {
                    messageCode = DiagnosticCode.Return_type_of_index_signature_from_exported_interface_has_or_is_using_private_type_0;
                } else if (isMethod) {
                    if (isStatic) {
                        messageCode = DiagnosticCode.Return_type_of_public_static_method_from_exported_class_has_or_is_using_private_type_0;
                    } else if (isMethodOfClass) {
                        messageCode = DiagnosticCode.Return_type_of_public_method_from_exported_class_has_or_is_using_private_type_0;
                    } else {
                        messageCode = DiagnosticCode.Return_type_of_method_from_exported_interface_has_or_is_using_private_type_0;
                    }
                } else if (!isSetter && !declAST.isConstructor) {
                    messageCode = DiagnosticCode.Return_type_of_exported_function_has_or_is_using_private_type_0;
                }
            }

            if (messageCode) {
                var messageArguments = [typeSymbolName];
                var reportOnFuncDecl = false;
                // PERFREVIEW: Why the new context?
                //var contextForReturnTypeResolution = new PullTypeResolutionContext();
                if (declAST.returnTypeAnnotation) {
                    // NOTE: we don't want to report this diagnostics.  They'll already have been 
                    // reported when we first hit the return statement.
                    var returnExpressionSymbol = this.resolveTypeReference(<TypeReference>declAST.returnTypeAnnotation, decl, context);
                    if (returnExpressionSymbol === funcReturnType) {
                        // Error coming from return annotation
                        context.postError(this.unitPath, declAST.returnTypeAnnotation.minChar, declAST.returnTypeAnnotation.getLength(), messageCode, messageArguments);
                    }
                }

                if (declAST.block) {
                    var reportErrorOnReturnExpressions = (ast: AST, parent: AST, walker: IAstWalker) => {
                        var go = true;
                        switch (ast.nodeType()) {
                            case NodeType.FunctionDeclaration:
                                // don't recurse into a function decl - we don't want to confuse a nested
                                // return type with the top-level function's return type
                                go = false;
                                break;

                            case NodeType.ReturnStatement:
                                var returnStatement: ReturnStatement = <ReturnStatement>ast;
                                var returnExpressionSymbol = this.resolveAST(returnStatement.returnExpression, false, decl, context).type;
                                // Check if return statement's type matches the one that we concluded
                                if (returnExpressionSymbol === funcReturnType) {
                                    context.postError(this.unitPath, returnStatement.minChar, returnStatement.getLength(), messageCode, messageArguments);
                                } else {
                                    reportOnFuncDecl = true;
                                }
                                go = false;
                                break;

                            default:
                                break;
                        }

                        walker.options.goChildren = go;
                        return ast;
                    };

                    getAstWalkerFactory().walk(declAST.block, reportErrorOnReturnExpressions);
                }

                if (reportOnFuncDecl) {
                    // Show on function decl
                    context.postError(this.unitPath, declAST.minChar, declAST.getLength(), messageCode, messageArguments);
                }
            }
        }

        public enclosingClassIsDerived(decl: PullDecl): boolean {
            if (decl) {
                var classSymbol: PullTypeSymbol = null;

                while (decl) {
                    if (decl.kind == PullElementKind.Class) {
                        classSymbol = <PullTypeSymbol>decl.getSymbol();
                        if (classSymbol.getExtendedTypes().length > 0) {
                            return true;
                        }

                        break;
                    }
                    decl = decl.getParentDecl();
                }
            }

            return false;
        }

        private isSuperCallNode(node: AST): boolean {
            if (node && node.nodeType() === NodeType.ExpressionStatement) {
                var expressionStatement = <ExpressionStatement>node;
                if (expressionStatement.expression && expressionStatement.expression.nodeType() === NodeType.InvocationExpression) {
                    var callExpression = <InvocationExpression>expressionStatement.expression;
                    if (callExpression.target && callExpression.target.nodeType() === NodeType.SuperExpression) {
                        return true;
                    }
                }
            }
            return false;
        }

        private getFirstStatementFromFunctionDeclAST(funcDeclAST: FunctionDeclaration): AST {
            if (funcDeclAST.block && funcDeclAST.block.statements && funcDeclAST.block.statements.members) {
                return funcDeclAST.block.statements.members[0];
            }

            return null;
        }

        private superCallMustBeFirstStatementInConstructor(enclosingConstructor: PullDecl, enclosingClass: PullDecl): boolean {
            /*
            The first statement in the body of a constructor must be a super call if both of the following are true:
                •   The containing class is a derived class.
                •   The constructor declares parameter properties or the containing class declares instance member variables with initializers.
            In such a required super call, it is a compile-time error for argument expressions to reference this.
            */
            if (enclosingConstructor && enclosingClass) {
                var classSymbol = <PullTypeSymbol>enclosingClass.getSymbol();
                if (classSymbol.getExtendedTypes().length === 0) {
                    return false;
                }

                var classMembers = classSymbol.getMembers();
                for (var i = 0, n1 = classMembers.length; i < n1; i++) {
                    var member = classMembers[i];

                    if (member.kind === PullElementKind.Property) {
                        var declarations = member.getDeclarations();
                        for (var j = 0, n2 = declarations.length; j < n2; j++) {
                            var declaration = declarations[j];
                            var ast = this.semanticInfoChain.getASTForDecl(declaration);
                            if (ast.nodeType() === NodeType.Parameter) {
                                return true;
                            }

                            if (ast.nodeType() === NodeType.VariableDeclarator) {
                                var variableDeclarator = <VariableDeclarator>ast;
                                if (variableDeclarator.init) {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }

            return false;
        }

        private checkForThisCaptureInArrowFunction(expression: AST, enclosingDecl: PullDecl): void {

            var declPath: PullDecl[] = getPathToDecl(enclosingDecl);

            // work back up the decl path, until you can find a class
            // PULLTODO: Obviously not completely correct, but this sufficiently unblocks testing of the pull model
            if (declPath.length) {
                var inFatArrow = false;
                for (var i = declPath.length - 1; i >= 0; i--) {
                    var decl = declPath[i];
                    var declKind = decl.kind;
                    var declFlags = decl.flags;

                    if (declKind === PullElementKind.FunctionExpression &&
                        hasFlag(declFlags, PullElementFlags.FatArrow)) {

                        inFatArrow = true;
                        continue;
                    }

                    if (inFatArrow) {
                        if (declKind === PullElementKind.Function ||
                            declKind === PullElementKind.Method ||
                            declKind === PullElementKind.ConstructorMethod ||
                            declKind === PullElementKind.GetAccessor ||
                            declKind === PullElementKind.SetAccessor ||
                            declKind === PullElementKind.FunctionExpression ||
                            declKind === PullElementKind.Class ||
                            declKind === PullElementKind.Container ||
                            declKind === PullElementKind.DynamicModule ||
                            declKind === PullElementKind.Script) {

                            decl.setFlags(decl.flags | PullElementFlags.MustCaptureThis);

                            // If we're accessing 'this' in a class, then the class constructor 
                            // needs to be marked as capturing 'this'.
                            if (declKind === PullElementKind.Class) {
                                var constructorSymbol = (<PullTypeSymbol> decl.getSymbol()).getConstructorMethod();
                                var constructorDecls = constructorSymbol.getDeclarations();
                                for (var i = 0; i < constructorDecls.length; i++) {
                                    constructorDecls[i].flags = constructorDecls[i].flags | PullElementFlags.MustCaptureThis;
                                }
                            }
                            break;
                        }
                    }
                    else if (declKind === PullElementKind.Function || declKind === PullElementKind.FunctionExpression) {
                        break;
                    }
                }
            }
        }

        private typeCheckMembersAgainstIndexer(containerType: PullTypeSymbol, containerTypeDecl: PullDecl, context: PullTypeResolutionContext) {
            // Check all the members defined in this symbol's declarations (no base classes)
            var indexSignatures = this.getBothKindsOfIndexSignatures(containerType, context);
            var stringSignature = indexSignatures.stringSignature;
            var numberSignature = indexSignatures.numericSignature;

            if (stringSignature || numberSignature) {
                var members = containerTypeDecl.getChildDecls();
                for (var i = 0; i < members.length; i++) {
                    // Make sure the member is actually contained by the containerType, and not its associated constructor type
                    var member = members[i];
                    if (member.name
                        && member.kind !== PullElementKind.ConstructorMethod
                        && member.getSymbol().getContainer() === containerType) {
                        // Decide whether to check against the number or string signature
                        var isMemberNumeric = PullHelpers.isNameNumeric(member.name);
                        if (isMemberNumeric && numberSignature) {
                            this.checkThatMemberIsSubtypeOfIndexer(member.getSymbol(), numberSignature, this.semanticInfoChain.getASTForDecl(member), context, containerTypeDecl, /*isNumeric*/ true);
                        }
                        else if (stringSignature) {
                            this.checkThatMemberIsSubtypeOfIndexer(member.getSymbol(), stringSignature, this.semanticInfoChain.getASTForDecl(member), context, containerTypeDecl, /*isNumeric*/ false);
                        }
                    }
                }
            }
        }

        private checkThatMemberIsSubtypeOfIndexer(member: PullSymbol, indexSignature: PullSignatureSymbol, astForError: AST, context: PullTypeResolutionContext, enclosingDecl: PullDecl, isNumeric: boolean) {

            var comparisonInfo = new TypeComparisonInfo();
            var resolutionContext = new PullTypeResolutionContext(this);

            if (!this.sourceIsSubtypeOfTarget(member.type, indexSignature.returnType, resolutionContext, comparisonInfo)) {
                if (isNumeric) {
                    if (comparisonInfo.message) {
                        context.postError(this.unitPath, astForError.minChar, astForError.getLength(), DiagnosticCode.All_numerically_named_properties_must_be_subtypes_of_numeric_indexer_type_0_NL_1,
                            [indexSignature.returnType.toString(), comparisonInfo.message]);
                    } else {
                        context.postError(this.unitPath, astForError.minChar, astForError.getLength(), DiagnosticCode.All_numerically_named_properties_must_be_subtypes_of_numeric_indexer_type_0,
                            [indexSignature.returnType.toString()]);
                    }
                }
                else {
                    if (comparisonInfo.message) {
                        context.postError(this.unitPath, astForError.minChar, astForError.getLength(), DiagnosticCode.All_named_properties_must_be_subtypes_of_string_indexer_type_0_NL_1,
                            [indexSignature.returnType.toString(), comparisonInfo.message]);
                    } else {
                        context.postError(this.unitPath, astForError.minChar, astForError.getLength(), DiagnosticCode.All_named_properties_must_be_subtypes_of_string_indexer_type_0,
                            [indexSignature.returnType.toString()]);
                    }
                }
            }
        }

        private typeCheckIfTypeMemberPropertyOkToOverride(typeSymbol: PullTypeSymbol, extendedType: PullTypeSymbol, typeMember: PullSymbol, extendedTypeMember: PullSymbol, enclosingDecl: PullDecl, comparisonInfo: TypeComparisonInfo) {

            if (!typeSymbol.isClass()) {
                return true;
            }

            var typeMemberKind = typeMember.kind;
            var extendedMemberKind = extendedTypeMember.kind;

            if (typeMemberKind === extendedMemberKind) {
                return true;
            }

            var errorCode: string;
            if (typeMemberKind === PullElementKind.Property) {
                if (typeMember.isAccessor()) {
                    errorCode = DiagnosticCode.Class_0_defines_instance_member_accessor_1_but_extended_class_2_defines_it_as_instance_member_function;
                } else {
                    errorCode = DiagnosticCode.Class_0_defines_instance_member_property_1_but_extended_class_2_defines_it_as_instance_member_function;
                }
            } else if (typeMemberKind === PullElementKind.Method) {
                if (extendedTypeMember.isAccessor()) {
                    errorCode = DiagnosticCode.Class_0_defines_instance_member_function_1_but_extended_class_2_defines_it_as_instance_member_accessor;
                } else {
                    errorCode = DiagnosticCode.Class_0_defines_instance_member_function_1_but_extended_class_2_defines_it_as_instance_member_property;
                }
            }

            var message = getDiagnosticMessage(errorCode, [typeSymbol.toString(), typeMember.getScopedNameEx().toString(), extendedType.toString()]);
            comparisonInfo.addMessage(message);
            return false;
        }

        private typeCheckIfTypeExtendsType(typeDecl: TypeDeclaration, typeSymbol: PullTypeSymbol, extendedType: PullTypeSymbol, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            var typeMembers = typeSymbol.getMembers();

            var resolutionContext = new PullTypeResolutionContext(this);
            var comparisonInfo = new TypeComparisonInfo();
            var foundError = false;

            // Check members
            for (var i = 0; i < typeMembers.length; i++) {
                var propName = typeMembers[i].name;
                var extendedTypeProp = extendedType.findMember(propName);
                if (extendedTypeProp) {
                    this.resolveDeclaredSymbol(extendedTypeProp, extendedTypeProp.getDeclarations()[0].getParentDecl(), context);
                    foundError = !this.typeCheckIfTypeMemberPropertyOkToOverride(typeSymbol, extendedType, typeMembers[i], extendedTypeProp, enclosingDecl, comparisonInfo);

                    if (!foundError) {
                        foundError = !this.sourcePropertyIsSubtypeOfTargetProperty(typeSymbol, extendedType, typeMembers[i], extendedTypeProp, resolutionContext, comparisonInfo);
                    }

                    if (foundError) {
                        break;
                    }
                }
            }

            // Check call signatures
            if (!foundError && typeSymbol.hasOwnCallSignatures()) {
                foundError = !this.sourceCallSignaturesAreSubtypeOfTargetCallSignatures(typeSymbol, extendedType, resolutionContext, comparisonInfo);
            }

            // Check construct signatures
            if (!foundError && typeSymbol.hasOwnConstructSignatures()) {
                foundError = !this.sourceConstructSignaturesAreSubtypeOfTargetConstructSignatures(typeSymbol, extendedType, resolutionContext, comparisonInfo);
            }

            // Check index signatures
            if (!foundError && typeSymbol.hasOwnIndexSignatures()) {
                foundError = !this.sourceIndexSignaturesAreSubtypeOfTargetIndexSignatures(typeSymbol, extendedType, resolutionContext, comparisonInfo);
            }

            if (!foundError && typeSymbol.isClass()) {
                // If there is base class verify the constructor type is subtype of base class
                var typeConstructorType = typeSymbol.getConstructorMethod().type;
                var typeConstructorTypeMembers = typeConstructorType.getMembers();
                if (typeConstructorTypeMembers.length) {
                    var extendedConstructorType = extendedType.getConstructorMethod().type;
                    var comparisonInfoForPropTypeCheck = new TypeComparisonInfo(comparisonInfo);

                    // Verify that all the overriden members of the constructor type are compatible
                    for (var i = 0; i < typeConstructorTypeMembers.length; i++) {
                        var propName = typeConstructorTypeMembers[i].name;
                        var extendedConstructorTypeProp = extendedConstructorType.findMember(propName);
                        if (extendedConstructorTypeProp) {
                            if (!extendedConstructorTypeProp.isResolved) {
                                var extendedClassAst = this.currentUnit.getASTForDecl(extendedType.getDeclarations()[0]);
                                var extendedClassDecl = this.currentUnit.getDeclForAST(extendedClassAst);
                                this.resolveDeclaredSymbol(extendedConstructorTypeProp, extendedClassDecl, resolutionContext);
                            }

                            // check if type of property is subtype of extended type's property type
                            var typeConstructorTypePropType = typeConstructorTypeMembers[i].type;
                            var extendedConstructorTypePropType = extendedConstructorTypeProp.type;
                            if (!this.sourceIsSubtypeOfTarget(typeConstructorTypePropType, extendedConstructorTypePropType, resolutionContext, comparisonInfoForPropTypeCheck)) {
                                var propMessage: string;
                                if (comparisonInfoForPropTypeCheck.message) {
                                    propMessage = getDiagnosticMessage(DiagnosticCode.Types_of_static_property_0_of_class_1_and_class_2_are_incompatible_NL_3,
                                        [extendedConstructorTypeProp.getScopedNameEx().toString(), typeSymbol.toString(), extendedType.toString(), comparisonInfoForPropTypeCheck.message]);
                                } else {
                                    propMessage = getDiagnosticMessage(DiagnosticCode.Types_of_static_property_0_of_class_1_and_class_2_are_incompatible,
                                        [extendedConstructorTypeProp.getScopedNameEx().toString(), typeSymbol.toString(), extendedType.toString()]);
                                }
                                comparisonInfo.addMessage(propMessage);
                                foundError = true;
                                break;
                            }
                        }
                    }
                }
            }

            if (foundError) {
                var errorCode: string;
                if (typeSymbol.isClass()) {
                    errorCode = DiagnosticCode.Class_0_cannot_extend_class_1_NL_2;
                } else {
                    if (extendedType.isClass()) {
                        errorCode = DiagnosticCode.Interface_0_cannot_extend_class_1_NL_2;
                    } else {
                        errorCode = DiagnosticCode.Interface_0_cannot_extend_interface_1_NL_2;
                    }
                }

                context.postError(this.unitPath, typeDecl.name.minChar, typeDecl.name.getLength(), errorCode, [typeSymbol.getScopedName(), extendedType.getScopedName(), comparisonInfo.message]);
            }
        }

        private typeCheckIfClassImplementsType(classDecl: TypeDeclaration, classSymbol: PullTypeSymbol, implementedType: PullTypeSymbol, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {

            var resolutionContext = new PullTypeResolutionContext(this);
            var comparisonInfo = new TypeComparisonInfo();
            var foundError = !this.sourceMembersAreSubtypeOfTargetMembers(classSymbol, implementedType, resolutionContext, comparisonInfo);
            if (!foundError) {
                foundError = !this.sourceCallSignaturesAreSubtypeOfTargetCallSignatures(classSymbol, implementedType, resolutionContext, comparisonInfo);
                if (!foundError) {
                    foundError = !this.sourceConstructSignaturesAreSubtypeOfTargetConstructSignatures(classSymbol, implementedType, resolutionContext, comparisonInfo);
                    if (!foundError) {
                        foundError = !this.sourceIndexSignaturesAreSubtypeOfTargetIndexSignatures(classSymbol, implementedType, resolutionContext, comparisonInfo);
                    }
                }
            }

            // Report error
            if (foundError) {
                context.postError(this.unitPath, classDecl.name.minChar, classDecl.name.getLength(), DiagnosticCode.Class_0_declares_interface_1_but_does_not_implement_it_NL_2, [classSymbol.getScopedName(), implementedType.getScopedName(), comparisonInfo.message]);
            }
        }

        private hasClassTypeSymbolConflictAsValue(
            valueDeclAST: Identifier,
            typeSymbol: PullTypeSymbol,
            enclosingDecl: PullDecl,
            context: PullTypeResolutionContext) {
            var typeSymbolAlias = this.currentUnit.getAliasSymbolForAST(valueDeclAST);
            var tempResolvingTypeNameAsNameExpression = context.resolvingTypeNameAsNameExpression;
            context.resolvingTypeNameAsNameExpression = true;
            var valueSymbol = this.computeNameExpression(valueDeclAST, enclosingDecl, context);
            context.resolvingTypeNameAsNameExpression = tempResolvingTypeNameAsNameExpression;
            var valueSymbolAlias = this.currentUnit.getAliasSymbolForAST(valueDeclAST);

            // Reset the alias value 
            this.currentUnit.setAliasSymbolForAST(valueDeclAST, typeSymbolAlias);

            // If aliases are same
            if (typeSymbolAlias && valueSymbolAlias) {
                return typeSymbolAlias != valueSymbolAlias;
            }

            // Verify if value refers to same class;
            if (!valueSymbol.hasFlag(PullElementFlags.ClassConstructorVariable)) {
                return true;
            }

            var associatedContainerType = valueSymbol.type ? valueSymbol.type.getAssociatedContainerType() : null;

            if (associatedContainerType) {
                // We may have specialized the typeSymbol to any for error recovery, as in the following example:
                // class A<T> { }
                // class B extends A { }
                // Since A was not given type arguments (which is an error), we may have specialized it to any, in which case A<any> != A<T>.
                // So we need to compare associatedContainerType to the rootSymbol (the unspecialized version) of typeSymbol
                return associatedContainerType != typeSymbol.getRootSymbol();
            }

            return true;
        }

        private typeCheckBase(typeDeclAst: TypeDeclaration,
            typeSymbol: PullTypeSymbol, baseDeclAST: AST,
            isExtendedType: boolean,
            enclosingDecl: PullDecl,
            context: PullTypeResolutionContext) {

            var typeDecl = this.getDeclForAST(typeDeclAst);

            var savedResolvingTypeReference = context.resolvingTypeReference;
            context.resolvingTypeReference = true;
            var baseType = this.resolveTypeReference(new TypeReference(baseDeclAST, 0), typeDecl, context).type;
            context.resolvingTypeReference = savedResolvingTypeReference;

            if (!baseType) {
                return;
            }

            var typeDeclIsClass = typeSymbol.isClass();

            if (!typeSymbol.isValidBaseKind(baseType, isExtendedType)) {
                // Report error about invalid base kind
                if (!baseType.isError()) {
                    if (isExtendedType) {
                        if (typeDeclIsClass) {
                            context.postError(this.unitPath, baseDeclAST.minChar, baseDeclAST.getLength(), DiagnosticCode.A_class_may_only_extend_another_class, null);
                        } else {
                            context.postError(this.unitPath, baseDeclAST.minChar, baseDeclAST.getLength(), DiagnosticCode.An_interface_may_only_extend_another_class_or_interface, null);
                        }
                    } else {
                        context.postError(this.unitPath, baseDeclAST.minChar, baseDeclAST.getLength(), DiagnosticCode.A_class_may_only_implement_another_class_or_interface, null);
                    }
                }
                return;
            } else if (typeDeclIsClass && isExtendedType && baseDeclAST.nodeType() == NodeType.Name) {
                // Verify if the class extends another class verify the value position resolves to the same type expression
                if (this.hasClassTypeSymbolConflictAsValue(<Identifier>baseDeclAST, baseType, enclosingDecl, context)) {
                    // Report error
                    context.postError(this.unitPath, baseDeclAST.minChar, baseDeclAST.getLength(), DiagnosticCode.Type_reference_0_in_extends_clause_doesn_t_reference_constructor_function_for_1, [(<Identifier>baseDeclAST).actualText, baseType.toString(enclosingDecl ? enclosingDecl.getSymbol() : null)]);
                }
            }

            // Check if its a recursive extend/implement type
            if (baseType.hasBase(typeSymbol)) {
                typeSymbol.setHasBaseTypeConflict();
                baseType.setHasBaseTypeConflict();
                // Report error
                context.postError(this.unitPath,
                    typeDeclAst.name.minChar,
                    typeDeclAst.name.getLength(),
                    typeDeclIsClass ? DiagnosticCode.Class_0_is_recursively_referenced_as_a_base_type_of_itself : DiagnosticCode.Interface_0_is_recursively_referenced_as_a_base_type_of_itself, [typeSymbol.getScopedName()]);
                return;
            }

            if (isExtendedType) {
                // Verify all own overriding members are subtype
                this.typeCheckIfTypeExtendsType(typeDeclAst, typeSymbol, baseType, enclosingDecl, context);
            } else {
                // If class implementes interface or class, verify all the public members are implemented
                this.typeCheckIfClassImplementsType(typeDeclAst, typeSymbol, baseType, enclosingDecl, context);
            }

            // Privacy error:
            this.checkSymbolPrivacy(typeSymbol, baseType, context, (errorSymbol: PullSymbol) =>
                this.baseListPrivacyErrorReporter(typeDeclAst, typeSymbol, baseDeclAST, isExtendedType, errorSymbol, context));
        }

        private typeCheckBases(typeDeclAst: TypeDeclaration, typeSymbol: PullTypeSymbol, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            if (!typeDeclAst.extendsList && !typeDeclAst.implementsList) {
                return;
            }

            var typeDeclIsClass = typeDeclAst.nodeType() === NodeType.ClassDeclaration;

            if (typeDeclAst.extendsList) {
                for (var i = 0; i < typeDeclAst.extendsList.members.length; i++) {
                    this.typeCheckBase(typeDeclAst, typeSymbol, typeDeclAst.extendsList.members[i], true, enclosingDecl, context);
                }
            }

            if (typeSymbol.isClass()) {
                if (typeDeclAst.implementsList) {
                    for (var i = 0; i < typeDeclAst.implementsList.members.length; i++) {
                        this.typeCheckBase(typeDeclAst, typeSymbol, typeDeclAst.implementsList.members[i], false, enclosingDecl, context);
                    }
                }
            }
            else {
                if (typeDeclAst.implementsList) {
                    context.postError(this.unitPath, typeDeclAst.implementsList.minChar, typeDeclAst.implementsList.getLength(), DiagnosticCode.An_interface_cannot_implement_another_type, null);
                }
                if (typeDeclAst.extendsList && typeDeclAst.extendsList.members.length > 1 && !typeSymbol.hasBaseTypeConflict()) {
                    this.checkPropertyTypeIdentityBetweenBases(typeDeclAst, typeSymbol, context);
                }
            }
        }

        private checkPropertyTypeIdentityBetweenBases(typeDeclAst: TypeDeclaration, typeSymbol: PullTypeSymbol, context: PullTypeResolutionContext): void {
            // Check that all the extended base types have compatible members (members of the same name must have identical types)
            var allMembers = typeSymbol.getAllMembers(PullElementKind.Property | PullElementKind.Method, GetAllMembersVisiblity.externallyVisible);
            var membersBag = new BlockIntrinsics<PullSymbol>();
            for (var i = 0; i < allMembers.length; i++) {
                var member = allMembers[i];
                var memberName = member.name;
                // Error if there is already a member in the bag with that name, and it doesn't have the same type
                if (membersBag[memberName]) {
                    var prevMember = membersBag[memberName];
                    if (!this.typesAreIdentical(member.type, prevMember.type)) {
                        var prevContainerName = prevMember.getContainer().getScopedName();
                        var curContainerName = member.getContainer().getScopedName();
                        context.postError(this.unitPath, typeDeclAst.name.minChar, typeDeclAst.name.getLength(),
                            DiagnosticCode.Interface_0_cannot_simultaneously_extend_types_1_and_2_NL_Types_of_property_3_of_types_1_and_2_are_not_identical,
                            [typeSymbol.getDisplayName(), prevContainerName, curContainerName, memberName]);
                    }
                }
                else {
                    membersBag[memberName] = member;
                }
            }
        }

        private checkAssignability(ast: AST, source: PullTypeSymbol, target: PullTypeSymbol, enclosingDecl: PullDecl, context: PullTypeResolutionContext): void {
            var comparisonInfo = new TypeComparisonInfo();

            var isAssignable = this.sourceIsAssignableToTarget(source, target, context, comparisonInfo);

            if (!isAssignable) {
                if (comparisonInfo.message) {
                    context.postError(this.unitPath, ast.minChar, ast.getLength(), DiagnosticCode.Cannot_convert_0_to_1_NL_2, [source.toString(), target.toString(), comparisonInfo.message]);
                } else {
                    context.postError(this.unitPath, ast.minChar, ast.getLength(), DiagnosticCode.Cannot_convert_0_to_1, [source.toString(), target.toString()]);
                }
            }
        }

        private isReference(ast: AST, astSymbol: PullSymbol): boolean {
            // References are the subset of expressions that are permitted as the target of an 
            // assignment.Specifically, references are combinations of identifiers(section 4.3),
            // parentheses(section 4.7), and property accesses(section 4.10).All other expression
            //  constructs described in this chapter are classified as values.

            if (ast.nodeType() === NodeType.ParenthesizedExpression) {
                // A parenthesized LHS is valid if the expression it wraps is valid.
                return this.isReference((<ParenthesizedExpression>ast).expression, astSymbol);
            }

            if (ast.nodeType() !== NodeType.Name && ast.nodeType() !== NodeType.MemberAccessExpression && ast.nodeType() !== NodeType.ElementAccessExpression) {
                return false;
            }

            // Disallow assignment to an enum, class or module variables.
            if (ast.nodeType() === NodeType.Name) {
                if (astSymbol.kind === PullElementKind.Variable && astSymbol.hasFlag(PullElementFlags.Enum)) {
                    return false;
                }

                if (astSymbol.kind === PullElementKind.Variable && astSymbol.hasFlag(PullElementFlags.SomeInitializedModule)) {
                    return false;
                }

                if (astSymbol.kind === PullElementKind.ConstructorMethod) {
                    return false;
                }
            }

            // Disallow assignment to an enum member.
            if (ast.nodeType() === NodeType.MemberAccessExpression && astSymbol.kind === PullElementKind.EnumMember) {
                return false;
            }

            return true;
        }

        private checkForSuperMemberAccess(memberAccessExpression: BinaryExpression,
            resolvedName: PullSymbol,
            enclosingDecl: PullDecl,
            context: PullTypeResolutionContext): boolean {
            if (resolvedName) {
                if (memberAccessExpression.operand1.nodeType() === NodeType.SuperExpression &&
                    !resolvedName.isError() &&
                    resolvedName.kind !== PullElementKind.Method) {

                    context.postError(this.unitPath, memberAccessExpression.operand2.minChar, memberAccessExpression.operand2.getLength(),
                        DiagnosticCode.Only_public_methods_of_the_base_class_are_accessible_via_the_super_keyword, null);
                    return true;
                }
            }

            return false;
        }

        private checkForPrivateMemberAccess(memberAccessExpression: BinaryExpression,
            expressionType: PullTypeSymbol,
            resolvedName: PullSymbol,
            enclosingDecl: PullDecl,
            context: PullTypeResolutionContext): boolean {
            if (resolvedName) {
                if (resolvedName.hasFlag(PullElementFlags.Private)) {
                    var memberContainer = resolvedName.getContainer();
                    if (memberContainer && memberContainer.kind === PullElementKind.ConstructorType) {
                        memberContainer = memberContainer.getAssociatedContainerType();
                    }

                    if (memberContainer && memberContainer.isClass()) {
                        // We're accessing a private member of a class.  We can only do that if we're 
                        // actually contained within that class.
                        var containingClass = enclosingDecl;

                        while (containingClass && containingClass.kind != PullElementKind.Class) {
                            containingClass = containingClass.getParentDecl();
                        }

                        if (!containingClass || containingClass.getSymbol() !== memberContainer) {
                            var name = <Identifier>memberAccessExpression.operand2;
                            context.postError(this.unitPath, name.minChar, name.getLength(), DiagnosticCode._0_1_is_inaccessible, [memberContainer.toString(null, false), name.actualText]);
                            return true;
                        }
                    }
                }
            }

            return false;
        }

        private checkForStaticMemberAccess(memberAccessExpression: BinaryExpression,
            expressionType: PullTypeSymbol,
            resolvedName: PullSymbol,
            enclosingDecl: PullDecl,
            context: PullTypeResolutionContext): boolean {
            if (expressionType && resolvedName && !resolvedName.isError()) {
                if (expressionType.isClass() || expressionType.kind === PullElementKind.ConstructorType) {
                    var name = <Identifier>memberAccessExpression.operand2;

                    if (resolvedName.hasFlag(PullElementFlags.Static) || this.isPrototypeMember(memberAccessExpression, enclosingDecl, context)) {
                        if (expressionType.kind !== PullElementKind.ConstructorType) {
                            context.postError(this.unitPath, name.minChar, name.getLength(),
                                DiagnosticCode.Static_member_cannot_be_accessed_off_an_instance_variable, null);
                            return true;
                        }
                    }
                }
            }

            return false;
        }
    }

    export class TypeComparisonInfo {
        public onlyCaptureFirstError = false;
        public flags: TypeRelationshipFlags = TypeRelationshipFlags.SuccessfulComparison;
        public message = "";
        public stringConstantVal: AST = null;
        private indent = 1;

        constructor(sourceComparisonInfo?: TypeComparisonInfo) {
            if (sourceComparisonInfo) {
                this.flags = sourceComparisonInfo.flags;
                this.onlyCaptureFirstError = sourceComparisonInfo.onlyCaptureFirstError;
                this.stringConstantVal = sourceComparisonInfo.stringConstantVal;
                this.indent = sourceComparisonInfo.indent + 1;
            }
        }

        private indentString(): string {
            var result = "";

            for (var i = 0; i < this.indent; i++) {
                result += "\t";
            }

            return result;
        }

        public addMessage(message: string) {
            if (!this.onlyCaptureFirstError && this.message) {
                this.message = this.message + TypeScript.newLine() + this.indentString() + message;
            }
            else {
                this.message = this.indentString() + message;
            }
        }

        public setMessage(message: string) {
            this.message = this.indentString() + message;
        }
    }

    enum OverloadApplicabilityStatus {
        NotApplicable,
        ApplicableButWithProvisionalErrors,
        ApplicableWithNoProvisionalErrors
    }
}