///<reference path='references.ts' />

module TypeScript {
    var nodeMetadata: string[][] = ArrayUtilities.createArray<string[]>(SyntaxKind.LastNode + 1, []);

    nodeMetadata[SyntaxKind.SourceUnit] = ["moduleElements", "endOfFileToken"];
    nodeMetadata[SyntaxKind.QualifiedName] = ["left", "dotToken", "right"];
    nodeMetadata[SyntaxKind.ObjectType] = ["openBraceToken", "typeMembers", "closeBraceToken"];
    nodeMetadata[SyntaxKind.FunctionType] = ["typeParameterList", "parameterList", "equalsGreaterThanToken", "type"];
    nodeMetadata[SyntaxKind.ArrayType] = ["type", "openBracketToken", "closeBracketToken"];
    nodeMetadata[SyntaxKind.ConstructorType] = ["newKeyword", "typeParameterList", "parameterList", "equalsGreaterThanToken", "type"];
    nodeMetadata[SyntaxKind.GenericType] = ["name", "typeArgumentList"];
    nodeMetadata[SyntaxKind.TypeQuery] = ["typeOfKeyword", "name"];
    nodeMetadata[SyntaxKind.InterfaceDeclaration] = ["modifiers", "interfaceKeyword", "identifier", "typeParameterList", "heritageClauses", "body"];
    nodeMetadata[SyntaxKind.FunctionDeclaration] = ["modifiers", "functionKeyword", "identifier", "callSignature", "block", "semicolonToken"];
    nodeMetadata[SyntaxKind.ModuleDeclaration] = ["modifiers", "moduleKeyword", "name", "stringLiteral", "openBraceToken", "moduleElements", "closeBraceToken"];
    nodeMetadata[SyntaxKind.ClassDeclaration] = ["modifiers", "classKeyword", "identifier", "typeParameterList", "heritageClauses", "openBraceToken", "classElements", "closeBraceToken"];
    nodeMetadata[SyntaxKind.EnumDeclaration] = ["modifiers", "enumKeyword", "identifier", "openBraceToken", "enumElements", "closeBraceToken"];
    nodeMetadata[SyntaxKind.ImportDeclaration] = ["modifiers", "importKeyword", "identifier", "equalsToken", "moduleReference", "semicolonToken"];
    nodeMetadata[SyntaxKind.ExportAssignment] = ["exportKeyword", "equalsToken", "identifier", "semicolonToken"];
    nodeMetadata[SyntaxKind.MemberFunctionDeclaration] = ["modifiers", "propertyName", "callSignature", "block", "semicolonToken"];
    nodeMetadata[SyntaxKind.MemberVariableDeclaration] = ["modifiers", "variableDeclarator", "semicolonToken"];
    nodeMetadata[SyntaxKind.ConstructorDeclaration] = ["modifiers", "constructorKeyword", "callSignature", "block", "semicolonToken"];
    nodeMetadata[SyntaxKind.IndexMemberDeclaration] = ["modifiers", "indexSignature", "semicolonToken"];
    nodeMetadata[SyntaxKind.GetAccessor] = ["modifiers", "getKeyword", "propertyName", "parameterList", "typeAnnotation", "block"];
    nodeMetadata[SyntaxKind.SetAccessor] = ["modifiers", "setKeyword", "propertyName", "parameterList", "block"];
    nodeMetadata[SyntaxKind.PropertySignature] = ["propertyName", "questionToken", "typeAnnotation"];
    nodeMetadata[SyntaxKind.CallSignature] = ["typeParameterList", "parameterList", "typeAnnotation"];
    nodeMetadata[SyntaxKind.ConstructSignature] = ["newKeyword", "callSignature"];
    nodeMetadata[SyntaxKind.IndexSignature] = ["openBracketToken", "parameter", "closeBracketToken", "typeAnnotation"];
    nodeMetadata[SyntaxKind.MethodSignature] = ["propertyName", "questionToken", "callSignature"];
    nodeMetadata[SyntaxKind.Block] = ["openBraceToken", "statements", "closeBraceToken"];
    nodeMetadata[SyntaxKind.IfStatement] = ["ifKeyword", "openParenToken", "condition", "closeParenToken", "statement", "elseClause"];
    nodeMetadata[SyntaxKind.VariableStatement] = ["modifiers", "variableDeclaration", "semicolonToken"];
    nodeMetadata[SyntaxKind.ExpressionStatement] = ["expression", "semicolonToken"];
    nodeMetadata[SyntaxKind.ReturnStatement] = ["returnKeyword", "expression", "semicolonToken"];
    nodeMetadata[SyntaxKind.SwitchStatement] = ["switchKeyword", "openParenToken", "expression", "closeParenToken", "openBraceToken", "switchClauses", "closeBraceToken"];
    nodeMetadata[SyntaxKind.BreakStatement] = ["breakKeyword", "identifier", "semicolonToken"];
    nodeMetadata[SyntaxKind.ContinueStatement] = ["continueKeyword", "identifier", "semicolonToken"];
    nodeMetadata[SyntaxKind.ForStatement] = ["forKeyword", "openParenToken", "variableDeclaration", "initializer", "firstSemicolonToken", "condition", "secondSemicolonToken", "incrementor", "closeParenToken", "statement"];
    nodeMetadata[SyntaxKind.ForInStatement] = ["forKeyword", "openParenToken", "variableDeclaration", "left", "inKeyword", "expression", "closeParenToken", "statement"];
    nodeMetadata[SyntaxKind.EmptyStatement] = ["semicolonToken"];
    nodeMetadata[SyntaxKind.ThrowStatement] = ["throwKeyword", "expression", "semicolonToken"];
    nodeMetadata[SyntaxKind.WhileStatement] = ["whileKeyword", "openParenToken", "condition", "closeParenToken", "statement"];
    nodeMetadata[SyntaxKind.TryStatement] = ["tryKeyword", "block", "catchClause", "finallyClause"];
    nodeMetadata[SyntaxKind.LabeledStatement] = ["identifier", "colonToken", "statement"];
    nodeMetadata[SyntaxKind.DoStatement] = ["doKeyword", "statement", "whileKeyword", "openParenToken", "condition", "closeParenToken", "semicolonToken"];
    nodeMetadata[SyntaxKind.DebuggerStatement] = ["debuggerKeyword", "semicolonToken"];
    nodeMetadata[SyntaxKind.WithStatement] = ["withKeyword", "openParenToken", "condition", "closeParenToken", "statement"];
    nodeMetadata[SyntaxKind.PlusExpression] = ["operatorToken", "operand"];
    nodeMetadata[SyntaxKind.NegateExpression] = ["operatorToken", "operand"];
    nodeMetadata[SyntaxKind.BitwiseNotExpression] = ["operatorToken", "operand"];
    nodeMetadata[SyntaxKind.LogicalNotExpression] = ["operatorToken", "operand"];
    nodeMetadata[SyntaxKind.PreIncrementExpression] = ["operatorToken", "operand"];
    nodeMetadata[SyntaxKind.PreDecrementExpression] = ["operatorToken", "operand"];
    nodeMetadata[SyntaxKind.DeleteExpression] = ["deleteKeyword", "expression"];
    nodeMetadata[SyntaxKind.TypeOfExpression] = ["typeOfKeyword", "expression"];
    nodeMetadata[SyntaxKind.VoidExpression] = ["voidKeyword", "expression"];
    nodeMetadata[SyntaxKind.CommaExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.AssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.AddAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.SubtractAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.MultiplyAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.DivideAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.ModuloAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.AndAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.ExclusiveOrAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.OrAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.LeftShiftAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.SignedRightShiftAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.UnsignedRightShiftAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.ConditionalExpression] = ["condition", "questionToken", "whenTrue", "colonToken", "whenFalse"];
    nodeMetadata[SyntaxKind.LogicalOrExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.LogicalAndExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.BitwiseOrExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.BitwiseExclusiveOrExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.BitwiseAndExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.EqualsWithTypeConversionExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.NotEqualsWithTypeConversionExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.EqualsExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.NotEqualsExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.LessThanExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.GreaterThanExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.LessThanOrEqualExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.GreaterThanOrEqualExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.InstanceOfExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.InExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.LeftShiftExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.SignedRightShiftExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.UnsignedRightShiftExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.MultiplyExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.DivideExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.ModuloExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.AddExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.SubtractExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.PostIncrementExpression] = ["operand", "operatorToken"];
    nodeMetadata[SyntaxKind.PostDecrementExpression] = ["operand", "operatorToken"];
    nodeMetadata[SyntaxKind.MemberAccessExpression] = ["expression", "dotToken", "name"];
    nodeMetadata[SyntaxKind.InvocationExpression] = ["expression", "argumentList"];
    nodeMetadata[SyntaxKind.ArrayLiteralExpression] = ["openBracketToken", "expressions", "closeBracketToken"];
    nodeMetadata[SyntaxKind.ObjectLiteralExpression] = ["openBraceToken", "propertyAssignments", "closeBraceToken"];
    nodeMetadata[SyntaxKind.ObjectCreationExpression] = ["newKeyword", "expression", "argumentList"];
    nodeMetadata[SyntaxKind.ParenthesizedExpression] = ["openParenToken", "expression", "closeParenToken"];
    nodeMetadata[SyntaxKind.ParenthesizedArrowFunctionExpression] = ["callSignature", "equalsGreaterThanToken", "block", "expression"];
    nodeMetadata[SyntaxKind.SimpleArrowFunctionExpression] = ["identifier", "equalsGreaterThanToken", "block", "expression"];
    nodeMetadata[SyntaxKind.CastExpression] = ["lessThanToken", "type", "greaterThanToken", "expression"];
    nodeMetadata[SyntaxKind.ElementAccessExpression] = ["expression", "openBracketToken", "argumentExpression", "closeBracketToken"];
    nodeMetadata[SyntaxKind.FunctionExpression] = ["functionKeyword", "identifier", "callSignature", "block"];
    nodeMetadata[SyntaxKind.OmittedExpression] = [];
    nodeMetadata[SyntaxKind.VariableDeclaration] = ["varKeyword", "variableDeclarators"];
    nodeMetadata[SyntaxKind.VariableDeclarator] = ["propertyName", "typeAnnotation", "equalsValueClause"];
    nodeMetadata[SyntaxKind.ArgumentList] = ["typeArgumentList", "openParenToken", "arguments", "closeParenToken"];
    nodeMetadata[SyntaxKind.ParameterList] = ["openParenToken", "parameters", "closeParenToken"];
    nodeMetadata[SyntaxKind.TypeArgumentList] = ["lessThanToken", "typeArguments", "greaterThanToken"];
    nodeMetadata[SyntaxKind.TypeParameterList] = ["lessThanToken", "typeParameters", "greaterThanToken"];
    nodeMetadata[SyntaxKind.ExtendsHeritageClause] = ["extendsOrImplementsKeyword", "typeNames"];
    nodeMetadata[SyntaxKind.ImplementsHeritageClause] = ["extendsOrImplementsKeyword", "typeNames"];
    nodeMetadata[SyntaxKind.EqualsValueClause] = ["equalsToken", "value"];
    nodeMetadata[SyntaxKind.CaseSwitchClause] = ["caseKeyword", "expression", "colonToken", "statements"];
    nodeMetadata[SyntaxKind.DefaultSwitchClause] = ["defaultKeyword", "colonToken", "statements"];
    nodeMetadata[SyntaxKind.ElseClause] = ["elseKeyword", "statement"];
    nodeMetadata[SyntaxKind.CatchClause] = ["catchKeyword", "openParenToken", "identifier", "typeAnnotation", "closeParenToken", "block"];
    nodeMetadata[SyntaxKind.FinallyClause] = ["finallyKeyword", "block"];
    nodeMetadata[SyntaxKind.TypeParameter] = ["identifier", "constraint"];
    nodeMetadata[SyntaxKind.Constraint] = ["extendsKeyword", "type"];
    nodeMetadata[SyntaxKind.SimplePropertyAssignment] = ["propertyName", "colonToken", "expression"];
    nodeMetadata[SyntaxKind.FunctionPropertyAssignment] = ["propertyName", "callSignature", "block"];
    nodeMetadata[SyntaxKind.Parameter] = ["dotDotDotToken", "modifiers", "identifier", "questionToken", "typeAnnotation", "equalsValueClause"];
    nodeMetadata[SyntaxKind.EnumElement] = ["propertyName", "equalsValueClause"];
    nodeMetadata[SyntaxKind.TypeAnnotation] = ["colonToken", "type"];
    nodeMetadata[SyntaxKind.ExternalModuleReference] = ["requireKeyword", "openParenToken", "stringLiteral", "closeParenToken"];
    nodeMetadata[SyntaxKind.ModuleNameModuleReference] = ["moduleName"];

