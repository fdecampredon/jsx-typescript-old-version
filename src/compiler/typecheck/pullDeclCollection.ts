// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
// See LICENSE.txt in the project root for complete license information.

///<reference path='..\references.ts' />

module TypeScript {
    class DeclCollectionContext {
        public isDeclareFile = false;
        public parentChain: PullDecl[] = [];

        constructor(public semanticInfoChain: SemanticInfoChain) {
        }

        public getParent() { return this.parentChain ? this.parentChain[this.parentChain.length - 1] : null; }

        public pushParent(parentDecl: PullDecl) { if (parentDecl) { this.parentChain[this.parentChain.length] = parentDecl; } }

        public popParent() { this.parentChain.length--; }
    }

    function containingModuleHasExportAssignment(ast: AST): boolean {
        ast = ast.parent;
        while (ast) {
            if (ast.nodeType() === NodeType.ModuleDeclaration) {
                var moduleDecl = <ModuleDeclaration>ast;
                return ArrayUtilities.any(moduleDecl.members.members, m => m.nodeType() === NodeType.ExportAssignment);
            }

            ast = ast.parent;
        }

        return false;
    }

    function isParsingAmbientModule(ast: AST, context: DeclCollectionContext): boolean {
        ast = ast.parent;
        while (ast) {
            if (ast.nodeType() === NodeType.ModuleDeclaration) {
                if (hasFlag((<ModuleDeclaration>ast).getModuleFlags(), ModuleFlags.Ambient)) {
                    return true;
                }
            }

            ast = ast.parent;
        }

        return false;
    }

    function preCollectImportDecls(ast: AST, context: DeclCollectionContext): void {
        var importDecl = <ImportDeclaration>ast;
        var declFlags = PullElementFlags.None;
        var span = TextSpan.fromBounds(importDecl.minChar, importDecl.limChar);

        var parent = context.getParent();

        if (hasFlag(importDecl.getVarFlags(), VariableFlags.Exported) && !containingModuleHasExportAssignment(ast)) {
            declFlags |= PullElementFlags.Exported;
        }

        var decl = new NormalPullDecl(importDecl.identifier.valueText(), importDecl.identifier.text(), PullElementKind.TypeAlias, declFlags, parent, span);
        context.semanticInfoChain.setDeclForAST(ast, decl);
        context.semanticInfoChain.setASTForDecl(decl, ast);

        // Note: it is intentional that a import does not get added to hte context stack.  An
        // import does not introduce a new name scope, so it shouldn't be in the context decl stack.
        // context.pushParent(decl);
    }

    function preCollectScriptDecls(script: Script, context: DeclCollectionContext): void {
        var span = TextSpan.fromBounds(script.minChar, script.limChar);

        var fileName = script.fileName();
        var decl = new RootPullDecl(
            /*name:*/ fileName, fileName, PullElementKind.Script, PullElementFlags.None, span, context.semanticInfoChain, script.isExternalModule);
        context.semanticInfoChain.setDeclForAST(script, decl);
        context.semanticInfoChain.setASTForDecl(decl, script);

        context.isDeclareFile = script.isDeclareFile();

        context.pushParent(decl);
    }

    function preCollectEnumDecls(enumDecl: EnumDeclaration, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.None;
        var enumName = enumDecl.identifier.valueText();
        var kind: PullElementKind = PullElementKind.Container;

        if ((hasFlag(enumDecl.getModuleFlags(), ModuleFlags.Exported) || isParsingAmbientModule(enumDecl, context)) && !containingModuleHasExportAssignment(enumDecl)) {
            declFlags |= PullElementFlags.Exported;
        }

        if (hasFlag(enumDecl.getModuleFlags(), ModuleFlags.Ambient) || isParsingAmbientModule(enumDecl, context) || context.isDeclareFile) {
            declFlags |= PullElementFlags.Ambient;
        }

        // Consider an enum 'always initialized'.
        declFlags |= PullElementFlags.Enum;
        kind = PullElementKind.Enum;

        var span = TextSpan.fromBounds(enumDecl.minChar, enumDecl.limChar);

        var enumDeclaration = new NormalPullDecl(enumName, enumDecl.identifier.text(), kind, declFlags, context.getParent(), span);
        context.semanticInfoChain.setDeclForAST(enumDecl, enumDeclaration);
        context.semanticInfoChain.setASTForDecl(enumDeclaration, enumDecl);

        var enumIndexerDecl = new NormalPullDecl("", "", PullElementKind.IndexSignature, PullElementFlags.Signature, enumDeclaration, span);
        var enumIndexerParameter = new NormalPullDecl("x", "x", PullElementKind.Parameter, PullElementFlags.None, enumIndexerDecl, span);

        // create the value decl
        var valueDecl = new NormalPullDecl(enumDeclaration.name, enumDeclaration.getDisplayName(), PullElementKind.Variable, enumDeclaration.flags, context.getParent(), enumDeclaration.getSpan());
        enumDeclaration.setValueDecl(valueDecl);
        context.semanticInfoChain.setASTForDecl(valueDecl, enumDecl);

        context.pushParent(enumDeclaration);
    }

