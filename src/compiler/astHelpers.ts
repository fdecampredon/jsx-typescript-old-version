//
// Copyright (c) Microsoft Corporation.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

///<reference path='references.ts' />

module TypeScript {
    export function scriptIsElided(sourceUnit: SourceUnitSyntax): boolean {
        return isDTSFile(sourceUnit.fileName()) || moduleMembersAreElided(sourceUnit.moduleElements);
    }

    export function moduleIsElided(declaration: ModuleDeclarationSyntax): boolean {
        return hasModifier(declaration.modifiers, PullElementFlags.Ambient) || moduleMembersAreElided(declaration.moduleElements);
    }

    function moduleMembersAreElided(members: ISyntaxList): boolean {
        for (var i = 0, n = members.childCount(); i < n; i++) {
            var member = members.childAt(i);

            // We should emit *this* module if it contains any non-interface types. 
            // Caveat: if we have contain a module, then we should be emitted *if we want to
            // emit that inner module as well.
            if (member.kind() === SyntaxKind.ModuleDeclaration) {
                if (!moduleIsElided(<ModuleDeclarationSyntax>member)) {
                    return false;
                }
            }
            else if (member.kind() !== SyntaxKind.InterfaceDeclaration) {
                return false;
            }
        }

        return true;
    }

    export function enumIsElided(declaration: EnumDeclarationSyntax): boolean {
        if (hasModifier(declaration.modifiers, PullElementFlags.Ambient)) {
            return true;
        }

        return false;
    }

    export function importDeclarationIsElided(importDeclAST: ImportDeclarationSyntax, semanticInfoChain: SemanticInfoChain, compilationSettings: ImmutableCompilationSettings = null) {
        var isExternalModuleReference = importDeclAST.moduleReference.kind() === SyntaxKind.ExternalModuleReference;
        var importDecl = semanticInfoChain.getDeclForAST(importDeclAST);
        var isExported = hasFlag(importDecl.flags, PullElementFlags.Exported);
        var isAmdCodeGen = compilationSettings && compilationSettings.moduleGenTarget() == ModuleGenTarget.Asynchronous;

        if (!isExternalModuleReference || // Any internal reference needs to check if the emit can happen
            isExported || // External module reference with export modifier always needs to be emitted
            !isAmdCodeGen) {// commonjs needs the var declaration for the import declaration
            var importSymbol = <PullTypeAliasSymbol>importDecl.getSymbol();
            if (importDeclAST.moduleReference.kind() !== SyntaxKind.ExternalModuleReference) {
                if (importSymbol.getExportAssignedValueSymbol()) {
                    return true;
                }
                var containerSymbol = importSymbol.getExportAssignedContainerSymbol();
                if (containerSymbol && containerSymbol.getInstanceSymbol()) {
                    return true;
                }
            }

            return importSymbol.isUsedAsValue();
        }

        return false;
    }

    export function isValidAstNode(ast: ISpan): boolean {
        if (!ast)
            return false;

        if (ast.start() === -1 || ast.end() === -1)
            return false;

        return true;
    }