    export function childCount(element: ISyntaxElement): number {
        var kind = element.kind;
        if (kind === SyntaxKind.List) {
            return (<ISyntaxNodeOrToken[]>element).length;
        }
        else if (kind === SyntaxKind.SeparatedList) {
            return (<ISyntaxNodeOrToken[]>element).length + (<ISyntaxNodeOrToken[]>element).separators.length;
        }
        else if (kind >= SyntaxKind.FirstToken && kind <= SyntaxKind.LastToken) {
            return 0;
        }
        else {
            return nodeMetadata[kind].length;
        }
    }

    export function childAt(element: ISyntaxElement, index: number): ISyntaxElement {
        var kind = element.kind;
        if (kind === SyntaxKind.List) {
            return (<ISyntaxNodeOrToken[]>element)[index];
        }
        else if (kind === SyntaxKind.SeparatedList) {
            return (index % 2 === 0) ? (<ISyntaxNodeOrToken[]>element)[index / 2] : (<ISyntaxNodeOrToken[]>element).separators[(index - 1) / 2];
        }
        else {
            // Debug.assert(isNode(element));
            return (<any>element)[nodeMetadata[element.kind][index]];
        }
    }

    function setParentForArray(parent: ISyntaxElement, array: ISyntaxNodeOrToken[]): void {
        for (var i = 0, n = array.length; i < n; i++) {
            var child = array[i];
            if (child && !isShared(child)) {
                child.parent = parent;
            }
        }
    }

