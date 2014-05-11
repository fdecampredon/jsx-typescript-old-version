///<reference path='references.ts' />

module TypeScript {
    export class SyntaxNode implements ISyntaxNodeOrToken {
        public parent: ISyntaxElement;
        private __kind: SyntaxKind;

        constructor(public data: number) {
        }

        public kind(): SyntaxKind {
            return this.__kind;
        }
    }
}