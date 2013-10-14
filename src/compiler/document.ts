///<reference path='references.ts' />

module TypeScript {
    export class Document {
        private _diagnostics: Diagnostic[] = null;
        private _bloomFilter: BloomFilter = null;
        private _script: Script = null;
        private _lineMap: LineMap = null;

        private _declASTMap = new DataMap<AST>();
        private _astDeclMap = new DataMap<PullDecl>();

        constructor(private _compiler: TypeScriptCompiler,
                    private _semanticInfoChain: SemanticInfoChain,
                    public fileName: string,
                    public referencedFiles: string[],
                    private _scriptSnapshot: IScriptSnapshot,
                    public byteOrderMark: ByteOrderMark,
                    public version: number,
                    public isOpen: boolean,
                    private _syntaxTree: SyntaxTree,
                    private _topLevelDecl: PullDecl) {
        }

        // Only for use by the semantic info chain.
        public invalidate(): void {
            // Dump all information related to syntax.  We'll have to recompute it when asked.
            this._declASTMap = new DataMap<AST>();
            this._astDeclMap = new DataMap<PullDecl>();
            this._topLevelDecl = null;

            this._syntaxTree = null;
            this._script = null;
            this._diagnostics = null;
            this._bloomFilter = null;
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
                this._script = SyntaxTreeToAstVisitor.visit(syntaxTree, this.fileName, this._compiler.compilationSettings(), /*incrementalAST:*/ this.isOpen);
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
                    SimpleText.fromScriptSnapshot(this._scriptSnapshot),
                    TypeScript.isDTSFile(this.fileName),
                    getParseOptions(this._compiler.compilationSettings()));

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

        // Returns true if this file should get emitted into its own unique output file.  
        // Otherwise, it should be written into a single output file along with the rest of hte
        // documents in the compilation.
        public emitToOwnOutputFile(): boolean {
            // If we haven't specified an output file in our settings, then we're definitely 
            // emitting to our own file.  Also, if we're an external module, then we're 
            // definitely emitting to our own file.
            return !this._compiler.compilationSettings().outFileOption() || this.script().isExternalModule;
        }

        public update(scriptSnapshot: IScriptSnapshot, version: number, isOpen: boolean, textChangeRange: TextChangeRange): Document {
            // See if we are currently holding onto a syntax tree.  We may not be because we're 
            // either a closed file, or we've just been lazy and haven't had to create the syntax
            // tree yet.  Access the field instead of the method so we don't accidently realize
            // the old syntax tree.
            var oldSyntaxTree = this._syntaxTree;

            var text = SimpleText.fromScriptSnapshot(scriptSnapshot);

            // If we don't have a text change, or we don't have an old syntax tree, then do a full
            // parse.  Otherwise, do an incremental parse.
            var newSyntaxTree = textChangeRange === null || oldSyntaxTree === null
                ? TypeScript.Parser.parse(this.fileName, text, TypeScript.isDTSFile(this.fileName), getParseOptions(this._compiler.compilationSettings()))
                : TypeScript.Parser.incrementalParse(oldSyntaxTree, textChangeRange, text);

            return new Document(this._compiler, this._semanticInfoChain, this.fileName, this.referencedFiles, scriptSnapshot, this.byteOrderMark, version, isOpen, newSyntaxTree, /*topLevelDecl:*/ null);
        }

        public static create(compiler: TypeScriptCompiler, semanticInfoChain: SemanticInfoChain, fileName: string, scriptSnapshot: IScriptSnapshot, byteOrderMark: ByteOrderMark, version: number, isOpen: boolean, referencedFiles: string[]): Document {
            return new Document(compiler, semanticInfoChain, fileName, referencedFiles, scriptSnapshot, byteOrderMark, version, isOpen, /*syntaxTree:*/ null, /*topLevelDecl:*/ null);
        }

        public topLevelDecl(): PullDecl {
            if (this._topLevelDecl === null) {
                this._topLevelDecl = DeclarationCreator.create(this.script(), this._semanticInfoChain);
            }

            return this._topLevelDecl;
        }

        public _getDeclForAST(ast: AST): PullDecl {
            // Ensure we actually have created all our decls before we try to find a mathcing decl
            // for this ast.
            this.topLevelDecl();
            return this._astDeclMap.read(ast.astIDString);
        }

        public _setDeclForAST(ast: AST, decl: PullDecl): void {
            Debug.assert(decl.fileName() === this.fileName);
            this._astDeclMap.link(ast.astIDString, decl);
        }

        public _getASTForDecl(decl: PullDecl): AST {
            return this._declASTMap.read(decl.declIDString);
        }

        public _setASTForDecl(decl: PullDecl, ast: AST): void {
            Debug.assert(decl.fileName() === this.fileName);
            this._declASTMap.link(decl.declIDString, ast);
        }
    }
}