    export function setParentForChildren<T extends ISyntaxElement>(parent: T): T {
        var kind = parent.kind;
        if (kind === SyntaxKind.List) {
            setParentForArray(parent, <ISyntaxNodeOrToken[]><ISyntaxElement>parent);
        }
        else if (kind === SyntaxKind.SeparatedList) {
            var array = <ISyntaxNodeOrToken[]><ISyntaxElement>parent;
            setParentForArray(parent, array);
            setParentForArray(parent, array.separators);
        }
        else {
            Debug.assert(isNode(parent));
            var childNames = nodeMetadata[kind];

            for (var i = 0, n = childNames.length; i < n; i++) {
                var child: ISyntaxElement = (<any>parent)[childNames[i]];
                if (child && !isShared(child)) {
                    child.parent = parent;
                }
            }
        }

        return parent;
    }

    export interface SourceUnitSyntax extends ISyntaxNode {
        syntaxTree: SyntaxTree;
        moduleElements: IModuleElementSyntax[];
        endOfFileToken: ISyntaxToken;
    }

    export interface ExternalModuleReferenceSyntax extends ISyntaxNode, IModuleReferenceSyntax {
        requireKeyword: ISyntaxToken;
        openParenToken: ISyntaxToken;
        stringLiteral: ISyntaxToken;
        closeParenToken: ISyntaxToken;
    }

