///<reference path='references.ts' />

module TypeScript {
    // True if there is only a single instance of this element (and thus can be reused in many 
    // places in a syntax tree).  Examples of this include our empty lists.  Because empty 
    // lists can be found all over the tree, we want to save on memory by using this single
    // instance instead of creating new objects for each case.  Note: because of this, shared
    // nodes don't have positions or parents.
    export function isShared(element: ISyntaxElement): boolean {
        return (isList(element) || isSeparatedList(element)) && element.childCount() === 0;
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

    export function parsedInStrictMode(node: SyntaxNode): boolean {
        var info = (<any>node)._data;
        if (info === undefined) {
            return false;
        }

        return (info & SyntaxConstants.NodeParsedInStrictModeMask) !== 0;
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
                for (var i = 0, n = element.childCount(); i < n; i++) {
                    collectTextElements(element.childAt(i), elements);
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

        for (var i = 0, n = element.childCount(); i < n; i++) {
            var child = element.childAt(i);
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

        for (var i = element.childCount() - 1; i >= 0; i--) {
            var child = element.childAt(i);
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
        Debug.assert(!isToken(element));
        var info: number = (<any>element)._data;
        if (info === undefined) {
            info = 0;
        }

        if ((info & SyntaxConstants.NodeDataComputed) === 0) {
            info |= computeData(element);
            (<any>element)._data = info;
        }

        return info;
    }

    function computeData(element: ISyntaxElement): number {
        var slotCount = element.childCount();

        var fullWidth = 0;

        // If we have no children (like an OmmittedExpressionSyntax), we're automatically not reusable.
        var isIncrementallyUnusable = slotCount === 0;

        for (var i = 0, n = slotCount; i < n; i++) {
            var child = element.childAt(i);

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
        parent: ISyntaxElement;

        childCount(): number;
        childAt(index: number): ISyntaxElement;
    }

    export interface ISyntaxNode extends ISyntaxNodeOrToken {
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