    function createEnumElementDecls(propertyDecl: EnumElement, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.Public;
        var parent = context.getParent();
        var declType = PullElementKind.EnumMember;

        if (propertyDecl.constantValue !== null) {
            declFlags |= PullElementFlags.Constant;
        }

        var span = TextSpan.fromBounds(propertyDecl.minChar, propertyDecl.limChar);

        var decl = new NormalPullDecl(propertyDecl.identifier.valueText(), propertyDecl.identifier.text(), declType, declFlags, parent, span);
        context.semanticInfoChain.setDeclForAST(propertyDecl, decl);
        context.semanticInfoChain.setASTForDecl(decl, propertyDecl);

        // Note: it is intentional that a enum element does not get added to hte context stack.  An 
        // enum element does not introduce a new name scope, so it shouldn't be in the context decl stack.
        // context.pushParent(decl);
    }

    function preCollectModuleDecls(moduleDecl: ModuleDeclaration, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.None;
        var modName = (<Identifier>moduleDecl.name).valueText();
        var isDynamic = isQuoted(modName) || hasFlag(moduleDecl.getModuleFlags(), ModuleFlags.IsExternalModule);

        if ((hasFlag(moduleDecl.getModuleFlags(), ModuleFlags.Exported) || isParsingAmbientModule(moduleDecl, context)) && !containingModuleHasExportAssignment(moduleDecl)) {
            declFlags |= PullElementFlags.Exported;
        }

        if (hasFlag(moduleDecl.getModuleFlags(), ModuleFlags.Ambient) || isParsingAmbientModule(moduleDecl, context) || context.isDeclareFile) {
            declFlags |= PullElementFlags.Ambient;
        }

        var kind = isDynamic ? PullElementKind.DynamicModule : PullElementKind.Container;

        var span = TextSpan.fromBounds(moduleDecl.minChar, moduleDecl.limChar);

        var decl = new NormalPullDecl(modName, (<Identifier>moduleDecl.name).text(), kind, declFlags, context.getParent(), span);
        context.semanticInfoChain.setDeclForAST(moduleDecl, decl);
        context.semanticInfoChain.setASTForDecl(decl, moduleDecl);

        // If we contain any code that requires initialization, then mark us as an initialized.
        if (containsExecutableCode(moduleDecl.members)) {
            decl.setFlags(declFlags | getInitializationFlag(decl));

            // create the value decl
            var valueDecl = new NormalPullDecl(decl.name, decl.getDisplayName(), PullElementKind.Variable, decl.flags, context.getParent(), decl.getSpan());
            decl.setValueDecl(valueDecl);
            context.semanticInfoChain.setASTForDecl(valueDecl, moduleDecl);
        }

        context.pushParent(decl);
    }

    function containsExecutableCode(members: ASTList): boolean {
        for (var i = 0, n = members.members.length; i < n; i++) {
            var member = members.members[i];

            // October 11, 2013
            // Internal modules are either instantiated or non-instantiated. A non-instantiated 
            // module is an internal module containing only interface types and other non - 
            // instantiated modules. 
            //
            // Note: small spec deviation.  We don't consider an import statement sufficient to
            // consider a module instantiated.  After all, if there is an import, but no actual
            // code that references the imported value, then there's no need to emit the import
            // or the module.
            if (member.nodeType() === NodeType.ModuleDeclaration) {
                var moduleDecl = <ModuleDeclaration>member;

                // If we have a module in us, and it contains executable code, then we
                // contain executable code.
                if (containsExecutableCode(moduleDecl.members)) {
                    return true;
                }
            }
            else if (member.nodeType() !== NodeType.InterfaceDeclaration && member.nodeType() !== NodeType.ImportDeclaration) {
                // If we contain anything that's not an interface declaration, then we contain
                // executable code.
                return true;
            }
        }

        return false;
    }

