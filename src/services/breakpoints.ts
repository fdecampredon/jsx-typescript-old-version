// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
// See LICENSE.txt in the project root for complete license information.

///<reference path='typescriptServices.ts' />

module TypeScript.Services.Breakpoints {
    function createBreakpointSpanInfo(parentElement: TypeScript.ISyntaxElement, ...childElements: TypeScript.ISyntaxElement[]): SpanInfo {
        if (!parentElement) {
            return null;
        }

        if (childElements.length == 0) {
            return new SpanInfo(TypeScript.start(parentElement), TypeScript.end(parentElement));
        }

        var start: number;
        var end: number;
        for (var i = 0; i < childElements.length; i++) {
            var element = childElements[i];
            if (element && !element.isShared()) {
                if (start == undefined) {
                    start = TypeScript.start(element);
                }
                end = TypeScript.end(element);
            }
        }

        return new SpanInfo(start, end);
    }

    function createBreakpointSpanInfoWithLimChar(startElement: TypeScript.ISyntaxElement, limChar: number): SpanInfo {
        return new SpanInfo(start(startElement), limChar);
    }

    class BreakpointResolver {
        constructor(private posLine: number, private lineMap: TypeScript.LineMap) {
        }

        private breakpointSpanOfToken(positionedToken: TypeScript.ISyntaxToken): SpanInfo {
            switch (positionedToken.kind()) {
                case TypeScript.SyntaxKind.OpenBraceToken:
                    return this.breakpointSpanOfOpenBrace(positionedToken);

                case TypeScript.SyntaxKind.CloseBraceToken:
                    return this.breakpointSpanOfCloseBrace(positionedToken);

                case TypeScript.SyntaxKind.CommaToken:
                    return this.breakpointSpanOfComma(positionedToken);

                case TypeScript.SyntaxKind.SemicolonToken:
                case TypeScript.SyntaxKind.EndOfFileToken:
                    return this.breakpointSpanIfStartsOnSameLine(positionedToken.previousToken());

                case TypeScript.SyntaxKind.CloseParenToken:
                    return this.breakpointSpanOfCloseParen(positionedToken);

                case TypeScript.SyntaxKind.DoKeyword:
                    var parentElement = positionedToken.parent;
                    if (parentElement && parentElement.kind() == TypeScript.SyntaxKind.DoStatement) {
                        return this.breakpointSpanIfStartsOnSameLine(positionedToken.nextToken());
                    }
                    break;
            }

            return this.breakpointSpanOfContainingNode(positionedToken);
        }

        private breakpointSpanOfOpenBrace(openBraceToken: TypeScript.ISyntaxToken): SpanInfo {
            var container = Syntax.containingNode(openBraceToken);
            if (container) {
                var originalContainer = container;
                if (container && container.kind() == TypeScript.SyntaxKind.Block) {
                    // We have to check the parent and decide what to do with the breakpoint
                    container = Syntax.containingNode(container);
                    if (!container) {
                        container = originalContainer;
                    }
                }

                switch (container.kind()) {
                    case TypeScript.SyntaxKind.Block:
                        if (!this.canHaveBreakpointInBlock(container)) {
                            return null;
                        }
                        return this.breakpointSpanOfFirstStatementInBlock(container);
                        break;

                    case TypeScript.SyntaxKind.ModuleDeclaration:
                    case TypeScript.SyntaxKind.ClassDeclaration:
                    case TypeScript.SyntaxKind.FunctionDeclaration:
                    case TypeScript.SyntaxKind.ConstructorDeclaration:
                    case TypeScript.SyntaxKind.MemberFunctionDeclaration:
                    case TypeScript.SyntaxKind.GetAccessor:
                    case TypeScript.SyntaxKind.SetAccessor:
                    case TypeScript.SyntaxKind.FunctionExpression:
                    case TypeScript.SyntaxKind.ParenthesizedArrowFunctionExpression:
                    case TypeScript.SyntaxKind.SimpleArrowFunctionExpression:
                        if (!this.canHaveBreakpointInDeclaration(container)) {
                            return null;
                        }
                        if (this.posLine != this.lineMap.getLineNumberFromPosition(start(container))) {
                            return this.breakpointSpanOfFirstChildOfSyntaxList(this.getSyntaxListOfDeclarationWithElements(container));
                        }
                        else {
                            return this.breakpointSpanOf(container);
                        }

                    case TypeScript.SyntaxKind.EnumDeclaration:
                        if (!this.canHaveBreakpointInDeclaration(container)) {
                            return null;
                        }
                        if (this.posLine != this.lineMap.getLineNumberFromPosition(start(container))) {
                            return this.breakpointSpanOfFirstEnumElement(container);
                        }
                        else {
                            return this.breakpointSpanOf(container);
                        }

                    case TypeScript.SyntaxKind.IfStatement:
                    case TypeScript.SyntaxKind.ForInStatement:
                    case TypeScript.SyntaxKind.WhileStatement:
                    case TypeScript.SyntaxKind.CatchClause:
                        if (this.posLine != this.lineMap.getLineNumberFromPosition(start(container))) {
                            return this.breakpointSpanOfFirstStatementInBlock(originalContainer);
                        }
                        else {
                            return this.breakpointSpanOf(container);
                        }

                    case TypeScript.SyntaxKind.DoStatement:
                        return this.breakpointSpanOfFirstStatementInBlock(originalContainer);

                    case TypeScript.SyntaxKind.ForStatement:
                        if (this.posLine != this.lineMap.getLineNumberFromPosition(start(container))) {
                            return this.breakpointSpanOfFirstStatementInBlock(originalContainer);
                        }
                        else {
                            return this.breakpointSpanOf(openBraceToken.previousToken());
                        }

                    case TypeScript.SyntaxKind.ElseClause:
                    case TypeScript.SyntaxKind.CaseSwitchClause:
                    case TypeScript.SyntaxKind.DefaultSwitchClause:
                    case TypeScript.SyntaxKind.WithStatement:
                    case TypeScript.SyntaxKind.TryStatement:
                    case TypeScript.SyntaxKind.FinallyClause:
                        return this.breakpointSpanOfFirstStatementInBlock(originalContainer);

                    case TypeScript.SyntaxKind.SwitchStatement:
                        if (this.posLine != this.lineMap.getLineNumberFromPosition(start(container))) {
                            return this.breakpointSpanOfFirstStatementOfFirstCaseClause(container);
                        }
                        else {
                            return this.breakpointSpanOf(container);
                        }
                }
            }

            return null;
        }

