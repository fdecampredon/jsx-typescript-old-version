// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
// See LICENSE.txt in the project root for complete license information.

///<reference path='..\typescript.ts' />

module TypeScript {

    export function getPathToDecl(decl: PullDecl): PullDecl[] {
        if (!decl) {
            return [];
        }

        var decls: PullDecl[] = decl.getParentPath();

        if (decls) {
            return decls;
        }
        else {
            decls = [decl];
        }

        var parentDecl: PullDecl = decl.getParentDecl();

        while (parentDecl) {
            if (parentDecl && decls[decls.length - 1] != parentDecl && !(parentDecl.kind & PullElementKind.ObjectLiteral)) {
                decls[decls.length] = parentDecl;
            }
            parentDecl = parentDecl.getParentDecl();
        }

        decls = decls.reverse();

        // PULLREVIEW: Only cache in batch compilation scenarios?
        decl.setParentPath(decls);

        return decls;
    }

    export class PullSymbolBinder {

        private functionTypeParameterCache = new BlockIntrinsics<PullTypeParameterSymbol>();

        private findTypeParameterInCache(name: string) {
            return this.functionTypeParameterCache[name];
        }

        private addTypeParameterToCache(typeParameter: PullTypeParameterSymbol) {
            this.functionTypeParameterCache[typeParameter.getName()] = typeParameter;
        }

        public resetTypeParameterCache() {
            this.functionTypeParameterCache = new BlockIntrinsics();
        }

        public semanticInfo: SemanticInfo = null;

        constructor(public semanticInfoChain: SemanticInfoChain) {
        }

        public setUnit(fileName: string) {
            this.semanticInfo = this.semanticInfoChain.getUnit(fileName);
        }

        public getParent(decl: PullDecl, returnInstanceType = false): PullTypeSymbol {

            var parentDecl = decl.getParentDecl();

            if (parentDecl.kind == PullElementKind.Script) {
                return null;
            }

            var parent = parentDecl.getSymbol();

            if (!parent && parentDecl && !parentDecl.isBound()) {
                this.bindDeclToPullSymbol(parentDecl);
            }

            parent = parentDecl.getSymbol();
            if (parent) {
                var parentDeclKind = parentDecl.kind;
                if (parentDeclKind == PullElementKind.GetAccessor) {
                    parent = (<PullAccessorSymbol>parent).getGetter();
                } else if (parentDeclKind == PullElementKind.SetAccessor) {
                    parent = (<PullAccessorSymbol>parent).getSetter();
                }
            }

            if (parent) {
                if (returnInstanceType && parent.isType() && parent.isContainer()) {
                    var instanceSymbol = (<PullContainerSymbol>parent).getInstanceSymbol();

                    if (instanceSymbol) {
                        return instanceSymbol.type;
                    }
                }

                return parent.type;
            }

            return null;
        }

        public findDeclsInContext(startingDecl: PullDecl, declKind: PullElementKind, searchGlobally: boolean): PullDecl[] {

            if (!searchGlobally) {
                var parentDecl = startingDecl.getParentDecl();
                return parentDecl.searchChildDecls(startingDecl.name, declKind);
            }

            var contextSymbolPath: PullDecl[] = getPathToDecl(startingDecl);

            // next, link back up to the enclosing context
            if (contextSymbolPath.length) {
                var copyOfContextSymbolPath: string[] = [];

                for (var i = 0; i < contextSymbolPath.length; i++) {
                    if (contextSymbolPath[i].kind & PullElementKind.Script) {
                        continue;
                    }
                    copyOfContextSymbolPath[copyOfContextSymbolPath.length] = contextSymbolPath[i].name;
                }

                return this.semanticInfoChain.findDecls(copyOfContextSymbolPath, declKind);
            }

            // finally, try searching globally
            return this.semanticInfoChain.findDecls([name], declKind);
        }

        // Called by all the bind methods when searching for existing symbols to reuse. Returns the symbol, or null if it does not exist.
        private getExistingSymbol(decl: PullDecl, searchKind: PullElementKind, parent: PullTypeSymbol): PullSymbol {
            var lookingForValue = (searchKind & PullElementKind.SomeValue) !== 0;
            var lookingForType = (searchKind & PullElementKind.SomeType) !== 0;
            var lookingForContainer = (searchKind & PullElementKind.SomeContainer) !== 0;
            var name = decl.name;
            if (parent) {
                var isExported = (decl.flags & PullElementFlags.Exported) !== 0;

                // First search for a nonmember
                var prevSymbol: PullSymbol = null;
                if (lookingForValue) {
                    prevSymbol = parent.findContainedNonMember(name);
                }
                else if (lookingForType) {
                    prevSymbol = parent.findContainedNonMemberType(name, searchKind);
                }
                else if (lookingForContainer) {
                    prevSymbol = parent.findContainedNonMemberContainer(name, searchKind);
                }
                var prevIsExported = !prevSymbol; // We didn't find it as a local, so it must be exported if it exists
                if (!prevSymbol) {
                    if (lookingForValue) {
                        prevSymbol = parent.findMember(name, false);
                    }
                    else if (lookingForType) {
                        prevSymbol = parent.findNestedType(name, searchKind);
                    }
                    else if (lookingForContainer) {
                        prevSymbol = parent.findNestedContainer(name, searchKind);
                    }
                }

                // If they are both exported, then they should definitely merge
                if (isExported && prevIsExported) {
                    return prevSymbol; // This could actually be null, but that is ok because it means we are not merging with anything
                }
                if (prevSymbol) {
                    // Check if they have the same parent (we use the LAST declaration to get the most positive answer on this)
                    var prevDecls = prevSymbol.getDeclarations();
                    var lastPrevDecl = prevDecls[prevDecls.length - 1];
                    var parentDecl = decl.getParentDecl();
                    var prevParentDecl = lastPrevDecl && lastPrevDecl.getParentDecl();
                    if (parentDecl !== prevParentDecl) {
                        // no merge
                        return null;
                    }

                    // They share the same parent, so merge them
                    return prevSymbol;
                }
            }
            else {
                var parentDecl = decl.getParentDecl();
                if (parentDecl && parentDecl.kind === PullElementKind.Script) {
                    return this.semanticInfoChain.findTopLevelSymbol(name, searchKind, this.semanticInfo.getPath());
                }
                else {
                    // The decl is in a control block (catch/with) that has no parent symbol. Luckily this type of parent can only have one decl.
                    var prevDecls = parentDecl && parentDecl.searchChildDecls(name, searchKind);
                    return prevDecls[0] && prevDecls[0].getSymbol();
                }
            }

            // Did not find a symbol
            return null;
        }

        // Reports an error and returns false if exports do not match. Otherwise, returns true.
        private checkThatExportsMatch(decl: PullDecl, prevSymbol: PullSymbol, reportError = true): boolean {
            // Get export status of each (check against the last decl of the previous symbol)
            var isExported = (decl.flags & PullElementFlags.Exported) !== 0;
            var prevDecls = prevSymbol.getDeclarations();
            var prevIsExported = (prevDecls[prevDecls.length - 1].flags & PullElementFlags.Exported) !== 0;
            if ((isExported !== prevIsExported) && !prevSymbol.isSignature() && (decl.kind & PullElementKind.SomeSignature) == 0) {
                if (reportError) {
                    var ast = this.semanticInfo.getASTForDecl(decl);
                    this.semanticInfo.addDiagnostic(new Diagnostic(this.semanticInfo.getPath(), ast.minChar, ast.getLength(),
                        DiagnosticCode.All_declarations_of_merged_declaration_0_must_be_exported_or_not_exported, [decl.getDisplayName()]));
                }
                return false;
            }

            return true;
        }

        //
        // decl binding
        //

