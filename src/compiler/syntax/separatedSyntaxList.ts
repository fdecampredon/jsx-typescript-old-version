///<reference path='references.ts' />

module TypeScript {
    export interface ISeparatedSyntaxList<T extends ISyntaxNodeOrToken> extends ISyntaxElement {
        childAt(index: number): ISyntaxNodeOrToken;
        setChildAt(index: number, value: ISyntaxNodeOrToken): void;

        separatorCount(): number;
        separatorAt(index: number): ISyntaxToken;

        nonSeparatorCount(): number;
        nonSeparatorAt(index: number): T;
    }
}