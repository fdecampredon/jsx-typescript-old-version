///<reference path='references.ts' />

module TypeScript {
    export class SyntaxNode implements ISyntaxNodeOrToken {
        public parent: ISyntaxElement = null;

        constructor(private _data: number) {
        }

        public resetData(): void {
            // Throw away all data except for if this was parsed in strict more or not.
            this._data = this._data & SyntaxConstants.NodeParsedInStrictModeMask;
        }

        public kind(): SyntaxKind {
            throw Errors.abstract();
        }

        public childCount(): number {
            throw Errors.abstract();
        }

        public childAt(slot: number): ISyntaxElement {
            throw Errors.abstract();
        }

        public isShared(): boolean {
            return false;
        }

        public toJSON(key: any): any {
            var result: any = {}

            for (var name in SyntaxKind) {
                if (<any>SyntaxKind[name] === this.kind()) {
                    result.kind = name;
                    break;
                }
            }

            result.fullStart = fullStart(this);
            result.fullEnd = fullEnd(this);

            result.start = start(this);
            result.end = end(this);

            result.fullWidth = fullWidth(this);
            result.width = width(this);

            if (isIncrementallyUnusable(this)) {
                result.isIncrementallyUnusable = true;
            }

            if (parsedInStrictMode(this)) {
                result.parsedInStrictMode = true;
            }

            var thisAsIndexable: IIndexable<any> = <any>this;
            for (var i = 0, n = this.childCount(); i < n; i++) {
                var value = this.childAt(i);

                if (value) {
                    for (var name in this) {
                        if (value === thisAsIndexable[name]) {
                            result[name] = value;
                            break;
                        }
                    }
                }
            }

            return result;
        }
    }
}