        public bindModuleDeclarationToPullSymbol(moduleContainerDecl: PullDecl) {

            // 1. Test for existing decl - if it exists, use its symbol
            // 2. If no other decl exists, create a new symbol and use that one

            var modName = moduleContainerDecl.name;

            var moduleContainerTypeSymbol: PullContainerSymbol = null;
            var moduleInstanceSymbol: PullSymbol = null;
            var moduleInstanceTypeSymbol: PullTypeSymbol = null;

            var moduleInstanceDecl: PullDecl = moduleContainerDecl.getValueDecl();

            var moduleKind = moduleContainerDecl.kind;

            var parent = this.getParent(moduleContainerDecl);
            var parentInstanceSymbol = this.getParent(moduleContainerDecl, true);
            var parentDecl = moduleContainerDecl.getParentDecl();
            var moduleAST = <ModuleDeclaration>this.semanticInfo.getASTForDecl(moduleContainerDecl);

            var isExported = moduleContainerDecl.flags & PullElementFlags.Exported;
            var isEnum = (moduleKind & PullElementKind.Enum) != 0;
            var searchKind = isEnum ? PullElementKind.Enum : PullElementKind.SomeContainer;
            var isInitializedModule = (moduleContainerDecl.flags & PullElementFlags.SomeInitializedModule) != 0;

            if (parent && moduleKind == PullElementKind.DynamicModule) {
                // Dynamic modules cannot be parented
                this.semanticInfo.addDiagnostic(new Diagnostic(this.semanticInfo.getPath(), moduleAST.minChar, moduleAST.getLength(), DiagnosticCode.Ambient_external_module_declaration_must_be_defined_in_global_context, null));
            }

            var createdNewSymbol = false;

            moduleContainerTypeSymbol = <PullContainerSymbol>this.getExistingSymbol(moduleContainerDecl, searchKind, parent);

            if (moduleContainerTypeSymbol) {

                if (moduleContainerTypeSymbol.kind !== moduleKind) {
                    // duplicate symbol error
                    if (isInitializedModule) {
                        this.semanticInfo.addDiagnostic(
                            new Diagnostic(this.semanticInfo.getPath(), moduleAST.minChar, moduleAST.getLength(), DiagnosticCode.Duplicate_identifier_0, [moduleContainerDecl.getDisplayName()]));
                    }
                    moduleContainerTypeSymbol = null;
                } else if (moduleKind == PullElementKind.DynamicModule) {
                    // Dynamic modules cannot be reopened.
                    this.semanticInfo.addDiagnostic(new Diagnostic(this.semanticInfo.getPath(), moduleAST.minChar, moduleAST.getLength(), DiagnosticCode.Ambient_external_module_declaration_cannot_be_reopened, null));
                } else if (!this.checkThatExportsMatch(moduleContainerDecl, moduleContainerTypeSymbol)) {
                    moduleContainerTypeSymbol = null;
                }
            }

            if (moduleContainerTypeSymbol) {
                moduleInstanceSymbol = moduleContainerTypeSymbol.getInstanceSymbol();
            }
            else {
                moduleContainerTypeSymbol = new PullContainerSymbol(modName, moduleKind);
                createdNewSymbol = true;

                if (!parent) {
                    this.semanticInfoChain.cacheGlobalSymbol(moduleContainerTypeSymbol, searchKind);
                }
            }

            // We add the declaration early so that during any recursive binding of other module decls with the same name, this declaration is present.
            moduleContainerTypeSymbol.addDeclaration(moduleContainerDecl);
            moduleContainerDecl.setSymbol(moduleContainerTypeSymbol);

            this.semanticInfo.setSymbolForAST(moduleAST.name, moduleContainerTypeSymbol);
            this.semanticInfo.setSymbolForAST(moduleAST, moduleContainerTypeSymbol);

            if (!moduleInstanceSymbol && isInitializedModule) {
                // search for a complementary instance symbol first
                var variableSymbol: PullSymbol = null;
                if (parentInstanceSymbol) {
                    if (isExported) {
                        // We search twice because export visibility does not need to agree
                        variableSymbol = parentInstanceSymbol.findMember(modName, false);

                        if (!variableSymbol) {
                            variableSymbol = parentInstanceSymbol.findContainedNonMember(modName);
                        }
                    }
                    else {
                        variableSymbol = parentInstanceSymbol.findContainedNonMember(modName);

                        if (!variableSymbol) {
                            variableSymbol = parentInstanceSymbol.findMember(modName, false);
                        }
                    }

                    if (variableSymbol) {
                        var declarations = variableSymbol.getDeclarations();

                        if (declarations.length) {
                            var variableSymbolParentDecl = declarations[0].getParentDecl();

                            if (parentDecl !== variableSymbolParentDecl) {
                                variableSymbol = null;
                            }
                        }
                    }
                }
                else if (!(moduleContainerDecl.flags & PullElementFlags.Exported)) {
                    // Search locally to this file for a previous declaration that's suitable for augmentation
                    var siblingDecls = parentDecl.getChildDecls();
                    var augmentedDecl: PullDecl = null;

                    for (var i = 0; i < siblingDecls.length; i++) {
                        if (siblingDecls[i] == moduleContainerDecl) {
                            break;
                        }

                        if ((siblingDecls[i].name == modName) && (siblingDecls[i].kind & PullElementKind.SomeValue)) {
                            augmentedDecl = siblingDecls[i];
                            break;
                        }
                    }

                    if (augmentedDecl) {
                        variableSymbol = augmentedDecl.getSymbol();

                        if (variableSymbol) {
                            if (variableSymbol.isContainer()) {
                                variableSymbol = (<PullContainerSymbol>variableSymbol).getInstanceSymbol();
                            }
                            else if (variableSymbol && variableSymbol.isType()) {
                                variableSymbol = (<PullTypeSymbol>variableSymbol).getConstructorMethod();
                            }
                        }
                    }
                }

                // The instance symbol is further set up in bindVariableDeclaration
                if (variableSymbol) {
                    moduleInstanceSymbol = variableSymbol;
                    moduleInstanceTypeSymbol = variableSymbol.type;
                }
                else {
                    moduleInstanceSymbol = new PullSymbol(modName, PullElementKind.Variable);
                }

                moduleContainerTypeSymbol.setInstanceSymbol(moduleInstanceSymbol);

                if (!moduleInstanceTypeSymbol) {
                    moduleInstanceTypeSymbol = new PullTypeSymbol("", PullElementKind.ObjectType);
                    moduleInstanceSymbol.type = moduleInstanceTypeSymbol;
                }

                moduleInstanceTypeSymbol.addDeclaration(moduleContainerDecl);

                if (!moduleInstanceTypeSymbol.getAssociatedContainerType()) {
                    moduleInstanceTypeSymbol.setAssociatedContainerType(moduleContainerTypeSymbol);
                }
            }

            // If we have an enum with more than one declaration, then this enum's first element
            // must have an initializer.
            var moduleDeclarations = moduleContainerTypeSymbol.getDeclarations();

            if (isEnum && moduleDeclarations.length > 1 && moduleAST.members.members.length > 0) {
                var multipleEnums = ArrayUtilities.where(moduleDeclarations, d => d.kind === PullElementKind.Enum).length > 1;
                if (multipleEnums) {
                    var firstVariable = <VariableStatement>moduleAST.members.members[0];
                    var firstVariableDeclarator = <VariableDeclarator>firstVariable.declaration.declarators.members[0];
                    if (!firstVariableDeclarator.init) {
                        this.semanticInfo.addDiagnostic(new Diagnostic(
                            this.semanticInfo.getPath(), firstVariableDeclarator.minChar, firstVariableDeclarator.getLength(), DiagnosticCode.Enums_with_multiple_declarations_must_provide_an_initializer_for_the_first_enum_element, null));
                    }
                }
            }

            if (createdNewSymbol) {
                if (parent) {
                    if (isEnum) {
                        if (moduleContainerDecl.flags & PullElementFlags.Exported) {
                            parent.addEnclosedMemberType(moduleContainerTypeSymbol);
                        }
                        else {
                            parent.addEnclosedNonMemberType(moduleContainerTypeSymbol);
                        }
                    }
                    else {
                        if (moduleContainerDecl.flags & PullElementFlags.Exported) {
                            parent.addEnclosedMemberContainer(moduleContainerTypeSymbol);
                        }
                        else {
                            parent.addEnclosedNonMemberContainer(moduleContainerTypeSymbol);
                        }
                    }
                }
            }

            // if it's an enum, create an index signature and a decl for it
            if (isEnum) {
                this.semanticInfo.addSyntheticIndexSignature(moduleContainerDecl, moduleContainerTypeSymbol.getInstanceSymbol().type, moduleAST.name, "x",
                    /*indexParamType*/ this.semanticInfoChain.numberTypeSymbol, /*returnType*/ this.semanticInfoChain.stringTypeSymbol);
            }

            var valueDecl = moduleContainerDecl.getValueDecl();

            if (valueDecl) {
                valueDecl.ensureSymbolIsBound();
            }

            var otherDecls = this.findDeclsInContext(moduleContainerDecl, moduleContainerDecl.kind, true);

            if (otherDecls && otherDecls.length) {
                for (var i = 0; i < otherDecls.length; i++) {
                    otherDecls[i].ensureSymbolIsBound();
                }
            }
        }

        // aliases
        public bindImportDeclaration(importDeclaration: PullDecl) {
            var declFlags = importDeclaration.flags;
            var declKind = importDeclaration.kind;
            var importDeclAST = <VariableDeclarator>this.semanticInfo.getASTForDecl(importDeclaration);

            var isExported = false;
            var importSymbol: PullTypeAliasSymbol = null;
            var declName = importDeclaration.name;
            var parentHadSymbol = false;
            var parent = this.getParent(importDeclaration);

            importSymbol = <PullTypeAliasSymbol>this.getExistingSymbol(importDeclaration, PullElementKind.SomeContainer, parent);

            if (importSymbol) {
                parentHadSymbol = true;
            }

            if (importSymbol) {
                this.semanticInfo.addDiagnostic(
                    new Diagnostic(this.semanticInfo.getPath(), importDeclAST.minChar, importDeclAST.getLength(), DiagnosticCode.Duplicate_identifier_0, [importDeclaration.getDisplayName()]));
                importSymbol = null;
            }

            if (!importSymbol) {
                importSymbol = new PullTypeAliasSymbol(declName);

                if (!parent) {
                    this.semanticInfoChain.cacheGlobalSymbol(importSymbol, PullElementKind.SomeContainer);
                }
            }

            importSymbol.addDeclaration(importDeclaration);
            importDeclaration.setSymbol(importSymbol);

            this.semanticInfo.setSymbolForAST(importDeclAST, importSymbol);

            if (parent && !parentHadSymbol) {

                if (declFlags & PullElementFlags.Exported) {
                    parent.addEnclosedMemberContainer(importSymbol);
                }
                else {
                    parent.addEnclosedNonMemberContainer(importSymbol);
                }
            }
        }

        // classes
        public bindClassDeclarationToPullSymbol(classDecl: PullDecl) {

            var className = classDecl.name;
            var classSymbol: PullTypeSymbol = null;

            var constructorSymbol: PullSymbol = null;
            var constructorTypeSymbol: PullTypeSymbol = null;

            var classAST = <ClassDeclaration>this.semanticInfo.getASTForDecl(classDecl);

            var parent = this.getParent(classDecl);
            var parentDecl = classDecl.getParentDecl();
            var isExported = classDecl.flags & PullElementFlags.Exported;
            var isGeneric = false;

            classSymbol = <PullTypeSymbol>this.getExistingSymbol(classDecl, PullElementKind.SomeType, parent);

            // Only error if it is an interface (for classes and enums we will error when we bind the implicit variable)
            if (classSymbol && classSymbol.kind === PullElementKind.Interface) {
                this.semanticInfo.addDiagnostic(
                    new Diagnostic(this.semanticInfo.getPath(), classAST.minChar, classAST.getLength(), DiagnosticCode.Duplicate_identifier_0, [classDecl.getDisplayName()]));
                classSymbol = null;
            }

            var decls: PullDecl[];

            classSymbol = new PullTypeSymbol(className, PullElementKind.Class);

            if (!parent) {
                this.semanticInfoChain.cacheGlobalSymbol(classSymbol, PullElementKind.Class);
            }

            classSymbol.addDeclaration(classDecl);

            classDecl.setSymbol(classSymbol);

            this.semanticInfo.setSymbolForAST(classAST.name, classSymbol);
            this.semanticInfo.setSymbolForAST(classAST, classSymbol);

            if (parent) {
                if (classDecl.flags & PullElementFlags.Exported) {
                    parent.addEnclosedMemberType(classSymbol);
                }
                else {
                    parent.addEnclosedNonMemberType(classSymbol);
                }
            }

            this.resetTypeParameterCache();

            constructorSymbol = classSymbol.getConstructorMethod();
            constructorTypeSymbol = constructorSymbol ? constructorSymbol.type : null;

            if (!constructorSymbol) {
                // First, try to find a sibling value decl that is already bound. If there is one, reuse it.
                var siblingValueDecls: PullDecl[] = null;
                if (parentDecl) {
                    siblingValueDecls = parentDecl.searchChildDecls(className, PullElementKind.SomeValue);
                    // The first decl should have the right symbol
                    if (siblingValueDecls && siblingValueDecls[0] && siblingValueDecls[0].hasSymbol()) {
                        constructorSymbol = siblingValueDecls[0].getSymbol();
                    }
                }

                constructorSymbol = constructorSymbol || new PullSymbol(className, PullElementKind.ConstructorMethod);
                constructorTypeSymbol = constructorSymbol.type || new PullTypeSymbol("", PullElementKind.ConstructorType);

                constructorSymbol.setIsSynthesized();

                constructorSymbol.type = constructorTypeSymbol;
                classSymbol.setConstructorMethod(constructorSymbol);

                classSymbol.setHasDefaultConstructor();
            }

            if (constructorSymbol.getIsSynthesized()) {
                constructorSymbol.addDeclaration(classDecl.getValueDecl());
                constructorTypeSymbol.addDeclaration(classDecl);
            }
            else {
                classSymbol.setHasDefaultConstructor(false);
            }

            constructorTypeSymbol.setAssociatedContainerType(classSymbol);

            var typeParameters = classDecl.getTypeParameters();
            var typeParameter: PullTypeParameterSymbol;

            // PULLREVIEW: Now that we clean type parameters, searching is redundant
            for (var i = 0; i < typeParameters.length; i++) {

                typeParameter = classSymbol.findTypeParameter(typeParameters[i].name);

                if (!typeParameter) {
                    typeParameter = new PullTypeParameterSymbol(typeParameters[i].name, false);

                    classSymbol.addTypeParameter(typeParameter);
                    constructorTypeSymbol.addConstructorTypeParameter(typeParameter);
                    typeParameter.addDeclaration(typeParameters[i]);
                    typeParameters[i].setSymbol(typeParameter);
                }
                else {
                    var typeParameterAST = this.semanticInfoChain.getASTForDecl(typeParameter.getDeclarations()[0]);
                    this.semanticInfo.addDiagnostic(
                        new Diagnostic(this.semanticInfo.getPath(), typeParameterAST.minChar, typeParameterAST.getLength(), DiagnosticCode.Duplicate_identifier_0, [typeParameter.getName()]));
                }
            }

            var valueDecl = classDecl.getValueDecl();

            if (valueDecl) {
                valueDecl.ensureSymbolIsBound();
            }
        }

