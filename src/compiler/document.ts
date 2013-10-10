///<reference path='references.ts' />

module TypeScript {
    export class Document {
        private _diagnostics: Diagnostic[] = null;
        private _bloomFilter: BloomFilter = null;
        private _script: Script = null;
        private _lineMap: LineMap;

        constructor(public fileName: string,
                    public referencedFiles: string[],
                    private compilationSettings: CompilationSettings,
                    private scriptSnapshot: IScriptSnapshot,
                    public byteOrderMark: ByteOrderMark,
                    public version: number,
                    public isOpen: boolean,
                    private _syntaxTree: SyntaxTree) {
        }

        private cacheSyntaxTreeInfo(syntaxTree: SyntaxTree): void {
            // If we're not keeping around the syntax tree, store the diagnostics and line
            // map so they don't have to be recomputed.
            var start = new Date().getTime();
            this._diagnostics = syntaxTree.diagnostics();
            TypeScript.syntaxDiagnosticsTime += new Date().getTime() - start;

            this._lineMap = syntaxTree.lineMap();
        }

        public script(): Script {
            // If we don't have a script, create one from our parse tree.
            if (!this._script) {
                var start = new Date().getTime();
                var syntaxTree = this.syntaxTree();
                this._script = SyntaxTreeToAstVisitor.visit(syntaxTree, this.fileName, this.compilationSettings, /*incrementalAST:*/ this.isOpen);
                TypeScript.astTranslationTime += new Date().getTime() - start;

                // If we're not open, then we can throw away our syntax tree.  We don't need it from
                // now on.
                if (!this.isOpen) {
                    this._syntaxTree = null;
                }
            }

            return this._script;
        }

        public diagnostics(): Diagnostic[] {
            if (this._diagnostics === null) {
                // force the diagnostics to get created.
                this.syntaxTree();
                Debug.assert(this._diagnostics);
            }

            return this._diagnostics;
        }

        public lineMap(): LineMap {
            if (this._lineMap === null) {
                // force the line map to get created.
                this.syntaxTree();
                Debug.assert(this._lineMap);
            }

            return this._lineMap;
        }

        public syntaxTree(): SyntaxTree {
            var result = this._syntaxTree;
            if (!result) {
                var start = new Date().getTime();

                result = Parser.parse(
                    this.fileName,
                    SimpleText.fromScriptSnapshot(this.scriptSnapshot),
                    TypeScript.isDTSFile(this.fileName),
                    getParseOptions(this.compilationSettings));

                TypeScript.syntaxTreeParseTime += new Date().getTime() - start;

                // If the document is open, store the syntax tree for fast incremental updates.
                if (this.isOpen) {
                    this._syntaxTree = result;
                }
            }

            this.cacheSyntaxTreeInfo(result);
            return result;
        }

        public bloomFilter(): BloomFilter {
            if (!this._bloomFilter) {
                var identifiers = new BlockIntrinsics<boolean>();
                var pre = function (cur: TypeScript.AST, walker: IAstWalker) {
                    if (isValidAstNode(cur)) {
                        if (cur.nodeType() === NodeType.Name) {
                            var nodeText = (<TypeScript.Identifier>cur).text();

                            identifiers[nodeText] = true;
                        }
                    }
                };

                TypeScript.getAstWalkerFactory().walk(this.script(), pre, null, null, identifiers);

                var identifierCount = 0;
                for (var name in identifiers) {
                    if (identifiers[name]) {
                        identifierCount++;
                    }
                }

                this._bloomFilter = new BloomFilter(identifierCount);
                this._bloomFilter.addKeys(identifiers);
            }
            return this._bloomFilter;
        }

        public update(scriptSnapshot: IScriptSnapshot, version: number, isOpen: boolean, textChangeRange: TextChangeRange, settings: CompilationSettings): Document {
            // See if we are currently holding onto a syntax tree.  We may not be because we're 
            // either a closed file, or we've just been lazy and haven't had to create the syntax
            // tree yet.  Access the field instead of the method so we don't accidently realize
            // the old syntax tree.
            var oldSyntaxTree = this._syntaxTree;

            var text = SimpleText.fromScriptSnapshot(scriptSnapshot);

            // If we don't have a text change, or we don't have an old syntax tree, then do a full
            // parse.  Otherwise, do an incremental parse.
            var newSyntaxTree = textChangeRange === null || oldSyntaxTree === null
                ? TypeScript.Parser.parse(this.fileName, text, TypeScript.isDTSFile(this.fileName), getParseOptions(this.compilationSettings))
                : TypeScript.Parser.incrementalParse(oldSyntaxTree, textChangeRange, text);

            return new Document(this.fileName, this.referencedFiles, this.compilationSettings, scriptSnapshot, this.byteOrderMark, version, isOpen, newSyntaxTree);
        }

        public static create(fileName: string, scriptSnapshot: IScriptSnapshot, byteOrderMark: ByteOrderMark, version: number, isOpen: boolean, referencedFiles: string[], compilationSettings: CompilationSettings): Document {
            return new Document(fileName, referencedFiles, compilationSettings, scriptSnapshot, byteOrderMark, version, isOpen, /*syntaxTree:*/ null);
        }
    }
}