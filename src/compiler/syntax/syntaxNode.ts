///<reference path='references.ts' />

module TypeScript {
    export class SyntaxNode implements ISyntaxNodeOrToken {
        public parent: ISyntaxElement = null;

        constructor(public kind: SyntaxKind, public data: number) {
        }
    }
}