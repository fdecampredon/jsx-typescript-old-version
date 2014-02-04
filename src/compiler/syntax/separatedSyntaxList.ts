///<reference path='references.ts' />

module TypeScript {
    export interface ISeparatedSyntaxList<T extends ISyntaxNodeOrToken> extends ISyntaxElement {
        childAt(index: number): ISyntaxNodeOrToken;

        toArray(): ISyntaxNodeOrToken[];
        toNonSeparatorArray(): ISyntaxNodeOrToken[];

        separatorCount(): number;
        separatorAt(index: number): ISyntaxToken;

        nonSeparatorCount(): number;
        nonSeparatorAt(index: number): T;

        insertChildrenInto(array: ISyntaxElement[], index: number): void;
    }
}

module TypeScript.Syntax {
    class EmptySeparatedSyntaxList<T extends ISyntaxNodeOrToken> implements ISeparatedSyntaxList<T> {
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

        public kind() {
            return SyntaxKind.SeparatedList;
        }

        public isNode() {
            return false;
        }

        public isToken() {
            return false;
        }

        public isTrivia(): boolean {
            return false;
        }

        public isList() {
            return false;
        }

        public isSeparatedList() {
            return true;
        }

        public isTriviaList(): boolean {
            return false;
        }

        toJSON(key: any): any[] {
            return [];
        }

        public childCount() {
            return 0;
        }

        public isShared(): boolean {
            return true;
        }

        public nonSeparatorCount() {
            return 0;
        }

        public separatorCount() {
            return 0;
        }

        public toArray(): ISyntaxNodeOrToken[] {
            return [];
        }

        public toNonSeparatorArray(): T[] {
            return [];
        }

        public childAt(index: number): ISyntaxNodeOrToken {
            throw Errors.argumentOutOfRange("index");
        }

        public nonSeparatorAt(index: number): T {
            throw Errors.argumentOutOfRange("index");
        }

        public separatorAt(index: number): ISyntaxToken {
            throw Errors.argumentOutOfRange("index");
        }

        collectTextElements(elements: string[]): void {
        }

        firstToken(): ISyntaxToken {
            return null;
        }

        lastToken(): ISyntaxToken {
            return null;
        }

        fullWidth() {
            return 0;
        }

        width() {
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

        fullText() {
            return "";
        }

        isTypeScriptSpecific() {
            return false;
        }

        isIncrementallyUnusable() {
            return false;
        }

        insertChildrenInto(array: ISyntaxElement[], index: number): void {
        }

        leadingTrivia() {
            return Syntax.emptyTriviaList;
        }

        trailingTrivia() {
            return Syntax.emptyTriviaList;
        }

        leadingTriviaWidth() {
            return 0;
        }

        trailingTriviaWidth() {
            return 0;
        }
    }

    var _emptySeparatedList: ISeparatedSyntaxList<ISyntaxNodeOrToken> = new EmptySeparatedSyntaxList<ISyntaxNodeOrToken>();

    export function emptySeparatedList<T extends ISyntaxNodeOrToken>(): ISeparatedSyntaxList<T> {
        return <ISeparatedSyntaxList<T>>_emptySeparatedList;
    }

    class SingletonSeparatedSyntaxList<T extends ISyntaxNodeOrToken> implements ISeparatedSyntaxList<T> {
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

        public toJSON(key: any) {
            return [this.item];
        }

        public kind() { return SyntaxKind.SeparatedList; }

        public isNode(): boolean { return false; }
        public isToken(): boolean { return false; }
        public isTrivia(): boolean { return false; }
        public isList(): boolean { return false; }
        public isSeparatedList(): boolean { return true; }
        public isTriviaList(): boolean { return false; }

        public childCount() { return 1; }
        public nonSeparatorCount() { return 1; }
        public separatorCount() { return 0; }

        public isShared(): boolean {
            return false;
        }

        public toArray() { return [this.item]; }
        public toNonSeparatorArray(): T[] { return [this.item]; }

        public childAt(index: number): ISyntaxNodeOrToken {
            if (index !== 0) {
                throw Errors.argumentOutOfRange("index");
            }

            return this.item;
        }

        public nonSeparatorAt(index: number): T {
            if (index !== 0) {
                throw Errors.argumentOutOfRange("index");
            }

            return this.item;
        }

