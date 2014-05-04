///<reference path='references.ts' />

module TypeScript {
    var nodeMetadata: string[][] = new Array<string[]>(SyntaxKind.LastNode + 1);
    nodeMetadata[SyntaxKind.SourceUnit] = ["moduleElements", "endOfFileToken"];
    nodeMetadata[SyntaxKind.ExternalModuleReference] = ["requireKeyword", "openParenToken", "stringLiteral", "closeParenToken"];
    nodeMetadata[SyntaxKind.ModuleNameModuleReference] = ["moduleName"];
    nodeMetadata[SyntaxKind.ImportDeclaration] = ["modifiers", "importKeyword", "identifier", "equalsToken", "moduleReference", "semicolonToken"];
    nodeMetadata[SyntaxKind.ExportAssignment] = ["exportKeyword", "equalsToken", "identifier", "semicolonToken"];
    nodeMetadata[SyntaxKind.ClassDeclaration] = ["modifiers", "classKeyword", "identifier", "typeParameterList", "heritageClauses", "openBraceToken", "classElements", "closeBraceToken"];
    nodeMetadata[SyntaxKind.InterfaceDeclaration] = ["modifiers", "interfaceKeyword", "identifier", "typeParameterList", "heritageClauses", "body"];
    nodeMetadata[SyntaxKind.ExtendsHeritageClause] = ["extendsOrImplementsKeyword", "typeNames"];
    nodeMetadata[SyntaxKind.ImplementsHeritageClause] = ["extendsOrImplementsKeyword", "typeNames"];
    nodeMetadata[SyntaxKind.ModuleDeclaration] = ["modifiers", "moduleKeyword", "name", "stringLiteral", "openBraceToken", "moduleElements", "closeBraceToken"];
    nodeMetadata[SyntaxKind.FunctionDeclaration] = ["modifiers", "functionKeyword", "identifier", "callSignature", "block", "semicolonToken"];
    nodeMetadata[SyntaxKind.VariableStatement] = ["modifiers", "variableDeclaration", "semicolonToken"];
    nodeMetadata[SyntaxKind.VariableDeclaration] = ["varKeyword", "variableDeclarators"];
    nodeMetadata[SyntaxKind.VariableDeclarator] = ["propertyName", "typeAnnotation", "equalsValueClause"];
    nodeMetadata[SyntaxKind.EqualsValueClause] = ["equalsToken", "value"];
    nodeMetadata[SyntaxKind.PreIncrementExpression] = ["operatorToken", "operand"];
    nodeMetadata[SyntaxKind.PreDecrementExpression] = ["operatorToken", "operand"];
    nodeMetadata[SyntaxKind.PlusExpression] = ["operatorToken", "operand"];
    nodeMetadata[SyntaxKind.NegateExpression] = ["operatorToken", "operand"];
    nodeMetadata[SyntaxKind.BitwiseNotExpression] = ["operatorToken", "operand"];
    nodeMetadata[SyntaxKind.LogicalNotExpression] = ["operatorToken", "operand"];
    nodeMetadata[SyntaxKind.ArrayLiteralExpression] = ["openBracketToken", "expressions", "closeBracketToken"];
    nodeMetadata[SyntaxKind.OmittedExpression] = [];
    nodeMetadata[SyntaxKind.ParenthesizedExpression] = ["openParenToken", "expression", "closeParenToken"];
    nodeMetadata[SyntaxKind.SimpleArrowFunctionExpression] = ["identifier", "equalsGreaterThanToken", "block", "expression"];
    nodeMetadata[SyntaxKind.ParenthesizedArrowFunctionExpression] = ["callSignature", "equalsGreaterThanToken", "block", "expression"];
    nodeMetadata[SyntaxKind.QualifiedName] = ["left", "dotToken", "right"];
    nodeMetadata[SyntaxKind.TypeArgumentList] = ["lessThanToken", "typeArguments", "greaterThanToken"];
    nodeMetadata[SyntaxKind.ConstructorType] = ["newKeyword", "typeParameterList", "parameterList", "equalsGreaterThanToken", "type"];
    nodeMetadata[SyntaxKind.FunctionType] = ["typeParameterList", "parameterList", "equalsGreaterThanToken", "type"];
    nodeMetadata[SyntaxKind.ObjectType] = ["openBraceToken", "typeMembers", "closeBraceToken"];
    nodeMetadata[SyntaxKind.ArrayType] = ["type", "openBracketToken", "closeBracketToken"];
    nodeMetadata[SyntaxKind.GenericType] = ["name", "typeArgumentList"];
    nodeMetadata[SyntaxKind.TypeQuery] = ["typeOfKeyword", "name"];
    nodeMetadata[SyntaxKind.TypeAnnotation] = ["colonToken", "type"];
    nodeMetadata[SyntaxKind.Block] = ["openBraceToken", "statements", "closeBraceToken"];
    nodeMetadata[SyntaxKind.Parameter] = ["dotDotDotToken", "modifiers", "identifier", "questionToken", "typeAnnotation", "equalsValueClause"];
    nodeMetadata[SyntaxKind.MemberAccessExpression] = ["expression", "dotToken", "name"];
    nodeMetadata[SyntaxKind.PostIncrementExpression] = ["operand", "operatorToken"];
    nodeMetadata[SyntaxKind.PostDecrementExpression] = ["operand", "operatorToken"];
    nodeMetadata[SyntaxKind.ElementAccessExpression] = ["expression", "openBracketToken", "argumentExpression", "closeBracketToken"];
    nodeMetadata[SyntaxKind.InvocationExpression] = ["expression", "argumentList"];
    nodeMetadata[SyntaxKind.ArgumentList] = ["typeArgumentList", "openParenToken", "arguments", "closeParenToken"];
    nodeMetadata[SyntaxKind.MultiplyExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.DivideExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.ModuloExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.AddExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.SubtractExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.LeftShiftExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.SignedRightShiftExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.UnsignedRightShiftExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.LessThanExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.GreaterThanExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.LessThanOrEqualExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.GreaterThanOrEqualExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.InstanceOfExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.InExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.EqualsWithTypeConversionExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.NotEqualsWithTypeConversionExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.EqualsExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.NotEqualsExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.BitwiseAndExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.BitwiseExclusiveOrExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.BitwiseOrExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.LogicalAndExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.LogicalOrExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.OrAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.AndAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.ExclusiveOrAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.LeftShiftAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.SignedRightShiftAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.UnsignedRightShiftAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.AddAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.SubtractAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.MultiplyAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.DivideAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.ModuloAssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.AssignmentExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.CommaExpression] = ["left", "operatorToken", "right"];
    nodeMetadata[SyntaxKind.ConditionalExpression] = ["condition", "questionToken", "whenTrue", "colonToken", "whenFalse"];
    nodeMetadata[SyntaxKind.ConstructSignature] = ["newKeyword", "callSignature"];
    nodeMetadata[SyntaxKind.MethodSignature] = ["propertyName", "questionToken", "callSignature"];
    nodeMetadata[SyntaxKind.IndexSignature] = ["openBracketToken", "parameter", "closeBracketToken", "typeAnnotation"];
    nodeMetadata[SyntaxKind.PropertySignature] = ["propertyName", "questionToken", "typeAnnotation"];
    nodeMetadata[SyntaxKind.CallSignature] = ["typeParameterList", "parameterList", "typeAnnotation"];
    nodeMetadata[SyntaxKind.ParameterList] = ["openParenToken", "parameters", "closeParenToken"];
    nodeMetadata[SyntaxKind.TypeParameterList] = ["lessThanToken", "typeParameters", "greaterThanToken"];
    nodeMetadata[SyntaxKind.TypeParameter] = ["identifier", "constraint"];
    nodeMetadata[SyntaxKind.Constraint] = ["extendsKeyword", "type"];
    nodeMetadata[SyntaxKind.ElseClause] = ["elseKeyword", "statement"];
    nodeMetadata[SyntaxKind.IfStatement] = ["ifKeyword", "openParenToken", "condition", "closeParenToken", "statement", "elseClause"];
    nodeMetadata[SyntaxKind.ExpressionStatement] = ["expression", "semicolonToken"];
    nodeMetadata[SyntaxKind.ConstructorDeclaration] = ["modifiers", "constructorKeyword", "callSignature", "block", "semicolonToken"];
    nodeMetadata[SyntaxKind.MemberFunctionDeclaration] = ["modifiers", "propertyName", "callSignature", "block", "semicolonToken"];
    nodeMetadata[SyntaxKind.GetAccessor] = ["modifiers", "getKeyword", "propertyName", "parameterList", "typeAnnotation", "block"];
    nodeMetadata[SyntaxKind.SetAccessor] = ["modifiers", "setKeyword", "propertyName", "parameterList", "block"];
    nodeMetadata[SyntaxKind.MemberVariableDeclaration] = ["modifiers", "variableDeclarator", "semicolonToken"];
    nodeMetadata[SyntaxKind.IndexMemberDeclaration] = ["modifiers", "indexSignature", "semicolonToken"];
    nodeMetadata[SyntaxKind.ThrowStatement] = ["throwKeyword", "expression", "semicolonToken"];
    nodeMetadata[SyntaxKind.ReturnStatement] = ["returnKeyword", "expression", "semicolonToken"];
    nodeMetadata[SyntaxKind.ObjectCreationExpression] = ["newKeyword", "expression", "argumentList"];
    nodeMetadata[SyntaxKind.SwitchStatement] = ["switchKeyword", "openParenToken", "expression", "closeParenToken", "openBraceToken", "switchClauses", "closeBraceToken"];
    nodeMetadata[SyntaxKind.CaseSwitchClause] = ["caseKeyword", "expression", "colonToken", "statements"];
    nodeMetadata[SyntaxKind.DefaultSwitchClause] = ["defaultKeyword", "colonToken", "statements"];
    nodeMetadata[SyntaxKind.BreakStatement] = ["breakKeyword", "identifier", "semicolonToken"];
    nodeMetadata[SyntaxKind.ContinueStatement] = ["continueKeyword", "identifier", "semicolonToken"];
    nodeMetadata[SyntaxKind.ForStatement] = ["forKeyword", "openParenToken", "variableDeclaration", "initializer", "firstSemicolonToken", "condition", "secondSemicolonToken", "incrementor", "closeParenToken", "statement"];
    nodeMetadata[SyntaxKind.ForInStatement] = ["forKeyword", "openParenToken", "variableDeclaration", "left", "inKeyword", "expression", "closeParenToken", "statement"];
    nodeMetadata[SyntaxKind.WhileStatement] = ["whileKeyword", "openParenToken", "condition", "closeParenToken", "statement"];
    nodeMetadata[SyntaxKind.WithStatement] = ["withKeyword", "openParenToken", "condition", "closeParenToken", "statement"];
    nodeMetadata[SyntaxKind.EnumDeclaration] = ["modifiers", "enumKeyword", "identifier", "openBraceToken", "enumElements", "closeBraceToken"];
    nodeMetadata[SyntaxKind.EnumElement] = ["propertyName", "equalsValueClause"];
    nodeMetadata[SyntaxKind.CastExpression] = ["lessThanToken", "type", "greaterThanToken", "expression"];
    nodeMetadata[SyntaxKind.ObjectLiteralExpression] = ["openBraceToken", "propertyAssignments", "closeBraceToken"];
    nodeMetadata[SyntaxKind.SimplePropertyAssignment] = ["propertyName", "colonToken", "expression"];
    nodeMetadata[SyntaxKind.FunctionPropertyAssignment] = ["propertyName", "callSignature", "block"];
    nodeMetadata[SyntaxKind.FunctionExpression] = ["functionKeyword", "identifier", "callSignature", "block"];
    nodeMetadata[SyntaxKind.EmptyStatement] = ["semicolonToken"];
    nodeMetadata[SyntaxKind.TryStatement] = ["tryKeyword", "block", "catchClause", "finallyClause"];
    nodeMetadata[SyntaxKind.CatchClause] = ["catchKeyword", "openParenToken", "identifier", "typeAnnotation", "closeParenToken", "block"];
    nodeMetadata[SyntaxKind.FinallyClause] = ["finallyKeyword", "block"];
    nodeMetadata[SyntaxKind.LabeledStatement] = ["identifier", "colonToken", "statement"];
    nodeMetadata[SyntaxKind.DoStatement] = ["doKeyword", "statement", "whileKeyword", "openParenToken", "condition", "closeParenToken", "semicolonToken"];
    nodeMetadata[SyntaxKind.TypeOfExpression] = ["typeOfKeyword", "expression"];
    nodeMetadata[SyntaxKind.DeleteExpression] = ["deleteKeyword", "expression"];
    nodeMetadata[SyntaxKind.VoidExpression] = ["voidKeyword", "expression"];
    nodeMetadata[SyntaxKind.DebuggerStatement] = ["debuggerKeyword", "semicolonToken"];

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