    ///
    /// Return the ISyntaxElement containing "position"
    ///
    export function getAstAtPosition(script: ISyntaxElement, pos: number, useTrailingTriviaAsLimChar: boolean = true, forceInclusive: boolean = false): ISyntaxElement {
        var top: ISyntaxElement = null;

        var pre = function (cur: ISyntaxElement, walker: IAstWalker) {
            if (isValidAstNode(cur)) {
                var isInvalid1 = cur.kind() === SyntaxKind.ExpressionStatement && cur.width() === 0;

                if (isInvalid1) {
                    walker.options.goChildren = false;
                }
                else {
                    // Add "cur" to the stack if it contains our position
                    // For "identifier" nodes, we need a special case: A position equal to "limChar" is
                    // valid, since the position corresponds to a caret position (in between characters)
                    // For example:
                    //  bar
                    //  0123
                    // If "position === 3", the caret is at the "right" of the "r" character, which should be considered valid
                    var inclusive =
                        forceInclusive ||
                        cur.kind() === SyntaxKind.IdentifierName ||
                        cur.kind() === SyntaxKind.MemberAccessExpression ||
                        cur.kind() === SyntaxKind.QualifiedName ||
                        //cur.kind() === SyntaxKind.TypeRef ||
                        cur.kind() === SyntaxKind.VariableDeclaration ||
                        cur.kind() === SyntaxKind.VariableDeclarator ||
                        cur.kind() === SyntaxKind.InvocationExpression ||
                        pos === script.end() + script.trailingTriviaWidth(); // Special "EOF" case

                    var minChar = cur.start();
                    var limChar = cur.end() + (useTrailingTriviaAsLimChar ? cur.trailingTriviaWidth() : 0) + (inclusive ? 1 : 0);
                    if (pos >= minChar && pos < limChar) {

                        // Ignore empty lists
                        if ((cur.kind() !== SyntaxKind.List && cur.kind() !== SyntaxKind.SeparatedList) || cur.end() > cur.start()) {
                            // TODO: Since ISyntaxElement is sometimes not correct wrt to position, only add "cur" if it's better
                            //       than top of the stack.
                            if (top === null) {
                                top = cur;
                            }
                            else if (cur.start() >= top.start() &&
                                (cur.end() + (useTrailingTriviaAsLimChar ? cur.trailingTriviaWidth() : 0)) <= (top.end() + (useTrailingTriviaAsLimChar ? top.trailingTriviaWidth() : 0))) {
                                // this new node appears to be better than the one we're 
                                // storing.  Make this the new node.

                                // However, If the current top is a missing identifier, we 
                                // don't want to replace it with another missing identifier.
                                // We want to return the first missing identifier found in a
                                // depth first walk of  the tree.
                                if (top.width() !== 0 || cur.width() !== 0) {
                                    top = cur;
                                }
                            }
                        }
                    }

                    // Don't go further down the tree if pos is outside of [minChar, limChar]
                    walker.options.goChildren = (minChar <= pos && pos <= limChar);
                }
            }
        };

        getAstWalkerFactory().walk(script, pre);
        return top;
    }

    export function getExtendsHeritageClause(clauses: ISyntaxList): HeritageClauseSyntax {
        if (!clauses) {
            return null;
        }

        return <HeritageClauseSyntax>clauses.firstOrDefault((c: HeritageClauseSyntax) =>
            c.typeNames.nonSeparatorCount() > 0 && c.kind() === SyntaxKind.ExtendsHeritageClause);
    }

    export function getImplementsHeritageClause(clauses: ISyntaxList): HeritageClauseSyntax {
        if (!clauses) {
            return null;
        }

        return <HeritageClauseSyntax>clauses.firstOrDefault((c: HeritageClauseSyntax) =>
            c.typeNames.nonSeparatorCount() > 0 && c.kind() === SyntaxKind.ImplementsHeritageClause);
    }

    export function isCallExpression(ast: ISyntaxElement): boolean {
        return (ast && ast.kind() === SyntaxKind.InvocationExpression) ||
            (ast && ast.kind() === SyntaxKind.ObjectCreationExpression);
    }

    export function isCallExpressionTarget(ast: ISyntaxElement): boolean {
        if (!ast) {
            return false;
        }

        var current = ast;

        while (current && current.parent) {
            if (current.parent.kind() === SyntaxKind.MemberAccessExpression &&
                (<MemberAccessExpressionSyntax>current.parent).name === current) {
                current = current.parent;
                continue;
            }

            break;
        }

        if (current && current.parent) {
            if (current.parent.kind() === SyntaxKind.InvocationExpression || current.parent.kind() === SyntaxKind.ObjectCreationExpression) {
                return current === (<InvocationExpressionSyntax>current.parent).expression;
            }
        }

        return false;
    }