        private breakpointSpanOfCloseBrace(closeBraceToken: TypeScript.ISyntaxToken): SpanInfo {
            var container = Syntax.containingNode(closeBraceToken);
            if (container) {
                var originalContainer = container;
                if (container.kind() == TypeScript.SyntaxKind.Block) {
                    // We have to check the parent and decide what to do with the breakpoint
                    container = Syntax.containingNode(container);
                    if (!container) {
                        container = originalContainer;
                    }
                }

                switch (container.kind()) {
                    case TypeScript.SyntaxKind.Block:
                        if (!this.canHaveBreakpointInBlock(container)) {
                            return null;
                        }
                        return this.breakpointSpanOfLastStatementInBlock(container);
                        break;

                    case TypeScript.SyntaxKind.ModuleDeclaration:
                        if (!this.canHaveBreakpointInDeclaration(container)) {
                            return null;
                        }
                        var moduleSyntax = <TypeScript.ModuleDeclarationSyntax>container;
                        if (moduleSyntax.moduleElements && moduleSyntax.moduleElements.childCount() > 0) {
                            return createBreakpointSpanInfo(closeBraceToken);
                        }
                        else {
                            return null;
                        }

                    case TypeScript.SyntaxKind.ClassDeclaration:
                    case TypeScript.SyntaxKind.FunctionDeclaration:
                    case TypeScript.SyntaxKind.ConstructorDeclaration:
                    case TypeScript.SyntaxKind.MemberFunctionDeclaration:
                    case TypeScript.SyntaxKind.GetAccessor:
                    case TypeScript.SyntaxKind.SetAccessor:
                    case TypeScript.SyntaxKind.FunctionExpression:
                        if (!this.canHaveBreakpointInDeclaration(container)) {
                            return null;
                        }
                        return createBreakpointSpanInfo(closeBraceToken);

                    case TypeScript.SyntaxKind.EnumDeclaration:
                        if (!this.canHaveBreakpointInDeclaration(container)) {
                            return null;
                        }
                        return createBreakpointSpanInfo(closeBraceToken);

                    case TypeScript.SyntaxKind.IfStatement:
                    case TypeScript.SyntaxKind.ElseClause:
                    case TypeScript.SyntaxKind.ForInStatement:
                    case TypeScript.SyntaxKind.ForStatement:
                    case TypeScript.SyntaxKind.WhileStatement:
                    case TypeScript.SyntaxKind.DoStatement:
                    case TypeScript.SyntaxKind.CaseSwitchClause:
                    case TypeScript.SyntaxKind.DefaultSwitchClause:
                    case TypeScript.SyntaxKind.WithStatement:
                    case TypeScript.SyntaxKind.TryStatement:
                    case TypeScript.SyntaxKind.CatchClause:
                    case TypeScript.SyntaxKind.FinallyClause:
                    case TypeScript.SyntaxKind.ParenthesizedArrowFunctionExpression:
                    case TypeScript.SyntaxKind.SimpleArrowFunctionExpression:
                        return this.breakpointSpanOfLastStatementInBlock(originalContainer);

                    case TypeScript.SyntaxKind.SwitchStatement:
                        return this.breakpointSpanOfLastStatementOfLastCaseClause(container);
                }
            }

            return null;
        }


        private breakpointSpanOfComma(commaToken: TypeScript.ISyntaxToken): SpanInfo {
            var commaParent = commaToken.parent;
            if (isSeparatedList(commaParent)) {
                var grandParent = commaParent.parent;
                if (grandParent) {
                    switch (grandParent.kind()) {
                        case TypeScript.SyntaxKind.VariableDeclaration:
                        case TypeScript.SyntaxKind.EnumDeclaration:
                        case TypeScript.SyntaxKind.ParameterList:
                            var index = Syntax.childIndex(commaParent, commaToken);
                            // Use the previous child
                            if (index > 0) {
                                var child = commaParent.childAt(index - 1);
                                return this.breakpointSpanOf(child);
                            }

                            // If we cant set breakpoint on enum element, just dont set breakpoint
                            if (grandParent.kind() == TypeScript.SyntaxKind.EnumDeclaration) {
                                return null;
                            }
                            break;
                    }
                }
            }

            return this.breakpointSpanOfContainingNode(commaToken);
        }

        private breakpointSpanOfCloseParen(closeParenToken: TypeScript.ISyntaxToken): SpanInfo {
            var closeParenParent = closeParenToken.parent;
            if (closeParenParent) {
                switch (closeParenParent.kind()) {
                    case TypeScript.SyntaxKind.ForStatement:
                    case TypeScript.SyntaxKind.ParameterList:
                        return this.breakpointSpanOf(closeParenToken.previousToken());
                }
            }

            return this.breakpointSpanOfContainingNode(closeParenToken);
        }

        private canHaveBreakpointInBlock(blockNode: TypeScript.ISyntaxNode) {
            if (!blockNode || TypeScript.SyntaxUtilities.isAmbientDeclarationSyntax(blockNode)) {
                return false;
            }

            var blockSyntax = <TypeScript.BlockSyntax>blockNode;
            return blockSyntax.statements && blockSyntax.statements.childCount() != 0;
        }

        private breakpointSpanOfFirstStatementInBlock(blockNode: TypeScript.ISyntaxNode): SpanInfo {
            if (!blockNode) {
                return null;
            }

            var blockSyntax = <TypeScript.BlockSyntax>blockNode;
            var statementsNode = blockSyntax.statements;
            if (!statementsNode || statementsNode.childCount() == 0) {
                return null;
            }

            var firstStatement = statementsNode.childAt(0);
            if (firstStatement && firstStatement.kind() == TypeScript.SyntaxKind.Block) {
                if (this.canHaveBreakpointInBlock(<TypeScript.ISyntaxNode>firstStatement)) {
                    return this.breakpointSpanOfFirstStatementInBlock(<TypeScript.ISyntaxNode>firstStatement);
                }
                return null;
            }
            else {
                return this.breakpointSpanOf(firstStatement);
            }
        }

