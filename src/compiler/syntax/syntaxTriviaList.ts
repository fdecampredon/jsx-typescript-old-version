///<reference path='references.ts' />

module TypeScript {
    export interface ISyntaxTriviaList {
        parent: ISyntaxToken;
        syntaxTree(): SyntaxTree;

        isNode(): boolean;
        isToken(): boolean;
        isTrivia(): boolean;
        isList(): boolean;
        isSeparatedList(): boolean;
        isTriviaList(): boolean;

        isShared(): boolean;

        count(): number;
        syntaxTriviaAt(index: number): ISyntaxTrivia;

        // With of this trivia list.
        fullWidth(): number;

        // Text for this trivia list.
        fullText(): string;

        hasComment(): boolean;
        hasNewLine(): boolean;
        hasSkippedToken(): boolean;

        last(): ISyntaxTrivia;
        toArray(): ISyntaxTrivia[];

        concat(trivia: ISyntaxTriviaList): ISyntaxTriviaList;

        collectTextElements(elements: string[]): void;

        clone(): ISyntaxTriviaList;
    }
}

module TypeScript.Syntax {
    class EmptyTriviaList implements ISyntaxTriviaList {
        public parent: ISyntaxToken = null;

        public isNode(): boolean { return false; }
        public isToken(): boolean { return false; }
        public isTrivia(): boolean { return false; }
        public isList(): boolean { return false; }
        public isSeparatedList(): boolean { return false; }
        public isTriviaList(): boolean { return true; }

        public isShared(): boolean {
            return true;
        }

        public syntaxTree(): SyntaxTree {
            throw Errors.invalidOperation("Shared lists do not belong to a single tree.");
        }

        public kind() {
            return SyntaxKind.TriviaList;
        }

        public count(): number {
            return 0;
        }

        public syntaxTriviaAt(index: number): ISyntaxTrivia {
            throw Errors.argumentOutOfRange("index");
        }

        public last(): ISyntaxTrivia {
            throw Errors.argumentOutOfRange("index");
        }

        public fullWidth(): number {
            return 0;
        }

        public fullText(): string {
            return "";
        }

        public hasComment(): boolean {
            return false;
        }

        public hasNewLine(): boolean {
            return false;
        }

        public hasSkippedToken(): boolean {
            return false;
        }

        public toJSON(key: any): any {
            return [];
        }

        public collectTextElements(elements: string[]): void {
        }

        public toArray(): ISyntaxTrivia[] {
            return [];
        }

        public concat(trivia: ISyntaxTriviaList): ISyntaxTriviaList {
            return trivia;
        }

        public clone() {
            return this;
        }
    };

    export var emptyTriviaList: ISyntaxTriviaList = new EmptyTriviaList();

    function concatTrivia(list1: ISyntaxTriviaList, list2: ISyntaxTriviaList): ISyntaxTriviaList {
        if (list1.count() === 0) {
            return list2;
        }

        if (list2.count() === 0) {
            return list1;
        }

        var trivia = list1.toArray();
        trivia.push.apply(trivia, list2.toArray());

        return triviaList(trivia);
    }

    function isComment(trivia: ISyntaxTrivia): boolean {
        return trivia.kind() === SyntaxKind.MultiLineCommentTrivia || trivia.kind() === SyntaxKind.SingleLineCommentTrivia;
    }

    class SingletonSyntaxTriviaList implements ISyntaxTriviaList {
        public parent: ISyntaxToken = null;
        private item: ISyntaxTrivia;

        constructor(item: ISyntaxTrivia) {
            this.item = item.clone();
            this.item.parent = this;
        }

        public isNode(): boolean { return false; }
        public isToken(): boolean { return false; }
        public isTrivia(): boolean { return false; }
        public isList(): boolean { return false; }
        public isSeparatedList(): boolean { return false; }
        public isTriviaList(): boolean { return true; }

        public syntaxTree(): SyntaxTree {
            return this.parent.syntaxTree();
        }

        public isShared(): boolean {
            return false;
        }

        public kind(): SyntaxKind { return SyntaxKind.TriviaList; }

        public count(): number {
            return 1;
        }

        public syntaxTriviaAt(index: number): ISyntaxTrivia {
            if (index !== 0) {
                throw Errors.argumentOutOfRange("index");
            }

            return this.item;
        }

        public last(): ISyntaxTrivia {
            return this.item;
        }

