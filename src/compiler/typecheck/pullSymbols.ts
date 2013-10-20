// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
// See LICENSE.txt in the project root for complete license information.

///<reference path='..\references.ts' />

module TypeScript {
    export var pullSymbolID = 0;
    export var globalTyvarID = 0;
    export var sentinelEmptyArray: any[] = [];

    export class PullSymbol {

        // private state
        public pullSymbolID = pullSymbolID++;

        public name: string;

        public kind: PullElementKind;

        private _container: PullTypeSymbol = null;
        public type: PullTypeSymbol = null;

        // We cache the declarations to improve look-up speed
        // (but we re-create on edits because deletion from the linked list is
        // much faster)
        private _declarations: PullDecl[] = null;

        public isResolved = false;

        public isOptional = false;

        public inResolution = false;

        private isSynthesized = false;

        public isVarArg = false;

        private rootSymbol: PullSymbol = null;

        private _enclosingSignature: PullSignatureSymbol = null;
        private _docComments: string = null;

        public isPrinting = false;

        public isAny(): boolean {
            return false;
        }

        public isType() {
            return (this.kind & PullElementKind.SomeType) != 0;
        }

        public isTypeReference() { return false; }

        public isSignature() {
            return (this.kind & PullElementKind.SomeSignature) != 0;
        }

        public isArrayNamedTypeReference() {
            return false;
        }

        public isPrimitive() {
            return this.kind === PullElementKind.Primitive;
        }

        public isAccessor() {
            return false;
        }

        public isError() {
            return false;
        }

        public isInterface() {
            return this.kind === PullElementKind.Interface;
        }

        public isMethod() {
            return this.kind === PullElementKind.Method;
        }

        public isProperty() {
            return this.kind === PullElementKind.Property;
        }

        public isAlias() { return false; }

        public isContainer() { return false; }

        constructor(name: string, declKind: PullElementKind) {
            this.name = name;
            this.kind = declKind;
        }

        private findAliasedType(externalModule: PullSymbol, aliasSymbols: PullTypeAliasSymbol[]= [], lookIntoOnlyExportedAlias?: boolean, visitedExternalModuleDeclarations: PullDecl[]= []): PullTypeAliasSymbol[] {
            var externalModuleDecls = externalModule.getDeclarations();
            var externalModuleAliasesToLookIn: PullTypeAliasSymbol[] = [];

            for (var i = 0; i < externalModuleDecls.length; i++) {
                var externalModuleDecl = externalModuleDecls[i];
                if (!ArrayUtilities.contains(visitedExternalModuleDeclarations, externalModuleDecl)) {
                    visitedExternalModuleDeclarations.push(externalModuleDecl);

                    var childDecls = externalModuleDecl.getChildDecls();
                    for (var j = 0; j < childDecls.length; j++) {
                        var childDecl = childDecls[j];
                        if (childDecl.kind === PullElementKind.TypeAlias &&
                            (!lookIntoOnlyExportedAlias || (childDecl.flags & PullElementFlags.Exported))) {
                            var symbol = <PullTypeAliasSymbol>childDecl.getSymbol();

                            if (PullContainerSymbol.usedAsSymbol(symbol, this) || // this is symbol is used as this alias
                                (this.rootSymbol && PullContainerSymbol.usedAsSymbol(symbol, this.rootSymbol))) { // the root symbol of the alias is used as import symbol
                                aliasSymbols.push(symbol);
                                return aliasSymbols;
                            }

                            if (this.isExternalModuleReferenceAlias(symbol) &&
                                (!symbol.assignedContainer().hasExportAssignment() ||
                                (symbol.assignedContainer().getExportAssignedContainerSymbol() && symbol.assignedContainer().getExportAssignedContainerSymbol().kind == PullElementKind.DynamicModule))) {// It is a dynamic module)) {
                                externalModuleAliasesToLookIn.push(symbol);
                            }
                        }
                    }
                }
            }

            // Didnt find alias in the declarations, look for them in the externalImport declarations of dynamic modules
            for (var i = 0; i < externalModuleAliasesToLookIn.length; i++) {
                var externalModuleReference = externalModuleAliasesToLookIn[i];

                aliasSymbols.push(externalModuleReference);
                var result = this.findAliasedType(externalModuleReference.assignedContainer().hasExportAssignment() ? externalModuleReference.assignedContainer().getExportAssignedContainerSymbol() : externalModuleReference.assignedContainer(), aliasSymbols, true /*lookIntoOnlyExportedAlias*/, visitedExternalModuleDeclarations);
                if (result) {
                    return result;
                }

                aliasSymbols.pop();
            }

            return null;
        }

        public getAliasedSymbol(scopeSymbol: PullSymbol) {
            if (!scopeSymbol) {
                return null;
            }

            var scopePath = scopeSymbol.pathToRoot();
            if (scopePath.length && scopePath[scopePath.length - 1].kind === PullElementKind.DynamicModule) {
                var symbols = this.findAliasedType(scopePath[scopePath.length - 1]);
                return symbols;
            }

            return null;
        }

        private isExternalModuleReferenceAlias(aliasSymbol: PullTypeAliasSymbol) {
            if (aliasSymbol) {
                // Has value symbol
                if (aliasSymbol.assignedValue()) {
                    return false;
                }

                // Has type that is not same as container
                if (aliasSymbol.assignedType() && aliasSymbol.assignedType() != aliasSymbol.assignedContainer()) {
                    return false;
                }

                // Its internal module
                if (aliasSymbol.assignedContainer() && aliasSymbol.assignedContainer().kind != PullElementKind.DynamicModule) {
                    return false;
                }

                return true;
            }

            return false;
        }

        public getScopedDynamicModuleAlias(scopeSymbol: PullSymbol) {
            var aliasSymbols = this.getAliasedSymbol(scopeSymbol);
            // Use only alias symbols to the dynamic module
            if (aliasSymbols && this.isExternalModuleReferenceAlias(aliasSymbols[aliasSymbols.length - 1])) {
                return aliasSymbols;
            }

            return null;
        }

        /** Use getName for type checking purposes, and getDisplayName to report an error or display info to the user.
         * They will differ when the identifier is an escaped unicode character or the identifier "__proto__".
         */
        public getName(scopeSymbol?: PullSymbol, useConstraintInName?: boolean): string {
            var symbols = this.getScopedDynamicModuleAlias(scopeSymbol);
            if (symbols) {
                var name = "";
                for (var i = 0, symbolsLen = symbols.length; i < symbolsLen; i++) {
                    name = name + (i != symbolsLen - 1) ? "." : "" + symbols[i].getName();
                }
                return name;
            }

            return this.name;
        }

        public getDisplayName(scopeSymbol?: PullSymbol, useConstraintInName?: boolean): string {
            var symbols = this.getScopedDynamicModuleAlias(scopeSymbol);
            if (symbols) {
                var displayName = "";
                for (var i = 0, symbolsLen = symbols.length; i < symbolsLen; i++) {
                    displayName = displayName + (i != symbolsLen - 1) ? "." : "" + symbols[i].getDisplayName();
                }
                return displayName;
            }

            // Get the actual name associated with a declaration for this symbol
            var decls = this.getDeclarations();
            return decls.length ? this.getDeclarations()[0].getDisplayName() : this.name;
        }

        public getIsSpecialized() { return false; }

        public getRootSymbol() {
            if (!this.rootSymbol) {
                return this;
            }
            return this.rootSymbol;
        }
        public setRootSymbol(symbol: PullSymbol) { this.rootSymbol = symbol; }

        public setIsSynthesized(value = true) {
            this.isSynthesized = value;
        }
        public getIsSynthesized() { return this.isSynthesized; }

        public setEnclosingSignature(signature: PullSignatureSymbol) {
            this._enclosingSignature = signature;
        }

        public getEnclosingSignature(): PullSignatureSymbol {
            return this._enclosingSignature;
        }

        // declaration methods
        public addDeclaration(decl: PullDecl) {
            Debug.assert(!!decl);

            if (this.rootSymbol) {
                return;
            }

            if (!this._declarations) {
                this._declarations = [decl];
            }
            else {
                this._declarations[this._declarations.length] = decl;
            }
        }

        public getDeclarations(): PullDecl[] {
            if (this.rootSymbol) {
                return this.rootSymbol.getDeclarations();
            }

            if (!this._declarations) {
                this._declarations = [];
            }

            return this._declarations;
        }

        // link methods

        public setContainer(containerSymbol: PullTypeSymbol) {
            if (this.rootSymbol) {
                return;
            }

            this._container = containerSymbol;
        }

        public getContainer(): PullTypeSymbol {
            if (this.rootSymbol) {
                return this.rootSymbol.getContainer();
            }

            return this._container;
        }

        public setResolved() {
            this.isResolved = true;
            this.inResolution = false;
        }

        public startResolving() {
            this.inResolution = true;
        }

        public setUnresolved() {
            this.isResolved = false;
            this.inResolution = false;
        }

        public hasFlag(flag: PullElementFlags): boolean {
            var declarations = this.getDeclarations();
            for (var i = 0, n = declarations.length; i < n; i++) {
                if ((declarations[i].flags & flag) !== PullElementFlags.None) {
                    return true;
                }
            }
            return false;
        }

        public allDeclsHaveFlag(flag: PullElementFlags): boolean {
            var declarations = this.getDeclarations();
            for (var i = 0, n = declarations.length; i < n; i++) {
                if (!((declarations[i].flags & flag) !== PullElementFlags.None)) {
                    return false;
                }
            }
            return true;
        }

        public pathToRoot() {
            var path: PullSymbol[] = [];
            var node = this;
            while (node) {
                if (node.isType()) {
                    var associatedContainerSymbol = (<PullTypeSymbol>node).getAssociatedContainerType();
                    if (associatedContainerSymbol) {
                        node = associatedContainerSymbol;
                    }
                }
                path[path.length] = node;
                var nodeKind = node.kind;
                if (nodeKind == PullElementKind.Parameter) {
                    break;
                } else {
                    node = node.getContainer();
                }
            }
            return path;
        }

        public findCommonAncestorPath(b: PullSymbol): PullSymbol[] {
            var aPath = this.pathToRoot();
            if (aPath.length === 1) {
                // Global symbol
                return aPath;
            }

            var bPath: PullSymbol[];
            if (b) {
                bPath = b.pathToRoot();
            } else {
                return aPath;
            }

            var commonNodeIndex = -1;
            for (var i = 0, aLen = aPath.length; i < aLen; i++) {
                var aNode = aPath[i];
                for (var j = 0, bLen = bPath.length; j < bLen; j++) {
                    var bNode = bPath[j];
                    if (aNode === bNode) {
                        var aDecl: PullDecl = null;
                        if (i > 0) {
                            var decls = aPath[i - 1].getDeclarations();
                            if (decls.length) {
                                aDecl = decls[0].getParentDecl();
                            }
                        }
                        var bDecl: PullDecl = null;
                        if (j > 0) {
                            var decls = bPath[j - 1].getDeclarations();
                            if (decls.length) {
                                bDecl = decls[0].getParentDecl();
                            }
                        }
                        if (!aDecl || !bDecl || aDecl == bDecl) {
                            commonNodeIndex = i;
                            break;
                        }
                    }
                }
                if (commonNodeIndex >= 0) {
                    break;
                }
            }

            if (commonNodeIndex >= 0) {
                return aPath.slice(0, commonNodeIndex);
            }
            else {
                return aPath;
            }
        }