        // interfaces
        public bindInterfaceDeclarationToPullSymbol(interfaceDecl: PullDecl) {

            // 1. Test for existing decl - if it exists, use its symbol
            // 2. If no other decl exists, create a new symbol and use that one
            var interfaceName = interfaceDecl.name;
            var interfaceSymbol: PullTypeSymbol = null;

            var interfaceAST = <InterfaceDeclaration>this.semanticInfo.getASTForDecl(interfaceDecl);
            var createdNewSymbol = false;
            var parent = this.getParent(interfaceDecl);

            // We're not yet ready to support interfaces augmenting classes (or vice versa)
            var acceptableSharedKind = PullElementKind.Interface; // | PullElementKind.Class | PullElementKind.Enum;

            interfaceSymbol = <PullTypeSymbol>this.getExistingSymbol(interfaceDecl, PullElementKind.SomeType, parent);

            if (interfaceSymbol) {
                if (!(interfaceSymbol.kind & acceptableSharedKind)) {
                    this.semanticInfo.addDiagnostic(
                        new Diagnostic(this.semanticInfo.getPath(), interfaceAST.minChar, interfaceAST.getLength(), DiagnosticCode.Duplicate_identifier_0, [interfaceDecl.getDisplayName()]));
                    interfaceSymbol = null;
                }
                else if (!this.checkThatExportsMatch(interfaceDecl, interfaceSymbol)) {
                    interfaceSymbol = null;
                }
            }

            if (!interfaceSymbol) {
                interfaceSymbol = new PullTypeSymbol(interfaceName, PullElementKind.Interface);
                createdNewSymbol = true;

                if (!parent) {
                    this.semanticInfoChain.cacheGlobalSymbol(interfaceSymbol, acceptableSharedKind);
                }
            }

            interfaceSymbol.addDeclaration(interfaceDecl);
            interfaceDecl.setSymbol(interfaceSymbol);

            if (createdNewSymbol) {

                if (parent) {
                    if (interfaceDecl.flags & PullElementFlags.Exported) {
                        parent.addEnclosedMemberType(interfaceSymbol);
                    }
                    else {
                        parent.addEnclosedNonMemberType(interfaceSymbol);
                    }
                }
            }

            this.resetTypeParameterCache();

            var typeParameters = interfaceDecl.getTypeParameters();
            var typeParameter: PullTypeParameterSymbol;
            var typeParameterDecls: PullDecl[] = null;

            // PULLREVIEW: Now that we clean type parameters, searching is redundant
            for (var i = 0; i < typeParameters.length; i++) {

                typeParameter = interfaceSymbol.findTypeParameter(typeParameters[i].name);

                if (!typeParameter) {
                    typeParameter = new PullTypeParameterSymbol(typeParameters[i].name, false);

                    interfaceSymbol.addTypeParameter(typeParameter);
                }
                else {
                    typeParameterDecls = typeParameter.getDeclarations();

                    // Because interface declarations can be "split", it's safe to re-use type parameters
                    // of the same name across interface declarations in the same binding phase
                    for (var j = 0; j < typeParameterDecls.length; j++) {
                        var typeParameterDeclParent = typeParameterDecls[j].getParentDecl();

                        if (typeParameterDeclParent && typeParameterDeclParent === interfaceDecl) {
                            var typeParameterAST = this.semanticInfoChain.getASTForDecl(typeParameterDecls[0]);
                            this.semanticInfo.addDiagnostic(
                                new Diagnostic(this.semanticInfo.getPath(), typeParameterAST.minChar, typeParameterAST.getLength(), DiagnosticCode.Duplicate_identifier_0, [typeParameter.getName()]));

                            break;
                        }
                    }
                }

                typeParameter.addDeclaration(typeParameters[i]);
                typeParameters[i].setSymbol(typeParameter);
            }

            var otherDecls = this.findDeclsInContext(interfaceDecl, interfaceDecl.kind, true);

            if (otherDecls && otherDecls.length) {
                for (var i = 0; i < otherDecls.length; i++) {
                    otherDecls[i].ensureSymbolIsBound();
                }
            }
        }

        public bindObjectTypeDeclarationToPullSymbol(objectDecl: PullDecl) {
            var objectSymbolAST: AST = this.semanticInfo.getASTForDecl(objectDecl);

            var objectSymbol = new PullTypeSymbol("", PullElementKind.ObjectType);

            objectSymbol.addDeclaration(objectDecl);
            objectDecl.setSymbol(objectSymbol);

            this.semanticInfo.setSymbolForAST(objectSymbolAST, objectSymbol);

            var childDecls = objectDecl.getChildDecls();

            for (var i = 0; i < childDecls.length; i++) {
                this.bindDeclToPullSymbol(childDecls[i]);
            }

            var typeParameters = objectDecl.getTypeParameters();
            var typeParameter: PullTypeParameterSymbol;

            for (var i = 0; i < typeParameters.length; i++) {

                typeParameter = objectSymbol.findTypeParameter(typeParameters[i].name);

                if (!typeParameter) {
                    typeParameter = new PullTypeParameterSymbol(typeParameters[i].name, false);

                    objectSymbol.addTypeParameter(typeParameter);
                }
                else {
                    var typeParameterAST = this.semanticInfoChain.getASTForDecl(typeParameter.getDeclarations()[0]);
                    this.semanticInfo.addDiagnostic(
                        new Diagnostic(this.semanticInfo.getPath(), typeParameterAST.minChar, typeParameterAST.getLength(), DiagnosticCode.Duplicate_identifier_0, [typeParameter.name]));
                }

                typeParameter.addDeclaration(typeParameters[i]);
                typeParameters[i].setSymbol(typeParameter);
            }

        }

        public bindConstructorTypeDeclarationToPullSymbol(constructorTypeDeclaration: PullDecl) {
            var declKind = constructorTypeDeclaration.kind;
            var declFlags = constructorTypeDeclaration.flags;
            var constructorTypeAST = this.semanticInfo.getASTForDecl(constructorTypeDeclaration);

            var constructorTypeSymbol = new PullTypeSymbol("", PullElementKind.ConstructorType);

            constructorTypeDeclaration.setSymbol(constructorTypeSymbol);
            constructorTypeSymbol.addDeclaration(constructorTypeDeclaration);
            this.semanticInfo.setSymbolForAST(constructorTypeAST, constructorTypeSymbol);

            var signature = new PullSignatureSymbol(PullElementKind.ConstructSignature);

            if (lastParameterIsRest((<FunctionDeclaration>constructorTypeAST).parameters)) {
                signature.hasVarArgs = true;
            }

            signature.addDeclaration(constructorTypeDeclaration);
            constructorTypeDeclaration.setSignatureSymbol(signature);

            this.bindParameterSymbols(<FunctionDeclaration>this.semanticInfo.getASTForDecl(constructorTypeDeclaration), constructorTypeSymbol, signature);

            // add the implicit construct member for this function type
            constructorTypeSymbol.addConstructSignature(signature);

            var typeParameters = constructorTypeDeclaration.getTypeParameters();
            var typeParameter: PullTypeParameterSymbol;

            for (var i = 0; i < typeParameters.length; i++) {

                typeParameter = constructorTypeSymbol.findTypeParameter(typeParameters[i].name);

                if (!typeParameter) {
                    typeParameter = new PullTypeParameterSymbol(typeParameters[i].name, false);

                    constructorTypeSymbol.addConstructorTypeParameter(typeParameter);
                }
                else {
                    var typeParameterAST = this.semanticInfoChain.getASTForDecl(typeParameter.getDeclarations()[0]);
                    this.semanticInfo.addDiagnostic(
                        new Diagnostic(this.semanticInfo.getPath(), typeParameterAST.minChar, typeParameterAST.getLength(), DiagnosticCode.Duplicate_identifier_0, [typeParameter.name]));
                }

                typeParameter.addDeclaration(typeParameters[i]);
                typeParameters[i].setSymbol(typeParameter);
            }
        }