    function isNameOfSomeDeclaration(ast: ISyntaxElement) {
        if (ast === null || ast.parent === null) {
            return false;
        }
        if (ast.kind() !== SyntaxKind.IdentifierName) {
            return false;
        }

        switch (ast.parent.kind()) {
            case SyntaxKind.ClassDeclaration:
                return (<ClassDeclarationSyntax>ast.parent).identifier === ast;
            case SyntaxKind.InterfaceDeclaration:
                return (<InterfaceDeclarationSyntax>ast.parent).identifier === ast;
            case SyntaxKind.EnumDeclaration:
                return (<EnumDeclarationSyntax>ast.parent).identifier === ast;
            case SyntaxKind.ModuleDeclaration:
                return (<ModuleDeclarationSyntax>ast.parent).name === ast || (<ModuleDeclarationSyntax>ast.parent).stringLiteral === ast;
            case SyntaxKind.VariableDeclarator:
                return (<VariableDeclaratorSyntax>ast.parent).propertyName === ast;
            case SyntaxKind.FunctionDeclaration:
                return (<FunctionDeclarationSyntax>ast.parent).identifier === ast;
            case SyntaxKind.MemberFunctionDeclaration:
                return (<MemberFunctionDeclarationSyntax>ast.parent).propertyName === ast;
            case SyntaxKind.Parameter:
                return (<ParameterSyntax>ast.parent).identifier === ast;
            case SyntaxKind.TypeParameter:
                return (<TypeParameterSyntax>ast.parent).identifier === ast;
            case SyntaxKind.SimplePropertyAssignment:
                return (<SimplePropertyAssignmentSyntax>ast.parent).propertyName === ast;
            case SyntaxKind.FunctionPropertyAssignment:
                return (<FunctionPropertyAssignmentSyntax>ast.parent).propertyName === ast;
            case SyntaxKind.EnumElement:
                return (<EnumElementSyntax>ast.parent).propertyName === ast;
            case SyntaxKind.ImportDeclaration:
                return (<ImportDeclarationSyntax>ast.parent).identifier === ast;
        }

        return false;
    }

    export function isDeclarationASTOrDeclarationNameAST(ast: ISyntaxElement) {
        return isNameOfSomeDeclaration(ast) || isDeclarationAST(ast);
    }

    export function isNameOfFunction(ast: ISyntaxElement) {
        return ast
            && ast.parent
            && ast.kind() === SyntaxKind.IdentifierName
            && ast.parent.kind() === SyntaxKind.FunctionDeclaration
            && (<FunctionDeclarationSyntax>ast.parent).identifier === ast;
    }

    export function isNameOfMemberFunction(ast: ISyntaxElement) {
        return ast
            && ast.parent
            && ast.kind() === SyntaxKind.IdentifierName
            && ast.parent.kind() === SyntaxKind.MemberFunctionDeclaration
            && (<MemberFunctionDeclarationSyntax>ast.parent).propertyName === ast;
    }

    export function isNameOfMemberAccessExpression(ast: ISyntaxElement) {
        if (ast &&
            ast.parent &&
            ast.parent.kind() === SyntaxKind.MemberAccessExpression &&
            (<MemberAccessExpressionSyntax>ast.parent).name === ast) {

            return true;
        }

        return false;
    }

    export function isRightSideOfQualifiedName(ast: ISyntaxElement) {
        if (ast &&
            ast.parent &&
            ast.parent.kind() === SyntaxKind.QualifiedName &&
            (<QualifiedNameSyntax>ast.parent).right === ast) {

            return true;
        }

        return false;
    }

    export interface IParameters {
        length: number;
        lastParameterIsRest(): boolean;
        ast: ISyntaxElement;
        astAt(index: number): ISyntaxElement;
        identifierAt(index: number): ISyntaxToken;
        typeAt(index: number): ISyntaxElement;
        initializerAt(index: number): EqualsValueClauseSyntax;
        isOptionalAt(index: number): boolean;
    }

