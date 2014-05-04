///<reference path='references.ts' />

module TypeScript {
    export interface ISyntaxList<T extends ISyntaxNodeOrToken> extends ISyntaxElement {
        childAt(index: number): T;
        setChildAt(index: number, value: T): void;
    }
}

module TypeScript.Syntax {
    // TODO: stop exporting this once typecheck bug is fixed.
    export class EmptySyntaxList<T extends ISyntaxNodeOrToken> implements ISyntaxList<T> {
        public parent: ISyntaxElement = null;

        public kind(): SyntaxKind { return SyntaxKind.List; }

        public childCount(): number {
            return 0;
        }

        public childAt(index: number): T {
            throw Errors.argumentOutOfRange("index");
        }

        public setChildAt(index: number, value: T): void {
            throw Errors.argumentOutOfRange("index");
        }
    }

    var _emptyList: ISyntaxList<ISyntaxNodeOrToken> = <any>new EmptySyntaxList<ISyntaxNodeOrToken>();

    export function emptyList<T extends ISyntaxNodeOrToken>(): ISyntaxList<T> {
        return <ISyntaxList<T>>_emptyList;
    }

    class SingletonSyntaxList<T extends ISyntaxNodeOrToken> implements ISyntaxList<T> {
        public parent: ISyntaxElement = null;

        constructor(private item: T) {
            Syntax.setParentForChildren(this);
        }

        public kind(): SyntaxKind { return SyntaxKind.List; }

        public childCount() {
            return 1;
        }

        public childAt(index: number): T {
            if (index !== 0) {
                throw Errors.argumentOutOfRange("index");
            }

            return this.item;
        }

        public setChildAt(index: number, value: T): void {
            if (index !== 0) {
                throw Errors.argumentOutOfRange("index");
            }

            this.item = value;
            value.parent = this;
        }
    }

    class NormalSyntaxList<T extends ISyntaxNodeOrToken> implements ISyntaxList<T> {
        public parent: ISyntaxElement = null;
        private _data: number;

        constructor(private nodeOrTokens: T[]) {
            Syntax.setParentForChildren(this);
        }

        public kind(): SyntaxKind { return SyntaxKind.List; }

        public childCount() {
            return this.nodeOrTokens.length;
        }

        public childAt(index: number): T {
            if (index < 0 || index >= this.nodeOrTokens.length) {
                throw Errors.argumentOutOfRange("index");
            }

            return this.nodeOrTokens[index];
        }

        public setChildAt(index: number, value: T): void {
            if (index < 0 || index >= this.nodeOrTokens.length) {
                throw Errors.argumentOutOfRange("index");
            }

            this.nodeOrTokens[index] = value;
            value.parent = this;
            this._data = 0;
        }
    }

    export function list<T extends ISyntaxNodeOrToken>(nodes: T[]): ISyntaxList<T> {
        if (nodes === undefined || nodes === null || nodes.length === 0) {
            return emptyList<T>();
        }

        if (nodes.length === 1) {
            var item = nodes[0];
            return new SingletonSyntaxList<T>(item);
        }

        return new NormalSyntaxList(nodes);
    }
}