///<reference path='..\core\references.ts' />
///<reference path='..\core\environment.ts' />
///<reference path='syntaxFacts.ts' />
///<reference path='syntaxKind.ts' />

// Adds argument checking to the generated nodes.  Argument checking appears to slow things down
// parsing about 7%.  If we want to get that perf back, we can always remove this.
var argumentChecks = false;
var forPrettyPrinter = false;

interface ITypeDefinition {
    name: string;
    baseType: string;
    interfaces?: string[];
    children: IMemberDefinition[];
    syntaxKinds?: string[];
    isTypeScriptSpecific: boolean;
}

interface IMemberDefinition {
    name: string;
    type?: string;
    isToken?: boolean;
    isList?: boolean;
    isSeparatedList?: boolean;
    requiresAtLeastOneItem?: boolean;
    isOptional?: boolean;
    tokenKinds?: string[];
    isTypeScriptSpecific: boolean;
    elementType?: string;
}

var interfaces: TypeScript.IIndexable<any> = {
    IMemberDeclarationSyntax: 'IClassElementSyntax',
    IStatementSyntax: 'IModuleElementSyntax',
    INameSyntax: 'ITypeSyntax',
    IUnaryExpressionSyntax: 'IExpressionSyntax',
    IPostfixExpressionSyntax: 'IUnaryExpressionSyntax',
    ILeftHandSideExpressionSyntax: 'IPostfixExpressionSyntax',
    // Note: for simplicity's sake, we merge CallExpression, NewExpression and MemberExpression 
    // into IMemberExpression.
    IMemberExpressionSyntax: 'ILeftHandSideExpressionSyntax',
    ICallExpressionSyntax: 'ILeftHandSideExpressionSyntax',
    IPrimaryExpressionSyntax: 'IMemberExpressionSyntax',
};