        public toString(scopeSymbol?: PullSymbol, useConstraintInName?: boolean) {
            var str = this.getNameAndTypeName(scopeSymbol);
            return str;
        }

        public getNamePartForFullName() {
            return this.getDisplayName(null /*scopeSymbol*/, true /*useConstraintInName*/);
        }

        public fullName(scopeSymbol?: PullSymbol): string {
            var path = this.pathToRoot();
            var fullName = "";
            var aliasedSymbols = this.getScopedDynamicModuleAlias(scopeSymbol);
            if (aliasedSymbols) {
                var aliasFullName = "";
                for (var i = 1, symbolsLen = aliasedSymbols.length; i < symbolsLen; i++) {
                    aliasFullName = aliasFullName + "." + aliasedSymbols[i].getNamePartForFullName();
                }
                return aliasedSymbols[0].fullName(scopeSymbol) + aliasFullName;
            }

            for (var i = 1; i < path.length; i++) {
                aliasedSymbols = path[i].getScopedDynamicModuleAlias(scopeSymbol);
                if (aliasedSymbols) {
                    // Aliased name found
                    var aliasFullName = "";
                    for (var i = 1, symbolsLen = aliasedSymbols.length; i < symbolsLen; i++) {
                        aliasFullName = aliasFullName + "." + aliasedSymbols[i].getNamePartForFullName();
                    }
                    fullName = aliasedSymbols[0].fullName(scopeSymbol) + aliasFullName + "." + fullName;
                    break;
                } else {
                    var scopedName = path[i].getNamePartForFullName();
                    if (path[i].kind == PullElementKind.DynamicModule && !isQuoted(scopedName)) {
                        // Same file as dynamic module - do not include this name
                        break;
                    }

                    if (scopedName === "") {
                        // If the item does not have a name, stop enumarting them, e.g. Object literal
                        break;
                    }

                    fullName = scopedName + "." + fullName;
                }
            }

            fullName = fullName + this.getNamePartForFullName();
            return fullName;
        }

        public getScopedName(scopeSymbol?: PullSymbol, useConstraintInName?: boolean): string {
            var path = this.findCommonAncestorPath(scopeSymbol);
            var fullName = "";
            var aliasedSymbols = this.getScopedDynamicModuleAlias(scopeSymbol);
            if (aliasedSymbols) {
                var aliasScopedName = "";
                for (var i = 1, symbolsLen = aliasedSymbols.length; i < symbolsLen; i++) {
                    aliasScopedName = aliasScopedName + "." + aliasedSymbols[i].getNamePartForFullName();
                }
                return aliasedSymbols[0].getScopedName(scopeSymbol) + aliasScopedName;
            }

            for (var i = 1; i < path.length; i++) {
                var kind = path[i].kind;
                if (kind === PullElementKind.Container || kind === PullElementKind.DynamicModule) {
                    aliasedSymbols = path[i].getScopedDynamicModuleAlias(scopeSymbol);
                    if (aliasedSymbols) {
                        // Aliased name
                        var aliasScopedName = "";
                        for (var i = 1, symbolsLen = aliasedSymbols.length; i < symbolsLen; i++) {
                            aliasScopedName = aliasScopedName + "." + aliasedSymbols[i].getNamePartForFullName();
                        }
                        fullName = aliasedSymbols[0].getScopedName(scopeSymbol) + aliasScopedName + "." + fullName;
                        break;
                    } else if (kind === PullElementKind.Container) {
                        fullName = path[i].getDisplayName() + "." + fullName;
                    } else {
                        // Dynamic module 
                        var displayName = path[i].getDisplayName();
                        if (isQuoted(displayName)) {
                            fullName = displayName + "." + fullName;
                        }
                        break;
                    }
                } else {
                    // Any other type of container is not part of the name
                    break;
                }
            }
            fullName = fullName + this.getDisplayName(scopeSymbol, useConstraintInName);
            return fullName;
        }

        public getScopedNameEx(scopeSymbol?: PullSymbol, useConstraintInName?: boolean, getPrettyTypeName?: boolean, getTypeParamMarkerInfo?: boolean) {
            var name = this.getScopedName(scopeSymbol, useConstraintInName);
            return MemberName.create(name);
        }

        public getTypeName(scopeSymbol?: PullSymbol, getPrettyTypeName?: boolean) {
            var memberName = this.getTypeNameEx(scopeSymbol, getPrettyTypeName);
            return memberName.toString();
        }

        public getTypeNameEx(scopeSymbol?: PullSymbol, getPrettyTypeName?: boolean) {
            var type = this.type;
            if (type) {
                var memberName: MemberName = getPrettyTypeName ? this.getTypeNameForFunctionSignature("", scopeSymbol, getPrettyTypeName) : null;
                if (!memberName) {
                    memberName = type.getScopedNameEx(scopeSymbol, /*useConstraintInName:*/ true, getPrettyTypeName);
                }

                return memberName;
            }
            return MemberName.create("");
        }

        private getTypeNameForFunctionSignature(prefix: string, scopeSymbol?: PullSymbol, getPrettyTypeName?: boolean) {
            var type = this.type;
            if (type && !type.isNamedTypeSymbol() && this.kind != PullElementKind.Property && this.kind != PullElementKind.Variable && this.kind != PullElementKind.Parameter) {
                var signatures = type.getCallSignatures();
                if (signatures.length == 1 || (getPrettyTypeName && signatures.length)) {
                    var typeName = new MemberNameArray();
                    var signatureName = PullSignatureSymbol.getSignaturesTypeNameEx(signatures, prefix, /*shortform*/ false, /*brackets*/ false, scopeSymbol, getPrettyTypeName);
                    typeName.addAll(signatureName);
                    return typeName;
                }
            }

            return null;
        }

        public getNameAndTypeName(scopeSymbol?: PullSymbol) {
            var nameAndTypeName = this.getNameAndTypeNameEx(scopeSymbol);
            return nameAndTypeName.toString();
        }

        public getNameAndTypeNameEx(scopeSymbol?: PullSymbol) {
            var type = this.type;
            var nameStr = this.getDisplayName(scopeSymbol);
            if (type) {
                nameStr = nameStr + (this.isOptional ? "?" : "");
                var memberName: MemberName = this.getTypeNameForFunctionSignature(nameStr, scopeSymbol);
                if (!memberName) {
                    var typeNameEx = type.getScopedNameEx(scopeSymbol);
                    memberName = MemberName.create(typeNameEx, nameStr + ": ", "");
                }
                return memberName;
            }
            return MemberName.create(nameStr);
        }

        static getTypeParameterString(typars: PullTypeSymbol[], scopeSymbol?: PullSymbol, useContraintInName?: boolean) {
            return PullSymbol.getTypeParameterStringEx(typars, scopeSymbol, /*getTypeParamMarkerInfo:*/ undefined, useContraintInName).toString();
        }

        static getTypeParameterStringEx(typeParameters: PullTypeSymbol[], scopeSymbol?: PullSymbol, getTypeParamMarkerInfo?: boolean, useContraintInName?: boolean) {
            var builder = new MemberNameArray();
            builder.prefix = "";

            if (typeParameters && typeParameters.length) {
                builder.add(MemberName.create("<"));

                for (var i = 0; i < typeParameters.length; i++) {
                    if (i) {
                        builder.add(MemberName.create(", "));
                    }

                    if (getTypeParamMarkerInfo) {
                        builder.add(new MemberName());
                    }

                    builder.add(typeParameters[i].getScopedNameEx(scopeSymbol, useContraintInName));

                    if (getTypeParamMarkerInfo) {
                        builder.add(new MemberName());
                    }
                }

                builder.add(MemberName.create(">"));
            }

            return builder;
        }

        static getIsExternallyVisible(symbol: PullSymbol, fromIsExternallyVisibleSymbol: PullSymbol, inIsExternallyVisibleSymbols: PullSymbol[]) {
            if (inIsExternallyVisibleSymbols) {
                for (var i = 0; i < inIsExternallyVisibleSymbols.length; i++) {
                    if (inIsExternallyVisibleSymbols[i] === symbol) {
                        return true;
                    }
                }
            } else {
                inIsExternallyVisibleSymbols = [];
            }

            if (fromIsExternallyVisibleSymbol === symbol) {
                return true;
            }
            inIsExternallyVisibleSymbols = inIsExternallyVisibleSymbols.concat(<any>fromIsExternallyVisibleSymbol);

            return symbol.isExternallyVisible(inIsExternallyVisibleSymbols);
        }

        public isExternallyVisible(inIsExternallyVisibleSymbols?: PullSymbol[]): boolean {
            // Primitive
            var kind = this.kind;
            if (kind === PullElementKind.Primitive) {
                return true;
            }

            if (this.rootSymbol) {
                return PullSymbol.getIsExternallyVisible(this.rootSymbol, this, inIsExternallyVisibleSymbols);
            }

            // Type - use container to determine privacy info
            if (this.isType()) {
                var associatedContainerSymbol = (<PullTypeSymbol>this).getAssociatedContainerType();
                if (associatedContainerSymbol) {
                    return PullSymbol.getIsExternallyVisible(associatedContainerSymbol, this, inIsExternallyVisibleSymbols);
                }
            }

            // Private member
            if (this.hasFlag(PullElementFlags.Private)) {
                return false;
            }

            // If the container for this symbol is null, then this symbol is visible
            var container = this.getContainer();
            if (container === null) {
                var decls = this.getDeclarations();
                if (decls.length) {
                    var parentDecl = decls[0].getParentDecl();
                    if (parentDecl) {
                        var parentSymbol = parentDecl.getSymbol();
                        if (!parentSymbol || parentDecl.kind == PullElementKind.Script) {
                            return true;
                        }

                        return PullSymbol.getIsExternallyVisible(parentSymbol, this, inIsExternallyVisibleSymbols);
                    }
                }

                return true;
            }

            // If export assignment check if this is the symbol that is exported
            if (container.kind == PullElementKind.DynamicModule ||
                (container.getAssociatedContainerType() && container.getAssociatedContainerType().kind == PullElementKind.DynamicModule)) {
                var containerSymbol = container.kind == PullElementKind.DynamicModule
                    ? <PullContainerSymbol>container
                    : <PullContainerSymbol>container.getAssociatedContainerType();
                if (PullContainerSymbol.usedAsSymbol(containerSymbol, this)) {
                    return true;
                }
            }

            // If non exported member and is not class properties and method, it is not visible
            if (!this.hasFlag(PullElementFlags.Exported) && kind != PullElementKind.Property && kind != PullElementKind.Method) {
                return false;
            }

            // Visible if parent is visible
            return PullSymbol.getIsExternallyVisible(container, this, inIsExternallyVisibleSymbols);
        }

        private getDocCommentsOfDecl(decl: TypeScript.PullDecl): TypeScript.Comment[] {
            var ast = decl.ast();

            if (ast && (ast.nodeType() != TypeScript.NodeType.ModuleDeclaration ||
                decl.kind != TypeScript.PullElementKind.Variable)) {
                return ast.docComments();
            }

            return [];
        }

        private getDocCommentArray(symbol: TypeScript.PullSymbol) {
            var docComments: TypeScript.Comment[] = [];
            if (!symbol) {
                return docComments;
            }

            var isParameter = symbol.kind == TypeScript.PullElementKind.Parameter;
            var decls = symbol.getDeclarations();
            for (var i = 0; i < decls.length; i++) {
                if (isParameter && decls[i].kind == TypeScript.PullElementKind.Property) {
                    // Ignore declaration for property that was defined as parameter because they both 
                    // point to same doc comment
                    continue;
                }
                docComments = docComments.concat(this.getDocCommentsOfDecl(decls[i]));
            }
            return docComments;
        }