    export interface ModuleNameModuleReferenceSyntax extends ISyntaxNode, IModuleReferenceSyntax {
        moduleName: INameSyntax;
    }

    export interface ImportDeclarationSyntax extends ISyntaxNode, IModuleElementSyntax {
        modifiers: ISyntaxToken[];
        importKeyword: ISyntaxToken;
        identifier: ISyntaxToken;
        equalsToken: ISyntaxToken;
        moduleReference: IModuleReferenceSyntax;
        semicolonToken: ISyntaxToken;
    }

    export interface ExportAssignmentSyntax extends ISyntaxNode, IModuleElementSyntax {
        exportKeyword: ISyntaxToken;
        equalsToken: ISyntaxToken;
        identifier: ISyntaxToken;
        semicolonToken: ISyntaxToken;
    }

    export interface ClassDeclarationSyntax extends ISyntaxNode, IModuleElementSyntax {
        modifiers: ISyntaxToken[];
        classKeyword: ISyntaxToken;
        identifier: ISyntaxToken;
        typeParameterList: TypeParameterListSyntax;
        heritageClauses: HeritageClauseSyntax[];
        openBraceToken: ISyntaxToken;
        classElements: IClassElementSyntax[];
        closeBraceToken: ISyntaxToken;
    }

    export interface InterfaceDeclarationSyntax extends ISyntaxNode, IModuleElementSyntax {
        modifiers: ISyntaxToken[];
        interfaceKeyword: ISyntaxToken;
        identifier: ISyntaxToken;
        typeParameterList: TypeParameterListSyntax;
        heritageClauses: HeritageClauseSyntax[];
        body: ObjectTypeSyntax;
    }

    export interface HeritageClauseSyntax extends ISyntaxNode {
        extendsOrImplementsKeyword: ISyntaxToken;
        typeNames: INameSyntax[];
    }

    export interface ModuleDeclarationSyntax extends ISyntaxNode, IModuleElementSyntax {
        modifiers: ISyntaxToken[];
        moduleKeyword: ISyntaxToken;
        name: INameSyntax;
        stringLiteral: ISyntaxToken;
        openBraceToken: ISyntaxToken;
        moduleElements: IModuleElementSyntax[];
        closeBraceToken: ISyntaxToken;
    }

    export interface FunctionDeclarationSyntax extends ISyntaxNode, IStatementSyntax {
        modifiers: ISyntaxToken[];
        functionKeyword: ISyntaxToken;
        identifier: ISyntaxToken;
        callSignature: CallSignatureSyntax;
        block: BlockSyntax;
        semicolonToken: ISyntaxToken;
    }

    export interface VariableStatementSyntax extends ISyntaxNode, IStatementSyntax {
        modifiers: ISyntaxToken[];
        variableDeclaration: VariableDeclarationSyntax;
        semicolonToken: ISyntaxToken;
    }

