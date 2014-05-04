module TypeScript {
    function isSeparatedListTypeScriptSpecific(list: ISyntaxNodeOrToken[]): boolean {
        for (var i = 0, n = this.nonSeparatorCount(); i < n; i++) {
            if (this.nonSeparatorAt(i).isTypeScriptSpecific()) {
                return true;
            }
        }

        return false;
    }

    function isListTypeScriptSpecific(list: ISyntaxNodeOrToken[]): boolean {
        for (var i = 0, n = this.childCount(); i < n; i++) {
            if (this.childAt(i).isTypeScriptSpecific()) {
                return true;
            }
        }

        return false;
    }

    export function isTypeScriptSpecific(element: ISyntaxElement): boolean {
        if (element === null) { return false; }
        if (isToken(element)) { return false; }
        if (isList(element)) { return isListTypeScriptSpecific(<ISyntaxNodeOrToken[]>element); }
        if (isSeparatedList(element)) { return isSeparatedListTypeScriptSpecific(<ISyntaxNodeOrToken[]>element); }

        switch (element.kind()) {
            case SyntaxKind.ExternalModuleReference:
            case SyntaxKind.ModuleNameModuleReference:
            case SyntaxKind.ImportDeclaration:
            case SyntaxKind.ExportAssignment:
            case SyntaxKind.ClassDeclaration:
            case SyntaxKind.InterfaceDeclaration:
            case SyntaxKind.ExtendsHeritageClause:
            case SyntaxKind.ImplementsHeritageClause:
            case SyntaxKind.ModuleDeclaration:
            case SyntaxKind.SimpleArrowFunctionExpression:
            case SyntaxKind.ParenthesizedArrowFunctionExpression:
            case SyntaxKind.QualifiedName:
            case SyntaxKind.TypeArgumentList:
            case SyntaxKind.ConstructorType:
            case SyntaxKind.FunctionType:
            case SyntaxKind.ObjectType:
            case SyntaxKind.ArrayType:
            case SyntaxKind.GenericType:
            case SyntaxKind.TypeQuery:
            case SyntaxKind.TypeAnnotation:
            case SyntaxKind.ConstructSignature:
            case SyntaxKind.IndexSignature:
            case SyntaxKind.PropertySignature:
            case SyntaxKind.TypeParameterList:
            case SyntaxKind.TypeParameter:
            case SyntaxKind.Constraint:
            case SyntaxKind.ConstructorDeclaration:
            case SyntaxKind.MemberFunctionDeclaration:
            case SyntaxKind.SetAccessor:
            case SyntaxKind.MemberVariableDeclaration:
            case SyntaxKind.IndexMemberDeclaration:
            case SyntaxKind.EnumDeclaration:
            case SyntaxKind.CastExpression:
                return true;
            case SyntaxKind.OmittedExpression:
            case SyntaxKind.BreakStatement:
            case SyntaxKind.ContinueStatement:
            case SyntaxKind.EmptyStatement:
            case SyntaxKind.DebuggerStatement:
                return false;
            case SyntaxKind.SourceUnit:
                return isSourceUnitTypeScriptSpecific(<SourceUnitSyntax>element);
            case SyntaxKind.FunctionDeclaration:
                return isFunctionDeclarationTypeScriptSpecific(<FunctionDeclarationSyntax>element);
            case SyntaxKind.VariableStatement:
                return isVariableStatementTypeScriptSpecific(<VariableStatementSyntax>element);
            case SyntaxKind.VariableDeclaration:
                return isVariableDeclarationTypeScriptSpecific(<VariableDeclarationSyntax>element);
            case SyntaxKind.VariableDeclarator:
                return isVariableDeclaratorTypeScriptSpecific(<VariableDeclaratorSyntax>element);
            case SyntaxKind.EqualsValueClause:
                return isEqualsValueClauseTypeScriptSpecific(<EqualsValueClauseSyntax>element);
            case SyntaxKind.PreIncrementExpression: case SyntaxKind.PreDecrementExpression: case SyntaxKind.PlusExpression: case SyntaxKind.NegateExpression: case SyntaxKind.BitwiseNotExpression: case SyntaxKind.LogicalNotExpression:
                return isPrefixUnaryExpressionTypeScriptSpecific(<PrefixUnaryExpressionSyntax>element);
            case SyntaxKind.ArrayLiteralExpression:
                return isArrayLiteralExpressionTypeScriptSpecific(<ArrayLiteralExpressionSyntax>element);
            case SyntaxKind.ParenthesizedExpression:
                return isParenthesizedExpressionTypeScriptSpecific(<ParenthesizedExpressionSyntax>element);
            case SyntaxKind.Block:
                return isBlockTypeScriptSpecific(<BlockSyntax>element);
            case SyntaxKind.Parameter:
                return isParameterTypeScriptSpecific(<ParameterSyntax>element);
            case SyntaxKind.MemberAccessExpression:
                return isMemberAccessExpressionTypeScriptSpecific(<MemberAccessExpressionSyntax>element);
            case SyntaxKind.PostIncrementExpression: case SyntaxKind.PostDecrementExpression:
                return isPostfixUnaryExpressionTypeScriptSpecific(<PostfixUnaryExpressionSyntax>element);
            case SyntaxKind.ElementAccessExpression:
                return isElementAccessExpressionTypeScriptSpecific(<ElementAccessExpressionSyntax>element);
            case SyntaxKind.InvocationExpression:
                return isInvocationExpressionTypeScriptSpecific(<InvocationExpressionSyntax>element);
            case SyntaxKind.ArgumentList:
                return isArgumentListTypeScriptSpecific(<ArgumentListSyntax>element);
            case SyntaxKind.MultiplyExpression: case SyntaxKind.DivideExpression: case SyntaxKind.ModuloExpression: case SyntaxKind.AddExpression: case SyntaxKind.SubtractExpression: case SyntaxKind.LeftShiftExpression: case SyntaxKind.SignedRightShiftExpression: case SyntaxKind.UnsignedRightShiftExpression: case SyntaxKind.LessThanExpression: case SyntaxKind.GreaterThanExpression: case SyntaxKind.LessThanOrEqualExpression: case SyntaxKind.GreaterThanOrEqualExpression: case SyntaxKind.InstanceOfExpression: case SyntaxKind.InExpression: case SyntaxKind.EqualsWithTypeConversionExpression: case SyntaxKind.NotEqualsWithTypeConversionExpression: case SyntaxKind.EqualsExpression: case SyntaxKind.NotEqualsExpression: case SyntaxKind.BitwiseAndExpression: case SyntaxKind.BitwiseExclusiveOrExpression: case SyntaxKind.BitwiseOrExpression: case SyntaxKind.LogicalAndExpression: case SyntaxKind.LogicalOrExpression: case SyntaxKind.OrAssignmentExpression: case SyntaxKind.AndAssignmentExpression: case SyntaxKind.ExclusiveOrAssignmentExpression: case SyntaxKind.LeftShiftAssignmentExpression: case SyntaxKind.SignedRightShiftAssignmentExpression: case SyntaxKind.UnsignedRightShiftAssignmentExpression: case SyntaxKind.AddAssignmentExpression: case SyntaxKind.SubtractAssignmentExpression: case SyntaxKind.MultiplyAssignmentExpression: case SyntaxKind.DivideAssignmentExpression: case SyntaxKind.ModuloAssignmentExpression: case SyntaxKind.AssignmentExpression: case SyntaxKind.CommaExpression:
                return isBinaryExpressionTypeScriptSpecific(<BinaryExpressionSyntax>element);
            case SyntaxKind.ConditionalExpression:
                return isConditionalExpressionTypeScriptSpecific(<ConditionalExpressionSyntax>element);
            case SyntaxKind.MethodSignature:
                return isMethodSignatureTypeScriptSpecific(<MethodSignatureSyntax>element);
            case SyntaxKind.CallSignature:
                return isCallSignatureTypeScriptSpecific(<CallSignatureSyntax>element);
            case SyntaxKind.ParameterList:
                return isParameterListTypeScriptSpecific(<ParameterListSyntax>element);
            case SyntaxKind.ElseClause:
                return isElseClauseTypeScriptSpecific(<ElseClauseSyntax>element);
            case SyntaxKind.IfStatement:
                return isIfStatementTypeScriptSpecific(<IfStatementSyntax>element);
            case SyntaxKind.ExpressionStatement:
                return isExpressionStatementTypeScriptSpecific(<ExpressionStatementSyntax>element);
            case SyntaxKind.GetAccessor:
                return isGetAccessorTypeScriptSpecific(<GetAccessorSyntax>element);
            case SyntaxKind.ThrowStatement:
                return isThrowStatementTypeScriptSpecific(<ThrowStatementSyntax>element);
            case SyntaxKind.ReturnStatement:
                return isReturnStatementTypeScriptSpecific(<ReturnStatementSyntax>element);
            case SyntaxKind.ObjectCreationExpression:
                return isObjectCreationExpressionTypeScriptSpecific(<ObjectCreationExpressionSyntax>element);
            case SyntaxKind.SwitchStatement:
                return isSwitchStatementTypeScriptSpecific(<SwitchStatementSyntax>element);
            case SyntaxKind.CaseSwitchClause:
                return isCaseSwitchClauseTypeScriptSpecific(<CaseSwitchClauseSyntax>element);
            case SyntaxKind.DefaultSwitchClause:
                return isDefaultSwitchClauseTypeScriptSpecific(<DefaultSwitchClauseSyntax>element);
            case SyntaxKind.ForStatement:
                return isForStatementTypeScriptSpecific(<ForStatementSyntax>element);
            case SyntaxKind.ForInStatement:
                return isForInStatementTypeScriptSpecific(<ForInStatementSyntax>element);
            case SyntaxKind.WhileStatement:
                return isWhileStatementTypeScriptSpecific(<WhileStatementSyntax>element);
            case SyntaxKind.WithStatement:
                return isWithStatementTypeScriptSpecific(<WithStatementSyntax>element);
            case SyntaxKind.EnumElement:
                return isEnumElementTypeScriptSpecific(<EnumElementSyntax>element);
            case SyntaxKind.ObjectLiteralExpression:
                return isObjectLiteralExpressionTypeScriptSpecific(<ObjectLiteralExpressionSyntax>element);
            case SyntaxKind.SimplePropertyAssignment:
                return isSimplePropertyAssignmentTypeScriptSpecific(<SimplePropertyAssignmentSyntax>element);
            case SyntaxKind.FunctionPropertyAssignment:
                return isFunctionPropertyAssignmentTypeScriptSpecific(<FunctionPropertyAssignmentSyntax>element);
            case SyntaxKind.FunctionExpression:
                return isFunctionExpressionTypeScriptSpecific(<FunctionExpressionSyntax>element);
            case SyntaxKind.TryStatement:
                return isTryStatementTypeScriptSpecific(<TryStatementSyntax>element);
            case SyntaxKind.CatchClause:
                return isCatchClauseTypeScriptSpecific(<CatchClauseSyntax>element);
            case SyntaxKind.FinallyClause:
                return isFinallyClauseTypeScriptSpecific(<FinallyClauseSyntax>element);
            case SyntaxKind.LabeledStatement:
                return isLabeledStatementTypeScriptSpecific(<LabeledStatementSyntax>element);
            case SyntaxKind.DoStatement:
                return isDoStatementTypeScriptSpecific(<DoStatementSyntax>element);
            case SyntaxKind.TypeOfExpression:
                return isTypeOfExpressionTypeScriptSpecific(<TypeOfExpressionSyntax>element);
            case SyntaxKind.DeleteExpression:
                return isDeleteExpressionTypeScriptSpecific(<DeleteExpressionSyntax>element);
            case SyntaxKind.VoidExpression:
                return isVoidExpressionTypeScriptSpecific(<VoidExpressionSyntax>element);
        }
    }

    function isSourceUnitTypeScriptSpecific(node: SourceUnitSyntax): boolean {
        return isTypeScriptSpecific(node.moduleElements);
    }

    function isFunctionDeclarationTypeScriptSpecific(node: FunctionDeclarationSyntax): boolean {
        return node.modifiers.childCount() > 0 ||
               isTypeScriptSpecific(node.callSignature) ||
               isTypeScriptSpecific(node.block);
    }

    function isVariableStatementTypeScriptSpecific(node: VariableStatementSyntax): boolean {
        return node.modifiers.childCount() > 0 ||
               isTypeScriptSpecific(node.variableDeclaration);
    }

    function isVariableDeclarationTypeScriptSpecific(node: VariableDeclarationSyntax): boolean {
        return isTypeScriptSpecific(node.variableDeclarators);
    }

    function isVariableDeclaratorTypeScriptSpecific(node: VariableDeclaratorSyntax): boolean {
        return node.typeAnnotation !== null ||
               isTypeScriptSpecific(node.equalsValueClause);
    }

    function isEqualsValueClauseTypeScriptSpecific(node: EqualsValueClauseSyntax): boolean {
        return isTypeScriptSpecific(node.value);
    }

    function isPrefixUnaryExpressionTypeScriptSpecific(node: PrefixUnaryExpressionSyntax): boolean {
        return isTypeScriptSpecific(node.operand);
    }

    function isArrayLiteralExpressionTypeScriptSpecific(node: ArrayLiteralExpressionSyntax): boolean {
        return isTypeScriptSpecific(node.expressions);
    }

    function isParenthesizedExpressionTypeScriptSpecific(node: ParenthesizedExpressionSyntax): boolean {
        return isTypeScriptSpecific(node.expression);
    }

    function isBlockTypeScriptSpecific(node: BlockSyntax): boolean {
        return isTypeScriptSpecific(node.statements);
    }

    function isParameterTypeScriptSpecific(node: ParameterSyntax): boolean {
        return isTypeScriptSpecific(node.modifiers) ||
               node.typeAnnotation !== null ||
               node.equalsValueClause !== null;
    }

    function isMemberAccessExpressionTypeScriptSpecific(node: MemberAccessExpressionSyntax): boolean {
        return isTypeScriptSpecific(node.expression);
    }

    function isPostfixUnaryExpressionTypeScriptSpecific(node: PostfixUnaryExpressionSyntax): boolean {
        return isTypeScriptSpecific(node.operand);
    }

    function isElementAccessExpressionTypeScriptSpecific(node: ElementAccessExpressionSyntax): boolean {
        return isTypeScriptSpecific(node.expression) ||
               isTypeScriptSpecific(node.argumentExpression);
    }

    function isInvocationExpressionTypeScriptSpecific(node: InvocationExpressionSyntax): boolean {
        return isTypeScriptSpecific(node.expression) ||
               isTypeScriptSpecific(node.argumentList);
    }

    function isArgumentListTypeScriptSpecific(node: ArgumentListSyntax): boolean {
        return isTypeScriptSpecific(node.typeArgumentList) ||
               isTypeScriptSpecific(node.arguments);
    }

    function isBinaryExpressionTypeScriptSpecific(node: BinaryExpressionSyntax): boolean {
        return isTypeScriptSpecific(node.left) ||
               isTypeScriptSpecific(node.right);
    }

    function isConditionalExpressionTypeScriptSpecific(node: ConditionalExpressionSyntax): boolean {
        return isTypeScriptSpecific(node.condition) ||
               isTypeScriptSpecific(node.whenTrue) ||
               isTypeScriptSpecific(node.whenFalse);
    }

    function isMethodSignatureTypeScriptSpecific(node: MethodSignatureSyntax): boolean {
        return isTypeScriptSpecific(node.callSignature);
    }

    function isCallSignatureTypeScriptSpecific(node: CallSignatureSyntax): boolean {
        return node.typeParameterList !== null ||
               isTypeScriptSpecific(node.parameterList) ||
               node.typeAnnotation !== null;
    }

    function isParameterListTypeScriptSpecific(node: ParameterListSyntax): boolean {
        return isTypeScriptSpecific(node.parameters);
    }

    function isElseClauseTypeScriptSpecific(node: ElseClauseSyntax): boolean {
        return isTypeScriptSpecific(node.statement);
    }

    function isIfStatementTypeScriptSpecific(node: IfStatementSyntax): boolean {
        return isTypeScriptSpecific(node.condition) ||
               isTypeScriptSpecific(node.statement) ||
               isTypeScriptSpecific(node.elseClause);
    }

    function isExpressionStatementTypeScriptSpecific(node: ExpressionStatementSyntax): boolean {
        return isTypeScriptSpecific(node.expression);
    }

    function isGetAccessorTypeScriptSpecific(node: GetAccessorSyntax): boolean {
        return node.modifiers.childCount() > 0 ||
               isTypeScriptSpecific(node.parameterList) ||
               node.typeAnnotation !== null ||
               isTypeScriptSpecific(node.block);
    }

    function isThrowStatementTypeScriptSpecific(node: ThrowStatementSyntax): boolean {
        return isTypeScriptSpecific(node.expression);
    }

    function isReturnStatementTypeScriptSpecific(node: ReturnStatementSyntax): boolean {
        return isTypeScriptSpecific(node.expression);
    }

    function isObjectCreationExpressionTypeScriptSpecific(node: ObjectCreationExpressionSyntax): boolean {
        return isTypeScriptSpecific(node.expression) ||
               isTypeScriptSpecific(node.argumentList);
    }

    function isSwitchStatementTypeScriptSpecific(node: SwitchStatementSyntax): boolean {
        return isTypeScriptSpecific(node.expression) ||
               isTypeScriptSpecific(node.switchClauses);
    }

    function isCaseSwitchClauseTypeScriptSpecific(node: CaseSwitchClauseSyntax): boolean {
        return isTypeScriptSpecific(node.expression) ||
               isTypeScriptSpecific(node.statements);
    }

    function isDefaultSwitchClauseTypeScriptSpecific(node: DefaultSwitchClauseSyntax): boolean {
        return isTypeScriptSpecific(node.statements);
    }

    function isForStatementTypeScriptSpecific(node: ForStatementSyntax): boolean {
        return isTypeScriptSpecific(node.variableDeclaration) ||
               isTypeScriptSpecific(node.initializer) ||
               isTypeScriptSpecific(node.condition) ||
               isTypeScriptSpecific(node.incrementor) ||
               isTypeScriptSpecific(node.statement);
    }

    function isForInStatementTypeScriptSpecific(node: ForInStatementSyntax): boolean {
        return isTypeScriptSpecific(node.variableDeclaration) ||
               isTypeScriptSpecific(node.left) ||
               isTypeScriptSpecific(node.expression) ||
               isTypeScriptSpecific(node.statement);
    }

    function isWhileStatementTypeScriptSpecific(node: WhileStatementSyntax): boolean {
        return isTypeScriptSpecific(node.condition) ||
               isTypeScriptSpecific(node.statement);
    }

    function isWithStatementTypeScriptSpecific(node: WithStatementSyntax): boolean {
        return isTypeScriptSpecific(node.condition) ||
               isTypeScriptSpecific(node.statement);
    }

    function isEnumElementTypeScriptSpecific(node: EnumElementSyntax): boolean {
        return isTypeScriptSpecific(node.equalsValueClause);
    }

    function isObjectLiteralExpressionTypeScriptSpecific(node: ObjectLiteralExpressionSyntax): boolean {
        return isTypeScriptSpecific(node.propertyAssignments);
    }

    function isSimplePropertyAssignmentTypeScriptSpecific(node: SimplePropertyAssignmentSyntax): boolean {
        return isTypeScriptSpecific(node.expression);
    }

    function isFunctionPropertyAssignmentTypeScriptSpecific(node: FunctionPropertyAssignmentSyntax): boolean {
        return isTypeScriptSpecific(node.callSignature) ||
               isTypeScriptSpecific(node.block);
    }

    function isFunctionExpressionTypeScriptSpecific(node: FunctionExpressionSyntax): boolean {
        return isTypeScriptSpecific(node.callSignature) ||
               isTypeScriptSpecific(node.block);
    }

    function isTryStatementTypeScriptSpecific(node: TryStatementSyntax): boolean {
        return isTypeScriptSpecific(node.block) ||
               isTypeScriptSpecific(node.catchClause) ||
               isTypeScriptSpecific(node.finallyClause);
    }

    function isCatchClauseTypeScriptSpecific(node: CatchClauseSyntax): boolean {
        return isTypeScriptSpecific(node.typeAnnotation) ||
               isTypeScriptSpecific(node.block);
    }

    function isFinallyClauseTypeScriptSpecific(node: FinallyClauseSyntax): boolean {
        return isTypeScriptSpecific(node.block);
    }

    function isLabeledStatementTypeScriptSpecific(node: LabeledStatementSyntax): boolean {
        return isTypeScriptSpecific(node.statement);
    }

    function isDoStatementTypeScriptSpecific(node: DoStatementSyntax): boolean {
        return isTypeScriptSpecific(node.statement) ||
               isTypeScriptSpecific(node.condition);
    }

    function isTypeOfExpressionTypeScriptSpecific(node: TypeOfExpressionSyntax): boolean {
        return isTypeScriptSpecific(node.expression);
    }

    function isDeleteExpressionTypeScriptSpecific(node: DeleteExpressionSyntax): boolean {
        return isTypeScriptSpecific(node.expression);
    }

    function isVoidExpressionTypeScriptSpecific(node: VoidExpressionSyntax): boolean {
        return isTypeScriptSpecific(node.expression);
    }
}