    function preCollectClassDecls(classDecl: ClassDeclaration, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.None;
        var constructorDeclKind = PullElementKind.Variable;

        if ((hasFlag(classDecl.getVarFlags(), VariableFlags.Exported) || isParsingAmbientModule(classDecl, context)) && !containingModuleHasExportAssignment(classDecl)) {
            declFlags |= PullElementFlags.Exported;
        }

        if (hasFlag(classDecl.getVarFlags(), VariableFlags.Ambient) || isParsingAmbientModule(classDecl, context) || context.isDeclareFile) {
            declFlags |= PullElementFlags.Ambient;
        }

        var span = TextSpan.fromBounds(classDecl.minChar, classDecl.limChar);
        var parent = context.getParent();

        var decl = new NormalPullDecl(classDecl.identifier.valueText(), classDecl.identifier.text(), PullElementKind.Class, declFlags, parent, span);

        var constructorDecl = new NormalPullDecl(classDecl.identifier.valueText(), classDecl.identifier.text(), constructorDeclKind, declFlags | PullElementFlags.ClassConstructorVariable, parent, span);

        decl.setValueDecl(constructorDecl);

        context.semanticInfoChain.setDeclForAST(classDecl, decl);
        context.semanticInfoChain.setASTForDecl(decl, classDecl);
        context.semanticInfoChain.setASTForDecl(constructorDecl, classDecl);

        context.pushParent(decl);
    }