        // variables
        public bindVariableDeclarationToPullSymbol(variableDeclaration: PullDecl) {
            var declFlags = variableDeclaration.flags;
            var declKind = variableDeclaration.kind;
            var varDeclAST = <VariableDeclarator>this.semanticInfo.getASTForDecl(variableDeclaration);

            var isExported = (declFlags & PullElementFlags.Exported) !== 0;

            var variableSymbol: PullSymbol = null;

            var declName = variableDeclaration.name;

            var parentHadSymbol = false;

            var parent = this.getParent(variableDeclaration, true);

            var parentDecl = variableDeclaration.getParentDecl();

            var isImplicit = (declFlags & PullElementFlags.ImplicitVariable) !== 0;
            var isModuleValue = (declFlags & (PullElementFlags.InitializedModule)) != 0;
            var isEnumValue = (declFlags & PullElementFlags.InitializedEnum) != 0;
            var isClassConstructorVariable = (declFlags & PullElementFlags.ClassConstructorVariable) != 0;

            if (parentDecl && !isImplicit) {
                parentDecl.addVariableDeclToGroup(variableDeclaration);
            }

            variableSymbol = this.getExistingSymbol(variableDeclaration, PullElementKind.SomeValue, parent);

            if (variableSymbol && !variableSymbol.isType()) {
                parentHadSymbol = true;
            }

            var span: TextSpan;
            var decl: PullDecl;
            var decls: PullDecl[];
            var ast: AST;
            var members: PullSymbol[];

            if (variableSymbol) {

                var prevKind = variableSymbol.kind;
                var prevIsAmbient = variableSymbol.hasFlag(PullElementFlags.Ambient);
                var prevIsEnum = variableSymbol.hasFlag(PullElementFlags.InitializedEnum);
                var prevIsClassConstructorVariable = variableSymbol.hasFlag(PullElementFlags.ClassConstructorVariable);
                var prevIsModuleValue = variableSymbol.hasFlag(PullElementFlags.InitializedModule);
                var prevIsImplicit = variableSymbol.hasFlag(PullElementFlags.ImplicitVariable);
                var prevIsFunction = prevKind == PullElementKind.Function;
                var isAmbient = (variableDeclaration.flags & PullElementFlags.Ambient) != 0;
                var prevDecl = variableSymbol.getDeclarations()[0];
                var prevParentDecl = prevDecl.getParentDecl();
                var bothAreGlobal = parentDecl && (parentDecl.kind == PullElementKind.Script) && (prevParentDecl.kind == PullElementKind.Script);
                var shareParent = bothAreGlobal || prevDecl.getParentDecl() == variableDeclaration.getParentDecl();
                var prevIsParam = shareParent && prevKind == PullElementKind.Parameter && declKind == PullElementKind.Variable;

                var acceptableRedeclaration = prevIsParam ||
                    (isImplicit &&
                    ((!isEnumValue && !isClassConstructorVariable && prevIsFunction) || // Enums can't mix with functions
                    ((isModuleValue || isEnumValue) && (prevIsModuleValue || prevIsEnum)) || // modules and enums can mix freely
                    (isClassConstructorVariable && prevIsModuleValue && isAmbient) || // an ambient class can be declared after a module
                    (isModuleValue && prevIsClassConstructorVariable))); // the module variable can come after the class constructor variable

                // if the previous declaration is a non-ambient class, it must be located in the same file as this declaration
                if (acceptableRedeclaration && (prevIsClassConstructorVariable || prevIsFunction) && !prevIsAmbient) {
                    if (prevDecl.getScriptName() != variableDeclaration.getScriptName()) {
                        span = variableDeclaration.getSpan();
                        this.semanticInfo.addDiagnostic(new Diagnostic(this.semanticInfo.getPath(), span.start(), span.length(),
                            DiagnosticCode.Module_0_cannot_merge_with_previous_declaration_of_1_in_a_different_file_2, [declName, declName, prevDecl.getScriptName()]));
                        variableSymbol.type = new PullErrorTypeSymbol(this.semanticInfoChain.anyTypeSymbol, declName);
                    }
                }

                if (!acceptableRedeclaration || prevIsParam) {
                    // If neither of them are implicit (both explicitly declared as vars), we won't error now. We'll check that the types match during type check.
                    // However, we will error when a variable clobbers a function, or when the two explicit var declarations are not in the same parent declaration
                    if (!prevIsParam && (isImplicit || prevIsImplicit || (prevKind & PullElementKind.SomeFunction) !== 0) || !shareParent) {
                        span = variableDeclaration.getSpan();
                        var diagnostic = new Diagnostic(this.semanticInfo.getPath(), span.start(), span.length(), DiagnosticCode.Duplicate_identifier_0, [variableDeclaration.getDisplayName()]);
                        this.semanticInfo.addDiagnostic(diagnostic);
                        variableSymbol.type = new PullErrorTypeSymbol(this.semanticInfoChain.anyTypeSymbol, declName);
                    }
                    else { // double var declaration (keep them separate so we can verify type sameness during type check)
                        this.checkThatExportsMatch(variableDeclaration, variableSymbol);
                        variableSymbol = null;
                        parentHadSymbol = false;
                    }
                }

                // If we haven't given an error so far and we merged two decls, check that the exports match
                // Only report the error if they are not both initialized modules (if they are, the bind module code would report the error)
                if (variableSymbol &&
                    !(variableSymbol.type && variableSymbol.type.isError()) &&
                    !this.checkThatExportsMatch(variableDeclaration, variableSymbol, !(isModuleValue && prevIsModuleValue))) {
                    variableSymbol.type = new PullErrorTypeSymbol(this.semanticInfoChain.anyTypeSymbol, declName);
                }
            }

            if ((declFlags & PullElementFlags.ImplicitVariable) === 0) {
                if (!variableSymbol) {
                    variableSymbol = new PullSymbol(declName, declKind);
                    if (!parent) {
                        this.semanticInfoChain.cacheGlobalSymbol(variableSymbol, declKind);
                    }
                }

                variableSymbol.addDeclaration(variableDeclaration);
                variableDeclaration.setSymbol(variableSymbol);

                this.semanticInfo.setSymbolForAST(varDeclAST.id, variableSymbol);
                this.semanticInfo.setSymbolForAST(varDeclAST, variableSymbol);
            }
            else if (!parentHadSymbol) {

                if (isClassConstructorVariable) {
                    // it's really an implicit class decl, so we need to set the type of the symbol to
                    // the constructor type
                    // Note that we would have already found the class symbol in the search above
                    var classTypeSymbol: PullTypeSymbol = <PullTypeSymbol>variableSymbol;

                    // PULLTODO: In both this case and the case below, we should have already received the
                    // class or module symbol as the variableSymbol found above
                    if (parent) {
                        members = parent.getMembers();

                        for (var i = 0; i < members.length; i++) {
                            if ((members[i].name === declName) && (members[i].kind === PullElementKind.Class)) {
                                classTypeSymbol = <PullTypeSymbol>members[i];
                                break;
                            }
                        }
                    }

                    if (!classTypeSymbol) {
                        var parentDecl = variableDeclaration.getParentDecl();

                        if (parentDecl) {
                            var childDecls = parentDecl.searchChildDecls(declName, PullElementKind.SomeType);

                            if (childDecls.length) {

                                for (var i = 0; i < childDecls.length; i++) {
                                    if (childDecls[i].getValueDecl() === variableDeclaration) {
                                        classTypeSymbol = <PullTypeSymbol>childDecls[i].getSymbol();
                                    }
                                }
                            }
                        }

                        if (!classTypeSymbol) {
                            classTypeSymbol = <PullTypeSymbol>this.semanticInfoChain.findTopLevelSymbol(declName, PullElementKind.SomeType, this.semanticInfo.getPath());
                        }
                    }

                    if (classTypeSymbol && (classTypeSymbol.kind !== PullElementKind.Class)) {
                        classTypeSymbol = null;
                    }

                    if (classTypeSymbol && classTypeSymbol.isClass()) { // protect against duplicate declarations
                        //replaceProperty = variableSymbol && variableSymbol.getIsSynthesized();

                        //if (replaceProperty) {
                        //    previousProperty = variableSymbol;
                        //}

                        variableSymbol = classTypeSymbol.getConstructorMethod();
                        variableDeclaration.setSymbol(variableSymbol);

                        // set the AST to the constructor method's if possible
                        decls = classTypeSymbol.getDeclarations();

                        if (decls.length) {

                            decl = decls[decls.length - 1];
                            ast = this.semanticInfo.getASTForDecl(decl);

                            if (ast) {
                                this.semanticInfo.setASTForDecl(variableDeclaration, ast);
                            }
                        }
                    }
                    else {
                        // PULLTODO: Clodules/Interfaces on classes
                        if (!variableSymbol) {
                            variableSymbol = new PullSymbol(declName, declKind);
                        }

                        variableSymbol.addDeclaration(variableDeclaration);
                        variableDeclaration.setSymbol(variableSymbol);

                        variableSymbol.type = this.semanticInfoChain.anyTypeSymbol;
                    }
                }
                else if (declFlags & PullElementFlags.SomeInitializedModule) {
                    var moduleContainerTypeSymbol: PullContainerSymbol = null;
                    var moduleParent = this.getParent(variableDeclaration);

                    if (moduleParent) {
                        members = moduleParent.getMembers();

                        for (var i = 0; i < members.length; i++) {
                            if ((members[i].name === declName) && (members[i].isContainer())) {
                                moduleContainerTypeSymbol = <PullContainerSymbol>members[i];
                                break;
                            }
                        }
                    }

                    if (!moduleContainerTypeSymbol) {
                        var parentDecl = variableDeclaration.getParentDecl();

                        if (parentDecl) {
                            var searchKind = (declFlags & (PullElementFlags.InitializedModule | PullElementFlags.InitializedDynamicModule)) ? PullElementKind.SomeContainer : PullElementKind.Enum;
                            var childDecls = parentDecl.searchChildDecls(declName, searchKind);

                            if (childDecls.length) {

                                for (var i = 0; i < childDecls.length; i++) {
                                    if (childDecls[i].getValueDecl() === variableDeclaration) {
                                        moduleContainerTypeSymbol = <PullContainerSymbol>childDecls[i].getSymbol();
                                    }
                                }
                            }
                        }
                        if (!moduleContainerTypeSymbol) {
                            moduleContainerTypeSymbol = <PullContainerSymbol>this.semanticInfoChain.findTopLevelSymbol(declName, PullElementKind.SomeContainer, this.semanticInfo.getPath());

                            if (!moduleContainerTypeSymbol) {
                                moduleContainerTypeSymbol = <PullContainerSymbol>this.semanticInfoChain.findTopLevelSymbol(declName, PullElementKind.Enum, this.semanticInfo.getPath());
                            }
                        }
                    }

                    if (moduleContainerTypeSymbol && (!moduleContainerTypeSymbol.isContainer())) {
                        moduleContainerTypeSymbol = null;
                    }

                    if (moduleContainerTypeSymbol) {
                        variableSymbol = moduleContainerTypeSymbol.getInstanceSymbol();

                        variableSymbol.addDeclaration(variableDeclaration);
                        variableDeclaration.setSymbol(variableSymbol);

                        // set the AST to the constructor method's if possible
                        decls = moduleContainerTypeSymbol.getDeclarations();

                        if (decls.length) {

                            decl = decls[decls.length - 1];
                            ast = this.semanticInfo.getASTForDecl(decl);

                            if (ast) {
                                this.semanticInfo.setASTForDecl(variableDeclaration, ast);
                            }
                        }

                        // we added the variable to the parent when binding the module
                        //parentHadSymbol = true;
                    }
                    else {
                        Debug.assert(false, "Attempted to bind invalid implicit variable symbol");
                    }
                }
            }
            else {
                variableSymbol.addDeclaration(variableDeclaration);
                variableDeclaration.setSymbol(variableSymbol);
            }

            if (parent && !parentHadSymbol) {

                if (declFlags & PullElementFlags.Exported) {
                    parent.addMember(variableSymbol);
                }
                else {
                    parent.addEnclosedNonMember(variableSymbol);
                }
            }

            var otherDecls = this.findDeclsInContext(variableDeclaration, variableDeclaration.kind, /*searchGlobally*/ false);

            if (otherDecls && otherDecls.length) {
                for (var i = 0; i < otherDecls.length; i++) {
                    otherDecls[i].ensureSymbolIsBound();
                }
            }
        }

