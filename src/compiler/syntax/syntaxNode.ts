///<reference path='references.ts' />

module TypeScript {
    export class SyntaxNode implements ISyntaxNodeOrToken {
        public parent: ISyntaxElement;

        constructor(public data: number) {
        }

        public kind(): SyntaxKind {
            throw Errors.abstract();
        }
    }
}