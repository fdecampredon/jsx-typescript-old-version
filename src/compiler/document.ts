///<reference path='references.ts' />

module TypeScript {
    export class Document {
        private _diagnostics: Diagnostic[] = null;
        private _syntaxTree: SyntaxTree = null;
        private _bloomFilter: BloomFilter = null;
        public script: Script;
        public lineMap: LineMap;

        constructor(public fileName: string,
                    public referencedFiles: string[],
                    private compilationSettings: CompilationSettings,
                    public scriptSnapshot: IScriptSnapshot,
                    public byteOrderMark: ByteOrderMark,
                    public version: number,
                    public isOpen: boolean,
                    syntaxTree: SyntaxTree) {

            if (isOpen) {
                this._syntaxTree = syntaxTree;
            }
            else {
                // Don't store the syntax tree for a closed file.
                var start = new Date().getTime();
                this._diagnostics = syntaxTree.diagnostics();
                TypeScript.syntaxDiagnosticsTime += new Date().getTime() - start;
            }

            this.lineMap = syntaxTree.lineMap();

            var start = new Date().getTime();
            this.script = SyntaxTreeToAstVisitor.visit(syntaxTree, fileName, compilationSettings, isOpen);
            TypeScript.astTranslationTime += new Date().getTime() - start;
        }

        public diagnostics(): Diagnostic[] {
            if (this._diagnostics === null) {
                this._diagnostics = this._syntaxTree.diagnostics();
            }

            return this._diagnostics;
        }

        public syntaxTree(): SyntaxTree {
            if (this._syntaxTree) {
                return this._syntaxTree;
            }

            return Parser.parse(
                this.fileName,
                SimpleText.fromScriptSnapshot(this.scriptSnapshot),
                TypeScript.isDTSFile(this.fileName),
                getParseOptions(this.compilationSettings));
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

                TypeScript.getAstWalkerFactory().walk(this.script, pre, null, null, identifiers);

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

            var oldScript = this.script;
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
            // for an open file, make a syntax tree and a script, and store both around.
            var start = new Date().getTime();
            var syntaxTree = Parser.parse(fileName, SimpleText.fromScriptSnapshot(scriptSnapshot), TypeScript.isDTSFile(fileName), getParseOptions(compilationSettings));
            TypeScript.syntaxTreeParseTime += new Date().getTime() - start;

            var document = new Document(fileName, referencedFiles, compilationSettings, scriptSnapshot, byteOrderMark, version, isOpen, syntaxTree);

            return document;
        }
    }
}