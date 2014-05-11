///<reference path='references.ts' />

module TypeScript.Syntax {
    export var _nextSyntaxID: number = 1;

    export function getStandaloneExpression(positionedToken: ISyntaxToken): ISyntaxNodeOrToken {
        var token = positionedToken;
        if (positionedToken !== null && positionedToken.kind() === SyntaxKind.IdentifierName) {
            var parentPositionedNode = containingNode(positionedToken);
            var parentNode = containingNode(parentPositionedNode);

            if (parentNode.kind() === SyntaxKind.QualifiedName && (<QualifiedNameSyntax>parentNode).right === token) {
                return parentPositionedNode;
            }
            else if (parentNode.kind() === SyntaxKind.MemberAccessExpression && (<MemberAccessExpressionSyntax>parentNode).name === token) {
                return parentPositionedNode;
            }
        }

        return positionedToken;
    }

    export function isInModuleOrTypeContext(positionedToken: ISyntaxToken): boolean {
        if (positionedToken !== null) {
            var positionedNodeOrToken = getStandaloneExpression(positionedToken);
            var parent = containingNode(positionedNodeOrToken);

            if (parent !== null) {
                switch (parent.kind()) {
                    case SyntaxKind.ModuleNameModuleReference:
                        return true;
                    case SyntaxKind.QualifiedName:
                        // left of QN is namespace or type.  Note: when you have "a.b.c()", then
                        // "a.b" is not a qualified name, it is a member access expression.
                        // Qualified names are only parsed when the parser knows it's a type only
                        // context.
                        return true;
                    default:
                        return isInTypeOnlyContext(positionedToken);
                }
            }
        }

        return false;
    }

    export function isInTypeOnlyContext(positionedToken: ISyntaxToken): boolean {
        var positionedNodeOrToken = getStandaloneExpression(positionedToken);
        var positionedParent = containingNode(positionedNodeOrToken);

        var parent = containingNode(positionedParent);
        var nodeOrToken = positionedNodeOrToken;

        if (parent !== null) {
            switch (parent.kind()) {
                case SyntaxKind.ArrayType:
                    return (<ArrayTypeSyntax>parent).type === nodeOrToken;
                case SyntaxKind.CastExpression:
                    return (<CastExpressionSyntax>parent).type === nodeOrToken;
                case SyntaxKind.TypeAnnotation:
                case SyntaxKind.ExtendsHeritageClause:
                case SyntaxKind.ImplementsHeritageClause:
                case SyntaxKind.TypeArgumentList:
                    return true;
                // TODO: add more cases if necessary.  This list may not be complete.
            }
        }

        return false;
    }

    export function childOffset(parent: ISyntaxElement, child: ISyntaxElement) {
        var offset = 0;
        for (var i = 0, n = childCount(parent); i < n; i++) {
            var current = childAt(parent, i);
            if (current === child) {
                return offset;
            }

            if (current !== null) {
                offset += fullWidth(current);
            }
        }

        throw Errors.invalidOperation();
    }

    export function childOffsetAt(parent: ISyntaxElement, index: number) {
        var offset = 0;
        for (var i = 0; i < index; i++) {
            var current = childAt(parent, i);
            if (current !== null) {
                offset += fullWidth(current);
            }
        }

        return offset;
    }

    export function childIndex(parent: ISyntaxElement, child: ISyntaxElement) {
        for (var i = 0, n = childCount(parent); i < n; i++) {
            var current = childAt(parent, i);
            if (current === child) {
                return i;
            }
        }

        throw Errors.invalidOperation();
    }

    export function identifierName(text: string, info: ITokenInfo = null): ISyntaxToken {
        return identifier(text);
    }

    export function trueExpression(): IUnaryExpressionSyntax {
        return Syntax.token(SyntaxKind.TrueKeyword);
    }

    export function falseExpression(): IUnaryExpressionSyntax {
        return Syntax.token(SyntaxKind.FalseKeyword);
    }