var definitions:ITypeDefinition[] = [
    <any>{
        name: 'SourceUnitSyntax',
        baseType: 'SyntaxNode',
        children: [
            <any>{ name: 'moduleElements', isList: true, elementType: 'IModuleElementSyntax' },
            <any>{ name: 'endOfFileToken', isToken: true }
        ]
    },
    <any>{
        name: 'ExternalModuleReferenceSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IModuleReferenceSyntax'],
        children: [
            <any>{ name: 'requireKeyword', isToken: true, tokenKinds: ['RequireKeyword'] }, 
            <any>{ name: 'openParenToken', isToken: true },
            <any>{ name: 'stringLiteral', isToken: true, tokenKinds: ['StringLiteral'] },
            <any>{ name: 'closeParenToken', isToken: true }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'ModuleNameModuleReferenceSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IModuleReferenceSyntax'],
        children: [
            <any>{ name: 'moduleName', type: 'INameSyntax' }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'ImportDeclarationSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IModuleElementSyntax'],
        children: [
            <any>{ name: 'modifiers', isList: true, elementType: 'ISyntaxToken' },
            <any>{ name: 'importKeyword', isToken: true },
            <any>{ name: 'identifier', isToken: true, tokenKinds: ['IdentifierName'] },
            <any>{ name: 'equalsToken', isToken: true },
            <any>{ name: 'moduleReference', type: 'IModuleReferenceSyntax' },
            <any>{ name: 'semicolonToken', isToken: true, isOptional: true }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'ExportAssignmentSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IModuleElementSyntax'],
        children: [
            <any>{ name: 'exportKeyword', isToken: true },
            <any>{ name: 'equalsToken', isToken: true },
            <any>{ name: 'identifier', isToken: true, tokenKinds: ['IdentifierName'] },
            <any>{ name: 'semicolonToken', isToken: true, isOptional: true }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'ClassDeclarationSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IModuleElementSyntax'],
        children: [
            <any>{ name: 'modifiers', isList: true, elementType: 'ISyntaxToken' },
            <any>{ name: 'classKeyword', isToken: true },
            <any>{ name: 'identifier', isToken: true, tokenKinds: ['IdentifierName'] },
            <any>{ name: 'typeParameterList', type: 'TypeParameterListSyntax', isOptional: true },
            <any>{ name: 'heritageClauses', isList: true, elementType: 'HeritageClauseSyntax' },
            <any>{ name: 'openBraceToken', isToken: true },
            <any>{ name: 'classElements', isList: true, elementType: 'IClassElementSyntax' },
            <any>{ name: 'closeBraceToken', isToken: true }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'InterfaceDeclarationSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IModuleElementSyntax'],
        children: [
            <any>{ name: 'modifiers', isList: true, elementType: 'ISyntaxToken' },
            <any>{ name: 'interfaceKeyword', isToken: true },
            <any>{ name: 'identifier', isToken: true, tokenKinds: ['IdentifierName'] },
            <any>{ name: 'typeParameterList', type: 'TypeParameterListSyntax', isOptional: true },
            <any>{ name: 'heritageClauses', isList: true, elementType: 'HeritageClauseSyntax' },
            <any>{ name: 'body', type: 'ObjectTypeSyntax' }
        ],
        isTypeScriptSpecific: true
    },
    <any> {
        name: 'HeritageClauseSyntax',
        baseType: 'SyntaxNode',
        children: [
            <any>{ name: 'kind', type: 'SyntaxKind' },
            <any>{ name: 'extendsOrImplementsKeyword', isToken: true, tokenKinds: ['ExtendsKeyword', 'ImplementsKeyword'] },
            <any>{ name: 'typeNames', isSeparatedList: true, requiresAtLeastOneItem: true, elementType: 'INameSyntax' }
        ],
        syntaxKinds: ["ExtendsHeritageClause", "ImplementsHeritageClause"],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'ModuleDeclarationSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IModuleElementSyntax'],
        children: [
            <any>{ name: 'modifiers', isList: true, elementType: 'ISyntaxToken' },
            <any>{ name: 'moduleKeyword', isToken: true },
            <any>{ name: 'name', type: 'INameSyntax', isOptional: true },
            <any>{ name: 'stringLiteral', isToken: true, isOptional: true, tokenKinds: ['StringLiteral'] },
            <any>{ name: 'openBraceToken', isToken: true },
            <any>{ name: 'moduleElements', isList: true, elementType: 'IModuleElementSyntax' },
            <any>{ name: 'closeBraceToken', isToken: true }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'FunctionDeclarationSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IStatementSyntax'],
        children: [
            <any>{ name: 'modifiers', isList: true, elementType: 'ISyntaxToken', isTypeScriptSpecific: true },
            <any>{ name: 'functionKeyword', isToken: true },
            <any>{ name: 'identifier', isToken: true, tokenKinds: ['IdentifierName'] },
            <any>{ name: 'callSignature', type: 'CallSignatureSyntax' },
            <any>{ name: 'block', type: 'BlockSyntax', isOptional: true },
            <any>{ name: 'semicolonToken', isToken: true, isOptional: true }
        ]
    },
    <any>{
        name: 'VariableStatementSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IStatementSyntax'],
        children: [
            <any>{ name: 'modifiers', isList: true, elementType: 'ISyntaxToken', isTypeScriptSpecific: true },
            <any>{ name: 'variableDeclaration', type: 'VariableDeclarationSyntax' },
            <any>{ name: 'semicolonToken', isToken: true, isOptional: true }
        ]
    },
    <any>{
        name: 'VariableDeclarationSyntax',
        baseType: 'SyntaxNode',
        children: [
            <any>{ name: 'varKeyword', isToken: true },
            <any>{ name: 'variableDeclarators', isSeparatedList: true, requiresAtLeastOneItem: true, elementType: 'VariableDeclaratorSyntax' }
        ]
    },
    <any>{
        name: 'VariableDeclaratorSyntax',
        baseType: 'SyntaxNode',
        children: [
            <any>{ name: 'propertyName', isToken: true, tokenKinds: ['IdentifierName', 'StringLiteral', 'NumericLiteral'] },
            <any>{ name: 'typeAnnotation', type: 'TypeAnnotationSyntax', isOptional: true, isTypeScriptSpecific: true },
            <any>{ name: 'equalsValueClause', type: 'EqualsValueClauseSyntax', isOptional: true }
        ]
    },
    <any>{
        name: 'EqualsValueClauseSyntax',
        baseType: 'SyntaxNode',
        children: [
            <any>{ name: 'equalsToken', isToken: true },
            <any>{ name: 'value', type: 'IExpressionSyntax' }
        ]
    },
    <any>{
        name: 'PrefixUnaryExpressionSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IUnaryExpressionSyntax'],
        children: [
            <any>{ name: 'kind', type: 'SyntaxKind' },
            <any>{ name: 'operatorToken', isToken: true, tokenKinds: ['PlusPlusToken', 'MinusMinusToken', 'PlusToken', 'MinusToken', 'TildeToken', 'ExclamationToken'] },
            <any>{ name: 'operand', type: 'IUnaryExpressionSyntax' }
        ],
        syntaxKinds: ["PreIncrementExpression", "PreDecrementExpression", "PlusExpression", "NegateExpression", "BitwiseNotExpression", "LogicalNotExpression"],
    },
    <any>{
        name: 'ArrayLiteralExpressionSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IPrimaryExpressionSyntax'],
        children: [
            <any>{ name: 'openBracketToken', isToken: true },
            <any>{ name: 'expressions', isSeparatedList: true, elementType: 'IExpressionSyntax' },
            <any>{ name: 'closeBracketToken', isToken: true }
        ]
    },
    <any>{
        name: 'OmittedExpressionSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IExpressionSyntax'],
        children: <any>[]
    },
    <any>{
        name: 'ParenthesizedExpressionSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IPrimaryExpressionSyntax'],
        children: [
            <any>{ name: 'openParenToken', isToken: true },
            <any>{ name: 'expression', type: 'IExpressionSyntax' },
            <any>{ name: 'closeParenToken', isToken: true }
        ]
    },
    <any>{
        name: 'SimpleArrowFunctionExpressionSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IUnaryExpressionSyntax'],
        children: [
            <any>{ name: 'identifier', isToken: true, tokenKinds: ['IdentifierName'] },
            <any>{ name: 'equalsGreaterThanToken', isToken: true },
            <any>{ name: 'block', type: 'BlockSyntax', isOptional: true },
            <any>{ name: 'expression', type: 'IExpressionSyntax', isOptional: true }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'ParenthesizedArrowFunctionExpressionSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IUnaryExpressionSyntax'],
        children: [
            <any>{ name: 'callSignature', type: 'CallSignatureSyntax' },
            <any>{ name: 'equalsGreaterThanToken', isToken: true },
            <any>{ name: 'block', type: 'BlockSyntax', isOptional: true },
            <any>{ name: 'expression', type: 'IExpressionSyntax', isOptional: true }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'QualifiedNameSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['INameSyntax'],
        children: [
            <any>{ name: 'left', type: 'INameSyntax' },
            <any>{ name: 'dotToken', isToken: true },
            <any>{ name: 'right', isToken: true, tokenKinds:['IdentifierName'] }
        ],
        // Qualified names only show up in Types, which are TypeScript specific. Note that a dotted
        // expression (like A.B.Foo()) is a MemberAccessExpression, not a QualifiedName.
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'TypeArgumentListSyntax',
        baseType: 'SyntaxNode',
        children: [
                <any>{ name: 'lessThanToken', isToken: true },
                <any>{ name: 'typeArguments', isSeparatedList: true, elementType: 'ITypeSyntax' },
                <any>{ name: 'greaterThanToken', isToken: true }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'ConstructorTypeSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['ITypeSyntax'],
        children: [
            <any>{ name: 'newKeyword', isToken: true },
            <any>{ name: 'typeParameterList', type: 'TypeParameterListSyntax', isOptional: true },
            <any>{ name: 'parameterList', type: 'ParameterListSyntax' },
            <any>{ name: 'equalsGreaterThanToken', isToken: true },
            <any>{ name: 'type', type: 'ITypeSyntax' }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'FunctionTypeSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['ITypeSyntax'],
        children: [
            <any>{ name: 'typeParameterList', type: 'TypeParameterListSyntax', isOptional: true },
            <any>{ name: 'parameterList', type: 'ParameterListSyntax' },
            <any>{ name: 'equalsGreaterThanToken', isToken: true },
            <any>{ name: 'type', type: 'ITypeSyntax' }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'ObjectTypeSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['ITypeSyntax'],
        children: [
            <any>{ name: 'openBraceToken', isToken: true },
            <any>{ name: 'typeMembers', isSeparatedList: true, elementType: 'ITypeMemberSyntax' },
            <any>{ name: 'closeBraceToken', isToken: true }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'ArrayTypeSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['ITypeSyntax'],
        children: [
            <any>{ name: 'type', type: 'ITypeSyntax' },
            <any>{ name: 'openBracketToken', isToken: true },
            <any>{ name: 'closeBracketToken', isToken: true }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'GenericTypeSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['ITypeSyntax'],
        children: [
            <any>{ name: 'name', type: 'INameSyntax' },
            <any>{ name: 'typeArgumentList', type: 'TypeArgumentListSyntax' }
        ],
        isTypeScriptSpecific: true
    },
    <any> {
        name: 'TypeQuerySyntax',
        baseType: 'SyntaxNode',
        interfaces: ['ITypeSyntax'],
        children: [
            <any>{ name: 'typeOfKeyword', isToken: true },
            <any>{ name: 'name', type: 'INameSyntax' }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'TypeAnnotationSyntax',
        baseType: 'SyntaxNode',
        children: [
            <any>{ name: 'colonToken', isToken: true },
            <any>{ name: 'type', type: 'ITypeSyntax' }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'BlockSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IStatementSyntax'],
        children: [
            <any>{ name: 'openBraceToken', isToken: true },
            <any>{ name: 'statements', isList: true, elementType: 'IStatementSyntax' },
            <any>{ name: 'closeBraceToken', isToken: true }
        ]
    },
    <any>{
        name: 'ParameterSyntax',
        baseType: 'SyntaxNode',
        children: [
            <any>{ name: 'dotDotDotToken', isToken: true, isOptional: true, isTypeScriptSpecific: true },
            <any>{ name: 'modifiers', isList: true, elementType: 'ISyntaxToken' },
            <any>{ name: 'identifier', isToken: true, tokenKinds: ['IdentifierName'] },
            <any>{ name: 'questionToken', isToken: true, isOptional: true, isTypeScriptSpecific: true },
            <any>{ name: 'typeAnnotation', type: 'TypeAnnotationSyntax', isOptional: true, isTypeScriptSpecific: true },
            <any>{ name: 'equalsValueClause', type: 'EqualsValueClauseSyntax', isOptional: true, isTypeScriptSpecific: true }
        ]
    },
    <any>{
        name: 'MemberAccessExpressionSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IMemberExpressionSyntax', 'ICallExpressionSyntax'],
        children: [
            <any>{ name: 'expression', type: 'ILeftHandSideExpressionSyntax' },
            <any>{ name: 'dotToken', isToken: true },
            <any>{ name: 'name', isToken: true, tokenKinds: ['IdentifierName'] }
        ]
    },
    <any>{
        name: 'PostfixUnaryExpressionSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IPostfixExpressionSyntax'],
        children: [
            <any>{ name: 'kind', type: 'SyntaxKind' },
            <any>{ name: 'operand', type: 'ILeftHandSideExpressionSyntax' },
            <any>{ name: 'operatorToken', isToken: true, tokenKinds:['PlusPlusToken', 'MinusMinusToken'] }
        ],
        syntaxKinds: ["PostIncrementExpression", "PostDecrementExpression"],
    },
    <any>{
        name: 'ElementAccessExpressionSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IMemberExpressionSyntax', 'ICallExpressionSyntax'],
        children: [
            <any>{ name: 'expression', type: 'ILeftHandSideExpressionSyntax' },
            <any>{ name: 'openBracketToken', isToken: true },
            <any>{ name: 'argumentExpression', type: 'IExpressionSyntax' },
            <any>{ name: 'closeBracketToken', isToken: true }
        ]
    },
    <any>{
        name: 'InvocationExpressionSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['ICallExpressionSyntax'],
        children: [
            <any>{ name: 'expression', type: 'ILeftHandSideExpressionSyntax' },
            <any>{ name: 'argumentList', type: 'ArgumentListSyntax' }
        ]
    },
    <any>{
        name: 'ArgumentListSyntax',
        baseType: 'SyntaxNode',
        children: [
            <any>{ name: 'typeArgumentList', type: 'TypeArgumentListSyntax', isOptional: true },
            <any>{ name: 'openParenToken', isToken: true },
            <any>{ name: 'arguments', isSeparatedList: true, elementType: 'IExpressionSyntax' },
            <any>{ name: 'closeParenToken', isToken: true }
        ]
    },
    <any>{
        name: 'BinaryExpressionSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IExpressionSyntax'],
        children: [
            <any>{ name: 'kind', type: 'SyntaxKind' },
            <any>{ name: 'left', type: 'IExpressionSyntax' },
            <any>{ name: 'operatorToken', isToken: true,
                   tokenKinds:['AsteriskToken',  'SlashToken',  'PercentToken', 'PlusToken', 'MinusToken', 'LessThanLessThanToken',
                               'GreaterThanGreaterThanToken', 'GreaterThanGreaterThanGreaterThanToken', 'LessThanToken',
                               'GreaterThanToken', 'LessThanEqualsToken', 'GreaterThanEqualsToken', 'InstanceOfKeyword',
                               'InKeyword', 'EqualsEqualsToken', 'ExclamationEqualsToken', 'EqualsEqualsEqualsToken',
                               'ExclamationEqualsEqualsToken', 'AmpersandToken', 'CaretToken', 'BarToken', 'AmpersandAmpersandToken',
                               'BarBarToken', 'BarEqualsToken', 'AmpersandEqualsToken', 'CaretEqualsToken', 'LessThanLessThanEqualsToken',
                               'GreaterThanGreaterThanEqualsToken', 'GreaterThanGreaterThanGreaterThanEqualsToken', 'PlusEqualsToken',
                               'MinusEqualsToken', 'AsteriskEqualsToken', 'SlashEqualsToken', 'PercentEqualsToken', 'EqualsToken',
                               'CommaToken'] },
            <any>{ name: 'right', type: 'IExpressionSyntax' }
        ],
        syntaxKinds: ["MultiplyExpression", "DivideExpression", "ModuloExpression", "AddExpression", "SubtractExpression", "LeftShiftExpression",
            "SignedRightShiftExpression", "UnsignedRightShiftExpression", "LessThanExpression",
            "GreaterThanExpression", "LessThanOrEqualExpression", "GreaterThanOrEqualExpression", "InstanceOfExpression",
            "InExpression", "EqualsWithTypeConversionExpression", "NotEqualsWithTypeConversionExpression", "EqualsExpression",
            "NotEqualsExpression", "BitwiseAndExpression", "BitwiseExclusiveOrExpression", "BitwiseOrExpression", "LogicalAndExpression",
            "LogicalOrExpression", "OrAssignmentExpression", "AndAssignmentExpression", "ExclusiveOrAssignmentExpression", "LeftShiftAssignmentExpression",
            "SignedRightShiftAssignmentExpression", "UnsignedRightShiftAssignmentExpression", "AddAssignmentExpression",
            "SubtractAssignmentExpression", "MultiplyAssignmentExpression", "DivideAssignmentExpression", "ModuloAssignmentExpression", "AssignmentExpression",
            "CommaExpression"]
    },
    <any>{
        name: 'ConditionalExpressionSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IExpressionSyntax'],
        children: [
            <any>{ name: 'condition', type: 'IExpressionSyntax' },
            <any>{ name: 'questionToken', isToken: true },
            <any>{ name: 'whenTrue', type: 'IExpressionSyntax' },
            <any>{ name: 'colonToken', isToken: true },
            <any>{ name: 'whenFalse', type: 'IExpressionSyntax' }
        ]
    },
    <any>{
        name: 'ConstructSignatureSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['ITypeMemberSyntax'],
        children: [
            <any>{ name: 'newKeyword', isToken: true },
            <any>{ name: 'callSignature', type: 'CallSignatureSyntax' }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'MethodSignatureSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['ITypeMemberSyntax'],
        children: [
            <any>{ name: 'propertyName', isToken: true, tokenKinds: ['IdentifierName', 'StringLiteral', 'NumericLiteral'] },
            <any>{ name: 'questionToken', isToken: true, isOptional: true, itTypeScriptSpecific: true },
            <any>{ name: 'callSignature', type: 'CallSignatureSyntax' }
        ]
    },
    <any>{
        name: 'IndexSignatureSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['ITypeMemberSyntax'],
        children: [
            <any>{ name: 'openBracketToken', isToken: true },
            <any>{ name: 'parameter', type: 'ParameterSyntax' },
            <any>{ name: 'closeBracketToken', isToken: true },
            <any>{ name: 'typeAnnotation', type: 'TypeAnnotationSyntax', isOptional: true }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'PropertySignatureSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['ITypeMemberSyntax'],
        children: [
            <any>{ name: 'propertyName', isToken: true, tokenKinds: ['IdentifierName', 'StringLiteral', 'NumericLiteral'] },
            <any>{ name: 'questionToken', isToken: true, isOptional: true },
            <any>{ name: 'typeAnnotation', type: 'TypeAnnotationSyntax', isOptional: true }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'CallSignatureSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['ITypeMemberSyntax'],
        children: [
            <any>{ name: 'typeParameterList', type: 'TypeParameterListSyntax', isOptional: true, isTypeScriptSpecific: true },
            <any>{ name: 'parameterList', type: 'ParameterListSyntax' },
            <any>{ name: 'typeAnnotation', type: 'TypeAnnotationSyntax', isOptional: true, isTypeScriptSpecific: true }
        ]
    },
    <any>{
        name: 'ParameterListSyntax',
        baseType: 'SyntaxNode',
        children: [
            <any>{ name: 'openParenToken', isToken: true },
            <any>{ name: 'parameters', isSeparatedList: true, elementType: 'ParameterSyntax' },
            <any>{ name: 'closeParenToken', isToken: true }
        ]
    },
    <any>{
        name: 'TypeParameterListSyntax',
        baseType: 'SyntaxNode',
        children: [
            <any>{ name: 'lessThanToken', isToken: true },
            <any>{ name: 'typeParameters', isSeparatedList: true, elementType: 'TypeParameterSyntax' },
            <any>{ name: 'greaterThanToken', isToken: true }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'TypeParameterSyntax',
        baseType: 'SyntaxNode',
        children: [
            <any>{ name: 'identifier', isToken: true, tokenKinds: ['IdentifierName'] },
            <any>{ name: 'constraint', type: 'ConstraintSyntax', isOptional: true }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'ConstraintSyntax',
        baseType: 'SyntaxNode',
        children: [
            <any>{ name: 'extendsKeyword', isToken: true },
            <any>{ name: 'type', type: 'ITypeSyntax' }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'ElseClauseSyntax',
        baseType: 'SyntaxNode',
        children: [
            <any>{ name: 'elseKeyword', isToken: true },
            <any>{ name: 'statement', type: 'IStatementSyntax' }
        ]
    },
    <any>{
        name: 'IfStatementSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IStatementSyntax'],
        children: [
            <any>{ name: 'ifKeyword', isToken: true },
            <any>{ name: 'openParenToken', isToken: true },
            <any>{ name: 'condition', type: 'IExpressionSyntax' },
            <any>{ name: 'closeParenToken', isToken: true },
            <any>{ name: 'statement', type: 'IStatementSyntax' },
            <any>{ name: 'elseClause', type: 'ElseClauseSyntax', isOptional: true }
        ]
    },
    <any>{
        name: 'ExpressionStatementSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IStatementSyntax'],
        children: [
            <any>{ name: 'expression', type: 'IExpressionSyntax' },
            <any>{ name: 'semicolonToken', isToken: true, isOptional: true }
        ]
    },
    <any>{
        name: 'ConstructorDeclarationSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IClassElementSyntax'],
        children: [
            <any>{ name: 'modifiers', isList: true, elementType: 'ISyntaxToken' },
            <any>{ name: 'constructorKeyword', isToken: true },
            <any>{ name: 'callSignature', type: 'CallSignatureSyntax' },
            <any>{ name: 'block', type: 'BlockSyntax', isOptional: true },
            <any>{ name: 'semicolonToken', isToken: true, isOptional: true }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'MemberFunctionDeclarationSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IMemberDeclarationSyntax'],
        children: [
            <any>{ name: 'modifiers', isList: true, elementType: 'ISyntaxToken' },
            <any>{ name: 'propertyName', isToken: true, tokenKinds: ['IdentifierName', 'StringLiteral', 'NumericLiteral'] },
            <any>{ name: 'callSignature', type: 'CallSignatureSyntax' },
            <any>{ name: 'block', type: 'BlockSyntax', isOptional: true },
            <any>{ name: 'semicolonToken', isToken: true, isOptional: true }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'GetAccessorSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IMemberDeclarationSyntax', 'IPropertyAssignmentSyntax' ],
        children: [
            <any>{ name: 'modifiers', isList: true, elementType: 'ISyntaxToken', isTypeScriptSpecific: true },
            <any>{ name: 'getKeyword', isToken: true },
            <any>{ name: 'propertyName', isToken: true, tokenKinds: ['IdentifierName', 'StringLiteral', 'NumericLiteral'] },
            <any>{ name: 'parameterList', type: 'ParameterListSyntax' },
            <any>{ name: 'typeAnnotation', type: 'TypeAnnotationSyntax', isOptional: true, isTypeScriptSpecific: true },
            <any>{ name: 'block', type: 'BlockSyntax' }
        ]
    },
    <any>{
        name: 'SetAccessorSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IMemberDeclarationSyntax', 'IPropertyAssignmentSyntax'],
        children: [
            <any>{ name: 'modifiers', isList: true, elementType: 'ISyntaxToken', isTypeScriptSpecific: true },
            <any>{ name: 'setKeyword', isToken: true },
            <any>{ name: 'propertyName', isToken: true, tokenKinds: ['IdentifierName', 'StringLiteral', 'NumericLiteral'] },
            <any>{ name: 'parameterList', type: 'ParameterListSyntax' },
            <any>{ name: 'block', type: 'BlockSyntax' }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'MemberVariableDeclarationSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IMemberDeclarationSyntax'],
        children: [
            <any>{ name: 'modifiers', isList: true, elementType: 'ISyntaxToken' },
            <any>{ name: 'variableDeclarator', type: 'VariableDeclaratorSyntax' },
            <any>{ name: 'semicolonToken', isToken: true, isOptional: true }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'IndexMemberDeclarationSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IClassElementSyntax'],
        children: [
            <any>{ name: 'modifiers', isList: true, elementType: 'ISyntaxToken' },
            <any>{ name: 'indexSignature', type: 'IndexSignatureSyntax' },
            <any>{ name: 'semicolonToken', isToken: true, isOptional: true }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'ThrowStatementSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IStatementSyntax'],
        children: [
            <any>{ name: 'throwKeyword', isToken: true },
            <any>{ name: 'expression', type: 'IExpressionSyntax' },
            <any>{ name: 'semicolonToken', isToken: true, isOptional: true }
        ]
    },
    <any>{
        name: 'ReturnStatementSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IStatementSyntax'],
        children: [
            <any>{ name: 'returnKeyword', isToken: true },
            <any>{ name: 'expression', type: 'IExpressionSyntax', isOptional: true },
            <any>{ name: 'semicolonToken', isToken: true, isOptional: true }
        ]
    },
    <any>{
        name: 'ObjectCreationExpressionSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IMemberExpressionSyntax'],
        children: [
            <any>{ name: 'newKeyword', isToken: true },
            <any>{ name: 'expression', type: 'IMemberExpressionSyntax' },
            <any>{ name: 'argumentList', type: 'ArgumentListSyntax', isOptional: true }
        ]
    },
    <any>{
        name: 'SwitchStatementSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IStatementSyntax'],
        children: [
            <any>{ name: 'switchKeyword', isToken: true },
            <any>{ name: 'openParenToken', isToken: true },
            <any>{ name: 'expression', type: 'IExpressionSyntax' },
            <any>{ name: 'closeParenToken', isToken: true },
            <any>{ name: 'openBraceToken', isToken: true },
            <any>{ name: 'switchClauses', isList: true, elementType: 'ISwitchClauseSyntax' },
            <any>{ name: 'closeBraceToken', isToken: true }
        ]
    },
    <any>{
        name: 'CaseSwitchClauseSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['ISwitchClauseSyntax'],
        children: [
            <any>{ name: 'caseKeyword', isToken: true },
            <any>{ name: 'expression', type: 'IExpressionSyntax' },
            <any>{ name: 'colonToken', isToken: true },
            <any>{ name: 'statements', isList: true, elementType: 'IStatementSyntax' }
        ]
    },
    <any>{
        name: 'DefaultSwitchClauseSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['ISwitchClauseSyntax'],
        children: [
            <any>{ name: 'defaultKeyword', isToken: true },
            <any>{ name: 'colonToken', isToken: true },
            <any>{ name: 'statements', isList: true, elementType: 'IStatementSyntax' }
        ]
    },
    <any>{
        name: 'BreakStatementSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IStatementSyntax'],
        children: [
            <any>{ name: 'breakKeyword', isToken: true },
            <any>{ name: 'identifier', isToken: true, isOptional: true, tokenKinds: ['IdentifierName'] },
            <any>{ name: 'semicolonToken', isToken: true, isOptional: true }
        ]
    },
    <any>{
        name: 'ContinueStatementSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IStatementSyntax'],
        children: [
            <any>{ name: 'continueKeyword', isToken: true },
            <any>{ name: 'identifier', isToken: true, isOptional: true, tokenKinds: ['IdentifierName'] },
            <any>{ name: 'semicolonToken', isToken: true, isOptional: true }
        ]
    },
    <any>{
        name: 'ForStatementSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IStatementSyntax'],
        children: [
            <any>{ name: 'forKeyword', isToken: true },
            <any>{ name: 'openParenToken', isToken: true },
            <any>{ name: 'variableDeclaration', type: 'VariableDeclarationSyntax', isOptional: true },
            <any>{ name: 'initializer', type: 'IExpressionSyntax', isOptional: true },
            <any>{ name: 'firstSemicolonToken', isToken: true, tokenKinds: ['SemicolonToken'] },
            <any>{ name: 'condition', type: 'IExpressionSyntax', isOptional: true },
            <any>{ name: 'secondSemicolonToken', isToken: true, tokenKinds: ['SemicolonToken'] },
            <any>{ name: 'incrementor', type: 'IExpressionSyntax', isOptional: true },
            <any>{ name: 'closeParenToken', isToken: true },
            <any>{ name: 'statement', type: 'IStatementSyntax' }
        ]
    },
    <any>{
        name: 'ForInStatementSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IStatementSyntax'],
        children: [
            <any>{ name: 'forKeyword', isToken: true },
            <any>{ name: 'openParenToken', isToken: true },
            <any>{ name: 'variableDeclaration', type: 'VariableDeclarationSyntax', isOptional: true },
            <any>{ name: 'left', type: 'IExpressionSyntax', isOptional: true },
            <any>{ name: 'inKeyword', isToken: true },
            <any>{ name: 'expression', type: 'IExpressionSyntax' },
            <any>{ name: 'closeParenToken', isToken: true },
            <any>{ name: 'statement', type: 'IStatementSyntax' }
        ]
    },
    <any>{
        name: 'WhileStatementSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IStatementSyntax'],
        children: [
            <any>{ name: 'whileKeyword', isToken: true },
            <any>{ name: 'openParenToken', isToken: true },
            <any>{ name: 'condition', type: 'IExpressionSyntax' },
            <any>{ name: 'closeParenToken', isToken: true },
            <any>{ name: 'statement', type: 'IStatementSyntax' }
        ]
    },
    <any>{
        name: 'WithStatementSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IStatementSyntax'],
        children: [
            <any>{ name: 'withKeyword', isToken: true },
            <any>{ name: 'openParenToken', isToken: true },
            <any>{ name: 'condition', type: 'IExpressionSyntax' },
            <any>{ name: 'closeParenToken', isToken: true },
            <any>{ name: 'statement', type: 'IStatementSyntax' }
        ]
    },
    <any>{
        name: 'EnumDeclarationSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IModuleElementSyntax'],
        children: [
            <any>{ name: 'modifiers', isList: true, elementType: 'ISyntaxToken' },
            <any>{ name: 'enumKeyword', isToken: true },
            <any>{ name: 'identifier', isToken: true, tokenKinds: ['IdentifierName'] },
            <any>{ name: 'openBraceToken', isToken: true },
            <any>{ name: 'enumElements', isSeparatedList: true, elementType: 'EnumElementSyntax' },
            <any>{ name: 'closeBraceToken', isToken: true }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'EnumElementSyntax',
        baseType: 'SyntaxNode',
        children: [
            <any>{ name: 'propertyName', isToken: true, tokenKinds: ['IdentifierName', 'StringLiteral', 'NumericLiteral'] },
            <any>{ name: 'equalsValueClause', type: 'EqualsValueClauseSyntax', isOptional: true }
        ]
    },
    <any>{
        name: 'CastExpressionSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IUnaryExpressionSyntax'],
        children: [
            <any>{ name: 'lessThanToken', isToken: true },
            <any>{ name: 'type', type: 'ITypeSyntax' },
            <any>{ name: 'greaterThanToken', isToken: true },
            <any>{ name: 'expression', type: 'IUnaryExpressionSyntax' }
        ],
        isTypeScriptSpecific: true
    },
    <any>{
        name: 'ObjectLiteralExpressionSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IPrimaryExpressionSyntax'],
        children: [
            <any>{ name: 'openBraceToken', isToken: true },
            <any>{ name: 'propertyAssignments', isSeparatedList: true, elementType: 'IPropertyAssignmentSyntax' },
            <any>{ name: 'closeBraceToken', isToken: true }
        ]
    },
    <any>{
        name: 'SimplePropertyAssignmentSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IPropertyAssignmentSyntax'],
        children: [
            <any>{ name: 'propertyName', isToken: true, tokenKinds: ['IdentifierName', 'StringLiteral', 'NumericLiteral'] },
            <any>{ name: 'colonToken', isToken: true },
            <any>{ name: 'expression', type: 'IExpressionSyntax' }
        ]
    },
    <any> {
        name: 'FunctionPropertyAssignmentSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IPropertyAssignmentSyntax'],
        children: [
            <any>{ name: 'propertyName', isToken: true, tokenKinds: ['IdentifierName', 'StringLiteral', 'NumericLiteral'] },
            <any>{ name: 'callSignature', type: 'CallSignatureSyntax' },
            <any>{ name: 'block', type: 'BlockSyntax' }
        ]
    },
    <any>{
        name: 'FunctionExpressionSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IPrimaryExpressionSyntax'],
        children: [
            <any>{ name: 'functionKeyword', isToken: true },
            <any>{ name: 'identifier', isToken: true, isOptional: true, tokenKinds: ['IdentifierName'] },
            <any>{ name: 'callSignature', type: 'CallSignatureSyntax' },
            <any>{ name: 'block', type: 'BlockSyntax' }]
    },
    <any>{
        name: 'EmptyStatementSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IStatementSyntax'],
        children: [
            <any>{ name: 'semicolonToken', isToken: true }]
    },
    <any>{
        name: 'TryStatementSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IStatementSyntax'],
        children: [
            <any>{ name: 'tryKeyword', isToken: true },
            <any>{ name: 'block', type: 'BlockSyntax' },
            <any>{ name: 'catchClause', type: 'CatchClauseSyntax', isOptional: true },
            <any>{ name: 'finallyClause', type: 'FinallyClauseSyntax', isOptional: true }]
    },
    <any>{
        name: 'CatchClauseSyntax',
        baseType: 'SyntaxNode',
        children: [
            <any>{ name: 'catchKeyword', isToken: true },
            <any>{ name: 'openParenToken', isToken: true },
            <any>{ name: 'identifier', isToken: true, tokenKinds: ['IdentifierName'] },
            <any>{ name: 'typeAnnotation', type: 'TypeAnnotationSyntax', isOptional: true, isTypeScriptSpecified: true },
            <any>{ name: 'closeParenToken', isToken: true },
            <any>{ name: 'block', type: 'BlockSyntax' }]
    },
    <any>{
        name: 'FinallyClauseSyntax',
        baseType: 'SyntaxNode',
        children: [
            <any>{ name: 'finallyKeyword', isToken: true },
            <any>{ name: 'block', type: 'BlockSyntax' }]
    },
    <any>{
        name: 'LabeledStatementSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IStatementSyntax'],
        children: [
            <any>{ name: 'identifier', isToken: true, tokenKinds: ['IdentifierName'] },
            <any>{ name: 'colonToken', isToken: true },
            <any>{ name: 'statement', type: 'IStatementSyntax' }]
    },
    <any>{
        name: 'DoStatementSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IStatementSyntax'],
        children: [
            <any>{ name: 'doKeyword', isToken: true },
            <any>{ name: 'statement', type: 'IStatementSyntax' },
            <any>{ name: 'whileKeyword', isToken: true },
            <any>{ name: 'openParenToken', isToken: true },
            <any>{ name: 'condition', type: 'IExpressionSyntax' },
            <any>{ name: 'closeParenToken', isToken: true },
            <any>{ name: 'semicolonToken', isToken: true, isOptional: true }]
    },
    <any>{
        name: 'TypeOfExpressionSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IUnaryExpressionSyntax'],
        children: [
            <any>{ name: 'typeOfKeyword', isToken: true },
            <any>{ name: 'expression', type: 'IUnaryExpressionSyntax' }]
    },
    <any>{
        name: 'DeleteExpressionSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IUnaryExpressionSyntax'],
        children: [
            <any>{ name: 'deleteKeyword', isToken: true },
            <any>{ name: 'expression', type: 'IUnaryExpressionSyntax' }]
    },
    <any>{
        name: 'VoidExpressionSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IUnaryExpressionSyntax'],
        children: [
            <any>{ name: 'voidKeyword', isToken: true },
            <any>{ name: 'expression', type: 'IUnaryExpressionSyntax' }]
    },
    <any>{
        name: 'DebuggerStatementSyntax',
        baseType: 'SyntaxNode',
        interfaces: ['IStatementSyntax'],
        children: [
            <any>{ name: 'debuggerKeyword', isToken: true },
            <any>{ name: 'semicolonToken', isToken: true, isOptional: true }]
    }];

