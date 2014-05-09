///<reference path='references.ts' />

module TypeScript {
    export var nodeMetadata: string[][] = ArrayUtilities.createArray<string[]>(SyntaxKind.LastNode + 1, []);

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

    export class SourceUnitSyntax extends SyntaxNode {
        public syntaxTree: SyntaxTree = null;

        constructor(data: number, public moduleElements: IModuleElementSyntax[], public endOfFileToken: ISyntaxToken) {
            super(data);
            this.parent = null;
            !isShared(moduleElements) && (moduleElements.parent = this);
            endOfFileToken.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.SourceUnit; }
    }

    export class QualifiedNameSyntax extends SyntaxNode implements INameSyntax {
        public _isName: any; public _isType: any;
        constructor(data: number, public left: INameSyntax, public dotToken: ISyntaxToken, public right: ISyntaxToken) {
            super(data);
            left.parent = this;
            dotToken.parent = this;
            right.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.QualifiedName; }
    }

    export class ObjectTypeSyntax extends SyntaxNode implements ITypeSyntax {
        public _isType: any;
        constructor(data: number, public openBraceToken: ISyntaxToken, public typeMembers: ITypeMemberSyntax[], public closeBraceToken: ISyntaxToken) {
            super(data);
            openBraceToken.parent = this;
            !isShared(typeMembers) && (typeMembers.parent = this);
            closeBraceToken.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.ObjectType; }
    }

    export class FunctionTypeSyntax extends SyntaxNode implements ITypeSyntax {
        public _isType: any;
        constructor(data: number, public typeParameterList: TypeParameterListSyntax, public parameterList: ParameterListSyntax, public equalsGreaterThanToken: ISyntaxToken, public type: ITypeSyntax) {
            super(data);
            typeParameterList && (typeParameterList.parent = this);
            parameterList.parent = this;
            equalsGreaterThanToken.parent = this;
            type.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.FunctionType; }
    }

    export class ArrayTypeSyntax extends SyntaxNode implements ITypeSyntax {
        public _isType: any;
        constructor(data: number, public type: ITypeSyntax, public openBracketToken: ISyntaxToken, public closeBracketToken: ISyntaxToken) {
            super(data);
            type.parent = this;
            openBracketToken.parent = this;
            closeBracketToken.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.ArrayType; }
    }

    export class ConstructorTypeSyntax extends SyntaxNode implements ITypeSyntax {
        public _isType: any;
        constructor(data: number, public newKeyword: ISyntaxToken, public typeParameterList: TypeParameterListSyntax, public parameterList: ParameterListSyntax, public equalsGreaterThanToken: ISyntaxToken, public type: ITypeSyntax) {
            super(data);
            newKeyword.parent = this;
            typeParameterList && (typeParameterList.parent = this);
            parameterList.parent = this;
            equalsGreaterThanToken.parent = this;
            type.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.ConstructorType; }
    }

    export class GenericTypeSyntax extends SyntaxNode implements ITypeSyntax {
        public _isType: any;
        constructor(data: number, public name: INameSyntax, public typeArgumentList: TypeArgumentListSyntax) {
            super(data);
            name.parent = this;
            typeArgumentList.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.GenericType; }
    }

    export class TypeQuerySyntax extends SyntaxNode implements ITypeSyntax {
        public _isType: any;
        constructor(data: number, public typeOfKeyword: ISyntaxToken, public name: INameSyntax) {
            super(data);
            typeOfKeyword.parent = this;
            name.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.TypeQuery; }
    }

    export class InterfaceDeclarationSyntax extends SyntaxNode implements IModuleElementSyntax {
        public _isModuleElement: any;
        constructor(data: number, public modifiers: ISyntaxToken[], public interfaceKeyword: ISyntaxToken, public identifier: ISyntaxToken, public typeParameterList: TypeParameterListSyntax, public heritageClauses: HeritageClauseSyntax[], public body: ObjectTypeSyntax) {
            super(data);
            !isShared(modifiers) && (modifiers.parent = this);
            interfaceKeyword.parent = this;
            identifier.parent = this;
            typeParameterList && (typeParameterList.parent = this);
            !isShared(heritageClauses) && (heritageClauses.parent = this);
            body.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.InterfaceDeclaration; }
    }

    export class FunctionDeclarationSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any; public _isModuleElement: any;
        constructor(data: number, public modifiers: ISyntaxToken[], public functionKeyword: ISyntaxToken, public identifier: ISyntaxToken, public callSignature: CallSignatureSyntax, public block: BlockSyntax, public semicolonToken: ISyntaxToken) {
            super(data);
            !isShared(modifiers) && (modifiers.parent = this);
            functionKeyword.parent = this;
            identifier.parent = this;
            callSignature.parent = this;
            block && (block.parent = this);
            semicolonToken && (semicolonToken.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.FunctionDeclaration; }
    }

