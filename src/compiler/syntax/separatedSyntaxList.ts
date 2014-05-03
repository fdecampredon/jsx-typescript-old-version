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

module TypeScript.Syntax {
    class EmptySeparatedSyntaxList<T extends ISyntaxNodeOrToken> implements ISeparatedSyntaxList<T> {
        public parent: ISyntaxElement = null;

        public syntaxTree(): SyntaxTree {
            throw Errors.invalidOperation("Shared lists do not belong to a single tree.");
        }

        public fileName(): string {
            throw Errors.invalidOperation("Shared lists do not belong to a single file.");
        }

        public kind() {
            return SyntaxKind.SeparatedList;
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

        public childAt(index: number): ISyntaxNodeOrToken {
            throw Errors.argumentOutOfRange("index");
        }

        public setChildAt(index: number, value: ISyntaxNodeOrToken): void {
            throw Errors.argumentOutOfRange("index");
        }

        public nonSeparatorAt(index: number): T {
            throw Errors.argumentOutOfRange("index");
        }

        public separatorAt(index: number): ISyntaxToken {
            throw Errors.argumentOutOfRange("index");
        }
    }

    var _emptySeparatedList: ISeparatedSyntaxList<ISyntaxNodeOrToken> = new EmptySeparatedSyntaxList<ISyntaxNodeOrToken>();

    export function emptySeparatedList<T extends ISyntaxNodeOrToken>(): ISeparatedSyntaxList<T> {
        return <ISeparatedSyntaxList<T>>_emptySeparatedList;
    }

    class SingletonSeparatedSyntaxList<T extends ISyntaxNodeOrToken> implements ISeparatedSyntaxList<T> {
        public parent: ISyntaxElement = null;

        constructor(private item: T) {
            Syntax.setParentForChildren(this);
        }

        public syntaxTree(): SyntaxTree {
            return this.parent.syntaxTree();
        }

        public toJSON(key: any) {
            return [this.item];
        }

        public kind() { return SyntaxKind.SeparatedList; }

        public childCount() { return 1; }
        public nonSeparatorCount() { return 1; }
        public separatorCount() { return 0; }

        public isShared(): boolean {
            return false;
        }

        public childAt(index: number): ISyntaxNodeOrToken {
            if (index !== 0) {
                throw Errors.argumentOutOfRange("index");
            }

            return this.item;
        }

        public setChildAt(index: number, value: ISyntaxNodeOrToken): void {
            if (index !== 0) {
                throw Errors.argumentOutOfRange("index");
            }

            this.item = <T>value;
            value.parent = this;
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
    }

    class NormalSeparatedSyntaxList<T extends ISyntaxNodeOrToken> implements ISeparatedSyntaxList<T> {
        public parent: ISyntaxElement = null;
        private _data: number;

        constructor(private elements: ISyntaxNodeOrToken[]) {
            Syntax.setParentForChildren(this);
        }

        public syntaxTree(): SyntaxTree {
            return this.parent.syntaxTree();
        }

        public kind() { return SyntaxKind.SeparatedList; }

        public toJSON(key: any) { return this.elements; }

        public childCount() { return this.elements.length; }
        public nonSeparatorCount() { return IntegerUtilities.integerDivide(this.elements.length + 1, 2); }
        public separatorCount() { return IntegerUtilities.integerDivide(this.elements.length, 2); }

        public isShared(): boolean {
            return false;
        }
        
        public childAt(index: number): ISyntaxNodeOrToken {
            if (index < 0 || index >= this.elements.length) {
                throw Errors.argumentOutOfRange("index");
            }

            return this.elements[index];
        }

        public setChildAt(index: number, value: ISyntaxNodeOrToken): void {
            if (index < 0 || index >= this.elements.length) {
                throw Errors.argumentOutOfRange("index");
            }

            this.elements[index] = value;
            value.parent = this;
            this._data = 0;
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