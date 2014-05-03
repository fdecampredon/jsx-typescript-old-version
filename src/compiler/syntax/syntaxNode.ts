///<reference path='references.ts' />

module TypeScript {
    export class SyntaxNode implements ISyntaxNodeOrToken {
        public parent: ISyntaxElement = null;

        constructor(private _data: number) {
            // this._data = parsedInStrictMode ? SyntaxConstants.NodeParsedInStrictModeMask : 0;
        }

        public resetData(): void {
            this._data = this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0
        }

        public syntaxTree(): SyntaxTree {
            return this.parent.syntaxTree();
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

            if (this.parsedInStrictMode()) {
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

        // True if this node was parsed while the parser was in 'strict' mode.  A node parsed in strict
        // mode cannot be reused if the parser is non-strict mode (and vice versa).  This is because 
        // the parser parses things differently in strict mode and thus the tokens may be interpretted
        // differently if the mode is changed. 
        public parsedInStrictMode(): boolean {
            return (this._data & SyntaxConstants.NodeParsedInStrictModeMask) !== 0;
        }
    }
}