    export class ModuleDeclarationSyntax extends SyntaxNode implements IModuleElementSyntax {
        public _isModuleElement: any;
        constructor(data: number, public modifiers: ISyntaxToken[], public moduleKeyword: ISyntaxToken, public name: INameSyntax, public stringLiteral: ISyntaxToken, public openBraceToken: ISyntaxToken, public moduleElements: IModuleElementSyntax[], public closeBraceToken: ISyntaxToken) {
            super(data);
            !isShared(modifiers) && (modifiers.parent = this);
            moduleKeyword.parent = this;
            name && (name.parent = this);
            stringLiteral && (stringLiteral.parent = this);
            openBraceToken.parent = this;
            !isShared(moduleElements) && (moduleElements.parent = this);
            closeBraceToken.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.ModuleDeclaration; }
    }

    export class ClassDeclarationSyntax extends SyntaxNode implements IModuleElementSyntax {
        public _isModuleElement: any;
        constructor(data: number, public modifiers: ISyntaxToken[], public classKeyword: ISyntaxToken, public identifier: ISyntaxToken, public typeParameterList: TypeParameterListSyntax, public heritageClauses: HeritageClauseSyntax[], public openBraceToken: ISyntaxToken, public classElements: IClassElementSyntax[], public closeBraceToken: ISyntaxToken) {
            super(data);
            !isShared(modifiers) && (modifiers.parent = this);
            classKeyword.parent = this;
            identifier.parent = this;
            typeParameterList && (typeParameterList.parent = this);
            !isShared(heritageClauses) && (heritageClauses.parent = this);
            openBraceToken.parent = this;
            !isShared(classElements) && (classElements.parent = this);
            closeBraceToken.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.ClassDeclaration; }
    }

    export class EnumDeclarationSyntax extends SyntaxNode implements IModuleElementSyntax {
        public _isModuleElement: any;
        constructor(data: number, public modifiers: ISyntaxToken[], public enumKeyword: ISyntaxToken, public identifier: ISyntaxToken, public openBraceToken: ISyntaxToken, public enumElements: EnumElementSyntax[], public closeBraceToken: ISyntaxToken) {
            super(data);
            !isShared(modifiers) && (modifiers.parent = this);
            enumKeyword.parent = this;
            identifier.parent = this;
            openBraceToken.parent = this;
            !isShared(enumElements) && (enumElements.parent = this);
            closeBraceToken.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.EnumDeclaration; }
    }

    export class ImportDeclarationSyntax extends SyntaxNode implements IModuleElementSyntax {
        public _isModuleElement: any;
        constructor(data: number, public modifiers: ISyntaxToken[], public importKeyword: ISyntaxToken, public identifier: ISyntaxToken, public equalsToken: ISyntaxToken, public moduleReference: IModuleReferenceSyntax, public semicolonToken: ISyntaxToken) {
            super(data);
            !isShared(modifiers) && (modifiers.parent = this);
            importKeyword.parent = this;
            identifier.parent = this;
            equalsToken.parent = this;
            moduleReference.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.ImportDeclaration; }
    }

    export class ExportAssignmentSyntax extends SyntaxNode implements IModuleElementSyntax {
        public _isModuleElement: any;
        constructor(data: number, public exportKeyword: ISyntaxToken, public equalsToken: ISyntaxToken, public identifier: ISyntaxToken, public semicolonToken: ISyntaxToken) {
            super(data);
            exportKeyword.parent = this;
            equalsToken.parent = this;
            identifier.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.ExportAssignment; }
    }

    export class MemberFunctionDeclarationSyntax extends SyntaxNode implements IMemberDeclarationSyntax {
        public _isMemberDeclaration: any; public _isClassElement: any;
        constructor(data: number, public modifiers: ISyntaxToken[], public propertyName: ISyntaxToken, public callSignature: CallSignatureSyntax, public block: BlockSyntax, public semicolonToken: ISyntaxToken) {
            super(data);
            !isShared(modifiers) && (modifiers.parent = this);
            propertyName.parent = this;
            callSignature.parent = this;
            block && (block.parent = this);
            semicolonToken && (semicolonToken.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.MemberFunctionDeclaration; }
    }

    export class MemberVariableDeclarationSyntax extends SyntaxNode implements IMemberDeclarationSyntax {
        public _isMemberDeclaration: any; public _isClassElement: any;
        constructor(data: number, public modifiers: ISyntaxToken[], public variableDeclarator: VariableDeclaratorSyntax, public semicolonToken: ISyntaxToken) {
            super(data);
            !isShared(modifiers) && (modifiers.parent = this);
            variableDeclarator.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.MemberVariableDeclaration; }
    }

    export class ConstructorDeclarationSyntax extends SyntaxNode implements IClassElementSyntax {
        public _isClassElement: any;
        constructor(data: number, public modifiers: ISyntaxToken[], public constructorKeyword: ISyntaxToken, public callSignature: CallSignatureSyntax, public block: BlockSyntax, public semicolonToken: ISyntaxToken) {
            super(data);
            !isShared(modifiers) && (modifiers.parent = this);
            constructorKeyword.parent = this;
            callSignature.parent = this;
            block && (block.parent = this);
            semicolonToken && (semicolonToken.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.ConstructorDeclaration; }
    }