    export module Parameters {
        export function fromIdentifier(id: ISyntaxToken): IParameters {
            return {
                length: 1,
                lastParameterIsRest: () => false,
                ast: id,
                astAt: (index: number) => id,
                identifierAt: (index: number) => id,
                typeAt: (index: number): ISyntaxElement => null,
                initializerAt: (index: number): EqualsValueClauseSyntax => null,
                isOptionalAt: (index: number) => false,
            }
        }

        export function fromParameter(parameter: ParameterSyntax): IParameters {
            return {
                length: 1,
                lastParameterIsRest: () => parameter.dotDotDotToken !== null,
                ast: parameter,
                astAt: (index: number) => parameter,
                identifierAt: (index: number) => parameter.identifier,
                typeAt: (index: number) => getType(parameter),
                initializerAt: (index: number) => parameter.equalsValueClause,
                isOptionalAt: (index: number) => parameterIsOptional(parameter),
            }
        }

        function parameterIsOptional(parameter: ParameterSyntax): boolean {
            return parameter.questionToken !== null || parameter.equalsValueClause !== null;
        }

        export function fromParameterList(list: ParameterListSyntax): IParameters {
            return {
                length: list.parameters.nonSeparatorCount(),
                lastParameterIsRest: () => lastParameterIsRest(list),
                ast: list.parameters,
                astAt: (index: number) => list.parameters.nonSeparatorAt(index),
                identifierAt: (index: number) => (<ParameterSyntax>list.parameters.nonSeparatorAt(index)).identifier,
                typeAt: (index: number) => getType(list.parameters.nonSeparatorAt(index)),
                initializerAt: (index: number) => (<ParameterSyntax>list.parameters.nonSeparatorAt(index)).equalsValueClause,
                isOptionalAt: (index: number) => parameterIsOptional(<ParameterSyntax>list.parameters.nonSeparatorAt(index)),
            }
        }
    }

    export function isDeclarationAST(ast: ISyntaxElement): boolean {
        switch (ast.kind()) {
            case SyntaxKind.VariableDeclarator:
                return getVariableStatement(<VariableDeclaratorSyntax>ast) !== null;

            case SyntaxKind.ImportDeclaration:
            case SyntaxKind.ClassDeclaration:
            case SyntaxKind.InterfaceDeclaration:
            case SyntaxKind.Parameter:
            case SyntaxKind.SimpleArrowFunctionExpression:
            case SyntaxKind.ParenthesizedArrowFunctionExpression:
            case SyntaxKind.IndexSignature:
            case SyntaxKind.FunctionDeclaration:
            case SyntaxKind.ModuleDeclaration:
            case SyntaxKind.ArrayType:
            case SyntaxKind.ObjectType:
            case SyntaxKind.TypeParameter:
            case SyntaxKind.ConstructorDeclaration:
            case SyntaxKind.MemberFunctionDeclaration:
            case SyntaxKind.GetAccessor:
            case SyntaxKind.SetAccessor:
            case SyntaxKind.MemberVariableDeclaration:
            case SyntaxKind.IndexMemberDeclaration:
            case SyntaxKind.EnumDeclaration:
            case SyntaxKind.EnumElement:
            case SyntaxKind.SimplePropertyAssignment:
            case SyntaxKind.FunctionPropertyAssignment:
            case SyntaxKind.FunctionExpression:
            case SyntaxKind.CallSignature:
            case SyntaxKind.ConstructSignature:
            case SyntaxKind.MethodSignature:
            case SyntaxKind.PropertySignature:
                return true;
            default:
                return false;
        }
    }