        private breakpointSpanOfLastStatementInBlock(blockNode: TypeScript.ISyntaxNode): SpanInfo {
            if (!blockNode) {
                return null;
            }

            var blockSyntax = <TypeScript.BlockSyntax>blockNode;
            var statementsNode = blockSyntax.statements;
            if (!statementsNode || statementsNode.childCount() == 0) {
                return null;
            }

            var lastStatement = statementsNode.childAt(statementsNode.childCount() - 1);
            if (lastStatement && lastStatement.kind() == TypeScript.SyntaxKind.Block) {
                if (this.canHaveBreakpointInBlock(<TypeScript.ISyntaxNode>lastStatement)) {
                    return this.breakpointSpanOfLastStatementInBlock(<TypeScript.ISyntaxNode>lastStatement);
                }
                return null;
            }
            else {
                return this.breakpointSpanOf(lastStatement);
            }
        }

        private breakpointSpanOfFirstChildOfSyntaxList(positionedList: TypeScript.ISyntaxList<ISyntaxNodeOrToken>): SpanInfo {
            if (!positionedList) {
                return null;
            }

            // Find the first syntax element
            var listSyntax = positionedList;
            if (listSyntax.childCount() == 0) {
                return null;
            }

            var firstStatement = positionedList.childAt(0);
            if (firstStatement && firstStatement.kind() == TypeScript.SyntaxKind.Block) {
                if (this.canHaveBreakpointInBlock(<TypeScript.SyntaxNode>firstStatement)) {
                    return this.breakpointSpanOfFirstStatementInBlock(<TypeScript.SyntaxNode>firstStatement);
                }

                return null;
            }
            else {
                return this.breakpointSpanOf(firstStatement);
            }
        }

        private breakpointSpanOfLastChildOfSyntaxList(positionedList: TypeScript.ISyntaxList<ISyntaxNodeOrToken>): SpanInfo {
            if (!positionedList) {
                return null;
            }

            // Find the first syntax element
            var listSyntax = positionedList;
            if (listSyntax.childCount() == 0) {
                return null;
            }
            var lastStatement = positionedList.childAt(0);
            if (lastStatement && lastStatement.kind() == TypeScript.SyntaxKind.Block) {
                if (this.canHaveBreakpointInBlock(<TypeScript.SyntaxNode>lastStatement)) {
                    return this.breakpointSpanOfLastStatementInBlock(<TypeScript.SyntaxNode>lastStatement);
                }
                return null;
            }
            else {
                return this.breakpointSpanOf(lastStatement);
            }
        }

        private breakpointSpanOfNode(positionedNode: TypeScript.SyntaxNode): SpanInfo {
            var node = positionedNode;
            switch (node.kind()) {
                // Declarations with elements
                case TypeScript.SyntaxKind.ModuleDeclaration:
                case TypeScript.SyntaxKind.ClassDeclaration:
                case TypeScript.SyntaxKind.FunctionDeclaration:
                case TypeScript.SyntaxKind.ConstructorDeclaration:
                case TypeScript.SyntaxKind.MemberFunctionDeclaration:
                case TypeScript.SyntaxKind.GetAccessor:
                case TypeScript.SyntaxKind.SetAccessor:
                case TypeScript.SyntaxKind.FunctionExpression:
                    return this.breakpointSpanOfDeclarationWithElements(positionedNode);

                // Var, parameter and member variable declaration syntax
                case TypeScript.SyntaxKind.VariableDeclarator:
                    return this.breakpointSpanOfVariableDeclarator(positionedNode);

                case TypeScript.SyntaxKind.VariableDeclaration:
                    return this.breakpointSpanOfVariableDeclaration(positionedNode);

                case TypeScript.SyntaxKind.VariableStatement:
                    return this.breakpointSpanOfVariableStatement(positionedNode);

                case TypeScript.SyntaxKind.Parameter:
                    return this.breakpointSpanOfParameter(positionedNode);

                case TypeScript.SyntaxKind.MemberVariableDeclaration:
                    return this.breakpointSpanOfMemberVariableDeclaration(positionedNode);

                case TypeScript.SyntaxKind.ImportDeclaration:
                    return this.breakpointSpanOfImportDeclaration(positionedNode);

                case TypeScript.SyntaxKind.EnumDeclaration:
                    return this.breakpointSpanOfEnumDeclaration(positionedNode);

                case TypeScript.SyntaxKind.EnumElement:
                    return this.breakpointSpanOfEnumElement(positionedNode);

                // Statements
                case TypeScript.SyntaxKind.IfStatement:
                    return this.breakpointSpanOfIfStatement(positionedNode);
                case TypeScript.SyntaxKind.ElseClause:
                    return this.breakpointSpanOfElseClause(positionedNode);
                case TypeScript.SyntaxKind.ForInStatement:
                    return this.breakpointSpanOfForInStatement(positionedNode);
                case TypeScript.SyntaxKind.ForStatement:
                    return this.breakpointSpanOfForStatement(positionedNode);
                case TypeScript.SyntaxKind.WhileStatement:
                    return this.breakpointSpanOfWhileStatement(positionedNode);
                case TypeScript.SyntaxKind.DoStatement:
                    return this.breakpointSpanOfDoStatement(positionedNode);
                case TypeScript.SyntaxKind.SwitchStatement:
                    return this.breakpointSpanOfSwitchStatement(positionedNode);
                case TypeScript.SyntaxKind.CaseSwitchClause:
                    return this.breakpointSpanOfCaseSwitchClause(positionedNode);
                case TypeScript.SyntaxKind.DefaultSwitchClause:
                    return this.breakpointSpanOfDefaultSwitchClause(positionedNode);
                case TypeScript.SyntaxKind.WithStatement:
                    return this.breakpointSpanOfWithStatement(positionedNode);
                case TypeScript.SyntaxKind.TryStatement:
                    return this.breakpointSpanOfTryStatement(positionedNode);
                case TypeScript.SyntaxKind.CatchClause:
                    return this.breakpointSpanOfCatchClause(positionedNode);
                case TypeScript.SyntaxKind.FinallyClause:
                    return this.breakpointSpanOfFinallyClause(positionedNode);

                // Arrow expressions
                case TypeScript.SyntaxKind.ParenthesizedArrowFunctionExpression:
                    return this.breakpointSpanOfParenthesizedArrowFunctionExpression(<ParenthesizedArrowFunctionExpressionSyntax>positionedNode);

                case TypeScript.SyntaxKind.SimpleArrowFunctionExpression:
                    return this.breakpointSpanOfSimpleArrowFunctionExpression(<SimpleArrowFunctionExpressionSyntax>positionedNode);

                // Expressions or statements
                default:
                    if (SyntaxUtilities.isStatement(node)) {
                        return this.breakpointSpanOfStatement(positionedNode);
                    }
                    else {
                        return this.breakpointOfExpression(positionedNode);
                    }
            }
        }

