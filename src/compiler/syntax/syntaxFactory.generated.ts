///<reference path='references.ts' />

module TypeScript.Syntax {
    export interface IFactory {
        sourceUnit(moduleElements: ISyntaxList<IModuleElementSyntax>, endOfFileToken: ISyntaxToken): SourceUnitSyntax;
        externalModuleReference(requireKeyword: ISyntaxToken, openParenToken: ISyntaxToken, stringLiteral: ISyntaxToken, closeParenToken: ISyntaxToken): ExternalModuleReferenceSyntax;
        moduleNameModuleReference(moduleName: INameSyntax): ModuleNameModuleReferenceSyntax;
        importDeclaration(modifiers: ISyntaxList<ISyntaxToken>, importKeyword: ISyntaxToken, identifier: ISyntaxToken, equalsToken: ISyntaxToken, moduleReference: IModuleReferenceSyntax, semicolonToken: ISyntaxToken): ImportDeclarationSyntax;
        exportAssignment(exportKeyword: ISyntaxToken, equalsToken: ISyntaxToken, identifier: ISyntaxToken, semicolonToken: ISyntaxToken): ExportAssignmentSyntax;
        classDeclaration(modifiers: ISyntaxList<ISyntaxToken>, classKeyword: ISyntaxToken, identifier: ISyntaxToken, typeParameterList: TypeParameterListSyntax, heritageClauses: ISyntaxList<HeritageClauseSyntax>, openBraceToken: ISyntaxToken, classElements: ISyntaxList<IClassElementSyntax>, closeBraceToken: ISyntaxToken): ClassDeclarationSyntax;
        interfaceDeclaration(modifiers: ISyntaxList<ISyntaxToken>, interfaceKeyword: ISyntaxToken, identifier: ISyntaxToken, typeParameterList: TypeParameterListSyntax, heritageClauses: ISyntaxList<HeritageClauseSyntax>, body: ObjectTypeSyntax): InterfaceDeclarationSyntax;
        heritageClause(kind: SyntaxKind, extendsOrImplementsKeyword: ISyntaxToken, typeNames: ISeparatedSyntaxList<INameSyntax>): HeritageClauseSyntax;
        moduleDeclaration(modifiers: ISyntaxList<ISyntaxToken>, moduleKeyword: ISyntaxToken, name: INameSyntax, stringLiteral: ISyntaxToken, openBraceToken: ISyntaxToken, moduleElements: ISyntaxList<IModuleElementSyntax>, closeBraceToken: ISyntaxToken): ModuleDeclarationSyntax;
        functionDeclaration(modifiers: ISyntaxList<ISyntaxToken>, functionKeyword: ISyntaxToken, identifier: ISyntaxToken, callSignature: CallSignatureSyntax, block: BlockSyntax, semicolonToken: ISyntaxToken): FunctionDeclarationSyntax;
        variableStatement(modifiers: ISyntaxList<ISyntaxToken>, variableDeclaration: VariableDeclarationSyntax, semicolonToken: ISyntaxToken): VariableStatementSyntax;
        variableDeclaration(varKeyword: ISyntaxToken, variableDeclarators: ISeparatedSyntaxList<VariableDeclaratorSyntax>): VariableDeclarationSyntax;
        variableDeclarator(propertyName: ISyntaxToken, typeAnnotation: TypeAnnotationSyntax, equalsValueClause: EqualsValueClauseSyntax): VariableDeclaratorSyntax;
        equalsValueClause(equalsToken: ISyntaxToken, value: IExpressionSyntax): EqualsValueClauseSyntax;
        prefixUnaryExpression(kind: SyntaxKind, operatorToken: ISyntaxToken, operand: IUnaryExpressionSyntax): PrefixUnaryExpressionSyntax;
        arrayLiteralExpression(openBracketToken: ISyntaxToken, expressions: ISeparatedSyntaxList<IExpressionSyntax>, closeBracketToken: ISyntaxToken): ArrayLiteralExpressionSyntax;
        omittedExpression(): OmittedExpressionSyntax;
        parenthesizedExpression(openParenToken: ISyntaxToken, expression: IExpressionSyntax, closeParenToken: ISyntaxToken): ParenthesizedExpressionSyntax;
        simpleArrowFunctionExpression(identifier: ISyntaxToken, equalsGreaterThanToken: ISyntaxToken, block: BlockSyntax, expression: IExpressionSyntax): SimpleArrowFunctionExpressionSyntax;
        parenthesizedArrowFunctionExpression(callSignature: CallSignatureSyntax, equalsGreaterThanToken: ISyntaxToken, block: BlockSyntax, expression: IExpressionSyntax): ParenthesizedArrowFunctionExpressionSyntax;
        qualifiedName(left: INameSyntax, dotToken: ISyntaxToken, right: ISyntaxToken): QualifiedNameSyntax;
        typeArgumentList(lessThanToken: ISyntaxToken, typeArguments: ISeparatedSyntaxList<ITypeSyntax>, greaterThanToken: ISyntaxToken): TypeArgumentListSyntax;
        constructorType(newKeyword: ISyntaxToken, typeParameterList: TypeParameterListSyntax, parameterList: ParameterListSyntax, equalsGreaterThanToken: ISyntaxToken, type: ITypeSyntax): ConstructorTypeSyntax;
        functionType(typeParameterList: TypeParameterListSyntax, parameterList: ParameterListSyntax, equalsGreaterThanToken: ISyntaxToken, type: ITypeSyntax): FunctionTypeSyntax;
        objectType(openBraceToken: ISyntaxToken, typeMembers: ISeparatedSyntaxList<ITypeMemberSyntax>, closeBraceToken: ISyntaxToken): ObjectTypeSyntax;
        arrayType(type: ITypeSyntax, openBracketToken: ISyntaxToken, closeBracketToken: ISyntaxToken): ArrayTypeSyntax;
        genericType(name: INameSyntax, typeArgumentList: TypeArgumentListSyntax): GenericTypeSyntax;
        typeQuery(typeOfKeyword: ISyntaxToken, name: INameSyntax): TypeQuerySyntax;
        typeAnnotation(colonToken: ISyntaxToken, type: ITypeSyntax): TypeAnnotationSyntax;
        block(openBraceToken: ISyntaxToken, statements: ISyntaxList<IStatementSyntax>, closeBraceToken: ISyntaxToken): BlockSyntax;
        parameter(dotDotDotToken: ISyntaxToken, modifiers: ISyntaxList<ISyntaxToken>, identifier: ISyntaxToken, questionToken: ISyntaxToken, typeAnnotation: TypeAnnotationSyntax, equalsValueClause: EqualsValueClauseSyntax): ParameterSyntax;
        memberAccessExpression(expression: ILeftHandSideExpressionSyntax, dotToken: ISyntaxToken, name: ISyntaxToken): MemberAccessExpressionSyntax;
        postfixUnaryExpression(kind: SyntaxKind, operand: ILeftHandSideExpressionSyntax, operatorToken: ISyntaxToken): PostfixUnaryExpressionSyntax;
        elementAccessExpression(expression: ILeftHandSideExpressionSyntax, openBracketToken: ISyntaxToken, argumentExpression: IExpressionSyntax, closeBracketToken: ISyntaxToken): ElementAccessExpressionSyntax;
        invocationExpression(expression: ILeftHandSideExpressionSyntax, argumentList: ArgumentListSyntax): InvocationExpressionSyntax;
        argumentList(typeArgumentList: TypeArgumentListSyntax, openParenToken: ISyntaxToken, arguments: ISeparatedSyntaxList<IExpressionSyntax>, closeParenToken: ISyntaxToken): ArgumentListSyntax;
        binaryExpression(kind: SyntaxKind, left: IExpressionSyntax, operatorToken: ISyntaxToken, right: IExpressionSyntax): BinaryExpressionSyntax;
        conditionalExpression(condition: IExpressionSyntax, questionToken: ISyntaxToken, whenTrue: IExpressionSyntax, colonToken: ISyntaxToken, whenFalse: IExpressionSyntax): ConditionalExpressionSyntax;
        constructSignature(newKeyword: ISyntaxToken, callSignature: CallSignatureSyntax): ConstructSignatureSyntax;
        methodSignature(propertyName: ISyntaxToken, questionToken: ISyntaxToken, callSignature: CallSignatureSyntax): MethodSignatureSyntax;
        indexSignature(openBracketToken: ISyntaxToken, parameter: ParameterSyntax, closeBracketToken: ISyntaxToken, typeAnnotation: TypeAnnotationSyntax): IndexSignatureSyntax;
        propertySignature(propertyName: ISyntaxToken, questionToken: ISyntaxToken, typeAnnotation: TypeAnnotationSyntax): PropertySignatureSyntax;
        callSignature(typeParameterList: TypeParameterListSyntax, parameterList: ParameterListSyntax, typeAnnotation: TypeAnnotationSyntax): CallSignatureSyntax;
        parameterList(openParenToken: ISyntaxToken, parameters: ISeparatedSyntaxList<ParameterSyntax>, closeParenToken: ISyntaxToken): ParameterListSyntax;
        typeParameterList(lessThanToken: ISyntaxToken, typeParameters: ISeparatedSyntaxList<TypeParameterSyntax>, greaterThanToken: ISyntaxToken): TypeParameterListSyntax;
        typeParameter(identifier: ISyntaxToken, constraint: ConstraintSyntax): TypeParameterSyntax;
        constraint(extendsKeyword: ISyntaxToken, type: ITypeSyntax): ConstraintSyntax;
        elseClause(elseKeyword: ISyntaxToken, statement: IStatementSyntax): ElseClauseSyntax;
        ifStatement(ifKeyword: ISyntaxToken, openParenToken: ISyntaxToken, condition: IExpressionSyntax, closeParenToken: ISyntaxToken, statement: IStatementSyntax, elseClause: ElseClauseSyntax): IfStatementSyntax;
        expressionStatement(expression: IExpressionSyntax, semicolonToken: ISyntaxToken): ExpressionStatementSyntax;
        constructorDeclaration(modifiers: ISyntaxList<ISyntaxToken>, constructorKeyword: ISyntaxToken, callSignature: CallSignatureSyntax, block: BlockSyntax, semicolonToken: ISyntaxToken): ConstructorDeclarationSyntax;
        memberFunctionDeclaration(modifiers: ISyntaxList<ISyntaxToken>, propertyName: ISyntaxToken, callSignature: CallSignatureSyntax, block: BlockSyntax, semicolonToken: ISyntaxToken): MemberFunctionDeclarationSyntax;
        getAccessor(modifiers: ISyntaxList<ISyntaxToken>, getKeyword: ISyntaxToken, propertyName: ISyntaxToken, parameterList: ParameterListSyntax, typeAnnotation: TypeAnnotationSyntax, block: BlockSyntax): GetAccessorSyntax;
        setAccessor(modifiers: ISyntaxList<ISyntaxToken>, setKeyword: ISyntaxToken, propertyName: ISyntaxToken, parameterList: ParameterListSyntax, block: BlockSyntax): SetAccessorSyntax;
        memberVariableDeclaration(modifiers: ISyntaxList<ISyntaxToken>, variableDeclarator: VariableDeclaratorSyntax, semicolonToken: ISyntaxToken): MemberVariableDeclarationSyntax;
        indexMemberDeclaration(modifiers: ISyntaxList<ISyntaxToken>, indexSignature: IndexSignatureSyntax, semicolonToken: ISyntaxToken): IndexMemberDeclarationSyntax;
        throwStatement(throwKeyword: ISyntaxToken, expression: IExpressionSyntax, semicolonToken: ISyntaxToken): ThrowStatementSyntax;
        returnStatement(returnKeyword: ISyntaxToken, expression: IExpressionSyntax, semicolonToken: ISyntaxToken): ReturnStatementSyntax;
        objectCreationExpression(newKeyword: ISyntaxToken, expression: IMemberExpressionSyntax, argumentList: ArgumentListSyntax): ObjectCreationExpressionSyntax;
        switchStatement(switchKeyword: ISyntaxToken, openParenToken: ISyntaxToken, expression: IExpressionSyntax, closeParenToken: ISyntaxToken, openBraceToken: ISyntaxToken, switchClauses: ISyntaxList<ISwitchClauseSyntax>, closeBraceToken: ISyntaxToken): SwitchStatementSyntax;
        caseSwitchClause(caseKeyword: ISyntaxToken, expression: IExpressionSyntax, colonToken: ISyntaxToken, statements: ISyntaxList<IStatementSyntax>): CaseSwitchClauseSyntax;
        defaultSwitchClause(defaultKeyword: ISyntaxToken, colonToken: ISyntaxToken, statements: ISyntaxList<IStatementSyntax>): DefaultSwitchClauseSyntax;
        breakStatement(breakKeyword: ISyntaxToken, identifier: ISyntaxToken, semicolonToken: ISyntaxToken): BreakStatementSyntax;
        continueStatement(continueKeyword: ISyntaxToken, identifier: ISyntaxToken, semicolonToken: ISyntaxToken): ContinueStatementSyntax;
        forStatement(forKeyword: ISyntaxToken, openParenToken: ISyntaxToken, variableDeclaration: VariableDeclarationSyntax, initializer: IExpressionSyntax, firstSemicolonToken: ISyntaxToken, condition: IExpressionSyntax, secondSemicolonToken: ISyntaxToken, incrementor: IExpressionSyntax, closeParenToken: ISyntaxToken, statement: IStatementSyntax): ForStatementSyntax;
        forInStatement(forKeyword: ISyntaxToken, openParenToken: ISyntaxToken, variableDeclaration: VariableDeclarationSyntax, left: IExpressionSyntax, inKeyword: ISyntaxToken, expression: IExpressionSyntax, closeParenToken: ISyntaxToken, statement: IStatementSyntax): ForInStatementSyntax;
        whileStatement(whileKeyword: ISyntaxToken, openParenToken: ISyntaxToken, condition: IExpressionSyntax, closeParenToken: ISyntaxToken, statement: IStatementSyntax): WhileStatementSyntax;
        withStatement(withKeyword: ISyntaxToken, openParenToken: ISyntaxToken, condition: IExpressionSyntax, closeParenToken: ISyntaxToken, statement: IStatementSyntax): WithStatementSyntax;
        enumDeclaration(modifiers: ISyntaxList<ISyntaxToken>, enumKeyword: ISyntaxToken, identifier: ISyntaxToken, openBraceToken: ISyntaxToken, enumElements: ISeparatedSyntaxList<EnumElementSyntax>, closeBraceToken: ISyntaxToken): EnumDeclarationSyntax;
        enumElement(propertyName: ISyntaxToken, equalsValueClause: EqualsValueClauseSyntax): EnumElementSyntax;
        castExpression(lessThanToken: ISyntaxToken, type: ITypeSyntax, greaterThanToken: ISyntaxToken, expression: IUnaryExpressionSyntax): CastExpressionSyntax;
        objectLiteralExpression(openBraceToken: ISyntaxToken, propertyAssignments: ISeparatedSyntaxList<IPropertyAssignmentSyntax>, closeBraceToken: ISyntaxToken): ObjectLiteralExpressionSyntax;
        simplePropertyAssignment(propertyName: ISyntaxToken, colonToken: ISyntaxToken, expression: IExpressionSyntax): SimplePropertyAssignmentSyntax;
        functionPropertyAssignment(propertyName: ISyntaxToken, callSignature: CallSignatureSyntax, block: BlockSyntax): FunctionPropertyAssignmentSyntax;
        functionExpression(functionKeyword: ISyntaxToken, identifier: ISyntaxToken, callSignature: CallSignatureSyntax, block: BlockSyntax): FunctionExpressionSyntax;
        emptyStatement(semicolonToken: ISyntaxToken): EmptyStatementSyntax;
        tryStatement(tryKeyword: ISyntaxToken, block: BlockSyntax, catchClause: CatchClauseSyntax, finallyClause: FinallyClauseSyntax): TryStatementSyntax;
        catchClause(catchKeyword: ISyntaxToken, openParenToken: ISyntaxToken, identifier: ISyntaxToken, typeAnnotation: TypeAnnotationSyntax, closeParenToken: ISyntaxToken, block: BlockSyntax): CatchClauseSyntax;
        finallyClause(finallyKeyword: ISyntaxToken, block: BlockSyntax): FinallyClauseSyntax;
        labeledStatement(identifier: ISyntaxToken, colonToken: ISyntaxToken, statement: IStatementSyntax): LabeledStatementSyntax;
        doStatement(doKeyword: ISyntaxToken, statement: IStatementSyntax, whileKeyword: ISyntaxToken, openParenToken: ISyntaxToken, condition: IExpressionSyntax, closeParenToken: ISyntaxToken, semicolonToken: ISyntaxToken): DoStatementSyntax;
        typeOfExpression(typeOfKeyword: ISyntaxToken, expression: IUnaryExpressionSyntax): TypeOfExpressionSyntax;
        deleteExpression(deleteKeyword: ISyntaxToken, expression: IUnaryExpressionSyntax): DeleteExpressionSyntax;
        voidExpression(voidKeyword: ISyntaxToken, expression: IUnaryExpressionSyntax): VoidExpressionSyntax;
        debuggerStatement(debuggerKeyword: ISyntaxToken, semicolonToken: ISyntaxToken): DebuggerStatementSyntax;
    }