        private static getDefaultConstructorSymbolForDocComments(classSymbol: TypeScript.PullTypeSymbol) {
            if (classSymbol.getHasDefaultConstructor()) {
                // get from parent if possible
                var extendedTypes = classSymbol.getExtendedTypes();
                if (extendedTypes.length) {
                    return PullSymbol.getDefaultConstructorSymbolForDocComments(extendedTypes[0]);
                }
            }

            return classSymbol.type.getConstructSignatures()[0];
        }

        public docComments(useConstructorAsClass?: boolean): string {
            var decls = this.getDeclarations();
            if (useConstructorAsClass && decls.length && decls[0].kind == TypeScript.PullElementKind.ConstructorMethod) {
                var classDecl = decls[0].getParentDecl();
                return TypeScript.Comment.getDocCommentText(this.getDocCommentsOfDecl(classDecl));
            }

            if (this._docComments === null) {
                var docComments: string = "";
                if (!useConstructorAsClass && this.kind == TypeScript.PullElementKind.ConstructSignature &&
                    decls.length && decls[0].kind == TypeScript.PullElementKind.Class) {
                    var classSymbol = (<TypeScript.PullSignatureSymbol>this).returnType;
                    var extendedTypes = classSymbol.getExtendedTypes();
                    if (extendedTypes.length) {
                        docComments = extendedTypes[0].getConstructorMethod().docComments();
                    } else {
                        docComments = "";
                    }
                } else if (this.kind == TypeScript.PullElementKind.Parameter) {
                    var parameterComments: string[] = [];

                    var funcContainer = this.getEnclosingSignature();
                    var funcDocComments = this.getDocCommentArray(funcContainer);
                    var paramComment = TypeScript.Comment.getParameterDocCommentText(this.getDisplayName(), funcDocComments);
                    if (paramComment != "") {
                        parameterComments.push(paramComment);
                    }

                    var paramSelfComment = TypeScript.Comment.getDocCommentText(this.getDocCommentArray(this));
                    if (paramSelfComment != "") {
                        parameterComments.push(paramSelfComment);
                    }
                    docComments = parameterComments.join("\n");
                } else {
                    var getSymbolComments = true;
                    if (this.kind == TypeScript.PullElementKind.FunctionType) {
                        var functionSymbol = (<TypeScript.PullTypeSymbol>this).getFunctionSymbol();

                        if (functionSymbol) {
                            docComments = functionSymbol._docComments || "";
                            getSymbolComments = false;
                        }
                        else {
                            var declarationList = this.getDeclarations();
                            if (declarationList.length > 0) {
                                docComments = declarationList[0].getSymbol()._docComments || "";
                                getSymbolComments = false;
                            }
                        }
                    }
                    if (getSymbolComments) {
                        docComments = TypeScript.Comment.getDocCommentText(this.getDocCommentArray(this));
                        if (docComments == "") {
                            if (this.kind == TypeScript.PullElementKind.CallSignature) {
                                var callTypeSymbol = (<TypeScript.PullSignatureSymbol>this).functionType;
                                if (callTypeSymbol && callTypeSymbol.getCallSignatures().length == 1) {
                                    docComments = callTypeSymbol.docComments();
                                }
                            }
                        }
                    }
                }

                this._docComments = docComments;
            }

            return this._docComments;
        }
    }

    export class PullSignatureSymbol extends PullSymbol {
        private _memberTypeParameterNameCache: IIndexable<PullTypeParameterSymbol> = null;
        private _stringConstantOverload: boolean = undefined;

        public parameters: PullSymbol[] = sentinelEmptyArray;
        public typeParameters: PullTypeParameterSymbol[] = null;
        public returnType: PullTypeSymbol = null;
        public functionType: PullTypeSymbol = null;

        public hasOptionalParam = false;
        public nonOptionalParamCount = 0;

        public hasVarArgs = false;

        public cachedObjectSpecialization: PullSignatureSymbol = null;

        // GTODO
        public hasAGenericParameter = false;

        public hasBeenChecked = false;
        public inWrapCheck = false;

        constructor(kind: PullElementKind) {
            super("", kind);
        }

        public isDefinition() { return false; }

        // GTODO
        public isGeneric() { return this.hasAGenericParameter || (this.typeParameters && this.typeParameters.length != 0); }

        public addParameter(parameter: PullSymbol, isOptional = false) {
            if (this.parameters == sentinelEmptyArray) {
                this.parameters = [];
            }

            this.parameters[this.parameters.length] = parameter;
            this.hasOptionalParam = isOptional;

            if (!parameter.getEnclosingSignature()) {
                parameter.setEnclosingSignature(this);
            }

            if (!isOptional) {
                this.nonOptionalParamCount++;
            }
        }

        public addTypeParameter(typeParameter: PullTypeParameterSymbol) {
            if (!this.typeParameters) {
                this.typeParameters = [];
            }

            if (!this._memberTypeParameterNameCache) {
                this._memberTypeParameterNameCache = createIntrinsicsObject<PullTypeParameterSymbol>();
            }

            this.typeParameters[this.typeParameters.length] = typeParameter;

            this._memberTypeParameterNameCache[typeParameter.getName()] = typeParameter;
        }

        public getTypeParameters(): PullTypeParameterSymbol[] {

            if (!this.typeParameters) {
                this.typeParameters = [];
            }

            return this.typeParameters;
        }

        public findTypeParameter(name: string): PullTypeParameterSymbol {
            var memberSymbol: PullTypeParameterSymbol;

            if (!this._memberTypeParameterNameCache) {
                this._memberTypeParameterNameCache = createIntrinsicsObject();

                if (this.typeParameters) {
                    for (var i = 0; i < this.typeParameters.length; i++) {
                        this._memberTypeParameterNameCache[this.typeParameters[i].getName()] = this.typeParameters[i];
                    }
                }
            }

            memberSymbol = this._memberTypeParameterNameCache[name];

            return memberSymbol;
        }

        public isStringConstantOverloadSignature() {
            if (this._stringConstantOverload === undefined) {
                var params = this.parameters;
                this._stringConstantOverload = false;
                for (var i = 0; i < params.length; i++) {
                    var paramType = params[i].type;
                    if (paramType && paramType.isPrimitive() && (<PullPrimitiveTypeSymbol>paramType).isStringConstant()) {
                        this._stringConstantOverload = true;
                    }
                }
            }

            return this._stringConstantOverload;
        }

        static getSignatureTypeMemberName(candidateSignature: PullSignatureSymbol, signatures: PullSignatureSymbol[], scopeSymbol: PullSymbol) {
            var allMemberNames = new MemberNameArray();
            var signatureMemberName = PullSignatureSymbol.getSignaturesTypeNameEx(signatures, /*prefix*/ "", /*shortform*/ false, /*brackets*/ false, scopeSymbol, /*getPrettyName*/ true, candidateSignature);
            allMemberNames.addAll(signatureMemberName);
            return allMemberNames;
        }

        static getSignaturesTypeNameEx(signatures: PullSignatureSymbol[],
            prefix: string,
            shortform: boolean,
            brackets: boolean,
            scopeSymbol?: PullSymbol,
            getPrettyTypeName?: boolean,
            candidateSignature?: PullSignatureSymbol) {

            var result: MemberName[] = [];
            if (!signatures) {
                return result;
            }

            var len = signatures.length;
            if (!getPrettyTypeName && len > 1) {
                shortform = false;
            }

            var foundDefinition = false;
            if (candidateSignature && candidateSignature.isDefinition() && len > 1) {
                // Overloaded signature with candidateSignature = definition - cannot be used.
                candidateSignature = null;
            }

            for (var i = 0; i < len; i++) {
                // the definition signature shouldn't be printed if there are overloads
                if (len > 1 && signatures[i].isDefinition()) {
                    foundDefinition = true;
                    continue;
                }

                var signature = signatures[i];
                if (getPrettyTypeName && candidateSignature) {
                    signature = candidateSignature;
                }

                result.push(signature.getSignatureTypeNameEx(prefix, shortform, brackets, scopeSymbol));
                if (getPrettyTypeName) {
                    break;
                }
            }

            if (getPrettyTypeName && result.length && len > 1) {
                var lastMemberName = <MemberNameArray>result[result.length - 1];
                for (var i = i + 1; i < len; i++) {
                    if (signatures[i].isDefinition()) {
                        foundDefinition = true;
                        break;
                    }
                }
                var overloadString = getLocalizedText(DiagnosticCode._0_overload_s, [foundDefinition ? len - 2 : len - 1]);
                lastMemberName.add(MemberName.create(overloadString));
            }

            return result;
        }

        public toString(scopeSymbol?: PullSymbol, useConstraintInName?: boolean) {
            var s = this.getSignatureTypeNameEx(this.getScopedNameEx().toString(), /*shortform*/ false, /*brackets*/ false, scopeSymbol, /*getParamMarkerInfo*/ undefined, useConstraintInName).toString();
            return s;
        }

        public getSignatureTypeNameEx(prefix: string, shortform: boolean, brackets: boolean, scopeSymbol?: PullSymbol, getParamMarkerInfo?: boolean, getTypeParamMarkerInfo?: boolean) {
            var typeParamterBuilder = new MemberNameArray();

            typeParamterBuilder.add(PullSymbol.getTypeParameterStringEx(
                this.getTypeParameters(), scopeSymbol, getTypeParamMarkerInfo, /*useConstraintInName*/true));

            if (brackets) {
                typeParamterBuilder.add(MemberName.create("["));
            }
            else {
                typeParamterBuilder.add(MemberName.create("("));
            }

            var builder = new MemberNameArray();
            builder.prefix = prefix;

            if (getTypeParamMarkerInfo) {
                builder.prefix = prefix;
                builder.addAll(typeParamterBuilder.entries);
            }
            else {
                builder.prefix = prefix + typeParamterBuilder.toString();
            }

            var params = this.parameters;
            var paramLen = params.length;
            for (var i = 0; i < paramLen; i++) {
                var paramType = params[i].type;
                var typeString = paramType ? ": " : "";
                var paramIsVarArg = params[i].isVarArg;
                var varArgPrefix = paramIsVarArg ? "..." : "";
                var optionalString = (!paramIsVarArg && params[i].isOptional) ? "?" : "";
                if (getParamMarkerInfo) {
                    builder.add(new MemberName());
                }
                builder.add(MemberName.create(varArgPrefix + params[i].getScopedNameEx(scopeSymbol).toString() + optionalString + typeString));
                if (paramType) {
                    builder.add(paramType.getScopedNameEx(scopeSymbol));
                }
                if (getParamMarkerInfo) {
                    builder.add(new MemberName());
                }
                if (i < paramLen - 1) {
                    builder.add(MemberName.create(", "));
                }
            }

            if (shortform) {
                if (brackets) {
                    builder.add(MemberName.create("] => "));
                }
                else {
                    builder.add(MemberName.create(") => "));
                }
            }
            else {
                if (brackets) {
                    builder.add(MemberName.create("]: "));
                }
                else {
                    builder.add(MemberName.create("): "));
                }
            }

            if (this.returnType) {
                builder.add(this.returnType.getScopedNameEx(scopeSymbol));
            }
            else {
                builder.add(MemberName.create("any"));
            }

            return builder;
        }