//function endsWith(string: string, value: string): boolean {
//    return string.substring(string.length - value.length, string.length) === value;
//}

function getStringWithoutSuffix(definition: string) {
    if (TypeScript.StringUtilities.endsWith(definition, "Syntax")) {
        return definition.substring(0, definition.length - "Syntax".length);
    }

    return definition;
}

function getStringWithoutPrefix(definition: string) {
    if (definition.charAt(0) == "I" && definition.charAt(1).toUpperCase() == definition.charAt(1)) {
        return definition.substring(1);
    }

    return definition;
}

function getNameWithoutSuffix(definition: ITypeDefinition) {
    return getStringWithoutSuffix(definition.name);
}

function getType(child: IMemberDefinition): string {
    if (child.isToken) {
        return "ISyntaxToken";
    }
    else if (child.isSeparatedList) {
        return "ISeparatedSyntaxList<" + child.elementType + ">";
    }
    else if (child.isList) {
        return "ISyntaxList<" + child.elementType + ">";
    }
    else {
        return child.type;
    }
}

var hasKind = false;

function pascalCase(value: string): string {
    return value.substr(0, 1).toUpperCase() + value.substr(1);
}

function camelCase(value: string): string {
    return value.substr(0, 1).toLowerCase() + value.substr(1);
}

