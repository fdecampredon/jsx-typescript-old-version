///<reference path='references.ts' />

interface Array<T> {
    separators?: TypeScript.ISyntaxToken[];

    kind: TypeScript.SyntaxKind;
    parent: TypeScript.ISyntaxElement;

    setChildAt(index: number, value: T): void;

    separatorCount(): number;
    separatorAt(index: number): TypeScript.ISyntaxToken;
}

module TypeScript.Syntax {
    var _emptyList: ISyntaxNodeOrToken[] = [];
    _emptyList.kind = SyntaxKind.List;

    var _emptySeparatedList: ISyntaxNodeOrToken[] = [];
    var _emptySeparators: ISyntaxToken[] = [];

    _emptySeparatedList.kind = SyntaxKind.SeparatedList;
    _emptySeparatedList.separators = _emptySeparators;

    function assertEmptyLists() {
        // Debug.assert(_emptyList.length === 0);
        // var separators = _emptySeparatedList.separators;
        // Debug.assert(!separators || separators.length === 0);
    }

    Array.prototype.setChildAt = function (index: number, value: any): void {
        assertEmptyLists();
        // Debug.assert(index >= 0 && index < childCount(this));
        if (this.kind === SyntaxKind.SeparatedList) {
            if (index % 2 === 0) {
                // Even elements are the non-separators.
                this[index / 2] = value;
            }
            else {
                // Odd elements are the separators.  1 is the first separator, 3 is the second, 5 is the third.
                this.separators[(index - 1) / 2] = value;
            }
        }
        else {
            this[index] = value;
        }

        // Clear any cached data we may have.  We'll need to recompute it.
        this._data = 0;
        value.parent = this;
    }

    Array.prototype.separatorCount = function (): number {
        assertEmptyLists();
        // Debug.assert(this.kind === SyntaxKind.SeparatedList);
        return this.separators.length;
    }

    Array.prototype.separatorAt = function (index: number): ISyntaxToken {
        assertEmptyLists();
        // Debug.assert(this.kind === SyntaxKind.SeparatedList);
        // Debug.assert(index >= 0 && index < this.separators.length);
        return this.separators[index];
    }

    export function emptyList<T extends ISyntaxNodeOrToken>(): T[] {
        return <T[]><any>_emptyList;
    }

    export function emptySeparatedList<T extends ISyntaxNodeOrToken>(): T[] {
        return <T[]><any>_emptySeparatedList;
    }

    export function list<T extends ISyntaxNodeOrToken>(nodes: T[]): T[] {
        if (nodes === undefined || nodes === null || nodes.length === 0) {
            return emptyList<T>();
        }

        for (var i = 0, n = nodes.length; i < n; i++) {
            nodes[i].parent = nodes;
        }

        nodes.kind = SyntaxKind.List;
        return nodes;
    }

    export function separatedList<T extends ISyntaxNodeOrToken>(nodes: T[], separators: ISyntaxToken[]): T[] {
        if (nodes === undefined || nodes === null || nodes.length === 0) {
            return emptySeparatedList<T>();
        }

        // Debug.assert(separators.length === nodes.length || separators.length == (nodes.length - 1));

        for (var i = 0, n = nodes.length; i < n; i++) {
            nodes[i].parent = nodes;
        }

        for (var i = 0, n = separators.length; i < n; i++) {
            separators[i].parent = nodes;
        }

        nodes.kind = SyntaxKind.SeparatedList;
        nodes.separators = separators.length === 0 ? _emptySeparators : separators;

        return nodes;
    }

    export function nonSeparatorIndexOf<T extends ISyntaxNodeOrToken>(list: T[], ast: ISyntaxNodeOrToken): number {
        for (var i = 0, n = list.length; i < n; i++) {
            if (list[i] === ast) {
                return i;
            }
        }

        return -1;
    }
}