    export function numericLiteralExpression(text: string): IUnaryExpressionSyntax {
        return Syntax.token(SyntaxKind.NumericLiteral, { text: text });
    }

    export function stringLiteralExpression(text: string): IUnaryExpressionSyntax {
        return Syntax.token(SyntaxKind.StringLiteral, { text: text });
    }

    export function isSuperInvocationExpression(node: IExpressionSyntax): boolean {
        return node.kind() === SyntaxKind.InvocationExpression &&
            (<InvocationExpressionSyntax>node).expression.kind() === SyntaxKind.SuperKeyword;
    }

    export function isSuperInvocationExpressionStatement(node: ISyntaxNode): boolean {
        return node.kind() === SyntaxKind.ExpressionStatement &&
            isSuperInvocationExpression((<ExpressionStatementSyntax>node).expression);
    }

    export function isSuperMemberAccessExpression(node: IExpressionSyntax): boolean {
        return node.kind() === SyntaxKind.MemberAccessExpression &&
            (<MemberAccessExpressionSyntax>node).expression.kind() === SyntaxKind.SuperKeyword;
    }

    export function isSuperMemberAccessInvocationExpression(node: ISyntaxNode): boolean {
        return node.kind() === SyntaxKind.InvocationExpression &&
            isSuperMemberAccessExpression((<InvocationExpressionSyntax>node).expression);
    }

    //export function assignmentExpression(left: IExpressionSyntax, token: ISyntaxToken, right: IExpressionSyntax): BinaryExpressionSyntax {
    //    return new BinaryExpressionSyntax(SyntaxKind.AssignmentExpression, left, token, right);
    //}

    export function nodeHasSkippedOrMissingTokens(node: ISyntaxNode): boolean {
        for (var i = 0; i < childCount(node); i++) {
            var child = childAt(node, i);
            if (isToken(child)) {
                var token = <ISyntaxToken>child;
                // If a token is skipped, return true. Or if it is a missing token. The only empty token that is not missing is EOF
                if (token.hasSkippedToken() || (width(token) === 0 && token.kind() !== SyntaxKind.EndOfFileToken)) {
                    return true;
                }
            }
        }

        return false;
    }

    export function isUnterminatedStringLiteral(token: ISyntaxToken): boolean {
        if (token && token.kind() === SyntaxKind.StringLiteral) {
            var text = token.text();
            return text.length < 2 || text.charCodeAt(text.length - 1) !== text.charCodeAt(0);
        }

        return false;
    }

    export function isUnterminatedMultilineCommentTrivia(trivia: ISyntaxTrivia): boolean {
        if (trivia && trivia.kind() === SyntaxKind.MultiLineCommentTrivia) {
            var text = trivia.fullText();
            return text.length < 4 || text.substring(text.length - 2) !== "*/";
        }
        return false;
    }

    export function isEntirelyInsideCommentTrivia(trivia: ISyntaxTrivia, fullStart: number, position: number): boolean {
        if (trivia && trivia.isComment() && position > fullStart) {
            var end = fullStart + trivia.fullWidth();
            if (position < end) {
                return true;
            }
            else if (position === end) {
                return trivia.kind() === SyntaxKind.SingleLineCommentTrivia || isUnterminatedMultilineCommentTrivia(trivia);
            }
        }

        return false;
    }