        private isExpressionOfArrowExpressions(expression: ISyntaxElement): boolean {
            if (!expression) {
                return false;
            }

            var expressionParent = expression.parent;
            if (expressionParent) {
                if (expressionParent.kind() == TypeScript.SyntaxKind.ParenthesizedArrowFunctionExpression) {
                    var parenthesizedArrowExpression = <TypeScript.ParenthesizedArrowFunctionExpressionSyntax>expressionParent;
                    var expressionOfParenthesizedArrowExpression = parenthesizedArrowExpression.expression;
                    return expressionOfParenthesizedArrowExpression == expression;
                }
                else if (expressionParent.kind() == TypeScript.SyntaxKind.SimpleArrowFunctionExpression) {
                    var simpleArrowExpression = <TypeScript.SimpleArrowFunctionExpressionSyntax>expressionParent;
                    var expressionOfSimpleArrowExpression = simpleArrowExpression.expression;
                    return expressionOfSimpleArrowExpression == expression;
                }
                else if (expressionParent.kind() == TypeScript.SyntaxKind.CommaExpression) {
                    return this.isExpressionOfArrowExpressions(expressionParent);
                }
            }
            return false;
        }
        
        private isInitializerOfForStatement(expressionNode: TypeScript.ISyntaxNode): boolean {
            if (!expressionNode) {
                return false;
            }

            var expressionParent = expressionNode.parent;
            if (expressionParent && expressionParent.kind() == TypeScript.SyntaxKind.ForStatement) {

                var expression = expressionNode;
                var forStatement = <TypeScript.ForStatementSyntax>expressionParent;
                var initializer = forStatement.initializer;
                return initializer === expression;
            }
            else if (expressionParent && expressionParent.kind() == TypeScript.SyntaxKind.CommaExpression) {
                return this.isInitializerOfForStatement(<TypeScript.SyntaxNode>expressionParent);
            }

            return false;
        }

        private isConditionOfForStatement(expressionNode: TypeScript.ISyntaxNode): boolean {
            if (!expressionNode) {
                return false;
            }

            var expressionParent = expressionNode.parent;
            if (expressionParent && expressionParent.kind() == TypeScript.SyntaxKind.ForStatement) {
                var expression = expressionNode;
                var forStatement = <TypeScript.ForStatementSyntax>expressionParent;
                var condition = forStatement.condition;
                return condition === expression;
            }
            else if (expressionParent && expressionParent.kind() == TypeScript.SyntaxKind.CommaExpression) {
                return this.isConditionOfForStatement(<TypeScript.SyntaxNode>expressionParent);
            }

            return false;
        }

        private isIncrememtorOfForStatement(expressionNode: TypeScript.ISyntaxNode): boolean {
            if (!expressionNode) {
                return false;
            }

            var expressionParent = expressionNode.parent;
            if (expressionParent && expressionParent.kind() == TypeScript.SyntaxKind.ForStatement) {
                var expression = expressionNode;
                var forStatement = <TypeScript.ForStatementSyntax>expressionParent;
                var incrementor = forStatement.incrementor;
                return incrementor === expression;
            }
            else if (expressionParent && expressionParent.kind() == TypeScript.SyntaxKind.CommaExpression) {
                return this.isIncrememtorOfForStatement(<TypeScript.SyntaxNode>expressionParent);
            }

            return false;
        }

        private breakpointOfLeftOfCommaExpression(commaExpressionNode: TypeScript.SyntaxNode): SpanInfo {
            var commaExpression = <TypeScript.BinaryExpressionSyntax>commaExpressionNode;
            return this.breakpointSpanOf(commaExpression.left);
        }

        private breakpointOfExpression(expressionNode: TypeScript.SyntaxNode): SpanInfo {
            if (this.isInitializerOfForStatement(expressionNode) ||
                this.isConditionOfForStatement(expressionNode) ||
                this.isIncrememtorOfForStatement(expressionNode)) {
                if (expressionNode.kind() == TypeScript.SyntaxKind.CommaExpression) {
                    return this.breakpointOfLeftOfCommaExpression(expressionNode);
                }
                return createBreakpointSpanInfo(expressionNode);
            }

            if (this.isExpressionOfArrowExpressions(expressionNode)) {
                if (expressionNode.kind() == TypeScript.SyntaxKind.CommaExpression) {
                    return this.breakpointOfLeftOfCommaExpression(expressionNode);
                }
                return createBreakpointSpanInfo(expressionNode);
            }

            if (expressionNode.kind() == TypeScript.SyntaxKind.ExportAssignment) {
                var exportAssignmentSyntax = <TypeScript.ExportAssignmentSyntax>expressionNode;
                return createBreakpointSpanInfo(expressionNode, exportAssignmentSyntax.exportKeyword, exportAssignmentSyntax.equalsToken, exportAssignmentSyntax.identifier);
            }

            return this.breakpointSpanOfContainingNode(expressionNode);
        }

