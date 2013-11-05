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
    export function scriptIsElided(script: Script): boolean {
        return isDTSFile(script.fileName()) || moduleMembersAreElided(script.moduleElements);
    }

    export function moduleIsElided(declaration: ModuleDeclaration): boolean {
        return hasModifier(declaration.modifiers, PullElementFlags.Ambient) || moduleMembersAreElided(declaration.moduleElements);
    }

    function moduleMembersAreElided(members: ASTList): boolean {
        for (var i = 0, n = members.childCount(); i < n; i++) {
            var member = members.childAt(i);

            // We should emit *this* module if it contains any non-interface types. 
            // Caveat: if we have contain a module, then we should be emitted *if we want to
            // emit that inner module as well.
            if (member.nodeType() === SyntaxKind.ModuleDeclaration) {
                if (!moduleIsElided(<ModuleDeclaration>member)) {
                    return false;
                }
            }
            else if (member.nodeType() !== SyntaxKind.InterfaceDeclaration) {
                return false;
            }
        }

        return true;
    }

    export function enumIsElided(declaration: EnumDeclaration): boolean {
        if (hasModifier(declaration.modifiers, PullElementFlags.Ambient)) {
            return true;
        }

        return false;
    }

    export function importDeclarationIsElided(importDeclAST: ImportDeclaration, semanticInfoChain: SemanticInfoChain, compilationSettings: ImmutableCompilationSettings = null) {
        var isExternalModuleReference = importDeclAST.moduleReference.nodeType() === SyntaxKind.ExternalModuleReference;
        var importDecl = semanticInfoChain.getDeclForAST(importDeclAST);
        var isExported = hasFlag(importDecl.flags, PullElementFlags.Exported);
        var isAmdCodeGen = compilationSettings && compilationSettings.moduleGenTarget() == ModuleGenTarget.Asynchronous;

        if (!isExternalModuleReference || // Any internal reference needs to check if the emit can happen
            isExported || // External module reference with export modifier always needs to be emitted
            !isAmdCodeGen) {// commonjs needs the var declaration for the import declaration
            var importSymbol = <PullTypeAliasSymbol>importDecl.getSymbol();
            if (importDeclAST.moduleReference.nodeType() !== SyntaxKind.ExternalModuleReference) {
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

    export function isValidAstNode(ast: IASTSpan): boolean {
        if (!ast)
            return false;

        if (ast.start() === -1 || ast.end() === -1)
            return false;

        return true;
    }

    ///
    /// Return the AST containing "position"
    ///
    export function getAstAtPosition(script: AST, pos: number, useTrailingTriviaAsLimChar: boolean = true, forceInclusive: boolean = false): AST {
        var top: AST = null;

        var pre = function (cur: AST, walker: IAstWalker) {
            if (isValidAstNode(cur)) {
                var isInvalid1 = cur.nodeType() === SyntaxKind.ExpressionStatement && cur.width() === 0;

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
                        cur.nodeType() === SyntaxKind.IdentifierName ||
                        cur.nodeType() === SyntaxKind.MemberAccessExpression ||
                        cur.nodeType() === SyntaxKind.QualifiedName ||
                        //cur.nodeType() === SyntaxKind.TypeRef ||
                        cur.nodeType() === SyntaxKind.VariableDeclaration ||
                        cur.nodeType() === SyntaxKind.VariableDeclarator ||
                        cur.nodeType() === SyntaxKind.InvocationExpression ||
                        pos === script.end() + script.trailingTriviaWidth(); // Special "EOF" case

                    var minChar = cur.start();
                    var limChar = cur.end() + (useTrailingTriviaAsLimChar ? cur.trailingTriviaWidth() : 0) + (inclusive ? 1 : 0);
                    if (pos >= minChar && pos < limChar) {

                        // Ignore empty lists
                        if ((cur.nodeType() !== SyntaxKind.List && cur.nodeType() !== SyntaxKind.SeparatedList) || cur.end() > cur.start()) {
                            // TODO: Since AST is sometimes not correct wrt to position, only add "cur" if it's better
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

    export function getExtendsHeritageClause(clauses: ASTList): HeritageClause {
        if (!clauses) {
            return null;
        }

        return <HeritageClause>clauses.firstOrDefault((c: HeritageClause) =>
            c.typeNames.nonSeparatorCount() > 0 && c.nodeType() === SyntaxKind.ExtendsHeritageClause);
    }

    export function getImplementsHeritageClause(clauses: ASTList): HeritageClause {
        if (!clauses) {
            return null;
        }

        return <HeritageClause>clauses.firstOrDefault((c: HeritageClause) =>
            c.typeNames.nonSeparatorCount() > 0 && c.nodeType() === SyntaxKind.ImplementsHeritageClause);
    }

    export function isCallExpression(ast: AST): boolean {
        return (ast && ast.nodeType() === SyntaxKind.InvocationExpression) ||
            (ast && ast.nodeType() === SyntaxKind.ObjectCreationExpression);
    }

    export function isCallExpressionTarget(ast: AST): boolean {
        if (!ast) {
            return false;
        }

        var current = ast;

        while (current && current.parent) {
            if (current.parent.nodeType() === SyntaxKind.MemberAccessExpression &&
                (<MemberAccessExpression>current.parent).name === current) {
                current = current.parent;
                continue;
            }

            break;
        }

        if (current && current.parent) {
            if (current.parent.nodeType() === SyntaxKind.InvocationExpression || current.parent.nodeType() === SyntaxKind.ObjectCreationExpression) {
                return current === (<InvocationExpression>current.parent).expression;
            }
        }

        return false;
    }

    function isNameOfSomeDeclaration(ast: AST) {
        if (ast === null || ast.parent === null) {
            return false;
        }
        if (ast.nodeType() !== SyntaxKind.IdentifierName) {
            return false;
        }

        switch (ast.parent.nodeType()) {
            case SyntaxKind.ClassDeclaration:
                return (<ClassDeclaration>ast.parent).identifier === ast;
            case SyntaxKind.InterfaceDeclaration:
                return (<InterfaceDeclaration>ast.parent).identifier === ast;
            case SyntaxKind.EnumDeclaration:
                return (<EnumDeclaration>ast.parent).identifier === ast;
            case SyntaxKind.ModuleDeclaration:
                return (<ModuleDeclaration>ast.parent).name === ast || (<ModuleDeclaration>ast.parent).stringLiteral === ast;
            case SyntaxKind.VariableDeclarator:
                return (<VariableDeclarator>ast.parent).propertyName === ast;
            case SyntaxKind.FunctionDeclaration:
                return (<FunctionDeclaration>ast.parent).identifier === ast;
            case SyntaxKind.MemberFunctionDeclaration:
                return (<MemberFunctionDeclaration>ast.parent).propertyName === ast;
            case SyntaxKind.Parameter:
                return (<Parameter>ast.parent).identifier === ast;
            case SyntaxKind.TypeParameter:
                return (<TypeParameter>ast.parent).identifier === ast;
            case SyntaxKind.SimplePropertyAssignment:
                return (<SimplePropertyAssignment>ast.parent).propertyName === ast;
            case SyntaxKind.FunctionPropertyAssignment:
                return (<FunctionPropertyAssignment>ast.parent).propertyName === ast;
            case SyntaxKind.EnumElement:
                return (<EnumElement>ast.parent).propertyName === ast;
            case SyntaxKind.ImportDeclaration:
                return (<ImportDeclaration>ast.parent).identifier === ast;
        }

        return false;
    }

    export function isDeclarationASTOrDeclarationNameAST(ast: AST) {
        return isNameOfSomeDeclaration(ast) || isDeclarationAST(ast);
    }

    export function isNameOfFunction(ast: AST) {
        return ast
            && ast.parent
            && ast.nodeType() === SyntaxKind.IdentifierName
            && ast.parent.nodeType() === SyntaxKind.FunctionDeclaration
            && (<FunctionDeclaration>ast.parent).identifier === ast;
    }

    export function isNameOfMemberFunction(ast: AST) {
        return ast
            && ast.parent
            && ast.nodeType() === SyntaxKind.IdentifierName
            && ast.parent.nodeType() === SyntaxKind.MemberFunctionDeclaration
            && (<MemberFunctionDeclaration>ast.parent).propertyName === ast;
    }

    export function isNameOfMemberAccessExpression(ast: AST) {
        if (ast &&
            ast.parent &&
            ast.parent.nodeType() === SyntaxKind.MemberAccessExpression &&
            (<MemberAccessExpression>ast.parent).name === ast) {

            return true;
        }

        return false;
    }

    export function isRightSideOfQualifiedName(ast: AST) {
        if (ast &&
            ast.parent &&
            ast.parent.nodeType() === SyntaxKind.QualifiedName &&
            (<QualifiedName>ast.parent).right === ast) {

            return true;
        }

        return false;
    }

    export interface IParameters {
        length: number;
        lastParameterIsRest(): boolean;
        ast: AST;
        astAt(index: number): AST;
        identifierAt(index: number): Identifier;
        typeAt(index: number): AST;
        initializerAt(index: number): EqualsValueClause;
        isOptionalAt(index: number): boolean;
    }

    export module Parameters {
        export function fromIdentifier(id: Identifier): IParameters {
            return {
                length: 1,
                lastParameterIsRest: () => false,
                ast: id,
                astAt: (index: number) => id,
                identifierAt: (index: number) => id,
                typeAt: (index: number): AST => null,
                initializerAt: (index: number): EqualsValueClause => null,
                isOptionalAt: (index: number) => false,
            }
        }

        export function fromParameter(parameter: Parameter): IParameters {
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

        function parameterIsOptional(parameter: Parameter): boolean {
            return parameter.questionToken !== null || parameter.equalsValueClause !== null;
        }

        export function fromParameterList(list: ParameterList): IParameters {
            return {
                length: list.parameters.nonSeparatorCount(),
                lastParameterIsRest: () => lastParameterIsRest(list),
                ast: list.parameters,
                astAt: (index: number) => list.parameters.nonSeparatorAt(index),
                identifierAt: (index: number) => (<Parameter>list.parameters.nonSeparatorAt(index)).identifier,
                typeAt: (index: number) => getType(list.parameters.nonSeparatorAt(index)),
                initializerAt: (index: number) => (<Parameter>list.parameters.nonSeparatorAt(index)).equalsValueClause,
                isOptionalAt: (index: number) => parameterIsOptional(<Parameter>list.parameters.nonSeparatorAt(index)),
            }
        }
    }

    export function isDeclarationAST(ast: AST): boolean {
        switch (ast.nodeType()) {
            case SyntaxKind.VariableDeclarator:
                return getVariableStatement(<VariableDeclarator>ast) !== null;

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

    export function docComments(ast: AST): Comment[] {
        if (isDeclarationAST(ast)) {
            var preComments = ast.nodeType() === SyntaxKind.VariableDeclarator
                ? getVariableStatement(<VariableDeclarator>ast).preComments()
                : ast.preComments();

            if (preComments && preComments.length > 0) {
                var preCommentsLength = preComments.length;
                var docComments = new Array<Comment>();
                for (var i = preCommentsLength - 1; i >= 0; i--) {
                    if (preComments[i].isDocComment()) {
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

    export function getParameterList(ast: AST): ParameterList {
        if (ast) {
            switch (ast.nodeType()) {
                case SyntaxKind.ConstructorDeclaration:
                    return (<ConstructorDeclaration>ast).parameterList;
                case SyntaxKind.FunctionDeclaration:
                    return getParameterList((<FunctionDeclaration>ast).callSignature);
                case SyntaxKind.ParenthesizedArrowFunctionExpression:
                    return getParameterList((<ParenthesizedArrowFunctionExpression>ast).callSignature);
                case SyntaxKind.ConstructSignature:
                    return getParameterList((<ConstructSignature>ast).callSignature);
                case SyntaxKind.MemberFunctionDeclaration:
                    return getParameterList((<MemberFunctionDeclaration>ast).callSignature);
                case SyntaxKind.FunctionPropertyAssignment:
                    return getParameterList((<FunctionPropertyAssignment>ast).callSignature);
                case SyntaxKind.FunctionExpression:
                    return getParameterList((<FunctionExpression>ast).callSignature);
                case SyntaxKind.MethodSignature:
                    return getParameterList((<MethodSignature>ast).callSignature);
                case SyntaxKind.ConstructorType:
                    return (<ConstructorType>ast).parameterList;
                case SyntaxKind.FunctionType:
                    return (<FunctionType>ast).parameterList;
                case SyntaxKind.CallSignature:
                    return (<CallSignature>ast).parameterList;
                case SyntaxKind.GetAccessor:
                    return (<GetAccessor>ast).parameterList;
                case SyntaxKind.SetAccessor:
                    return (<SetAccessor>ast).parameterList;
            }
        }

        return null;
    }

    export function getType(ast: AST): AST {
        if (ast) {
            switch (ast.nodeType()) {
                case SyntaxKind.FunctionDeclaration:
                    return getType((<FunctionDeclaration>ast).callSignature);
                case SyntaxKind.ParenthesizedArrowFunctionExpression:
                    return getType((<ParenthesizedArrowFunctionExpression>ast).callSignature);
                case SyntaxKind.ConstructSignature:
                    return getType((<ConstructSignature>ast).callSignature);
                case SyntaxKind.MemberFunctionDeclaration:
                    return getType((<MemberFunctionDeclaration>ast).callSignature);
                case SyntaxKind.FunctionPropertyAssignment:
                    return getType((<FunctionPropertyAssignment>ast).callSignature);
                case SyntaxKind.FunctionExpression:
                    return getType((<FunctionExpression>ast).callSignature);
                case SyntaxKind.MethodSignature:
                    return getType((<MethodSignature>ast).callSignature);
                case SyntaxKind.CallSignature:
                    return getType((<CallSignature>ast).typeAnnotation);
                case SyntaxKind.IndexSignature:
                    return getType((<IndexSignature>ast).typeAnnotation);
                case SyntaxKind.PropertySignature:
                    return getType((<PropertySignature>ast).typeAnnotation);
                case SyntaxKind.GetAccessor:
                    return getType((<GetAccessor>ast).typeAnnotation);
                case SyntaxKind.Parameter:
                    return getType((<Parameter>ast).typeAnnotation);
                case SyntaxKind.MemberVariableDeclaration:
                    return getType((<MemberVariableDeclaration>ast).variableDeclarator);
                case SyntaxKind.VariableDeclarator:
                    return getType((<VariableDeclarator>ast).typeAnnotation);
                case SyntaxKind.CatchClause:
                    return getType((<CatchClause>ast).typeAnnotation);
                case SyntaxKind.ConstructorType:
                    return (<ConstructorType>ast).type;
                case SyntaxKind.FunctionType:
                    return (<FunctionType>ast).type;
                case SyntaxKind.TypeAnnotation:
                    return (<TypeAnnotation>ast).type;
            }
        }

        return null;
    }

    function getVariableStatement(variableDeclarator: VariableDeclarator): VariableStatement {
        if (variableDeclarator && variableDeclarator.parent && variableDeclarator.parent.parent && variableDeclarator.parent.parent.parent &&
            variableDeclarator.parent.nodeType() === SyntaxKind.SeparatedList &&
            variableDeclarator.parent.parent.nodeType() === SyntaxKind.VariableDeclaration &&
            variableDeclarator.parent.parent.parent.nodeType() === SyntaxKind.VariableStatement) {

            return <VariableStatement>variableDeclarator.parent.parent.parent;
        }

        return null;
    }

    export function getVariableDeclaratorModifiers(variableDeclarator: VariableDeclarator): PullElementFlags[]{
        var variableStatement = getVariableStatement(variableDeclarator);
        return variableStatement ? variableStatement.modifiers : sentinelEmptyArray;
    }

    export function isIntegerLiteralAST(expression: AST): boolean {
        if (expression) {
            switch (expression.nodeType()) {
                case SyntaxKind.PlusExpression:
                case SyntaxKind.NegateExpression:
                    // Note: if there is a + or - sign, we can only allow a normal integer following
                    // (and not a hex integer).  i.e. -0xA is a legal expression, but it is not a 
                    // *literal*.
                    expression = (<PrefixUnaryExpression>expression).operand;
                    return expression.nodeType() === SyntaxKind.NumericLiteral && IntegerUtilities.isInteger((<NumericLiteral>expression).text());

                case SyntaxKind.NumericLiteral:
                    // If it doesn't have a + or -, then either an integer literal or a hex literal
                    // is acceptable.
                    var text = (<NumericLiteral>expression).text();
                    return IntegerUtilities.isInteger(text) || IntegerUtilities.isHexInteger(text);
            }
        }

        return false;
    }

    export function getEnclosingModuleDeclaration(ast: AST): ModuleDeclaration {
        while (ast) {
            if (ast.nodeType() === SyntaxKind.ModuleDeclaration) {
                return <ModuleDeclaration>ast;
            }

            ast = ast.parent;
        }

        return null;
    }

    export function isLastNameOfModule(ast: ModuleDeclaration, astName: AST): boolean {
        if (ast) {
            if (ast.stringLiteral) {
                return astName === ast.stringLiteral;
            }
            else {
                var moduleNames = getModuleNames(ast.name);
                var nameIndex = moduleNames.indexOf(<Identifier>astName);

                return nameIndex === (moduleNames.length - 1);
            }
        }

        return false;
    }

    export function isAnyNameOfModule(ast: ModuleDeclaration, astName: AST): boolean {
        if (ast) {
            if (ast.stringLiteral) {
                return ast.stringLiteral === astName;
            }
            else {
                var moduleNames = getModuleNames(ast.name);
                var nameIndex = moduleNames.indexOf(<Identifier>astName);

                return nameIndex >= 0;
            }
        }

        return false;
    }

    export function getModifiers(ast: AST): PullElementFlags[] {
        if (ast) {
            switch (ast.nodeType()) {
                case SyntaxKind.VariableStatement:
                    return (<VariableStatement>ast).modifiers;
                case SyntaxKind.FunctionDeclaration:
                    return (<FunctionDeclaration>ast).modifiers;
                case SyntaxKind.ClassDeclaration:
                    return (<ClassDeclaration>ast).modifiers;
                case SyntaxKind.InterfaceDeclaration:
                    return (<InterfaceDeclaration>ast).modifiers;
                case SyntaxKind.EnumDeclaration:
                    return (<EnumDeclaration>ast).modifiers;
                case SyntaxKind.ModuleDeclaration:
                    return (<ModuleDeclaration>ast).modifiers;
                case SyntaxKind.ImportDeclaration:
                    return (<ImportDeclaration>ast).modifiers;
                case SyntaxKind.ExportAssignment:
                    return [PullElementFlags.Exported];
            }
        }

        return null;
    }
}