    export class IndexMemberDeclarationSyntax extends SyntaxNode implements IClassElementSyntax {
        public _isClassElement: any;
        constructor(data: number, public modifiers: ISyntaxToken[], public indexSignature: IndexSignatureSyntax, public semicolonToken: ISyntaxToken) {
            super(data);
            !isShared(modifiers) && (modifiers.parent = this);
            indexSignature.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.IndexMemberDeclaration; }
    }

    export class GetAccessorSyntax extends SyntaxNode implements IMemberDeclarationSyntax, IPropertyAssignmentSyntax {
        public _isMemberDeclaration: any; public _isPropertyAssignment: any; public _isClassElement: any;
        constructor(data: number, public modifiers: ISyntaxToken[], public getKeyword: ISyntaxToken, public propertyName: ISyntaxToken, public parameterList: ParameterListSyntax, public typeAnnotation: TypeAnnotationSyntax, public block: BlockSyntax) {
            super(data);
            !isShared(modifiers) && (modifiers.parent = this);
            getKeyword.parent = this;
            propertyName.parent = this;
            parameterList.parent = this;
            typeAnnotation && (typeAnnotation.parent = this);
            block.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.GetAccessor; }
    }

    export class SetAccessorSyntax extends SyntaxNode implements IMemberDeclarationSyntax, IPropertyAssignmentSyntax {
        public _isMemberDeclaration: any; public _isPropertyAssignment: any; public _isClassElement: any;
        constructor(data: number, public modifiers: ISyntaxToken[], public setKeyword: ISyntaxToken, public propertyName: ISyntaxToken, public parameterList: ParameterListSyntax, public block: BlockSyntax) {
            super(data);
            !isShared(modifiers) && (modifiers.parent = this);
            setKeyword.parent = this;
            propertyName.parent = this;
            parameterList.parent = this;
            block.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.SetAccessor; }
    }

    export class PropertySignatureSyntax extends SyntaxNode implements ITypeMemberSyntax {
        public _isTypeMember: any;
        constructor(data: number, public propertyName: ISyntaxToken, public questionToken: ISyntaxToken, public typeAnnotation: TypeAnnotationSyntax) {
            super(data);
            propertyName.parent = this;
            questionToken && (questionToken.parent = this);
            typeAnnotation && (typeAnnotation.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.PropertySignature; }
    }

    export class CallSignatureSyntax extends SyntaxNode implements ITypeMemberSyntax {
        public _isTypeMember: any;
        constructor(data: number, public typeParameterList: TypeParameterListSyntax, public parameterList: ParameterListSyntax, public typeAnnotation: TypeAnnotationSyntax) {
            super(data);
            typeParameterList && (typeParameterList.parent = this);
            parameterList.parent = this;
            typeAnnotation && (typeAnnotation.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.CallSignature; }
    }

    export class ConstructSignatureSyntax extends SyntaxNode implements ITypeMemberSyntax {
        public _isTypeMember: any;
        constructor(data: number, public newKeyword: ISyntaxToken, public callSignature: CallSignatureSyntax) {
            super(data);
            newKeyword.parent = this;
            callSignature.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.ConstructSignature; }
    }

    export class IndexSignatureSyntax extends SyntaxNode implements ITypeMemberSyntax {
        public _isTypeMember: any;
        constructor(data: number, public openBracketToken: ISyntaxToken, public parameter: ParameterSyntax, public closeBracketToken: ISyntaxToken, public typeAnnotation: TypeAnnotationSyntax) {
            super(data);
            openBracketToken.parent = this;
            parameter.parent = this;
            closeBracketToken.parent = this;
            typeAnnotation && (typeAnnotation.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.IndexSignature; }
    }

    export class MethodSignatureSyntax extends SyntaxNode implements ITypeMemberSyntax {
        public _isTypeMember: any;
        constructor(data: number, public propertyName: ISyntaxToken, public questionToken: ISyntaxToken, public callSignature: CallSignatureSyntax) {
            super(data);
            propertyName.parent = this;
            questionToken && (questionToken.parent = this);
            callSignature.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.MethodSignature; }
    }

    export class BlockSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any; public _isModuleElement: any;
        constructor(data: number, public openBraceToken: ISyntaxToken, public statements: IStatementSyntax[], public closeBraceToken: ISyntaxToken) {
            super(data);
            openBraceToken.parent = this;
            !isShared(statements) && (statements.parent = this);
            closeBraceToken.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.Block; }
    }

    export class IfStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any; public _isModuleElement: any;
        constructor(data: number, public ifKeyword: ISyntaxToken, public openParenToken: ISyntaxToken, public condition: IExpressionSyntax, public closeParenToken: ISyntaxToken, public statement: IStatementSyntax, public elseClause: ElseClauseSyntax) {
            super(data);
            ifKeyword.parent = this;
            openParenToken.parent = this;
            condition.parent = this;
            closeParenToken.parent = this;
            statement.parent = this;
            elseClause && (elseClause.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.IfStatement; }
    }