function getSafeName(child: IMemberDefinition) {
    if (child.name === "arguments") {
        return "_" + child.name;
    }

    return child.name;
}

function getPropertyAccess(child: IMemberDefinition, instance = "this"): string {
    if (child.type === "SyntaxKind") {
        return instance + "._kind";
    }

    return instance + "." + child.name;
}

function generateProperties(definition: ITypeDefinition): string {
    var result = "";

    if (definition.name === "SourceUnitSyntax") {
        result += "        public _syntaxTree: SyntaxTree = null;\r\n";
    }

    var newLine = false;
    for (var i = 0; i < definition.children.length; i++) {
        var child = definition.children[i];

        if (getType(child) === "SyntaxKind") {
            result += "        private _" + child.name + ": " + getType(child) + ";\r\n";
            newLine = true;
        }
        else if (child.name === "arguments") {
            result += "    public " + child.name + ": " + getType(child) + ";\r\n";
        }

        hasKind = hasKind || (getType(child) === "SyntaxKind");
    }

    if (newLine) {
        result += "\r\n";
    }

    return result;
}

function generateNullChecks(definition: ITypeDefinition): string {
    var result = "";

    for (var i = 0; i < definition.children.length; i++) {
        var child = definition.children[i];

        if (!child.isOptional && !child.isToken) {
            result += "        if (" + child.name + " === null) { throw Errors.argumentNull('" + child.name + "'); }\r\n";
        }
    }

    return result;
}

function generateIfKindCheck(child: IMemberDefinition, tokenKinds: string[], indent: string): string {
    var result = "";
    
    result += indent + "        if (";

    for (var j = 0; j < tokenKinds.length; j++) {
        if (j > 0) {
            result += " && ";
        }

        var tokenKind = tokenKinds[j];
        if (tokenKind === "IdentifierName") {
            result += "!SyntaxFacts.isIdentifierName(" + child.name + ".tokenKind)";
        }
        else {
            result += child.name + ".tokenKind !== SyntaxKind." + tokenKind;
        }
    }

    result += ") { throw Errors.argument('" + child.name + "'); }\r\n";
    return result;
}

function generateSwitchCase(tokenKind: string, indent: string): string {
    return indent + "            case SyntaxKind." + tokenKind + ":\r\n";
}

function generateBreakStatement(indent: string): string {
    return indent + "                break;\r\n";
}

function generateSwitchCases(tokenKinds: string[], indent: string): string {
    var result = "";
    for (var j = 0; j < tokenKinds.length; j++) {
        var tokenKind = tokenKinds[j];

        result += generateSwitchCase(tokenKind, indent);
    }

    if (tokenKinds.length > 0) {
        result += generateBreakStatement(indent);
    }

    return result;
}

function generateDefaultCase(child: IMemberDefinition, indent: string): string {
    var result = "";
    
    result += indent + "            default:\r\n";
    result += indent + "                throw Errors.argument('" + child.name + "');\r\n"; 

    return result;
}

function generateSwitchKindCheck(child: IMemberDefinition, tokenKinds: string[], indent: string): string {
    if (tokenKinds.length === 0) {
        return "";
    }

    var result = "";

    var identifierName = TypeScript.ArrayUtilities.where(tokenKinds, v => v.indexOf("IdentifierName") >= 0);
    var notIdentifierName = TypeScript.ArrayUtilities.where(tokenKinds, v => v.indexOf("IdentifierName") < 0);

    if (identifierName.length > 0) {
        result += indent + "        if (!SyntaxFacts.isIdentifierName(" + child.name + ".tokenKind)) {\r\n";
        if (notIdentifierName.length === 0) {
            result += indent + "            throw Errors.argument('" + child.name + "');\r\n"; 
            result += indent + "        }\r\n";
            return result;
        }

        indent += "    ";
    }

    if (notIdentifierName.length <= 2) {
        result += generateIfKindCheck(child, notIdentifierName, indent);
    }
    else if (notIdentifierName.length > 2) {
        result += indent + "        switch (" + child.name + ".tokenKind) {\r\n";
        result += generateSwitchCases(notIdentifierName, indent);
        result += generateDefaultCase(child, indent);
        result += indent + "        }\r\n";
    }

    if (identifierName.length > 0) {
        result += indent + "    }\r\n";
    }

    // result += indent + "        }\r\n";
    return result;
}

function tokenKinds(child: IMemberDefinition): string[] {
    return child.tokenKinds
        ? child.tokenKinds
        : [pascalCase(child.name)];
}

function generateKindCheck(child: IMemberDefinition): string {
    var indent = "";
    var result = "";
    
    if (child.isOptional) {
        indent = "    ";

        result += "        if (" + child.name + " !== null) {\r\n";
    }

    var kinds = tokenKinds(child);

    if (kinds.length <= 2) {
        result += generateIfKindCheck(child, kinds, indent);
    }
    else {
        result += generateSwitchKindCheck(child, kinds, indent);
    }

    if (child.isOptional) {
        result += "        }\r\n";
    }

    return result;
}

function generateKindChecks(definition: ITypeDefinition): string {
    var result = "";

    for (var i = 0; i < definition.children.length; i++) {
        var child = definition.children[i];

        if (child.isToken) {
            result += generateKindCheck(child);
        }
    }

    return result;
}

function generateArgumentChecks(definition: ITypeDefinition): string {
    var result = "";

    if (argumentChecks) {
        result += generateNullChecks(definition);
        result += generateKindChecks(definition);

        if (definition.children.length > 0) {
            result += "\r\n";
        }
    }

    return result;
}

function generateConstructor(definition: ITypeDefinition): string {
    var i: number;
    var child: IMemberDefinition;
    var base = baseType(definition);

    var result = "";
    result += "        constructor("

    var children = definition.children;
    for (i = 0; i < children.length; i++) {
        child = children[i];

        if (getType(child) !== "SyntaxKind" && child.name !== "arguments") {
            result += "public ";
        }

        result += getSafeName(child) + ": " + getType(child);
        result += ",\r\n                    ";
    }

    result += "data: number) {\r\n";
    
    result += "            super(data); \r\n";

    if (definition.children.length > 0) {
        result += "\r\n";
    }

    result += generateArgumentChecks(definition);

    for (i = 0; i < definition.children.length; i++) {
        child = definition.children[i];

        if (child.type === "SyntaxKind" || child.name === "arguments") {
            result += "            " + getPropertyAccess(child) + " = " + getSafeName(child) + ";\r\n";
        }
    }

    for (i = 0; i < definition.children.length; i++) {
        child = definition.children[i];

        if (child.type !== "SyntaxKind") {
            if (child.isOptional) {
                result += "            " + getSafeName(child) + " && (" + getSafeName(child) + ".parent = this);\r\n";
            }
            else if (child.isList || child.isSeparatedList) {
                result += "            !" + getSafeName(child) + ".isShared() && (" + getSafeName(child) + ".parent = this);\r\n";
            }
            else {
                result += "            " + getSafeName(child) + ".parent = this;\r\n";
            }
        }
    }

    //result += "            Syntax.setParentForChildren(this);\r\n";
    result += "        }\r\n";

    return result;
}

function isOptional(child: IMemberDefinition) {
    if (child.isOptional) {
        return true;
    }

    if (child.isList && !child.requiresAtLeastOneItem) {
        return true;
    }

    if (child.isSeparatedList && !child.requiresAtLeastOneItem) {
        return true;
    }

    return false;
}