        public wrapsSomeTypeParameter(typeParameterArgumentMap: PullTypeSymbol[]): boolean {
            var signature = this;
            if (signature.inWrapCheck) {
                return false;
            }

            signature.inWrapCheck = true;

            var wrapsSomeTypeParameter = false;

            if (signature.returnType && signature.returnType.wrapsSomeTypeParameter(typeParameterArgumentMap)) {
                wrapsSomeTypeParameter = true;
            }

            if (!wrapsSomeTypeParameter) {
                var parameters = signature.parameters;

                for (var i = 0; i < parameters.length; i++) {
                    if (parameters[i].type.wrapsSomeTypeParameter(typeParameterArgumentMap)) {
                        wrapsSomeTypeParameter = true;
                        break;
                    }
                }
            }

            signature.inWrapCheck = false;

            return wrapsSomeTypeParameter;
        }

        public wrapsSomeNestedType(typeBeingWrapped: PullTypeSymbol, isNested: boolean, knownWrapMap: IBitMatrix): boolean {
            var signature = this;
            if (signature.inWrapCheck) {
                return false;
            }

            signature.inWrapCheck = true;

            var wrapsSomeWrappedTypeParameter = false;

            if (signature.returnType && signature.returnType._wrapsSomeNestedTypeRecurse(typeBeingWrapped, isNested, knownWrapMap)) {
                wrapsSomeWrappedTypeParameter = true;
            }

            if (!wrapsSomeWrappedTypeParameter) {
                var parameters = signature.parameters;

                for (var i = 0; i < parameters.length; i++) {
                    if (!parameters[i].isVarArg && parameters[i].type && parameters[i].type._wrapsSomeNestedTypeRecurse(typeBeingWrapped, isNested, knownWrapMap)) {
                        wrapsSomeWrappedTypeParameter = true;
                        break;
                    }
                }
            }

            signature.inWrapCheck = false;

            return wrapsSomeWrappedTypeParameter;
        }
    }

    export class PullTypeSymbol extends PullSymbol {

        private _members: PullSymbol[] = sentinelEmptyArray;
        private _enclosedMemberTypes: PullTypeSymbol[] = null;
        private _enclosedMemberContainers: PullTypeSymbol[] = null;
        private _typeParameters: PullTypeParameterSymbol[] = null;

        private _specializedVersionsOfThisType: PullTypeSymbol[] = null;
        private _arrayVersionOfThisType: PullTypeSymbol = null;

        private _implementedTypes: PullTypeSymbol[] = null;
        private _extendedTypes: PullTypeSymbol[] = null;

        private _typesThatExplicitlyImplementThisType: PullTypeSymbol[] = null;
        private _typesThatExtendThisType: PullTypeSymbol[] = null;

        private _callSignatures: PullSignatureSymbol[] = null;
        private _allCallSignatures: PullSignatureSymbol[] = null;
        private _constructSignatures: PullSignatureSymbol[] = null;
        private _allConstructSignatures: PullSignatureSymbol[] = null;
        private _indexSignatures: PullSignatureSymbol[] = null;
        private _allIndexSignatures: PullSignatureSymbol[] = null;

        private _memberNameCache: IIndexable<PullSymbol> = null;
        private _enclosedTypeNameCache: IIndexable<PullTypeSymbol> = null;
        private _enclosedContainerCache: IIndexable<PullTypeSymbol> = null;
        private _typeParameterNameCache: IIndexable<PullTypeParameterSymbol> = null;
        private _containedNonMemberNameCache: IIndexable<PullSymbol> = null;
        private _containedNonMemberTypeNameCache: IIndexable<PullTypeSymbol> = null;
        private _containedNonMemberContainerCache: IIndexable<PullTypeSymbol> = null;

        // The instanatiation cache we use when we are instantiating this type with a single 
        // non-object type.
        private _simpleInstantiationCache: PullTypeSymbol[] = null;

        // The instantiation cache we use in all other circumstances.  i.e. instantiating with
        // multiple types, or instantiating with object types.
        private _complexSpecializationCache: IIndexable<PullTypeSymbol> = null;


        // GTODO
        private _hasGenericSignature = false;
        private _hasGenericMember = false;

        private _hasBaseTypeConflict = false;

        private _knownBaseTypeCount = 0;

        private _associatedContainerTypeSymbol: PullTypeSymbol = null;

        private _constructorMethod: PullSymbol = null;
        private _hasDefaultConstructor = false;

        // TODO: Really only used to track doc comments...
        private _functionSymbol: PullSymbol = null;
        private _inMemberTypeNameEx = false;

        public inSymbolPrivacyCheck = false;
        public inWrapCheck = false;

        public typeReference: PullTypeReferenceSymbol = null;

        constructor(name: string, kind: PullElementKind) {
            super(name, kind);
            this.type = this;
        }

        // Returns true if this is type reference to Array<T>.  Note that because this is a type
        // reference, it will have type arguments, not type parameters.
        private _isArrayNamedTypeReference: boolean = undefined;
        public isArrayNamedTypeReference() {
            if (this._isArrayNamedTypeReference === undefined) {
                this._isArrayNamedTypeReference = this.computeIsArrayNamedTypeReference();
            }

            return this._isArrayNamedTypeReference;
        }

        private computeIsArrayNamedTypeReference(): boolean {
            var typeArgs = this.getTypeArguments()
            if (typeArgs && this.getTypeArguments().length === 1 &&
                this.name === "Array") {

                var container = this.getContainer();
                var declaration = this.getDeclarations()[0];

                // If we're a child of the global module (i.e. we have a parent decl, but our 
                // parent has no parent), then we're the Array<T> type.
                if (declaration &&
                    declaration.getParentDecl() &&
                    declaration.getParentDecl().getParentDecl() === null) {

                    return true;
                }
            }

            return false;
        }

        public isType() { return true; }
        public isClass() {
            return this.kind == PullElementKind.Class || (this._constructorMethod != null);
        }
        public isFunction() { return (this.kind & (PullElementKind.ConstructorType | PullElementKind.FunctionType)) != 0; }
        public isConstructor() { return this.kind == PullElementKind.ConstructorType; }
        public isTypeParameter() { return false; }
        public isTypeVariable() { return false; }
        public isError() { return false; }
        public isEnum() { return this.kind == PullElementKind.Enum; }

        public getTypeParameterArgumentMap(): PullTypeSymbol[] {
            return null;
        }

        public isObject(): boolean {
            return hasFlag(this.kind,
                PullElementKind.Class | PullElementKind.ConstructorType | PullElementKind.Enum | PullElementKind.FunctionType | PullElementKind.Interface | PullElementKind.ObjectType);
        }

        public getKnownBaseTypeCount() { return this._knownBaseTypeCount; }
        public resetKnownBaseTypeCount() { this._knownBaseTypeCount = 0; }
        public incrementKnownBaseCount() { this._knownBaseTypeCount++; }

        public setHasBaseTypeConflict(): void {
            this._hasBaseTypeConflict = true;
        }
        public hasBaseTypeConflict(): boolean {
            return this._hasBaseTypeConflict;
        }

        public hasMembers(): boolean {

            if (this._members != sentinelEmptyArray) {
                return true;
            }

            var parents = this.getExtendedTypes();

            for (var i = 0; i < parents.length; i++) {
                if (parents[i].hasMembers()) {
                    return true;
                }
            }

            return false;
        }

        // GTODO
        public setHasGenericSignature() { this._hasGenericSignature = true; }
        public getHasGenericSignature() { return this._hasGenericSignature; }

        // GTODO
        public setHasGenericMember() { this._hasGenericMember = true; }
        public getHasGenericMember() { return this._hasGenericMember; }

        public setAssociatedContainerType(type: PullTypeSymbol): void {
            this._associatedContainerTypeSymbol = type;
        }

        public getAssociatedContainerType(): PullTypeSymbol {
            return this._associatedContainerTypeSymbol;
        }

        // REVIEW
        public getArrayType(): PullTypeSymbol { return this._arrayVersionOfThisType; }

        public getElementType(): PullTypeSymbol {
            return null;
        }

        public setArrayType(arrayType: PullTypeSymbol) {
            this._arrayVersionOfThisType = arrayType;
        }

        public getFunctionSymbol(): PullSymbol {
            return this._functionSymbol;
        }

        public setFunctionSymbol(symbol: PullSymbol): void {
            if (symbol) {
                this._functionSymbol = symbol;
            }
        }

        // TODO: This seems to conflate exposed members with private non-Members
        public findContainedNonMember(name: string): PullSymbol {
            if (!this._containedNonMemberNameCache) {
                return null;
            }

            return this._containedNonMemberNameCache[name];
        }

        public findContainedNonMemberType(typeName: string, kind = PullElementKind.None): PullTypeSymbol {
            if (!this._containedNonMemberTypeNameCache) {
                return null;
            }

            var nonMemberSymbol = this._containedNonMemberTypeNameCache[typeName];

            if (nonMemberSymbol && kind != PullElementKind.None) {
                nonMemberSymbol = ((nonMemberSymbol.kind & kind) != 0) ? nonMemberSymbol : null;
            }

            return nonMemberSymbol;
        }

        public findContainedNonMemberContainer(containerName: string, kind = PullElementKind.None): PullTypeSymbol {
            if (!this._containedNonMemberContainerCache) {
                return null;
            }

            var nonMemberSymbol = this._containedNonMemberContainerCache[containerName];

            if (nonMemberSymbol && kind != PullElementKind.None) {
                nonMemberSymbol = ((nonMemberSymbol.kind & kind) != 0) ? nonMemberSymbol : null;
            }

            return nonMemberSymbol;
        }

        public addMember(memberSymbol: PullSymbol): void {
            if (!memberSymbol) {
                return;
            }

            memberSymbol.setContainer(this);

            if (!this._memberNameCache) {
                this._memberNameCache = createIntrinsicsObject<PullSymbol>();
            }

            if (this._members === sentinelEmptyArray) {
                this._members = [];
            }

            this._members.push(memberSymbol);
            this._memberNameCache[memberSymbol.name] = memberSymbol;
        }

        public addEnclosedMemberType(enclosedType: PullTypeSymbol): void {

            if (!enclosedType) {
                return;
            }

            enclosedType.setContainer(this);

            if (!this._enclosedTypeNameCache) {
                this._enclosedTypeNameCache = createIntrinsicsObject<PullTypeSymbol>();
            }

            if (!this._enclosedMemberTypes) {
                this._enclosedMemberTypes = [];
            }

            this._enclosedMemberTypes[this._enclosedMemberTypes.length] = enclosedType;
            this._enclosedTypeNameCache[enclosedType.name] = enclosedType;
        }

        public addEnclosedMemberContainer(enclosedContainer: PullTypeSymbol): void {

            if (!enclosedContainer) {
                return;
            }

            enclosedContainer.setContainer(this);

            if (!this._enclosedContainerCache) {
                this._enclosedContainerCache = createIntrinsicsObject<PullTypeSymbol>();
            }

            if (!this._enclosedMemberContainers) {
                this._enclosedMemberContainers = [];
            }

            this._enclosedMemberContainers[this._enclosedMemberContainers.length] = enclosedContainer;
            this._enclosedContainerCache[enclosedContainer.name] = enclosedContainer;
        }