        private breakpointSpanOfStatement(statementNode: TypeScript.SyntaxNode): SpanInfo {
            var statement = statementNode;
            if (statement.kind() == TypeScript.SyntaxKind.EmptyStatement) {
                return null;
            }

            var containingNode = Syntax.containingNode(statementNode);
            if (SyntaxUtilities.isStatement(containingNode)) {
                // Check if not the declarations and the compound statements
                var useNodeForBreakpoint = false;
                switch (containingNode.kind()) {
                    // Declarations
                    case TypeScript.SyntaxKind.ModuleDeclaration:
                    case TypeScript.SyntaxKind.ClassDeclaration:
                    case TypeScript.SyntaxKind.FunctionDeclaration:
                    case TypeScript.SyntaxKind.ConstructorDeclaration:
                    case TypeScript.SyntaxKind.MemberFunctionDeclaration:
                    case TypeScript.SyntaxKind.GetAccessor:
                    case TypeScript.SyntaxKind.SetAccessor:
                    case TypeScript.SyntaxKind.Block:

                    // Compound Statements
                    case TypeScript.SyntaxKind.IfStatement:
                    case TypeScript.SyntaxKind.ElseClause:
                    case TypeScript.SyntaxKind.ForInStatement:
                    case TypeScript.SyntaxKind.ForStatement:
                    case TypeScript.SyntaxKind.WhileStatement:
                    case TypeScript.SyntaxKind.DoStatement:
                    case TypeScript.SyntaxKind.SwitchStatement:
                    case TypeScript.SyntaxKind.CaseSwitchClause:
                    case TypeScript.SyntaxKind.DefaultSwitchClause:
                    case TypeScript.SyntaxKind.WithStatement:
                    case TypeScript.SyntaxKind.TryStatement:
                    case TypeScript.SyntaxKind.CatchClause:
                    case TypeScript.SyntaxKind.FinallyClause:
                    case TypeScript.SyntaxKind.Block:
                        useNodeForBreakpoint = true;
                }

                if (!useNodeForBreakpoint) {
                    return this.breakpointSpanOfContainingNode(statementNode);
                }
            }

            switch (statement.kind()) {
                case TypeScript.SyntaxKind.ExpressionStatement:
                    var expressionSyntax = <TypeScript.ExpressionStatementSyntax>statement;
                    return createBreakpointSpanInfo(expressionSyntax.expression);

                case TypeScript.SyntaxKind.ReturnStatement:
                    var returnStatementSyntax = <TypeScript.ReturnStatementSyntax>statement;
                    return createBreakpointSpanInfo(statementNode, returnStatementSyntax.returnKeyword, returnStatementSyntax.expression);

                case TypeScript.SyntaxKind.ThrowStatement:
                    var throwStatementSyntax = <TypeScript.ThrowStatementSyntax>statement;
                    return createBreakpointSpanInfo(statementNode, throwStatementSyntax.throwKeyword, throwStatementSyntax.expression);

                case TypeScript.SyntaxKind.BreakStatement:
                    var breakStatementSyntax = <TypeScript.BreakStatementSyntax>statement;
                    return createBreakpointSpanInfo(statementNode, breakStatementSyntax.breakKeyword, breakStatementSyntax.identifier);

                case TypeScript.SyntaxKind.ContinueStatement:
                    var continueStatementSyntax = <TypeScript.ContinueStatementSyntax>statement;
                    return createBreakpointSpanInfo(statementNode, continueStatementSyntax.continueKeyword, continueStatementSyntax.identifier);

                case TypeScript.SyntaxKind.DebuggerStatement:
                    var debuggerStatementSyntax = <TypeScript.DebuggerStatementSyntax>statement;
                    return createBreakpointSpanInfo(debuggerStatementSyntax.debuggerKeyword);

                case TypeScript.SyntaxKind.LabeledStatement:
                    var labeledStatementSyntax = <TypeScript.LabeledStatementSyntax>statement;
                    return this.breakpointSpanOf(labeledStatementSyntax.statement);
            }

            return null;
        }

        private getSyntaxListOfDeclarationWithElements(positionedNode: TypeScript.SyntaxNode) {
            var node = positionedNode;
            var elementsList: TypeScript.ISyntaxList<ISyntaxNodeOrToken>;
            var block: TypeScript.BlockSyntax;

            switch (node.kind()) {
                case TypeScript.SyntaxKind.ModuleDeclaration:
                    elementsList = (<TypeScript.ModuleDeclarationSyntax>node).moduleElements;
                    break;

                case TypeScript.SyntaxKind.ClassDeclaration:
                    elementsList = (<TypeScript.ClassDeclarationSyntax>node).classElements;
                    break;

                case TypeScript.SyntaxKind.FunctionDeclaration:
                    block = (<TypeScript.FunctionDeclarationSyntax>node).block;
                    break;

                case TypeScript.SyntaxKind.ConstructorDeclaration:
                    block = (<TypeScript.ConstructorDeclarationSyntax>node).block;
                    break;

                case TypeScript.SyntaxKind.MemberFunctionDeclaration:
                    block = (<TypeScript.MemberFunctionDeclarationSyntax>node).block;
                    break;

                case TypeScript.SyntaxKind.GetAccessor:
                    block = (<TypeScript.GetAccessorSyntax>node).block;
                    break;

                case TypeScript.SyntaxKind.SetAccessor:
                    block = (<TypeScript.SetAccessorSyntax>node).block;
                    break;

                case TypeScript.SyntaxKind.FunctionExpression:
                    block = (<TypeScript.FunctionExpressionSyntax>node).block;
                    break;

                case TypeScript.SyntaxKind.ParenthesizedArrowFunctionExpression:
                    block = (<TypeScript.ParenthesizedArrowFunctionExpressionSyntax>node).block;
                    break;

                case TypeScript.SyntaxKind.SimpleArrowFunctionExpression:
                    block = (<TypeScript.SimpleArrowFunctionExpressionSyntax>node).block;
                    break;

                default:
                    throw TypeScript.Errors.argument('positionNode', 'unknown node kind in getSyntaxListOfDeclarationWithElements');
            }

            var parentElement: TypeScript.ISyntaxElement = positionedNode;
            if (block) {
                parentElement = block;
                elementsList = block.statements;
            }

            return elementsList;
        }

