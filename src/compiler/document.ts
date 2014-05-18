///<reference path='references.ts' />

module TypeScript {
    export interface IncrementalParse { 
        (oldSyntaxTree: SyntaxTree, textChangeRange: TextChangeRange, newText: ISimpleText): SyntaxTree
    }


    export class Document implements IASTForDeclMap {
        private _bloomFilter: BloomFilter = null;

        private _declASTMap: ISyntaxElement[] = [];
        private _astDeclMap: PullDecl[] = [];

        // By default, our Document class doesn't support incremental update of its contents.
        // However, we enable other layers (like teh services layer) to inject the capability
        // into us by setting this function.
        public static incrementalParse: IncrementalParse = null;

        constructor(private compilationSettings: ImmutableCompilationSettings,
                    public fileName: string,
                    public referencedFiles: string[],
                    private _scriptSnapshot: IScriptSnapshot,
                    public byteOrderMark: ByteOrderMark,
                    public version: number,
                    public isOpen: boolean,
                    private _syntaxTree: SyntaxTree,
                    private _topLevelDecl: PullDecl) {
        }

        public isDeclareFile(): boolean {
            return isDTSFile(this.fileName);
        }

        public sourceUnit(): SourceUnitSyntax {
            // If we don't have a script, create one from our parse tree.
            return this.syntaxTree().sourceUnit();
        }

        public diagnostics(): Diagnostic[] {
            return this.syntaxTree().diagnostics();
        }

        public lineMap(): LineMap {
            return this.syntaxTree().lineMap();
        }

        public syntaxTree(): SyntaxTree {
            if (!this._syntaxTree) {
                var start = new Date().getTime();

                this._syntaxTree = Parser.parse(
                    this.fileName, SimpleText.fromScriptSnapshot(this._scriptSnapshot), this.compilationSettings.codeGenTarget(), this.isDeclareFile());

                var time = new Date().getTime() - start;

                TypeScript.syntaxTreeParseTime += time;
            }

            return this._syntaxTree;
        }

        public bloomFilter(): BloomFilter {
            if (!this._bloomFilter) {
                var identifiers = createIntrinsicsObject<boolean>();
                var pre = function (cur: TypeScript.ISyntaxElement) {
                    if (ASTHelpers.isValidAstNode(cur)) {
                        if (cur.kind() === SyntaxKind.IdentifierName) {
                            var nodeText = tokenValueText((<TypeScript.ISyntaxToken>cur));

                            identifiers[nodeText] = true;
                        }
                    }
                };

                TypeScript.getAstWalkerFactory().simpleWalk(this.sourceUnit(), pre, null, identifiers);

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
            return !this.compilationSettings.outFileOption() || this.syntaxTree().isExternalModule();
        }

        public update(scriptSnapshot: IScriptSnapshot, version: number, isOpen: boolean, textChangeRange: TextChangeRange): Document {
            // See if we are currently holding onto a syntax tree.  We may not be because we're 
            // either a closed file, or we've just been lazy and haven't had to create the syntax
            // tree yet.  Access the field instead of the method so we don't accidently realize
            // the old syntax tree.
            var oldSyntaxTree = this._syntaxTree;

            if (textChangeRange !== null && Debug.shouldAssert(AssertionLevel.Normal)) {
                var oldText = this._scriptSnapshot;
                var newText = scriptSnapshot;

                TypeScript.Debug.assert((oldText.getLength() - textChangeRange.span().length() + textChangeRange.newLength()) === newText.getLength());

                if (Debug.shouldAssert(AssertionLevel.VeryAggressive)) {
                    var oldTextPrefix = oldText.getText(0, textChangeRange.span().start());
                    var newTextPrefix = newText.getText(0, textChangeRange.span().start());
                    TypeScript.Debug.assert(oldTextPrefix === newTextPrefix);

                    var oldTextSuffix = oldText.getText(textChangeRange.span().end(), oldText.getLength());
                    var newTextSuffix = newText.getText(textChangeRange.newSpan().end(), newText.getLength());
                    TypeScript.Debug.assert(oldTextSuffix === newTextSuffix);
                }
            }

            var text = SimpleText.fromScriptSnapshot(scriptSnapshot);

            // If we don't have a text change, or we don't have an old syntax tree, then do a full
            // parse.  Otherwise, do an incremental parse.
            var newSyntaxTree = textChangeRange === null || oldSyntaxTree === null || Document.incrementalParse === null
                ? TypeScript.Parser.parse(this.fileName, text, this.compilationSettings.codeGenTarget(), TypeScript.isDTSFile(this.fileName))
                : Document.incrementalParse(oldSyntaxTree, textChangeRange, text);

            return new Document(this.compilationSettings, this.fileName, this.referencedFiles, scriptSnapshot, this.byteOrderMark, version, isOpen, newSyntaxTree, /*topLevelDecl:*/ null);
        }

        public static create(compilationSettings: ImmutableCompilationSettings, fileName: string, scriptSnapshot: IScriptSnapshot, byteOrderMark: ByteOrderMark, version: number, isOpen: boolean, referencedFiles: string[]): Document {
            return new Document(compilationSettings, fileName, referencedFiles, scriptSnapshot, byteOrderMark, version, isOpen, /*syntaxTree:*/ null, /*topLevelDecl:*/ null);
        }

        public topLevelDecl(): PullDecl {
            if (this._topLevelDecl === null) {
                this._topLevelDecl = DeclarationCreator.create(this, this.compilationSettings);
            }

            return this._topLevelDecl;
        }

        public _getDeclForAST(ast: ISyntaxElement): PullDecl {
            // Ensure we actually have created all our decls before we try to find a mathcing decl
            // for this ast.
            this.topLevelDecl();
            return this._astDeclMap[syntaxID(ast)];
        }

        public getEnclosingDecl(ast: ISyntaxElement): PullDecl {
            if (ast.kind() === SyntaxKind.SourceUnit) {
                return this._getDeclForAST(ast);
            }

            // First, walk up the ISyntaxElement, looking for a decl corresponding to that ISyntaxElement node.
            ast = ast.parent;
            var decl: PullDecl = null;
            while (ast) {
                //if (ast.kind === SyntaxKind.ModuleDeclaration) {
                //    var moduleDecl = <ModuleDeclarationSyntax>ast;
                //    decl = this._getDeclForAST(<ISyntaxElement>moduleDecl.stringLiteral || ArrayUtilities.last(getModuleNames(moduleDecl.name)));
                //}
                //else {
                decl = this._getDeclForAST(ast);
                //}

                if (decl) {
                    break;
                }

                ast = ast.parent;
            }

            // Now, skip over certain decls.  The resolver never considers these the 'enclosing' 
            // decl for an ISyntaxElement node.
            return decl._getEnclosingDeclFromParentDecl();
        }

        public _setDeclForAST(ast: ISyntaxElement, decl: PullDecl): void {
            Debug.assert(decl.fileName() === this.fileName);
            this._astDeclMap[syntaxID(ast)] = decl;
        }

        public _getASTForDecl(decl: PullDecl): ISyntaxElement {
            return this._declASTMap[decl.declID];
        }

        public _setASTForDecl(decl: PullDecl, ast: ISyntaxElement): void {
            Debug.assert(decl.fileName() === this.fileName);
            this._declASTMap[decl.declID] = ast;
        }
    }
}