        // properties
        public bindPropertyDeclarationToPullSymbol(propertyDeclaration: PullDecl) {
            var declFlags = propertyDeclaration.flags;
            var declKind = propertyDeclaration.kind;
            var propDeclAST = <VariableDeclarator>this.semanticInfo.getASTForDecl(propertyDeclaration);

            var isStatic = false;
            var isOptional = false;

            var propertySymbol: PullSymbol = null;

            if (hasFlag(declFlags, PullElementFlags.Static)) {
                isStatic = true;
            }

            if (hasFlag(declFlags, PullElementFlags.Optional)) {
                isOptional = true;
            }

            var declName = propertyDeclaration.name;

            var parentHadSymbol = false;

            var parent = this.getParent(propertyDeclaration, true);

            if (parent.isClass() && isStatic) {
                parent = parent.getConstructorMethod().type;           
            }

            propertySymbol = parent.findMember(declName, false);

            if (propertySymbol) {

                var span = propertyDeclaration.getSpan();

                this.semanticInfo.addDiagnostic(
                    new Diagnostic(this.semanticInfo.getPath(), span.start(), span.length(), DiagnosticCode.Duplicate_identifier_0, [propertyDeclaration.getDisplayName()]));
            }

            if (propertySymbol) {
                parentHadSymbol = true;
            }

            var classTypeSymbol: PullTypeSymbol;

            if (!parentHadSymbol) {
                propertySymbol = new PullSymbol(declName, declKind);
            }

            propertySymbol.addDeclaration(propertyDeclaration);
            propertyDeclaration.setSymbol(propertySymbol);

            this.semanticInfo.setSymbolForAST(propDeclAST.id, propertySymbol);
            this.semanticInfo.setSymbolForAST(propDeclAST, propertySymbol);

            if (isOptional) {
                propertySymbol.isOptional = true;
            }

            if (parent && !parentHadSymbol) {
                parent.addMember(propertySymbol);
            }
        }

        // parameters
        public bindParameterSymbols(functionDeclaration: FunctionDeclaration, funcType: PullTypeSymbol, signatureSymbol: PullSignatureSymbol) {
            // create a symbol for each ast
            // if it's a property, add the symbol to the enclosing type's member list
            var parameters: PullSymbol[] = [];
            var decl: PullDecl = null;
            var argDecl: Parameter = null;
            var parameterSymbol: PullSymbol = null;
            var isProperty = false;
            var params = new BlockIntrinsics<boolean>();
            var funcDecl = this.semanticInfo.getDeclForAST(functionDeclaration);

            if (functionDeclaration.parameters) {

                for (var i = 0; i < functionDeclaration.parameters.members.length; i++) {
                    argDecl = <Parameter>functionDeclaration.parameters.members[i];
                    decl = this.semanticInfo.getDeclForAST(argDecl);
                    isProperty = hasFlag(argDecl.getVarFlags(), VariableFlags.Property);
                    parameterSymbol = new PullSymbol(argDecl.id.text(), PullElementKind.Parameter);

                    if (argDecl.isRest) {
                        parameterSymbol.isVarArg = true;
                    }

                    if (decl.flags & PullElementFlags.Optional) {
                        parameterSymbol.isOptional = true;
                    }

                    if (params[argDecl.id.text()]) {
                        this.semanticInfo.addDiagnostic(
                            new Diagnostic(this.semanticInfo.getPath(), argDecl.minChar, argDecl.getLength(), DiagnosticCode.Duplicate_identifier_0, [argDecl.id.actualText]));
                    }
                    else {
                        params[argDecl.id.text()] = true;
                    }
                    if (decl) {

                        if (isProperty) {
                            decl.ensureSymbolIsBound();
                            var valDecl = decl.getValueDecl();

                            // if this is a parameter property, we still need to set the value decl
                            // for the function parameter
                            if (valDecl) {
                                valDecl.setSymbol(parameterSymbol);
                                parameterSymbol.addDeclaration(valDecl);
                            }
                        }
                        else {
                            parameterSymbol.addDeclaration(decl);
                            decl.setSymbol(parameterSymbol);
                        }

                        if (funcDecl) {
                            funcDecl.addVariableDeclToGroup(decl);
                        }
                    }

                    signatureSymbol.addParameter(parameterSymbol, parameterSymbol.isOptional);

                    if (signatureSymbol.isDefinition()) {
                        funcType.addEnclosedNonMember(parameterSymbol);
                    }
                }
            }
        }

        // function declarations
        public bindFunctionDeclarationToPullSymbol(functionDeclaration: PullDecl) {
            var declKind = functionDeclaration.kind;
            var declFlags = functionDeclaration.flags;
            var funcDeclAST = <FunctionDeclaration>this.semanticInfo.getASTForDecl(functionDeclaration);

            var isExported = (declFlags & PullElementFlags.Exported) !== 0;

            var funcName = functionDeclaration.name;

            // 1. Test for existing decl - if it exists, use its symbol
            // 2. If no other decl exists, create a new symbol and use that one

            var isSignature: boolean = (declFlags & PullElementFlags.Signature) !== 0;

            var parent = this.getParent(functionDeclaration, true);
            var parentDecl = functionDeclaration.getParentDecl();
            var parentHadSymbol = false;

            // PULLREVIEW: On a re-bind, there's no need to search far-and-wide: just look in the parent's member list
            var functionSymbol: PullSymbol = null;
            var functionTypeSymbol: PullTypeSymbol = null;

            functionSymbol = this.getExistingSymbol(functionDeclaration, PullElementKind.SomeValue, parent);

            if (functionSymbol) {
                // Duplicate is acceptable if it is another signature (not a duplicate implementation), or an ambient fundule
                var isAmbient = functionDeclaration.flags & PullElementFlags.Ambient;
                var acceptableRedeclaration = functionSymbol.kind === PullElementKind.Function && (isSignature || functionSymbol.allDeclsHaveFlag(PullElementFlags.Signature)) ||
                    functionSymbol.hasFlag(PullElementFlags.InitializedModule) && isAmbient;
                if (!acceptableRedeclaration) {
                    this.semanticInfo.addDiagnostic(
                        new Diagnostic(this.semanticInfo.getPath(), funcDeclAST.minChar, funcDeclAST.getLength(), DiagnosticCode.Duplicate_identifier_0, [functionDeclaration.getDisplayName()]));
                    functionSymbol.type = new PullErrorTypeSymbol(this.semanticInfoChain.anyTypeSymbol, funcName);
                }
            }

            if (functionSymbol) {
                functionTypeSymbol = functionSymbol.type;
                parentHadSymbol = true;
            }

            if (!functionSymbol) {
                // PULLTODO: Make sure that we properly flag signature decl types when collecting decls
                functionSymbol = new PullSymbol(funcName, PullElementKind.Function);
            }

            if (!functionTypeSymbol) {
                functionTypeSymbol = new PullTypeSymbol("", PullElementKind.FunctionType);
                functionSymbol.type = functionTypeSymbol;
                functionTypeSymbol.setFunctionSymbol(functionSymbol);
            }

            functionDeclaration.setSymbol(functionSymbol);
            functionSymbol.addDeclaration(functionDeclaration);
            functionTypeSymbol.addDeclaration(functionDeclaration);

            this.semanticInfo.setSymbolForAST(funcDeclAST.name, functionSymbol);
            this.semanticInfo.setSymbolForAST(funcDeclAST, functionSymbol);

            if (parent && !parentHadSymbol) {
                if (isExported) {
                    parent.addMember(functionSymbol);
                }
                else {
                    parent.addEnclosedNonMember(functionSymbol);
                }
            }

            var signature = isSignature ? new PullSignatureSymbol(PullElementKind.CallSignature) : new PullDefinitionSignatureSymbol(PullElementKind.CallSignature);

            signature.addDeclaration(functionDeclaration);
            functionDeclaration.setSignatureSymbol(signature);

            if (lastParameterIsRest(funcDeclAST.parameters)) {
                signature.hasVarArgs = true;
            }

            this.bindParameterSymbols(<FunctionDeclaration>this.semanticInfo.getASTForDecl(functionDeclaration), functionTypeSymbol, signature);

            var typeParameters = functionDeclaration.getTypeParameters();
            var typeParameter: PullTypeParameterSymbol;

            for (var i = 0; i < typeParameters.length; i++) {

                typeParameter = signature.findTypeParameter(typeParameters[i].name);

                if (!typeParameter) {
                    typeParameter = new PullTypeParameterSymbol(typeParameters[i].name, true);

                    signature.addTypeParameter(typeParameter);
                }
                else {
                    var typeParameterAST = this.semanticInfoChain.getASTForDecl(typeParameter.getDeclarations()[0]);
                    this.semanticInfo.addDiagnostic(
                        new Diagnostic(this.semanticInfo.getPath(), typeParameterAST.minChar, typeParameterAST.getLength(), DiagnosticCode.Duplicate_identifier_0, [typeParameter.name]));
                }

                typeParameter.addDeclaration(typeParameters[i]);
                typeParameters[i].setSymbol(typeParameter);
            }

            // add the implicit call member for this function type
            functionTypeSymbol.addCallSignature(signature);

            var otherDecls = this.findDeclsInContext(functionDeclaration, functionDeclaration.kind, false);

            if (otherDecls && otherDecls.length) {
                for (var i = 0; i < otherDecls.length; i++) {
                    otherDecls[i].ensureSymbolIsBound();
                }
            }
        }

