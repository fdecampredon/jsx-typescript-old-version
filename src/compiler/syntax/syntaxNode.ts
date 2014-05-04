///<reference path='references.ts' />

module TypeScript {
    export class SyntaxNode implements ISyntaxNodeOrToken {
        public parent: ISyntaxElement = null;

        constructor(public kind: SyntaxKind, private _data: number) {
        }
    }
}