    export function isEntirelyInsideComment(sourceUnit: SourceUnitSyntax, position: number): boolean {
        var positionedToken = findToken(sourceUnit, position);
        var fullStart = positionedToken.fullStart();
        var triviaList: ISyntaxTriviaList = null;
        var lastTriviaBeforeToken: ISyntaxTrivia = null;

        if (positionedToken.kind() === SyntaxKind.EndOfFileToken) {
            // Check if the trivia is leading on the EndOfFile token
            if (positionedToken.hasLeadingTrivia()) {
                triviaList = positionedToken.leadingTrivia();
            }
            // Or trailing on the previous token
            else {
                positionedToken = previousToken(positionedToken);
                if (positionedToken) {
                    if (positionedToken && positionedToken.hasTrailingTrivia()) {
                        triviaList = positionedToken.trailingTrivia();
                        fullStart = end(positionedToken);
                    }
                }
            }
        }
        else {
            if (position <= (fullStart + positionedToken.leadingTriviaWidth())) {
                triviaList = positionedToken.leadingTrivia();
            }
            else if (position >= (fullStart + width(positionedToken))) {
                triviaList = positionedToken.trailingTrivia();
                fullStart = end(positionedToken);
            }
        }

        if (triviaList) {
            // Try to find the trivia matching the position
            for (var i = 0, n = triviaList.count(); i < n; i++) {
                var trivia = triviaList.syntaxTriviaAt(i);
                if (position <= fullStart) {
                    // Moved passed the trivia we need
                    break;
                }
                else if (position <= fullStart + trivia.fullWidth() && trivia.isComment()) {
                    // Found the comment trivia we were looking for
                    lastTriviaBeforeToken = trivia;
                    break;
                }

                fullStart += trivia.fullWidth();
            }
        }

        return lastTriviaBeforeToken && isEntirelyInsideCommentTrivia(lastTriviaBeforeToken, fullStart, position);
    }

    export function isEntirelyInStringOrRegularExpressionLiteral(sourceUnit: SourceUnitSyntax, position: number): boolean {
        var positionedToken = findToken(sourceUnit, position);

        if (positionedToken) {
            if (positionedToken.kind() === SyntaxKind.EndOfFileToken) {
                // EndOfFile token, enusre it did not follow an unterminated string literal
                positionedToken = previousToken(positionedToken);
                return positionedToken && positionedToken.trailingTriviaWidth() === 0 && isUnterminatedStringLiteral(positionedToken);
            }
            else if (position > start(positionedToken)) {
                // Ensure position falls enterily within the literal if it is terminated, or the line if it is not
                return (position < end(positionedToken) && (positionedToken.kind() === TypeScript.SyntaxKind.StringLiteral || positionedToken.kind() === TypeScript.SyntaxKind.RegularExpressionLiteral)) ||
                    (position <= end(positionedToken) && isUnterminatedStringLiteral(positionedToken));
            }
        }

        return false;
    }

    function findSkippedTokenOnLeftInTriviaList(positionedToken: ISyntaxToken, position: number, lookInLeadingTriviaList: boolean): ISyntaxToken {
        var triviaList: TypeScript.ISyntaxTriviaList = null;
        var fullEnd: number;

        if (lookInLeadingTriviaList) {
            triviaList = positionedToken.leadingTrivia();
            fullEnd = positionedToken.fullStart() + triviaList.fullWidth();
        }
        else {
            triviaList = positionedToken.trailingTrivia();
            fullEnd = TypeScript.fullEnd(positionedToken);
        }

        if (triviaList && triviaList.hasSkippedToken()) {
            for (var i = triviaList.count() - 1; i >= 0; i--) {
                var trivia = triviaList.syntaxTriviaAt(i);
                var triviaWidth = trivia.fullWidth();

                if (trivia.isSkippedToken() && position >= fullEnd) {
                    return trivia.skippedToken();
                }

                fullEnd -= triviaWidth;
            }
        }

        return null;
    }

    export function findSkippedTokenOnLeft(positionedToken: ISyntaxToken, position: number): ISyntaxToken {
        var positionInLeadingTriviaList = (position < start(positionedToken));
        return findSkippedTokenOnLeftInTriviaList(positionedToken, position, /*lookInLeadingTriviaList*/ positionInLeadingTriviaList);
    }

    export function getAncestorOfKind(positionedToken: ISyntaxElement, kind: SyntaxKind): ISyntaxElement {
        while (positionedToken && positionedToken.parent) {
            if (positionedToken.parent.kind() === kind) {
                return positionedToken.parent;
            }

            positionedToken = positionedToken.parent;
        }

        return null;
    }