    export function preComments(element: ISyntaxElement): Comment[]{
        if (element) {
            switch (element.kind()) {
                case SyntaxKind.VariableStatement:
                    return convertNodeLeadingComments(element);
                case SyntaxKind.ExpressionStatement:
                    return convertNodeLeadingComments(element);
                case SyntaxKind.ClassDeclaration:
                    return convertNodeLeadingComments(element);
                case SyntaxKind.ImportDeclaration:
                    return convertNodeLeadingComments(element);
                case SyntaxKind.FunctionDeclaration:
                    return convertNodeLeadingComments(element);
                case SyntaxKind.ModuleDeclaration:
                    return convertNodeLeadingComments(element);
                case SyntaxKind.EnumDeclaration:
                    return convertNodeLeadingComments(element);
                case SyntaxKind.IfStatement:
                    return convertNodeLeadingComments(element);
            }
        }

        return null;
    }

    export function postComments(element: ISyntaxElement): Comment[] {
        if (element) {
            switch (element.kind()) {
                case SyntaxKind.VariableStatement:
                    return convertNodeTrailingComments(element);
                case SyntaxKind.ExpressionStatement:
                    return convertNodeTrailingComments(element, /*allowWithNewLine:*/ true);
                case SyntaxKind.ClassDeclaration:
                    return convertNodeTrailingComments(element);
                case SyntaxKind.ImportDeclaration:
                    return convertNodeTrailingComments(element);
                case SyntaxKind.FunctionDeclaration:
                    return convertNodeTrailingComments(element);
                case SyntaxKind.ModuleDeclaration:
                    return convertNodeTrailingComments(element);
                case SyntaxKind.EnumDeclaration:
                    return convertNodeTrailingComments(element);
                case SyntaxKind.IfStatement:
                    return convertNodeTrailingComments(element);
            }
        }

        return null;
    }

    function convertNodeTrailingComments(node: ISyntaxElement, allowWithNewLine = false): Comment[]{
        // Bail out quickly before doing any expensive math computation.
        var lastToken = node.lastToken();
        if (lastToken === null || !lastToken.hasTrailingComment()) {
            return null;
        }

        if (!allowWithNewLine && lastToken.hasTrailingNewLine()) {
            return null;
        }

        return convertComments(lastToken.trailingTrivia(), node.fullStart() + node.fullWidth() - lastToken.trailingTriviaWidth());
    }

    function convertNodeLeadingComments(element: ISyntaxElement): Comment[]{
        if (element) {
            return convertTokenLeadingComments(element.firstToken(), element.fullStart());
        }

        return null;
    }

    function convertTokenLeadingComments(token: ISyntaxToken, commentStartPosition: number): Comment[]{
        if (token === null) {
            return null;
        }

        return token.hasLeadingComment()
            ? convertComments(token.leadingTrivia(), commentStartPosition)
            : null;
    }

    function convertComments(triviaList: ISyntaxTriviaList, commentStartPosition: number): Comment[]{
        var result: Comment[] = [];

        for (var i = 0, n = triviaList.count(); i < n; i++) {
            var trivia = triviaList.syntaxTriviaAt(i);

            if (trivia.isComment()) {
                var hasTrailingNewLine = ((i + 1) < n) && triviaList.syntaxTriviaAt(i + 1).isNewLine();
                result.push(convertComment(trivia, commentStartPosition, hasTrailingNewLine));
            }

            commentStartPosition += trivia.fullWidth();
        }

        return result;
    }

    function convertComment(trivia: ISyntaxTrivia, commentStartPosition: number, hasTrailingNewLine: boolean): Comment {
        var comment = new Comment(trivia, hasTrailingNewLine, commentStartPosition, commentStartPosition + trivia.fullWidth());

        return comment;
    }

    export function docComments(ast: ISyntaxElement): Comment[] {
        if (isDeclarationAST(ast)) {
            var preComments = ast.kind() === SyntaxKind.VariableDeclarator
                ? preComments(getVariableStatement(<VariableDeclaratorSyntax>ast))
                : preComments(ast);

            if (preComments && preComments.length > 0) {
                var preCommentsLength = preComments.length;
                var docComments = new Array<Comment>();
                for (var i = preCommentsLength - 1; i >= 0; i--) {
                    if (isDocComment(preComments[i])) {
                        docComments.push(preComments[i]);
                        continue;
                    }

                    break;
                }

                return docComments.reverse();
            }
        }

        return sentinelEmptyArray;
    }

