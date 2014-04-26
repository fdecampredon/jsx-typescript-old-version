///<reference path='references.ts' />

module TypeScript {
    export interface ISyntaxList<T extends ISyntaxNodeOrToken> extends ISyntaxElement {
        childAt(index: number): T;
        toArray(): T[];

        any(func: (v: T) => boolean): boolean;

        firstOrDefault(func: (v: T, index: number) => boolean): T;
        lastOrDefault(func: (v: T, index: number) => boolean): T;
    }
}

module TypeScript.Syntax {
    // TODO: stop exporting this once typecheck bug is fixed.
    export class EmptySyntaxList<T extends ISyntaxNodeOrToken> implements ISyntaxList<T> {
        public parent: ISyntaxElement = null;

        public syntaxID(): number {
            throw Errors.invalidOperation("Should not use shared syntax element as a key.");
        }

        public syntaxTree(): SyntaxTree {
            throw Errors.invalidOperation("Shared lists do not belong to a single tree.");
        }

        public fileName(): string {
            throw Errors.invalidOperation("Shared lists do not belong to a single file.");
        }

        public any(func: (v: ISyntaxNodeOrToken) => boolean): boolean {
            return false;
        }

        public kind(): SyntaxKind { return SyntaxKind.List; }

        public isNode(): boolean { return false; }
        public isToken(): boolean { return false; }
        public isTrivia(): boolean { return false; }
        public isList(): boolean { return true; }
        public isSeparatedList(): boolean { return false; }
        public isTriviaList(): boolean { return false; }

        public toJSON(key: any): any {
            return [];
        }

        public childCount(): number {
            return 0;
        }

        public childAt(index: number): T {
            throw Errors.argumentOutOfRange("index");
        }

        public isShared(): boolean {
            return true;
        }

        public toArray(): T[] {
            return [];
        }

        public collectTextElements(elements: string[]): void {
        }

        public firstToken(): ISyntaxToken {
            return null;
        }

        public lastToken(): ISyntaxToken {
            return null;
        }

        public fullWidth(): number {
            return 0;
        }

        public width(): number {
            return 0;
        }

        public fullStart(): number {
            throw Errors.invalidOperation("'fullStart' invalid on a singleton element.");
        }

        public fullEnd(): number {
            throw Errors.invalidOperation("'fullEnd' invalid on a singleton element.");
        }

        public start(): number {
            throw Errors.invalidOperation("'start' invalid on a singleton element.");
        }

        public end(): number {
            throw Errors.invalidOperation("'end' invalid on a singleton element.");
        }

        public leadingTrivia(): ISyntaxTriviaList {
            return Syntax.emptyTriviaList;
        }

        public trailingTrivia(): ISyntaxTriviaList {
            return Syntax.emptyTriviaList;
        }

        public leadingTriviaWidth(): number {
            return 0;
        }

        public trailingTriviaWidth(): number {
            return 0;
        }

        public fullText(): string {
            return "";
        }

        public isTypeScriptSpecific(): boolean {
            return false;
        }

        public isIncrementallyUnusable(): boolean {
            return false;
        }

        public firstOrDefault(func: (v: ISyntaxNodeOrToken, index: number) => boolean): T {
            return null;
        }

        public lastOrDefault(func: (v: ISyntaxNodeOrToken, index: number) => boolean): T {
            return null;
        }
    }

    var _emptyList: ISyntaxList<ISyntaxNodeOrToken> = <any>new EmptySyntaxList<ISyntaxNodeOrToken>();

    export function emptyList<T extends ISyntaxNodeOrToken>(): ISyntaxList<T> {
        return <ISyntaxList<T>>_emptyList;
    }

    class SingletonSyntaxList<T extends ISyntaxNodeOrToken> implements ISyntaxList<T> {
        public parent: ISyntaxElement = null;
        private _syntaxID: number = 0;

        constructor(private item: T) {
            Syntax.setParentForChildren(this);
        }