    export class NormalModeFactory implements IFactory {
        sourceUnit(moduleElements: ISyntaxList<IModuleElementSyntax>, endOfFileToken: ISyntaxToken): SourceUnitSyntax {
            return new SourceUnitSyntax(moduleElements, endOfFileToken, /*data:*/ 0);
        }
        externalModuleReference(requireKeyword: ISyntaxToken, openParenToken: ISyntaxToken, stringLiteral: ISyntaxToken, closeParenToken: ISyntaxToken): ExternalModuleReferenceSyntax {
            return new ExternalModuleReferenceSyntax(requireKeyword, openParenToken, stringLiteral, closeParenToken, /*data:*/ 0);
        }
        moduleNameModuleReference(moduleName: INameSyntax): ModuleNameModuleReferenceSyntax {
            return new ModuleNameModuleReferenceSyntax(moduleName, /*data:*/ 0);
        }
        importDeclaration(modifiers: ISyntaxList<ISyntaxToken>, importKeyword: ISyntaxToken, identifier: ISyntaxToken, equalsToken: ISyntaxToken, moduleReference: IModuleReferenceSyntax, semicolonToken: ISyntaxToken): ImportDeclarationSyntax {
            return new ImportDeclarationSyntax(modifiers, importKeyword, identifier, equalsToken, moduleReference, semicolonToken, /*data:*/ 0);
        }
        exportAssignment(exportKeyword: ISyntaxToken, equalsToken: ISyntaxToken, identifier: ISyntaxToken, semicolonToken: ISyntaxToken): ExportAssignmentSyntax {
            return new ExportAssignmentSyntax(exportKeyword, equalsToken, identifier, semicolonToken, /*data:*/ 0);
        }
        classDeclaration(modifiers: ISyntaxList<ISyntaxToken>, classKeyword: ISyntaxToken, identifier: ISyntaxToken, typeParameterList: TypeParameterListSyntax, heritageClauses: ISyntaxList<HeritageClauseSyntax>, openBraceToken: ISyntaxToken, classElements: ISyntaxList<IClassElementSyntax>, closeBraceToken: ISyntaxToken): ClassDeclarationSyntax {
            return new ClassDeclarationSyntax(modifiers, classKeyword, identifier, typeParameterList, heritageClauses, openBraceToken, classElements, closeBraceToken, /*data:*/ 0);
        }
        interfaceDeclaration(modifiers: ISyntaxList<ISyntaxToken>, interfaceKeyword: ISyntaxToken, identifier: ISyntaxToken, typeParameterList: TypeParameterListSyntax, heritageClauses: ISyntaxList<HeritageClauseSyntax>, body: ObjectTypeSyntax): InterfaceDeclarationSyntax {
            return new InterfaceDeclarationSyntax(modifiers, interfaceKeyword, identifier, typeParameterList, heritageClauses, body, /*data:*/ 0);
        }
        heritageClause(kind: SyntaxKind, extendsOrImplementsKeyword: ISyntaxToken, typeNames: ISeparatedSyntaxList<INameSyntax>): HeritageClauseSyntax {
            return new HeritageClauseSyntax(kind, extendsOrImplementsKeyword, typeNames, /*data:*/ 0);
        }
        moduleDeclaration(modifiers: ISyntaxList<ISyntaxToken>, moduleKeyword: ISyntaxToken, name: INameSyntax, stringLiteral: ISyntaxToken, openBraceToken: ISyntaxToken, moduleElements: ISyntaxList<IModuleElementSyntax>, closeBraceToken: ISyntaxToken): ModuleDeclarationSyntax {
            return new ModuleDeclarationSyntax(modifiers, moduleKeyword, name, stringLiteral, openBraceToken, moduleElements, closeBraceToken, /*data:*/ 0);
        }
        functionDeclaration(modifiers: ISyntaxList<ISyntaxToken>, functionKeyword: ISyntaxToken, identifier: ISyntaxToken, callSignature: CallSignatureSyntax, block: BlockSyntax, semicolonToken: ISyntaxToken): FunctionDeclarationSyntax {
            return new FunctionDeclarationSyntax(modifiers, functionKeyword, identifier, callSignature, block, semicolonToken, /*data:*/ 0);
        }
        variableStatement(modifiers: ISyntaxList<ISyntaxToken>, variableDeclaration: VariableDeclarationSyntax, semicolonToken: ISyntaxToken): VariableStatementSyntax {
            return new VariableStatementSyntax(modifiers, variableDeclaration, semicolonToken, /*data:*/ 0);
        }
        variableDeclaration(varKeyword: ISyntaxToken, variableDeclarators: ISeparatedSyntaxList<VariableDeclaratorSyntax>): VariableDeclarationSyntax {
            return new VariableDeclarationSyntax(varKeyword, variableDeclarators, /*data:*/ 0);
        }
        variableDeclarator(propertyName: ISyntaxToken, typeAnnotation: TypeAnnotationSyntax, equalsValueClause: EqualsValueClauseSyntax): VariableDeclaratorSyntax {
            return new VariableDeclaratorSyntax(propertyName, typeAnnotation, equalsValueClause, /*data:*/ 0);
        }
        equalsValueClause(equalsToken: ISyntaxToken, value: IExpressionSyntax): EqualsValueClauseSyntax {
            return new EqualsValueClauseSyntax(equalsToken, value, /*data:*/ 0);
        }
        prefixUnaryExpression(kind: SyntaxKind, operatorToken: ISyntaxToken, operand: IUnaryExpressionSyntax): PrefixUnaryExpressionSyntax {
            return new PrefixUnaryExpressionSyntax(kind, operatorToken, operand, /*data:*/ 0);
        }
        arrayLiteralExpression(openBracketToken: ISyntaxToken, expressions: ISeparatedSyntaxList<IExpressionSyntax>, closeBracketToken: ISyntaxToken): ArrayLiteralExpressionSyntax {
            return new ArrayLiteralExpressionSyntax(openBracketToken, expressions, closeBracketToken, /*data:*/ 0);
        }
        omittedExpression(): OmittedExpressionSyntax {
            return new OmittedExpressionSyntax(/*data:*/ 0);
        }
        parenthesizedExpression(openParenToken: ISyntaxToken, expression: IExpressionSyntax, closeParenToken: ISyntaxToken): ParenthesizedExpressionSyntax {
            return new ParenthesizedExpressionSyntax(openParenToken, expression, closeParenToken, /*data:*/ 0);
        }
        simpleArrowFunctionExpression(identifier: ISyntaxToken, equalsGreaterThanToken: ISyntaxToken, block: BlockSyntax, expression: IExpressionSyntax): SimpleArrowFunctionExpressionSyntax {
            return new SimpleArrowFunctionExpressionSyntax(identifier, equalsGreaterThanToken, block, expression, /*data:*/ 0);
        }
        parenthesizedArrowFunctionExpression(callSignature: CallSignatureSyntax, equalsGreaterThanToken: ISyntaxToken, block: BlockSyntax, expression: IExpressionSyntax): ParenthesizedArrowFunctionExpressionSyntax {
            return new ParenthesizedArrowFunctionExpressionSyntax(callSignature, equalsGreaterThanToken, block, expression, /*data:*/ 0);
        }
        qualifiedName(left: INameSyntax, dotToken: ISyntaxToken, right: ISyntaxToken): QualifiedNameSyntax {
            return new QualifiedNameSyntax(left, dotToken, right, /*data:*/ 0);
        }
        typeArgumentList(lessThanToken: ISyntaxToken, typeArguments: ISeparatedSyntaxList<ITypeSyntax>, greaterThanToken: ISyntaxToken): TypeArgumentListSyntax {
            return new TypeArgumentListSyntax(lessThanToken, typeArguments, greaterThanToken, /*data:*/ 0);
        }
        constructorType(newKeyword: ISyntaxToken, typeParameterList: TypeParameterListSyntax, parameterList: ParameterListSyntax, equalsGreaterThanToken: ISyntaxToken, type: ITypeSyntax): ConstructorTypeSyntax {
            return new ConstructorTypeSyntax(newKeyword, typeParameterList, parameterList, equalsGreaterThanToken, type, /*data:*/ 0);
        }
        functionType(typeParameterList: TypeParameterListSyntax, parameterList: ParameterListSyntax, equalsGreaterThanToken: ISyntaxToken, type: ITypeSyntax): FunctionTypeSyntax {
            return new FunctionTypeSyntax(typeParameterList, parameterList, equalsGreaterThanToken, type, /*data:*/ 0);
        }
        objectType(openBraceToken: ISyntaxToken, typeMembers: ISeparatedSyntaxList<ITypeMemberSyntax>, closeBraceToken: ISyntaxToken): ObjectTypeSyntax {
            return new ObjectTypeSyntax(openBraceToken, typeMembers, closeBraceToken, /*data:*/ 0);
        }
        arrayType(type: ITypeSyntax, openBracketToken: ISyntaxToken, closeBracketToken: ISyntaxToken): ArrayTypeSyntax {
            return new ArrayTypeSyntax(type, openBracketToken, closeBracketToken, /*data:*/ 0);
        }
        genericType(name: INameSyntax, typeArgumentList: TypeArgumentListSyntax): GenericTypeSyntax {
            return new GenericTypeSyntax(name, typeArgumentList, /*data:*/ 0);
        }
        typeQuery(typeOfKeyword: ISyntaxToken, name: INameSyntax): TypeQuerySyntax {
            return new TypeQuerySyntax(typeOfKeyword, name, /*data:*/ 0);
        }
        typeAnnotation(colonToken: ISyntaxToken, type: ITypeSyntax): TypeAnnotationSyntax {
            return new TypeAnnotationSyntax(colonToken, type, /*data:*/ 0);
        }
        block(openBraceToken: ISyntaxToken, statements: ISyntaxList<IStatementSyntax>, closeBraceToken: ISyntaxToken): BlockSyntax {
            return new BlockSyntax(openBraceToken, statements, closeBraceToken, /*data:*/ 0);
        }
        parameter(dotDotDotToken: ISyntaxToken, modifiers: ISyntaxList<ISyntaxToken>, identifier: ISyntaxToken, questionToken: ISyntaxToken, typeAnnotation: TypeAnnotationSyntax, equalsValueClause: EqualsValueClauseSyntax): ParameterSyntax {
            return new ParameterSyntax(dotDotDotToken, modifiers, identifier, questionToken, typeAnnotation, equalsValueClause, /*data:*/ 0);
        }
        memberAccessExpression(expression: ILeftHandSideExpressionSyntax, dotToken: ISyntaxToken, name: ISyntaxToken): MemberAccessExpressionSyntax {
            return new MemberAccessExpressionSyntax(expression, dotToken, name, /*data:*/ 0);
        }
        postfixUnaryExpression(kind: SyntaxKind, operand: ILeftHandSideExpressionSyntax, operatorToken: ISyntaxToken): PostfixUnaryExpressionSyntax {
            return new PostfixUnaryExpressionSyntax(kind, operand, operatorToken, /*data:*/ 0);
        }
        elementAccessExpression(expression: ILeftHandSideExpressionSyntax, openBracketToken: ISyntaxToken, argumentExpression: IExpressionSyntax, closeBracketToken: ISyntaxToken): ElementAccessExpressionSyntax {
            return new ElementAccessExpressionSyntax(expression, openBracketToken, argumentExpression, closeBracketToken, /*data:*/ 0);
        }
        invocationExpression(expression: ILeftHandSideExpressionSyntax, argumentList: ArgumentListSyntax): InvocationExpressionSyntax {
            return new InvocationExpressionSyntax(expression, argumentList, /*data:*/ 0);
        }
        argumentList(typeArgumentList: TypeArgumentListSyntax, openParenToken: ISyntaxToken, _arguments: ISeparatedSyntaxList<IExpressionSyntax>, closeParenToken: ISyntaxToken): ArgumentListSyntax {
            return new ArgumentListSyntax(typeArgumentList, openParenToken, _arguments, closeParenToken, /*data:*/ 0);
        }
        binaryExpression(kind: SyntaxKind, left: IExpressionSyntax, operatorToken: ISyntaxToken, right: IExpressionSyntax): BinaryExpressionSyntax {
            return new BinaryExpressionSyntax(kind, left, operatorToken, right, /*data:*/ 0);
        }
        conditionalExpression(condition: IExpressionSyntax, questionToken: ISyntaxToken, whenTrue: IExpressionSyntax, colonToken: ISyntaxToken, whenFalse: IExpressionSyntax): ConditionalExpressionSyntax {
            return new ConditionalExpressionSyntax(condition, questionToken, whenTrue, colonToken, whenFalse, /*data:*/ 0);
        }
        constructSignature(newKeyword: ISyntaxToken, callSignature: CallSignatureSyntax): ConstructSignatureSyntax {
            return new ConstructSignatureSyntax(newKeyword, callSignature, /*data:*/ 0);
        }
        methodSignature(propertyName: ISyntaxToken, questionToken: ISyntaxToken, callSignature: CallSignatureSyntax): MethodSignatureSyntax {
            return new MethodSignatureSyntax(propertyName, questionToken, callSignature, /*data:*/ 0);
        }
        indexSignature(openBracketToken: ISyntaxToken, parameter: ParameterSyntax, closeBracketToken: ISyntaxToken, typeAnnotation: TypeAnnotationSyntax): IndexSignatureSyntax {
            return new IndexSignatureSyntax(openBracketToken, parameter, closeBracketToken, typeAnnotation, /*data:*/ 0);
        }
        propertySignature(propertyName: ISyntaxToken, questionToken: ISyntaxToken, typeAnnotation: TypeAnnotationSyntax): PropertySignatureSyntax {
            return new PropertySignatureSyntax(propertyName, questionToken, typeAnnotation, /*data:*/ 0);
        }
        callSignature(typeParameterList: TypeParameterListSyntax, parameterList: ParameterListSyntax, typeAnnotation: TypeAnnotationSyntax): CallSignatureSyntax {
            return new CallSignatureSyntax(typeParameterList, parameterList, typeAnnotation, /*data:*/ 0);
        }
        parameterList(openParenToken: ISyntaxToken, parameters: ISeparatedSyntaxList<ParameterSyntax>, closeParenToken: ISyntaxToken): ParameterListSyntax {
            return new ParameterListSyntax(openParenToken, parameters, closeParenToken, /*data:*/ 0);
        }
        typeParameterList(lessThanToken: ISyntaxToken, typeParameters: ISeparatedSyntaxList<TypeParameterSyntax>, greaterThanToken: ISyntaxToken): TypeParameterListSyntax {
            return new TypeParameterListSyntax(lessThanToken, typeParameters, greaterThanToken, /*data:*/ 0);
        }
        typeParameter(identifier: ISyntaxToken, constraint: ConstraintSyntax): TypeParameterSyntax {
            return new TypeParameterSyntax(identifier, constraint, /*data:*/ 0);
        }
        constraint(extendsKeyword: ISyntaxToken, type: ITypeSyntax): ConstraintSyntax {
            return new ConstraintSyntax(extendsKeyword, type, /*data:*/ 0);
        }
        elseClause(elseKeyword: ISyntaxToken, statement: IStatementSyntax): ElseClauseSyntax {
            return new ElseClauseSyntax(elseKeyword, statement, /*data:*/ 0);
        }
        ifStatement(ifKeyword: ISyntaxToken, openParenToken: ISyntaxToken, condition: IExpressionSyntax, closeParenToken: ISyntaxToken, statement: IStatementSyntax, elseClause: ElseClauseSyntax): IfStatementSyntax {
            return new IfStatementSyntax(ifKeyword, openParenToken, condition, closeParenToken, statement, elseClause, /*data:*/ 0);
        }
        expressionStatement(expression: IExpressionSyntax, semicolonToken: ISyntaxToken): ExpressionStatementSyntax {
            return new ExpressionStatementSyntax(expression, semicolonToken, /*data:*/ 0);
        }
        constructorDeclaration(modifiers: ISyntaxList<ISyntaxToken>, constructorKeyword: ISyntaxToken, callSignature: CallSignatureSyntax, block: BlockSyntax, semicolonToken: ISyntaxToken): ConstructorDeclarationSyntax {
            return new ConstructorDeclarationSyntax(modifiers, constructorKeyword, callSignature, block, semicolonToken, /*data:*/ 0);
        }
        memberFunctionDeclaration(modifiers: ISyntaxList<ISyntaxToken>, propertyName: ISyntaxToken, callSignature: CallSignatureSyntax, block: BlockSyntax, semicolonToken: ISyntaxToken): MemberFunctionDeclarationSyntax {
            return new MemberFunctionDeclarationSyntax(modifiers, propertyName, callSignature, block, semicolonToken, /*data:*/ 0);
        }
        getAccessor(modifiers: ISyntaxList<ISyntaxToken>, getKeyword: ISyntaxToken, propertyName: ISyntaxToken, parameterList: ParameterListSyntax, typeAnnotation: TypeAnnotationSyntax, block: BlockSyntax): GetAccessorSyntax {
            return new GetAccessorSyntax(modifiers, getKeyword, propertyName, parameterList, typeAnnotation, block, /*data:*/ 0);
        }
        setAccessor(modifiers: ISyntaxList<ISyntaxToken>, setKeyword: ISyntaxToken, propertyName: ISyntaxToken, parameterList: ParameterListSyntax, block: BlockSyntax): SetAccessorSyntax {
            return new SetAccessorSyntax(modifiers, setKeyword, propertyName, parameterList, block, /*data:*/ 0);
        }
        memberVariableDeclaration(modifiers: ISyntaxList<ISyntaxToken>, variableDeclarator: VariableDeclaratorSyntax, semicolonToken: ISyntaxToken): MemberVariableDeclarationSyntax {
            return new MemberVariableDeclarationSyntax(modifiers, variableDeclarator, semicolonToken, /*data:*/ 0);
        }
        indexMemberDeclaration(modifiers: ISyntaxList<ISyntaxToken>, indexSignature: IndexSignatureSyntax, semicolonToken: ISyntaxToken): IndexMemberDeclarationSyntax {
            return new IndexMemberDeclarationSyntax(modifiers, indexSignature, semicolonToken, /*data:*/ 0);
        }
        throwStatement(throwKeyword: ISyntaxToken, expression: IExpressionSyntax, semicolonToken: ISyntaxToken): ThrowStatementSyntax {
            return new ThrowStatementSyntax(throwKeyword, expression, semicolonToken, /*data:*/ 0);
        }
        returnStatement(returnKeyword: ISyntaxToken, expression: IExpressionSyntax, semicolonToken: ISyntaxToken): ReturnStatementSyntax {
            return new ReturnStatementSyntax(returnKeyword, expression, semicolonToken, /*data:*/ 0);
        }
        objectCreationExpression(newKeyword: ISyntaxToken, expression: IMemberExpressionSyntax, argumentList: ArgumentListSyntax): ObjectCreationExpressionSyntax {
            return new ObjectCreationExpressionSyntax(newKeyword, expression, argumentList, /*data:*/ 0);
        }
        switchStatement(switchKeyword: ISyntaxToken, openParenToken: ISyntaxToken, expression: IExpressionSyntax, closeParenToken: ISyntaxToken, openBraceToken: ISyntaxToken, switchClauses: ISyntaxList<ISwitchClauseSyntax>, closeBraceToken: ISyntaxToken): SwitchStatementSyntax {
            return new SwitchStatementSyntax(switchKeyword, openParenToken, expression, closeParenToken, openBraceToken, switchClauses, closeBraceToken, /*data:*/ 0);
        }
        caseSwitchClause(caseKeyword: ISyntaxToken, expression: IExpressionSyntax, colonToken: ISyntaxToken, statements: ISyntaxList<IStatementSyntax>): CaseSwitchClauseSyntax {
            return new CaseSwitchClauseSyntax(caseKeyword, expression, colonToken, statements, /*data:*/ 0);
        }
        defaultSwitchClause(defaultKeyword: ISyntaxToken, colonToken: ISyntaxToken, statements: ISyntaxList<IStatementSyntax>): DefaultSwitchClauseSyntax {
            return new DefaultSwitchClauseSyntax(defaultKeyword, colonToken, statements, /*data:*/ 0);
        }
        breakStatement(breakKeyword: ISyntaxToken, identifier: ISyntaxToken, semicolonToken: ISyntaxToken): BreakStatementSyntax {
            return new BreakStatementSyntax(breakKeyword, identifier, semicolonToken, /*data:*/ 0);
        }
        continueStatement(continueKeyword: ISyntaxToken, identifier: ISyntaxToken, semicolonToken: ISyntaxToken): ContinueStatementSyntax {
            return new ContinueStatementSyntax(continueKeyword, identifier, semicolonToken, /*data:*/ 0);
        }
        forStatement(forKeyword: ISyntaxToken, openParenToken: ISyntaxToken, variableDeclaration: VariableDeclarationSyntax, initializer: IExpressionSyntax, firstSemicolonToken: ISyntaxToken, condition: IExpressionSyntax, secondSemicolonToken: ISyntaxToken, incrementor: IExpressionSyntax, closeParenToken: ISyntaxToken, statement: IStatementSyntax): ForStatementSyntax {
            return new ForStatementSyntax(forKeyword, openParenToken, variableDeclaration, initializer, firstSemicolonToken, condition, secondSemicolonToken, incrementor, closeParenToken, statement, /*data:*/ 0);
        }
        forInStatement(forKeyword: ISyntaxToken, openParenToken: ISyntaxToken, variableDeclaration: VariableDeclarationSyntax, left: IExpressionSyntax, inKeyword: ISyntaxToken, expression: IExpressionSyntax, closeParenToken: ISyntaxToken, statement: IStatementSyntax): ForInStatementSyntax {
            return new ForInStatementSyntax(forKeyword, openParenToken, variableDeclaration, left, inKeyword, expression, closeParenToken, statement, /*data:*/ 0);
        }
        whileStatement(whileKeyword: ISyntaxToken, openParenToken: ISyntaxToken, condition: IExpressionSyntax, closeParenToken: ISyntaxToken, statement: IStatementSyntax): WhileStatementSyntax {
            return new WhileStatementSyntax(whileKeyword, openParenToken, condition, closeParenToken, statement, /*data:*/ 0);
        }
        withStatement(withKeyword: ISyntaxToken, openParenToken: ISyntaxToken, condition: IExpressionSyntax, closeParenToken: ISyntaxToken, statement: IStatementSyntax): WithStatementSyntax {
            return new WithStatementSyntax(withKeyword, openParenToken, condition, closeParenToken, statement, /*data:*/ 0);
        }
        enumDeclaration(modifiers: ISyntaxList<ISyntaxToken>, enumKeyword: ISyntaxToken, identifier: ISyntaxToken, openBraceToken: ISyntaxToken, enumElements: ISeparatedSyntaxList<EnumElementSyntax>, closeBraceToken: ISyntaxToken): EnumDeclarationSyntax {
            return new EnumDeclarationSyntax(modifiers, enumKeyword, identifier, openBraceToken, enumElements, closeBraceToken, /*data:*/ 0);
        }
        enumElement(propertyName: ISyntaxToken, equalsValueClause: EqualsValueClauseSyntax): EnumElementSyntax {
            return new EnumElementSyntax(propertyName, equalsValueClause, /*data:*/ 0);
        }
        castExpression(lessThanToken: ISyntaxToken, type: ITypeSyntax, greaterThanToken: ISyntaxToken, expression: IUnaryExpressionSyntax): CastExpressionSyntax {
            return new CastExpressionSyntax(lessThanToken, type, greaterThanToken, expression, /*data:*/ 0);
        }
        objectLiteralExpression(openBraceToken: ISyntaxToken, propertyAssignments: ISeparatedSyntaxList<IPropertyAssignmentSyntax>, closeBraceToken: ISyntaxToken): ObjectLiteralExpressionSyntax {
            return new ObjectLiteralExpressionSyntax(openBraceToken, propertyAssignments, closeBraceToken, /*data:*/ 0);
        }
        simplePropertyAssignment(propertyName: ISyntaxToken, colonToken: ISyntaxToken, expression: IExpressionSyntax): SimplePropertyAssignmentSyntax {
            return new SimplePropertyAssignmentSyntax(propertyName, colonToken, expression, /*data:*/ 0);
        }
        functionPropertyAssignment(propertyName: ISyntaxToken, callSignature: CallSignatureSyntax, block: BlockSyntax): FunctionPropertyAssignmentSyntax {
            return new FunctionPropertyAssignmentSyntax(propertyName, callSignature, block, /*data:*/ 0);
        }
        functionExpression(functionKeyword: ISyntaxToken, identifier: ISyntaxToken, callSignature: CallSignatureSyntax, block: BlockSyntax): FunctionExpressionSyntax {
            return new FunctionExpressionSyntax(functionKeyword, identifier, callSignature, block, /*data:*/ 0);
        }
        emptyStatement(semicolonToken: ISyntaxToken): EmptyStatementSyntax {
            return new EmptyStatementSyntax(semicolonToken, /*data:*/ 0);
        }
        tryStatement(tryKeyword: ISyntaxToken, block: BlockSyntax, catchClause: CatchClauseSyntax, finallyClause: FinallyClauseSyntax): TryStatementSyntax {
            return new TryStatementSyntax(tryKeyword, block, catchClause, finallyClause, /*data:*/ 0);
        }
        catchClause(catchKeyword: ISyntaxToken, openParenToken: ISyntaxToken, identifier: ISyntaxToken, typeAnnotation: TypeAnnotationSyntax, closeParenToken: ISyntaxToken, block: BlockSyntax): CatchClauseSyntax {
            return new CatchClauseSyntax(catchKeyword, openParenToken, identifier, typeAnnotation, closeParenToken, block, /*data:*/ 0);
        }
        finallyClause(finallyKeyword: ISyntaxToken, block: BlockSyntax): FinallyClauseSyntax {
            return new FinallyClauseSyntax(finallyKeyword, block, /*data:*/ 0);
        }
        labeledStatement(identifier: ISyntaxToken, colonToken: ISyntaxToken, statement: IStatementSyntax): LabeledStatementSyntax {
            return new LabeledStatementSyntax(identifier, colonToken, statement, /*data:*/ 0);
        }
        doStatement(doKeyword: ISyntaxToken, statement: IStatementSyntax, whileKeyword: ISyntaxToken, openParenToken: ISyntaxToken, condition: IExpressionSyntax, closeParenToken: ISyntaxToken, semicolonToken: ISyntaxToken): DoStatementSyntax {
            return new DoStatementSyntax(doKeyword, statement, whileKeyword, openParenToken, condition, closeParenToken, semicolonToken, /*data:*/ 0);
        }
        typeOfExpression(typeOfKeyword: ISyntaxToken, expression: IUnaryExpressionSyntax): TypeOfExpressionSyntax {
            return new TypeOfExpressionSyntax(typeOfKeyword, expression, /*data:*/ 0);
        }
        deleteExpression(deleteKeyword: ISyntaxToken, expression: IUnaryExpressionSyntax): DeleteExpressionSyntax {
            return new DeleteExpressionSyntax(deleteKeyword, expression, /*data:*/ 0);
        }
        voidExpression(voidKeyword: ISyntaxToken, expression: IUnaryExpressionSyntax): VoidExpressionSyntax {
            return new VoidExpressionSyntax(voidKeyword, expression, /*data:*/ 0);
        }
        debuggerStatement(debuggerKeyword: ISyntaxToken, semicolonToken: ISyntaxToken): DebuggerStatementSyntax {
            return new DebuggerStatementSyntax(debuggerKeyword, semicolonToken, /*data:*/ 0);
        }
    }