        public bindFunctionExpressionToPullSymbol(functionExpressionDeclaration: PullDecl) {
            var declKind = functionExpressionDeclaration.kind;
            var declFlags = functionExpressionDeclaration.flags;
            var funcExpAST = <FunctionDeclaration>this.semanticInfo.getASTForDecl(functionExpressionDeclaration);

            // 1. Test for existing decl - if it exists, use its symbol
            // 2. If no other decl exists, create a new symbol and use that one

            var functionName = declKind == PullElementKind.FunctionExpression ?
                (<PullFunctionExpressionDecl>functionExpressionDeclaration).getFunctionExpressionName() :
                functionExpressionDeclaration.name;
            var functionSymbol: PullSymbol = new PullSymbol(functionName, PullElementKind.Function);
            var functionTypeSymbol = new PullTypeSymbol("", PullElementKind.FunctionType);
            functionTypeSymbol.setFunctionSymbol(functionSymbol);

            functionSymbol.type = functionTypeSymbol;

            functionExpressionDeclaration.setSymbol(functionSymbol);
            functionSymbol.addDeclaration(functionExpressionDeclaration);
            functionTypeSymbol.addDeclaration(functionExpressionDeclaration);

            if (funcExpAST.name) {
                this.semanticInfo.setSymbolForAST(funcExpAST.name, functionSymbol);
            }
            this.semanticInfo.setSymbolForAST(funcExpAST, functionSymbol);

            var signature = new PullDefinitionSignatureSymbol(PullElementKind.CallSignature);

            if (lastParameterIsRest(funcExpAST.parameters)) {
                signature.hasVarArgs = true;
            }

            var typeParameters = functionExpressionDeclaration.getTypeParameters();
            var typeParameter: PullTypeParameterSymbol;

            for (var i = 0; i < typeParameters.length; i++) {

                typeParameter = signature.findTypeParameter(typeParameters[i].name);

                if (!typeParameter) {
                    typeParameter = new PullTypeParameterSymbol(typeParameters[i].name, true);

                    signature.addTypeParameter(typeParameter);
                }
                else {
                    var typeParameterAST = this.semanticInfoChain.getASTForDecl(typeParameter.getDeclarations()[0]);
                    this.semanticInfo.addDiagnostic(
                        new Diagnostic(this.semanticInfo.getPath(), typeParameterAST.minChar, typeParameterAST.getLength(), DiagnosticCode.Duplicate_identifier_0, [typeParameter.getName()]));
                }

                typeParameter.addDeclaration(typeParameters[i]);
                typeParameters[i].setSymbol(typeParameter);
            }

            signature.addDeclaration(functionExpressionDeclaration);
            functionExpressionDeclaration.setSignatureSymbol(signature);

            this.bindParameterSymbols(<FunctionDeclaration>this.semanticInfo.getASTForDecl(functionExpressionDeclaration), functionTypeSymbol, signature);

            // add the implicit call member for this function type
            functionTypeSymbol.addCallSignature(signature);
        }

        public bindFunctionTypeDeclarationToPullSymbol(functionTypeDeclaration: PullDecl) {
            var declKind = functionTypeDeclaration.kind;
            var declFlags = functionTypeDeclaration.flags;
            var funcTypeAST = <FunctionDeclaration>this.semanticInfo.getASTForDecl(functionTypeDeclaration);

            // 1. Test for existing decl - if it exists, use its symbol
            // 2. If no other decl exists, create a new symbol and use that one

            var functionTypeSymbol = new PullTypeSymbol("", PullElementKind.FunctionType);

            functionTypeDeclaration.setSymbol(functionTypeSymbol);
            functionTypeSymbol.addDeclaration(functionTypeDeclaration);
            this.semanticInfo.setSymbolForAST(funcTypeAST, functionTypeSymbol);

            var isSignature: boolean = (declFlags & PullElementFlags.Signature) !== 0;
            var signature = isSignature ? new PullSignatureSymbol(PullElementKind.CallSignature) : new PullDefinitionSignatureSymbol(PullElementKind.CallSignature);

            if (lastParameterIsRest(funcTypeAST.parameters)) {
                signature.hasVarArgs = true;
            }

            var typeParameters = functionTypeDeclaration.getTypeParameters();
            var typeParameter: PullTypeParameterSymbol;

            for (var i = 0; i < typeParameters.length; i++) {

                typeParameter = signature.findTypeParameter(typeParameters[i].name);

                if (!typeParameter) {
                    typeParameter = new PullTypeParameterSymbol(typeParameters[i].name, true);

                    signature.addTypeParameter(typeParameter);
                }
                else {
                    var typeParameterAST = this.semanticInfoChain.getASTForDecl(typeParameter.getDeclarations()[0]);
                    this.semanticInfo.addDiagnostic(
                        new Diagnostic(this.semanticInfo.getPath(), typeParameterAST.minChar, typeParameterAST.getLength(), DiagnosticCode.Duplicate_identifier_0, [typeParameter.name]));
                }

                typeParameter.addDeclaration(typeParameters[i]);
                typeParameters[i].setSymbol(typeParameter);
            }

            signature.addDeclaration(functionTypeDeclaration);
            functionTypeDeclaration.setSignatureSymbol(signature);

            this.bindParameterSymbols(<FunctionDeclaration>this.semanticInfo.getASTForDecl(functionTypeDeclaration), functionTypeSymbol, signature);

            // add the implicit call member for this function type
            functionTypeSymbol.addCallSignature(signature);
        }

        // method declarations
        public bindMethodDeclarationToPullSymbol(methodDeclaration: PullDecl) {
            var declKind = methodDeclaration.kind;
            var declFlags = methodDeclaration.flags;
            var methodAST = <FunctionDeclaration>this.semanticInfo.getASTForDecl(methodDeclaration);

            var isPrivate = (declFlags & PullElementFlags.Private) !== 0;
            var isStatic = (declFlags & PullElementFlags.Static) !== 0;
            var isOptional = (declFlags & PullElementFlags.Optional) !== 0;

            var methodName = methodDeclaration.name;

            var isSignature: boolean = (declFlags & PullElementFlags.Signature) !== 0;

            var parent = this.getParent(methodDeclaration, true);
            var parentHadSymbol = false;

            var methodSymbol: PullSymbol = null;
            var methodTypeSymbol: PullTypeSymbol = null;

            if (parent.isClass() && isStatic) {
                parent = parent.getConstructorMethod().type;
            }

            methodSymbol = parent.findMember(methodName, false);

            if (methodSymbol &&
                (methodSymbol.kind !== PullElementKind.Method ||
                (!isSignature && !methodSymbol.allDeclsHaveFlag(PullElementFlags.Signature)))) {
                    this.semanticInfo.addDiagnostic(
                    new Diagnostic(this.semanticInfo.getPath(), methodAST.minChar, methodAST.getLength(), DiagnosticCode.Duplicate_identifier_0, [methodDeclaration.getDisplayName()]));
                methodSymbol = null;
            }

            if (methodSymbol) {
                methodTypeSymbol = methodSymbol.type;
                parentHadSymbol = true;
            }

            if (!methodSymbol) {
                // PULLTODO: Make sure that we properly flag signature decl types when collecting decls
                methodSymbol = new PullSymbol(methodName, PullElementKind.Method);
            }

            if (!methodTypeSymbol) {
                methodTypeSymbol = new PullTypeSymbol("", PullElementKind.FunctionType);
                methodSymbol.type = methodTypeSymbol;
                methodTypeSymbol.setFunctionSymbol(methodSymbol);
            }

            methodDeclaration.setSymbol(methodSymbol);
            methodSymbol.addDeclaration(methodDeclaration);
            methodTypeSymbol.addDeclaration(methodDeclaration);
            this.semanticInfo.setSymbolForAST(methodAST.name, methodSymbol);
            this.semanticInfo.setSymbolForAST(methodAST, methodSymbol);

            if (isOptional) {
                methodSymbol.isOptional = true;
            }

            if (!parentHadSymbol) {
                parent.addMember(methodSymbol);
            }

            var sigKind = PullElementKind.CallSignature;

            var signature = isSignature ? new PullSignatureSymbol(sigKind) : new PullDefinitionSignatureSymbol(sigKind);

            if (lastParameterIsRest(methodAST.parameters)) {
                signature.hasVarArgs = true;
            }

            var typeParameters = methodDeclaration.getTypeParameters();
            var typeParameter: PullTypeParameterSymbol;
            var typeParameterName: string;
            var typeParameterAST: TypeParameter;

            for (var i = 0; i < typeParameters.length; i++) {
                typeParameterName = typeParameters[i].name;
                typeParameterAST = <TypeParameter>this.semanticInfo.getASTForDecl(typeParameters[i]);

                typeParameter = signature.findTypeParameter(typeParameterName);

                if (!typeParameter) {

                    if (!typeParameterAST.constraint) {
                        typeParameter = this.findTypeParameterInCache(typeParameterName);
                    }

                    if (!typeParameter) {
                        typeParameter = new PullTypeParameterSymbol(typeParameterName, true);

                        if (!typeParameterAST.constraint) {
                            this.addTypeParameterToCache(typeParameter);
                        }
                    }

                    signature.addTypeParameter(typeParameter);
                }
                else {
                    typeParameterAST = <TypeParameter>this.semanticInfoChain.getASTForDecl(typeParameter.getDeclarations()[0]);
                    this.semanticInfo.addDiagnostic(
                        new Diagnostic(this.semanticInfo.getPath(), typeParameterAST.minChar, typeParameterAST.getLength(), DiagnosticCode.Duplicate_identifier_0, [typeParameter.getName()]));
                }

                typeParameter.addDeclaration(typeParameters[i]);
                typeParameters[i].setSymbol(typeParameter);
            }

            signature.addDeclaration(methodDeclaration);
            methodDeclaration.setSignatureSymbol(signature);

            this.bindParameterSymbols(<FunctionDeclaration>this.semanticInfo.getASTForDecl(methodDeclaration), methodTypeSymbol, signature);

            // add the implicit call member for this function type
            methodTypeSymbol.addCallSignature(signature);

            var otherDecls = this.findDeclsInContext(methodDeclaration, methodDeclaration.kind, false);

            if (otherDecls && otherDecls.length) {
                for (var i = 0; i < otherDecls.length; i++) {
                    otherDecls[i].ensureSymbolIsBound();
                }
            }
        }