        public syntaxTree(): SyntaxTree {
            return this.parent.syntaxTree();
        }

        public fileName(): string {
            return this.parent.fileName();
        }

        public syntaxID(): number {
            if (this._syntaxID === 0) {
                this._syntaxID = _nextSyntaxID++;
            }

            return this._syntaxID;
        }

        public any(func: (v: ISyntaxNodeOrToken) => boolean): boolean {
            return func(this.item);
        }

        public kind(): SyntaxKind { return SyntaxKind.List; }

        public isToken(): boolean { return false; }
        public isNode(): boolean { return false; }
        public isTrivia(): boolean { return false; }
        public isList(): boolean { return true; }
        public isSeparatedList(): boolean { return false; }
        public isTriviaList(): boolean { return false; }

        public toJSON(key: any) {
            return [this.item];
        }

        public childCount() {
            return 1;
        }

        public childAt(index: number): T {
            if (index !== 0) {
                throw Errors.argumentOutOfRange("index");
            }

            return this.item;
        }

        public isShared(): boolean {
            return false;
        }

        public toArray(): T[] {
            return [this.item];
        }

        public collectTextElements(elements: string[]): void {
            this.item.collectTextElements(elements);
        }

        public firstToken(): ISyntaxToken {
            return this.item.firstToken();
        }

        public lastToken(): ISyntaxToken {
            return this.item.lastToken();
        }

        public fullWidth(): number {
            return this.item.fullWidth();
        }

        public width(): number {
            return this.item.width();
        }

        public fullStart(): number {
            return this.item.fullStart();
        }

        public fullEnd(): number {
            return this.item.fullEnd();
        }

        public start(): number {
            return this.item.start();
        }

        public end(): number {
            return this.item.end();
        }

        public leadingTrivia(): ISyntaxTriviaList {
            return this.item.leadingTrivia();
        }

        public trailingTrivia(): ISyntaxTriviaList {
            return this.item.trailingTrivia();
        }

        public leadingTriviaWidth(): number {
            return this.item.leadingTriviaWidth();
        }

        public trailingTriviaWidth(): number {
            return this.item.trailingTriviaWidth();
        }

        public fullText(): string {
            return this.item.fullText();
        }

        public isTypeScriptSpecific(): boolean {
            return this.item.isTypeScriptSpecific();
        }

        public isIncrementallyUnusable(): boolean {
            return this.item.isIncrementallyUnusable();
        }

        public firstOrDefault(func: (v: ISyntaxNodeOrToken, index: number) => boolean): T {
            return func && func(this.item, 0) ? this.item : null;
        }

        public lastOrDefault(func: (v: ISyntaxNodeOrToken, index: number) => boolean): T {
            return func && func(this.item, 0) ? this.item : null;
        }
    }

    class NormalSyntaxList<T extends ISyntaxNodeOrToken> implements ISyntaxList<T> {
        public parent: ISyntaxElement = null;
        private _data: number = 0;
        private _syntaxID: number = 0;

        constructor(private nodeOrTokens: T[]) {
            Syntax.setParentForChildren(this);
        }

        public syntaxTree(): SyntaxTree {
            return this.parent.syntaxTree();
        }

        public fileName(): string {
            return this.parent.fileName();
        }

        public syntaxID(): number {
            if (this._syntaxID === 0) {
                this._syntaxID = _nextSyntaxID++;
            }

            return this._syntaxID;
        }

        public kind(): SyntaxKind { return SyntaxKind.List; }

        public isNode(): boolean { return false; }
        public isToken(): boolean { return false; }
        public isTrivia(): boolean { return false; }
        public isList(): boolean { return true; }
        public isSeparatedList(): boolean { return false; }
        public isTriviaList(): boolean { return false; }

        public toJSON(key: any) {
            return this.nodeOrTokens;
        }

        public childCount() {
            return this.nodeOrTokens.length;
        }