    export class StrictModeFactory implements IFactory {
        sourceUnit(moduleElements: ISyntaxList<IModuleElementSyntax>, endOfFileToken: ISyntaxToken): SourceUnitSyntax {
            return new SourceUnitSyntax(moduleElements, endOfFileToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        externalModuleReference(requireKeyword: ISyntaxToken, openParenToken: ISyntaxToken, stringLiteral: ISyntaxToken, closeParenToken: ISyntaxToken): ExternalModuleReferenceSyntax {
            return new ExternalModuleReferenceSyntax(requireKeyword, openParenToken, stringLiteral, closeParenToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        moduleNameModuleReference(moduleName: INameSyntax): ModuleNameModuleReferenceSyntax {
            return new ModuleNameModuleReferenceSyntax(moduleName, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        importDeclaration(modifiers: ISyntaxList<ISyntaxToken>, importKeyword: ISyntaxToken, identifier: ISyntaxToken, equalsToken: ISyntaxToken, moduleReference: IModuleReferenceSyntax, semicolonToken: ISyntaxToken): ImportDeclarationSyntax {
            return new ImportDeclarationSyntax(modifiers, importKeyword, identifier, equalsToken, moduleReference, semicolonToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        exportAssignment(exportKeyword: ISyntaxToken, equalsToken: ISyntaxToken, identifier: ISyntaxToken, semicolonToken: ISyntaxToken): ExportAssignmentSyntax {
            return new ExportAssignmentSyntax(exportKeyword, equalsToken, identifier, semicolonToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        classDeclaration(modifiers: ISyntaxList<ISyntaxToken>, classKeyword: ISyntaxToken, identifier: ISyntaxToken, typeParameterList: TypeParameterListSyntax, heritageClauses: ISyntaxList<HeritageClauseSyntax>, openBraceToken: ISyntaxToken, classElements: ISyntaxList<IClassElementSyntax>, closeBraceToken: ISyntaxToken): ClassDeclarationSyntax {
            return new ClassDeclarationSyntax(modifiers, classKeyword, identifier, typeParameterList, heritageClauses, openBraceToken, classElements, closeBraceToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        interfaceDeclaration(modifiers: ISyntaxList<ISyntaxToken>, interfaceKeyword: ISyntaxToken, identifier: ISyntaxToken, typeParameterList: TypeParameterListSyntax, heritageClauses: ISyntaxList<HeritageClauseSyntax>, body: ObjectTypeSyntax): InterfaceDeclarationSyntax {
            return new InterfaceDeclarationSyntax(modifiers, interfaceKeyword, identifier, typeParameterList, heritageClauses, body, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        heritageClause(kind: SyntaxKind, extendsOrImplementsKeyword: ISyntaxToken, typeNames: ISeparatedSyntaxList<INameSyntax>): HeritageClauseSyntax {
            return new HeritageClauseSyntax(kind, extendsOrImplementsKeyword, typeNames, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        moduleDeclaration(modifiers: ISyntaxList<ISyntaxToken>, moduleKeyword: ISyntaxToken, name: INameSyntax, stringLiteral: ISyntaxToken, openBraceToken: ISyntaxToken, moduleElements: ISyntaxList<IModuleElementSyntax>, closeBraceToken: ISyntaxToken): ModuleDeclarationSyntax {
            return new ModuleDeclarationSyntax(modifiers, moduleKeyword, name, stringLiteral, openBraceToken, moduleElements, closeBraceToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        functionDeclaration(modifiers: ISyntaxList<ISyntaxToken>, functionKeyword: ISyntaxToken, identifier: ISyntaxToken, callSignature: CallSignatureSyntax, block: BlockSyntax, semicolonToken: ISyntaxToken): FunctionDeclarationSyntax {
            return new FunctionDeclarationSyntax(modifiers, functionKeyword, identifier, callSignature, block, semicolonToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        variableStatement(modifiers: ISyntaxList<ISyntaxToken>, variableDeclaration: VariableDeclarationSyntax, semicolonToken: ISyntaxToken): VariableStatementSyntax {
            return new VariableStatementSyntax(modifiers, variableDeclaration, semicolonToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        variableDeclaration(varKeyword: ISyntaxToken, variableDeclarators: ISeparatedSyntaxList<VariableDeclaratorSyntax>): VariableDeclarationSyntax {
            return new VariableDeclarationSyntax(varKeyword, variableDeclarators, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        variableDeclarator(propertyName: ISyntaxToken, typeAnnotation: TypeAnnotationSyntax, equalsValueClause: EqualsValueClauseSyntax): VariableDeclaratorSyntax {
            return new VariableDeclaratorSyntax(propertyName, typeAnnotation, equalsValueClause, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        equalsValueClause(equalsToken: ISyntaxToken, value: IExpressionSyntax): EqualsValueClauseSyntax {
            return new EqualsValueClauseSyntax(equalsToken, value, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        prefixUnaryExpression(kind: SyntaxKind, operatorToken: ISyntaxToken, operand: IUnaryExpressionSyntax): PrefixUnaryExpressionSyntax {
            return new PrefixUnaryExpressionSyntax(kind, operatorToken, operand, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        arrayLiteralExpression(openBracketToken: ISyntaxToken, expressions: ISeparatedSyntaxList<IExpressionSyntax>, closeBracketToken: ISyntaxToken): ArrayLiteralExpressionSyntax {
            return new ArrayLiteralExpressionSyntax(openBracketToken, expressions, closeBracketToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        omittedExpression(): OmittedExpressionSyntax {
            return new OmittedExpressionSyntax(/*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        parenthesizedExpression(openParenToken: ISyntaxToken, expression: IExpressionSyntax, closeParenToken: ISyntaxToken): ParenthesizedExpressionSyntax {
            return new ParenthesizedExpressionSyntax(openParenToken, expression, closeParenToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        simpleArrowFunctionExpression(identifier: ISyntaxToken, equalsGreaterThanToken: ISyntaxToken, block: BlockSyntax, expression: IExpressionSyntax): SimpleArrowFunctionExpressionSyntax {
            return new SimpleArrowFunctionExpressionSyntax(identifier, equalsGreaterThanToken, block, expression, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        parenthesizedArrowFunctionExpression(callSignature: CallSignatureSyntax, equalsGreaterThanToken: ISyntaxToken, block: BlockSyntax, expression: IExpressionSyntax): ParenthesizedArrowFunctionExpressionSyntax {
            return new ParenthesizedArrowFunctionExpressionSyntax(callSignature, equalsGreaterThanToken, block, expression, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        qualifiedName(left: INameSyntax, dotToken: ISyntaxToken, right: ISyntaxToken): QualifiedNameSyntax {
            return new QualifiedNameSyntax(left, dotToken, right, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        typeArgumentList(lessThanToken: ISyntaxToken, typeArguments: ISeparatedSyntaxList<ITypeSyntax>, greaterThanToken: ISyntaxToken): TypeArgumentListSyntax {
            return new TypeArgumentListSyntax(lessThanToken, typeArguments, greaterThanToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        constructorType(newKeyword: ISyntaxToken, typeParameterList: TypeParameterListSyntax, parameterList: ParameterListSyntax, equalsGreaterThanToken: ISyntaxToken, type: ITypeSyntax): ConstructorTypeSyntax {
            return new ConstructorTypeSyntax(newKeyword, typeParameterList, parameterList, equalsGreaterThanToken, type, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        functionType(typeParameterList: TypeParameterListSyntax, parameterList: ParameterListSyntax, equalsGreaterThanToken: ISyntaxToken, type: ITypeSyntax): FunctionTypeSyntax {
            return new FunctionTypeSyntax(typeParameterList, parameterList, equalsGreaterThanToken, type, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        objectType(openBraceToken: ISyntaxToken, typeMembers: ISeparatedSyntaxList<ITypeMemberSyntax>, closeBraceToken: ISyntaxToken): ObjectTypeSyntax {
            return new ObjectTypeSyntax(openBraceToken, typeMembers, closeBraceToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        arrayType(type: ITypeSyntax, openBracketToken: ISyntaxToken, closeBracketToken: ISyntaxToken): ArrayTypeSyntax {
            return new ArrayTypeSyntax(type, openBracketToken, closeBracketToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        genericType(name: INameSyntax, typeArgumentList: TypeArgumentListSyntax): GenericTypeSyntax {
            return new GenericTypeSyntax(name, typeArgumentList, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        typeQuery(typeOfKeyword: ISyntaxToken, name: INameSyntax): TypeQuerySyntax {
            return new TypeQuerySyntax(typeOfKeyword, name, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        typeAnnotation(colonToken: ISyntaxToken, type: ITypeSyntax): TypeAnnotationSyntax {
            return new TypeAnnotationSyntax(colonToken, type, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        block(openBraceToken: ISyntaxToken, statements: ISyntaxList<IStatementSyntax>, closeBraceToken: ISyntaxToken): BlockSyntax {
            return new BlockSyntax(openBraceToken, statements, closeBraceToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        parameter(dotDotDotToken: ISyntaxToken, modifiers: ISyntaxList<ISyntaxToken>, identifier: ISyntaxToken, questionToken: ISyntaxToken, typeAnnotation: TypeAnnotationSyntax, equalsValueClause: EqualsValueClauseSyntax): ParameterSyntax {
            return new ParameterSyntax(dotDotDotToken, modifiers, identifier, questionToken, typeAnnotation, equalsValueClause, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        memberAccessExpression(expression: ILeftHandSideExpressionSyntax, dotToken: ISyntaxToken, name: ISyntaxToken): MemberAccessExpressionSyntax {
            return new MemberAccessExpressionSyntax(expression, dotToken, name, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        postfixUnaryExpression(kind: SyntaxKind, operand: ILeftHandSideExpressionSyntax, operatorToken: ISyntaxToken): PostfixUnaryExpressionSyntax {
            return new PostfixUnaryExpressionSyntax(kind, operand, operatorToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        elementAccessExpression(expression: ILeftHandSideExpressionSyntax, openBracketToken: ISyntaxToken, argumentExpression: IExpressionSyntax, closeBracketToken: ISyntaxToken): ElementAccessExpressionSyntax {
            return new ElementAccessExpressionSyntax(expression, openBracketToken, argumentExpression, closeBracketToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        invocationExpression(expression: ILeftHandSideExpressionSyntax, argumentList: ArgumentListSyntax): InvocationExpressionSyntax {
            return new InvocationExpressionSyntax(expression, argumentList, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        argumentList(typeArgumentList: TypeArgumentListSyntax, openParenToken: ISyntaxToken, _arguments: ISeparatedSyntaxList<IExpressionSyntax>, closeParenToken: ISyntaxToken): ArgumentListSyntax {
            return new ArgumentListSyntax(typeArgumentList, openParenToken, _arguments, closeParenToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        binaryExpression(kind: SyntaxKind, left: IExpressionSyntax, operatorToken: ISyntaxToken, right: IExpressionSyntax): BinaryExpressionSyntax {
            return new BinaryExpressionSyntax(kind, left, operatorToken, right, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        conditionalExpression(condition: IExpressionSyntax, questionToken: ISyntaxToken, whenTrue: IExpressionSyntax, colonToken: ISyntaxToken, whenFalse: IExpressionSyntax): ConditionalExpressionSyntax {
            return new ConditionalExpressionSyntax(condition, questionToken, whenTrue, colonToken, whenFalse, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        constructSignature(newKeyword: ISyntaxToken, callSignature: CallSignatureSyntax): ConstructSignatureSyntax {
            return new ConstructSignatureSyntax(newKeyword, callSignature, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        methodSignature(propertyName: ISyntaxToken, questionToken: ISyntaxToken, callSignature: CallSignatureSyntax): MethodSignatureSyntax {
            return new MethodSignatureSyntax(propertyName, questionToken, callSignature, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        indexSignature(openBracketToken: ISyntaxToken, parameter: ParameterSyntax, closeBracketToken: ISyntaxToken, typeAnnotation: TypeAnnotationSyntax): IndexSignatureSyntax {
            return new IndexSignatureSyntax(openBracketToken, parameter, closeBracketToken, typeAnnotation, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        propertySignature(propertyName: ISyntaxToken, questionToken: ISyntaxToken, typeAnnotation: TypeAnnotationSyntax): PropertySignatureSyntax {
            return new PropertySignatureSyntax(propertyName, questionToken, typeAnnotation, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        callSignature(typeParameterList: TypeParameterListSyntax, parameterList: ParameterListSyntax, typeAnnotation: TypeAnnotationSyntax): CallSignatureSyntax {
            return new CallSignatureSyntax(typeParameterList, parameterList, typeAnnotation, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        parameterList(openParenToken: ISyntaxToken, parameters: ISeparatedSyntaxList<ParameterSyntax>, closeParenToken: ISyntaxToken): ParameterListSyntax {
            return new ParameterListSyntax(openParenToken, parameters, closeParenToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        typeParameterList(lessThanToken: ISyntaxToken, typeParameters: ISeparatedSyntaxList<TypeParameterSyntax>, greaterThanToken: ISyntaxToken): TypeParameterListSyntax {
            return new TypeParameterListSyntax(lessThanToken, typeParameters, greaterThanToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        typeParameter(identifier: ISyntaxToken, constraint: ConstraintSyntax): TypeParameterSyntax {
            return new TypeParameterSyntax(identifier, constraint, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        constraint(extendsKeyword: ISyntaxToken, type: ITypeSyntax): ConstraintSyntax {
            return new ConstraintSyntax(extendsKeyword, type, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        elseClause(elseKeyword: ISyntaxToken, statement: IStatementSyntax): ElseClauseSyntax {
            return new ElseClauseSyntax(elseKeyword, statement, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        ifStatement(ifKeyword: ISyntaxToken, openParenToken: ISyntaxToken, condition: IExpressionSyntax, closeParenToken: ISyntaxToken, statement: IStatementSyntax, elseClause: ElseClauseSyntax): IfStatementSyntax {
            return new IfStatementSyntax(ifKeyword, openParenToken, condition, closeParenToken, statement, elseClause, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        expressionStatement(expression: IExpressionSyntax, semicolonToken: ISyntaxToken): ExpressionStatementSyntax {
            return new ExpressionStatementSyntax(expression, semicolonToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        constructorDeclaration(modifiers: ISyntaxList<ISyntaxToken>, constructorKeyword: ISyntaxToken, callSignature: CallSignatureSyntax, block: BlockSyntax, semicolonToken: ISyntaxToken): ConstructorDeclarationSyntax {
            return new ConstructorDeclarationSyntax(modifiers, constructorKeyword, callSignature, block, semicolonToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        memberFunctionDeclaration(modifiers: ISyntaxList<ISyntaxToken>, propertyName: ISyntaxToken, callSignature: CallSignatureSyntax, block: BlockSyntax, semicolonToken: ISyntaxToken): MemberFunctionDeclarationSyntax {
            return new MemberFunctionDeclarationSyntax(modifiers, propertyName, callSignature, block, semicolonToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        getAccessor(modifiers: ISyntaxList<ISyntaxToken>, getKeyword: ISyntaxToken, propertyName: ISyntaxToken, parameterList: ParameterListSyntax, typeAnnotation: TypeAnnotationSyntax, block: BlockSyntax): GetAccessorSyntax {
            return new GetAccessorSyntax(modifiers, getKeyword, propertyName, parameterList, typeAnnotation, block, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        setAccessor(modifiers: ISyntaxList<ISyntaxToken>, setKeyword: ISyntaxToken, propertyName: ISyntaxToken, parameterList: ParameterListSyntax, block: BlockSyntax): SetAccessorSyntax {
            return new SetAccessorSyntax(modifiers, setKeyword, propertyName, parameterList, block, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        memberVariableDeclaration(modifiers: ISyntaxList<ISyntaxToken>, variableDeclarator: VariableDeclaratorSyntax, semicolonToken: ISyntaxToken): MemberVariableDeclarationSyntax {
            return new MemberVariableDeclarationSyntax(modifiers, variableDeclarator, semicolonToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        indexMemberDeclaration(modifiers: ISyntaxList<ISyntaxToken>, indexSignature: IndexSignatureSyntax, semicolonToken: ISyntaxToken): IndexMemberDeclarationSyntax {
            return new IndexMemberDeclarationSyntax(modifiers, indexSignature, semicolonToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        throwStatement(throwKeyword: ISyntaxToken, expression: IExpressionSyntax, semicolonToken: ISyntaxToken): ThrowStatementSyntax {
            return new ThrowStatementSyntax(throwKeyword, expression, semicolonToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        returnStatement(returnKeyword: ISyntaxToken, expression: IExpressionSyntax, semicolonToken: ISyntaxToken): ReturnStatementSyntax {
            return new ReturnStatementSyntax(returnKeyword, expression, semicolonToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        objectCreationExpression(newKeyword: ISyntaxToken, expression: IMemberExpressionSyntax, argumentList: ArgumentListSyntax): ObjectCreationExpressionSyntax {
            return new ObjectCreationExpressionSyntax(newKeyword, expression, argumentList, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        switchStatement(switchKeyword: ISyntaxToken, openParenToken: ISyntaxToken, expression: IExpressionSyntax, closeParenToken: ISyntaxToken, openBraceToken: ISyntaxToken, switchClauses: ISyntaxList<ISwitchClauseSyntax>, closeBraceToken: ISyntaxToken): SwitchStatementSyntax {
            return new SwitchStatementSyntax(switchKeyword, openParenToken, expression, closeParenToken, openBraceToken, switchClauses, closeBraceToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        caseSwitchClause(caseKeyword: ISyntaxToken, expression: IExpressionSyntax, colonToken: ISyntaxToken, statements: ISyntaxList<IStatementSyntax>): CaseSwitchClauseSyntax {
            return new CaseSwitchClauseSyntax(caseKeyword, expression, colonToken, statements, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        defaultSwitchClause(defaultKeyword: ISyntaxToken, colonToken: ISyntaxToken, statements: ISyntaxList<IStatementSyntax>): DefaultSwitchClauseSyntax {
            return new DefaultSwitchClauseSyntax(defaultKeyword, colonToken, statements, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        breakStatement(breakKeyword: ISyntaxToken, identifier: ISyntaxToken, semicolonToken: ISyntaxToken): BreakStatementSyntax {
            return new BreakStatementSyntax(breakKeyword, identifier, semicolonToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        continueStatement(continueKeyword: ISyntaxToken, identifier: ISyntaxToken, semicolonToken: ISyntaxToken): ContinueStatementSyntax {
            return new ContinueStatementSyntax(continueKeyword, identifier, semicolonToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        forStatement(forKeyword: ISyntaxToken, openParenToken: ISyntaxToken, variableDeclaration: VariableDeclarationSyntax, initializer: IExpressionSyntax, firstSemicolonToken: ISyntaxToken, condition: IExpressionSyntax, secondSemicolonToken: ISyntaxToken, incrementor: IExpressionSyntax, closeParenToken: ISyntaxToken, statement: IStatementSyntax): ForStatementSyntax {
            return new ForStatementSyntax(forKeyword, openParenToken, variableDeclaration, initializer, firstSemicolonToken, condition, secondSemicolonToken, incrementor, closeParenToken, statement, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        forInStatement(forKeyword: ISyntaxToken, openParenToken: ISyntaxToken, variableDeclaration: VariableDeclarationSyntax, left: IExpressionSyntax, inKeyword: ISyntaxToken, expression: IExpressionSyntax, closeParenToken: ISyntaxToken, statement: IStatementSyntax): ForInStatementSyntax {
            return new ForInStatementSyntax(forKeyword, openParenToken, variableDeclaration, left, inKeyword, expression, closeParenToken, statement, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        whileStatement(whileKeyword: ISyntaxToken, openParenToken: ISyntaxToken, condition: IExpressionSyntax, closeParenToken: ISyntaxToken, statement: IStatementSyntax): WhileStatementSyntax {
            return new WhileStatementSyntax(whileKeyword, openParenToken, condition, closeParenToken, statement, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        withStatement(withKeyword: ISyntaxToken, openParenToken: ISyntaxToken, condition: IExpressionSyntax, closeParenToken: ISyntaxToken, statement: IStatementSyntax): WithStatementSyntax {
            return new WithStatementSyntax(withKeyword, openParenToken, condition, closeParenToken, statement, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        enumDeclaration(modifiers: ISyntaxList<ISyntaxToken>, enumKeyword: ISyntaxToken, identifier: ISyntaxToken, openBraceToken: ISyntaxToken, enumElements: ISeparatedSyntaxList<EnumElementSyntax>, closeBraceToken: ISyntaxToken): EnumDeclarationSyntax {
            return new EnumDeclarationSyntax(modifiers, enumKeyword, identifier, openBraceToken, enumElements, closeBraceToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        enumElement(propertyName: ISyntaxToken, equalsValueClause: EqualsValueClauseSyntax): EnumElementSyntax {
            return new EnumElementSyntax(propertyName, equalsValueClause, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        castExpression(lessThanToken: ISyntaxToken, type: ITypeSyntax, greaterThanToken: ISyntaxToken, expression: IUnaryExpressionSyntax): CastExpressionSyntax {
            return new CastExpressionSyntax(lessThanToken, type, greaterThanToken, expression, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        objectLiteralExpression(openBraceToken: ISyntaxToken, propertyAssignments: ISeparatedSyntaxList<IPropertyAssignmentSyntax>, closeBraceToken: ISyntaxToken): ObjectLiteralExpressionSyntax {
            return new ObjectLiteralExpressionSyntax(openBraceToken, propertyAssignments, closeBraceToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        simplePropertyAssignment(propertyName: ISyntaxToken, colonToken: ISyntaxToken, expression: IExpressionSyntax): SimplePropertyAssignmentSyntax {
            return new SimplePropertyAssignmentSyntax(propertyName, colonToken, expression, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        functionPropertyAssignment(propertyName: ISyntaxToken, callSignature: CallSignatureSyntax, block: BlockSyntax): FunctionPropertyAssignmentSyntax {
            return new FunctionPropertyAssignmentSyntax(propertyName, callSignature, block, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        functionExpression(functionKeyword: ISyntaxToken, identifier: ISyntaxToken, callSignature: CallSignatureSyntax, block: BlockSyntax): FunctionExpressionSyntax {
            return new FunctionExpressionSyntax(functionKeyword, identifier, callSignature, block, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        emptyStatement(semicolonToken: ISyntaxToken): EmptyStatementSyntax {
            return new EmptyStatementSyntax(semicolonToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        tryStatement(tryKeyword: ISyntaxToken, block: BlockSyntax, catchClause: CatchClauseSyntax, finallyClause: FinallyClauseSyntax): TryStatementSyntax {
            return new TryStatementSyntax(tryKeyword, block, catchClause, finallyClause, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        catchClause(catchKeyword: ISyntaxToken, openParenToken: ISyntaxToken, identifier: ISyntaxToken, typeAnnotation: TypeAnnotationSyntax, closeParenToken: ISyntaxToken, block: BlockSyntax): CatchClauseSyntax {
            return new CatchClauseSyntax(catchKeyword, openParenToken, identifier, typeAnnotation, closeParenToken, block, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        finallyClause(finallyKeyword: ISyntaxToken, block: BlockSyntax): FinallyClauseSyntax {
            return new FinallyClauseSyntax(finallyKeyword, block, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        labeledStatement(identifier: ISyntaxToken, colonToken: ISyntaxToken, statement: IStatementSyntax): LabeledStatementSyntax {
            return new LabeledStatementSyntax(identifier, colonToken, statement, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        doStatement(doKeyword: ISyntaxToken, statement: IStatementSyntax, whileKeyword: ISyntaxToken, openParenToken: ISyntaxToken, condition: IExpressionSyntax, closeParenToken: ISyntaxToken, semicolonToken: ISyntaxToken): DoStatementSyntax {
            return new DoStatementSyntax(doKeyword, statement, whileKeyword, openParenToken, condition, closeParenToken, semicolonToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        typeOfExpression(typeOfKeyword: ISyntaxToken, expression: IUnaryExpressionSyntax): TypeOfExpressionSyntax {
            return new TypeOfExpressionSyntax(typeOfKeyword, expression, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        deleteExpression(deleteKeyword: ISyntaxToken, expression: IUnaryExpressionSyntax): DeleteExpressionSyntax {
            return new DeleteExpressionSyntax(deleteKeyword, expression, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        voidExpression(voidKeyword: ISyntaxToken, expression: IUnaryExpressionSyntax): VoidExpressionSyntax {
            return new VoidExpressionSyntax(voidKeyword, expression, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
        debuggerStatement(debuggerKeyword: ISyntaxToken, semicolonToken: ISyntaxToken): DebuggerStatementSyntax {
            return new DebuggerStatementSyntax(debuggerKeyword, semicolonToken, /*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);
        }
    }

    export var normalModeFactory: IFactory = new NormalModeFactory();
    export var strictModeFactory: IFactory = new StrictModeFactory();
}