        // class constructor declarations
        public bindConstructorDeclarationToPullSymbol(constructorDeclaration: PullDecl) {
            var declKind = constructorDeclaration.kind;
            var declFlags = constructorDeclaration.flags;
            var constructorAST = <FunctionDeclaration>this.semanticInfo.getASTForDecl(constructorDeclaration);

            var constructorName = constructorDeclaration.name;

            var isSignature: boolean = (declFlags & PullElementFlags.Signature) !== 0;

            var parent = this.getParent(constructorDeclaration, true);

            var parentHadSymbol = false;

            var constructorSymbol: PullSymbol = parent.getConstructorMethod();
            var constructorTypeSymbol: PullTypeSymbol = null;

            if (constructorSymbol &&
                (constructorSymbol.kind !== PullElementKind.ConstructorMethod ||
                (!isSignature &&
                constructorSymbol.type &&
                constructorSymbol.type.hasOwnConstructSignatures()))) {

                var hasDefinitionSignature = false;
                var constructorSigs = constructorSymbol.type.getConstructSignatures();

                for (var i = 0; i < constructorSigs.length; i++) {
                    if (!constructorSigs[i].hasFlag(PullElementFlags.Signature)) {
                        hasDefinitionSignature = true;
                        break;
                    }
                }

                if (hasDefinitionSignature) {
                    this.semanticInfo.addDiagnostic(
                        new Diagnostic(this.semanticInfo.getPath(), constructorAST.minChar, constructorAST.getLength(), DiagnosticCode.Multiple_constructor_implementations_are_not_allowed, null));

                    constructorSymbol = null;
                }
            }

            if (constructorSymbol) {
                constructorTypeSymbol = constructorSymbol.type;
            }
            else {
                constructorSymbol = new PullSymbol(constructorName, PullElementKind.ConstructorMethod);
                constructorTypeSymbol = new PullTypeSymbol("", PullElementKind.ConstructorType);
            }

            // Even if we're reusing the symbol, it would have been cleared by the call to invalidate above
            parent.setConstructorMethod(constructorSymbol);
            constructorSymbol.type = constructorTypeSymbol;

            constructorDeclaration.setSymbol(constructorSymbol);
            constructorSymbol.addDeclaration(constructorDeclaration);
            constructorTypeSymbol.addDeclaration(constructorDeclaration);
            constructorSymbol.setIsSynthesized(false);
            this.semanticInfo.setSymbolForAST(constructorAST, constructorSymbol);

            // add a call signature to the constructor method, and a construct signature to the parent class type
            var constructSignature = isSignature ? new PullSignatureSymbol(PullElementKind.ConstructSignature) : new PullDefinitionSignatureSymbol(PullElementKind.ConstructSignature);

            constructSignature.returnType = parent;

            constructSignature.addDeclaration(constructorDeclaration);
            constructorDeclaration.setSignatureSymbol(constructSignature);

            this.bindParameterSymbols(constructorAST, constructorTypeSymbol, constructSignature);

            var typeParameters = constructorTypeSymbol.getTypeParameters();

            for (var i = 0; i < typeParameters.length; i++) {
                constructSignature.addTypeParameter(typeParameters[i]);
            }

            if (lastParameterIsRest(constructorAST.parameters)) {
                constructSignature.hasVarArgs = true;
            }

            constructorTypeSymbol.addConstructSignature(constructSignature);

            var otherDecls = this.findDeclsInContext(constructorDeclaration, constructorDeclaration.kind, false);

            if (otherDecls && otherDecls.length) {
                for (var i = 0; i < otherDecls.length; i++) {
                    otherDecls[i].ensureSymbolIsBound();
                }
            }
        }

        public bindConstructSignatureDeclarationToPullSymbol(constructSignatureDeclaration: PullDecl) {
            var parent = this.getParent(constructSignatureDeclaration, true);
            var constructorAST = <FunctionDeclaration>this.semanticInfo.getASTForDecl(constructSignatureDeclaration);

            var constructSignature = new PullSignatureSymbol(PullElementKind.ConstructSignature);

            if (lastParameterIsRest(constructorAST.parameters)) {
                constructSignature.hasVarArgs = true;
            }

            var typeParameters = constructSignatureDeclaration.getTypeParameters();
            var typeParameter: PullTypeParameterSymbol;

            for (var i = 0; i < typeParameters.length; i++) {

                typeParameter = constructSignature.findTypeParameter(typeParameters[i].name);

                if (!typeParameter) {
                    typeParameter = new PullTypeParameterSymbol(typeParameters[i].name, true);

                    constructSignature.addTypeParameter(typeParameter);
                }
                else {
                    var typeParameterAST = this.semanticInfoChain.getASTForDecl(typeParameter.getDeclarations()[0]);
                    this.semanticInfo.addDiagnostic(
                        new Diagnostic(this.semanticInfo.getPath(), typeParameterAST.minChar, typeParameterAST.getLength(), DiagnosticCode.Duplicate_identifier_0, [typeParameter.getName()]));
                }

                typeParameter.addDeclaration(typeParameters[i]);
                typeParameters[i].setSymbol(typeParameter);
            }

            constructSignature.addDeclaration(constructSignatureDeclaration);
            constructSignatureDeclaration.setSignatureSymbol(constructSignature);

            this.bindParameterSymbols(<FunctionDeclaration>this.semanticInfo.getASTForDecl(constructSignatureDeclaration), null, constructSignature);

            this.semanticInfo.setSymbolForAST(this.semanticInfo.getASTForDecl(constructSignatureDeclaration), constructSignature);

            parent.addConstructSignature(constructSignature);
        }

        public bindCallSignatureDeclarationToPullSymbol(callSignatureDeclaration: PullDecl) {
            var parent = this.getParent(callSignatureDeclaration, true);
            var callSignatureAST = <FunctionDeclaration>this.semanticInfo.getASTForDecl(callSignatureDeclaration);

            var callSignature = new PullSignatureSymbol(PullElementKind.CallSignature);

            if (lastParameterIsRest(callSignatureAST.parameters)) {
                callSignature.hasVarArgs = true;
            }

            var typeParameters = callSignatureDeclaration.getTypeParameters();
            var typeParameter: PullTypeParameterSymbol;

            for (var i = 0; i < typeParameters.length; i++) {

                typeParameter = callSignature.findTypeParameter(typeParameters[i].name);

                if (!typeParameter) {
                    typeParameter = new PullTypeParameterSymbol(typeParameters[i].name, true);

                    callSignature.addTypeParameter(typeParameter);
                }
                else {
                    var typeParameterAST = this.semanticInfoChain.getASTForDecl(typeParameter.getDeclarations()[0]);
                    this.semanticInfo.addDiagnostic(
                        new Diagnostic(this.semanticInfo.getPath(), typeParameterAST.minChar, typeParameterAST.getLength(), DiagnosticCode.Duplicate_identifier_0, [typeParameter.getName()]));
                }

                typeParameter.addDeclaration(typeParameters[i]);
                typeParameters[i].setSymbol(typeParameter);
            }

            callSignature.addDeclaration(callSignatureDeclaration);
            callSignatureDeclaration.setSignatureSymbol(callSignature);

            this.bindParameterSymbols(<FunctionDeclaration>this.semanticInfo.getASTForDecl(callSignatureDeclaration), null, callSignature);

            this.semanticInfo.setSymbolForAST(this.semanticInfo.getASTForDecl(callSignatureDeclaration), callSignature);

            parent.addCallSignature(callSignature);
        }

        public bindIndexSignatureDeclarationToPullSymbol(indexSignatureDeclaration: PullDecl) {
            var indexSignature = new PullSignatureSymbol(PullElementKind.IndexSignature);

            var typeParameters = indexSignatureDeclaration.getTypeParameters();
            var typeParameter: PullTypeParameterSymbol;

            for (var i = 0; i < typeParameters.length; i++) {

                typeParameter = indexSignature.findTypeParameter(typeParameters[i].name);

                if (!typeParameter) {
                    typeParameter = new PullTypeParameterSymbol(typeParameters[i].name, true);

                    indexSignature.addTypeParameter(typeParameter);
                }
                else {
                    var typeParameterAST = this.semanticInfoChain.getASTForDecl(typeParameter.getDeclarations()[0]);
                    this.semanticInfo.addDiagnostic(
                        new Diagnostic(this.semanticInfo.getPath(), typeParameterAST.minChar, typeParameterAST.getLength(), DiagnosticCode.Duplicate_identifier_0, [typeParameter.name]));
                }

                typeParameter.addDeclaration(typeParameters[i]);
                typeParameters[i].setSymbol(typeParameter);
            }

            indexSignature.addDeclaration(indexSignatureDeclaration);
            indexSignatureDeclaration.setSignatureSymbol(indexSignature);

            this.bindParameterSymbols(<FunctionDeclaration>this.semanticInfo.getASTForDecl(indexSignatureDeclaration), null, indexSignature);

            this.semanticInfo.setSymbolForAST(this.semanticInfo.getASTForDecl(indexSignatureDeclaration), indexSignature);

            var parent = this.getParent(indexSignatureDeclaration);

            var isStatic = hasFlag(indexSignatureDeclaration.flags, PullElementFlags.Static);
            if (isStatic) {
                // Add to the constructor type instead of the instance type
                parent = parent.getConstructorMethod().type;
            }

            parent.addIndexSignature(indexSignature);
            indexSignature.setContainer(parent);
        }

        // getters and setters