function generateFactory1Method(definition: ITypeDefinition): string {
    return "";

    var mandatoryChildren = TypeScript.ArrayUtilities.where(
        definition.children, c => !isOptional(c));
    if (mandatoryChildren.length === definition.children.length) {
        return "";
    }

    var result = "\r\n        public static create("
    var i: number;
    var child: IMemberDefinition;

    for (i = 0; i < mandatoryChildren.length; i++) {
        child = mandatoryChildren[i];

        result += child.name + ": " + getType(child);

        if (i < mandatoryChildren.length - 1) {
            result += ",\r\n                             ";
        }
    }

    result += "): " + definition.name + " {\r\n";

    result += "            return new " + definition.name + "(";
    
    for (i = 0; i < definition.children.length; i++) {
        child = definition.children[i];

        if (!isOptional(child)) {
            result += child.name;
        }
        else if (child.isList) {
            result += "Syntax.emptyList<" + child.elementType + ">()";
        }
        else if (child.isSeparatedList) {
            result += "Syntax.emptySeparatedList<" + child.elementType + ">()";
        }
        else {
            result += "null";
        }

        result += ", ";
    }

    result += "/*data:*/ 0);\r\n";
    result += "        }\r\n";

    return result;
}

function isKeywordOrPunctuation(kind: string): boolean {
    if (TypeScript.StringUtilities.endsWith(kind, "Keyword")) {
        return true;
    }
    
    if (TypeScript.StringUtilities.endsWith(kind, "Token") &&
        kind !== "IdentifierName" &&
        kind !== "EndOfFileToken") {
        return true;
    }

    return false;
}

function isDefaultConstructable(definition: ITypeDefinition): boolean {
    if (definition === null) {
        return false;
    }

    for (var i = 0; i < definition.children.length; i++) {
        if (isMandatory(definition.children[i])) {
            // If any child is mandatory, then the type is not default constructable.
            return false;
        }
    }

    // We can default construct this.
    return true;
}

function isMandatory(child: IMemberDefinition): boolean {
    // If it's optional then it's not mandatory.
    if (isOptional(child)) {
        return false;
    }

    // Kinds are always mandatory.  As are non-optional lists.
    if (child.type === "SyntaxKind" || child.isList || child.isSeparatedList) {
        return true;
    }

    // We have a non optional node or token.  Tokens are mandatory if they're not keywords or
    // punctuation.
    if (child.isToken) {
        var kinds = tokenKinds(child);
        var isFixed = kinds.length === 1 && isKeywordOrPunctuation(kinds[0]);

        return !isFixed;
    }

    // It's a node.  It's mandatory if we can't default construct it.
    return !isDefaultConstructable(memberDefinitionType(child));
}

function generateFactory2Method(definition: ITypeDefinition): string {
    return "";

    var mandatoryChildren: IMemberDefinition[] = TypeScript.ArrayUtilities.where(definition.children, isMandatory);
    if (mandatoryChildren.length === definition.children.length) {
        return "";
    }

    var i: number;
    var child: IMemberDefinition;
    var result = "\r\n        public static create1("

    for (i = 0; i < mandatoryChildren.length; i++) {
        child = mandatoryChildren[i];

        result += child.name + ": " + getType(child);

        if (i < mandatoryChildren.length - 1) {
            result += ",\r\n                              ";
        }
    }

    result += "): " + definition.name + " {\r\n";
    result += "            return new " + definition.name + "(";

    for (i = 0; i < definition.children.length; i++) {
        child = definition.children[i];

        if (isMandatory(child)) {
            result += child.name;
        }
        else if (child.isList) {
            result += "Syntax.emptyList<" + child.elementType + ">()";
        }
        else if (child.isSeparatedList) {
            result += "Syntax.emptySeparatedList<" + child.elementType + ">()";
        }
        else if (isOptional(child)) {
            result += "null";
        }
        else if (child.isToken) {
            result += "Syntax.token(SyntaxKind." + tokenKinds(child)[0] + ")";
        }
        else {
            result += child.type + ".create1()";
        }

        result += ", ";
    }

    result += "/*data:*/ 0);\r\n";
    result += "        }\r\n";

    return result;
}

function generateFactoryMethod(definition: ITypeDefinition): string {
    return generateFactory1Method(definition) + generateFactory2Method(definition);
}

function generateIsProperties(definition: ITypeDefinition): string {
    var properties = "";

    if (definition.interfaces) {
        var ifaces = definition.interfaces.slice(0);
        var i: number;
        for (i = 0; i < ifaces.length; i++) {
            var current = ifaces[i];

            while (current !== undefined) {
                if (!TypeScript.ArrayUtilities.contains(ifaces, current)) {
                    ifaces.push(current);
                }

                current = interfaces[current];
            }
        }

        for (i = 0; i < ifaces.length; i++) {
            var type = ifaces[i];
            type = getStringWithoutSuffix(type);
            if (isInterface(type)) {
                type = type.substr(1);
            }

            properties += "        public _is" + type + ": any;\r\n";
        }
    }

    if (properties.length > 0) {
        properties += "\r\n";
    }

    return properties;
}

function generateKindMethod(definition: ITypeDefinition): string {
    var result = "";

    if (!hasKind) {
        result += "\r\n";
        result += "        public kind(): SyntaxKind {\r\n";
        result += "            return SyntaxKind." + getNameWithoutSuffix(definition) + ";\r\n";
        result += "        }\r\n";
    }

    return result;
}

function generateSlotMethods(definition: ITypeDefinition): string {
    var result = "";

    result += "\r\n";
    result += "        public childCount(): number {\r\n";
    var slotCount = hasKind ? (definition.children.length - 1) : definition.children.length;

    result += "            return " + slotCount + ";\r\n";
    result += "        }\r\n\r\n";

    result += "        public childAt(slot: number): ISyntaxElement {\r\n";

    if (slotCount === 0) {
        result += "            throw Errors.invalidOperation();\r\n";
    }
    else {
        result += "            switch (slot) {\r\n";

        var index = 0;
        for (var i = 0; i < definition.children.length; i++) {
            var child = definition.children[i];
            if (child.type === "SyntaxKind") {
                continue;
            }

            result += "                case " + index + ": return this." + child.name + ";\r\n";
            index++;
        }

        result += "                default: throw Errors.invalidOperation();\r\n";
        result += "            }\r\n";
    }

    result += "        }\r\n";

    return result;
}

function generateFirstTokenMethod(definition: ITypeDefinition): string {
    var result = "";

    result += "\r\n";
    result += "    public firstToken(): ISyntaxToken {\r\n";
    result += "        var token = null;\r\n";

    for (var i = 0; i < definition.children.length; i++) {
        var child = definition.children[i];

        if (getType(child) === "SyntaxKind") {
            continue;
        }

        if (child.name === "endOfFileToken") {
            continue;
        }

        result += "        if (";

        if (child.isOptional) {
            result += getPropertyAccess(child) + " !== null && ";
        }

        if (child.isToken) {
            result += getPropertyAccess(child) + ".width() > 0";
            result += ") { return " + getPropertyAccess(child) + "; }\r\n";
        }
        else {
            result += "(token = " + getPropertyAccess(child) + ".firstToken()) !== null";
            result += ") { return token; }\r\n";
        }
    }

    if (definition.name === "SourceUnitSyntax") {
        result += "        return this._endOfFileToken;\r\n";
    }
    else {
        result += "        return null;\r\n";
    }

    result += "    }\r\n";

    result += "    }\r\n";

    return result;
}

function generateLastTokenMethod(definition: ITypeDefinition): string {
    var result = "";

    result += "\r\n";
    result += "    public lastToken(): ISyntaxToken {\r\n";

    if (definition.name === "SourceUnitSyntax") {
        result += "        return this._endOfFileToken;\r\n";
    }
    else {
        result += "        var token = null;\r\n";

        for (var i = definition.children.length - 1; i >= 0; i--) {
            var child = definition.children[i];

            if (getType(child) === "SyntaxKind") {
                continue;
            }

            if (child.name === "endOfFileToken") {
                continue;
            }

            result += "        if (";

            if (child.isOptional) {
                result += getPropertyAccess(child) + " !== null && ";
            }

            if (child.isToken) {
                result += getPropertyAccess(child) + ".width() > 0";
                result += ") { return " + getPropertyAccess(child) + "; }\r\n";
            }
            else {
                result += "(token = " + getPropertyAccess(child) + ".lastToken()) !== null";
                result += ") { return token; }\r\n";
            }
        }

        result += "        return null;\r\n";
    }

    result += "    }\r\n";

    return result;
}

function baseType(definition: ITypeDefinition): ITypeDefinition {
    return TypeScript.ArrayUtilities.firstOrDefault(definitions, d => d.name === definition.baseType);
}

function memberDefinitionType(child: IMemberDefinition): ITypeDefinition {
    // Debug.assert(child.type !== undefined);
    return TypeScript.ArrayUtilities.firstOrDefault(definitions, d => d.name === child.type);
}

function derivesFrom(def1: ITypeDefinition, def2: ITypeDefinition): boolean {
    var current = def1;
    while (current !== null) {
        var base = baseType(current);
        if (base === def2) {
            return true;
        }

        current = base;
    }

    return false;
}

function contains(definition: ITypeDefinition, child: IMemberDefinition) {
    return TypeScript.ArrayUtilities.any(definition.children,
        c => c.name === child.name &&
             c.isList === child.isList &&
             c.isSeparatedList === child.isSeparatedList &&
             c.isToken === child.isToken &&
             c.type === child.type);
}

function generateAccessors(definition: ITypeDefinition): string {
    var result = "";

    if (definition.name === "SourceUnitSyntax") {
        result += "\r\n";
        result += "        public syntaxTree(): SyntaxTree {\r\n";
        result += "            return this._syntaxTree;\r\n";
        result += "        }\r\n";
    }

    for (var i = 0; i < definition.children.length; i++) {
        var child = definition.children[i];
        
        if (child.type === "SyntaxKind") {
            result += "\r\n";
            result += "        public " + child.name + "(): " + getType(child) + " {\r\n";
            result += "            return " + getPropertyAccess(child) + ";\r\n";
            result += "        }\r\n";
        }
    }

    return result;
}

function generateWithMethod(definition: ITypeDefinition, child: IMemberDefinition): string {
    return "";

    var result = "";
    result += "\r\n";
    result += "        public with" + pascalCase(child.name) + "(" + getSafeName(child) + ": " + getType(child) + "): " + definition.name + " {\r\n";
    result += "            return this.update("

    for (var i = 0; i < definition.children.length; i++) {
        if (i > 0) {
            result += ", ";
        }

        if (definition.children[i] === child) {
            result += getSafeName(child);
        }
        else {
            result += getPropertyAccess(definition.children[i]);
        }
    }

    result += ");\r\n";
    result += "        }\r\n";

    if (child.isList || child.isSeparatedList) {
        if (TypeScript.StringUtilities.endsWith(child.name, "s")) {
            var pascalName = pascalCase(child.name);
            pascalName = pascalName.substring(0, pascalName.length - 1);

            var argName = getSafeName(child);
            argName = argName.substring(0, argName.length - 1)

            result += "\r\n";
            result += "        public with" + pascalName + "(" + argName + ": " + child.elementType + "): " + definition.name + " {\r\n";
            result += "            return this.with" + pascalCase(child.name) + "("

            if (child.isList) {
                result += "Syntax.list<" + child.elementType + ">([" + argName + "])";
            }
            else {
                result += "Syntax.separatedList<" + child.elementType + ">([" + argName + "])";
            }

            result += ");\r\n";
            result += "        }\r\n";
        }
    }

    return result;
}

function generateWithMethods(definition: ITypeDefinition): string {
    var result = "";
    return "";

    for (var i = 0; i < definition.children.length; i++) {
        var child = definition.children[i];
        result += generateWithMethod(definition, child);
    }

    return result;
}