    export interface VariableDeclarationSyntax extends ISyntaxNode {
        varKeyword: ISyntaxToken;
        variableDeclarators: VariableDeclaratorSyntax[];
    }

    export interface VariableDeclaratorSyntax extends ISyntaxNode {
        propertyName: ISyntaxToken;
        typeAnnotation: TypeAnnotationSyntax;
        equalsValueClause: EqualsValueClauseSyntax;
    }

    export interface EqualsValueClauseSyntax extends ISyntaxNode {
        equalsToken: ISyntaxToken;
        value: IExpressionSyntax;
    }

    export interface PrefixUnaryExpressionSyntax extends ISyntaxNode, IUnaryExpressionSyntax {
        operatorToken: ISyntaxToken;
        operand: IUnaryExpressionSyntax;
    }

    export interface ArrayLiteralExpressionSyntax extends ISyntaxNode, IPrimaryExpressionSyntax {
        openBracketToken: ISyntaxToken;
        expressions: IExpressionSyntax[];
        closeBracketToken: ISyntaxToken;
    }

    export interface OmittedExpressionSyntax extends ISyntaxNode, IExpressionSyntax {
    }

    export interface ParenthesizedExpressionSyntax extends ISyntaxNode, IPrimaryExpressionSyntax {
        openParenToken: ISyntaxToken;
        expression: IExpressionSyntax;
        closeParenToken: ISyntaxToken;
    }

    export interface SimpleArrowFunctionExpressionSyntax extends ISyntaxNode, IUnaryExpressionSyntax {
        identifier: ISyntaxToken;
        equalsGreaterThanToken: ISyntaxToken;
        block: BlockSyntax;
        expression: IExpressionSyntax;
    }

    export interface ParenthesizedArrowFunctionExpressionSyntax extends ISyntaxNode, IUnaryExpressionSyntax {
        callSignature: CallSignatureSyntax;
        equalsGreaterThanToken: ISyntaxToken;
        block: BlockSyntax;
        expression: IExpressionSyntax;
    }

    export interface QualifiedNameSyntax extends ISyntaxNode, INameSyntax {
        left: INameSyntax;
        dotToken: ISyntaxToken;
        right: ISyntaxToken;
    }

    export interface TypeArgumentListSyntax extends ISyntaxNode {
        lessThanToken: ISyntaxToken;
        typeArguments: ITypeSyntax[];
        greaterThanToken: ISyntaxToken;
    }

    export interface ConstructorTypeSyntax extends ISyntaxNode, ITypeSyntax {
        newKeyword: ISyntaxToken;
        typeParameterList: TypeParameterListSyntax;
        parameterList: ParameterListSyntax;
        equalsGreaterThanToken: ISyntaxToken;
        type: ITypeSyntax;
    }

    export interface FunctionTypeSyntax extends ISyntaxNode, ITypeSyntax {
        typeParameterList: TypeParameterListSyntax;
        parameterList: ParameterListSyntax;
        equalsGreaterThanToken: ISyntaxToken;
        type: ITypeSyntax;
    }

    export interface ObjectTypeSyntax extends ISyntaxNode, ITypeSyntax {
        openBraceToken: ISyntaxToken;
        typeMembers: ITypeMemberSyntax[];
        closeBraceToken: ISyntaxToken;
    }

    export interface ArrayTypeSyntax extends ISyntaxNode, ITypeSyntax {
        type: ITypeSyntax;
        openBracketToken: ISyntaxToken;
        closeBracketToken: ISyntaxToken;
    }

    export interface GenericTypeSyntax extends ISyntaxNode, ITypeSyntax {
        name: INameSyntax;
        typeArgumentList: TypeArgumentListSyntax;
    }

    export interface TypeQuerySyntax extends ISyntaxNode, ITypeSyntax {
        typeOfKeyword: ISyntaxToken;
        name: INameSyntax;
    }

    export interface TypeAnnotationSyntax extends ISyntaxNode {
        colonToken: ISyntaxToken;
        type: ITypeSyntax;
    }

    export interface BlockSyntax extends ISyntaxNode, IStatementSyntax {
        openBraceToken: ISyntaxToken;
        statements: IStatementSyntax[];
        closeBraceToken: ISyntaxToken;
    }

    export interface ParameterSyntax extends ISyntaxNode {
        dotDotDotToken: ISyntaxToken;
        modifiers: ISyntaxToken[];
        identifier: ISyntaxToken;
        questionToken: ISyntaxToken;
        typeAnnotation: TypeAnnotationSyntax;
        equalsValueClause: EqualsValueClauseSyntax;
    }

    export interface MemberAccessExpressionSyntax extends ISyntaxNode, IMemberExpressionSyntax, ICallExpressionSyntax {
        expression: ILeftHandSideExpressionSyntax;
        dotToken: ISyntaxToken;
        name: ISyntaxToken;
    }