        public addEnclosedNonMember(enclosedNonMember: PullSymbol): void {

            if (!enclosedNonMember) {
                return;
            }

            enclosedNonMember.setContainer(this);

            if (!this._containedNonMemberNameCache) {
                this._containedNonMemberNameCache = createIntrinsicsObject<PullSymbol>();
            }

            this._containedNonMemberNameCache[enclosedNonMember.name] = enclosedNonMember;
        }

        public addEnclosedNonMemberType(enclosedNonMemberType: PullTypeSymbol): void {

            if (!enclosedNonMemberType) {
                return;
            }

            enclosedNonMemberType.setContainer(this);

            if (!this._containedNonMemberTypeNameCache) {
                this._containedNonMemberTypeNameCache = createIntrinsicsObject<PullTypeSymbol>();
            }

            this._containedNonMemberTypeNameCache[enclosedNonMemberType.name] = enclosedNonMemberType;
        }

        public addEnclosedNonMemberContainer(enclosedNonMemberContainer: PullTypeSymbol): void {

            if (!enclosedNonMemberContainer) {
                return;
            }

            enclosedNonMemberContainer.setContainer(this);

            if (!this._containedNonMemberContainerCache) {
                this._containedNonMemberContainerCache = createIntrinsicsObject();
            }

            this._containedNonMemberContainerCache[enclosedNonMemberContainer.name] = enclosedNonMemberContainer;
        }

        public addTypeParameter(typeParameter: PullTypeParameterSymbol): void {
            if (!typeParameter) {
                return;
            }

            if (!typeParameter.getContainer()) {
                typeParameter.setContainer(this);
            }

            if (!this._typeParameterNameCache) {
                this._typeParameterNameCache = createIntrinsicsObject();
            }

            if (!this._typeParameters) {
                this._typeParameters = [];
            }

            this._typeParameters[this._typeParameters.length] = typeParameter;
            this._typeParameterNameCache[typeParameter.getName()] = typeParameter;
        }

        // GTODO
        public addConstructorTypeParameter(typeParameter: PullTypeParameterSymbol): void {

            this.addTypeParameter(typeParameter);

            var constructSignatures = this.getConstructSignatures();

            for (var i = 0; i < constructSignatures.length; i++) {
                constructSignatures[i].addTypeParameter(typeParameter);
            }
        }

        public getMembers(): PullSymbol[] {
            return this._members;
        }

        public setHasDefaultConstructor(hasOne= true): void {
            this._hasDefaultConstructor = hasOne;
        }

        public getHasDefaultConstructor(): boolean {
            return this._hasDefaultConstructor;
        }

        public getConstructorMethod(): PullSymbol {
            return this._constructorMethod;
        }

        public setConstructorMethod(constructorMethod: PullSymbol): void {
            this._constructorMethod = constructorMethod;
        }

        public getTypeParameters(): PullTypeParameterSymbol[] {
            if (!this._typeParameters) {
                return sentinelEmptyArray;
            }

            return this._typeParameters;
        }

        // GTODO
        public isGeneric(): boolean {
            return (this._typeParameters && this._typeParameters.length > 0) ||
                this._hasGenericSignature ||
                this._hasGenericMember ||
                this.isArrayNamedTypeReference();
        }

        private canUseSimpleInstantiationCache(substitutingTypes: PullTypeSymbol[]): boolean {
            return substitutingTypes.length === 1 && substitutingTypes[0].kind !== PullElementKind.ObjectType;
        }

        public addSpecialization(specializedVersionOfThisType: PullTypeSymbol, substitutingTypes: PullTypeSymbol[]): void {

            if (!substitutingTypes || !substitutingTypes.length) {
                return;
            }

            if (this.canUseSimpleInstantiationCache(substitutingTypes)) {
                if (!this._simpleInstantiationCache) {
                    this._simpleInstantiationCache = [];
                }

                this._simpleInstantiationCache[substitutingTypes[0].pullSymbolID] = specializedVersionOfThisType;
            }
            else {
                if (!this._complexSpecializationCache) {
                    this._complexSpecializationCache = createIntrinsicsObject();
                }

                this._complexSpecializationCache[getIDForTypeSubstitutions(substitutingTypes)] = specializedVersionOfThisType;
            }

            if (!this._specializedVersionsOfThisType) {
                this._specializedVersionsOfThisType = [];
            }

            this._specializedVersionsOfThisType.push(specializedVersionOfThisType);
        }

        public getSpecialization(substitutingTypes: PullTypeSymbol[]): PullTypeSymbol {

            if (!substitutingTypes || !substitutingTypes.length) {
                return null;
            }

            if (this.canUseSimpleInstantiationCache(substitutingTypes)) {
                if (!this._simpleInstantiationCache) {
                    return null;
                }

                var result = this._simpleInstantiationCache[substitutingTypes[0].pullSymbolID];
                return result ? result : null;
            }
            else {
                if (!this._complexSpecializationCache) {
                    return null;
                }

                var result = this._complexSpecializationCache[getIDForTypeSubstitutions(substitutingTypes)];
                return result ? result : null;
            }
        }

        public getKnownSpecializations(): PullTypeSymbol[] {
            if (!this._specializedVersionsOfThisType) {
                return sentinelEmptyArray;
            }

            return this._specializedVersionsOfThisType;
        }

        // GTODO
        public getTypeArguments(): PullTypeSymbol[] {
            return null;
        }

        public getTypeArgumentsOrTypeParameters(): PullTypeSymbol[] {
            return this.getTypeParameters();
        }

        public addCallSignature(callSignature: PullSignatureSymbol): void {

            if (!this._callSignatures) {
                this._callSignatures = [];
            }

            this._callSignatures[this._callSignatures.length] = callSignature;

            if (callSignature.isGeneric()) {
                this._hasGenericSignature = true;
            }

            callSignature.functionType = this;
        }

        public addConstructSignature(constructSignature: PullSignatureSymbol): void {

            if (!this._constructSignatures) {
                this._constructSignatures = [];
            }

            this._constructSignatures[this._constructSignatures.length] = constructSignature;

            if (constructSignature.isGeneric()) {
                this._hasGenericSignature = true;
            }

            constructSignature.functionType = this;
        }

        public addIndexSignature(indexSignature: PullSignatureSymbol): void {
            if (!this._indexSignatures) {
                this._indexSignatures = [];
            }

            this._indexSignatures[this._indexSignatures.length] = indexSignature;

            if (indexSignature.isGeneric()) {
                this._hasGenericSignature = true;
            }

            indexSignature.functionType = this;
        }

        public hasOwnCallSignatures(): boolean { return !!this._callSignatures; }

        public getCallSignatures(collectBaseSignatures= true): PullSignatureSymbol[] {

            if (!collectBaseSignatures) {
                return this._callSignatures || [];
            }

            if (this._allCallSignatures) {
                return this._allCallSignatures;
            }

            var signatures: PullSignatureSymbol[] = [];

            if (this._callSignatures) {
                signatures = signatures.concat(this._callSignatures);
            }

            if (collectBaseSignatures && this._extendedTypes) {
                for (var i = 0; i < this._extendedTypes.length; i++) {
                    if (this._extendedTypes[i].hasBase(this)) {
                        continue;
                    }

                    signatures = signatures.concat(this._extendedTypes[i].getCallSignatures());
                }
            }

            this._allCallSignatures = signatures;

            return signatures;
        }

        public hasOwnConstructSignatures(): boolean { return !!this._constructSignatures; }

        public getConstructSignatures(collectBaseSignatures= true): PullSignatureSymbol[] {

            if (!collectBaseSignatures) {
                return this._constructSignatures || [];
            }

            var signatures: PullSignatureSymbol[] = [];

            if (this._constructSignatures) {
                signatures = signatures.concat(this._constructSignatures);
            }

            // If it's a constructor type, we don't inherit construct signatures
            // (E.g., we'd be looking at the statics on a class, where we want
            // to inherit members, but not construct signatures
            if (collectBaseSignatures && this._extendedTypes && !(this.kind == PullElementKind.ConstructorType)) {
                for (var i = 0; i < this._extendedTypes.length; i++) {
                    if (this._extendedTypes[i].hasBase(this)) {
                        continue;
                    }

                    signatures = signatures.concat(this._extendedTypes[i].getConstructSignatures());
                }
            }

            return signatures;
        }

        public hasOwnIndexSignatures(): boolean { return !!this._indexSignatures; }

        public getIndexSignatures(collectBaseSignatures= true): PullSignatureSymbol[] {

            if (!collectBaseSignatures) {
                return this._indexSignatures || [];
            }

            if (this._allIndexSignatures) {
                return this._allIndexSignatures;
            }

            var signatures: PullSignatureSymbol[] = [];

            if (this._indexSignatures) {
                signatures = signatures.concat(this._indexSignatures);
            }

            if (collectBaseSignatures && this._extendedTypes) {
                for (var i = 0; i < this._extendedTypes.length; i++) {
                    if (this._extendedTypes[i].hasBase(this)) {
                        continue;
                    }

                    signatures = signatures.concat(this._extendedTypes[i].getIndexSignatures());
                }
            }

            this._allIndexSignatures = signatures;

            return signatures;
        }

        public addImplementedType(implementedType: PullTypeSymbol): void {
            if (!implementedType) {
                return;
            }

            if (!this._implementedTypes) {
                this._implementedTypes = [];
            }

            this._implementedTypes[this._implementedTypes.length] = implementedType;

            implementedType.addTypeThatExplicitlyImplementsThisType(this);
        }

        public getImplementedTypes(): PullTypeSymbol[] {
            if (!this._implementedTypes) {
                return sentinelEmptyArray;
            }

            return this._implementedTypes;
        }

        public addExtendedType(extendedType: PullTypeSymbol): void {
            if (!extendedType) {
                return;
            }

            if (!this._extendedTypes) {
                this._extendedTypes = [];
            }

            this._extendedTypes[this._extendedTypes.length] = extendedType;

            extendedType.addTypeThatExtendsThisType(this);
        }

        public getExtendedTypes(): PullTypeSymbol[] {
            if (!this._extendedTypes) {
                return sentinelEmptyArray;
            }

            return this._extendedTypes;
        }

        public addTypeThatExtendsThisType(type: PullTypeSymbol): void {
            if (!type) {
                return;
            }

            if (!this._typesThatExtendThisType) {
                this._typesThatExtendThisType = [];
            }

            this._typesThatExtendThisType[this._typesThatExtendThisType.length] = type;
        }

        public getTypesThatExtendThisType(): PullTypeSymbol[] {
            if (!this._typesThatExtendThisType) {
                this._typesThatExtendThisType = [];
            }

            return this._typesThatExtendThisType;
        }

        public addTypeThatExplicitlyImplementsThisType(type: PullTypeSymbol): void {
            if (!type) {
                return;
            }

            if (!this._typesThatExplicitlyImplementThisType) {
                this._typesThatExplicitlyImplementThisType = [];
            }

            this._typesThatExplicitlyImplementThisType[this._typesThatExplicitlyImplementThisType.length] = type;
        }

        public getTypesThatExplicitlyImplementThisType(): PullTypeSymbol[] {
            if (!this._typesThatExplicitlyImplementThisType) {
                this._typesThatExplicitlyImplementThisType = [];
            }

            return this._typesThatExplicitlyImplementThisType;
        }

