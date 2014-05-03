///<reference path='references.ts' />

module TypeScript {
    export function isNode(element: ISyntaxElement): boolean {
        if (element !== null) {
            var kind = element.kind();
            return kind >= SyntaxKind.FirstNode && kind <= SyntaxKind.LastNode;
        }

        return false;
    }

    export function isToken(element: ISyntaxElement): boolean {
        if (element !== null) {
            var kind = element.kind();
            return kind >= SyntaxKind.FirstToken && kind <= SyntaxKind.LastToken;
        }

        return false;
    }

    export function isList(element: ISyntaxElement): boolean {
        return element !== null && element.kind() === SyntaxKind.List;
    }

    export function isSeparatedList(element: ISyntaxElement): boolean {
        return element !== null && element.kind() === SyntaxKind.SeparatedList;
    }

    export function syntaxID(element: ISyntaxElement): number {
        if (element.isShared()) {
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
            return element.fullWidth() > 0 || element.kind() === SyntaxKind.EndOfFileToken ? <ISyntaxToken>element : null;
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

        if (element.kind() === SyntaxKind.SourceUnit) {
            return (<SourceUnitSyntax>element).endOfFileToken;
        }

        return null;
    }

    export function lastToken(element: ISyntaxElement): ISyntaxToken {
        if (isToken(element)) {
            return element.fullWidth() > 0 || element.kind() === SyntaxKind.EndOfFileToken ? <ISyntaxToken>element : null;
        }

        if (element.kind() === SyntaxKind.SourceUnit) {
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

    export function start(element: ISyntaxElement): number {
        var token = isToken(element) ? <ISyntaxToken>element : firstToken(element);
        return token ? token.fullStart() + token.leadingTriviaWidth() : -1;
    }

    export function end(element: ISyntaxElement): number {
        var token = isToken(element) ? <ISyntaxToken>element : lastToken(element);
        return token ? fullEnd(token) - token.trailingTriviaWidth() : -1;
    }

    export function width(element: ISyntaxElement): number {
        return element.fullWidth() - leadingTriviaWidth(element) - trailingTriviaWidth(element);
    }

    export function fullEnd(element: ISyntaxElement): number {
        return element.fullStart() + element.fullWidth();
    }

    export interface ISyntaxElement {
        syntaxTree(): SyntaxTree;

        kind(): SyntaxKind;
        parent: ISyntaxElement;

        childCount(): number;
        childAt(index: number): ISyntaxElement;

        // True if there is only a single instance of this element (and thus can be reused in many 
        // places in a syntax tree).  Examples of this include our empty lists.  Because empty 
        // lists can be found all over the tree, we want to save on memory by using this single
        // instance instead of creating new objects for each case.  Note: because of this, shared
        // nodes don't have positions or parents.
        isShared(): boolean;

        // True if this element cannot be reused in incremental parsing.  There are several situations
        // in which an element can not be reused.  They are:
        //
        // 1) The element contained skipped text.
        // 2) The element contained zero width tokens.
        // 3) The element contains tokens generated by the parser (like >> or a keyword -> identifier
        //    conversion).
        // 4) The element contains a regex token somewhere under it.  A regex token is either a 
        //    regex itself (i.e. /foo/), or is a token which could start a regex (i.e. "/" or "/=").  This
        //    data is used by the incremental parser to decide if a node can be reused.  Due to the 
        //    lookahead nature of regex tokens, a node containing a regex token cannot be reused.  Normally,
        //    changes to text only affect the tokens directly intersected.  However, because regex tokens 
        //    have such unbounded lookahead (technically bounded at the end of a line, but htat's minor), 
        //    we need to recheck them to see if they've changed due to the edit.  For example, if you had:
        //    
        //         while (true) /3; return;
        //    
        //    And you changed it to:
        //    
        //         while (true) /3; return/;
        //    
        //    Then even though only the 'return' and ';' colons were touched, we'd want to rescan the '/'
        //    token which we would then realize was a regex.
        isIncrementallyUnusable(): boolean;

        // With of this element, including leading and trailing trivia.
        fullWidth(): number;

        // The absolute start of this element, including the leading trivia.
        fullStart(): number;
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
        statements: ISyntaxList<IStatementSyntax>;
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