function generateTriviaMethods(definition: ITypeDefinition): string {
    return "";

    var result = "\r\n";
    result += "        public withLeadingTrivia(trivia: ISyntaxTriviaList): " + definition.name + " {\r\n";
    result += "            return <" + definition.name + ">super.withLeadingTrivia(trivia);\r\n";
    result += "        }\r\n\r\n";
    result += "        public withTrailingTrivia(trivia: ISyntaxTriviaList): " + definition.name + " {\r\n";
    result += "            return <" + definition.name + ">super.withTrailingTrivia(trivia);\r\n";
    result += "        }\r\n";

    return result;
}

function generateUpdateMethod(definition: ITypeDefinition): string {
    // return "";

    var result = "";

    result += "\r\n";
    result += "        public update(";

    var i: number;
    var child: IMemberDefinition;

    for (i = 0; i < definition.children.length; i++) {
        child = definition.children[i];

        result += getSafeName(child) + ": " + getType(child);

        if (i < definition.children.length - 1) {
            result += ",\r\n                      ";
        }
    }

    result += "): " + definition.name + " {\r\n";

    if (definition.children.length === 0) {
        result += "            return this;\r\n";
    }
    else {
        result += "            if (";

        for (i = 0; i < definition.children.length; i++) {
            child = definition.children[i];

            if (i !== 0) {
                result += " && ";
            }

            result += getPropertyAccess(child) + " === " + getSafeName(child);
        }

        result += ") {\r\n";
        result += "                return this;\r\n";
        result += "            }\r\n\r\n";

        result += "            return new " + definition.name + "(";

        for (i = 0; i < definition.children.length; i++) {
            child = definition.children[i];

            result += getSafeName(child);
            result += ", ";
        }

        result += "this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);\r\n";
    }

    result += "        }\r\n";

    return result;
}

function couldBeRegularExpressionToken(child: IMemberDefinition): boolean {
    var kinds = tokenKinds(child);
    return TypeScript.ArrayUtilities.contains(kinds, "SlashToken") ||
           TypeScript.ArrayUtilities.contains(kinds, "SlashEqualsToken") ||
           TypeScript.ArrayUtilities.contains(kinds, "RegularExpressionLiteral");
}

function generateStructuralEqualsMethod(definition: ITypeDefinition): string {
    var result = "\r\n    private structuralEquals(node: SyntaxNode): boolean {\r\n";
    result += "        if (this === node) { return true; }\r\n";
    result += "        if (node === null) { return false; }\r\n";
    result += "        if (this.kind() !== node.kind()) { return false; }\r\n";
    result += "        var other = <" + definition.name + ">node;\r\n";

    for (var i = 0; i < definition.children.length; i++) {
        var child = definition.children[i];

        if (child.type !== "SyntaxKind") {
            if (child.isList) {
                result += "        if (!Syntax.listStructuralEquals(" + getPropertyAccess(child) + ", other._" + child.name + ")) { return false; }\r\n";
            }
            else if (child.isSeparatedList) {
                result += "        if (!Syntax.separatedListStructuralEquals(" + getPropertyAccess(child) + ", other._" + child.name + ")) { return false; }\r\n";
            }
            else if (child.isToken) {
                result += "        if (!Syntax.tokenStructuralEquals(" + getPropertyAccess(child) + ", other._" + child.name + ")) { return false; }\r\n";
            }
            else if (isNodeOrToken(child)) {
                result += "        if (!Syntax.nodeOrTokenStructuralEquals(" + getPropertyAccess(child) + ", other._" + child.name + ")) { return false; }\r\n";
            }
            else {
                result += "        if (!Syntax.nodeStructuralEquals(" + getPropertyAccess(child) + ", other._" + child.name + ")) { return false; }\r\n";
            }
        }
    }

    result += "        return true;\r\n";
    result += "    }\r\n";
    return result;
}

function generateNode(definition: ITypeDefinition): string {
    var result = "    export class " + definition.name + " extends " + definition.baseType 

    if (definition.interfaces) {
        result += " implements " + definition.interfaces.join(", ");
    }

    result += " {\r\n";
    hasKind = false;

    result += generateProperties(definition);
    result += generateIsProperties(definition);
    result += generateConstructor(definition);
    result += generateKindMethod(definition);
    result += generateSlotMethods(definition);
    result += generateAccessors(definition);
    // result += generateUpdateMethod(definition);

    if (!forPrettyPrinter) {
        result += generateFactoryMethod(definition);
        result += generateTriviaMethods(definition);
        result += generateWithMethods(definition);
    }

    // result += generateIsMissingMethod(definition);
    // result += generateFirstTokenMethod(definition);
    // result += generateLastTokenMethod(definition);
    // result += generateCollectTextElementsMethod(definition);
    // result += generateFindTokenInternalMethod(definition);
    // result += generateStructuralEqualsMethod(definition);
    result += "    }";

    return result;
}

function generateSyntaxInterfaces(): string {
    var result = "///<reference path='references.ts' />\r\n\r\n";

    result += "module TypeScript {\r\n";

    result += "    export enum NodeFlags {\r\n";
    result += "        Export   = 0x00000001,  // Declarations\r\n";
    result += "        Ambient  = 0x00000002,  // Declarations\r\n";
    result += "        Optional = 0x00000004,  // Parameter/Property/Method\r\n";
    result += "        Rest     = 0x00000008,  // Parameter\r\n";
    result += "        Public   = 0x00000010,  // Property/Method\r\n";
    result += "        Private  = 0x00000020,  // Property/Method\r\n";
    result += "        Static   = 0x00000040,  // Property/Method\r\n";
    result += "    }\r\n";

    result += "\r\n    interface SyntaxElement {\r\n";
    result += "        kind: SyntaxKind;\r\n";
    result += "    }\r\n";

    result += "\r\n    // Should be called SyntaxNode.  But we already have that type.  Calling 'Node' for now.\r\n";
    result += "    interface Node extends SyntaxElement {\r\n";
    result += "        flags: NodeFlags;\r\n";
    result += "    }\r\n"

    result += "\r\n    function nodeStart(node: Node): number {\r\n";
    result += "    }\r\n"

    result += "\r\n    function nodeWidth(node: Node): number {\r\n";
    result += "    }\r\n"

    result += "\r\n    interface SyntaxToken extends Name, PrimaryExpression {\r\n"
    result += "    }\r\n";

    result += "\r\n    // The raw text of the token, as written in the original source.\r\n";
    result += "    function tokenText(token: SyntaxToken): string {\r\n";
    result += "    }\r\n";

    result += "\r\n    // The token's javascript value.  i.e. 0.0 in the text would have the javascript number value: 0.\r\n";
    result += "    function tokenValue(token: SyntaxToken): any {\r\n";
    result += "    }\r\n";

    result += "\r\n    // The token's value in string form.  i.e. \\u0041 in the source text would result in a string with the text: A.\r\n";
    result += "    function tokenValueText(token: SyntaxToken): string {\r\n";
    result += "    }\r\n";

    result += "\r\n    interface SyntaxList<T> extends SyntaxElement {\r\n";
    result += "        length: number;\r\n";
    result += "        item(index: number): T;\r\n";
    result += "    }\r\n";

    var trim = (key: string) => getStringWithoutPrefix(getStringWithoutSuffix(key));

    for (var i = 0; i < definitions.length; i++) {
        var definition = definitions[i];

        //if (i > 0) {
        //    result += "\r\n";
        //}

        var interfaceDefinition = "";

        interfaceDefinition += "\r\n    interface " + getNameWithoutSuffix(definition);
        var hasChild = false;

        interfaceDefinition += " extends";
        if (definition.interfaces && definition.interfaces.length > 0) {

            for (var j = 0; j < definition.interfaces.length; j++) {
                if (j > 0) {
                    interfaceDefinition += ",";
                }

                interfaceDefinition += " " + getStringWithoutPrefix(getStringWithoutSuffix(definition.interfaces[j]));
            }
        }
        else {
            interfaceDefinition += " Node";
        }

        interfaceDefinition += " {\r\n";

        for (var j = 0; j < definition.children.length; j++) {
            var child = definition.children[j];

            if (child.type === "SyntaxKind") {
                continue;
            }

            if (child.isList || child.isSeparatedList) {
                if (child.elementType === "ISyntaxToken") {
                    continue;
                }

                interfaceDefinition += "        " + child.name + ": SyntaxList<" + getStringWithoutPrefix(getStringWithoutSuffix(child.elementType)) + ">;\r\n";
                hasChild = true;
            }
            else if (child.isToken) {
                if (child.tokenKinds) {
                    if (child.tokenKinds.indexOf("IdentifierName") >= 0 || child.tokenKinds.indexOf("StringLiteral") >= 0) {
                        interfaceDefinition += "        " + child.name;
                        if (child.isOptional) {
                            interfaceDefinition += "?";
                        }

                        interfaceDefinition += ": SyntaxToken;\r\n";
                        hasChild = true;
                    }
                }
            }
            else {
                interfaceDefinition += "        " + child.name;
                if (child.isOptional) {
                    interfaceDefinition += "?";
                }

                interfaceDefinition += ": " + getStringWithoutPrefix(getStringWithoutSuffix(child.type)) + ";\r\n";
                hasChild = true;
            }
        }

        interfaceDefinition += "    }\r\n"

        if (hasChild) {
            result += interfaceDefinition;
        }
    }

    for (var key in interfaces) {
        if (interfaces.hasOwnProperty(key)) {
            result += "\r\n    interface " + trim(key) + " extends " + trim(interfaces[key]) + " {\r\n";
            result += "    }\r\n";
        }
    }

    result += "\r\n    interface ModuleElement extends SyntaxElement {\r\n";
    result += "    }\r\n";
    result += "\r\n    interface ModuleReference extends Node {\r\n";
    result += "    }\r\n";
    result += "\r\n    interface ClassElement extends Node {\r\n";
    result += "    }\r\n";
    result += "\r\n    interface TypeMember extends Node {\r\n";
    result += "    }\r\n";
    result += "\r\n    interface PropertyAssignment extends Node {\r\n";
    result += "    }\r\n";
    result += "\r\n    interface SwitchClause extends Node {\r\n";
    result += "    }\r\n";
    result += "\r\n    interface Expression extends SyntaxElement {\r\n";
    result += "    }\r\n";
    result += "\r\n    interface Type extends SyntaxElement {\r\n";
    result += "    }\r\n";

    result += "}";

    return result;
}

function generateNodes(): string {
    var result = "///<reference path='references.ts' />\r\n\r\n";

    result += "module TypeScript {\r\n";

    for (var i = 0; i < definitions.length; i++) {
        var definition = definitions[i];

        if (i > 0) {
            result += "\r\n\r\n";
        }

        result += generateNode(definition);
    }

    result += "\r\n}";

    return result;
}

function isInterface(name: string) {
    return name.substr(0, 1) === "I" && name.substr(1, 1).toUpperCase() === name.substr(1, 1)
}

function isNodeOrToken(child: IMemberDefinition) {
    // IWhatever.
    return child.type && isInterface(child.type);
}

