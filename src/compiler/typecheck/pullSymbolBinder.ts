// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
// See LICENSE.txt in the project root for complete license information.

///<reference path='..\typescript.ts' />

module TypeScript {
    export class PullSymbolBinder {
        private static functionTypeParameterCache = new BlockIntrinsics<PullTypeParameterSymbol>();

        private static findTypeParameterInCache(name: string) {
            return this.functionTypeParameterCache[name];
        }

        private static addTypeParameterToCache(typeParameter: PullTypeParameterSymbol) {
            this.functionTypeParameterCache[typeParameter.getName()] = typeParameter;
        }

        public static resetTypeParameterCache() {
            this.functionTypeParameterCache = new BlockIntrinsics();
        }

        constructor(private semanticInfoChain: SemanticInfoChain) {
        }

        private getParent(decl: PullDecl, returnInstanceType = false): PullTypeSymbol {

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

        private findDeclsInContext(startingDecl: PullDecl, declKind: PullElementKind, searchGlobally: boolean): PullDecl[] {

            if (!searchGlobally) {
                var parentDecl = startingDecl.getParentDecl();
                return parentDecl.searchChildDecls(startingDecl.name, declKind);
            }

            var contextSymbolPath = startingDecl.getParentPath();

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
                    return this.semanticInfoChain.findTopLevelSymbol(name, searchKind, decl.fileName());
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
                    var ast = this.semanticInfoChain.getASTForDecl(decl);
                    this.semanticInfoChain.addDiagnostic(diagnosticFromAST(
                        ast, DiagnosticCode.All_declarations_of_merged_declaration_0_must_be_exported_or_not_exported, [decl.getDisplayName()]));
                }
                return false;
            }

            return true;
        }

        //
        // decl binding
        //

