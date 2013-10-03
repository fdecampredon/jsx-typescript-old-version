// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
// See LICENSE.txt in the project root for complete license information.

///<reference path='..\typescript.ts' />

module TypeScript {
    export class DeclCollectionContext {
        public isDeclareFile = false;
        public parentChain = new Array<PullDecl>();
        public containingModuleHasExportAssignmentArray: boolean[] = [false];
        public isParsingAmbientModuleArray: boolean[] = [false];

        constructor(public semanticInfo: SemanticInfo, public scriptName: string) {
        }

        public getParent() { return this.parentChain ? this.parentChain[this.parentChain.length - 1] : null; }

        public pushParent(parentDecl: PullDecl) { if (parentDecl) { this.parentChain[this.parentChain.length] = parentDecl; } }

        public popParent() { this.parentChain.length--; }

        public foundValueDecl = false;

        public containingModuleHasExportAssignment(): boolean {
            Debug.assert(this.containingModuleHasExportAssignmentArray.length > 0);
            return ArrayUtilities.last(this.containingModuleHasExportAssignmentArray);
        }

        public isParsingAmbientModule(): boolean {
            Debug.assert(this.isParsingAmbientModuleArray.length > 0);
            return ArrayUtilities.last(this.isParsingAmbientModuleArray);
        }
    }

    function preCollectImportDecls(ast: AST, context: DeclCollectionContext) {
        var importDecl = <ImportDeclaration>ast;
        var declFlags = PullElementFlags.None;
        var span = TextSpan.fromBounds(importDecl.minChar, importDecl.limChar);

        var parent = context.getParent();

        if (!context.containingModuleHasExportAssignment() && hasFlag(importDecl.getVarFlags(), VariableFlags.Exported)) {
            declFlags |= PullElementFlags.Exported;
        }

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var decl = new PullDecl(importDecl.id.text(), importDecl.id.actualText, PullElementKind.TypeAlias, declFlags, parent, span, context.scriptName);
        context.semanticInfo.setDeclForAST(ast, decl);
        context.semanticInfo.setASTForDecl(decl, ast);

        return false;
    }

    function preCollectScriptDecls(script: Script, context: DeclCollectionContext): void {
        var span = TextSpan.fromBounds(script.minChar, script.limChar);

        var decl = new PullDecl(context.scriptName, context.scriptName, PullElementKind.Script, PullElementFlags.None, /* parentDecl */ null, span, context.scriptName);
        context.semanticInfo.setDeclForAST(script, decl);
        context.semanticInfo.setASTForDecl(decl, script);

        context.pushParent(decl);
        context.isDeclareFile = script.isDeclareFile;
    }

    function preCollectModuleDecls(moduleDecl: ModuleDeclaration, context: DeclCollectionContext) {
        var declFlags = PullElementFlags.None;
        var modName = (<Identifier>moduleDecl.name).text();
        var isDynamic = isQuoted(modName) || hasFlag(moduleDecl.getModuleFlags(), ModuleFlags.IsExternalModule);
        var kind: PullElementKind = PullElementKind.Container;

        if (!context.containingModuleHasExportAssignment() && (hasFlag(moduleDecl.getModuleFlags(), ModuleFlags.Exported) || context.isParsingAmbientModule())) {
            declFlags |= PullElementFlags.Exported;
        }

        if (hasFlag(moduleDecl.getModuleFlags(), ModuleFlags.Ambient) || context.isParsingAmbientModule() || context.isDeclareFile) {
            declFlags |= PullElementFlags.Ambient;
        }

        if (hasFlag(moduleDecl.getModuleFlags(), ModuleFlags.IsEnum)) {
            // Consider an enum 'always initialized'.
            declFlags |= (PullElementFlags.Enum | PullElementFlags.InitializedEnum);
            kind = PullElementKind.Enum;
        }
        else {
            kind = isDynamic ? PullElementKind.DynamicModule : PullElementKind.Container;
        }

        var span = TextSpan.fromBounds(moduleDecl.minChar, moduleDecl.limChar);

        var decl = new PullDecl(modName, (<Identifier>moduleDecl.name).actualText, kind, declFlags, context.getParent(), span, context.scriptName);
        context.semanticInfo.setDeclForAST(moduleDecl, decl);
        context.semanticInfo.setASTForDecl(decl, moduleDecl);

        context.pushParent(decl);

        context.containingModuleHasExportAssignmentArray.push(
            ArrayUtilities.any(moduleDecl.members.members, m => m.nodeType() === NodeType.ExportAssignment));
        context.isParsingAmbientModuleArray.push(
            context.isDeclareFile || ArrayUtilities.last(context.isParsingAmbientModuleArray) || hasFlag(moduleDecl.getModuleFlags(), ModuleFlags.Ambient));

        return true;
    }