        private canHaveBreakpointInDeclaration(positionedNode: TypeScript.SyntaxNode) {
            return positionedNode && !TypeScript.SyntaxUtilities.isAmbientDeclarationSyntax(positionedNode);
        }

        private breakpointSpanOfDeclarationWithElements(positionedNode: TypeScript.SyntaxNode): SpanInfo {
            if (!this.canHaveBreakpointInDeclaration(positionedNode)) {
                return null;
            }

            // If inside another module the whole declaration is debuggable
            var node = positionedNode;
            var moduleSyntax = <TypeScript.ModuleDeclarationSyntax>positionedNode;
            if ((SyntaxUtilities.isModuleElement(node) && Syntax.containingNode(positionedNode).kind() != TypeScript.SyntaxKind.SourceUnit) ||
                SyntaxUtilities.isClassElement(node) ||
                (moduleSyntax.kind() == TypeScript.SyntaxKind.ModuleDeclaration && moduleSyntax.name
                && moduleSyntax.name.kind() == TypeScript.SyntaxKind.QualifiedName)) {
                return createBreakpointSpanInfo(positionedNode);
            }
            else {
                // Try to get the breakpoint in first element declaration
                return this.breakpointSpanOfFirstChildOfSyntaxList(this.getSyntaxListOfDeclarationWithElements(positionedNode));
            }
        }

        private canHaveBreakpointInVariableDeclarator(varDeclaratorNode: TypeScript.SyntaxNode) {
            if (!varDeclaratorNode || TypeScript.SyntaxUtilities.isAmbientDeclarationSyntax(varDeclaratorNode)) {
                return false;
            }

            var varDeclaratorSyntax = <TypeScript.VariableDeclaratorSyntax>varDeclaratorNode;
            return !!varDeclaratorSyntax.equalsValueClause;
        }

        private breakpointSpanOfVariableDeclarator(varDeclaratorNode: TypeScript.SyntaxNode): SpanInfo {
            if (!this.canHaveBreakpointInVariableDeclarator(varDeclaratorNode)) {
                return null;
            }

            var container = Syntax.containingNode(varDeclaratorNode);
            if (container && container.kind() == TypeScript.SyntaxKind.VariableDeclaration) {
                var parentDeclaratorsList = <TypeScript.ISeparatedSyntaxList<VariableDeclaratorSyntax>>varDeclaratorNode.parent;
                // If this is the first declarator in the list use the declaration instead
                if (parentDeclaratorsList && parentDeclaratorsList.childAt(0) == varDeclaratorNode) {
                    return this.breakpointSpanOfVariableDeclaration(container);
                }

                // Create breakpoint on this var declarator
                if (this.canHaveBreakpointInVariableDeclarator(varDeclaratorNode)) {
                    return createBreakpointSpanInfo(varDeclaratorNode);
                }
                else {
                    return null;
                }
            }
            else if (container) {
                // Member Variable syntax
                return this.breakpointSpanOfMemberVariableDeclaration(container);
            }

            return null;
        }

        private canHaveBreakpointInVariableDeclaration(varDeclarationNode: TypeScript.SyntaxNode) {
            if (!varDeclarationNode || TypeScript.SyntaxUtilities.isAmbientDeclarationSyntax(varDeclarationNode)) {
                return false;
            }

            var varDeclarationSyntax = <TypeScript.VariableDeclarationSyntax>varDeclarationNode;
            var containerChildren = varDeclarationSyntax.variableDeclarators;
            if (!containerChildren || containerChildren.childCount() == 0) {
                return false;
            }

            var child = containerChildren.childAt(0);
            if (isNode(child)) {
                return this.canHaveBreakpointInVariableDeclarator(<TypeScript.SyntaxNode>child);
            }

            return false;
        }

        private breakpointSpanOfVariableDeclaration(varDeclarationNode: TypeScript.SyntaxNode): SpanInfo {
            if (!this.canHaveBreakpointInDeclaration(varDeclarationNode)) {
                return null;
            }

            var container = Syntax.containingNode(varDeclarationNode);
            var varDeclarationSyntax = <TypeScript.VariableDeclarationSyntax>varDeclarationNode;
            var varDeclarators = varDeclarationSyntax.variableDeclarators;
            var varDeclaratorsCount = varDeclarators.childCount(); // varDeclarators has to be non null because its checked in canHaveBreakpoint

            if (container && container.kind() == TypeScript.SyntaxKind.VariableStatement) {
                return this.breakpointSpanOfVariableStatement(container);
            }

            if (this.canHaveBreakpointInVariableDeclaration(varDeclarationNode)) {
                return createBreakpointSpanInfoWithLimChar(varDeclarationNode, end(varDeclarators.childAt(0)));
            }
            else {
                return null;
            }
        }

        private canHaveBreakpointInVariableStatement(varStatementNode: TypeScript.SyntaxNode) {
            if (!varStatementNode || TypeScript.SyntaxUtilities.isAmbientDeclarationSyntax(varStatementNode)) {
                return false;
            }

            var variableStatement = <TypeScript.VariableStatementSyntax>varStatementNode;
            return this.canHaveBreakpointInVariableDeclaration(<TypeScript.SyntaxNode>variableStatement.variableDeclaration);
        }

        private breakpointSpanOfVariableStatement(varStatementNode: TypeScript.SyntaxNode): SpanInfo {
            if (!this.canHaveBreakpointInVariableStatement(varStatementNode)) {
                return null;
            }

            var variableStatement = <TypeScript.VariableStatementSyntax>varStatementNode;
            var variableDeclaration = <TypeScript.SyntaxNode>variableStatement.variableDeclaration;
            var varDeclarationSyntax = <TypeScript.VariableDeclarationSyntax>variableDeclaration;
            var varDeclarators = varDeclarationSyntax.variableDeclarators;
            return createBreakpointSpanInfoWithLimChar(varStatementNode, end(varDeclarators.childAt(0)));
        }