        public hasBase(potentialBase: PullTypeSymbol, visited: PullSymbol[]= []): boolean {
            // Check if this is the potential base:
            //      A extends A  => this === potentialBase
            //      A<T> extends A<T>  => this.getRootSymbol() === potentialBase
            //      A<T> extends A<string> => this === potentialBase.getRootSymbol()
            if (this === potentialBase || this.getRootSymbol() === potentialBase || this === potentialBase.getRootSymbol()) {
                return true;
            }

            if (ArrayUtilities.contains(visited, this)) {
                return true;
            }

            visited.push(this);

            var extendedTypes = this.getExtendedTypes();

            for (var i = 0; i < extendedTypes.length; i++) {
                if (extendedTypes[i].hasBase(potentialBase, visited)) {
                    return true;
                }
            }

            var implementedTypes = this.getImplementedTypes();

            for (var i = 0; i < implementedTypes.length; i++) {
                if (implementedTypes[i].hasBase(potentialBase, visited)) {
                    return true;
                }
            }

            // Clean the list if we are returning false to ensure we are not leaving symbols that 
            // were not in the path. No need to do that if we return true, as that will short circuit
            // the search
            visited.pop();

            return false;
        }

        public isValidBaseKind(baseType: PullTypeSymbol, isExtendedType: boolean): boolean {
            // Error type symbol is invalid base kind
            if (baseType.isError()) {
                return false;
            }

            var thisIsClass = this.isClass();
            if (isExtendedType) {
                if (thisIsClass) {
                    // Class extending non class Type is invalid
                    return baseType.kind === PullElementKind.Class;
                }
            } else {
                if (!thisIsClass) {
                    // Interface implementing baseType is invalid
                    return false;
                }
            }

            // Interface extending non interface or class 
            // or class implementing non interface or class - are invalid
            return !!(baseType.kind & (PullElementKind.Interface | PullElementKind.Class));
        }

        public findMember(name: string, lookInParent = true): PullSymbol {
            var memberSymbol: PullSymbol = null;

            if (this._memberNameCache) {
                memberSymbol = this._memberNameCache[name];
            }

            if (!lookInParent) {
                return memberSymbol;
            }
            else if (memberSymbol) {
                return memberSymbol;
            }

            // check parents
            if (!memberSymbol && this._extendedTypes) {

                for (var i = 0; i < this._extendedTypes.length; i++) {
                    memberSymbol = this._extendedTypes[i].findMember(name);

                    if (memberSymbol) {
                        return memberSymbol;
                    }
                }
            }

            return null;
        }

        public findNestedType(name: string, kind = PullElementKind.None): PullTypeSymbol {
            var memberSymbol: PullTypeSymbol;

            if (!this._enclosedTypeNameCache) {
                return null;
            }

            memberSymbol = this._enclosedTypeNameCache[name];

            if (memberSymbol && kind != PullElementKind.None) {
                memberSymbol = ((memberSymbol.kind & kind) != 0) ? memberSymbol : null;
            }

            return memberSymbol;
        }

        public findNestedContainer(name: string, kind = PullElementKind.None): PullTypeSymbol {
            var memberSymbol: PullTypeSymbol;

            if (!this._enclosedContainerCache) {
                return null;
            }

            memberSymbol = this._enclosedContainerCache[name];

            if (memberSymbol && kind != PullElementKind.None) {
                memberSymbol = ((memberSymbol.kind & kind) != 0) ? memberSymbol : null;
            }

            return memberSymbol;
        }

        public getAllMembers(searchDeclKind: PullElementKind, memberVisiblity: GetAllMembersVisiblity): PullSymbol[] {

            var allMembers: PullSymbol[] = [];

            var i = 0;
            var j = 0;
            var m = 0;
            var n = 0;

            // Add members
            if (this._members != sentinelEmptyArray) {

                for (var i = 0, n = this._members.length; i < n; i++) {
                    var member = this._members[i];
                    if ((member.kind & searchDeclKind) && (memberVisiblity !== GetAllMembersVisiblity.externallyVisible || !member.hasFlag(PullElementFlags.Private))) {
                        allMembers[allMembers.length] = member;
                    }
                }
            }

            // Add parent members
            if (this._extendedTypes) {
                // Do not look for the parent's private members unless we need to enumerate all members
                var extenedMembersVisibility = memberVisiblity !== GetAllMembersVisiblity.all ? GetAllMembersVisiblity.externallyVisible : GetAllMembersVisiblity.all;

                for (var i = 0, n = this._extendedTypes.length; i < n; i++) {
                    var extendedMembers = this._extendedTypes[i].getAllMembers(searchDeclKind, /*memberVisiblity*/ extenedMembersVisibility);

                    for (var j = 0, m = extendedMembers.length; j < m; j++) {
                        var extendedMember = extendedMembers[j];
                        if (!(this._memberNameCache && this._memberNameCache[extendedMember.name])) {
                            allMembers[allMembers.length] = extendedMember;
                        }
                    }
                }
            }

            if (this.isContainer()) {
                if (this._enclosedMemberTypes) {
                    for (var i = 0; i < this._enclosedMemberTypes.length; i++) {
                        allMembers[allMembers.length] = this._enclosedMemberTypes[i];
                    }
                }
                if (this._enclosedMemberContainers) {
                    for (var i = 0; i < this._enclosedMemberContainers.length; i++) {
                        allMembers[allMembers.length] = this._enclosedMemberContainers[i];
                    }
                }
            }

            return allMembers;
        }

        public findTypeParameter(name: string): PullTypeParameterSymbol {
            if (!this._typeParameterNameCache) {
                return null;
            }

            return this._typeParameterNameCache[name];
        }

        public setResolved(): void {
            super.setResolved();
        }

        public getNamePartForFullName(): string {
            var name = super.getNamePartForFullName();

            var typars = this.getTypeArgumentsOrTypeParameters();
            var typarString = PullSymbol.getTypeParameterString(typars, this, /*useConstraintInName:*/ true);
            return name + typarString;
        }

        public getScopedName(scopeSymbol?: PullSymbol, useConstraintInName?: boolean): string {
            return this.getScopedNameEx(scopeSymbol, useConstraintInName).toString();
        }

        public isNamedTypeSymbol(): boolean {
            var kind = this.kind;
            if (kind === PullElementKind.Primitive || // primitives
                kind === PullElementKind.Class || // class
                kind === PullElementKind.Container || // module
                kind === PullElementKind.DynamicModule || // dynamic module
                kind === PullElementKind.TypeAlias || // dynamic module
                kind === PullElementKind.Enum || // enum
                kind === PullElementKind.TypeParameter || //TypeParameter
                ((kind === PullElementKind.Interface || kind === PullElementKind.ObjectType) && this.name != "")) {
                return true;
            }

            return false;
        }

        public toString(scopeSymbol?: PullSymbol, useConstraintInName?: boolean): string {
            var s = this.getScopedNameEx(scopeSymbol, useConstraintInName).toString();
            return s;
        }

        public getScopedNameEx(scopeSymbol?: PullSymbol, useConstraintInName?: boolean, getPrettyTypeName?: boolean, getTypeParamMarkerInfo?: boolean): MemberName {

            if (this.isArrayNamedTypeReference()) {
                var elementType = this.getElementType();
                var elementMemberName = elementType ?
                    (elementType.isArrayNamedTypeReference() || elementType.isNamedTypeSymbol() ?
                    elementType.getScopedNameEx(scopeSymbol, false, getPrettyTypeName, getTypeParamMarkerInfo) :
                    elementType.getMemberTypeNameEx(false, scopeSymbol, getPrettyTypeName)) :
                    MemberName.create("any");
                return MemberName.create(elementMemberName, "", "[]");
            }

            if (!this.isNamedTypeSymbol()) {
                return this.getMemberTypeNameEx(/*topLevel*/ true, scopeSymbol, getPrettyTypeName);
            }

            var builder = new MemberNameArray();
            builder.prefix = super.getScopedName(scopeSymbol, useConstraintInName);

            var typars = this.getTypeArgumentsOrTypeParameters();
            builder.add(PullSymbol.getTypeParameterStringEx(typars, scopeSymbol, getTypeParamMarkerInfo, useConstraintInName));

            return builder;
        }

        public hasOnlyOverloadCallSignatures(): boolean {
            var members = this.getMembers();
            var callSignatures = this.getCallSignatures();
            var constructSignatures = this.getConstructSignatures();
            return members.length === 0 && constructSignatures.length === 0 && callSignatures.length > 1;
        }

        private getMemberTypeNameEx(topLevel: boolean, scopeSymbol?: PullSymbol, getPrettyTypeName?: boolean): MemberName {
            var members = this.getMembers();
            var callSignatures = this.getCallSignatures();
            var constructSignatures = this.getConstructSignatures();
            var indexSignatures = this.getIndexSignatures();

            if (members.length > 0 || callSignatures.length > 0 || constructSignatures.length > 0 || indexSignatures.length > 0) {
                if (this._inMemberTypeNameEx) {
                    var associatedContainerType = this.getAssociatedContainerType();
                    if (associatedContainerType && associatedContainerType.isNamedTypeSymbol()) {
                        var nameForTypeOf = associatedContainerType.getScopedNameEx(scopeSymbol);
                        return MemberName.create(nameForTypeOf, "typeof ", "");
                    } else {
                        // If recursive without type name(possible?) default to any
                        return MemberName.create("any");
                    }
                }

                this._inMemberTypeNameEx = true;

                var allMemberNames = new MemberNameArray();
                var curlies = !topLevel || indexSignatures.length != 0;
                var delim = "; ";
                for (var i = 0; i < members.length; i++) {
                    if (members[i].kind == PullElementKind.Method && members[i].type.hasOnlyOverloadCallSignatures()) {
                        // Add all Call signatures of the method
                        var methodCallSignatures = members[i].type.getCallSignatures();
                        var nameStr = members[i].getDisplayName(scopeSymbol) + (members[i].isOptional ? "?" : "");;
                        var methodMemberNames = PullSignatureSymbol.getSignaturesTypeNameEx(methodCallSignatures, nameStr, /*shortform*/ false, /*brackets*/ false, scopeSymbol);
                        allMemberNames.addAll(methodMemberNames);
                    } else {
                        var memberTypeName = members[i].getNameAndTypeNameEx(scopeSymbol);
                        if (memberTypeName.isArray() && (<MemberNameArray>memberTypeName).delim === delim) {
                            allMemberNames.addAll((<MemberNameArray>memberTypeName).entries);
                        } else {
                            allMemberNames.add(memberTypeName);
                        }
                    }
                    curlies = true;
                }

                // Use pretty Function overload signature if this is just a call overload
                var getPrettyFunctionOverload = getPrettyTypeName && !curlies && this.hasOnlyOverloadCallSignatures();

                var signatureCount = callSignatures.length + constructSignatures.length + indexSignatures.length;
                var useShortFormSignature = !curlies && (signatureCount === 1);
                var signatureMemberName: MemberName[];

                if (callSignatures.length > 0) {
                    signatureMemberName =
                    PullSignatureSymbol.getSignaturesTypeNameEx(callSignatures, /*prefix*/ "", useShortFormSignature, /*brackets*/ false, scopeSymbol, getPrettyFunctionOverload);
                    allMemberNames.addAll(signatureMemberName);
                }

                if (constructSignatures.length > 0) {
                    signatureMemberName =
                    PullSignatureSymbol.getSignaturesTypeNameEx(constructSignatures, "new", useShortFormSignature, /*brackets*/ false, scopeSymbol);
                    allMemberNames.addAll(signatureMemberName);
                }

                if (indexSignatures.length > 0) {
                    signatureMemberName =
                    PullSignatureSymbol.getSignaturesTypeNameEx(indexSignatures, /*prefix*/ "", useShortFormSignature, /*brackets*/ true, scopeSymbol);
                    allMemberNames.addAll(signatureMemberName);
                }

                if ((curlies) || (!getPrettyFunctionOverload && (signatureCount > 1) && topLevel)) {
                    allMemberNames.prefix = "{ ";
                    allMemberNames.suffix = "}";
                    allMemberNames.delim = delim;
                } else if (allMemberNames.entries.length > 1) {
                    allMemberNames.delim = delim;
                }

                this._inMemberTypeNameEx = false;

                return allMemberNames;

            }

            return MemberName.create("{}");
        }