    function isDocComment(comment: Comment) {
        if (comment.kind() === SyntaxKind.MultiLineCommentTrivia) {
            var fullText = comment.fullText();
            return fullText.charAt(2) === "*" && fullText.charAt(3) !== "/";
        }

        return false;
    }

    export function getParameterList(ast: ISyntaxElement): ParameterListSyntax {
        if (ast) {
            switch (ast.kind()) {
                case SyntaxKind.ConstructorDeclaration:
                    return (<ConstructorDeclarationSyntax>ast).parameterList;
                case SyntaxKind.FunctionDeclaration:
                    return getParameterList((<FunctionDeclarationSyntax>ast).callSignature);
                case SyntaxKind.ParenthesizedArrowFunctionExpression:
                    return getParameterList((<ParenthesizedArrowFunctionExpressionSyntax>ast).callSignature);
                case SyntaxKind.ConstructSignature:
                    return getParameterList((<ConstructSignatureSyntax>ast).callSignature);
                case SyntaxKind.MemberFunctionDeclaration:
                    return getParameterList((<MemberFunctionDeclarationSyntax>ast).callSignature);
                case SyntaxKind.FunctionPropertyAssignment:
                    return getParameterList((<FunctionPropertyAssignmentSyntax>ast).callSignature);
                case SyntaxKind.FunctionExpression:
                    return getParameterList((<FunctionExpressionSyntax>ast).callSignature);
                case SyntaxKind.MethodSignature:
                    return getParameterList((<MethodSignatureSyntax>ast).callSignature);
                case SyntaxKind.ConstructorType:
                    return (<ConstructorTypeSyntax>ast).parameterList;
                case SyntaxKind.FunctionType:
                    return (<FunctionTypeSyntax>ast).parameterList;
                case SyntaxKind.CallSignature:
                    return (<CallSignatureSyntax>ast).parameterList;
                case SyntaxKind.GetAccessor:
                    return (<GetAccessorSyntax>ast).parameterList;
                case SyntaxKind.SetAccessor:
                    return (<SetAccessorSyntax>ast).parameterList;
            }
        }

        return null;
    }

    export function getType(ast: ISyntaxElement): ISyntaxElement {
        if (ast) {
            switch (ast.kind()) {
                case SyntaxKind.FunctionDeclaration:
                    return getType((<FunctionDeclarationSyntax>ast).callSignature);
                case SyntaxKind.ParenthesizedArrowFunctionExpression:
                    return getType((<ParenthesizedArrowFunctionExpressionSyntax>ast).callSignature);
                case SyntaxKind.ConstructSignature:
                    return getType((<ConstructSignatureSyntax>ast).callSignature);
                case SyntaxKind.MemberFunctionDeclaration:
                    return getType((<MemberFunctionDeclarationSyntax>ast).callSignature);
                case SyntaxKind.FunctionPropertyAssignment:
                    return getType((<FunctionPropertyAssignmentSyntax>ast).callSignature);
                case SyntaxKind.FunctionExpression:
                    return getType((<FunctionExpressionSyntax>ast).callSignature);
                case SyntaxKind.MethodSignature:
                    return getType((<MethodSignatureSyntax>ast).callSignature);
                case SyntaxKind.CallSignature:
                    return getType((<CallSignatureSyntax>ast).typeAnnotation);
                case SyntaxKind.IndexSignature:
                    return getType((<IndexSignatureSyntax>ast).typeAnnotation);
                case SyntaxKind.PropertySignature:
                    return getType((<PropertySignatureSyntax>ast).typeAnnotation);
                case SyntaxKind.GetAccessor:
                    return getType((<GetAccessorSyntax>ast).typeAnnotation);
                case SyntaxKind.Parameter:
                    return getType((<ParameterSyntax>ast).typeAnnotation);
                case SyntaxKind.MemberVariableDeclaration:
                    return getType((<MemberVariableDeclarationSyntax>ast).variableDeclarator);
                case SyntaxKind.VariableDeclarator:
                    return getType((<VariableDeclaratorSyntax>ast).typeAnnotation);
                case SyntaxKind.CatchClause:
                    return getType((<CatchClauseSyntax>ast).typeAnnotation);
                case SyntaxKind.ConstructorType:
                    return (<ConstructorTypeSyntax>ast).type;
                case SyntaxKind.FunctionType:
                    return (<FunctionTypeSyntax>ast).type;
                case SyntaxKind.TypeAnnotation:
                    return (<TypeAnnotationSyntax>ast).type;
            }
        }

        return null;
    }