    export function hasAncestorOfKind(positionedToken: ISyntaxElement, kind: SyntaxKind): boolean {
        return getAncestorOfKind(positionedToken, kind) !== null;
    }

    export function isIntegerLiteral(expression: IExpressionSyntax): boolean {
        if (expression) {
            switch (expression.kind()) {
                case SyntaxKind.PlusExpression:
                case SyntaxKind.NegateExpression:
                    // Note: if there is a + or - sign, we can only allow a normal integer following
                    // (and not a hex integer).  i.e. -0xA is a legal expression, but it is not a 
                    // *literal*.
                    expression = (<PrefixUnaryExpressionSyntax>expression).operand;
                    return isToken(expression) && IntegerUtilities.isInteger((<ISyntaxToken>expression).text());

                case SyntaxKind.NumericLiteral:
                    // If it doesn't have a + or -, then either an integer literal or a hex literal
                    // is acceptable.
                    var text = (<ISyntaxToken> expression).text();
                    return IntegerUtilities.isInteger(text) || IntegerUtilities.isHexInteger(text);
            }
        }

        return false;
    }

    export function containingNode(element: ISyntaxElement): ISyntaxNode {
        var current = element.parent;

        while (current !== null && !isNode(current)) {
            current = current.parent;
        }

        return <ISyntaxNode>current;
    }

    export function findTokenOnLeft(element: ISyntaxElement, position: number, includeSkippedTokens: boolean = false): ISyntaxToken {
        var positionedToken = findToken(element, position, /*includeSkippedTokens*/ false);
        var _start = start(positionedToken);

        // Position better fall within this token.
        // Debug.assert(position >= positionedToken.fullStart());
        // Debug.assert(position < positionedToken.fullEnd() || positionedToken.token().tokenKind === SyntaxKind.EndOfFileToken);

        if (includeSkippedTokens) {
            positionedToken = findSkippedTokenOnLeft(positionedToken, position) || positionedToken;
        }

        // if position is after the start of the token, then this token is the token on the left.
        if (position > _start) {
            return positionedToken;
        }

        // we're in the trivia before the start of the token.  Need to return the previous token.
        if (positionedToken.fullStart() === 0) {
            // Already on the first token.  Nothing before us.
            return null;
        }

        return previousToken(positionedToken, includeSkippedTokens);
    }

    export function findCompleteTokenOnLeft(element: ISyntaxElement, position: number, includeSkippedTokens: boolean = false): ISyntaxToken {
        var positionedToken = findToken(element, position, /*includeSkippedTokens*/ false);

        // Position better fall within this token.
        // Debug.assert(position >= positionedToken.fullStart());
        // Debug.assert(position < positionedToken.fullEnd() || positionedToken.token().tokenKind === SyntaxKind.EndOfFileToken);

        if (includeSkippedTokens) {
            positionedToken = findSkippedTokenOnLeft(positionedToken, position) || positionedToken;
        }

        // if position is after the end of the token, then this token is the token on the left.
        if (width(positionedToken) > 0 && position >= end(positionedToken)) {
            return positionedToken;
        }

        return previousToken(positionedToken, includeSkippedTokens);
    }

    export function firstTokenInLineContainingPosition(syntaxTree: SyntaxTree, position: number): ISyntaxToken {
        var current = findToken(syntaxTree.sourceUnit(), position);
        while (true) {
            if (isFirstTokenInLine(current, syntaxTree.lineMap())) {
                break;
            }

            current = previousToken(current);
        }

        return current;
    }

    function isFirstTokenInLine(token: ISyntaxToken, lineMap: LineMap): boolean {
        var _previousToken = previousToken(token);
        if (_previousToken === null) {
            return true;
        }
        
        return lineMap.getLineNumberFromPosition(end(_previousToken)) !== lineMap.getLineNumberFromPosition(start(token));
    }
}