        private breakpointSpanOfParameter(parameterNode: TypeScript.SyntaxNode): SpanInfo {
            if (TypeScript.SyntaxUtilities.isAmbientDeclarationSyntax(parameterNode)) {
                return null;
            }

            var parameterSyntax = <TypeScript.ParameterSyntax>parameterNode;
            if (parameterSyntax.dotDotDotToken || parameterSyntax.equalsValueClause || parameterSyntax.modifiers.childCount() > 0) {
                return createBreakpointSpanInfo(parameterNode);
            }
            else {
                return null;
            }
        }

        private breakpointSpanOfMemberVariableDeclaration(memberVarDeclarationNode: TypeScript.SyntaxNode): SpanInfo {
            if (TypeScript.SyntaxUtilities.isAmbientDeclarationSyntax(memberVarDeclarationNode)) {
                return null;
            }

            var memberVariableDeclaration = <TypeScript.MemberVariableDeclarationSyntax>memberVarDeclarationNode;
            if (this.canHaveBreakpointInVariableDeclarator(<TypeScript.SyntaxNode>memberVariableDeclaration.variableDeclarator)) {
                return createBreakpointSpanInfo(memberVarDeclarationNode, memberVariableDeclaration.modifiers, memberVariableDeclaration.variableDeclarator);
            }
            else {
                return null;
            }
        }

        private breakpointSpanOfImportDeclaration(importDeclarationNode: TypeScript.SyntaxNode): SpanInfo {
            if (TypeScript.SyntaxUtilities.isAmbientDeclarationSyntax(importDeclarationNode)) {
                return null;
            }

            var importSyntax = <TypeScript.ImportDeclarationSyntax>importDeclarationNode;
            return createBreakpointSpanInfo(importDeclarationNode, importSyntax.modifiers, importSyntax.importKeyword, importSyntax.identifier, importSyntax.equalsToken, importSyntax.moduleReference);
        }

        private breakpointSpanOfEnumDeclaration(enumDeclarationNode: TypeScript.SyntaxNode): SpanInfo {
            if (!this.canHaveBreakpointInDeclaration(enumDeclarationNode)) {
                return null;
            }

            return createBreakpointSpanInfo(enumDeclarationNode);
        }

        private breakpointSpanOfFirstEnumElement(enumDeclarationNode: TypeScript.SyntaxNode): SpanInfo {
            var enumDeclarationSyntax = <TypeScript.EnumDeclarationSyntax>enumDeclarationNode;
            var enumElements = enumDeclarationSyntax.enumElements;
            if (enumElements && enumElements.childCount()) {
                return this.breakpointSpanOf(enumElements.childAt(0));
            }

            return null;
        }

        private breakpointSpanOfEnumElement(enumElementNode: TypeScript.SyntaxNode): SpanInfo {
            if (TypeScript.SyntaxUtilities.isAmbientDeclarationSyntax(enumElementNode)) {
                return null;
            }

            return createBreakpointSpanInfo(enumElementNode);
        }

        private breakpointSpanOfIfStatement(ifStatementNode: TypeScript.SyntaxNode): SpanInfo {
            var ifStatement = <TypeScript.IfStatementSyntax>ifStatementNode;
            return createBreakpointSpanInfo(ifStatementNode, ifStatement.ifKeyword, ifStatement.openParenToken, ifStatement.condition, ifStatement.closeParenToken);
        }

        private breakpointSpanOfElseClause(elseClauseNode: TypeScript.SyntaxNode): SpanInfo {
            var elseClause = <TypeScript.ElseClauseSyntax>elseClauseNode;
            return this.breakpointSpanOf(elseClause.statement);
        }

        private breakpointSpanOfForInStatement(forInStatementNode: TypeScript.SyntaxNode): SpanInfo {
            var forInStatement = <TypeScript.ForInStatementSyntax>forInStatementNode;
            return createBreakpointSpanInfo(forInStatementNode, forInStatement.forKeyword, forInStatement.openParenToken, forInStatement.variableDeclaration,
                forInStatement.left, forInStatement.inKeyword, forInStatement.expression, forInStatement.closeParenToken);
        }

        private breakpointSpanOfForStatement(forStatementNode: TypeScript.SyntaxNode): SpanInfo {
            var forStatement = <TypeScript.ForStatementSyntax>forStatementNode;
            return this.breakpointSpanOf(forStatement.variableDeclaration
                ? <TypeScript.ISyntaxElement>forStatement.variableDeclaration
                : forStatement.initializer);
        }

        private breakpointSpanOfWhileStatement(whileStatementNode: TypeScript.SyntaxNode): SpanInfo {
            var whileStatement = <TypeScript.WhileStatementSyntax>whileStatementNode;
            return createBreakpointSpanInfo(whileStatementNode, whileStatement.whileKeyword, whileStatement.openParenToken, whileStatement.condition, whileStatement.closeParenToken);
        }

        private breakpointSpanOfDoStatement(doStatementNode: TypeScript.SyntaxNode): SpanInfo {
            var doStatement = <TypeScript.DoStatementSyntax>doStatementNode;
            return createBreakpointSpanInfo(doStatementNode, doStatement.whileKeyword, doStatement.openParenToken, doStatement.condition, doStatement.closeParenToken);
        }

        private breakpointSpanOfSwitchStatement(switchStatementNode: TypeScript.SyntaxNode): SpanInfo {
            var switchStatement = <TypeScript.SwitchStatementSyntax>switchStatementNode;
            return createBreakpointSpanInfo(switchStatementNode, switchStatement.switchKeyword, switchStatement.openParenToken, switchStatement.expression, switchStatement.closeParenToken);
        }

        private breakpointSpanOfFirstStatementOfFirstCaseClause(switchStatementNode: TypeScript.SyntaxNode): SpanInfo {
            var switchStatement = <TypeScript.SwitchStatementSyntax>switchStatementNode;
            if (switchStatement.switchClauses && switchStatement.switchClauses.childCount() == 0) {
                return null;
            }

            var switchClauses = switchStatement.switchClauses;
            if (switchClauses.childCount() == 0) {
                return null;
            }

            var firstCaseClause = switchClauses.childAt(0);
            var statements = firstCaseClause.statements;

            return this.breakpointSpanOfFirstChildOfSyntaxList(statements);
        }

