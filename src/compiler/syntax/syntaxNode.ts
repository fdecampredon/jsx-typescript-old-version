///<reference path='references.ts' />

module TypeScript {
    export class SyntaxNode implements ISyntaxNodeOrToken {
        public parent: ISyntaxElement;
        private __kind: SyntaxKind;
        public data: number;

        constructor(data: number) {
            if (data) {
                this.data = data;
            }
        }

        public kind(): SyntaxKind {
            return this.__kind;
        }
    }
}