    function getVariableStatement(variableDeclarator: VariableDeclaratorSyntax): VariableStatementSyntax {
        if (variableDeclarator && variableDeclarator.parent && variableDeclarator.parent.parent && variableDeclarator.parent.parent.parent &&
            variableDeclarator.parent.kind() === SyntaxKind.SeparatedList &&
            variableDeclarator.parent.parent.kind() === SyntaxKind.VariableDeclaration &&
            variableDeclarator.parent.parent.parent.kind() === SyntaxKind.VariableStatement) {

            return <VariableStatementSyntax>variableDeclarator.parent.parent.parent;
        }

        return null;
    }

    export function getVariableDeclaratorModifiers(variableDeclarator: VariableDeclaratorSyntax): ISyntaxList {
        var variableStatement = getVariableStatement(variableDeclarator);
        return variableStatement ? variableStatement.modifiers : Syntax.emptyList;
    }

    export function isIntegerLiteralAST(expression: ISyntaxElement): boolean {
        if (expression) {
            switch (expression.kind()) {
                case SyntaxKind.PlusExpression:
                case SyntaxKind.NegateExpression:
                    // Note: if there is a + or - sign, we can only allow a normal integer following
                    // (and not a hex integer).  i.e. -0xA is a legal expression, but it is not a 
                    // *literal*.
                    expression = (<PrefixUnaryExpressionSyntax>expression).operand;
                    return expression.kind() === SyntaxKind.NumericLiteral && IntegerUtilities.isInteger((<ISyntaxToken>expression).text());

                case SyntaxKind.NumericLiteral:
                    // If it doesn't have a + or -, then either an integer literal or a hex literal
                    // is acceptable.
                    var text = (<ISyntaxToken>expression).text();
                    return IntegerUtilities.isInteger(text) || IntegerUtilities.isHexInteger(text);
            }
        }

        return false;
    }

    export function getEnclosingModuleDeclaration(ast: ISyntaxElement): ModuleDeclarationSyntax {
        while (ast) {
            if (ast.kind() === SyntaxKind.ModuleDeclaration) {
                return <ModuleDeclarationSyntax>ast;
            }

            ast = ast.parent;
        }

        return null;
    }

    export function isLastNameOfModule(ast: ModuleDeclarationSyntax, astName: ISyntaxElement): boolean {
        if (ast) {
            if (ast.stringLiteral) {
                return astName === ast.stringLiteral;
            }
            else {
                var moduleNames = getModuleNames(ast.name);
                var nameIndex = moduleNames.indexOf(<ISyntaxToken>astName);

                return nameIndex === (moduleNames.length - 1);
            }
        }

        return false;
    }

    export function isAnyNameOfModule(ast: ModuleDeclarationSyntax, astName: ISyntaxElement): boolean {
        if (ast) {
            if (ast.stringLiteral) {
                return ast.stringLiteral === astName;
            }
            else {
                var moduleNames = getModuleNames(ast.name);
                var nameIndex = moduleNames.indexOf(<ISyntaxToken>astName);

                return nameIndex >= 0;
            }
        }

        return false;
    }
}