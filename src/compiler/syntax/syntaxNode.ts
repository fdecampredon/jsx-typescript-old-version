///<reference path='references.ts' />

module TypeScript {
    export class SyntaxNode implements ISyntaxNodeOrToken {
        public parent: ISyntaxElement = null;

        constructor(public kind: SyntaxKind, private _data: number) {
        }

        public resetData(): void {
            // Throw away all data except for if this was parsed in strict more or not.
            this._data = this._data & SyntaxConstants.NodeParsedInStrictModeMask;
        }

        public childCount(): number {
            throw Errors.abstract();
        }

        public childAt(slot: number): ISyntaxElement {
            throw Errors.abstract();
        }
    }
}