        public separatorAt(index: number): ISyntaxToken {
            throw Errors.argumentOutOfRange("index");
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

        public fullText(): string {
            return this.item.fullText();
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

        public isTypeScriptSpecific(): boolean {
            return this.item.isTypeScriptSpecific();
        }

        public isIncrementallyUnusable(): boolean {
            return this.item.isIncrementallyUnusable();
        }

        public insertChildrenInto(array: ISyntaxElement[], index: number): void {
            array.splice(index, 0, this.item);
        }
    }

    class NormalSeparatedSyntaxList<T extends ISyntaxNodeOrToken> implements ISeparatedSyntaxList<T> {
        public parent: ISyntaxElement = null;
        private _data: number = 0;
        private _syntaxID: number = 0;

        constructor(private elements: ISyntaxNodeOrToken[]) {
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

        public kind() { return SyntaxKind.SeparatedList; }

        public isToken(): boolean { return false; }
        public isNode(): boolean { return false; }
        public isTrivia(): boolean { return false; }
        public isList(): boolean { return false; }
        public isSeparatedList(): boolean { return true; }
        public isTriviaList(): boolean { return false; }

        public toJSON(key: any) { return this.elements; }

        public childCount() { return this.elements.length; }
        public nonSeparatorCount() { return IntegerUtilities.integerDivide(this.elements.length + 1, 2); }
        public separatorCount() { return IntegerUtilities.integerDivide(this.elements.length, 2); }

        public isShared(): boolean {
            return false;
        }

        public toArray(): ISyntaxNodeOrToken[] { return this.elements.slice(0); }

        public toNonSeparatorArray(): T[] {
            var result: T[] = [];
            for (var i = 0, n = this.nonSeparatorCount(); i < n; i++) {
                result.push(this.nonSeparatorAt(i));
            }

            return result;
        }
        
        public childAt(index: number): ISyntaxNodeOrToken {
            if (index < 0 || index >= this.elements.length) {
                throw Errors.argumentOutOfRange("index");
            }

            return this.elements[index];
        }

        public nonSeparatorAt(index: number): T {
            var value = index * 2;
            if (value < 0 || value >= this.elements.length) {
                throw Errors.argumentOutOfRange("index");
            }

            return <T>this.elements[value];
        }

        public separatorAt(index: number): ISyntaxToken {
            var value = index * 2 + 1;
            if (value < 0 || value >= this.elements.length) {
                throw Errors.argumentOutOfRange("index");
            }

            return <ISyntaxToken>this.elements[value];
        }

        public firstToken(): ISyntaxToken {
            for (var i = 0, n = this.elements.length; i < n; i++) {
                var nodeOrToken = this.elements[i];
                var token = nodeOrToken.firstToken();
                if (token !== null && token.fullWidth() > 0) {
                    return token;
                }
            }

            return null;
        }

        public lastToken(): ISyntaxToken {
            var token: ISyntaxToken;
            for (var i = this.elements.length - 1; i >= 0; i--) {
                var nodeOrToken = this.elements[i];
                var token = nodeOrToken.lastToken();
                if (token !== null && token.fullWidth() > 0) {
                    return token;
                }
            }

            return null;
        }

        public fullText(): string {
            var elements: string[] = [];
            this.collectTextElements(elements);
            return elements.join("");
        }

        public isTypeScriptSpecific(): boolean {
            for (var i = 0, n = this.nonSeparatorCount(); i < n; i++) {
                if (this.nonSeparatorAt(i).isTypeScriptSpecific()) {
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

            for (var i = 0, n = this.elements.length; i < n; i++) {
                var element = this.elements[i];

                var childWidth = element.fullWidth();
                fullWidth += childWidth;

                isIncrementallyUnusable = isIncrementallyUnusable || element.isIncrementallyUnusable();
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

        public collectTextElements(elements: string[]): void {
            for (var i = 0, n = this.elements.length; i < n; i++) {
                var element = this.elements[i];
                element.collectTextElements(elements);
            }
        }

        public insertChildrenInto(array: ISyntaxElement[], index: number): void {
            if (index === 0) {
                array.unshift.apply(array, this.elements);
            }
            else {
                // TODO: this seems awfully innefficient.  Can we do better here?
                array.splice.apply(array, [index, <any>0].concat(this.elements));
            }
        }
    }

    export function separatedList<T extends ISyntaxNodeOrToken>(nodes: ISyntaxNodeOrToken[]): ISeparatedSyntaxList<T> {
        return separatedListAndValidate<T>(nodes, false);
    }

    function separatedListAndValidate<T extends ISyntaxNodeOrToken>(nodes: ISyntaxNodeOrToken[], validate: boolean): ISeparatedSyntaxList<T> {
        if (nodes === undefined || nodes === null || nodes.length === 0) {
            return emptySeparatedList<T>();
        }

        if (validate) {
            for (var i = 0; i < nodes.length; i++) {
                var item = nodes[i];

                if (i % 2 === 1) {
                    // Debug.assert(SyntaxFacts.isTokenKind(item.kind()));
                }
            }
        }

        if (nodes.length === 1) {
            return new SingletonSeparatedSyntaxList(<T>nodes[0]);
        }

        return new NormalSeparatedSyntaxList<T>(nodes);
    }

    export function nonSeparatorIndexOf<T extends ISyntaxNodeOrToken>(list: ISeparatedSyntaxList<T>, ast: ISyntaxNodeOrToken): number {
        for (var i = 0, n = list.nonSeparatorCount(); i < n; i++) {
            if (list.nonSeparatorAt(i) === ast) {
                return i;
            }
        }

        return -1;
    }
}