    export class SourceUnitSyntax extends SyntaxNode {
        public syntaxTree: SyntaxTree = null;
        constructor(public moduleElements: IModuleElementSyntax[],
                    public endOfFileToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.SourceUnit, data); 

            !isShared(moduleElements) && (moduleElements.parent = this);
            endOfFileToken.parent = this;
        }
    }

    export class ExternalModuleReferenceSyntax extends SyntaxNode implements IModuleReferenceSyntax {
        public _isModuleReference: any;

        constructor(public requireKeyword: ISyntaxToken,
                    public openParenToken: ISyntaxToken,
                    public stringLiteral: ISyntaxToken,
                    public closeParenToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.ExternalModuleReference, data); 

            requireKeyword.parent = this;
            openParenToken.parent = this;
            stringLiteral.parent = this;
            closeParenToken.parent = this;
        }
    }

    export class ModuleNameModuleReferenceSyntax extends SyntaxNode implements IModuleReferenceSyntax {
        public _isModuleReference: any;

        constructor(public moduleName: INameSyntax,
                    data: number) {
            super(SyntaxKind.ModuleNameModuleReference, data); 

            moduleName.parent = this;
        }
    }

    export class ImportDeclarationSyntax extends SyntaxNode implements IModuleElementSyntax {
        public _isModuleElement: any;

        constructor(public modifiers: ISyntaxToken[],
                    public importKeyword: ISyntaxToken,
                    public identifier: ISyntaxToken,
                    public equalsToken: ISyntaxToken,
                    public moduleReference: IModuleReferenceSyntax,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.ImportDeclaration, data); 

            !isShared(modifiers) && (modifiers.parent = this);
            importKeyword.parent = this;
            identifier.parent = this;
            equalsToken.parent = this;
            moduleReference.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }
    }

    export class ExportAssignmentSyntax extends SyntaxNode implements IModuleElementSyntax {
        public _isModuleElement: any;

        constructor(public exportKeyword: ISyntaxToken,
                    public equalsToken: ISyntaxToken,
                    public identifier: ISyntaxToken,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.ExportAssignment, data); 

            exportKeyword.parent = this;
            equalsToken.parent = this;
            identifier.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }
    }

    export class ClassDeclarationSyntax extends SyntaxNode implements IModuleElementSyntax {
        public _isModuleElement: any;

        constructor(public modifiers: ISyntaxToken[],
                    public classKeyword: ISyntaxToken,
                    public identifier: ISyntaxToken,
                    public typeParameterList: TypeParameterListSyntax,
                    public heritageClauses: HeritageClauseSyntax[],
                    public openBraceToken: ISyntaxToken,
                    public classElements: IClassElementSyntax[],
                    public closeBraceToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.ClassDeclaration, data); 

            !isShared(modifiers) && (modifiers.parent = this);
            classKeyword.parent = this;
            identifier.parent = this;
            typeParameterList && (typeParameterList.parent = this);
            !isShared(heritageClauses) && (heritageClauses.parent = this);
            openBraceToken.parent = this;
            !isShared(classElements) && (classElements.parent = this);
            closeBraceToken.parent = this;
        }
    }

    export class InterfaceDeclarationSyntax extends SyntaxNode implements IModuleElementSyntax {
        public _isModuleElement: any;

        constructor(public modifiers: ISyntaxToken[],
                    public interfaceKeyword: ISyntaxToken,
                    public identifier: ISyntaxToken,
                    public typeParameterList: TypeParameterListSyntax,
                    public heritageClauses: HeritageClauseSyntax[],
                    public body: ObjectTypeSyntax,
                    data: number) {
            super(SyntaxKind.InterfaceDeclaration, data); 

            !isShared(modifiers) && (modifiers.parent = this);
            interfaceKeyword.parent = this;
            identifier.parent = this;
            typeParameterList && (typeParameterList.parent = this);
            !isShared(heritageClauses) && (heritageClauses.parent = this);
            body.parent = this;
        }
    }

    export class HeritageClauseSyntax extends SyntaxNode {
        private _kind: SyntaxKind;

        constructor(kind: SyntaxKind,
                    public extendsOrImplementsKeyword: ISyntaxToken,
                    public typeNames: INameSyntax[],
                    data: number) {
            super(kind, data); 

            this._kind = kind;
            extendsOrImplementsKeyword.parent = this;
            !isShared(typeNames) && (typeNames.parent = this);
        }
    }

    export class ModuleDeclarationSyntax extends SyntaxNode implements IModuleElementSyntax {
        public _isModuleElement: any;

        constructor(public modifiers: ISyntaxToken[],
                    public moduleKeyword: ISyntaxToken,
                    public name: INameSyntax,
                    public stringLiteral: ISyntaxToken,
                    public openBraceToken: ISyntaxToken,
                    public moduleElements: IModuleElementSyntax[],
                    public closeBraceToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.ModuleDeclaration, data); 

            !isShared(modifiers) && (modifiers.parent = this);
            moduleKeyword.parent = this;
            name && (name.parent = this);
            stringLiteral && (stringLiteral.parent = this);
            openBraceToken.parent = this;
            !isShared(moduleElements) && (moduleElements.parent = this);
            closeBraceToken.parent = this;
        }
    }

    export class FunctionDeclarationSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any;
        public _isModuleElement: any;

        constructor(public modifiers: ISyntaxToken[],
                    public functionKeyword: ISyntaxToken,
                    public identifier: ISyntaxToken,
                    public callSignature: CallSignatureSyntax,
                    public block: BlockSyntax,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.FunctionDeclaration, data); 

            !isShared(modifiers) && (modifiers.parent = this);
            functionKeyword.parent = this;
            identifier.parent = this;
            callSignature.parent = this;
            block && (block.parent = this);
            semicolonToken && (semicolonToken.parent = this);
        }
    }

    export class VariableStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any;
        public _isModuleElement: any;

        constructor(public modifiers: ISyntaxToken[],
                    public variableDeclaration: VariableDeclarationSyntax,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.VariableStatement, data); 

            !isShared(modifiers) && (modifiers.parent = this);
            variableDeclaration.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }
    }

    export class VariableDeclarationSyntax extends SyntaxNode {
        constructor(public varKeyword: ISyntaxToken,
                    public variableDeclarators: VariableDeclaratorSyntax[],
                    data: number) {
            super(SyntaxKind.VariableDeclaration, data); 

            varKeyword.parent = this;
            !isShared(variableDeclarators) && (variableDeclarators.parent = this);
        }
    }

    export class VariableDeclaratorSyntax extends SyntaxNode {
        constructor(public propertyName: ISyntaxToken,
                    public typeAnnotation: TypeAnnotationSyntax,
                    public equalsValueClause: EqualsValueClauseSyntax,
                    data: number) {
            super(SyntaxKind.VariableDeclarator, data); 

            propertyName.parent = this;
            typeAnnotation && (typeAnnotation.parent = this);
            equalsValueClause && (equalsValueClause.parent = this);
        }
    }

    export class EqualsValueClauseSyntax extends SyntaxNode {
        constructor(public equalsToken: ISyntaxToken,
                    public value: IExpressionSyntax,
                    data: number) {
            super(SyntaxKind.EqualsValueClause, data); 

            equalsToken.parent = this;
            value.parent = this;
        }
    }

    export class PrefixUnaryExpressionSyntax extends SyntaxNode implements IUnaryExpressionSyntax {
        private _kind: SyntaxKind;

        public _isUnaryExpression: any;
        public _isExpression: any;

        constructor(kind: SyntaxKind,
                    public operatorToken: ISyntaxToken,
                    public operand: IUnaryExpressionSyntax,
                    data: number) {
            super(kind, data); 

            this._kind = kind;
            operatorToken.parent = this;
            operand.parent = this;
        }
    }

    export class ArrayLiteralExpressionSyntax extends SyntaxNode implements IPrimaryExpressionSyntax {
        public _isPrimaryExpression: any;
        public _isMemberExpression: any;
        public _isLeftHandSideExpression: any;
        public _isPostfixExpression: any;
        public _isUnaryExpression: any;
        public _isExpression: any;

        constructor(public openBracketToken: ISyntaxToken,
                    public expressions: IExpressionSyntax[],
                    public closeBracketToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.ArrayLiteralExpression, data); 

            openBracketToken.parent = this;
            !isShared(expressions) && (expressions.parent = this);
            closeBracketToken.parent = this;
        }
    }

    export class OmittedExpressionSyntax extends SyntaxNode implements IExpressionSyntax {
        public _isExpression: any;

        constructor(data: number) {
            super(SyntaxKind.OmittedExpression, data); 
        }
    }

    export class ParenthesizedExpressionSyntax extends SyntaxNode implements IPrimaryExpressionSyntax {
        public _isPrimaryExpression: any;
        public _isMemberExpression: any;
        public _isLeftHandSideExpression: any;
        public _isPostfixExpression: any;
        public _isUnaryExpression: any;
        public _isExpression: any;

        constructor(public openParenToken: ISyntaxToken,
                    public expression: IExpressionSyntax,
                    public closeParenToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.ParenthesizedExpression, data); 

            openParenToken.parent = this;
            expression.parent = this;
            closeParenToken.parent = this;
        }
    }

    export class SimpleArrowFunctionExpressionSyntax extends SyntaxNode implements IUnaryExpressionSyntax {
        public _isUnaryExpression: any;
        public _isExpression: any;

        constructor(public identifier: ISyntaxToken,
                    public equalsGreaterThanToken: ISyntaxToken,
                    public block: BlockSyntax,
                    public expression: IExpressionSyntax,
                    data: number) {
            super(SyntaxKind.SimpleArrowFunctionExpression, data); 

            identifier.parent = this;
            equalsGreaterThanToken.parent = this;
            block && (block.parent = this);
            expression && (expression.parent = this);
        }
    }

    export class ParenthesizedArrowFunctionExpressionSyntax extends SyntaxNode implements IUnaryExpressionSyntax {
        public _isUnaryExpression: any;
        public _isExpression: any;

        constructor(public callSignature: CallSignatureSyntax,
                    public equalsGreaterThanToken: ISyntaxToken,
                    public block: BlockSyntax,
                    public expression: IExpressionSyntax,
                    data: number) {
            super(SyntaxKind.ParenthesizedArrowFunctionExpression, data); 

            callSignature.parent = this;
            equalsGreaterThanToken.parent = this;
            block && (block.parent = this);
            expression && (expression.parent = this);
        }
    }

    export class QualifiedNameSyntax extends SyntaxNode implements INameSyntax {
        public _isName: any;
        public _isType: any;

        constructor(public left: INameSyntax,
                    public dotToken: ISyntaxToken,
                    public right: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.QualifiedName, data); 

            left.parent = this;
            dotToken.parent = this;
            right.parent = this;
        }
    }

    export class TypeArgumentListSyntax extends SyntaxNode {
        constructor(public lessThanToken: ISyntaxToken,
                    public typeArguments: ITypeSyntax[],
                    public greaterThanToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.TypeArgumentList, data); 

            lessThanToken.parent = this;
            !isShared(typeArguments) && (typeArguments.parent = this);
            greaterThanToken.parent = this;
        }
    }

    export class ConstructorTypeSyntax extends SyntaxNode implements ITypeSyntax {
        public _isType: any;

        constructor(public newKeyword: ISyntaxToken,
                    public typeParameterList: TypeParameterListSyntax,
                    public parameterList: ParameterListSyntax,
                    public equalsGreaterThanToken: ISyntaxToken,
                    public type: ITypeSyntax,
                    data: number) {
            super(SyntaxKind.ConstructorType, data); 

            newKeyword.parent = this;
            typeParameterList && (typeParameterList.parent = this);
            parameterList.parent = this;
            equalsGreaterThanToken.parent = this;
            type.parent = this;
        }
    }

    export class FunctionTypeSyntax extends SyntaxNode implements ITypeSyntax {
        public _isType: any;

        constructor(public typeParameterList: TypeParameterListSyntax,
                    public parameterList: ParameterListSyntax,
                    public equalsGreaterThanToken: ISyntaxToken,
                    public type: ITypeSyntax,
                    data: number) {
            super(SyntaxKind.FunctionType, data); 

            typeParameterList && (typeParameterList.parent = this);
            parameterList.parent = this;
            equalsGreaterThanToken.parent = this;
            type.parent = this;
        }
    }

    export class ObjectTypeSyntax extends SyntaxNode implements ITypeSyntax {
        public _isType: any;

        constructor(public openBraceToken: ISyntaxToken,
                    public typeMembers: ITypeMemberSyntax[],
                    public closeBraceToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.ObjectType, data); 

            openBraceToken.parent = this;
            !isShared(typeMembers) && (typeMembers.parent = this);
            closeBraceToken.parent = this;
        }
    }

    export class ArrayTypeSyntax extends SyntaxNode implements ITypeSyntax {
        public _isType: any;

        constructor(public type: ITypeSyntax,
                    public openBracketToken: ISyntaxToken,
                    public closeBracketToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.ArrayType, data); 

            type.parent = this;
            openBracketToken.parent = this;
            closeBracketToken.parent = this;
        }
    }

    export class GenericTypeSyntax extends SyntaxNode implements ITypeSyntax {
        public _isType: any;

        constructor(public name: INameSyntax,
                    public typeArgumentList: TypeArgumentListSyntax,
                    data: number) {
            super(SyntaxKind.GenericType, data); 

            name.parent = this;
            typeArgumentList.parent = this;
        }
    }

    export class TypeQuerySyntax extends SyntaxNode implements ITypeSyntax {
        public _isType: any;

        constructor(public typeOfKeyword: ISyntaxToken,
                    public name: INameSyntax,
                    data: number) {
            super(SyntaxKind.TypeQuery, data); 

            typeOfKeyword.parent = this;
            name.parent = this;
        }
    }

    export class TypeAnnotationSyntax extends SyntaxNode {
        constructor(public colonToken: ISyntaxToken,
                    public type: ITypeSyntax,
                    data: number) {
            super(SyntaxKind.TypeAnnotation, data); 

            colonToken.parent = this;
            type.parent = this;
        }
    }

    export class BlockSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any;
        public _isModuleElement: any;

        constructor(public openBraceToken: ISyntaxToken,
                    public statements: IStatementSyntax[],
                    public closeBraceToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.Block, data); 

            openBraceToken.parent = this;
            !isShared(statements) && (statements.parent = this);
            closeBraceToken.parent = this;
        }
    }

    export class ParameterSyntax extends SyntaxNode {
        constructor(public dotDotDotToken: ISyntaxToken,
                    public modifiers: ISyntaxToken[],
                    public identifier: ISyntaxToken,
                    public questionToken: ISyntaxToken,
                    public typeAnnotation: TypeAnnotationSyntax,
                    public equalsValueClause: EqualsValueClauseSyntax,
                    data: number) {
            super(SyntaxKind.Parameter, data); 

            dotDotDotToken && (dotDotDotToken.parent = this);
            !isShared(modifiers) && (modifiers.parent = this);
            identifier.parent = this;
            questionToken && (questionToken.parent = this);
            typeAnnotation && (typeAnnotation.parent = this);
            equalsValueClause && (equalsValueClause.parent = this);
        }
    }

    export class MemberAccessExpressionSyntax extends SyntaxNode implements IMemberExpressionSyntax, ICallExpressionSyntax {
        public _isMemberExpression: any;
        public _isCallExpression: any;
        public _isLeftHandSideExpression: any;
        public _isPostfixExpression: any;
        public _isUnaryExpression: any;
        public _isExpression: any;

        constructor(public expression: ILeftHandSideExpressionSyntax,
                    public dotToken: ISyntaxToken,
                    public name: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.MemberAccessExpression, data); 

            expression.parent = this;
            dotToken.parent = this;
            name.parent = this;
        }
    }

    export class PostfixUnaryExpressionSyntax extends SyntaxNode implements IPostfixExpressionSyntax {
        private _kind: SyntaxKind;

        public _isPostfixExpression: any;
        public _isUnaryExpression: any;
        public _isExpression: any;

        constructor(kind: SyntaxKind,
                    public operand: ILeftHandSideExpressionSyntax,
                    public operatorToken: ISyntaxToken,
                    data: number) {
            super(kind, data); 

            this._kind = kind;
            operand.parent = this;
            operatorToken.parent = this;
        }
    }

    export class ElementAccessExpressionSyntax extends SyntaxNode implements IMemberExpressionSyntax, ICallExpressionSyntax {
        public _isMemberExpression: any;
        public _isCallExpression: any;
        public _isLeftHandSideExpression: any;
        public _isPostfixExpression: any;
        public _isUnaryExpression: any;
        public _isExpression: any;

        constructor(public expression: ILeftHandSideExpressionSyntax,
                    public openBracketToken: ISyntaxToken,
                    public argumentExpression: IExpressionSyntax,
                    public closeBracketToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.ElementAccessExpression, data); 

            expression.parent = this;
            openBracketToken.parent = this;
            argumentExpression.parent = this;
            closeBracketToken.parent = this;
        }
    }

    export class InvocationExpressionSyntax extends SyntaxNode implements ICallExpressionSyntax {
        public _isCallExpression: any;
        public _isLeftHandSideExpression: any;
        public _isPostfixExpression: any;
        public _isUnaryExpression: any;
        public _isExpression: any;

        constructor(public expression: ILeftHandSideExpressionSyntax,
                    public argumentList: ArgumentListSyntax,
                    data: number) {
            super(SyntaxKind.InvocationExpression, data); 

            expression.parent = this;
            argumentList.parent = this;
        }
    }

    export class ArgumentListSyntax extends SyntaxNode {
    public arguments: IExpressionSyntax[];
        constructor(public typeArgumentList: TypeArgumentListSyntax,
                    public openParenToken: ISyntaxToken,
                    _arguments: IExpressionSyntax[],
                    public closeParenToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.ArgumentList, data); 

            this.arguments = _arguments;
            typeArgumentList && (typeArgumentList.parent = this);
            openParenToken.parent = this;
            !isShared(_arguments) && (_arguments.parent = this);
            closeParenToken.parent = this;
        }
    }

    export class BinaryExpressionSyntax extends SyntaxNode implements IExpressionSyntax {
        private _kind: SyntaxKind;

        public _isExpression: any;

        constructor(kind: SyntaxKind,
                    public left: IExpressionSyntax,
                    public operatorToken: ISyntaxToken,
                    public right: IExpressionSyntax,
                    data: number) {
            super(kind, data); 

            this._kind = kind;
            left.parent = this;
            operatorToken.parent = this;
            right.parent = this;
        }
    }

    export class ConditionalExpressionSyntax extends SyntaxNode implements IExpressionSyntax {
        public _isExpression: any;

        constructor(public condition: IExpressionSyntax,
                    public questionToken: ISyntaxToken,
                    public whenTrue: IExpressionSyntax,
                    public colonToken: ISyntaxToken,
                    public whenFalse: IExpressionSyntax,
                    data: number) {
            super(SyntaxKind.ConditionalExpression, data); 

            condition.parent = this;
            questionToken.parent = this;
            whenTrue.parent = this;
            colonToken.parent = this;
            whenFalse.parent = this;
        }
    }

    export class ConstructSignatureSyntax extends SyntaxNode implements ITypeMemberSyntax {
        public _isTypeMember: any;

        constructor(public newKeyword: ISyntaxToken,
                    public callSignature: CallSignatureSyntax,
                    data: number) {
            super(SyntaxKind.ConstructSignature, data); 

            newKeyword.parent = this;
            callSignature.parent = this;
        }
    }

    export class MethodSignatureSyntax extends SyntaxNode implements ITypeMemberSyntax {
        public _isTypeMember: any;

        constructor(public propertyName: ISyntaxToken,
                    public questionToken: ISyntaxToken,
                    public callSignature: CallSignatureSyntax,
                    data: number) {
            super(SyntaxKind.MethodSignature, data); 

            propertyName.parent = this;
            questionToken && (questionToken.parent = this);
            callSignature.parent = this;
        }
    }

    export class IndexSignatureSyntax extends SyntaxNode implements ITypeMemberSyntax {
        public _isTypeMember: any;

        constructor(public openBracketToken: ISyntaxToken,
                    public parameter: ParameterSyntax,
                    public closeBracketToken: ISyntaxToken,
                    public typeAnnotation: TypeAnnotationSyntax,
                    data: number) {
            super(SyntaxKind.IndexSignature, data); 

            openBracketToken.parent = this;
            parameter.parent = this;
            closeBracketToken.parent = this;
            typeAnnotation && (typeAnnotation.parent = this);
        }
    }

    export class PropertySignatureSyntax extends SyntaxNode implements ITypeMemberSyntax {
        public _isTypeMember: any;

        constructor(public propertyName: ISyntaxToken,
                    public questionToken: ISyntaxToken,
                    public typeAnnotation: TypeAnnotationSyntax,
                    data: number) {
            super(SyntaxKind.PropertySignature, data); 

            propertyName.parent = this;
            questionToken && (questionToken.parent = this);
            typeAnnotation && (typeAnnotation.parent = this);
        }
    }

    export class CallSignatureSyntax extends SyntaxNode implements ITypeMemberSyntax {
        public _isTypeMember: any;

        constructor(public typeParameterList: TypeParameterListSyntax,
                    public parameterList: ParameterListSyntax,
                    public typeAnnotation: TypeAnnotationSyntax,
                    data: number) {
            super(SyntaxKind.CallSignature, data); 

            typeParameterList && (typeParameterList.parent = this);
            parameterList.parent = this;
            typeAnnotation && (typeAnnotation.parent = this);
        }
    }

    export class ParameterListSyntax extends SyntaxNode {
        constructor(public openParenToken: ISyntaxToken,
                    public parameters: ParameterSyntax[],
                    public closeParenToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.ParameterList, data); 

            openParenToken.parent = this;
            !isShared(parameters) && (parameters.parent = this);
            closeParenToken.parent = this;
        }
    }

    export class TypeParameterListSyntax extends SyntaxNode {
        constructor(public lessThanToken: ISyntaxToken,
                    public typeParameters: TypeParameterSyntax[],
                    public greaterThanToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.TypeParameterList, data); 

            lessThanToken.parent = this;
            !isShared(typeParameters) && (typeParameters.parent = this);
            greaterThanToken.parent = this;
        }
    }

    export class TypeParameterSyntax extends SyntaxNode {
        constructor(public identifier: ISyntaxToken,
                    public constraint: ConstraintSyntax,
                    data: number) {
            super(SyntaxKind.TypeParameter, data); 

            identifier.parent = this;
            constraint && (constraint.parent = this);
        }
    }

    export class ConstraintSyntax extends SyntaxNode {
        constructor(public extendsKeyword: ISyntaxToken,
                    public type: ITypeSyntax,
                    data: number) {
            super(SyntaxKind.Constraint, data); 

            extendsKeyword.parent = this;
            type.parent = this;
        }
    }

    export class ElseClauseSyntax extends SyntaxNode {
        constructor(public elseKeyword: ISyntaxToken,
                    public statement: IStatementSyntax,
                    data: number) {
            super(SyntaxKind.ElseClause, data); 

            elseKeyword.parent = this;
            statement.parent = this;
        }
    }

    export class IfStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any;
        public _isModuleElement: any;

        constructor(public ifKeyword: ISyntaxToken,
                    public openParenToken: ISyntaxToken,
                    public condition: IExpressionSyntax,
                    public closeParenToken: ISyntaxToken,
                    public statement: IStatementSyntax,
                    public elseClause: ElseClauseSyntax,
                    data: number) {
            super(SyntaxKind.IfStatement, data); 

            ifKeyword.parent = this;
            openParenToken.parent = this;
            condition.parent = this;
            closeParenToken.parent = this;
            statement.parent = this;
            elseClause && (elseClause.parent = this);
        }
    }

    export class ExpressionStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any;
        public _isModuleElement: any;

        constructor(public expression: IExpressionSyntax,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.ExpressionStatement, data); 

            expression.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }
    }

    export class ConstructorDeclarationSyntax extends SyntaxNode implements IClassElementSyntax {
        public _isClassElement: any;

        constructor(public modifiers: ISyntaxToken[],
                    public constructorKeyword: ISyntaxToken,
                    public callSignature: CallSignatureSyntax,
                    public block: BlockSyntax,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.ConstructorDeclaration, data); 

            !isShared(modifiers) && (modifiers.parent = this);
            constructorKeyword.parent = this;
            callSignature.parent = this;
            block && (block.parent = this);
            semicolonToken && (semicolonToken.parent = this);
        }
    }

    export class MemberFunctionDeclarationSyntax extends SyntaxNode implements IMemberDeclarationSyntax {
        public _isMemberDeclaration: any;
        public _isClassElement: any;

        constructor(public modifiers: ISyntaxToken[],
                    public propertyName: ISyntaxToken,
                    public callSignature: CallSignatureSyntax,
                    public block: BlockSyntax,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.MemberFunctionDeclaration, data); 

            !isShared(modifiers) && (modifiers.parent = this);
            propertyName.parent = this;
            callSignature.parent = this;
            block && (block.parent = this);
            semicolonToken && (semicolonToken.parent = this);
        }
    }

    export class GetAccessorSyntax extends SyntaxNode implements IMemberDeclarationSyntax, IPropertyAssignmentSyntax {
        public _isMemberDeclaration: any;
        public _isPropertyAssignment: any;
        public _isClassElement: any;

        constructor(public modifiers: ISyntaxToken[],
                    public getKeyword: ISyntaxToken,
                    public propertyName: ISyntaxToken,
                    public parameterList: ParameterListSyntax,
                    public typeAnnotation: TypeAnnotationSyntax,
                    public block: BlockSyntax,
                    data: number) {
            super(SyntaxKind.GetAccessor, data); 

            !isShared(modifiers) && (modifiers.parent = this);
            getKeyword.parent = this;
            propertyName.parent = this;
            parameterList.parent = this;
            typeAnnotation && (typeAnnotation.parent = this);
            block.parent = this;
        }
    }

    export class SetAccessorSyntax extends SyntaxNode implements IMemberDeclarationSyntax, IPropertyAssignmentSyntax {
        public _isMemberDeclaration: any;
        public _isPropertyAssignment: any;
        public _isClassElement: any;

        constructor(public modifiers: ISyntaxToken[],
                    public setKeyword: ISyntaxToken,
                    public propertyName: ISyntaxToken,
                    public parameterList: ParameterListSyntax,
                    public block: BlockSyntax,
                    data: number) {
            super(SyntaxKind.SetAccessor, data); 

            !isShared(modifiers) && (modifiers.parent = this);
            setKeyword.parent = this;
            propertyName.parent = this;
            parameterList.parent = this;
            block.parent = this;
        }
    }

    export class MemberVariableDeclarationSyntax extends SyntaxNode implements IMemberDeclarationSyntax {
        public _isMemberDeclaration: any;
        public _isClassElement: any;

        constructor(public modifiers: ISyntaxToken[],
                    public variableDeclarator: VariableDeclaratorSyntax,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.MemberVariableDeclaration, data); 

            !isShared(modifiers) && (modifiers.parent = this);
            variableDeclarator.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }
    }

    export class IndexMemberDeclarationSyntax extends SyntaxNode implements IClassElementSyntax {
        public _isClassElement: any;

        constructor(public modifiers: ISyntaxToken[],
                    public indexSignature: IndexSignatureSyntax,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.IndexMemberDeclaration, data); 

            !isShared(modifiers) && (modifiers.parent = this);
            indexSignature.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }
    }

    export class ThrowStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any;
        public _isModuleElement: any;

        constructor(public throwKeyword: ISyntaxToken,
                    public expression: IExpressionSyntax,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.ThrowStatement, data); 

            throwKeyword.parent = this;
            expression.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }
    }

    export class ReturnStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any;
        public _isModuleElement: any;

        constructor(public returnKeyword: ISyntaxToken,
                    public expression: IExpressionSyntax,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.ReturnStatement, data); 

            returnKeyword.parent = this;
            expression && (expression.parent = this);
            semicolonToken && (semicolonToken.parent = this);
        }
    }

    export class ObjectCreationExpressionSyntax extends SyntaxNode implements IMemberExpressionSyntax {
        public _isMemberExpression: any;
        public _isLeftHandSideExpression: any;
        public _isPostfixExpression: any;
        public _isUnaryExpression: any;
        public _isExpression: any;

        constructor(public newKeyword: ISyntaxToken,
                    public expression: IMemberExpressionSyntax,
                    public argumentList: ArgumentListSyntax,
                    data: number) {
            super(SyntaxKind.ObjectCreationExpression, data); 

            newKeyword.parent = this;
            expression.parent = this;
            argumentList && (argumentList.parent = this);
        }
    }

    export class SwitchStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any;
        public _isModuleElement: any;

        constructor(public switchKeyword: ISyntaxToken,
                    public openParenToken: ISyntaxToken,
                    public expression: IExpressionSyntax,
                    public closeParenToken: ISyntaxToken,
                    public openBraceToken: ISyntaxToken,
                    public switchClauses: ISwitchClauseSyntax[],
                    public closeBraceToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.SwitchStatement, data); 

            switchKeyword.parent = this;
            openParenToken.parent = this;
            expression.parent = this;
            closeParenToken.parent = this;
            openBraceToken.parent = this;
            !isShared(switchClauses) && (switchClauses.parent = this);
            closeBraceToken.parent = this;
        }
    }

    export class CaseSwitchClauseSyntax extends SyntaxNode implements ISwitchClauseSyntax {
        public _isSwitchClause: any;

        constructor(public caseKeyword: ISyntaxToken,
                    public expression: IExpressionSyntax,
                    public colonToken: ISyntaxToken,
                    public statements: IStatementSyntax[],
                    data: number) {
            super(SyntaxKind.CaseSwitchClause, data); 

            caseKeyword.parent = this;
            expression.parent = this;
            colonToken.parent = this;
            !isShared(statements) && (statements.parent = this);
        }
    }

    export class DefaultSwitchClauseSyntax extends SyntaxNode implements ISwitchClauseSyntax {
        public _isSwitchClause: any;

        constructor(public defaultKeyword: ISyntaxToken,
                    public colonToken: ISyntaxToken,
                    public statements: IStatementSyntax[],
                    data: number) {
            super(SyntaxKind.DefaultSwitchClause, data); 

            defaultKeyword.parent = this;
            colonToken.parent = this;
            !isShared(statements) && (statements.parent = this);
        }
    }

    export class BreakStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any;
        public _isModuleElement: any;

        constructor(public breakKeyword: ISyntaxToken,
                    public identifier: ISyntaxToken,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.BreakStatement, data); 

            breakKeyword.parent = this;
            identifier && (identifier.parent = this);
            semicolonToken && (semicolonToken.parent = this);
        }
    }

    export class ContinueStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any;
        public _isModuleElement: any;

        constructor(public continueKeyword: ISyntaxToken,
                    public identifier: ISyntaxToken,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.ContinueStatement, data); 

            continueKeyword.parent = this;
            identifier && (identifier.parent = this);
            semicolonToken && (semicolonToken.parent = this);
        }
    }

    export class ForStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any;
        public _isModuleElement: any;

        constructor(public forKeyword: ISyntaxToken,
                    public openParenToken: ISyntaxToken,
                    public variableDeclaration: VariableDeclarationSyntax,
                    public initializer: IExpressionSyntax,
                    public firstSemicolonToken: ISyntaxToken,
                    public condition: IExpressionSyntax,
                    public secondSemicolonToken: ISyntaxToken,
                    public incrementor: IExpressionSyntax,
                    public closeParenToken: ISyntaxToken,
                    public statement: IStatementSyntax,
                    data: number) {
            super(SyntaxKind.ForStatement, data); 

            forKeyword.parent = this;
            openParenToken.parent = this;
            variableDeclaration && (variableDeclaration.parent = this);
            initializer && (initializer.parent = this);
            firstSemicolonToken.parent = this;
            condition && (condition.parent = this);
            secondSemicolonToken.parent = this;
            incrementor && (incrementor.parent = this);
            closeParenToken.parent = this;
            statement.parent = this;
        }
    }

    export class ForInStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any;
        public _isModuleElement: any;

        constructor(public forKeyword: ISyntaxToken,
                    public openParenToken: ISyntaxToken,
                    public variableDeclaration: VariableDeclarationSyntax,
                    public left: IExpressionSyntax,
                    public inKeyword: ISyntaxToken,
                    public expression: IExpressionSyntax,
                    public closeParenToken: ISyntaxToken,
                    public statement: IStatementSyntax,
                    data: number) {
            super(SyntaxKind.ForInStatement, data); 

            forKeyword.parent = this;
            openParenToken.parent = this;
            variableDeclaration && (variableDeclaration.parent = this);
            left && (left.parent = this);
            inKeyword.parent = this;
            expression.parent = this;
            closeParenToken.parent = this;
            statement.parent = this;
        }
    }

    export class WhileStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any;
        public _isModuleElement: any;

        constructor(public whileKeyword: ISyntaxToken,
                    public openParenToken: ISyntaxToken,
                    public condition: IExpressionSyntax,
                    public closeParenToken: ISyntaxToken,
                    public statement: IStatementSyntax,
                    data: number) {
            super(SyntaxKind.WhileStatement, data); 

            whileKeyword.parent = this;
            openParenToken.parent = this;
            condition.parent = this;
            closeParenToken.parent = this;
            statement.parent = this;
        }
    }

    export class WithStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any;
        public _isModuleElement: any;

        constructor(public withKeyword: ISyntaxToken,
                    public openParenToken: ISyntaxToken,
                    public condition: IExpressionSyntax,
                    public closeParenToken: ISyntaxToken,
                    public statement: IStatementSyntax,
                    data: number) {
            super(SyntaxKind.WithStatement, data); 

            withKeyword.parent = this;
            openParenToken.parent = this;
            condition.parent = this;
            closeParenToken.parent = this;
            statement.parent = this;
        }
    }

    export class EnumDeclarationSyntax extends SyntaxNode implements IModuleElementSyntax {
        public _isModuleElement: any;

        constructor(public modifiers: ISyntaxToken[],
                    public enumKeyword: ISyntaxToken,
                    public identifier: ISyntaxToken,
                    public openBraceToken: ISyntaxToken,
                    public enumElements: EnumElementSyntax[],
                    public closeBraceToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.EnumDeclaration, data); 

            !isShared(modifiers) && (modifiers.parent = this);
            enumKeyword.parent = this;
            identifier.parent = this;
            openBraceToken.parent = this;
            !isShared(enumElements) && (enumElements.parent = this);
            closeBraceToken.parent = this;
        }
    }

    export class EnumElementSyntax extends SyntaxNode {
        constructor(public propertyName: ISyntaxToken,
                    public equalsValueClause: EqualsValueClauseSyntax,
                    data: number) {
            super(SyntaxKind.EnumElement, data); 

            propertyName.parent = this;
            equalsValueClause && (equalsValueClause.parent = this);
        }
    }

    export class CastExpressionSyntax extends SyntaxNode implements IUnaryExpressionSyntax {
        public _isUnaryExpression: any;
        public _isExpression: any;

        constructor(public lessThanToken: ISyntaxToken,
                    public type: ITypeSyntax,
                    public greaterThanToken: ISyntaxToken,
                    public expression: IUnaryExpressionSyntax,
                    data: number) {
            super(SyntaxKind.CastExpression, data); 

            lessThanToken.parent = this;
            type.parent = this;
            greaterThanToken.parent = this;
            expression.parent = this;
        }
    }

    export class ObjectLiteralExpressionSyntax extends SyntaxNode implements IPrimaryExpressionSyntax {
        public _isPrimaryExpression: any;
        public _isMemberExpression: any;
        public _isLeftHandSideExpression: any;
        public _isPostfixExpression: any;
        public _isUnaryExpression: any;
        public _isExpression: any;

        constructor(public openBraceToken: ISyntaxToken,
                    public propertyAssignments: IPropertyAssignmentSyntax[],
                    public closeBraceToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.ObjectLiteralExpression, data); 

            openBraceToken.parent = this;
            !isShared(propertyAssignments) && (propertyAssignments.parent = this);
            closeBraceToken.parent = this;
        }
    }

    export class SimplePropertyAssignmentSyntax extends SyntaxNode implements IPropertyAssignmentSyntax {
        public _isPropertyAssignment: any;

        constructor(public propertyName: ISyntaxToken,
                    public colonToken: ISyntaxToken,
                    public expression: IExpressionSyntax,
                    data: number) {
            super(SyntaxKind.SimplePropertyAssignment, data); 

            propertyName.parent = this;
            colonToken.parent = this;
            expression.parent = this;
        }
    }

    export class FunctionPropertyAssignmentSyntax extends SyntaxNode implements IPropertyAssignmentSyntax {
        public _isPropertyAssignment: any;

        constructor(public propertyName: ISyntaxToken,
                    public callSignature: CallSignatureSyntax,
                    public block: BlockSyntax,
                    data: number) {
            super(SyntaxKind.FunctionPropertyAssignment, data); 

            propertyName.parent = this;
            callSignature.parent = this;
            block.parent = this;
        }
    }

    export class FunctionExpressionSyntax extends SyntaxNode implements IPrimaryExpressionSyntax {
        public _isPrimaryExpression: any;
        public _isMemberExpression: any;
        public _isLeftHandSideExpression: any;
        public _isPostfixExpression: any;
        public _isUnaryExpression: any;
        public _isExpression: any;

        constructor(public functionKeyword: ISyntaxToken,
                    public identifier: ISyntaxToken,
                    public callSignature: CallSignatureSyntax,
                    public block: BlockSyntax,
                    data: number) {
            super(SyntaxKind.FunctionExpression, data); 

            functionKeyword.parent = this;
            identifier && (identifier.parent = this);
            callSignature.parent = this;
            block.parent = this;
        }
    }

    export class EmptyStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any;
        public _isModuleElement: any;

        constructor(public semicolonToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.EmptyStatement, data); 

            semicolonToken.parent = this;
        }
    }

    export class TryStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any;
        public _isModuleElement: any;

        constructor(public tryKeyword: ISyntaxToken,
                    public block: BlockSyntax,
                    public catchClause: CatchClauseSyntax,
                    public finallyClause: FinallyClauseSyntax,
                    data: number) {
            super(SyntaxKind.TryStatement, data); 

            tryKeyword.parent = this;
            block.parent = this;
            catchClause && (catchClause.parent = this);
            finallyClause && (finallyClause.parent = this);
        }
    }

    export class CatchClauseSyntax extends SyntaxNode {
        constructor(public catchKeyword: ISyntaxToken,
                    public openParenToken: ISyntaxToken,
                    public identifier: ISyntaxToken,
                    public typeAnnotation: TypeAnnotationSyntax,
                    public closeParenToken: ISyntaxToken,
                    public block: BlockSyntax,
                    data: number) {
            super(SyntaxKind.CatchClause, data); 

            catchKeyword.parent = this;
            openParenToken.parent = this;
            identifier.parent = this;
            typeAnnotation && (typeAnnotation.parent = this);
            closeParenToken.parent = this;
            block.parent = this;
        }
    }

    export class FinallyClauseSyntax extends SyntaxNode {
        constructor(public finallyKeyword: ISyntaxToken,
                    public block: BlockSyntax,
                    data: number) {
            super(SyntaxKind.FinallyClause, data); 

            finallyKeyword.parent = this;
            block.parent = this;
        }
    }

    export class LabeledStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any;
        public _isModuleElement: any;

        constructor(public identifier: ISyntaxToken,
                    public colonToken: ISyntaxToken,
                    public statement: IStatementSyntax,
                    data: number) {
            super(SyntaxKind.LabeledStatement, data); 

            identifier.parent = this;
            colonToken.parent = this;
            statement.parent = this;
        }
    }

    export class DoStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any;
        public _isModuleElement: any;

        constructor(public doKeyword: ISyntaxToken,
                    public statement: IStatementSyntax,
                    public whileKeyword: ISyntaxToken,
                    public openParenToken: ISyntaxToken,
                    public condition: IExpressionSyntax,
                    public closeParenToken: ISyntaxToken,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.DoStatement, data); 

            doKeyword.parent = this;
            statement.parent = this;
            whileKeyword.parent = this;
            openParenToken.parent = this;
            condition.parent = this;
            closeParenToken.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }
    }

    export class TypeOfExpressionSyntax extends SyntaxNode implements IUnaryExpressionSyntax {
        public _isUnaryExpression: any;
        public _isExpression: any;

        constructor(public typeOfKeyword: ISyntaxToken,
                    public expression: IUnaryExpressionSyntax,
                    data: number) {
            super(SyntaxKind.TypeOfExpression, data); 

            typeOfKeyword.parent = this;
            expression.parent = this;
        }
    }

    export class DeleteExpressionSyntax extends SyntaxNode implements IUnaryExpressionSyntax {
        public _isUnaryExpression: any;
        public _isExpression: any;

        constructor(public deleteKeyword: ISyntaxToken,
                    public expression: IUnaryExpressionSyntax,
                    data: number) {
            super(SyntaxKind.DeleteExpression, data); 

            deleteKeyword.parent = this;
            expression.parent = this;
        }
    }

    export class VoidExpressionSyntax extends SyntaxNode implements IUnaryExpressionSyntax {
        public _isUnaryExpression: any;
        public _isExpression: any;

        constructor(public voidKeyword: ISyntaxToken,
                    public expression: IUnaryExpressionSyntax,
                    data: number) {
            super(SyntaxKind.VoidExpression, data); 

            voidKeyword.parent = this;
            expression.parent = this;
        }
    }

    export class DebuggerStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any;
        public _isModuleElement: any;

        constructor(public debuggerKeyword: ISyntaxToken,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(SyntaxKind.DebuggerStatement, data); 

            debuggerKeyword.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }
    }
}