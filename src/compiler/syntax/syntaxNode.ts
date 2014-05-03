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

        public fullStart(): number {
            var token = firstToken(this);
            return token ? token.fullStart() : -1;
        }

        public fullEnd(): number {
            var token = lastToken(this);
            return token ? token.fullEnd() : -1;
        }

        public toJSON(key: any): any {
            var result: any = {}

            for (var name in SyntaxKind) {
                if (<any>SyntaxKind[name] === this.kind()) {
                    result.kind = name;
                    break;
                }
            }

            result.fullStart = this.fullStart();
            result.fullEnd = this.fullEnd();

            result.start = start(this);
            result.end = end(this);

            result.fullWidth = this.fullWidth();
            result.width = width(this);

            if (this.isIncrementallyUnusable()) {
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

        public isIncrementallyUnusable(): boolean {
            return (this.data() & SyntaxConstants.NodeIncrementallyUnusableMask) !== 0;
        }

        // True if this node was parsed while the parser was in 'strict' mode.  A node parsed in strict
        // mode cannot be reused if the parser is non-strict mode (and vice versa).  This is because 
        // the parser parses things differently in strict mode and thus the tokens may be interpretted
        // differently if the mode is changed. 
        public parsedInStrictMode(): boolean {
            return (this.data() & SyntaxConstants.NodeParsedInStrictModeMask) !== 0;
        }

        public fullWidth(): number {
            return this.data() >>> SyntaxConstants.NodeFullWidthShift;
        }

        private computeData(): number {
            var slotCount = this.childCount();

            var fullWidth = 0;

            // If we have no children (like an OmmittedExpressionSyntax), we're automatically not reusable.
            var isIncrementallyUnusable = slotCount === 0;

            for (var i = 0, n = slotCount; i < n; i++) {
                var element = this.childAt(i);

                if (element !== null) {
                    fullWidth += element.fullWidth();

                    /*
                    if (!isIncrementallyUnusable) {
                        
                        var childIsUnusable = element.isIncrementallyUnusable();
                        isIncrementallyUnusable = childIsUnusable;
                    }
                    /*/
                    isIncrementallyUnusable = isIncrementallyUnusable || element.isIncrementallyUnusable();
                    //*/
                }
            }

            return (fullWidth << SyntaxConstants.NodeFullWidthShift)
                 | (isIncrementallyUnusable ? SyntaxConstants.NodeIncrementallyUnusableMask : 0)
                 | SyntaxConstants.NodeDataComputed;
        }

        private data(): number {
            if ((this._data & SyntaxConstants.NodeDataComputed) === 0) {
                this._data |= this.computeData();
            }

            return this._data;
        }
    }
}