function generateRewriter(): string {
    var result = "///<reference path='references.ts' />\r\n\r\n";

    result += "module TypeScript {\r\n" +
"    export class SyntaxRewriter implements ISyntaxVisitor {\r\n" +
"        public visitToken(token: ISyntaxToken): ISyntaxToken {\r\n" +
"            return token;\r\n" +
"        }\r\n" +
"\r\n" +
"        public visitNode(node: SyntaxNode): SyntaxNode {\r\n" +
"            return visitNodeOrToken(this, node);\r\n" +
"        }\r\n" +
"\r\n" +
"        public visitNodeOrToken(node: ISyntaxNodeOrToken): ISyntaxNodeOrToken {\r\n" +
"            return isToken(node) ? <ISyntaxNodeOrToken>this.visitToken(<ISyntaxToken>node) : this.visitNode(<SyntaxNode>node);\r\n" +
"        }\r\n" +
"\r\n" +
"        public visitList<T extends ISyntaxNodeOrToken>(list: ISyntaxList<T>): ISyntaxList<T> {\r\n" +
"            var newItems: T[] = null;\r\n" +
"\r\n" +
"            for (var i = 0, n = list.childCount(); i < n; i++) {\r\n" +
"                var item = list.childAt(i);\r\n" +
"                var newItem = <T>this.visitNodeOrToken(item);\r\n" +
"\r\n" +
"                if (item !== newItem && newItems === null) {\r\n" +
"                    newItems = [];\r\n" +
"                    for (var j = 0; j < i; j++) {\r\n" +
"                        newItems.push(list.childAt(j));\r\n" +
"                    }\r\n" +
"                }\r\n" +
"\r\n" +
"                if (newItems) {\r\n" +
"                    newItems.push(newItem);\r\n" +
"                }\r\n" +
"            }\r\n" +
"\r\n" +
"            // Debug.assert(newItems === null || newItems.length === list.childCount());\r\n" +
"            return newItems === null ? list : Syntax.list<T>(newItems);\r\n" +
"        }\r\n" +
"\r\n" +
"        public visitSeparatedList<T extends ISyntaxNodeOrToken>(list: ISeparatedSyntaxList<T>): ISeparatedSyntaxList<T> {\r\n" +
"            var newItems: ISyntaxNodeOrToken[] = null;\r\n" +
"\r\n" +
"            for (var i = 0, n = list.childCount(); i < n; i++) {\r\n" +
"                var item = list.childAt(i);\r\n" +
"                var newItem = isToken(item) ? <ISyntaxNodeOrToken>this.visitToken(<ISyntaxToken>item) : this.visitNode(<SyntaxNode>item);\r\n" +
"\r\n" +
"                if (item !== newItem && newItems === null) {\r\n" +
"                    newItems = [];\r\n" +
"                    for (var j = 0; j < i; j++) {\r\n" +
"                        newItems.push(list.childAt(j));\r\n" +
"                    }\r\n" +
"                }\r\n" +
"\r\n" +
"                if (newItems) {\r\n" +
"                    newItems.push(newItem);\r\n" +
"                }\r\n" +
"            }\r\n" +
"\r\n" +
"            // Debug.assert(newItems === null || newItems.length === list.childCount());\r\n" +
"            return newItems === null ? list : Syntax.separatedList<T>(newItems);\r\n" +
"        }\r\n";

    for (var i = 0; i < definitions.length; i++) {
        var definition = definitions[i];

        result += "\r\n";
        result += "        public visit" + getNameWithoutSuffix(definition) + "(node: " + definition.name + "): any {\r\n";

        if (definition.children.length === 0) {
            result += "            return node;\r\n"
            result += "        }\r\n";
            continue;
        }

        //if (definition.children.length === 1) {
        //    result += "        return node.with" + pascalCase(definition.children[0].name) + "(\r\n";
        //}
        //else {
        result += "            return node.update(\r\n";
        //}

        for (var j = 0; j < definition.children.length; j++) {
            var child = definition.children[j];

            result += "                ";
            if (child.isOptional) {
                result += "node." + child.name + " === null ? null : ";
            }

            if (child.isToken) {
                result += "this.visitToken(node." + child.name + ")";
            }
            else if (child.isList) {
                result += "this.visitList(node." + child.name + ")";
            }
            else if (child.isSeparatedList) {
                result += "this.visitSeparatedList(node." + child.name + ")";
            }
            else if (child.type === "SyntaxKind") {
                result += "node.kind()";
            }
            else if (isNodeOrToken(child)) {
                result += "<" + child.type + ">this.visitNodeOrToken(node." + child.name + ")";
            }
            else {
                result += "<" + child.type + ">this.visitNode(node." + child.name + ")";
            }

            if (j < definition.children.length - 1) {
                result += ",\r\n";
            }
        }

        result += ");\r\n";
        result += "        }\r\n";
    }

    result += "    }";
    result += "\r\n}";
    return result;
}

function generateWalker(): string {
    var result = "";

    result +=
"///<reference path='references.ts' />\r\n"+
"\r\n" +
"module TypeScript {\r\n" +
"    export class SyntaxWalker implements ISyntaxVisitor {\r\n" +
"        public visitToken(token: ISyntaxToken): void {\r\n" +
"        }\r\n" +
"\r\n" +
"        public visitNode(node: SyntaxNode): void {\r\n" +
"            visitNodeOrToken(this, node);\r\n" +
"        }\r\n" +
"\r\n" +
"        public visitNodeOrToken(nodeOrToken: ISyntaxNodeOrToken): void {\r\n" +
"            if (isToken(nodeOrToken)) { \r\n" +
"                this.visitToken(<ISyntaxToken>nodeOrToken);\r\n" +
"            }\r\n" +
"            else {\r\n" +
"                this.visitNode(<SyntaxNode>nodeOrToken);\r\n" +
"            }\r\n" +
"        }\r\n" +
"\r\n" +
"        private visitOptionalToken(token: ISyntaxToken): void {\r\n" +
"            if (token === null) {\r\n" +
"                return;\r\n" +
"            }\r\n" +
"\r\n" +
"            this.visitToken(token);\r\n" +
"        }\r\n" +
"\r\n" +
"        public visitOptionalNode(node: SyntaxNode): void {\r\n" +
"            if (node === null) {\r\n" +
"                return;\r\n" +
"            }\r\n" +
"\r\n" +
"            this.visitNode(node);\r\n" +
"        }\r\n" +
"\r\n" +
"        public visitOptionalNodeOrToken(nodeOrToken: ISyntaxNodeOrToken): void {\r\n" +
"            if (nodeOrToken === null) {\r\n" +
"                return;\r\n" +
"            }\r\n" +
"\r\n" +
"            this.visitNodeOrToken(nodeOrToken);\r\n" +
"        }\r\n" +
"\r\n" +
"        public visitList(list: ISyntaxList<ISyntaxNodeOrToken>): void {\r\n" +
"            for (var i = 0, n = list.childCount(); i < n; i++) {\r\n" +
"               this.visitNodeOrToken(list.childAt(i));\r\n" +
"            }\r\n" +
"        }\r\n" +
"\r\n" +
"        public visitSeparatedList(list: ISeparatedSyntaxList<ISyntaxNodeOrToken>): void {\r\n" +
"            for (var i = 0, n = list.childCount(); i < n; i++) {\r\n" +
"                var item = list.childAt(i);\r\n" +
"                this.visitNodeOrToken(item);\r\n" + 
"            }\r\n" +
"        }\r\n";

    for (var i = 0; i < definitions.length; i++) {
        var definition = definitions[i];

        result += "\r\n";
        result += "        public visit" + getNameWithoutSuffix(definition) + "(node: " + definition.name + "): void {\r\n";

        for (var j = 0; j < definition.children.length; j++) {
            var child = definition.children[j];

            if (child.isToken) {
                if (child.isOptional) {
                    result += "            this.visitOptionalToken(node." + child.name + ");\r\n";
                }
                else {
                    result += "            this.visitToken(node." + child.name + ");\r\n";
                }
            }
            else if (child.isList) {
                result += "            this.visitList(node." + child.name + ");\r\n";
            }
            else if (child.isSeparatedList) {
                result += "            this.visitSeparatedList(node." + child.name + ");\r\n";
            }
            else if (isNodeOrToken(child)) {
                if (child.isOptional) {
                    result += "            this.visitOptionalNodeOrToken(node." + child.name + ");\r\n";
                }
                else {
                    result += "            this.visitNodeOrToken(node." + child.name + ");\r\n";
                }
            }
            else if (child.type !== "SyntaxKind") {
                if (child.isOptional) {
                    result += "            this.visitOptionalNode(node." + child.name + ");\r\n";
                }
                else {
                    result += "            this.visitNode(node." + child.name + ");\r\n";
                }
            }
        }

        result += "        }\r\n";
    }

    result += "    }";
    result += "\r\n}";
    return result;
}

function firstEnumName(e: any, value: number) {
    for (var name in e) {
        if (e[name] === value) {
            return name;
        }
    }
}

function generateKeywordCondition(keywords: { text: string; kind: TypeScript.SyntaxKind; }[], currentCharacter: number, indent: string): string {
    var length = keywords[0].text.length;

    var result = "";
    var index: string;

    if (keywords.length === 1) {
        var keyword = keywords[0];
        
        if (currentCharacter === length) {
            return indent + "return SyntaxKind." + firstEnumName(TypeScript.SyntaxKind, keyword.kind) + ";\r\n";
        }

        var keywordText = keywords[0].text;
        result = indent + "return ("

        for (var i = currentCharacter; i < length; i++) {
            if (i > currentCharacter) {
                result += " && ";
            }

            index = i === 0 ? "startIndex" : ("startIndex + " + i);
            result += "array.charCodeAt(" + index + ") === CharacterCodes." + keywordText.substr(i, 1);
        }

        result += ") ? SyntaxKind." + firstEnumName(TypeScript.SyntaxKind, keyword.kind) + " : SyntaxKind.IdentifierName;\r\n";
    }
    else {
        index = currentCharacter === 0 ? "startIndex" : ("startIndex + " + currentCharacter);
        result += indent + "switch(array.charCodeAt(" + index + ")) {\r\n"

        var groupedKeywords = TypeScript.ArrayUtilities.groupBy(keywords, k => k.text.substr(currentCharacter, 1));

        for (var c in groupedKeywords) {
            if (groupedKeywords.hasOwnProperty(c)) {
                result += indent + "case CharacterCodes." + c + ":\r\n";
                result += indent + "    // " + TypeScript.ArrayUtilities.select(groupedKeywords[c], (k: any) => k.text).join(", ") + "\r\n";
                result += generateKeywordCondition(groupedKeywords[c], currentCharacter + 1, indent + "    ");
            }
        }

        result += indent + "default:\r\n";
        result += indent + "    return SyntaxKind.IdentifierName;\r\n";
        result += indent + "}\r\n\r\n";
    }

    return result;
}

function generateScannerUtilities(): string {
    var result = "///<reference path='references.ts' />\r\n" +
        "\r\n" +
        "module TypeScript {\r\n" +
        "    export class ScannerUtilities {\r\n";

    var i: number;
    var keywords: { text: string; kind: TypeScript.SyntaxKind; }[] = [];

    for (i = TypeScript.SyntaxKind.FirstKeyword; i <= TypeScript.SyntaxKind.LastKeyword; i++) {
        keywords.push({ kind: i, text: TypeScript.SyntaxFacts.getText(i) });
    }

    result += "        public static identifierKind(array: string, startIndex: number, length: number): SyntaxKind {\r\n";

    var minTokenLength = TypeScript.ArrayUtilities.min(keywords, k => k.text.length);
    var maxTokenLength = TypeScript.ArrayUtilities.max(keywords, k => k.text.length);
    result += "            switch (length) {\r\n";


    for (i = minTokenLength; i <= maxTokenLength; i++) {
        var keywordsOfLengthI = TypeScript.ArrayUtilities.where(keywords, k => k.text.length === i);
        if (keywordsOfLengthI.length > 0) {
            result += "            case " + i + ":\r\n";
            result += "                // " + TypeScript.ArrayUtilities.select(keywordsOfLengthI, k => k.text).join(", ") + "\r\n";

            result += generateKeywordCondition(keywordsOfLengthI, 0, "                ");

            // result += "            return SyntaxKind.None;\r\n\r\n";
        }
    }

    result += "            default:\r\n";
    result += "                return SyntaxKind.IdentifierName;\r\n";
    result += "            }\r\n";
    result += "        }\r\n";

    result += "    }\r\n";
    result += "}";

    return result;
}

