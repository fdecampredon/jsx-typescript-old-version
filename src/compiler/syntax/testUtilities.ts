module TypeScript {
    export function nodeStructuralEquals(node1: TypeScript.ISyntaxNode, node2: TypeScript.ISyntaxNode): boolean {
        if (node1 === node2) { return true; }
        if (node1 === null || node2 === null) { return false; }
        if (node1.kind !== node2.kind) { return false; }
        if (childCount(node1) !== childCount(node2)) { return false; }

        for (var i = 0, n = childCount(node1); i < n; i++) {
            var element1 = childAt(node1, i);
            var element2 = childAt(node2, i);

            if (!elementStructuralEquals(element1, element2)) {
                return false;
            }
        }

        return true;
    }

    export function nodeOrTokenStructuralEquals(node1: TypeScript.ISyntaxNodeOrToken, node2: TypeScript.ISyntaxNodeOrToken): boolean {
        if (node1 === node2) {
            return true;
        }

        if (node1 === null || node2 === null) {
            return false;
        }

        if (TypeScript.isToken(node1)) {
            return TypeScript.isToken(node2) ? tokenStructuralEquals(<TypeScript.ISyntaxToken>node1, <TypeScript.ISyntaxToken>node2) : false;
        }

        return TypeScript.isNode(node2) ? nodeStructuralEquals(<TypeScript.ISyntaxNode>node1, <TypeScript.ISyntaxNode>node2) : false;
    }

    export function tokenStructuralEquals(token1: TypeScript.ISyntaxToken, token2: TypeScript.ISyntaxToken): boolean {
        if (token1 === token2) {
            return true;
        }

        if (token1 === null || token2 === null) {
            return false;
        }

        return token1.kind === token2.kind &&
            TypeScript.width(token1) === TypeScript.width(token2) &&
            token1.fullWidth() === token2.fullWidth() &&
            token1.fullStart() === token2.fullStart() &&
            TypeScript.fullEnd(token1) === TypeScript.fullEnd(token2) &&
            TypeScript.start(token1) === TypeScript.start(token2) &&
            TypeScript.end(token1) === TypeScript.end(token2) &&
            token1.text() === token2.text() &&
            triviaListStructuralEquals(token1.leadingTrivia(), token2.leadingTrivia()) &&
            triviaListStructuralEquals(token1.trailingTrivia(), token2.trailingTrivia());
    }

    export function triviaListStructuralEquals(triviaList1: TypeScript.ISyntaxTriviaList, triviaList2: TypeScript.ISyntaxTriviaList): boolean {
        if (triviaList1.count() !== triviaList2.count()) {
            return false;
        }

        for (var i = 0, n = triviaList1.count(); i < n; i++) {
            if (!triviaStructuralEquals(triviaList1.syntaxTriviaAt(i), triviaList2.syntaxTriviaAt(i))) {
                return false;
            }
        }

        return true;
    }

    export function triviaStructuralEquals(trivia1: TypeScript.ISyntaxTrivia, trivia2: TypeScript.ISyntaxTrivia): boolean {
        return trivia1.kind === trivia2.kind &&
            trivia1.fullWidth() === trivia2.fullWidth() &&
            trivia1.fullText() === trivia2.fullText();
    }

    function listStructuralEquals<T extends TypeScript.ISyntaxNodeOrToken>(list1: T[], list2: T[]): boolean {
        if (childCount(list1) !== childCount(list2)) {
            return false;
        }

        for (var i = 0, n = childCount(list1); i < n; i++) {
            var child1 = childAt(list1, i);
            var child2 = childAt(list2, i);

            if (!nodeOrTokenStructuralEquals(child1, child2)) {
                return false;
            }
        }

        return true;
    }

    function separatedListStructuralEquals<T extends TypeScript.ISyntaxNodeOrToken>(list1: T[], list2: T[]): boolean {
        if (childCount(list1) !== childCount(list2)) {
            return false;
        }

        for (var i = 0, n = childCount(list1); i < n; i++) {
            var element1 = childAt(list1, i);
            var element2 = childAt(list2, i);
            if (!nodeOrTokenStructuralEquals(element1, element2)) {
                return false;
            }
        }

        return true;
    }

    export function elementStructuralEquals(element1: TypeScript.ISyntaxElement, element2: TypeScript.ISyntaxElement) {
        if (element1 === element2) {
            return true;
        }

        if (element1 === null || element2 === null) {
            return false;
        }

        if (element2.kind !== element2.kind) {
            return false;
        }

        if (TypeScript.fullStart(element1) !== TypeScript.fullStart(element2)) {
            return false;
        }

        if (TypeScript.start(element1) !== TypeScript.start(element2)) {
            return false;
        }

        if (TypeScript.end(element1) !== TypeScript.end(element2)) {
            return false;
        }

        if (TypeScript.fullEnd(element1) !== TypeScript.fullEnd(element2)) {
            return false;
        }

        if (TypeScript.isToken(element1)) {
            return tokenStructuralEquals(<TypeScript.ISyntaxToken>element1, <TypeScript.ISyntaxToken>element2);
        }
        else if (TypeScript.isNode(element1)) {
            return nodeStructuralEquals(<TypeScript.ISyntaxNode>element1, <TypeScript.ISyntaxNode>element2);
        }
        else if (TypeScript.isList(element1)) {
            return listStructuralEquals(<TypeScript.ISyntaxNodeOrToken[]>element1, <TypeScript.ISyntaxNodeOrToken[]>element2);
        }
        else if (TypeScript.isSeparatedList(element1)) {
            return separatedListStructuralEquals(<TypeScript.ISyntaxNodeOrToken[]>element1, <TypeScript.ISyntaxNodeOrToken[]>element2);
        }

        throw TypeScript.Errors.invalidOperation();
    }

    export function treeStructuralEquals(tree1: TypeScript.SyntaxTree, tree2: TypeScript.SyntaxTree): boolean {
        if (!TypeScript.ArrayUtilities.sequenceEquals(tree1.diagnostics(), tree2.diagnostics(), TypeScript.Diagnostic.equals)) {
            return false;
        }

        return nodeStructuralEquals(tree1.sourceUnit(), tree2.sourceUnit());
    }
}