        private bindEnumDeclarationToPullSymbol(moduleContainerDecl: PullDecl) {
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
            var moduleAST = <EnumDeclaration>this.semanticInfoChain.getASTForDecl(moduleContainerDecl);

            var isExported = moduleContainerDecl.flags & PullElementFlags.Exported;
            var isInitializedModule = (moduleContainerDecl.flags & PullElementFlags.SomeInitializedModule) != 0;

            var createdNewSymbol = false;

            moduleContainerTypeSymbol = <PullContainerSymbol>this.getExistingSymbol(moduleContainerDecl, PullElementKind.Enum, parent);

            if (moduleContainerTypeSymbol) {
                if (moduleContainerTypeSymbol.kind !== moduleKind) {
                    // duplicate symbol error
                    if (isInitializedModule) {
                        this.semanticInfoChain.addDiagnostic(
                            diagnosticFromAST(moduleAST, DiagnosticCode.Duplicate_identifier_0, [moduleContainerDecl.getDisplayName()]));
                    }
                    moduleContainerTypeSymbol = null;
                }
                else if (!this.checkThatExportsMatch(moduleContainerDecl, moduleContainerTypeSymbol)) {
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
                    this.semanticInfoChain.cacheGlobalSymbol(moduleContainerTypeSymbol, PullElementKind.Enum);
                }
            }

            // We add the declaration early so that during any recursive binding of other module decls with the same name, this declaration is present.
            moduleContainerTypeSymbol.addDeclaration(moduleContainerDecl);
            moduleContainerDecl.setSymbol(moduleContainerTypeSymbol);

            this.semanticInfoChain.setSymbolForAST(moduleAST.identifier, moduleContainerTypeSymbol);
            this.semanticInfoChain.setSymbolForAST(moduleAST, moduleContainerTypeSymbol);

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

            if (moduleDeclarations.length > 1 && moduleAST.enumElements.members.length > 0) {
                var multipleEnums = ArrayUtilities.where(moduleDeclarations, d => d.kind === PullElementKind.Enum).length > 1;
                if (multipleEnums) {
                    var firstVariable = <EnumElement>moduleAST.enumElements.members[0];
                    if (!firstVariable.value) {
                        this.semanticInfoChain.addDiagnostic(diagnosticFromAST(
                            firstVariable, DiagnosticCode.Enums_with_multiple_declarations_must_provide_an_initializer_for_the_first_enum_element, null));
                    }
                }
            }

            if (createdNewSymbol) {
                if (parent) {
                    if (moduleContainerDecl.flags & PullElementFlags.Exported) {
                        parent.addEnclosedMemberType(moduleContainerTypeSymbol);
                    }
                    else {
                        parent.addEnclosedNonMemberType(moduleContainerTypeSymbol);
                    }
                }
            }

            // if it's an enum, create an index signature and a decl for it
            this.semanticInfoChain.addSyntheticIndexSignature(moduleContainerDecl, moduleContainerTypeSymbol.getInstanceSymbol().type, moduleAST.identifier, "x",
                /*indexParamType*/ this.semanticInfoChain.numberTypeSymbol, /*returnType*/ this.semanticInfoChain.stringTypeSymbol);

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

        private bindModuleDeclarationToPullSymbol(moduleContainerDecl: PullDecl) {
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
            var moduleAST = <ModuleDeclaration>this.semanticInfoChain.getASTForDecl(moduleContainerDecl);

            var isExported = moduleContainerDecl.flags & PullElementFlags.Exported;
            var searchKind = PullElementKind.SomeContainer;
            var isInitializedModule = (moduleContainerDecl.flags & PullElementFlags.SomeInitializedModule) != 0;

            if (parent && moduleKind == PullElementKind.DynamicModule) {
                // Dynamic modules cannot be parented
                this.semanticInfoChain.addDiagnostic(diagnosticFromAST(
                    moduleAST, DiagnosticCode.Ambient_external_module_declaration_must_be_defined_in_global_context, null));
            }

            var createdNewSymbol = false;

            moduleContainerTypeSymbol = <PullContainerSymbol>this.getExistingSymbol(moduleContainerDecl, searchKind, parent);

            if (moduleContainerTypeSymbol) {
                if (moduleContainerTypeSymbol.kind !== moduleKind) {
                    // duplicate symbol error
                    if (isInitializedModule) {
                        this.semanticInfoChain.addDiagnostic(
                            diagnosticFromAST(moduleAST, DiagnosticCode.Duplicate_identifier_0, [moduleContainerDecl.getDisplayName()]));
                    }
                    moduleContainerTypeSymbol = null;
                } else if (moduleKind == PullElementKind.DynamicModule) {
                    // Dynamic modules cannot be reopened.
                    this.semanticInfoChain.addDiagnostic(diagnosticFromAST(moduleAST, DiagnosticCode.Ambient_external_module_declaration_cannot_be_reopened, null));
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

            this.semanticInfoChain.setSymbolForAST(moduleAST.name, moduleContainerTypeSymbol);
            this.semanticInfoChain.setSymbolForAST(moduleAST, moduleContainerTypeSymbol);

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

            if (createdNewSymbol) {
                if (parent) {
                    if (moduleContainerDecl.flags & PullElementFlags.Exported) {
                        parent.addEnclosedMemberContainer(moduleContainerTypeSymbol);
                    }
                    else {
                        parent.addEnclosedNonMemberContainer(moduleContainerTypeSymbol);
                    }
                }
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
        private bindImportDeclaration(importDeclaration: PullDecl) {
            var declFlags = importDeclaration.flags;
            var declKind = importDeclaration.kind;
            var importDeclAST = <VariableDeclarator>this.semanticInfoChain.getASTForDecl(importDeclaration);

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
                this.semanticInfoChain.addDiagnostic(
                    diagnosticFromAST(importDeclAST, DiagnosticCode.Duplicate_identifier_0, [importDeclaration.getDisplayName()]));
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

            this.semanticInfoChain.setSymbolForAST(importDeclAST, importSymbol);

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
        private bindClassDeclarationToPullSymbol(classDecl: PullDecl) {

            var className = classDecl.name;
            var classSymbol: PullTypeSymbol = null;

            var constructorSymbol: PullSymbol = null;
            var constructorTypeSymbol: PullTypeSymbol = null;

            var classAST = <ClassDeclaration>this.semanticInfoChain.getASTForDecl(classDecl);

            var parent = this.getParent(classDecl);
            var parentDecl = classDecl.getParentDecl();
            var isExported = classDecl.flags & PullElementFlags.Exported;
            var isGeneric = false;

            classSymbol = <PullTypeSymbol>this.getExistingSymbol(classDecl, PullElementKind.SomeType, parent);

            // Only error if it is an interface (for classes and enums we will error when we bind the implicit variable)
            if (classSymbol && classSymbol.kind === PullElementKind.Interface) {
                this.semanticInfoChain.addDiagnostic(
                    diagnosticFromAST(classAST, DiagnosticCode.Duplicate_identifier_0, [classDecl.getDisplayName()]));
                classSymbol = null;
            }

            var decls: PullDecl[];

            classSymbol = new PullTypeSymbol(className, PullElementKind.Class);

            if (!parent) {
                this.semanticInfoChain.cacheGlobalSymbol(classSymbol, PullElementKind.Class);
            }

            classSymbol.addDeclaration(classDecl);

            classDecl.setSymbol(classSymbol);

            this.semanticInfoChain.setSymbolForAST(classAST.identifier, classSymbol);
            this.semanticInfoChain.setSymbolForAST(classAST, classSymbol);

            if (parent) {
                if (classDecl.flags & PullElementFlags.Exported) {
                    parent.addEnclosedMemberType(classSymbol);
                }
                else {
                    parent.addEnclosedNonMemberType(classSymbol);
                }
            }

            PullSymbolBinder.resetTypeParameterCache();

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
                    this.semanticInfoChain.addDiagnostic(
                        diagnosticFromAST(typeParameterAST, DiagnosticCode.Duplicate_identifier_0, [typeParameter.getName()]));
                }
            }

            var valueDecl = classDecl.getValueDecl();

            if (valueDecl) {
                valueDecl.ensureSymbolIsBound();
            }
        }

        // interfaces
        private bindInterfaceDeclarationToPullSymbol(interfaceDecl: PullDecl) {

            // 1. Test for existing decl - if it exists, use its symbol
            // 2. If no other decl exists, create a new symbol and use that one
            var interfaceName = interfaceDecl.name;
            var interfaceSymbol: PullTypeSymbol = null;

            var interfaceAST = <InterfaceDeclaration>this.semanticInfoChain.getASTForDecl(interfaceDecl);
            var createdNewSymbol = false;
            var parent = this.getParent(interfaceDecl);

            // We're not yet ready to support interfaces augmenting classes (or vice versa)
            var acceptableSharedKind = PullElementKind.Interface; // | PullElementKind.Class | PullElementKind.Enum;

            interfaceSymbol = <PullTypeSymbol>this.getExistingSymbol(interfaceDecl, PullElementKind.SomeType, parent);

            if (interfaceSymbol) {
                if (!(interfaceSymbol.kind & acceptableSharedKind)) {
                    this.semanticInfoChain.addDiagnostic(
                        diagnosticFromAST(interfaceAST, DiagnosticCode.Duplicate_identifier_0, [interfaceDecl.getDisplayName()]));
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

            PullSymbolBinder.resetTypeParameterCache();

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
                            this.semanticInfoChain.addDiagnostic(
                                diagnosticFromAST(typeParameterAST, DiagnosticCode.Duplicate_identifier_0, [typeParameter.getName()]));

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
            var objectSymbolAST: AST = this.semanticInfoChain.getASTForDecl(objectDecl);

            var objectSymbol = new PullTypeSymbol("", PullElementKind.ObjectType);

            objectSymbol.addDeclaration(objectDecl);
            objectDecl.setSymbol(objectSymbol);

            this.semanticInfoChain.setSymbolForAST(objectSymbolAST, objectSymbol);

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
                    this.semanticInfoChain.addDiagnostic(
                        diagnosticFromAST(typeParameterAST, DiagnosticCode.Duplicate_identifier_0, [typeParameter.name]));
                }

                typeParameter.addDeclaration(typeParameters[i]);
                typeParameters[i].setSymbol(typeParameter);
            }
        }

        public bindConstructorTypeDeclarationToPullSymbol(constructorTypeDeclaration: PullDecl) {
            var declKind = constructorTypeDeclaration.kind;
            var declFlags = constructorTypeDeclaration.flags;
            var constructorTypeAST = this.semanticInfoChain.getASTForDecl(constructorTypeDeclaration);

            var constructorTypeSymbol = new PullTypeSymbol("", PullElementKind.ConstructorType);

            constructorTypeDeclaration.setSymbol(constructorTypeSymbol);
            constructorTypeSymbol.addDeclaration(constructorTypeDeclaration);
            this.semanticInfoChain.setSymbolForAST(constructorTypeAST, constructorTypeSymbol);

            var signature = new PullSignatureSymbol(PullElementKind.ConstructSignature);

            if (lastParameterIsRest((<FunctionDeclaration>constructorTypeAST).parameterList)) {
                signature.hasVarArgs = true;
            }

            signature.addDeclaration(constructorTypeDeclaration);
            constructorTypeDeclaration.setSignatureSymbol(signature);

            var funcDecl = <FunctionDeclaration>this.semanticInfoChain.getASTForDecl(constructorTypeDeclaration);
            this.bindParameterSymbols(funcDecl, funcDecl.parameterList, constructorTypeSymbol, signature);

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
                    this.semanticInfoChain.addDiagnostic(
                        diagnosticFromAST(typeParameterAST, DiagnosticCode.Duplicate_identifier_0, [typeParameter.name]));
                }

                typeParameter.addDeclaration(typeParameters[i]);
                typeParameters[i].setSymbol(typeParameter);
            }
        }

        // variables
        private bindVariableDeclarationToPullSymbol(variableDeclaration: PullDecl) {
            var declFlags = variableDeclaration.flags;
            var declKind = variableDeclaration.kind;
            var varDeclAST = <VariableDeclarator>this.semanticInfoChain.getASTForDecl(variableDeclaration);

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
                    if (prevDecl.fileName() != variableDeclaration.fileName()) {
                        this.semanticInfoChain.addDiagnostic(diagnosticFromDecl(variableDeclaration,
                            DiagnosticCode.Module_0_cannot_merge_with_previous_declaration_of_1_in_a_different_file_2, [declName, declName, prevDecl.fileName()]));
                        variableSymbol.type = new PullErrorTypeSymbol(this.semanticInfoChain.anyTypeSymbol, declName);
                    }
                }

                if (!acceptableRedeclaration || prevIsParam) {
                    // If neither of them are implicit (both explicitly declared as vars), we won't error now. We'll check that the types match during type check.
                    // However, we will error when a variable clobbers a function, or when the two explicit var declarations are not in the same parent declaration
                    if (!prevIsParam && (isImplicit || prevIsImplicit || (prevKind & PullElementKind.SomeFunction) !== 0) || !shareParent) {
                        var diagnostic = diagnosticFromDecl(variableDeclaration, DiagnosticCode.Duplicate_identifier_0, [variableDeclaration.getDisplayName()]);
                        this.semanticInfoChain.addDiagnostic(diagnostic);
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

                this.semanticInfoChain.setSymbolForAST(varDeclAST.id, variableSymbol);
                this.semanticInfoChain.setSymbolForAST(varDeclAST, variableSymbol);
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
                            classTypeSymbol = <PullTypeSymbol>this.semanticInfoChain.findTopLevelSymbol(declName, PullElementKind.SomeType, variableDeclaration.fileName());
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
                            ast = this.semanticInfoChain.getASTForDecl(decl);

                            if (ast) {
                                this.semanticInfoChain.setASTForDecl(variableDeclaration, ast);
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
                            moduleContainerTypeSymbol = <PullContainerSymbol>this.semanticInfoChain.findTopLevelSymbol(declName, PullElementKind.SomeContainer, variableDeclaration.fileName());

                            if (!moduleContainerTypeSymbol) {
                                moduleContainerTypeSymbol = <PullContainerSymbol>this.semanticInfoChain.findTopLevelSymbol(declName, PullElementKind.Enum, variableDeclaration.fileName());
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
                            ast = this.semanticInfoChain.getASTForDecl(decl);

                            if (ast) {
                                this.semanticInfoChain.setASTForDecl(variableDeclaration, ast);
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
        private bindEnumMemberDeclarationToPullSymbol(propertyDeclaration: PullDecl) {
            var declFlags = propertyDeclaration.flags;
            var declKind = propertyDeclaration.kind;
            var propDeclAST = <EnumElement>this.semanticInfoChain.getASTForDecl(propertyDeclaration);

            var declName = propertyDeclaration.name;

            var parentHadSymbol = false;

            var parent = this.getParent(propertyDeclaration, true);

            var propertySymbol = parent.findMember(declName, false);

            if (propertySymbol) {
                this.semanticInfoChain.addDiagnostic(
                    diagnosticFromDecl(propertyDeclaration, DiagnosticCode.Duplicate_identifier_0, [propertyDeclaration.getDisplayName()]));
            }

            if (propertySymbol) {
                parentHadSymbol = true;
            }

            if (!parentHadSymbol) {
                propertySymbol = new PullSymbol(declName, declKind);
            }

            propertySymbol.addDeclaration(propertyDeclaration);
            propertyDeclaration.setSymbol(propertySymbol);

            this.semanticInfoChain.setSymbolForAST(propDeclAST.identifier, propertySymbol);
            this.semanticInfoChain.setSymbolForAST(propDeclAST, propertySymbol);

            if (parent && !parentHadSymbol) {
                parent.addMember(propertySymbol);
            }
        }

        private bindPropertyDeclarationToPullSymbol(propertyDeclaration: PullDecl) {
            var declFlags = propertyDeclaration.flags;
            var declKind = propertyDeclaration.kind;
            var propDeclAST = <VariableDeclarator>this.semanticInfoChain.getASTForDecl(propertyDeclaration);

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
                this.semanticInfoChain.addDiagnostic(
                    diagnosticFromDecl(propertyDeclaration, DiagnosticCode.Duplicate_identifier_0, [propertyDeclaration.getDisplayName()]));
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

            this.semanticInfoChain.setSymbolForAST(propDeclAST.id, propertySymbol);
            this.semanticInfoChain.setSymbolForAST(propDeclAST, propertySymbol);

            if (isOptional) {
                propertySymbol.isOptional = true;
            }

            if (parent && !parentHadSymbol) {
                parent.addMember(propertySymbol);
            }
        }

        // parameters
        private bindParameterSymbols(functionDeclaration: AST, parameterList: ASTList, funcType: PullTypeSymbol, signatureSymbol: PullSignatureSymbol) {
            // create a symbol for each ast
            // if it's a property, add the symbol to the enclosing type's member list
            var parameters: PullSymbol[] = [];
            var decl: PullDecl = null;
            var argDecl: Parameter = null;
            var parameterSymbol: PullSymbol = null;
            var isProperty = false;
            var params = new BlockIntrinsics<boolean>();
            var funcDecl = this.semanticInfoChain.getDeclForAST(functionDeclaration);

            if (parameterList) {
                for (var i = 0; i < parameterList.members.length; i++) {
                    argDecl = <Parameter>parameterList.members[i];
                    decl = this.semanticInfoChain.getDeclForAST(argDecl);
                    isProperty = hasFlag(decl.flags, PullElementFlags.PropertyParameter);
                    parameterSymbol = new PullSymbol(argDecl.id.text(), PullElementKind.Parameter);

                    if (argDecl.isRest) {
                        parameterSymbol.isVarArg = true;
                    }

                    if (decl.flags & PullElementFlags.Optional) {
                        parameterSymbol.isOptional = true;
                    }

                    if (params[argDecl.id.text()]) {
                        this.semanticInfoChain.addDiagnostic(
                            diagnosticFromAST(argDecl, DiagnosticCode.Duplicate_identifier_0, [argDecl.id.actualText]));
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
        private bindFunctionDeclarationToPullSymbol(functionDeclaration: PullDecl) {
            var declKind = functionDeclaration.kind;
            var declFlags = functionDeclaration.flags;
            var funcDeclAST = <FunctionDeclaration>this.semanticInfoChain.getASTForDecl(functionDeclaration);

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
                    this.semanticInfoChain.addDiagnostic(
                        diagnosticFromAST(funcDeclAST, DiagnosticCode.Duplicate_identifier_0, [functionDeclaration.getDisplayName()]));
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

            this.semanticInfoChain.setSymbolForAST(funcDeclAST.name, functionSymbol);
            this.semanticInfoChain.setSymbolForAST(funcDeclAST, functionSymbol);

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

            if (lastParameterIsRest(funcDeclAST.parameterList)) {
                signature.hasVarArgs = true;
            }

            var funcDecl = <FunctionDeclaration>this.semanticInfoChain.getASTForDecl(functionDeclaration);
            this.bindParameterSymbols(funcDecl, funcDecl.parameterList, functionTypeSymbol, signature);

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
                    this.semanticInfoChain.addDiagnostic(
                        diagnosticFromAST(typeParameterAST, DiagnosticCode.Duplicate_identifier_0, [typeParameter.name]));
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
            var funcExpAST = <FunctionDeclaration>this.semanticInfoChain.getASTForDecl(functionExpressionDeclaration);

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
                this.semanticInfoChain.setSymbolForAST(funcExpAST.name, functionSymbol);
            }
            this.semanticInfoChain.setSymbolForAST(funcExpAST, functionSymbol);

            var signature = new PullDefinitionSignatureSymbol(PullElementKind.CallSignature);

            if (lastParameterIsRest(funcExpAST.parameterList)) {
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
                    this.semanticInfoChain.addDiagnostic(
                        diagnosticFromAST(typeParameterAST, DiagnosticCode.Duplicate_identifier_0, [typeParameter.getName()]));
                }

                typeParameter.addDeclaration(typeParameters[i]);
                typeParameters[i].setSymbol(typeParameter);
            }

            signature.addDeclaration(functionExpressionDeclaration);
            functionExpressionDeclaration.setSignatureSymbol(signature);

            var funcDecl = <FunctionDeclaration>this.semanticInfoChain.getASTForDecl(functionExpressionDeclaration);
            this.bindParameterSymbols(funcDecl, funcDecl.parameterList, functionTypeSymbol, signature);

            // add the implicit call member for this function type
            functionTypeSymbol.addCallSignature(signature);
        }

        public bindFunctionTypeDeclarationToPullSymbol(functionTypeDeclaration: PullDecl) {
            var declKind = functionTypeDeclaration.kind;
            var declFlags = functionTypeDeclaration.flags;
            var funcTypeAST = <FunctionDeclaration>this.semanticInfoChain.getASTForDecl(functionTypeDeclaration);

            // 1. Test for existing decl - if it exists, use its symbol
            // 2. If no other decl exists, create a new symbol and use that one

            var functionTypeSymbol = new PullTypeSymbol("", PullElementKind.FunctionType);

            functionTypeDeclaration.setSymbol(functionTypeSymbol);
            functionTypeSymbol.addDeclaration(functionTypeDeclaration);
            this.semanticInfoChain.setSymbolForAST(funcTypeAST, functionTypeSymbol);

            var isSignature: boolean = (declFlags & PullElementFlags.Signature) !== 0;
            var signature = isSignature ? new PullSignatureSymbol(PullElementKind.CallSignature) : new PullDefinitionSignatureSymbol(PullElementKind.CallSignature);

            if (lastParameterIsRest(funcTypeAST.parameterList)) {
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
                    this.semanticInfoChain.addDiagnostic(
                        diagnosticFromAST(typeParameterAST, DiagnosticCode.Duplicate_identifier_0, [typeParameter.name]));
                }

                typeParameter.addDeclaration(typeParameters[i]);
                typeParameters[i].setSymbol(typeParameter);
            }

            signature.addDeclaration(functionTypeDeclaration);
            functionTypeDeclaration.setSignatureSymbol(signature);

            var funcDecl = <FunctionDeclaration>this.semanticInfoChain.getASTForDecl(functionTypeDeclaration);
            this.bindParameterSymbols(funcDecl, funcDecl.parameterList, functionTypeSymbol, signature);

            // add the implicit call member for this function type
            functionTypeSymbol.addCallSignature(signature);
        }

        // method declarations
        private bindMethodDeclarationToPullSymbol(methodDeclaration: PullDecl) {
            var declKind = methodDeclaration.kind;
            var declFlags = methodDeclaration.flags;
            var methodAST = <FunctionDeclaration>this.semanticInfoChain.getASTForDecl(methodDeclaration);

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
                    this.semanticInfoChain.addDiagnostic(
                    diagnosticFromAST(methodAST, DiagnosticCode.Duplicate_identifier_0, [methodDeclaration.getDisplayName()]));
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
            this.semanticInfoChain.setSymbolForAST(methodAST.name, methodSymbol);
            this.semanticInfoChain.setSymbolForAST(methodAST, methodSymbol);

            if (isOptional) {
                methodSymbol.isOptional = true;
            }

            if (!parentHadSymbol) {
                parent.addMember(methodSymbol);
            }

            var sigKind = PullElementKind.CallSignature;

            var signature = isSignature ? new PullSignatureSymbol(sigKind) : new PullDefinitionSignatureSymbol(sigKind);

            if (lastParameterIsRest(methodAST.parameterList)) {
                signature.hasVarArgs = true;
            }

            var typeParameters = methodDeclaration.getTypeParameters();
            var typeParameter: PullTypeParameterSymbol;
            var typeParameterName: string;
            var typeParameterAST: TypeParameter;

            for (var i = 0; i < typeParameters.length; i++) {
                typeParameterName = typeParameters[i].name;
                typeParameterAST = <TypeParameter>this.semanticInfoChain.getASTForDecl(typeParameters[i]);

                typeParameter = signature.findTypeParameter(typeParameterName);

                if (!typeParameter) {

                    if (!typeParameterAST.constraint) {
                        typeParameter = PullSymbolBinder.findTypeParameterInCache(typeParameterName);
                    }

                    if (!typeParameter) {
                        typeParameter = new PullTypeParameterSymbol(typeParameterName, true);

                        if (!typeParameterAST.constraint) {
                            PullSymbolBinder.addTypeParameterToCache(typeParameter);
                        }
                    }

                    signature.addTypeParameter(typeParameter);
                }
                else {
                    this.semanticInfoChain.addDiagnostic(
                        diagnosticFromAST(typeParameterAST, DiagnosticCode.Duplicate_identifier_0, [typeParameter.getName()]));
                }

                typeParameter.addDeclaration(typeParameters[i]);
                typeParameters[i].setSymbol(typeParameter);
            }

            signature.addDeclaration(methodDeclaration);
            methodDeclaration.setSignatureSymbol(signature);

            var funcDecl = <FunctionDeclaration>this.semanticInfoChain.getASTForDecl(methodDeclaration);
            this.bindParameterSymbols(funcDecl, funcDecl.parameterList, methodTypeSymbol, signature);

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
        private bindConstructorDeclarationToPullSymbol(constructorDeclaration: PullDecl) {
            var declKind = constructorDeclaration.kind;
            var declFlags = constructorDeclaration.flags;
            var constructorAST = <ConstructorDeclaration>this.semanticInfoChain.getASTForDecl(constructorDeclaration);

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
                    this.semanticInfoChain.addDiagnostic(
                        diagnosticFromAST(constructorAST, DiagnosticCode.Multiple_constructor_implementations_are_not_allowed, null));

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
            this.semanticInfoChain.setSymbolForAST(constructorAST, constructorSymbol);

            // add a call signature to the constructor method, and a construct signature to the parent class type
            var constructSignature = isSignature ? new PullSignatureSymbol(PullElementKind.ConstructSignature) : new PullDefinitionSignatureSymbol(PullElementKind.ConstructSignature);

            constructSignature.returnType = parent;

            constructSignature.addDeclaration(constructorDeclaration);
            constructorDeclaration.setSignatureSymbol(constructSignature);

            this.bindParameterSymbols(constructorAST, constructorAST.parameterList, constructorTypeSymbol, constructSignature);

            var typeParameters = constructorTypeSymbol.getTypeParameters();

            for (var i = 0; i < typeParameters.length; i++) {
                constructSignature.addTypeParameter(typeParameters[i]);
            }

            if (lastParameterIsRest(constructorAST.parameterList)) {
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

        private bindConstructSignatureDeclarationToPullSymbol(constructSignatureDeclaration: PullDecl) {
            var parent = this.getParent(constructSignatureDeclaration, true);
            var constructorAST = <FunctionDeclaration>this.semanticInfoChain.getASTForDecl(constructSignatureDeclaration);

            var constructSignature = new PullSignatureSymbol(PullElementKind.ConstructSignature);

            if (lastParameterIsRest(constructorAST.parameterList)) {
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
                    this.semanticInfoChain.addDiagnostic(
                        diagnosticFromAST(typeParameterAST, DiagnosticCode.Duplicate_identifier_0, [typeParameter.getName()]));
                }

                typeParameter.addDeclaration(typeParameters[i]);
                typeParameters[i].setSymbol(typeParameter);
            }

            constructSignature.addDeclaration(constructSignatureDeclaration);
            constructSignatureDeclaration.setSignatureSymbol(constructSignature);

            var funcDecl = <FunctionDeclaration>this.semanticInfoChain.getASTForDecl(constructSignatureDeclaration);
            this.bindParameterSymbols(funcDecl, funcDecl.parameterList, null, constructSignature);

            this.semanticInfoChain.setSymbolForAST(this.semanticInfoChain.getASTForDecl(constructSignatureDeclaration), constructSignature);

            parent.addConstructSignature(constructSignature);
        }

        private bindCallSignatureDeclarationToPullSymbol(callSignatureDeclaration: PullDecl) {
            var parent = this.getParent(callSignatureDeclaration, true);
            var callSignatureAST = <FunctionDeclaration>this.semanticInfoChain.getASTForDecl(callSignatureDeclaration);

            var callSignature = new PullSignatureSymbol(PullElementKind.CallSignature);

            if (lastParameterIsRest(callSignatureAST.parameterList)) {
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
                    this.semanticInfoChain.addDiagnostic(
                        diagnosticFromAST(typeParameterAST, DiagnosticCode.Duplicate_identifier_0, [typeParameter.getName()]));
                }

                typeParameter.addDeclaration(typeParameters[i]);
                typeParameters[i].setSymbol(typeParameter);
            }

            callSignature.addDeclaration(callSignatureDeclaration);
            callSignatureDeclaration.setSignatureSymbol(callSignature);

            var funcDecl = <FunctionDeclaration>this.semanticInfoChain.getASTForDecl(callSignatureDeclaration);
            this.bindParameterSymbols(funcDecl, funcDecl.parameterList, null, callSignature);

            this.semanticInfoChain.setSymbolForAST(this.semanticInfoChain.getASTForDecl(callSignatureDeclaration), callSignature);

            parent.addCallSignature(callSignature);
        }

        private bindIndexSignatureDeclarationToPullSymbol(indexSignatureDeclaration: PullDecl) {
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
                    this.semanticInfoChain.addDiagnostic(
                        diagnosticFromAST(typeParameterAST, DiagnosticCode.Duplicate_identifier_0, [typeParameter.name]));
                }

                typeParameter.addDeclaration(typeParameters[i]);
                typeParameters[i].setSymbol(typeParameter);
            }

            indexSignature.addDeclaration(indexSignatureDeclaration);
            indexSignatureDeclaration.setSignatureSymbol(indexSignature);

            var funcDecl = <FunctionDeclaration>this.semanticInfoChain.getASTForDecl(indexSignatureDeclaration);
            this.bindParameterSymbols(funcDecl, funcDecl.parameterList, null, indexSignature);

            this.semanticInfoChain.setSymbolForAST(this.semanticInfoChain.getASTForDecl(indexSignatureDeclaration), indexSignature);

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
            var funcDeclAST = <FunctionDeclaration>this.semanticInfoChain.getASTForDecl(getAccessorDeclaration);

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
                    this.semanticInfoChain.addDiagnostic(
                        diagnosticFromAST(funcDeclAST, DiagnosticCode.Duplicate_identifier_0, [getAccessorDeclaration.getDisplayName()]));
                    accessorSymbol = null;
                }
                else {
                    getterSymbol = accessorSymbol.getGetter();

                    if (getterSymbol) {
                        this.semanticInfoChain.addDiagnostic(
                            diagnosticFromAST(funcDeclAST, DiagnosticCode.Getter_0_already_declared, [getAccessorDeclaration.getDisplayName()]));
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

            this.semanticInfoChain.setSymbolForAST(funcDeclAST.name, getterSymbol);
            this.semanticInfoChain.setSymbolForAST(funcDeclAST, getterSymbol);

            if (!parentHadSymbol) {
                parent.addMember(accessorSymbol);
            }

            var signature = isSignature ? new PullSignatureSymbol(PullElementKind.CallSignature) : new PullDefinitionSignatureSymbol(PullElementKind.CallSignature);

            signature.addDeclaration(getAccessorDeclaration);
            getAccessorDeclaration.setSignatureSymbol(signature);

            var funcDecl = <FunctionDeclaration>this.semanticInfoChain.getASTForDecl(getAccessorDeclaration);
            this.bindParameterSymbols(funcDecl, funcDecl.parameterList, getterTypeSymbol, signature);

            var typeParameters = getAccessorDeclaration.getTypeParameters();

            if (typeParameters.length) {
                this.semanticInfoChain.addDiagnostic(
                    diagnosticFromAST(funcDeclAST,
                        DiagnosticCode.Accessors_cannot_have_type_parameters, null));
            }

            // add the implicit call member for this function type
            getterTypeSymbol.addCallSignature(signature);
        }

        public bindSetAccessorDeclarationToPullSymbol(setAccessorDeclaration: PullDecl) {
            var declKind = setAccessorDeclaration.kind;
            var declFlags = setAccessorDeclaration.flags;
            var funcDeclAST = <FunctionDeclaration>this.semanticInfoChain.getASTForDecl(setAccessorDeclaration);

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
                    this.semanticInfoChain.addDiagnostic(
                        diagnosticFromAST(funcDeclAST, DiagnosticCode.Duplicate_identifier_0, [setAccessorDeclaration.getDisplayName()]));
                    accessorSymbol = null;
                }
                else {
                    setterSymbol = accessorSymbol.getSetter();

                    if (setterSymbol) {
                        this.semanticInfoChain.addDiagnostic(
                            diagnosticFromAST(funcDeclAST, DiagnosticCode.Setter_0_already_declared, [setAccessorDeclaration.getDisplayName()]));
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

            this.semanticInfoChain.setSymbolForAST(funcDeclAST.name, setterSymbol);
            this.semanticInfoChain.setSymbolForAST(funcDeclAST, setterSymbol);

            if (!parentHadSymbol) {
                parent.addMember(accessorSymbol);
            }

            var signature = isSignature ? new PullSignatureSymbol(PullElementKind.CallSignature) : new PullDefinitionSignatureSymbol(PullElementKind.CallSignature);

            signature.addDeclaration(setAccessorDeclaration);
            setAccessorDeclaration.setSignatureSymbol(signature);

            // PULLTODO: setter should not have a parameters
            var funcDecl = <FunctionDeclaration>this.semanticInfoChain.getASTForDecl(setAccessorDeclaration);
            this.bindParameterSymbols(funcDecl, funcDecl.parameterList, setterTypeSymbol, signature);

            var typeParameters = setAccessorDeclaration.getTypeParameters();

            if (typeParameters.length) {
                this.semanticInfoChain.addDiagnostic(
                    diagnosticFromAST(funcDeclAST, DiagnosticCode.Accessors_cannot_have_type_parameters, null));
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
                    this.bindEnumDeclarationToPullSymbol(decl);
                    break;

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
                    this.bindEnumMemberDeclarationToPullSymbol(decl);
                    break;

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

        //public bindTopLevelDecl() {
        //    var topLevelDecl = this.semanticInfoChain.getTopLevelDecl(this.fileName);
        //    this.bindDeclToPullSymbol(topLevelDecl);
        //}
    }
}