function generateVisitor(): string {
    var i: number;
    var definition: ITypeDefinition;
    var result = "";

    result += "///<reference path='references.ts' />\r\n\r\n";

    result += "module TypeScript {\r\n";
    result += "    export function visitNodeOrToken(visitor: ISyntaxVisitor, element: ISyntaxNodeOrToken): any {\r\n";
    result += "        if (element === null) { return null; }\r\n";
    result += "        if (isToken(element)) { return visitor.visitToken(<ISyntaxToken>element); }\r\n";
    result += "        switch (element.kind()) {\r\n";

    for (var i = 0; i < definitions.length; i++) {
        var definition = definitions[i];

        if (definition.syntaxKinds) {
            result += "           ";
            for (var j = 0; j < definition.syntaxKinds.length; j++) {
                result += " case SyntaxKind." + definition.syntaxKinds[j] + ":"
            }
            result += "\r\n";
        }
        else {
            result += "            case SyntaxKind." + getNameWithoutSuffix(definition) + ":\r\n";
        }

        result += "                return visitor.visit" + getNameWithoutSuffix(definition) + "(<" + definition.name + ">element);\r\n";
    }

    result += "        }\r\n\r\n";
    result += "        throw Errors.invalidOperation();\r\n";
    result += "    }\r\n\r\n";

    result += "    export interface ISyntaxVisitor {\r\n";
    result += "        visitToken(token: ISyntaxToken): any;\r\n";

    for (i = 0; i < definitions.length; i++) {
        definition = definitions[i];
        result += "        visit" + getNameWithoutSuffix(definition) + "(node: " + definition.name + "): any;\r\n";
    }

    result += "    }\r\n\r\n";

    if (!forPrettyPrinter) {
        result += "    export class SyntaxVisitor implements ISyntaxVisitor {\r\n";
        result += "        public defaultVisit(node: ISyntaxNodeOrToken): any {\r\n";
        result += "            return null;\r\n";
        result += "        }\r\n";
        result += "\r\n";
        result += "        public visitToken(token: ISyntaxToken): any {\r\n";
        result += "            return this.defaultVisit(token);\r\n";
        result += "        }\r\n";

        for (i = 0; i < definitions.length; i++) {
            definition = definitions[i];

            result += "\r\n        public visit" + getNameWithoutSuffix(definition) + "(node: " + definition.name + "): any {\r\n";
            result += "            return this.defaultVisit(node);\r\n";
            result += "        }\r\n";
        }

        result += "    }";
    }

    result += "\r\n}";

    return result;
}

function generateFactory(): string {
    var result = "///<reference path='references.ts' />\r\n";

    result += "\r\nmodule TypeScript.Syntax {\r\n";
    result += "    export interface IFactory {\r\n";
    
    var i: number;
    var j: number;
    var definition: ITypeDefinition;
    var child: IMemberDefinition;

    for (i = 0; i < definitions.length; i++) {
        definition = definitions[i];
        result += "        " + camelCase(getNameWithoutSuffix(definition)) + "(";

        for (j = 0; j < definition.children.length; j++) {
            if (j > 0) {
                result += ", ";
            }

            child = definition.children[j];
            result += child.name + ": " + getType(child);
        }

        result += "): " + definition.name + ";\r\n";
    }

    result += "    }\r\n\r\n";

    // TODO: stop exporting these once compiler bugs are fixed.
    result += "    export class NormalModeFactory implements IFactory {\r\n";

    for (i = 0; i < definitions.length; i++) {
        definition = definitions[i];
        result += "        " + camelCase(getNameWithoutSuffix(definition)) + "(";

        for (j = 0; j < definition.children.length; j++) {
            if (j > 0) {
                result += ", ";
            }

            child = definition.children[j];
            result += getSafeName(child) + ": " + getType(child);
        }

        result += "): " + definition.name + " {\r\n";
        result += "            return new " + definition.name + "(";

        for (j = 0; j < definition.children.length; j++) {
            child = definition.children[j];
            result += getSafeName(child);
            result += ", ";
        }

        result += "/*data:*/ 0);\r\n";
        result += "        }\r\n"
    }

    result += "    }\r\n\r\n";
    
    // TODO: stop exporting these once compiler bugs are fixed.
    result += "    export class StrictModeFactory implements IFactory {\r\n";

    for (i = 0; i < definitions.length; i++) {
        definition = definitions[i];
        result += "        " + camelCase(getNameWithoutSuffix(definition)) + "(";

        for (j = 0; j < definition.children.length; j++) {
            if (j > 0) {
                result += ", ";
            }

            child = definition.children[j];
            result += getSafeName(child) + ": " + getType(child);
        }

        result += "): " + definition.name + " {\r\n";
        result += "            return new " + definition.name + "(";

        for (j = 0; j < definition.children.length; j++) {
            child = definition.children[j];
            result += getSafeName(child);
            result += ", ";
        }

        result += "/*data:*/ SyntaxConstants.NodeParsedInStrictModeMask);\r\n";

        result += "        }\r\n"
    }

    result += "    }\r\n\r\n";

    result += "    export var normalModeFactory: IFactory = new NormalModeFactory();\r\n";
    result += "    export var strictModeFactory: IFactory = new StrictModeFactory();\r\n";
    result += "}";

    return result;
}

function generateServicesUtilities(): string {
    var result = ""; // "/// <reference path='references.ts' />\r\n\r\n";

    result += generateIsTypeScriptSpecific();

    return result;
}

function generateIsTypeScriptSpecific(): string {
    var result = "";

    result += "module TypeScript {\r\n";

    result += "    function isSeparatedListTypeScriptSpecific(list: ISeparatedSyntaxList<ISyntaxNodeOrToken>): boolean {\r\n"
    result += "        for (var i = 0, n = this.nonSeparatorCount(); i < n; i++) {\r\n";
    result += "            if (this.nonSeparatorAt(i).isTypeScriptSpecific()) {\r\n";
    result += "                return true;\r\n";
    result += "            }\r\n";
    result += "        }\r\n\r\n";
    result += "        return false;\r\n";
    result += "    }\r\n\r\n";

    result += "    function isListTypeScriptSpecific(list: ISyntaxList<ISyntaxNodeOrToken>): boolean {\r\n"
    result += "        for (var i = 0, n = this.childCount(); i < n; i++) {\r\n";
    result += "            if (this.childAt(i).isTypeScriptSpecific()) {\r\n";
    result += "                return true;\r\n";
    result += "            }\r\n";
    result += "        }\r\n\r\n";
    result += "        return false;\r\n";
    result += "    }\r\n\r\n";

    result += "    export function isTypeScriptSpecific(element: ISyntaxElement): boolean {\r\n"
    result += "        if (element === null) { return false; }\r\n";
    result += "        if (isToken(element)) { return false; }\r\n";
    result += "        if (isList(element)) { return isListTypeScriptSpecific(<ISyntaxList<ISyntaxNodeOrToken>>element); }\r\n";
    result += "        if (isSeparatedList(element)) { return isSeparatedListTypeScriptSpecific(<ISeparatedSyntaxList<ISyntaxNodeOrToken>>element); }\r\n\r\n";
    result += "        switch (element.kind()) {\r\n";

    for (var i = 0; i < definitions.length; i++) {
        var definition = definitions[i];
        if (!definition.isTypeScriptSpecific) {
            continue;
        }

        if (definition.syntaxKinds) {
            for (var j = 0; j < definition.syntaxKinds.length; j++) {
                result += "            case SyntaxKind." + definition.syntaxKinds[j] + ":\r\n";
            }
        }
        else {
            result += "            case SyntaxKind." + getNameWithoutSuffix(definition) + ":\r\n";
        }
    }

    result += "                return true;\r\n";

    var triviallyFalseDefinitions = definitions.filter(d => d.children.filter(c => c.type !== "SyntaxKind" && !c.isToken).length === 0);
    for (var i = 0; i < triviallyFalseDefinitions.length; i++) {
        var definition = triviallyFalseDefinitions[i];
        if (definition.isTypeScriptSpecific) {
            continue;
        }

        if (definition.syntaxKinds) {
            for (var j = 0; j < definition.syntaxKinds.length; j++) {
                result += "            case SyntaxKind." + definition.syntaxKinds[j] + ":\r\n";
            }
        }
        else {
            result += "            case SyntaxKind." + getNameWithoutSuffix(definition) + ":\r\n";
        }
    }

    result += "                return false;\r\n";

    for (var i = 0; i < definitions.length; i++) {
        var definition = definitions[i];
        if (definition.isTypeScriptSpecific) {
            continue;
        }

        if (definition.children.filter(c => c.type !== "SyntaxKind" && !c.isToken).length === 0) {
            continue;
        }

        if (definition.syntaxKinds) {
            result += "           ";
            for (var j = 0; j < definition.syntaxKinds.length; j++) {
                result += " case SyntaxKind." + definition.syntaxKinds[j] + ":";
            }
        }
        else {
            result += "            case SyntaxKind." + getNameWithoutSuffix(definition) + ":";
        }
        result += "\r\n";
        result += "                return is" + getNameWithoutSuffix(definition) + "TypeScriptSpecific(<" + definition.name + ">element);\r\n";
    }

    result += "        }\r\n";
    result += "    }\r\n";

    for (var i = 0; i < definitions.length; i++) {
        var definition = definitions[i];
        if (definition.isTypeScriptSpecific) {
            continue;
        }

        var importantChildren = definition.children.filter(d => d.type !== "SyntaxKind" && !d.isToken);
        if (importantChildren.length > 0) {
            result += generateIsTypeScriptSpecificMethod(definition);
        }
    }

    result += "}";

    return result;
}

function generateIsTypeScriptSpecificMethod(definition: ITypeDefinition): string {
    var result = "\r\n    function is" + getNameWithoutSuffix(definition) + "TypeScriptSpecific(node: " + definition.name + "): boolean {\r\n";

    result += "        return ";

    var addedCheck = false;
    for (var i = 0; i < definition.children.length; i++) {
        var child = definition.children[i];

        if (child.type === "SyntaxKind") {
            continue;
        }

        if (child.isToken) {
            continue;
        }

        if (addedCheck) {
            result += " ||\r\n               ";
        }

        addedCheck = true;

        if (child.isTypeScriptSpecific) {
            if (child.isList || child.isSeparatedList) {
                result += getPropertyAccess(child, "node") + ".childCount() > 0";
            }
            else {
                result += getPropertyAccess(child, "node") + " !== null";
            }
        }
        else {
            result += "isTypeScriptSpecific(" + getPropertyAccess(child, "node") + ")";
        }
    }

    if (!addedCheck) {
        result += "false";
    }

    result += ";\r\n";
    result += "    }\r\n";

    return result;
}

var syntaxNodes = generateNodes();
var syntaxInterfaces = generateSyntaxInterfaces();
var rewriter = generateRewriter();
var walker = generateWalker();
var scannerUtilities = generateScannerUtilities();
var visitor = generateVisitor();
var factory = generateFactory();
var servicesUtilities = generateServicesUtilities();

TypeScript.Environment.writeFile(TypeScript.Environment.currentDirectory() + "\\src\\compiler\\syntax\\syntaxInterfaces.generated.ts", syntaxInterfaces, false);
TypeScript.Environment.writeFile(TypeScript.Environment.currentDirectory() + "\\src\\compiler\\syntax\\syntaxNodes.generated.ts", syntaxNodes, false);
TypeScript.Environment.writeFile(TypeScript.Environment.currentDirectory() + "\\src\\services\\syntaxRewriter.generated.ts", rewriter, false);
TypeScript.Environment.writeFile(TypeScript.Environment.currentDirectory() + "\\src\\compiler\\syntax\\syntaxWalker.generated.ts", walker, false);
TypeScript.Environment.writeFile(TypeScript.Environment.currentDirectory() + "\\src\\compiler\\syntax\\scannerUtilities.generated.ts", scannerUtilities, false);
TypeScript.Environment.writeFile(TypeScript.Environment.currentDirectory() + "\\src\\compiler\\syntax\\syntaxVisitor.generated.ts", visitor, false);
TypeScript.Environment.writeFile(TypeScript.Environment.currentDirectory() + "\\src\\compiler\\syntax\\syntaxFactory.generated.ts", factory, false);
TypeScript.Environment.writeFile(TypeScript.Environment.currentDirectory() + "\\src\\services\\syntaxUtilities.generated.ts", servicesUtilities, false);