    export class VariableStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any; public _isModuleElement: any;
        constructor(data: number, public modifiers: ISyntaxToken[], public variableDeclaration: VariableDeclarationSyntax, public semicolonToken: ISyntaxToken) {
            super(data);
            !isShared(modifiers) && (modifiers.parent = this);
            variableDeclaration.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.VariableStatement; }
    }

    export class ExpressionStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any; public _isModuleElement: any;
        constructor(data: number, public expression: IExpressionSyntax, public semicolonToken: ISyntaxToken) {
            super(data);
            expression.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.ExpressionStatement; }
    }

    export class ReturnStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any; public _isModuleElement: any;
        constructor(data: number, public returnKeyword: ISyntaxToken, public expression: IExpressionSyntax, public semicolonToken: ISyntaxToken) {
            super(data);
            returnKeyword.parent = this;
            expression && (expression.parent = this);
            semicolonToken && (semicolonToken.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.ReturnStatement; }
    }

    export class SwitchStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any; public _isModuleElement: any;
        constructor(data: number, public switchKeyword: ISyntaxToken, public openParenToken: ISyntaxToken, public expression: IExpressionSyntax, public closeParenToken: ISyntaxToken, public openBraceToken: ISyntaxToken, public switchClauses: ISwitchClauseSyntax[], public closeBraceToken: ISyntaxToken) {
            super(data);
            switchKeyword.parent = this;
            openParenToken.parent = this;
            expression.parent = this;
            closeParenToken.parent = this;
            openBraceToken.parent = this;
            !isShared(switchClauses) && (switchClauses.parent = this);
            closeBraceToken.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.SwitchStatement; }
    }

    export class BreakStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any; public _isModuleElement: any;
        constructor(data: number, public breakKeyword: ISyntaxToken, public identifier: ISyntaxToken, public semicolonToken: ISyntaxToken) {
            super(data);
            breakKeyword.parent = this;
            identifier && (identifier.parent = this);
            semicolonToken && (semicolonToken.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.BreakStatement; }
    }

    export class ContinueStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any; public _isModuleElement: any;
        constructor(data: number, public continueKeyword: ISyntaxToken, public identifier: ISyntaxToken, public semicolonToken: ISyntaxToken) {
            super(data);
            continueKeyword.parent = this;
            identifier && (identifier.parent = this);
            semicolonToken && (semicolonToken.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.ContinueStatement; }
    }

    export class ForStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any; public _isModuleElement: any;
        constructor(data: number, public forKeyword: ISyntaxToken, public openParenToken: ISyntaxToken, public variableDeclaration: VariableDeclarationSyntax, public initializer: IExpressionSyntax, public firstSemicolonToken: ISyntaxToken, public condition: IExpressionSyntax, public secondSemicolonToken: ISyntaxToken, public incrementor: IExpressionSyntax, public closeParenToken: ISyntaxToken, public statement: IStatementSyntax) {
            super(data);
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
        public kind(): SyntaxKind { return SyntaxKind.ForStatement; }
    }

    export class ForInStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any; public _isModuleElement: any;
        constructor(data: number, public forKeyword: ISyntaxToken, public openParenToken: ISyntaxToken, public variableDeclaration: VariableDeclarationSyntax, public left: IExpressionSyntax, public inKeyword: ISyntaxToken, public expression: IExpressionSyntax, public closeParenToken: ISyntaxToken, public statement: IStatementSyntax) {
            super(data);
            forKeyword.parent = this;
            openParenToken.parent = this;
            variableDeclaration && (variableDeclaration.parent = this);
            left && (left.parent = this);
            inKeyword.parent = this;
            expression.parent = this;
            closeParenToken.parent = this;
            statement.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.ForInStatement; }
    }

