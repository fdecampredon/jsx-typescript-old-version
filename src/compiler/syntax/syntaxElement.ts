///<reference path='references.ts' />

module TypeScript {
    // True if there is only a single instance of this element (and thus can be reused in many 
    // places in a syntax tree).  Examples of this include our empty lists.  Because empty 
    // lists can be found all over the tree, we want to save on memory by using this single
    // instance instead of creating new objects for each case.  Note: because of this, shared
    // nodes don't have positions or parents.
    export function isShared(element: ISyntaxElement): boolean {
        var kind = element.kind;
        return (kind === SyntaxKind.List || kind === SyntaxKind.SeparatedList) && (<ISyntaxNodeOrToken[]>element).length === 0;
    }

    export function syntaxTree(element: ISyntaxElement): SyntaxTree {
        if (element) {
            Debug.assert(!isShared(element));

            while (element) {
                if (element.kind === SyntaxKind.SourceUnit) {
                    return (<SourceUnitSyntax>element).syntaxTree;
                }

                element = element.parent;
            }
        }

        return null;
    }

    export function parsedInStrictMode(node: ISyntaxNode): boolean {
        var info = node.data;
        if (info === undefined) {
            return false;
        }

        return (info & SyntaxConstants.NodeParsedInStrictModeMask) !== 0;
    }