    export interface PostfixUnaryExpressionSyntax extends ISyntaxNode, IPostfixExpressionSyntax {
        operand: ILeftHandSideExpressionSyntax;
        operatorToken: ISyntaxToken;
    }

    export interface ElementAccessExpressionSyntax extends ISyntaxNode, IMemberExpressionSyntax, ICallExpressionSyntax {
        expression: ILeftHandSideExpressionSyntax;
        openBracketToken: ISyntaxToken;
        argumentExpression: IExpressionSyntax;
        closeBracketToken: ISyntaxToken;
    }

    export interface InvocationExpressionSyntax extends ISyntaxNode, ICallExpressionSyntax {
        expression: ILeftHandSideExpressionSyntax;
        argumentList: ArgumentListSyntax;
    }

    export interface ArgumentListSyntax extends ISyntaxNode {
        typeArgumentList: TypeArgumentListSyntax;
        openParenToken: ISyntaxToken;
        arguments: IExpressionSyntax[];
        closeParenToken: ISyntaxToken;
    }

    export interface BinaryExpressionSyntax extends ISyntaxNode, IExpressionSyntax {
        left: IExpressionSyntax;
        operatorToken: ISyntaxToken;
        right: IExpressionSyntax;
    }

    export interface ConditionalExpressionSyntax extends ISyntaxNode, IExpressionSyntax {
        condition: IExpressionSyntax;
        questionToken: ISyntaxToken;
        whenTrue: IExpressionSyntax;
        colonToken: ISyntaxToken;
        whenFalse: IExpressionSyntax;
    }

    export interface ConstructSignatureSyntax extends ISyntaxNode, ITypeMemberSyntax {
        newKeyword: ISyntaxToken;
        callSignature: CallSignatureSyntax;
    }

    export interface MethodSignatureSyntax extends ISyntaxNode, ITypeMemberSyntax {
        propertyName: ISyntaxToken;
        questionToken: ISyntaxToken;
        callSignature: CallSignatureSyntax;
    }

    export interface IndexSignatureSyntax extends ISyntaxNode, ITypeMemberSyntax {
        openBracketToken: ISyntaxToken;
        parameter: ParameterSyntax;
        closeBracketToken: ISyntaxToken;
        typeAnnotation: TypeAnnotationSyntax;
    }

    export interface PropertySignatureSyntax extends ISyntaxNode, ITypeMemberSyntax {
        propertyName: ISyntaxToken;
        questionToken: ISyntaxToken;
        typeAnnotation: TypeAnnotationSyntax;
    }

    export interface CallSignatureSyntax extends ISyntaxNode, ITypeMemberSyntax {
        typeParameterList: TypeParameterListSyntax;
        parameterList: ParameterListSyntax;
        typeAnnotation: TypeAnnotationSyntax;
    }

    export interface ParameterListSyntax extends ISyntaxNode {
        openParenToken: ISyntaxToken;
        parameters: ParameterSyntax[];
        closeParenToken: ISyntaxToken;
    }

    export interface TypeParameterListSyntax extends ISyntaxNode {
        lessThanToken: ISyntaxToken;
        typeParameters: TypeParameterSyntax[];
        greaterThanToken: ISyntaxToken;
    }

    export interface TypeParameterSyntax extends ISyntaxNode {
        identifier: ISyntaxToken;
        constraint: ConstraintSyntax;
    }

    export interface ConstraintSyntax extends ISyntaxNode {
        extendsKeyword: ISyntaxToken;
        type: ITypeSyntax;
    }

    export interface ElseClauseSyntax extends ISyntaxNode {
        elseKeyword: ISyntaxToken;
        statement: IStatementSyntax;
    }

    export interface IfStatementSyntax extends ISyntaxNode, IStatementSyntax {
        ifKeyword: ISyntaxToken;
        openParenToken: ISyntaxToken;
        condition: IExpressionSyntax;
        closeParenToken: ISyntaxToken;
        statement: IStatementSyntax;
        elseClause: ElseClauseSyntax;
    }

    export interface ExpressionStatementSyntax extends ISyntaxNode, IStatementSyntax {
        expression: IExpressionSyntax;
        semicolonToken: ISyntaxToken;
    }

    export interface ConstructorDeclarationSyntax extends ISyntaxNode, IClassElementSyntax {
        modifiers: ISyntaxToken[];
        constructorKeyword: ISyntaxToken;
        callSignature: CallSignatureSyntax;
        block: BlockSyntax;
        semicolonToken: ISyntaxToken;
    }