        public getGenerativeTypeClassification(enclosingType: PullTypeSymbol): GenerativeTypeClassification {
            return GenerativeTypeClassification.Closed;
        }

        // REVIEW: Should cache these checks

        // The argument map prevents us from accidentally flagging method type parameters, or (if we
        // ever decide to go that route) allows for partial specialization
        public wrapsSomeTypeParameter(typeParameterArgumentMap: PullTypeSymbol[]): boolean {
            var type = this;

            var wrapsSomeTypeParameter = false;

            // if we encounter a type paramter, we're obviously wrapping
            if (type.isTypeParameter()) {
                if (typeParameterArgumentMap[type.pullSymbolID]) {
                    return true;
                }

                var constraint = (<PullTypeParameterSymbol>type).getConstraint();

                if (constraint && constraint.wrapsSomeTypeParameter(typeParameterArgumentMap)) {
                    return true;
                }

                return false;
            }

            if (type.inWrapCheck) {
                return wrapsSomeTypeParameter;
            }

            type.inWrapCheck = true;

            if (!wrapsSomeTypeParameter) {
                var typeArguments = type.getTypeArguments();

                // If there are no type arguments, we could be instantiating the 'root' type
                // declaration
                if (type.isGeneric() && !typeArguments) {
                    typeArguments = type.getTypeParameters();
                }

                // if it's a generic type, scan the type arguments to see which may wrap type parameters
                if (typeArguments) {
                    for (var i = 0; i < typeArguments.length; i++) {
                        if (typeArguments[i].wrapsSomeTypeParameter(typeParameterArgumentMap)) {
                            wrapsSomeTypeParameter = true;
                            break;
                        }
                    }
                }
            }

            // if it's not a named type, we'll need to introspect its member list
            if (!(type.kind & PullElementKind.SomeInstantiatableType) || !type.name) {
                if (!wrapsSomeTypeParameter) {
                    // otherwise, walk the member list and signatures, checking for wraps
                    var members = type.getAllMembers(PullElementKind.SomeValue, GetAllMembersVisiblity.all);

                    for (var i = 0; i < members.length; i++) {
                        if (members[i].type.wrapsSomeTypeParameter(typeParameterArgumentMap)) {
                            wrapsSomeTypeParameter = true;
                            break;
                        }
                    }
                }

                if (!wrapsSomeTypeParameter) {
                    var sigs = type.getCallSignatures(true);

                    for (var i = 0; i < sigs.length; i++) {
                        if (sigs[i].wrapsSomeTypeParameter(typeParameterArgumentMap)) {
                            wrapsSomeTypeParameter = true;
                            break;
                        }
                    }
                }

                if (!wrapsSomeTypeParameter) {
                    sigs = type.getConstructSignatures(true);

                    for (var i = 0; i < sigs.length; i++) {
                        if (sigs[i].wrapsSomeTypeParameter(typeParameterArgumentMap)) {
                            wrapsSomeTypeParameter = true;
                            break;
                        }
                    }
                }

                if (!wrapsSomeTypeParameter) {
                    sigs = type.getIndexSignatures(true);

                    for (var i = 0; i < sigs.length; i++) {
                        if (sigs[i].wrapsSomeTypeParameter(typeParameterArgumentMap)) {
                            wrapsSomeTypeParameter = true;
                            break;
                        }
                    }
                }
            }

            type.inWrapCheck = false;

            return wrapsSomeTypeParameter;
        }

        // Detect if a type parameter is wrapped in a wrapped form.  E.g., for 'T'
        //  class C<T> {
        //      p1: T; <- no
        //      p2: C<T>; <- yes
        //  }
        public wrapsSomeNestedType(typeBeingWrapped: PullTypeSymbol, isCheckingNestedType: boolean) {
            var knownWrapMap = BitMatrix.getBitMatrix(/*allowUndefinedValues:*/ true);
            var result = this._wrapsSomeNestedTypeRecurse(typeBeingWrapped, isCheckingNestedType, knownWrapMap);
            knownWrapMap.release();

            return result;
        }

        public _wrapsSomeNestedTypeRecurse(typeBeingWrapped: PullTypeSymbol, isCheckingNestedType: boolean, knownWrapMap: IBitMatrix): boolean {

            if (this == typeBeingWrapped || this.inWrapCheck || typeBeingWrapped.inWrapCheck) {
                if (!!isCheckingNestedType) {
                    knownWrapMap.setValueAt(this.pullSymbolID, typeBeingWrapped.pullSymbolID, true);
                }
                return !!isCheckingNestedType;
            }

            if (knownWrapMap.valueAt(this.pullSymbolID, typeBeingWrapped.pullSymbolID) != undefined) {
                return knownWrapMap.valueAt(this.pullSymbolID, typeBeingWrapped.pullSymbolID);
            }

            // if we encounter a type parameter or primitive, nothing is being wrapped
            if (this.isPrimitive() || this.isTypeParameter()) {
                return false;
            }

            var wrapsSomeWrappedTypeParameter = false;

            knownWrapMap.setValueAt(this.pullSymbolID, typeBeingWrapped.pullSymbolID, !!isCheckingNestedType);

            wrapsSomeWrappedTypeParameter = this._wrapSomeNestedTypeWorker(typeBeingWrapped, isCheckingNestedType, knownWrapMap);

            knownWrapMap.setValueAt(this.pullSymbolID, typeBeingWrapped.pullSymbolID, wrapsSomeWrappedTypeParameter);

            this.inWrapCheck = false;

            return wrapsSomeWrappedTypeParameter;
        }

        private _wrapSomeNestedTypeWorker(typeBeingWrapped: PullTypeSymbol, isCheckingNestedType: boolean, knownWrapMap: IBitMatrix): boolean {

            this.inWrapCheck = true;

            var typeArguments = this.getTypeArguments();

            // If there are no type arguments, we could be instantiating the 'root' type
            // declaration
            if (this.isGeneric() && !typeArguments) {
                typeArguments = this.getTypeParameters();
            }

            // if it's a generic type, test to see if we're wrapping
            if (typeArguments) {
                for (var i = 0; i < typeArguments.length; i++) {
                    if ((isCheckingNestedType && typeArguments[i].isTypeParameter() && (typeArguments[i].getRootSymbol() == typeBeingWrapped.getRootSymbol())) ||
                        typeArguments[i]._wrapsSomeNestedTypeRecurse(typeBeingWrapped, true, knownWrapMap)) {
                        return true;
                    }
                }
            }

            // otherwise, walk the member list and signatures, checking for wraps
            var members = this.getAllMembers(PullElementKind.SomeValue, GetAllMembersVisiblity.all);

            for (var i = 0; i < members.length; i++) {
                if (members[i].type && members[i].type._wrapsSomeNestedTypeRecurse(typeBeingWrapped, isCheckingNestedType, knownWrapMap)) {
                    return true;
                }
            }

            var sigs = this.getCallSignatures(true);

            for (var i = 0; i < sigs.length; i++) {
                if (sigs[i].wrapsSomeNestedType(typeBeingWrapped, isCheckingNestedType, knownWrapMap)) {
                    return true;
                }
            }

            sigs = this.getConstructSignatures(true);

            for (var i = 0; i < sigs.length; i++) {
                if (sigs[i].wrapsSomeNestedType(typeBeingWrapped, isCheckingNestedType, knownWrapMap)) {
                    return true;
                }
            }

            sigs = this.getIndexSignatures(true);

            for (var i = 0; i < sigs.length; i++) {
                if (sigs[i].wrapsSomeNestedType(typeBeingWrapped, isCheckingNestedType, knownWrapMap)) {
                    return true;
                }
            }

            return false;
        }
    }

    export class PullPrimitiveTypeSymbol extends PullTypeSymbol {
        constructor(name: string) {
            super(name, PullElementKind.Primitive);

            this.isResolved = true;
        }

        public isAny(): boolean {
            return this.name === "any";
        }

        public isStringConstant() { return false; }

        public setUnresolved() {
            // do nothing...
        }
    }

    export class PullStringConstantTypeSymbol extends PullPrimitiveTypeSymbol {
        constructor(name: string) {
            super(name);
        }

        public isStringConstant() {
            return true;
        }
    }

    export class PullErrorTypeSymbol extends PullPrimitiveTypeSymbol {

        constructor(private anyType: PullTypeSymbol, name: string) {
            super(name);

            this.isResolved = true;
        }

        public isError() {
            return true;
        }

        public getName(scopeSymbol?: PullSymbol, useConstraintInName?: boolean): string {
            return this.anyType.getName(scopeSymbol, useConstraintInName);
        }

        public getDisplayName(scopeSymbol?: PullSymbol, useConstraintInName?: boolean): string {
            return this.anyType.getName(scopeSymbol, useConstraintInName);
        }

        public toString(scopeSymbol?: PullSymbol, useConstraintInName?: boolean) {
            return this.anyType.getName(scopeSymbol, useConstraintInName);
        }
    }

    // represents the module "namespace" type
    export class PullContainerSymbol extends PullTypeSymbol {
        public instanceSymbol: PullSymbol = null;

        private assignedValue: PullSymbol = null;
        private assignedType: PullTypeSymbol = null;
        private assignedContainer: PullContainerSymbol = null;

        constructor(name: string, kind: PullElementKind) {
            super(name, kind);
        }

        public isContainer() { return true; }

        public setInstanceSymbol(symbol: PullSymbol) {
            this.instanceSymbol = symbol;
        }

        public getInstanceSymbol(): PullSymbol {
            return this.instanceSymbol;
        }

        public setExportAssignedValueSymbol(symbol: PullSymbol) {
            this.assignedValue = symbol;
        }

        public getExportAssignedValueSymbol() {
            return this.assignedValue;
        }

        public setExportAssignedTypeSymbol(type: PullTypeSymbol) {
            this.assignedType = type;
        }

        public getExportAssignedTypeSymbol() {
            return this.assignedType;
        }

        public setExportAssignedContainerSymbol(container: PullContainerSymbol) {
            this.assignedContainer = container;
        }

        public getExportAssignedContainerSymbol() {
            return this.assignedContainer;
        }

        public hasExportAssignment() {
            return !!this.assignedValue || !!this.assignedType || !!this.assignedContainer;
        }