        public fullWidth(): number {
            return this.item.fullWidth();
        }

        public fullText(): string {
            return this.item.fullText();
        }

        public hasComment(): boolean {
            return isComment(this.item);
        }

        public hasNewLine(): boolean {
            return this.item.kind() === SyntaxKind.NewLineTrivia;
        }

        public hasSkippedToken(): boolean {
            return this.item.kind() === SyntaxKind.SkippedTokenTrivia;
        }

        public toJSON(key: any): ISyntaxTrivia[] {
            return [this.item];
        }

        public collectTextElements(elements: string[]): void {
            (<any>this.item).collectTextElements(elements);
        }

        public toArray(): ISyntaxTrivia[] {
            return [this.item];
        }

        public concat(trivia: ISyntaxTriviaList): ISyntaxTriviaList {
            return concatTrivia(this, trivia);
        }

        public clone(): ISyntaxTriviaList {
            return new SingletonSyntaxTriviaList(this.item.clone());
        }
    }

    class NormalSyntaxTriviaList implements ISyntaxTriviaList {
        public parent: ISyntaxToken = null;
        private trivia: ISyntaxTrivia[];

        constructor(trivia: ISyntaxTrivia[]) {
            this.trivia = trivia.map(t => {
                var cloned = t.clone();
                cloned.parent = this;
                return cloned;
            });
        }

        public isNode(): boolean { return false; }
        public isToken(): boolean { return false; }
        public isTrivia(): boolean { return false; }
        public isList(): boolean { return false; }
        public isSeparatedList(): boolean { return false; }
        public isTriviaList(): boolean { return true; }

        public isShared(): boolean {
            return false;
        }

        public syntaxTree(): SyntaxTree {
            return this.parent.syntaxTree();
        }

        public kind(): SyntaxKind { return SyntaxKind.TriviaList; }

        public count() {
            return this.trivia.length;
        }

        public syntaxTriviaAt(index: number): ISyntaxTrivia {
            if (index < 0 || index >= this.trivia.length) {
                throw Errors.argumentOutOfRange("index");
            }

            return this.trivia[index];
        }
        
        public last(): ISyntaxTrivia {
            return this.trivia[this.trivia.length - 1];
        }

        public fullWidth(): number {
            return ArrayUtilities.sum(this.trivia, t => t.fullWidth());
        }

        public fullText(): string {
            var result = "";

            for (var i = 0, n = this.trivia.length; i < n; i++) {
                result += this.trivia[i].fullText();
            }

            return result;
        }

        public hasComment(): boolean {
            for (var i = 0; i < this.trivia.length; i++) {
                if (isComment(this.trivia[i])) {
                    return true;
                }
            }

            return false;
        }

        public hasNewLine(): boolean {
            for (var i = 0; i < this.trivia.length; i++) {
                if (this.trivia[i].kind() === SyntaxKind.NewLineTrivia) {
                    return true;
                }
            }

            return false;
        }

        public hasSkippedToken(): boolean {
            for (var i = 0; i < this.trivia.length; i++) {
                if (this.trivia[i].kind() === SyntaxKind.SkippedTokenTrivia) {
                    return true;
                }
            }

            return false;
        }

        public toJSON(key: any): ISyntaxTrivia[] {
            return this.trivia;
        }

        public collectTextElements(elements: string[]): void {
            for (var i = 0; i < this.trivia.length; i++) {
                (<any>this.trivia[i]).collectTextElements(elements);
            }
        }

        public toArray(): ISyntaxTrivia[] {
            return this.trivia.slice(0);
        }

        public concat(trivia: ISyntaxTriviaList): ISyntaxTriviaList {
            return concatTrivia(this, trivia);
        }

        public clone(): ISyntaxTriviaList {
            return new NormalSyntaxTriviaList(this.trivia.map(t => t.clone()));
        }
    }

    export function triviaList(trivia: ISyntaxTrivia[]): ISyntaxTriviaList {
        if (trivia === undefined || trivia === null || trivia.length === 0) {
            return Syntax.emptyTriviaList;
        }

        if (trivia.length === 1) {
            return new SingletonSyntaxTriviaList(trivia[0]);
        }

        return new NormalSyntaxTriviaList(trivia);
    }

    export var spaceTriviaList: ISyntaxTriviaList = triviaList([Syntax.spaceTrivia]);
}