    export interface MemberFunctionDeclarationSyntax extends ISyntaxNode, IMemberDeclarationSyntax {
        modifiers: ISyntaxToken[];
        propertyName: ISyntaxToken;
        callSignature: CallSignatureSyntax;
        block: BlockSyntax;
        semicolonToken: ISyntaxToken;
    }

    export interface GetAccessorSyntax extends ISyntaxNode, IMemberDeclarationSyntax, IPropertyAssignmentSyntax {
        modifiers: ISyntaxToken[];
        getKeyword: ISyntaxToken;
        propertyName: ISyntaxToken;
        parameterList: ParameterListSyntax;
        typeAnnotation: TypeAnnotationSyntax;
        block: BlockSyntax;
    }

    export interface SetAccessorSyntax extends ISyntaxNode, IMemberDeclarationSyntax, IPropertyAssignmentSyntax {
        modifiers: ISyntaxToken[];
        setKeyword: ISyntaxToken;
        propertyName: ISyntaxToken;
        parameterList: ParameterListSyntax;
        block: BlockSyntax;
    }

    export interface MemberVariableDeclarationSyntax extends ISyntaxNode, IMemberDeclarationSyntax {
        modifiers: ISyntaxToken[];
        variableDeclarator: VariableDeclaratorSyntax;
        semicolonToken: ISyntaxToken;
    }

    export interface IndexMemberDeclarationSyntax extends ISyntaxNode, IClassElementSyntax {
        modifiers: ISyntaxToken[];
        indexSignature: IndexSignatureSyntax;
        semicolonToken: ISyntaxToken;
    }

    export interface ThrowStatementSyntax extends ISyntaxNode, IStatementSyntax {
        throwKeyword: ISyntaxToken;
        expression: IExpressionSyntax;
        semicolonToken: ISyntaxToken;
    }

    export interface ReturnStatementSyntax extends ISyntaxNode, IStatementSyntax {
        returnKeyword: ISyntaxToken;
        expression: IExpressionSyntax;
        semicolonToken: ISyntaxToken;
    }

    export interface ObjectCreationExpressionSyntax extends ISyntaxNode, IMemberExpressionSyntax {
        newKeyword: ISyntaxToken;
        expression: IMemberExpressionSyntax;
        argumentList: ArgumentListSyntax;
    }

    export interface SwitchStatementSyntax extends ISyntaxNode, IStatementSyntax {
        switchKeyword: ISyntaxToken;
        openParenToken: ISyntaxToken;
        expression: IExpressionSyntax;
        closeParenToken: ISyntaxToken;
        openBraceToken: ISyntaxToken;
        switchClauses: ISwitchClauseSyntax[];
        closeBraceToken: ISyntaxToken;
    }

    export interface CaseSwitchClauseSyntax extends ISyntaxNode, ISwitchClauseSyntax {
        caseKeyword: ISyntaxToken;
        expression: IExpressionSyntax;
        colonToken: ISyntaxToken;
        statements: IStatementSyntax[];
    }

    export interface DefaultSwitchClauseSyntax extends ISyntaxNode, ISwitchClauseSyntax {
        defaultKeyword: ISyntaxToken;
        colonToken: ISyntaxToken;
        statements: IStatementSyntax[];
    }

    export interface BreakStatementSyntax extends ISyntaxNode, IStatementSyntax {
        breakKeyword: ISyntaxToken;
        identifier: ISyntaxToken;
        semicolonToken: ISyntaxToken;
    }

    export interface ContinueStatementSyntax extends ISyntaxNode, IStatementSyntax {
        continueKeyword: ISyntaxToken;
        identifier: ISyntaxToken;
        semicolonToken: ISyntaxToken;
    }

    export interface ForStatementSyntax extends ISyntaxNode, IStatementSyntax {
        forKeyword: ISyntaxToken;
        openParenToken: ISyntaxToken;
        variableDeclaration: VariableDeclarationSyntax;
        initializer: IExpressionSyntax;
        firstSemicolonToken: ISyntaxToken;
        condition: IExpressionSyntax;
        secondSemicolonToken: ISyntaxToken;
        incrementor: IExpressionSyntax;
        closeParenToken: ISyntaxToken;
        statement: IStatementSyntax;
    }

    export interface ForInStatementSyntax extends ISyntaxNode, IStatementSyntax {
        forKeyword: ISyntaxToken;
        openParenToken: ISyntaxToken;
        variableDeclaration: VariableDeclarationSyntax;
        left: IExpressionSyntax;
        inKeyword: ISyntaxToken;
        expression: IExpressionSyntax;
        closeParenToken: ISyntaxToken;
        statement: IStatementSyntax;
    }