        static usedAsSymbol(containerSymbol: PullSymbol, symbol: PullSymbol): boolean {
            if (!containerSymbol || !containerSymbol.isContainer()) {
                return false;
            }

            if (!containerSymbol.isAlias() && containerSymbol.type == symbol) {
                return true;
            }

            var moduleSymbol = <PullContainerSymbol>containerSymbol;
            var valueExportSymbol = moduleSymbol.getExportAssignedValueSymbol();
            var typeExportSymbol = moduleSymbol.getExportAssignedTypeSymbol();
            var containerExportSymbol = moduleSymbol.getExportAssignedContainerSymbol();
            if (valueExportSymbol || typeExportSymbol || containerExportSymbol) {
                return valueExportSymbol == symbol || typeExportSymbol == symbol || containerExportSymbol == symbol || PullContainerSymbol.usedAsSymbol(containerExportSymbol, symbol);
            }

            return false;
        }

        public getInstanceType() {
            return this.instanceSymbol ? this.instanceSymbol.type : null;
        }
    }

    export class PullTypeAliasSymbol extends PullTypeSymbol {
        private _assignedValue: PullSymbol = null;
        private _assignedType: PullTypeSymbol = null;
        private _assignedContainer: PullContainerSymbol = null;

        private _isUsedAsValue = false;
        private _typeUsedExternally = false;
        private retrievingExportAssignment = false;

        constructor(name: string, private resolver: PullTypeResolver) {
            super(name, PullElementKind.TypeAlias);
        }

        public typeUsedExternally(): boolean {
            this.resolver.resolveDeclaredSymbol(this);
            return this._typeUsedExternally;
        }

        public isUsedAsValue(): boolean {
            this.resolver.resolveDeclaredSymbol(this);
            return this._isUsedAsValue;
        }

        public setTypeUsedExternally(value: boolean): void {
            this._typeUsedExternally = value;
        }

        public setIsUsedAsValue(value: boolean): void {
            this._isUsedAsValue = value;
        }

        public assignedValue(): PullSymbol {
            this.resolver.resolveDeclaredSymbol(this);
            return this._assignedValue;
        }

        public assignedType(): PullTypeSymbol {
            this.resolver.resolveDeclaredSymbol(this);
            return this._assignedType;
        }

        public assignedContainer(): PullContainerSymbol {
            this.resolver.resolveDeclaredSymbol(this);
            return this._assignedContainer;
        }

        public isAlias() { return true; }
        public isContainer() { return true; }

        public setAssignedValueSymbol(symbol: PullSymbol): void {
            this._assignedValue = symbol;
        }

        public getExportAssignedValueSymbol(): PullSymbol {
            if (this._assignedValue) {
                return this._assignedValue;
            }

            if (this.retrievingExportAssignment) {
                return null;
            }

            if (this._assignedContainer) {
                this.retrievingExportAssignment = true;
                var sym = this._assignedContainer.getExportAssignedValueSymbol();
                this.retrievingExportAssignment = false;
                return sym;
            }

            return null;
        }

        public setAssignedTypeSymbol(type: PullTypeSymbol): void {
            this._assignedType = type;
        }

        public getExportAssignedTypeSymbol(): PullTypeSymbol {
            if (this.retrievingExportAssignment) {
                return null;
            }

            if (this._assignedType) {
                if (this._assignedType.isAlias()) {
                    this.retrievingExportAssignment = true;
                    var sym = (<PullTypeAliasSymbol>this._assignedType).getExportAssignedTypeSymbol();
                    this.retrievingExportAssignment = false;
                } else if (this._assignedType != this._assignedContainer) {
                    return this._assignedType;
                }
            }

            if (this._assignedContainer) {
                this.retrievingExportAssignment = true;
                var sym = this._assignedContainer.getExportAssignedTypeSymbol();
                this.retrievingExportAssignment = false;
                if (sym) {
                    return sym;
                }
            }

            return this._assignedContainer;
        }

        public setAssignedContainerSymbol(container: PullContainerSymbol): void {
            this._assignedContainer = container;
        }

        public getExportAssignedContainerSymbol(): PullContainerSymbol {
            if (this.retrievingExportAssignment) {
                return null;
            }

            if (this._assignedContainer) {
                this.retrievingExportAssignment = true;
                var sym = this._assignedContainer.getExportAssignedContainerSymbol();
                this.retrievingExportAssignment = false;
                if (sym) {
                    return sym;
                }
            }

            return this._assignedContainer;
        }

        public getMembers(): PullSymbol[] {
            if (this._assignedType) {
                return this._assignedType.getMembers();
            }

            return sentinelEmptyArray;
        }

        public getCallSignatures(): PullSignatureSymbol[] {
            if (this._assignedType) {
                return this._assignedType.getCallSignatures();
            }

            return sentinelEmptyArray;
        }

        public getConstructSignatures(): PullSignatureSymbol[] {
            if (this._assignedType) {
                return this._assignedType.getConstructSignatures();
            }

            return sentinelEmptyArray;
        }

        public getIndexSignatures(): PullSignatureSymbol[] {
            if (this._assignedType) {
                return this._assignedType.getIndexSignatures();
            }

            return sentinelEmptyArray;
        }

        public findMember(name: string): PullSymbol {
            if (this._assignedType) {
                return this._assignedType.findMember(name);
            }

            return null;
        }

        public findNestedType(name: string): PullTypeSymbol {
            if (this._assignedType) {
                return this._assignedType.findNestedType(name);
            }

            return null;
        }

        public findNestedContainer(name: string): PullTypeSymbol {
            if (this._assignedType) {
                return this._assignedType.findNestedContainer(name);
            }

            return null;
        }

        public getAllMembers(searchDeclKind: PullElementKind, memberVisibility: GetAllMembersVisiblity): PullSymbol[] {
            if (this._assignedType) {
                return this._assignedType.getAllMembers(searchDeclKind, memberVisibility);
            }

            return sentinelEmptyArray;
        }
    }

    export class PullDefinitionSignatureSymbol extends PullSignatureSymbol {
        public isDefinition() { return true; }
    }

    export class PullTypeParameterSymbol extends PullTypeSymbol {
        private _constraint: PullTypeSymbol = null;

        constructor(name: string, private _isFunctionTypeParameter: boolean) {
            super(name, PullElementKind.TypeParameter);
        }

        public isTypeParameter() { return true; }
        public isFunctionTypeParameter() { return this._isFunctionTypeParameter; }

        public setConstraint(constraintType: PullTypeSymbol) {
            this._constraint = constraintType;
        }

        public getConstraint(): PullTypeSymbol {
            return this._constraint;
        }

        public getCallSignatures(collectBaseSignatures= true): PullSignatureSymbol[] {
            if (this._constraint) {
                return this._constraint.getCallSignatures();
            }

            return super.getCallSignatures(collectBaseSignatures);
        }

        public getConstructSignatures(collectBaseSignatures= true): PullSignatureSymbol[] {
            if (this._constraint) {
                return this._constraint.getConstructSignatures();
            }

            return super.getConstructSignatures(collectBaseSignatures);
        }

        public getIndexSignatures(collectBaseSignatures= true): PullSignatureSymbol[] {
            if (this._constraint) {
                return this._constraint.getIndexSignatures();
            }

            return super.getIndexSignatures(collectBaseSignatures);
        }

        public isGeneric() { return true; }

        public fullName(scopeSymbol?: PullSymbol) {
            var name = this.getDisplayName(scopeSymbol);
            var container = this.getContainer();
            if (container) {
                var containerName = container.fullName(scopeSymbol);
                name = name + " in " + containerName;
            }

            return name;
        }

        public getName(scopeSymbol?: PullSymbol, useConstraintInName?: boolean): string {
            var name = super.getName(scopeSymbol);

            if (this.isPrinting) {
                return name;
            }

            this.isPrinting = true;

            if (useConstraintInName && this._constraint) {
                name += " extends " + this._constraint.toString(scopeSymbol);
            }

            this.isPrinting = false;

            return name;
        }

        public getDisplayName(scopeSymbol?: PullSymbol, useConstraintInName?: boolean) {
            var name = super.getDisplayName(scopeSymbol, useConstraintInName);

            if (this.isPrinting) {
                return name;
            }

            this.isPrinting = true;

            if (useConstraintInName && this._constraint) {
                name += " extends " + this._constraint.toString(scopeSymbol);
            }

            this.isPrinting = false;

            return name;
        }

        public isExternallyVisible(inIsExternallyVisibleSymbols?: PullSymbol[]): boolean {
            return true;
        }
    }

    export class PullAccessorSymbol extends PullSymbol {

        private _getterSymbol: PullSymbol = null;
        private _setterSymbol: PullSymbol = null;

        constructor(name: string) {
            super(name, PullElementKind.Property);
        }

        public isAccessor() { return true; }

        public setSetter(setter: PullSymbol) {
            if (!setter) {
                return;
            }

            this._setterSymbol = setter;
        }

        public getSetter(): PullSymbol {
            return this._setterSymbol;
        }

        public setGetter(getter: PullSymbol) {
            if (!getter) {
                return;
            }

            this._getterSymbol = getter;
        }

        public getGetter(): PullSymbol {
            return this._getterSymbol;
        }
    }

    export function getIDForTypeSubstitutions(types: PullTypeSymbol[]): string {
        var substitution = "";
        var members: PullSymbol[] = null;

        for (var i = 0; i < types.length; i++) {

            // Cache object types structurally
            if (types[i].kind !== PullElementKind.ObjectType) {
                substitution += types[i].pullSymbolID + "#";
            }
            else {
                var structure = getIDForTypeSubstitutionsFromObjectType(types[i]);

                if (structure) {
                    substitution += structure;
                }
                else {
                    substitution += types[i].pullSymbolID + "#";
                }
            }
        }

        return substitution;
    }

    function getIDForTypeSubstitutionsFromObjectType(type: PullTypeSymbol): string {
        var structure = "";

        if (type.isResolved) {
            var members = type.getMembers();
            if (members && members.length) {
                for (var j = 0; j < members.length; j++) {
                    structure += members[j].name + "@" + getIDForTypeSubstitutions([members[j].type]);
                }
            }

            var callSignatures = type.getCallSignatures();
            if (callSignatures && callSignatures.length) {
                for (var j = 0; j < callSignatures.length; j++) {
                    structure += getIDForTypeSubstitutionFromSignature(callSignatures[j]);
                }
            }

            var constructSignatures = type.getConstructSignatures();
            if (constructSignatures && constructSignatures.length) {
                for (var j = 0; j < constructSignatures.length; j++) {
                    structure += "new" + getIDForTypeSubstitutionFromSignature(constructSignatures[j]);
                }
            }

            var indexSignatures = type.getIndexSignatures();
            if (indexSignatures && indexSignatures.length) {
                for (var j = 0; j < indexSignatures.length; j++) {
                    structure += "[]" + getIDForTypeSubstitutionFromSignature(indexSignatures[j]);
                }
            }
        }

        if (structure !== "") {
            return "{" + structure + "}";
        }

        return null;
    }

    function getIDForTypeSubstitutionFromSignature(signature: PullSignatureSymbol): string {
        var structure = "(";
        var parameters = signature.parameters;
        if (parameters && parameters.length) {
            for (var k = 0; k < parameters.length; k++) {
                structure += parameters[k].name + "@" + getIDForTypeSubstitutions([parameters[k].type]);
            }
        }

        structure += ")" + getIDForTypeSubstitutions([signature.returnType]);
        return structure;
    }

    export enum GetAllMembersVisiblity {
        // All properties of the type regardless of their accessibility level
        all = 0,

        // Only properties that are accessible on a class instance, i.e. public and private members of 
        // the current class, and only public members of any bases it extends
        internallyVisible = 1,

        // Only public members of classes
        externallyVisible = 2,
    }
}