        public bindGetAccessorDeclarationToPullSymbol(getAccessorDeclaration: PullDecl) {
            var declKind = getAccessorDeclaration.kind;
            var declFlags = getAccessorDeclaration.flags;
            var funcDeclAST = <FunctionDeclaration>this.semanticInfo.getASTForDecl(getAccessorDeclaration);

            var isExported = (declFlags & PullElementFlags.Exported) !== 0;

            var funcName = getAccessorDeclaration.name;

            var isSignature: boolean = (declFlags & PullElementFlags.Signature) !== 0;
            var isStatic = false;

            if (hasFlag(declFlags, PullElementFlags.Static)) {
                isStatic = true;
            }

            var parent = this.getParent(getAccessorDeclaration, true);
            var parentHadSymbol = false;

            var accessorSymbol: PullAccessorSymbol = null;
            var getterSymbol: PullSymbol = null;
            var getterTypeSymbol: PullTypeSymbol = null;

            if (isStatic) {
                parent = parent.getConstructorMethod().type;
            }

            accessorSymbol = <PullAccessorSymbol>parent.findMember(funcName, false);

            if (accessorSymbol) {
                if (!accessorSymbol.isAccessor()) {
                    this.semanticInfo.addDiagnostic(
                        new Diagnostic(this.semanticInfo.getPath(), funcDeclAST.minChar, funcDeclAST.getLength(), DiagnosticCode.Duplicate_identifier_0, [getAccessorDeclaration.getDisplayName()]));
                    accessorSymbol = null;
                }
                else {
                    getterSymbol = accessorSymbol.getGetter();

                    if (getterSymbol) {
                        this.semanticInfo.addDiagnostic(
                            new Diagnostic(this.semanticInfo.getPath(), funcDeclAST.minChar, funcDeclAST.getLength(), DiagnosticCode.Getter_0_already_declared, [getAccessorDeclaration.getDisplayName()]));
                        accessorSymbol = null;
                        getterSymbol = null;
                    }
                }
            }

            if (accessorSymbol) {
                parentHadSymbol = true;
            }

            // we have an accessor we can use...
            if (accessorSymbol && getterSymbol) {
                getterTypeSymbol = getterSymbol.type;
            }

            if (!accessorSymbol) {
                accessorSymbol = new PullAccessorSymbol(funcName);
            }

            if (!getterSymbol) {
                getterSymbol = new PullSymbol(funcName, PullElementKind.Function);
                getterTypeSymbol = new PullTypeSymbol("", PullElementKind.FunctionType);
                getterTypeSymbol.setFunctionSymbol(getterSymbol);

                getterSymbol.type = getterTypeSymbol;

                accessorSymbol.setGetter(getterSymbol);
            }

            getAccessorDeclaration.setSymbol(accessorSymbol);
            accessorSymbol.addDeclaration(getAccessorDeclaration);
            getterSymbol.addDeclaration(getAccessorDeclaration);

            this.semanticInfo.setSymbolForAST(funcDeclAST.name, getterSymbol);
            this.semanticInfo.setSymbolForAST(funcDeclAST, getterSymbol);

            if (!parentHadSymbol) {
                parent.addMember(accessorSymbol);
            }

            var signature = isSignature ? new PullSignatureSymbol(PullElementKind.CallSignature) : new PullDefinitionSignatureSymbol(PullElementKind.CallSignature);

            signature.addDeclaration(getAccessorDeclaration);
            getAccessorDeclaration.setSignatureSymbol(signature);

            this.bindParameterSymbols(<FunctionDeclaration>this.semanticInfo.getASTForDecl(getAccessorDeclaration), getterTypeSymbol, signature);

            var typeParameters = getAccessorDeclaration.getTypeParameters();

            if (typeParameters.length) {
                this.semanticInfo.addDiagnostic(
                    new Diagnostic(this.semanticInfo.getPath(), funcDeclAST.minChar, funcDeclAST.getLength(),
                        DiagnosticCode.Accessors_cannot_have_type_parameters, null));
            }

            // add the implicit call member for this function type
            getterTypeSymbol.addCallSignature(signature);
        }

        public bindSetAccessorDeclarationToPullSymbol(setAccessorDeclaration: PullDecl) {
            var declKind = setAccessorDeclaration.kind;
            var declFlags = setAccessorDeclaration.flags;
            var funcDeclAST = <FunctionDeclaration>this.semanticInfo.getASTForDecl(setAccessorDeclaration);

            var isExported = (declFlags & PullElementFlags.Exported) !== 0;

            var funcName = setAccessorDeclaration.name;

            var isSignature: boolean = (declFlags & PullElementFlags.Signature) !== 0;
            var isStatic = false;

            if (hasFlag(declFlags, PullElementFlags.Static)) {
                isStatic = true;
            }

            var parent = this.getParent(setAccessorDeclaration, true);
            var parentHadSymbol = false;

            var accessorSymbol: PullAccessorSymbol = null;
            var setterSymbol: PullSymbol = null;
            var setterTypeSymbol: PullTypeSymbol = null;

            if (isStatic) {
                parent = parent.getConstructorMethod().type;
            }

            accessorSymbol = <PullAccessorSymbol>parent.findMember(funcName, false);

            if (accessorSymbol) {
                if (!accessorSymbol.isAccessor()) {
                    this.semanticInfo.addDiagnostic(
                        new Diagnostic(this.semanticInfo.getPath(), funcDeclAST.minChar, funcDeclAST.getLength(), DiagnosticCode.Duplicate_identifier_0, [setAccessorDeclaration.getDisplayName()]));
                    accessorSymbol = null;
                }
                else {
                    setterSymbol = accessorSymbol.getSetter();

                    if (setterSymbol) {
                        this.semanticInfo.addDiagnostic(
                            new Diagnostic(this.semanticInfo.getPath(), funcDeclAST.minChar, funcDeclAST.getLength(), DiagnosticCode.Setter_0_already_declared, [setAccessorDeclaration.getDisplayName()]));
                        accessorSymbol = null;
                        setterSymbol = null;
                    }
                }
            }

            if (accessorSymbol) {
                parentHadSymbol = true;
                // we have an accessor we can use...
                if (setterSymbol) {
                    setterTypeSymbol = setterSymbol.type;
                }
            }

            if (!accessorSymbol) {
                // PULLTODO: Make sure that we properly flag signature decl types when collecting decls
                accessorSymbol = new PullAccessorSymbol(funcName);
            }

            if (!setterSymbol) {
                setterSymbol = new PullSymbol(funcName, PullElementKind.Function);
                setterTypeSymbol = new PullTypeSymbol("", PullElementKind.FunctionType);
                setterTypeSymbol.setFunctionSymbol(setterSymbol);

                setterSymbol.type = setterTypeSymbol;

                accessorSymbol.setSetter(setterSymbol);
            }

            setAccessorDeclaration.setSymbol(accessorSymbol);
            accessorSymbol.addDeclaration(setAccessorDeclaration);
            setterSymbol.addDeclaration(setAccessorDeclaration);

            this.semanticInfo.setSymbolForAST(funcDeclAST.name, setterSymbol);
            this.semanticInfo.setSymbolForAST(funcDeclAST, setterSymbol);

            if (!parentHadSymbol) {
                parent.addMember(accessorSymbol);
            }

            var signature = isSignature ? new PullSignatureSymbol(PullElementKind.CallSignature) : new PullDefinitionSignatureSymbol(PullElementKind.CallSignature);

            signature.addDeclaration(setAccessorDeclaration);
            setAccessorDeclaration.setSignatureSymbol(signature);

            // PULLTODO: setter should not have a parameters
            this.bindParameterSymbols(<FunctionDeclaration>this.semanticInfo.getASTForDecl(setAccessorDeclaration), setterTypeSymbol, signature);

            var typeParameters = setAccessorDeclaration.getTypeParameters();

            if (typeParameters.length) {
                this.semanticInfo.addDiagnostic(
                    new Diagnostic(this.semanticInfo.getPath(), funcDeclAST.minChar, funcDeclAST.getLength(), DiagnosticCode.Accessors_cannot_have_type_parameters, null));
            }

            // add the implicit call member for this function type
            setterTypeSymbol.addCallSignature(signature);
        }

        // binding
        public bindDeclToPullSymbol(decl: PullDecl) {

            if (decl.isBound()) {
                return;
            }

            // if (globalLogger) {
            //     globalLogger.log("Binding " + decl.getName());
            // }

            decl.setIsBound(true);

            switch (decl.kind) {

                case PullElementKind.Script:
                    var childDecls = decl.getChildDecls();
                    for (var i = 0; i < childDecls.length; i++) {
                        this.bindDeclToPullSymbol(childDecls[i]);
                    }
                    break;

                case PullElementKind.Enum:
                case PullElementKind.DynamicModule:
                case PullElementKind.Container:
                    this.bindModuleDeclarationToPullSymbol(decl);
                    break;

                case PullElementKind.Interface:
                    this.bindInterfaceDeclarationToPullSymbol(decl);
                    break;

                case PullElementKind.Class:
                    this.bindClassDeclarationToPullSymbol(decl);
                    break;

                case PullElementKind.Function:
                    this.bindFunctionDeclarationToPullSymbol(decl);
                    break;

                case PullElementKind.Variable:
                    this.bindVariableDeclarationToPullSymbol(decl);
                    break;

                case PullElementKind.EnumMember:
                case PullElementKind.Property:
                    this.bindPropertyDeclarationToPullSymbol(decl);
                    break;

                case PullElementKind.Method:
                    this.bindMethodDeclarationToPullSymbol(decl);
                    break;

                case PullElementKind.ConstructorMethod:
                    this.bindConstructorDeclarationToPullSymbol(decl);
                    break;

                case PullElementKind.CallSignature:
                    this.bindCallSignatureDeclarationToPullSymbol(decl);
                    break;

                case PullElementKind.ConstructSignature:
                    this.bindConstructSignatureDeclarationToPullSymbol(decl);
                    break;

                case PullElementKind.IndexSignature:
                    this.bindIndexSignatureDeclarationToPullSymbol(decl);
                    break;

                case PullElementKind.GetAccessor:
                    this.bindGetAccessorDeclarationToPullSymbol(decl);
                    break;

                case PullElementKind.SetAccessor:
                    this.bindSetAccessorDeclarationToPullSymbol(decl);
                    break;

                case PullElementKind.ObjectType:
                    this.bindObjectTypeDeclarationToPullSymbol(decl);
                    break;

                case PullElementKind.FunctionType:
                    this.bindFunctionTypeDeclarationToPullSymbol(decl);
                    break;

                case PullElementKind.ConstructorType:
                    this.bindConstructorTypeDeclarationToPullSymbol(decl);
                    break;

                case PullElementKind.FunctionExpression:
                    this.bindFunctionExpressionToPullSymbol(decl);
                    break;

                case PullElementKind.TypeAlias:
                    this.bindImportDeclaration(decl);
                    break;

                case PullElementKind.Parameter:
                case PullElementKind.TypeParameter:
                    // parameters are bound by their enclosing function or type.  Ensure that that
                    // decl is bound.
                    decl.getParentDecl().getSymbol();
                    break;

                case PullElementKind.CatchBlock:
                case PullElementKind.WithBlock:
                    // since we don't bind eagerly, there's nothing to do here
                    break;

                default:
                    CompilerDiagnostics.assert(false, "Unrecognized type declaration");
            }
        }

        public bindDeclsForUnit(filePath: string) {
            this.setUnit(filePath);

            var topLevelDecl = this.semanticInfo.getTopLevelDecl();
            this.bindDeclToPullSymbol(topLevelDecl);
        }
    }
}