        private breakpointSpanOfLastStatementOfLastCaseClause(switchStatementNode: TypeScript.SyntaxNode): SpanInfo {
            var switchStatement = <TypeScript.SwitchStatementSyntax>switchStatementNode;
            if (switchStatement.switchClauses && switchStatement.switchClauses.childCount() == 0) {
                return null;
            }

            var switchClauses = switchStatement.switchClauses;
            if (switchClauses.childCount() == 0) {
                return null;
            }

            var lastClauseNode = switchClauses.childAt(switchClauses.childCount() - 1);
            var statements = lastClauseNode.statements;

            return this.breakpointSpanOfLastChildOfSyntaxList(statements);
        }

        private breakpointSpanOfCaseSwitchClause(caseClauseNode: TypeScript.SyntaxNode): SpanInfo {
            var caseSwitchClause = <TypeScript.CaseSwitchClauseSyntax>caseClauseNode;
            return this.breakpointSpanOfFirstChildOfSyntaxList(caseSwitchClause.statements);
        }

        private breakpointSpanOfDefaultSwitchClause(defaultSwithClauseNode: TypeScript.SyntaxNode): SpanInfo {
            var defaultSwitchClause = <TypeScript.DefaultSwitchClauseSyntax>defaultSwithClauseNode;
            return this.breakpointSpanOfFirstChildOfSyntaxList(defaultSwitchClause.statements);
        }

        private breakpointSpanOfWithStatement(withStatementNode: TypeScript.SyntaxNode): SpanInfo {
            var withStatement = <TypeScript.WithStatementSyntax>withStatementNode;
            return this.breakpointSpanOf(withStatement.statement);
        }

        private breakpointSpanOfTryStatement(tryStatementNode: TypeScript.SyntaxNode): SpanInfo {
            var tryStatement = <TypeScript.TryStatementSyntax>tryStatementNode;
            return this.breakpointSpanOfFirstStatementInBlock(<TypeScript.SyntaxNode>tryStatement.block);
        }

        private breakpointSpanOfCatchClause(catchClauseNode: TypeScript.SyntaxNode): SpanInfo {
            var catchClause = <TypeScript.CatchClauseSyntax>catchClauseNode;
            return createBreakpointSpanInfo(catchClauseNode, catchClause.catchKeyword, catchClause.openParenToken, catchClause.identifier, catchClause.typeAnnotation, catchClause.closeParenToken);
        }

        private breakpointSpanOfFinallyClause(finallyClauseNode: TypeScript.SyntaxNode): SpanInfo {
            var finallyClause = <TypeScript.FinallyClauseSyntax>finallyClauseNode;
            return this.breakpointSpanOfFirstStatementInBlock(<TypeScript.SyntaxNode>finallyClause.block);
        }

        private breakpointSpanOfParenthesizedArrowFunctionExpression(arrowFunctionExpression: ParenthesizedArrowFunctionExpressionSyntax): SpanInfo {
            if (arrowFunctionExpression.block) {
                return this.breakpointSpanOfFirstStatementInBlock(arrowFunctionExpression.block);
            }
            else {
                return this.breakpointSpanOf(arrowFunctionExpression.expression);
            }
        }

        private breakpointSpanOfSimpleArrowFunctionExpression(arrowFunctionExpression: SimpleArrowFunctionExpressionSyntax): SpanInfo {
            if (arrowFunctionExpression.block) {
                return this.breakpointSpanOfFirstStatementInBlock(arrowFunctionExpression.block);
            }
            else {
                return this.breakpointSpanOf(arrowFunctionExpression.expression);
            }
        }

        private breakpointSpanOfContainingNode(positionedElement: ISyntaxElement): SpanInfo {
            var current = positionedElement.parent;
            while (!isNode(current)) {
                current = current.parent;
            }

            return this.breakpointSpanOf(current);
        }

        private breakpointSpanIfStartsOnSameLine(positionedElement: TypeScript.ISyntaxElement): SpanInfo {
            if (positionedElement && this.posLine == this.lineMap.getLineNumberFromPosition(start(positionedElement))) {
                return this.breakpointSpanOf(positionedElement);
            }

            return null;
        }

        public breakpointSpanOf(positionedElement: TypeScript.ISyntaxElement): SpanInfo {
            if (!positionedElement) {
                return null;
            }

            for (var containingNode = Syntax.containingNode(positionedElement); containingNode != null; containingNode = Syntax.containingNode(containingNode)) {
                if (containingNode.kind() == TypeScript.SyntaxKind.TypeAnnotation) {
                    return this.breakpointSpanIfStartsOnSameLine(containingNode);
                }
            }

            var element = positionedElement;

            // Syntax node
            if (isNode(element)) {
                return this.breakpointSpanOfNode(<TypeScript.SyntaxNode>positionedElement);
            }

            // Token
            if (isToken(element)) {
                return this.breakpointSpanOfToken(<TypeScript.ISyntaxToken>positionedElement);
            }

            // List
            // Separated List 
            return this.breakpointSpanOfContainingNode(positionedElement);
        }
    }

    export function getBreakpointLocation(syntaxTree: TypeScript.SyntaxTree, askedPos: number): SpanInfo {
        // Cannot set breakpoint in dts file
        if (TypeScript.isDTSFile(syntaxTree.fileName())) {
            return null;
        }

        var sourceUnit = syntaxTree.sourceUnit();
        var positionedToken = TypeScript.Syntax.findToken(sourceUnit, askedPos);

        var lineMap = syntaxTree.lineMap();
        var posLine = lineMap.getLineNumberFromPosition(askedPos);
        var tokenStartLine = lineMap.getLineNumberFromPosition(start(positionedToken));
        if (posLine < tokenStartLine) {
            return null;
        }

        var breakpointResolver = new BreakpointResolver(posLine, lineMap);
        return breakpointResolver.breakpointSpanOf(positionedToken);
    }
}