    function preCollectObjectTypeDecls(objectType: ObjectType, context: DeclCollectionContext): void {
        // if this is the 'body' of an interface declaration, then we don't want to create a decl 
        // here.  We want the interface decl to be the parent decl of all the members we visit.
        if (objectType.parent.nodeType() === NodeType.InterfaceDeclaration) {
            return;
        }

        var declFlags = PullElementFlags.None;

        var span = TextSpan.fromBounds(objectType.minChar, objectType.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var decl = new NormalPullDecl("", "", PullElementKind.ObjectType, declFlags, parent, span);
        context.semanticInfoChain.setDeclForAST(objectType, decl);
        context.semanticInfoChain.setASTForDecl(decl, objectType);

        context.pushParent(decl);
    }

    function preCollectInterfaceDecls(interfaceDecl: InterfaceDeclaration, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.None;

        if ((hasFlag(interfaceDecl.getVarFlags(), VariableFlags.Exported) || isParsingAmbientModule(interfaceDecl, context)) && !containingModuleHasExportAssignment(interfaceDecl)) {
            declFlags |= PullElementFlags.Exported;
        }

        var span = TextSpan.fromBounds(interfaceDecl.minChar, interfaceDecl.limChar);
        var parent = context.getParent();

        var decl = new NormalPullDecl(interfaceDecl.identifier.valueText(), interfaceDecl.identifier.text(), PullElementKind.Interface, declFlags, parent, span);
        context.semanticInfoChain.setDeclForAST(interfaceDecl, decl);
        context.semanticInfoChain.setASTForDecl(decl, interfaceDecl);

        context.pushParent(decl);
    }

    function preCollectParameterDecl(argDecl: Parameter, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.None;

        if (hasFlag(argDecl.getVarFlags(), VariableFlags.Private)) {
            declFlags |= PullElementFlags.Private;
        }
        else {
            declFlags |= PullElementFlags.Public;
        }

        if (hasFlag(argDecl.getFlags(), ASTFlags.OptionalName) || hasFlag(argDecl.id.getFlags(), ASTFlags.OptionalName)) {
            declFlags |= PullElementFlags.Optional;
        }

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var span = TextSpan.fromBounds(argDecl.minChar, argDecl.limChar);

        var decl = new NormalPullDecl(argDecl.id.valueText(), argDecl.id.text(), PullElementKind.Parameter, declFlags, parent, span);

        // If it has a default arg, record the fact that the parent has default args (we will need this during resolution)
        if (argDecl.init) {
            parent.flags |= PullElementFlags.HasDefaultArgs;
        }

        if (parent.kind == PullElementKind.ConstructorMethod) {
            decl.setFlag(PullElementFlags.ConstructorParameter);
        }

        // if it's a property type, we'll need to add it to the parent's parent as well
        var isPublicOrPrivate = hasFlag(argDecl.getVarFlags(), VariableFlags.Public | VariableFlags.Private);
        var isInConstructor = parent.kind === PullElementKind.ConstructorMethod;
        if (isPublicOrPrivate && isInConstructor) {
            var parentsParent = context.parentChain[context.parentChain.length - 2];
            var propDecl = new NormalPullDecl(argDecl.id.valueText(), argDecl.id.text(), PullElementKind.Property, declFlags, parentsParent, span);
            propDecl.setValueDecl(decl);
            decl.setFlag(PullElementFlags.PropertyParameter);
            propDecl.setFlag(PullElementFlags.PropertyParameter);

            if (parent.kind == PullElementKind.ConstructorMethod) {
                propDecl.setFlag(PullElementFlags.ConstructorParameter);
            }

            context.semanticInfoChain.setASTForDecl(decl, argDecl);
            context.semanticInfoChain.setASTForDecl(propDecl, argDecl);
            context.semanticInfoChain.setDeclForAST(argDecl, propDecl);
        }
        else {
            context.semanticInfoChain.setASTForDecl(decl, argDecl);
            context.semanticInfoChain.setDeclForAST(argDecl, decl);
        }

        // Record this decl in its parent in the declGroup with the corresponding name
        parent.addVariableDeclToGroup(decl);
        
        // Note: it is intentional that a parameter does not get added to hte context stack.  A 
        // parameter does not introduce a new name scope, so it shouldn't be in the context decl stack.
        // context.pushParent(decl);
    }

    function preCollectTypeParameterDecl(typeParameterDecl: TypeParameter, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.None;

        var span = TextSpan.fromBounds(typeParameterDecl.minChar, typeParameterDecl.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var decl = new NormalPullDecl(typeParameterDecl.name.valueText(), typeParameterDecl.name.text(), PullElementKind.TypeParameter, declFlags, parent, span);
        context.semanticInfoChain.setASTForDecl(decl, typeParameterDecl);
        context.semanticInfoChain.setDeclForAST(typeParameterDecl, decl);

        // Note: it is intentional that a type parameter does not get added to hte context stack.
        // A type parameter does not introduce a new name scope, so it shouldn't be in the 
        // context decl stack.
        // context.pushParent(decl);
    }

    // interface properties
    function createPropertySignature(propertyDecl: VariableDeclarator, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.Public;
        var parent = context.getParent();
        var declType = PullElementKind.Property;

        if (hasFlag(propertyDecl.id.getFlags(), ASTFlags.OptionalName)) {
            declFlags |= PullElementFlags.Optional;
        }

        var span = TextSpan.fromBounds(propertyDecl.minChar, propertyDecl.limChar);

        var decl = new NormalPullDecl(propertyDecl.id.valueText(), propertyDecl.id.text(), declType, declFlags, parent, span);
        context.semanticInfoChain.setDeclForAST(propertyDecl, decl);
        context.semanticInfoChain.setASTForDecl(decl, propertyDecl);

        // Note: it is intentional that a var decl does not get added to hte context stack.  A var
        // decl does not introduce a new name scope, so it shouldn't be in the context decl stack.
        // context.pushParent(decl);
    }

    // class member variables
    function createMemberVariableDeclaration(memberDecl: MemberVariableDeclaration, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.None;
        var declType = PullElementKind.Property;

        if (hasFlag(memberDecl.getVarFlags(), VariableFlags.Private)) {
            declFlags |= PullElementFlags.Private;
        }
        else {
            declFlags |= PullElementFlags.Public;
        }

        if (hasFlag(memberDecl.getVarFlags(), VariableFlags.Static)) {
            declFlags |= PullElementFlags.Static;
        }

        var span = TextSpan.fromBounds(memberDecl.minChar, memberDecl.limChar);
        var parent = context.getParent();

        var decl = new NormalPullDecl(memberDecl.id.valueText(), memberDecl.id.text(), declType, declFlags, parent, span);
        context.semanticInfoChain.setDeclForAST(memberDecl, decl);
        context.semanticInfoChain.setASTForDecl(decl, memberDecl);

        // Note: it is intentional that a var decl does not get added to hte context stack.  A var
        // decl does not introduce a new name scope, so it shouldn't be in the context decl stack.
        // context.pushParent(decl);
    }

    function createVariableDeclaration(varDecl: VariableDeclarator, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.None;
        var declType = PullElementKind.Variable;

        if ((hasFlag(varDecl.getVarFlags(), VariableFlags.Exported) || isParsingAmbientModule(varDecl, context)) && !containingModuleHasExportAssignment(varDecl)) {
            declFlags |= PullElementFlags.Exported;
        }

        if (hasFlag(varDecl.getVarFlags(), VariableFlags.Ambient) || isParsingAmbientModule(varDecl, context) || context.isDeclareFile) {
            declFlags |= PullElementFlags.Ambient;
        }

        var span = TextSpan.fromBounds(varDecl.minChar, varDecl.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var decl = new NormalPullDecl(varDecl.id.valueText(), varDecl.id.text(), declType, declFlags, parent, span);
        context.semanticInfoChain.setDeclForAST(varDecl, decl);
        context.semanticInfoChain.setASTForDecl(decl, varDecl);

        if (parent) {
            // Record this decl in its parent in the declGroup with the corresponding name
            parent.addVariableDeclToGroup(decl);
        }

        // Note: it is intentional that a var decl does not get added to hte context stack.  A var
        // decl does not introduce a new name scope, so it shouldn't be in the context decl stack.
        // context.pushParent(decl);
    }

    function preCollectVarDecls(ast: AST, context: DeclCollectionContext): void {
        var varDecl = <VariableDeclarator>ast;

        if (hasFlag(varDecl.getVarFlags(), VariableFlags.Property)) {
            createPropertySignature(varDecl, context);
        }
        else {
            createVariableDeclaration(varDecl, context);
        }
    }

    // function type expressions
    function createFunctionTypeDeclaration(functionTypeDeclAST: FunctionDeclaration, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.Signature;
        var declType = PullElementKind.FunctionType;

        var span = TextSpan.fromBounds(functionTypeDeclAST.minChar, functionTypeDeclAST.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var decl = new NormalPullDecl("", "", declType, declFlags, parent, span);
        context.semanticInfoChain.setDeclForAST(functionTypeDeclAST, decl);
        context.semanticInfoChain.setASTForDecl(decl, functionTypeDeclAST);

        context.pushParent(decl);
    }

    // constructor types
    function createConstructorTypeDeclaration(constructorTypeDeclAST: FunctionDeclaration, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.None;
        var declType = PullElementKind.ConstructorType;

        var span = TextSpan.fromBounds(constructorTypeDeclAST.minChar, constructorTypeDeclAST.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var decl = new NormalPullDecl("", "", declType, declFlags, parent, span);
        context.semanticInfoChain.setDeclForAST(constructorTypeDeclAST, decl);
        context.semanticInfoChain.setASTForDecl(decl, constructorTypeDeclAST);

        context.pushParent(decl);
    }

    // function declaration
    function createFunctionDeclaration(funcDeclAST: FunctionDeclaration, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.None;
        var declType = PullElementKind.Function;

        if ((hasFlag(funcDeclAST.getFunctionFlags(), FunctionFlags.Exported) || isParsingAmbientModule(funcDeclAST, context)) && !containingModuleHasExportAssignment(funcDeclAST)) {
            declFlags |= PullElementFlags.Exported;
        }

        if (hasFlag(funcDeclAST.getFunctionFlags(), FunctionFlags.Ambient) || isParsingAmbientModule(funcDeclAST, context) || context.isDeclareFile) {
            declFlags |= PullElementFlags.Ambient;
        }

        if (!funcDeclAST.block) {
            declFlags |= PullElementFlags.Signature;
        }

        var span = TextSpan.fromBounds(funcDeclAST.minChar, funcDeclAST.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var decl = new NormalPullDecl(funcDeclAST.name.valueText(), funcDeclAST.name.text(), declType, declFlags, parent, span);
        context.semanticInfoChain.setDeclForAST(funcDeclAST, decl);
        context.semanticInfoChain.setASTForDecl(decl, funcDeclAST);

        context.pushParent(decl);
    }

    // function expression
    function createAnyFunctionExpressionDeclaration(
        functionExpressionDeclAST: AST,
        id: Identifier,
        context: DeclCollectionContext,
        displayName: Identifier = null): void {

        var declFlags = PullElementFlags.None;

        if (functionExpressionDeclAST.nodeType() === NodeType.ArrowFunctionExpression) {
            declFlags |= PullElementFlags.FatArrow;
        }

        var span = TextSpan.fromBounds(functionExpressionDeclAST.minChar, functionExpressionDeclAST.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var name = id ? id.text() : "";
        var displayNameText = displayName ? displayName.text() : "";
        var decl = new PullFunctionExpressionDecl(name, declFlags, parent, span, displayNameText);
        context.semanticInfoChain.setDeclForAST(functionExpressionDeclAST, decl);
        context.semanticInfoChain.setASTForDecl(decl, functionExpressionDeclAST);

        context.pushParent(decl);
    }

    function createMemberFunctionDeclaration(funcDecl: MemberFunctionDeclaration, context: DeclCollectionContext): void {
        createAnyMemberFunctionDeclaration(funcDecl, funcDecl.getFunctionFlags(), funcDecl.name, funcDecl.block, context);
    }

    // methods
    function createAnyMemberFunctionDeclaration(memberFunctionDeclAST: AST, flags: FunctionFlags, name: Identifier, block: Block, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.None;
        var declType = PullElementKind.Method;

        if (hasFlag(flags, FunctionFlags.Static)) {
            declFlags |= PullElementFlags.Static;
        }

        if (hasFlag(flags, FunctionFlags.Private)) {
            declFlags |= PullElementFlags.Private;
        }
        else {
            declFlags |= PullElementFlags.Public;
        }

        if (!block) {
            declFlags |= PullElementFlags.Signature;
        }

        if (hasFlag(name.getFlags(), ASTFlags.OptionalName)) {
            declFlags |= PullElementFlags.Optional;
        }

        var span = TextSpan.fromBounds(memberFunctionDeclAST.minChar, memberFunctionDeclAST.limChar);
        var parent = context.getParent();

        var decl = new NormalPullDecl(name.valueText(), name.text(), declType, declFlags, parent, span);
        context.semanticInfoChain.setDeclForAST(memberFunctionDeclAST, decl);
        context.semanticInfoChain.setASTForDecl(decl, memberFunctionDeclAST);

        context.pushParent(decl);
    }

    // index signatures
    function createIndexSignatureDeclaration(indexSignatureDeclAST: FunctionDeclaration, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.Signature;
        var declType = PullElementKind.IndexSignature;

        var span = TextSpan.fromBounds(indexSignatureDeclAST.minChar, indexSignatureDeclAST.limChar);

        var parent = context.getParent();

        var decl = new NormalPullDecl("", "" , declType, declFlags, parent, span);
        context.semanticInfoChain.setDeclForAST(indexSignatureDeclAST, decl);
        context.semanticInfoChain.setASTForDecl(decl, indexSignatureDeclAST);

        context.pushParent(decl);
    }

    // call signatures
    function createCallSignatureDeclaration(callSignatureDeclAST: FunctionDeclaration, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.Signature;
        var declType = PullElementKind.CallSignature;

        var span = TextSpan.fromBounds(callSignatureDeclAST.minChar, callSignatureDeclAST.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var decl = new NormalPullDecl("", "", declType, declFlags, parent, span);
        context.semanticInfoChain.setDeclForAST(callSignatureDeclAST, decl);
        context.semanticInfoChain.setASTForDecl(decl, callSignatureDeclAST);

        context.pushParent(decl);
    }

    // construct signatures
    function createConstructSignatureDeclaration(constructSignatureDeclAST: FunctionDeclaration, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.Signature;
        var declType = PullElementKind.ConstructSignature;

        var span = TextSpan.fromBounds(constructSignatureDeclAST.minChar, constructSignatureDeclAST.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var decl = new NormalPullDecl("", "", declType, declFlags, parent, span);
        context.semanticInfoChain.setDeclForAST(constructSignatureDeclAST, decl);
        context.semanticInfoChain.setASTForDecl(decl, constructSignatureDeclAST);

        context.pushParent(decl);
    }

    // class constructors
    function createClassConstructorDeclaration(constructorDeclAST: ConstructorDeclaration, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.None;
        var declType = PullElementKind.ConstructorMethod;

        if (!constructorDeclAST.block) {
            declFlags |= PullElementFlags.Signature;
        }

        var span = TextSpan.fromBounds(constructorDeclAST.minChar, constructorDeclAST.limChar);

        var parent = context.getParent();

        if (parent) {
            // if the parent is exported, the constructor decl must be as well
            var parentFlags = parent.flags;

            if (parentFlags & PullElementFlags.Exported) {
                declFlags |= PullElementFlags.Exported;
            }
        }

        var decl = new NormalPullDecl(parent.name, parent.getDisplayName(), declType, declFlags, parent, span);
        context.semanticInfoChain.setDeclForAST(constructorDeclAST, decl);
        context.semanticInfoChain.setASTForDecl(decl, constructorDeclAST);

        context.pushParent(decl);
    }

    function createGetAccessorDeclaration(getAccessorDeclAST: GetAccessor, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.Public;
        var declType = PullElementKind.GetAccessor;

        if (hasFlag(getAccessorDeclAST.getFunctionFlags(), FunctionFlags.Static)) {
            declFlags |= PullElementFlags.Static;
        }

        if (hasFlag(getAccessorDeclAST.getFunctionFlags(), FunctionFlags.Private)) {
            declFlags |= PullElementFlags.Private;
        }
        else {
            declFlags |= PullElementFlags.Public;
        }

        var span = TextSpan.fromBounds(getAccessorDeclAST.minChar, getAccessorDeclAST.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var decl = new NormalPullDecl(getAccessorDeclAST.propertyName.valueText(), getAccessorDeclAST.propertyName.text(), declType, declFlags, parent, span);
        context.semanticInfoChain.setDeclForAST(getAccessorDeclAST, decl);
        context.semanticInfoChain.setASTForDecl(decl, getAccessorDeclAST);

        context.pushParent(decl);
    }

    function createFunctionExpressionDeclaration(expression: FunctionExpression, context: DeclCollectionContext): void {
        createAnyFunctionExpressionDeclaration(expression, expression.name, context);
    }

    function createSetAccessorDeclaration(setAccessorDeclAST: SetAccessor, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.Public;
        var declType = PullElementKind.SetAccessor;

        if (hasFlag(setAccessorDeclAST.getFunctionFlags(), FunctionFlags.Static)) {
            declFlags |= PullElementFlags.Static;
        }

        if (hasFlag(setAccessorDeclAST.getFunctionFlags(), FunctionFlags.Private)) {
            declFlags |= PullElementFlags.Private;
        }
        else {
            declFlags |= PullElementFlags.Public;
        }

        var span = TextSpan.fromBounds(setAccessorDeclAST.minChar, setAccessorDeclAST.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var decl = new NormalPullDecl(setAccessorDeclAST.propertyName.valueText(), setAccessorDeclAST.propertyName.text(), declType, declFlags, parent, span);
        context.semanticInfoChain.setDeclForAST(setAccessorDeclAST, decl);
        context.semanticInfoChain.setASTForDecl(decl, setAccessorDeclAST);

        context.pushParent(decl);
    }

    function preCollectCatchDecls(ast: AST, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.None;
        var declType = PullElementKind.CatchBlock;

        var span = TextSpan.fromBounds(ast.minChar, ast.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var decl = new NormalPullDecl("", "", declType, declFlags, parent, span);
        context.semanticInfoChain.setDeclForAST(ast, decl);
        context.semanticInfoChain.setASTForDecl(decl, ast);

        context.pushParent(decl);
    }

    function preCollectWithDecls(ast: AST, context: DeclCollectionContext): void {
        var declFlags = PullElementFlags.None;
        var declType = PullElementKind.WithBlock;

        var span = TextSpan.fromBounds(ast.minChar, ast.limChar);

        var parent = context.getParent();

        var decl = new NormalPullDecl("", "", declType, declFlags, parent, span);
        context.semanticInfoChain.setDeclForAST(ast, decl);
        context.semanticInfoChain.setASTForDecl(decl, ast);

        context.pushParent(decl);
    }

    function preCollectObjectLiteralDecls(ast: AST, context: DeclCollectionContext): void {
        var span = TextSpan.fromBounds(ast.minChar, ast.limChar);
        var decl = new NormalPullDecl(
            "", "", PullElementKind.ObjectLiteral, PullElementFlags.None, context.getParent(), span);

        context.semanticInfoChain.setDeclForAST(ast, decl);
        context.semanticInfoChain.setASTForDecl(decl, ast);

        context.pushParent(decl);
    }

    function preCollectSimplePropertyAssignmentDecls(propertyAssignment: SimplePropertyAssignment, context: DeclCollectionContext): void {
        var assignmentText = getPropertyAssignmentNameTextFromIdentifier(propertyAssignment.propertyName);
        var span = TextSpan.fromBounds(propertyAssignment.minChar, propertyAssignment.limChar);

        var decl = new NormalPullDecl(assignmentText.memberName, assignmentText.actualText, PullElementKind.Property, PullElementFlags.Public, context.getParent(), span);

        context.semanticInfoChain.setDeclForAST(propertyAssignment, decl);
        context.semanticInfoChain.setASTForDecl(decl, propertyAssignment);

        // Note: it is intentional that a property assignment does not get added to hte context 
        // stack.  A prop assignment does not introduce a new name scope, so it shouldn't be in
        // the context decl stack.
        // context.pushParent(decl);
    }

    function preCollectFunctionPropertyAssignmentDecls(propertyAssignment: FunctionPropertyAssignment, context: DeclCollectionContext): void {
        var assignmentText = getPropertyAssignmentNameTextFromIdentifier(propertyAssignment.propertyName);
        var span = TextSpan.fromBounds(propertyAssignment.minChar, propertyAssignment.limChar);

        var decl = new NormalPullDecl(assignmentText.memberName, assignmentText.actualText, PullElementKind.Property, PullElementFlags.Public, context.getParent(), span);

        context.semanticInfoChain.setDeclForAST(propertyAssignment, decl);
        context.semanticInfoChain.setASTForDecl(decl, propertyAssignment);

        createAnyFunctionExpressionDeclaration(
            propertyAssignment, propertyAssignment.propertyName, context, propertyAssignment.propertyName);
    }

    function preCollectDecls(ast: AST, context: DeclCollectionContext) {
        switch (ast.nodeType()) {
            case NodeType.Script:
                preCollectScriptDecls(<Script>ast, context);
                break;
            case NodeType.EnumDeclaration:
                preCollectEnumDecls(<EnumDeclaration>ast, context);
                break;
            case NodeType.EnumElement:
                createEnumElementDecls(<EnumElement>ast, context);
                break;
            case NodeType.ModuleDeclaration:
                preCollectModuleDecls(<ModuleDeclaration>ast, context);
                break;
            case NodeType.ClassDeclaration:
                preCollectClassDecls(<ClassDeclaration>ast, context);
                break;
            case NodeType.InterfaceDeclaration:
                preCollectInterfaceDecls(<InterfaceDeclaration>ast, context);
                break;
            case NodeType.ObjectType:
                preCollectObjectTypeDecls(<ObjectType>ast, context);
                break;
            case NodeType.Parameter:
                preCollectParameterDecl(<Parameter>ast, context);
                break;
            case NodeType.MemberVariableDeclaration:
                createMemberVariableDeclaration(<MemberVariableDeclaration>ast, context);
                break;
            case NodeType.VariableDeclarator:
                preCollectVarDecls(ast, context);
                break;
            case NodeType.ConstructorDeclaration:
                createClassConstructorDeclaration(<ConstructorDeclaration>ast, context);
                break;
            case NodeType.GetAccessor:
                createGetAccessorDeclaration(<GetAccessor>ast, context);
                break;
            case NodeType.SetAccessor:
                createSetAccessorDeclaration(<SetAccessor>ast, context);
                break;
            case NodeType.FunctionExpression:
                createFunctionExpressionDeclaration(<FunctionExpression>ast, context);
                break;
            case NodeType.MemberFunctionDeclaration:
                createMemberFunctionDeclaration(<MemberFunctionDeclaration>ast, context);
                break;

            case NodeType.FunctionDeclaration:
                var funcDecl = <FunctionDeclaration>ast;
                var functionFlags = funcDecl.getFunctionFlags();
                if (hasFlag(functionFlags, FunctionFlags.ConstructMember)) {
                    if (hasFlag(funcDecl.getFlags(), ASTFlags.TypeReference)) {
                        createConstructorTypeDeclaration(funcDecl, context);
                    }
                    else {
                        createConstructSignatureDeclaration(funcDecl, context);
                    }
                }
                else if (hasFlag(functionFlags, FunctionFlags.CallSignature)) {
                    createCallSignatureDeclaration(funcDecl, context);
                }
                else if (hasFlag(functionFlags, FunctionFlags.IndexerMember)) {
                    createIndexSignatureDeclaration(funcDecl, context);
                }
                else if (hasFlag(funcDecl.getFlags(), ASTFlags.TypeReference)) {
                    createFunctionTypeDeclaration(funcDecl, context);
                }
                else if (hasFlag(functionFlags, FunctionFlags.Method)) {
                    createAnyMemberFunctionDeclaration(funcDecl, funcDecl.getFunctionFlags(), funcDecl.name, funcDecl.block,  context);
                }
                else {
                    createFunctionDeclaration(funcDecl, context);
                }
                break;
            case NodeType.ArrowFunctionExpression:
                var arrowFunction = <ArrowFunctionExpression>ast;
                createAnyFunctionExpressionDeclaration(ast, /*id*/null, context);
                break;
            case NodeType.ImportDeclaration:
                preCollectImportDecls(ast, context);
                break;
            case NodeType.TypeParameter:
                preCollectTypeParameterDecl(<TypeParameter>ast, context);
                break;
            case NodeType.CatchClause:
                preCollectCatchDecls(ast, context);
                break;
            case NodeType.WithStatement:
                preCollectWithDecls(ast, context);
                break;
            case NodeType.ObjectLiteralExpression:
                preCollectObjectLiteralDecls(ast, context);
                break;
            case NodeType.SimplePropertyAssignment:
                preCollectSimplePropertyAssignmentDecls(<SimplePropertyAssignment>ast, context);
                break;
            case NodeType.FunctionPropertyAssignment:
                preCollectFunctionPropertyAssignmentDecls(<FunctionPropertyAssignment>ast, context);
                break;
        }
    }

    function isContainer(decl: PullDecl): boolean {
        return decl.kind === PullElementKind.Container || decl.kind === PullElementKind.DynamicModule || decl.kind === PullElementKind.Enum;
    }

    function getInitializationFlag(decl: PullDecl): PullElementFlags {
        if (decl.kind & PullElementKind.Container) {
            return PullElementFlags.InitializedModule;
        }
        else if (decl.kind & PullElementKind.DynamicModule) {
            return PullElementFlags.InitializedDynamicModule;
        }

        return PullElementFlags.None;
    }

    function hasInitializationFlag(decl: PullDecl): boolean {
        var kind = decl.kind;

        if (kind & PullElementKind.Container) {
            return (decl.flags & PullElementFlags.InitializedModule) !== 0;
        }
        else if (kind & PullElementKind.DynamicModule) {
            return (decl.flags & PullElementFlags.InitializedDynamicModule) !== 0;
        }

        return false;
    }

    function postCollectDecls(ast: AST, context: DeclCollectionContext) {
        var currentDecl = context.getParent();

        // Don't pop the topmost decl.  We return that out at the end.
        if (ast.nodeType() !== NodeType.Script && currentDecl.ast() === ast) {
            context.popParent();
        }
    }

    export module DeclarationCreator {
        export function create(script: Script, semanticInfoChain: SemanticInfoChain): PullDecl {
            var declCollectionContext = new DeclCollectionContext(semanticInfoChain);

            // create decls
            getAstWalkerFactory().simpleWalk(script, preCollectDecls, postCollectDecls, declCollectionContext);

            return declCollectionContext.getParent();
        }
    }
}