    export class EmptyStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any; public _isModuleElement: any;
        constructor(data: number, public semicolonToken: ISyntaxToken) {
            super(data);
            semicolonToken.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.EmptyStatement; }
    }

    export class ThrowStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any; public _isModuleElement: any;
        constructor(data: number, public throwKeyword: ISyntaxToken, public expression: IExpressionSyntax, public semicolonToken: ISyntaxToken) {
            super(data);
            throwKeyword.parent = this;
            expression.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.ThrowStatement; }
    }

    export class WhileStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any; public _isModuleElement: any;
        constructor(data: number, public whileKeyword: ISyntaxToken, public openParenToken: ISyntaxToken, public condition: IExpressionSyntax, public closeParenToken: ISyntaxToken, public statement: IStatementSyntax) {
            super(data);
            whileKeyword.parent = this;
            openParenToken.parent = this;
            condition.parent = this;
            closeParenToken.parent = this;
            statement.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.WhileStatement; }
    }

    export class TryStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any; public _isModuleElement: any;
        constructor(data: number, public tryKeyword: ISyntaxToken, public block: BlockSyntax, public catchClause: CatchClauseSyntax, public finallyClause: FinallyClauseSyntax) {
            super(data);
            tryKeyword.parent = this;
            block.parent = this;
            catchClause && (catchClause.parent = this);
            finallyClause && (finallyClause.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.TryStatement; }
    }

    export class LabeledStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any; public _isModuleElement: any;
        constructor(data: number, public identifier: ISyntaxToken, public colonToken: ISyntaxToken, public statement: IStatementSyntax) {
            super(data);
            identifier.parent = this;
            colonToken.parent = this;
            statement.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.LabeledStatement; }
    }

    export class DoStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any; public _isModuleElement: any;
        constructor(data: number, public doKeyword: ISyntaxToken, public statement: IStatementSyntax, public whileKeyword: ISyntaxToken, public openParenToken: ISyntaxToken, public condition: IExpressionSyntax, public closeParenToken: ISyntaxToken, public semicolonToken: ISyntaxToken) {
            super(data);
            doKeyword.parent = this;
            statement.parent = this;
            whileKeyword.parent = this;
            openParenToken.parent = this;
            condition.parent = this;
            closeParenToken.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.DoStatement; }
    }

    export class DebuggerStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any; public _isModuleElement: any;
        constructor(data: number, public debuggerKeyword: ISyntaxToken, public semicolonToken: ISyntaxToken) {
            super(data);
            debuggerKeyword.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.DebuggerStatement; }
    }

    export class WithStatementSyntax extends SyntaxNode implements IStatementSyntax {
        public _isStatement: any; public _isModuleElement: any;
        constructor(data: number, public withKeyword: ISyntaxToken, public openParenToken: ISyntaxToken, public condition: IExpressionSyntax, public closeParenToken: ISyntaxToken, public statement: IStatementSyntax) {
            super(data);
            withKeyword.parent = this;
            openParenToken.parent = this;
            condition.parent = this;
            closeParenToken.parent = this;
            statement.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.WithStatement; }
    }

    export class PrefixUnaryExpressionSyntax extends SyntaxNode implements IUnaryExpressionSyntax {
        public _isUnaryExpression: any; public _isExpression: any;
        constructor(data: number, public operatorToken: ISyntaxToken, public operand: IUnaryExpressionSyntax) {
            super(data);
            operatorToken.parent = this;
            operand.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxFacts.getPrefixUnaryExpressionFromOperatorToken(this.operatorToken.kind()); }
    }

    export class DeleteExpressionSyntax extends SyntaxNode implements IUnaryExpressionSyntax {
        public _isUnaryExpression: any; public _isExpression: any;
        constructor(data: number, public deleteKeyword: ISyntaxToken, public expression: IUnaryExpressionSyntax) {
            super(data);
            deleteKeyword.parent = this;
            expression.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.DeleteExpression; }
    }

    export class TypeOfExpressionSyntax extends SyntaxNode implements IUnaryExpressionSyntax {
        public _isUnaryExpression: any; public _isExpression: any;
        constructor(data: number, public typeOfKeyword: ISyntaxToken, public expression: IUnaryExpressionSyntax) {
            super(data);
            typeOfKeyword.parent = this;
            expression.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.TypeOfExpression; }
    }

    export class VoidExpressionSyntax extends SyntaxNode implements IUnaryExpressionSyntax {
        public _isUnaryExpression: any; public _isExpression: any;
        constructor(data: number, public voidKeyword: ISyntaxToken, public expression: IUnaryExpressionSyntax) {
            super(data);
            voidKeyword.parent = this;
            expression.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.VoidExpression; }
    }

    export class ConditionalExpressionSyntax extends SyntaxNode implements IExpressionSyntax {
        public _isExpression: any;
        constructor(data: number, public condition: IExpressionSyntax, public questionToken: ISyntaxToken, public whenTrue: IExpressionSyntax, public colonToken: ISyntaxToken, public whenFalse: IExpressionSyntax) {
            super(data);
            condition.parent = this;
            questionToken.parent = this;
            whenTrue.parent = this;
            colonToken.parent = this;
            whenFalse.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.ConditionalExpression; }
    }

    export class BinaryExpressionSyntax extends SyntaxNode implements IExpressionSyntax {
        public _isExpression: any;
        constructor(data: number, public left: IExpressionSyntax, public operatorToken: ISyntaxToken, public right: IExpressionSyntax) {
            super(data);
            left.parent = this;
            operatorToken.parent = this;
            right.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxFacts.getBinaryExpressionFromOperatorToken(this.operatorToken.kind()); }
    }

    export class PostfixUnaryExpressionSyntax extends SyntaxNode implements IPostfixExpressionSyntax {
        public _isPostfixExpression: any; public _isUnaryExpression: any; public _isExpression: any;
        constructor(data: number, public operand: ILeftHandSideExpressionSyntax, public operatorToken: ISyntaxToken) {
            super(data);
            operand.parent = this;
            operatorToken.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxFacts.getPostfixUnaryExpressionFromOperatorToken(this.operatorToken.kind()); }
    }

    export class MemberAccessExpressionSyntax extends SyntaxNode implements IMemberExpressionSyntax, ICallExpressionSyntax {
        public _isMemberExpression: any; public _isCallExpression: any; public _isLeftHandSideExpression: any; public _isPostfixExpression: any; public _isUnaryExpression: any; public _isExpression: any;
        constructor(data: number, public expression: ILeftHandSideExpressionSyntax, public dotToken: ISyntaxToken, public name: ISyntaxToken) {
            super(data);
            expression.parent = this;
            dotToken.parent = this;
            name.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.MemberAccessExpression; }
    }

    export class InvocationExpressionSyntax extends SyntaxNode implements ICallExpressionSyntax {
        public _isCallExpression: any; public _isLeftHandSideExpression: any; public _isPostfixExpression: any; public _isUnaryExpression: any; public _isExpression: any;
        constructor(data: number, public expression: ILeftHandSideExpressionSyntax, public argumentList: ArgumentListSyntax) {
            super(data);
            expression.parent = this;
            argumentList.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.InvocationExpression; }
    }

    export class ArrayLiteralExpressionSyntax extends SyntaxNode implements IPrimaryExpressionSyntax {
        public _isPrimaryExpression: any; public _isMemberExpression: any; public _isLeftHandSideExpression: any; public _isPostfixExpression: any; public _isUnaryExpression: any; public _isExpression: any;
        constructor(data: number, public openBracketToken: ISyntaxToken, public expressions: IExpressionSyntax[], public closeBracketToken: ISyntaxToken) {
            super(data);
            openBracketToken.parent = this;
            !isShared(expressions) && (expressions.parent = this);
            closeBracketToken.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.ArrayLiteralExpression; }
    }

    export class ObjectLiteralExpressionSyntax extends SyntaxNode implements IPrimaryExpressionSyntax {
        public _isPrimaryExpression: any; public _isMemberExpression: any; public _isLeftHandSideExpression: any; public _isPostfixExpression: any; public _isUnaryExpression: any; public _isExpression: any;
        constructor(data: number, public openBraceToken: ISyntaxToken, public propertyAssignments: IPropertyAssignmentSyntax[], public closeBraceToken: ISyntaxToken) {
            super(data);
            openBraceToken.parent = this;
            !isShared(propertyAssignments) && (propertyAssignments.parent = this);
            closeBraceToken.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.ObjectLiteralExpression; }
    }

    export class ObjectCreationExpressionSyntax extends SyntaxNode implements IMemberExpressionSyntax {
        public _isMemberExpression: any; public _isLeftHandSideExpression: any; public _isPostfixExpression: any; public _isUnaryExpression: any; public _isExpression: any;
        constructor(data: number, public newKeyword: ISyntaxToken, public expression: IMemberExpressionSyntax, public argumentList: ArgumentListSyntax) {
            super(data);
            newKeyword.parent = this;
            expression.parent = this;
            argumentList && (argumentList.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.ObjectCreationExpression; }
    }

    export class ParenthesizedExpressionSyntax extends SyntaxNode implements IPrimaryExpressionSyntax {
        public _isPrimaryExpression: any; public _isMemberExpression: any; public _isLeftHandSideExpression: any; public _isPostfixExpression: any; public _isUnaryExpression: any; public _isExpression: any;
        constructor(data: number, public openParenToken: ISyntaxToken, public expression: IExpressionSyntax, public closeParenToken: ISyntaxToken) {
            super(data);
            openParenToken.parent = this;
            expression.parent = this;
            closeParenToken.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.ParenthesizedExpression; }
    }

    export class ParenthesizedArrowFunctionExpressionSyntax extends SyntaxNode implements IUnaryExpressionSyntax {
        public _isUnaryExpression: any; public _isExpression: any;
        constructor(data: number, public callSignature: CallSignatureSyntax, public equalsGreaterThanToken: ISyntaxToken, public block: BlockSyntax, public expression: IExpressionSyntax) {
            super(data);
            callSignature.parent = this;
            equalsGreaterThanToken.parent = this;
            block && (block.parent = this);
            expression && (expression.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.ParenthesizedArrowFunctionExpression; }
    }

    export class SimpleArrowFunctionExpressionSyntax extends SyntaxNode implements IUnaryExpressionSyntax {
        public _isUnaryExpression: any; public _isExpression: any;
        constructor(data: number, public identifier: ISyntaxToken, public equalsGreaterThanToken: ISyntaxToken, public block: BlockSyntax, public expression: IExpressionSyntax) {
            super(data);
            identifier.parent = this;
            equalsGreaterThanToken.parent = this;
            block && (block.parent = this);
            expression && (expression.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.SimpleArrowFunctionExpression; }
    }

    export class CastExpressionSyntax extends SyntaxNode implements IUnaryExpressionSyntax {
        public _isUnaryExpression: any; public _isExpression: any;
        constructor(data: number, public lessThanToken: ISyntaxToken, public type: ITypeSyntax, public greaterThanToken: ISyntaxToken, public expression: IUnaryExpressionSyntax) {
            super(data);
            lessThanToken.parent = this;
            type.parent = this;
            greaterThanToken.parent = this;
            expression.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.CastExpression; }
    }

    export class ElementAccessExpressionSyntax extends SyntaxNode implements IMemberExpressionSyntax, ICallExpressionSyntax {
        public _isMemberExpression: any; public _isCallExpression: any; public _isLeftHandSideExpression: any; public _isPostfixExpression: any; public _isUnaryExpression: any; public _isExpression: any;
        constructor(data: number, public expression: ILeftHandSideExpressionSyntax, public openBracketToken: ISyntaxToken, public argumentExpression: IExpressionSyntax, public closeBracketToken: ISyntaxToken) {
            super(data);
            expression.parent = this;
            openBracketToken.parent = this;
            argumentExpression.parent = this;
            closeBracketToken.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.ElementAccessExpression; }
    }

    export class FunctionExpressionSyntax extends SyntaxNode implements IPrimaryExpressionSyntax {
        public _isPrimaryExpression: any; public _isMemberExpression: any; public _isLeftHandSideExpression: any; public _isPostfixExpression: any; public _isUnaryExpression: any; public _isExpression: any;
        constructor(data: number, public functionKeyword: ISyntaxToken, public identifier: ISyntaxToken, public callSignature: CallSignatureSyntax, public block: BlockSyntax) {
            super(data);
            functionKeyword.parent = this;
            identifier && (identifier.parent = this);
            callSignature.parent = this;
            block.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.FunctionExpression; }
    }

    export class OmittedExpressionSyntax extends SyntaxNode implements IExpressionSyntax {
        public _isExpression: any;
        constructor(data: number) {
            super(data);
        }
        public kind(): SyntaxKind { return SyntaxKind.OmittedExpression; }
    }

    export class VariableDeclarationSyntax extends SyntaxNode {
        constructor(data: number, public varKeyword: ISyntaxToken, public variableDeclarators: VariableDeclaratorSyntax[]) {
            super(data);
            varKeyword.parent = this;
            !isShared(variableDeclarators) && (variableDeclarators.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.VariableDeclaration; }
    }

    export class VariableDeclaratorSyntax extends SyntaxNode {
        constructor(data: number, public propertyName: ISyntaxToken, public typeAnnotation: TypeAnnotationSyntax, public equalsValueClause: EqualsValueClauseSyntax) {
            super(data);
            propertyName.parent = this;
            typeAnnotation && (typeAnnotation.parent = this);
            equalsValueClause && (equalsValueClause.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.VariableDeclarator; }
    }

    export class ArgumentListSyntax extends SyntaxNode {
        constructor(data: number, public typeArgumentList: TypeArgumentListSyntax, public openParenToken: ISyntaxToken, public arguments: IExpressionSyntax[], public closeParenToken: ISyntaxToken) {
            super(data);
            typeArgumentList && (typeArgumentList.parent = this);
            openParenToken.parent = this;
            !isShared(arguments) && (arguments.parent = this);
            closeParenToken.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.ArgumentList; }
    }

    export class ParameterListSyntax extends SyntaxNode {
        constructor(data: number, public openParenToken: ISyntaxToken, public parameters: ParameterSyntax[], public closeParenToken: ISyntaxToken) {
            super(data);
            openParenToken.parent = this;
            !isShared(parameters) && (parameters.parent = this);
            closeParenToken.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.ParameterList; }
    }

    export class TypeArgumentListSyntax extends SyntaxNode {
        constructor(data: number, public lessThanToken: ISyntaxToken, public typeArguments: ITypeSyntax[], public greaterThanToken: ISyntaxToken) {
            super(data);
            lessThanToken.parent = this;
            !isShared(typeArguments) && (typeArguments.parent = this);
            greaterThanToken.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.TypeArgumentList; }
    }

    export class TypeParameterListSyntax extends SyntaxNode {
        constructor(data: number, public lessThanToken: ISyntaxToken, public typeParameters: TypeParameterSyntax[], public greaterThanToken: ISyntaxToken) {
            super(data);
            lessThanToken.parent = this;
            !isShared(typeParameters) && (typeParameters.parent = this);
            greaterThanToken.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.TypeParameterList; }
    }

    export class HeritageClauseSyntax extends SyntaxNode {
        constructor(data: number, public extendsOrImplementsKeyword: ISyntaxToken, public typeNames: INameSyntax[]) {
            super(data);
            extendsOrImplementsKeyword.parent = this;
            !isShared(typeNames) && (typeNames.parent = this);
        }
        public kind(): SyntaxKind { return this.extendsOrImplementsKeyword.kind() === SyntaxKind.ExtendsKeyword ? SyntaxKind.ExtendsHeritageClause : SyntaxKind.ImplementsHeritageClause; }
    }

    export class EqualsValueClauseSyntax extends SyntaxNode {
        constructor(data: number, public equalsToken: ISyntaxToken, public value: IExpressionSyntax) {
            super(data);
            equalsToken.parent = this;
            value.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.EqualsValueClause; }
    }

    export class CaseSwitchClauseSyntax extends SyntaxNode implements ISwitchClauseSyntax {
        public _isSwitchClause: any;
        constructor(data: number, public caseKeyword: ISyntaxToken, public expression: IExpressionSyntax, public colonToken: ISyntaxToken, public statements: IStatementSyntax[]) {
            super(data);
            caseKeyword.parent = this;
            expression.parent = this;
            colonToken.parent = this;
            !isShared(statements) && (statements.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.CaseSwitchClause; }
    }

    export class DefaultSwitchClauseSyntax extends SyntaxNode implements ISwitchClauseSyntax {
        public _isSwitchClause: any;
        constructor(data: number, public defaultKeyword: ISyntaxToken, public colonToken: ISyntaxToken, public statements: IStatementSyntax[]) {
            super(data);
            defaultKeyword.parent = this;
            colonToken.parent = this;
            !isShared(statements) && (statements.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.DefaultSwitchClause; }
    }

    export class ElseClauseSyntax extends SyntaxNode {
        constructor(data: number, public elseKeyword: ISyntaxToken, public statement: IStatementSyntax) {
            super(data);
            elseKeyword.parent = this;
            statement.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.ElseClause; }
    }

    export class CatchClauseSyntax extends SyntaxNode {
        constructor(data: number, public catchKeyword: ISyntaxToken, public openParenToken: ISyntaxToken, public identifier: ISyntaxToken, public typeAnnotation: TypeAnnotationSyntax, public closeParenToken: ISyntaxToken, public block: BlockSyntax) {
            super(data);
            catchKeyword.parent = this;
            openParenToken.parent = this;
            identifier.parent = this;
            typeAnnotation && (typeAnnotation.parent = this);
            closeParenToken.parent = this;
            block.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.CatchClause; }
    }

    export class FinallyClauseSyntax extends SyntaxNode {
        constructor(data: number, public finallyKeyword: ISyntaxToken, public block: BlockSyntax) {
            super(data);
            finallyKeyword.parent = this;
            block.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.FinallyClause; }
    }

    export class TypeParameterSyntax extends SyntaxNode {
        constructor(data: number, public identifier: ISyntaxToken, public constraint: ConstraintSyntax) {
            super(data);
            identifier.parent = this;
            constraint && (constraint.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.TypeParameter; }
    }

    export class ConstraintSyntax extends SyntaxNode {
        constructor(data: number, public extendsKeyword: ISyntaxToken, public type: ITypeSyntax) {
            super(data);
            extendsKeyword.parent = this;
            type.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.Constraint; }
    }

    export class SimplePropertyAssignmentSyntax extends SyntaxNode implements IPropertyAssignmentSyntax {
        public _isPropertyAssignment: any;
        constructor(data: number, public propertyName: ISyntaxToken, public colonToken: ISyntaxToken, public expression: IExpressionSyntax) {
            super(data);
            propertyName.parent = this;
            colonToken.parent = this;
            expression.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.SimplePropertyAssignment; }
    }

    export class FunctionPropertyAssignmentSyntax extends SyntaxNode implements IPropertyAssignmentSyntax {
        public _isPropertyAssignment: any;
        constructor(data: number, public propertyName: ISyntaxToken, public callSignature: CallSignatureSyntax, public block: BlockSyntax) {
            super(data);
            propertyName.parent = this;
            callSignature.parent = this;
            block.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.FunctionPropertyAssignment; }
    }

    export class ParameterSyntax extends SyntaxNode {
        constructor(data: number, public dotDotDotToken: ISyntaxToken, public modifiers: ISyntaxToken[], public identifier: ISyntaxToken, public questionToken: ISyntaxToken, public typeAnnotation: TypeAnnotationSyntax, public equalsValueClause: EqualsValueClauseSyntax) {
            super(data);
            dotDotDotToken && (dotDotDotToken.parent = this);
            !isShared(modifiers) && (modifiers.parent = this);
            identifier.parent = this;
            questionToken && (questionToken.parent = this);
            typeAnnotation && (typeAnnotation.parent = this);
            equalsValueClause && (equalsValueClause.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.Parameter; }
    }

    export class EnumElementSyntax extends SyntaxNode {
        constructor(data: number, public propertyName: ISyntaxToken, public equalsValueClause: EqualsValueClauseSyntax) {
            super(data);
            propertyName.parent = this;
            equalsValueClause && (equalsValueClause.parent = this);
        }
        public kind(): SyntaxKind { return SyntaxKind.EnumElement; }
    }

    export class TypeAnnotationSyntax extends SyntaxNode {
        constructor(data: number, public colonToken: ISyntaxToken, public type: ITypeSyntax) {
            super(data);
            colonToken.parent = this;
            type.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.TypeAnnotation; }
    }

    export class ExternalModuleReferenceSyntax extends SyntaxNode implements IModuleReferenceSyntax {
        public _isModuleReference: any;
        constructor(data: number, public requireKeyword: ISyntaxToken, public openParenToken: ISyntaxToken, public stringLiteral: ISyntaxToken, public closeParenToken: ISyntaxToken) {
            super(data);
            requireKeyword.parent = this;
            openParenToken.parent = this;
            stringLiteral.parent = this;
            closeParenToken.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.ExternalModuleReference; }
    }

    export class ModuleNameModuleReferenceSyntax extends SyntaxNode implements IModuleReferenceSyntax {
        public _isModuleReference: any;
        constructor(data: number, public moduleName: INameSyntax) {
            super(data);
            moduleName.parent = this;
        }
        public kind(): SyntaxKind { return SyntaxKind.ModuleNameModuleReference; }
    }
}