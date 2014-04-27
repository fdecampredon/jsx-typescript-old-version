///<reference path='references.ts' />

module TypeScript {
    export class Document {
        private _diagnostics: Diagnostic[] = null;
        private _bloomFilter: BloomFilter = null;
        private _lineMap: LineMap = null;

        private _declASTMap: ISyntaxElement[] = [];
        private _astDeclMap: PullDecl[] = [];
        private _amdDependencies: string[] = undefined;

        private _externalModuleIndicatorSpan: TextSpan = undefined;

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
            this._declASTMap.length = 0;
            this._astDeclMap.length = 0;
            this._topLevelDecl = null;

            this._syntaxTree = null;
            this._diagnostics = null;
            this._bloomFilter = null;
        }

        public isDeclareFile(): boolean {
            return isDTSFile(this.fileName);
        }

        private cacheSyntaxTreeInfo(syntaxTree: SyntaxTree): void {
            // If we're not keeping around the syntax tree, store the diagnostics and line
            // map so they don't have to be recomputed.
            var start = new Date().getTime();
            this._diagnostics = syntaxTree.diagnostics();
            TypeScript.syntaxDiagnosticsTime += new Date().getTime() - start;

            this._lineMap = syntaxTree.lineMap();

            var sourceUnit = syntaxTree.sourceUnit();
            var leadingTrivia = sourceUnit.leadingTrivia();

            this._externalModuleIndicatorSpan = this.getImplicitImportSpan(leadingTrivia) || this.getTopLevelImportOrExportSpan(sourceUnit);

            var amdDependencies: string[] = [];
            for (var i = 0, n = leadingTrivia.count(); i < n; i++) {
                var trivia = leadingTrivia.syntaxTriviaAt(i);
                if (trivia.isComment()) {
                    var amdDependency = this.getAmdDependency(trivia.fullText());
                    if (amdDependency) {
                        amdDependencies.push(amdDependency);
                    }
                }
            }

            this._amdDependencies = amdDependencies;
        }

        private getAmdDependency(comment: string): string {
            var amdDependencyRegEx = /^\/\/\/\s*<amd-dependency\s+path=('|")(.+?)\1/gim;
            var match = amdDependencyRegEx.exec(comment);
            return match ? match[2] : null;
        }

        private getImplicitImportSpan(sourceUnitLeadingTrivia: ISyntaxTriviaList): TextSpan {
            for (var i = 0, n = sourceUnitLeadingTrivia.count(); i < n; i++) {
                var trivia = sourceUnitLeadingTrivia.syntaxTriviaAt(i);

                if (trivia.isComment()) {
                    var span = this.getImplicitImportSpanWorker(trivia);
                    if (span) {
                        return span;
                    }
                }
            }

            return null;
        }

        private getImplicitImportSpanWorker(trivia: ISyntaxTrivia): TextSpan {
            var implicitImportRegEx = /^(\/\/\/\s*<implicit-import\s*)*\/>/gim;
            var match = implicitImportRegEx.exec(trivia.fullText());

            if (match) {
                return new TextSpan(trivia.fullStart(), trivia.fullWidth());
            }

            return null;
        }

        private getTopLevelImportOrExportSpan(node: SourceUnitSyntax): TextSpan {
            var firstToken: ISyntaxToken;

            for (var i = 0, n = node.moduleElements.childCount(); i < n; i++) {
                var moduleElement = node.moduleElements.childAt(i);

                firstToken = moduleElement.firstToken();
                if (firstToken !== null && firstToken.kind() === SyntaxKind.ExportKeyword) {
                    return new TextSpan(firstToken.start(), firstToken.width());
                }

                if (moduleElement.kind() === SyntaxKind.ImportDeclaration) {
                    var importDecl = <ImportDeclarationSyntax>moduleElement;
                    if (importDecl.moduleReference.kind() === SyntaxKind.ExternalModuleReference) {
                        return new TextSpan(importDecl.start(), importDecl.width());
                    }
                }
            }

            return null;;
        }

        public sourceUnit(): SourceUnitSyntax {
            // If we don't have a script, create one from our parse tree.
            return this.syntaxTree().sourceUnit();
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

        public isExternalModule(): boolean {
            return this.externalModuleIndicatorSpan() !== null;
        }

        // TODO: remove this once we move entirely over to fidelity.  Right now we don't have 
        // enough information in the AST to reconstruct this span data, so we cache and store it
        // on the document.  When we move to fidelity, we can just have the type checker determine
        // this in its own codepath.
        public externalModuleIndicatorSpan(): TextSpan {
            // October 11, 2013
            // External modules are written as separate source files that contain at least one 
            // external import declaration, export assignment, or top-level exported declaration.
            if (this._externalModuleIndicatorSpan === undefined) {
                // force the info about isExternalModule to get created.
                this.syntaxTree();
                Debug.assert(this._externalModuleIndicatorSpan !== undefined);
            }

            return this._externalModuleIndicatorSpan;
        }

        public amdDependencies(): string[] {
            if (this._amdDependencies === undefined) {
                // force the info about the amd dependencies to get created.
                this.syntaxTree();
                Debug.assert(this._amdDependencies !== undefined);
            }

            return this._amdDependencies;
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

                var time = new Date().getTime() - start;

                TypeScript.syntaxTreeParseTime += time;

                this._syntaxTree = result;
            }

            this.cacheSyntaxTreeInfo(result);
            return result;
        }

        public bloomFilter(): BloomFilter {
            if (!this._bloomFilter) {
                var identifiers = createIntrinsicsObject<boolean>();
                var pre = function (cur: TypeScript.ISyntaxElement) {
                    if (ASTHelpers.isValidAstNode(cur)) {
                        if (cur.kind() === SyntaxKind.IdentifierName) {
                            var nodeText = (<TypeScript.ISyntaxToken>cur).valueText();

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
            return !this._compiler.compilationSettings().outFileOption() || this.isExternalModule();
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
                this._topLevelDecl = DeclarationCreator.create(this, this._semanticInfoChain, this._compiler.compilationSettings());
            }

            return this._topLevelDecl;
        }

        public _getDeclForAST(ast: ISyntaxElement): PullDecl {
            // Ensure we actually have created all our decls before we try to find a mathcing decl
            // for this ast.
            this.topLevelDecl();
            return this._astDeclMap[ast.syntaxID()];
        }

        public getEnclosingDecl(ast: ISyntaxElement): PullDecl {
            if (ast.kind() === SyntaxKind.SourceUnit) {
                return this._getDeclForAST(ast);
            }

            // First, walk up the ISyntaxElement, looking for a decl corresponding to that ISyntaxElement node.
            ast = ast.parent;
            var decl: PullDecl = null;
            while (ast) {
                //if (ast.kind() === SyntaxKind.ModuleDeclaration) {
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
            this._astDeclMap[ast.syntaxID()] = decl;
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