    export interface WhileStatementSyntax extends ISyntaxNode, IStatementSyntax {
        whileKeyword: ISyntaxToken;
        openParenToken: ISyntaxToken;
        condition: IExpressionSyntax;
        closeParenToken: ISyntaxToken;
        statement: IStatementSyntax;
    }

    export interface WithStatementSyntax extends ISyntaxNode, IStatementSyntax {
        withKeyword: ISyntaxToken;
        openParenToken: ISyntaxToken;
        condition: IExpressionSyntax;
        closeParenToken: ISyntaxToken;
        statement: IStatementSyntax;
    }

    export interface EnumDeclarationSyntax extends ISyntaxNode, IModuleElementSyntax {
        modifiers: ISyntaxToken[];
        enumKeyword: ISyntaxToken;
        identifier: ISyntaxToken;
        openBraceToken: ISyntaxToken;
        enumElements: EnumElementSyntax[];
        closeBraceToken: ISyntaxToken;
    }

    export interface EnumElementSyntax extends ISyntaxNode {
        propertyName: ISyntaxToken;
        equalsValueClause: EqualsValueClauseSyntax;
    }

    export interface CastExpressionSyntax extends ISyntaxNode, IUnaryExpressionSyntax {
        lessThanToken: ISyntaxToken;
        type: ITypeSyntax;
        greaterThanToken: ISyntaxToken;
        expression: IUnaryExpressionSyntax;
    }

    export interface ObjectLiteralExpressionSyntax extends ISyntaxNode, IPrimaryExpressionSyntax {
        openBraceToken: ISyntaxToken;
        propertyAssignments: IPropertyAssignmentSyntax[];
        closeBraceToken: ISyntaxToken;
    }

    export interface SimplePropertyAssignmentSyntax extends ISyntaxNode, IPropertyAssignmentSyntax {
        propertyName: ISyntaxToken;
        colonToken: ISyntaxToken;
        expression: IExpressionSyntax;
    }

    export interface FunctionPropertyAssignmentSyntax extends ISyntaxNode, IPropertyAssignmentSyntax {
        propertyName: ISyntaxToken;
        callSignature: CallSignatureSyntax;
        block: BlockSyntax;
    }

    export interface FunctionExpressionSyntax extends ISyntaxNode, IPrimaryExpressionSyntax {
        functionKeyword: ISyntaxToken;
        identifier: ISyntaxToken;
        callSignature: CallSignatureSyntax;
        block: BlockSyntax;
    }

    export interface EmptyStatementSyntax extends ISyntaxNode, IStatementSyntax {
        semicolonToken: ISyntaxToken;
    }

    export interface TryStatementSyntax extends ISyntaxNode, IStatementSyntax {
        tryKeyword: ISyntaxToken;
        block: BlockSyntax;
        catchClause: CatchClauseSyntax;
        finallyClause: FinallyClauseSyntax;
    }

    export interface CatchClauseSyntax extends ISyntaxNode {
        catchKeyword: ISyntaxToken;
        openParenToken: ISyntaxToken;
        identifier: ISyntaxToken;
        typeAnnotation: TypeAnnotationSyntax;
        closeParenToken: ISyntaxToken;
        block: BlockSyntax;
    }

    export interface FinallyClauseSyntax extends ISyntaxNode {
        finallyKeyword: ISyntaxToken;
        block: BlockSyntax;
    }

    export interface LabeledStatementSyntax extends ISyntaxNode, IStatementSyntax {
        identifier: ISyntaxToken;
        colonToken: ISyntaxToken;
        statement: IStatementSyntax;
    }

    export interface DoStatementSyntax extends ISyntaxNode, IStatementSyntax {
        doKeyword: ISyntaxToken;
        statement: IStatementSyntax;
        whileKeyword: ISyntaxToken;
        openParenToken: ISyntaxToken;
        condition: IExpressionSyntax;
        closeParenToken: ISyntaxToken;
        semicolonToken: ISyntaxToken;
    }

    export interface TypeOfExpressionSyntax extends ISyntaxNode, IUnaryExpressionSyntax {
        typeOfKeyword: ISyntaxToken;
        expression: IUnaryExpressionSyntax;
    }

    export interface DeleteExpressionSyntax extends ISyntaxNode, IUnaryExpressionSyntax {
        deleteKeyword: ISyntaxToken;
        expression: IUnaryExpressionSyntax;
    }

    export interface VoidExpressionSyntax extends ISyntaxNode, IUnaryExpressionSyntax {
        voidKeyword: ISyntaxToken;
        expression: IUnaryExpressionSyntax;
    }

    export interface DebuggerStatementSyntax extends ISyntaxNode, IStatementSyntax {
        debuggerKeyword: ISyntaxToken;
        semicolonToken: ISyntaxToken;
    }
}