        public childAt(index: number): T {
            if (index < 0 || index >= this.nodeOrTokens.length) {
                throw Errors.argumentOutOfRange("index");
            }

            return this.nodeOrTokens[index];
        }

        public isShared(): boolean {
            return false;
        }

        public toArray(): T[] {
            return this.nodeOrTokens.slice(0);
        }

        public collectTextElements(elements: string[]): void {
            for (var i = 0, n = this.nodeOrTokens.length; i < n; i++) {
                var element = this.nodeOrTokens[i];
                element.collectTextElements(elements);
            }
        }

        public firstToken(): ISyntaxToken {
            for (var i = 0, n = this.nodeOrTokens.length; i < n; i++) {
                var token = this.nodeOrTokens[i].firstToken();
                if (token && token.fullWidth() > 0) {
                    return token;
                }
            }

            return null;
        }

        public lastToken(): ISyntaxToken {
            for (var i = this.nodeOrTokens.length - 1; i >= 0; i--) {
                var token = this.nodeOrTokens[i].lastToken();
                if (token && token.fullWidth() > 0) {
                    return token;
                }
            }

            return null;
        }

        public fullText(): string {
            var elements = new Array<string>();
            this.collectTextElements(elements);
            return elements.join("");
        }

        public isTypeScriptSpecific(): boolean {
            for (var i = 0, n = this.nodeOrTokens.length; i < n; i++) {
                if (this.nodeOrTokens[i].isTypeScriptSpecific()) {
                    return true;
                }
            }

            return false;
        }

        public isIncrementallyUnusable(): boolean {
            return (this.data() & SyntaxConstants.NodeIncrementallyUnusableMask) !== 0;
        }

        public fullWidth(): number {
            return this.data() >>> SyntaxConstants.NodeFullWidthShift;
        }

        public width(): number {
            var fullWidth = this.fullWidth();
            return fullWidth - this.leadingTriviaWidth() - this.trailingTriviaWidth();
        }

        public fullStart(): number {
            return this.firstToken().fullStart();
        }

        public fullEnd(): number {
            return this.lastToken().fullEnd();
        }

        public start(): number {
            return this.firstToken().start();
        }

        public end(): number {
            return this.lastToken().end();
        }

        public leadingTrivia(): ISyntaxTriviaList {
            return this.firstToken().leadingTrivia();
        }

        public trailingTrivia(): ISyntaxTriviaList {
            return this.lastToken().trailingTrivia();
        }

        public leadingTriviaWidth(): number {
            return this.firstToken().leadingTriviaWidth();
        }

        public trailingTriviaWidth(): number {
            return this.lastToken().trailingTriviaWidth();
        }

        private computeData(): number {
            var fullWidth = 0;
            var isIncrementallyUnusable = false;

            for (var i = 0, n = this.nodeOrTokens.length; i < n; i++) {
                var node = this.nodeOrTokens[i];
                fullWidth += node.fullWidth();
                isIncrementallyUnusable = isIncrementallyUnusable || node.isIncrementallyUnusable();
            }

            return (fullWidth << SyntaxConstants.NodeFullWidthShift)
                 | (isIncrementallyUnusable ? SyntaxConstants.NodeIncrementallyUnusableMask : 0)
                 | SyntaxConstants.NodeDataComputed;
        }

        private data(): number {
            if ((this._data & SyntaxConstants.NodeDataComputed) === 0) {
                this._data = this.computeData();
            }

            return this._data;
        }

        public any(func: (v: ISyntaxNodeOrToken) => boolean): boolean {
            return ArrayUtilities.any(this.nodeOrTokens, func);
        }

        public firstOrDefault(func: (v: T, index: number) => boolean): T {
            return ArrayUtilities.firstOrDefault(this.nodeOrTokens, func);
        }

        public lastOrDefault(func: (v: T, index: number) => boolean): T {
            return ArrayUtilities.lastOrDefault(this.nodeOrTokens, func);
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