    function preCollectClassDecls(classDecl: ClassDeclaration, context: DeclCollectionContext) {
        var declFlags = PullElementFlags.None;
        var constructorDeclKind = PullElementKind.Variable;

        if (!context.containingModuleHasExportAssignment() && (hasFlag(classDecl.getVarFlags(), VariableFlags.Exported) || context.isParsingAmbientModule())) {
            declFlags |= PullElementFlags.Exported;
        }

        if (hasFlag(classDecl.getVarFlags(), VariableFlags.Ambient) || context.isParsingAmbientModule() || context.isDeclareFile) {
            declFlags |= PullElementFlags.Ambient;
        }

        var span = TextSpan.fromBounds(classDecl.minChar, classDecl.limChar);
        var parent = context.getParent();

        var decl = new PullDecl(classDecl.name.text(), classDecl.name.actualText, PullElementKind.Class, declFlags, parent, span, context.scriptName);

        var constructorDecl = new PullDecl(classDecl.name.text(), classDecl.name.actualText, constructorDeclKind, declFlags | PullElementFlags.ClassConstructorVariable, parent, span, context.scriptName);

        decl.setValueDecl(constructorDecl);

        context.pushParent(decl);

        context.semanticInfo.setDeclForAST(classDecl, decl);
        context.semanticInfo.setASTForDecl(decl, classDecl);
        context.semanticInfo.setASTForDecl(constructorDecl, classDecl);

        return true;
    }

