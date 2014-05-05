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

    export interface SourceUnitSyntax extends ISyntaxNode {
        syntaxTree: SyntaxTree;
        moduleElements: IModuleElementSyntax[];
        endOfFileToken: ISyntaxToken;
    }

    export function createSourceUnit(data: number, moduleElements: IModuleElementSyntax[], endOfFileToken: ISyntaxToken): SourceUnitSyntax {
        var result = <SourceUnitSyntax>{ data: data, kind: SyntaxKind.SourceUnit, syntaxTree: null, parent: null, moduleElements: moduleElements, endOfFileToken: endOfFileToken };
        !isShared(moduleElements) && (moduleElements.parent = result);
        endOfFileToken.parent = result;
        return result;
    }

    export interface ExternalModuleReferenceSyntax extends ISyntaxNode, IModuleReferenceSyntax {
        requireKeyword: ISyntaxToken;
        openParenToken: ISyntaxToken;
        stringLiteral: ISyntaxToken;
        closeParenToken: ISyntaxToken;
    }

    export function createExternalModuleReference(data: number, requireKeyword: ISyntaxToken, openParenToken: ISyntaxToken, stringLiteral: ISyntaxToken, closeParenToken: ISyntaxToken): ExternalModuleReferenceSyntax {
        var result = <ExternalModuleReferenceSyntax>{ data: data, kind: SyntaxKind.ExternalModuleReference, requireKeyword: requireKeyword, openParenToken: openParenToken, stringLiteral: stringLiteral, closeParenToken: closeParenToken };
        requireKeyword.parent = result;
        openParenToken.parent = result;
        stringLiteral.parent = result;
        closeParenToken.parent = result;
        return result;
    }

    export interface ModuleNameModuleReferenceSyntax extends ISyntaxNode, IModuleReferenceSyntax {
        moduleName: INameSyntax;
    }

    export function createModuleNameModuleReference(data: number, moduleName: INameSyntax): ModuleNameModuleReferenceSyntax {
        var result = <ModuleNameModuleReferenceSyntax>{ data: data, kind: SyntaxKind.ModuleNameModuleReference, moduleName: moduleName };
        moduleName.parent = result;
        return result;
    }

    export interface ImportDeclarationSyntax extends ISyntaxNode, IModuleElementSyntax {
        modifiers: ISyntaxToken[];
        importKeyword: ISyntaxToken;
        identifier: ISyntaxToken;
        equalsToken: ISyntaxToken;
        moduleReference: IModuleReferenceSyntax;
        semicolonToken: ISyntaxToken;
    }

    export function createImportDeclaration(data: number, modifiers: ISyntaxToken[], importKeyword: ISyntaxToken, identifier: ISyntaxToken, equalsToken: ISyntaxToken, moduleReference: IModuleReferenceSyntax, semicolonToken: ISyntaxToken): ImportDeclarationSyntax {
        var result = <ImportDeclarationSyntax>{ data: data, kind: SyntaxKind.ImportDeclaration, modifiers: modifiers, importKeyword: importKeyword, identifier: identifier, equalsToken: equalsToken, moduleReference: moduleReference, semicolonToken: semicolonToken };
        !isShared(modifiers) && (modifiers.parent = result);
        importKeyword.parent = result;
        identifier.parent = result;
        equalsToken.parent = result;
        moduleReference.parent = result;
        semicolonToken && (semicolonToken.parent = result);
        return result;
    }

    export interface ExportAssignmentSyntax extends ISyntaxNode, IModuleElementSyntax {
        exportKeyword: ISyntaxToken;
        equalsToken: ISyntaxToken;
        identifier: ISyntaxToken;
        semicolonToken: ISyntaxToken;
    }

    export function createExportAssignment(data: number, exportKeyword: ISyntaxToken, equalsToken: ISyntaxToken, identifier: ISyntaxToken, semicolonToken: ISyntaxToken): ExportAssignmentSyntax {
        var result = <ExportAssignmentSyntax>{ data: data, kind: SyntaxKind.ExportAssignment, exportKeyword: exportKeyword, equalsToken: equalsToken, identifier: identifier, semicolonToken: semicolonToken };
        exportKeyword.parent = result;
        equalsToken.parent = result;
        identifier.parent = result;
        semicolonToken && (semicolonToken.parent = result);
        return result;
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

    export function createClassDeclaration(data: number, modifiers: ISyntaxToken[], classKeyword: ISyntaxToken, identifier: ISyntaxToken, typeParameterList: TypeParameterListSyntax, heritageClauses: HeritageClauseSyntax[], openBraceToken: ISyntaxToken, classElements: IClassElementSyntax[], closeBraceToken: ISyntaxToken): ClassDeclarationSyntax {
        var result = <ClassDeclarationSyntax>{ data: data, kind: SyntaxKind.ClassDeclaration, modifiers: modifiers, classKeyword: classKeyword, identifier: identifier, typeParameterList: typeParameterList, heritageClauses: heritageClauses, openBraceToken: openBraceToken, classElements: classElements, closeBraceToken: closeBraceToken };
        !isShared(modifiers) && (modifiers.parent = result);
        classKeyword.parent = result;
        identifier.parent = result;
        typeParameterList && (typeParameterList.parent = result);
        !isShared(heritageClauses) && (heritageClauses.parent = result);
        openBraceToken.parent = result;
        !isShared(classElements) && (classElements.parent = result);
        closeBraceToken.parent = result;
        return result;
    }

    export interface InterfaceDeclarationSyntax extends ISyntaxNode, IModuleElementSyntax {
        modifiers: ISyntaxToken[];
        interfaceKeyword: ISyntaxToken;
        identifier: ISyntaxToken;
        typeParameterList: TypeParameterListSyntax;
        heritageClauses: HeritageClauseSyntax[];
        body: ObjectTypeSyntax;
    }

    export function createInterfaceDeclaration(data: number, modifiers: ISyntaxToken[], interfaceKeyword: ISyntaxToken, identifier: ISyntaxToken, typeParameterList: TypeParameterListSyntax, heritageClauses: HeritageClauseSyntax[], body: ObjectTypeSyntax): InterfaceDeclarationSyntax {
        var result = <InterfaceDeclarationSyntax>{ data: data, kind: SyntaxKind.InterfaceDeclaration, modifiers: modifiers, interfaceKeyword: interfaceKeyword, identifier: identifier, typeParameterList: typeParameterList, heritageClauses: heritageClauses, body: body };
        !isShared(modifiers) && (modifiers.parent = result);
        interfaceKeyword.parent = result;
        identifier.parent = result;
        typeParameterList && (typeParameterList.parent = result);
        !isShared(heritageClauses) && (heritageClauses.parent = result);
        body.parent = result;
        return result;
    }

    export interface HeritageClauseSyntax extends ISyntaxNode {
        extendsOrImplementsKeyword: ISyntaxToken;
        typeNames: INameSyntax[];
    }

    export function createHeritageClause(data: number, kind: SyntaxKind, extendsOrImplementsKeyword: ISyntaxToken, typeNames: INameSyntax[]): HeritageClauseSyntax {
        var result = <HeritageClauseSyntax>{ data: data, kind: kind, extendsOrImplementsKeyword: extendsOrImplementsKeyword, typeNames: typeNames };
        extendsOrImplementsKeyword.parent = result;
        !isShared(typeNames) && (typeNames.parent = result);
        return result;
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

    export function createModuleDeclaration(data: number, modifiers: ISyntaxToken[], moduleKeyword: ISyntaxToken, name: INameSyntax, stringLiteral: ISyntaxToken, openBraceToken: ISyntaxToken, moduleElements: IModuleElementSyntax[], closeBraceToken: ISyntaxToken): ModuleDeclarationSyntax {
        var result = <ModuleDeclarationSyntax>{ data: data, kind: SyntaxKind.ModuleDeclaration, modifiers: modifiers, moduleKeyword: moduleKeyword, name: name, stringLiteral: stringLiteral, openBraceToken: openBraceToken, moduleElements: moduleElements, closeBraceToken: closeBraceToken };
        !isShared(modifiers) && (modifiers.parent = result);
        moduleKeyword.parent = result;
        name && (name.parent = result);
        stringLiteral && (stringLiteral.parent = result);
        openBraceToken.parent = result;
        !isShared(moduleElements) && (moduleElements.parent = result);
        closeBraceToken.parent = result;
        return result;
    }

    export interface FunctionDeclarationSyntax extends ISyntaxNode, IStatementSyntax {
        modifiers: ISyntaxToken[];
        functionKeyword: ISyntaxToken;
        identifier: ISyntaxToken;
        callSignature: CallSignatureSyntax;
        block: BlockSyntax;
        semicolonToken: ISyntaxToken;
    }

    export function createFunctionDeclaration(data: number, modifiers: ISyntaxToken[], functionKeyword: ISyntaxToken, identifier: ISyntaxToken, callSignature: CallSignatureSyntax, block: BlockSyntax, semicolonToken: ISyntaxToken): FunctionDeclarationSyntax {
        var result = <FunctionDeclarationSyntax>{ data: data, kind: SyntaxKind.FunctionDeclaration, modifiers: modifiers, functionKeyword: functionKeyword, identifier: identifier, callSignature: callSignature, block: block, semicolonToken: semicolonToken };
        !isShared(modifiers) && (modifiers.parent = result);
        functionKeyword.parent = result;
        identifier.parent = result;
        callSignature.parent = result;
        block && (block.parent = result);
        semicolonToken && (semicolonToken.parent = result);
        return result;
    }

    export interface VariableStatementSyntax extends ISyntaxNode, IStatementSyntax {
        modifiers: ISyntaxToken[];
        variableDeclaration: VariableDeclarationSyntax;
        semicolonToken: ISyntaxToken;
    }

    export function createVariableStatement(data: number, modifiers: ISyntaxToken[], variableDeclaration: VariableDeclarationSyntax, semicolonToken: ISyntaxToken): VariableStatementSyntax {
        var result = <VariableStatementSyntax>{ data: data, kind: SyntaxKind.VariableStatement, modifiers: modifiers, variableDeclaration: variableDeclaration, semicolonToken: semicolonToken };
        !isShared(modifiers) && (modifiers.parent = result);
        variableDeclaration.parent = result;
        semicolonToken && (semicolonToken.parent = result);
        return result;
    }

    export interface VariableDeclarationSyntax extends ISyntaxNode {
        varKeyword: ISyntaxToken;
        variableDeclarators: VariableDeclaratorSyntax[];
    }

    export function createVariableDeclaration(data: number, varKeyword: ISyntaxToken, variableDeclarators: VariableDeclaratorSyntax[]): VariableDeclarationSyntax {
        var result = <VariableDeclarationSyntax>{ data: data, kind: SyntaxKind.VariableDeclaration, varKeyword: varKeyword, variableDeclarators: variableDeclarators };
        varKeyword.parent = result;
        !isShared(variableDeclarators) && (variableDeclarators.parent = result);
        return result;
    }

    export interface VariableDeclaratorSyntax extends ISyntaxNode {
        propertyName: ISyntaxToken;
        typeAnnotation: TypeAnnotationSyntax;
        equalsValueClause: EqualsValueClauseSyntax;
    }

    export function createVariableDeclarator(data: number, propertyName: ISyntaxToken, typeAnnotation: TypeAnnotationSyntax, equalsValueClause: EqualsValueClauseSyntax): VariableDeclaratorSyntax {
        var result = <VariableDeclaratorSyntax>{ data: data, kind: SyntaxKind.VariableDeclarator, propertyName: propertyName, typeAnnotation: typeAnnotation, equalsValueClause: equalsValueClause };
        propertyName.parent = result;
        typeAnnotation && (typeAnnotation.parent = result);
        equalsValueClause && (equalsValueClause.parent = result);
        return result;
    }

    export interface EqualsValueClauseSyntax extends ISyntaxNode {
        equalsToken: ISyntaxToken;
        value: IExpressionSyntax;
    }

    export function createEqualsValueClause(data: number, equalsToken: ISyntaxToken, value: IExpressionSyntax): EqualsValueClauseSyntax {
        var result = <EqualsValueClauseSyntax>{ data: data, kind: SyntaxKind.EqualsValueClause, equalsToken: equalsToken, value: value };
        equalsToken.parent = result;
        value.parent = result;
        return result;
    }

    export interface PrefixUnaryExpressionSyntax extends ISyntaxNode, IUnaryExpressionSyntax {
        operatorToken: ISyntaxToken;
        operand: IUnaryExpressionSyntax;
    }

    export function createPrefixUnaryExpression(data: number, kind: SyntaxKind, operatorToken: ISyntaxToken, operand: IUnaryExpressionSyntax): PrefixUnaryExpressionSyntax {
        var result = <PrefixUnaryExpressionSyntax>{ data: data, kind: kind, operatorToken: operatorToken, operand: operand };
        operatorToken.parent = result;
        operand.parent = result;
        return result;
    }

    export interface ArrayLiteralExpressionSyntax extends ISyntaxNode, IPrimaryExpressionSyntax {
        openBracketToken: ISyntaxToken;
        expressions: IExpressionSyntax[];
        closeBracketToken: ISyntaxToken;
    }

    export function createArrayLiteralExpression(data: number, openBracketToken: ISyntaxToken, expressions: IExpressionSyntax[], closeBracketToken: ISyntaxToken): ArrayLiteralExpressionSyntax {
        var result = <ArrayLiteralExpressionSyntax>{ data: data, kind: SyntaxKind.ArrayLiteralExpression, openBracketToken: openBracketToken, expressions: expressions, closeBracketToken: closeBracketToken };
        openBracketToken.parent = result;
        !isShared(expressions) && (expressions.parent = result);
        closeBracketToken.parent = result;
        return result;
    }

    export interface OmittedExpressionSyntax extends ISyntaxNode, IExpressionSyntax {
    }

    export function createOmittedExpression(data: number): OmittedExpressionSyntax {
        var result = <OmittedExpressionSyntax>{ data: data, kind: SyntaxKind.OmittedExpression };
        return result;
    }

    export interface ParenthesizedExpressionSyntax extends ISyntaxNode, IPrimaryExpressionSyntax {
        openParenToken: ISyntaxToken;
        expression: IExpressionSyntax;
        closeParenToken: ISyntaxToken;
    }

    export function createParenthesizedExpression(data: number, openParenToken: ISyntaxToken, expression: IExpressionSyntax, closeParenToken: ISyntaxToken): ParenthesizedExpressionSyntax {
        var result = <ParenthesizedExpressionSyntax>{ data: data, kind: SyntaxKind.ParenthesizedExpression, openParenToken: openParenToken, expression: expression, closeParenToken: closeParenToken };
        openParenToken.parent = result;
        expression.parent = result;
        closeParenToken.parent = result;
        return result;
    }

    export interface SimpleArrowFunctionExpressionSyntax extends ISyntaxNode, IUnaryExpressionSyntax {
        identifier: ISyntaxToken;
        equalsGreaterThanToken: ISyntaxToken;
        block: BlockSyntax;
        expression: IExpressionSyntax;
    }

    export function createSimpleArrowFunctionExpression(data: number, identifier: ISyntaxToken, equalsGreaterThanToken: ISyntaxToken, block: BlockSyntax, expression: IExpressionSyntax): SimpleArrowFunctionExpressionSyntax {
        var result = <SimpleArrowFunctionExpressionSyntax>{ data: data, kind: SyntaxKind.SimpleArrowFunctionExpression, identifier: identifier, equalsGreaterThanToken: equalsGreaterThanToken, block: block, expression: expression };
        identifier.parent = result;
        equalsGreaterThanToken.parent = result;
        block && (block.parent = result);
        expression && (expression.parent = result);
        return result;
    }

    export interface ParenthesizedArrowFunctionExpressionSyntax extends ISyntaxNode, IUnaryExpressionSyntax {
        callSignature: CallSignatureSyntax;
        equalsGreaterThanToken: ISyntaxToken;
        block: BlockSyntax;
        expression: IExpressionSyntax;
    }

    export function createParenthesizedArrowFunctionExpression(data: number, callSignature: CallSignatureSyntax, equalsGreaterThanToken: ISyntaxToken, block: BlockSyntax, expression: IExpressionSyntax): ParenthesizedArrowFunctionExpressionSyntax {
        var result = <ParenthesizedArrowFunctionExpressionSyntax>{ data: data, kind: SyntaxKind.ParenthesizedArrowFunctionExpression, callSignature: callSignature, equalsGreaterThanToken: equalsGreaterThanToken, block: block, expression: expression };
        callSignature.parent = result;
        equalsGreaterThanToken.parent = result;
        block && (block.parent = result);
        expression && (expression.parent = result);
        return result;
    }

    export interface QualifiedNameSyntax extends ISyntaxNode, INameSyntax {
        left: INameSyntax;
        dotToken: ISyntaxToken;
        right: ISyntaxToken;
    }

    export function createQualifiedName(data: number, left: INameSyntax, dotToken: ISyntaxToken, right: ISyntaxToken): QualifiedNameSyntax {
        var result = <QualifiedNameSyntax>{ data: data, kind: SyntaxKind.QualifiedName, left: left, dotToken: dotToken, right: right };
        left.parent = result;
        dotToken.parent = result;
        right.parent = result;
        return result;
    }

    export interface TypeArgumentListSyntax extends ISyntaxNode {
        lessThanToken: ISyntaxToken;
        typeArguments: ITypeSyntax[];
        greaterThanToken: ISyntaxToken;
    }

    export function createTypeArgumentList(data: number, lessThanToken: ISyntaxToken, typeArguments: ITypeSyntax[], greaterThanToken: ISyntaxToken): TypeArgumentListSyntax {
        var result = <TypeArgumentListSyntax>{ data: data, kind: SyntaxKind.TypeArgumentList, lessThanToken: lessThanToken, typeArguments: typeArguments, greaterThanToken: greaterThanToken };
        lessThanToken.parent = result;
        !isShared(typeArguments) && (typeArguments.parent = result);
        greaterThanToken.parent = result;
        return result;
    }

    export interface ConstructorTypeSyntax extends ISyntaxNode, ITypeSyntax {
        newKeyword: ISyntaxToken;
        typeParameterList: TypeParameterListSyntax;
        parameterList: ParameterListSyntax;
        equalsGreaterThanToken: ISyntaxToken;
        type: ITypeSyntax;
    }

    export function createConstructorType(data: number, newKeyword: ISyntaxToken, typeParameterList: TypeParameterListSyntax, parameterList: ParameterListSyntax, equalsGreaterThanToken: ISyntaxToken, type: ITypeSyntax): ConstructorTypeSyntax {
        var result = <ConstructorTypeSyntax>{ data: data, kind: SyntaxKind.ConstructorType, newKeyword: newKeyword, typeParameterList: typeParameterList, parameterList: parameterList, equalsGreaterThanToken: equalsGreaterThanToken, type: type };
        newKeyword.parent = result;
        typeParameterList && (typeParameterList.parent = result);
        parameterList.parent = result;
        equalsGreaterThanToken.parent = result;
        type.parent = result;
        return result;
    }

    export interface FunctionTypeSyntax extends ISyntaxNode, ITypeSyntax {
        typeParameterList: TypeParameterListSyntax;
        parameterList: ParameterListSyntax;
        equalsGreaterThanToken: ISyntaxToken;
        type: ITypeSyntax;
    }

    export function createFunctionType(data: number, typeParameterList: TypeParameterListSyntax, parameterList: ParameterListSyntax, equalsGreaterThanToken: ISyntaxToken, type: ITypeSyntax): FunctionTypeSyntax {
        var result = <FunctionTypeSyntax>{ data: data, kind: SyntaxKind.FunctionType, typeParameterList: typeParameterList, parameterList: parameterList, equalsGreaterThanToken: equalsGreaterThanToken, type: type };
        typeParameterList && (typeParameterList.parent = result);
        parameterList.parent = result;
        equalsGreaterThanToken.parent = result;
        type.parent = result;
        return result;
    }

    export interface ObjectTypeSyntax extends ISyntaxNode, ITypeSyntax {
        openBraceToken: ISyntaxToken;
        typeMembers: ITypeMemberSyntax[];
        closeBraceToken: ISyntaxToken;
    }

    export function createObjectType(data: number, openBraceToken: ISyntaxToken, typeMembers: ITypeMemberSyntax[], closeBraceToken: ISyntaxToken): ObjectTypeSyntax {
        var result = <ObjectTypeSyntax>{ data: data, kind: SyntaxKind.ObjectType, openBraceToken: openBraceToken, typeMembers: typeMembers, closeBraceToken: closeBraceToken };
        openBraceToken.parent = result;
        !isShared(typeMembers) && (typeMembers.parent = result);
        closeBraceToken.parent = result;
        return result;
    }

    export interface ArrayTypeSyntax extends ISyntaxNode, ITypeSyntax {
        type: ITypeSyntax;
        openBracketToken: ISyntaxToken;
        closeBracketToken: ISyntaxToken;
    }

    export function createArrayType(data: number, type: ITypeSyntax, openBracketToken: ISyntaxToken, closeBracketToken: ISyntaxToken): ArrayTypeSyntax {
        var result = <ArrayTypeSyntax>{ data: data, kind: SyntaxKind.ArrayType, type: type, openBracketToken: openBracketToken, closeBracketToken: closeBracketToken };
        type.parent = result;
        openBracketToken.parent = result;
        closeBracketToken.parent = result;
        return result;
    }

    export interface GenericTypeSyntax extends ISyntaxNode, ITypeSyntax {
        name: INameSyntax;
        typeArgumentList: TypeArgumentListSyntax;
    }

    export function createGenericType(data: number, name: INameSyntax, typeArgumentList: TypeArgumentListSyntax): GenericTypeSyntax {
        var result = <GenericTypeSyntax>{ data: data, kind: SyntaxKind.GenericType, name: name, typeArgumentList: typeArgumentList };
        name.parent = result;
        typeArgumentList.parent = result;
        return result;
    }

    export interface TypeQuerySyntax extends ISyntaxNode, ITypeSyntax {
        typeOfKeyword: ISyntaxToken;
        name: INameSyntax;
    }

    export function createTypeQuery(data: number, typeOfKeyword: ISyntaxToken, name: INameSyntax): TypeQuerySyntax {
        var result = <TypeQuerySyntax>{ data: data, kind: SyntaxKind.TypeQuery, typeOfKeyword: typeOfKeyword, name: name };
        typeOfKeyword.parent = result;
        name.parent = result;
        return result;
    }

    export interface TypeAnnotationSyntax extends ISyntaxNode {
        colonToken: ISyntaxToken;
        type: ITypeSyntax;
    }

    export function createTypeAnnotation(data: number, colonToken: ISyntaxToken, type: ITypeSyntax): TypeAnnotationSyntax {
        var result = <TypeAnnotationSyntax>{ data: data, kind: SyntaxKind.TypeAnnotation, colonToken: colonToken, type: type };
        colonToken.parent = result;
        type.parent = result;
        return result;
    }

    export interface BlockSyntax extends ISyntaxNode, IStatementSyntax {
        openBraceToken: ISyntaxToken;
        statements: IStatementSyntax[];
        closeBraceToken: ISyntaxToken;
    }

    export function createBlock(data: number, openBraceToken: ISyntaxToken, statements: IStatementSyntax[], closeBraceToken: ISyntaxToken): BlockSyntax {
        var result = <BlockSyntax>{ data: data, kind: SyntaxKind.Block, openBraceToken: openBraceToken, statements: statements, closeBraceToken: closeBraceToken };
        openBraceToken.parent = result;
        !isShared(statements) && (statements.parent = result);
        closeBraceToken.parent = result;
        return result;
    }

    export interface ParameterSyntax extends ISyntaxNode {
        dotDotDotToken: ISyntaxToken;
        modifiers: ISyntaxToken[];
        identifier: ISyntaxToken;
        questionToken: ISyntaxToken;
        typeAnnotation: TypeAnnotationSyntax;
        equalsValueClause: EqualsValueClauseSyntax;
    }

    export function createParameter(data: number, dotDotDotToken: ISyntaxToken, modifiers: ISyntaxToken[], identifier: ISyntaxToken, questionToken: ISyntaxToken, typeAnnotation: TypeAnnotationSyntax, equalsValueClause: EqualsValueClauseSyntax): ParameterSyntax {
        var result = <ParameterSyntax>{ data: data, kind: SyntaxKind.Parameter, dotDotDotToken: dotDotDotToken, modifiers: modifiers, identifier: identifier, questionToken: questionToken, typeAnnotation: typeAnnotation, equalsValueClause: equalsValueClause };
        dotDotDotToken && (dotDotDotToken.parent = result);
        !isShared(modifiers) && (modifiers.parent = result);
        identifier.parent = result;
        questionToken && (questionToken.parent = result);
        typeAnnotation && (typeAnnotation.parent = result);
        equalsValueClause && (equalsValueClause.parent = result);
        return result;
    }

    export interface MemberAccessExpressionSyntax extends ISyntaxNode, IMemberExpressionSyntax, ICallExpressionSyntax {
        expression: ILeftHandSideExpressionSyntax;
        dotToken: ISyntaxToken;
        name: ISyntaxToken;
    }

    export function createMemberAccessExpression(data: number, expression: ILeftHandSideExpressionSyntax, dotToken: ISyntaxToken, name: ISyntaxToken): MemberAccessExpressionSyntax {
        var result = <MemberAccessExpressionSyntax>{ data: data, kind: SyntaxKind.MemberAccessExpression, expression: expression, dotToken: dotToken, name: name };
        expression.parent = result;
        dotToken.parent = result;
        name.parent = result;
        return result;
    }

    export interface PostfixUnaryExpressionSyntax extends ISyntaxNode, IPostfixExpressionSyntax {
        operand: ILeftHandSideExpressionSyntax;
        operatorToken: ISyntaxToken;
    }

    export function createPostfixUnaryExpression(data: number, kind: SyntaxKind, operand: ILeftHandSideExpressionSyntax, operatorToken: ISyntaxToken): PostfixUnaryExpressionSyntax {
        var result = <PostfixUnaryExpressionSyntax>{ data: data, kind: kind, operand: operand, operatorToken: operatorToken };
        operand.parent = result;
        operatorToken.parent = result;
        return result;
    }

    export interface ElementAccessExpressionSyntax extends ISyntaxNode, IMemberExpressionSyntax, ICallExpressionSyntax {
        expression: ILeftHandSideExpressionSyntax;
        openBracketToken: ISyntaxToken;
        argumentExpression: IExpressionSyntax;
        closeBracketToken: ISyntaxToken;
    }

    export function createElementAccessExpression(data: number, expression: ILeftHandSideExpressionSyntax, openBracketToken: ISyntaxToken, argumentExpression: IExpressionSyntax, closeBracketToken: ISyntaxToken): ElementAccessExpressionSyntax {
        var result = <ElementAccessExpressionSyntax>{ data: data, kind: SyntaxKind.ElementAccessExpression, expression: expression, openBracketToken: openBracketToken, argumentExpression: argumentExpression, closeBracketToken: closeBracketToken };
        expression.parent = result;
        openBracketToken.parent = result;
        argumentExpression.parent = result;
        closeBracketToken.parent = result;
        return result;
    }

    export interface InvocationExpressionSyntax extends ISyntaxNode, ICallExpressionSyntax {
        expression: ILeftHandSideExpressionSyntax;
        argumentList: ArgumentListSyntax;
    }

    export function createInvocationExpression(data: number, expression: ILeftHandSideExpressionSyntax, argumentList: ArgumentListSyntax): InvocationExpressionSyntax {
        var result = <InvocationExpressionSyntax>{ data: data, kind: SyntaxKind.InvocationExpression, expression: expression, argumentList: argumentList };
        expression.parent = result;
        argumentList.parent = result;
        return result;
    }

    export interface ArgumentListSyntax extends ISyntaxNode {
        typeArgumentList: TypeArgumentListSyntax;
        openParenToken: ISyntaxToken;
        arguments: IExpressionSyntax[];
        closeParenToken: ISyntaxToken;
    }

    export function createArgumentList(data: number, typeArgumentList: TypeArgumentListSyntax, openParenToken: ISyntaxToken, arguments: IExpressionSyntax[], closeParenToken: ISyntaxToken): ArgumentListSyntax {
        var result = <ArgumentListSyntax>{ data: data, kind: SyntaxKind.ArgumentList, typeArgumentList: typeArgumentList, openParenToken: openParenToken, arguments: arguments, closeParenToken: closeParenToken };
        typeArgumentList && (typeArgumentList.parent = result);
        openParenToken.parent = result;
        !isShared(arguments) && (arguments.parent = result);
        closeParenToken.parent = result;
        return result;
    }

    export interface BinaryExpressionSyntax extends ISyntaxNode, IExpressionSyntax {
        left: IExpressionSyntax;
        operatorToken: ISyntaxToken;
        right: IExpressionSyntax;
    }

    export function createBinaryExpression(data: number, kind: SyntaxKind, left: IExpressionSyntax, operatorToken: ISyntaxToken, right: IExpressionSyntax): BinaryExpressionSyntax {
        var result = <BinaryExpressionSyntax>{ data: data, kind: kind, left: left, operatorToken: operatorToken, right: right };
        left.parent = result;
        operatorToken.parent = result;
        right.parent = result;
        return result;
    }

    export interface ConditionalExpressionSyntax extends ISyntaxNode, IExpressionSyntax {
        condition: IExpressionSyntax;
        questionToken: ISyntaxToken;
        whenTrue: IExpressionSyntax;
        colonToken: ISyntaxToken;
        whenFalse: IExpressionSyntax;
    }

    export function createConditionalExpression(data: number, condition: IExpressionSyntax, questionToken: ISyntaxToken, whenTrue: IExpressionSyntax, colonToken: ISyntaxToken, whenFalse: IExpressionSyntax): ConditionalExpressionSyntax {
        var result = <ConditionalExpressionSyntax>{ data: data, kind: SyntaxKind.ConditionalExpression, condition: condition, questionToken: questionToken, whenTrue: whenTrue, colonToken: colonToken, whenFalse: whenFalse };
        condition.parent = result;
        questionToken.parent = result;
        whenTrue.parent = result;
        colonToken.parent = result;
        whenFalse.parent = result;
        return result;
    }

    export interface ConstructSignatureSyntax extends ISyntaxNode, ITypeMemberSyntax {
        newKeyword: ISyntaxToken;
        callSignature: CallSignatureSyntax;
    }

    export function createConstructSignature(data: number, newKeyword: ISyntaxToken, callSignature: CallSignatureSyntax): ConstructSignatureSyntax {
        var result = <ConstructSignatureSyntax>{ data: data, kind: SyntaxKind.ConstructSignature, newKeyword: newKeyword, callSignature: callSignature };
        newKeyword.parent = result;
        callSignature.parent = result;
        return result;
    }

    export interface MethodSignatureSyntax extends ISyntaxNode, ITypeMemberSyntax {
        propertyName: ISyntaxToken;
        questionToken: ISyntaxToken;
        callSignature: CallSignatureSyntax;
    }

    export function createMethodSignature(data: number, propertyName: ISyntaxToken, questionToken: ISyntaxToken, callSignature: CallSignatureSyntax): MethodSignatureSyntax {
        var result = <MethodSignatureSyntax>{ data: data, kind: SyntaxKind.MethodSignature, propertyName: propertyName, questionToken: questionToken, callSignature: callSignature };
        propertyName.parent = result;
        questionToken && (questionToken.parent = result);
        callSignature.parent = result;
        return result;
    }

    export interface IndexSignatureSyntax extends ISyntaxNode, ITypeMemberSyntax {
        openBracketToken: ISyntaxToken;
        parameter: ParameterSyntax;
        closeBracketToken: ISyntaxToken;
        typeAnnotation: TypeAnnotationSyntax;
    }

    export function createIndexSignature(data: number, openBracketToken: ISyntaxToken, parameter: ParameterSyntax, closeBracketToken: ISyntaxToken, typeAnnotation: TypeAnnotationSyntax): IndexSignatureSyntax {
        var result = <IndexSignatureSyntax>{ data: data, kind: SyntaxKind.IndexSignature, openBracketToken: openBracketToken, parameter: parameter, closeBracketToken: closeBracketToken, typeAnnotation: typeAnnotation };
        openBracketToken.parent = result;
        parameter.parent = result;
        closeBracketToken.parent = result;
        typeAnnotation && (typeAnnotation.parent = result);
        return result;
    }

    export interface PropertySignatureSyntax extends ISyntaxNode, ITypeMemberSyntax {
        propertyName: ISyntaxToken;
        questionToken: ISyntaxToken;
        typeAnnotation: TypeAnnotationSyntax;
    }

    export function createPropertySignature(data: number, propertyName: ISyntaxToken, questionToken: ISyntaxToken, typeAnnotation: TypeAnnotationSyntax): PropertySignatureSyntax {
        var result = <PropertySignatureSyntax>{ data: data, kind: SyntaxKind.PropertySignature, propertyName: propertyName, questionToken: questionToken, typeAnnotation: typeAnnotation };
        propertyName.parent = result;
        questionToken && (questionToken.parent = result);
        typeAnnotation && (typeAnnotation.parent = result);
        return result;
    }

    export interface CallSignatureSyntax extends ISyntaxNode, ITypeMemberSyntax {
        typeParameterList: TypeParameterListSyntax;
        parameterList: ParameterListSyntax;
        typeAnnotation: TypeAnnotationSyntax;
    }

    export function createCallSignature(data: number, typeParameterList: TypeParameterListSyntax, parameterList: ParameterListSyntax, typeAnnotation: TypeAnnotationSyntax): CallSignatureSyntax {
        var result = <CallSignatureSyntax>{ data: data, kind: SyntaxKind.CallSignature, typeParameterList: typeParameterList, parameterList: parameterList, typeAnnotation: typeAnnotation };
        typeParameterList && (typeParameterList.parent = result);
        parameterList.parent = result;
        typeAnnotation && (typeAnnotation.parent = result);
        return result;
    }

    export interface ParameterListSyntax extends ISyntaxNode {
        openParenToken: ISyntaxToken;
        parameters: ParameterSyntax[];
        closeParenToken: ISyntaxToken;
    }

    export function createParameterList(data: number, openParenToken: ISyntaxToken, parameters: ParameterSyntax[], closeParenToken: ISyntaxToken): ParameterListSyntax {
        var result = <ParameterListSyntax>{ data: data, kind: SyntaxKind.ParameterList, openParenToken: openParenToken, parameters: parameters, closeParenToken: closeParenToken };
        openParenToken.parent = result;
        !isShared(parameters) && (parameters.parent = result);
        closeParenToken.parent = result;
        return result;
    }

    export interface TypeParameterListSyntax extends ISyntaxNode {
        lessThanToken: ISyntaxToken;
        typeParameters: TypeParameterSyntax[];
        greaterThanToken: ISyntaxToken;
    }

    export function createTypeParameterList(data: number, lessThanToken: ISyntaxToken, typeParameters: TypeParameterSyntax[], greaterThanToken: ISyntaxToken): TypeParameterListSyntax {
        var result = <TypeParameterListSyntax>{ data: data, kind: SyntaxKind.TypeParameterList, lessThanToken: lessThanToken, typeParameters: typeParameters, greaterThanToken: greaterThanToken };
        lessThanToken.parent = result;
        !isShared(typeParameters) && (typeParameters.parent = result);
        greaterThanToken.parent = result;
        return result;
    }

    export interface TypeParameterSyntax extends ISyntaxNode {
        identifier: ISyntaxToken;
        constraint: ConstraintSyntax;
    }

    export function createTypeParameter(data: number, identifier: ISyntaxToken, constraint: ConstraintSyntax): TypeParameterSyntax {
        var result = <TypeParameterSyntax>{ data: data, kind: SyntaxKind.TypeParameter, identifier: identifier, constraint: constraint };
        identifier.parent = result;
        constraint && (constraint.parent = result);
        return result;
    }

    export interface ConstraintSyntax extends ISyntaxNode {
        extendsKeyword: ISyntaxToken;
        type: ITypeSyntax;
    }

    export function createConstraint(data: number, extendsKeyword: ISyntaxToken, type: ITypeSyntax): ConstraintSyntax {
        var result = <ConstraintSyntax>{ data: data, kind: SyntaxKind.Constraint, extendsKeyword: extendsKeyword, type: type };
        extendsKeyword.parent = result;
        type.parent = result;
        return result;
    }

    export interface ElseClauseSyntax extends ISyntaxNode {
        elseKeyword: ISyntaxToken;
        statement: IStatementSyntax;
    }

    export function createElseClause(data: number, elseKeyword: ISyntaxToken, statement: IStatementSyntax): ElseClauseSyntax {
        var result = <ElseClauseSyntax>{ data: data, kind: SyntaxKind.ElseClause, elseKeyword: elseKeyword, statement: statement };
        elseKeyword.parent = result;
        statement.parent = result;
        return result;
    }

    export interface IfStatementSyntax extends ISyntaxNode, IStatementSyntax {
        ifKeyword: ISyntaxToken;
        openParenToken: ISyntaxToken;
        condition: IExpressionSyntax;
        closeParenToken: ISyntaxToken;
        statement: IStatementSyntax;
        elseClause: ElseClauseSyntax;
    }

    export function createIfStatement(data: number, ifKeyword: ISyntaxToken, openParenToken: ISyntaxToken, condition: IExpressionSyntax, closeParenToken: ISyntaxToken, statement: IStatementSyntax, elseClause: ElseClauseSyntax): IfStatementSyntax {
        var result = <IfStatementSyntax>{ data: data, kind: SyntaxKind.IfStatement, ifKeyword: ifKeyword, openParenToken: openParenToken, condition: condition, closeParenToken: closeParenToken, statement: statement, elseClause: elseClause };
        ifKeyword.parent = result;
        openParenToken.parent = result;
        condition.parent = result;
        closeParenToken.parent = result;
        statement.parent = result;
        elseClause && (elseClause.parent = result);
        return result;
    }

    export interface ExpressionStatementSyntax extends ISyntaxNode, IStatementSyntax {
        expression: IExpressionSyntax;
        semicolonToken: ISyntaxToken;
    }

    export function createExpressionStatement(data: number, expression: IExpressionSyntax, semicolonToken: ISyntaxToken): ExpressionStatementSyntax {
        var result = <ExpressionStatementSyntax>{ data: data, kind: SyntaxKind.ExpressionStatement, expression: expression, semicolonToken: semicolonToken };
        expression.parent = result;
        semicolonToken && (semicolonToken.parent = result);
        return result;
    }

    export interface ConstructorDeclarationSyntax extends ISyntaxNode, IClassElementSyntax {
        modifiers: ISyntaxToken[];
        constructorKeyword: ISyntaxToken;
        callSignature: CallSignatureSyntax;
        block: BlockSyntax;
        semicolonToken: ISyntaxToken;
    }

    export function createConstructorDeclaration(data: number, modifiers: ISyntaxToken[], constructorKeyword: ISyntaxToken, callSignature: CallSignatureSyntax, block: BlockSyntax, semicolonToken: ISyntaxToken): ConstructorDeclarationSyntax {
        var result = <ConstructorDeclarationSyntax>{ data: data, kind: SyntaxKind.ConstructorDeclaration, modifiers: modifiers, constructorKeyword: constructorKeyword, callSignature: callSignature, block: block, semicolonToken: semicolonToken };
        !isShared(modifiers) && (modifiers.parent = result);
        constructorKeyword.parent = result;
        callSignature.parent = result;
        block && (block.parent = result);
        semicolonToken && (semicolonToken.parent = result);
        return result;
    }

    export interface MemberFunctionDeclarationSyntax extends ISyntaxNode, IMemberDeclarationSyntax {
        modifiers: ISyntaxToken[];
        propertyName: ISyntaxToken;
        callSignature: CallSignatureSyntax;
        block: BlockSyntax;
        semicolonToken: ISyntaxToken;
    }

    export function createMemberFunctionDeclaration(data: number, modifiers: ISyntaxToken[], propertyName: ISyntaxToken, callSignature: CallSignatureSyntax, block: BlockSyntax, semicolonToken: ISyntaxToken): MemberFunctionDeclarationSyntax {
        var result = <MemberFunctionDeclarationSyntax>{ data: data, kind: SyntaxKind.MemberFunctionDeclaration, modifiers: modifiers, propertyName: propertyName, callSignature: callSignature, block: block, semicolonToken: semicolonToken };
        !isShared(modifiers) && (modifiers.parent = result);
        propertyName.parent = result;
        callSignature.parent = result;
        block && (block.parent = result);
        semicolonToken && (semicolonToken.parent = result);
        return result;
    }

    export interface GetAccessorSyntax extends ISyntaxNode, IMemberDeclarationSyntax, IPropertyAssignmentSyntax {
        modifiers: ISyntaxToken[];
        getKeyword: ISyntaxToken;
        propertyName: ISyntaxToken;
        parameterList: ParameterListSyntax;
        typeAnnotation: TypeAnnotationSyntax;
        block: BlockSyntax;
    }

    export function createGetAccessor(data: number, modifiers: ISyntaxToken[], getKeyword: ISyntaxToken, propertyName: ISyntaxToken, parameterList: ParameterListSyntax, typeAnnotation: TypeAnnotationSyntax, block: BlockSyntax): GetAccessorSyntax {
        var result = <GetAccessorSyntax>{ data: data, kind: SyntaxKind.GetAccessor, modifiers: modifiers, getKeyword: getKeyword, propertyName: propertyName, parameterList: parameterList, typeAnnotation: typeAnnotation, block: block };
        !isShared(modifiers) && (modifiers.parent = result);
        getKeyword.parent = result;
        propertyName.parent = result;
        parameterList.parent = result;
        typeAnnotation && (typeAnnotation.parent = result);
        block.parent = result;
        return result;
    }

    export interface SetAccessorSyntax extends ISyntaxNode, IMemberDeclarationSyntax, IPropertyAssignmentSyntax {
        modifiers: ISyntaxToken[];
        setKeyword: ISyntaxToken;
        propertyName: ISyntaxToken;
        parameterList: ParameterListSyntax;
        block: BlockSyntax;
    }

    export function createSetAccessor(data: number, modifiers: ISyntaxToken[], setKeyword: ISyntaxToken, propertyName: ISyntaxToken, parameterList: ParameterListSyntax, block: BlockSyntax): SetAccessorSyntax {
        var result = <SetAccessorSyntax>{ data: data, kind: SyntaxKind.SetAccessor, modifiers: modifiers, setKeyword: setKeyword, propertyName: propertyName, parameterList: parameterList, block: block };
        !isShared(modifiers) && (modifiers.parent = result);
        setKeyword.parent = result;
        propertyName.parent = result;
        parameterList.parent = result;
        block.parent = result;
        return result;
    }

    export interface MemberVariableDeclarationSyntax extends ISyntaxNode, IMemberDeclarationSyntax {
        modifiers: ISyntaxToken[];
        variableDeclarator: VariableDeclaratorSyntax;
        semicolonToken: ISyntaxToken;
    }

    export function createMemberVariableDeclaration(data: number, modifiers: ISyntaxToken[], variableDeclarator: VariableDeclaratorSyntax, semicolonToken: ISyntaxToken): MemberVariableDeclarationSyntax {
        var result = <MemberVariableDeclarationSyntax>{ data: data, kind: SyntaxKind.MemberVariableDeclaration, modifiers: modifiers, variableDeclarator: variableDeclarator, semicolonToken: semicolonToken };
        !isShared(modifiers) && (modifiers.parent = result);
        variableDeclarator.parent = result;
        semicolonToken && (semicolonToken.parent = result);
        return result;
    }

    export interface IndexMemberDeclarationSyntax extends ISyntaxNode, IClassElementSyntax {
        modifiers: ISyntaxToken[];
        indexSignature: IndexSignatureSyntax;
        semicolonToken: ISyntaxToken;
    }

    export function createIndexMemberDeclaration(data: number, modifiers: ISyntaxToken[], indexSignature: IndexSignatureSyntax, semicolonToken: ISyntaxToken): IndexMemberDeclarationSyntax {
        var result = <IndexMemberDeclarationSyntax>{ data: data, kind: SyntaxKind.IndexMemberDeclaration, modifiers: modifiers, indexSignature: indexSignature, semicolonToken: semicolonToken };
        !isShared(modifiers) && (modifiers.parent = result);
        indexSignature.parent = result;
        semicolonToken && (semicolonToken.parent = result);
        return result;
    }

    export interface ThrowStatementSyntax extends ISyntaxNode, IStatementSyntax {
        throwKeyword: ISyntaxToken;
        expression: IExpressionSyntax;
        semicolonToken: ISyntaxToken;
    }

    export function createThrowStatement(data: number, throwKeyword: ISyntaxToken, expression: IExpressionSyntax, semicolonToken: ISyntaxToken): ThrowStatementSyntax {
        var result = <ThrowStatementSyntax>{ data: data, kind: SyntaxKind.ThrowStatement, throwKeyword: throwKeyword, expression: expression, semicolonToken: semicolonToken };
        throwKeyword.parent = result;
        expression.parent = result;
        semicolonToken && (semicolonToken.parent = result);
        return result;
    }

    export interface ReturnStatementSyntax extends ISyntaxNode, IStatementSyntax {
        returnKeyword: ISyntaxToken;
        expression: IExpressionSyntax;
        semicolonToken: ISyntaxToken;
    }

    export function createReturnStatement(data: number, returnKeyword: ISyntaxToken, expression: IExpressionSyntax, semicolonToken: ISyntaxToken): ReturnStatementSyntax {
        var result = <ReturnStatementSyntax>{ data: data, kind: SyntaxKind.ReturnStatement, returnKeyword: returnKeyword, expression: expression, semicolonToken: semicolonToken };
        returnKeyword.parent = result;
        expression && (expression.parent = result);
        semicolonToken && (semicolonToken.parent = result);
        return result;
    }

    export interface ObjectCreationExpressionSyntax extends ISyntaxNode, IMemberExpressionSyntax {
        newKeyword: ISyntaxToken;
        expression: IMemberExpressionSyntax;
        argumentList: ArgumentListSyntax;
    }

    export function createObjectCreationExpression(data: number, newKeyword: ISyntaxToken, expression: IMemberExpressionSyntax, argumentList: ArgumentListSyntax): ObjectCreationExpressionSyntax {
        var result = <ObjectCreationExpressionSyntax>{ data: data, kind: SyntaxKind.ObjectCreationExpression, newKeyword: newKeyword, expression: expression, argumentList: argumentList };
        newKeyword.parent = result;
        expression.parent = result;
        argumentList && (argumentList.parent = result);
        return result;
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

    export function createSwitchStatement(data: number, switchKeyword: ISyntaxToken, openParenToken: ISyntaxToken, expression: IExpressionSyntax, closeParenToken: ISyntaxToken, openBraceToken: ISyntaxToken, switchClauses: ISwitchClauseSyntax[], closeBraceToken: ISyntaxToken): SwitchStatementSyntax {
        var result = <SwitchStatementSyntax>{ data: data, kind: SyntaxKind.SwitchStatement, switchKeyword: switchKeyword, openParenToken: openParenToken, expression: expression, closeParenToken: closeParenToken, openBraceToken: openBraceToken, switchClauses: switchClauses, closeBraceToken: closeBraceToken };
        switchKeyword.parent = result;
        openParenToken.parent = result;
        expression.parent = result;
        closeParenToken.parent = result;
        openBraceToken.parent = result;
        !isShared(switchClauses) && (switchClauses.parent = result);
        closeBraceToken.parent = result;
        return result;
    }

    export interface CaseSwitchClauseSyntax extends ISyntaxNode, ISwitchClauseSyntax {
        caseKeyword: ISyntaxToken;
        expression: IExpressionSyntax;
        colonToken: ISyntaxToken;
        statements: IStatementSyntax[];
    }

    export function createCaseSwitchClause(data: number, caseKeyword: ISyntaxToken, expression: IExpressionSyntax, colonToken: ISyntaxToken, statements: IStatementSyntax[]): CaseSwitchClauseSyntax {
        var result = <CaseSwitchClauseSyntax>{ data: data, kind: SyntaxKind.CaseSwitchClause, caseKeyword: caseKeyword, expression: expression, colonToken: colonToken, statements: statements };
        caseKeyword.parent = result;
        expression.parent = result;
        colonToken.parent = result;
        !isShared(statements) && (statements.parent = result);
        return result;
    }

    export interface DefaultSwitchClauseSyntax extends ISyntaxNode, ISwitchClauseSyntax {
        defaultKeyword: ISyntaxToken;
        colonToken: ISyntaxToken;
        statements: IStatementSyntax[];
    }

    export function createDefaultSwitchClause(data: number, defaultKeyword: ISyntaxToken, colonToken: ISyntaxToken, statements: IStatementSyntax[]): DefaultSwitchClauseSyntax {
        var result = <DefaultSwitchClauseSyntax>{ data: data, kind: SyntaxKind.DefaultSwitchClause, defaultKeyword: defaultKeyword, colonToken: colonToken, statements: statements };
        defaultKeyword.parent = result;
        colonToken.parent = result;
        !isShared(statements) && (statements.parent = result);
        return result;
    }

    export interface BreakStatementSyntax extends ISyntaxNode, IStatementSyntax {
        breakKeyword: ISyntaxToken;
        identifier: ISyntaxToken;
        semicolonToken: ISyntaxToken;
    }

    export function createBreakStatement(data: number, breakKeyword: ISyntaxToken, identifier: ISyntaxToken, semicolonToken: ISyntaxToken): BreakStatementSyntax {
        var result = <BreakStatementSyntax>{ data: data, kind: SyntaxKind.BreakStatement, breakKeyword: breakKeyword, identifier: identifier, semicolonToken: semicolonToken };
        breakKeyword.parent = result;
        identifier && (identifier.parent = result);
        semicolonToken && (semicolonToken.parent = result);
        return result;
    }

    export interface ContinueStatementSyntax extends ISyntaxNode, IStatementSyntax {
        continueKeyword: ISyntaxToken;
        identifier: ISyntaxToken;
        semicolonToken: ISyntaxToken;
    }

    export function createContinueStatement(data: number, continueKeyword: ISyntaxToken, identifier: ISyntaxToken, semicolonToken: ISyntaxToken): ContinueStatementSyntax {
        var result = <ContinueStatementSyntax>{ data: data, kind: SyntaxKind.ContinueStatement, continueKeyword: continueKeyword, identifier: identifier, semicolonToken: semicolonToken };
        continueKeyword.parent = result;
        identifier && (identifier.parent = result);
        semicolonToken && (semicolonToken.parent = result);
        return result;
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

    export function createForStatement(data: number, forKeyword: ISyntaxToken, openParenToken: ISyntaxToken, variableDeclaration: VariableDeclarationSyntax, initializer: IExpressionSyntax, firstSemicolonToken: ISyntaxToken, condition: IExpressionSyntax, secondSemicolonToken: ISyntaxToken, incrementor: IExpressionSyntax, closeParenToken: ISyntaxToken, statement: IStatementSyntax): ForStatementSyntax {
        var result = <ForStatementSyntax>{ data: data, kind: SyntaxKind.ForStatement, forKeyword: forKeyword, openParenToken: openParenToken, variableDeclaration: variableDeclaration, initializer: initializer, firstSemicolonToken: firstSemicolonToken, condition: condition, secondSemicolonToken: secondSemicolonToken, incrementor: incrementor, closeParenToken: closeParenToken, statement: statement };
        forKeyword.parent = result;
        openParenToken.parent = result;
        variableDeclaration && (variableDeclaration.parent = result);
        initializer && (initializer.parent = result);
        firstSemicolonToken.parent = result;
        condition && (condition.parent = result);
        secondSemicolonToken.parent = result;
        incrementor && (incrementor.parent = result);
        closeParenToken.parent = result;
        statement.parent = result;
        return result;
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

    export function createForInStatement(data: number, forKeyword: ISyntaxToken, openParenToken: ISyntaxToken, variableDeclaration: VariableDeclarationSyntax, left: IExpressionSyntax, inKeyword: ISyntaxToken, expression: IExpressionSyntax, closeParenToken: ISyntaxToken, statement: IStatementSyntax): ForInStatementSyntax {
        var result = <ForInStatementSyntax>{ data: data, kind: SyntaxKind.ForInStatement, forKeyword: forKeyword, openParenToken: openParenToken, variableDeclaration: variableDeclaration, left: left, inKeyword: inKeyword, expression: expression, closeParenToken: closeParenToken, statement: statement };
        forKeyword.parent = result;
        openParenToken.parent = result;
        variableDeclaration && (variableDeclaration.parent = result);
        left && (left.parent = result);
        inKeyword.parent = result;
        expression.parent = result;
        closeParenToken.parent = result;
        statement.parent = result;
        return result;
    }

    export interface WhileStatementSyntax extends ISyntaxNode, IStatementSyntax {
        whileKeyword: ISyntaxToken;
        openParenToken: ISyntaxToken;
        condition: IExpressionSyntax;
        closeParenToken: ISyntaxToken;
        statement: IStatementSyntax;
    }

    export function createWhileStatement(data: number, whileKeyword: ISyntaxToken, openParenToken: ISyntaxToken, condition: IExpressionSyntax, closeParenToken: ISyntaxToken, statement: IStatementSyntax): WhileStatementSyntax {
        var result = <WhileStatementSyntax>{ data: data, kind: SyntaxKind.WhileStatement, whileKeyword: whileKeyword, openParenToken: openParenToken, condition: condition, closeParenToken: closeParenToken, statement: statement };
        whileKeyword.parent = result;
        openParenToken.parent = result;
        condition.parent = result;
        closeParenToken.parent = result;
        statement.parent = result;
        return result;
    }

    export interface WithStatementSyntax extends ISyntaxNode, IStatementSyntax {
        withKeyword: ISyntaxToken;
        openParenToken: ISyntaxToken;
        condition: IExpressionSyntax;
        closeParenToken: ISyntaxToken;
        statement: IStatementSyntax;
    }

    export function createWithStatement(data: number, withKeyword: ISyntaxToken, openParenToken: ISyntaxToken, condition: IExpressionSyntax, closeParenToken: ISyntaxToken, statement: IStatementSyntax): WithStatementSyntax {
        var result = <WithStatementSyntax>{ data: data, kind: SyntaxKind.WithStatement, withKeyword: withKeyword, openParenToken: openParenToken, condition: condition, closeParenToken: closeParenToken, statement: statement };
        withKeyword.parent = result;
        openParenToken.parent = result;
        condition.parent = result;
        closeParenToken.parent = result;
        statement.parent = result;
        return result;
    }

    export interface EnumDeclarationSyntax extends ISyntaxNode, IModuleElementSyntax {
        modifiers: ISyntaxToken[];
        enumKeyword: ISyntaxToken;
        identifier: ISyntaxToken;
        openBraceToken: ISyntaxToken;
        enumElements: EnumElementSyntax[];
        closeBraceToken: ISyntaxToken;
    }

    export function createEnumDeclaration(data: number, modifiers: ISyntaxToken[], enumKeyword: ISyntaxToken, identifier: ISyntaxToken, openBraceToken: ISyntaxToken, enumElements: EnumElementSyntax[], closeBraceToken: ISyntaxToken): EnumDeclarationSyntax {
        var result = <EnumDeclarationSyntax>{ data: data, kind: SyntaxKind.EnumDeclaration, modifiers: modifiers, enumKeyword: enumKeyword, identifier: identifier, openBraceToken: openBraceToken, enumElements: enumElements, closeBraceToken: closeBraceToken };
        !isShared(modifiers) && (modifiers.parent = result);
        enumKeyword.parent = result;
        identifier.parent = result;
        openBraceToken.parent = result;
        !isShared(enumElements) && (enumElements.parent = result);
        closeBraceToken.parent = result;
        return result;
    }

    export interface EnumElementSyntax extends ISyntaxNode {
        propertyName: ISyntaxToken;
        equalsValueClause: EqualsValueClauseSyntax;
    }

    export function createEnumElement(data: number, propertyName: ISyntaxToken, equalsValueClause: EqualsValueClauseSyntax): EnumElementSyntax {
        var result = <EnumElementSyntax>{ data: data, kind: SyntaxKind.EnumElement, propertyName: propertyName, equalsValueClause: equalsValueClause };
        propertyName.parent = result;
        equalsValueClause && (equalsValueClause.parent = result);
        return result;
    }

    export interface CastExpressionSyntax extends ISyntaxNode, IUnaryExpressionSyntax {
        lessThanToken: ISyntaxToken;
        type: ITypeSyntax;
        greaterThanToken: ISyntaxToken;
        expression: IUnaryExpressionSyntax;
    }

    export function createCastExpression(data: number, lessThanToken: ISyntaxToken, type: ITypeSyntax, greaterThanToken: ISyntaxToken, expression: IUnaryExpressionSyntax): CastExpressionSyntax {
        var result = <CastExpressionSyntax>{ data: data, kind: SyntaxKind.CastExpression, lessThanToken: lessThanToken, type: type, greaterThanToken: greaterThanToken, expression: expression };
        lessThanToken.parent = result;
        type.parent = result;
        greaterThanToken.parent = result;
        expression.parent = result;
        return result;
    }

    export interface ObjectLiteralExpressionSyntax extends ISyntaxNode, IPrimaryExpressionSyntax {
        openBraceToken: ISyntaxToken;
        propertyAssignments: IPropertyAssignmentSyntax[];
        closeBraceToken: ISyntaxToken;
    }

    export function createObjectLiteralExpression(data: number, openBraceToken: ISyntaxToken, propertyAssignments: IPropertyAssignmentSyntax[], closeBraceToken: ISyntaxToken): ObjectLiteralExpressionSyntax {
        var result = <ObjectLiteralExpressionSyntax>{ data: data, kind: SyntaxKind.ObjectLiteralExpression, openBraceToken: openBraceToken, propertyAssignments: propertyAssignments, closeBraceToken: closeBraceToken };
        openBraceToken.parent = result;
        !isShared(propertyAssignments) && (propertyAssignments.parent = result);
        closeBraceToken.parent = result;
        return result;
    }

    export interface SimplePropertyAssignmentSyntax extends ISyntaxNode, IPropertyAssignmentSyntax {
        propertyName: ISyntaxToken;
        colonToken: ISyntaxToken;
        expression: IExpressionSyntax;
    }

    export function createSimplePropertyAssignment(data: number, propertyName: ISyntaxToken, colonToken: ISyntaxToken, expression: IExpressionSyntax): SimplePropertyAssignmentSyntax {
        var result = <SimplePropertyAssignmentSyntax>{ data: data, kind: SyntaxKind.SimplePropertyAssignment, propertyName: propertyName, colonToken: colonToken, expression: expression };
        propertyName.parent = result;
        colonToken.parent = result;
        expression.parent = result;
        return result;
    }

    export interface FunctionPropertyAssignmentSyntax extends ISyntaxNode, IPropertyAssignmentSyntax {
        propertyName: ISyntaxToken;
        callSignature: CallSignatureSyntax;
        block: BlockSyntax;
    }

    export function createFunctionPropertyAssignment(data: number, propertyName: ISyntaxToken, callSignature: CallSignatureSyntax, block: BlockSyntax): FunctionPropertyAssignmentSyntax {
        var result = <FunctionPropertyAssignmentSyntax>{ data: data, kind: SyntaxKind.FunctionPropertyAssignment, propertyName: propertyName, callSignature: callSignature, block: block };
        propertyName.parent = result;
        callSignature.parent = result;
        block.parent = result;
        return result;
    }

    export interface FunctionExpressionSyntax extends ISyntaxNode, IPrimaryExpressionSyntax {
        functionKeyword: ISyntaxToken;
        identifier: ISyntaxToken;
        callSignature: CallSignatureSyntax;
        block: BlockSyntax;
    }

    export function createFunctionExpression(data: number, functionKeyword: ISyntaxToken, identifier: ISyntaxToken, callSignature: CallSignatureSyntax, block: BlockSyntax): FunctionExpressionSyntax {
        var result = <FunctionExpressionSyntax>{ data: data, kind: SyntaxKind.FunctionExpression, functionKeyword: functionKeyword, identifier: identifier, callSignature: callSignature, block: block };
        functionKeyword.parent = result;
        identifier && (identifier.parent = result);
        callSignature.parent = result;
        block.parent = result;
        return result;
    }

    export interface EmptyStatementSyntax extends ISyntaxNode, IStatementSyntax {
        semicolonToken: ISyntaxToken;
    }

    export function createEmptyStatement(data: number, semicolonToken: ISyntaxToken): EmptyStatementSyntax {
        var result = <EmptyStatementSyntax>{ data: data, kind: SyntaxKind.EmptyStatement, semicolonToken: semicolonToken };
        semicolonToken.parent = result;
        return result;
    }

    export interface TryStatementSyntax extends ISyntaxNode, IStatementSyntax {
        tryKeyword: ISyntaxToken;
        block: BlockSyntax;
        catchClause: CatchClauseSyntax;
        finallyClause: FinallyClauseSyntax;
    }

    export function createTryStatement(data: number, tryKeyword: ISyntaxToken, block: BlockSyntax, catchClause: CatchClauseSyntax, finallyClause: FinallyClauseSyntax): TryStatementSyntax {
        var result = <TryStatementSyntax>{ data: data, kind: SyntaxKind.TryStatement, tryKeyword: tryKeyword, block: block, catchClause: catchClause, finallyClause: finallyClause };
        tryKeyword.parent = result;
        block.parent = result;
        catchClause && (catchClause.parent = result);
        finallyClause && (finallyClause.parent = result);
        return result;
    }

    export interface CatchClauseSyntax extends ISyntaxNode {
        catchKeyword: ISyntaxToken;
        openParenToken: ISyntaxToken;
        identifier: ISyntaxToken;
        typeAnnotation: TypeAnnotationSyntax;
        closeParenToken: ISyntaxToken;
        block: BlockSyntax;
    }

    export function createCatchClause(data: number, catchKeyword: ISyntaxToken, openParenToken: ISyntaxToken, identifier: ISyntaxToken, typeAnnotation: TypeAnnotationSyntax, closeParenToken: ISyntaxToken, block: BlockSyntax): CatchClauseSyntax {
        var result = <CatchClauseSyntax>{ data: data, kind: SyntaxKind.CatchClause, catchKeyword: catchKeyword, openParenToken: openParenToken, identifier: identifier, typeAnnotation: typeAnnotation, closeParenToken: closeParenToken, block: block };
        catchKeyword.parent = result;
        openParenToken.parent = result;
        identifier.parent = result;
        typeAnnotation && (typeAnnotation.parent = result);
        closeParenToken.parent = result;
        block.parent = result;
        return result;
    }

    export interface FinallyClauseSyntax extends ISyntaxNode {
        finallyKeyword: ISyntaxToken;
        block: BlockSyntax;
    }

    export function createFinallyClause(data: number, finallyKeyword: ISyntaxToken, block: BlockSyntax): FinallyClauseSyntax {
        var result = <FinallyClauseSyntax>{ data: data, kind: SyntaxKind.FinallyClause, finallyKeyword: finallyKeyword, block: block };
        finallyKeyword.parent = result;
        block.parent = result;
        return result;
    }

    export interface LabeledStatementSyntax extends ISyntaxNode, IStatementSyntax {
        identifier: ISyntaxToken;
        colonToken: ISyntaxToken;
        statement: IStatementSyntax;
    }

    export function createLabeledStatement(data: number, identifier: ISyntaxToken, colonToken: ISyntaxToken, statement: IStatementSyntax): LabeledStatementSyntax {
        var result = <LabeledStatementSyntax>{ data: data, kind: SyntaxKind.LabeledStatement, identifier: identifier, colonToken: colonToken, statement: statement };
        identifier.parent = result;
        colonToken.parent = result;
        statement.parent = result;
        return result;
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

    export function createDoStatement(data: number, doKeyword: ISyntaxToken, statement: IStatementSyntax, whileKeyword: ISyntaxToken, openParenToken: ISyntaxToken, condition: IExpressionSyntax, closeParenToken: ISyntaxToken, semicolonToken: ISyntaxToken): DoStatementSyntax {
        var result = <DoStatementSyntax>{ data: data, kind: SyntaxKind.DoStatement, doKeyword: doKeyword, statement: statement, whileKeyword: whileKeyword, openParenToken: openParenToken, condition: condition, closeParenToken: closeParenToken, semicolonToken: semicolonToken };
        doKeyword.parent = result;
        statement.parent = result;
        whileKeyword.parent = result;
        openParenToken.parent = result;
        condition.parent = result;
        closeParenToken.parent = result;
        semicolonToken && (semicolonToken.parent = result);
        return result;
    }

    export interface TypeOfExpressionSyntax extends ISyntaxNode, IUnaryExpressionSyntax {
        typeOfKeyword: ISyntaxToken;
        expression: IUnaryExpressionSyntax;
    }

    export function createTypeOfExpression(data: number, typeOfKeyword: ISyntaxToken, expression: IUnaryExpressionSyntax): TypeOfExpressionSyntax {
        var result = <TypeOfExpressionSyntax>{ data: data, kind: SyntaxKind.TypeOfExpression, typeOfKeyword: typeOfKeyword, expression: expression };
        typeOfKeyword.parent = result;
        expression.parent = result;
        return result;
    }

    export interface DeleteExpressionSyntax extends ISyntaxNode, IUnaryExpressionSyntax {
        deleteKeyword: ISyntaxToken;
        expression: IUnaryExpressionSyntax;
    }

    export function createDeleteExpression(data: number, deleteKeyword: ISyntaxToken, expression: IUnaryExpressionSyntax): DeleteExpressionSyntax {
        var result = <DeleteExpressionSyntax>{ data: data, kind: SyntaxKind.DeleteExpression, deleteKeyword: deleteKeyword, expression: expression };
        deleteKeyword.parent = result;
        expression.parent = result;
        return result;
    }

    export interface VoidExpressionSyntax extends ISyntaxNode, IUnaryExpressionSyntax {
        voidKeyword: ISyntaxToken;
        expression: IUnaryExpressionSyntax;
    }

    export function createVoidExpression(data: number, voidKeyword: ISyntaxToken, expression: IUnaryExpressionSyntax): VoidExpressionSyntax {
        var result = <VoidExpressionSyntax>{ data: data, kind: SyntaxKind.VoidExpression, voidKeyword: voidKeyword, expression: expression };
        voidKeyword.parent = result;
        expression.parent = result;
        return result;
    }

    export interface DebuggerStatementSyntax extends ISyntaxNode, IStatementSyntax {
        debuggerKeyword: ISyntaxToken;
        semicolonToken: ISyntaxToken;
    }

    export function createDebuggerStatement(data: number, debuggerKeyword: ISyntaxToken, semicolonToken: ISyntaxToken): DebuggerStatementSyntax {
        var result = <DebuggerStatementSyntax>{ data: data, kind: SyntaxKind.DebuggerStatement, debuggerKeyword: debuggerKeyword, semicolonToken: semicolonToken };
        debuggerKeyword.parent = result;
        semicolonToken && (semicolonToken.parent = result);
        return result;
    }
}