    export function previousToken(token: ISyntaxToken, includeSkippedTokens: boolean = false): ISyntaxToken {
        if (includeSkippedTokens) {
            var triviaList = token.leadingTrivia();
            if (triviaList && triviaList.hasSkippedToken()) {
                var currentTriviaEndPosition = TypeScript.start(token);
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

        return findToken(syntaxTree(token).sourceUnit(), start - 1, includeSkippedTokens);
    }

    /**
     * Finds a token according to the following rules:
     * 1) If position matches the End of the node/s FullSpan and the node is SourceUnitSyntax,
     *    then the EOF token is returned.
     *
     *  2) If node.FullSpan.Contains(position) then the token that contains given position is
     *     returned.
     *
     *  3) Otherwise an ArgumentOutOfRangeException is thrown
     *
     * Note: findToken will always return a non-missing token with width greater than or equal to
     * 1 (except for EOF).  Empty tokens synthesized by the parser are never returned.
     */
    export function findToken(element: ISyntaxElement, position: number, includeSkippedTokens: boolean = false): ISyntaxToken {
        var endOfFileToken = tryGetEndOfFileAt(element, position);
        if (endOfFileToken !== null) {
            return endOfFileToken;
        }

        if (position < 0 || position >= fullWidth(element)) {
            throw Errors.argumentOutOfRange("position");
        }

        var positionedToken = findTokenWorker(element, position);

        if (includeSkippedTokens) {
            return findSkippedTokenInPositionedToken(positionedToken, position) || positionedToken;
        }

        // Could not find a better match
        return positionedToken;
    }

    export function findSkippedTokenInPositionedToken(positionedToken: ISyntaxToken, position: number): ISyntaxToken {
        var positionInLeadingTriviaList = (position < start(positionedToken));
        return findSkippedTokenInTriviaList(positionedToken, position, /*lookInLeadingTriviaList*/ positionInLeadingTriviaList);
    }

    export function findSkippedTokenInLeadingTriviaList(positionedToken: ISyntaxToken, position: number): ISyntaxToken {
        return findSkippedTokenInTriviaList(positionedToken, position, /*lookInLeadingTriviaList*/ true);
    }

    export function findSkippedTokenInTrailingTriviaList(positionedToken: ISyntaxToken, position: number): ISyntaxToken {
        return findSkippedTokenInTriviaList(positionedToken, position, /*lookInLeadingTriviaList*/ false);
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
            fullStart = end(positionedToken);
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

    function findTokenWorker(element: ISyntaxElement, position: number): ISyntaxToken {
        // Debug.assert(position >= 0 && position < this.fullWidth());
        if (isToken(element)) {
            Debug.assert(fullWidth(element) > 0);
            return <ISyntaxToken>element;
        }

        if (isShared(element)) {
            // This should never have been called on this element.  It has a 0 width, so the client 
            // should have skipped over this.
            throw Errors.invalidOperation();
        }

        // Consider: we could use a binary search here to find the child more quickly.
        for (var i = 0, n = childCount(element); i < n; i++) {
            var child = childAt(element, i);

            if (child !== null && fullWidth(child) > 0) {
                var childFullStart = fullStart(child);

                if (position >= childFullStart) {
                    var childFullEnd = childFullStart + fullWidth(child);

                    if (position < childFullEnd) {
                        return findTokenWorker(child, position);
                    }
                }
            }
        }

        throw Errors.invalidOperation();
    }

    function tryGetEndOfFileAt(element: ISyntaxElement, position: number): ISyntaxToken {
        if (element.kind === SyntaxKind.SourceUnit && position === fullWidth(element)) {
            var sourceUnit = <SourceUnitSyntax>element;
            return sourceUnit.endOfFileToken;
        }

        return null;
    }

    export function nextToken(token: ISyntaxToken, includeSkippedTokens: boolean = false): ISyntaxToken {
        if (token.kind === SyntaxKind.EndOfFileToken) {
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

        return findToken(syntaxTree(token).sourceUnit(), fullEnd(token), includeSkippedTokens);
    }

    export function isNode(element: ISyntaxElement): boolean {
        if (element !== null) {
            var kind = element.kind;
            return kind >= SyntaxKind.FirstNode && kind <= SyntaxKind.LastNode;
        }

        return false;
    }

    export function isToken(element: ISyntaxElement): boolean {
        if (element !== null) {
            var kind = element.kind;
            return kind >= SyntaxKind.FirstToken && kind <= SyntaxKind.LastToken;
        }

        return false;
    }

    export function isList(element: ISyntaxElement): boolean {
        return element !== null && element.kind === SyntaxKind.List;
    }

    export function isSeparatedList(element: ISyntaxElement): boolean {
        return element !== null && element.kind === SyntaxKind.SeparatedList;
    }

    export function syntaxID(element: ISyntaxElement): number {
        if (isShared(element)) {
            throw Errors.invalidOperation("Should not use shared syntax element as a key.");
        }

        var obj = <any>element;
        if (obj._syntaxID === undefined) {
            obj._syntaxID = TypeScript.Syntax._nextSyntaxID++;
        }

        return obj._syntaxID;
    }

    function collectTextElements(element: ISyntaxElement, elements: string[]): void {
        if (element) {
            if (isToken(element)) {
                elements.push((<ISyntaxToken>element).fullText());
            }
            else {
                for (var i = 0, n = childCount(element); i < n; i++) {
                    collectTextElements(childAt(element, i), elements);
                }
            }
        }
    }

    export function fullText(element: ISyntaxElement): string {
        if (isToken(element)) {
            return (<ISyntaxToken>element).fullText();
        }

        var elements: string[] = [];
        collectTextElements(element, elements);

        return elements.join("");
    }

    export function leadingTriviaWidth(element: ISyntaxElement): number {
        var token = firstToken(element);
        return token ? token.leadingTriviaWidth() : 0;
    }

    export function trailingTriviaWidth(element: ISyntaxElement): number {
        var token = lastToken(element);
        return token ? token.trailingTriviaWidth() : 0;
    }

    export function firstToken(element: ISyntaxElement): ISyntaxToken {
        if (isToken(element)) {
            return fullWidth(element) > 0 || element.kind === SyntaxKind.EndOfFileToken ? <ISyntaxToken>element : null;
        }

        for (var i = 0, n = childCount(element); i < n; i++) {
            var child = childAt(element, i);
            if (child !== null) {
                var token = firstToken(child);
                if (token) {
                    return token;
                }
            }
        }

        if (element.kind === SyntaxKind.SourceUnit) {
            return (<SourceUnitSyntax>element).endOfFileToken;
        }

        return null;
    }

    export function lastToken(element: ISyntaxElement): ISyntaxToken {
        if (isToken(element)) {
            return fullWidth(element) > 0 || element.kind === SyntaxKind.EndOfFileToken ? <ISyntaxToken>element : null;
        }

        if (element.kind === SyntaxKind.SourceUnit) {
            return (<SourceUnitSyntax>element).endOfFileToken;
        }

        for (var i = childCount(element) - 1; i >= 0; i--) {
            var child = childAt(element, i);
            if (child !== null) {
                var token = lastToken(child);
                if (token) {
                    return token;
                }
            }
        }

        return null;
    }

    export function fullStart(element: ISyntaxElement): number {
        Debug.assert(!isShared(element));
        var token = isToken(element) ? <ISyntaxToken>element : firstToken(element);
        return token ? token.fullStart() : -1;
    }

    export function fullWidth(element: ISyntaxElement): number {
        if (isToken(element)) {
            return (<ISyntaxToken>element).fullWidth();
        }

        if (isShared(element)) {
            return 0;
        }

        var info = data(element);
        return info >>> SyntaxConstants.NodeFullWidthShift;
    }

    export function isIncrementallyUnusable(element: ISyntaxElement): boolean {
        if (isToken(element)) {
            return (<ISyntaxToken>element).isIncrementallyUnusable();
        }

        if (isShared(element)) {
            // All shared lists are reusable.
            return false;
        }

        return (data(element) & SyntaxConstants.NodeIncrementallyUnusableMask) !== 0;
    }

    function data(element: ISyntaxElement): number {
        Debug.assert(isNode(element) || isList(element) || isSeparatedList(element));

        // Lists and nodes all have a 'data' element.
        var dataElement = <{ data: number }><any>element;

        var info = dataElement.data;
        if (info === undefined) {
            info = 0;
        }

        if ((info & SyntaxConstants.NodeDataComputed) === 0) {
            info |= computeData(element);
            dataElement.data = info;
        }

        return info;
    }

    function computeData(element: ISyntaxElement): number {
        var slotCount = childCount(element);

        var fullWidth = 0;

        // If we have no children (like an OmmittedExpressionSyntax), we're automatically not reusable.
        var isIncrementallyUnusable = slotCount === 0;

        for (var i = 0, n = slotCount; i < n; i++) {
            var child = childAt(element, i);

            if (child !== null) {
                fullWidth += TypeScript.fullWidth(child);

                isIncrementallyUnusable = isIncrementallyUnusable || TypeScript.isIncrementallyUnusable(child);
            }
        }

        return (fullWidth << SyntaxConstants.NodeFullWidthShift)
            | (isIncrementallyUnusable ? SyntaxConstants.NodeIncrementallyUnusableMask : 0)
            | SyntaxConstants.NodeDataComputed;
    }

    export function start(element: ISyntaxElement): number {
        var token = isToken(element) ? <ISyntaxToken>element : firstToken(element);
        return token ? token.fullStart() + token.leadingTriviaWidth() : -1;
    }

    export function end(element: ISyntaxElement): number {
        var token = isToken(element) ? <ISyntaxToken>element : lastToken(element);
        return token ? fullEnd(token) - token.trailingTriviaWidth() : -1;
    }

    export function width(element: ISyntaxElement): number {
        return fullWidth(element) - leadingTriviaWidth(element) - trailingTriviaWidth(element);
    }

    export function fullEnd(element: ISyntaxElement): number {
        return fullStart(element) + fullWidth(element);
    }

    export interface ISyntaxElement {
        kind: SyntaxKind;
        parent?: ISyntaxElement;
    }

    export interface ISyntaxNode extends ISyntaxNodeOrToken {
        data: number;
    }

    export interface IModuleReferenceSyntax extends ISyntaxNode {
        _isModuleReference: any;
    }

    export interface IModuleElementSyntax extends ISyntaxNode {
    }

    export interface IStatementSyntax extends IModuleElementSyntax {
        _isStatement: any;
    }

    export interface ITypeMemberSyntax extends ISyntaxNode {
    }

    export interface IClassElementSyntax extends ISyntaxNode {
    }

    export interface IMemberDeclarationSyntax extends IClassElementSyntax {
    }

    export interface IPropertyAssignmentSyntax extends IClassElementSyntax {
    }

    export interface ISwitchClauseSyntax extends ISyntaxNode {
        _isSwitchClause: any;
        statements: IStatementSyntax[];
    }

    export interface IExpressionSyntax extends ISyntaxNodeOrToken {
        _isExpression: any;
    }

    export interface IUnaryExpressionSyntax extends IExpressionSyntax {
        _isUnaryExpression: any;
    }

    export interface IPostfixExpressionSyntax extends IUnaryExpressionSyntax {
        _isPostfixExpression: any;
    }

    export interface ILeftHandSideExpressionSyntax extends IPostfixExpressionSyntax {
        _isLeftHandSideExpression: any;
    }

    export interface IMemberExpressionSyntax extends ILeftHandSideExpressionSyntax {
        _isMemberExpression: any;
    }

    export interface ICallExpressionSyntax extends ILeftHandSideExpressionSyntax {
        _isCallExpression: any;
    }

    export interface IPrimaryExpressionSyntax extends IMemberExpressionSyntax {
        _isPrimaryExpression: any;
    }

    export interface ITypeSyntax extends ISyntaxNodeOrToken {
    }

    export interface INameSyntax extends ITypeSyntax {
    }
}