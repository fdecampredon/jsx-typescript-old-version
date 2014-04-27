///<reference path='references.ts' />

module TypeScript.Syntax {
    export var _nextSyntaxID: number = 1;

    export function setParentForChildren(element: ISyntaxElement): void {
        for (var i = 0, n = element.childCount(); i < n; i++) {
            var child = element.childAt(i);

            // Don't set the parent for this child if it is a shared child.  This child can be 
            // found under multiple parents, and thus has no valid 'parent' reference.
            if (child && !child.isShared()) {
                child.parent = element;
            }
        }
    }

    export function emptySourceUnit() {
        return Syntax.normalModeFactory.sourceUnit(Syntax.emptyList<IModuleElementSyntax>(), Syntax.token(SyntaxKind.EndOfFileToken, { text: "" }, 0));
    }

    export function getStandaloneExpression(positionedToken: ISyntaxToken): ISyntaxNodeOrToken {
        var token = positionedToken;
        if (positionedToken !== null && positionedToken.kind() === SyntaxKind.IdentifierName) {
            var parentPositionedNode = Syntax.containingNode(positionedToken);
            var parentNode = Syntax.containingNode(parentPositionedNode);

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
            var positionedNodeOrToken = Syntax.getStandaloneExpression(positionedToken);
            var parent = Syntax.containingNode(positionedNodeOrToken);

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
        var positionedNodeOrToken = Syntax.getStandaloneExpression(positionedToken);
        var positionedParent = Syntax.containingNode(positionedNodeOrToken);

        var parent = Syntax.containingNode(positionedParent);
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
        for (var i = 0, n = parent.childCount(); i < n; i++) {
            var current = parent.childAt(i);
            if (current === child) {
                return offset;
            }

            if (current !== null) {
                offset += current.fullWidth();
            }
        }

        throw Errors.invalidOperation();
    }

    export function childOffsetAt(parent: ISyntaxElement, index: number) {
        var offset = 0;
        for (var i = 0; i < index; i++) {
            var current = parent.childAt(i);
            if (current !== null) {
                offset += current.fullWidth();
            }
        }

        return offset;
    }

    export function childIndex(parent: ISyntaxElement, child: ISyntaxElement) {
        for (var i = 0, n = parent.childCount(); i < n; i++) {
            var current = parent.childAt(i);
            if (current === child) {
                return i;
            }
        }

        throw Errors.invalidOperation();
    }

    export function nodeStructuralEquals(node1: SyntaxNode, node2: SyntaxNode): boolean {
        if (node1 === null) {
            return node2 === null;
        }

        return node1.structuralEquals(node2);
    }

    export function nodeOrTokenStructuralEquals(node1: ISyntaxNodeOrToken, node2: ISyntaxNodeOrToken): boolean {
        if (node1 === node2) {
            return true;
        }

        if (node1 === null || node2 === null) {
            return false;
        }

        if (node1.isToken()) {
            return node2.isToken() ? tokenStructuralEquals(<ISyntaxToken>node1, <ISyntaxToken>node2) : false;
        }

        return node2.isNode() ? nodeStructuralEquals(<SyntaxNode>node1, <SyntaxNode>node2) : false;
    }

    export function tokenStructuralEquals(token1: ISyntaxToken, token2: ISyntaxToken): boolean {
        if (token1 === token2) {
            return true;
        }

        if (token1 === null || token2 === null) {
            return false;
        }

        return token1.kind() === token2.kind() &&
            token1.width() === token2.width() &&
            token1.fullWidth() === token2.fullWidth() &&
            token1.fullStart() === token2.fullStart() &&
            token1.fullEnd() === token2.fullEnd() &&
            token1.start() === token2.start() &&
            token1.end() === token2.end() &&
            token1.text() === token2.text() &&
            Syntax.triviaListStructuralEquals(token1.leadingTrivia(), token2.leadingTrivia()) &&
            Syntax.triviaListStructuralEquals(token1.trailingTrivia(), token2.trailingTrivia());
    }

    export function triviaListStructuralEquals(triviaList1: ISyntaxTriviaList, triviaList2: ISyntaxTriviaList): boolean {
        if (triviaList1.count() !== triviaList2.count()) {
            return false;
        }

        for (var i = 0, n = triviaList1.count(); i < n; i++) {
            if (!Syntax.triviaStructuralEquals(triviaList1.syntaxTriviaAt(i), triviaList2.syntaxTriviaAt(i))) {
                return false;
            }
        }

        return true;
    }

    export function triviaStructuralEquals(trivia1: ISyntaxTrivia, trivia2: ISyntaxTrivia): boolean {
        return trivia1.kind() === trivia2.kind() &&
            trivia1.fullWidth() === trivia2.fullWidth() &&
            trivia1.fullText() === trivia2.fullText();
    }

    export function listStructuralEquals<T extends ISyntaxNodeOrToken>(list1: ISyntaxList<T>, list2: ISyntaxList<T>): boolean {
        if (list1.childCount() !== list2.childCount()) {
            return false;
        }

        for (var i = 0, n = list1.childCount(); i < n; i++) {
            var child1 = list1.childAt(i);
            var child2 = list2.childAt(i);

            if (!Syntax.nodeOrTokenStructuralEquals(child1, child2)) {
                return false;
            }
        }

        return true;
    }

    export function separatedListStructuralEquals<T extends ISyntaxNodeOrToken>(list1: ISeparatedSyntaxList<T>, list2: ISeparatedSyntaxList<T>): boolean {
        if (list1.childCount() !== list2.childCount()) {
            return false;
        }

        for (var i = 0, n = list1.childCount(); i < n; i++) {
            var element1 = list1.childAt(i);
            var element2 = list2.childAt(i);
            if (!Syntax.nodeOrTokenStructuralEquals(element1, element2)) {
                return false;
            }
        }

        return true;
    }

    export function elementStructuralEquals(element1: ISyntaxElement, element2: ISyntaxElement) {
        if (element1 === element2) {
            return true;
        }

        if (element1 === null || element2 === null) {
            return false;
        }

        if (element2.kind() !== element2.kind()) {
            return false;
        }

        if (element1.fullStart() !== element2.fullStart()) {
            return false;
        }

        if (element1.start() !== element2.start()) {
            return false;
        }

        if (element1.end() !== element2.end()) {
            return false;
        }

        if (element1.fullEnd() !== element2.fullEnd()) {
            return false;
        }

        if (element1.isToken()) {
            return tokenStructuralEquals(<ISyntaxToken>element1, <ISyntaxToken>element2);
        }
        else if (element1.isNode()) {
            return nodeStructuralEquals(<SyntaxNode>element1, <SyntaxNode>element2);
        }
        else if (element1.isList()) {
            return listStructuralEquals(<ISyntaxList<ISyntaxNodeOrToken>>element1, <ISyntaxList<ISyntaxNodeOrToken>>element2);
        }
        else if (element1.isSeparatedList()) {
            return separatedListStructuralEquals(<ISeparatedSyntaxList<ISyntaxNodeOrToken>>element1, <ISeparatedSyntaxList<ISyntaxNodeOrToken>>element2);
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

    export function isSuperInvocationExpressionStatement(node: SyntaxNode): boolean {
        return node.kind() === SyntaxKind.ExpressionStatement &&
            isSuperInvocationExpression((<ExpressionStatementSyntax>node).expression);
    }

    export function isSuperMemberAccessExpression(node: IExpressionSyntax): boolean {
        return node.kind() === SyntaxKind.MemberAccessExpression &&
            (<MemberAccessExpressionSyntax>node).expression.kind() === SyntaxKind.SuperKeyword;
    }

    export function isSuperMemberAccessInvocationExpression(node: SyntaxNode): boolean {
        return node.kind() === SyntaxKind.InvocationExpression &&
            isSuperMemberAccessExpression((<InvocationExpressionSyntax>node).expression);
    }

    export function assignmentExpression(left: IExpressionSyntax, token: ISyntaxToken, right: IExpressionSyntax): BinaryExpressionSyntax {
        return Syntax.normalModeFactory.binaryExpression(SyntaxKind.AssignmentExpression, left, token, right);
    }

    export function nodeHasSkippedOrMissingTokens(node: SyntaxNode): boolean {
        for (var i = 0; i < node.childCount(); i++) {
            var child = node.childAt(i);
            if (child !== null && child.isToken()) {
                var token = <ISyntaxToken>child;
                // If a token is skipped, return true. Or if it is a missing token. The only empty token that is not missing is EOF
                if (token.hasSkippedToken() || (token.width() === 0 && token.kind() !== SyntaxKind.EndOfFileToken)) {
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
        var positionedToken = sourceUnit.findToken(position);
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
                positionedToken = positionedToken.previousToken();
                if (positionedToken) {
                    if (positionedToken && positionedToken.hasTrailingTrivia()) {
                        triviaList = positionedToken.trailingTrivia();
                        fullStart = positionedToken.end();
                    }
                }
            }
        }
        else {
            if (position <= (fullStart + positionedToken.leadingTriviaWidth())) {
                triviaList = positionedToken.leadingTrivia();
            }
            else if (position >= (fullStart + positionedToken.width())) {
                triviaList = positionedToken.trailingTrivia();
                fullStart = positionedToken.end();
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
        var positionedToken = sourceUnit.findToken(position);

        if (positionedToken) {
            if (positionedToken.kind() === SyntaxKind.EndOfFileToken) {
                // EndOfFile token, enusre it did not follow an unterminated string literal
                positionedToken = positionedToken.previousToken();
                return positionedToken && positionedToken.trailingTriviaWidth() === 0 && isUnterminatedStringLiteral(positionedToken);
            }
            else if (position > positionedToken.start()) {
                // Ensure position falls enterily within the literal if it is terminated, or the line if it is not
                return (position < positionedToken.end() && (positionedToken.kind() === TypeScript.SyntaxKind.StringLiteral || positionedToken.kind() === TypeScript.SyntaxKind.RegularExpressionLiteral)) ||
                    (position <= positionedToken.end() && isUnterminatedStringLiteral(positionedToken));
            }
        }

        return false;
    }

    function findSkippedTokenInTriviaList(positionedToken: ISyntaxToken, position: number, lookInLeadingTriviaList: boolean): ISyntaxToken {
        var triviaList: TypeScript.ISyntaxTriviaList = null;
        var fullStart: number;

        if (lookInLeadingTriviaList) {
            triviaList = positionedToken.leadingTrivia();
            fullStart = positionedToken.fullStart();
        }
        else {
            triviaList = positionedToken.trailingTrivia();
            fullStart = positionedToken.end();
        }

        if (triviaList && triviaList.hasSkippedToken()) {
            for (var i = 0, n = triviaList.count(); i < n; i++) {
                var trivia = triviaList.syntaxTriviaAt(i);
                var triviaWidth = trivia.fullWidth();

                if (trivia.isSkippedToken() && position >= fullStart && position <= fullStart + triviaWidth) {
                    return trivia.skippedToken();
                }

                fullStart += triviaWidth;
            }
        }

        return null;
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
            fullEnd = positionedToken.fullEnd();
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

    export function findSkippedTokenInLeadingTriviaList(positionedToken: ISyntaxToken, position: number): ISyntaxToken {
        return findSkippedTokenInTriviaList(positionedToken, position, /*lookInLeadingTriviaList*/ true);
    }

    export function findSkippedTokenInTrailingTriviaList(positionedToken: ISyntaxToken, position: number): ISyntaxToken {
        return findSkippedTokenInTriviaList(positionedToken, position, /*lookInLeadingTriviaList*/ false);
    }

    export function findSkippedTokenInPositionedToken(positionedToken: ISyntaxToken, position: number): ISyntaxToken {
        var positionInLeadingTriviaList = (position < positionedToken.start());
        return findSkippedTokenInTriviaList(positionedToken, position, /*lookInLeadingTriviaList*/ positionInLeadingTriviaList);
    }

    export function findSkippedTokenOnLeft(positionedToken: ISyntaxToken, position: number): ISyntaxToken {
        var positionInLeadingTriviaList = (position < positionedToken.start());
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
        return Syntax.getAncestorOfKind(positionedToken, kind) !== null;
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
                    return expression.isToken() && IntegerUtilities.isInteger((<ISyntaxToken>expression).text());

                case SyntaxKind.NumericLiteral:
                    // If it doesn't have a + or -, then either an integer literal or a hex literal
                    // is acceptable.
                    var text = (<ISyntaxToken> expression).text();
                    return IntegerUtilities.isInteger(text) || IntegerUtilities.isHexInteger(text);
            }
        }

        return false;
    }

    export function previousToken(token: ISyntaxToken, includeSkippedTokens: boolean = false): ISyntaxToken {
        if (includeSkippedTokens) {
            var triviaList = token.leadingTrivia();
            if (triviaList && triviaList.hasSkippedToken()) {
                var currentTriviaEndPosition = token.start();
                for (var i = triviaList.count() - 1; i >= 0; i--) {
                    var trivia = triviaList.syntaxTriviaAt(i);
                    if (trivia.isSkippedToken()) {
                        return trivia.skippedToken();
                    }

                    currentTriviaEndPosition -= trivia.fullWidth();
                }
            }
        }

        var start = token.fullStart();
        if (start === 0) {
            return null;
        }

        return token.syntaxTree().sourceUnit().findToken(start - 1, includeSkippedTokens);
    }

    export function nextToken(token: ISyntaxToken, includeSkippedTokens: boolean = false): ISyntaxToken {
        if (token.kind() === SyntaxKind.EndOfFileToken) {
            return null;
        }

        var triviaList = token.trailingTrivia();
        if (includeSkippedTokens && triviaList && triviaList.hasSkippedToken()) {
            for (var i = 0, n = triviaList.count(); i < n; i++) {
                var trivia = triviaList.syntaxTriviaAt(i);
                if (trivia.isSkippedToken()) {
                    return trivia.skippedToken();
                }
            }
        }

        return token.syntaxTree().sourceUnit().findToken(token.fullEnd(), includeSkippedTokens);
    }

    export function containingNode(element: ISyntaxElement): SyntaxNode {
        var current = element.parent;

        while (current !== null && !current.isNode()) {
            current = current.parent;
        }

        return <SyntaxNode>current;
    }

    export function findToken(element: ISyntaxElement, position: number): ISyntaxToken {
        // Debug.assert(position >= 0 && position < this.fullWidth());
        if (element.isToken()) {
            Debug.assert(element.fullWidth() > 0);
            return <ISyntaxToken>element;
        }

        if (element.isShared()) {
            // This should never have been called on this element.  It has a 0 width, so the client 
            // should have skipped over this.
            throw Errors.invalidOperation();
        }

        // Consider: we could use a binary search here to find the child more quickly.
        for (var i = 0, n = element.childCount(); i < n; i++) {
            var child = element.childAt(i);

            if (child !== null && child.fullWidth() > 0) {
                var childFullStart = child.fullStart();

                if (position >= childFullStart) {
                    var childFullEnd = childFullStart + child.fullWidth();

                    if (position < childFullEnd) {
                        return findToken(child, position);
                    }
                }
            }
        }

        throw Errors.invalidOperation();
    }

    export function firstTokenInLineContainingPosition(syntaxTree: SyntaxTree, position: number): ISyntaxToken {
        var current = syntaxTree.sourceUnit().findToken(position);
        while (true) {
            if (isFirstTokenInLine(current)) {
                break;
            }

            current = current.previousToken();
        }

        return current;
    }

    function isFirstTokenInLine(token: ISyntaxToken): boolean {
        var previousToken = token.previousToken();
        return previousToken === null || previousToken.hasTrailingNewLine();
    }
}