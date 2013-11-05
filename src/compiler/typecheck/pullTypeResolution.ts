///<reference path='..\references.ts' />

module TypeScript {

    export interface IPullTypeCollection {
        getLength(): number;
        getTypeAtIndex(index: number): PullTypeSymbol;
    }

    enum OverloadApplicabilityStatus {
        NotAssignable,
        AssignableButWithProvisionalErrors,
        AssignableWithNoProvisionalErrors,
        Subtype
    }

    export class PullAdditionalCallResolutionData {
        public targetSymbol: PullSymbol = null;
        public resolvedSignatures: PullSignatureSymbol[] = null;
        public candidateSignature: PullSignatureSymbol = null;
        public actualParametersContextTypeSymbols: PullTypeSymbol[] = null;
        public diagnosticsFromOverloadResolution: Diagnostic[] = [];
    }

    export class PullAdditionalObjectLiteralResolutionData {
        public membersContextTypeSymbols: PullTypeSymbol[] = null;
    }

    enum CompilerReservedNames {
        _this = 1,
        _super,
        arguments,
        _i,
        require,
        exports
    }

    function getCompilerReservedName(name: IASTToken) {
        // If this array changes, update the order accordingly in CompilerReservedNames
        var nameText = name.valueText();
        var index = <CompilerReservedNames>CompilerReservedNames[nameText];
        return CompilerReservedNames[index] ? index : undefined;
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
        private _cachedAnyTypeArgs: PullTypeSymbol[][] = null;

        private typeCheckCallBacks: { (context: PullTypeResolutionContext): void; }[] = [];
        private postTypeCheckWorkitems: AST[] = [];

        private _cachedFunctionArgumentsSymbol: PullSymbol = null;

        private assignableCache: IBitMatrix = BitMatrix.getBitMatrix(/*allowUndefinedValues:*/ true);
        private subtypeCache: IBitMatrix = BitMatrix.getBitMatrix(/*allowUndefinedValues:*/ true);
        private identicalCache: IBitMatrix = BitMatrix.getBitMatrix(/*allowUndefinedValues:*/ true);

        constructor(private compilationSettings: ImmutableCompilationSettings, public semanticInfoChain: SemanticInfoChain) { }

        private cachedArrayInterfaceType() {
            if (!this._cachedArrayInterfaceType) {
                this._cachedArrayInterfaceType = <PullTypeSymbol>this.getSymbolFromDeclPath("Array", [], PullElementKind.Interface);
            }

            if (!this._cachedArrayInterfaceType) {
                this._cachedArrayInterfaceType = this.semanticInfoChain.anyTypeSymbol;
            }

            if (!this._cachedArrayInterfaceType.isResolved) {
                this.resolveDeclaredSymbol(this._cachedArrayInterfaceType, new PullTypeResolutionContext(this));
            }

            return this._cachedArrayInterfaceType;
        }

        // Returns the named type for the global Array<T> symbol.  Note that this will be 
        // uninstantiated (i.e. it will have type parameters, and not type arguments).
        public getArrayNamedType(): PullTypeSymbol {
            return this.cachedArrayInterfaceType();
        }

        private cachedNumberInterfaceType() {
            if (!this._cachedNumberInterfaceType) {
                this._cachedNumberInterfaceType = <PullTypeSymbol>this.getSymbolFromDeclPath("Number", [], PullElementKind.Interface);
            }

            if (this._cachedNumberInterfaceType && !this._cachedNumberInterfaceType.isResolved) {
                this.resolveDeclaredSymbol(this._cachedNumberInterfaceType, new PullTypeResolutionContext(this));
            }

            return this._cachedNumberInterfaceType;
        }

        private cachedStringInterfaceType() {
            if (!this._cachedStringInterfaceType) {
                this._cachedStringInterfaceType = <PullTypeSymbol>this.getSymbolFromDeclPath("String", [], PullElementKind.Interface);
            }

            if (this._cachedStringInterfaceType && !this._cachedStringInterfaceType.isResolved) {
                this.resolveDeclaredSymbol(this._cachedStringInterfaceType, new PullTypeResolutionContext(this));
            }

            return this._cachedStringInterfaceType;
        }

        private cachedBooleanInterfaceType() {
            if (!this._cachedBooleanInterfaceType) {
                this._cachedBooleanInterfaceType = <PullTypeSymbol>this.getSymbolFromDeclPath("Boolean", [], PullElementKind.Interface);
            }

            if (this._cachedBooleanInterfaceType && !this._cachedBooleanInterfaceType.isResolved) {
                this.resolveDeclaredSymbol(this._cachedBooleanInterfaceType, new PullTypeResolutionContext(this));
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
                this.resolveDeclaredSymbol(this._cachedObjectInterfaceType, new PullTypeResolutionContext(this));
            }

            return this._cachedObjectInterfaceType;
        }

        private cachedFunctionInterfaceType() {
            if (!this._cachedFunctionInterfaceType) {
                this._cachedFunctionInterfaceType = <PullTypeSymbol>this.getSymbolFromDeclPath("Function", [], PullElementKind.Interface);
            }

            if (this._cachedFunctionInterfaceType && !this._cachedFunctionInterfaceType.isResolved) {
                this.resolveDeclaredSymbol(this._cachedFunctionInterfaceType, new PullTypeResolutionContext(this));
            }

            return this._cachedFunctionInterfaceType;
        }

        private cachedIArgumentsInterfaceType() {
            if (!this._cachedIArgumentsInterfaceType) {
                this._cachedIArgumentsInterfaceType = <PullTypeSymbol>this.getSymbolFromDeclPath("IArguments", [], PullElementKind.Interface);
            }

            if (this._cachedIArgumentsInterfaceType && !this._cachedIArgumentsInterfaceType.isResolved) {
                this.resolveDeclaredSymbol(this._cachedIArgumentsInterfaceType, new PullTypeResolutionContext(this));
            }

            return this._cachedIArgumentsInterfaceType;
        }

        private cachedRegExpInterfaceType() {
            if (!this._cachedRegExpInterfaceType) {
                this._cachedRegExpInterfaceType = <PullTypeSymbol>this.getSymbolFromDeclPath("RegExp", [], PullElementKind.Interface);
            }

            if (this._cachedRegExpInterfaceType && !this._cachedRegExpInterfaceType.isResolved) {
                this.resolveDeclaredSymbol(this._cachedRegExpInterfaceType, new PullTypeResolutionContext(this));
            }

            return this._cachedRegExpInterfaceType;
        }

        private cachedFunctionArgumentsSymbol(): PullSymbol {
            if (!this._cachedFunctionArgumentsSymbol) {
                this._cachedFunctionArgumentsSymbol = new PullSymbol("arguments", PullElementKind.Variable);
                this._cachedFunctionArgumentsSymbol.type = this.cachedIArgumentsInterfaceType() ? this.cachedIArgumentsInterfaceType() : this.semanticInfoChain.anyTypeSymbol;
                this._cachedFunctionArgumentsSymbol.setResolved();

                var functionArgumentsDecl = new PullSynthesizedDecl("arguments", "arguments", PullElementKind.Parameter, PullElementFlags.None, /*parentDecl*/ null, new TextSpan(0, 0), this.semanticInfoChain);
                functionArgumentsDecl.setSymbol(this._cachedFunctionArgumentsSymbol);
                this._cachedFunctionArgumentsSymbol.addDeclaration(functionArgumentsDecl);
            }

            return this._cachedFunctionArgumentsSymbol;
        }

        private setTypeChecked(ast: AST, context: PullTypeResolutionContext) {
            context.setTypeChecked(ast);
        }

        private canTypeCheckAST(ast: AST, context: PullTypeResolutionContext) {
            return context.canTypeCheckAST(ast);
        }

        private setSymbolForAST(ast: AST, symbol: PullSymbol, context: PullTypeResolutionContext): void {
            if (context && context.inProvisionalResolution()) {
                // Cache provisionally
                context.setSymbolForAST(ast, symbol);
            }
            else {
                // Cache globally
                this.semanticInfoChain.setSymbolForAST(ast, symbol);
            }
        }

        private getSymbolForAST(ast: AST, context: PullTypeResolutionContext): PullSymbol {
            // Check global cache
            var symbol = this.semanticInfoChain.getSymbolForAST(ast);

            if (!symbol) {
                // Check provisional cache
                if (context && context.inProvisionalResolution()) {
                    symbol = context.getSymbolForAST(ast);
                }
            }

            return symbol;
        }

        public getASTForDecl(decl: PullDecl): AST {
            return this.semanticInfoChain.getASTForDecl(decl);
        }

        public getNewErrorTypeSymbol(name: string = null): PullErrorTypeSymbol {
            return new PullErrorTypeSymbol(this.semanticInfoChain.anyTypeSymbol, name);
        }

        public getEnclosingDecl(decl: PullDecl): PullDecl {
            var declPath = decl.getParentPath();

            if (declPath.length > 1 && declPath[declPath.length - 1] === decl) {
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
                    if (symbol.anyDeclHasFlag(PullElementFlags.Exported)) {
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
                member = parent.findMember(symbolName, /*lookInParent*/ true);
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
                    member = parent.findMember(symbolName, /*lookInParent*/ true);
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
                            if (childSymbol && (childSymbol.kind & declSearchKind) && !childSymbol.anyDeclHasFlag(PullElementFlags.Static)) {
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

                    if (childSymbol && (childSymbol.kind & declSearchKind) && !childSymbol.anyDeclHasFlag(PullElementFlags.Static)) {
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
            var topLevelDecls = this.semanticInfoChain.topLevelDecls();
            for (var i = 0, n = topLevelDecls.length; i < n; i++) {
                var topLevelDecl = topLevelDecls[i];
                if (declPath.length > 0 && topLevelDecl.fileName() === declPath[0].fileName()) {
                    // Current unit has already been processed. skip it.
                    continue;
                }

                if (!topLevelDecl.isExternalModule()) {
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

        public getVisibleDecls(enclosingDecl: PullDecl): PullDecl[] {
            var declPath = enclosingDecl.getParentPath();

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
            var lhs = this.resolveAST(expression, false, context);

            if (isTypesOnlyLocation(expression) && (lhs.kind === PullElementKind.Class || lhs.kind === PullElementKind.Interface)) {
                // No more sub types in these types
                return null;
            }

            var lhsType = lhs.type;
            if (!lhsType) {
                return null;
            }

            this.resolveDeclaredSymbol(lhsType, context);

            if (lhsType.isContainer() && lhsType.isAlias()) {
                lhsType = (<PullTypeAliasSymbol>lhsType).getExportAssignedTypeSymbol();
            }

            // Check if the type is a type parameter. Memebers of the type parameter will be these of its constraint 
            // if one exits. 
            // Also, handle the case where a constraint is itself a type parameter e.g.: foo<T extends Date, U extends T>
            while (lhsType.isTypeParameter()) {
                lhsType = (<PullTypeParameterSymbol>lhsType).getConstraint();
                if (!lhsType) {
                    // Nothing to look up at this point, no constraint found
                    return null;
                }
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
                var declPath = enclosingDecl.getParentPath();
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
                    var potentiallySpecializedType = <PullTypeSymbol>this.resolveDeclaredSymbol(lhsType, context);

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
                        this.resolveDeclaredSymbol(instanceType, context);
                        var instanceMembers = instanceType.getAllMembers(declSearchKind, memberVisibilty);
                        members = members.concat(instanceMembers);
                    }

                    var exportedContainer = (<PullContainerSymbol>lhsType).getExportAssignedContainerSymbol();
                    if (exportedContainer) {
                        var exportedContainerMembers = exportedContainer.getAllMembers(declSearchKind, memberVisibilty);
                        members = members.concat(exportedContainerMembers);
                    }
                }
                else if (!lhsType.isConstructor()) {
                    var associatedContainerSymbol = lhsType.getAssociatedContainerType();
                    if (associatedContainerSymbol) {
                        var containerType = associatedContainerSymbol.type;
                        this.resolveDeclaredSymbol(containerType, context);
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

        private isAnyOrEquivalent(type: PullTypeSymbol) {
            return (type === this.semanticInfoChain.anyTypeSymbol) || type.isError();
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
        public resolveDeclaredSymbol(symbol: PullSymbol, context?: PullTypeResolutionContext): PullSymbol {
            if (!symbol || symbol.isResolved || symbol.isTypeReference()) {
                return symbol;
            }

            if (!context) {
                context = new PullTypeResolutionContext(this);
            }

            return this.resolveDeclaredSymbolWorker(symbol, context);
        }

        private resolveDeclaredSymbolWorker(symbol: PullSymbol, context: PullTypeResolutionContext): PullSymbol {
            if (!symbol || symbol.isResolved) {
                return symbol;
            }

            if (symbol.inResolution) {
                if (!symbol.type && !symbol.isType()) {
                    symbol.type = this.semanticInfoChain.anyTypeSymbol;
                }

                return symbol;
            }

            var decls = symbol.getDeclarations();

            // We want to walk and resolve all associated decls, so we can catch
            // cases like function overloads that may be spread across multiple
            // logical declarations
            for (var i = 0; i < decls.length; i++) {
                var decl = decls[i];

                var ast = this.semanticInfoChain.getASTForDecl(decl);

                // if it's an object literal member, just return the symbol and wait for
                // the object lit to be resolved
                if (!ast ||
                    (ast.nodeType() === SyntaxKind.GetAccessor && ast.parent.parent.nodeType() === SyntaxKind.ObjectLiteralExpression) ||
                    (ast.nodeType() === SyntaxKind.SetAccessor && ast.parent.parent.nodeType() === SyntaxKind.ObjectLiteralExpression)) {
                    // We'll return the cached results, and let the decl be corrected on the next invalidation
                    return symbol;
                }

                if (ast.nodeType() === SyntaxKind.IdentifierName && ast.parent && ast.parent.nodeType() === SyntaxKind.CatchClause) {
                    return symbol;
                }

                // If our decl points at a single name of a module, then just resolve that individual module.
                var enclosingModule = getEnclosingModuleDeclaration(ast);
                var resolvedSymbol: PullSymbol;
                if (isAnyNameOfModule(enclosingModule, ast)) {
                    resolvedSymbol = this.resolveSingleModuleDeclaration(enclosingModule, ast, context);
                }
                else if (ast.nodeType() === SyntaxKind.SourceUnit && decl.kind === PullElementKind.DynamicModule) {
                    // Otherwise, if we have a decl for the top level external module, then just resolve that
                    // specific module.
                    resolvedSymbol = this.resolveModuleSymbol(<PullContainerSymbol>decl.getSymbol(), context, /*moduleDeclAST:*/ null, /*moduleNameAST:*/ null, <Script>ast);
                }
                else {
                    // This assert is here to catch potential stack overflows. There have been infinite recursions resulting
                    // from one of these decls pointing to a name expression.
                    Debug.assert(ast.nodeType() != SyntaxKind.IdentifierName && ast.nodeType() != SyntaxKind.MemberAccessExpression);
                    var resolvedSymbol: PullSymbol = this.resolveAST(ast, /*isContextuallyTyped*/false, context);
                }

                // if the symbol is a parameter property referenced in an out-of-order fashion, it may not have been resolved
                // along with the original property, so we need to "fix" its type here
                if (decl.kind == PullElementKind.Parameter &&
                    !symbol.isResolved &&
                    !symbol.type &&
                    resolvedSymbol &&
                    symbol.anyDeclHasFlag(PullElementFlags.PropertyParameter | PullElementFlags.ConstructorParameter)) {

                    symbol.type = resolvedSymbol.type;
                    symbol.setResolved();
                }
            }

            return symbol;
        }

        private resolveOtherDeclarations(astName: AST, context: PullTypeResolutionContext) {
            var resolvedDecl = this.semanticInfoChain.getDeclForAST(astName);
            var symbol = resolvedDecl.getSymbol();

            var allDecls = symbol.getDeclarations();
            for (var i = 0; i < allDecls.length; i++) {
                var currentDecl = allDecls[i];
                var astForCurrentDecl = this.getASTForDecl(currentDecl);
                if (astForCurrentDecl != astName) {
                    var moduleDecl = getEnclosingModuleDeclaration(astForCurrentDecl);
                    if (isAnyNameOfModule(moduleDecl, astForCurrentDecl)) {
                        this.resolveSingleModuleDeclaration(moduleDecl, astForCurrentDecl, context);
                    }
                    else {
                        this.resolveAST(astForCurrentDecl, false, context);
                    }
                }
            }
        }

        private resolveScript(script: Script, context: PullTypeResolutionContext): PullSymbol {
            // Ensure that any export assignments are resolved before we proceed. 
            var enclosingDecl = this.getEnclosingDeclForAST(script);
            var moduleSymbol = enclosingDecl.getSymbol();
            this.ensureAllSymbolsAreBound(moduleSymbol);

            this.resolveFirstExportAssignmentStatement(script.moduleElements, context);
            this.resolveAST(script.moduleElements, /*isContextuallyTyped:*/ false, context);

            if (this.canTypeCheckAST(script, context)) {
                this.typeCheckScript(script, context);
            }

            return moduleSymbol;
        }

        private typeCheckScript(script: Script, context: PullTypeResolutionContext): void {
            this.setTypeChecked(script, context);

            this.resolveAST(script.moduleElements, /*isContextuallyTyped:*/ false, context);
        }

        private resolveEnumDeclaration(ast: EnumDeclaration, context: PullTypeResolutionContext): PullTypeSymbol {
            var containerDecl = this.semanticInfoChain.getDeclForAST(ast);
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

            containerSymbol.setResolved();

            this.resolveOtherDeclarations(ast, context);

            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckEnumDeclaration(ast, context);
            }

            return containerSymbol;
        }

        private typeCheckEnumDeclaration(ast: EnumDeclaration, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);

            this.resolveAST(ast.enumElements, false, context);
            var containerDecl = this.semanticInfoChain.getDeclForAST(ast);
            this.validateVariableDeclarationGroups(containerDecl, context);

            if (!enumIsElided(ast)) {
                this.checkNameForCompilerGeneratedDeclarationCollision(ast, /*isDeclaration*/ true, ast.identifier, context);
            }
        }

        private postTypeCheckEnumDeclaration(ast: EnumDeclaration, context: PullTypeResolutionContext) {
            this.checkThisCaptureVariableCollides(ast, /*isDeclaration*/ true, context);
        }

        //
        // Resolve a module declaration
        //
        private resolveModuleDeclaration(ast: ModuleDeclaration, context: PullTypeResolutionContext): PullTypeSymbol {
            var result: PullTypeSymbol;

            if (ast.stringLiteral) {
                result = this.resolveSingleModuleDeclaration(ast, ast.stringLiteral, context);
            }
            else {

                var moduleNames = getModuleNames(ast.name);
                for (var i = 0, n = moduleNames.length; i < n; i++) {
                    result = this.resolveSingleModuleDeclaration(ast, moduleNames[i], context);
                }
            }

            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckModuleDeclaration(ast, context);
            }

            return result;
        }

        private ensureAllSymbolsAreBound(containerSymbol: PullSymbol): void {
            if (containerSymbol) {
                var containerDecls = containerSymbol.getDeclarations();

                for (var i = 0; i < containerDecls.length; i++) {
                    var childDecls = containerDecls[i].getChildDecls();

                    for (var j = 0; j < childDecls.length; j++) {
                        childDecls[j].ensureSymbolIsBound();
                    }
                }
            }
        }

        private resolveModuleSymbol(containerSymbol: PullContainerSymbol, context: PullTypeResolutionContext, moduleDeclAST: ModuleDeclaration, moduleDeclNameAST: AST, sourceUnitAST: Script): PullTypeSymbol {
            if (containerSymbol.isResolved || containerSymbol.inResolution) {
                return containerSymbol;
            }

            containerSymbol.inResolution = true;
            this.ensureAllSymbolsAreBound(containerSymbol);

            var instanceSymbol = containerSymbol.getInstanceSymbol();

            // resolve the instance variable, if neccesary
            if (instanceSymbol) {
                this.resolveDeclaredSymbol(instanceSymbol, context);
            }

            var isLastName = isLastNameOfModule(moduleDeclAST, moduleDeclNameAST);
            if (isLastName) {
                this.resolveFirstExportAssignmentStatement(moduleDeclAST.moduleElements, context);
            }
            else if (sourceUnitAST) {
                this.resolveFirstExportAssignmentStatement(sourceUnitAST.moduleElements, context);
            }

            containerSymbol.setResolved();

            if (moduleDeclNameAST) {
                this.resolveOtherDeclarations(moduleDeclNameAST, context);
            }

            return containerSymbol;
        }

        private resolveFirstExportAssignmentStatement(moduleElements: ASTList, context: PullTypeResolutionContext): void {
            for (var i = 0, n = moduleElements.childCount(); i < n; i++) {
                var moduleElement = moduleElements.childAt(i);
                if (moduleElement.nodeType() == SyntaxKind.ExportAssignment) {
                    this.resolveExportAssignmentStatement(<ExportAssignment>moduleElement, context);
                    return;
                }
            }
        }

        private resolveSingleModuleDeclaration(ast: ModuleDeclaration, astName: AST, context: PullTypeResolutionContext): PullTypeSymbol {
            var containerDecl = this.semanticInfoChain.getDeclForAST(astName);
            var containerSymbol = <PullContainerSymbol>containerDecl.getSymbol();

            return this.resolveModuleSymbol(containerSymbol, context, ast, astName, /*sourceUnit:*/ null);
        }

        private typeCheckModuleDeclaration(ast: ModuleDeclaration, context: PullTypeResolutionContext): void {
            if (ast.stringLiteral) {
                this.typeCheckSingleModuleDeclaration(ast, ast.stringLiteral, context);
            }
            else {
                var moduleNames = getModuleNames(ast.name);
                for (var i = 0, n = moduleNames.length; i < n; i++) {
                    this.typeCheckSingleModuleDeclaration(ast, moduleNames[i], context);
                }
            }
        }

        private typeCheckSingleModuleDeclaration(ast: ModuleDeclaration, astName: AST, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);

            if (isLastNameOfModule(ast, astName)) {
                this.resolveAST(ast.moduleElements, false, context);
            }

            var containerDecl = this.semanticInfoChain.getDeclForAST(astName);
            this.validateVariableDeclarationGroups(containerDecl, context);

            if (ast.stringLiteral) {
                if (isRelative(ast.stringLiteral.valueText())) {
                    this.semanticInfoChain.addDiagnosticFromAST(
                        ast.stringLiteral, DiagnosticCode.Ambient_external_module_declaration_cannot_specify_relative_module_name);
                }
            }

            if (!moduleIsElided(ast) && !ast.stringLiteral) {
                this.checkNameForCompilerGeneratedDeclarationCollision(astName, /*isDeclaration*/ true, <Identifier>astName, context);
            }
        }

        private postTypeCheckModuleDeclaration(ast: ModuleDeclaration, context: PullTypeResolutionContext) {
            this.checkThisCaptureVariableCollides(ast, /*isDeclaration*/ true, context);
        }

        private isTypeRefWithoutTypeArgs(term: AST) {
            if (term.nodeType() == SyntaxKind.IdentifierName) {
                return true;
            }
            else if (term.nodeType() == SyntaxKind.QualifiedName) {
                var binex = <QualifiedName>term;

                if (binex.right.nodeType() == SyntaxKind.IdentifierName) {
                    return true;
                }
            }

            return false;
        }

        public createInstantiatedType(type: PullTypeSymbol, typeArguments: PullTypeSymbol[]): PullTypeSymbol {

            if (!type.isGeneric()) {
                return type;
            }

            // if the type had previously been instantiated, we want to re-instantiate the type arguments.  Otherwise,
            // we just use the type parameters.  E.g., for
            //      class Foo<T> {
            //          public <U>(p: Foo<U>): void
            //      }
            // For parameter 'p', we'd need to specialize from 'T' to 'U' to 'any', so we'd need to request p's type arguments
            // and not its type parameters
            var typeParameters = type.getTypeArgumentsOrTypeParameters();

            var typeParameterArgumentMap: PullTypeSymbol[] = [];

            for (var i = 0; i < typeParameters.length; i++) {
                typeParameterArgumentMap[typeParameters[i].pullSymbolID] = typeArguments[i] || new PullErrorTypeSymbol(this.semanticInfoChain.anyTypeSymbol, typeParameters[i].name);
            }

            return PullInstantiatedTypeReferenceSymbol.create(this, type, typeParameterArgumentMap);
        }

        //
        // Resolve a reference type (class or interface) type parameters, implements and extends clause, members, call, construct and index signatures
        //
        private resolveReferenceTypeDeclaration(
            classOrInterface: AST,
            name: Identifier,
            heritageClauses: ASTList,
            context: PullTypeResolutionContext): PullSymbol {

            var typeDecl = this.semanticInfoChain.getDeclForAST(classOrInterface);
            var enclosingDecl = this.getEnclosingDecl(typeDecl);
            var typeDeclSymbol = <PullTypeSymbol>typeDecl.getSymbol();
            var typeDeclIsClass = classOrInterface.nodeType() === SyntaxKind.ClassDeclaration;
            var hasVisited = this.getSymbolForAST(classOrInterface, context) != null;

            if ((typeDeclSymbol.isResolved && hasVisited) || (typeDeclSymbol.inResolution && !context.isInBaseTypeResolution())) {
                return typeDeclSymbol;
            }

            var wasResolving = typeDeclSymbol.inResolution;
            typeDeclSymbol.startResolving();

            // Resolve Type Parameters
            if (!typeDeclSymbol.isResolved) {
                var typeDeclTypeParameters = typeDeclSymbol.getTypeParameters();
                for (var i = 0; i < typeDeclTypeParameters.length; i++) {
                    this.resolveDeclaredSymbol(typeDeclTypeParameters[i], context);
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
            var extendsClause = getExtendsHeritageClause(heritageClauses);
            if (extendsClause) {
                for (var i = typeDeclSymbol.getKnownBaseTypeCount(); i < extendsClause.typeNames.nonSeparatorCount(); i = typeDeclSymbol.getKnownBaseTypeCount()) {
                    typeDeclSymbol.incrementKnownBaseCount();
                    var parentType = this.resolveTypeReference(extendsClause.typeNames.nonSeparatorAt(i), context);

                    if (typeDeclSymbol.isValidBaseKind(parentType, true)) {
                        this.setSymbolForAST(extendsClause.typeNames.nonSeparatorAt(i), parentType, null /* setting it without context so that we record the baseType associated with the members */);

                        // Do not add parentType as a base if it already added, or if it will cause a cycle as it already inherits from typeDeclSymbol
                        if (!typeDeclSymbol.hasBase(parentType) && !parentType.hasBase(typeDeclSymbol)) {
                            typeDeclSymbol.addExtendedType(parentType);

                            var specializations = typeDeclSymbol.getKnownSpecializations();

                            for (var j = 0; j < specializations.length; j++) {
                                specializations[j].addExtendedType(parentType);
                            }
                        }
                    }
                    else if (parentType && !this.getSymbolForAST(extendsClause.typeNames.nonSeparatorAt(i), context)) {
                        this.setSymbolForAST(extendsClause.typeNames.nonSeparatorAt(i), parentType, null /* setting it without context so that we record the baseType associated with the members */);
                    }
                }
            }

            var implementsClause = getImplementsHeritageClause(heritageClauses);
            if (implementsClause && typeDeclIsClass) {
                var extendsCount = extendsClause ? extendsClause.typeNames.nonSeparatorCount() : 0;
                for (var i = typeDeclSymbol.getKnownBaseTypeCount(); ((i - extendsCount) >= 0) && ((i - extendsCount) < implementsClause.typeNames.nonSeparatorCount()); i = typeDeclSymbol.getKnownBaseTypeCount()) {
                    typeDeclSymbol.incrementKnownBaseCount();
                    var implementedTypeAST = implementsClause.typeNames.nonSeparatorAt(i - extendsCount);
                    var implementedType = this.resolveTypeReference(implementedTypeAST, context);

                    if (typeDeclSymbol.isValidBaseKind(implementedType, false)) {
                        this.setSymbolForAST(implementsClause.typeNames.nonSeparatorAt(i - extendsCount), implementedType, null /* setting it without context so that we record the baseType associated with the members */);

                        // Do not add parentType as a base if it already added, or if it will cause a cycle as it already inherits from typeDeclSymbol
                        if (!typeDeclSymbol.hasBase(implementedType) && !implementedType.hasBase(typeDeclSymbol)) {
                            typeDeclSymbol.addImplementedType(implementedType);
                        }
                    }
                    else if (implementedType && !this.getSymbolForAST(implementsClause.typeNames.nonSeparatorAt(i - extendsCount), context)) {
                        this.setSymbolForAST(implementsClause.typeNames.nonSeparatorAt(i - extendsCount), implementedType, null /* setting it without context so that we record the baseType associated with the members */);
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
                this.typeCheckCallBacks.push(context => {
                    if (classOrInterface.nodeType() == SyntaxKind.ClassDeclaration) {
                        this.resolveClassDeclaration(<ClassDeclaration>classOrInterface, context);
                    }
                    else {
                        this.resolveInterfaceDeclaration(<InterfaceDeclaration>classOrInterface, context);
                    }
                });

                return typeDeclSymbol;
            }

            if (!typeDeclSymbol.isResolved) {

                if (!typeDeclIsClass) {
                    // Resolve call, construct and index signatures
                    var callSignatures = typeDeclSymbol.getCallSignatures();
                    for (var i = 0; i < callSignatures.length; i++) {
                        this.resolveDeclaredSymbol(callSignatures[i], context);
                    }

                    var constructSignatures = typeDeclSymbol.getConstructSignatures();
                    for (var i = 0; i < constructSignatures.length; i++) {
                        this.resolveDeclaredSymbol(constructSignatures[i], context);
                    }

                    var indexSignatures = typeDeclSymbol.getIndexSignatures();
                    for (var i = 0; i < indexSignatures.length; i++) {
                        this.resolveDeclaredSymbol(indexSignatures[i], context);
                    }
                }
            }

            this.setSymbolForAST(name, typeDeclSymbol, context);
            this.setSymbolForAST(classOrInterface, typeDeclSymbol, context);

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
            var classDecl: PullDecl = this.semanticInfoChain.getDeclForAST(classDeclAST);
            var classDeclSymbol = <PullTypeSymbol>classDecl.getSymbol();
            if (!classDeclSymbol.isResolved) {
                this.resolveReferenceTypeDeclaration(classDeclAST, classDeclAST.identifier, classDeclAST.heritageClauses, context);

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
                            // There are cases where we need the parent's constructor resolved
                            // when it is not already resolved. The common case is a class with
                            // no explicit constructor inheriting an explicit constructor from
                            // a base class.
                            // class A extends B {}
                            // class B { constructor(p: string) {} }
                            // This should really be the responsibility of the symbol internally
                            // when we call getConstructorMethod(). It fits into the larger notion
                            // of making symbols resolve their own components when they are queried.
                            this.resolveDeclaredSymbol(parentConstructor, context);
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

        private typeCheckTypeParametersOfTypeDeclaration(classOrInterface: AST, context: PullTypeResolutionContext) {
            var typeDecl: PullDecl = this.semanticInfoChain.getDeclForAST(classOrInterface);
            var typeDeclSymbol = <PullTypeSymbol>typeDecl.getSymbol();
            var typeDeclTypeParameters = typeDeclSymbol.getTypeParameters();
            for (var i = 0; i < typeDeclTypeParameters.length; i++) {
                this.checkSymbolPrivacy(typeDeclSymbol, typeDeclTypeParameters[i], (symbol: PullSymbol) =>
                    this.typeParameterOfTypeDeclarationPrivacyErrorReporter(classOrInterface, i, typeDeclTypeParameters[i], symbol, context));
            }
        }

        private typeCheckClassDeclaration(classDeclAST: ClassDeclaration, context: PullTypeResolutionContext) {
            this.setTypeChecked(classDeclAST, context);

            var classDecl: PullDecl = this.semanticInfoChain.getDeclForAST(classDeclAST);
            var classDeclSymbol = <PullTypeSymbol>classDecl.getSymbol();

            // Add for post typeChecking if we want to verify name collision with _this
            this.checkNameForCompilerGeneratedDeclarationCollision(classDeclAST, /*isDeclaration*/ true, classDeclAST.identifier, context);
            this.resolveAST(classDeclAST.classElements, false, context);

            this.typeCheckTypeParametersOfTypeDeclaration(classDeclAST, context);
            this.typeCheckBases(classDeclAST, classDeclAST.identifier, classDeclAST.heritageClauses, classDeclSymbol, this.getEnclosingDecl(classDecl), context);

            if (!classDeclSymbol.hasBaseTypeConflict()) {
                this.typeCheckMembersAgainstIndexer(classDeclSymbol, classDecl, context);
            }
        }

        private postTypeCheckClassDeclaration(classDeclAST: ClassDeclaration, context: PullTypeResolutionContext) {
            this.checkThisCaptureVariableCollides(classDeclAST, /*isDeclaration*/ true, context);
        }

        private resolveTypeSymbolSignatures(typeSymbol: PullTypeSymbol, context: PullTypeResolutionContext): void {
            // Resolve call, construct and index signatures
            var callSignatures = typeSymbol.getCallSignatures();
            for (var i = 0; i < callSignatures.length; i++) {
                this.resolveDeclaredSymbol(callSignatures[i], context);
            }

            var constructSignatures = typeSymbol.getConstructSignatures();
            for (var i = 0; i < constructSignatures.length; i++) {
                this.resolveDeclaredSymbol(constructSignatures[i], context);
            }

            var indexSignatures = typeSymbol.getIndexSignatures();
            for (var i = 0; i < indexSignatures.length; i++) {
                this.resolveDeclaredSymbol(indexSignatures[i], context);
            }
        }

        private resolveInterfaceDeclaration(interfaceDeclAST: InterfaceDeclaration, context: PullTypeResolutionContext): PullTypeSymbol {
            this.resolveReferenceTypeDeclaration(interfaceDeclAST, interfaceDeclAST.identifier, interfaceDeclAST.heritageClauses, context);

            var interfaceDecl = this.semanticInfoChain.getDeclForAST(interfaceDeclAST);
            var interfaceDeclSymbol = <PullTypeSymbol>interfaceDecl.getSymbol();

            this.resolveTypeSymbolSignatures(interfaceDeclSymbol, context);

            if (interfaceDeclSymbol.isResolved) {
                this.resolveOtherDeclarations(interfaceDeclAST, context);

                if (this.canTypeCheckAST(interfaceDeclAST, context)) {
                    this.typeCheckInterfaceDeclaration(interfaceDeclAST, context);
                }
            }

            return interfaceDeclSymbol;
        }

        private typeCheckInterfaceDeclaration(interfaceDeclAST: InterfaceDeclaration, context: PullTypeResolutionContext) {
            this.setTypeChecked(interfaceDeclAST, context);

            var interfaceDecl = this.semanticInfoChain.getDeclForAST(interfaceDeclAST);
            var interfaceDeclSymbol = <PullTypeSymbol>interfaceDecl.getSymbol();

            this.resolveAST(interfaceDeclAST.body.typeMembers, false, context);

            this.typeCheckTypeParametersOfTypeDeclaration(interfaceDeclAST, context);
            this.typeCheckBases(interfaceDeclAST, interfaceDeclAST.identifier, interfaceDeclAST.heritageClauses, interfaceDeclSymbol, this.getEnclosingDecl(interfaceDecl), context);

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
                    this.resolveDeclaredSymbol(symbol, context);

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
            var memberSymbol = this.getMemberSymbol(symbolName, kind, pullTypeSymbol);
            // Verify that the symbol is actually of the given kind
            return {
                symbol: this.filterSymbol(memberSymbol, kind, enclosingDecl, context),
                aliasSymbol: memberSymbol && memberSymbol.isAlias() ? <PullTypeAliasSymbol>memberSymbol : null
            };
        }

        private resolveIdentifierOfInternalModuleReference(importDecl: PullDecl, identifier: Identifier, moduleSymbol: PullSymbol, enclosingDecl: PullDecl, context: PullTypeResolutionContext):
            {
                valueSymbol: PullSymbol; typeSymbol: PullTypeSymbol; containerSymbol: PullContainerSymbol; aliasSymbol: PullTypeAliasSymbol;
            } {
            var rhsName = identifier.valueText();
            if (rhsName.length === 0) {
                return null;
            }

            var moduleTypeSymbol = <PullContainerSymbol>moduleSymbol.type;
            var memberSymbol = this.getMemberSymbolOfKind(rhsName, PullElementKind.SomeContainer, moduleTypeSymbol, enclosingDecl, context);
            var containerSymbol = memberSymbol.symbol;
            var valueSymbol: PullSymbol = null;
            var typeSymbol: PullSymbol = null;
            var aliasSymbol: PullTypeAliasSymbol = null;

            var acceptableAlias = true;

            if (containerSymbol) {
                acceptableAlias = (containerSymbol.kind & PullElementKind.AcceptableAlias) != 0;
                aliasSymbol = memberSymbol.aliasSymbol;
            }

            if (!acceptableAlias && containerSymbol && containerSymbol.kind == PullElementKind.TypeAlias) {
                this.resolveDeclaredSymbol(containerSymbol, context);
                var aliasedAssignedValue = (<PullTypeAliasSymbol>containerSymbol).getExportAssignedValueSymbol();
                var aliasedAssignedType = (<PullTypeAliasSymbol>containerSymbol).getExportAssignedTypeSymbol();
                var aliasedAssignedContainer = (<PullTypeAliasSymbol>containerSymbol).getExportAssignedContainerSymbol();

                if (aliasedAssignedValue || aliasedAssignedType || aliasedAssignedContainer) {
                    aliasSymbol = <PullTypeAliasSymbol>containerSymbol;
                    valueSymbol = aliasedAssignedValue;
                    typeSymbol = aliasedAssignedType;
                    containerSymbol = aliasedAssignedContainer;
                    acceptableAlias = true;
                }
            }

            // check for valid export assignment type (variable, function, class, interface, enum, internal module)
            if (!acceptableAlias) {
                this.semanticInfoChain.addDiagnosticFromAST(identifier, DiagnosticCode.Import_declaration_referencing_identifier_from_internal_module_can_only_be_made_with_variables_functions_classes_interfaces_enums_and_internal_modules);
                return null;
            }

            // if we haven't already gotten a value or type from the alias, look for them now
            if (!valueSymbol) {
                if (moduleTypeSymbol.getInstanceSymbol()) {
                    memberSymbol = this.getMemberSymbolOfKind(rhsName, PullElementKind.SomeValue, moduleTypeSymbol.getInstanceSymbol().type, enclosingDecl, context);
                    valueSymbol = memberSymbol.symbol;
                    if (valueSymbol && memberSymbol.aliasSymbol) {
                        aliasSymbol = memberSymbol.aliasSymbol;
                    }
                }
            }

            if (!typeSymbol) {
                memberSymbol = this.getMemberSymbolOfKind(rhsName, PullElementKind.SomeType, moduleTypeSymbol, enclosingDecl, context);
                typeSymbol = memberSymbol.symbol;
                if (typeSymbol && memberSymbol.aliasSymbol) {
                    aliasSymbol = memberSymbol.aliasSymbol;
                }
            }

            if (!valueSymbol && !typeSymbol && !containerSymbol) {
                this.semanticInfoChain.addDiagnosticFromAST(identifier, DiagnosticCode.Could_not_find_symbol_0_in_module_1, [rhsName, moduleSymbol.toString()]);
                return null;
            }

            if (!typeSymbol && containerSymbol) {
                typeSymbol = containerSymbol;
            }

            return {
                valueSymbol: valueSymbol,
                typeSymbol: <PullTypeSymbol>typeSymbol,
                containerSymbol: <PullContainerSymbol>containerSymbol,
                aliasSymbol: aliasSymbol
            };
        }

        private resolveModuleReference(importDecl: PullDecl, moduleNameExpr: AST, enclosingDecl: PullDecl, context: PullTypeResolutionContext, declPath: PullDecl[]) {
            Debug.assert(moduleNameExpr.nodeType() == SyntaxKind.QualifiedName || moduleNameExpr.nodeType() == SyntaxKind.IdentifierName || moduleNameExpr.nodeType() === SyntaxKind.StringLiteral, "resolving module reference should always be either name or member reference");

            var moduleSymbol: PullSymbol = null;
            var moduleName: string;

            if (moduleNameExpr.nodeType() == SyntaxKind.QualifiedName) {
                var dottedNameAST = <QualifiedName>moduleNameExpr;
                var moduleContainer = this.resolveModuleReference(importDecl, dottedNameAST.left, enclosingDecl, context, declPath);
                if (moduleContainer) {
                    moduleName = dottedNameAST.right.valueText();
                    // We dont care about setting alias symbol here, because it has to be exported member which would make the import statement to emit anyways
                    moduleSymbol = this.getMemberSymbolOfKind(moduleName, PullElementKind.Container, moduleContainer.type, enclosingDecl, context).symbol;
                    if (!moduleSymbol) {
                        this.semanticInfoChain.addDiagnosticFromAST(dottedNameAST.right, DiagnosticCode.Could_not_find_module_0_in_module_1, [moduleName, moduleContainer.toString()]);
                    }
                }
            }
            else {
                var valueText = moduleNameExpr.nodeType() === SyntaxKind.IdentifierName ? (<Identifier>moduleNameExpr).valueText() : (<StringLiteral>moduleNameExpr).valueText();
                var text = moduleNameExpr.nodeType() === SyntaxKind.IdentifierName ? (<Identifier>moduleNameExpr).text() : (<StringLiteral>moduleNameExpr).text();

                if (text.length > 0) {
                    var resolvedModuleNameSymbol = this.getSymbolFromDeclPath(valueText, declPath, PullElementKind.Container);
                    moduleSymbol = this.filterSymbol(resolvedModuleNameSymbol, PullElementKind.Container, enclosingDecl, context);
                    if (moduleSymbol) {
                        // Import declaration isn't contextual so set the symbol and diagnostic message irrespective of the context
                        this.semanticInfoChain.setSymbolForAST(moduleNameExpr, moduleSymbol);
                        if (resolvedModuleNameSymbol.isAlias()) {
                            this.semanticInfoChain.setAliasSymbolForAST(moduleNameExpr, <PullTypeAliasSymbol>resolvedModuleNameSymbol);
                        }
                    } else {
                        this.semanticInfoChain.addDiagnosticFromAST(moduleNameExpr, DiagnosticCode.Unable_to_resolve_module_reference_0, [valueText]);
                    }
                }
            }

            return moduleSymbol;
        }

        private resolveInternalModuleReference(importStatementAST: ImportDeclaration, context: PullTypeResolutionContext) {
            // ModuleName or ModuleName.Identifier or ModuleName.ModuleName....Identifier
            var importDecl = this.semanticInfoChain.getDeclForAST(importStatementAST);
            var enclosingDecl = this.getEnclosingDecl(importDecl);

            var moduleReference = importStatementAST.moduleReference;

            var aliasExpr = moduleReference.nodeType() === SyntaxKind.ExternalModuleReference
                ? (<ExternalModuleReference>moduleReference).stringLiteral
                : (<ModuleNameModuleReference>moduleReference).moduleName;

            var declPath = enclosingDecl.getParentPath();
            var aliasedType: PullTypeSymbol = null;

            if (aliasExpr.nodeType() === SyntaxKind.IdentifierName || aliasExpr.nodeType() === SyntaxKind.StringLiteral) {
                var moduleSymbol = this.resolveModuleReference(importDecl, aliasExpr, enclosingDecl, context, declPath);
                if (moduleSymbol) {
                    aliasedType = moduleSymbol.type;
                    this.semanticInfoChain.setAliasSymbolForAST(moduleReference, this.semanticInfoChain.getAliasSymbolForAST(aliasExpr));
                    if (aliasedType.anyDeclHasFlag(PullElementFlags.InitializedModule)) {
                        var moduleName = aliasExpr.nodeType() === SyntaxKind.IdentifierName ? (<Identifier>aliasExpr).valueText() : (<StringLiteral>aliasExpr).valueText();
                        var valueSymbol = this.getSymbolFromDeclPath(moduleName, declPath, PullElementKind.SomeValue);
                        var instanceSymbol = (<PullContainerSymbol>aliasedType).getInstanceSymbol();
                        // If there is module and it is instantiated, value symbol needs to refer to the module instance symbol
                        if (valueSymbol && (instanceSymbol != valueSymbol || valueSymbol.type == aliasedType)) {
                            var text = aliasExpr.nodeType() === SyntaxKind.IdentifierName ? (<Identifier>aliasExpr).text() : (<StringLiteral>aliasExpr).text();
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(aliasExpr, DiagnosticCode.Internal_module_reference_0_in_import_declaration_does_not_reference_module_instance_for_1, [text, moduleSymbol.type.toString(enclosingDecl ? enclosingDecl.getSymbol() : null)]));
                        }
                        else {
                            // Set value symbol, type and container setting will be taken care of later using aliasedType
                            var importDeclSymbol = <PullTypeAliasSymbol>importDecl.getSymbol();
                            importDeclSymbol.setAssignedValueSymbol(valueSymbol);
                        }
                    }
                } else {
                    aliasedType = this.semanticInfoChain.anyTypeSymbol;
                }
            }
            else if (aliasExpr.nodeType() == SyntaxKind.QualifiedName) {
                var importDeclSymbol = <PullTypeAliasSymbol>importDecl.getSymbol();
                var dottedNameAST = <QualifiedName>aliasExpr;
                var moduleSymbol = this.resolveModuleReference(importDecl, dottedNameAST.left, enclosingDecl, context, declPath);
                if (moduleSymbol) {
                    var identifierResolution = this.resolveIdentifierOfInternalModuleReference(importDecl, dottedNameAST.right, moduleSymbol, enclosingDecl, context);
                    if (identifierResolution) {
                        importDeclSymbol.setAssignedValueSymbol(identifierResolution.valueSymbol);
                        importDeclSymbol.setAssignedTypeSymbol(identifierResolution.typeSymbol);
                        importDeclSymbol.setAssignedContainerSymbol(identifierResolution.containerSymbol);
                        this.semanticInfoChain.setAliasSymbolForAST(moduleReference, identifierResolution.aliasSymbol);
                        if (identifierResolution.valueSymbol) {
                            importDeclSymbol.setIsUsedAsValue(true);
                        }
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
            var importDecl = this.semanticInfoChain.getDeclForAST(importStatementAST);
            var enclosingDecl = this.getEnclosingDecl(importDecl);
            var importDeclSymbol = <PullTypeAliasSymbol>importDecl.getSymbol();

            var aliasedType: PullTypeSymbol = null;

            if (importDeclSymbol.isResolved) {
                return importDeclSymbol;
            }

            importDeclSymbol.startResolving();

            // the alias name may be a string literal, in which case we'll need to convert it to a type
            // reference
            if (importStatementAST.moduleReference.nodeType() === SyntaxKind.ExternalModuleReference) {
                // dynamic module name (string literal)
                var modPath = (<ExternalModuleReference>importStatementAST.moduleReference).stringLiteral.valueText();
                var declPath = enclosingDecl.getParentPath();

                aliasedType = this.resolveExternalModuleReference(modPath, importDecl.fileName());

                if (!aliasedType) {
                    var path = (<ExternalModuleReference>importStatementAST.moduleReference).stringLiteral.text();
                    this.semanticInfoChain.addDiagnosticFromAST(importStatementAST, DiagnosticCode.Unable_to_resolve_external_module_0, [path]);
                    aliasedType = this.semanticInfoChain.anyTypeSymbol;
                }
            } else {
                aliasedType = this.resolveInternalModuleReference(importStatementAST, context);
            }

            if (aliasedType) {
                if (!aliasedType.isContainer()) {
                    this.semanticInfoChain.addDiagnosticFromAST(importStatementAST, DiagnosticCode.Module_cannot_be_aliased_to_a_non_module_type);
                    aliasedType = this.semanticInfoChain.anyTypeSymbol;
                }
                else if ((<PullContainerSymbol>aliasedType).getExportAssignedValueSymbol()) {
                    importDeclSymbol.setIsUsedAsValue(true);
                }

                if (aliasedType.isContainer()) {
                    importDeclSymbol.setAssignedContainerSymbol(<PullContainerSymbol>aliasedType);
                }
                importDeclSymbol.setAssignedTypeSymbol(aliasedType);

                // Import declaration isn't contextual so set the symbol and diagnostic message irrespective of the context
                this.setSymbolForAST(importStatementAST.moduleReference, aliasedType, null);
            }

            importDeclSymbol.setResolved();

            this.resolveDeclaredSymbol(importDeclSymbol.assignedValue(), context);
            this.resolveDeclaredSymbol(importDeclSymbol.assignedType(), context);
            this.resolveDeclaredSymbol(importDeclSymbol.assignedContainer(), context);

            if (this.canTypeCheckAST(importStatementAST, context)) {
                this.typeCheckImportDeclaration(importStatementAST, context);
            }

            return importDeclSymbol;
        }

        private typeCheckImportDeclaration(importStatementAST: ImportDeclaration, context: PullTypeResolutionContext) {
            this.setTypeChecked(importStatementAST, context);

            var importDecl = this.semanticInfoChain.getDeclForAST(importStatementAST);
            var enclosingDecl = this.getEnclosingDecl(importDecl);
            var importDeclSymbol = <PullTypeAliasSymbol>importDecl.getSymbol();

            if (importStatementAST.moduleReference.nodeType() === SyntaxKind.ExternalModuleReference) {
                if (this.compilationSettings.noResolve()) {
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(importStatementAST,
                        DiagnosticCode.Import_declaration_cannot_refer_to_external_module_reference_when_noResolve_option_is_set, null));
                }

                var modPath = (<ExternalModuleReference>importStatementAST.moduleReference).stringLiteral.valueText();
                if (enclosingDecl.kind === PullElementKind.DynamicModule) {
                    var ast = getEnclosingModuleDeclaration(this.getASTForDecl(enclosingDecl));
                    if (ast && ast.nodeType() === SyntaxKind.ModuleDeclaration) {
                        if (isRelative(modPath)) {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(importStatementAST,
                                DiagnosticCode.Import_declaration_in_an_ambient_external_module_declaration_cannot_reference_external_module_through_relative_external_module_name));
                        }
                    }
                }
            }

            var checkPrivacy: boolean;
            if (importStatementAST.moduleReference.nodeType() === SyntaxKind.ExternalModuleReference) {
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

                this.checkSymbolPrivacy(importDeclSymbol, containerSymbol, (symbol: PullSymbol) => {
                    var messageCode = DiagnosticCode.Exported_import_declaration_0_is_assigned_container_that_is_or_is_using_inaccessible_module_1;
                    var messageArguments = [importDeclSymbol.getScopedName(enclosingDecl ? enclosingDecl.getSymbol() : null), symbol.getScopedName(enclosingDecl ? enclosingDecl.getSymbol() : null)];
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(importStatementAST, messageCode, messageArguments));
                });

                if (typeSymbol != containerSymbol) {
                    this.checkSymbolPrivacy(importDeclSymbol, typeSymbol, (symbol: PullSymbol) => {
                        var messageCode = symbol.isContainer() && !(<PullTypeSymbol>symbol).isEnum() ?
                            DiagnosticCode.Exported_import_declaration_0_is_assigned_type_that_is_using_inaccessible_module_1 :
                            DiagnosticCode.Exported_import_declaration_0_is_assigned_type_that_has_or_is_using_private_type_1;

                        var messageArguments = [importDeclSymbol.getScopedName(enclosingDecl ? enclosingDecl.getSymbol() : null), symbol.getScopedName(enclosingDecl ? enclosingDecl.getSymbol() : null)];
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(importStatementAST, messageCode, messageArguments));
                    });
                }

                if (valueSymbol) {
                    this.checkSymbolPrivacy(importDeclSymbol, valueSymbol.type, (symbol: PullSymbol) => {
                        var messageCode = symbol.isContainer() && !(<PullTypeSymbol>symbol).isEnum() ?
                            DiagnosticCode.Exported_import_declaration_0_is_assigned_value_with_type_that_is_using_inaccessible_module_1 :
                            DiagnosticCode.Exported_import_declaration_0_is_assigned_value_with_type_that_has_or_is_using_private_type_1;
                        var messageArguments = [importDeclSymbol.getScopedName(enclosingDecl ? enclosingDecl.getSymbol() : null), symbol.getScopedName(enclosingDecl ? enclosingDecl.getSymbol() : null)];
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(importStatementAST, messageCode, messageArguments));
                    });
                }
            }

            if (getCompilerReservedName(importStatementAST.identifier)) {
                // Add as a post callback to make sure that isUsedAsValue flag is set correctly
                this.postTypeCheckWorkitems.push(importStatementAST);
            }
        }

        private postTypeCheckImportDeclaration(importStatementAST: ImportDeclaration, context: PullTypeResolutionContext) {
            if (importDeclarationIsElided(importStatementAST, this.semanticInfoChain)) {
                this.checkNameForCompilerGeneratedDeclarationCollision(importStatementAST, /*isDeclaration*/ true, importStatementAST.identifier, context, /*immediateThisCheck*/ true);
            }
        }

        private resolveExportAssignmentStatement(exportAssignmentAST: ExportAssignment, context: PullTypeResolutionContext): PullSymbol {
            var id = exportAssignmentAST.identifier.valueText();
            if (id.length === 0) {
                // No point trying to resolve an export assignment without an actual identifier.
                return this.semanticInfoChain.anyTypeSymbol;
            }

            // get the identifier text
            var valueSymbol: PullSymbol = null;
            var typeSymbol: PullSymbol = null;
            var containerSymbol: PullSymbol = null;

            var enclosingDecl = this.getEnclosingDeclForAST(exportAssignmentAST);
            var parentSymbol = enclosingDecl.getSymbol();

            if (!parentSymbol.isType() && (<PullTypeSymbol>parentSymbol).isContainer()) {
                // Error
                // Export assignments may only be used at the top-level of external modules
                this.semanticInfoChain.addDiagnosticFromAST(exportAssignmentAST, DiagnosticCode.Export_assignments_may_only_be_used_at_the_top_level_of_external_modules);
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
                this.resolveDeclaredSymbol(containerSymbol, context);

                var aliasSymbol = <PullTypeAliasSymbol>containerSymbol;
                var aliasedAssignedValue = aliasSymbol.getExportAssignedValueSymbol();
                var aliasedAssignedType = aliasSymbol.getExportAssignedTypeSymbol();
                var aliasedAssignedContainer = aliasSymbol.getExportAssignedContainerSymbol();

                if (aliasedAssignedValue || aliasedAssignedType || aliasedAssignedContainer) {
                    valueSymbol = aliasedAssignedValue;
                    typeSymbol = aliasedAssignedType;
                    containerSymbol = aliasedAssignedContainer;
                    aliasSymbol.setTypeUsedExternally(true);
                    acceptableAlias = true;
                }
            }

            // check for valid export assignment type (variable, function, class, interface, enum, internal module)
            if (!acceptableAlias) {
                // Error
                // Export assignments may only be made with variables, functions, classes, interfaces, enums and internal modules
                this.semanticInfoChain.addDiagnosticFromAST(exportAssignmentAST, DiagnosticCode.Export_assignments_may_only_be_made_with_variables_functions_classes_interfaces_enums_and_internal_modules);
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
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(exportAssignmentAST, DiagnosticCode.Could_not_find_symbol_0, [id]));
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

            this.resolveDeclaredSymbol(valueSymbol, context);
            this.resolveDeclaredSymbol(typeSymbol, context);
            this.resolveDeclaredSymbol(containerSymbol, context);

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private resolveAnyFunctionTypeSignature(funcDeclAST: AST, typeParameters: TypeParameterList, parameterList: ParameterList, returnTypeAnnotation: AST, context: PullTypeResolutionContext): PullTypeSymbol {
            var functionDecl = this.semanticInfoChain.getDeclForAST(funcDeclAST);
            Debug.assert(functionDecl);

            var funcDeclSymbol = <PullTypeSymbol>functionDecl.getSymbol();

            var signature = funcDeclSymbol.kind === PullElementKind.ConstructorType
                ? funcDeclSymbol.getConstructSignatures()[0] : funcDeclSymbol.getCallSignatures()[0];

            // resolve the return type annotation
            if (returnTypeAnnotation) {
                signature.returnType = this.resolveTypeReference(returnTypeAnnotation, context);
            }

            if (typeParameters) {
                for (var i = 0; i < typeParameters.typeParameters.nonSeparatorCount(); i++) {
                    this.resolveTypeParameterDeclaration(<TypeParameter>typeParameters.typeParameters.nonSeparatorAt(i), context);
                }
            }

            // link parameters and resolve their annotations
            if (parameterList) {
                for (var i = 0; i < parameterList.parameters.nonSeparatorCount(); i++) {
                    this.resolveFunctionTypeSignatureParameter(<Parameter>parameterList.parameters.nonSeparatorAt(i), signature, functionDecl, context);
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
            var paramDecl = this.semanticInfoChain.getDeclForAST(argDeclAST);
            var paramSymbol = paramDecl.getSymbol();

            if (argDeclAST.typeAnnotation) {
                var typeRef = this.resolveTypeReference(getType(argDeclAST), context);

                if (paramSymbol.isVarArg && !typeRef.isArrayNamedTypeReference()) {
                    var diagnostic = context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(argDeclAST, DiagnosticCode.Rest_parameters_must_be_array_types));
                    typeRef = this.getNewErrorTypeSymbol();
                }

                context.setTypeInContext(paramSymbol, typeRef);
            }
            else {
                if (paramSymbol.isVarArg && paramSymbol.type) {
                    if (this.cachedArrayInterfaceType()) {
                        context.setTypeInContext(paramSymbol, this.createInstantiatedType(this.cachedArrayInterfaceType(), [paramSymbol.type]));
                    }
                    else {
                        context.setTypeInContext(paramSymbol, paramSymbol.type);
                    }
                }
                else {
                    context.setTypeInContext(paramSymbol, this.semanticInfoChain.anyTypeSymbol);

                    // if the noImplicitAny flag is set to be true, report an error 
                    if (this.compilationSettings.noImplicitAny()) {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(argDeclAST, DiagnosticCode.Parameter_0_of_function_type_implicitly_has_an_any_type,
                            [argDeclAST.identifier.text()]));
                    }
                }
            }

            paramSymbol.setResolved();
        }

        private resolveFunctionExpressionParameter(argDeclAST: AST, id: Identifier, typeExpr: AST, equalsValueClause: EqualsValueClause, contextParam: PullSymbol, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            var paramDecl = this.semanticInfoChain.getDeclForAST(argDeclAST);
            var paramSymbol = paramDecl.getSymbol();
            var contextualType = contextParam && contextParam.type;
            var isImplicitAny = false;

            if (typeExpr) {
                var typeRef = this.resolveTypeReference(typeExpr, context);

                if (paramSymbol.isVarArg && !typeRef.isArrayNamedTypeReference()) {
                    var diagnostic = context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(argDeclAST, DiagnosticCode.Rest_parameters_must_be_array_types));
                    typeRef = this.getNewErrorTypeSymbol();
                }

                // The contextual type now gets overriden by the type annotation
                contextualType = typeRef || contextualType;
            }
            if (contextualType) {
                context.setTypeInContext(paramSymbol, contextualType);
            }
            else if (paramSymbol.isVarArg && this.cachedArrayInterfaceType()) {
                context.setTypeInContext(paramSymbol, this.createInstantiatedType(this.cachedArrayInterfaceType(), [this.semanticInfoChain.anyTypeSymbol]));
                isImplicitAny = true;
            }

            // Resolve the function expression parameter init only if we have contexual type to evaluate the expression in or we are in typeCheck
            var canTypeCheckAST = this.canTypeCheckAST(argDeclAST, context);
            if (equalsValueClause && (canTypeCheckAST || !contextualType)) {
                if (contextualType) {
                    context.pushContextualType(contextualType, context.inProvisionalResolution(), null);
                }

                var initExprSymbol = this.resolveAST(equalsValueClause, contextualType != null, context);

                if (contextualType) {
                    context.popContextualType();
                }

                if (!initExprSymbol || !initExprSymbol.type) {
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(argDeclAST, DiagnosticCode.Unable_to_resolve_type_of_0, [id.text()]));

                    if (!contextualType) {
                        context.setTypeInContext(paramSymbol, this.getNewErrorTypeSymbol(paramSymbol.name));
                    }
                }
                else {
                    var initTypeSymbol = this.getInstanceTypeForAssignment(argDeclAST, initExprSymbol.type, context);
                    if (!contextualType) {
                        // Set the type to the inferred initializer type
                        context.setTypeInContext(paramSymbol, this.widenType(initTypeSymbol, equalsValueClause, context));
                        isImplicitAny = initTypeSymbol !== paramSymbol.type;
                    }
                    else {
                        var comparisonInfo = new TypeComparisonInfo();

                        var isAssignable = this.sourceIsAssignableToTarget(initTypeSymbol, contextualType, context, comparisonInfo);

                        if (!isAssignable) {
                            if (comparisonInfo.message) {
                                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(argDeclAST, DiagnosticCode.Cannot_convert_0_to_1_NL_2, [initTypeSymbol.toString(), contextualType.toString(), comparisonInfo.message]));
                            } else {
                                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(argDeclAST, DiagnosticCode.Cannot_convert_0_to_1, [initTypeSymbol.toString(), contextualType.toString()]));
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
            if (isImplicitAny && this.compilationSettings.noImplicitAny()) {

                // there is a name for function expression then use the function expression name otherwise use "lambda"
                var functionExpressionName = (<PullFunctionExpressionDecl>paramDecl.getParentDecl()).getFunctionExpressionName();
                if (functionExpressionName) {
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(argDeclAST,
                        DiagnosticCode.Parameter_0_of_1_implicitly_has_an_any_type, [id.text(), functionExpressionName]));
                }
                else {
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(argDeclAST,
                        DiagnosticCode.Parameter_0_of_lambda_function_implicitly_has_an_any_type, [id.text()]));
                }
            }

            if (canTypeCheckAST) {
                this.checkNameForCompilerGeneratedDeclarationCollision(argDeclAST, /*isDeclaration*/ true, id, context);
            }

            paramSymbol.setResolved();
        }

        private checkNameForCompilerGeneratedDeclarationCollision(astWithName: AST, isDeclaration: boolean, name: IASTToken, context: PullTypeResolutionContext, immediateThisCheck?: boolean) {
            var compilerReservedName = getCompilerReservedName(name);
            if (compilerReservedName) {
                switch (compilerReservedName) {
                    case CompilerReservedNames._this: // _this
                        if (immediateThisCheck) {
                            this.checkThisCaptureVariableCollides(astWithName, isDeclaration, context);
                        } else {
                            this.postTypeCheckWorkitems.push(astWithName);
                        }
                        return;

                    case CompilerReservedNames._super: // _super
                        this.checkSuperCaptureVariableCollides(astWithName, isDeclaration, context);
                        return;

                    case CompilerReservedNames.arguments: // arguments
                        this.checkArgumentsCollides(astWithName, context);
                        return;

                    case CompilerReservedNames._i: // _i
                        if (isDeclaration) {
                            this.checkIndexOfRestArgumentInitializationCollides(astWithName, context);
                        }
                        return;

                    case CompilerReservedNames.require: // require
                    case CompilerReservedNames.exports: // require
                        if (isDeclaration) {
                            this.checkExternalModuleRequireExportsCollides(astWithName, name, context);
                        }
                        return;

                    default:
                        Debug.fail("Unknown compiler reserved name: " + name.text());
                }
            }
        }

        private hasRestParameterCodeGen(someFunctionDecl: PullDecl) {
            var enclosingAST = this.getASTForDecl(someFunctionDecl);
            var nodeType = enclosingAST.nodeType();

            // If the method/function/constructor is non ambient, with code block and has rest parameter it would have the rest parameter code gen
            if (nodeType == SyntaxKind.FunctionDeclaration) {
                var functionDeclaration = <FunctionDeclaration>enclosingAST;
                return !hasFlag(someFunctionDecl.kind == PullElementKind.Method ? someFunctionDecl.getParentDecl().flags : someFunctionDecl.flags, PullElementFlags.Ambient)
                && functionDeclaration.block
                && lastParameterIsRest(functionDeclaration.callSignature.parameterList);
            }
            else if (nodeType === SyntaxKind.MemberFunctionDeclaration) {
                var memberFunction = <MemberFunctionDeclaration>enclosingAST;
                return !hasFlag(someFunctionDecl.kind == PullElementKind.Method ? someFunctionDecl.getParentDecl().flags : someFunctionDecl.flags, PullElementFlags.Ambient)
                && memberFunction.block
                && lastParameterIsRest(memberFunction.callSignature.parameterList);
            }
            else if (nodeType == SyntaxKind.ConstructorDeclaration) {
                var constructorDeclaration = <ConstructorDeclaration>enclosingAST;
                 return !hasFlag(someFunctionDecl.getParentDecl().flags, PullElementFlags.Ambient)
                && constructorDeclaration.block
                && lastParameterIsRest(constructorDeclaration.parameterList);
            }
            else if (nodeType == SyntaxKind.ParenthesizedArrowFunctionExpression) {
                var arrowFunctionExpression = <ParenthesizedArrowFunctionExpression>enclosingAST;
                return lastParameterIsRest(arrowFunctionExpression.callSignature.parameterList);
            }
            else if (nodeType === SyntaxKind.FunctionExpression) {
                var functionExpression = <FunctionExpression>enclosingAST;
                return lastParameterIsRest(functionExpression.callSignature.parameterList);
            }

            return false;
        }

        private checkArgumentsCollides(ast: AST, context: PullTypeResolutionContext) {
            if (ast.nodeType() == SyntaxKind.Parameter) {
                var enclosingDecl = this.getEnclosingDeclForAST(ast);
                if (hasFlag(enclosingDecl.kind, PullElementKind.SomeFunction)) {
                    if (this.hasRestParameterCodeGen(enclosingDecl)) {
                        // It is error to use the arguments as variable name or parameter name in function with rest parameters
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(ast, DiagnosticCode.Duplicate_identifier_arguments_Compiler_uses_arguments_to_initialize_rest_parameters));
                    }
                }
            }
        }

        private checkIndexOfRestArgumentInitializationCollides(ast: AST, context: PullTypeResolutionContext) {
            if (ast.nodeType() == SyntaxKind.Parameter) {
                var enclosingDecl = this.getEnclosingDeclForAST(ast);
                if (hasFlag(enclosingDecl.kind, PullElementKind.SomeFunction)) {
                    if (this.hasRestParameterCodeGen(enclosingDecl)) {
                        // It is error to use the _i varible name
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(ast, DiagnosticCode.Duplicate_identifier_i_Compiler_uses_i_to_initialize_rest_parameter));
                    }
                }
            }
        }

        private checkExternalModuleRequireExportsCollides(ast: AST, name: IASTToken, context: PullTypeResolutionContext) {
            var enclosingDecl = this.getEnclosingDeclForAST(ast);

            var enclosingModule = getEnclosingModuleDeclaration(name);
            if (isAnyNameOfModule(enclosingModule, name)) {
                // If we're actually the name of a module, then we want the enclosing decl for the 
                // module that we're in.
                enclosingDecl = this.getEnclosingDeclForAST(enclosingModule);
            }

            // If the declaration is in external module
            if (enclosingDecl && enclosingDecl.kind == PullElementKind.DynamicModule) {
                var decl = this.semanticInfoChain.getDeclForAST(ast);
                // This is not ambient declaration, then there would be code gen
                if (!hasFlag(decl.flags, PullElementFlags.Ambient)) { 
                    // It is error to use 'require' or 'exports' as name for the declaration
                    var nameText = name.valueText();
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(ast, DiagnosticCode.Duplicate_identifier_0_Compiler_reserves_name_1_in_top_level_scope_of_an_external_module, [nameText, nameText]));
                }
            }
        }

        private resolveObjectTypeTypeReference(objectType: ObjectType, context: PullTypeResolutionContext): PullTypeSymbol {
            var interfaceDecl = this.semanticInfoChain.getDeclForAST(objectType);
            Debug.assert(interfaceDecl);

            var interfaceSymbol = <PullTypeSymbol>interfaceDecl.getSymbol();
            Debug.assert(interfaceSymbol);

            if (objectType.typeMembers) {
                var memberDecl: PullDecl = null;
                var memberSymbol: PullSymbol = null;
                var memberType: PullTypeSymbol = null;
                var typeMembers = objectType.typeMembers;

                for (var i = 0; i < typeMembers.nonSeparatorCount(); i++) {
                    memberDecl = this.semanticInfoChain.getDeclForAST(typeMembers.nonSeparatorAt(i));
                    memberSymbol = (memberDecl.kind & PullElementKind.SomeSignature) ? memberDecl.getSignatureSymbol() : memberDecl.getSymbol();

                    this.resolveAST(typeMembers.nonSeparatorAt(i), false, context);

                    memberType = memberSymbol.type;

                    if ((memberType && memberType.isGeneric()) || (memberSymbol.isSignature() && (<PullSignatureSymbol>memberSymbol).isGeneric())) {
                        interfaceSymbol.setHasGenericMember();
                    }
                }
            }

            interfaceSymbol.setResolved();

            if (this.canTypeCheckAST(objectType, context)) {
                this.typeCheckObjectTypeTypeReference(objectType, context);
            }

            return interfaceSymbol;
        }

        private typeCheckObjectTypeTypeReference(objectType: ObjectType, context: PullTypeResolutionContext) {
            this.setTypeChecked(objectType, context);
            var objectTypeDecl = this.semanticInfoChain.getDeclForAST(objectType);
            var objectTypeSymbol = <PullTypeSymbol>objectTypeDecl.getSymbol();

            this.typeCheckMembersAgainstIndexer(objectTypeSymbol, objectTypeDecl, context);
        }

        private resolveTypeAnnotation(typeAnnotation: TypeAnnotation, context: PullTypeResolutionContext): PullTypeSymbol {
            return this.resolveTypeReference(typeAnnotation.type, context);
        }

        public resolveTypeReference(typeRef: AST, context: PullTypeResolutionContext): PullTypeSymbol {
            if (typeRef === null) {
                return null;
            }

            Debug.assert(typeRef.nodeType() !== SyntaxKind.TypeAnnotation);

            var aliasType: PullTypeAliasSymbol = null;
            var type = this.computeTypeReferenceSymbol(typeRef, context);

            if (type.kind == PullElementKind.Container) {
                var container = <PullContainerSymbol>type;
                var instanceSymbol = container.getInstanceSymbol();
                // check if it is actually merged with class
                if (instanceSymbol &&
                    (instanceSymbol.anyDeclHasFlag(PullElementFlags.ClassConstructorVariable) || instanceSymbol.kind == PullElementKind.ConstructorMethod)) {
                    type = instanceSymbol.type.getAssociatedContainerType();
                }
            }

            if (type && type.isAlias()) {
                aliasType = <PullTypeAliasSymbol>type;
                type = aliasType.getExportAssignedTypeSymbol();
            }

            if (type && !type.isGeneric()) {
                if (aliasType) {
                    this.semanticInfoChain.setAliasSymbolForAST(typeRef, aliasType);
                }
            }

            if (type && !type.isError()) {
                if ((type.kind & PullElementKind.SomeType) === 0) {
                    // Provide some helper messages for common cases.
                    if (type.kind & PullElementKind.SomeContainer) {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(typeRef,
                            DiagnosticCode.Type_reference_cannot_refer_to_container_0, [aliasType ? aliasType.toString() : type.toString()]));
                    } else {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(typeRef,
                            DiagnosticCode.Type_reference_must_refer_to_type));
                    }
                }
            }

            if (this.canTypeCheckAST(typeRef, context)) {
                this.setTypeChecked(typeRef, context);
            }

            return type;
        }

        private computeTypeReferenceSymbol(term: AST, context: PullTypeResolutionContext): PullTypeSymbol {
            // the type reference can be
            // a name
            // a function
            // an interface
            // a dotted name
            // an array of any of the above
            // a type query

            switch (term.nodeType()) {
                case SyntaxKind.AnyKeyword: return this.semanticInfoChain.anyTypeSymbol;
                case SyntaxKind.BooleanKeyword: return this.semanticInfoChain.booleanTypeSymbol;
                case SyntaxKind.NumberKeyword: return this.semanticInfoChain.numberTypeSymbol;
                case SyntaxKind.StringKeyword: return this.semanticInfoChain.stringTypeSymbol;
                case SyntaxKind.VoidKeyword: return this.semanticInfoChain.voidTypeSymbol;
            }

            var typeDeclSymbol: PullTypeSymbol = null;

            // a name
            if (term.nodeType() === SyntaxKind.IdentifierName) {
                typeDeclSymbol = this.resolveTypeNameExpression(<Identifier>term, context);
            }
            // a function
            else if (term.nodeType() === SyntaxKind.FunctionType) {
                var functionType = <FunctionType>term;
                typeDeclSymbol = this.resolveAnyFunctionTypeSignature(functionType, functionType.typeParameterList, functionType.parameterList, functionType.type, context);
            }
            else if (term.nodeType() === SyntaxKind.ConstructorType) {
                var constructorType = <ConstructorType>term;
                typeDeclSymbol = this.resolveAnyFunctionTypeSignature(constructorType, constructorType.typeParameterList, constructorType.parameterList, constructorType.type, context);
            }
            else if (term.nodeType() === SyntaxKind.ObjectType) {
                typeDeclSymbol = this.resolveObjectTypeTypeReference(<ObjectType>term, context);
            }
            else if (term.nodeType() === SyntaxKind.GenericType) {
                typeDeclSymbol = this.resolveGenericTypeReference(<GenericType>term, context);
            }
            else if (term.nodeType() === SyntaxKind.QualifiedName) {
                // find the decl
                typeDeclSymbol = this.resolveQualifiedName(<QualifiedName>term, context);
            }
            else if (term.nodeType() === SyntaxKind.StringLiteral) {
                var stringConstantAST = <StringLiteral>term;
                var enclosingDecl = this.getEnclosingDeclForAST(term);
                typeDeclSymbol = new PullStringConstantTypeSymbol(stringConstantAST.text());
                var decl = new PullSynthesizedDecl(stringConstantAST.text(), stringConstantAST.text(),
                    typeDeclSymbol.kind, null, enclosingDecl,
                    new TextSpan(stringConstantAST.start(), stringConstantAST.width()),
                    enclosingDecl.semanticInfoChain());
                typeDeclSymbol.addDeclaration(decl);
            }
            else if (term.nodeType() === SyntaxKind.TypeQuery) {
                var typeQuery = <TypeQuery>term;

                // TODO: This is a workaround if we encounter a TypeReference AST node. Remove it when we remove the AST.
                var typeQueryTerm = typeQuery.name;
                //if (typeQueryTerm.nodeType() === SyntaxKind.TypeRef) {
                //    typeQueryTerm = (<TypeReference>typeQueryTerm).term;
                //}

                var valueSymbol = this.resolveAST(typeQueryTerm, false, context);

                if (valueSymbol && valueSymbol.isAlias()) {
                    if ((<PullTypeAliasSymbol>valueSymbol).assignedValue()) {
                        valueSymbol = (<PullTypeAliasSymbol>valueSymbol).assignedValue();
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
            else if (term.nodeType() === SyntaxKind.ArrayType) {
                var arrayType = <ArrayType>term;
                var underlying = this.computeTypeReferenceSymbol(arrayType.type, context);
                var arraySymbol: PullTypeSymbol = underlying.getArrayType();

                // otherwise, create a new array symbol
                if (!arraySymbol) {
                    // for each member in the array interface symbol, substitute in the the typeDecl symbol for "_element"

                    arraySymbol = this.createInstantiatedType(this.cachedArrayInterfaceType(), [underlying]);

                    if (!arraySymbol) {
                        arraySymbol = this.semanticInfoChain.anyTypeSymbol;
                    }
                }

                typeDeclSymbol = arraySymbol;
            }
            else {
                throw Errors.invalidOperation("unknown type");
            }

            if (!typeDeclSymbol) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(term, DiagnosticCode.Unable_to_resolve_type));
                return this.getNewErrorTypeSymbol();
            }

            if (typeDeclSymbol.isError()) {
                return typeDeclSymbol;
            }

            if (this.genericTypeIsUsedWithoutRequiredTypeArguments(typeDeclSymbol, term, context)) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(term, DiagnosticCode.Generic_type_references_must_include_all_type_arguments));
                typeDeclSymbol = this.instantiateTypeToAny(typeDeclSymbol, context);
            }

            return typeDeclSymbol;
        }

        private genericTypeIsUsedWithoutRequiredTypeArguments(typeSymbol: PullTypeSymbol, term: AST, context: PullTypeResolutionContext): boolean {
            return typeSymbol.isNamedTypeSymbol() &&
                typeSymbol.isGeneric() &&
                !typeSymbol.isTypeParameter() &&
                (typeSymbol.isResolved || typeSymbol.inResolution) &&
                !typeSymbol.getIsSpecialized() &&
                typeSymbol.getTypeParameters().length &&
                typeSymbol.getTypeArguments() == null &&
                this.isTypeRefWithoutTypeArgs(term);
        }

        private resolveMemberVariableDeclaration(varDecl: MemberVariableDeclaration, context: PullTypeResolutionContext): PullSymbol {
            return this.resolveVariableDeclaratorOrParameterOrEnumElement(
                varDecl, varDecl.modifiers, varDecl.variableDeclarator.propertyName, getType(varDecl.variableDeclarator), varDecl.variableDeclarator.equalsValueClause, context);
        }

        private resolvePropertySignature(varDecl: PropertySignature, context: PullTypeResolutionContext): PullSymbol {
            return this.resolveVariableDeclaratorOrParameterOrEnumElement(
                varDecl, sentinelEmptyArray, varDecl.propertyName, getType(varDecl), null, context);
        }

        private resolveVariableDeclarator(varDecl: VariableDeclarator, context: PullTypeResolutionContext): PullSymbol {
            return this.resolveVariableDeclaratorOrParameterOrEnumElement(
                varDecl, getVariableDeclaratorModifiers(varDecl), varDecl.propertyName, getType(varDecl), varDecl.equalsValueClause, context);
        }

        private resolveParameterList(list: ParameterList, context: PullTypeResolutionContext): PullSymbol {
            return this.resolveSeparatedList(list.parameters, context);
        }

        private resolveParameter(parameter: Parameter, context: PullTypeResolutionContext): PullSymbol {
            return this.resolveVariableDeclaratorOrParameterOrEnumElement(
                parameter, parameter.modifiers, parameter.identifier, getType(parameter), parameter.equalsValueClause, context);
        }

        private getEnumTypeSymbol(enumElement: EnumElement, context: PullTypeResolutionContext): PullTypeSymbol {
            var enumDeclaration = <EnumDeclaration>enumElement.parent.parent;
            var decl = this.semanticInfoChain.getDeclForAST(enumDeclaration);
            var symbol = decl.getSymbol();
            this.resolveDeclaredSymbol(symbol, context);

            return <PullTypeSymbol>symbol;
        }

        private resolveEnumElement(enumElement: EnumElement, context: PullTypeResolutionContext): PullSymbol {
            return this.resolveVariableDeclaratorOrParameterOrEnumElement(
                enumElement, sentinelEmptyArray, enumElement.propertyName, null, enumElement.equalsValueClause, context);
        }

        private typeCheckEnumElement(enumElement: EnumElement, context: PullTypeResolutionContext): void {
            this.typeCheckVariableDeclaratorOrParameterOrEnumElement(
                enumElement, sentinelEmptyArray, enumElement.propertyName, null, enumElement.equalsValueClause, context);
        }

        private resolveEqualsValueClause(clause: EqualsValueClause, isContextuallyTyped: boolean, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(clause, context)) {
                this.setTypeChecked(clause, context);
            }

            return this.resolveAST(clause.value, isContextuallyTyped, context);
        }

        private resolveVariableDeclaratorOrParameterOrEnumElement(
            varDeclOrParameter: AST,
            modifiers: PullElementFlags[],
            name: IASTToken,
            typeExpr: AST,
            init: EqualsValueClause,
            context: PullTypeResolutionContext): PullSymbol {

            var hasTypeExpr = typeExpr !== null || varDeclOrParameter.nodeType() === SyntaxKind.EnumElement;
            var enclosingDecl = this.getEnclosingDeclForAST(varDeclOrParameter);
            var decl = this.semanticInfoChain.getDeclForAST(varDeclOrParameter);

            // if the enclosing decl is a lambda, we may not have bound the parent symbol
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
            }
            else {
                if (declSymbol.inResolution) {
                    // PULLTODO: Error or warning?
                    declSymbol.type = this.semanticInfoChain.anyTypeSymbol;
                    declSymbol.setResolved();
                    return declSymbol;
                }

                if (!declSymbol.type || !declSymbol.type.isError()) {
                    declSymbol.startResolving();

                    // Does this have a type expression? If so, that's the type
                    var typeExprSymbol = this.resolveAndTypeCheckVariableDeclarationTypeExpr(
                        varDeclOrParameter, name, typeExpr, context);

                    // If we're not type checking, and have a type expression, don't bother looking at the initializer expression
                    if (!hasTypeExpr) {
                        this.resolveAndTypeCheckVariableDeclaratorOrParameterInitExpr(
                            varDeclOrParameter, name, typeExpr, init, context, typeExprSymbol);
                    }

                    // if we're lacking both a type annotation and an initialization expression, the type is 'any'
                    if (!(hasTypeExpr || init)) {
                        var defaultType: PullTypeSymbol = this.semanticInfoChain.anyTypeSymbol;

                        if (declSymbol.isVarArg) {
                            defaultType = this.createInstantiatedType(this.cachedArrayInterfaceType(), [defaultType]);
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
            }

            if (this.canTypeCheckAST(varDeclOrParameter, context)) {
                this.typeCheckVariableDeclaratorOrParameterOrEnumElement(
                    varDeclOrParameter, modifiers, name, typeExpr, init, context);
            }

            return declSymbol;
        }

        private resolveAndTypeCheckVariableDeclarationTypeExpr(varDeclOrParameter: AST, name: IASTToken, typeExpr: AST, context: PullTypeResolutionContext) {
            var enclosingDecl = this.getEnclosingDeclForAST(varDeclOrParameter);
            var decl = this.semanticInfoChain.getDeclForAST(varDeclOrParameter);
            var declSymbol = decl.getSymbol();
            var declParameterSymbol: PullSymbol = decl.getValueDecl() ? decl.getValueDecl().getSymbol() : null;

            if (varDeclOrParameter.nodeType() === SyntaxKind.EnumElement) {
                var result = this.getEnumTypeSymbol(<EnumElement>varDeclOrParameter, context);
                declSymbol.type = result;
                return result;
            }

            if (!typeExpr) {
                return null;
            }

            var wrapperDecl = this.getEnclosingDecl(decl);
            wrapperDecl = wrapperDecl ? wrapperDecl : enclosingDecl;

            var typeExprSymbol = this.resolveTypeReference(typeExpr, context);

            if (!typeExprSymbol) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(varDeclOrParameter, DiagnosticCode.Unable_to_resolve_type_of_0, [name.text()]));
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
                else if (declSymbol.isVarArg && !(typeExprSymbol.isArrayNamedTypeReference() || typeExprSymbol == this.cachedArrayInterfaceType())) {
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(varDeclOrParameter, DiagnosticCode.Rest_parameters_must_be_array_types));
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
            }

            return typeExprSymbol;
        }

        private resolveAndTypeCheckVariableDeclaratorOrParameterInitExpr(varDeclOrParameter: AST, name: IASTToken, typeExpr: AST, init: EqualsValueClause, context: PullTypeResolutionContext, typeExprSymbol: PullTypeSymbol) {
            if (!init) {
                return null;
            }

            var hasTypeExpr = typeExpr !== null || varDeclOrParameter.nodeType() === SyntaxKind.EnumElement;
            if (typeExprSymbol) {
                context.pushContextualType(typeExprSymbol, context.inProvisionalResolution(), null);
            }

            var enclosingDecl = this.getEnclosingDeclForAST(varDeclOrParameter);
            var decl = this.semanticInfoChain.getDeclForAST(varDeclOrParameter);
            var declSymbol = decl.getSymbol();
            var declParameterSymbol: PullSymbol = decl.getValueDecl() ? decl.getValueDecl().getSymbol() : null;

            var wrapperDecl = this.getEnclosingDecl(decl);
            wrapperDecl = wrapperDecl ? wrapperDecl : enclosingDecl;

            var initExprSymbol = this.resolveAST(init, typeExprSymbol != null, context);

            if (typeExprSymbol) {
                context.popContextualType();
            }

            if (!initExprSymbol) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(varDeclOrParameter, DiagnosticCode.Unable_to_resolve_type_of_0, [name.text()]));

                if (!hasTypeExpr) {
                    context.setTypeInContext(declSymbol, this.getNewErrorTypeSymbol());

                    if (declParameterSymbol) {
                        context.setTypeInContext(declParameterSymbol, this.semanticInfoChain.anyTypeSymbol);
                    }
                }
            }
            else {
                var initTypeSymbol = initExprSymbol.type;
                var widenedInitTypeSymbol = this.widenType(initTypeSymbol, init.value, context);

                // Don't reset the type if we already have one from the type expression
                if (!hasTypeExpr) {
                    context.setTypeInContext(declSymbol, widenedInitTypeSymbol);

                    if (declParameterSymbol) {
                        context.setTypeInContext(declParameterSymbol, widenedInitTypeSymbol);
                    }

                    // if the noImplicitAny flag is set to be true, report an error
                    if (this.compilationSettings.noImplicitAny()) {
                        // initializer is resolved to any type from widening variable declaration (i.e var x = null)
                        if ((widenedInitTypeSymbol != initTypeSymbol) && (widenedInitTypeSymbol == this.semanticInfoChain.anyTypeSymbol)) {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(varDeclOrParameter, DiagnosticCode.Variable_0_implicitly_has_an_any_type,
                                [name.text()]));
                        }
                    }
                }
            }

            return widenedInitTypeSymbol;
        }

        private typeCheckPropertySignature(varDecl: PropertySignature, context: PullTypeResolutionContext) {
            this.typeCheckVariableDeclaratorOrParameterOrEnumElement(
                varDecl, sentinelEmptyArray, varDecl.propertyName, getType(varDecl), null, context);
        }

        private typeCheckMemberVariableDeclaration(varDecl: MemberVariableDeclaration, context: PullTypeResolutionContext) {
            this.typeCheckVariableDeclaratorOrParameterOrEnumElement(
                varDecl, varDecl.modifiers, varDecl.variableDeclarator.propertyName, getType(varDecl), varDecl.variableDeclarator.equalsValueClause, context);
        }

        private typeCheckVariableDeclarator(varDecl: VariableDeclarator, context: PullTypeResolutionContext) {
            this.typeCheckVariableDeclaratorOrParameterOrEnumElement(
                varDecl, getVariableDeclaratorModifiers(varDecl), varDecl.propertyName, getType(varDecl), varDecl.equalsValueClause, context);
        }

        private typeCheckParameter(parameter: Parameter, context: PullTypeResolutionContext) {
            this.typeCheckVariableDeclaratorOrParameterOrEnumElement(
                parameter, parameter.modifiers, parameter.identifier, getType(parameter), parameter.equalsValueClause, context);
        }

        private typeCheckVariableDeclaratorOrParameterOrEnumElement(varDeclOrParameter: AST, modifiers: PullElementFlags[], name: IASTToken, typeExpr: AST, init: EqualsValueClause, context: PullTypeResolutionContext) {
            this.setTypeChecked(varDeclOrParameter, context);

            var hasTypeExpr = typeExpr !== null || varDeclOrParameter.nodeType() === SyntaxKind.EnumElement;
            var enclosingDecl = this.getEnclosingDeclForAST(varDeclOrParameter);
            var decl = this.semanticInfoChain.getDeclForAST(varDeclOrParameter);
            var declSymbol = decl.getSymbol();

            var typeExprSymbol = this.resolveAndTypeCheckVariableDeclarationTypeExpr(
                varDeclOrParameter, name, typeExpr, context);

            // Report errors on init Expr only if typeExpr is present because we wouldnt have resolved the initExpr when just resolving
            var initTypeSymbol = this.resolveAndTypeCheckVariableDeclaratorOrParameterInitExpr(
                varDeclOrParameter, name, typeExpr, init, context, typeExprSymbol);

            // If we're type checking, test the initializer and type annotation for assignment compatibility
            if (hasTypeExpr || init) {
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
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(varDeclOrParameter, DiagnosticCode.Tried_to_set_variable_type_to_uninitialized_module_type_0, [typeExprSymbol.toString()]));
                            typeExprSymbol = null;
                        }
                        else {
                            typeExprSymbol = instanceTypeSymbol;
                        }
                    }
                }

                initTypeSymbol = this.getInstanceTypeForAssignment(
                    varDeclOrParameter, initTypeSymbol, context);

                if (initTypeSymbol && typeExprSymbol) {
                    var comparisonInfo = new TypeComparisonInfo();

                    var isAssignable = this.sourceIsAssignableToTarget(initTypeSymbol, typeExprSymbol, context, comparisonInfo);

                    if (!isAssignable) {
                        if (comparisonInfo.message) {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(varDeclOrParameter, DiagnosticCode.Cannot_convert_0_to_1_NL_2, [initTypeSymbol.toString(), typeExprSymbol.toString(), comparisonInfo.message]));
                        }
                        else {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(varDeclOrParameter, DiagnosticCode.Cannot_convert_0_to_1, [initTypeSymbol.toString(), typeExprSymbol.toString()]));
                        }
                    }
                }
            }
            else if (varDeclOrParameter.nodeType() !== SyntaxKind.EnumElement && this.compilationSettings.noImplicitAny() && !this.isForInVariableDeclarator(varDeclOrParameter)) {
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
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(varDeclOrParameter,
                        DiagnosticCode.Parameter_0_of_1_implicitly_has_an_any_type, [name.text(), enclosingDecl.name]));
                }
                // varDecl is a method paremeter
                else if (wrapperDecl.kind === TypeScript.PullElementKind.Method) {
                    // check if the parent of wrapperDecl is ambient class declaration
                    var parentDecl = wrapperDecl.getParentDecl();
                    // parentDecl is not an ambient declaration; so report an error
                    if (!TypeScript.hasFlag(parentDecl.flags, TypeScript.PullElementFlags.Ambient)) {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(varDeclOrParameter,
                            DiagnosticCode.Parameter_0_of_1_implicitly_has_an_any_type, [name.text(), enclosingDecl.name]));
                    }
                    // parentDecl is an ambient declaration, but the wrapperDecl(method) is a not private; so report an error
                    else if (TypeScript.hasFlag(parentDecl.flags, TypeScript.PullElementFlags.Ambient) &&
                        !TypeScript.hasFlag(wrapperDecl.flags, TypeScript.PullElementFlags.Private)) {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(varDeclOrParameter,
                            DiagnosticCode.Parameter_0_of_1_implicitly_has_an_any_type, [name.text(), enclosingDecl.name]));
                    }
                }
                // varDecl is a property in object type
                else if (wrapperDecl.kind === TypeScript.PullElementKind.ObjectType) {
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(varDeclOrParameter,
                        DiagnosticCode.Member_0_of_object_type_implicitly_has_an_any_type, [name.text()]));
                }
                // varDecl is a variable declartion or class/interface property; Ignore variable in catch block or in the ForIn Statement
                else if (wrapperDecl.kind !== TypeScript.PullElementKind.CatchBlock) {
                    // varDecl is not declared in ambient declaration; so report an error
                    if (!TypeScript.hasFlag(wrapperDecl.flags, TypeScript.PullElementFlags.Ambient)) {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(varDeclOrParameter,
                            DiagnosticCode.Variable_0_implicitly_has_an_any_type, [name.text()]));
                    }
                    // varDecl is delcared in ambient declaration but it is not private; so report an error
                    else if (TypeScript.hasFlag(wrapperDecl.flags, TypeScript.PullElementFlags.Ambient) &&
                        !TypeScript.hasModifier(modifiers, PullElementFlags.Private)) {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(varDeclOrParameter,
                            DiagnosticCode.Variable_0_implicitly_has_an_any_type, [name.text()]));
                    }
                }
            }

            if (init && varDeclOrParameter.nodeType() === SyntaxKind.Parameter) {
                var containerSignature = enclosingDecl.getSignatureSymbol();
                if (containerSignature && !containerSignature.isDefinition()) {
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(varDeclOrParameter, DiagnosticCode.Default_arguments_are_not_allowed_in_an_overload_parameter));
                }
            }
            if (declSymbol.kind != PullElementKind.Parameter &&
                (declSymbol.kind != PullElementKind.Property || declSymbol.getContainer().isNamedTypeSymbol())) {
                this.checkSymbolPrivacy(declSymbol, declSymbol.type, (symbol: PullSymbol) =>
                    this.variablePrivacyErrorReporter(varDeclOrParameter, declSymbol, symbol, context));
            }

            if ((declSymbol.kind != PullElementKind.Property && declSymbol.kind != PullElementKind.EnumMember) || declSymbol.anyDeclHasFlag(PullElementFlags.PropertyParameter)) {
                // Non property variable with _this name, we need to verify if this would be ok
                this.checkNameForCompilerGeneratedDeclarationCollision(varDeclOrParameter, /*isDeclaration*/ true, name, context);
            }
        }

        private isForInVariableDeclarator(ast: AST): boolean {
            return ast.nodeType() === SyntaxKind.VariableDeclarator &&
                ast.parent && ast.parent.parent && ast.parent.parent.parent &&
                ast.parent.nodeType() === SyntaxKind.SeparatedList &&
                ast.parent.parent.nodeType() === SyntaxKind.VariableDeclaration &&
                ast.parent.parent.parent.nodeType() === SyntaxKind.ForInStatement &&
                (<ForInStatement>ast.parent.parent.parent).variableDeclaration === ast.parent.parent;
        }

        private checkSuperCaptureVariableCollides(superAST: AST, isDeclaration: boolean, context: PullTypeResolutionContext) {
            var enclosingDecl = this.getEnclosingDeclForAST(superAST);
            var declPath = enclosingDecl.getParentPath();

            var classSymbol = this.getContextualClassSymbolForEnclosingDecl(superAST, enclosingDecl);

            if (classSymbol && !classSymbol.anyDeclHasFlag(PullElementFlags.Ambient)) {
                if (superAST.nodeType() == SyntaxKind.Parameter) {
                    var enclosingAST = this.getASTForDecl(enclosingDecl);
                    if (enclosingAST.nodeType() !== SyntaxKind.ParenthesizedArrowFunctionExpression &&
                        enclosingAST.nodeType() !== SyntaxKind.SimpleArrowFunctionExpression) {

                        var block = enclosingDecl.kind == PullElementKind.Method ? (<FunctionDeclaration>enclosingAST).block : (<ConstructorDeclaration>enclosingAST).block;
                        if (!block) {
                            return; // just a overload signature - no code gen
                        }
                    }
                }

                this.resolveDeclaredSymbol(classSymbol, context);

                var parents = classSymbol.getExtendedTypes();
                if (parents.length) {
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(superAST, isDeclaration
                        ? DiagnosticCode.Duplicate_identifier_super_Compiler_uses_super_to_capture_base_class_reference
                        : DiagnosticCode.Expression_resolves_to_super_that_compiler_uses_to_capture_base_class_reference));
                }
            }
        }

        private checkThisCaptureVariableCollides(_thisAST: AST, isDeclaration: boolean, context: PullTypeResolutionContext) {
            if (isDeclaration) {
                var decl = this.semanticInfoChain.getDeclForAST(_thisAST);
                if (hasFlag(decl.flags, PullElementFlags.Ambient)) { // ambient declarations do not generate the code
                    return;
                }
            }

            // Verify if this variable name conflicts with the _this that would be emitted to capture this in any of the enclosing context
            var enclosingDecl = this.getEnclosingDeclForAST(_thisAST);

            var enclosingModule = getEnclosingModuleDeclaration(_thisAST);
            if (isAnyNameOfModule(enclosingModule, _thisAST)) {
                // If we're actually the name of a module, then we want the enclosing decl for the 
                // module that we're in.
                enclosingDecl = this.getEnclosingDeclForAST(enclosingModule);
            }


            var declPath = enclosingDecl.getParentPath();

            for (var i = declPath.length - 1; i >= 0; i--) {
                var decl = declPath[i];
                var declKind = decl.kind;
                if (declKind === PullElementKind.FunctionExpression && hasFlag(decl.flags, PullElementFlags.ArrowFunction)) {
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
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(_thisAST, isDeclaration
                            ? DiagnosticCode.Duplicate_identifier_this_Compiler_uses_variable_declaration_this_to_capture_this_reference
                            : DiagnosticCode.Expression_resolves_to_variable_declaration_this_that_compiler_uses_to_capture_this_reference));
                    }
                    break;
                }
            }
        }

        private postTypeCheckVariableDeclaratorOrParameter(varDeclOrParameter: AST, context: PullTypeResolutionContext) {
            this.checkThisCaptureVariableCollides(varDeclOrParameter, /*isDeclaration:*/ true, context);
        }

        private resolveTypeParameterDeclaration(typeParameterAST: TypeParameter, context: PullTypeResolutionContext): PullTypeSymbol {
            var typeParameterDecl = this.semanticInfoChain.getDeclForAST(typeParameterAST);
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
                var constraintTypeSymbol = this.resolveTypeReference(typeParameterAST.constraint.type, context);

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

            this.resolveAST(typeParameterAST.constraint, /*isContextuallyTyped:*/ false, context);
        }

        private resolveConstraint(constraint: Constraint, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(constraint, context)) {
                this.setTypeChecked(constraint, context);
            }

            return this.resolveTypeReference(constraint.type, context);
        }

        private resolveFunctionBodyReturnTypes(
            funcDeclAST: AST,
            block: Block,
            bodyExpression: AST,
            signature: PullSignatureSymbol,
            useContextualType: boolean,
            enclosingDecl: PullDecl,
            context: PullTypeResolutionContext) {

            var returnStatementsExpressions: {
                expression: AST; enclosingDecl: PullDecl;
            }[] = [];

            var enclosingDeclStack: PullDecl[] = [enclosingDecl];

            var preFindReturnExpressionTypes = (ast: AST, walker: IAstWalker) => {
                var go = true;

                switch (ast.nodeType()) {
                    case SyntaxKind.FunctionDeclaration:
                    case SyntaxKind.SimpleArrowFunctionExpression:
                    case SyntaxKind.ParenthesizedArrowFunctionExpression:
                    case SyntaxKind.FunctionExpression:
                        // don't recurse into a function decl - we don't want to confuse a nested
                        // return type with the top-level function's return type
                        go = false;
                        break;

                    case SyntaxKind.ReturnStatement:
                        var returnStatement: ReturnStatement = <ReturnStatement>ast;
                        enclosingDecl.setFlag(PullElementFlags.HasReturnStatement);
                        returnStatementsExpressions.push({ expression: returnStatement.expression, enclosingDecl: enclosingDeclStack[enclosingDeclStack.length - 1] });
                        go = false;
                        break;

                    case SyntaxKind.CatchClause:
                    case SyntaxKind.WithStatement:
                        enclosingDeclStack[enclosingDeclStack.length] = this.semanticInfoChain.getDeclForAST(ast);
                        break;

                    default:
                        break;
                }

                walker.options.goChildren = go;

                return ast;
            };

            var postFindReturnExpressionEnclosingDecls = function (ast: AST, walker: IAstWalker) {
                switch (ast.nodeType()) {
                    case SyntaxKind.CatchClause:
                    case SyntaxKind.WithStatement:
                        enclosingDeclStack.length--;
                        break;
                    default:
                        break;
                }

                walker.options.goChildren = true;

                return ast;
            };

            if (block) {
                getAstWalkerFactory().walk(block, preFindReturnExpressionTypes, postFindReturnExpressionEnclosingDecls);
            }
            else {
                returnStatementsExpressions.push({ expression: bodyExpression, enclosingDecl: enclosingDecl });
                enclosingDecl.setFlag(PullElementFlags.HasReturnStatement);
            }

            if (!returnStatementsExpressions.length) {
                signature.returnType = this.semanticInfoChain.voidTypeSymbol;
            }

            else {
                var returnExpressionSymbols: PullTypeSymbol[] = [];
                var returnExpressions: AST[] = [];

                for (var i = 0; i < returnStatementsExpressions.length; i++) {
                    var returnExpression = returnStatementsExpressions[i].expression;
                    if (returnExpression) {
                        var returnType = this.resolveAST(returnExpression, useContextualType, context).type;

                        if (returnType.isError()) {
                            signature.returnType = returnType;
                            return;
                        }
                        else {
                            if (returnExpression.parent.nodeType() === SyntaxKind.ReturnStatement) {
                                this.setSymbolForAST(returnExpression.parent, returnType, context);
                            }
                        }

                        returnExpressionSymbols.push(returnType);
                        returnExpressions.push(returnExpression);
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

                    var bestCommonReturnType = this.findBestCommonType(collection, context, new TypeComparisonInfo());
                    var returnType = bestCommonReturnType;
                    var returnExpression = returnExpressions[returnExpressionSymbols.indexOf(returnType)];

                    if (useContextualType && returnType == this.semanticInfoChain.anyTypeSymbol) {
                        var contextualType = context.getContextualType();

                        if (contextualType) {
                            returnType = contextualType;
                        }
                    }

                    var functionDecl = this.semanticInfoChain.getDeclForAST(funcDeclAST);
                    var functionSymbol = functionDecl.getSymbol();

                    if (returnType) {
                        var previousReturnType = returnType;
                        var newReturnType = this.widenType(returnType, returnExpression, context);
                        signature.returnType = newReturnType;

                        if (!ArrayUtilities.contains(returnExpressionSymbols, bestCommonReturnType)) {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDeclAST,
                                DiagnosticCode.Could_not_find_the_best_common_type_of_types_of_all_return_statement_expressions));
                        }

                        // if noImplicitAny flag is set to be true and return statements are not cast expressions, report an error
                        if (this.compilationSettings.noImplicitAny()) {
                            // if the returnType got widen to Any
                            if (previousReturnType !== newReturnType && newReturnType === this.semanticInfoChain.anyTypeSymbol) {
                                var functionName = enclosingDecl.name;
                                if (functionName == "") {
                                    functionName = (<PullFunctionExpressionDecl>enclosingDecl).getFunctionExpressionName();
                                }

                                if (functionName != "") {
                                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDeclAST,
                                        DiagnosticCode._0_which_lacks_return_type_annotation_implicitly_has_an_any_return_type, [functionName]));
                                }
                                else {
                                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDeclAST,
                                        DiagnosticCode.Function_expression_which_lacks_return_type_annotation_implicitly_has_an_any_return_type));
                                }
                            }
                        }
                    }

                    // If the accessor is referenced via a recursive chain, we may not have set the accessor's type just yet and we'll
                    // need to do so before setting the 'isGeneric' flag
                    if (!functionSymbol.type && functionSymbol.isAccessor()) {
                        functionSymbol.type = signature.returnType;
                    }
                }
            }
        }

        private typeCheckConstructorDeclaration(funcDeclAST: ConstructorDeclaration, context: PullTypeResolutionContext) {
            this.setTypeChecked(funcDeclAST, context);

            var funcDecl = this.semanticInfoChain.getDeclForAST(funcDeclAST);

            // resolve parameter type annotations as necessary
            if (funcDeclAST.parameterList) {
                for (var i = 0; i < funcDeclAST.parameterList.parameters.nonSeparatorCount(); i++) {
                    this.resolveAST(funcDeclAST.parameterList.parameters.nonSeparatorAt(i), /*isContextuallyTyped:*/ false, context);
                }
            }

            this.resolveAST(funcDeclAST.block, false, context);

            if (funcDecl.getSignatureSymbol() && funcDecl.getSignatureSymbol().isDefinition() && this.enclosingClassIsDerived(funcDecl.getParentDecl())) {
                // Constructors for derived classes must contain a call to the class's 'super' constructor
                if (!this.constructorHasSuperCall(funcDeclAST)) {
                    context.postDiagnostic(new Diagnostic(funcDeclAST.fileName(), this.semanticInfoChain.lineMap(funcDeclAST.fileName()), funcDeclAST.start(), 11 /* "constructor" */,
                        DiagnosticCode.Constructors_for_derived_classes_must_contain_a_super_call));
                }
                // The first statement in the body of a constructor must be a super call if both of the following are true:
                //  - The containing class is a derived class.
                //  - The constructor declares parameter properties or the containing class declares instance member variables with initializers.
                else if (this.superCallMustBeFirstStatementInConstructor(funcDecl)) {
                    var firstStatement = this.getFirstStatementOfBlockOrNull(funcDeclAST.block);
                    if (!firstStatement || !this.isSuperInvocationExpressionStatement(firstStatement)) {
                        context.postDiagnostic(new Diagnostic(funcDeclAST.fileName(), this.semanticInfoChain.lineMap(funcDeclAST.fileName()), funcDeclAST.start(), 11 /* "constructor" */,
                            DiagnosticCode.A_super_call_must_be_the_first_statement_in_the_constructor_when_a_class_contains_initialized_properties_or_has_parameter_properties));
                    }
                }
            }

            this.validateVariableDeclarationGroups(funcDecl, context);

            this.checkFunctionTypePrivacy(
                funcDeclAST, /*isStatic:*/ false, null, Parameters.fromParameterList(funcDeclAST.parameterList), null, funcDeclAST.block, context);

            this.typeCheckCallBacks.push(context => {
                // Function or constructor
                this.typeCheckFunctionOverloads(funcDeclAST, context);
            });
        }

        private constructorHasSuperCall(constructorDecl: ConstructorDeclaration): boolean {
            // October 1, 2013
            // Constructors of classes with no extends clause may not contain super calls, whereas 
            // constructors of derived classes must contain at least one super call somewhere in 
            // their function body. Super calls are not permitted outside constructors or in local
            // functions inside constructors.
            if (constructorDecl.block) {
                var foundSuperCall = false;
                var pre = (ast: AST, walker: IAstWalker) => {
                    // If we hit a super invocation, then we're done.  Stop everything we're doing.
                    // Note 1: there is no restriction on there being multiple super calls.
                    // Note 2: The restriction about super calls not being permitted in a local 
                    // function is checked in typeCheckSuperExpression
                    if (this.isSuperInvocationExpression(ast)) {
                        foundSuperCall = true;
                        walker.options.stopWalking = true;
                    }
                }

                getAstWalkerFactory().walk(constructorDecl.block, pre);
                return foundSuperCall;
            }

            return false;
        }

        private typeCheckFunctionExpression(funcDecl: FunctionExpression, context: PullTypeResolutionContext): void {
            this.typeCheckAnyFunctionExpression(funcDecl, funcDecl.callSignature.typeParameterList, getType(funcDecl), funcDecl.block, /*bodyExpression:*/ null, context);
        }

        private typeCheckCallSignature(funcDecl: CallSignature, context: PullTypeResolutionContext): void {
            this.typeCheckFunctionDeclaration(funcDecl, /*isStatic:*/ false,
                null, funcDecl.typeParameterList, funcDecl.parameterList, getType(funcDecl), null, context);
        }

        private typeCheckConstructSignature(funcDecl: ConstructSignature, context: PullTypeResolutionContext): void {
            this.typeCheckFunctionDeclaration(funcDecl, /*isStatic:*/ false,
                null, funcDecl.callSignature.typeParameterList, funcDecl.callSignature.parameterList, getType(funcDecl), null, context);
        }

        private typeCheckFunctionDeclaration(
            funcDeclAST: AST,
            isStatic: boolean,
            name: IASTToken,
            typeParameters: TypeParameterList,
            parameters: ParameterList,
            returnTypeAnnotation: AST,
            block: Block,
            context: PullTypeResolutionContext) {
            this.setTypeChecked(funcDeclAST, context);

            var funcDecl = this.semanticInfoChain.getDeclForAST(funcDeclAST);

            if (typeParameters) {
                for (var i = 0; i < typeParameters.typeParameters.nonSeparatorCount(); i++) {
                    this.resolveTypeParameterDeclaration(<TypeParameter>typeParameters.typeParameters.nonSeparatorAt(i), context);
                }
            }

            // resolve parameter type annotations as necessary
            this.resolveAST(parameters, /*isContextuallyTyped:*/ false, context);

            this.resolveAST(block, false, context);
            var enclosingDecl = this.getEnclosingDecl(funcDecl);

            this.resolveReturnTypeAnnotationOfFunctionDeclaration(funcDeclAST, returnTypeAnnotation, context);
            this.validateVariableDeclarationGroups(funcDecl, context);

            this.checkFunctionTypePrivacy(
                funcDeclAST, isStatic, typeParameters, Parameters.fromParameterList(parameters), returnTypeAnnotation, block, context);

            var signature: PullSignatureSymbol = funcDecl.getSignatureSymbol();

            // It is a constructor or function
            var hasReturn = (funcDecl.flags & (PullElementFlags.Signature | PullElementFlags.HasReturnStatement)) != 0;

            // If this is a function and it has returnType annotation, check if block contains non void return expression
            if (funcDeclAST.nodeType() !== SyntaxKind.ConstructSignature && block && returnTypeAnnotation != null && !hasReturn) {
                var isVoidOrAny = this.isAnyOrEquivalent(signature.returnType) || signature.returnType === this.semanticInfoChain.voidTypeSymbol;

                if (!isVoidOrAny && !(block.statements.childCount() > 0 && block.statements.childAt(0).nodeType() === SyntaxKind.ThrowStatement)) {
                    var funcName = funcDecl.getDisplayName();
                    funcName = funcName ? funcName : "expression";

                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(returnTypeAnnotation, DiagnosticCode.Function_0_declared_a_non_void_return_type_but_has_no_return_expression, [funcName]));
                }
            }

            if (funcDecl.kind === PullElementKind.Function) {
                this.checkNameForCompilerGeneratedDeclarationCollision(funcDeclAST, /*isDeclaration*/ true, name, context);
            }

            this.typeCheckCallBacks.push(context => {
                // Function or constructor
                this.typeCheckFunctionOverloads(funcDeclAST, context);
            });
        }

        private typeCheckIndexSignature(funcDeclAST: IndexSignature, context: PullTypeResolutionContext): void {

            this.setTypeChecked(funcDeclAST, context);

            var funcDecl = this.semanticInfoChain.getDeclForAST(funcDeclAST);

            // resolve parameter type annotations as necessary
            this.resolveAST(funcDeclAST.parameter, /*isContextuallyTyped:*/ false, context);

            var enclosingDecl = this.getEnclosingDecl(funcDecl);

            this.resolveReturnTypeAnnotationOfFunctionDeclaration(funcDeclAST, getType(funcDeclAST), context);
            this.validateVariableDeclarationGroups(funcDecl, context);

            this.checkFunctionTypePrivacy(
                funcDeclAST, /*isStatic:*/ false, null, Parameters.fromParameter(funcDeclAST.parameter), getType(funcDeclAST), null, context);

            var signature: PullSignatureSymbol = funcDecl.getSignatureSymbol();

            this.typeCheckCallBacks.push(context => {
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

                    if (!this.sourceIsSubtypeOfTarget(numberIndexSignature.returnType, stringIndexSignature.returnType, context, comparisonInfo)) {
                        if (comparisonInfo.message) {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDeclAST, DiagnosticCode.Numeric_indexer_type_0_must_be_a_subtype_of_string_indexer_type_1_NL_2,
                                [numberIndexSignature.returnType.toString(), stringIndexSignature.returnType.toString(), comparisonInfo.message]));
                        } else {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDeclAST, DiagnosticCode.Numeric_indexer_type_0_must_be_a_subtype_of_string_indexer_type_1,
                                [numberIndexSignature.returnType.toString(), stringIndexSignature.returnType.toString()]));
                        }
                    }
                }

                // Check that property names comply with indexer constraints (either string or numeric)
                var allMembers = parentSymbol.type.getAllMembers(PullElementKind.All, GetAllMembersVisiblity.all);
                for (var i = 0; i < allMembers.length; i++) {
                    var member = allMembers[i];
                    var name = member.name;
                    if (name || (member.kind === PullElementKind.Property && name === "")) {
                        if (!allMembers[i].isResolved) {
                            this.resolveDeclaredSymbol(allMembers[i], context);
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
            });
        }

        private postTypeCheckFunctionDeclaration(funcDeclAST: FunctionDeclaration, context: PullTypeResolutionContext) {
            this.checkThisCaptureVariableCollides(funcDeclAST, /*isDeclaration*/ true, context);
        }

        private resolveReturnTypeAnnotationOfFunctionDeclaration(
            funcDeclAST: AST,
            returnTypeAnnotation: AST,
            context: PullTypeResolutionContext): PullTypeSymbol {

            var returnTypeSymbol: PullTypeSymbol = null;

            // resolve the return type annotation
            if (returnTypeAnnotation) {
                var funcDecl = this.semanticInfoChain.getDeclForAST(funcDeclAST);

                // use the funcDecl for the enclosing decl, since we want to pick up any type parameters 
                // on the function when resolving the return type
                returnTypeSymbol = this.resolveTypeReference(returnTypeAnnotation, context);

                if (!returnTypeSymbol) {
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(returnTypeAnnotation, DiagnosticCode.Cannot_resolve_return_type_reference));
                }
                else {
                    var isConstructor = funcDeclAST.nodeType() === SyntaxKind.ConstructorDeclaration || funcDeclAST.nodeType() === SyntaxKind.ConstructSignature;
                    if (isConstructor && returnTypeSymbol === this.semanticInfoChain.voidTypeSymbol) {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDeclAST, DiagnosticCode.Constructors_cannot_have_a_return_type_of_void));
                    }
                }
            }

            return returnTypeSymbol;
        }

        private resolveMemberFunctionDeclaration(funcDecl: MemberFunctionDeclaration, context: PullTypeResolutionContext): PullSymbol {
            return this.resolveFunctionDeclaration(funcDecl, hasModifier(funcDecl.modifiers, PullElementFlags.Static), funcDecl.propertyName,
                funcDecl.callSignature.typeParameterList, funcDecl.callSignature.parameterList, getType(funcDecl), funcDecl.block, context);
        }

        private resolveCallSignature(funcDecl: CallSignature, context: PullTypeResolutionContext): PullSymbol {
            return this.resolveFunctionDeclaration(funcDecl, /*isStatic:*/ false, null,
                funcDecl.typeParameterList, funcDecl.parameterList, getType(funcDecl), null, context);
        }

        private resolveConstructSignature(funcDecl: ConstructSignature, context: PullTypeResolutionContext): PullSymbol {
            return this.resolveFunctionDeclaration(funcDecl, /*isStatic:*/ false, null,
                funcDecl.callSignature.typeParameterList, funcDecl.callSignature.parameterList, getType(funcDecl), null, context);
        }

        private resolveMethodSignature(funcDecl: MethodSignature, context: PullTypeResolutionContext): PullSymbol {
            return this.resolveFunctionDeclaration(funcDecl, /*isStatic:*/ false, funcDecl.propertyName,
                funcDecl.callSignature.typeParameterList, funcDecl.callSignature.parameterList, getType(funcDecl), null, context);
        }

        private resolveAnyFunctionDeclaration(funcDecl: FunctionDeclaration, context: PullTypeResolutionContext): PullSymbol {
            return this.resolveFunctionDeclaration(funcDecl, hasModifier(funcDecl.modifiers, PullElementFlags.Static), funcDecl.identifier,
                funcDecl.callSignature.typeParameterList, funcDecl.callSignature.parameterList, getType(funcDecl), funcDecl.block, context);
        }

        private resolveFunctionExpression(funcDecl: FunctionExpression, isContextuallyTyped: boolean, context: PullTypeResolutionContext): PullSymbol {
            return this.resolveAnyFunctionExpression(funcDecl, funcDecl.callSignature.typeParameterList,
                Parameters.fromParameterList(funcDecl.callSignature.parameterList), getType(funcDecl), funcDecl.block, /*bodyExpression:*/ null,
                isContextuallyTyped, context);
        }

        private resolveSimpleArrowFunctionExpression(funcDecl: SimpleArrowFunctionExpression, isContextuallyTyped: boolean, context: PullTypeResolutionContext): PullSymbol {
            return this.resolveAnyFunctionExpression(
                funcDecl, null, Parameters.fromIdentifier(funcDecl.identifier), null, funcDecl.block, funcDecl.expression,
                isContextuallyTyped, context);
        }

        private resolveParenthesizedArrowFunctionExpression(funcDecl: ParenthesizedArrowFunctionExpression, isContextuallyTyped: boolean, context: PullTypeResolutionContext): PullSymbol {
            return this.resolveAnyFunctionExpression(
                funcDecl, funcDecl.callSignature.typeParameterList, Parameters.fromParameterList(funcDecl.callSignature.parameterList), getType(funcDecl),
                funcDecl.block, funcDecl.expression, isContextuallyTyped, context);
        }

        private getEnclosingClassDeclaration(ast: AST): ClassDeclaration {
            while (ast) {
                if (ast.nodeType() === SyntaxKind.ClassDeclaration) {
                    return <ClassDeclaration>ast;
                }

                ast = ast.parent;
            }

            return null;
        }

        private resolveConstructorDeclaration(funcDeclAST: ConstructorDeclaration, context: PullTypeResolutionContext): PullSymbol {
            var funcDecl = this.semanticInfoChain.getDeclForAST(funcDeclAST);

            var funcSymbol = funcDecl.getSymbol();

            var signature: PullSignatureSymbol = funcDecl.getSignatureSymbol();

            var hadError = false;

            if (signature) {
                if (signature.isResolved) {
                    if (this.canTypeCheckAST(funcDeclAST, context)) {
                        this.typeCheckConstructorDeclaration(funcDeclAST, context);
                    }
                    return funcSymbol;
                }

                if (!signature.inResolution) {
                    var classAST = this.getEnclosingClassDeclaration(funcDeclAST);

                    if (classAST) {
                        var classDecl = this.semanticInfoChain.getDeclForAST(classAST);
                        var classSymbol = classDecl.getSymbol();

                        if (!classSymbol.isResolved && !classSymbol.inResolution) {
                            this.resolveDeclaredSymbol(classSymbol, context);
                        }
                    }
                }

                // Save this in case we had set the function type to any because of a recursive reference.
                var functionTypeSymbol = funcSymbol && funcSymbol.type;

                if (signature.inResolution) {
                    signature.returnType = this.semanticInfoChain.anyTypeSymbol;

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

                // resolve parameter type annotations as necessary

                if (funcDeclAST.parameterList) {
                    var prevInTypeCheck = context.inTypeCheck;

                    // TODO: why are we getting ourselves out of typecheck here?
                    context.inTypeCheck = false;

                    for (var i = 0; i < funcDeclAST.parameterList.parameters.nonSeparatorCount(); i++) {
                        // TODO: why are we calling resolveParameter instead of resolveAST.
                        this.resolveParameter(<Parameter>funcDeclAST.parameterList.parameters.nonSeparatorAt(i), context);
                    }

                    context.inTypeCheck = prevInTypeCheck;
                }

                if (signature.isGeneric()) {
                    // PULLREVIEW: This is split into a spearate if statement to make debugging slightly easier...
                    if (funcSymbol) {
                        funcSymbol.type.setHasGenericSignature();
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
                this.typeCheckConstructorDeclaration(funcDeclAST, context);
            }

            return funcSymbol;
        }

        private resolveIndexMemberDeclaration(ast: IndexMemberDeclaration, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.setTypeChecked(ast, context);
            }

            return this.resolveIndexSignature(ast.indexSignature, context);
        }

        private resolveIndexSignature(funcDeclAST: IndexSignature, context: PullTypeResolutionContext): PullSymbol {
            var funcDecl = this.semanticInfoChain.getDeclForAST(funcDeclAST);

            var funcSymbol = funcDecl.getSymbol();

            var signature: PullSignatureSymbol = funcDecl.getSignatureSymbol();

            var hadError = false;

            if (signature) {
                if (signature.isResolved) {
                    if (this.canTypeCheckAST(funcDeclAST, context)) {
                        this.typeCheckIndexSignature(funcDeclAST, context);
                    }
                    return funcSymbol;
                }

                // Save this in case we had set the function type to any because of a recursive reference.
                var functionTypeSymbol = funcSymbol && funcSymbol.type;

                if (signature.inResolution) {

                    // try to set the return type, even though we may be lacking in some information
                    if (funcDeclAST.typeAnnotation) {
                        var returnTypeSymbol = this.resolveTypeReference(getType(funcDeclAST), context);
                        if (!returnTypeSymbol) {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(getType(funcDeclAST), DiagnosticCode.Cannot_resolve_return_type_reference));
                            signature.returnType = this.getNewErrorTypeSymbol();
                            hadError = true;
                        } else {
                            signature.returnType = returnTypeSymbol;
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

                // resolve parameter type annotations as necessary

                if (funcDeclAST.parameter) {
                    var prevInTypeCheck = context.inTypeCheck;

                    // TODO: why are we setting inTypeCheck false here?
                    context.inTypeCheck = false;
                    this.resolveParameter(funcDeclAST.parameter, context);
                    context.inTypeCheck = prevInTypeCheck;
                }

                // resolve the return type annotation
                if (funcDeclAST.typeAnnotation) {
                    returnTypeSymbol = this.resolveReturnTypeAnnotationOfFunctionDeclaration(funcDeclAST, getType(funcDeclAST), context);

                    if (!returnTypeSymbol) {
                        signature.returnType = this.getNewErrorTypeSymbol();
                        hadError = true;
                    }
                    else {
                        signature.returnType = returnTypeSymbol;
                    }
                }
                // if there's no return-type annotation
                //     - if it's not a definition signature, set the return type to 'any'
                //     - if it's a definition sigature, take the best common type of all return expressions
                //     - if it's a constructor, we set the return type link during binding
                else {
                    signature.returnType = this.semanticInfoChain.anyTypeSymbol;
                    var parentDeclFlags = TypeScript.PullElementFlags.None;
                    if (TypeScript.hasFlag(funcDecl.kind, TypeScript.PullElementKind.Method) ||
                        TypeScript.hasFlag(funcDecl.kind, TypeScript.PullElementKind.ConstructorMethod)) {
                        var parentDecl = funcDecl.getParentDecl();
                        parentDeclFlags = parentDecl.flags;
                    }

                    // if the noImplicitAny flag is set to be true, report an error
                    if (this.compilationSettings.noImplicitAny() &&
                        (!TypeScript.hasFlag(parentDeclFlags, PullElementFlags.Ambient) ||
                        (TypeScript.hasFlag(parentDeclFlags, PullElementFlags.Ambient) && !TypeScript.hasFlag(funcDecl.flags, PullElementFlags.Private)))) {
                        var funcDeclASTName = name;
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDeclAST, DiagnosticCode._0_which_lacks_return_type_annotation_implicitly_has_an_any_return_type,
                            ["Indexer"]));
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
                this.typeCheckIndexSignature(funcDeclAST, context);
            }

            return funcSymbol;
        }


        private resolveFunctionDeclaration(funcDeclAST: AST, isStatic: boolean, name: IASTToken, typeParameters: TypeParameterList, parameterList: ParameterList, returnTypeAnnotation: AST, block: Block, context: PullTypeResolutionContext): PullSymbol {
            var funcDecl = this.semanticInfoChain.getDeclForAST(funcDeclAST);

            var funcSymbol = funcDecl.getSymbol();

            var signature: PullSignatureSymbol = funcDecl.getSignatureSymbol();

            var hadError = false;

            var isConstructor = funcDeclAST.nodeType() === SyntaxKind.ConstructSignature;

            if (signature) {
                if (signature.isResolved) {
                    if (this.canTypeCheckAST(funcDeclAST, context)) {
                        this.typeCheckFunctionDeclaration(
                            funcDeclAST, isStatic, name, typeParameters,
                            parameterList, returnTypeAnnotation, block, context);
                    }
                    return funcSymbol;
                }

                if (isConstructor && !signature.inResolution) {
                    var classAST = this.getEnclosingClassDeclaration(funcDeclAST);

                    if (classAST) {
                        var classDecl = this.semanticInfoChain.getDeclForAST(classAST);
                        var classSymbol = classDecl.getSymbol();

                        if (!classSymbol.isResolved && !classSymbol.inResolution) {
                            this.resolveDeclaredSymbol(classSymbol, context);
                        }
                    }
                }

                // Save this in case we had set the function type to any because of a recursive reference.
                var functionTypeSymbol = funcSymbol && funcSymbol.type;

                if (signature.inResolution) {

                    // try to set the return type, even though we may be lacking in some information
                    if (returnTypeAnnotation) {
                        var returnTypeSymbol = this.resolveTypeReference(returnTypeAnnotation, context);
                        if (!returnTypeSymbol) {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(returnTypeAnnotation, DiagnosticCode.Cannot_resolve_return_type_reference));
                            signature.returnType = this.getNewErrorTypeSymbol();
                            hadError = true;
                        } else {
                            signature.returnType = returnTypeSymbol;

                            if (isConstructor && returnTypeSymbol === this.semanticInfoChain.voidTypeSymbol) {
                                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDeclAST, DiagnosticCode.Constructors_cannot_have_a_return_type_of_void));
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

                if (typeParameters) {
                    for (var i = 0; i < typeParameters.typeParameters.nonSeparatorCount(); i++) {
                        this.resolveTypeParameterDeclaration(<TypeParameter>typeParameters.typeParameters.nonSeparatorAt(i), context);
                    }
                }

                // resolve parameter type annotations as necessary

                if (parameterList) {
                    var prevInTypeCheck = context.inTypeCheck;

                    // TODO: why are we setting inTypeCheck false here?
                    context.inTypeCheck = false;

                    for (var i = 0; i < parameterList.parameters.nonSeparatorCount(); i++) {
                        // TODO: why are are calling resolveParameter directly here?
                        this.resolveParameter(<Parameter>parameterList.parameters.nonSeparatorAt(i), context);
                    }

                    context.inTypeCheck = prevInTypeCheck;
                }

                // resolve the return type annotation
                if (returnTypeAnnotation) {
                    returnTypeSymbol = this.resolveReturnTypeAnnotationOfFunctionDeclaration(funcDeclAST, returnTypeAnnotation, context);

                    if (!returnTypeSymbol) {
                        signature.returnType = this.getNewErrorTypeSymbol();
                        hadError = true;
                    }
                    else {
                        signature.returnType = returnTypeSymbol;
                    }
                }
                // if there's no return-type annotation
                //     - if it's not a definition signature, set the return type to 'any'
                //     - if it's a definition sigature, take the best common type of all return expressions
                //     - if it's a constructor, we set the return type link during binding
                else if (funcDecl.kind !== PullElementKind.ConstructSignature) {
                    if (hasFlag(funcDecl.flags, PullElementFlags.Signature)) {
                        signature.returnType = this.semanticInfoChain.anyTypeSymbol;
                        var parentDeclFlags = TypeScript.PullElementFlags.None;
                        if (TypeScript.hasFlag(funcDecl.kind, TypeScript.PullElementKind.Method) ||
                            TypeScript.hasFlag(funcDecl.kind, TypeScript.PullElementKind.ConstructorMethod)) {
                            var parentDecl = funcDecl.getParentDecl();
                            parentDeclFlags = parentDecl.flags;
                        }

                        // if the noImplicitAny flag is set to be true, report an error
                        if (this.compilationSettings.noImplicitAny() &&
                            (!TypeScript.hasFlag(parentDeclFlags, PullElementFlags.Ambient) ||
                            (TypeScript.hasFlag(parentDeclFlags, PullElementFlags.Ambient) && !TypeScript.hasFlag(funcDecl.flags, PullElementFlags.Private)))) {
                            var funcDeclASTName = name;
                            if (funcDeclASTName) {
                                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDeclAST, DiagnosticCode._0_which_lacks_return_type_annotation_implicitly_has_an_any_return_type,
                                    [funcDeclASTName.text()]));
                            }
                            else {
                                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDeclAST,
                                    DiagnosticCode.Lambda_Function_which_lacks_return_type_annotation_implicitly_has_an_any_return_type));
                            }
                        }
                    }
                    else {
                        this.resolveFunctionBodyReturnTypes(funcDeclAST, block, /*bodyExpression:*/ null, signature, false, funcDecl, context);
                    }
                }
                else if (funcDecl.kind === PullElementKind.ConstructSignature) {
                    signature.returnType = this.semanticInfoChain.anyTypeSymbol;

                    // if the noImplicitAny flag is set to be true, report an error
                    if (this.compilationSettings.noImplicitAny()) {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDeclAST, DiagnosticCode.Constructor_signature_which_lacks_return_type_annotation_implicitly_has_an_any_return_type));
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
                this.typeCheckFunctionDeclaration(
                    funcDeclAST, isStatic, name, typeParameters,
                    parameterList, returnTypeAnnotation, block, context);
            }

            return funcSymbol;
        }

        private resolveGetterReturnTypeAnnotation(
            getterFunctionDeclarationAst: GetAccessor,
            enclosingDecl: PullDecl,
            context: PullTypeResolutionContext): PullTypeSymbol {

            if (getterFunctionDeclarationAst && getterFunctionDeclarationAst.typeAnnotation) {
                return this.resolveTypeReference(getType(getterFunctionDeclarationAst), context);
            }

            return null;
        }

        private resolveSetterArgumentTypeAnnotation(
            setterFunctionDeclarationAst: SetAccessor,
            enclosingDecl: PullDecl,
            context: PullTypeResolutionContext): PullTypeSymbol {

            if (setterFunctionDeclarationAst &&
                setterFunctionDeclarationAst.parameterList &&
                setterFunctionDeclarationAst.parameterList.parameters.nonSeparatorCount() > 0) {

                var parameter = <Parameter>setterFunctionDeclarationAst.parameterList.parameters.nonSeparatorAt(0);
                return this.resolveTypeReference(getType(parameter), context);
            }

            return null;
        }

        private resolveAccessorDeclaration(funcDeclAst: AST, context: PullTypeResolutionContext): PullSymbol {
            var functionDeclaration = this.semanticInfoChain.getDeclForAST(funcDeclAst);
            var accessorSymbol = <PullAccessorSymbol> functionDeclaration.getSymbol();

            if (accessorSymbol.inResolution) {
                // TODO: Review, should an error be raised?
                accessorSymbol.type = this.semanticInfoChain.anyTypeSymbol;
                accessorSymbol.setResolved();

                return accessorSymbol;
            }

            if (accessorSymbol.isResolved) {
                if (!accessorSymbol.type) {
                    accessorSymbol.type = this.semanticInfoChain.anyTypeSymbol;
                }
            } else {
                var getterSymbol = accessorSymbol.getGetter();
                var getterFunctionDeclarationAst = getterSymbol ? <GetAccessor>getterSymbol.getDeclarations()[0].ast() : null;
                var hasGetter = getterSymbol !== null;

                var setterSymbol = accessorSymbol.getSetter();
                var setterFunctionDeclarationAst = setterSymbol ? <SetAccessor>setterSymbol.getDeclarations()[0].ast() : null;
                var hasSetter = setterSymbol !== null;

                var getterAnnotatedType = this.resolveGetterReturnTypeAnnotation(
                    getterFunctionDeclarationAst, functionDeclaration, context);
                var getterHasTypeAnnotation = getterAnnotatedType !== null;

                var setterAnnotatedType = this.resolveSetterArgumentTypeAnnotation(
                    setterFunctionDeclarationAst, functionDeclaration, context);
                var setterHasTypeAnnotation = setterAnnotatedType !== null;

                accessorSymbol.startResolving();

                // resolve accessors - resolution order doesn't matter
                if (hasGetter) {
                    getterSymbol =
                    this.resolveGetAccessorDeclaration(
                        getterFunctionDeclarationAst,
                        getterFunctionDeclarationAst.parameterList,
                        getType(getterFunctionDeclarationAst),
                        getterFunctionDeclarationAst.block,
                        setterAnnotatedType, context);
                }

                if (hasSetter) {
                    setterSymbol = this.resolveSetAccessorDeclaration(setterFunctionDeclarationAst, setterFunctionDeclarationAst.parameterList, context);
                }

                // enforce spec resolution rules
                if (hasGetter && hasSetter) {
                    var setterSig = setterSymbol.type.getCallSignatures()[0];
                    var setterParameters = setterSig.parameters;
                    var setterHasParameters = setterParameters.length > 0;
                    var getterSig = getterSymbol.type.getCallSignatures()[0];

                    var setterSuppliedTypeSymbol: PullTypeSymbol = setterHasParameters ? setterParameters[0].type : null;
                    var getterSuppliedTypeSymbol: PullTypeSymbol = getterSig.returnType;

                    // SPEC: October 1, 2013 section 4.5 -
                    // • If only one accessor includes a type annotation, the other behaves as if it had the same type annotation.
                    // -- In this case setter has annotation and getter does not.
                    if (setterHasTypeAnnotation && !getterHasTypeAnnotation) {
                        getterSuppliedTypeSymbol = setterSuppliedTypeSymbol;
                        getterSig.returnType = setterSuppliedTypeSymbol;
                    }
                    // SPEC: October 1, 2013 section 4.5 -
                    // • If only one accessor includes a type annotation, the other behaves as if it had the same type annotation.
                    // • If neither accessor includes a type annotation, the inferred return type of the get accessor becomes the parameter type of the set accessor.
                    // -- In this case getter has annotation and setter does not - or neither do, so use getter.
                    else if ((getterHasTypeAnnotation && !setterHasTypeAnnotation) ||
                        (!getterHasTypeAnnotation && !setterHasTypeAnnotation)) {

                        setterSuppliedTypeSymbol = getterSuppliedTypeSymbol;

                        if (setterHasParameters) {
                            setterParameters[0].type = getterSuppliedTypeSymbol;
                        }
                    }

                    // SPEC: October 1, 2013 section 4.5 -
                    // • If both accessors include type annotations, the specified types must be identical.
                    if (!this.typesAreIdentical(setterSuppliedTypeSymbol, getterSuppliedTypeSymbol)) {
                        accessorSymbol.type = this.getNewErrorTypeSymbol();
                    }
                    else {
                        accessorSymbol.type = getterSuppliedTypeSymbol;
                    }
                }
                else if (hasSetter) {
                    // only has setter
                    var setterSig = setterSymbol.type.getCallSignatures()[0];
                    var setterParameters = setterSig.parameters;
                    var setterHasParameters = setterParameters.length > 0;

                    accessorSymbol.type = setterHasParameters ? setterParameters[0].type : this.semanticInfoChain.anyTypeSymbol;
                }
                else {
                    // only has getter 
                    var getterSig = getterSymbol.type.getCallSignatures()[0];
                    accessorSymbol.type = getterSig.returnType;
                }

                accessorSymbol.setResolved();
            }

            // type check if possible
            if (this.canTypeCheckAST(funcDeclAst, context)) {
                this.typeCheckAccessorDeclaration(funcDeclAst, context);
            }

            return accessorSymbol;
        }

        private typeCheckAccessorDeclaration(funcDeclAst: AST, context: PullTypeResolutionContext) {
            this.setTypeChecked(funcDeclAst, context);
            var functionDeclaration = this.semanticInfoChain.getDeclForAST(funcDeclAst);
            var accessorSymbol = <PullAccessorSymbol> functionDeclaration.getSymbol();
            var getterSymbol = accessorSymbol.getGetter();
            var setterSymbol = accessorSymbol.getSetter();

            var isGetter = funcDeclAst.nodeType() == SyntaxKind.GetAccessor;
            if (isGetter) {
                var getterFunctionDeclarationAst = <GetAccessor>funcDeclAst;
                context.pushContextualType(getterSymbol.type, context.inProvisionalResolution(), null);
                this.typeCheckGetAccessorDeclaration(getterFunctionDeclarationAst, context);
                context.popContextualType();
            } else {
                var setterFunctionDeclarationAst = <SetAccessor>funcDeclAst;
                this.typeCheckSetAccessorDeclaration(setterFunctionDeclarationAst, context);
            }
        }

        private resolveGetAccessorDeclaration(funcDeclAST: AST, parameters: ParameterList, returnTypeAnnotation: AST, block: Block, setterAnnotatedType: PullTypeSymbol, context: PullTypeResolutionContext): PullSymbol {
            var funcDecl: PullDecl = this.semanticInfoChain.getDeclForAST(funcDeclAST);
            var accessorSymbol = <PullAccessorSymbol> funcDecl.getSymbol();

            var getterSymbol = accessorSymbol.getGetter();
            var getterTypeSymbol = <PullTypeSymbol>getterSymbol.type;

            var signature: PullSignatureSymbol = getterTypeSymbol.getCallSignatures()[0];

            var hadError = false;

            if (signature) {
                if (signature.isResolved) {
                    return getterSymbol;
                }

                if (signature.inResolution) {
                    // PULLTODO: Error or warning?
                    signature.returnType = this.semanticInfoChain.anyTypeSymbol;
                    signature.setResolved();

                    return getterSymbol;
                }

                signature.startResolving();

                // resolve the return type annotation
                if (returnTypeAnnotation) {
                    var returnTypeSymbol = this.resolveReturnTypeAnnotationOfFunctionDeclaration(funcDeclAST, returnTypeAnnotation, context);

                    if (!returnTypeSymbol) {
                        signature.returnType = this.getNewErrorTypeSymbol();

                        hadError = true;
                    }
                    else {
                        signature.returnType = returnTypeSymbol;
                    }
                }

                // if there's no return-type annotation
                //     - if it's a definition signature, set the return type to 'any'
                //     - if it's not a definition sigature, take the best common type of all return expressions
                else {
                    // SPEC: October 1, 2013 section 4.5 -
                    // • If only one accessor includes a type annotation, the other behaves as if it had the same type annotation.
                    // -- Use setterAnnotatedType if available
                    // • If neither accessor includes a type annotation, the inferred return type of the get accessor becomes the parameter type of the set accessor.
                    if (!setterAnnotatedType) {
                        this.resolveFunctionBodyReturnTypes(funcDeclAST, block, /*bodyExpression:*/ null, signature, false, funcDecl, context);
                    }
                    else {
                        signature.returnType = setterAnnotatedType;
                    }
                }

                if (!hadError) {
                    signature.setResolved();
                }
            }

            return getterSymbol;
        }

        private checkIfGetterAndSetterTypeMatch(funcDeclAST: AST, context: PullTypeResolutionContext) {
            var funcDecl = this.semanticInfoChain.getDeclForAST(funcDeclAST);
            var accessorSymbol = <PullAccessorSymbol> funcDecl.getSymbol();
            var getter = accessorSymbol.getGetter();
            var setter = accessorSymbol.getSetter();

            if (getter && setter) {
                var getterAST = <GetAccessor>getter.getDeclarations()[0].ast();
                var setterAST = <SetAccessor>setter.getDeclarations()[0].ast();

                // There exists: 
                //     return type annotaion for the getter &&
                //     parameter type annotation for the setter
                if (getterAST.typeAnnotation && PullTypeResolver.hasSetAccessorParameterTypeAnnotation(setterAST)) {
                    var setterSig = setter.type.getCallSignatures()[0];
                    var setterParameters = setterSig.parameters;

                    var getter = accessorSymbol.getGetter();
                    var getterSig = getter.type.getCallSignatures()[0];

                    var setterSuppliedTypeSymbol: PullTypeSymbol = setterParameters[0].type;
                    var getterSuppliedTypeSymbol: PullTypeSymbol = getterSig.returnType;
                    // Report errors if type do not match
                    if (!this.typesAreIdentical(setterSuppliedTypeSymbol, getterSuppliedTypeSymbol)) {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDeclAST, DiagnosticCode.get_and_set_accessor_must_have_the_same_type));
                    }
                }
            }
        }

        private typeCheckGetAccessorDeclaration(
            funcDeclAST: GetAccessor, context: PullTypeResolutionContext) {
            // Accessors are handled only by resolve/typeCheckAccessorDeclaration, 
            // hence the resolve/typeCheckGetAccessorDeclaration is helper and need not set setTypeChecked flag
            var funcDecl = this.semanticInfoChain.getDeclForAST(funcDeclAST);
            var accessorSymbol = <PullAccessorSymbol> funcDecl.getSymbol();

            this.resolveReturnTypeAnnotationOfFunctionDeclaration(funcDeclAST, getType(funcDeclAST), context);

            this.resolveAST(funcDeclAST.block, /*isContextuallyTyped*/ false, context);

            this.validateVariableDeclarationGroups(funcDecl, context);

            var enclosingDecl = this.getEnclosingDecl(funcDecl);

            var hasReturn = (funcDecl.flags & (PullElementFlags.Signature | PullElementFlags.HasReturnStatement)) != 0;
            var funcNameAST = funcDeclAST.propertyName;

            // If there is no return statement report error: 
            //      signature is doesnt have the return statement flag &&
            //      accessor body has atleast one statement and it isnt throw statement
            if (!hasReturn &&
                !(funcDeclAST.block.statements.childCount() > 0 && funcDeclAST.block.statements.childAt(0).nodeType() === SyntaxKind.ThrowStatement)) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcNameAST, DiagnosticCode.Getters_must_return_a_value));
            }

            // Setter with return value is checked in typeCheckReturnExpression

            var setter = accessorSymbol.getSetter();
            if (setter) {
                var setterDecl = setter.getDeclarations()[0];
                var setterIsPrivate = hasFlag(setterDecl.flags, PullElementFlags.Private);
                var getterIsPrivate = hasModifier(funcDeclAST.modifiers, PullElementFlags.Private);

                if (getterIsPrivate != setterIsPrivate) {
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcNameAST, DiagnosticCode.Getter_and_setter_accessors_do_not_agree_in_visibility));
                }

                this.checkIfGetterAndSetterTypeMatch(funcDeclAST, context);
            }

            this.checkFunctionTypePrivacy(
                funcDeclAST, hasModifier(funcDeclAST.modifiers, PullElementFlags.Static), /*typeParameters:*/null,
                Parameters.fromParameterList(funcDeclAST.parameterList), getType(funcDeclAST), funcDeclAST.block, context);
        }

        static hasSetAccessorParameterTypeAnnotation(setAccessor: SetAccessor) {
            return setAccessor.parameterList && setAccessor.parameterList.parameters.nonSeparatorCount() > 0 && (<Parameter>setAccessor.parameterList.parameters.nonSeparatorAt(0)).typeAnnotation != null;
        }

        private resolveSetAccessorDeclaration(funcDeclAST: AST, parameterList: ParameterList, context: PullTypeResolutionContext): PullSymbol {
            var funcDecl = this.semanticInfoChain.getDeclForAST(funcDeclAST);
            var accessorSymbol = <PullAccessorSymbol> funcDecl.getSymbol();

            var setterSymbol = accessorSymbol.getSetter();
            var setterTypeSymbol = <PullTypeSymbol>setterSymbol.type;

            var signature: PullSignatureSymbol = funcDecl.getSignatureSymbol();

            var hadError = false;

            if (signature) {

                if (signature.isResolved) {
                    return setterSymbol;
                    }

                if (signature.inResolution) {
                    // PULLTODO: Error or warning?
                    signature.returnType = this.semanticInfoChain.voidTypeSymbol;
                    signature.setResolved();
                    return setterSymbol;
                    }

                signature.startResolving();

                // resolve parameter type annotations as necessary
                if (parameterList) {
                    for (var i = 0; i < parameterList.parameters.nonSeparatorCount(); i++) {
                        this.resolveParameter(<Parameter>parameterList.parameters.nonSeparatorAt(i), context);
                    }
                }

                // SPEC: October 1, 2013 section 4.5 -
                // • A set accessor declaration is processed in the same manner as an ordinary function declaration
                //      with a single parameter and a Void return type. 
                signature.returnType = this.semanticInfoChain.voidTypeSymbol;

                if (signature.hasAGenericParameter) {
                    setterTypeSymbol.setHasGenericSignature();
                }

                if (!hadError) {
                    signature.setResolved();
                }
            }

            return setterSymbol;
        }

        private typeCheckSetAccessorDeclaration(funcDeclAST: SetAccessor, context: PullTypeResolutionContext) {
            // Accessors are handled only by resolve/typeCheckAccessorDeclaration, 
            // hence the resolve/typeCheckSetAccessorDeclaration is helper and need not set setTypeChecked flag

            var funcDecl = this.semanticInfoChain.getDeclForAST(funcDeclAST);
            var accessorSymbol = <PullAccessorSymbol> funcDecl.getSymbol();

            if (funcDeclAST.parameterList) {
                for (var i = 0; i < funcDeclAST.parameterList.parameters.nonSeparatorCount(); i++) {
                    this.resolveParameter(<Parameter>funcDeclAST.parameterList.parameters.nonSeparatorAt(i), context);
                }
            }

            this.resolveAST(funcDeclAST.block, false, context);

            this.validateVariableDeclarationGroups(funcDecl, context);

            var hasReturn = (funcDecl.flags & (PullElementFlags.Signature | PullElementFlags.HasReturnStatement)) != 0;

            var getter = accessorSymbol.getGetter();

            var funcNameAST = funcDeclAST.propertyName;

            // Setter with return value is checked in typeCheckReturnExpression

            if (getter) {
                var getterDecl = getter.getDeclarations()[0];
                var getterIsPrivate = hasFlag(getterDecl.flags, PullElementFlags.Private);
                var setterIsPrivate = hasModifier(funcDeclAST.modifiers, PullElementFlags.Private);

                if (getterIsPrivate != setterIsPrivate) {
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcNameAST, DiagnosticCode.Getter_and_setter_accessors_do_not_agree_in_visibility));
                }

                this.checkIfGetterAndSetterTypeMatch(funcDeclAST, context);
            } else {
                // There is no getter specified
                // Only report noImplicitAny error message on setter if there is no getter
                // if the noImplicitAny flag is set to be true, report an error
                if (this.compilationSettings.noImplicitAny()) {
                    // if setter has an any type, it must be implicit any
                    var setterFunctionDeclarationAst = <SetAccessor>funcDeclAST;
                    if (!PullTypeResolver.hasSetAccessorParameterTypeAnnotation(setterFunctionDeclarationAst) && accessorSymbol.type == this.semanticInfoChain.anyTypeSymbol) {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDeclAST,
                            DiagnosticCode._0_which_lacks_get_accessor_and_parameter_type_annotation_on_set_accessor_implicitly_has_an_any_type, [setterFunctionDeclarationAst.propertyName.text()]));
                    }
                }
            }

            this.checkFunctionTypePrivacy(
                funcDeclAST, hasModifier(funcDeclAST.modifiers, PullElementFlags.Static), null,
                Parameters.fromParameterList(funcDeclAST.parameterList), null, funcDeclAST.block, context);
        }

        private resolveList(list: ASTList, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(list, context)) {
                this.setTypeChecked(list, context);

                // Visit members   
                for (var i = 0, n = list.childCount(); i < n; i++) {
                    this.resolveAST(list.childAt(i), /*isContextuallyTyped*/ false, context);
                }
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private resolveSeparatedList(list: ASTSeparatedList, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(list, context)) {
                this.setTypeChecked(list, context);

                // Visit members   
                for (var i = 0, n = list.nonSeparatorCount(); i < n; i++) {
                    this.resolveAST(list.nonSeparatorAt(i), /*isContextuallyTyped*/ false, context);
                }
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private resolveVoidExpression(ast: VoidExpression, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.setTypeChecked(ast, context);

                this.resolveAST(ast.expression, /*isContextuallyTyped:*/ false, context);
            }

            // September 17, 2013: The void operator takes an operand of any type and produces the 
            // value undefined.The type of the result is the Undefined type(3.2.6).
            return this.semanticInfoChain.undefinedTypeSymbol;
        }

        private resolveLogicalOperation(ast: BinaryExpression, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckLogicalOperation(ast, context);
            }

            // September 17, 2013: The result is always of the Boolean primitive type.
            return this.semanticInfoChain.booleanTypeSymbol;
        }

        private typeCheckLogicalOperation(binex: BinaryExpression, context: PullTypeResolutionContext) {
            this.setTypeChecked(binex, context);

            var leftType = this.resolveAST(binex.left, /*isContextuallyTyped:*/ false, context).type;
            var rightType = this.resolveAST(binex.right, /*isContextuallyTyped:*/ false, context).type;

            // September 17, 2013: 
            // The <, >, <=, >=, ==, !=, ===, and !== operators
            // These operators require one operand type to be identical to or a subtype of the 
            // other operand type. 
            var comparisonInfo = new TypeComparisonInfo();
            if (!this.sourceIsAssignableToTarget(leftType, rightType, context, comparisonInfo) &&
                !this.sourceIsAssignableToTarget(rightType, leftType, context, comparisonInfo)) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(binex,
                    DiagnosticCode.Operator_0_cannot_be_applied_to_types_1_and_2,
                    [SyntaxFacts.getText(SyntaxFacts.getOperatorTokenFromBinaryExpression(binex.nodeType())),
                        leftType.toString(), rightType.toString()]));
            }
        }

        private resolveLogicalNotExpression(ast: PrefixUnaryExpression, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.setTypeChecked(ast, context);

                this.resolveAST(ast.operand, false, context);
            }

            // September 17, 2013: The ! operator permits its operand to be of any type and 
            // produces a result of the Boolean primitive type.
            return this.semanticInfoChain.booleanTypeSymbol;
        }

        private resolveUnaryArithmeticOperation(ast: PrefixUnaryExpression, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckUnaryArithmeticOperation(ast, context);
            }

            // September 17, 2013:
            // The ++ and-- operators ... produce a result of the Number primitive type.
            // The +, –, and ~ operators ... produce a result of the Number primitive type.
            return this.semanticInfoChain.numberTypeSymbol;
        }

        private resolvePostfixUnaryExpression(ast: PostfixUnaryExpression, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckPostfixUnaryExpression(ast, context);
            }

            // September 17, 2013:
            // The ++ and-- operators ... produce a result of the Number primitive type.
            // The +, –, and ~ operators ... produce a result of the Number primitive type.
            return this.semanticInfoChain.numberTypeSymbol;
        }

        private isAnyOrNumberOrEnum(type: PullTypeSymbol): boolean {
            return this.isAnyOrEquivalent(type) || type === this.semanticInfoChain.numberTypeSymbol || PullHelpers.symbolIsEnum(type);
        }

        private typeCheckUnaryArithmeticOperation(unaryExpression: PrefixUnaryExpression, context: PullTypeResolutionContext): void {
            this.setTypeChecked(unaryExpression, context);

            var nodeType = unaryExpression.nodeType();
            var expression = this.resolveAST(unaryExpression.operand, /*isContextuallyTyped:*/ false, context);

            // September 17, 2013: The +, –, and ~ operators
            // These operators permit their operand to be of any type and produce a result of the 
            // Number primitive type.
            if (nodeType == SyntaxKind.PlusExpression || nodeType == SyntaxKind.NegateExpression || nodeType == SyntaxKind.BitwiseNotExpression) {
                return;
            }

            Debug.assert(
                nodeType === SyntaxKind.PreIncrementExpression ||
                nodeType === SyntaxKind.PreDecrementExpression);

            // September 17, 2013: 4.14.1	The ++ and -- operators
            // These operators, in prefix or postfix form, require their operand to be of type Any,
            // the Number primitive type, or an enum type, and classified as a reference(section 4.1).
            var operandType = expression.type;
            if (!this.isAnyOrNumberOrEnum(operandType)) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(unaryExpression.operand, DiagnosticCode.The_type_of_a_unary_arithmetic_operation_operand_must_be_of_type_any_number_or_an_enum_type));
            }

            // September 17, ... and classified as a reference(section 4.1).
            if (!this.isReference(unaryExpression.operand, expression)) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(unaryExpression.operand, DiagnosticCode.The_operand_of_an_increment_or_decrement_operator_must_be_a_variable_property_or_indexer));
            }
        }

        private typeCheckPostfixUnaryExpression(unaryExpression: PostfixUnaryExpression, context: PullTypeResolutionContext): void {
            this.setTypeChecked(unaryExpression, context);

            var nodeType = unaryExpression.nodeType();
            var expression = this.resolveAST(unaryExpression.operand, /*isContextuallyTyped:*/ false, context);

            Debug.assert(
                nodeType === SyntaxKind.PostIncrementExpression ||
                nodeType === SyntaxKind.PostDecrementExpression);

            // September 17, 2013: 4.14.1	The ++ and -- operators
            // These operators, in prefix or postfix form, require their operand to be of type Any,
            // the Number primitive type, or an enum type, and classified as a reference(section 4.1).
            var operandType = expression.type;
            if (!this.isAnyOrNumberOrEnum(operandType)) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(unaryExpression.operand, DiagnosticCode.The_type_of_a_unary_arithmetic_operation_operand_must_be_of_type_any_number_or_an_enum_type));
            }

            // September 17, ... and classified as a reference(section 4.1).
            if (!this.isReference(unaryExpression.operand, expression)) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(unaryExpression.operand, DiagnosticCode.The_operand_of_an_increment_or_decrement_operator_must_be_a_variable_property_or_indexer));
            }
        }

        private resolveBinaryArithmeticExpression(binaryExpression: BinaryExpression, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(binaryExpression, context)) {
                this.typeCheckBinaryArithmeticExpression(binaryExpression, context);
            }

            // September 17, 2013: The result is always of the Number primitive type.
            return this.semanticInfoChain.numberTypeSymbol;
        }

        private typeCheckBinaryArithmeticExpression(binaryExpression: BinaryExpression, context: PullTypeResolutionContext) {
            this.setTypeChecked(binaryExpression, context);

            var lhsSymbol = this.resolveAST(binaryExpression.left, /*isContextuallyTyped:*/ false, context);

            var lhsType = lhsSymbol.type;
            var rhsType = this.resolveAST(binaryExpression.right, /*isContextuallyTyped:*/false, context).type;

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
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(binaryExpression.right, DiagnosticCode.The_right_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_or_an_enum_type));
            }

            if (!lhsIsFit) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(binaryExpression.left, DiagnosticCode.The_left_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_or_an_enum_type));
            }

            if (lhsIsFit && rhsIsFit) {
                switch (binaryExpression.nodeType()) {
                    case SyntaxKind.LeftShiftAssignmentExpression:
                    case SyntaxKind.SignedRightShiftAssignmentExpression:
                    case SyntaxKind.UnsignedRightShiftAssignmentExpression:
                    case SyntaxKind.SubtractAssignmentExpression:
                    case SyntaxKind.MultiplyAssignmentExpression:
                    case SyntaxKind.DivideAssignmentExpression:
                    case SyntaxKind.ModuloAssignmentExpression:
                    case SyntaxKind.OrAssignmentExpression:
                    case SyntaxKind.AndAssignmentExpression:
                    case SyntaxKind.ExclusiveOrAssignmentExpression:
                        // Check if LHS is a valid target
                        if (!this.isReference(binaryExpression.left, lhsSymbol)) {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(binaryExpression.left, DiagnosticCode.Invalid_left_hand_side_of_assignment_expression));
                        }

                        this.checkAssignability(binaryExpression.left, rhsType, lhsType, context);
                }
            }
        }

        private resolveTypeOfExpression(ast: TypeOfExpression, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.setTypeChecked(ast, context);

                this.resolveAST(ast.expression, /*isContextuallyTyped*/ false, context);
            }

            // September 17, 2013: The typeof operator takes an operand of any type and produces 
            // a value of the String primitive type
            return this.semanticInfoChain.stringTypeSymbol;
        }

        private resolveThrowStatement(ast: ThrowStatement, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.setTypeChecked(ast, context);

                this.resolveAST(ast.expression, /*isContextuallyTyped:*/ false, context);
            }

            // All statements have the 'void' type.
            return this.semanticInfoChain.voidTypeSymbol;
        }

        private resolveDeleteExpression(ast: DeleteExpression, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.setTypeChecked(ast, context);
                this.resolveAST(ast.expression, false, context);
            }

            // September 17, 2013: The delete operator takes an operand of any type and produces a
            // result of the Boolean primitive type.
            return this.semanticInfoChain.booleanTypeSymbol;
        }

        private resolveInstanceOfExpression(ast: BinaryExpression, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckInstanceOfExpression(ast, context);
            }

            // September 17, 2013: The result is always of the Boolean primitive type.
            return this.semanticInfoChain.booleanTypeSymbol;
        }

        private typeCheckInstanceOfExpression(binaryExpression: BinaryExpression, context: PullTypeResolutionContext) {
            this.setTypeChecked(binaryExpression, context);

            // September 17, 2013: The instanceof operator requires the left operand to be of type 
            // Any, an object type, or a type parameter type, and the right operand to be of type 
            // Any or a subtype of the ‘Function’ interface type. 
            var lhsType = this.resolveAST(binaryExpression.left, false, context).type;
            var rhsType = this.resolveAST(binaryExpression.right, false, context).type;

            var isValidLHS = this.isAnyOrEquivalent(lhsType) || lhsType.isObject() || lhsType.isTypeParameter();
            var isValidRHS = this.isAnyOrEquivalent(rhsType) || this.typeIsSubtypeOfFunction(rhsType, context);

            if (!isValidLHS) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(binaryExpression.left, DiagnosticCode.The_left_hand_side_of_an_instanceof_expression_must_be_of_type_any_an_object_type_or_a_type_parameter));
            }

            if (!isValidRHS) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(binaryExpression.right, DiagnosticCode.The_right_hand_side_of_an_instanceof_expression_must_be_of_type_any_or_a_subtype_of_the_Function_interface_type));
            }
        }

        private resolveCommaExpression(commaExpression: BinaryExpression, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(commaExpression, context)) {
                this.setTypeChecked(commaExpression, context);

                this.resolveAST(commaExpression.left, /*isContextuallyTyped:*/ false, context);
            }

            var rhsType = this.resolveAST(commaExpression.right, /*isContextuallyTyped:*/ false, context).type;

            // September 17, 2013: The comma operator permits the operands to be of any type and
            // produces a result that is of the same type as the second operand.
            return this.resolveAST(commaExpression.right, /*isContextuallyTyped:*/ false, context).type;
        }

        private resolveInExpression(ast: BinaryExpression, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckInExpression(ast, context);
            }

            // October 11, 2013: 
            // The in operator requires the left operand to be of type Any, the String primitive 
            // type, or the Number primitive type, and the right operand to be of type Any, an 
            // object type, or a type parameter type. 
            //
            // The result is always of the Boolean primitive type.
            return this.semanticInfoChain.booleanTypeSymbol;
        }

        private typeCheckInExpression(binaryExpression: BinaryExpression, context: PullTypeResolutionContext) {
            this.setTypeChecked(binaryExpression, context);
            
            // October 11, 2013: 
            // The in operator requires the left operand to be of type Any, the String primitive 
            // type, or the Number primitive type, and the right operand to be of type Any, an 
            // object type, or a type parameter type. 
            var lhsType = this.resolveAST(binaryExpression.left, /*isContextuallyTyped:*/ false, context).type;
            var rhsType = this.resolveAST(binaryExpression.right, /*isContextuallyTyped:*/ false, context).type;

            var isValidLHS =
                this.isAnyOrEquivalent(lhsType.type) ||
                lhsType.type === this.semanticInfoChain.stringTypeSymbol ||
                lhsType.type === this.semanticInfoChain.numberTypeSymbol;

            var isValidRHS = this.isAnyOrEquivalent(rhsType) || rhsType.isObject() || rhsType.isTypeParameter();

            if (!isValidLHS) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(binaryExpression.left, DiagnosticCode.The_left_hand_side_of_an_in_expression_must_be_of_types_any_string_or_number));
            }

            if (!isValidRHS) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(binaryExpression.left, DiagnosticCode.The_right_hand_side_of_an_in_expression_must_be_of_type_any_an_object_type_or_a_type_parameter));
            }
        }

        private resolveForStatement(ast: ForStatement, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.setTypeChecked(ast, context);

                this.resolveAST(ast.variableDeclaration, /*isContextuallyTyped:*/ false, context);
                this.resolveAST(ast.initializer, /*isContextuallyTyped:*/ false, context);
                this.resolveAST(ast.condition, /*isContextuallyTyped:*/ false, context);
                this.resolveAST(ast.incrementor, /*isContextuallyTyped:*/ false, context);
                this.resolveAST(ast.statement, /*isContextuallyTyped:*/ false, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private resolveForInStatement(forInStatement: ForInStatement, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(forInStatement, context)) {
                this.typeCheckForInStatement(forInStatement, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckForInStatement(forInStatement: ForInStatement, context: PullTypeResolutionContext) {
            this.setTypeChecked(forInStatement, context);

            var rhsType = this.resolveAST(forInStatement.expression, /*isContextuallyTyped*/ false, context).type;
            var lval = forInStatement.variableDeclaration || forInStatement.left;

            var varSym = this.resolveAST(lval, /*isContextuallyTyped*/ false, context);

            if (forInStatement.variableDeclaration) {
                var declaration = <VariableDeclaration>forInStatement.variableDeclaration;
                var varDecl = <VariableDeclarator>declaration.declarators.nonSeparatorAt(0);

                if (varDecl.typeAnnotation) {
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(lval, DiagnosticCode.Variable_declarations_of_a_for_statement_cannot_use_a_type_annotation));
                }

                var varSym = this.getSymbolForAST(varDecl, context);
            }

            var isStringOrNumber = varSym.type === this.semanticInfoChain.stringTypeSymbol || this.isAnyOrEquivalent(varSym.type);

            var isValidRHS = rhsType && (this.isAnyOrEquivalent(rhsType) || !rhsType.isPrimitive());

            if (!isStringOrNumber) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(lval, DiagnosticCode.Variable_declarations_of_a_for_statement_must_be_of_types_string_or_any));
            }

            if (!isValidRHS) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(forInStatement.expression, DiagnosticCode.The_right_hand_side_of_a_for_in_statement_must_be_of_type_any_an_object_type_or_a_type_parameter));
            }

            this.resolveAST(forInStatement.statement, false, context);
        }

        private resolveWhileStatement(ast: WhileStatement, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckWhileStatement(ast, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckWhileStatement(ast: WhileStatement, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);

            this.resolveAST(ast.condition, /*isContextuallyTyped:*/ false, context);
            this.resolveAST(ast.statement, /*isContextuallyTyped:*/ false, context);
        }

        private resolveDoStatement(ast: DoStatement, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckDoStatement(ast, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckDoStatement(ast: DoStatement, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);

            this.resolveAST(ast.condition, /*isContextuallyTyped:*/ false, context);
            this.resolveAST(ast.statement, /*isContextuallyTyped:*/ false, context);
        }

        private resolveIfStatement(ast: IfStatement, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckIfStatement(ast, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckIfStatement(ast: IfStatement, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);

            this.resolveAST(ast.condition, /*isContextuallyTyped:*/ false, context);
            this.resolveAST(ast.statement, /*isContextuallyTyped:*/ false, context);
            this.resolveAST(ast.elseClause, /*isContextuallyTyped:*/ false, context);
        }

        private resolveElseClause(ast: ElseClause, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckElseClause(ast, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckElseClause(ast: ElseClause, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);

            this.resolveAST(ast.statement, false, context);
        }

        private resolveBlock(ast: Block, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.setTypeChecked(ast, context);
                this.resolveAST(ast.statements, /*isContextuallyTyped*/ false, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private resolveVariableStatement(ast: VariableStatement, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.setTypeChecked(ast, context);
                this.resolveAST(ast.declaration, /*isContextuallyTyped*/ false, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private resolveVariableDeclarationList(ast: VariableDeclaration, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.setTypeChecked(ast, context);
                this.resolveAST(ast.declarators, false, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private resolveWithStatement(ast: WithStatement, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckWithStatement(ast, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckWithStatement(ast: WithStatement, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);
            var withStatement = <WithStatement>ast;
            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(withStatement.condition, DiagnosticCode.All_symbols_within_a_with_block_will_be_resolved_to_any));
        }

        private resolveTryStatement(ast: AST, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckTryStatement(ast, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckTryStatement(ast: AST, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);
            var tryStatement = <TryStatement>ast;

            this.resolveAST(tryStatement.block, false, context);
            this.resolveAST(tryStatement.catchClause, false, context);
            this.resolveAST(tryStatement.finallyClause, false, context);
        }

        private resolveCatchClause(ast: CatchClause, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckCatchClause(ast, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckCatchClause(ast: CatchClause, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);
            this.resolveAST(ast.block, /*isContextuallyTyped*/ false, context);

            var catchDecl = this.semanticInfoChain.getDeclForAST(ast);
            this.validateVariableDeclarationGroups(catchDecl, context);
        }

        private resolveFinallyClause(ast: FinallyClause, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckFinallyClause(ast, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckFinallyClause(ast: FinallyClause, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);
            this.resolveAST(ast.block, /*isContextuallyTyped*/ false, context);
        }

        private getEnclosingFunctionDeclaration(ast: AST): PullDecl {
            var enclosingDecl = this.getEnclosingDeclForAST(ast);

            while (enclosingDecl) {
                if (enclosingDecl.kind & PullElementKind.SomeFunction) {
                    return enclosingDecl;
                }

                enclosingDecl = enclosingDecl.getParentDecl();
            }

            return null;
        }

        private resolveReturnExpression(expression: AST, enclosingFunction: PullDecl, context: PullTypeResolutionContext): PullTypeSymbol {
            if (enclosingFunction) {
                enclosingFunction.setFlag(PullElementFlags.HasReturnStatement);
            }

            // push contextual type
            var isContextuallyTyped = false;

            if (enclosingFunction) {
                var enclosingDeclAST = this.getASTForDecl(enclosingFunction);
                var typeAnnotation = getType(enclosingDeclAST);
                if (typeAnnotation) {
                    // The containing function has a type annotation, propagate it as the contextual type
                    var returnTypeAnnotationSymbol = this.resolveTypeReference(typeAnnotation, context);
                    if (returnTypeAnnotationSymbol) {
                        isContextuallyTyped = true;
                        context.pushContextualType(returnTypeAnnotationSymbol, context.inProvisionalResolution(), null);
                    }
                }
                else {
                    // No type annotation, check if there is a contextual type enforced on the function, and propagate that
                    var currentContextualType = context.getContextualType();
                    if (currentContextualType && currentContextualType.isFunction()) {
                        var currentContextTypeDecls = currentContextualType.getDeclarations();
                        var currentContextualTypeSignatureSymbol = currentContextTypeDecls && currentContextTypeDecls.length > 0
                            ? currentContextTypeDecls[0].getSignatureSymbol()
                            : currentContextualType.getCallSignatures()[0];

                        var currentContextualTypeReturnTypeSymbol = currentContextualTypeSignatureSymbol.returnType;
                        if (currentContextualTypeReturnTypeSymbol) {
                            isContextuallyTyped = true;
                            context.pushContextualType(currentContextualTypeReturnTypeSymbol, context.inProvisionalResolution(), null);
                        }
                    }
                }
            }

            var result = this.resolveAST(expression, isContextuallyTyped, context).type;
            if (isContextuallyTyped) {
                context.popContextualType();
            }

            return result;
        }

        private typeCheckReturnExpression(expression: AST, expressionType: PullTypeSymbol, enclosingFunction: PullDecl, context: PullTypeResolutionContext): void {
            // Return type of constructor signature must be assignable to the instance type of the class.
            if (enclosingFunction && enclosingFunction.kind === PullElementKind.ConstructorMethod) {
                var classDecl = enclosingFunction.getParentDecl();
                if (classDecl) {
                    var classSymbol = classDecl.getSymbol();
                    this.resolveDeclaredSymbol(classSymbol, context);

                    var comparisonInfo = new TypeComparisonInfo();
                    var isAssignable = this.sourceIsAssignableToTarget(expressionType, classSymbol.type, context, comparisonInfo);
                    if (!isAssignable) {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(expression, DiagnosticCode.Return_type_of_constructor_signature_must_be_assignable_to_the_instance_type_of_the_class));
                    }
                }
            }

            if (enclosingFunction && enclosingFunction.kind === PullElementKind.SetAccessor) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(expression, DiagnosticCode.Setters_cannot_return_a_value));
            }

            if (enclosingFunction) {
                var enclosingDeclAST = this.getASTForDecl(enclosingFunction);
                var typeAnnotation = getType(enclosingDeclAST);
                if (typeAnnotation || enclosingFunction.kind === PullElementKind.GetAccessor) {
                    var signatureSymbol = enclosingFunction.getSignatureSymbol();
                    var sigReturnType = signatureSymbol.returnType;

                    if (expressionType && sigReturnType) {
                        var comparisonInfo = new TypeComparisonInfo();
                        var upperBound: PullTypeSymbol = null;

                        if (expressionType.isTypeParameter()) {
                            upperBound = (<PullTypeParameterSymbol>expressionType).getConstraint();

                            if (upperBound) {
                                expressionType = upperBound;
                            }
                        }

                        if (sigReturnType.isTypeParameter()) {
                            upperBound = (<PullTypeParameterSymbol>sigReturnType).getConstraint();

                            if (upperBound) {
                                sigReturnType = upperBound;
                            }
                        }

                        this.resolveDeclaredSymbol(expressionType, context);
                        this.resolveDeclaredSymbol(sigReturnType, context);

                        var isAssignable = this.sourceIsAssignableToTarget(expressionType, sigReturnType, context, comparisonInfo);

                        if (!isAssignable) {
                            if (comparisonInfo.message) {
                                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(expression, DiagnosticCode.Cannot_convert_0_to_1_NL_2, [expressionType.toString(), sigReturnType.toString(), comparisonInfo.message]));
                            } else {
                                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(expression, DiagnosticCode.Cannot_convert_0_to_1, [expressionType.toString(), sigReturnType.toString()]));
                            }
                        }
                    }
                }
            }
        }

        private resolveReturnStatement(returnAST: ReturnStatement, context: PullTypeResolutionContext): PullSymbol {
            var enclosingFunction = this.getEnclosingFunctionDeclaration(returnAST);
            if (enclosingFunction) {
                enclosingFunction.setFlag(PullElementFlags.HasReturnStatement);
            }

            var returnType = <PullTypeSymbol>this.getSymbolForAST(returnAST, context);
            var canTypeCheckAST = this.canTypeCheckAST(returnAST, context);
            if (!returnType || canTypeCheckAST) {
                var returnExpr = returnAST.expression;

                var resolvedReturnType = returnExpr === null
                    ? this.semanticInfoChain.voidTypeSymbol
                    : this.resolveReturnExpression(returnExpr, enclosingFunction, context);

                if (!returnType) {
                    returnType = resolvedReturnType;
                    this.setSymbolForAST(returnAST, resolvedReturnType, context);
                }

                if (returnExpr && canTypeCheckAST) {
                    this.setTypeChecked(returnExpr, context);
                    this.typeCheckReturnExpression(returnExpr, resolvedReturnType, enclosingFunction, context);
                }
            }

            return returnType;
        }

        private resolveSwitchStatement(ast: SwitchStatement, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckSwitchStatement(ast, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckSwitchStatement(ast: SwitchStatement, context: PullTypeResolutionContext) {
            this.setTypeChecked(ast, context);

            var expressionType = this.resolveAST(ast.expression, false, context).type;

            for (var i = 0, n = ast.switchClauses.childCount(); i < n; i++) {
                var switchClause = ast.switchClauses.childAt(i);
                if (switchClause.nodeType() === SyntaxKind.CaseSwitchClause) {
                    var caseSwitchClause = <CaseSwitchClause>switchClause;

                    var caseClauseExpressionType = this.resolveAST(caseSwitchClause.expression, /*isContextuallyTyped:*/ false, context).type;
                    this.resolveAST(caseSwitchClause.statements, /*isContextuallyTyped:*/ false, context);

                    var comparisonInfo = new TypeComparisonInfo();
                    if (!this.sourceIsAssignableToTarget(expressionType, caseClauseExpressionType, context, comparisonInfo) &&
                        !this.sourceIsAssignableToTarget(caseClauseExpressionType, expressionType, context, comparisonInfo)) {
                        if (comparisonInfo.message) {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(caseSwitchClause.expression,
                                DiagnosticCode.Cannot_convert_0_to_1_NL_2, [caseClauseExpressionType.toString(), expressionType.toString(), comparisonInfo.message]));
                        }
                        else {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(caseSwitchClause.expression,
                                DiagnosticCode.Cannot_convert_0_to_1, [caseClauseExpressionType.toString(), expressionType.toString()]));
                        }
                    }
                }
                else {
                    var defaultSwitchClause = <DefaultSwitchClause>switchClause;
                    this.resolveAST(defaultSwitchClause.statements, /*isContextuallyTyped:*/ false, context);
                }
            }
        }

        private resolveLabeledStatement(ast: LabeledStatement, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckLabeledStatement(ast, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckLabeledStatement(ast: LabeledStatement, context: PullTypeResolutionContext): void {
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
            var labelIdentifier = ast.identifier.valueText();

            var breakableLabels = this.getEnclosingLabels(ast, /*breakable:*/ true, /*crossFunctions:*/ false);

            // It is invalid to have a label enclosed in a label of the same name.
            if (ArrayUtilities.contains(breakableLabels, labelIdentifier)) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(ast.identifier,
                    DiagnosticCode.Duplicate_identifier_0, [labelIdentifier]));
            }

            this.resolveAST(ast.statement, /*isContextuallyTyped*/ false, context);
        }

        private labelIsOnContinuableConstruct(statement: AST): boolean {
            switch (statement.nodeType()) {
                case SyntaxKind.LabeledStatement:
                    // Labels work transitively.  i.e. if you have:
                    //      foo:
                    //      bar:
                    //      while(...)
                    //
                    // Then both 'foo' and 'bar' are in the label set for 'while' and are thus
                    // continuable.
                    return this.labelIsOnContinuableConstruct((<LabeledStatement>statement).statement);

                case SyntaxKind.WhileStatement:
                case SyntaxKind.ForStatement:
                case SyntaxKind.ForInStatement:
                case SyntaxKind.DoStatement:
                    return true;

                default:
                    return false;
            }
        }

        private resolveContinueStatement(ast: ContinueStatement, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckContinueStatement(ast, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private isIterationStatement(ast: AST): boolean {
            switch (ast.nodeType()) {
                case SyntaxKind.ForStatement:
                case SyntaxKind.ForInStatement:
                case SyntaxKind.WhileStatement:
                case SyntaxKind.DoStatement:
                    return true;
            }

            return false;
        }

        private isAnyFunctionExpressionOrDeclaration(ast: AST): boolean {
            switch (ast.nodeType()) {
                case SyntaxKind.SimpleArrowFunctionExpression:
                case SyntaxKind.ParenthesizedArrowFunctionExpression:
                case SyntaxKind.FunctionExpression:
                case SyntaxKind.FunctionDeclaration:
                case SyntaxKind.MemberFunctionDeclaration:
                case SyntaxKind.FunctionPropertyAssignment:
                case SyntaxKind.ConstructorDeclaration:
                case SyntaxKind.GetAccessor:
                case SyntaxKind.SetAccessor:
                    return true;
            }

            return false;
        }

        private inSwitchStatement(ast: AST): boolean {
            while (ast) {
                if (ast.nodeType() === SyntaxKind.SwitchStatement) {
                    return true;
                }

                if (this.isAnyFunctionExpressionOrDeclaration(ast)) {
                    return false;
                }

                ast = ast.parent;
            }

            return false;
        }

        private inIterationStatement(ast: AST): boolean {
            while (ast) {
                if (this.isIterationStatement(ast)) {
                    return true;
                }

                if (this.isAnyFunctionExpressionOrDeclaration(ast)) {
                    return false;
                }

                ast = ast.parent;
            }

            return false;
        }

        private getEnclosingLabels(ast: AST, breakable: boolean, crossFunctions: boolean): string[] {
            var result: string[] = [];

            ast = ast.parent;
            while (ast) {
                if (ast.nodeType() === SyntaxKind.LabeledStatement) {
                    var labeledStatement = <LabeledStatement>ast;
                    if (breakable) {
                        // Breakable labels can be placed on any construct
                        result.push(labeledStatement.identifier.valueText());
                    }
                    else {
                        // They're asking for continuable labels.  Continuable labels must be on
                        // a loop construct.
                        if (this.labelIsOnContinuableConstruct(labeledStatement.statement)) {
                            result.push(labeledStatement.identifier.valueText());
                        }
                    }
                }

                if (!crossFunctions && this.isAnyFunctionExpressionOrDeclaration(ast)) {
                    break;
                }

                ast = ast.parent;
            }

            return result;
        }

        private typeCheckContinueStatement(ast: ContinueStatement, context: PullTypeResolutionContext): void {
            this.setTypeChecked(ast, context);

            if (!this.inIterationStatement(ast)) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(ast,
                    DiagnosticCode.continue_statement_can_only_be_used_within_an_enclosing_iteration_statement));
            }
            else if (ast.identifier) {
                var continuableLabels = this.getEnclosingLabels(ast, /*breakable:*/ false, /*crossFunctions:*/ false);

                if (!ArrayUtilities.contains(continuableLabels, ast.identifier.valueText())) {
                    // The target of the continue statement wasn't to a reachable label.
                    //
                    // Let hte user know, with a specialized message if the target was to an
                    // unreachable label (as opposed to a non-existed label)
                    var continuableLabels = this.getEnclosingLabels(ast, /*breakable:*/ false, /*crossFunctions:*/ true);

                    if (ArrayUtilities.contains(continuableLabels, ast.identifier.valueText())) {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(ast,
                            DiagnosticCode.Jump_target_cannot_cross_function_boundary));
                    }
                    else {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(ast,
                            DiagnosticCode.Jump_target_not_found));
                    }
                }
            }
        }

        private resolveBreakStatement(ast: BreakStatement, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckBreakStatement(ast, context);
            }

            return this.semanticInfoChain.voidTypeSymbol;
        }

        private typeCheckBreakStatement(ast: BreakStatement, context: PullTypeResolutionContext): void {
            this.setTypeChecked(ast, context);

            // Note: the order here is important.  If the 'break' has a target, then it can jump to
            // any enclosing laballed statment.  If it has no target, it must be in an iteration or
            // swtich statement.
            if (ast.identifier) {
                var breakableLabels = this.getEnclosingLabels(ast, /*breakable:*/ true, /*crossFunctions:*/ false);

                if (!ArrayUtilities.contains(breakableLabels, ast.identifier.valueText())) {
                    // The target of the continue statement wasn't to a reachable label.
                    //
                    // Let hte user know, with a specialized message if the target was to an
                    // unreachable label (as opposed to a non-existed label)
                    var breakableLabels = this.getEnclosingLabels(ast, /*breakable:*/ true, /*crossFunctions:*/ true);
                    if (ArrayUtilities.contains(breakableLabels, ast.identifier.valueText())) {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(ast,
                            DiagnosticCode.Jump_target_cannot_cross_function_boundary));
                    }
                    else {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(ast,
                            DiagnosticCode.Jump_target_not_found));
                    }
                }
            }
            else if (!this.inIterationStatement(ast) && !this.inSwitchStatement(ast)) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(ast,
                    DiagnosticCode.break_statement_can_only_be_used_within_an_enclosing_iteration_or_switch_statement));
            }
        }

        // Expression resolution

        public resolveAST(ast: AST, isContextuallyTyped: boolean, context: PullTypeResolutionContext): PullSymbol {
            if (!ast) {
                return;
            }

            var symbol = this.getSymbolForAST(ast, context);
            if (symbol && symbol.isResolved) {
                this.typeCheckAST(ast, isContextuallyTyped, context);
                return symbol;
            }

            var nodeType = ast.nodeType();

            switch (nodeType) {
                case SyntaxKind.ArrayType:
                case SyntaxKind.GenericType:
                case SyntaxKind.ObjectType:
                case SyntaxKind.TypeQuery:
                case SyntaxKind.ConstructorType:
                case SyntaxKind.FunctionType:
                    return this.resolveTypeReference(ast, context);

                case SyntaxKind.List:
                    return this.resolveList(<ASTList>ast, context);

                case SyntaxKind.SeparatedList:
                    return this.resolveSeparatedList(<ASTSeparatedList>ast, context);

                case SyntaxKind.SourceUnit:
                    return this.resolveScript(<Script>ast, context);

                case SyntaxKind.EnumDeclaration:
                    return this.resolveEnumDeclaration(<EnumDeclaration>ast, context);

                case SyntaxKind.ModuleDeclaration:
                    return this.resolveModuleDeclaration(<ModuleDeclaration>ast, context);

                case SyntaxKind.InterfaceDeclaration:
                    return this.resolveInterfaceDeclaration(<InterfaceDeclaration>ast, context);

                case SyntaxKind.ClassDeclaration:
                    return this.resolveClassDeclaration(<ClassDeclaration>ast, context);

                case SyntaxKind.VariableDeclaration:
                    return this.resolveVariableDeclarationList(<VariableDeclaration>ast, context);

                case SyntaxKind.MemberVariableDeclaration:
                    return this.resolveMemberVariableDeclaration(<MemberVariableDeclaration>ast, context);

                case SyntaxKind.VariableDeclarator:
                    return this.resolveVariableDeclarator(<VariableDeclarator>ast, context);

                case SyntaxKind.PropertySignature:
                    return this.resolvePropertySignature(<PropertySignature>ast, context);

                case SyntaxKind.ParameterList:
                    return this.resolveParameterList(<ParameterList>ast, context);

                case SyntaxKind.Parameter:
                    return this.resolveParameter(<Parameter>ast, context);

                case SyntaxKind.EnumElement:
                    return this.resolveEnumElement(<EnumElement>ast, context);

                case SyntaxKind.EqualsValueClause:
                    return this.resolveEqualsValueClause(<EqualsValueClause>ast, isContextuallyTyped, context);

                case SyntaxKind.TypeParameter:
                    return this.resolveTypeParameterDeclaration(<TypeParameter>ast, context);

                case SyntaxKind.Constraint:
                    return this.resolveConstraint(<Constraint>ast, context);

                case SyntaxKind.ImportDeclaration:
                    return this.resolveImportDeclaration(<ImportDeclaration>ast, context);

                case SyntaxKind.ObjectLiteralExpression:
                    return this.resolveObjectLiteralExpression(<ObjectLiteralExpression>ast, isContextuallyTyped, context);

                case SyntaxKind.SimplePropertyAssignment:
                    return this.resolveSimplePropertyAssignment(<SimplePropertyAssignment>ast, isContextuallyTyped, context);

                case SyntaxKind.FunctionPropertyAssignment:
                    return this.resolveFunctionPropertyAssignment(<FunctionPropertyAssignment>ast, isContextuallyTyped, context);

                case SyntaxKind.IdentifierName:
                    if (isTypesOnlyLocation(ast)) {
                        return this.resolveTypeNameExpression(<Identifier>ast, context);
                    }
                    else {
                        return this.resolveNameExpression(<Identifier>ast, context);
                    }

                case SyntaxKind.MemberAccessExpression:
                    return this.resolveMemberAccessExpression(<MemberAccessExpression>ast, context);

                case SyntaxKind.QualifiedName:
                    return this.resolveQualifiedName(<QualifiedName>ast, context);

                case SyntaxKind.ConstructorDeclaration:
                    return this.resolveConstructorDeclaration(<ConstructorDeclaration>ast, context);

                case SyntaxKind.GetAccessor:
                case SyntaxKind.SetAccessor:
                    return this.resolveAccessorDeclaration(ast, context);

                case SyntaxKind.IndexMemberDeclaration:
                    return this.resolveIndexMemberDeclaration(<IndexMemberDeclaration>ast, context);

                case SyntaxKind.IndexSignature:
                    return this.resolveIndexSignature(<IndexSignature>ast, context);

                case SyntaxKind.MemberFunctionDeclaration:
                    return this.resolveMemberFunctionDeclaration(<MemberFunctionDeclaration>ast, context);

                case SyntaxKind.CallSignature:
                    return this.resolveCallSignature(<CallSignature>ast, context);

                case SyntaxKind.ConstructSignature:
                    return this.resolveConstructSignature(<ConstructSignature>ast, context);

                case SyntaxKind.MethodSignature:
                    return this.resolveMethodSignature(<MethodSignature>ast, context);

                case SyntaxKind.FunctionDeclaration:
                    return this.resolveAnyFunctionDeclaration(<FunctionDeclaration>ast, context);

                case SyntaxKind.FunctionExpression:
                    return this.resolveFunctionExpression(<FunctionExpression>ast, isContextuallyTyped, context);

                case SyntaxKind.SimpleArrowFunctionExpression:
                    return this.resolveSimpleArrowFunctionExpression(<SimpleArrowFunctionExpression>ast, isContextuallyTyped, context);

                case SyntaxKind.ParenthesizedArrowFunctionExpression:
                    return this.resolveParenthesizedArrowFunctionExpression(<ParenthesizedArrowFunctionExpression>ast, isContextuallyTyped, context);

                case SyntaxKind.ArrayLiteralExpression:
                    return this.resolveArrayLiteralExpression(<ArrayLiteralExpression>ast, isContextuallyTyped, context);

                case SyntaxKind.ThisKeyword:
                    return this.resolveThisExpression(<ThisExpression>ast, context);

                case SyntaxKind.SuperKeyword:
                    return this.resolveSuperExpression(<SuperExpression>ast, context);

                case SyntaxKind.InvocationExpression:
                    return this.resolveInvocationExpression(<InvocationExpression>ast, context);

                case SyntaxKind.ObjectCreationExpression:
                    return this.resolveObjectCreationExpression(<ObjectCreationExpression>ast, context);

                case SyntaxKind.CastExpression:
                    return this.resolveCastExpression(<CastExpression>ast, context);

                case SyntaxKind.TypeAnnotation:
                    return this.resolveTypeAnnotation(<TypeAnnotation>ast, context);

                case SyntaxKind.ExportAssignment:
                    return this.resolveExportAssignmentStatement(<ExportAssignment>ast, context);

                // primitives
                case SyntaxKind.NumericLiteral:
                    return this.semanticInfoChain.numberTypeSymbol;

                case SyntaxKind.StringLiteral:
                    return this.semanticInfoChain.stringTypeSymbol;

                case SyntaxKind.NullKeyword:
                    return this.semanticInfoChain.nullTypeSymbol;

                case SyntaxKind.TrueKeyword:
                case SyntaxKind.FalseKeyword:
                    return this.semanticInfoChain.booleanTypeSymbol;

                case SyntaxKind.VoidExpression:
                    return this.resolveVoidExpression(<VoidExpression>ast, context);

                // assignment
                case SyntaxKind.AssignmentExpression:
                    return this.resolveAssignmentExpression(<BinaryExpression>ast, context);

                // boolean operations
                case SyntaxKind.LogicalNotExpression:
                    return this.resolveLogicalNotExpression(<PrefixUnaryExpression>ast, context);

                case SyntaxKind.NotEqualsWithTypeConversionExpression:
                case SyntaxKind.EqualsWithTypeConversionExpression:
                case SyntaxKind.EqualsExpression:
                case SyntaxKind.NotEqualsExpression:
                case SyntaxKind.LessThanExpression:
                case SyntaxKind.LessThanOrEqualExpression:
                case SyntaxKind.GreaterThanOrEqualExpression:
                case SyntaxKind.GreaterThanExpression:
                    return this.resolveLogicalOperation(<BinaryExpression>ast, context);

                case SyntaxKind.AddExpression:
                case SyntaxKind.AddAssignmentExpression:
                    return this.resolveBinaryAdditionOperation(<BinaryExpression>ast, context);

                case SyntaxKind.PlusExpression:
                case SyntaxKind.NegateExpression:
                case SyntaxKind.BitwiseNotExpression:
                case SyntaxKind.PreIncrementExpression:
                case SyntaxKind.PreDecrementExpression:
                    return this.resolveUnaryArithmeticOperation(<PrefixUnaryExpression>ast, context);

                case SyntaxKind.PostIncrementExpression:
                case SyntaxKind.PostDecrementExpression:
                    return this.resolvePostfixUnaryExpression(<PostfixUnaryExpression>ast, context);

                case SyntaxKind.SubtractExpression:
                case SyntaxKind.MultiplyExpression:
                case SyntaxKind.DivideExpression:
                case SyntaxKind.ModuloExpression:
                case SyntaxKind.BitwiseOrExpression:
                case SyntaxKind.BitwiseAndExpression:
                case SyntaxKind.LeftShiftExpression:
                case SyntaxKind.SignedRightShiftExpression:
                case SyntaxKind.UnsignedRightShiftExpression:
                case SyntaxKind.BitwiseExclusiveOrExpression:
                case SyntaxKind.ExclusiveOrAssignmentExpression:
                case SyntaxKind.LeftShiftAssignmentExpression:
                case SyntaxKind.SignedRightShiftAssignmentExpression:
                case SyntaxKind.UnsignedRightShiftAssignmentExpression:
                case SyntaxKind.SubtractAssignmentExpression:
                case SyntaxKind.MultiplyAssignmentExpression:
                case SyntaxKind.DivideAssignmentExpression:
                case SyntaxKind.ModuloAssignmentExpression:
                case SyntaxKind.OrAssignmentExpression:
                case SyntaxKind.AndAssignmentExpression:
                    return this.resolveBinaryArithmeticExpression(<BinaryExpression>ast, context);

                case SyntaxKind.ElementAccessExpression:
                    return this.resolveElementAccessExpression(<ElementAccessExpression>ast, context);

                case SyntaxKind.LogicalOrExpression:
                    return this.resolveLogicalOrExpression(<BinaryExpression>ast, isContextuallyTyped, context);

                case SyntaxKind.LogicalAndExpression:
                    return this.resolveLogicalAndExpression(<BinaryExpression>ast, context);

                case SyntaxKind.TypeOfExpression:
                    return this.resolveTypeOfExpression(<TypeOfExpression>ast, context);

                case SyntaxKind.ThrowStatement:
                    return this.resolveThrowStatement(<ThrowStatement>ast, context);

                case SyntaxKind.DeleteExpression:
                    return this.resolveDeleteExpression(<DeleteExpression>ast, context);

                case SyntaxKind.ConditionalExpression:
                    return this.resolveConditionalExpression(<ConditionalExpression>ast, isContextuallyTyped, context);

                case SyntaxKind.RegularExpressionLiteral:
                    return this.resolveRegularExpressionLiteral();

                case SyntaxKind.ParenthesizedExpression:
                    return this.resolveParenthesizedExpression(<ParenthesizedExpression>ast, context);

                case SyntaxKind.ExpressionStatement:
                    return this.resolveExpressionStatement(<ExpressionStatement>ast, context);

                case SyntaxKind.InstanceOfExpression:
                    return this.resolveInstanceOfExpression(<BinaryExpression>ast, context);

                case SyntaxKind.CommaExpression:
                    return this.resolveCommaExpression(<BinaryExpression>ast, context);

                case SyntaxKind.InExpression:
                    return this.resolveInExpression(<BinaryExpression>ast, context);

                case SyntaxKind.ForStatement:
                    return this.resolveForStatement(<ForStatement>ast, context);

                case SyntaxKind.ForInStatement:
                    return this.resolveForInStatement(<ForInStatement>ast, context);

                case SyntaxKind.WhileStatement:
                    return this.resolveWhileStatement(<WhileStatement>ast, context);

                case SyntaxKind.DoStatement:
                    return this.resolveDoStatement(<DoStatement>ast, context);

                case SyntaxKind.IfStatement:
                    return this.resolveIfStatement(<IfStatement>ast, context);

                case SyntaxKind.ElseClause:
                    return this.resolveElseClause(<ElseClause>ast, context);

                case SyntaxKind.Block:
                    return this.resolveBlock(<Block>ast, context);

                case SyntaxKind.VariableStatement:
                    return this.resolveVariableStatement(<VariableStatement>ast, context);

                case SyntaxKind.WithStatement:
                    return this.resolveWithStatement(<WithStatement>ast, context);

                case SyntaxKind.TryStatement:
                    return this.resolveTryStatement(ast, context);

                case SyntaxKind.CatchClause:
                    return this.resolveCatchClause(<CatchClause>ast, context);

                case SyntaxKind.FinallyClause:
                    return this.resolveFinallyClause(<FinallyClause>ast, context);

                case SyntaxKind.ReturnStatement:
                    return this.resolveReturnStatement(<ReturnStatement>ast, context);

                case SyntaxKind.SwitchStatement:
                    return this.resolveSwitchStatement(<SwitchStatement>ast, context);

                case SyntaxKind.ContinueStatement:
                    return this.resolveContinueStatement(<ContinueStatement>ast, context);

                case SyntaxKind.BreakStatement:
                    return this.resolveBreakStatement(<BreakStatement>ast, context);

                case SyntaxKind.LabeledStatement:
                    return this.resolveLabeledStatement(<LabeledStatement>ast, context);
            }

            return this.semanticInfoChain.anyTypeSymbol;
        }

        private typeCheckAST(ast: AST, isContextuallyTyped: boolean, context: PullTypeResolutionContext): void {
            if (!this.canTypeCheckAST(ast, context)) {
                return;
            }

            var nodeType = ast.nodeType();
            switch (nodeType) {
                case SyntaxKind.SourceUnit:
                    this.typeCheckScript(<Script>ast, context);
                    return;

                case SyntaxKind.EnumDeclaration:
                    this.typeCheckEnumDeclaration(<EnumDeclaration>ast, context);
                    return;

                case SyntaxKind.ModuleDeclaration:
                    this.typeCheckModuleDeclaration(<ModuleDeclaration>ast, context);
                    return;

                case SyntaxKind.InterfaceDeclaration:
                    this.typeCheckInterfaceDeclaration(<InterfaceDeclaration>ast, context);
                    return;

                case SyntaxKind.ClassDeclaration:
                    this.typeCheckClassDeclaration(<ClassDeclaration>ast, context);
                    return;

                case SyntaxKind.EnumElement:
                    this.typeCheckEnumElement(<EnumElement>ast, context);
                    return;

                case SyntaxKind.MemberVariableDeclaration:
                    this.typeCheckMemberVariableDeclaration(<MemberVariableDeclaration>ast, context);
                    return;

                case SyntaxKind.VariableDeclarator:
                    this.typeCheckVariableDeclarator(<VariableDeclarator>ast, context);
                    return;

                case SyntaxKind.PropertySignature:
                    this.typeCheckPropertySignature(<PropertySignature>ast, context);
                    return;

                case SyntaxKind.Parameter:
                    this.typeCheckParameter(<Parameter>ast, context);
                    return;

                case SyntaxKind.ImportDeclaration:
                    this.typeCheckImportDeclaration(<ImportDeclaration>ast, context);
                    return;

                case SyntaxKind.ObjectLiteralExpression:
                    this.resolveObjectLiteralExpression(<ObjectLiteralExpression>ast, isContextuallyTyped, context);
                    return;

                case SyntaxKind.FunctionPropertyAssignment:
                    this.typeCheckFunctionPropertyAssignment(<FunctionPropertyAssignment>ast, isContextuallyTyped, context);
                    return;

                case SyntaxKind.IdentifierName:
                    if (isTypesOnlyLocation(ast)) {
                        this.resolveTypeNameExpression(<Identifier>ast, context);
                    }
                    else {
                        this.resolveNameExpression(<Identifier>ast, context);
                    }
                    return;

                case SyntaxKind.MemberAccessExpression:
                    this.resolveMemberAccessExpression(<MemberAccessExpression>ast, context);
                    return;

                case SyntaxKind.QualifiedName:
                    this.resolveQualifiedName(<QualifiedName>ast, context);
                    return;

                case SyntaxKind.FunctionExpression:
                    this.typeCheckFunctionExpression(<FunctionExpression>ast, context);
                    break;

                case SyntaxKind.IndexSignature:
                    this.typeCheckIndexSignature(<IndexSignature>ast, context);
                    break;
                
                case SyntaxKind.CallSignature:
                    this.typeCheckCallSignature(<CallSignature>ast, context);
                    break;

                case SyntaxKind.ConstructSignature:
                    this.typeCheckConstructSignature(<ConstructSignature>ast, context);
                    break;

                case SyntaxKind.FunctionDeclaration:
                    {
                        var funcDecl = <FunctionDeclaration>ast;
                        this.typeCheckFunctionDeclaration(
                            funcDecl, hasModifier(funcDecl.modifiers, PullElementFlags.Static), funcDecl.identifier,
                            funcDecl.callSignature.typeParameterList, funcDecl.callSignature.parameterList,
                            getType(funcDecl), funcDecl.block, context);
                        return;
                    }

                case SyntaxKind.SimpleArrowFunctionExpression:
                    this.typeCheckSimpleArrowFunctionExpression(<SimpleArrowFunctionExpression>ast, context);
                    return;

                case SyntaxKind.ParenthesizedArrowFunctionExpression:
                    this.typeCheckParenthesizedArrowFunctionExpression(<ParenthesizedArrowFunctionExpression>ast, context);
                    return;

                case SyntaxKind.ArrayLiteralExpression:
                    this.resolveArrayLiteralExpression(<ArrayLiteralExpression>ast, isContextuallyTyped, context);
                    return;

                case SyntaxKind.InvocationExpression:
                    this.typeCheckInvocationExpression(<InvocationExpression>ast, context);
                    return;

                case SyntaxKind.ObjectCreationExpression:
                    this.typeCheckObjectCreationExpression(<ObjectCreationExpression>ast, context);
                    return;

                case SyntaxKind.ReturnStatement:
                    // Since we want to resolve the return expression to traverse parents, resolve will take care of typeChecking
                    this.resolveReturnStatement(<ReturnStatement>ast, context);
                    return;

                default:
                    Debug.assert(false, "Failure nodeType: " + TypeScript.SyntaxKind[ast.nodeType()] + ". Implement typeCheck when symbol is set for the ast as part of resolution.");
            }
        }

        private processPostTypeCheckWorkItems(context: PullTypeResolutionContext) {
            while (this.postTypeCheckWorkitems.length) {
                var ast = this.postTypeCheckWorkitems.pop();
                this.postTypeCheck(ast, context);
            }
        }

        private postTypeCheck(ast: AST, context: PullTypeResolutionContext) {
            var nodeType = ast.nodeType();

            switch (nodeType) {
                case SyntaxKind.Parameter:
                case SyntaxKind.VariableDeclarator:
                    this.postTypeCheckVariableDeclaratorOrParameter(ast, context);
                    return;

                case SyntaxKind.ClassDeclaration:
                    this.postTypeCheckClassDeclaration(<ClassDeclaration>ast, context);
                    return;

                case SyntaxKind.FunctionDeclaration:
                    this.postTypeCheckFunctionDeclaration(<FunctionDeclaration>ast, context);
                    return;

                case SyntaxKind.ModuleDeclaration:
                    this.postTypeCheckModuleDeclaration(<ModuleDeclaration>ast, context);
                    return;

                case SyntaxKind.EnumDeclaration:
                    this.postTypeCheckEnumDeclaration(<EnumDeclaration>ast, context);
                    return;

                case SyntaxKind.ImportDeclaration:
                    this.postTypeCheckImportDeclaration(<ImportDeclaration>ast, context);
                    return;

                case SyntaxKind.IdentifierName:
                    this.postTypeCheckNameExpression(<Identifier>ast, context);
                    return;

                default:
                    Debug.assert(false, "Implement postTypeCheck clause to handle the postTypeCheck work, nodeType: " +  TypeScript.SyntaxKind[ast.nodeType()]);
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

        private postTypeCheckNameExpression(nameAST: Identifier, context: PullTypeResolutionContext) {
            this.checkThisCaptureVariableCollides(nameAST, /*isDeclaration*/ false, context);
        }

        private typeCheckNameExpression(nameAST: Identifier, context: PullTypeResolutionContext) {
            this.setTypeChecked(nameAST, context);
            this.checkNameForCompilerGeneratedDeclarationCollision(nameAST, /*isDeclaration*/ false, nameAST, context);
        }

        private resolveNameExpression(nameAST: Identifier, context: PullTypeResolutionContext): PullSymbol {
            var nameSymbol = this.getSymbolForAST(nameAST, context);
            var foundCached = nameSymbol != null;

            if (!foundCached || this.canTypeCheckAST(nameAST, context)) {
                if (this.canTypeCheckAST(nameAST, context)) {
                    this.typeCheckNameExpression(nameAST, context);
                }
                nameSymbol = this.computeNameExpression(nameAST, context, /*reportDiagnostics:*/ true);
            }

            this.resolveDeclaredSymbol(nameSymbol, context);

            // We don't want to capture an intermediate 'any' from a recursive resolution
            if (nameSymbol &&
                (nameSymbol.type != this.semanticInfoChain.anyTypeSymbol ||
                nameSymbol.anyDeclHasFlag(PullElementFlags.IsAnnotatedWithAny | PullElementFlags.Exported))/*&& !nameSymbol.inResolution*/) {
                this.setSymbolForAST(nameAST, nameSymbol, context);
            }

            return nameSymbol;
        }

        private isSomeFunctionScope(declPath: PullDecl[]) {
            for (var i = declPath.length - 1; i >= 0; i--) {
                var decl = declPath[i];
                if (decl.kind & PullElementKind.SomeFunction) {
                    return true;
                }
            }

            return false;
        }

        private computeNameExpression(nameAST: Identifier, context: PullTypeResolutionContext, reportDiagnostics: boolean): PullSymbol {
            var id = nameAST.valueText();
            if (id.length === 0) {
                return this.semanticInfoChain.anyTypeSymbol;
            }

            var nameSymbol: PullSymbol = null;
            var enclosingDecl = this.getEnclosingDeclForAST(nameAST);//, /*skipNonScopeDecls:*/ false);

            // First check if this is the name child of a declaration. If it is, no need to search for a name in scope since this is not a reference.
            if (isDeclarationASTOrDeclarationNameAST(nameAST)) {
                nameSymbol = this.semanticInfoChain.getDeclForAST(nameAST.parent).getSymbol();
            }

            var declPath = enclosingDecl.getParentPath();

            if (!nameSymbol) {
                var nameSymbol = this.getSymbolFromDeclPath(id, declPath, PullElementKind.SomeValue);
            }

            if (!nameSymbol && id === "arguments" && this.isSomeFunctionScope(declPath)) {
                nameSymbol = this.cachedFunctionArgumentsSymbol();

                this.resolveDeclaredSymbol(this.cachedIArgumentsInterfaceType(), context);
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
                if (!reportDiagnostics) {
                    return null;
                } else {
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(nameAST, DiagnosticCode.Could_not_find_symbol_0, [nameAST.text()]));
                    return this.getNewErrorTypeSymbol(id);
                }
            }

            // October 11, 2013:
            // Initializer expressions are evaluated in the scope of the function body but are not 
            // permitted to reference local variables and are only permitted to access parameters 
            // that are declared to the left of the parameter they initialize.

            // If we've referenced a parameter of a function, make sure that we're either inside 
            // the function, or if we're in a parameter initializer, that the parameter 
            // initializer is to the left of this reference.

            var nameDeclaration = nameSymbol.getDeclarations()[0];
            var nameParentDecl = nameDeclaration.getParentDecl();
            if (nameParentDecl &&
                (nameParentDecl.kind & PullElementKind.SomeFunction) &&
                (nameParentDecl.flags & PullElementFlags.HasDefaultArgs)) {
                // Get the AST and look it up in the parameter index context to find which parameter we are in
                var enclosingFunctionAST = this.semanticInfoChain.getASTForDecl(nameParentDecl);
                var currentParameterIndex = this.getCurrentParameterIndexForFunction(nameAST, enclosingFunctionAST);

                var parameterList = getParameterList(enclosingFunctionAST);
                // Short circuit if we are located in the function body, since all child decls of the function are accessible there
                if (currentParameterIndex >= 0) {
                    // Search the enclosing function AST for a parameter with the right name, but stop once we hit our current context
                    var foundMatchingParameter = false;
                    if (parameterList) {
                        for (var i = 0; i <= currentParameterIndex; i++) {
                            var candidateParameter = <Parameter>parameterList.parameters.nonSeparatorAt(i);
                            if (candidateParameter && candidateParameter.identifier.valueText() === id) {
                                foundMatchingParameter = true;
                            }
                        }
                    }

                    if (!foundMatchingParameter) {
                        // We didn't find a matching parameter to the left, so error
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(nameAST,
                            DiagnosticCode.Initializer_of_parameter_0_cannot_reference_identifier_1_declared_after_it,
                            [(<Parameter>parameterList.parameters.nonSeparatorAt(currentParameterIndex)).identifier.text(), nameAST.text()]));
                        return this.getNewErrorTypeSymbol(id);
                    }
                }
            }

            var aliasSymbol: PullTypeAliasSymbol = null;

            if (nameSymbol.isType() && nameSymbol.isAlias()) {
                aliasSymbol = <PullTypeAliasSymbol>nameSymbol;
                if (!this.inTypeQuery(nameAST)) {
                    aliasSymbol.setIsUsedAsValue(true);
                }

                this.resolveDeclaredSymbol(nameSymbol, context);

                this.resolveDeclaredSymbol(aliasSymbol.assignedValue(), context);
                this.resolveDeclaredSymbol(aliasSymbol.assignedContainer(), context);

                var exportAssignmentSymbol = (<PullTypeAliasSymbol>nameSymbol).getExportAssignedValueSymbol();

                if (exportAssignmentSymbol) {
                    nameSymbol = exportAssignmentSymbol;
                }
                else {
                    aliasSymbol = null;
                }
            }

            if (aliasSymbol) {
                this.semanticInfoChain.setAliasSymbolForAST(nameAST, aliasSymbol);
            }

            return nameSymbol;
        }

        // Returns the parameter index in the specified function declaration where ast is contained
        // within.  Returns -1 if ast is not contained within a parameter initializer in the 
        // provided function declaration.
        private getCurrentParameterIndexForFunction(parameter: AST, funcDecl: AST): number {
            var parameterList = getParameterList(funcDecl);
            if (parameterList) {
                while (parameter && parameter.parent) {
                    if (parameter.parent.parent === parameterList) {
                        // We were contained in the parameter list.  Return which parameter index 
                        // we were at.
                        return parameterList.parameters.nonSeparatorIndexOf(parameter);
                    }

                    parameter = parameter.parent;
                }
            }

            // ast was not found within the parameter list of this function.
            return -1;
        }

        private resolveMemberAccessExpression(dottedNameAST: MemberAccessExpression, context: PullTypeResolutionContext): PullSymbol {
            return this.resolveDottedNameExpression(
                dottedNameAST, dottedNameAST.expression, dottedNameAST.name, context);
        }

        private resolveDottedNameExpression(
            dottedNameAST: AST,
            expression: AST,
            name: Identifier,
            context: PullTypeResolutionContext): PullSymbol {

            var symbol = this.getSymbolForAST(dottedNameAST, context);
            var foundCached = symbol != null;

            if (!foundCached || this.canTypeCheckAST(dottedNameAST, context)) {
                var canTypeCheckDottedNameAST = this.canTypeCheckAST(dottedNameAST, context);
                if (canTypeCheckDottedNameAST) {
                    this.setTypeChecked(dottedNameAST, context);
                }

                symbol = this.computeDottedNameExpression(
                    expression, name, context, canTypeCheckDottedNameAST);
            }

            this.resolveDeclaredSymbol(symbol, context);

            if (symbol &&
                (symbol.type != this.semanticInfoChain.anyTypeSymbol ||
                symbol.anyDeclHasFlag(PullElementFlags.IsAnnotatedWithAny | PullElementFlags.Exported))/*&& !symbol.inResolution*/) {
                this.setSymbolForAST(dottedNameAST, symbol, context);
                this.setSymbolForAST(name, symbol, context);
            }

            return symbol;
        }

        private computeDottedNameExpression(expression: AST, name: Identifier, context: PullTypeResolutionContext, checkSuperPrivateAndStaticAccess: boolean): PullSymbol {
            var rhsName = name.valueText();
            if (rhsName.length === 0) {
                return this.semanticInfoChain.anyTypeSymbol;
            }

            // assemble the dotted name path
            var lhs = this.resolveAST(expression, /*isContextuallyTyped*/false, context);
            var lhsType = lhs.type;

            if (lhs.isAlias()) {
                if (!this.inTypeQuery(expression)) {
                    (<PullTypeAliasSymbol>lhs).setIsUsedAsValue(true);
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
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(name, DiagnosticCode.Could_not_find_enclosing_symbol_for_dotted_name_0, [name.text()]));
                return this.getNewErrorTypeSymbol();
            }

            if (!lhsType.isResolved) {
                var potentiallySpecializedType = <PullTypeSymbol>this.resolveDeclaredSymbol(lhsType, context);

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

                // could be an object member
                if (!nameSymbol && !lhsType.isPrimitive() && this.cachedObjectInterfaceType()) {
                    nameSymbol = this.getMemberSymbol(rhsName, PullElementKind.SomeValue, this.cachedObjectInterfaceType());
                }

                if (!nameSymbol) {
                    var enclosingDecl = this.getEnclosingDeclForAST(expression);
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(name, DiagnosticCode.The_property_0_does_not_exist_on_value_of_type_1, [name.text(), lhsType.toString(enclosingDecl ? enclosingDecl.getSymbol() : null)]));
                    return this.getNewErrorTypeSymbol(rhsName);
                }
            }

            if (checkSuperPrivateAndStaticAccess) {
                this.checkForSuperMemberAccess(expression, name, nameSymbol, context) ||
                this.checkForPrivateMemberAccess(name, lhsType, nameSymbol, context);
             }

            return nameSymbol;
        }

        private resolveTypeNameExpression(nameAST: Identifier, context: PullTypeResolutionContext): PullTypeSymbol {
            var typeNameSymbol = <PullTypeSymbol>this.getSymbolForAST(nameAST, context);

            // TODO(cyrusn): We really shouldn't be checking "isType" here.  However, we currently
            // have a bug where some part of the system calls resolveNameExpression on this node
            // and we cache the wrong thing.  We need to add appropriate checks to ensure that
            // resolveNameExpression is never called on a node that we should be calling 
            // resolveTypeNameExpression (and vice versa).
            if (!typeNameSymbol || !typeNameSymbol.isType() || this.canTypeCheckAST(nameAST, context)) {
                if (this.canTypeCheckAST(nameAST, context)) {
                    this.setTypeChecked(nameAST, context);
                }
                typeNameSymbol = this.computeTypeNameExpression(nameAST, context);
                this.setSymbolForAST(nameAST, typeNameSymbol, context);
            }

            this.resolveDeclaredSymbol(typeNameSymbol, context);

            return typeNameSymbol;
        }

        private computeTypeNameExpression(nameAST: Identifier, context: PullTypeResolutionContext): PullTypeSymbol {
            var id = nameAST.valueText();
            if (id.length === 0) {
                return this.semanticInfoChain.anyTypeSymbol;
            }

            var enclosingDecl = this.getEnclosingDeclForAST(nameAST);

            var declPath = enclosingDecl.getParentPath();

            // If we're resolving a dotted type name, every dotted name but the last will be a container type, so we'll search those
            // first if need be, and then fall back to type names.  Otherwise, look for a type first, since we are probably looking for
            // a type reference (the exception being an alias or export assignment)
            var onLeftOfDot = this.isLeftSideOfQualifiedName(nameAST);

            var kindToCheckFirst = onLeftOfDot ? PullElementKind.SomeContainer : PullElementKind.SomeType;
            var kindToCheckSecond = onLeftOfDot ? PullElementKind.SomeType : PullElementKind.SomeContainer;

            var typeNameSymbol = <PullTypeSymbol>this.getSymbolFromDeclPath(id, declPath, kindToCheckFirst);

            if (!typeNameSymbol) {
                typeNameSymbol = <PullTypeSymbol>this.getSymbolFromDeclPath(id, declPath, kindToCheckSecond);
            }

            if (!typeNameSymbol) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(nameAST, DiagnosticCode.Could_not_find_symbol_0, [nameAST.text()]));
                return this.getNewErrorTypeSymbol(id);
            }

            var typeNameSymbolAlias: PullTypeAliasSymbol = null;
            if (typeNameSymbol.isAlias()) {
                typeNameSymbolAlias = <PullTypeAliasSymbol>typeNameSymbol;
                this.resolveDeclaredSymbol(typeNameSymbol, context);

                var aliasedType = typeNameSymbolAlias.getExportAssignedTypeSymbol();

                this.resolveDeclaredSymbol(aliasedType, context);
            }

            if (typeNameSymbol.isTypeParameter()) {
                if (enclosingDecl && (enclosingDecl.kind & PullElementKind.SomeFunction) && (enclosingDecl.flags & PullElementFlags.Static)) {
                    var parentDecl = typeNameSymbol.getDeclarations()[0].getParentDecl();

                    if (parentDecl.kind == PullElementKind.Class) {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(nameAST, DiagnosticCode.Static_methods_cannot_reference_class_type_parameters));
                        return this.getNewErrorTypeSymbol();
                    }
                }
            }

            if (!typeNameSymbol.isGeneric() && (typeNameSymbol.isClass() || typeNameSymbol.isInterface())) {
                typeNameSymbol = PullTypeReferenceSymbol.createTypeReference(typeNameSymbol);
            }

            return typeNameSymbol;
        }

        private isLeftSideOfQualifiedName(ast: AST): boolean {
            return ast && ast.parent && ast.parent.nodeType() === SyntaxKind.QualifiedName && (<QualifiedName>ast.parent).left === ast;
        }

        private resolveGenericTypeReference(genericTypeAST: GenericType, context: PullTypeResolutionContext): PullTypeSymbol {
            var genericTypeSymbol = this.resolveAST(genericTypeAST.name, false, context).type;

            if (genericTypeSymbol.isError()) {
                return genericTypeSymbol;
            }

            if (!genericTypeSymbol.inResolution && !genericTypeSymbol.isResolved) {
                this.resolveDeclaredSymbol(genericTypeSymbol, context);
            }

            if (genericTypeSymbol.isAlias()) {
                genericTypeSymbol = (<PullTypeAliasSymbol>genericTypeSymbol).getExportAssignedTypeSymbol();
            }

            // specialize the type arguments
            var typeArgs: PullTypeSymbol[] = [];

            if (genericTypeAST.typeArgumentList && genericTypeAST.typeArgumentList.typeArguments.nonSeparatorCount()) {
                for (var i = 0; i < genericTypeAST.typeArgumentList.typeArguments.nonSeparatorCount(); i++) {
                    typeArgs[i] = this.resolveTypeReference(genericTypeAST.typeArgumentList.typeArguments.nonSeparatorAt(i), context);

                    if (typeArgs[i].isError()) {
                        typeArgs[i] = this.semanticInfoChain.anyTypeSymbol;
                    }
                }
            }

            var typeParameters = genericTypeSymbol.getTypeParameters()

            if (typeArgs.length && typeArgs.length != typeParameters.length) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(genericTypeAST, DiagnosticCode.Generic_type_0_requires_1_type_argument_s, [genericTypeSymbol.toString(), genericTypeSymbol.getTypeParameters().length]));
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

            var specializedSymbol = this.createInstantiatedType(genericTypeSymbol, typeArgs);

            // check constraints, if appropriate
            var typeConstraint: PullTypeSymbol = null;
            var upperBound: PullTypeSymbol = null;

            // Get the instantiated versions of the type parameters (in case their constraints were generic)
            typeParameters = specializedSymbol.getTypeParameters();

            var typeConstraintSubstitutionMap: PullTypeSymbol[] = [];
            var typeArg: PullTypeSymbol = null;

            var instantiatedSubstitutionMap = specializedSymbol.getTypeParameterArgumentMap();


            // To defend against forward references amongst constraints, first enter each type
            // parameter into the substitution map, set to itself
            for (var i = 0; i < typeParameters.length; i++) {
                typeConstraintSubstitutionMap[typeParameters[i].pullSymbolID] = typeParameters[i];
            }

            for (var id in instantiatedSubstitutionMap) {
                typeConstraintSubstitutionMap[id] = instantiatedSubstitutionMap[id];
            }

            for (var iArg = 0; (iArg < typeArgs.length) && (iArg < typeParameters.length); iArg++) {
                typeArg = typeArgs[iArg];
                typeConstraint = typeParameters[iArg].getConstraint();

                typeConstraintSubstitutionMap[typeParameters[iArg].pullSymbolID] = typeArg;

                // test specialization type for assignment compatibility with the constraint
                if (typeConstraint) {

                    if (typeConstraint.isTypeParameter()) {

                        for (var j = 0; j < typeParameters.length && j < typeArgs.length; j++) {
                            if (typeParameters[j] == typeConstraint) {
                                typeConstraint = typeArgs[j];
                            }
                        }
                    }
                    else if (typeConstraint.isGeneric()) {
                        typeConstraint = this.instantiateType(typeConstraint, typeConstraintSubstitutionMap);
                    }

                    if (typeArg.isTypeParameter()) {
                        upperBound = (<PullTypeParameterSymbol>typeArg).getConstraint();

                        if (upperBound) {
                            typeArg = upperBound;
                        }
                    }

                    // handle cases where the type argument is a wrapped name type, that's being recursively resolved
                    if (typeArg.inResolution || (typeArg.isTypeReference() && (<PullTypeReferenceSymbol>typeArg).referencedTypeSymbol.inResolution)) {
                        return specializedSymbol;
                    }
                    if (!this.sourceIsAssignableToTarget(typeArg, typeConstraint, context)) {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(genericTypeAST, DiagnosticCode.Type_0_does_not_satisfy_the_constraint_1_for_type_parameter_2, [typeArg.toString(/*scopeSymbol*/ null, /*useConstraintInName*/ true), typeConstraint.toString(/*scopeSymbol*/ null, /*useConstraintInName*/ true), typeParameters[iArg].toString(/*scopeSymbol*/ null, /*useConstraintInName*/ true)]));
                    }
                }
            }

            return specializedSymbol;
        }

        private resolveQualifiedName(dottedNameAST: QualifiedName, context: PullTypeResolutionContext): PullTypeSymbol {
            if (this.inTypeQuery(dottedNameAST)) {
                // If we're in a type query, then treat the qualified name as a normal dotted
                // name expression.
                return this.resolveDottedNameExpression(
                    dottedNameAST, dottedNameAST.left, dottedNameAST.right, context).type;
            }

            var symbol = <PullTypeSymbol>this.getSymbolForAST(dottedNameAST, context);
            if (!symbol || this.canTypeCheckAST(dottedNameAST, context)) {
                var canTypeCheck = this.canTypeCheckAST(dottedNameAST, context);
                if (canTypeCheck) {
                    this.setTypeChecked(dottedNameAST, context);
                }

                symbol = this.computeQualifiedName(dottedNameAST, context);
                this.setSymbolForAST(dottedNameAST, symbol, context);
            }

            this.resolveDeclaredSymbol(symbol, context);

            return symbol;
        }

        private computeQualifiedName(dottedNameAST: QualifiedName, context: PullTypeResolutionContext): PullTypeSymbol {
            var rhsName = dottedNameAST.right.valueText();
            if (rhsName.length === 0) {
                return this.semanticInfoChain.anyTypeSymbol;
            }

            // assemble the dotted name path
            var enclosingDecl = this.getEnclosingDeclForAST(dottedNameAST);
            var lhs = this.resolveAST(dottedNameAST.left, /*isContextuallyTyped*/ false, context);

            var lhsType = lhs.isAlias() ? (<PullTypeAliasSymbol>lhs).getExportAssignedContainerSymbol() : lhs.type;

            if (this.inClassExtendsHeritageClause(dottedNameAST) &&
                !this.inTypeArgumentList(dottedNameAST)) {
                if (lhs.isAlias()) {
                    (<PullTypeAliasSymbol>lhs).setIsUsedAsValue(true);
                }
            }

            if (!lhsType) {
                return this.getNewErrorTypeSymbol();
            }

            if (this.isAnyOrEquivalent(lhsType)) {
                return lhsType;
            }

            // now for the name...
            var onLeftOfDot = this.isLeftSideOfQualifiedName(dottedNameAST);
            var isNameOfModule = dottedNameAST.parent.nodeType() === SyntaxKind.ModuleDeclaration && (<ModuleDeclaration>dottedNameAST.parent).name === dottedNameAST;
            var memberKind = (onLeftOfDot || isNameOfModule) ? PullElementKind.SomeContainer : PullElementKind.SomeType;

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
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(dottedNameAST.right, DiagnosticCode.The_property_0_does_not_exist_on_value_of_type_1, [dottedNameAST.right.text(), lhsType.toString(enclosingDecl ? enclosingDecl.getSymbol() : null)]));
                return this.getNewErrorTypeSymbol(rhsName);
            }

            return childTypeSymbol;
        }

        private shouldContextuallyTypeAnyFunctionExpression(
            functionExpressionAST: AST,
            typeParameters: TypeParameterList,
            parameters: IParameters,
            returnTypeAnnotation: AST,
            context: PullTypeResolutionContext): boolean {

            // September 21, 2013: If e is a FunctionExpression or ArrowFunctionExpression with no type parameters and no parameter
            // or return type annotations, and T is a function type with exactly one non - generic call signature, then any
            // inferences made for type parameters referenced by the parameters of T’s call signature are fixed(section 4.12.2)
            // and e is processed with the contextual type T, as described in section 4.9.3.

            // No type parameters
            if (typeParameters && typeParameters.typeParameters.nonSeparatorCount() > 0) {
                return false;
            }

            // No return type annotation
            if (returnTypeAnnotation) {
                return false;
            }

            // No parameter type annotations
            if (parameters) {
                for (var i = 0, n = parameters.length; i < n; i++) {
                    if (parameters.typeAt(i)) {
                        return false
                    }
                }
            }

            var contextualFunctionTypeSymbol = context.getContextualType();

            // Exactly one non-generic call signature (note that this means it must have exactly one call signature,
            // AND that call signature must be non-generic)
            if (contextualFunctionTypeSymbol) {
                this.resolveDeclaredSymbol(contextualFunctionTypeSymbol, context);
                var callSignatures = contextualFunctionTypeSymbol.getCallSignatures();
                var exactlyOneCallSignature = callSignatures && callSignatures.length == 1;
                if (!exactlyOneCallSignature) {
                    return false;
                }

                var callSignatureIsGeneric = callSignatures[0].typeParameters && callSignatures[0].typeParameters.length > 0;
                return !callSignatureIsGeneric;
                    }

            return false;
                }

        private resolveAnyFunctionExpression(
            funcDeclAST: AST,
            typeParameters: TypeParameterList,
            parameters: IParameters,
            returnTypeAnnotation: AST,
            block: Block,
            bodyExpression: AST,
            isContextuallyTyped: boolean,
            context: PullTypeResolutionContext): PullSymbol {

            var funcDeclSymbol: PullSymbol = null;
            var functionDecl = this.semanticInfoChain.getDeclForAST(funcDeclAST);
            Debug.assert(functionDecl);

            if (functionDecl && functionDecl.hasSymbol()) {
                funcDeclSymbol = functionDecl.getSymbol();
                if (funcDeclSymbol.isResolved || funcDeclSymbol.inResolution) {
                    return funcDeclSymbol;
                }
            }

            funcDeclSymbol = <PullTypeSymbol>functionDecl.getSymbol();
            Debug.assert(funcDeclSymbol);

            var funcDeclType = funcDeclSymbol.type;
            var signature = funcDeclType.getCallSignatures()[0];
            funcDeclSymbol.startResolving();

            if (typeParameters) {
                for (var i = 0; i < typeParameters.typeParameters.nonSeparatorCount(); i++) {
                    this.resolveTypeParameterDeclaration(<TypeParameter>typeParameters.typeParameters.nonSeparatorAt(i), context);
                }
            }

            var assigningFunctionSignature: PullSignatureSymbol = null;
            if (isContextuallyTyped &&
                this.shouldContextuallyTypeAnyFunctionExpression(funcDeclAST, typeParameters, parameters, returnTypeAnnotation, context)) {

                assigningFunctionSignature = context.getContextualType().getCallSignatures()[0];
            }

            // link parameters and resolve their annotations
            if (parameters) {
                var contextParams: PullSymbol[] = [];

                if (assigningFunctionSignature) {
                    contextParams = assigningFunctionSignature.parameters;
                }

                // Push the function onto the parameter index stack
                var contextualParametersCount = contextParams.length;
                for (var i = 0, n = parameters.length; i < n; i++) {
                    // Function has a variable argument list, and this paramter is the last

                    var actualParameterIsVarArgParameter = (i === (n - 1)) && parameters.lastParameterIsRest();
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
                    this.resolveFunctionExpressionParameter(parameters.astAt(i), parameters.identifierAt(i),
                        parameters.typeAt(i), parameters.initializerAt(i), contextualParameterType, functionDecl, context);
                }
            }

            // resolve the return type annotation
            if (returnTypeAnnotation) {
                signature.returnType = this.resolveTypeReference(returnTypeAnnotation, context);
            }
            else {
                if (assigningFunctionSignature) {
                    var returnType = assigningFunctionSignature.returnType;

                    if (returnType) {
                        context.pushContextualType(returnType, context.inProvisionalResolution(), null);
                        //signature.setReturnType(returnType);
                        this.resolveFunctionBodyReturnTypes(funcDeclAST, block, bodyExpression, signature, true, functionDecl, context);
                        context.popContextualType();
                    }
                    else {
                        signature.returnType = this.semanticInfoChain.anyTypeSymbol;

                        // if noimplictiany flag is set to be true, report an error
                        if (this.compilationSettings.noImplicitAny()) {
                            var functionExpressionName = (<PullFunctionExpressionDecl>functionDecl).getFunctionExpressionName();

                            // If there is a function name for the funciton expression, report an error with that name
                            if (functionExpressionName != "") {
                                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDeclAST,
                                    DiagnosticCode._0_which_lacks_return_type_annotation_implicitly_has_an_any_return_type, [functionExpressionName]));
                            }
                            else {
                                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDeclAST,
                                    DiagnosticCode.Function_expression_which_lacks_return_type_annotation_implicitly_has_an_any_return_type));
                            }
                        }
                    }
                }
                else {
                    this.resolveFunctionBodyReturnTypes(
                        funcDeclAST, block, bodyExpression, signature, false, functionDecl, context);
                }
            }
            // reset the type to the one we already had, 
            // this makes sure if we had short - circuited the type of this symbol to any, we would get back to the function type
            context.setTypeInContext(funcDeclSymbol, funcDeclType);
            funcDeclSymbol.setResolved();

            if (this.canTypeCheckAST(funcDeclAST, context)) {
                this.typeCheckAnyFunctionExpression(funcDeclAST, typeParameters, returnTypeAnnotation, block, bodyExpression, context);
            }

            return funcDeclSymbol;
        }

        private typeCheckSimpleArrowFunctionExpression(
            arrowFunction: SimpleArrowFunctionExpression, context: PullTypeResolutionContext): void {

            return this.typeCheckAnyFunctionExpression(
                arrowFunction, /*typeParameters:*/ null, /*returnTypeAnnotation:*/ null, arrowFunction.block, arrowFunction.expression, context);
        }

        private typeCheckParenthesizedArrowFunctionExpression(
            arrowFunction: ParenthesizedArrowFunctionExpression, context: PullTypeResolutionContext): void {

            return this.typeCheckAnyFunctionExpression(
                arrowFunction, arrowFunction.callSignature.typeParameterList, getType(arrowFunction), arrowFunction.block, arrowFunction.expression, context);
        }

        private typeCheckAnyFunctionExpression(
            funcDeclAST: AST,
            typeParameters: TypeParameterList,
            returnTypeAnnotation: AST,
            block: Block,
            bodyExpression: AST,
            context: PullTypeResolutionContext) {

            this.setTypeChecked(funcDeclAST, context);

            var functionDecl = this.semanticInfoChain.getDeclForAST(funcDeclAST);

            var funcDeclSymbol = <PullTypeSymbol>functionDecl.getSymbol();
            var funcDeclType = funcDeclSymbol.type;
            var signature = funcDeclType.getCallSignatures()[0];
            var returnTypeSymbol = signature.returnType;

            if (typeParameters) {
                for (var i = 0; i < typeParameters.typeParameters.nonSeparatorCount(); i++) {
                    this.resolveTypeParameterDeclaration(<TypeParameter>typeParameters.typeParameters.nonSeparatorAt(i), context);
                }
            }

                // Make sure there is no contextual type on the stack when resolving the block
            context.pushContextualType(null, context.inProvisionalResolution(), null);
            if (block) {
                this.resolveAST(block, /*isContextuallyTyped:*/ false, context);
            }
            else {
                var bodyExpressionType = this.resolveReturnExpression(bodyExpression, functionDecl, context);
                this.typeCheckReturnExpression(bodyExpression, bodyExpressionType, functionDecl, context);
            }
            context.popContextualType();

            var hasReturn = (functionDecl.flags & (PullElementFlags.Signature | PullElementFlags.HasReturnStatement)) != 0;

            if (block && returnTypeAnnotation != null && !hasReturn) {
                var isVoidOrAny = this.isAnyOrEquivalent(returnTypeSymbol) || returnTypeSymbol === this.semanticInfoChain.voidTypeSymbol;

                if (!isVoidOrAny && !(block.statements.childCount() > 0 && block.statements.childAt(0).nodeType() === SyntaxKind.ThrowStatement)) {
                    var funcName = functionDecl.getDisplayName();
                    funcName = funcName ? "'" + funcName + "'" : "expression";

                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(returnTypeAnnotation, DiagnosticCode.Function_0_declared_a_non_void_return_type_but_has_no_return_expression, [funcName]));
                }
            }

            this.validateVariableDeclarationGroups(functionDecl, context);

            this.typeCheckCallBacks.push(context => {
                this.typeCheckFunctionOverloads(funcDeclAST, context);
            });
        }

        private resolveThisExpression(thisExpression: ThisExpression, context: PullTypeResolutionContext): PullSymbol {
            var enclosingDecl = this.getEnclosingDeclForAST(thisExpression);
            var thisTypeSymbol = this.getContextualClassSymbolForEnclosingDecl(thisExpression, enclosingDecl) || this.semanticInfoChain.anyTypeSymbol;

            if (this.canTypeCheckAST(thisExpression, context)) {
                this.typeCheckThisExpression(thisExpression, context, enclosingDecl);
            }

            return thisTypeSymbol;
        }

        private inTypeArgumentList(ast: AST): boolean {
            var previous: AST = null;
            var current = ast;
            
            while (current) {
                switch (current.nodeType()) {
                    case SyntaxKind.GenericType:
                        var genericType = <GenericType>current;
                        if (genericType.typeArgumentList === previous) {
                            return true;
                        }
                        break;

                    case SyntaxKind.ArgumentList:
                        var argumentList = <ArgumentList>current;
                        return argumentList.typeArgumentList === previous;
                }

                previous = current;
                current = current.parent;
            }

            return false;
        }

        private inClassExtendsHeritageClause(ast: AST): boolean {
            while (ast) {
                switch (ast.nodeType()) {
                    case SyntaxKind.ExtendsHeritageClause:
                        var heritageClause = <HeritageClause>ast;

                        // Heritage clause is parented by the heritage clause list.  Which is 
                        // parented by either a class or an interface.  So check the grandparent.
                        return heritageClause.parent.parent.nodeType() === SyntaxKind.ClassDeclaration;

                    case SyntaxKind.ConstructorDeclaration:
                    case SyntaxKind.ClassDeclaration:
                    case SyntaxKind.ModuleDeclaration:
                        return false;
                }

                ast = ast.parent;
            }

            return false;
        }

        private inTypeQuery(ast: AST) {
            while (ast) {
                switch (ast.nodeType()) {
                    case SyntaxKind.TypeQuery:
                        return true;
                    case SyntaxKind.FunctionDeclaration:
                    case SyntaxKind.InvocationExpression:
                    case SyntaxKind.ConstructorDeclaration:
                    case SyntaxKind.ClassDeclaration:
                    case SyntaxKind.ModuleDeclaration:
                        return false;
                }

                ast = ast.parent;
            }

            return false;
        }

        private inArgumentListOfSuperInvocation(ast: AST): boolean {
            var previous: AST = null;
            var current = ast;
            while (current) {
                switch (current.nodeType()) {
                    case SyntaxKind.InvocationExpression:
                        var invocationExpression = <InvocationExpression>current;
                        if (previous === invocationExpression.argumentList &&
                            invocationExpression.expression.nodeType() === SyntaxKind.SuperKeyword) {
                                return true;
                        }
                        break;
                    
                    case SyntaxKind.ConstructorDeclaration:
                    case SyntaxKind.ClassDeclaration:
                    case SyntaxKind.ModuleDeclaration:
                        return false;
                }

                previous = current;
                current = current.parent;
            }

            return false;
        }

        private inConstructorParameterList(ast: AST): boolean {
            var previous: AST = null;
            var current = ast;
            while (current) {
                switch (current.nodeType()) {
                    case SyntaxKind.ConstructorDeclaration:
                        var constructorDecl = <ConstructorDeclaration>current;
                        return previous === constructorDecl.parameterList;

                    case SyntaxKind.ClassDeclaration:
                    case SyntaxKind.ModuleDeclaration:
                        return false;
                }

                previous = current;
                current = current.parent;
            }

            return false;
        }

        private isFunctionOrNonArrowFunctionExpression(decl: PullDecl): boolean {
            if (decl.kind === PullElementKind.Function) {
                return true;
            }
            else if (decl.kind === PullElementKind.FunctionExpression && !hasFlag(decl.flags, PullElementFlags.ArrowFunction)) {
                return true;
            }

            return false;
        }

        private typeCheckThisExpression(thisExpression: ThisExpression, context: PullTypeResolutionContext, enclosingDecl: PullDecl): void {
            this.checkForThisCaptureInArrowFunction(thisExpression);

            if (this.inConstructorParameterList(thisExpression)) {
                // October 11, 2013
                // Similar to functions, only the constructor implementation (and not 
                // constructor overloads) can specify default value expressions for optional
                // parameters.It is a compile - time error for such default value expressions
                //  to reference this. 
                //
                // Note: this applies for constructor parameters and constructor parameter 
                // properties.
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(thisExpression, DiagnosticCode.this_cannot_be_referenced_in_constructor_arguments));
                return;
            }

            // October 11, 2013
            // The type of this in an expression depends on the location in which the reference 
            // takes place:
            //      In a constructor, member function, member accessor, or member variable 
            //      initializer, this is of the class instance type of the containing class.
            //
            //      In a static function or static accessor, the type of this is the constructor 
            //      function type of the containing class.
            //
            //      In a function declaration or a standard function expression, this is of type Any.
            //
            //      In the global module, this is of type Any.
            //
            // In all other contexts it is a compile - time error to reference this.

            for (var currentDecl = enclosingDecl; currentDecl !== null; currentDecl = currentDecl.getParentDecl()) {
                if (this.isFunctionOrNonArrowFunctionExpression(currentDecl)) {
                    // 'this' is always ok in a function.  It just has the 'any' type.
                    return;
                }
                else if (currentDecl.kind === PullElementKind.Container || currentDecl.kind === PullElementKind.DynamicModule) {
                    if (currentDecl.getParentDecl() === null) {
                        // Legal in the global module.
                        return;
                    }
                    else {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(thisExpression, DiagnosticCode.this_cannot_be_referenced_within_module_bodies));
                        return;
                    }
                }
                else if (currentDecl.kind === PullElementKind.ConstructorMethod) {
                    // October 11, 2013
                    // The first statement in the body of a constructor must be a super call if 
                    // both of the following are true:
                    //      The containing class is a derived class.
                    //      The constructor declares parameter properties or the containing class 
                    //      declares instance member variables with initializers.
                    // In such a required super call, it is a compile - time error for argument
                    // expressions to reference this.
                    if (this.inArgumentListOfSuperInvocation(thisExpression) &&
                        this.superCallMustBeFirstStatementInConstructor(currentDecl)) {

                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(thisExpression, DiagnosticCode.this_cannot_be_referenced_in_current_location));
                    }

                    // Otherwise, it's ok to access 'this' in a constructor.
                    return;
                }
                else if (currentDecl.kind === PullElementKind.Class) {
                    if (this.inStaticMemberVariableDeclaration(thisExpression)) {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(thisExpression, DiagnosticCode.this_cannot_be_referenced_in_static_initializers_in_a_class_body));
                    }

                    // Legal use of 'this'.  
                    return;
                }
            }
        }

        private getContextualClassSymbolForEnclosingDecl(ast: AST, enclosingDecl: PullDecl): PullTypeSymbol {
            var declPath = enclosingDecl.getParentPath();

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
                    else if (declKind === PullElementKind.FunctionExpression && !hasFlag(declFlags, PullElementFlags.ArrowFunction)) {
                        return null;
                    }
                    else if (declKind === PullElementKind.Function) {
                        return null;
                    }
                    else if (declKind === PullElementKind.Class) {
                        if (this.inStaticMemberVariableDeclaration(ast)) {
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
                    }
                }
            }

            return null;
        }

        private inStaticMemberVariableDeclaration(ast: AST): boolean {
            while (ast) {
                if (ast.nodeType() === SyntaxKind.MemberVariableDeclaration && hasModifier((<MemberVariableDeclaration>ast).modifiers, PullElementFlags.Static)) {
                    return true;
                }

                ast = ast.parent;
            }

            return false;
        }

        private resolveSuperExpression(ast: SuperExpression, context: PullTypeResolutionContext): PullSymbol {
            var enclosingDecl = this.getEnclosingDeclForAST(ast);
            var superType: PullTypeSymbol = this.semanticInfoChain.anyTypeSymbol;

            var classSymbol = this.getContextualClassSymbolForEnclosingDecl(ast, enclosingDecl);

            if (classSymbol) {
                this.resolveDeclaredSymbol(classSymbol, context);

                var parents = classSymbol.getExtendedTypes();

                if (parents.length) {
                    superType = parents[0];
                }
            }

            if (this.canTypeCheckAST(ast, context)) {
                this.typeCheckSuperExpression(ast, context, enclosingDecl);
            }

            return superType;
        }

        private typeCheckSuperExpression(ast: AST, context: PullTypeResolutionContext, enclosingDecl: PullDecl) {
            this.setTypeChecked(ast, context);

            this.checkForThisCaptureInArrowFunction(ast);

            var isSuperCall = ast.parent.nodeType() === SyntaxKind.InvocationExpression;
            var isSuperPropertyAccess = ast.parent.nodeType() === SyntaxKind.MemberAccessExpression;
            Debug.assert(isSuperCall || isSuperPropertyAccess);

            if (isSuperPropertyAccess) {
                // October 11, 2013
                // Super property accesses are permitted as follows:
                //      In a constructor, instance member function, or instance member accessor of a 
                //      derived class, a super property access must specify a public instance member
                //      function of the base class.
                //
                //      In a static member function or static member accessor of a derived class, a 
                //      super property access must specify a public static member function of the base
                //      class.
                for (var currentDecl = enclosingDecl; currentDecl !== null; currentDecl = currentDecl.getParentDecl()) {
                    if (this.isFunctionOrNonArrowFunctionExpression(currentDecl)) {
                        // TODO: quote relevant spec section once it is in place.
                        // you can only access 'super' in places where 'this' is strongly typed 
                        // and of a derived class type
                        break;
                    }
                    else if (currentDecl.kind === PullElementKind.Class) {
                        // We're in some class member.  That's good.

                        if (!this.enclosingClassIsDerived(currentDecl)) {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(ast, DiagnosticCode.super_cannot_be_referenced_in_non_derived_classes));
                            return;
                        }
                        else if (this.inConstructorParameterList(ast)) {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(ast, DiagnosticCode.super_cannot_be_referenced_in_constructor_arguments));
                            return;
                        }
                        else if (this.inStaticMemberVariableDeclaration(ast)) {
                            break;
                        }

                        // We've checked the bad cases, at this point we're good.
                        return;
                    }
                }

                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(ast, DiagnosticCode.super_property_access_is_permitted_only_in_a_constructor_member_function_or_member_accessor_of_a_derived_class));
                return;
            }
            else {
                // October 11, 2013
                // Constructors of classes with no extends clause may not contain super calls, 
                // whereas constructors of derived classes must contain at least one super call 
                // somewhere in their function body. Super calls are not permitted outside 
                // constructors or in local functions inside constructors.
                // 
                // The first statement in the body of a constructor must be a super call if both 
                // of the following are true:
                //      The containing class is a derived class.
                //      The constructor declares parameter properties or the containing class 
                //      declares instance member variables with initializers.
                for (var currentDecl = enclosingDecl; currentDecl !== null; currentDecl = currentDecl.getParentDecl()) {
                    if (this.isFunctionOrNonArrowFunctionExpression(currentDecl)) {
                        break;
                    }
                    else if (currentDecl.kind === PullElementKind.ConstructorMethod) {
                        // We were in a constructor.  That's good.
                        var classDecl = currentDecl.getParentDecl();

                        if (!this.enclosingClassIsDerived(classDecl)) {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(ast, DiagnosticCode.super_cannot_be_referenced_in_non_derived_classes));
                            return;
                        }
                        else if (this.inConstructorParameterList(ast)) {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(ast, DiagnosticCode.super_cannot_be_referenced_in_constructor_arguments));
                            return;
                        }

                        // Nothing wrong with how we were referenced.  Note: the check if we're the
                        // first statement in the constructor happens in typeCheckConstructorDeclaration.
                        return;
                    }
                }
                
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(ast, DiagnosticCode.Super_calls_are_not_permitted_outside_constructors_or_in_local_functions_inside_constructors));
            }
        }

        private resolveSimplePropertyAssignment(propertyAssignment: SimplePropertyAssignment, isContextuallyTyped: boolean, context: PullTypeResolutionContext): PullSymbol {
            return this.resolveAST(propertyAssignment.expression, isContextuallyTyped, context);
        }

        private resolveFunctionPropertyAssignment(funcProp: FunctionPropertyAssignment, isContextuallyTyped: boolean, context: PullTypeResolutionContext): PullSymbol {
            return this.resolveAnyFunctionExpression(
                funcProp, funcProp.callSignature.typeParameterList, Parameters.fromParameterList(funcProp.callSignature.parameterList),
                getType(funcProp), funcProp.block, /*bodyExpression:*/ null, isContextuallyTyped, context);
        }

        private typeCheckFunctionPropertyAssignment(funcProp: FunctionPropertyAssignment, isContextuallyTyped: boolean, context: PullTypeResolutionContext) {
            this.typeCheckAnyFunctionExpression(funcProp, funcProp.callSignature.typeParameterList, getType(funcProp), funcProp.block, /*bodyExpression:*/ null, context);
        }

        public resolveObjectLiteralExpression(expressionAST: ObjectLiteralExpression, isContextuallyTyped: boolean, context: PullTypeResolutionContext, additionalResults?: PullAdditionalObjectLiteralResolutionData): PullSymbol {
            var symbol = this.getSymbolForAST(expressionAST, context);

            if (!symbol || additionalResults || this.canTypeCheckAST(expressionAST, context)) {
                if (this.canTypeCheckAST(expressionAST, context)) {
                    this.setTypeChecked(expressionAST, context);
                }
                symbol = this.computeObjectLiteralExpression(expressionAST, isContextuallyTyped, context, additionalResults);
                this.setSymbolForAST(expressionAST, symbol, context);
            }

            return symbol;
        }

        private bindObjectLiteralMembers(
            objectLiteralDeclaration: PullDecl,
            objectLiteralTypeSymbol: PullTypeSymbol,
            objectLiteralMembers: ASTSeparatedList,
            isUsingExistingSymbol: boolean,
            pullTypeContext: PullTypeResolutionContext): PullSymbol[] {
            var boundMemberSymbols: PullSymbol[] = [];
            var memberSymbol: PullSymbol;
            for (var i = 0, len = objectLiteralMembers.nonSeparatorCount(); i < len; i++) {
                var propertyAssignment = objectLiteralMembers.nonSeparatorAt(i);

                var id = this.getPropertyAssignmentName(propertyAssignment);
                var assignmentText = getPropertyAssignmentNameTextFromIdentifier(id);

                var isAccessor = propertyAssignment.nodeType() === SyntaxKind.GetAccessor || propertyAssignment.nodeType() === SyntaxKind.SetAccessor;
                var decl = this.semanticInfoChain.getDeclForAST(propertyAssignment);
                Debug.assert(decl);

                if (propertyAssignment.nodeType() == SyntaxKind.SimplePropertyAssignment) {
                    if (!isUsingExistingSymbol) {
                        memberSymbol = new PullSymbol(assignmentText.memberName, PullElementKind.Property);
                        memberSymbol.addDeclaration(decl);
                        decl.setSymbol(memberSymbol);
                    } else {
                        memberSymbol = decl.getSymbol();
                    }
                }
                else if (propertyAssignment.nodeType() === SyntaxKind.FunctionPropertyAssignment) {
                    memberSymbol = decl.getSymbol();
                }
                else {
                    Debug.assert(isAccessor);
                    memberSymbol = decl.getSymbol();
                }

                if (!isUsingExistingSymbol && !isAccessor) {
                    // Make sure this was not defined before
                    if (objectLiteralTypeSymbol.findMember(memberSymbol.name, /*lookInParent*/ true)) {
                        pullTypeContext.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(propertyAssignment, DiagnosticCode.Duplicate_identifier_0, [assignmentText.actualText]));
                    }

                    objectLiteralTypeSymbol.addMember(memberSymbol);
                }

                boundMemberSymbols.push(memberSymbol);
            }

            return boundMemberSymbols;
        }

        private resolveObjectLiteralMembers(
            objectLiteralDeclaration: PullDecl,
            objectLiteralTypeSymbol: PullTypeSymbol,
            objectLiteralContextualType: PullTypeSymbol,
            objectLiteralMembers: ASTSeparatedList,
            stringIndexerSignature: PullSignatureSymbol,
            numericIndexerSignature: PullSignatureSymbol,
            allMemberTypes: PullTypeSymbol[],
            allNumericMemberTypes: PullTypeSymbol[],
            boundMemberSymbols: PullSymbol[],
            isUsingExistingSymbol: boolean,
            pullTypeContext: PullTypeResolutionContext,
            additionalResults?: PullAdditionalObjectLiteralResolutionData) {

            for (var i = 0, len = objectLiteralMembers.nonSeparatorCount(); i < len; i++) {
                var propertyAssignment = objectLiteralMembers.nonSeparatorAt(i);
                
                var acceptedContextualType = false;
                var assigningSymbol: PullSymbol = null;

                var id = this.getPropertyAssignmentName(propertyAssignment);
                var memberSymbol = boundMemberSymbols[i];

                if (objectLiteralContextualType) {
                    assigningSymbol = this.getMemberSymbol(memberSymbol.name, PullElementKind.SomeValue, objectLiteralContextualType);

                    // Consider index signatures as potential contextual types
                    if (!assigningSymbol) {
                        if (numericIndexerSignature && PullHelpers.isNameNumeric(memberSymbol.name)) {
                            assigningSymbol = numericIndexerSignature;
                        }
                        else if (stringIndexerSignature) {
                            assigningSymbol = stringIndexerSignature;
                        }
                    }

                    if (assigningSymbol) {
                        this.resolveDeclaredSymbol(assigningSymbol, pullTypeContext);

                        var contextualMemberType = assigningSymbol.kind === PullElementKind.IndexSignature ? (<PullSignatureSymbol>assigningSymbol).returnType : assigningSymbol.type;
                        pullTypeContext.pushContextualType(contextualMemberType, pullTypeContext.inProvisionalResolution(), null);

                        acceptedContextualType = true;

                        if (additionalResults) {
                            additionalResults.membersContextTypeSymbols[i] = contextualMemberType;
                        }
                    }
                }

                var propertySymbol = this.resolveAST(propertyAssignment, contextualMemberType != null, pullTypeContext);
                var memberExpr = this.widenType(propertySymbol.type, propertyAssignment, pullTypeContext);

                if (memberExpr.type) {
                    if (memberExpr.type.isGeneric()) {
                        objectLiteralTypeSymbol.setHasGenericMember();
                    }

                    // Add the member to the appropriate member type lists to compute the type of the synthesized index signatures
                    if (stringIndexerSignature) {
                        allMemberTypes.push(memberExpr.type);
                    }
                    if (numericIndexerSignature && PullHelpers.isNameNumeric(memberSymbol.name)) {
                        allNumericMemberTypes.push(memberExpr.type);
                    }
                }

                if (acceptedContextualType) {
                    pullTypeContext.popContextualType();
                }

                var isAccessor = propertyAssignment.nodeType() === SyntaxKind.SetAccessor || propertyAssignment.nodeType() === SyntaxKind.GetAccessor;
                if (!isUsingExistingSymbol) {
                    if (isAccessor) {
                        this.setSymbolForAST(id, memberExpr, pullTypeContext);
                    } else {
                        pullTypeContext.setTypeInContext(memberSymbol, memberExpr.type);
                        memberSymbol.setResolved();

                        this.setSymbolForAST(id, memberSymbol, pullTypeContext);
                    }
                }
            }
        }

        // if there's no type annotation on the assigning AST, we need to create a type from each binary expression
        // in the object literal
        private computeObjectLiteralExpression(
            objectLitAST: ObjectLiteralExpression,
            isContextuallyTyped: boolean,
            context: PullTypeResolutionContext,
            additionalResults?: PullAdditionalObjectLiteralResolutionData): PullSymbol {
            // PULLTODO: Create a decl for the object literal

            // walk the members of the object literal,
            // create fields for each based on the value assigned in

            var objectLitDecl = this.semanticInfoChain.getDeclForAST(objectLitAST);
            Debug.assert(objectLitDecl);

            var typeSymbol = <PullTypeSymbol>this.getSymbolForAST(objectLitAST, context);
            var isUsingExistingSymbol = !!typeSymbol;

            if (!typeSymbol) {
                // TODO: why don't se just use the normal symbol binder for this?
                typeSymbol = new PullTypeSymbol("", PullElementKind.Interface);
                typeSymbol.addDeclaration(objectLitDecl);
                this.setSymbolForAST(objectLitAST, typeSymbol, context);
                objectLitDecl.setSymbol(typeSymbol);
            }

            var propertyAssignments = objectLitAST.propertyAssignments;
            var contextualType: PullTypeSymbol = null;

            if (isContextuallyTyped) {
                contextualType = context.getContextualType();
                this.resolveDeclaredSymbol(contextualType, context);
            }

            var stringIndexerSignature: PullSignatureSymbol = null;
            var numericIndexerSignature: PullSignatureSymbol = null;
            var allMemberTypes: PullTypeSymbol[] = null;
            var allNumericMemberTypes: PullTypeSymbol[] = null;
             
            // Get the index signatures for contextual typing
            if (contextualType) {
                var indexSignatures = this.getBothKindsOfIndexSignatures(contextualType, context);

                stringIndexerSignature = indexSignatures.stringSignature;
                numericIndexerSignature = indexSignatures.numericSignature;

                // Start collecting the types of all the members so we can stamp the object literal with the proper index signatures
                if (stringIndexerSignature) {
                    allMemberTypes = [stringIndexerSignature.returnType];
                }

                if (numericIndexerSignature) {
                    allNumericMemberTypes = [numericIndexerSignature.returnType];
                }
            }

            if (propertyAssignments) {

                if (additionalResults) {
                    additionalResults.membersContextTypeSymbols = [];
                }

                // first bind decls and symbols
                var boundMemberSymbols = this.bindObjectLiteralMembers(
                    objectLitDecl, typeSymbol, propertyAssignments, isUsingExistingSymbol, context);

                // now perform member symbol resolution
                this.resolveObjectLiteralMembers(
                    objectLitDecl,
                    typeSymbol,
                    contextualType,
                    propertyAssignments,
                    stringIndexerSignature,
                    numericIndexerSignature,
                    allMemberTypes,
                    allNumericMemberTypes,
                    boundMemberSymbols,
                    isUsingExistingSymbol,
                    context,
                    additionalResults);

                if (!isUsingExistingSymbol) {
                    this.stampObjectLiteralWithIndexSignature(typeSymbol, allMemberTypes, stringIndexerSignature, context);
                    this.stampObjectLiteralWithIndexSignature(typeSymbol, allNumericMemberTypes, numericIndexerSignature, context);
                }
            }

            typeSymbol.setResolved();
            return typeSymbol;
        }

        private getPropertyAssignmentName(propertyAssignment: AST): AST {
            if (propertyAssignment.nodeType() === SyntaxKind.SimplePropertyAssignment) {
                return (<SimplePropertyAssignment>propertyAssignment).propertyName;
            }
            else if (propertyAssignment.nodeType() === SyntaxKind.FunctionPropertyAssignment) {
                return (<FunctionPropertyAssignment>propertyAssignment).propertyName;
            }
            else if (propertyAssignment.nodeType() === SyntaxKind.GetAccessor) {
                return (<GetAccessor>propertyAssignment).propertyName;
            }
            else if (propertyAssignment.nodeType() === SyntaxKind.SetAccessor) {
                return (<SetAccessor>propertyAssignment).propertyName;
            }
            else {
                Debug.assert(false);
            }
        }

        private stampObjectLiteralWithIndexSignature(objectLiteralSymbol: PullTypeSymbol, indexerTypeCandidates: PullTypeSymbol[],
            contextualIndexSignature: PullSignatureSymbol, context: PullTypeResolutionContext): void {
            if (contextualIndexSignature) {
                var typeCollection: IPullTypeCollection = {
                    getLength: () => indexerTypeCandidates.length,
                    getTypeAtIndex: (index: number) => indexerTypeCandidates[index]
                };
                var decl = objectLiteralSymbol.getDeclarations()[0];
                var indexerReturnType = this.widenType(this.findBestCommonType(typeCollection, context));
                if (indexerReturnType == contextualIndexSignature.returnType) {
                    objectLiteralSymbol.addIndexSignature(contextualIndexSignature);
                }
                else {
                    // Create an index signature
                    this.semanticInfoChain.addSyntheticIndexSignature(decl, objectLiteralSymbol, this.getASTForDecl(decl),
                        contextualIndexSignature.parameters[0].name, /*indexParamType*/ contextualIndexSignature.parameters[0].type, /*returnType*/ indexerReturnType);
                }
            }
        }

        private resolveArrayLiteralExpression(arrayLit: ArrayLiteralExpression, isContextuallyTyped: boolean, context: PullTypeResolutionContext): PullSymbol {
            var symbol = this.getSymbolForAST(arrayLit, context);
            if (!symbol || this.canTypeCheckAST(arrayLit, context)) {
                if (this.canTypeCheckAST(arrayLit, context)) {
                    this.setTypeChecked(arrayLit, context);
                }
                symbol = this.computeArrayLiteralExpressionSymbol(arrayLit, isContextuallyTyped, context);
                this.setSymbolForAST(arrayLit, symbol, context);
            }

            return symbol;
        }

        private computeArrayLiteralExpressionSymbol(arrayLit: ArrayLiteralExpression, isContextuallyTyped: boolean, context: PullTypeResolutionContext): PullSymbol {
            var elements = arrayLit.expressions;
            var elementType: PullTypeSymbol = null;
            var elementTypes: PullTypeSymbol[] = [];
            var comparisonInfo = new TypeComparisonInfo();
            var contextualElementType: PullTypeSymbol = null;
            comparisonInfo.onlyCaptureFirstError = true;

            // if the target type is an array type, extract the element type
            if (isContextuallyTyped) {
                var contextualType = context.getContextualType();

                this.resolveDeclaredSymbol(contextualType, context);

                if (contextualType) {
                    // Get the number indexer if it exists
                    var indexSignatures = this.getBothKindsOfIndexSignatures(contextualType, context);
                    if (indexSignatures.numericSignature) {
                        contextualElementType = indexSignatures.numericSignature.returnType;
                    }
                }
            }

            // Resolve element types
            if (elements) {
                if (contextualElementType) {
                    context.pushContextualType(contextualElementType, context.inProvisionalResolution(), null);
                }

                for (var i = 0, n = elements.nonSeparatorCount(); i < n; i++) {
                    elementTypes.push(this.resolveAST(elements.nonSeparatorAt(i), contextualElementType !== null, context).type);
                }

                if (contextualElementType) {
                    context.popContextualType();
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
                    getLength: () => { return elements.nonSeparatorCount() + 1; },
                    getTypeAtIndex: (index: number) => { return index === elementTypes.length ? contextualElementType : elementTypes[index]; }
                };
            }
            else {
                collection = {
                    getLength: () => { return elements.nonSeparatorCount(); },
                    getTypeAtIndex: (index: number) => { return elementTypes[index]; }
                };
            }

            elementType = elementType ? this.findBestCommonType(collection, context, comparisonInfo) : elementType;

            if (!elementType) {
                elementType = this.semanticInfoChain.undefinedTypeSymbol;
            }

            var arraySymbol = elementType.getArrayType();

            // ...But in case we haven't...
            if (!arraySymbol) {

                arraySymbol = this.createInstantiatedType(this.cachedArrayInterfaceType(), [elementType]);

                if (!arraySymbol) {
                    arraySymbol = this.semanticInfoChain.anyTypeSymbol;
                }

                elementType.setArrayType(arraySymbol);
            }

            return arraySymbol;
        }

        private resolveElementAccessExpression(callEx: ElementAccessExpression, context: PullTypeResolutionContext): PullSymbol {
            var symbolAndDiagnostic = this.computeElementAccessExpressionSymbolAndDiagnostic(callEx, context);

            if (this.canTypeCheckAST(callEx, context)) {
                this.typeCheckElementAccessExpression(callEx, context, symbolAndDiagnostic);
            }

            return symbolAndDiagnostic.symbol;
        }

        private typeCheckElementAccessExpression(callEx: ElementAccessExpression, context: PullTypeResolutionContext, symbolAndDiagnostic: { symbol: PullSymbol; diagnostic?: Diagnostic }): void {
            this.setTypeChecked(callEx, context);
            context.postDiagnostic(symbolAndDiagnostic.diagnostic);
        }

        private computeElementAccessExpressionSymbolAndDiagnostic(callEx: ElementAccessExpression, context: PullTypeResolutionContext): { symbol: PullSymbol; diagnostic?: Diagnostic } {
            // resolve the target
            var targetSymbol = this.resolveAST(callEx.expression, /*isContextuallyTyped:*/ false, context);
            var indexType = this.resolveAST(callEx.argumentExpression, /*isContextuallyTyped:*/ false, context).type;

            var targetTypeSymbol = targetSymbol.type;

            if (this.isAnyOrEquivalent(targetTypeSymbol)) {
                return { symbol: targetTypeSymbol }
            }

            var elementType = targetTypeSymbol.getElementType();

            var isNumberIndex = indexType === this.semanticInfoChain.numberTypeSymbol || PullHelpers.symbolIsEnum(indexType);

            if (elementType && isNumberIndex) {
                return { symbol: elementType };
            }

            // if the index expression is a string literal or a numberic literal and the object expression has
            // a property with that name,  the property access is the type of that property
            if (callEx.argumentExpression.nodeType() === SyntaxKind.StringLiteral || callEx.argumentExpression.nodeType() === SyntaxKind.NumericLiteral) {
                var memberName = callEx.argumentExpression.nodeType() === SyntaxKind.StringLiteral
                    ? stripStartAndEndQuotes((<StringLiteral>callEx.argumentExpression).text())
                    : (<NumericLiteral>callEx.argumentExpression).valueText();

                var member = this.getMemberSymbol(memberName, PullElementKind.SomeValue, targetTypeSymbol);

                if (member) {
                    this.resolveDeclaredSymbol(member, context);

                    return { symbol: member.type };
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
                return { symbol: numberSignature.returnType || this.semanticInfoChain.anyTypeSymbol };
            }
            // otherwise, if the object expression has a string index signature and the index expression is
            // of type Any, the String or Number primitive type or an enum type, the property access of the type of
            // that index signature
            else if (stringSignature && (isNumberIndex || indexType === this.semanticInfoChain.anyTypeSymbol || indexType === this.semanticInfoChain.stringTypeSymbol)) {
                return { symbol: stringSignature.returnType || this.semanticInfoChain.anyTypeSymbol };
            }
            // otherwise, if indexExpr is of type Any, the String or Number primitive type or an enum type,
            // the property access is of type Any
            else if (isNumberIndex || indexType === this.semanticInfoChain.anyTypeSymbol || indexType === this.semanticInfoChain.stringTypeSymbol) {
                return { symbol: this.semanticInfoChain.anyTypeSymbol };
            }
            // otherwise, the property acess is invalid and a compile-time error occurs
            else {
                return {
                    symbol: this.getNewErrorTypeSymbol(),
                    diagnostic: this.semanticInfoChain.diagnosticFromAST(callEx, DiagnosticCode.Value_of_type_0_is_not_indexable_by_type_1, [targetTypeSymbol.toString(), indexType.toString()])
                }
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
                    this.resolveDeclaredSymbol(signature, context);
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

        private resolveBinaryAdditionOperation(binaryExpression: BinaryExpression, context: PullTypeResolutionContext): PullSymbol {
            var lhsExpression = this.resolveAST(binaryExpression.left, /*isContextuallyTyped*/ false, context);
            var lhsType = lhsExpression.type;
            var rhsType = this.resolveAST(binaryExpression.right, /*isContextuallyTyped*/ false, context).type;

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

            if (this.canTypeCheckAST(binaryExpression, context)) {
                this.setTypeChecked(binaryExpression, context);

                if (exprType) {
                    if (binaryExpression.nodeType() === SyntaxKind.AddAssignmentExpression) {
                        // Check if LHS is a valid target
                        if (!this.isReference(binaryExpression.left, lhsExpression)) {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(binaryExpression.left, DiagnosticCode.Invalid_left_hand_side_of_assignment_expression));
                        }

                        this.checkAssignability(binaryExpression.left, exprType, lhsType, context);
                    }
                }
                else {
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(binaryExpression.left, DiagnosticCode.Invalid_expression_types_not_known_to_support_the_addition_operator));
                }
            }

            if (!exprType) {
                exprType = this.semanticInfoChain.anyTypeSymbol;
            }

            return exprType;
        }

        private bestCommonTypeOfTwoTypes(type1: PullTypeSymbol, type2: PullTypeSymbol, context: PullTypeResolutionContext): PullTypeSymbol {
            return this.findBestCommonType({
                getLength() {
                    return 2;
                },
                getTypeAtIndex(index: number) {
                    switch (index) {
                        case 0: return type1;
                        case 1: return type2;
                    }
                }
            }, context);
        }

        private bestCommonTypeOfThreeTypes(type1: PullTypeSymbol, type2: PullTypeSymbol, type3: PullTypeSymbol, context: PullTypeResolutionContext): PullTypeSymbol {
            return this.findBestCommonType({
                getLength() {
                    return 3;
                },
                getTypeAtIndex(index: number) {
                    switch (index) {
                        case 0: return type1;
                        case 1: return type2;
                        case 2: return type3;
                    }
                }
            }, context);
        }

        private resolveLogicalOrExpression(binex: BinaryExpression, isContextuallyTyped: boolean, context: PullTypeResolutionContext): PullSymbol {
            // October 11, 2013:  
            // The || operator permits the operands to be of any type.
            if (this.canTypeCheckAST(binex, context)) {
                // So there's no type checking we actually have to do.
                this.setTypeChecked(binex, context);
            }

            if (isContextuallyTyped) {
                // If the || expression is contextually typed(section 4.19), the operands are 
                // contextually typed by the same type and the result is of the best common type 
                // (section 3.10) of the contextual type and the two operand types.

                var contextualType = context.getContextualType();
                var leftType = this.resolveAST(binex.left, isContextuallyTyped, context).type;
                var rightType = this.resolveAST(binex.right, isContextuallyTyped, context).type;

                return this.bestCommonTypeOfThreeTypes(contextualType, leftType, rightType, context);
            }
            else {
                // If the || expression is not contextually typed, the right operand is contextually 
                // typed by the type of the left operand and the result is of the best common type of 
                // the two operand types.
                var leftType = this.resolveAST(binex.left, /*isContextuallyTyped:*/ false, context).type;

                context.pushContextualType(leftType, context.inProvisionalResolution(), null);
                var rightType = this.resolveAST(binex.right, /*isContextuallyTyped:*/  true, context).type;
                context.popContextualType();

                return this.bestCommonTypeOfTwoTypes(leftType, rightType, context);
            }
        }

        private resolveLogicalAndExpression(binex: BinaryExpression, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(binex, context)) {
                this.setTypeChecked(binex, context);

                this.resolveAST(binex.left, /*isContextuallyTyped:*/ false, context);
            }

            // September 17, 2013: The && operator permits the operands to be of any type and 
            // produces a result of the same type as the second operand.
            return this.resolveAST(binex.right, /*isContextuallyTyped:*/ false, context).type;
        }

        private computeTypeOfConditionalExpression(leftType: PullTypeSymbol, rightType: PullTypeSymbol, isContextuallyTyped: boolean, context: PullTypeResolutionContext): PullTypeSymbol {
            if (isContextuallyTyped) {
                // October 11, 2013
                // If the conditional expression is contextually typed (section 4.19), Expr1 and Expr2 
                // are contextually typed by the same type and the result is of the best common type 
                // (section 3.10) of the contextual type and the types of Expr1 and Expr2. 
                var contextualType = context.getContextualType();
                return this.bestCommonTypeOfThreeTypes(contextualType, leftType, rightType, context);
            }
            else {
                // October 11, 2013
                // If the conditional expression is not contextually typed, the result is of the 
                // best common type of the types of Expr1 and Expr2. 
                return this.bestCommonTypeOfTwoTypes(leftType, rightType, context);
            }
        }

        private resolveConditionalExpression(trinex: ConditionalExpression, isContextuallyTyped: boolean, context: PullTypeResolutionContext): PullSymbol {
            // October 11, 2013
            // If the conditional expression is contextually typed (section 4.19), Expr1 and Expr2 
            // are contextually typed by the same type and the result is of the best common type
            // (section 3.10) of the contextual type and the types of Expr1 and Expr2.  An error 
            // occurs if the best common type is not identical to at least one of the three 
            // candidate types.
            var leftType = this.resolveAST(trinex.whenTrue, isContextuallyTyped, context).type;
            var rightType = this.resolveAST(trinex.whenFalse, isContextuallyTyped, context).type;

            var expressionType = this.computeTypeOfConditionalExpression(leftType, rightType, isContextuallyTyped, context);

            var conditionalTypesAreValid = this.conditionExpressionTypesAreValid(leftType, rightType, expressionType, isContextuallyTyped, context);

            if (this.canTypeCheckAST(trinex, context)) {
                this.setTypeChecked(trinex, context);
                this.resolveAST(trinex.condition, /*isContextuallyTyped:*/ false, context);

                if (!this.conditionExpressionTypesAreValid(leftType, rightType, expressionType, isContextuallyTyped, context)) {
                    if (isContextuallyTyped) {
                        var contextualType = context.getContextualType();
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(trinex,
                            DiagnosticCode.Type_of_conditional_0_must_be_identical_to_1_2_or_3,
                            [expressionType.toString(), leftType.toString(), rightType.toString(), contextualType.toString()]));
                    }
                    else {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(trinex,
                            DiagnosticCode.Type_of_conditional_0_must_be_identical_to_1_or_2,
                            [expressionType.toString(), leftType.toString(), rightType.toString()]));
                    }
                }
            }

            // If the conditional is not valid, then return an error symbol.  That way we won't 
            // report further errors higher up the stack.
            if (!conditionalTypesAreValid) {
                return this.getNewErrorTypeSymbol();
            }

            return expressionType;
        }

        private conditionExpressionTypesAreValid(leftType: PullTypeSymbol, rightType: PullTypeSymbol, expressionType: PullTypeSymbol, isContextuallyTyped: boolean, context: PullTypeResolutionContext): boolean {
            if (isContextuallyTyped) {
                var contextualType = context.getContextualType();
                if (this.typesAreIdentical(expressionType, leftType) ||
                    this.typesAreIdentical(expressionType, rightType) ||
                    this.typesAreIdentical(expressionType, contextualType)) {

                    return true;
                }
            }
            else {
                if (this.typesAreIdentical(expressionType, leftType) ||
                    this.typesAreIdentical(expressionType, rightType)) {

                    return true;
                }
            }
            
            return false;
        }

        private resolveParenthesizedExpression(ast: ParenthesizedExpression, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.setTypeChecked(ast, context);
            }

            // September 17, 2013: A parenthesized expression (Expression) has the same type and 
            // classification as the Expression itself
            return this.resolveAST(ast.expression, /*isContextuallyTyped*/ false, context);
        }

        private resolveExpressionStatement(ast: ExpressionStatement, context: PullTypeResolutionContext): PullSymbol {
            if (this.canTypeCheckAST(ast, context)) {
                this.setTypeChecked(ast, context);

                this.resolveAST(ast.expression, /*isContextuallyTyped:*/ false, context);
            }

            // All statements have the 'void' type.
            return this.semanticInfoChain.voidTypeSymbol;
        }

        public resolveInvocationExpression(callEx: InvocationExpression, context: PullTypeResolutionContext, additionalResults?: PullAdditionalCallResolutionData): PullSymbol {
            var symbol = this.getSymbolForAST(callEx, context);

            if (!symbol || !symbol.isResolved) {
                if (!additionalResults) {
                    additionalResults = new PullAdditionalCallResolutionData();
                }
                symbol = this.computeInvocationExpressionSymbol(callEx, context, additionalResults);
                if (this.canTypeCheckAST(callEx, context)) {
                    this.setTypeChecked(callEx, context);
                }
                if (symbol != this.semanticInfoChain.anyTypeSymbol) {
                    this.setSymbolForAST(callEx, symbol, context);
                }
                this.semanticInfoChain.setCallResolutionDataForAST(callEx, additionalResults);
            }
            else {
                if (this.canTypeCheckAST(callEx, context)) {
                    this.typeCheckInvocationExpression(callEx, context);
                }

                var callResolutionData = this.semanticInfoChain.getCallResolutionDataForAST(callEx);
                if (additionalResults && (callResolutionData != additionalResults)) {
                    additionalResults.actualParametersContextTypeSymbols = callResolutionData.actualParametersContextTypeSymbols;
                    additionalResults.candidateSignature = callResolutionData.candidateSignature;
                    additionalResults.resolvedSignatures = callResolutionData.resolvedSignatures;
                    additionalResults.targetSymbol = callResolutionData.targetSymbol;
                }
            }

            return symbol;
        }

        private typeCheckInvocationExpression(callEx: InvocationExpression, context: PullTypeResolutionContext) {
            this.setTypeChecked(callEx, context);
            var targetSymbol = this.resolveAST(callEx.expression, /*isContextuallyTyped:*/ false, context);

            if (callEx.argumentList.arguments) {
                var callResolutionData = this.semanticInfoChain.getCallResolutionDataForAST(callEx);

                var len = callEx.argumentList.arguments.nonSeparatorCount();
                for (var i = 0; i < len; i++) {
                    // Ensure call resolution data contains additional information. 
                    // Actual parameters context type symbols will be undefined if the call target resolves to any or error types.
                    var contextualType = callResolutionData.actualParametersContextTypeSymbols ? callResolutionData.actualParametersContextTypeSymbols[i] : null;
                    if (contextualType) {
                        context.pushContextualType(contextualType, context.inProvisionalResolution(), null);
                    }

                    this.resolveAST(callEx.argumentList.arguments.nonSeparatorAt(i), contextualType != null, context);

                    if (contextualType) {
                        context.popContextualType();
                        contextualType = null;
                    }
                }
            }

            // Post errors when resolving overload
            for (var i = 0; i < callResolutionData.diagnosticsFromOverloadResolution.length; i++) {
                context.postDiagnostic(callResolutionData.diagnosticsFromOverloadResolution[i]);
            }
        }

        private computeInvocationExpressionSymbol(callEx: InvocationExpression, context: PullTypeResolutionContext, additionalResults: PullAdditionalCallResolutionData): PullSymbol {
            // resolve the target
            var targetSymbol = this.resolveAST(callEx.expression, /*isContextuallyTyped:*/ false, context);
            var targetAST = this.getCallTargetErrorSpanAST(callEx);

            var targetTypeSymbol = targetSymbol.type;
            if (this.isAnyOrEquivalent(targetTypeSymbol)) {
                // Note: targetType is either any or an error.

                // resolve any arguments.
                this.resolveAST(callEx.argumentList.arguments, /*isContextuallyTyped:*/ false, context);

                if (callEx.argumentList.typeArgumentList && callEx.argumentList.typeArgumentList.typeArguments.nonSeparatorCount()) {
                    // Can't invoke 'any' generically.
                    if (targetTypeSymbol === this.semanticInfoChain.anyTypeSymbol) {
                        this.postOverloadResolutionDiagnostics(this.semanticInfoChain.diagnosticFromAST(targetAST, DiagnosticCode.Untyped_function_calls_may_not_accept_type_arguments),
                            additionalResults, context);
                        return this.getNewErrorTypeSymbol();
                    }

                    // Note: if we get here, targetType is an error type.  In that case we don't
                    // want to report *another* error since the user will have already gotten 
                    // the first error about the target not resolving properly.
                }

                return this.semanticInfoChain.anyTypeSymbol;
            }

            var isSuperCall = false;

            if (callEx.expression.nodeType() === SyntaxKind.SuperKeyword) {

                isSuperCall = true;

                if (targetTypeSymbol.isClass()) {
                    targetSymbol = targetTypeSymbol.getConstructorMethod();
                    this.resolveDeclaredSymbol(targetSymbol, context);
                    targetTypeSymbol = targetSymbol.type;
                }
                else {
                    this.postOverloadResolutionDiagnostics(this.semanticInfoChain.diagnosticFromAST(targetAST, DiagnosticCode.Calls_to_super_are_only_valid_inside_a_class),
                        additionalResults, context);
                    this.resolveAST(callEx.argumentList.arguments, /*isContextuallyTyped:*/ false, context);
                    // POST diagnostics
                    return this.getNewErrorTypeSymbol();
                }
            }

            var signatures = isSuperCall ? targetTypeSymbol.getConstructSignatures() : targetTypeSymbol.getCallSignatures();

            if (!signatures.length && (targetTypeSymbol.kind == PullElementKind.ConstructorType)) {
                this.postOverloadResolutionDiagnostics(this.semanticInfoChain.diagnosticFromAST(targetAST, DiagnosticCode.Value_of_type_0_is_not_callable_Did_you_mean_to_include_new, [targetTypeSymbol.toString()]),
                    additionalResults, context);
            }

            var typeArgs: PullTypeSymbol[] = null;
            var typeReplacementMap: PullTypeSymbol[] = null;
            var couldNotFindGenericOverload = false;
            var couldNotAssignToConstraint: boolean;
            var constraintDiagnostic: Diagnostic = null;
            var typeArgumentCountDiagnostic: Diagnostic = null;
            var diagnostics: Diagnostic[] = [];

            // resolve the type arguments, specializing if necessary
            if (callEx.argumentList.typeArgumentList) {

                // specialize the type arguments
                typeArgs = [];

                if (callEx.argumentList.typeArgumentList && callEx.argumentList.typeArgumentList.typeArguments.nonSeparatorCount()) {
                    for (var i = 0; i < callEx.argumentList.typeArgumentList.typeArguments.nonSeparatorCount(); i++) {
                        typeArgs[i] = this.resolveTypeReference(callEx.argumentList.typeArgumentList.typeArguments.nonSeparatorAt(i), context);
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

            var resolvedSignatures: PullSignatureSymbol[] = [];
            var inferredTypeArgs: PullTypeSymbol[];
            var specializedSignature: PullSignatureSymbol;
            var typeParameters: PullTypeParameterSymbol[];
            var typeConstraint: PullTypeSymbol = null;
            var beforeResolutionSignatures = signatures;
            var targetTypeReplacementMap = targetTypeSymbol.getTypeParameterArgumentMap();

            for (var i = 0; i < signatures.length; i++) {
                typeParameters = signatures[i].getTypeParameters();
                couldNotAssignToConstraint = false;

                if (signatures[i].isGeneric() && typeParameters.length) {

                    if (typeArgs) {
                        // October 16, 2013: Section 4.12.2
                        // A generic signature is a candidate in a function call with type arguments
                        // arguments when:
                        // The signature has the same number of type parameters as were supplied in
                        // the type argument list
                        // ...
                        if (typeArgs.length == typeParameters.length) {
                            inferredTypeArgs = typeArgs;
                        }
                        else {
                            typeArgumentCountDiagnostic = typeArgumentCountDiagnostic ||
                            this.semanticInfoChain.diagnosticFromAST(targetAST, DiagnosticCode.Signature_expected_0_type_arguments_got_1_instead,
                                [typeParameters.length, typeArgs.length]);
                            continue;
                        }
                    }
                    else if (!typeArgs && callEx.argumentList.arguments && callEx.argumentList.arguments.nonSeparatorCount()) {
                        inferredTypeArgs = this.inferArgumentTypesForSignature(signatures[i], callEx.argumentList.arguments, new TypeComparisonInfo(), context);
                        triedToInferTypeArgs = true;
                    }
                    else {
                        inferredTypeArgs = [];
                    }

                    // if we could infer Args, or we have type arguments, then attempt to specialize the signature
                    if (inferredTypeArgs) {

                        typeReplacementMap = [];

                        if (inferredTypeArgs.length) {

                            if (inferredTypeArgs.length != typeParameters.length) {
                                continue;
                            }

                            // When specializing the constraints, seed the replacement map with any substitutions already specified by
                            // the target function's type
                            if (targetTypeReplacementMap) {
                                for (var symbolID in targetTypeReplacementMap) {
                                    if (targetTypeReplacementMap.hasOwnProperty(symbolID)) {
                                        typeReplacementMap[symbolID] = targetTypeReplacementMap[symbolID];
                                    }
                                }
                            }

                            for (var j = 0; j < typeParameters.length; j++) {
                                typeReplacementMap[typeParameters[j].pullSymbolID] = inferredTypeArgs[j];
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
                                            else {
                                                typeConstraint = this.instantiateType(typeConstraint, typeReplacementMap);
                                            }
                                        }
                                    }
                                    else if (typeConstraint.isGeneric()) {
                                        typeConstraint = this.instantiateType(typeConstraint, typeReplacementMap);
                                    }

                                    if (!this.sourceIsAssignableToTarget(inferredTypeArgs[j], typeConstraint, context, /*comparisonInfo:*/ null, /*isComparingInstantiatedSignatures:*/ true)) {
                                        constraintDiagnostic = this.semanticInfoChain.diagnosticFromAST(targetAST, DiagnosticCode.Type_0_does_not_satisfy_the_constraint_1_for_type_parameter_2, [inferredTypeArgs[j].toString(/*scopeSymbol*/ null, /*useConstraintInName*/ true), typeConstraint.toString(/*scopeSymbol*/ null, /*useConstraintInName*/ true), typeParameters[j].toString(/*scopeSymbol*/ null, /*useConstraintInName*/ true)]);
                                        couldNotAssignToConstraint = true;
                                    }

                                    if (couldNotAssignToConstraint) {
                                        break;
                                    }
                                }
                            }
                        }
                        else {

                            // if we tried to infer type arguments but could not, this overload should not be considered to be a candidate
                            if (triedToInferTypeArgs) {
                                    continue;
                            }

                            // otherwise, use "{}" for each parameter
                            for (var j = 0; j < typeParameters.length; j++) {
                                typeReplacementMap[typeParameters[j].pullSymbolID] = this.semanticInfoChain.emptyTypeSymbol;
                            }
                        }

                        if (couldNotAssignToConstraint) {
                            continue;
                        }

                        specializedSignature = this.instantiateSignature(signatures[i], typeReplacementMap, true);

                        if (specializedSignature) {
                            resolvedSignatures[resolvedSignatures.length] = specializedSignature;
                        }
                    }
                }
                else {
                    if (!(callEx.argumentList.typeArgumentList && callEx.argumentList.typeArgumentList.typeArguments.nonSeparatorCount())) {
                        resolvedSignatures[resolvedSignatures.length] = signatures[i];
                    }
                }
            }

            if (signatures.length && !resolvedSignatures.length) {
                couldNotFindGenericOverload = true;
            }

            signatures = resolvedSignatures;

            var errorCondition: PullSymbol = null;
            if (!signatures.length) {
                additionalResults.targetSymbol = targetSymbol;
                additionalResults.resolvedSignatures = beforeResolutionSignatures;
                additionalResults.candidateSignature = beforeResolutionSignatures && beforeResolutionSignatures.length ? beforeResolutionSignatures[0] : null;

                additionalResults.actualParametersContextTypeSymbols = actualParametersContextTypeSymbols;

                this.resolveAST(callEx.argumentList.arguments, /*isContextuallyTyped:*/ false, context);

                if (!couldNotFindGenericOverload) {
                    // if there are no call signatures, but the target is a subtype of 'Function', return 'any'
                    if (this.cachedFunctionInterfaceType() && this.sourceIsSubtypeOfTarget(targetTypeSymbol, this.cachedFunctionInterfaceType(), context)) {
                        if (callEx.argumentList.typeArgumentList) {
                            this.postOverloadResolutionDiagnostics(this.semanticInfoChain.diagnosticFromAST(targetAST, DiagnosticCode.Non_generic_functions_may_not_accept_type_arguments),
                                additionalResults, context);
                        }
                        return this.semanticInfoChain.anyTypeSymbol;
                    }

                    this.postOverloadResolutionDiagnostics(this.semanticInfoChain.diagnosticFromAST(callEx, DiagnosticCode.Cannot_invoke_an_expression_whose_type_lacks_a_call_signature),
                        additionalResults, context);
                }
                else if (constraintDiagnostic) {
                    this.postOverloadResolutionDiagnostics(constraintDiagnostic, additionalResults, context);
                }
                else if (typeArgumentCountDiagnostic) {
                    this.postOverloadResolutionDiagnostics(typeArgumentCountDiagnostic, additionalResults, context);
                }
                else {
                    this.postOverloadResolutionDiagnostics(this.semanticInfoChain.diagnosticFromAST(callEx, DiagnosticCode.Could_not_select_overload_for_call_expression),
                        additionalResults, context);
                }

                return this.getNewErrorTypeSymbol();
            }

            var signature = this.resolveOverloads(callEx, signatures, callEx.argumentList.typeArgumentList != null, context, diagnostics);
            var useBeforeResolutionSignatures = signature == null;

            if (!signature) {
                for (var i = 0; i < diagnostics.length; i++) {
                    this.postOverloadResolutionDiagnostics(diagnostics[i], additionalResults, context);
                }

                this.postOverloadResolutionDiagnostics(this.semanticInfoChain.diagnosticFromAST(targetAST, DiagnosticCode.Could_not_select_overload_for_call_expression),
                    additionalResults, context);

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

            if (!signature.isGeneric() && callEx.argumentList.typeArgumentList) {
                this.postOverloadResolutionDiagnostics(this.semanticInfoChain.diagnosticFromAST(targetAST, DiagnosticCode.Non_generic_functions_may_not_accept_type_arguments),
                    additionalResults, context);
            }
            else if (signature.isGeneric() && callEx.argumentList.typeArgumentList && signature.getTypeParameters() && (callEx.argumentList.typeArgumentList.typeArguments.nonSeparatorCount() != signature.getTypeParameters().length)) {
                this.postOverloadResolutionDiagnostics(this.semanticInfoChain.diagnosticFromAST(targetAST, DiagnosticCode.Signature_expected_0_type_arguments_got_1_instead, [signature.getTypeParameters().length, callEx.argumentList.typeArgumentList.typeArguments.nonSeparatorCount()]),
                    additionalResults, context);
            }

            var returnType = isSuperCall ? this.semanticInfoChain.voidTypeSymbol : signature.returnType;

            // contextually type arguments
            var actualParametersContextTypeSymbols: PullTypeSymbol[] = [];
            if (callEx.argumentList.arguments) {
                var len = callEx.argumentList.arguments.nonSeparatorCount();
                var params = signature.parameters;
                var contextualType: PullTypeSymbol = null;
                var signatureDecl = signature.getDeclarations()[0];

                for (var i = 0; i < len; i++) {
                    // account for varargs
                    if (params.length) {
                        if (i < params.length - 1 || (i < params.length && !signature.hasVarArgs)) {
                            this.resolveDeclaredSymbol(params[i], context);
                            contextualType = params[i].type;
                        }
                        else if (signature.hasVarArgs) {
                            contextualType = params[params.length - 1].type;
                            if (contextualType.isArrayNamedTypeReference()) {
                                contextualType = contextualType.getElementType();
                            }
                        }
                    }

                    if (contextualType) {
                        context.pushContextualType(contextualType, context.inProvisionalResolution(), null);
                        actualParametersContextTypeSymbols[i] = contextualType;
                    }

                    this.resolveAST(callEx.argumentList.arguments.nonSeparatorAt(i), contextualType != null, context);

                    if (contextualType) {
                        context.popContextualType();
                        contextualType = null;
                    }
                }
            }

            // Store any additional resolution results if needed before we return
            additionalResults.targetSymbol = targetSymbol;
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

        public resolveObjectCreationExpression(callEx: ObjectCreationExpression, context: PullTypeResolutionContext, additionalResults?: PullAdditionalCallResolutionData): PullSymbol {
            var symbol = this.getSymbolForAST(callEx, context);

            if (!symbol || !symbol.isResolved) {
                if (!additionalResults) {
                    additionalResults = new PullAdditionalCallResolutionData();
                }
                symbol = this.computeObjectCreationExpressionSymbol(callEx, context, additionalResults);
                if (this.canTypeCheckAST(callEx, context)) {
                    this.setTypeChecked(callEx, context);
                }
                this.setSymbolForAST(callEx, symbol, context);
                this.semanticInfoChain.setCallResolutionDataForAST(callEx, additionalResults);
            }
            else {
                if (this.canTypeCheckAST(callEx, context)) {
                    this.typeCheckObjectCreationExpression(callEx, context);
                }

                var callResolutionData = this.semanticInfoChain.getCallResolutionDataForAST(callEx);
                if (additionalResults && (callResolutionData != additionalResults)) {
                    additionalResults.actualParametersContextTypeSymbols = callResolutionData.actualParametersContextTypeSymbols;
                    additionalResults.candidateSignature = callResolutionData.candidateSignature;
                    additionalResults.resolvedSignatures = callResolutionData.resolvedSignatures;
                    additionalResults.targetSymbol = callResolutionData.targetSymbol;
                }
            }

            return symbol;
        }

        private typeCheckObjectCreationExpression(callEx: ObjectCreationExpression, context: PullTypeResolutionContext) {
            this.setTypeChecked(callEx, context);
            this.resolveAST(callEx.expression, /*isContextuallyTyped:*/ false, context);
            var callResolutionData = this.semanticInfoChain.getCallResolutionDataForAST(callEx);
            if (callEx.argumentList) {
                var callResolutionData = this.semanticInfoChain.getCallResolutionDataForAST(callEx);
                var len = callEx.argumentList.arguments.nonSeparatorCount();

                for (var i = 0; i < len; i++) {
                    // Ensure call resolution data contains additional information. 
                    // Actual parameters context type symbols will be undefined if the call target resolves to any or error types.
                    var contextualType = callResolutionData.actualParametersContextTypeSymbols ? callResolutionData.actualParametersContextTypeSymbols[i] : null;
                    if (contextualType) {
                        context.pushContextualType(contextualType, context.inProvisionalResolution(), null);
                    }

                    this.resolveAST(callEx.argumentList.arguments.nonSeparatorAt(i), contextualType != null, context);

                    if (contextualType) {
                        context.popContextualType();
                        contextualType = null;
                    }
                }
            }

            // Post errors when resolving overload
            for (var i = 0; i < callResolutionData.diagnosticsFromOverloadResolution.length; i++) {
                context.postDiagnostic(callResolutionData.diagnosticsFromOverloadResolution[i]);
            }
        }

        private postOverloadResolutionDiagnostics(diagnostic: Diagnostic, additionalResults: PullAdditionalCallResolutionData, context: PullTypeResolutionContext) {
            if (!context.inProvisionalResolution()) {
                additionalResults.diagnosticsFromOverloadResolution.push(diagnostic);
            }
            context.postDiagnostic(diagnostic);
        }

        private computeObjectCreationExpressionSymbol(callEx: ObjectCreationExpression, context: PullTypeResolutionContext, additionalResults: PullAdditionalCallResolutionData): PullSymbol {
            var returnType: PullTypeSymbol = null;

            // resolve the target
            var targetSymbol = this.resolveAST(callEx.expression, /*isContextuallyTyped:*/ false, context);
            var targetTypeSymbol = targetSymbol.isType() ? <PullTypeSymbol>targetSymbol : targetSymbol.type;

            var targetAST = this.getCallTargetErrorSpanAST(callEx);

            var constructSignatures = targetTypeSymbol.getConstructSignatures();

            var typeArgs: PullTypeSymbol[] = null;
            var typeReplacementMap: PullTypeSymbol[] = null;
            var usedCallSignaturesInstead = false;
            var couldNotAssignToConstraint: boolean;
            var constraintDiagnostic: Diagnostic = null;
            var typeArgumentCountDiagnostic: Diagnostic = null;
            var diagnostics: Diagnostic[] = [];

            if (this.isAnyOrEquivalent(targetTypeSymbol)) {
                // resolve any arguments
                if (callEx.argumentList) {
                    this.resolveAST(callEx.argumentList.arguments, /*isContextuallyTyped:*/ false, context);
                }

                return targetTypeSymbol;
            }

            if (!constructSignatures.length) {
                constructSignatures = targetTypeSymbol.getCallSignatures();
                usedCallSignaturesInstead = true;

                // if noImplicitAny flag is set to be true, report an error
                if (this.compilationSettings.noImplicitAny()) {
                    this.postOverloadResolutionDiagnostics(this.semanticInfoChain.diagnosticFromAST(callEx,
                        DiagnosticCode.new_expression_which_lacks_a_constructor_signature_implicitly_has_an_any_type),
                        additionalResults, context);
                }
            }

            if (constructSignatures.length) {
                // resolve the type arguments, specializing if necessary
                if (callEx.argumentList && callEx.argumentList.typeArgumentList) {
                    // specialize the type arguments
                    typeArgs = [];

                    if (callEx.argumentList.typeArgumentList && callEx.argumentList.typeArgumentList.typeArguments.nonSeparatorCount()) {
                        for (var i = 0; i < callEx.argumentList.typeArgumentList.typeArguments.nonSeparatorCount(); i++) {
                            typeArgs[i] = this.resolveTypeReference(callEx.argumentList.typeArgumentList.typeArguments.nonSeparatorAt(i), context);
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
                    var triedToInferTypeArgs: boolean;
                    var targetTypeReplacementMap = targetTypeSymbol.getTypeParameterArgumentMap();

                    for (var i = 0; i < constructSignatures.length; i++) {
                        couldNotAssignToConstraint = false;

                        if (constructSignatures[i].isGeneric()) {
                            typeParameters = constructSignatures[i].getTypeParameters();

                            if (typeArgs) {
                                // October 16, 2013: Section 4.12.2
                                // A generic signature is a candidate in a function call with type arguments
                                // arguments when:
                                // The signature has the same number of type parameters as were supplied in
                                // the type argument list
                                // ...
                                if (typeArgs.length == typeParameters.length) {
                                    inferredTypeArgs = typeArgs;
                                }
                                else {
                                    typeArgumentCountDiagnostic = typeArgumentCountDiagnostic ||
                                        this.semanticInfoChain.diagnosticFromAST(targetAST, DiagnosticCode.Signature_expected_0_type_arguments_got_1_instead,
                                            [typeParameters.length, typeArgs.length]);
                                    continue;
                                }
                            }
                            else if (!typeArgs && callEx.argumentList && callEx.argumentList.arguments && callEx.argumentList.arguments.nonSeparatorCount()) {
                                inferredTypeArgs = this.inferArgumentTypesForSignature(constructSignatures[i], callEx.argumentList.arguments, new TypeComparisonInfo(), context);
                                triedToInferTypeArgs = true;
                            }
                            else {
                                inferredTypeArgs = [];
                            }

                            // if we could infer Args, or we have type arguments, then attempt to specialize the signature
                            if (inferredTypeArgs) {

                                typeReplacementMap = [];

                                if (inferredTypeArgs.length) {

                                    if (inferredTypeArgs.length < typeParameters.length) {
                                        continue;
                                    }

                                    // When specializing the constraints, seed the replacement map with any substitutions already specified by
                                    // the target function's type
                                    if (targetTypeReplacementMap) {
                                        for (var symbolID in targetTypeReplacementMap) {
                                            if (targetTypeReplacementMap.hasOwnProperty(symbolID)) {
                                                typeReplacementMap[symbolID] = targetTypeReplacementMap[symbolID];
                                            }
                                        }
                                    }

                                    for (var j = 0; j < typeParameters.length; j++) {
                                        typeReplacementMap[typeParameters[j].pullSymbolID] = inferredTypeArgs[j];
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
                                                    else {
                                                        typeConstraint = this.instantiateType(typeConstraint, typeReplacementMap);
                                                    }
                                                }
                                            }
                                            else if (typeConstraint.isGeneric()) {
                                                typeConstraint = this.instantiateType(typeConstraint, typeReplacementMap);
                                            }

                                            if (!this.sourceIsAssignableToTarget(inferredTypeArgs[j], typeConstraint, context, null, /*isComparingInstantiatedSignatures:*/ true)) {
                                                constraintDiagnostic = this.semanticInfoChain.diagnosticFromAST(targetAST, DiagnosticCode.Type_0_does_not_satisfy_the_constraint_1_for_type_parameter_2, [inferredTypeArgs[j].toString(/*scopeSymbol*/ null, /*useConstraintInName*/ true), typeConstraint.toString(/*scopeSymbol*/ null, /*useConstraintInName*/ true), typeParameters[j].toString(/*scopeSymbol*/ null, /*useConstraintInName*/ true)]);
                                                couldNotAssignToConstraint = true;
                                            }

                                            if (couldNotAssignToConstraint) {
                                                break;
                                            }

                                        }
                                    }
                                }
                                else {

                                    if (triedToInferTypeArgs) {
                                            continue;
                                    } else {
                                        for (var j = 0; j < typeParameters.length; j++) {
                                            typeReplacementMap[typeParameters[j].pullSymbolID] = this.semanticInfoChain.emptyTypeSymbol;
                                        }
                                    }
                                }

                                if (couldNotAssignToConstraint) {
                                    continue;
                                }

                                specializedSignature = this.instantiateSignature(constructSignatures[i], typeReplacementMap, true);

                                if (specializedSignature) {
                                    resolvedSignatures[resolvedSignatures.length] = specializedSignature;
                                }
                            }
                        }
                        else {
                            if (!(callEx.argumentList && callEx.argumentList.typeArgumentList && callEx.argumentList.typeArgumentList.typeArguments.nonSeparatorCount())) {
                                resolvedSignatures[resolvedSignatures.length] = constructSignatures[i];
                            }
                        }
                    }

                    // PULLTODO: Try to avoid copying here...
                    constructSignatures = resolvedSignatures;
                }

                var signature = this.resolveOverloads(callEx, constructSignatures, callEx.argumentList && callEx.argumentList.typeArgumentList != null, context, diagnostics);

                // Store any additional resolution results if needed before we return
                additionalResults.targetSymbol = targetSymbol;
                additionalResults.resolvedSignatures = constructSignatures;
                additionalResults.candidateSignature = signature;
                additionalResults.actualParametersContextTypeSymbols = [];

                if (!constructSignatures.length) {

                    if (constraintDiagnostic) {
                        this.postOverloadResolutionDiagnostics(constraintDiagnostic, additionalResults, context);
                    }
                    else if (typeArgumentCountDiagnostic) {
                        this.postOverloadResolutionDiagnostics(typeArgumentCountDiagnostic, additionalResults, context);
                    }

                    return this.getNewErrorTypeSymbol();
                }

                var errorCondition: PullSymbol = null;

                // if we haven't been able to choose an overload, default to the first one
                if (!signature) {

                    for (var i = 0; i < diagnostics.length; i++) {
                        this.postOverloadResolutionDiagnostics(diagnostics[i], additionalResults, context);
                    }

                    this.postOverloadResolutionDiagnostics(this.semanticInfoChain.diagnosticFromAST(targetAST, DiagnosticCode.Could_not_select_overload_for_new_expression),
                        additionalResults, context);

                    // Remember the error
                    errorCondition = this.getNewErrorTypeSymbol();

                    if (!constructSignatures.length) {
                        // POST diagnostics
                        return errorCondition;
                    }

                    // First, pick the first signature as the candidate signature
                    signature = constructSignatures[0];
                }

                returnType = signature.returnType;

                // if it's a default constructor, and we have a type argument, we need to specialize
                if (returnType && !signature.isGeneric() && returnType.isGeneric() && !returnType.getIsSpecialized()) {
                    if (typeArgs && typeArgs.length) {
                        returnType = this.createInstantiatedType(returnType, typeArgs);
                    }
                    else {
                        returnType = this.instantiateTypeToAny(returnType, context);
                    }
                }

                if (usedCallSignaturesInstead) {
                    if (returnType != this.semanticInfoChain.voidTypeSymbol) {
                        this.postOverloadResolutionDiagnostics(this.semanticInfoChain.diagnosticFromAST(targetAST, DiagnosticCode.Call_signatures_used_in_a_new_expression_must_have_a_void_return_type),
                            additionalResults, context);
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
                if (callEx.argumentList && callEx.argumentList.arguments) {
                    var len = callEx.argumentList.arguments.nonSeparatorCount();
                    var params = signature.parameters;
                    var contextualType: PullTypeSymbol = null;
                    var signatureDecl = signature.getDeclarations()[0];

                    for (var i = 0; i < len; i++) {

                        if (params.length) {
                            if (i < params.length - 1 || (i < params.length && !signature.hasVarArgs)) {
                                this.resolveDeclaredSymbol(params[i], context);
                                contextualType = params[i].type;
                            }
                            else if (signature.hasVarArgs) {
                                contextualType = params[params.length - 1].type;
                                if (contextualType.isArrayNamedTypeReference()) {
                                    contextualType = contextualType.getElementType();
                                }
                            }
                        }

                        if (contextualType) {
                            context.pushContextualType(contextualType, context.inProvisionalResolution(), null);
                            actualParametersContextTypeSymbols[i] = contextualType;
                        }

                        this.resolveAST(callEx.argumentList.arguments.nonSeparatorAt(i), contextualType != null, context);

                        if (contextualType) {
                            context.popContextualType();
                            contextualType = null;
                        }
                    }
                }

                // Store any additional resolution results if needed before we return
                additionalResults.targetSymbol = targetSymbol;
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
            }
            else if (callEx.argumentList) {
                this.resolveAST(callEx.argumentList.arguments, /*isContextuallyTyped:*/ false, context);
            }

            this.postOverloadResolutionDiagnostics(this.semanticInfoChain.diagnosticFromAST(targetAST, DiagnosticCode.Invalid_new_expression),
                additionalResults, context);

            // POST diagnostics
            return this.getNewErrorTypeSymbol();
        }

        private instantiateSignatureInContext(signatureA: PullSignatureSymbol, signatureB: PullSignatureSymbol, context: PullTypeResolutionContext): PullSignatureSymbol {

            var typeReplacementMap: PullTypeSymbol[] = [];
            var inferredTypeArgs: PullTypeSymbol[];
            var specializedSignature: PullSignatureSymbol;
            var typeParameters: PullTypeParameterSymbol[] = signatureA.getTypeParameters();
            var typeConstraint: PullTypeSymbol = null;

            // create a type argument list based on the parameters of signatureB
            var signatureAST = this.semanticInfoChain.getASTForDecl(signatureB.getDeclarations()[0]);
            inferredTypeArgs = this.inferArgumentTypesForSignature(signatureA, getParameterList(signatureAST).parameters, new TypeComparisonInfo, context);

            var functionTypeA = signatureA.functionType;
            var functionTypeB = signatureB.functionType;
            var enclosingTypeParameterMap: PullTypeSymbol[];

            if (functionTypeA) {
                enclosingTypeParameterMap = functionTypeA.getTypeParameterArgumentMap();

                for (var id in enclosingTypeParameterMap) {
                    typeReplacementMap[id] = enclosingTypeParameterMap[id];
                }
            }

            if (functionTypeB) {
                enclosingTypeParameterMap = functionTypeB.getTypeParameterArgumentMap();

                for (var id in enclosingTypeParameterMap) {
                    typeReplacementMap[id] = enclosingTypeParameterMap[id];
                }
            }

            for (var i = 0; i < typeParameters.length; i++) {
                typeReplacementMap[typeParameters[i].pullSymbolID] = inferredTypeArgs[i];
            }
            for (var i = 0; i < typeParameters.length; i++) {
                typeConstraint = typeParameters[i].getConstraint();

                // test specialization type for assignment compatibility with the constraint
                if (typeConstraint) {
                    if (typeConstraint.isTypeParameter()) {
                        for (var j = 0; j < typeParameters.length && j < inferredTypeArgs.length; j++) {
                            if (typeParameters[j] == typeConstraint) {
                                typeConstraint = inferredTypeArgs[j];
                            }
                        }
                    }
                    else if (typeConstraint.isGeneric()) {
                        typeConstraint = PullInstantiatedTypeReferenceSymbol.create(this, typeConstraint, typeReplacementMap);
                    }

                    if (!this.sourceIsAssignableToTarget(inferredTypeArgs[i], typeConstraint, context, null, /*isComparingInstantiatedSignatures:*/ true)) {
                        // if the signature is not assignable due to a constraint mismatch, it may be because the two signatures are identical
                        // (hence, no inferences could be made for the signature's type parameters)
                        if (this.signaturesAreIdentical(signatureA, signatureB, true)) {
                            return signatureA;
                        }
                        else {
                            return null;
                        }
                    }
                }
            }

            return this.instantiateSignature(signatureA, typeReplacementMap, true);
        }

        private resolveCastExpression(assertionExpression: CastExpression, context: PullTypeResolutionContext): PullTypeSymbol {
            var typeAssertionType = this.resolveTypeReference(assertionExpression.type, context).type;

            if (this.canTypeCheckAST(assertionExpression, context)) {
                this.typeCheckCastExpression(assertionExpression, context, typeAssertionType);
            }

            // October 11, 2013: 
            // In a type assertion expression of the form < T > e, e is contextually typed (section 
            // 4.19) by T and the resulting type of e is required to be assignable to or from T, or
            // otherwise a compile - time error occurs.
            //
            // The type of the result is T.
            return typeAssertionType;
        }

        private typeCheckCastExpression(assertionExpression: CastExpression, context: PullTypeResolutionContext, typeAssertionType: PullTypeSymbol): void {
            this.setTypeChecked(assertionExpression, context);

            // October 11, 2013: 
            // In a type assertion expression of the form < T > e, e is contextually typed (section 
            // 4.19) by T and the resulting type of e is required to be assignable to or from T, or
            // otherwise a compile - time error occurs.
            //
            // The type of the result is T.

            context.pushContextualType(typeAssertionType, context.inProvisionalResolution(), null);
            var exprType = this.resolveAST(assertionExpression.expression, /*isContextuallyTyped:*/ true, context).type;
            context.popContextualType();

            // TODO: why are we resolving these symbols here?
            this.resolveDeclaredSymbol(typeAssertionType, context);
            this.resolveDeclaredSymbol(exprType, context);

            var comparisonInfo = new TypeComparisonInfo();

            var isAssignable =
                this.sourceIsAssignableToTarget(typeAssertionType, exprType, context, comparisonInfo) ||
                this.sourceIsAssignableToTarget(exprType, typeAssertionType, context, comparisonInfo);

            if (!isAssignable) {
                if (comparisonInfo.message) {
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(assertionExpression, DiagnosticCode.Cannot_convert_0_to_1_NL_2, [exprType.toString(), typeAssertionType.toString(), comparisonInfo.message]));
                } else {
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(assertionExpression, DiagnosticCode.Cannot_convert_0_to_1, [exprType.toString(), typeAssertionType.toString()]));
                }
            }
        }

        private resolveAssignmentExpression(binaryExpression: BinaryExpression, context: PullTypeResolutionContext): PullSymbol {
            // September 17, 2013: An assignment of the form
            //
            //      VarExpr = ValueExpr
            //
            // requires VarExpr to be classified as a reference(section 4.1).ValueExpr is 
            // contextually typed(section 4.19) by the type of VarExpr, and the type of ValueExpr 
            // must be assignable to(section 3.8.4) the type of VarExpr, or otherwise a compile - 
            // time error occurs.The result is a value with the type of ValueExpr.

            var leftExpr = this.resolveAST(binaryExpression.left, /*isContextuallyTyped:*/ false, context);
            var leftType = leftExpr.type;

            context.pushContextualType(leftType, context.inProvisionalResolution(), /*substitutions*/null);
            var rightType = this.resolveAST(binaryExpression.right, true, context).type;
            context.popContextualType();

            rightType = this.getInstanceTypeForAssignment(binaryExpression.left, rightType, context);

            // Check if LHS is a valid target
            if (this.canTypeCheckAST(binaryExpression, context)) {
                this.setTypeChecked(binaryExpression, context);

                if (!this.isReference(binaryExpression.left, leftExpr)) {
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(binaryExpression.left, DiagnosticCode.Invalid_left_hand_side_of_assignment_expression));
                }
                else {
                    this.checkAssignability(binaryExpression.left, rightType, leftExpr.type, context);
                }
            }

            return rightType;
        }

        private getInstanceTypeForAssignment(lhs: AST, type: PullTypeSymbol, context: PullTypeResolutionContext): PullTypeSymbol {
            var typeToReturn = type;
            if (typeToReturn && typeToReturn.isAlias()) {
                typeToReturn = (<PullTypeAliasSymbol>typeToReturn).getExportAssignedTypeSymbol();
            }

            if (typeToReturn && typeToReturn.isContainer() && !typeToReturn.isEnum()) {
                var instanceTypeSymbol = (<PullContainerSymbol>typeToReturn).getInstanceType();

                if (!instanceTypeSymbol) {
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(lhs, DiagnosticCode.Tried_to_set_variable_type_to_uninitialized_module_type_0, [type.toString()]));
                    typeToReturn = null;
                }
                else {
                    typeToReturn = instanceTypeSymbol;
                }
            }

            return typeToReturn;
        }

        // type relationships

        private chooseCommonType(a: PullTypeSymbol, b: PullTypeSymbol, context: PullTypeResolutionContext, comparisonInfo?: TypeComparisonInfo): PullTypeSymbol {
            if (!(a || b)) {
                return null;
            }
            if (!a) {
                return b;
            }
            if (!b) {
                return a;
            }
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
            else if (this.sourceIsSubtypeOfTarget(a, b, context, comparisonInfo)) {
                return b;
            }
            else if (this.sourceIsSubtypeOfTarget(b, a, context, comparisonInfo)) {
                return a;
            }

            return null;
        }

        public widenType(type: PullTypeSymbol, ast?: AST, context?: PullTypeResolutionContext): PullTypeSymbol {
            if (type === this.semanticInfoChain.undefinedTypeSymbol ||
                type === this.semanticInfoChain.nullTypeSymbol ||
                type.isError()) {

                return this.semanticInfoChain.anyTypeSymbol;
            }

            if (type.isArrayNamedTypeReference()) {
                var elementType = this.widenType(type.getElementType(), null, context);

                if (this.compilationSettings.noImplicitAny() && ast && ast.nodeType() === SyntaxKind.ArrayLiteralExpression) {
                    // If we widened from non-'any' type to 'any', then report error.
                    if (elementType === this.semanticInfoChain.anyTypeSymbol && type.getElementType() !== this.semanticInfoChain.anyTypeSymbol) {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(ast, DiagnosticCode.Array_Literal_implicitly_has_an_any_type_from_widening));
                    }
                }


                var arraySymbol = elementType.getArrayType();

                // otherwise, create a new array symbol
                if (!arraySymbol) {
                    // for each member in the array interface symbol, substitute in the the typeDecl symbol for "_element"

                    arraySymbol = this.createInstantiatedType(this.cachedArrayInterfaceType(), [elementType]);

                    if (!arraySymbol) {
                        arraySymbol = this.semanticInfoChain.anyTypeSymbol;
                    }
                }

                return arraySymbol;
            }

            return type;
        }

        public findBestCommonType(collection: IPullTypeCollection, context: PullTypeResolutionContext, comparisonInfo?: TypeComparisonInfo) {
            var len = collection.getLength();
            var bestCommonType: PullTypeSymbol = null;

            // We set i = Math.max(i, j) + 1 in the incrementor as an optimization. If we did not converge on a type in the inner loop,
            // then every type that we tried in the inner loop would not be a suitable candidate. Therefore there is no point in
            // trying them.
            for (var i = 0, j = 0; i < len; i = Math.max(i, j) + 1) {
                bestCommonType = collection.getTypeAtIndex(i);

                for (j = 0; j < len; j++) {

                    // no use in comparing a type against itself
                    if (i == j) {
                        continue;
                    }

                    bestCommonType = this.chooseCommonType(bestCommonType, collection.getTypeAtIndex(j), context, comparisonInfo);

                    // If there is no common type, try starting again with the next type in the collection
                    if (bestCommonType === null || this.isAnyOrEquivalent(bestCommonType)) {
                        break;
                    }
                }

                // If we've found a type by this point, it is the best common type
                if (bestCommonType) {
                    return bestCommonType;
                }
            }

            // October 16, 2013: It is possible that no such [common] type exists or more than one
            // such type exists, in which case the best common type is an empty object type.
            return this.semanticInfoChain.emptyTypeSymbol;
        }

        // Type Identity

        public typesAreIdentical(t1: PullTypeSymbol, t2: PullTypeSymbol, val?: AST) {

            if (t1 && t1.isTypeReference()) {
                t1 = (<PullTypeReferenceSymbol>t1).getReferencedTypeSymbol();
            }

            if (t2 && t2.isTypeReference()) {
                t2 = (<PullTypeReferenceSymbol>t2).getReferencedTypeSymbol();
            }

            // This clause will cover both primitive types (since the type objects are shared),
            // as well as shared brands
            if (t1 === t2) {
                return true;
            }

            if (!t1 || !t2) {
                return false;
            }

            if (val && t1.isPrimitive() && (<PullPrimitiveTypeSymbol>t1).isStringConstant() && t2 === this.semanticInfoChain.stringTypeSymbol) {
                return (val.nodeType() === SyntaxKind.StringLiteral) && (stripStartAndEndQuotes((<StringLiteral>val).text()) === stripStartAndEndQuotes(t1.name));
            }

            if (val && t2.isPrimitive() && (<PullPrimitiveTypeSymbol>t2).isStringConstant() && t2 === this.semanticInfoChain.stringTypeSymbol) {
                return (val.nodeType() === SyntaxKind.StringLiteral) && (stripStartAndEndQuotes((<StringLiteral>val).text()) === stripStartAndEndQuotes(t2.name));
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

            if (t1.isTypeParameter() != t2.isTypeParameter()) {
                return false;
            }
            else if (t1.isTypeParameter()) {

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

            if (this.identicalCache.valueAt(t1.pullSymbolID, t2.pullSymbolID) != undefined) {
                return true;
            }

            // If one is an enum, and they're not the same type, they're not identical
            if ((t1.kind & PullElementKind.Enum) || (t2.kind & PullElementKind.Enum)) {
                return t1.getAssociatedContainerType() === t2 || t2.getAssociatedContainerType() === t1;
            }

            if (t1.isPrimitive() != t2.isPrimitive()) {
                return false;
            }

            this.identicalCache.setValueAt(t1.pullSymbolID, t2.pullSymbolID, false);

            // properties are identical in name, optionality, and type
            if (t1.hasMembers() && t2.hasMembers()) {
                var t1Members = t1.getMembers();
                var t2Members = t2.getMembers();

                if (t1Members.length != t2Members.length) {
                    this.identicalCache.setValueAt(t1.pullSymbolID, t2.pullSymbolID, undefined);
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
                        this.identicalCache.setValueAt(t1.pullSymbolID, t2.pullSymbolID, undefined);
                        return false;
                    }

                    t1MemberType = t1MemberSymbol.type;
                    t2MemberType = t2MemberSymbol.type;


                    // catch the mutually recursive or cached cases
                    if (t1MemberType && t2MemberType) {

                        if (this.identicalCache.valueAt(t1MemberType.pullSymbolID, t2MemberType.pullSymbolID) != undefined) {
                            continue;
                        }

                        var t1PropGenerativeTypeKind = t1MemberType.getGenerativeTypeClassification(t1);
                        var t2PropGenerativeTypeKind = t2MemberType.getGenerativeTypeClassification(t2);

                        if (t1PropGenerativeTypeKind == GenerativeTypeClassification.InfinitelyExpanding ||
                            t2PropGenerativeTypeKind == GenerativeTypeClassification.InfinitelyExpanding) {
                            return this.infinitelyExpandingTypesAreIdentical(t1MemberType, t2MemberType);
                        }
                    }

                    if (!this.typesAreIdentical(t1MemberType, t2MemberType)) {
                        this.identicalCache.setValueAt(t1.pullSymbolID, t2.pullSymbolID, undefined);
                        return false;
                    }
                }
            }
            else if (t1.hasMembers() || t2.hasMembers()) {
                this.identicalCache.setValueAt(t1.pullSymbolID, t2.pullSymbolID, undefined);
                return false;
            }

            var t1CallSigs = t1.getCallSignatures();
            var t2CallSigs = t2.getCallSignatures();

            var t1ConstructSigs = t1.getConstructSignatures();
            var t2ConstructSigs = t2.getConstructSignatures();

            var t1IndexSigs = t1.getIndexSignatures();
            var t2IndexSigs = t2.getIndexSignatures();

            if (!this.signatureGroupsAreIdentical(t1CallSigs, t2CallSigs)) {
                this.identicalCache.setValueAt(t1.pullSymbolID, t2.pullSymbolID, undefined);
                return false;
            }

            if (!this.signatureGroupsAreIdentical(t1ConstructSigs, t2ConstructSigs)) {
                this.identicalCache.setValueAt(t1.pullSymbolID, t2.pullSymbolID, undefined);
                return false;
            }

            if (!this.signatureGroupsAreIdentical(t1IndexSigs, t2IndexSigs)) {
                this.identicalCache.setValueAt(t1.pullSymbolID, t2.pullSymbolID, undefined);
                return false;
            }

            this.identicalCache.setValueAt(t1.pullSymbolID, t2.pullSymbolID, true);
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
            if (s1 === s2) {
                return true;
            }

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

            if (s1.parameters.length != s2.parameters.length) {
                return false;
            }

            // Ensure that both signatures are resolved
            this.resolveDeclaredSymbol(s1);
            this.resolveDeclaredSymbol(s2);

            var s1Params = s1.parameters;
            var s2Params = s2.parameters;

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

        private substituteUpperBoundForType(type: PullTypeSymbol) {
            if (!type || !type.isTypeParameter()) {
                return type;
            }

            var constraint = (<PullTypeParameterSymbol>type).getConstraint();

            if (constraint && (constraint != type)) {
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

            // if these are two type references referencing the same base type, then they must be two different instantiations of a generic
            // type (if they were not, we never would have gotten to this point)
            if (source.isTypeReference() && target.isTypeReference()) {
                if ((<PullTypeReferenceSymbol>source).referencedTypeSymbol.hasBase((<PullTypeReferenceSymbol>target).referencedTypeSymbol)) {
                    var sourceTypeArguments = (<PullTypeReferenceSymbol>source).getTypeArguments();
                    var targetTypeArguments = (<PullTypeReferenceSymbol>target).getTypeArguments();

                    if (!(sourceTypeArguments && targetTypeArguments) || sourceTypeArguments.length != targetTypeArguments.length) {
                        return false;
                    }

                    for (var i = 0; i < targetTypeArguments.length; i++) {
                        if (!this.sourceExtendsTarget(sourceTypeArguments[i], targetTypeArguments[i], context)) {
                            return false;
                        }
                    }

                    return true;
                }
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
                var extendsSymbol: PullTypeSymbol = null;

                for (var i = 0; i < sourceDecls.length; i++) {
                    var sourceAST = <ClassDeclaration>this.semanticInfoChain.getASTForDecl(sourceDecls[i]);
                    var extendsClause = getExtendsHeritageClause(sourceAST.heritageClauses);

                    if (extendsClause) {
                        for (var j = 0; j < extendsClause.typeNames.nonSeparatorCount(); j++) {
                            extendsSymbol = <PullTypeSymbol>this.semanticInfoChain.getSymbolForAST(extendsClause.typeNames.nonSeparatorAt(j));

                            if (extendsSymbol && (extendsSymbol == target || this.sourceExtendsTarget(extendsSymbol, target, context))) {
                                return true;
                            }
                        }
                    }
                }
            }

            return false;
        }

        private sourceIsSubtypeOfTarget(source: PullTypeSymbol, target: PullTypeSymbol, context: PullTypeResolutionContext, comparisonInfo?: TypeComparisonInfo, isComparingInstantiatedSignatures?: boolean) {
            return this.sourceIsRelatableToTarget(source, target, false, this.subtypeCache, context, comparisonInfo, isComparingInstantiatedSignatures);
        }

        private sourceMembersAreSubtypeOfTargetMembers(source: PullTypeSymbol, target: PullTypeSymbol, context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo, isComparingInstantiatedSignatures?: boolean) {
            return this.sourceMembersAreRelatableToTargetMembers(source, target, false, this.subtypeCache, context, comparisonInfo, isComparingInstantiatedSignatures);
        }

        private sourcePropertyIsSubtypeOfTargetProperty(source: PullTypeSymbol, target: PullTypeSymbol,
            sourceProp: PullSymbol, targetProp: PullSymbol, context: PullTypeResolutionContext,
            comparisonInfo: TypeComparisonInfo, isComparingInstantiatedSignatures?: boolean) {
            return this.sourcePropertyIsRelatableToTargetProperty(source, target, sourceProp, targetProp,
                false, this.subtypeCache, context, comparisonInfo, isComparingInstantiatedSignatures);
        }

        private sourceCallSignaturesAreSubtypeOfTargetCallSignatures(source: PullTypeSymbol, target: PullTypeSymbol,
            context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo, isComparingInstantiatedSignatures?: boolean) {
                return this.sourceCallSignaturesAreRelatableToTargetCallSignatures(source, target, false, this.subtypeCache, context, comparisonInfo, isComparingInstantiatedSignatures);
        }

        private sourceConstructSignaturesAreSubtypeOfTargetConstructSignatures(source: PullTypeSymbol, target: PullTypeSymbol,
            context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo, isComparingInstantiatedSignatures?: boolean) {
                return this.sourceConstructSignaturesAreRelatableToTargetConstructSignatures(source, target, false, this.subtypeCache, context, comparisonInfo, isComparingInstantiatedSignatures);
        }

        private sourceIndexSignaturesAreSubtypeOfTargetIndexSignatures(source: PullTypeSymbol, target: PullTypeSymbol,
            context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo, isComparingInstantiatedSignatures?: boolean) {
                return this.sourceIndexSignaturesAreRelatableToTargetIndexSignatures(source, target, false, this.subtypeCache, context, comparisonInfo, isComparingInstantiatedSignatures);
        }

        private typeIsSubtypeOfFunction(source: PullTypeSymbol, context: PullTypeResolutionContext): boolean {
            // Note that object types containing one or more call or construct signatures are 
            // automatically subtypes of the ‘Function’ interface type, as described in section 3.3.
            if (source.getCallSignatures().length || source.getConstructSignatures().length) {
                return true;
            }

            return this.cachedFunctionInterfaceType() &&
                this.sourceIsSubtypeOfTarget(source, this.cachedFunctionInterfaceType(), context);
        }

        private signatureIsSubtypeOfTarget(s1: PullSignatureSymbol, s2: PullSignatureSymbol, context: PullTypeResolutionContext, comparisonInfo?: TypeComparisonInfo, isComparingInstantiatedSignatures?: boolean) {
            return this.signatureIsRelatableToTarget(s1, s2, false, this.subtypeCache, context, comparisonInfo, isComparingInstantiatedSignatures);
        }

        private sourceIsAssignableToTarget(source: PullTypeSymbol, target: PullTypeSymbol, context: PullTypeResolutionContext, comparisonInfo?: TypeComparisonInfo, isComparingInstantiatedSignatures?: boolean): boolean {
            return this.sourceIsRelatableToTarget(source, target, true, this.assignableCache, context, comparisonInfo, isComparingInstantiatedSignatures);
        }

        private signatureIsAssignableToTarget(s1: PullSignatureSymbol, s2: PullSignatureSymbol, context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo, isComparingInstantiatedSignatures?: boolean): boolean {
            return this.signatureIsRelatableToTarget(s1, s2, true, this.assignableCache, context, comparisonInfo, isComparingInstantiatedSignatures);
        }

        private sourceIsRelatableToTarget(source: PullTypeSymbol, target: PullTypeSymbol, assignableTo: boolean, comparisonCache: IBitMatrix, context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo, isComparingInstantiatedSignatures: boolean): boolean {

            // REVIEW: Does this check even matter?
            //if (this.typesAreIdentical(source, target)) {
            //    return true;
            //}

            if (source && source.isTypeReference() && !source.getIsSpecialized()) {
                source = (<PullTypeReferenceSymbol>source).getReferencedTypeSymbol();
            }

            if (target && target.isTypeReference() && !target.getIsSpecialized()) {
                target = (<PullTypeReferenceSymbol>target).getReferencedTypeSymbol();
            }

            if (source === target) {
                return true;
            }

            // An error has already been reported in this case
            if (!(source && target)) {
                return true;
            }

            var sourceSubstitution: PullTypeSymbol = source;

            // We substitute for the source in the following ways:
            //  - When source is the primitive type Number, Boolean, or String, sourceSubstitution is the global interface type
            //      'Number', 'Boolean', or 'String'
            //  - When source is an enum type, sourceSubstitution is the global interface type 'Number'
            //  - When source is a type parameter, sourceSubstituion is the constraint of that type parameter
            if (source == this.semanticInfoChain.stringTypeSymbol && this.cachedStringInterfaceType()) {
                this.resolveDeclaredSymbol(this.cachedStringInterfaceType(), context);
                sourceSubstitution = this.cachedStringInterfaceType();
            }
            else if (source == this.semanticInfoChain.numberTypeSymbol && this.cachedNumberInterfaceType()) {
                this.resolveDeclaredSymbol(this.cachedNumberInterfaceType(), context);
                sourceSubstitution = this.cachedNumberInterfaceType();
            }
            else if (source == this.semanticInfoChain.booleanTypeSymbol && this.cachedBooleanInterfaceType()) {
                this.resolveDeclaredSymbol(this.cachedBooleanInterfaceType(), context);
                sourceSubstitution = this.cachedBooleanInterfaceType();
            }
            else if (PullHelpers.symbolIsEnum(source) && this.cachedNumberInterfaceType()) {
                sourceSubstitution = this.cachedNumberInterfaceType();
            }
            else if (source.isTypeParameter()) {
                sourceSubstitution = this.substituteUpperBoundForType(source);
            }

            // var comboId = source.pullSymbolIDString + "#" + target.pullSymbolIDString;

            // In the case of a 'false', we want to short-circuit a recursive typecheck
            if (comparisonCache.valueAt(source.pullSymbolID, target.pullSymbolID) != undefined) {
                return true;
            }

            if (source === this.semanticInfoChain.stringTypeSymbol && target.isPrimitive() && (<PullPrimitiveTypeSymbol>target).isStringConstant()) {
                return comparisonInfo &&
                    comparisonInfo.stringConstantVal &&
                    (comparisonInfo.stringConstantVal.nodeType() === SyntaxKind.StringLiteral) &&
                    (stripStartAndEndQuotes((<StringLiteral>comparisonInfo.stringConstantVal).text()) === stripStartAndEndQuotes(target.name));
            }

            // this is one difference between subtyping and assignment compatibility
            if (assignableTo) {
                if (this.isAnyOrEquivalent(source) || this.isAnyOrEquivalent(target)) {
                    return true;
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

            // Note: this code isn't necessary, but is helpful for error reporting purposes.  
            // Instead of reporting something like:
            //
            // Cannot convert 'A[]' to 'B[]':
            //  Types of property 'pop' of types 'A[]' and 'B[]' are incompatible:
            //    Call signatures of types '() => A' and '() => B' are incompatible:
            //      Type 'A' is missing property 'C' from type 'B'.
            //
            // We instead report:
            // Cannot convert 'A[]' to 'B[]':
            //   Type 'A' is missing property 'C' from type 'B'.

            if (source.getIsSpecialized() && target.getIsSpecialized()) {
                if (PullHelpers.getRootType(source) == PullHelpers.getRootType(target)) {

                    var sourceTypeArguments = source.getTypeArguments();
                    var targetTypeArguments = target.getTypeArguments();

                    if (sourceTypeArguments && targetTypeArguments) {
                        comparisonCache.setValueAt(source.pullSymbolID, target.pullSymbolID, false);

                        for (var i = 0; i < sourceTypeArguments.length; i++) {
                            if (!this.sourceIsRelatableToTarget(sourceTypeArguments[i], targetTypeArguments[i], assignableTo, comparisonCache, context, comparisonInfo, isComparingInstantiatedSignatures)) {
                                break;
                            }
                        }

                        if (i == sourceTypeArguments.length) {
                            comparisonCache.setValueAt(source.pullSymbolID, target.pullSymbolID, true);
                            return true;
                        }
                        else {
                            comparisonCache.setValueAt(source.pullSymbolID, target.pullSymbolID, undefined);
                            // don't return from here - if we've failed, keep checking (this will allow contravariant checks against generic methods to properly pass or fail)
                        }
                    }
                }
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
                if (source.isTypeParameter() && (source === sourceSubstitution)) {
                    return this.typesAreIdentical(target, source);
                }
                else {
                    // if the source is not another type parameter, and we're specializing at a constraint site, we consider the
                    // target to be a subtype of its constraint
                    if (isComparingInstantiatedSignatures) {
                        target = this.substituteUpperBoundForType(target);
                    }
                    else {
                        return this.typesAreIdentical(target, sourceSubstitution);
                    }
                }
            }

            comparisonCache.setValueAt(source.pullSymbolID, target.pullSymbolID, false);

            // This is an optimization that is a deviation from the spec. The spec sections 3.8.3 and 3.8.4 say to compare structurally,
            // but we know that if a type nominally extends another type, it is both a subtype and assignable.
            if ((source.kind & PullElementKind.SomeInstantiatableType) && (target.kind & PullElementKind.SomeInstantiatableType) && this.sourceExtendsTarget(source, target, context)) {
                return true;
            }

            if (this.cachedObjectInterfaceType() && target === this.cachedObjectInterfaceType()) {
                return true;
            }

            if (this.cachedFunctionInterfaceType() &&
                (sourceSubstitution.getCallSignatures().length || sourceSubstitution.getConstructSignatures().length) &&
                target.hasBase(this.cachedFunctionInterfaceType())) {
                return true;
            }

            if (target.hasMembers() && !this.sourceMembersAreRelatableToTargetMembers(sourceSubstitution, target, assignableTo, comparisonCache, context, comparisonInfo, isComparingInstantiatedSignatures)) {
                comparisonCache.setValueAt(source.pullSymbolID, target.pullSymbolID, undefined);
                return false;
            }

            if (!this.sourceCallSignaturesAreRelatableToTargetCallSignatures(sourceSubstitution, target, assignableTo, comparisonCache, context, comparisonInfo, isComparingInstantiatedSignatures)) {
                comparisonCache.setValueAt(source.pullSymbolID, target.pullSymbolID, undefined);
                return false;
            }

            if (!this.sourceConstructSignaturesAreRelatableToTargetConstructSignatures(sourceSubstitution, target, assignableTo, comparisonCache, context, comparisonInfo, isComparingInstantiatedSignatures)) {
                comparisonCache.setValueAt(source.pullSymbolID, target.pullSymbolID, undefined);
                return false;
            }

            if (!this.sourceIndexSignaturesAreRelatableToTargetIndexSignatures(sourceSubstitution, target, assignableTo, comparisonCache, context, comparisonInfo, isComparingInstantiatedSignatures)) {
                comparisonCache.setValueAt(source.pullSymbolID, target.pullSymbolID, undefined);
                return false;
            }

            comparisonCache.setValueAt(source.pullSymbolID, target.pullSymbolID, true);
            return true;
        }

        private sourceMembersAreRelatableToTargetMembers(source: PullTypeSymbol, target: PullTypeSymbol, assignableTo: boolean,
            comparisonCache: IBitMatrix, context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo, isComparingInstantiatedSignatures: boolean): boolean {
            var targetProps = target.getAllMembers(PullElementKind.SomeValue, GetAllMembersVisiblity.all);

            for (var itargetProp = 0; itargetProp < targetProps.length; itargetProp++) {

                var targetProp = targetProps[itargetProp];
                var sourceProp = this.getMemberSymbol(targetProp.name, PullElementKind.SomeValue, source);

                this.resolveDeclaredSymbol(targetProp, context);

                var targetPropType = targetProp.type;

                if (sourceProp && sourceProp.anyDeclHasFlag(PullElementFlags.Static) && source.isClass()) {
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
                    comparisonCache, context, comparisonInfo, isComparingInstantiatedSignatures)) {
                    return false;
                }
            }

            return true;
        }

        private infinitelyExpandingSourceTypeIsRelatableToTargetType(
            sourceType: PullTypeSymbol,
            targetType: PullTypeSymbol,
            assignableTo: boolean,
            comparisonCache: IBitMatrix,
            context: PullTypeResolutionContext,
            comparisonInfo: TypeComparisonInfo,
            isComparingInstantiatedSignatures: boolean): boolean {

            // Section 3.8.7 - Recursive Types
            //  When comparing two types S and T for identity(section 3.8.2), subtype(section 3.8.3), and 
            //  assignability(section 3.8.4) relationships, 
            //  if either type originates in an infinitely expanding type reference, S and T are not compared
            //  by the rules in the preceding sections.Instead, for the relationship to be considered true,
            //  -	S and T must both be type references to the same named type, and
            //  -	the relationship in question must be true for each corresponding pair of type arguments in
            //      the type argument lists of S and T.

            var widenedTargetType = this.widenType(targetType);
            var widenedSourceType = this.widenType(sourceType);

            // Check if the type is not any/null or undefined
            if ((widenedSourceType != this.semanticInfoChain.anyTypeSymbol) &&
                (widenedTargetType != this.semanticInfoChain.anyTypeSymbol)) {

                var sourceTypeNamedTypeReference = PullHelpers.getRootType(sourceType);
                var targetTypeNamedTypeReference = PullHelpers.getRootType(targetType);
                //  -	S and T must both be type references to the same named type, and
                if (sourceTypeNamedTypeReference != targetTypeNamedTypeReference) {
                    comparisonCache.setValueAt(sourceType.pullSymbolID, targetType.pullSymbolID, false);
                    if (comparisonInfo) {
                        comparisonInfo.addMessage(getDiagnosticMessage(DiagnosticCode.Types_0_and_1_originating_in_inifinitely_expanding_type_reference_do_not_refer_to_same_named_type,
                            [sourceType.getScopedNameEx().toString(), targetType.toString()]));
                    }
                    return false;
                }

                var sourceTypeArguments = sourceType.getTypeArguments();
                var targetTypeArguments = targetType.getTypeArguments();

                // Verify if all type arguments can relate
                if (!sourceTypeArguments && !targetTypeArguments) {
                    // Both interface have 0 type arguments, so they relate
                    comparisonCache.setValueAt(sourceType.pullSymbolID, targetType.pullSymbolID, true);
                    return true;
                }

                // If the number of type arguments mismatch (because of incomplete list - types are incompatible
                if (!(sourceTypeArguments && targetTypeArguments) ||
                    sourceTypeArguments.length != targetTypeArguments.length) {
                    comparisonCache.setValueAt(sourceType.pullSymbolID, targetType.pullSymbolID, false);
                    if (comparisonInfo) {
                        comparisonInfo.addMessage(getDiagnosticMessage(DiagnosticCode.Types_0_and_1_originating_in_inifinitely_expanding_type_reference_have_incompatible_type_arguments,
                            [sourceType.toString(), targetType.toString()]));
                    }
                    return false;
                }

                var comparisonInfoTypeArgumentsCheck: TypeComparisonInfo = null;
                if (comparisonInfo && !comparisonInfo.onlyCaptureFirstError) {
                    comparisonInfoTypeArgumentsCheck = new TypeComparisonInfo(comparisonInfo);
                }
                for (var i = 0; i < sourceTypeArguments.length; i++) {
                    //  -	the relationship in question must be true for each corresponding pair of type arguments
                    //      in the type argument lists of S and T.
                    if (!this.sourceIsRelatableToTarget(sourceTypeArguments[i], targetTypeArguments[i], assignableTo, comparisonCache, context, comparisonInfo, isComparingInstantiatedSignatures)) {
                        if (comparisonInfo) {
                            var message: string;
                            if (comparisonInfoTypeArgumentsCheck && comparisonInfoTypeArgumentsCheck.message) {
                                message = getDiagnosticMessage(DiagnosticCode.Types_0_and_1_originating_in_inifinitely_expanding_type_reference_have_incompatible_type_arguments_NL_2,
                                    [sourceType.toString(), targetType.toString(), comparisonInfoTypeArgumentsCheck.message]);
                            } else {
                                message = getDiagnosticMessage(DiagnosticCode.Types_0_and_1_originating_in_inifinitely_expanding_type_reference_have_incompatible_type_arguments,
                                    [sourceType.toString(), targetType.toString()]);
                            }
                            comparisonInfo.addMessage(message);
                        }

                    }
                }
            }

            comparisonCache.setValueAt(sourceType.pullSymbolID, targetType.pullSymbolID, true);
            return true;
        }

        private infinitelyExpandingTypesAreIdentical(sourceType: PullTypeSymbol, targetType: PullTypeSymbol): boolean {

            // Section 3.8.7 - Recursive Types
            //  When comparing two types S and T for identity(section 3.8.2), subtype(section 3.8.3), and 
            //  assignability(section 3.8.4) relationships, 
            //  if either type originates in an infinitely expanding type reference, S and T are not compared
            //  by the rules in the preceding sections.Instead, for the relationship to be considered true,
            //  -	S and T must both be type references to the same named type, and
            //  -	the relationship in question must be true for each corresponding pair of type arguments in
            //      the type argument lists of S and T.

            var widenedTargetType = this.widenType(targetType);
            var widenedSourceType = this.widenType(sourceType);

            // Check if the type is not any/null or undefined
            if ((widenedSourceType != this.semanticInfoChain.anyTypeSymbol) &&
                (widenedTargetType != this.semanticInfoChain.anyTypeSymbol)) {

                //  -	S and T must both be type references to the same named type, and
                var sourceTypeNamedTypeReference = PullHelpers.getRootType(sourceType);
                var targetTypeNamedTypeReference = PullHelpers.getRootType(targetType);
                if (sourceTypeNamedTypeReference != targetTypeNamedTypeReference) {
                    this.identicalCache.setValueAt(sourceType.pullSymbolID, targetType.pullSymbolID, false);
                    return false;
                }

                //  -	the relationship in question must be true for each corresponding pair of type arguments in
                //      the type argument lists of S and T.
                var sourceTypeArguments = sourceType.getTypeArguments();
                var targetTypeArguments = targetType.getTypeArguments();

                if (!sourceTypeArguments && !targetTypeArguments) {
                    // Both types do not refere to any type arguments so they are identical
                    this.identicalCache.setValueAt(sourceType.pullSymbolID, targetType.pullSymbolID, true);
                    return true;
                }

                if (!(sourceTypeArguments && targetTypeArguments) ||
                    sourceTypeArguments.length != targetTypeArguments.length) {
                    // Mismatch in type arguments length - may be missing type arguments - it is error 
                    this.identicalCache.setValueAt(sourceType.pullSymbolID, targetType.pullSymbolID, false);
                    return false;
                }

                for (var i = 0; i < sourceTypeArguments.length; i++) {
                    // Each pair of type argument needs to be identical for the type to be identical
                    if (!this.typesAreIdentical(sourceTypeArguments[i], targetTypeArguments[i])) {
                        this.identicalCache.setValueAt(sourceType.pullSymbolID, targetType.pullSymbolID, false);
                        return false;
                    }
                }
            }

            this.identicalCache.setValueAt(sourceType.pullSymbolID, targetType.pullSymbolID, true);
            return true;
        }

        private sourcePropertyIsRelatableToTargetProperty(source: PullTypeSymbol, target: PullTypeSymbol,
            sourceProp: PullSymbol, targetProp: PullSymbol, assignableTo: boolean, comparisonCache: IBitMatrix,
            context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo, isComparingInstantiatedSignatures: boolean): boolean {
            var targetPropIsPrivate = targetProp.anyDeclHasFlag(PullElementFlags.Private);
            var sourcePropIsPrivate = sourceProp.anyDeclHasFlag(PullElementFlags.Private);

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

            // If the target property is required, and the source property is optional, they are not compatible
            if (sourceProp.isOptional && !targetProp.isOptional) {
                if (comparisonInfo) {
                    comparisonInfo.flags |= TypeRelationshipFlags.RequiredPropertyIsMissing;
                    comparisonInfo.addMessage(getDiagnosticMessage(DiagnosticCode.Property_0_defined_as_optional_in_type_1_but_is_required_in_type_2,
                        [targetProp.getScopedNameEx().toString(), sourceProp.getContainer().toString(), targetProp.getContainer().toString()]));
                }
                return false;
            }

            this.resolveDeclaredSymbol(sourceProp, context);

            var sourcePropType = sourceProp.type;
            var targetPropType = targetProp.type;

            if (comparisonCache.valueAt(sourcePropType.pullSymbolID, targetPropType.pullSymbolID)) {
                return true;
            }

            var comparisonInfoPropertyTypeCheck: TypeComparisonInfo = null;
            if (comparisonInfo && !comparisonInfo.onlyCaptureFirstError) {
                comparisonInfoPropertyTypeCheck = new TypeComparisonInfo(comparisonInfo);
            }

            // Section 3.8.7 - Recursive Types
            //  When comparing two types S and T for identity(section 3.8.2), subtype(section 3.8.3), and assignability(section 3.8.4) relationships, 
            //  if either type originates in an infinitely expanding type reference, S and T are not compared by the rules in the preceding sections.Instead, for the relationship to be considered true,
            //  -	S and T must both be type references to the same named type, and
            //  -	the relationship in question must be true for each corresponding pair of type arguments in the type argument lists of S and T.

            var sourcePropGenerativeTypeKind = sourcePropType.getGenerativeTypeClassification(source);
            var targetPropGenerativeTypeKind = targetPropType.getGenerativeTypeClassification(target);

            if (sourcePropGenerativeTypeKind == GenerativeTypeClassification.InfinitelyExpanding ||
                targetPropGenerativeTypeKind == GenerativeTypeClassification.InfinitelyExpanding) {
                if (this.infinitelyExpandingSourceTypeIsRelatableToTargetType(sourcePropType, targetPropType, assignableTo, comparisonCache, context, comparisonInfoPropertyTypeCheck, isComparingInstantiatedSignatures)) {
                    return true;
                }
            }
            else if (this.sourceIsRelatableToTarget(sourcePropType, targetPropType, assignableTo, comparisonCache, context, comparisonInfoPropertyTypeCheck, isComparingInstantiatedSignatures)) {
                return true;
            }

            // Update error message correctly
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

        private sourceCallSignaturesAreRelatableToTargetCallSignatures(source: PullTypeSymbol, target: PullTypeSymbol,
            assignableTo: boolean, comparisonCache: IBitMatrix, context: PullTypeResolutionContext,
            comparisonInfo: TypeComparisonInfo, isComparingInstantiatedSignatures: boolean): boolean {

            var targetCallSigs = target.getCallSignatures();

            // check signature groups
            if (targetCallSigs.length) {
                var comparisonInfoSignatuesTypeCheck: TypeComparisonInfo = null;
                if (comparisonInfo && !comparisonInfo.onlyCaptureFirstError) {
                    comparisonInfoSignatuesTypeCheck = new TypeComparisonInfo(comparisonInfo);
                }

                var sourceCallSigs = source.getCallSignatures();
                if (!this.signatureGroupIsRelatableToTarget(sourceCallSigs, targetCallSigs, assignableTo, comparisonCache, context, comparisonInfoSignatuesTypeCheck, isComparingInstantiatedSignatures)) {
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
            assignableTo: boolean, comparisonCache: IBitMatrix, context: PullTypeResolutionContext,
            comparisonInfo: TypeComparisonInfo, isComparingInstantiatedSignatures: boolean): boolean {

            // check signature groups
            var targetConstructSigs = target.getConstructSignatures();
            if (targetConstructSigs.length) {
                var comparisonInfoSignatuesTypeCheck: TypeComparisonInfo = null;
                if (comparisonInfo && !comparisonInfo.onlyCaptureFirstError) {
                    comparisonInfoSignatuesTypeCheck = new TypeComparisonInfo(comparisonInfo);
                }

                var sourceConstructSigs = source.getConstructSignatures();
                if (!this.signatureGroupIsRelatableToTarget(sourceConstructSigs, targetConstructSigs, assignableTo, comparisonCache, context, comparisonInfoSignatuesTypeCheck, isComparingInstantiatedSignatures)) {
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
            assignableTo: boolean, comparisonCache: IBitMatrix, context: PullTypeResolutionContext,
            comparisonInfo: TypeComparisonInfo, isComparingInstantiatedSignatures: boolean): boolean {

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
                        comparable = this.signatureIsAssignableToTarget(sourceStringSig, targetStringSig, context, comparisonInfoSignatuesTypeCheck, isComparingInstantiatedSignatures);
                    }
                    else {
                        comparable = false;
                    }
                }

                if (comparable && targetNumberSig) {
                    if (sourceNumberSig) {
                        comparable = this.signatureIsAssignableToTarget(sourceNumberSig, targetNumberSig, context, comparisonInfoSignatuesTypeCheck, isComparingInstantiatedSignatures);
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
        private signatureGroupIsRelatableToTarget(sourceSG: PullSignatureSymbol[], targetSG: PullSignatureSymbol[], assignableTo: boolean, comparisonCache: IBitMatrix, context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo, isComparingInstantiatedSignatures: boolean) {
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

                    if (this.signatureIsRelatableToTarget(nSig, mSig, assignableTo, comparisonCache, context, comparisonInfo, isComparingInstantiatedSignatures)) {
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

        private signatureIsRelatableToTarget(sourceSig: PullSignatureSymbol, targetSig: PullSignatureSymbol, assignableTo: boolean, comparisonCache: IBitMatrix, context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo, isComparingInstantiatedSignatures: boolean) {

            

            var sourceParameters = sourceSig.parameters;
            var targetParameters = targetSig.parameters;

            if (!sourceParameters || !targetParameters) {
                return false;
            }

            var targetVarArgCount = targetSig.nonOptionalParamCount;
            var sourceVarArgCount = sourceSig.nonOptionalParamCount;

            if (sourceVarArgCount > targetVarArgCount) {
                if (comparisonInfo) {
                    comparisonInfo.flags |= TypeRelationshipFlags.SourceSignatureHasTooManyParameters;
                    comparisonInfo.addMessage(getDiagnosticMessage(DiagnosticCode.Call_signature_expects_0_or_fewer_parameters, [targetVarArgCount]));
                }
                return false;
            }

            if (sourceSig.isGeneric()) {

                var rootSourceSig = sourceSig.getRootSymbol();
                var rootTargetSig = targetSig.getRootSymbol();

                if (comparisonCache.valueAt(rootSourceSig.pullSymbolID, rootTargetSig.pullSymbolID) != undefined) {
                    return true;
                }

                comparisonCache.setValueAt(rootSourceSig.pullSymbolID, rootTargetSig.pullSymbolID, false);

                sourceSig = this.instantiateSignatureInContext(sourceSig, targetSig, context);

                if (!sourceSig) {
                    return false;
                }
                else {
                    // fix up the source parameter list
                    sourceParameters = sourceSig.parameters;
                }
            }

            comparisonCache.setValueAt(sourceSig.pullSymbolID, targetSig.pullSymbolID, false);

            var sourceReturnType = sourceSig.returnType;
            var targetReturnType = targetSig.returnType;

            if (targetReturnType != this.semanticInfoChain.voidTypeSymbol) {
                if (!this.sourceIsRelatableToTarget(sourceReturnType, targetReturnType, assignableTo, comparisonCache, context, comparisonInfo, isComparingInstantiatedSignatures)) {
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
                    if (sourceParamType.isArrayNamedTypeReference()) {
                        sourceParamType = sourceParamType.getElementType();
                    }
                    sourceParamName = sourceParameters[iSource].name;
                }

                if (iTarget < targetParameters.length && !targetSig.hasVarArgs && (!targetVarArgCount || (iTarget < targetVarArgCount))) {
                    targetParamType = targetParameters[iTarget].type;
                    targetParamName = targetParameters[iTarget].name;
                }
                else if (targetSig.hasVarArgs && iTarget === targetVarArgCount) {
                    targetParamType = targetParameters[iTarget].type;

                    if (targetParamType.isArrayNamedTypeReference()) {
                        targetParamType = targetParamType.getElementType();
                    }
                    targetParamName = targetParameters[iTarget].name;
                }

                if (!(this.sourceIsRelatableToTarget(sourceParamType, targetParamType, assignableTo, comparisonCache, context, comparisonInfo, isComparingInstantiatedSignatures) ||
                    this.sourceIsRelatableToTarget(targetParamType, sourceParamType, assignableTo, comparisonCache, context, comparisonInfo, isComparingInstantiatedSignatures))) {

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
            haveTypeArgumentsAtCallSite: boolean,
            context: PullTypeResolutionContext,
            diagnostics: Diagnostic[]): PullSignatureSymbol {
            var hasOverloads = group.length > 1;
            var comparisonInfo = new TypeComparisonInfo();
            var args = application.argumentList ? application.argumentList.arguments : null;

            var initialCandidates = ArrayUtilities.where(group, signature => {
                // Filter out definition if overloads are available
                if (hasOverloads && signature.isDefinition()) {
                    return false;
                }
                // Filter out nongeneric signatures if type arguments are supplied
                if (haveTypeArgumentsAtCallSite && !signature.isGeneric()) {
                    return false;
                }

                // Filter out overloads with the wrong arity
                return this.overloadHasCorrectArity(signature, args);
            });

            // Now that we have trimmed initial candidates, find which ones are applicable per spec
            //    section 4.12.1
            // October 11, 2013: If the list of candidate signatures is empty, the function call is
            //    an error.
            // Otherwise, if the candidate list contains one or more signatures for which the type
            //    of each argument expression is a subtype of each corresponding parameter type, 
            //    the return type of the first of those signatures becomes the return type of the
            //    function call.
            // Otherwise, the return type of the first signature in the candidate list becomes
            //    the return type of the function call.

            var firstAssignableButNotSupertypeSignature: PullSignatureSymbol = null;
            var firstAssignableWithProvisionalErrorsSignature: PullSignatureSymbol = null;

            for (var i = 0; i < initialCandidates.length; i++) {
                var applicability = this.overloadIsApplicable(initialCandidates[i], args, context, comparisonInfo);
                if (applicability === OverloadApplicabilityStatus.Subtype) {
                    return initialCandidates[i];
                }
                else if (applicability === OverloadApplicabilityStatus.AssignableWithNoProvisionalErrors &&
                    !firstAssignableButNotSupertypeSignature) {
                    firstAssignableButNotSupertypeSignature = initialCandidates[i];
                }
                else if (applicability === OverloadApplicabilityStatus.AssignableButWithProvisionalErrors &&
                    !firstAssignableWithProvisionalErrorsSignature) {
                    firstAssignableWithProvisionalErrorsSignature = initialCandidates[i];
                }
            }

            // Choose the best signature we have (between assignable candidates and ones with provisional errors)
            // In particular, do not error when we have one that fits but with provisional errors
            if (firstAssignableButNotSupertypeSignature || firstAssignableWithProvisionalErrorsSignature) {
                return firstAssignableButNotSupertypeSignature || firstAssignableWithProvisionalErrorsSignature;
            }
            else {
                var target: AST = this.getCallTargetErrorSpanAST(application);
                if (comparisonInfo.message) {
                    diagnostics.push(this.semanticInfoChain.diagnosticFromAST(target,
                        DiagnosticCode.Supplied_parameters_do_not_match_any_signature_of_call_target_NL_0, [comparisonInfo.message]));
                }
                else {
                    diagnostics.push(this.semanticInfoChain.diagnosticFromAST(target,
                        DiagnosticCode.Supplied_parameters_do_not_match_any_signature_of_call_target, null));
                }
            }

            return null;
        }

        private getCallTargetErrorSpanAST(callEx: ICallExpression): AST {
            return (callEx.expression.nodeType() === SyntaxKind.MemberAccessExpression) ? (<MemberAccessExpression>callEx.expression).name : callEx.expression;
        }

        private overloadHasCorrectArity(signature: PullSignatureSymbol, args: ASTSeparatedList): boolean {
            if (args == null) {
                return signature.nonOptionalParamCount === 0;
            }

            // First, figure out how many arguments there are. This is usually args.nonSeparatorCount(), but if we have trailing separators,
            // we need to pretend we have one more "phantom" argument that the user is currently typing. This is useful for signature help.
            // Example: foo(1, 2, 
            // should have 3 arguments
            var numberOfArgs = (args.nonSeparatorCount() && args.nonSeparatorCount() === args.separatorCount())
                ? args.separatorCount() + 1
                : args.nonSeparatorCount();
            if (numberOfArgs < signature.nonOptionalParamCount) {
                return false;
            }
            if (!signature.hasVarArgs && numberOfArgs > signature.parameters.length) {
                return false;
            }

            return true;
        }

        private overloadIsApplicable(signature: PullSignatureSymbol, args: ASTSeparatedList, context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo): OverloadApplicabilityStatus {
            // Already checked for arity, so it's automatically applicable if there are no args
            if (args === null) {
                return OverloadApplicabilityStatus.Subtype;
            }

            var isInVarArg = false;
            var parameters = signature.parameters;
            var paramType: PullTypeSymbol = null;

            // Start by assuming that the argument types are all subtypes of the corresponding parameter types
            // Indeed this is the case for a call with no arguments.
            var overloadApplicability = OverloadApplicabilityStatus.Subtype;

            for (var i = 0; i < args.nonSeparatorCount(); i++) {
                if (!isInVarArg) {
                    this.resolveDeclaredSymbol(parameters[i], context);

                    if (parameters[i].isVarArg) {
                        // If the vararg has no element type, it is malformed, so just use the any symbol (we will have errored when resolving the signature).
                        paramType = parameters[i].type.getElementType() || this.getNewErrorTypeSymbol(parameters[i].type.getName());
                        isInVarArg = true;
                    }
                    else {
                        paramType = parameters[i].type;
                    }
                }

                // We aggregate the statuses across arguments by taking the less flattering of the two statuses.
                // In the case where we get a completely unassignable argument, we can short circuit and just throw out the signature.
                var statusOfCurrentArgument = this.overloadIsApplicableForArgument(paramType, args.nonSeparatorAt(i), i, context, comparisonInfo);

                if (statusOfCurrentArgument === OverloadApplicabilityStatus.NotAssignable) {
                    return OverloadApplicabilityStatus.NotAssignable;
                }
                else if (statusOfCurrentArgument === OverloadApplicabilityStatus.AssignableButWithProvisionalErrors) {
                    overloadApplicability = OverloadApplicabilityStatus.AssignableButWithProvisionalErrors;
                }
                else if (overloadApplicability !== OverloadApplicabilityStatus.AssignableButWithProvisionalErrors &&
                    statusOfCurrentArgument === OverloadApplicabilityStatus.AssignableWithNoProvisionalErrors) {
                    overloadApplicability = OverloadApplicabilityStatus.AssignableWithNoProvisionalErrors;
                }
                // else we have nothing to downgrade - just stick with what we have
            }

            return overloadApplicability;
        }

        private overloadIsApplicableForArgument(paramType: PullTypeSymbol, arg: AST, argIndex: number, context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo): OverloadApplicabilityStatus {
            if (paramType.isAny()) {
                return OverloadApplicabilityStatus.Subtype;
            }
            else if (paramType.isError()) {
                // This is for the case where the parameter type itself was malformed. We will treat this like a provisional error because
                // we will get an error for this in the overload defition group, and we want to avoid choosing this overload if possible.
                return OverloadApplicabilityStatus.AssignableButWithProvisionalErrors;
            }
            else if (arg.nodeType() === SyntaxKind.SimpleArrowFunctionExpression) {
                var simpleArrowFunction = <SimpleArrowFunctionExpression>arg;
                return this.overloadIsApplicableForAnyFunctionExpressionArgument(paramType,
                    arg, null, Parameters.fromIdentifier(simpleArrowFunction.identifier), null, simpleArrowFunction.block, simpleArrowFunction.expression,
                    argIndex, context, comparisonInfo);
            }
            else if (arg.nodeType() === SyntaxKind.ParenthesizedArrowFunctionExpression) {
                var arrowFunction = <ParenthesizedArrowFunctionExpression>arg;
                return this.overloadIsApplicableForAnyFunctionExpressionArgument(paramType,
                    arg, arrowFunction.callSignature.typeParameterList, Parameters.fromParameterList(arrowFunction.callSignature.parameterList),
                    getType(arrowFunction), arrowFunction.block, arrowFunction.expression, argIndex, context, comparisonInfo);
            }
            else if (arg.nodeType() === SyntaxKind.FunctionExpression) {
                var functionExpression = <FunctionExpression>arg;
                return this.overloadIsApplicableForAnyFunctionExpressionArgument(paramType,
                    arg, functionExpression.callSignature.typeParameterList, Parameters.fromParameterList(functionExpression.callSignature.parameterList),
                    getType(functionExpression), functionExpression.block, /*bodyExpression:*/ null, argIndex, context, comparisonInfo);
            }
            else if (arg.nodeType() === SyntaxKind.ObjectLiteralExpression) {
                return this.overloadIsApplicableForObjectLiteralArgument(paramType, <ObjectLiteralExpression>arg, argIndex, context, comparisonInfo);
            }
            else if (arg.nodeType() === SyntaxKind.ArrayLiteralExpression) {
                return this.overloadIsApplicableForArrayLiteralArgument(paramType, <ArrayLiteralExpression>arg, argIndex, context, comparisonInfo);
            }
            else {
                return this.overloadIsApplicableForOtherArgument(paramType, arg, argIndex, context, comparisonInfo);
            }
        }

        private overloadIsApplicableForAnyFunctionExpressionArgument(
            paramType: PullTypeSymbol,
            arg: AST,
            typeParameters: TypeParameterList,
            parameters: IParameters,
            returnTypeAnnotation: AST,
            block: Block,
            bodyExpression: AST,
            argIndex: number,
            context: PullTypeResolutionContext,
            comparisonInfo: TypeComparisonInfo): OverloadApplicabilityStatus {

            if (this.cachedFunctionInterfaceType() && paramType === this.cachedFunctionInterfaceType()) {
                return OverloadApplicabilityStatus.AssignableWithNoProvisionalErrors;
            }

            context.pushContextualType(paramType, true, null);

            var argSym = this.resolveAnyFunctionExpression(arg, typeParameters, parameters, returnTypeAnnotation, block, bodyExpression,
                /*isContextuallyTyped*/ true, context);

            var applicabilityStatus = this.overloadIsApplicableForArgumentHelper(paramType, argSym.type, argIndex, comparisonInfo, context);
            
            context.popContextualType();

            return applicabilityStatus;
        }

        private overloadIsApplicableForObjectLiteralArgument(
            paramType: PullTypeSymbol,
            arg: ObjectLiteralExpression,
            argIndex: number,
            context: PullTypeResolutionContext,
            comparisonInfo: TypeComparisonInfo): OverloadApplicabilityStatus {

            // attempt to contextually type the object literal
            if (this.cachedObjectInterfaceType() && paramType === this.cachedObjectInterfaceType()) {
                return OverloadApplicabilityStatus.AssignableWithNoProvisionalErrors;
            }

            context.pushContextualType(paramType, true, null);
            var argSym = this.resolveObjectLiteralExpression(arg, /*isContextuallyTyped*/ true, context);

            var applicabilityStatus = this.overloadIsApplicableForArgumentHelper(paramType, argSym.type, argIndex, comparisonInfo, context);

            context.popContextualType();

            return applicabilityStatus;
        }

        private overloadIsApplicableForArrayLiteralArgument(paramType: PullTypeSymbol, arg: ArrayLiteralExpression, argIndex: number, context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo): OverloadApplicabilityStatus {
            // attempt to contextually type the array literal
            if (paramType === this.cachedArrayInterfaceType()) {
                return OverloadApplicabilityStatus.AssignableWithNoProvisionalErrors;
            }

            context.pushContextualType(paramType, true, null);
            var argSym = this.resolveArrayLiteralExpression(arg, /*isContextuallyTyped*/ true, context);

            var applicabilityStatus = this.overloadIsApplicableForArgumentHelper(paramType, argSym.type, argIndex, comparisonInfo, context);

            context.popContextualType();

            return applicabilityStatus;
        }

        private overloadIsApplicableForOtherArgument(paramType: PullTypeSymbol, arg: AST, argIndex: number, context: PullTypeResolutionContext, comparisonInfo: TypeComparisonInfo): OverloadApplicabilityStatus {
            // No need to contextually type or mark as provisional
            var argSym = this.resolveAST(arg, /*isContextuallyTyped*/ false, context);

            // If it is an alias, get its type
            if (argSym.type.isAlias()) {
                var aliasSym = <PullTypeAliasSymbol>argSym.type;
                argSym = aliasSym.getExportAssignedTypeSymbol();
            }

            // Just in case the argument is a string literal, and are checking overload on const, we set this stringConstantVal
            // (sourceIsAssignableToTarget will internally check if the argument is actually a string)
            comparisonInfo.stringConstantVal = arg;
            return this.overloadIsApplicableForArgumentHelper(paramType, argSym.type, argIndex, comparisonInfo, context);
        }

        // The inner method that decides if an overload is applicable. It can return any of 4 applicability statuses
        // Spec October 11, 2013: Section 4.12.1: for each argument expression e and its corresponding parameter P, 
        // when e is contextually typed(section 4.19) by the type of P, no errors ensue and the type of e is assignable
        // to (section 3.8.4) the type of P.
        // Note this also tracks whether the argument type is a subtype of the parameter type
        private overloadIsApplicableForArgumentHelper(paramType: PullTypeSymbol,
            argSym: PullSymbol,
            argumentIndex: number,
            comparisonInfo: TypeComparisonInfo,
            context: PullTypeResolutionContext): OverloadApplicabilityStatus {
            // Make a temporary comparison info to catch an error in case the parameter is not a supertype (we don't want to report such errors)
            var tempComparisonInfo = new TypeComparisonInfo();
            tempComparisonInfo.stringConstantVal = comparisonInfo.stringConstantVal;
            if (!context.hasProvisionalErrors() && this.sourceIsSubtypeOfTarget(argSym.type, paramType, context, tempComparisonInfo)) {
                return OverloadApplicabilityStatus.Subtype;
            }

            // Now check for normal assignability using the original comparison info (or use the temporary one if the original one already has an error).
            if (this.sourceIsAssignableToTarget(argSym.type, paramType, context, comparisonInfo.message ? tempComparisonInfo : comparisonInfo)) {
                return context.hasProvisionalErrors()
                    ? OverloadApplicabilityStatus.AssignableButWithProvisionalErrors
                    : OverloadApplicabilityStatus.AssignableWithNoProvisionalErrors;
            }

            if (!comparisonInfo.message) {
                comparisonInfo.addMessage(getDiagnosticMessage(DiagnosticCode.Could_not_apply_type_0_to_argument_1_which_is_of_type_2,
                    [paramType.toString(), (argumentIndex + 1), argSym.getTypeName()]));
            }

            return OverloadApplicabilityStatus.NotAssignable;
        }

        private inferArgumentTypesForSignature(signature: PullSignatureSymbol, args: ASTSeparatedList, comparisonInfo: TypeComparisonInfo, context: PullTypeResolutionContext): PullTypeSymbol[] {
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

            for (var i = 0; i < args.nonSeparatorCount(); i++) {

                if (i >= parameters.length) {
                    break;
                }

                parameterType = parameters[i].type;

                // account for varargs
                if (signature.hasVarArgs && (i >= signature.nonOptionalParamCount - 1) && parameterType.isArrayNamedTypeReference()) {
                    parameterType = parameterType.getElementType();
                }

                var inferenceCandidates = argContext.getInferenceCandidates();

                if (inferenceCandidates.length) {
                    for (var j = 0; j < inferenceCandidates.length; j++) {

                        argContext.resetRelationshipCache();
                        var substitutions = inferenceCandidates[j];

                        context.pushContextualType(parameterType, true, substitutions);

                        var argSym = this.resolveAST(args.nonSeparatorAt(i), true, context);

                        this.relateTypeToTypeParameters(argSym.type, parameterType, false, argContext, context);

                        cxt = context.popContextualType();
                    }
                }
                else {
                    context.pushContextualType(parameterType, true, []);
                    var argSym = this.resolveAST(args.nonSeparatorAt(i), true, context);

                    this.relateTypeToTypeParameters(argSym.type, parameterType, false, argContext, context);

                    cxt = context.popContextualType();
                }
            }

            var inferenceResults = argContext.inferArgumentTypes(this, context);

            if (inferenceResults.unfit) {
                return null;
            }

            var resultTypes: PullTypeSymbol[] = [];

            // match inferred types in-order to type parameters
            for (var i = 0; i < typeParameters.length; i++) {
                for (var j = 0; j < inferenceResults.results.length; j++) {
                    if ((inferenceResults.results[j].param == typeParameters[i]) && inferenceResults.results[j].type) {
                        resultTypes[resultTypes.length] = inferenceResults.results[j].type;
                        break;
                    }
                }
            }

            // REVIEW: Remove this block?
            if (!args.nonSeparatorCount() && !resultTypes.length && typeParameters.length) {
                for (var i = 0; i < typeParameters.length; i++) {
                    resultTypes[resultTypes.length] = this.semanticInfoChain.emptyTypeSymbol;
                }
            }
            else if (resultTypes.length < typeParameters.length) {
                for (var i = resultTypes.length; i < typeParameters.length; i++) {
                    resultTypes[i] = this.semanticInfoChain.emptyTypeSymbol;
                }
            }

            //  Do not let local type parameters escape at call sites
            //  Because we're comparing for equality between two signatures (where one is instantiated
            //  against the type parameters of the other), we want to know * exactly * what the
            //  instantiation would be give the set of type parameters.In the case where the two
            //  signatures are otherwise equal, we don't want to sub in '{ }' for any of the type parameters,
            //  since that would short - circuit the equality check.The substitution is only desirable at call sites,
            //  where type parameters can leak out of scope, but during contextual instantiation
            //  the type parameters * should * be considered in scope

            // We know that if we are inferring at a call expression we are not doing
            // contextual signature instantiation
            var inferringAtCallExpression = args.parent && args.parent.nodeType() === SyntaxKind.ArgumentList &&
                (args.parent.parent.nodeType() === SyntaxKind.InvocationExpression || args.parent.parent.nodeType() === SyntaxKind.ObjectCreationExpression);

            if (inferringAtCallExpression) {
                // Need to know if the type parameters are in scope. If not, they are not legal inference
                // candidates unless we are in contextual signature instantiation
                if (!this.typeParametersAreInScopeAtArgumentList(typeParameters, args)) {
                    for (var i = 0; i < resultTypes.length; i++) {
                        // Check if the inferred type wraps any one of the type parameters
                        if (resultTypes[i].wrapsSomeTypeParameter(argContext.candidateCache)) {
                            resultTypes[i] = this.semanticInfoChain.emptyTypeSymbol;
                        }
                    }
                }
            }

            return resultTypes;
        }

        private typeParametersAreInScopeAtArgumentList(typeParameters: PullTypeParameterSymbol[], args: ASTSeparatedList): boolean {
            // If the parent path from the current enclosing decl contains the type parameters'
            // parent decl, then the type parameters must be in scope
            var enclosingDecl = this.getEnclosingDeclForAST(args);
            var typeParameterParentDecl = typeParameters[0].getDeclarations()[0].getParentDecl();
            return enclosingDecl.getParentPath().indexOf(typeParameterParentDecl) > -1;
        }

        private relateTypeToTypeParameters(expressionType: PullTypeSymbol,
            parameterType: PullTypeSymbol,
            shouldFix: boolean,
            argContext: ArgumentInferenceContext,
            context: PullTypeResolutionContext): void {

            if (!expressionType || !parameterType) {
                return;
            }

            if (expressionType.isError()) {
                expressionType = this.semanticInfoChain.anyTypeSymbol;
            }

            if (parameterType.isTypeParameter()) {
                if (expressionType.isGeneric() && !expressionType.isTypeParameter()) {
                    expressionType = this.instantiateTypeToAny(expressionType, context);
                }
                argContext.addCandidateForInference(<PullTypeParameterSymbol>parameterType, expressionType, shouldFix);
                return;
            }

            var parameterDeclarations = parameterType.getDeclarations();
            var expressionDeclarations = expressionType.getDeclarations();

            if (!parameterType.isArrayNamedTypeReference() &&
                parameterDeclarations.length &&
                expressionDeclarations.length &&
                !(parameterType.isTypeParameter() || expressionType.isTypeParameter()) &&
                (parameterDeclarations[0].isEqual(expressionDeclarations[0]) || (expressionType.isGeneric() && parameterType.isGeneric() &&
                this.sourceIsSubtypeOfTarget(this.instantiateTypeToAny(expressionType, context), this.instantiateTypeToAny(parameterType, context), context, null))) &&
                expressionType.isGeneric()) {
                var typeParameters: PullTypeSymbol[] = parameterType.getTypeArgumentsOrTypeParameters();
                var typeArguments: PullTypeSymbol[] = expressionType.getTypeArguments();

                // If we're relating an out-of-order resolution of a function call within the body
                // of a generic type's method, the relationship will actually be in reverse.
                if (!typeArguments) {
                    typeParameters = parameterType.getTypeArguments();
                    typeArguments = expressionType.getTypeArgumentsOrTypeParameters();
                }

                if (typeParameters && typeArguments && typeParameters.length === typeArguments.length) {
                    for (var i = 0; i < typeParameters.length; i++) {
                        if (typeArguments[i] != typeParameters[i]) {
                            // relate and fix
                            this.relateTypeToTypeParameters(typeArguments[i], typeParameters[i], true, argContext, context);
                        }
                    }
                }
            }

            if (expressionType.isArrayNamedTypeReference() && parameterType.isArrayNamedTypeReference()) {
                this.relateArrayTypeToTypeParameters(expressionType, parameterType, shouldFix, argContext, context);

                return;
            }            

            this.relateObjectTypeToTypeParameters(expressionType, parameterType, shouldFix, argContext, context);
        }

        private relateFunctionSignatureToTypeParameters(expressionSignature: PullSignatureSymbol,
            parameterSignature: PullSignatureSymbol,
            argContext: ArgumentInferenceContext,
            context: PullTypeResolutionContext): void {

            var expressionParams = expressionSignature.parameters;
            var expressionReturnType = expressionSignature.returnType;

            var parameterParams = parameterSignature.parameters;
            var parameterReturnType = parameterSignature.returnType;

            var len = parameterParams.length < expressionParams.length ? parameterParams.length : expressionParams.length;

            for (var i = 0; i < len; i++) {
                this.relateTypeToTypeParameters(expressionParams[i].type, parameterParams[i].type, true, argContext, context);
            }

            this.relateTypeToTypeParameters(expressionReturnType, parameterReturnType, false, argContext, context);
        }

        private relateObjectTypeToTypeParameters(objectType: PullTypeSymbol,
            parameterType: PullTypeSymbol,
            shouldFix: boolean,
            argContext: ArgumentInferenceContext,
            context: PullTypeResolutionContext): void {

            var parameterTypeMembers = parameterType.getMembers();
            var parameterSignatures: PullSignatureSymbol[];

            var objectMember: PullSymbol;
            var objectSignatures: PullSignatureSymbol[];


            if (argContext.alreadyRelatingTypes(objectType, parameterType)) {
                return;
            }

            var objectTypeArguments = objectType.getTypeArguments();
            var parameterTypeParameters = parameterType.getTypeParameters();

                if (objectTypeArguments) {
                    if (objectTypeArguments.length === parameterTypeParameters.length) {
                        for (var i = 0; i < objectTypeArguments.length; i++) {
                            // PULLREVIEW: This may lead to duplicate inferences for type argument parameters, if the two are the same
                            // (which could occur via mutually recursive method calls within a generic class declaration)
                            argContext.addCandidateForInference(parameterTypeParameters[i], objectTypeArguments[i], shouldFix);
                        }
                    }
                    else if (parameterType == this.semanticInfoChain.anyTypeSymbol) {
                        for (var i = 0; i < objectTypeArguments.length; i++) {
                            this.relateTypeToTypeParameters(parameterType, objectTypeArguments[i], shouldFix, argContext, context);
                        }
                    }
                }

            // - If M is a property and S contains a property N with the same name as M, inferences are made from the type of N to the type of M.
            for (var i = 0; i < parameterTypeMembers.length; i++) {
                objectMember = this.getMemberSymbol(parameterTypeMembers[i].name, PullElementKind.SomeValue, objectType);

                if (objectMember && objectMember.type && parameterTypeMembers[i].type) {

                    var objectMemberGenerativeTypeKind = objectMember.type.getGenerativeTypeClassification(objectType);
                    var parameterMemberGenerativeTypeKind = parameterTypeMembers[i].type.getGenerativeTypeClassification(parameterType);

                    if ((objectMemberGenerativeTypeKind == GenerativeTypeClassification.InfinitelyExpanding) ||
                        (parameterMemberGenerativeTypeKind == GenerativeTypeClassification.InfinitelyExpanding)) {
                            continue;
                    }

                    this.relateTypeToTypeParameters(objectMember.type, parameterTypeMembers[i].type, shouldFix, argContext, context);
                }
            }

            parameterSignatures = parameterType.getCallSignatures();
            objectSignatures = objectType.getCallSignatures();

            // if: 
            //  - M is a call signature
            //  - no other call signatures exist in T
            //  - exactly one call signature N exists in S
            //  - N is non - generic, and
            //  - the number of required parameters in N is greater than or equal to that of M,
            // then inferences are made from parameter types in N to parameter types in the same position in M, 
            // and from the return type of N to the return type of M.
            if ((parameterSignatures.length == 1) &&
                (objectSignatures.length == 1) &&
                !objectSignatures[0].isGeneric() &&
                (parameterSignatures[0].nonOptionalParamCount >= objectSignatures[0].nonOptionalParamCount)) {

                this.relateFunctionSignatureToTypeParameters(objectSignatures[0], parameterSignatures[0], argContext, context);

            }

            parameterSignatures = parameterType.getConstructSignatures();
            objectSignatures = objectType.getConstructSignatures();

            // if: 
            //  - M is a call signature
            //  - no other call signatures exist in T
            //  - exactly one call signature N exists in S
            //  - N is non - generic, and
            //  - the number of required parameters in N is greater than or equal to that of M,
            // then inferences are made from parameter types in N to parameter types in the same position in M, 
            // and from the return type of N to the return type of M.
            if ((parameterSignatures.length == 1) &&
                (objectSignatures.length == 1) &&
                !objectSignatures[0].isGeneric() &&
                (parameterSignatures[0].nonOptionalParamCount >= objectSignatures[0].nonOptionalParamCount)) {

                this.relateFunctionSignatureToTypeParameters(objectSignatures[0], parameterSignatures[0], argContext, context);

            }

            var parameterIndexSignatures = this.getBothKindsOfIndexSignatures(parameterType, context);
            var objectIndexSignatures = this.getBothKindsOfIndexSignatures(objectType, context);

            // - If M is a string index signature and S contains a string index signature N, inferences are made from the type of N to the type of M.
            // - If M is a numeric index signature and S contains a numeric index signature N, inferences are made from the type of N to the type of M.
            if (parameterIndexSignatures.stringSignature && objectIndexSignatures.stringSignature) {
                this.relateFunctionSignatureToTypeParameters(objectIndexSignatures.stringSignature, parameterIndexSignatures.stringSignature, argContext, context);
            }
            if (parameterIndexSignatures.numericSignature && objectIndexSignatures.numericSignature) {
                this.relateFunctionSignatureToTypeParameters(objectIndexSignatures.numericSignature, parameterIndexSignatures.numericSignature, argContext, context);
            }

        }

        private relateArrayTypeToTypeParameters(argArrayType: PullTypeSymbol,
            parameterArrayType: PullTypeSymbol,
            shouldFix: boolean,
            argContext: ArgumentInferenceContext,
            context: PullTypeResolutionContext): void {

            var argElement = argArrayType.getElementType();
            var paramElement = parameterArrayType.getElementType();

            this.relateTypeToTypeParameters(argElement, paramElement, shouldFix, argContext, context);
        }

        public instantiateTypeToAny(typeToSpecialize: PullTypeSymbol, context: PullTypeResolutionContext): PullTypeSymbol {

            var typeParameters = typeToSpecialize.getTypeParameters();

            if (!typeParameters.length) {
                return typeToSpecialize;
            }

            var typeArguments: PullTypeSymbol[] = null;

            if (!this._cachedAnyTypeArgs) {
                this._cachedAnyTypeArgs = [
                    [this.semanticInfoChain.anyTypeSymbol],
                    [this.semanticInfoChain.anyTypeSymbol, this.semanticInfoChain.anyTypeSymbol],
                    [this.semanticInfoChain.anyTypeSymbol, this.semanticInfoChain.anyTypeSymbol, this.semanticInfoChain.anyTypeSymbol],
                    [this.semanticInfoChain.anyTypeSymbol, this.semanticInfoChain.anyTypeSymbol, this.semanticInfoChain.anyTypeSymbol, this.semanticInfoChain.anyTypeSymbol],
                    [this.semanticInfoChain.anyTypeSymbol, this.semanticInfoChain.anyTypeSymbol, this.semanticInfoChain.anyTypeSymbol, this.semanticInfoChain.anyTypeSymbol, this.semanticInfoChain.anyTypeSymbol]
                ];
            }

            if (typeParameters.length < this._cachedAnyTypeArgs.length) {
                typeArguments = this._cachedAnyTypeArgs[typeParameters.length - 1];
            }
            else {
                // REVIEW: might want to cache these arg lists
                typeArguments = [];

                for (var i = 0; i < typeParameters.length; i++) {
                    typeArguments[typeArguments.length] = this.semanticInfoChain.anyTypeSymbol;
                }
            }

            var type = this.createInstantiatedType(typeToSpecialize, typeArguments);

            return type;
        }

        public static globalTypeCheckPhase = 0;

        // type check infrastructure
        public static typeCheck(compilationSettings: ImmutableCompilationSettings, semanticInfoChain: SemanticInfoChain, document: Document): void {
            var script = document.script();

            var resolver = semanticInfoChain.getResolver();
            var context = new PullTypeResolutionContext(resolver, /*inTypeCheck*/ true, script.fileName());

            if (resolver.canTypeCheckAST(script, context)) {
                resolver.resolveAST(script, /*isContextuallyTyped:*/ false, context);
                resolver.validateVariableDeclarationGroups(semanticInfoChain.getDeclForAST(script), context);

                while (resolver.typeCheckCallBacks.length) {
                    var callBack = resolver.typeCheckCallBacks.pop();
                    callBack(context);
                }

                resolver.processPostTypeCheckWorkItems(context);
            }
        }

        private validateVariableDeclarationGroups(enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            // If we're inside a module, collect the names of imports so we can ensure they don't 
            // conflict with any variable declaration names.
            var importDeclarationNames: IIndexable<boolean> = null;
            if (enclosingDecl.kind & (PullElementKind.Container | PullElementKind.DynamicModule | PullElementKind.Script)) {
                var childDecls = enclosingDecl.getChildDecls();
                for (var i = 0, n = childDecls.length; i < n; i++) {
                    var childDecl = childDecls[i];
                    if (childDecl.kind === PullElementKind.TypeAlias) {
                        importDeclarationNames = importDeclarationNames || createIntrinsicsObject<boolean>();
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
                    var candidateSymbol = this.semanticInfoChain.findTopLevelSymbol(name, PullElementKind.Variable, enclosingDecl);
                    if (candidateSymbol && candidateSymbol.isResolved) {
                        if (!candidateSymbol.anyDeclHasFlag(PullElementFlags.ImplicitVariable)) {
                            firstSymbol = candidateSymbol;
                            firstSymbolType = candidateSymbol.type;
                        }
                    }

                    // Also collect any imports with this name (throughout any of the files)
                    var importSymbol = this.semanticInfoChain.findTopLevelSymbol(name, PullElementKind.TypeAlias, null);
                    if (importSymbol && importSymbol.isAlias()) {
                        importDeclarationNames = importDeclarationNames || createIntrinsicsObject<boolean>();
                    }
                }

                for (var j = 0, j_max = declGroups[i].length; j < j_max; j++) {
                    var decl = declGroups[i][j];
                    var boundDeclAST = this.semanticInfoChain.getASTForDecl(decl);

                    var name = decl.name;

                    // Make sure the variable declaration doesn't conflict with an import declaration.
                    if (importDeclarationNames && importDeclarationNames[name]) {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(boundDeclAST,
                            DiagnosticCode.Variable_declaration_cannot_have_the_same_name_as_an_import_declaration));
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
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(boundDeclAST, DiagnosticCode.Subsequent_variable_declarations_must_have_the_same_type_Variable_0_must_be_of_type_1_but_here_has_type_2, [symbol.getScopedName(), firstSymbolType.toString(), symbolType.toString()]));
                        continue;
                    }
                }
            }
        }

        private typeCheckFunctionOverloads(
            funcDecl: AST,
            context: PullTypeResolutionContext,
            signature?: PullSignatureSymbol,
            allSignatures?: PullSignatureSymbol[]) {

            if (!signature) {
                var functionSignatureInfo = PullHelpers.getSignatureForFuncDecl(this.semanticInfoChain.getDeclForAST(funcDecl));
                signature = functionSignatureInfo.signature;
                allSignatures = functionSignatureInfo.allSignatures;
            }
            var functionDeclaration = this.semanticInfoChain.getDeclForAST(funcDecl);
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
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDecl, DiagnosticCode.Overloads_cannot_differ_only_by_return_type));
                        }
                        else if (funcDecl.nodeType() === SyntaxKind.ConstructorDeclaration) {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDecl, DiagnosticCode.Duplicate_constructor_overload_signature));
                        }
                        else if (functionDeclaration.kind === PullElementKind.ConstructSignature) {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDecl, DiagnosticCode.Duplicate_overload_construct_signature));
                        }
                        else if (functionDeclaration.kind === PullElementKind.CallSignature) {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDecl, DiagnosticCode.Duplicate_overload_call_signature));
                        }
                        else {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDecl, DiagnosticCode.Duplicate_overload_signature_for_0, [funcSymbol.getScopedNameEx().toString()]));
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
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDecl, DiagnosticCode.Overload_signature_implementation_cannot_use_specialized_type));
                } else {
                    var foundSubtypeSignature = false;
                    for (var i = 0; i < allSignatures.length; i++) {
                        if (allSignatures[i].isDefinition() || allSignatures[i] === signature) {
                            continue;
                        }

                        if (!allSignatures[i].isResolved) {
                            this.resolveDeclaredSymbol(allSignatures[i], context);
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
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDecl, DiagnosticCode.Specialized_overload_signature_is_not_subtype_of_any_non_specialized_signature));
                    }
                }
            } else if (definitionSignature && definitionSignature != signature) {
                var comparisonInfo = new TypeComparisonInfo();

                if (!definitionSignature.isResolved) {
                    this.resolveDeclaredSymbol(definitionSignature, context);
                }

                if (!this.signatureIsAssignableToTarget(definitionSignature, signature, context, comparisonInfo)) {
                    // definition signature is not assignable to functionSignature then its incorrect overload signature
                    if (comparisonInfo.message) {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDecl, DiagnosticCode.Overload_signature_is_not_compatible_with_function_definition_NL_0, [comparisonInfo.message]));
                    } else {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDecl, DiagnosticCode.Overload_signature_is_not_compatible_with_function_definition));
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

            if (funcDecl.nodeType() !== SyntaxKind.ConstructorDeclaration && functionDeclaration.kind !== PullElementKind.ConstructSignature && signatureForVisibilityCheck && signature != signatureForVisibilityCheck) {
                var errorCode: string;
                // verify it satisfies all the properties of first signature
                if (signatureForVisibilityCheck.anyDeclHasFlag(PullElementFlags.Private) != signature.anyDeclHasFlag(PullElementFlags.Private)) {
                    errorCode = DiagnosticCode.Overload_signatures_must_all_be_public_or_private;
                }
                else if (signatureForVisibilityCheck.anyDeclHasFlag(PullElementFlags.Exported) != signature.anyDeclHasFlag(PullElementFlags.Exported)) {
                    errorCode = DiagnosticCode.Overload_signatures_must_all_be_exported_or_not_exported;
                }
                else if (signatureForVisibilityCheck.anyDeclHasFlag(PullElementFlags.Ambient) != signature.anyDeclHasFlag(PullElementFlags.Ambient)) {
                    errorCode = DiagnosticCode.Overload_signatures_must_all_be_ambient_or_non_ambient;
                }
                else if (signatureForVisibilityCheck.anyDeclHasFlag(PullElementFlags.Optional) != signature.anyDeclHasFlag(PullElementFlags.Optional)) {
                    errorCode = DiagnosticCode.Overload_signatures_must_all_be_optional_or_required;
                }

                if (errorCode) {
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(funcDecl, errorCode));
                }
            }
        }

        // Privacy checking

        private checkSymbolPrivacy(declSymbol: PullSymbol, symbol: PullSymbol, privacyErrorReporter: (symbol: PullSymbol) => void) {
            if (!symbol || symbol.kind === PullElementKind.Primitive) {
                return;
            }

            if (symbol.isType()) {
                var typeSymbol = <PullTypeSymbol>symbol;
                var isNamedType = typeSymbol.isNamedTypeSymbol();
                if (typeSymbol.inSymbolPrivacyCheck) {
                    if (!isNamedType) {
                        var associatedContainerType = typeSymbol.getAssociatedContainerType();
                        if (associatedContainerType && associatedContainerType.isNamedTypeSymbol()) {
                            this.checkSymbolPrivacy(declSymbol, associatedContainerType, privacyErrorReporter);
                        }
                    }

                    return;
                }

                typeSymbol.inSymbolPrivacyCheck = true;

                var typars = typeSymbol.getTypeArgumentsOrTypeParameters();
                if (typars) {
                    for (var i = 0; i < typars.length; i++) {
                        this.checkSymbolPrivacy(declSymbol, typars[i], privacyErrorReporter);
                    }
                }

                if (!isNamedType) {
                    var members = typeSymbol.getMembers();
                    for (var i = 0; i < members.length; i++) {
                        this.checkSymbolPrivacy(declSymbol, members[i].type, privacyErrorReporter);
                    }

                    this.checkTypePrivacyOfSignatures(declSymbol, typeSymbol.getCallSignatures(), privacyErrorReporter);
                    this.checkTypePrivacyOfSignatures(declSymbol, typeSymbol.getConstructSignatures(), privacyErrorReporter);
                    this.checkTypePrivacyOfSignatures(declSymbol, typeSymbol.getIndexSignatures(), privacyErrorReporter);
                } else if (typeSymbol.kind == PullElementKind.TypeParameter) {
                    this.checkSymbolPrivacy(declSymbol, (<PullTypeParameterSymbol>typeSymbol).getConstraint(), privacyErrorReporter);
                }

                typeSymbol.inSymbolPrivacyCheck = false;

                if (!isNamedType) {
                    return;
                }
            }

            // Check flags for the symbol itself
            if (declSymbol.isExternallyVisible()) {
                // Check if type symbol is externally visible
                var symbolIsVisible = symbol.isExternallyVisible();
                // If Visible check if the type is part of dynamic module
                if (symbolIsVisible && symbol.kind != PullElementKind.TypeParameter) {
                    var symbolPath = symbol.pathToRoot();
                    var declSymbolPath = declSymbol.pathToRoot();
                    // Symbols are from different dynamic modules
                    if (symbolPath[symbolPath.length - 1].kind === PullElementKind.DynamicModule &&
                        declSymbolPath[declSymbolPath.length - 1].kind == PullElementKind.DynamicModule &&
                        declSymbolPath[declSymbolPath.length - 1] != symbolPath[symbolPath.length - 1]) {
                        // Declaration symbol is from different modules
                        // Type may not be visible without import statement
                        symbolIsVisible = false;
                        var declSymbolScope = declSymbolPath[declSymbolPath.length - 1];
                        for (var i = symbolPath.length - 1; i >= 0; i--) {
                            var aliasSymbols = symbolPath[i].getAliasedSymbol(declSymbolScope);
                            if (aliasSymbols) {
                                // Visible type.
                                symbolIsVisible = true;
                                aliasSymbols[0].setTypeUsedExternally(true);
                                break;
                            }
                        }
                        symbol = symbolPath[symbolPath.length - 1];
                    }
                } else if (symbol.kind == PullElementKind.TypeAlias) {
                    var aliasSymbol = <PullTypeAliasSymbol>symbol;
                    symbolIsVisible = true;
                    aliasSymbol.setTypeUsedExternally(true);
                }

                if (!symbolIsVisible) {
                    // declaration is visible from outside but the type isnt - Report error
                    privacyErrorReporter(symbol);
                }
            }
        }

        private checkTypePrivacyOfSignatures(declSymbol: PullSymbol, signatures: PullSignatureSymbol[], privacyErrorReporter: (symbol: PullSymbol) => void) {
            for (var i = 0; i < signatures.length; i++) {
                var signature = signatures[i];
                if (signatures.length > 1 && signature.isDefinition()) {
                    continue;
                }

                var typeParams = signature.getTypeParameters();
                for (var j = 0; j < typeParams.length; j++) {
                    this.checkSymbolPrivacy(declSymbol, typeParams[j], privacyErrorReporter);
                }

                var params = signature.parameters;
                for (var j = 0; j < params.length; j++) {
                    var paramType = params[j].type;
                    this.checkSymbolPrivacy(declSymbol, paramType, privacyErrorReporter);
                }

                var returnType = signature.returnType;
                this.checkSymbolPrivacy(declSymbol, returnType, privacyErrorReporter);
            }
        }

        private typeParameterOfTypeDeclarationPrivacyErrorReporter(classOrInterface: AST, indexOfTypeParameter: number, typeParameter: PullTypeParameterSymbol, symbol: PullSymbol, context: PullTypeResolutionContext) {
            var decl = this.semanticInfoChain.getDeclForAST(classOrInterface);
            var enclosingDecl = this.getEnclosingDecl(decl);
            var enclosingSymbol = enclosingDecl ? enclosingDecl.getSymbol() : null;
            var messageCode: string;

            var typeParameters = classOrInterface.nodeType() === SyntaxKind.ClassDeclaration
                ? (<ClassDeclaration>classOrInterface).typeParameterList
                : (<InterfaceDeclaration>classOrInterface).typeParameterList;

            var typeParameterAST = typeParameters.typeParameters.nonSeparatorAt(indexOfTypeParameter);

            var typeSymbol = <PullTypeSymbol>symbol;
            var typeSymbolName = typeSymbol.getScopedName(enclosingSymbol);
            if (typeSymbol.isContainer() && !typeSymbol.isEnum()) {
                if (!isQuoted(typeSymbolName)) {
                    typeSymbolName = "'" + typeSymbolName + "'";
                }
                if (classOrInterface.nodeType() === SyntaxKind.ClassDeclaration) {
                    // Class
                    messageCode = DiagnosticCode.TypeParameter_0_of_exported_class_is_using_inaccessible_module_1;
                } else {
                    // Interface
                    messageCode = DiagnosticCode.TypeParameter_0_of_exported_interface_is_using_inaccessible_module_1;
                }
            } else {
                if (classOrInterface.nodeType() === SyntaxKind.ClassDeclaration) {
                    // Class
                    messageCode = DiagnosticCode.TypeParameter_0_of_exported_class_has_or_is_using_private_type_1;
                } else {
                    // Interface
                    messageCode = DiagnosticCode.TypeParameter_0_of_exported_interface_has_or_is_using_private_type_1;
                }
            }

            var messageArguments = [typeParameter.getScopedName(enclosingSymbol, true /*useConstraintInName*/), typeSymbolName];
            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(typeParameterAST, messageCode, messageArguments));
        }

        private baseListPrivacyErrorReporter(classOrInterface: AST, declSymbol: PullTypeSymbol, baseAst: AST, isExtendedType: boolean, symbol: PullSymbol, context: PullTypeResolutionContext) {
            var decl = this.semanticInfoChain.getDeclForAST(classOrInterface);
            var enclosingDecl = this.getEnclosingDecl(decl);
            var enclosingSymbol = enclosingDecl ? enclosingDecl.getSymbol() : null;
            var messageCode: string;

            var typeSymbol = <PullTypeSymbol>symbol;
            var typeSymbolName = typeSymbol.getScopedName(enclosingSymbol);
            if (typeSymbol.isContainer() && !typeSymbol.isEnum()) {
                if (!isQuoted(typeSymbolName)) {
                    typeSymbolName = "'" + typeSymbolName + "'";
                }
                if (classOrInterface.nodeType() === SyntaxKind.ClassDeclaration) {
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
            }
            else {
                if (classOrInterface.nodeType() === SyntaxKind.ClassDeclaration) {
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
            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(baseAst, messageCode, messageArguments));
        }

        private variablePrivacyErrorReporter(declAST: AST, declSymbol: PullSymbol, symbol: PullSymbol, context: PullTypeResolutionContext) {
            var typeSymbol = <PullTypeSymbol>symbol;
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

                if (declSymbol.anyDeclHasFlag(PullElementFlags.Static)) {
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
                if (declSymbol.anyDeclHasFlag(PullElementFlags.Static)) {
                    messageCode = DiagnosticCode.Public_static_property_0_of_exported_class_has_or_is_using_private_type_1;
                } else if (isProperty) {
                    if (isPropertyOfClass) {
                        messageCode = DiagnosticCode.Public_property_0_of_exported_class_has_or_is_using_private_type_1;
                    } else {
                        messageCode = DiagnosticCode.Property_0_of_exported_interface_has_or_is_using_private_type_1;
                    }
                }
                else {
                    messageCode = DiagnosticCode.Exported_variable_0_has_or_is_using_private_type_1;
                }
            }

            var messageArguments = [declSymbol.getScopedName(enclosingSymbol), typeSymbolName];
            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(declAST, messageCode, messageArguments));
        }

        private checkFunctionTypePrivacy(
            funcDeclAST: AST,
            isStatic: boolean,
            typeParameters: TypeParameterList,
            parameters: IParameters,
            returnTypeAnnotation: AST,
            block: Block,
            context: PullTypeResolutionContext) {

            if (funcDeclAST.nodeType() === SyntaxKind.FunctionExpression ||
                funcDeclAST.nodeType() === SyntaxKind.FunctionPropertyAssignment ||
                (funcDeclAST.nodeType() === SyntaxKind.GetAccessor && funcDeclAST.parent.parent.nodeType() === SyntaxKind.ObjectLiteralExpression) ||
                (funcDeclAST.nodeType() === SyntaxKind.SetAccessor && funcDeclAST.parent.parent.nodeType() === SyntaxKind.ObjectLiteralExpression)) {
                return;
            }

            var functionDecl = this.semanticInfoChain.getDeclForAST(funcDeclAST);
            var functionSymbol = functionDecl.getSymbol();;
            var functionSignature: PullSignatureSymbol;

            var isGetter = funcDeclAST.nodeType() === SyntaxKind.GetAccessor;
            var isSetter = funcDeclAST.nodeType() === SyntaxKind.SetAccessor;
            var isIndexSignature = functionDecl.kind === PullElementKind.IndexSignature;

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
                }
                else if (functionSymbol.kind == PullElementKind.Method &&
                         !isStatic &&
                         !functionSymbol.getContainer().isNamedTypeSymbol()) {
                    // method of the unnmaed type
                    return;
                }
                functionSignature = functionDecl.getSignatureSymbol();
            }

            // TypeParameters
            if (typeParameters && !isGetter && !isSetter && !isIndexSignature && funcDeclAST.nodeType() !== SyntaxKind.ConstructorDeclaration) {
                for (var i = 0; i < typeParameters.typeParameters.nonSeparatorCount(); i++) {
                    var typeParameterAST = <TypeParameter>typeParameters.typeParameters.nonSeparatorAt(i);
                    var typeParameter = this.resolveTypeParameterDeclaration(typeParameterAST, context);
                    this.checkSymbolPrivacy(functionSymbol, typeParameter, (symbol: PullSymbol) =>
                        this.functionTypeArgumentArgumentTypePrivacyErrorReporter(
                            funcDeclAST, isStatic, typeParameterAST, typeParameter, symbol, context));
                }
            }

            // Check function parameters
            if (!isGetter && !isIndexSignature) {
                var funcParams = functionSignature.parameters;
                for (var i = 0; i < funcParams.length; i++) {
                    this.checkSymbolPrivacy(functionSymbol, funcParams[i].type, (symbol: PullSymbol) =>
                        this.functionArgumentTypePrivacyErrorReporter(
                            funcDeclAST, isStatic, parameters, i, funcParams[i], symbol, context));
                }
            }

            // Check return type
            if (!isSetter) {
                this.checkSymbolPrivacy(functionSymbol, functionSignature.returnType, (symbol: PullSymbol) =>
                    this.functionReturnTypePrivacyErrorReporter(
                        funcDeclAST, isStatic, returnTypeAnnotation, block, functionSignature.returnType, symbol, context));
            }
        }

        private functionTypeArgumentArgumentTypePrivacyErrorReporter(
            declAST: AST,
            isStatic: boolean,
            typeParameterAST: TypeParameter,
            typeParameter: PullTypeSymbol,
            symbol: PullSymbol,
            context: PullTypeResolutionContext) {

            var decl = this.semanticInfoChain.getDeclForAST(declAST);
            var enclosingDecl = this.getEnclosingDecl(decl);
            var enclosingSymbol = enclosingDecl ? enclosingDecl.getSymbol() : null;

            var isMethod = decl.kind === PullElementKind.Method;
            var isMethodOfClass = false;
            var declParent = decl.getParentDecl();
            if (declParent && (declParent.kind === PullElementKind.Class || isStatic)) {
                isMethodOfClass = true;
            }

            var typeSymbol = <PullTypeSymbol>symbol;
            var typeSymbolName = typeSymbol.getScopedName(enclosingSymbol);
            var messageCode: string;
            if (typeSymbol.isContainer() && !typeSymbol.isEnum()) {
                if (!isQuoted(typeSymbolName)) {
                    typeSymbolName = "'" + typeSymbolName + "'";
                }

                if (decl.kind === PullElementKind.ConstructSignature) {
                    messageCode = DiagnosticCode.TypeParameter_0_of_constructor_signature_from_exported_interface_is_using_inaccessible_module_1;
                } else if (decl.kind === PullElementKind.CallSignature) {
                    messageCode = DiagnosticCode.TypeParameter_0_of_call_signature_from_exported_interface_is_using_inaccessible_module_1;
                } else if (isMethod) {
                    if (isStatic) {
                        messageCode = DiagnosticCode.TypeParameter_0_of_public_static_method_from_exported_class_is_using_inaccessible_module_1;
                    } else if (isMethodOfClass) {
                        messageCode = DiagnosticCode.TypeParameter_0_of_public_method_from_exported_class_is_using_inaccessible_module_1;
                    } else {
                        messageCode = DiagnosticCode.TypeParameter_0_of_method_from_exported_interface_is_using_inaccessible_module_1;
                    }
                } else {
                    messageCode = DiagnosticCode.TypeParameter_0_of_exported_function_is_using_inaccessible_module_1;
                }
            } else {
                if (decl.kind === PullElementKind.ConstructSignature) {
                    messageCode = DiagnosticCode.TypeParameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_type_1;
                }
                else if (decl.kind === PullElementKind.CallSignature) {
                    messageCode = DiagnosticCode.TypeParameter_0_of_call_signature_from_exported_interface_has_or_is_using_private_type_1;
                }
                else if (isMethod) {
                    if (isStatic) {
                        messageCode = DiagnosticCode.TypeParameter_0_of_public_static_method_from_exported_class_has_or_is_using_private_type_1;
                    } else if (isMethodOfClass) {
                        messageCode = DiagnosticCode.TypeParameter_0_of_public_method_from_exported_class_has_or_is_using_private_type_1;
                    } else {
                        messageCode = DiagnosticCode.TypeParameter_0_of_method_from_exported_interface_has_or_is_using_private_type_1;
                    }
                } else {
                    messageCode = DiagnosticCode.TypeParameter_0_of_exported_function_has_or_is_using_private_type_1;
                }
            }

            if (messageCode) {
                var messageArgs = [typeParameter.getScopedName(enclosingSymbol, true /*usedConstraintInName*/), typeSymbolName];
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(typeParameterAST, messageCode, messageArgs));
            }
        }

        private functionArgumentTypePrivacyErrorReporter(
            declAST: AST,
            isStatic: boolean,
            parameters: IParameters,
            argIndex: number,
            paramSymbol: PullSymbol,
            symbol: PullSymbol,
            context: PullTypeResolutionContext) {

            var decl = this.semanticInfoChain.getDeclForAST(declAST);
            var enclosingDecl = this.getEnclosingDecl(decl);
            var enclosingSymbol = enclosingDecl ? enclosingDecl.getSymbol() : null;

            var isGetter = declAST.nodeType() === SyntaxKind.GetAccessor;
            var isSetter = declAST.nodeType() === SyntaxKind.SetAccessor;
            var isMethod = decl.kind === PullElementKind.Method;
            var isMethodOfClass = false;
            var declParent = decl.getParentDecl();
            if (declParent && (declParent.kind === PullElementKind.Class || isStatic)) {
                isMethodOfClass = true;
            }

            var typeSymbol = <PullTypeSymbol>symbol;
            var typeSymbolName = typeSymbol.getScopedName(enclosingSymbol);
            var messageCode: string;
            if (typeSymbol.isContainer() && !typeSymbol.isEnum()) {
                if (!isQuoted(typeSymbolName)) {
                    typeSymbolName = "'" + typeSymbolName + "'";
                }

                if (declAST.nodeType() === SyntaxKind.ConstructorDeclaration) {
                    messageCode = DiagnosticCode.Parameter_0_of_constructor_from_exported_class_is_using_inaccessible_module_1;
                } else if (isSetter) {
                    if (isStatic) {
                        messageCode = DiagnosticCode.Parameter_0_of_public_static_property_setter_from_exported_class_is_using_inaccessible_module_1;
                    }
                    else {
                        messageCode = DiagnosticCode.Parameter_0_of_public_property_setter_from_exported_class_is_using_inaccessible_module_1;
                    }
                }
                else if (decl.kind === PullElementKind.ConstructSignature) {
                    messageCode = DiagnosticCode.Parameter_0_of_constructor_signature_from_exported_interface_is_using_inaccessible_module_1;
                }
                else if (decl.kind === PullElementKind.CallSignature) {
                    messageCode = DiagnosticCode.Parameter_0_of_call_signature_from_exported_interface_is_using_inaccessible_module_1;
                }
                else if (isMethod) {
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
                if (declAST.nodeType() === SyntaxKind.ConstructorDeclaration) {
                    messageCode = DiagnosticCode.Parameter_0_of_constructor_from_exported_class_has_or_is_using_private_type_1;
                }
                else if (isSetter) {
                    if (isStatic) {
                        messageCode = DiagnosticCode.Parameter_0_of_public_static_property_setter_from_exported_class_has_or_is_using_private_type_1;
                    } else {
                        messageCode = DiagnosticCode.Parameter_0_of_public_property_setter_from_exported_class_has_or_is_using_private_type_1;
                    }
                }
                else if (decl.kind === PullElementKind.ConstructSignature) {
                    messageCode = DiagnosticCode.Parameter_0_of_constructor_signature_from_exported_interface_has_or_is_using_private_type_1;
                }
                else if (decl.kind === PullElementKind.CallSignature) {
                    messageCode = DiagnosticCode.Parameter_0_of_call_signature_from_exported_interface_has_or_is_using_private_type_1;
                } else if (isMethod) {
                    if (isStatic) {
                        messageCode = DiagnosticCode.Parameter_0_of_public_static_method_from_exported_class_has_or_is_using_private_type_1;
                    } else if (isMethodOfClass) {
                        messageCode = DiagnosticCode.Parameter_0_of_public_method_from_exported_class_has_or_is_using_private_type_1;
                    } else {
                        messageCode = DiagnosticCode.Parameter_0_of_method_from_exported_interface_has_or_is_using_private_type_1;
                    }
                }
                else if (!isGetter && decl.kind !== PullElementKind.IndexSignature) {
                    messageCode = DiagnosticCode.Parameter_0_of_exported_function_has_or_is_using_private_type_1;
                }
            }

            if (messageCode) {
                var parameter = parameters.astAt(argIndex);

                var messageArgs = [paramSymbol.getScopedName(enclosingSymbol), typeSymbolName];
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(parameter, messageCode, messageArgs));
            }
        }

        private functionReturnTypePrivacyErrorReporter(
            declAST: AST,
            isStatic: boolean,
            returnTypeAnnotation: AST,
            block: Block,
            funcReturnType: PullTypeSymbol,
            symbol: PullSymbol,
            context: PullTypeResolutionContext) {

            var decl = this.semanticInfoChain.getDeclForAST(declAST);
            var enclosingDecl = this.getEnclosingDecl(decl);

            var isGetter = declAST.nodeType() === SyntaxKind.GetAccessor;
            var isSetter = declAST.nodeType() === SyntaxKind.SetAccessor;
            var isMethod = decl.kind === PullElementKind.Method;
            var isMethodOfClass = false;
            var declParent = decl.getParentDecl();
            if (declParent && (declParent.kind === PullElementKind.Class || isStatic)) {
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
                }
                else if (decl.kind === PullElementKind.ConstructSignature) {
                    messageCode = DiagnosticCode.Return_type_of_constructor_signature_from_exported_interface_is_using_inaccessible_module_0;
                }
                else if (decl.kind === PullElementKind.CallSignature) {
                    messageCode = DiagnosticCode.Return_type_of_call_signature_from_exported_interface_is_using_inaccessible_module_0;
                }
                else if (decl.kind === PullElementKind.IndexSignature) {
                    messageCode = DiagnosticCode.Return_type_of_index_signature_from_exported_interface_is_using_inaccessible_module_0;
                } else if (isMethod) {
                    if (isStatic) {
                        messageCode = DiagnosticCode.Return_type_of_public_static_method_from_exported_class_is_using_inaccessible_module_0;
                    } else if (isMethodOfClass) {
                        messageCode = DiagnosticCode.Return_type_of_public_method_from_exported_class_is_using_inaccessible_module_0;
                    } else {
                        messageCode = DiagnosticCode.Return_type_of_method_from_exported_interface_is_using_inaccessible_module_0;
                    }
                }
                else if (!isSetter && declAST.nodeType() !== SyntaxKind.ConstructorDeclaration) {
                    messageCode = DiagnosticCode.Return_type_of_exported_function_is_using_inaccessible_module_0;
                }
            } else {
                if (isGetter) {
                    if (isStatic) {
                        messageCode = DiagnosticCode.Return_type_of_public_static_property_getter_from_exported_class_has_or_is_using_private_type_0;
                    }
                    else {
                        messageCode = DiagnosticCode.Return_type_of_public_property_getter_from_exported_class_has_or_is_using_private_type_0;
                    }
                }
                else if (decl.kind === PullElementKind.ConstructSignature) {
                    messageCode = DiagnosticCode.Return_type_of_constructor_signature_from_exported_interface_has_or_is_using_private_type_0;
                }
                else if (decl.kind === PullElementKind.CallSignature) {
                    messageCode = DiagnosticCode.Return_type_of_call_signature_from_exported_interface_has_or_is_using_private_type_0;
                }
                else if (decl.kind === PullElementKind.IndexSignature) {
                    messageCode = DiagnosticCode.Return_type_of_index_signature_from_exported_interface_has_or_is_using_private_type_0;
                }
                else if (isMethod) {
                    if (isStatic) {
                        messageCode = DiagnosticCode.Return_type_of_public_static_method_from_exported_class_has_or_is_using_private_type_0;
                    } else if (isMethodOfClass) {
                        messageCode = DiagnosticCode.Return_type_of_public_method_from_exported_class_has_or_is_using_private_type_0;
                    } else {
                        messageCode = DiagnosticCode.Return_type_of_method_from_exported_interface_has_or_is_using_private_type_0;
                    }
                }
                else if (!isSetter && declAST.nodeType() !== SyntaxKind.ConstructorDeclaration) {
                    messageCode = DiagnosticCode.Return_type_of_exported_function_has_or_is_using_private_type_0;
                }
            }

            if (messageCode) {
                var messageArguments = [typeSymbolName];
                var reportOnFuncDecl = false;

                if (returnTypeAnnotation) {
                    // NOTE: we don't want to report this diagnostics.  They'll already have been 
                    // reported when we first hit the return statement.
                    var returnExpressionSymbol = this.resolveTypeReference(returnTypeAnnotation, context);
                    
                    if (PullHelpers.typeSymbolsAreIdentical(returnExpressionSymbol, funcReturnType)) {
                        // Error coming from return annotation
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(returnTypeAnnotation, messageCode, messageArguments));
                    }
                }

                if (block) {
                    var reportErrorOnReturnExpressions = (ast: AST, walker: IAstWalker) => {
                        var go = true;
                        switch (ast.nodeType()) {
                            case SyntaxKind.FunctionDeclaration:
                            case SyntaxKind.SimpleArrowFunctionExpression:
                            case SyntaxKind.ParenthesizedArrowFunctionExpression:
                            case SyntaxKind.FunctionExpression:
                                // don't recurse into a function decl - we don't want to confuse a nested
                                // return type with the top-level function's return type
                                go = false;
                                break;

                            case SyntaxKind.ReturnStatement:
                                var returnStatement: ReturnStatement = <ReturnStatement>ast;
                                var returnExpressionSymbol = this.resolveAST(returnStatement.expression, false, context).type;
                                // Check if return statement's type matches the one that we concluded
                                if (PullHelpers.typeSymbolsAreIdentical(returnExpressionSymbol, funcReturnType)) {
                                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(returnStatement, messageCode, messageArguments));
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

                    getAstWalkerFactory().walk(block, reportErrorOnReturnExpressions);
                }

                if (reportOnFuncDecl) {
                    // Show on function decl
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(declAST, messageCode, messageArguments));
                }
            }
        }

        private enclosingClassIsDerived(classDecl: PullDecl): boolean {
            Debug.assert(classDecl.kind === PullElementKind.Class);

            var classSymbol = <PullTypeSymbol>classDecl.getSymbol();
            return classSymbol.getExtendedTypes().length > 0;
        }

        private isSuperInvocationExpression(ast: AST): boolean {
            if (ast.nodeType() === SyntaxKind.InvocationExpression) {
                var invocationExpression = <InvocationExpression>ast;
                if (invocationExpression.expression.nodeType() === SyntaxKind.SuperKeyword) {
                    return true;
                }
            }

            return false;
        }

        private isSuperInvocationExpressionStatement(node: AST): boolean {
            if (node && node.nodeType() === SyntaxKind.ExpressionStatement) {
                var expressionStatement = <ExpressionStatement>node;
                if (this.isSuperInvocationExpression(expressionStatement.expression)) {
                    return true;
                }
            }
            return false;
        }

        private getFirstStatementOfBlockOrNull(block: Block): AST {
            if (block && block.statements && block.statements.childCount() > 0) {
                return block.statements.childAt(0);
            }

            return null;
        }

        private superCallMustBeFirstStatementInConstructor(constructorDecl: PullDecl): boolean {
            Debug.assert(constructorDecl.kind === PullElementKind.ConstructorMethod);

            /*
            The first statement in the body of a constructor must be a super call if both of the following are true:
                •   The containing class is a derived class.
                •   The constructor declares parameter properties or the containing class declares instance member variables with initializers.
            In such a required super call, it is a compile-time error for argument expressions to reference this.
            */
            if (constructorDecl) {
                var enclosingClass = constructorDecl.getParentDecl();

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
                            if (ast.nodeType() === SyntaxKind.Parameter) {
                                return true;
                            }

                            if (ast.nodeType() === SyntaxKind.MemberVariableDeclaration) {
                                var variableDeclarator = <MemberVariableDeclaration>ast;
                                if (variableDeclarator.variableDeclarator.equalsValueClause) {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }

            return false;
        }

        private checkForThisCaptureInArrowFunction(expression: AST): void {
            var enclosingDecl = this.getEnclosingDeclForAST(expression);

            var declPath = enclosingDecl.getParentPath();

            // work back up the decl path, until you can find a class
            // PULLTODO: Obviously not completely correct, but this sufficiently unblocks testing of the pull model
            if (declPath.length) {
                var inArrowFunction = false;
                for (var i = declPath.length - 1; i >= 0; i--) {
                    var decl = declPath[i];
                    var declKind = decl.kind;
                    var declFlags = decl.flags;

                    if (declKind === PullElementKind.FunctionExpression &&
                        hasFlag(declFlags, PullElementFlags.ArrowFunction)) {

                        inArrowFunction = true;
                        continue;
                    }

                    if (inArrowFunction) {
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
                    if ((member.name || (member.kind === PullElementKind.Property && member.name === "")) &&
                        member.kind !== PullElementKind.ConstructorMethod &&
                        !hasFlag(member.flags, PullElementFlags.Static)) {

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

            if (!this.sourceIsSubtypeOfTarget(member.type, indexSignature.returnType, context, comparisonInfo)) {
                if (isNumeric) {
                    if (comparisonInfo.message) {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(astForError, DiagnosticCode.All_numerically_named_properties_must_be_subtypes_of_numeric_indexer_type_0_NL_1,
                            [indexSignature.returnType.toString(), comparisonInfo.message]));
                    } else {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(astForError, DiagnosticCode.All_numerically_named_properties_must_be_subtypes_of_numeric_indexer_type_0,
                            [indexSignature.returnType.toString()]));
                    }
                }
                else {
                    if (comparisonInfo.message) {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(astForError, DiagnosticCode.All_named_properties_must_be_subtypes_of_string_indexer_type_0_NL_1,
                            [indexSignature.returnType.toString(), comparisonInfo.message]));
                    } else {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(astForError, DiagnosticCode.All_named_properties_must_be_subtypes_of_string_indexer_type_0,
                            [indexSignature.returnType.toString()]));
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

        private typeCheckIfTypeExtendsType(
            classOrInterface: AST,
            name: Identifier,
            typeSymbol: PullTypeSymbol,
            extendedType: PullTypeSymbol,
            enclosingDecl: PullDecl,
            context: PullTypeResolutionContext) {

            var typeMembers = typeSymbol.getMembers();

                var comparisonInfo = new TypeComparisonInfo();
                var foundError = false;
                var foundError1 = false;
                var foundError2 = false;

            // Check members
            for (var i = 0; i < typeMembers.length; i++) {
                var propName = typeMembers[i].name;
                var extendedTypeProp = extendedType.findMember(propName, /*lookInParent*/ true);
                if (extendedTypeProp) {
                    this.resolveDeclaredSymbol(extendedTypeProp, context);
                    foundError1 = !this.typeCheckIfTypeMemberPropertyOkToOverride(typeSymbol, extendedType, typeMembers[i], extendedTypeProp, enclosingDecl, comparisonInfo);

                    if (!foundError1) {
                        foundError2 = !this.sourcePropertyIsSubtypeOfTargetProperty(typeSymbol, extendedType, typeMembers[i], extendedTypeProp, context, comparisonInfo);
                    }

                    if (foundError1 || foundError2) {
                        foundError = true;
                        break;
                    }
                }
            }

            // Check call signatures
            if (!foundError && typeSymbol.hasOwnCallSignatures()) {
                foundError = !this.sourceCallSignaturesAreSubtypeOfTargetCallSignatures(typeSymbol, extendedType, context, comparisonInfo);
            }

            // Check construct signatures
            if (!foundError && typeSymbol.hasOwnConstructSignatures()) {
                foundError = !this.sourceConstructSignaturesAreSubtypeOfTargetConstructSignatures(typeSymbol, extendedType, context, comparisonInfo);
            }

            // Check index signatures
            if (!foundError && typeSymbol.hasOwnIndexSignatures()) {
                foundError = !this.sourceIndexSignaturesAreSubtypeOfTargetIndexSignatures(typeSymbol, extendedType, context, comparisonInfo);
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
                        var extendedConstructorTypeProp = extendedConstructorType.findMember(propName, /*lookInParent*/ true);
                        if (extendedConstructorTypeProp) {
                            if (!extendedConstructorTypeProp.isResolved) {
                                this.resolveDeclaredSymbol(extendedConstructorTypeProp, context);
                            }

                            // check if type of property is subtype of extended type's property type
                            var typeConstructorTypePropType = typeConstructorTypeMembers[i].type;
                            var extendedConstructorTypePropType = extendedConstructorTypeProp.type;
                            if (!this.sourceIsSubtypeOfTarget(typeConstructorTypePropType, extendedConstructorTypePropType, context, comparisonInfoForPropTypeCheck)) {
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

                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(name, errorCode, [typeSymbol.getScopedName(), extendedType.getScopedName(), comparisonInfo.message]));
            }
        }

        private typeCheckIfClassImplementsType(
            classDecl: ClassDeclaration,
            classSymbol: PullTypeSymbol,
            implementedType: PullTypeSymbol,
            enclosingDecl: PullDecl,
            context: PullTypeResolutionContext) {

            var comparisonInfo = new TypeComparisonInfo();
            var foundError = !this.sourceMembersAreSubtypeOfTargetMembers(classSymbol, implementedType, context, comparisonInfo);
            if (!foundError) {
                foundError = !this.sourceCallSignaturesAreSubtypeOfTargetCallSignatures(classSymbol, implementedType, context, comparisonInfo);
                if (!foundError) {
                    foundError = !this.sourceConstructSignaturesAreSubtypeOfTargetConstructSignatures(classSymbol, implementedType, context, comparisonInfo);
                    if (!foundError) {
                        foundError = !this.sourceIndexSignaturesAreSubtypeOfTargetIndexSignatures(classSymbol, implementedType, context, comparisonInfo);
                    }
                }
            }

            // Report error
            if (foundError) {
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(classDecl.identifier, DiagnosticCode.Class_0_declares_interface_1_but_does_not_implement_it_NL_2, [classSymbol.getScopedName(), implementedType.getScopedName(), comparisonInfo.message]));
            }
        }

        private hasClassTypeSymbolConflictAsValue(
            valueDeclAST: Identifier,
            typeSymbol: PullTypeSymbol,
            enclosingDecl: PullDecl,
            context: PullTypeResolutionContext) {

            var typeSymbolAlias = this.semanticInfoChain.getAliasSymbolForAST(valueDeclAST);
            var valueSymbol = this.computeNameExpression(valueDeclAST, context, /*reportDiagnostics:*/ false);
            var valueSymbolAlias = this.semanticInfoChain.getAliasSymbolForAST(valueDeclAST);

            // Reset the alias value 
            this.semanticInfoChain.setAliasSymbolForAST(valueDeclAST, typeSymbolAlias);

            // If aliases are same
            if (typeSymbolAlias && valueSymbolAlias) {
                return typeSymbolAlias != valueSymbolAlias;
            }

            // Verify if value refers to same class;
            if (!valueSymbol.anyDeclHasFlag(PullElementFlags.ClassConstructorVariable)) {
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

        private typeCheckBase(
            classOrInterface: AST,
            name: Identifier,
            typeSymbol: PullTypeSymbol,
            baseDeclAST: AST,
            isExtendedType: boolean,
            enclosingDecl: PullDecl,
            context: PullTypeResolutionContext) {

            var typeDecl = this.semanticInfoChain.getDeclForAST(classOrInterface);

            var baseType = this.resolveTypeReference(baseDeclAST, context).type;

            if (!baseType) {
                return;
            }

            var typeDeclIsClass = typeSymbol.isClass();

            if (!typeSymbol.isValidBaseKind(baseType, isExtendedType)) {
                // Report error about invalid base kind
                if (!baseType.isError()) {
                    if (isExtendedType) {
                        if (typeDeclIsClass) {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(baseDeclAST, DiagnosticCode.A_class_may_only_extend_another_class));
                        } else {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(baseDeclAST, DiagnosticCode.An_interface_may_only_extend_another_class_or_interface));
                        }
                    } else {
                        context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(baseDeclAST, DiagnosticCode.A_class_may_only_implement_another_class_or_interface));
                    }
                }
                return;
            } else if (typeDeclIsClass && isExtendedType && baseDeclAST.nodeType() == SyntaxKind.IdentifierName) {
                // Verify if the class extends another class verify the value position resolves to the same type expression
                if (this.hasClassTypeSymbolConflictAsValue(<Identifier>baseDeclAST, baseType, enclosingDecl, context)) {
                    // Report error
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(baseDeclAST, DiagnosticCode.Type_reference_0_in_extends_clause_does_not_reference_constructor_function_for_1, [(<Identifier>baseDeclAST).text(), baseType.toString(enclosingDecl ? enclosingDecl.getSymbol() : null)]));
                }
            }

            // Check if its a recursive extend/implement type
            if (baseType.hasBase(typeSymbol)) {
                typeSymbol.setHasBaseTypeConflict();
                baseType.setHasBaseTypeConflict();
                // Report error
                context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(name,
                    typeDeclIsClass ? DiagnosticCode.Class_0_is_recursively_referenced_as_a_base_type_of_itself : DiagnosticCode.Interface_0_is_recursively_referenced_as_a_base_type_of_itself, [typeSymbol.getScopedName()]));
                return;
            }

            if (isExtendedType) {
                // Verify all own overriding members are subtype
                this.typeCheckIfTypeExtendsType(classOrInterface, name, typeSymbol, baseType, enclosingDecl, context);
            }
            else {
                Debug.assert(classOrInterface.nodeType() === SyntaxKind.ClassDeclaration);
                // If class implementes interface or class, verify all the public members are implemented
                this.typeCheckIfClassImplementsType(<ClassDeclaration>classOrInterface, typeSymbol, baseType, enclosingDecl, context);
            }

            // Privacy error:
            this.checkSymbolPrivacy(typeSymbol, baseType, (errorSymbol: PullSymbol) =>
                this.baseListPrivacyErrorReporter(classOrInterface, typeSymbol, baseDeclAST, isExtendedType, errorSymbol, context));
        }

        private typeCheckBases(classOrInterface: AST, name: Identifier, heritageClauses: ASTList, typeSymbol: PullTypeSymbol, enclosingDecl: PullDecl, context: PullTypeResolutionContext) {
            var extendsClause = getExtendsHeritageClause(heritageClauses);
            var implementsClause = getImplementsHeritageClause(heritageClauses);
            if (!extendsClause && !implementsClause) {
                return;
            }

            var typeDeclIsClass = classOrInterface.nodeType() === SyntaxKind.ClassDeclaration;

            if (extendsClause) {
                for (var i = 0; i < extendsClause.typeNames.nonSeparatorCount(); i++) {
                    this.typeCheckBase(classOrInterface, name, typeSymbol, extendsClause.typeNames.nonSeparatorAt(i), /*isExtendedType:*/ true, enclosingDecl, context);
                }
            }

            if (typeSymbol.isClass()) {
                if (implementsClause) {
                    for (var i = 0; i < implementsClause.typeNames.nonSeparatorCount(); i++) {
                        this.typeCheckBase(classOrInterface, name, typeSymbol, implementsClause.typeNames.nonSeparatorAt(i), /*isExtendedType:*/false, enclosingDecl, context);
                    }
                }
            }
            else if (extendsClause && !typeSymbol.hasBaseTypeConflict() && typeSymbol.getExtendedTypes().length > 1) {
                // October 16, 2013: Section 7.1:
                // Inherited properties with the same name must be identical (section 3.8.2).

                // If it is an interface it can extend multiple base types. We need to check for clashes
                // between inherited properties with the same name, per the spec. Note that we only do this
                // once per symbol, not once per declaration. We use the first declaration that has an
                // extends clause. Here is an example:
                // interface A {
                //    m: string;
                // }
                // interface B {
                //    m: number;
                // }
                // interface C extends A {}
                // interface C extends B {}
                // Here, we only report the error on the first C, because it is the first declaration
                // that has an extends clause. Since an interface cannot have an implements clause
                // (by the grammar) we only have to check that it has a heritage clause.
                var firstInterfaceASTWithExtendsClause = ArrayUtilities.firstOrDefault(typeSymbol.getDeclarations(), decl => 
                    (<InterfaceDeclaration>decl.ast()).heritageClauses !== null).ast();
                if (classOrInterface === firstInterfaceASTWithExtendsClause) {
                    this.checkPropertyTypeIdentityBetweenBases(classOrInterface, name, typeSymbol, context);
                }
            }
        }

        private checkPropertyTypeIdentityBetweenBases(
            classOrInterface: AST,
            name: Identifier,
            typeSymbol: PullTypeSymbol,
            context: PullTypeResolutionContext): void {

            // October 16, 2013: Section 7.1:
            // Inherited properties with the same name must be identical (section 3.8.2).
            // The membersBag will map each member name to its type and which base type we got it from
            var membersBag = createIntrinsicsObject<{ type: PullTypeSymbol; baseOrigin: PullTypeSymbol; }>();
            var baseTypes = typeSymbol.getExtendedTypes();
            for (var i = 0; i < baseTypes.length; i++) {
                var baseMembers = baseTypes[i].getAllMembers(PullElementKind.Property | PullElementKind.Method, GetAllMembersVisiblity.all);
                for (var j = 0; j < baseMembers.length; j++) {
                    var member = baseMembers[j];
                    var memberName = member.name;
                    // Skip the member if it is shadowed in the derived type
                    if (typeSymbol.findMember(memberName, /*lookInParent*/ false)) {
                        continue;
                    }

                    // Error if there is already a member in the bag with that name, and it doesn't have the same type
                    if (membersBag[memberName]) {
                        var prevMember = membersBag[memberName];
                        if (prevMember.baseOrigin !== baseTypes[i] && !this.typesAreIdentical(member.type, prevMember.type)) {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(name,
                                DiagnosticCode.Interface_0_cannot_simultaneously_extend_types_1_and_2_NL_Types_of_property_3_of_types_1_and_2_are_not_identical,
                                [typeSymbol.getDisplayName(), prevMember.baseOrigin.getScopedName(), baseTypes[i].getScopedName(), memberName]));
                            return; // Only report first offense
                        }
                    }
                    else {
                        membersBag[memberName] = {
                            type: member.type,
                            baseOrigin: baseTypes[i]
                        };
                    }
                }
            }
        }

        private checkAssignability(ast: AST, source: PullTypeSymbol, target: PullTypeSymbol, context: PullTypeResolutionContext): void {
            var comparisonInfo = new TypeComparisonInfo();

            var isAssignable = this.sourceIsAssignableToTarget(source, target, context, comparisonInfo);

            if (!isAssignable) {
                if (comparisonInfo.message) {
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(ast, DiagnosticCode.Cannot_convert_0_to_1_NL_2, [source.toString(), target.toString(), comparisonInfo.message]));
                } else {
                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(ast, DiagnosticCode.Cannot_convert_0_to_1, [source.toString(), target.toString()]));
                }
            }
        }

        private isReference(ast: AST, astSymbol: PullSymbol): boolean {
            // References are the subset of expressions that are permitted as the target of an 
            // assignment.Specifically, references are combinations of identifiers(section 4.3),
            // parentheses(section 4.7), and property accesses(section 4.10).All other expression
            //  constructs described in this chapter are classified as values.

            if (ast.nodeType() === SyntaxKind.ParenthesizedExpression) {
                // A parenthesized LHS is valid if the expression it wraps is valid.
                return this.isReference((<ParenthesizedExpression>ast).expression, astSymbol);
            }

            if (ast.nodeType() !== SyntaxKind.IdentifierName && ast.nodeType() !== SyntaxKind.MemberAccessExpression && ast.nodeType() !== SyntaxKind.ElementAccessExpression) {
                return false;
            }

            // Disallow assignment to an enum, class or module variables.
            if (ast.nodeType() === SyntaxKind.IdentifierName) {
                if (astSymbol.kind === PullElementKind.Variable && astSymbol.anyDeclHasFlag(PullElementFlags.Enum)) {
                    return false;
                }

                if (astSymbol.kind === PullElementKind.Variable && astSymbol.anyDeclHasFlag(PullElementFlags.SomeInitializedModule)) {
                    return false;
                }

                if (astSymbol.kind === PullElementKind.ConstructorMethod) {
                    return false;
                }
            }

            // Disallow assignment to an enum member.
            if (ast.nodeType() === SyntaxKind.MemberAccessExpression && astSymbol.kind === PullElementKind.EnumMember) {
                return false;
            }

            return true;
        }

        private checkForSuperMemberAccess(
            expression: AST,
            name: Identifier,
            resolvedName: PullSymbol,
            context: PullTypeResolutionContext): boolean {
            if (resolvedName) {
                if (expression.nodeType() === SyntaxKind.SuperKeyword &&
                    !resolvedName.isError() &&
                    resolvedName.kind !== PullElementKind.Method) {

                    context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(name,
                        DiagnosticCode.Only_public_methods_of_the_base_class_are_accessible_via_the_super_keyword));
                    return true;
                }
            }

            return false;
        }

        private getEnclosingDeclForAST(ast: AST): PullDecl {
            return this.semanticInfoChain.getEnclosingDecl(ast);
        }

        private checkForPrivateMemberAccess(
            name: Identifier,
            expressionType: PullTypeSymbol,
            resolvedName: PullSymbol,
            context: PullTypeResolutionContext): boolean {

            if (resolvedName) {
                if (resolvedName.anyDeclHasFlag(PullElementFlags.Private)) {
                    var memberContainer = resolvedName.getContainer();
                    if (memberContainer && memberContainer.kind === PullElementKind.ConstructorType) {
                        memberContainer = memberContainer.getAssociatedContainerType();
                    }

                    if (memberContainer && memberContainer.isClass()) {
                        // We're accessing a private member of a class.  We can only do that if we're 
                        // actually contained within that class.
                        var memberClass = memberContainer.getDeclarations()[0].ast();
                        Debug.assert(memberClass);

                        var containingClass = this.getEnclosingClassDeclaration(name);

                        if (!containingClass || containingClass !== memberClass) {
                            context.postDiagnostic(this.semanticInfoChain.diagnosticFromAST(name, DiagnosticCode._0_1_is_inaccessible, [memberContainer.toString(/*scopeSymbol*/ null, /*useConstraintInName*/ false), name.text()]));
                            return true;
                        }
                    }
                }
            }

            return false;
        }

        public instantiateType(type: PullTypeSymbol, typeParameterArgumentMap: PullTypeSymbol[], instantiateFunctionTypeParameters = false): PullTypeSymbol {
            // if the type is a primitive type, nothing to do here
            if (type.isPrimitive()) {
                return type;
            }

            // if the type is an error, nothing to do here
            if (type.isError()) {
                return type;
            }

            if (typeParameterArgumentMap[type.pullSymbolID]) {
                return typeParameterArgumentMap[type.pullSymbolID];
            }

            // If the type parameter is a function type parameter without a substitution, we don't want to create a new instantiated type 
            // for it, since the function's signature will still utilize this type
            if (type.isTypeParameter() && (<PullTypeParameterSymbol>type).isFunctionTypeParameter()) {
                return type;
            }

            if (type.wrapsSomeTypeParameter(typeParameterArgumentMap)) {
                return PullInstantiatedTypeReferenceSymbol.create(this, type, typeParameterArgumentMap, instantiateFunctionTypeParameters);
            }

            return type;
        }

        // Note that the code below does not cache initializations of signatures.  We do this because we were only utilizing the cache on 1 our of
        // every 6 instantiations, and we would run the risk of getting this wrong when type checking calls within generic type declarations:
        // For example, if the signature is the root signature, it may not be safe to cache.  For example:
        //
        //  class C<T> {
        //      public p: T;
        //      public m<U>(u: U, t: T): void {}
        //      public n<U>() { m(null, this.p); }
        //  }
        //
        // In the code above, we don't want to cache the invocation of 'm' in 'n' against 'any', since the
        // signature to 'm' is only partially specialized 
        public instantiateSignature(signature: PullSignatureSymbol, typeParameterArgumentMap: PullTypeSymbol[], instantiateFunctionTypeParameters = false): PullSignatureSymbol {
            if (!signature.wrapsSomeTypeParameter(typeParameterArgumentMap)) {
                return signature;
            }

            var typeArguments: PullTypeSymbol[] = [];

            nSpecializedSignaturesCreated++;

            var instantiatedSignature = new PullSignatureSymbol(signature.kind);
            instantiatedSignature.setRootSymbol(signature);

            // add type parameters
            var typeParameters = signature.getTypeParameters();
            var constraint: PullTypeSymbol = null;
            var typeParameter: PullTypeParameterSymbol = null;

            for (var i = 0; i < typeParameters.length; i++) {

                typeParameter = typeParameters[i];

                // REVIEW: I think that the code below is the correct way to handle instantiating constraints (rather than doing so at the invocation site,
                // like we currently do), but there is a serious performance impact to instantiating this way, which I need to investigate.
                //
                //constraint = typeParameter.getConstraint();
                //
                ////if (constraint && (constraint.isGeneric() && !constraint.getIsSpecialized()) && !instantiateFunctionTypeParameters) {
                ////    typeParameter = new PullTypeParameterSymbol(typeParameters[i].name, true);
                ////    typeParameter.setConstraint(this.instantiateType(constraint, typeParameterArgumentMap, instantiateFunctionTypeParameters));
                ////    typeParameter.setRootSymbol(typeParameters[i]);
                //
                ////    if (!typeParameterArgumentMap[typeParameters[i].pullSymbolIDString]) {
                ////        typeParameterArgumentMap[typeParameters[i].pullSymbolIDString] = typeParameter;
                ////    }
                ////}
                
                instantiatedSignature.addTypeParameter(typeParameter);
            }

            // if the instantiation occurred via a recursive funciton invocation, the return type may be null so we should set it to any
            instantiatedSignature.returnType = this.instantiateType((signature.returnType || this.semanticInfoChain.anyTypeSymbol), typeParameterArgumentMap, instantiateFunctionTypeParameters);

            var parameters = signature.parameters;
            var parameter: PullSymbol = null;

            if (parameters) {
                for (var j = 0; j < parameters.length; j++) {
                    parameter = new PullSymbol(parameters[j].name, PullElementKind.Parameter);
                    parameter.setRootSymbol(parameters[j]);

                    if (parameters[j].isOptional) {
                        parameter.isOptional = true;
                    }
                    if (parameters[j].isVarArg) {
                        parameter.isVarArg = true;
                        instantiatedSignature.hasVarArgs = true;
                    }
                    instantiatedSignature.addParameter(parameter, parameter.isOptional);

                    parameter.type = this.instantiateType(parameters[j].type, typeParameterArgumentMap, instantiateFunctionTypeParameters);
                }
            }

            return instantiatedSignature;
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
    }

    export function getPropertyAssignmentNameTextFromIdentifier(identifier: AST): { actualText: string; memberName: string } {
        if (identifier.nodeType() === SyntaxKind.IdentifierName) {
            return { actualText: (<Identifier>identifier).text(), memberName: (<Identifier>identifier).valueText() };
        }
        else if (identifier.nodeType() === SyntaxKind.StringLiteral) {
            return { actualText: (<StringLiteral>identifier).text(), memberName: (<StringLiteral>identifier).valueText() };
        }
        else if (identifier.nodeType() === SyntaxKind.NumericLiteral) {
            return { actualText: (<NumericLiteral>identifier).text(), memberName: (<NumericLiteral>identifier).valueText() };
        }
        else {
            throw Errors.invalidOperation();
        }
    }

    export function isTypesOnlyLocation(ast: AST): boolean {
        while (ast && ast.parent) {
            switch (ast.parent.nodeType()) {
                case SyntaxKind.TypeAnnotation:
                    return true;
                case SyntaxKind.TypeQuery:
                    // Inside a type query is actually an expression.
                    return false;
                case SyntaxKind.ConstructorType:
                    var constructorType = <ConstructorType>ast.parent;
                    if (constructorType.type === ast) {
                        return true;
                    }
                    break;
                case SyntaxKind.FunctionType:
                    var functionType = <FunctionType>ast.parent;
                    if (functionType.type === ast) {
                        return true;
                    }
                    break;
                case SyntaxKind.Constraint:
                    var constraint = <Constraint>ast.parent;
                    if (constraint.type === ast) {
                        return true;
                    }
                    break;
                case SyntaxKind.CastExpression:
                    var castExpression = <CastExpression>ast.parent;
                    return castExpression.type === ast;
                case SyntaxKind.ExtendsHeritageClause:
                case SyntaxKind.ImplementsHeritageClause:
                    return true;
                case SyntaxKind.TypeArgumentList:
                    return true;
                case SyntaxKind.ClassDeclaration:
                case SyntaxKind.InterfaceDeclaration:
                case SyntaxKind.ModuleDeclaration:
                case SyntaxKind.FunctionDeclaration:
                case SyntaxKind.MethodSignature:
                case SyntaxKind.MemberAccessExpression:
                case SyntaxKind.Parameter:
                    return false;
            }

            ast = ast.parent;
        }

        return false;
    }
}