    function preCollectObjectTypeDecls(objectType: ObjectType, context: DeclCollectionContext) {
        var declFlags = PullElementFlags.None;

        var span = TextSpan.fromBounds(objectType.minChar, objectType.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var decl = new PullDecl("", "", PullElementKind.ObjectType, declFlags, parent, span, context.scriptName);
        context.semanticInfo.setDeclForAST(objectType, decl);
        context.semanticInfo.setASTForDecl(decl, objectType);

        context.pushParent(decl);

        return true;
    }

    function preCollectInterfaceDecls(interfaceDecl: InterfaceDeclaration, context: DeclCollectionContext) {
        var declFlags = PullElementFlags.None;

        if (!context.containingModuleHasExportAssignment() && (hasFlag(interfaceDecl.getVarFlags(), VariableFlags.Exported) || context.isParsingAmbientModule())) {
            declFlags |= PullElementFlags.Exported;
        }

        var span = TextSpan.fromBounds(interfaceDecl.minChar, interfaceDecl.limChar);
        var parent = context.getParent();

        var decl = new PullDecl(interfaceDecl.name.text(), interfaceDecl.name.actualText, PullElementKind.Interface, declFlags, parent, span, context.scriptName);
        context.semanticInfo.setDeclForAST(interfaceDecl, decl);
        context.semanticInfo.setASTForDecl(decl, interfaceDecl);

        context.pushParent(decl);

        return true;
    }

    function preCollectParameterDecl(argDecl: Parameter, context: DeclCollectionContext) {
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

        var decl = new PullDecl(argDecl.id.text(), argDecl.id.actualText, PullElementKind.Parameter, declFlags, parent, span, context.scriptName);

        // If it has a default arg, record the fact that the parent has default args (we will need this during resolution)
        if (argDecl.init) {
            parent.flags |= PullElementFlags.HasDefaultArgs;
        }

        if (parent.kind == PullElementKind.ConstructorMethod) {
            decl.setFlag(PullElementFlags.ConstructorParameter);
        }

        // if it's a property type, we'll need to add it to the parent's parent as well
        if (hasFlag(argDecl.getVarFlags(), VariableFlags.Property)) {
            var parentsParent = context.parentChain[context.parentChain.length - 2];
            var propDecl = new PullDecl(argDecl.id.text(), argDecl.id.actualText, PullElementKind.Property, declFlags, parentsParent, span, context.scriptName);
            propDecl.setValueDecl(decl);
            decl.setFlag(PullElementFlags.PropertyParameter);
            propDecl.setFlag(PullElementFlags.PropertyParameter);

            if (parent.kind == PullElementKind.ConstructorMethod) {
                propDecl.setFlag(PullElementFlags.ConstructorParameter);
            }

            context.semanticInfo.setASTForDecl(decl, argDecl);
            context.semanticInfo.setASTForDecl(propDecl, argDecl);
            context.semanticInfo.setDeclForAST(argDecl, propDecl);
        }
        else {
            context.semanticInfo.setASTForDecl(decl, argDecl);
            context.semanticInfo.setDeclForAST(argDecl, decl);
        }

        if (argDecl.typeExpr &&
            (argDecl.typeExpr.term.nodeType() === NodeType.ObjectType ||
             argDecl.typeExpr.term.nodeType() === NodeType.FunctionDeclaration)) {

            var declCollectionContext = new DeclCollectionContext(context.semanticInfo, context.scriptName);

            if (parent) {
                declCollectionContext.pushParent(parent);
            }

            getAstWalkerFactory().walk(argDecl.typeExpr.term, preCollectDecls, postCollectDecls, null, declCollectionContext);
        }

        return false;
    }

    function preCollectTypeParameterDecl(typeParameterDecl: TypeParameter, context: DeclCollectionContext) {
        var declFlags = PullElementFlags.None;

        var span = TextSpan.fromBounds(typeParameterDecl.minChar, typeParameterDecl.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var decl = new PullDecl(typeParameterDecl.name.text(), typeParameterDecl.name.actualText, PullElementKind.TypeParameter, declFlags, parent, span, context.scriptName);
        context.semanticInfo.setASTForDecl(decl, typeParameterDecl);
        context.semanticInfo.setDeclForAST(typeParameterDecl, decl);

        if (typeParameterDecl.constraint &&
            (typeParameterDecl.constraint.term.nodeType() === NodeType.ObjectType ||
             typeParameterDecl.constraint.term.nodeType() === NodeType.FunctionDeclaration)) {

            var declCollectionContext = new DeclCollectionContext(context.semanticInfo, context.scriptName);

            if (parent) {
                declCollectionContext.pushParent(parent);
            }

            getAstWalkerFactory().walk(typeParameterDecl.constraint.term, preCollectDecls, postCollectDecls, null, declCollectionContext);
        }

        return true;
    }

    // interface properties
    function createPropertySignature(propertyDecl: VariableDeclarator, context: DeclCollectionContext) {
        var declFlags = PullElementFlags.Public;
        var parent = context.getParent();
        var declType = parent.kind === PullElementKind.Enum ? PullElementKind.EnumMember : PullElementKind.Property;

        if (hasFlag(propertyDecl.id.getFlags(), ASTFlags.OptionalName)) {
            declFlags |= PullElementFlags.Optional;
        }

        if (propertyDecl.constantValue !== null) {
            declFlags |= PullElementFlags.Constant;
        }

        var span = TextSpan.fromBounds(propertyDecl.minChar, propertyDecl.limChar);

        var decl = new PullDecl(propertyDecl.id.text(), propertyDecl.id.actualText, declType, declFlags, parent, span, context.scriptName);
        context.semanticInfo.setDeclForAST(propertyDecl, decl);
        context.semanticInfo.setASTForDecl(decl, propertyDecl);

        if (propertyDecl.typeExpr &&
            (propertyDecl.typeExpr.term.nodeType() === NodeType.ObjectType ||
             propertyDecl.typeExpr.term.nodeType() === NodeType.FunctionDeclaration)) {

            var declCollectionContext = new DeclCollectionContext(context.semanticInfo, context.scriptName);

            if (parent) {
                declCollectionContext.pushParent(parent);
            }

            getAstWalkerFactory().walk(propertyDecl.typeExpr.term, preCollectDecls, postCollectDecls, null, declCollectionContext);
        }

        return false;
    }

    // class member variables
    function createMemberVariableDeclaration(memberDecl: VariableDeclarator, context: DeclCollectionContext) {
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

        var decl = new PullDecl(memberDecl.id.text(), memberDecl.id.actualText, declType, declFlags, parent, span, context.scriptName);
        context.semanticInfo.setDeclForAST(memberDecl, decl);
        context.semanticInfo.setASTForDecl(decl, memberDecl);

        if (memberDecl.typeExpr &&
            (memberDecl.typeExpr.term.nodeType() === NodeType.ObjectType ||
             memberDecl.typeExpr.term.nodeType() === NodeType.FunctionDeclaration)) {

            var declCollectionContext = new DeclCollectionContext(context.semanticInfo, context.scriptName);

            if (parent) {
                declCollectionContext.pushParent(parent);
            }

            getAstWalkerFactory().walk(memberDecl.typeExpr.term, preCollectDecls, postCollectDecls, null, declCollectionContext);
        }

        return false;
    }

    function createVariableDeclaration(varDecl: VariableDeclarator, context: DeclCollectionContext) {
        var declFlags = PullElementFlags.None;
        var declType = PullElementKind.Variable;

        if (!context.containingModuleHasExportAssignment() && (hasFlag(varDecl.getVarFlags(), VariableFlags.Exported) || context.isParsingAmbientModule())) {
            declFlags |= PullElementFlags.Exported;
        }

        if (hasFlag(varDecl.getVarFlags(), VariableFlags.Ambient) || context.isParsingAmbientModule() || context.isDeclareFile) {
            declFlags |= PullElementFlags.Ambient;
        }

        var span = TextSpan.fromBounds(varDecl.minChar, varDecl.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var decl = new PullDecl(varDecl.id.text(), varDecl.id.actualText, declType, declFlags, parent, span, context.scriptName);
        context.semanticInfo.setDeclForAST(varDecl, decl);
        context.semanticInfo.setASTForDecl(decl, varDecl);

        if (varDecl.typeExpr &&
            (varDecl.typeExpr.term.nodeType() === NodeType.ObjectType ||
             varDecl.typeExpr.term.nodeType() === NodeType.FunctionDeclaration)) {

            var declCollectionContext = new DeclCollectionContext(context.semanticInfo, context.scriptName);

            if (parent) {
                declCollectionContext.pushParent(parent);
            }

            getAstWalkerFactory().walk(varDecl.typeExpr.term, preCollectDecls, postCollectDecls, null, declCollectionContext);
        }

        return false;
    }

    function preCollectVarDecls(ast: AST, context: DeclCollectionContext) {
        var varDecl = <VariableDeclarator>ast;
        var declFlags = PullElementFlags.None;
        var declType = PullElementKind.Variable;
        var isProperty = false;
        var isStatic = false;

        if (hasFlag(varDecl.getVarFlags(), VariableFlags.ClassProperty)) {
            return createMemberVariableDeclaration(varDecl, context);
        }
        else if (hasFlag(varDecl.getVarFlags(), VariableFlags.Property)) {
            return createPropertySignature(varDecl, context);
        }

        return createVariableDeclaration(varDecl, context);
    }

    // function type expressions
    function createFunctionTypeDeclaration(functionTypeDeclAST: FunctionDeclaration, context: DeclCollectionContext) {
        var declFlags = PullElementFlags.Signature;
        var declType = PullElementKind.FunctionType;

        var span = TextSpan.fromBounds(functionTypeDeclAST.minChar, functionTypeDeclAST.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var decl = new PullDecl("", "", declType, declFlags, parent, span, context.semanticInfo.getPath());
        context.semanticInfo.setDeclForAST(functionTypeDeclAST, decl);
        context.semanticInfo.setASTForDecl(decl, functionTypeDeclAST);

        context.pushParent(decl);

        if (functionTypeDeclAST.returnTypeAnnotation &&
            (functionTypeDeclAST.returnTypeAnnotation.term.nodeType() === NodeType.ObjectType ||
            functionTypeDeclAST.returnTypeAnnotation.term.nodeType() === NodeType.FunctionDeclaration)) {

            var declCollectionContext = new DeclCollectionContext(context.semanticInfo, context.scriptName);

            declCollectionContext.pushParent(decl);

            getAstWalkerFactory().walk(functionTypeDeclAST.returnTypeAnnotation.term, preCollectDecls, postCollectDecls, null, declCollectionContext);
        }

        return true;
    }

    // constructor types
    function createConstructorTypeDeclaration(constructorTypeDeclAST: FunctionDeclaration, context: DeclCollectionContext) {
        var declFlags = PullElementFlags.None;
        var declType = PullElementKind.ConstructorType;

        var span = TextSpan.fromBounds(constructorTypeDeclAST.minChar, constructorTypeDeclAST.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var decl = new PullDecl("", "", declType, declFlags, parent, span, context.semanticInfo.getPath());
        context.semanticInfo.setDeclForAST(constructorTypeDeclAST, decl);
        context.semanticInfo.setASTForDecl(decl, constructorTypeDeclAST);

        context.pushParent(decl);

        if (constructorTypeDeclAST.returnTypeAnnotation &&
            (constructorTypeDeclAST.returnTypeAnnotation.term.nodeType() === NodeType.ObjectType ||
             constructorTypeDeclAST.returnTypeAnnotation.term.nodeType() === NodeType.FunctionDeclaration)) {

            var declCollectionContext = new DeclCollectionContext(context.semanticInfo, context.scriptName);

            declCollectionContext.pushParent(decl);

            getAstWalkerFactory().walk(constructorTypeDeclAST.returnTypeAnnotation.term, preCollectDecls, postCollectDecls, null, declCollectionContext);
        }

        return true;
    }

    // function declaration
    function createFunctionDeclaration(funcDeclAST: FunctionDeclaration, context: DeclCollectionContext) {
        var declFlags = PullElementFlags.None;
        var declType = PullElementKind.Function;

        if (!context.containingModuleHasExportAssignment() && (hasFlag(funcDeclAST.getFunctionFlags(), FunctionFlags.Exported) || context.isParsingAmbientModule())) {
            declFlags |= PullElementFlags.Exported;
        }

        if (hasFlag(funcDeclAST.getFunctionFlags(), FunctionFlags.Ambient) || context.isParsingAmbientModule() || context.isDeclareFile) {
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

        var decl = new PullDecl(funcDeclAST.name.text(), funcDeclAST.name.actualText, declType, declFlags, parent, span, context.scriptName);
        context.semanticInfo.setDeclForAST(funcDeclAST, decl);
        context.semanticInfo.setASTForDecl(decl, funcDeclAST);

        context.pushParent(decl);

        if (funcDeclAST.returnTypeAnnotation &&
            (funcDeclAST.returnTypeAnnotation.term.nodeType() === NodeType.ObjectType ||
             funcDeclAST.returnTypeAnnotation.term.nodeType() === NodeType.FunctionDeclaration)) {

            var declCollectionContext = new DeclCollectionContext(context.semanticInfo, context.scriptName);

            declCollectionContext.pushParent(decl);

            getAstWalkerFactory().walk(funcDeclAST.returnTypeAnnotation.term, preCollectDecls, postCollectDecls, null, declCollectionContext);
        }

        return true;
    }

    // function expression
    function createAnyFunctionExpressionDeclaration(
        functionExpressionDeclAST: AST,
        id: Identifier,
        returnTypeAnnotation: TypeReference,
        context: DeclCollectionContext) {

        var declFlags = PullElementFlags.None;

        if (functionExpressionDeclAST.nodeType() === NodeType.ArrowFunctionExpression) {
            declFlags |= PullElementFlags.FatArrow;
        }

        var span = TextSpan.fromBounds(functionExpressionDeclAST.minChar, functionExpressionDeclAST.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var name = id ? id.actualText : "";
        var decl = new PullFunctionExpressionDecl(name, declFlags, parent, span, context.scriptName);
        context.semanticInfo.setDeclForAST(functionExpressionDeclAST, decl);
        context.semanticInfo.setASTForDecl(decl, functionExpressionDeclAST);

        context.pushParent(decl);

        if (returnTypeAnnotation &&
            (returnTypeAnnotation.term.nodeType() === NodeType.ObjectType ||
             returnTypeAnnotation.term.nodeType() === NodeType.FunctionDeclaration)) {

            var declCollectionContext = new DeclCollectionContext(context.semanticInfo, context.scriptName);

            declCollectionContext.pushParent(decl);

            getAstWalkerFactory().walk(returnTypeAnnotation.term, preCollectDecls, postCollectDecls, null, declCollectionContext);
        }

        return true;
    }

    // methods
    function createMemberFunctionDeclaration(memberFunctionDeclAST: FunctionDeclaration, context: DeclCollectionContext) {
        var declFlags = PullElementFlags.None;
        var declType = PullElementKind.Method;

        if (hasFlag(memberFunctionDeclAST.getFunctionFlags(), FunctionFlags.Static)) {
            declFlags |= PullElementFlags.Static;
        }

        if (hasFlag(memberFunctionDeclAST.getFunctionFlags(), FunctionFlags.Private)) {
            declFlags |= PullElementFlags.Private;
        }
        else {
            declFlags |= PullElementFlags.Public;
        }

        if (!memberFunctionDeclAST.block) {
            declFlags |= PullElementFlags.Signature;
        }

        if (hasFlag(memberFunctionDeclAST.name.getFlags(), ASTFlags.OptionalName)) {
            declFlags |= PullElementFlags.Optional;
        }

        var span = TextSpan.fromBounds(memberFunctionDeclAST.minChar, memberFunctionDeclAST.limChar);
        var parent = context.getParent();

        var decl = new PullDecl(memberFunctionDeclAST.name.text(), memberFunctionDeclAST.name.actualText, declType, declFlags, parent, span, context.scriptName);
        context.semanticInfo.setDeclForAST(memberFunctionDeclAST, decl);
        context.semanticInfo.setASTForDecl(decl, memberFunctionDeclAST);

        context.pushParent(decl);

        if (memberFunctionDeclAST.returnTypeAnnotation &&
            (memberFunctionDeclAST.returnTypeAnnotation.term.nodeType() === NodeType.ObjectType ||
             memberFunctionDeclAST.returnTypeAnnotation.term.nodeType() === NodeType.FunctionDeclaration)) {

            var declCollectionContext = new DeclCollectionContext(context.semanticInfo, context.scriptName);

            declCollectionContext.pushParent(decl);

            getAstWalkerFactory().walk(memberFunctionDeclAST.returnTypeAnnotation.term, preCollectDecls, postCollectDecls, null, declCollectionContext);
        }

        return true;
    }

    // index signatures
    function createIndexSignatureDeclaration(indexSignatureDeclAST: FunctionDeclaration, context: DeclCollectionContext) {
        var declFlags = PullElementFlags.Signature;
        var declType = PullElementKind.IndexSignature;

        var span = TextSpan.fromBounds(indexSignatureDeclAST.minChar, indexSignatureDeclAST.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }
        if (indexSignatureDeclAST.getFunctionFlags() & FunctionFlags.Static) {
            declFlags |= PullElementFlags.Static;
        }

        var decl = new PullDecl("", "" , declType, declFlags, parent, span, context.scriptName);
        context.semanticInfo.setDeclForAST(indexSignatureDeclAST, decl);
        context.semanticInfo.setASTForDecl(decl, indexSignatureDeclAST);

        context.pushParent(decl);

        if (indexSignatureDeclAST.returnTypeAnnotation &&
            (indexSignatureDeclAST.returnTypeAnnotation.term.nodeType() === NodeType.ObjectType ||
             indexSignatureDeclAST.returnTypeAnnotation.term.nodeType() === NodeType.FunctionDeclaration)) {

            var declCollectionContext = new DeclCollectionContext(context.semanticInfo, context.scriptName);

            if (parent) {
                declCollectionContext.pushParent(parent);
            }

            getAstWalkerFactory().walk(indexSignatureDeclAST.returnTypeAnnotation.term, preCollectDecls, postCollectDecls, null, declCollectionContext);
        }

        return true;
    }

    // call signatures
    function createCallSignatureDeclaration(callSignatureDeclAST: FunctionDeclaration, context: DeclCollectionContext) {
        var declFlags = PullElementFlags.Signature;
        var declType = PullElementKind.CallSignature;

        var span = TextSpan.fromBounds(callSignatureDeclAST.minChar, callSignatureDeclAST.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var decl = new PullDecl("", "", declType, declFlags, parent, span, context.scriptName);
        context.semanticInfo.setDeclForAST(callSignatureDeclAST, decl);
        context.semanticInfo.setASTForDecl(decl, callSignatureDeclAST);

        context.pushParent(decl);

        if (callSignatureDeclAST.returnTypeAnnotation &&
            (callSignatureDeclAST.returnTypeAnnotation.term.nodeType() === NodeType.ObjectType ||
             callSignatureDeclAST.returnTypeAnnotation.term.nodeType() === NodeType.FunctionDeclaration)) {

            var declCollectionContext = new DeclCollectionContext(context.semanticInfo, context.scriptName);

            declCollectionContext.pushParent(decl);

            getAstWalkerFactory().walk(callSignatureDeclAST.returnTypeAnnotation.term, preCollectDecls, postCollectDecls, null, declCollectionContext);
        }

        return true;
    }

    // construct signatures
    function createConstructSignatureDeclaration(constructSignatureDeclAST: FunctionDeclaration, context: DeclCollectionContext) {
        var declFlags = PullElementFlags.Signature;
        var declType = PullElementKind.ConstructSignature;

        var span = TextSpan.fromBounds(constructSignatureDeclAST.minChar, constructSignatureDeclAST.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var decl = new PullDecl("", "", declType, declFlags, parent, span, context.scriptName);
        context.semanticInfo.setDeclForAST(constructSignatureDeclAST, decl);
        context.semanticInfo.setASTForDecl(decl, constructSignatureDeclAST);

        context.pushParent(decl);

        if (constructSignatureDeclAST.returnTypeAnnotation &&
            (constructSignatureDeclAST.returnTypeAnnotation.term.nodeType() === NodeType.ObjectType ||
             constructSignatureDeclAST.returnTypeAnnotation.term.nodeType() === NodeType.FunctionDeclaration)) {

            var declCollectionContext = new DeclCollectionContext(context.semanticInfo, context.scriptName);

            declCollectionContext.pushParent(decl);

            getAstWalkerFactory().walk(constructSignatureDeclAST.returnTypeAnnotation.term, preCollectDecls, postCollectDecls, null, declCollectionContext);
        }

        return true;
    }

    // class constructors
    function createClassConstructorDeclaration(constructorDeclAST: FunctionDeclaration, context: DeclCollectionContext) {
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

        var decl = new PullDecl(parent.name, parent.getDisplayName(), declType, declFlags, parent, span, context.scriptName);
        context.semanticInfo.setDeclForAST(constructorDeclAST, decl);
        context.semanticInfo.setASTForDecl(decl, constructorDeclAST);

        context.pushParent(decl);

        if (constructorDeclAST.returnTypeAnnotation &&
            (constructorDeclAST.returnTypeAnnotation.term.nodeType() === NodeType.ObjectType ||
             constructorDeclAST.returnTypeAnnotation.term.nodeType() === NodeType.FunctionDeclaration)) {

            var declCollectionContext = new DeclCollectionContext(context.semanticInfo, context.scriptName);

            declCollectionContext.pushParent(decl);

            getAstWalkerFactory().walk(constructorDeclAST.returnTypeAnnotation.term, preCollectDecls, postCollectDecls, null, declCollectionContext);
        }

        return true;
    }

    function createGetAccessorDeclaration(getAccessorDeclAST: FunctionDeclaration, context: DeclCollectionContext) {
        var declFlags = PullElementFlags.Public;
        var declType = PullElementKind.GetAccessor;

        if (hasFlag(getAccessorDeclAST.getFunctionFlags(), FunctionFlags.Static)) {
            declFlags |= PullElementFlags.Static;
        }

        if (hasFlag(getAccessorDeclAST.name.getFlags(), ASTFlags.OptionalName)) {
            declFlags |= PullElementFlags.Optional;
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

        var decl = new PullDecl(getAccessorDeclAST.name.text(), getAccessorDeclAST.name.actualText, declType, declFlags, parent, span, context.scriptName);
        context.semanticInfo.setDeclForAST(getAccessorDeclAST, decl);
        context.semanticInfo.setASTForDecl(decl, getAccessorDeclAST);

        context.pushParent(decl);

        if (getAccessorDeclAST.returnTypeAnnotation &&
            (getAccessorDeclAST.returnTypeAnnotation.term.nodeType() === NodeType.ObjectType ||
             getAccessorDeclAST.returnTypeAnnotation.term.nodeType() === NodeType.FunctionDeclaration)) {

            var declCollectionContext = new DeclCollectionContext(context.semanticInfo, context.scriptName);

            declCollectionContext.pushParent(decl);

            getAstWalkerFactory().walk(getAccessorDeclAST.returnTypeAnnotation.term, preCollectDecls, postCollectDecls, null, declCollectionContext);
        }

        return true;
    }

    // set accessors
    function createSetAccessorDeclaration(setAccessorDeclAST: FunctionDeclaration, context: DeclCollectionContext) {
        var declFlags = PullElementFlags.Public;
        var declType = PullElementKind.SetAccessor;

        if (hasFlag(setAccessorDeclAST.getFunctionFlags(), FunctionFlags.Static)) {
            declFlags |= PullElementFlags.Static;
        }

        if (hasFlag(setAccessorDeclAST.name.getFlags(), ASTFlags.OptionalName)) {
            declFlags |= PullElementFlags.Optional;
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

        var decl = new PullDecl(setAccessorDeclAST.name.actualText, setAccessorDeclAST.name.actualText, declType, declFlags, parent, span, context.scriptName);
        context.semanticInfo.setDeclForAST(setAccessorDeclAST, decl);
        context.semanticInfo.setASTForDecl(decl, setAccessorDeclAST);

        context.pushParent(decl);

        return true;
    }

    function preCollectCatchDecls(ast: AST, context: DeclCollectionContext) {
        var declFlags = PullElementFlags.None;
        var declType = PullElementKind.CatchBlock;

        var span = TextSpan.fromBounds(ast.minChar, ast.limChar);

        var parent = context.getParent();

        if (parent && (parent.kind === PullElementKind.WithBlock || (parent.flags & PullElementFlags.DeclaredInAWithBlock))) {
            declFlags |= PullElementFlags.DeclaredInAWithBlock;
        }

        var decl = new PullDecl("", "", declType, declFlags, parent, span, context.scriptName);
        context.semanticInfo.setDeclForAST(ast, decl);
        context.semanticInfo.setASTForDecl(decl, ast);

        context.pushParent(decl);

        return true;
    }

    function preCollectWithDecls(ast: AST, context: DeclCollectionContext) {
        var declFlags = PullElementFlags.None;
        var declType = PullElementKind.WithBlock;

        var span = TextSpan.fromBounds(ast.minChar, ast.limChar);

        var parent = context.getParent();

        var decl = new PullDecl("", "", declType, declFlags, parent, span, context.scriptName);
        context.semanticInfo.setDeclForAST(ast, decl);
        context.semanticInfo.setASTForDecl(decl, ast);

        context.pushParent(decl);

        return true;
    }

    export function preCollectDecls(ast: AST, walker: IAstWalker) {
        var context: DeclCollectionContext = walker.state;
        var go = false;

        if (ast.nodeType() === NodeType.Script) {
            preCollectScriptDecls(<Script>ast, context);
            go = true;
        }
        else if (ast.nodeType() === NodeType.List) {
            go = true;
        }
        else if (ast.nodeType() === NodeType.Block) {
            go = true;
        }
        else if (ast.nodeType() === NodeType.VariableDeclaration) {
            go = true;
        }
        else if (ast.nodeType() === NodeType.VariableStatement) {
            go = true;
        }
        else if (ast.nodeType() === NodeType.ModuleDeclaration) {
            go = preCollectModuleDecls(<ModuleDeclaration>ast, context);
        }
        else if (ast.nodeType() === NodeType.ClassDeclaration) {
            go = preCollectClassDecls(<ClassDeclaration>ast, context);
        }
        else if (ast.nodeType() === NodeType.InterfaceDeclaration) {
            go = preCollectInterfaceDecls(<InterfaceDeclaration>ast, context);
        }
        else if (ast.nodeType() === NodeType.ObjectType) {
            go = preCollectObjectTypeDecls(<ObjectType>ast, context)
        }
        else if (ast.nodeType() === NodeType.Parameter) {
            go = preCollectParameterDecl(<Parameter>ast, context);
        }
        else if (ast.nodeType() === NodeType.VariableDeclarator) {
            go = preCollectVarDecls(ast, context);
        }
        else if (ast.nodeType() === NodeType.FunctionPropertyAssignment) {
            var funcProp = <FunctionPropertyAssignment>ast;
            go = createAnyFunctionExpressionDeclaration(
                funcProp, funcProp.propertyName, funcProp.returnTypeAnnotation, context);
        }
        else if (ast.nodeType() === NodeType.FunctionDeclaration) {
            var funcDecl = <FunctionDeclaration>ast;

            if (hasFlag(funcDecl.getFunctionFlags(), FunctionFlags.Constructor)) {
                go = createClassConstructorDeclaration(funcDecl, context);
            }
            else if (funcDecl.isGetAccessor()) {
                go = createGetAccessorDeclaration(funcDecl, context);
            }
            else if (funcDecl.isSetAccessor()) {
                go = createSetAccessorDeclaration(funcDecl, context);
            }
            else if (hasFlag(funcDecl.getFunctionFlags(), FunctionFlags.ConstructMember)) {
                go = hasFlag(funcDecl.getFlags(), ASTFlags.TypeReference) ?
                    createConstructorTypeDeclaration(funcDecl, context) :
                    createConstructSignatureDeclaration(funcDecl, context);
            }
            else if (hasFlag(funcDecl.getFunctionFlags(), FunctionFlags.CallSignature)) {
                go = createCallSignatureDeclaration(funcDecl, context);
            }
            else if (hasFlag(funcDecl.getFunctionFlags(), FunctionFlags.IndexerMember)) {
                go = createIndexSignatureDeclaration(funcDecl, context);
            }
            else if (hasFlag(funcDecl.getFlags(), ASTFlags.TypeReference)) {
                go = createFunctionTypeDeclaration(funcDecl, context);
            }
            else if (hasFlag(funcDecl.getFunctionFlags(), FunctionFlags.Method)) {
                go = createMemberFunctionDeclaration(funcDecl, context);
            }
            else if (hasFlag(funcDecl.getFunctionFlags(), (FunctionFlags.IsFunctionExpression))) {
                go = createAnyFunctionExpressionDeclaration(funcDecl, funcDecl.name, funcDecl.returnTypeAnnotation, context);
            }
            else {
                go = createFunctionDeclaration(funcDecl, context);
            }
        }
        else if (ast.nodeType() === NodeType.ArrowFunctionExpression) {
            var arrowFunction = <ArrowFunctionExpression>ast;
            go = createAnyFunctionExpressionDeclaration(ast, /*id*/null, arrowFunction.returnTypeAnnotation, context);
        }
        else if (ast.nodeType() === NodeType.ImportDeclaration) {
            go = preCollectImportDecls(ast, context);
        }
        else if (ast.nodeType() === NodeType.TypeParameter) {
            go = preCollectTypeParameterDecl(<TypeParameter>ast, context);
        }
        else if (ast.nodeType() === NodeType.IfStatement) {
            go = true;
        }
        else if (ast.nodeType() === NodeType.ForStatement) {
            go = true;
        }
        else if (ast.nodeType() === NodeType.ForInStatement) {
            go = true;
        }
        else if (ast.nodeType() === NodeType.WhileStatement) {
            go = true;
        }
        else if (ast.nodeType() === NodeType.DoStatement) {
            go = true;
        }
        else if (ast.nodeType() === NodeType.CommaExpression) {
            go = true;
        }
        else if (ast.nodeType() === NodeType.ReturnStatement) {
            // want to be able to bind lambdas in return positions
            go = true;
        }
        else if (ast.nodeType() === NodeType.SwitchStatement || ast.nodeType() === NodeType.CaseClause) {
            go = true;
        }

        // call and 'new' expressions may contain lambdas with bindings...
        else if (ast.nodeType() === NodeType.InvocationExpression) {
            // want to be able to bind lambdas in return positions
            go = true;
        }
        else if (ast.nodeType() === NodeType.ObjectCreationExpression) {
            // want to be able to bind lambdas in return positions
            go = true;
        }
        else if (ast.nodeType() === NodeType.TryStatement) {
            go = true;
        }
        else if (ast.nodeType() === NodeType.LabeledStatement) {
            go = true;
        }
        else if (ast.nodeType() === NodeType.CatchClause) {
            go = preCollectCatchDecls(ast, context);
        }
        else if (ast.nodeType() === NodeType.WithStatement) {
            go = preCollectWithDecls(ast, context);
        }

        walker.options.goChildren = go;
    }

    function isContainer(decl: PullDecl): boolean {
        return decl.kind === PullElementKind.Container || decl.kind === PullElementKind.DynamicModule || decl.kind === PullElementKind.Enum;
    }

    function getInitializationFlag(decl: PullDecl): PullElementFlags {
        if (decl.kind & PullElementKind.Container) {
            return PullElementFlags.InitializedModule;
        }
        else if (decl.kind & PullElementKind.Enum) {
            return PullElementFlags.InitializedEnum;
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
        else if (kind & PullElementKind.Enum) {
            return (decl.flags & PullElementFlags.InitializedEnum) != 0;
        }
        else if (kind & PullElementKind.DynamicModule) {
            return (decl.flags & PullElementFlags.InitializedDynamicModule) !== 0;
        }

        return false;
    }

    export function postCollectDecls(ast: AST, walker: IAstWalker) {
        var context: DeclCollectionContext = walker.state;
        var parentDecl: PullDecl;
        var initFlag = PullElementFlags.None;

        // Note that we never pop the Script - after the traversal, it should be the
        // one parent left in the context

        if (ast.nodeType() === NodeType.ModuleDeclaration) {
            var thisModule = context.getParent();
            context.popParent();
            context.containingModuleHasExportAssignmentArray.pop();
            context.isParsingAmbientModuleArray.pop();

            parentDecl = context.getParent();

            if (hasInitializationFlag(thisModule)) {

                if (parentDecl && isContainer(parentDecl)) {
                    initFlag = getInitializationFlag(parentDecl);
                    parentDecl.setFlags(parentDecl.flags | initFlag);
                }

                // create the value decl
                var valueDecl = new PullDecl(thisModule.name, thisModule.getDisplayName(), PullElementKind.Variable, thisModule.flags, parentDecl, thisModule.getSpan(), context.scriptName);

                thisModule.setValueDecl(valueDecl);

                context.semanticInfo.setASTForDecl(valueDecl, ast);
            }
        }
        else if (ast.nodeType() === NodeType.ClassDeclaration) {
            context.popParent();

            parentDecl = context.getParent();

            if (parentDecl && isContainer(parentDecl)) {
                initFlag = getInitializationFlag(parentDecl);
                parentDecl.setFlags(parentDecl.flags | initFlag);
            }
        }
        else if (ast.nodeType() === NodeType.InterfaceDeclaration) {
            context.popParent();
        }
        else if (ast.nodeType() === NodeType.ObjectType) {
            context.popParent();
        }
        else if (ast.nodeType() === NodeType.FunctionDeclaration ||
                 ast.nodeType() === NodeType.ArrowFunctionExpression) {
            context.popParent();

            parentDecl = context.getParent();

            if (parentDecl && isContainer(parentDecl)) {
                initFlag = getInitializationFlag(parentDecl);
                parentDecl.setFlags(parentDecl.flags | initFlag);
            }
        }
        else if (ast.nodeType() === NodeType.VariableDeclarator) { // PULLREVIEW: What if we just have a for loop in a module body?
            parentDecl = context.getParent();

            if (parentDecl && isContainer(parentDecl)) {
                initFlag = getInitializationFlag(parentDecl);
                parentDecl.setFlags(parentDecl.flags | initFlag);
            }
        }
        else if (ast.nodeType() === NodeType.CatchClause) {
            parentDecl = context.getParent();

            if (parentDecl && isContainer(parentDecl)) {
                initFlag = getInitializationFlag(parentDecl);
                parentDecl.setFlags(parentDecl.flags | initFlag);
            }

            context.popParent();
        }
        else if (ast.nodeType() === NodeType.WithStatement) {
            parentDecl = context.getParent();

            if (parentDecl && isContainer(parentDecl)) {
                initFlag = getInitializationFlag(parentDecl);
                parentDecl.setFlags(parentDecl.flags | initFlag);
            }

            context.popParent();
        }
    }
}