//
// Copyright (c) Microsoft Corporation.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

///<reference path='references.ts' />

module TypeScript {
    export enum EmitContainer {
        Prog,
        Module,
        DynamicModule,
        Class,
        Constructor,
        Function,
        Args,
        Interface,
    }

    export class EmitState {
        public column: number;
        public line: number;
        public container: EmitContainer;

        constructor() {
            this.column = 0;
            this.line = 0;
            this.container = EmitContainer.Prog;
        }
    }

    export class EmitOptions {
        private _diagnostic: Diagnostic = null;

        private _settings: ImmutableCompilationSettings = null;
        private _commonDirectoryPath = "";
        private _sharedOutputFile = "";
        private _sourceRootDirectory = "";
        private _sourceMapRootDirectory = "";
        private _outputDirectory = "";

        public diagnostic(): Diagnostic { return this._diagnostic; }

        public commonDirectoryPath() { return this._commonDirectoryPath; }
        public sharedOutputFile() { return this._sharedOutputFile; }
        public sourceRootDirectory() { return this._sourceRootDirectory; }
        public sourceMapRootDirectory() { return this._sourceMapRootDirectory; }
        public outputDirectory() { return this._outputDirectory; }

        public compilationSettings() { return this._settings; }

        constructor(compiler: TypeScriptCompiler,
                    public resolvePath: (path: string) => string) {

            var settings = compiler.compilationSettings();
            this._settings = settings;

            if (settings.moduleGenTarget() === ModuleGenTarget.Unspecified && compiler._isDynamicModuleCompilation()) {
                this._diagnostic = new Diagnostic(null, null, 0, 0, DiagnosticCode.Cannot_compile_external_modules_unless_the_module_flag_is_provided, null);
                return;
            }

            if (!settings.mapSourceFiles()) {
                // Error to specify --mapRoot or --sourceRoot without mapSourceFiles
                if (settings.mapRoot()) {
                    if (settings.sourceRoot()) {
                        this._diagnostic = new Diagnostic(null, null, 0, 0, DiagnosticCode.Options_mapRoot_and_sourceRoot_cannot_be_specified_without_specifying_sourcemap_option, null);
                        return;
                    } else {
                        this._diagnostic = new Diagnostic(null, null, 0, 0, DiagnosticCode.Option_mapRoot_cannot_be_specified_without_specifying_sourcemap_option, null);
                        return;
                    }
                }
                else if (settings.sourceRoot()) {
                    this._diagnostic = new Diagnostic(null, null, 0, 0, DiagnosticCode.Option_sourceRoot_cannot_be_specified_without_specifying_sourcemap_option, null);
                    return;
                }
            }

            this._sourceMapRootDirectory = convertToDirectoryPath(switchToForwardSlashes(settings.mapRoot()));
            this._sourceRootDirectory = convertToDirectoryPath(switchToForwardSlashes(settings.sourceRoot()));

            if (settings.outFileOption() ||
                settings.outDirOption() ||
                settings.mapRoot() ||
                settings.sourceRoot()) {

                if (settings.outFileOption()) {
                    this._sharedOutputFile = switchToForwardSlashes(resolvePath(settings.outFileOption()));
                }

                if (settings.outDirOption()) {
                    this._outputDirectory = convertToDirectoryPath(switchToForwardSlashes(resolvePath(settings.outDirOption())));
                }

                // Parse the directory structure
                if (this._outputDirectory || this._sourceMapRootDirectory || this.sourceRootDirectory) {
                    this.determineCommonDirectoryPath(compiler);
                }
            }
        }

        private determineCommonDirectoryPath(compiler: TypeScriptCompiler): void {
            var commonComponents: string[] = [];
            var commonComponentsLength = -1;

            var fileNames = compiler.fileNames();
            for (var i = 0, len = fileNames.length; i < len; i++) {
                var fileName = fileNames[i];
                var document = compiler.getDocument(fileNames[i]);
                var sourceUnit = document.sourceUnit();

                if (!document.isDeclareFile()) {
                    var fileComponents = filePathComponents(fileName);
                    if (commonComponentsLength === -1) {
                        // First time at finding common path
                        // So common path = directory of file
                        commonComponents = fileComponents;
                        commonComponentsLength = commonComponents.length;
                    } else {
                        var updatedPath = false;
                        for (var j = 0; j < commonComponentsLength && j < fileComponents.length; j++) {
                            if (commonComponents[j] !== fileComponents[j]) {
                                // The new components = 0 ... j -1
                                commonComponentsLength = j;
                                updatedPath = true;

                                if (j === 0) {
                                    if (this._outputDirectory || this._sourceMapRootDirectory) {
                                        // Its error to not have common path
                                        this._diagnostic = new Diagnostic(null, null, 0, 0, DiagnosticCode.Cannot_find_the_common_subdirectory_path_for_the_input_files, null);
                                        return;
                                    }

                                    return;
                                }

                                break;
                            }
                        }

                        // If the fileComponent path completely matched and less than already found update the length
                        if (!updatedPath && fileComponents.length < commonComponentsLength) {
                            commonComponentsLength = fileComponents.length;
                        }
                    }
                }
            }

            this._commonDirectoryPath = commonComponents.slice(0, commonComponentsLength).join("/") + "/";
        }
    }

    export class Indenter {
        static indentStep: number = 4;
        static indentStepString: string = "    ";
        static indentStrings: string[] = [];
        public indentAmt: number = 0;

        public increaseIndent() {
            this.indentAmt += Indenter.indentStep;
        }

        public decreaseIndent() {
            this.indentAmt -= Indenter.indentStep;
        }

        public getIndent() {
            var indentString = Indenter.indentStrings[this.indentAmt];
            if (indentString === undefined) {
                indentString = "";
                for (var i = 0; i < this.indentAmt; i = i + Indenter.indentStep) {
                    indentString += Indenter.indentStepString;
                }
                Indenter.indentStrings[this.indentAmt] = indentString;
            }
            return indentString;
        }
    }

    export function lastParameterIsRest(parameterList: ParameterListSyntax): boolean {
        var parameters = parameterList.parameters;
        return parameters.nonSeparatorCount() > 0 && (<ParameterSyntax>parameters.nonSeparatorAt(parameters.nonSeparatorCount() - 1)).dotDotDotToken !== null;
    }

    export class Emitter {
        public globalThisCapturePrologueEmitted = false;
        public extendsPrologueEmitted = false;
        public thisClassNode: ClassDeclarationSyntax = null;
        public inArrowFunction: boolean = false;
        public moduleName = "";
        public emitState = new EmitState();
        public indenter = new Indenter();
        public sourceMapper: SourceMapper = null;
        public captureThisStmtString = "var _this = this;";
        private currentVariableDeclaration: VariableDeclarationSyntax;
        private declStack: PullDecl[] = [];
        private exportAssignmentIdentifier: string = null;
        private inWithBlock = false;

        public document: Document = null;
        private copyrightElement: ISyntaxElement = null;

        constructor(public emittingFileName: string,
            public outfile: TextWriter,
            public emitOptions: EmitOptions,
            private semanticInfoChain: SemanticInfoChain) {
        }

        private pushDecl(decl: PullDecl) {
            if (decl) {
                this.declStack[this.declStack.length] = decl;
            }
        }

        private popDecl(decl: PullDecl) {
            if (decl) {
                this.declStack.length--;
            }
        }

        private getEnclosingDecl() {
            var declStackLen = this.declStack.length;
            var enclosingDecl = declStackLen > 0 ? this.declStack[declStackLen - 1] : null;
            return enclosingDecl;
        }

        public setExportAssignmentIdentifier(id: string) {
            this.exportAssignmentIdentifier = id;
        }

        public getExportAssignmentIdentifier() {
            return this.exportAssignmentIdentifier;
        }

        public setDocument(document: Document) {
            this.document = document;
        }

        public shouldEmitImportDeclaration(importDeclAST: ImportDeclarationSyntax) {
            return importDeclarationIsElided(importDeclAST, this.semanticInfoChain, this.emitOptions.compilationSettings());
        }

        public emitImportDeclaration(importDeclAST: ImportDeclarationSyntax) {
            var isExternalModuleReference = importDeclAST.moduleReference.kind() === SyntaxKind.ExternalModuleReference;
            var importDecl = this.semanticInfoChain.getDeclForAST(importDeclAST);
            var isExported = hasFlag(importDecl.flags, PullElementFlags.Exported);
            var isAmdCodeGen = this.emitOptions.compilationSettings().moduleGenTarget() == ModuleGenTarget.Asynchronous;

            this.emitComments(importDeclAST, true);

            var importSymbol = <PullTypeAliasSymbol>importDecl.getSymbol();

            var parentSymbol = importSymbol.getContainer();
            var parentKind = parentSymbol ? parentSymbol.kind : PullElementKind.None;
            var associatedParentSymbol = parentSymbol ? parentSymbol.getAssociatedContainerType() : null;
            var associatedParentSymbolKind = associatedParentSymbol ? associatedParentSymbol.kind : PullElementKind.None;

            var needsPropertyAssignment = false;
            var usePropertyAssignmentInsteadOfVarDecl = false;
            var moduleNamePrefix: string;

            if (isExported &&
                (parentKind == PullElementKind.Container ||
                parentKind === PullElementKind.DynamicModule ||
                associatedParentSymbolKind === PullElementKind.Container ||
                associatedParentSymbolKind === PullElementKind.DynamicModule)) {
                if (importSymbol.getExportAssignedTypeSymbol() || importSymbol.getExportAssignedContainerSymbol()) {
                    // Type or container assignment that is exported
                    needsPropertyAssignment = true;
                } else {
                    var valueSymbol = importSymbol.getExportAssignedValueSymbol();
                    if (valueSymbol &&
                        (valueSymbol.kind == PullElementKind.Method || valueSymbol.kind == PullElementKind.Function)) {
                        needsPropertyAssignment = true;
                    } else {
                        usePropertyAssignmentInsteadOfVarDecl = true;
                    }
                }

                // Calculate what name prefix to use
                if (this.emitState.container === EmitContainer.DynamicModule) {
                    moduleNamePrefix = "exports."
                }
                else {
                    moduleNamePrefix = this.moduleName + ".";
                }
            }

            if (isAmdCodeGen && isExternalModuleReference) {
                // For amdCode gen of exported external module reference, do not emit var declaration
                // Emit the property assignment since it is exported
                needsPropertyAssignment = true;
            } else {
                this.recordSourceMappingStart(importDeclAST);
                if (usePropertyAssignmentInsteadOfVarDecl) {
                    this.writeToOutput(moduleNamePrefix);
                } else {
                    this.writeToOutput("var ");
                }
                this.writeToOutput(importDeclAST.identifier.text() + " = ");
                var aliasAST = importDeclAST.moduleReference;

                if (isExternalModuleReference) {
                    this.writeToOutput("require(" + (<ExternalModuleReferenceSyntax>aliasAST).stringLiteral.text() + ")");
                }
                else {
                    this.emitJavascript((<ModuleNameModuleReferenceSyntax>aliasAST).moduleName, false);
                }

                this.recordSourceMappingEnd(importDeclAST);
                this.writeToOutput(";");

                if (needsPropertyAssignment) {
                    this.writeLineToOutput("");
                    this.emitIndent();
                }
            }

            if (needsPropertyAssignment) {
                this.writeToOutputWithSourceMapRecord(moduleNamePrefix + importDeclAST.identifier.text() + " = " + importDeclAST.identifier.text(), importDeclAST);
                this.writeToOutput(";");
            }
            this.emitComments(importDeclAST, false);
        }

        public createSourceMapper(document: Document, jsFileName: string, jsFile: TextWriter, sourceMapOut: TextWriter, resolvePath: (path: string) => string) {
            this.sourceMapper = new SourceMapper(jsFile, sourceMapOut, document, jsFileName, this.emitOptions, resolvePath);
        }

        public setSourceMapperNewSourceFile(document: Document) {
            this.sourceMapper.setNewSourceFile(document, this.emitOptions);
        }

        private updateLineAndColumn(s: string) {
            var lineNumbers = TextUtilities.parseLineStarts(s);
            if (lineNumbers.length > 1) {
                // There are new lines in the string, update the line and column number accordingly
                this.emitState.line += lineNumbers.length - 1;
                this.emitState.column = s.length - lineNumbers[lineNumbers.length - 1];
            } else {
                // No new lines in the string
                this.emitState.column += s.length;
            }
        }

        public writeToOutputWithSourceMapRecord(s: string, astSpan: ISyntaxElement) {
            this.recordSourceMappingStart(astSpan);
            this.writeToOutput(s);
            this.recordSourceMappingEnd(astSpan);
        }

        public writeToOutput(s: string) {
            this.outfile.Write(s);
            this.updateLineAndColumn(s);
        }

        public writeLineToOutput(s: string, force = false) {
            // No need to print a newline if we're already at the start of the line.
            if (!force && s === "" && this.emitState.column === 0) {
                return;
            }

            this.outfile.WriteLine(s);
            this.updateLineAndColumn(s);
            this.emitState.column = 0;
            this.emitState.line++;
        }

        public writeCaptureThisStatement(ast: ISyntaxElement) {
            this.emitIndent();
            this.writeToOutputWithSourceMapRecord(this.captureThisStmtString, ast);
            this.writeLineToOutput("");
        }

        public setContainer(c: number): number {
            var temp = this.emitState.container;
            this.emitState.container = c;
            return temp;
        }

        private getIndentString() {
            return this.indenter.getIndent();
        }

        public emitIndent() {
            this.writeToOutput(this.getIndentString());
        }

        public emitComment(comment: Comment, trailing: boolean, first: boolean, noLeadingSpace = false) {
            if (this.emitOptions.compilationSettings().removeComments()) {
                return;
            }

            var text = getTrimmedTextLines(comment);
            var emitColumn = this.emitState.column;

            if (emitColumn === 0) {
                this.emitIndent();
            }
            else if (trailing && first && !noLeadingSpace) {
                this.writeToOutput(" ");
            }

            if (comment.kind() === SyntaxKind.MultiLineCommentTrivia) {
                this.recordSourceMappingSpanStart(comment);
                this.writeToOutput(text[0]);

                if (text.length > 1 || comment.endsLine) {
                    for (var i = 1; i < text.length; i++) {
                        this.writeLineToOutput("");
                        this.emitIndent();
                        this.writeToOutput(text[i]);
                    }
                    this.recordSourceMappingSpanEnd(comment);
                    this.writeLineToOutput("");
                    // Fall through
                } else {
                    this.recordSourceMappingSpanEnd(comment);
                    this.writeToOutput(" ");
                    return;
                }
            }
            else {
                this.recordSourceMappingSpanStart(comment);
                this.writeToOutput(text[0]);
                this.recordSourceMappingSpanEnd(comment);
                this.writeLineToOutput("");
                // Fall through
            }

            if (!trailing && emitColumn != 0) {
                // If we were indented before, stay indented after.
                this.emitIndent();
            }
        }

        public emitComments(ast: ISyntaxElement, pre: boolean, onlyPinnedOrTripleSlashComments: boolean = false) {
            // Emitting the comments for the exprssion inside an arrow function is handled specially
            // in emitFunctionBodyStatements.  We don't want to emit those comments a second time.
            if (ast && !ast.isShared() && ast.kind() !== SyntaxKind.Block) {
                if (ast.parent.kind() === SyntaxKind.SimpleArrowFunctionExpression || ast.parent.kind() === SyntaxKind.ParenthesizedArrowFunctionExpression) {
                    return;
                }
            }

            if (pre) {
                var preComments = TypeScript.preComments(ast);

                if (preComments && ast === this.copyrightElement) {
                    // We're emitting the comments for the first script element.  Skip any 
                    // copyright comments, as we'll already have emitted those.
                    var copyrightComments = this.getCopyrightComments();
                    preComments = preComments.slice(copyrightComments.length);
                }

                // We're emitting comments on an elided element.  Only keep the comment if it is
                // a triple slash or pinned comment.
                if (onlyPinnedOrTripleSlashComments) {
                    preComments = ArrayUtilities.where(preComments, c => this.isPinnedOrTripleSlash(c));
                }

                this.emitCommentsArray(preComments, /*trailing:*/ false);
            }
            else {
                this.emitCommentsArray(postComments(ast), /*trailing:*/ true);
            }
        }

        private isPinnedOrTripleSlash(comment: Comment): boolean {
            var fullText = comment.fullText();
            if (fullText.match(tripleSlashReferenceRegExp)) {
                return true;
            }
            else {
                return fullText.indexOf("/*!") === 0;
            }
        }

        private emitCommentsArray(comments: Comment[], trailing: boolean, noLeadingSpace = false): void {
            if (!this.emitOptions.compilationSettings().removeComments() && comments) {
                for (var i = 0, n = comments.length; i < n; i++) {
                    this.emitComment(comments[i], trailing, /*first:*/ i === 0, noLeadingSpace);
                }
            }
        }

        public emitObjectLiteralExpression(objectLiteral: ObjectLiteralExpressionSyntax) {
            this.recordSourceMappingStart(objectLiteral);

            // Try to preserve the newlines between elements that the user had.
            this.writeToOutput("{");
            this.emitCommaSeparatedList(objectLiteral, objectLiteral.propertyAssignments, /*buffer:*/ " ", /*preserveNewLines:*/ true);
            this.writeToOutput("}");

            this.recordSourceMappingEnd(objectLiteral);
        }

        public emitArrayLiteralExpression(arrayLiteral: ArrayLiteralExpressionSyntax) {
            this.recordSourceMappingStart(arrayLiteral);
            
            // Try to preserve the newlines between elements that the user had.
            this.writeToOutput("[");
            this.emitCommaSeparatedList(arrayLiteral, arrayLiteral.expressions, /*buffer:*/ "", /*preserveNewLines:*/ true);
            this.writeToOutput("]");

            this.recordSourceMappingEnd(arrayLiteral);
        }

        public emitObjectCreationExpression(objectCreationExpression: ObjectCreationExpressionSyntax) {
            this.recordSourceMappingStart(objectCreationExpression);
            this.writeToOutput("new ");
            var target = objectCreationExpression.expression;

            this.emit(target);
            if (objectCreationExpression.argumentList) {
                this.recordSourceMappingStart(objectCreationExpression.argumentList);
                this.writeToOutput("(");
                this.emitCommaSeparatedList(objectCreationExpression.argumentList, objectCreationExpression.argumentList.arguments, /*buffer:*/ "", /*preserveNewLines:*/ false);
                this.writeToOutputWithSourceMapRecord(")", objectCreationExpression.argumentList.closeParenToken);
                this.recordSourceMappingEnd(objectCreationExpression.argumentList);
            }

            this.recordSourceMappingEnd(objectCreationExpression);
        }

        public getConstantDecl(dotExpr: MemberAccessExpressionSyntax): PullEnumElementDecl {
            var pullSymbol = this.semanticInfoChain.getSymbolForAST(dotExpr);
            if (pullSymbol && pullSymbol.kind === PullElementKind.EnumMember) {
                var pullDecls = pullSymbol.getDeclarations();
                if (pullDecls.length === 1) {
                    var pullDecl = pullDecls[0];
                    if (pullDecl.kind === PullElementKind.EnumMember) {
                        return <PullEnumElementDecl>pullDecl;
                    }
                }
            }

            return null;
        }

        public tryEmitConstant(dotExpr: MemberAccessExpressionSyntax) {
            var propertyName = dotExpr.name;
            var boundDecl = this.getConstantDecl(dotExpr);
            if (boundDecl) {
                var value = boundDecl.constantValue;
                if (value !== null) {
                    this.recordSourceMappingStart(dotExpr);
                    this.writeToOutput(value.toString());
                    var comment = " /* ";
                    comment += propertyName.text();
                    comment += " */";
                    this.writeToOutput(comment);
                    this.recordSourceMappingEnd(dotExpr);
                    return true;
                }
            }

            return false;
        }

        public emitInvocationExpression(callNode: InvocationExpressionSyntax) {
            this.recordSourceMappingStart(callNode);
            var target = callNode.expression;
            var args = callNode.argumentList.arguments;

            if (target.kind() === SyntaxKind.MemberAccessExpression && (<MemberAccessExpressionSyntax>target).expression.kind() === SyntaxKind.SuperKeyword) {
                this.emit(target);
                this.writeToOutput(".call");
                this.recordSourceMappingStart(args);
                this.writeToOutput("(");
                this.emitThis();
                if (args && args.nonSeparatorCount() > 0) {
                    this.writeToOutput(", ");
                    this.emitCommaSeparatedList(callNode.argumentList, args, /*buffer:*/ "", /*preserveNewLines:*/ false);
                }
            } else {
                if (callNode.expression.kind() === SyntaxKind.SuperKeyword && this.emitState.container === EmitContainer.Constructor) {
                    this.writeToOutput("_super.call");
                }
                else {
                    this.emitJavascript(target, false);
                }
                this.recordSourceMappingStart(args);
                this.writeToOutput("(");
                if (callNode.expression.kind() === SyntaxKind.SuperKeyword && this.emitState.container === EmitContainer.Constructor) {
                    this.writeToOutput("this");
                    if (args && args.nonSeparatorCount() > 0) {
                        this.writeToOutput(", ");
                    }
                }
                this.emitCommaSeparatedList(callNode.argumentList, args, /*buffer:*/ "", /*preserveNewLines:*/ false);
            }

            this.writeToOutputWithSourceMapRecord(")", callNode.argumentList.closeParenToken);
            this.recordSourceMappingEnd(args);
            this.recordSourceMappingEnd(callNode);
        }

        private emitParameterList(list: ParameterListSyntax): void {
            this.writeToOutput("(");
            this.emitCommentsArray(convertTokenTrailingComments(list.openParenToken), /*trailing:*/ true, /*noLeadingSpace:*/ true);
            this.emitFunctionParameters(Parameters.fromParameterList(list));
            this.writeToOutput(")");
        }

        private emitFunctionParameters(parameters: IParameters): void {
            var argsLen = 0;

            if (parameters) {
                var parameterListAST = parameters.ast.kind() === SyntaxKind.SeparatedList ? <ISeparatedSyntaxList>parameters.ast : null;
                this.emitComments(parameters.ast, true);

                var tempContainer = this.setContainer(EmitContainer.Args);
                argsLen = parameters.length;
                var printLen = argsLen;
                if (parameters.lastParameterIsRest()) {
                    printLen--;
                }
                for (var i = 0; i < printLen; i++) {
                    var arg = parameters.astAt(i);
                    this.emit(arg);

                    if (i < (printLen - 1)) {
                        this.writeToOutput(", ");
                        if (parameterListAST) {
                            this.emitCommentsArray(convertTokenTrailingComments(parameterListAST.separatorAt(i)), /*trailing:*/ true, /*noLeadingSpace:*/ true);
                        }
                    }
                }
                this.setContainer(tempContainer);

                this.emitComments(parameters.ast, false);
            }
        }

        private emitFunctionBodyStatements(name: string, funcDecl: ISyntaxElement, parameterList: IParameters, block: BlockSyntax, bodyExpression: ISyntaxElement): void {
            this.writeLineToOutput(" {");
            if (name) {
                this.recordSourceMappingNameStart(name);
            }

            this.indenter.increaseIndent();

            // Parameter list parameters with defaults could capture this
            if (this.shouldCaptureThis(funcDecl)) {
                this.writeCaptureThisStatement(funcDecl);
            }

            if (parameterList) {
                this.emitDefaultValueAssignments(parameterList);
                this.emitRestParameterInitializer(parameterList);
            }

            if (block) {
                this.emitList(block.statements);
                this.emitCommentsArray(convertTokenLeadingComments(block.closeBraceToken), /*trailing:*/ false);
            }
            else {
                // Copy any comments before the body of the arrow function to the return statement.
                // This is necessary for emitting correctness so we don't emit something like this:
                //
                //      return
                //          // foo
                //          this.foo();
                //
                // Because of ASI, this gets parsed as "return;" which is *not* what we want for
                // proper semantics.  
                //var preComments = bodyExpression.preComments();
                //var postComments = bodyExpression.postComments();

                //bodyExpression.setPreComments(null);
                //bodyExpression.setPostComments(null);

                this.emitIndent();
                this.emitCommentsArray(preComments(bodyExpression), /*trailing:*/ false);
                this.writeToOutput("return ");
                this.emit(bodyExpression);
                this.writeLineToOutput(";");
                this.emitCommentsArray(preComments(bodyExpression), /*trailing:*/ true);

                //bodyExpression.setPreComments(preComments);
                //bodyExpression.setPostComments(postComments);
            }

            this.indenter.decreaseIndent();
            this.emitIndent();

            if (block) {
                this.writeToOutputWithSourceMapRecord("}", block.closeBraceToken);
            }
            else {
                this.writeToOutputWithSourceMapRecord("}", bodyExpression);
            }

            if (name) {
                this.recordSourceMappingNameEnd();
            }
        }

        private emitDefaultValueAssignments(parameters: IParameters): void {
            var n = parameters.length;
            if (parameters.lastParameterIsRest()) {
                n--;
            }

            for (var i = 0; i < n; i++) {
                var arg = parameters.astAt(i);
                var id = parameters.identifierAt(i);
                var equalsValueClause = parameters.initializerAt(i);
                if (equalsValueClause) {
                    this.emitIndent();
                    this.recordSourceMappingStart(arg);
                    this.writeToOutput("if (typeof " + id.text() + " === \"undefined\") { ");//
                    this.writeToOutputWithSourceMapRecord(id.text(), id);
                    this.emitJavascript(equalsValueClause, false);
                    this.writeLineToOutput("; }");
                    this.recordSourceMappingEnd(arg);
                }
            }
        }

        private emitRestParameterInitializer(parameters: IParameters): void {
            if (parameters.lastParameterIsRest()) {
                var n = parameters.length;
                var lastArg = parameters.astAt(n - 1);
                var id = parameters.identifierAt(n - 1);
                this.emitIndent();
                this.recordSourceMappingStart(lastArg);
                this.writeToOutput("var ");
                this.writeToOutputWithSourceMapRecord(id.text(), id);
                this.writeLineToOutput(" = [];");
                this.recordSourceMappingEnd(lastArg);
                this.emitIndent();
                this.writeToOutput("for (");
                this.writeToOutputWithSourceMapRecord("var _i = 0;", lastArg);
                this.writeToOutput(" ");
                this.writeToOutputWithSourceMapRecord("_i < (arguments.length - " + (n - 1) + ")", lastArg);
                this.writeToOutput("; ");
                this.writeToOutputWithSourceMapRecord("_i++", lastArg);
                this.writeLineToOutput(") {");
                this.indenter.increaseIndent();
                this.emitIndent();

                this.writeToOutputWithSourceMapRecord(id.text() + "[_i] = arguments[_i + " + (n - 1) + "];", lastArg);
                this.writeLineToOutput("");
                this.indenter.decreaseIndent();
                this.emitIndent();
                this.writeLineToOutput("}");
            }
        }

        private getImportDecls(fileName: string): PullDecl[] {
            var topLevelDecl = this.semanticInfoChain.topLevelDecl(this.document.fileName);
            var result: PullDecl[] = [];

            var dynamicModuleDecl = topLevelDecl.getChildDecls()[0]; // Dynamic module declaration has to be present
            var queue: PullDecl[] = dynamicModuleDecl.getChildDecls();

            for (var i = 0, n = queue.length; i < n; i++) {
                var decl = queue[i];

                if (decl.kind & PullElementKind.TypeAlias) {
                    var importStatementAST = <ImportDeclarationSyntax>this.semanticInfoChain.getASTForDecl(decl);
                    if (importStatementAST.moduleReference.kind() === SyntaxKind.ExternalModuleReference) { // external module
                        var symbol = decl.getSymbol();
                        var typeSymbol = symbol && symbol.type;
                        if (typeSymbol && typeSymbol !== this.semanticInfoChain.anyTypeSymbol && !typeSymbol.isError()) {
                            result.push(decl);
                        }
                    }
                }
            }

            return result;
        }

        public getModuleImportAndDependencyList(sourceUnit: SourceUnitSyntax) {
            var importList = "";
            var dependencyList = "";

            var importDecls = this.getImportDecls(this.document.fileName);

            // all dependencies are quoted
            if (importDecls.length) {
                for (var i = 0; i < importDecls.length; i++) {
                    var importStatementDecl = importDecls[i];
                    var importStatementSymbol = <PullTypeAliasSymbol>importStatementDecl.getSymbol();
                    var importStatementAST = <ImportDeclarationSyntax>this.semanticInfoChain.getASTForDecl(importStatementDecl);

                    if (importStatementSymbol.isUsedAsValue()) {
                        if (i <= importDecls.length - 1) {
                            dependencyList += ", ";
                            importList += ", ";
                        }

                        importList += importStatementDecl.name;
                        dependencyList += (<ExternalModuleReferenceSyntax>importStatementAST.moduleReference).stringLiteral.text();
                    }
                }
            }

            // emit any potential amd dependencies
            var amdDependencies = this.document.amdDependencies();
            for (var i = 0; i < amdDependencies.length; i++) {
                dependencyList += ", \"" + amdDependencies[i] + "\"";
            }

            return {
                importList: importList,
                dependencyList: dependencyList
            };
        }

        public shouldCaptureThis(ast: ISyntaxElement) {
            if (ast.kind() === SyntaxKind.SourceUnit) {
                var scriptDecl = this.semanticInfoChain.topLevelDecl(this.document.fileName);
                return hasFlag(scriptDecl.flags, PullElementFlags.MustCaptureThis);
            }

            var decl = this.semanticInfoChain.getDeclForAST(ast);
            if (decl) {
                return hasFlag(decl.flags, PullElementFlags.MustCaptureThis);
            }

            return false;
        }

        public emitEnum(moduleDecl: EnumDeclarationSyntax) {
            var pullDecl = this.semanticInfoChain.getDeclForAST(moduleDecl);
            this.pushDecl(pullDecl);

            var svModuleName = this.moduleName;
            this.moduleName = moduleDecl.identifier.text();

            var temp = this.setContainer(EmitContainer.Module);
            var isExported = hasFlag(pullDecl.flags, PullElementFlags.Exported);

            if (!isExported) {
                this.recordSourceMappingStart(moduleDecl);
                this.writeToOutput("var ");
                this.recordSourceMappingStart(moduleDecl.identifier);
                this.writeToOutput(this.moduleName);
                this.recordSourceMappingEnd(moduleDecl.identifier);
                this.writeLineToOutput(";");
                this.recordSourceMappingEnd(moduleDecl);
                this.emitIndent();
            }

            this.writeToOutput("(");
            this.recordSourceMappingStart(moduleDecl);
            this.writeToOutput("function (");
            this.writeToOutputWithSourceMapRecord(this.moduleName, moduleDecl.identifier);
            this.writeLineToOutput(") {");

            this.recordSourceMappingNameStart(this.moduleName);

            this.indenter.increaseIndent();

            if (this.shouldCaptureThis(moduleDecl)) {
                this.writeCaptureThisStatement(moduleDecl);
            }

            this.emitSeparatedList(moduleDecl.enumElements);
            this.indenter.decreaseIndent();
            this.emitIndent();

            var parentIsDynamic = temp === EmitContainer.DynamicModule;
            if (temp === EmitContainer.Prog && isExported) {
                this.writeToOutput("}");
                this.recordSourceMappingNameEnd();
                this.writeToOutput(")(this." + this.moduleName + " || (this." + this.moduleName + " = {}));");
            }
            else if (isExported || temp === EmitContainer.Prog) {
                var dotMod = svModuleName !== "" ? (parentIsDynamic ? "exports" : svModuleName) + "." : svModuleName;
                this.writeToOutput("}");
                this.recordSourceMappingNameEnd();
                this.writeToOutput(")(" + dotMod + this.moduleName + " || (" + dotMod + this.moduleName + " = {}));");
            }
            else if (!isExported && temp !== EmitContainer.Prog) {
                this.writeToOutput("}");
                this.recordSourceMappingNameEnd();
                this.writeToOutput(")(" + this.moduleName + " || (" + this.moduleName + " = {}));");
            }
            else {
                this.writeToOutput("}");
                this.recordSourceMappingNameEnd();
                this.writeToOutput(")();");
            }

            this.recordSourceMappingEnd(moduleDecl);
            if (temp !== EmitContainer.Prog && isExported) {
                this.recordSourceMappingStart(moduleDecl);
                if (parentIsDynamic) {
                    this.writeLineToOutput("");
                    this.emitIndent();
                    this.writeToOutput("var " + this.moduleName + " = exports." + this.moduleName + ";");
                } else {
                    this.writeLineToOutput("");
                    this.emitIndent();
                    this.writeToOutput("var " + this.moduleName + " = " + svModuleName + "." + this.moduleName + ";");
                }
                this.recordSourceMappingEnd(moduleDecl);
            }

            this.setContainer(temp);
            this.moduleName = svModuleName;

            this.popDecl(pullDecl);
        }

        private getModuleDeclToVerifyChildNameCollision(moduleDecl: PullDecl, changeNameIfAnyDeclarationInContext: boolean) {
            if (ArrayUtilities.contains(this.declStack, moduleDecl)) {
                // Given decl is in the scope, we would need to check for child name collision
                return moduleDecl;
            } else if (changeNameIfAnyDeclarationInContext) {
                // Check if any other declaration of the given symbol is in scope 
                // (eg. when emitting expression of type defined from different declaration in reopened module)
                var symbol = moduleDecl.getSymbol();
                if (symbol) {
                    var otherDecls = symbol.getDeclarations();
                    for (var i = 0; i < otherDecls.length; i++) {
                        // If the other decl is in the scope, use this decl to determine which name to display
                        if (ArrayUtilities.contains(this.declStack, otherDecls[i])) {
                            return otherDecls[i];
                        }
                    }
                }
            }

            return null;
        }

        private hasChildNameCollision(moduleName: string, childDecls: PullDecl[]) {
            return ArrayUtilities.any(childDecls, (childDecl: PullDecl) => {
                if (childDecl.name == moduleName) {
                    // same name child
                    var childAST = this.semanticInfoChain.getASTForDecl(childDecl);
                    if (this.shouldEmit(childAST)) {
                        // Child ast would be emitted
                        return true;
                    }
                }
                return false;
            });
        }

        // Get the moduleName to write in js file
        // If changeNameIfAnyDeclarationInContext is true, verify if any of the declarations for the symbol would need rename.
        private getModuleName(moduleDecl: PullDecl, changeNameIfAnyDeclarationInContext?: boolean) {
            var moduleName = moduleDecl.name;
            var moduleDisplayName = moduleDecl.getDisplayName();

            // If the decl is in stack it may need name change in the js file
            moduleDecl = this.getModuleDeclToVerifyChildNameCollision(moduleDecl, changeNameIfAnyDeclarationInContext);
            if (moduleDecl) {
                var childDecls = moduleDecl.getChildDecls();

                // If there is any child that would be emitted with same name as module, js files would need to use rename for the module
                while (this.hasChildNameCollision(moduleName, childDecls)) {
                    // there was name collision with member which could result in faulty codegen, try rename with prepend of '_'
                    moduleName = "_" + moduleName;
                    moduleDisplayName = "_" + moduleDisplayName;
                }
            }

            return moduleDisplayName;
        }

        private emitModuleDeclarationWorker(moduleDecl: ModuleDeclarationSyntax) {
            if (moduleDecl.stringLiteral) {
                this.emitSingleModuleDeclaration(moduleDecl, moduleDecl.stringLiteral);
            }
            else {
                var moduleNames = getModuleNames(moduleDecl.name);
                this.emitSingleModuleDeclaration(moduleDecl, moduleNames[0]);
            }
        }

        public emitSingleModuleDeclaration(moduleDecl: ModuleDeclarationSyntax, moduleName: ISyntaxToken) {
            var isLastName = isLastNameOfModule(moduleDecl, moduleName);

            if (isLastName) {
                // Doc Comments on the ast belong to the innermost module being emitted.
                this.emitComments(moduleDecl, true);
            }

            var pullDecl = this.semanticInfoChain.getDeclForAST(moduleName);
            this.pushDecl(pullDecl);

            var svModuleName = this.moduleName;

            if (moduleDecl.stringLiteral) {
                this.moduleName = moduleDecl.stringLiteral.valueText();
                if (isTSFile(this.moduleName)) {
                    this.moduleName = this.moduleName.substring(0, this.moduleName.length - ".ts".length);
                }
            }
            else {
                this.moduleName = moduleName.text();
            }

            var temp = this.setContainer(EmitContainer.Module);
            var isExported = hasFlag(pullDecl.flags, PullElementFlags.Exported);

            // prologue

            if (!isExported) {
                this.recordSourceMappingStart(moduleDecl);
                this.writeToOutput("var ");
                this.recordSourceMappingStart(moduleName);
                this.writeToOutput(this.moduleName);
                this.recordSourceMappingEnd(moduleName);
                this.writeLineToOutput(";");
                this.recordSourceMappingEnd(moduleDecl);
                this.emitIndent();
            }

            this.writeToOutput("(");
            this.recordSourceMappingStart(moduleDecl);
            this.writeToOutput("function (");
            // Use the name that doesnt conflict with its members, 
            // this.moduleName needs to be updated to make sure that export member declaration is emitted correctly
            this.moduleName = this.getModuleName(pullDecl);
            this.writeToOutputWithSourceMapRecord(this.moduleName, moduleName);
            this.writeLineToOutput(") {");

            this.recordSourceMappingNameStart(moduleName.text());

            this.indenter.increaseIndent();

            if (this.shouldCaptureThis(moduleDecl)) {
                this.writeCaptureThisStatement(moduleDecl);
            }

            if (moduleName === moduleDecl.stringLiteral) {
                this.emitList(moduleDecl.moduleElements);
            }
            else {
                var moduleNames = getModuleNames(moduleDecl.name);
                var nameIndex = moduleNames.indexOf(<ISyntaxToken>moduleName);
                Debug.assert(nameIndex >= 0);

                if (isLastName) {
                    // If we're on the innermost module, we can emit the module elements.
                    this.emitList(moduleDecl.moduleElements);
                }
                else {
                    // otherwise, just recurse and emit the next module in the A.B.C module name.
                    this.emitIndent();
                    this.emitSingleModuleDeclaration(moduleDecl, moduleNames[nameIndex + 1]);
                    this.writeLineToOutput("");
                }
            }

            this.moduleName = moduleName.text();
            this.indenter.decreaseIndent();
            this.emitIndent();

            // epilogue
            var parentIsDynamic = temp === EmitContainer.DynamicModule;
            this.recordSourceMappingStart(moduleDecl.closeBraceToken);
            if (temp === EmitContainer.Prog && isExported) {
                this.writeToOutput("}");
                this.recordSourceMappingNameEnd();
                this.recordSourceMappingEnd(moduleDecl.closeBraceToken);
                this.writeToOutput(")(this." + this.moduleName + " || (this." + this.moduleName + " = {}));");
            }
            else if (isExported || temp === EmitContainer.Prog) {
                var dotMod = svModuleName !== "" ? (parentIsDynamic ? "exports" : svModuleName) + "." : svModuleName;
                this.writeToOutput("}");
                this.recordSourceMappingNameEnd();
                this.recordSourceMappingEnd(moduleDecl.closeBraceToken);
                this.writeToOutput(")(" + dotMod + this.moduleName + " || (" + dotMod + this.moduleName + " = {}));");
            }
            else if (!isExported && temp !== EmitContainer.Prog) {
                this.writeToOutput("}");
                this.recordSourceMappingNameEnd();
                this.recordSourceMappingEnd(moduleDecl.closeBraceToken);
                this.writeToOutput(")(" + this.moduleName + " || (" + this.moduleName + " = {}));");
            }
            else {
                this.writeToOutput("}");
                this.recordSourceMappingNameEnd();
                this.recordSourceMappingEnd(moduleDecl.closeBraceToken);
                this.writeToOutput(")();");
            }

            this.recordSourceMappingEnd(moduleDecl);
            if (temp !== EmitContainer.Prog && isExported) {
                this.recordSourceMappingStart(moduleDecl);
                if (parentIsDynamic) {
                    this.writeLineToOutput("");
                    this.emitIndent();
                    this.writeToOutput("var " + this.moduleName + " = exports." + this.moduleName + ";");
                } else {
                    this.writeLineToOutput("");
                    this.emitIndent();
                    this.writeToOutput("var " + this.moduleName + " = " + svModuleName + "." + this.moduleName + ";");
                }
                this.recordSourceMappingEnd(moduleDecl);
            }

            this.setContainer(temp);
            this.moduleName = svModuleName;

            this.popDecl(pullDecl);

            if (isLastName) {
                // Comments on the module ast belong to the innermost module being emitted.
                this.emitComments(moduleDecl, false);
            }
        }

        public emitEnumElement(varDecl: EnumElementSyntax): void {
            // <EnumName>[<EnumName>["<MemberName>"] = <MemberValue>] = "<MemberName>";
            var pullDecl = <PullEnumElementDecl>this.semanticInfoChain.getDeclForAST(varDecl);
            Debug.assert(pullDecl && pullDecl.kind === PullElementKind.EnumMember);

            this.emitComments(varDecl, true);
            this.recordSourceMappingStart(varDecl);
            var name = varDecl.propertyName.text();
            var quoted = isQuoted(name);
            this.writeToOutput(this.moduleName);
            this.writeToOutput('[');
            this.writeToOutput(this.moduleName);
            this.writeToOutput('[');
            this.writeToOutput(quoted ? name : '"' + name + '"');
            this.writeToOutput(']');

            if (varDecl.equalsValueClause) {
                this.emit(varDecl.equalsValueClause);
            }
            else if (pullDecl.constantValue !== null) {
                this.writeToOutput(' = ');
                this.writeToOutput(pullDecl.constantValue.toString());
            }
            else {
                this.writeToOutput(' = null');
            }

            this.writeToOutput('] = ');
            this.writeToOutput(quoted ? name : '"' + name + '"');
            this.recordSourceMappingEnd(varDecl);
            this.emitComments(varDecl, false);
            this.writeToOutput(';');
        }

        public emitElementAccessExpression(expression: ElementAccessExpressionSyntax) {
            this.recordSourceMappingStart(expression);
            this.emit(expression.expression);
            this.writeToOutput("[");
            this.emit(expression.argumentExpression);
            this.writeToOutput("]");
            this.recordSourceMappingEnd(expression);
        }

        public emitSimpleArrowFunctionExpression(arrowFunction: SimpleArrowFunctionExpressionSyntax): void {
            this.emitAnyArrowFunctionExpression(arrowFunction, arrowFunction.block, arrowFunction.expression);
        }

        public emitParenthesizedArrowFunctionExpression(arrowFunction: ParenthesizedArrowFunctionExpressionSyntax): void {
            this.emitAnyArrowFunctionExpression(arrowFunction, arrowFunction.block, arrowFunction.expression);
        }

        private emitAnyArrowFunctionExpression(arrowFunction: ISyntaxElement, block: BlockSyntax, expression: ISyntaxElement): void {
            var savedInArrowFunction = this.inArrowFunction;
            this.inArrowFunction = true;

            var temp = this.setContainer(EmitContainer.Function);

            this.recordSourceMappingStart(arrowFunction);

            // Start
            var pullDecl = this.semanticInfoChain.getDeclForAST(arrowFunction);
            this.pushDecl(pullDecl);

            this.emitComments(arrowFunction, true);

            this.recordSourceMappingStart(arrowFunction);
            this.writeToOutput("function ");

            var parameters: IParameters = null;
            if (arrowFunction.kind() === SyntaxKind.ParenthesizedArrowFunctionExpression) {
                var parenthesizedArrowFunction = <ParenthesizedArrowFunctionExpressionSyntax>arrowFunction;

                parameters = Parameters.fromParameterList(parenthesizedArrowFunction.callSignature.parameterList);
                this.emitParameterList(parenthesizedArrowFunction.callSignature.parameterList);
            }
            else {
                parameters = Parameters.fromIdentifier((<SimpleArrowFunctionExpressionSyntax>arrowFunction).identifier)

                this.writeToOutput("(");
                this.emitFunctionParameters(parameters);
                this.writeToOutput(")");
            }

            this.emitFunctionBodyStatements(/*funcName:*/ null, arrowFunction, parameters, block, expression);

            this.recordSourceMappingEnd(arrowFunction);

            // The extra call is to make sure the caller's funcDecl end is recorded, since caller wont be able to record it
            this.recordSourceMappingEnd(arrowFunction);

            this.emitComments(arrowFunction, false);

            this.popDecl(pullDecl);
            this.setContainer(temp);
            this.inArrowFunction = savedInArrowFunction;
        }

        public emitConstructor(funcDecl: ConstructorDeclarationSyntax) {
            if (!funcDecl.block) {
                return;
            }
            var temp = this.setContainer(EmitContainer.Constructor);

            this.recordSourceMappingStart(funcDecl);

            var pullDecl = this.semanticInfoChain.getDeclForAST(funcDecl);
            this.pushDecl(pullDecl);

            this.emitComments(funcDecl, true);

            this.recordSourceMappingStart(funcDecl);
            this.writeToOutput("function ");
            this.writeToOutput(this.thisClassNode.identifier.text());
            this.emitParameterList(funcDecl.parameterList);
            this.writeLineToOutput(" {");

            this.recordSourceMappingNameStart("constructor");
            this.indenter.increaseIndent();

            var parameters = Parameters.fromParameterList(funcDecl.parameterList)
            this.emitDefaultValueAssignments(parameters);
            this.emitRestParameterInitializer(parameters);

            if (this.shouldCaptureThis(funcDecl)) {
                this.writeCaptureThisStatement(funcDecl);
            }

            this.emitConstructorStatements(funcDecl);
            this.emitCommentsArray(convertTokenLeadingComments(funcDecl.block.closeBraceToken), /*trailing:*/ false);

            this.indenter.decreaseIndent();
            this.emitIndent();
            this.writeToOutputWithSourceMapRecord("}", funcDecl.block.closeBraceToken);

            this.recordSourceMappingNameEnd();
            this.recordSourceMappingEnd(funcDecl);

            // The extra call is to make sure the caller's funcDecl end is recorded, since caller wont be able to record it
            this.recordSourceMappingEnd(funcDecl);

            this.emitComments(funcDecl, false);

            this.popDecl(pullDecl);
            this.setContainer(temp);
        }

        public emitGetAccessor(accessor: GetAccessorSyntax): void {
            this.recordSourceMappingStart(accessor);
            this.writeToOutput("get ");

            var temp = this.setContainer(EmitContainer.Function);

            this.recordSourceMappingStart(accessor);

            var pullDecl = this.semanticInfoChain.getDeclForAST(accessor);
            this.pushDecl(pullDecl);

            this.recordSourceMappingStart(accessor);

            var accessorSymbol = PullHelpers.getAccessorSymbol(accessor, this.semanticInfoChain);
            var container = accessorSymbol.getContainer();
            var containerKind = container.kind;

            this.recordSourceMappingNameStart(accessor.propertyName.text());
            this.writeToOutput(accessor.propertyName.text());
            this.emitParameterList(accessor.parameterList);

            this.emitFunctionBodyStatements(null, accessor, Parameters.fromParameterList(accessor.parameterList), accessor.block, /*bodyExpression:*/ null);

            this.recordSourceMappingEnd(accessor);

            // The extra call is to make sure the caller's funcDecl end is recorded, since caller wont be able to record it
            this.recordSourceMappingEnd(accessor);

            this.popDecl(pullDecl);
            this.setContainer(temp);
            this.recordSourceMappingEnd(accessor);
        }

        public emitSetAccessor(accessor: SetAccessorSyntax): void {
            this.recordSourceMappingStart(accessor);
            this.writeToOutput("set ");

            var temp = this.setContainer(EmitContainer.Function);

            this.recordSourceMappingStart(accessor);

            var pullDecl = this.semanticInfoChain.getDeclForAST(accessor);
            this.pushDecl(pullDecl);

            this.recordSourceMappingStart(accessor);

            var accessorSymbol = PullHelpers.getAccessorSymbol(accessor, this.semanticInfoChain);
            var container = accessorSymbol.getContainer();
            var containerKind = container.kind;

            this.recordSourceMappingNameStart(accessor.propertyName.text());
            this.writeToOutput(accessor.propertyName.text());
            this.emitParameterList(accessor.parameterList);

            this.emitFunctionBodyStatements(null, accessor, Parameters.fromParameterList(accessor.parameterList), accessor.block, /*bodyExpression:*/ null);

            this.recordSourceMappingEnd(accessor);

            // The extra call is to make sure the caller's funcDecl end is recorded, since caller wont be able to record it
            this.recordSourceMappingEnd(accessor);

            this.popDecl(pullDecl);
            this.setContainer(temp);
            this.recordSourceMappingEnd(accessor);
        }

        public emitFunctionExpression(funcDecl: FunctionExpressionSyntax): void {
            var savedInArrowFunction = this.inArrowFunction;
            this.inArrowFunction = false;

            var temp = this.setContainer(EmitContainer.Function);

            var funcName = funcDecl.identifier ? funcDecl.identifier.text() : null;//.getNameText();

            this.recordSourceMappingStart(funcDecl);

            var pullDecl = this.semanticInfoChain.getDeclForAST(funcDecl);
            this.pushDecl(pullDecl);

            this.recordSourceMappingStart(funcDecl);
            this.writeToOutput("function ");

            //var id = funcDecl.getNameText();
            if (funcDecl.identifier) {
                this.recordSourceMappingStart(funcDecl.identifier);
                this.writeToOutput(funcDecl.identifier.text());
                this.recordSourceMappingEnd(funcDecl.identifier);
            }

            this.emitParameterList(funcDecl.callSignature.parameterList);
            this.emitFunctionBodyStatements(funcName, funcDecl, Parameters.fromParameterList(funcDecl.callSignature.parameterList), funcDecl.block, /*bodyExpression:*/ null);

            this.recordSourceMappingEnd(funcDecl);

            // The extra call is to make sure the caller's funcDecl end is recorded, since caller wont be able to record it
            this.recordSourceMappingEnd(funcDecl);

            this.emitComments(funcDecl, false);

            this.popDecl(pullDecl);

            this.setContainer(temp);
            this.inArrowFunction = savedInArrowFunction;
        }

        public emitFunction(funcDecl: FunctionDeclarationSyntax) {
            if (funcDecl.block === null) {
                return;
            }
            var savedInArrowFunction = this.inArrowFunction;
            this.inArrowFunction = false;

            var temp = this.setContainer(EmitContainer.Function);

            var funcName = funcDecl.identifier.text();

            this.recordSourceMappingStart(funcDecl);

            var printName = funcDecl.identifier !== null
            var pullDecl = this.semanticInfoChain.getDeclForAST(funcDecl);
            this.pushDecl(pullDecl);

            this.emitComments(funcDecl, true);

            this.recordSourceMappingStart(funcDecl);
            this.writeToOutput("function ");

            if (printName) {
                var id = funcDecl.identifier.text();
                if (id) {
                    if (funcDecl.identifier) {
                        this.recordSourceMappingStart(funcDecl.identifier);
                    }
                    this.writeToOutput(id);
                    if (funcDecl.identifier) {
                        this.recordSourceMappingEnd(funcDecl.identifier);
                    }
                }
            }

            this.emitParameterList(funcDecl.callSignature.parameterList);

            var parameters = Parameters.fromParameterList(funcDecl.callSignature.parameterList);
            this.emitFunctionBodyStatements(funcDecl.identifier.text(), funcDecl, parameters, funcDecl.block, /*bodyExpression:*/ null);

            this.recordSourceMappingEnd(funcDecl);

            // The extra call is to make sure the caller's funcDecl end is recorded, since caller wont be able to record it
            this.recordSourceMappingEnd(funcDecl);

            this.emitComments(funcDecl, false);

            this.popDecl(pullDecl);

            this.setContainer(temp);
            this.inArrowFunction = savedInArrowFunction;

            if (funcDecl.block) {
                var pullFunctionDecl = this.semanticInfoChain.getDeclForAST(funcDecl);
                if ((this.emitState.container === EmitContainer.Module || this.emitState.container === EmitContainer.DynamicModule) && pullFunctionDecl && hasFlag(pullFunctionDecl.flags, PullElementFlags.Exported)) {
                    this.writeLineToOutput("");
                    this.emitIndent();
                    var modName = this.emitState.container === EmitContainer.Module ? this.moduleName : "exports";
                    this.recordSourceMappingStart(funcDecl);
                    this.writeToOutput(modName + "." + funcName + " = " + funcName + ";");
                    this.recordSourceMappingEnd(funcDecl);
                }
            }
        }

        public emitAmbientVarDecl(varDecl: VariableDeclaratorSyntax) {
            this.recordSourceMappingStart(this.currentVariableDeclaration);
            if (varDecl.equalsValueClause) {
                this.emitComments(varDecl, true);
                this.recordSourceMappingStart(varDecl);
                this.writeToOutputWithSourceMapRecord(varDecl.propertyName.text(), varDecl.propertyName);
                this.emitJavascript(varDecl.equalsValueClause, false);
                this.recordSourceMappingEnd(varDecl);
                this.emitComments(varDecl, false);
            }
        }

        // Emits "var " if it is allowed
        public emitVarDeclVar() {
            if (this.currentVariableDeclaration) {
                this.writeToOutput("var ");
            }
        }

        public emitVariableDeclaration(declaration: VariableDeclarationSyntax) {
            var varDecl = <VariableDeclaratorSyntax>declaration.variableDeclarators.nonSeparatorAt(0);

            var symbol = this.semanticInfoChain.getSymbolForAST(varDecl);

            var parentSymbol = symbol ? symbol.getContainer() : null;
            var parentKind = parentSymbol ? parentSymbol.kind : PullElementKind.None;

            this.emitComments(declaration, true);

            var pullVarDecl = this.semanticInfoChain.getDeclForAST(varDecl);
            var isAmbientWithoutInit = pullVarDecl && hasFlag(pullVarDecl.flags, PullElementFlags.Ambient) && varDecl.equalsValueClause === null;
            if (!isAmbientWithoutInit) {
                var prevVariableDeclaration = this.currentVariableDeclaration;
                this.currentVariableDeclaration = declaration;

                for (var i = 0, n = declaration.variableDeclarators.nonSeparatorCount(); i < n; i++) {
                    var declarator = declaration.variableDeclarators.nonSeparatorAt(i);

                    if (i > 0) {
                        this.writeToOutput(", ");
                    }

                    this.emit(declarator);
                }
                this.currentVariableDeclaration = prevVariableDeclaration;

                // Declarator emit would take care of emitting start of the variable declaration start
                this.recordSourceMappingEnd(declaration);
            }

            this.emitComments(declaration, false);
        }

        private emitMemberVariableDeclaration(varDecl: MemberVariableDeclarationSyntax) {
            Debug.assert(!hasModifier(varDecl.modifiers, PullElementFlags.Static) && varDecl.variableDeclarator.equalsValueClause);

            var pullDecl = this.semanticInfoChain.getDeclForAST(varDecl);
            this.pushDecl(pullDecl);

            this.emitComments(varDecl, true);
            this.recordSourceMappingStart(varDecl);

            var varDeclName = varDecl.variableDeclarator.propertyName.text();
            var quotedOrNumber = isQuoted(varDeclName) || varDecl.variableDeclarator.propertyName.kind() !== SyntaxKind.IdentifierName;

            var symbol = this.semanticInfoChain.getSymbolForAST(varDecl);
            var parentSymbol = symbol ? symbol.getContainer() : null;
            var parentDecl = pullDecl && pullDecl.getParentDecl();

            if (quotedOrNumber) {
                this.writeToOutput("this[");
            }
            else {
                this.writeToOutput("this.");
            }

            this.writeToOutputWithSourceMapRecord(varDecl.variableDeclarator.propertyName.text(), varDecl.variableDeclarator.propertyName);

            if (quotedOrNumber) {
                this.writeToOutput("]");
            }

            if (varDecl.variableDeclarator.equalsValueClause) {
                // Ensure we have a fresh var list count when recursing into the variable 
                // initializer.  We don't want our current list of variables to affect how we
                // emit nested variable lists.
                var prevVariableDeclaration = this.currentVariableDeclaration;
                this.emit(varDecl.variableDeclarator.equalsValueClause);
                this.currentVariableDeclaration = prevVariableDeclaration;
            }

            // class
            if (this.emitState.container !== EmitContainer.Args) {
                this.writeToOutput(";");
            }

            this.recordSourceMappingEnd(varDecl);
            this.emitComments(varDecl, false);

            this.popDecl(pullDecl);
        }

        public emitVariableDeclarator(varDecl: VariableDeclaratorSyntax) {
            var pullDecl = this.semanticInfoChain.getDeclForAST(varDecl);
            this.pushDecl(pullDecl);
            if (pullDecl && (pullDecl.flags & PullElementFlags.Ambient) === PullElementFlags.Ambient) {
                this.emitAmbientVarDecl(varDecl);
            }
            else {
                this.emitComments(varDecl, true);
                this.recordSourceMappingStart(this.currentVariableDeclaration);
                this.recordSourceMappingStart(varDecl);

                var varDeclName = varDecl.propertyName.text();

                var symbol = this.semanticInfoChain.getSymbolForAST(varDecl);
                var parentSymbol = symbol ? symbol.getContainer() : null;
                var parentDecl = pullDecl && pullDecl.getParentDecl();
                var parentIsModule = parentDecl && (parentDecl.flags & PullElementFlags.SomeInitializedModule);

                if (parentIsModule) {
                    // module
                    if (!hasFlag(pullDecl.flags, PullElementFlags.Exported)/* && !varDecl.isProperty() */) {
                        this.emitVarDeclVar();
                    }
                    else {
                        if (this.emitState.container === EmitContainer.DynamicModule) {
                            this.writeToOutput("exports.");
                        }
                        else {
                            this.writeToOutput(this.moduleName + ".");
                        }
                    }
                }
                else {
                    this.emitVarDeclVar();
                }

                this.writeToOutputWithSourceMapRecord(varDecl.propertyName.text(), varDecl.propertyName);

                if (varDecl.equalsValueClause) {
                    // Ensure we have a fresh var list count when recursing into the variable 
                    // initializer.  We don't want our current list of variables to affect how we
                    // emit nested variable lists.
                    var prevVariableDeclaration = this.currentVariableDeclaration;
                    this.emit(varDecl.equalsValueClause);
                    this.currentVariableDeclaration = prevVariableDeclaration;
                }

                this.recordSourceMappingEnd(varDecl);
                this.emitComments(varDecl, false);
            }
            this.currentVariableDeclaration = undefined;
            this.popDecl(pullDecl);
        }

        private symbolIsUsedInItsEnclosingContainer(symbol: PullSymbol, dynamic = false) {
            var symDecls = symbol.getDeclarations();

            if (symDecls.length) {
                var enclosingDecl = this.getEnclosingDecl();
                if (enclosingDecl) {
                    var parentDecl = symDecls[0].getParentDecl();
                    if (parentDecl) {
                        var symbolDeclarationEnclosingContainer = parentDecl;
                        var enclosingContainer = enclosingDecl;

                        // compute the closing container of the symbol's declaration
                        while (symbolDeclarationEnclosingContainer) {
                            if (symbolDeclarationEnclosingContainer.kind === (dynamic ? PullElementKind.DynamicModule : PullElementKind.Container)) {
                                break;
                            }
                            symbolDeclarationEnclosingContainer = symbolDeclarationEnclosingContainer.getParentDecl();
                        }

                        // if the symbol in question is not a global, compute the nearest
                        // enclosing declaration from the point of usage
                        if (symbolDeclarationEnclosingContainer) {
                            while (enclosingContainer) {
                                if (enclosingContainer.kind === (dynamic ? PullElementKind.DynamicModule : PullElementKind.Container)) {
                                    break;
                                }

                                enclosingContainer = enclosingContainer.getParentDecl();
                            }
                        }

                        if (symbolDeclarationEnclosingContainer && enclosingContainer) {
                            var same = symbolDeclarationEnclosingContainer === enclosingContainer;

                            // initialized module object variables are bound to their parent's decls
                            if (!same && symbol.anyDeclHasFlag(PullElementFlags.InitializedModule)) {
                                same = symbolDeclarationEnclosingContainer === enclosingContainer.getParentDecl();
                            }

                            return same;
                        }
                    }
                }
            }

            return false;
        }

        // Gets the decl path that needs to be emitted for the symbol in the enclosing context
        private getPotentialDeclPathInfoForEmit(pullSymbol: PullSymbol) {
            var decl = pullSymbol.getDeclarations()[0];
            var parentDecl = decl.getParentDecl();
            var symbolContainerDeclPath = parentDecl ? parentDecl.getParentPath() : <PullDecl[]>[];

            var enclosingContextDeclPath = this.declStack;
            var commonNodeIndex = -1;

            // Find the container decl path and the declStack of the context
            if (enclosingContextDeclPath.length) {
                for (var i = symbolContainerDeclPath.length - 1; i >= 0; i--) {
                    var symbolContainerDeclPathNode = symbolContainerDeclPath[i];
                    for (var j = enclosingContextDeclPath.length - 1; j >= 0; j--) {
                        var enclosingContextDeclPathNode = enclosingContextDeclPath[j];
                        if (symbolContainerDeclPathNode === enclosingContextDeclPathNode) {
                            commonNodeIndex = i;
                            break;
                        }
                    }

                    if (commonNodeIndex >= 0) {
                        break;
                    }
                }
            }

            // We can emit dotted names only of exported declarations, so find the index to start emitting dotted name
            var startingIndex = symbolContainerDeclPath.length - 1
            for (var i = startingIndex - 1; i > commonNodeIndex; i--) {
                if (symbolContainerDeclPath[i + 1].flags & PullElementFlags.Exported) {
                    startingIndex = i;
                } else {
                    break;
                }
            }
            return { potentialPath: symbolContainerDeclPath, startingIndex: startingIndex };
        }

        // Emit the dotted names using the decl path
        private emitDottedNameFromDeclPath(declPath: PullDecl[], startingIndex: number, lastIndex: number) {
            for (var i = startingIndex; i <= lastIndex; i++) {
                if (declPath[i].kind === PullElementKind.DynamicModule ||
                    declPath[i].flags & PullElementFlags.InitializedDynamicModule) {
                    this.writeToOutput("exports.");
                } else {
                    // Get the name of the decl that would need to referenced and is conflict free.
                    this.writeToOutput(this.getModuleName(declPath[i], /* changeNameIfAnyDeclarationInContext */ true) + ".");
                }
            }
        }

        // Emits the container name of the symbol in the given enclosing context
        private emitSymbolContainerNameInEnclosingContext(pullSymbol: PullSymbol) {
            var declPathInfo = this.getPotentialDeclPathInfoForEmit(pullSymbol);
            var potentialDeclPath = declPathInfo.potentialPath;
            var startingIndex = declPathInfo.startingIndex;

            // Emit dotted names for the path
            this.emitDottedNameFromDeclPath(potentialDeclPath, startingIndex, potentialDeclPath.length - 1);
        }

        // Get the symbol information to be used for emitting the ast
        private getSymbolForEmit(ast: ISyntaxElement) {
            var pullSymbol = this.semanticInfoChain.getSymbolForAST(ast);
            var pullSymbolAlias = this.semanticInfoChain.getAliasSymbolForAST(ast);
            if (pullSymbol && pullSymbolAlias) {
                var symbolToCompare = isTypesOnlyLocation(ast) ?
                    pullSymbolAlias.getExportAssignedTypeSymbol() :
                    pullSymbolAlias.getExportAssignedValueSymbol();

                if (pullSymbol == symbolToCompare) {
                    pullSymbol = pullSymbolAlias;
                    pullSymbolAlias = null;
                }
            }
            return { symbol: pullSymbol, aliasSymbol: pullSymbolAlias };
        }

        public emitName(name: ISyntaxToken, addThis: boolean) {
            this.emitComments(name, true);
            this.recordSourceMappingStart(name);
            if (name.text().length > 0) {
                var symbolForEmit = this.getSymbolForEmit(name);
                var pullSymbol = symbolForEmit.symbol;
                if (!pullSymbol) {
                    pullSymbol = this.semanticInfoChain.anyTypeSymbol;
                }
                var pullSymbolAlias = symbolForEmit.aliasSymbol;
                var pullSymbolKind = pullSymbol.kind;
                var isLocalAlias = pullSymbolAlias && (pullSymbolAlias.getDeclarations()[0].getParentDecl() == this.getEnclosingDecl());
                if (addThis && (this.emitState.container !== EmitContainer.Args) && pullSymbol) {
                    var pullSymbolContainer = pullSymbol.getContainer();

                    if (pullSymbolContainer) {
                        var pullSymbolContainerKind = pullSymbolContainer.kind;

                        if (pullSymbolContainerKind === PullElementKind.Class) {
                            if (pullSymbol.anyDeclHasFlag(PullElementFlags.Static)) {
                                // This is static symbol
                                this.emitSymbolContainerNameInEnclosingContext(pullSymbol);
                            }
                            else if (pullSymbolKind === PullElementKind.Property) {
                                this.emitThis();
                                this.writeToOutput(".");
                            }
                        }
                        else if (PullHelpers.symbolIsModule(pullSymbolContainer) || pullSymbolContainerKind === PullElementKind.Enum ||
                            pullSymbolContainer.anyDeclHasFlag(PullElementFlags.InitializedModule | PullElementFlags.Enum)) {
                            // If property or, say, a constructor being invoked locally within the module of its definition
                            if (pullSymbolKind === PullElementKind.Property || pullSymbolKind === PullElementKind.EnumMember) {
                                this.emitSymbolContainerNameInEnclosingContext(pullSymbol);
                            }
                            else if (pullSymbol.anyDeclHasFlag(PullElementFlags.Exported) &&
                                pullSymbolKind === PullElementKind.Variable &&
                                !pullSymbol.anyDeclHasFlag(PullElementFlags.InitializedModule | PullElementFlags.Enum)) {
                                this.emitSymbolContainerNameInEnclosingContext(pullSymbol);
                            }
                            else if (pullSymbol.anyDeclHasFlag(PullElementFlags.Exported) && !this.symbolIsUsedInItsEnclosingContainer(pullSymbol)) {
                                this.emitSymbolContainerNameInEnclosingContext(pullSymbol);
                            }
                        }
                        else if (pullSymbolContainerKind === PullElementKind.DynamicModule ||
                            pullSymbolContainer.anyDeclHasFlag(PullElementFlags.InitializedDynamicModule)) {
                            if (pullSymbolKind === PullElementKind.Property) {
                                // If dynamic module
                                this.writeToOutput("exports.");
                            }
                            else if (pullSymbol.anyDeclHasFlag(PullElementFlags.Exported) &&
                                !isLocalAlias &&
                                !pullSymbol.anyDeclHasFlag(PullElementFlags.ImplicitVariable) &&
                                pullSymbol.kind !== PullElementKind.ConstructorMethod &&
                                pullSymbol.kind !== PullElementKind.Class &&
                                pullSymbol.kind !== PullElementKind.Enum) {
                                this.writeToOutput("exports.");
                            }
                        }
                    }
                }

                this.writeToOutput(name.text());
            }

            this.recordSourceMappingEnd(name);
            this.emitComments(name, false);
        }

        public recordSourceMappingNameStart(name: string) {
            if (this.sourceMapper) {
                var nameIndex = -1;
                if (name) {
                    if (this.sourceMapper.currentNameIndex.length > 0) {
                        var parentNameIndex = this.sourceMapper.currentNameIndex[this.sourceMapper.currentNameIndex.length - 1];
                        if (parentNameIndex != -1) {
                            name = this.sourceMapper.names[parentNameIndex] + "." + name;
                        }
                    }

                    // Look if there already exists name
                    var nameIndex = this.sourceMapper.names.length - 1;
                    for (nameIndex; nameIndex >= 0; nameIndex--) {
                        if (this.sourceMapper.names[nameIndex] == name) {
                            break;
                        }
                    }

                    if (nameIndex == -1) {
                        nameIndex = this.sourceMapper.names.length;
                        this.sourceMapper.names.push(name);
                    }
                }
                this.sourceMapper.currentNameIndex.push(nameIndex);
            }
        }

        public recordSourceMappingNameEnd() {
            if (this.sourceMapper) {
                this.sourceMapper.currentNameIndex.pop();
            }
        }

        private recordSourceMappingStart(ast: ISyntaxElement) {
            if (this.sourceMapper && isValidAstNode(ast)) {
                this.recordSourceMappingSpanStart(ast);
            }
        }

        private recordSourceMappingSpanStart(ast: ISpan) {
            if (this.sourceMapper && isValidSpan(ast)) {
                var lineCol = { line: -1, character: -1 };
                var sourceMapping = new SourceMapping();
                sourceMapping.start.emittedColumn = this.emitState.column;
                sourceMapping.start.emittedLine = this.emitState.line;
                // REVIEW: check time consumed by this binary search (about two per leaf statement)
                var lineMap = this.document.lineMap();
                lineMap.fillLineAndCharacterFromPosition(ast.start(), lineCol);
                sourceMapping.start.sourceColumn = lineCol.character;
                sourceMapping.start.sourceLine = lineCol.line + 1;
                lineMap.fillLineAndCharacterFromPosition(ast.end(), lineCol);
                sourceMapping.end.sourceColumn = lineCol.character;
                sourceMapping.end.sourceLine = lineCol.line + 1;

                Debug.assert(!isNaN(sourceMapping.start.emittedColumn));
                Debug.assert(!isNaN(sourceMapping.start.emittedLine));
                Debug.assert(!isNaN(sourceMapping.start.sourceColumn));
                Debug.assert(!isNaN(sourceMapping.start.sourceLine));
                Debug.assert(!isNaN(sourceMapping.end.sourceColumn));
                Debug.assert(!isNaN(sourceMapping.end.sourceLine));

                if (this.sourceMapper.currentNameIndex.length > 0) {
                    sourceMapping.nameIndex = this.sourceMapper.currentNameIndex[this.sourceMapper.currentNameIndex.length - 1];
                }
                // Set parent and child relationship
                var siblings = this.sourceMapper.currentMappings[this.sourceMapper.currentMappings.length - 1];
                siblings.push(sourceMapping);
                this.sourceMapper.currentMappings.push(sourceMapping.childMappings);
                this.sourceMapper.increaseMappingLevel(ast);
            }
        }

        private recordSourceMappingEnd(ast: ISyntaxElement) {
            if (this.sourceMapper && isValidAstNode(ast)) {
                this.recordSourceMappingSpanEnd(ast);
            }
        }

        private recordSourceMappingSpanEnd(ast: ISpan) {
            if (this.sourceMapper && isValidSpan(ast)) {
                // Pop source mapping childs
                this.sourceMapper.currentMappings.pop();

                // Get the last source mapping from sibling list = which is the one we are recording end for
                var siblings = this.sourceMapper.currentMappings[this.sourceMapper.currentMappings.length - 1];
                var sourceMapping = siblings[siblings.length - 1];

                sourceMapping.end.emittedColumn = this.emitState.column;
                sourceMapping.end.emittedLine = this.emitState.line;

                Debug.assert(!isNaN(sourceMapping.end.emittedColumn));
                Debug.assert(!isNaN(sourceMapping.end.emittedLine));

                this.sourceMapper.decreaseMappingLevel(ast);
            }
        }

        // Note: may throw exception.
        public getOutputFiles(): OutputFile[] {
            // Output a source mapping.  As long as we haven't gotten any errors yet.
            var result: OutputFile[] = [];
            if (this.sourceMapper !== null) {
                this.sourceMapper.emitSourceMapping();
                result.push(this.sourceMapper.getOutputFile());
            }

            result.push(this.outfile.getOutputFile());
            return result;
        }

        private emitParameterPropertyAndMemberVariableAssignments(): void {
            // emit any parameter properties first
            var constructorDecl = getLastConstructor(this.thisClassNode);

            if (constructorDecl && constructorDecl.parameterList) {
                for (var i = 0, n = constructorDecl.parameterList.parameters.nonSeparatorCount(); i < n; i++) {
                    var parameter = <ParameterSyntax>constructorDecl.parameterList.parameters.nonSeparatorAt(i);
                    var parameterDecl = this.semanticInfoChain.getDeclForAST(parameter);
                    if (hasFlag(parameterDecl.flags, PullElementFlags.PropertyParameter)) {
                        this.emitIndent();
                        this.recordSourceMappingStart(parameter);
                        this.writeToOutputWithSourceMapRecord("this." + parameter.identifier.text(), parameter.identifier);
                        this.writeToOutput(" = ");
                        this.writeToOutputWithSourceMapRecord(parameter.identifier.text(), parameter.identifier);
                        this.writeLineToOutput(";");
                        this.recordSourceMappingEnd(parameter);
                    }
                }
            }

            for (var i = 0, n = this.thisClassNode.classElements.childCount(); i < n; i++) {
                if (this.thisClassNode.classElements.childAt(i).kind() === SyntaxKind.MemberVariableDeclaration) {
                    var varDecl = <MemberVariableDeclarationSyntax>this.thisClassNode.classElements.childAt(i);
                    if (!hasModifier(varDecl.modifiers, PullElementFlags.Static) && varDecl.variableDeclarator.equalsValueClause) {
                        this.emitIndent();
                        this.emitMemberVariableDeclaration(varDecl);
                        this.writeLineToOutput("");
                    }
                }
            }
        }

        private isOnSameLine(pos1: number, pos2: number): boolean {
            if (pos1 < 0 || pos2 < 0) {
                // Missing element.  Assume it's on the same line as the other element.
                return true;
            }

            var lineMap = this.document.lineMap();
            return lineMap.getLineNumberFromPosition(pos1) === lineMap.getLineNumberFromPosition(pos2);
        }

        private emitCommaSeparatedList(parent: ISyntaxElement, list: ISeparatedSyntaxList, buffer: string, preserveNewLines: boolean): void {
            if (list === null || list.nonSeparatorCount() === 0) {
                return;
            }

            // If the first element isn't on hte same line as the parent node, then we need to 
            // start with a newline.
            var startLine = preserveNewLines && !this.isOnSameLine(parent.end(), list.nonSeparatorAt(0).end());

            if (preserveNewLines) {
                // Any elements on a new line will have to be indented.
                this.indenter.increaseIndent();
            }

            // If we're starting on a newline, then emit an actual newline. Otherwise write out
            // the buffer character before hte first element.
            if (startLine) {
                this.writeLineToOutput("");
            }
            else {
                this.writeToOutput(buffer);
            }

            for (var i = 0, n = list.nonSeparatorCount(); i < n; i++) {
                var emitNode = list.nonSeparatorAt(i);

                // Write out the element, emitting an indent if we're on a new line.
                this.emitJavascript(emitNode, startLine);

                if (i < (n - 1)) {
                    // If the next element start on a different line than this element ended on, 
                    // then we want to start on a newline.  Emit the comma with a newline.  
                    // Otherwise, emit the comma with the space.
                    startLine = preserveNewLines && !this.isOnSameLine(emitNode.end(), list.nonSeparatorAt(i + 1).start());
                    if (startLine) {
                        this.writeLineToOutput(",");
                    }
                    else {
                        this.writeToOutput(", ");
                    }
                }
            }

            if (preserveNewLines) {
                // We're done with all the elements.  Return the indent back to where it was.
                this.indenter.decreaseIndent();
            }

            // If the last element isn't on the same line as the parent, then emit a newline
            // after the last element and emit our indent so the list's terminator will be
            // on the right line.  Otherwise, emit the buffer string between the last value
            // and the terminator.
            if (preserveNewLines && !this.isOnSameLine(parent.end(), list.nonSeparatorAt(list.nonSeparatorCount() - 1).end())) {
                this.writeLineToOutput("");
                this.emitIndent();
            }
            else {
                this.writeToOutput(buffer);
            }
        }

        public emitList(list: ISyntaxList, useNewLineSeparator = true, startInclusive = 0, endExclusive = list.childCount()) {
            if (list === null) {
                return;
            }

            this.emitComments(list, true);
            var lastEmittedNode: ISyntaxElement = null;

            for (var i = startInclusive; i < endExclusive; i++) {
                var node = list.childAt(i);

                if (this.shouldEmit(node)) {
                    this.emitSpaceBetweenConstructs(lastEmittedNode, node);

                    this.emitJavascript(node, true);
                    if (useNewLineSeparator) {
                        this.writeLineToOutput("");
                    }

                    lastEmittedNode = node;
                }
            }

            this.emitComments(list, false);
        }

        public emitSeparatedList(list: ISeparatedSyntaxList, useNewLineSeparator = true, startInclusive = 0, endExclusive = list.nonSeparatorCount()) {
            if (list === null) {
                return;
            }

            this.emitComments(list, true);
            var lastEmittedNode: ISyntaxElement = null;

            for (var i = startInclusive; i < endExclusive; i++) {
                var node = list.nonSeparatorAt(i);

                if (this.shouldEmit(node)) {
                    this.emitSpaceBetweenConstructs(lastEmittedNode, node);

                    this.emitJavascript(node, true);
                    if (useNewLineSeparator) {
                        this.writeLineToOutput("");
                    }

                    lastEmittedNode = node;
                }
            }

            this.emitComments(list, false);
        }

        private isDirectivePrologueElement(node: ISyntaxElement) {
            if (node.kind() === SyntaxKind.ExpressionStatement) {
                var exprStatement = <ExpressionStatementSyntax>node;
                return exprStatement.expression.kind() === SyntaxKind.StringLiteral;
            }

            return false;
        }

        // If these two constructs had more than one line between them originally, then emit at 
        // least one blank line between them.
        public emitSpaceBetweenConstructs(node1: ISyntaxElement, node2: ISyntaxElement): void {
            if (node1 === null || node2 === null) {
                return;
            }

            if (node1.start() === -1 || node1.end() === -1 || node2.start() === -1 || node2.end() === -1) {
                return;
            }

            var lineMap = this.document.lineMap();
            var node1EndLine = lineMap.getLineNumberFromPosition(node1.end());
            var node2StartLine = lineMap.getLineNumberFromPosition(node2.start());

            if ((node2StartLine - node1EndLine) > 1) {
                this.writeLineToOutput("", /*force:*/ true);
            }
        }

        // We consider a sequence of comments to be a copyright header if there are no blank lines 
        // between them, and there is a blank line after the last one and the node they're attached 
        // to.
        private getCopyrightComments(): Comment[] {
            var preComments = TypeScript.preComments(this.copyrightElement);
            if (preComments) {
                var lineMap = this.document.lineMap();

                var copyrightComments: Comment[] = [];
                var lastComment: Comment = null;

                for (var i = 0, n = preComments.length; i < n; i++) {
                    var comment = preComments[i];

                    if (lastComment) {
                        var lastCommentLine = lineMap.getLineNumberFromPosition(lastComment.end());
                        var commentLine = lineMap.getLineNumberFromPosition(comment.start());

                        if (commentLine >= lastCommentLine + 2) {
                            // There was a blank line between the last comment and this comment.  This
                            // comment is not part of the copyright comments.  Return what we have so 
                            // far.
                            return copyrightComments;
                        }
                    }

                    copyrightComments.push(comment);
                    lastComment = comment;
                }

                // All comments look like they could have been part of the copyright header.  Make
                // sure there is at least one blank line between it and the node.  If not, it's not
                // a copyright header.
                var lastCommentLine = lineMap.getLineNumberFromPosition(ArrayUtilities.last(copyrightComments).end());
                var astLine = lineMap.getLineNumberFromPosition(this.copyrightElement.start());
                if (astLine >= lastCommentLine + 2) {
                    return copyrightComments;
                }
            }

            // No usable copyright comments found.
            return [];
        }

        private emitPossibleCopyrightHeaders(script: SourceUnitSyntax): void {
            var list = script.moduleElements;
            if (list.childCount() > 0) {
                var firstElement = list.childAt(0);

                this.copyrightElement = firstElement;
                this.emitCommentsArray(this.getCopyrightComments(), /*trailing:*/ false);
            }
        }

        public emitScriptElements(sourceUnit: SourceUnitSyntax) {
            var list = sourceUnit.moduleElements;

            this.emitPossibleCopyrightHeaders(sourceUnit);

            // First, emit all the prologue elements.
            for (var i = 0, n = list.childCount(); i < n; i++) {
                var node = list.childAt(i);

                if (!this.isDirectivePrologueElement(node)) {
                    break;
                }

                this.emitJavascript(node, true);
                this.writeLineToOutput("");
            }

            // Now emit __extends or a _this capture if necessary.
            this.emitPrologue(sourceUnit);

            var isExternalModule = this.document.isExternalModule();
            var isNonElidedExternalModule = isExternalModule && !scriptIsElided(sourceUnit);
            if (isNonElidedExternalModule) {
                this.recordSourceMappingStart(sourceUnit);

                if (this.emitOptions.compilationSettings().moduleGenTarget() === ModuleGenTarget.Asynchronous) { // AMD
                    var dependencyList = "[\"require\", \"exports\"";
                    var importList = "require, exports";

                    var importAndDependencyList = this.getModuleImportAndDependencyList(sourceUnit);
                    importList += importAndDependencyList.importList;
                    dependencyList += importAndDependencyList.dependencyList + "]";

                    this.writeLineToOutput("define(" + dependencyList + "," + " function(" + importList + ") {");
                }
            }

            if (isExternalModule) {
                var temp = this.setContainer(EmitContainer.DynamicModule);

                var svModuleName = this.moduleName;
                this.moduleName = sourceUnit.fileName();
                if (TypeScript.isTSFile(this.moduleName)) {
                    this.moduleName = this.moduleName.substring(0, this.moduleName.length - ".ts".length);
                }

                // if the external module has an "export =" identifier, we'll
                // set it in the ExportAssignment emit method
                this.setExportAssignmentIdentifier(null);

                if(this.emitOptions.compilationSettings().moduleGenTarget() === ModuleGenTarget.Asynchronous) {
                    this.indenter.increaseIndent();
                }

                var externalModule = this.semanticInfoChain.getDeclForAST(this.document.sourceUnit());

                if (hasFlag(externalModule.flags, PullElementFlags.MustCaptureThis)) {
                    this.writeCaptureThisStatement(sourceUnit);
                }

                this.pushDecl(externalModule);
            }

            this.emitList(list, /*useNewLineSeparator:*/ true, /*startInclusive:*/ i, /*endExclusive:*/ n);

            if (isExternalModule) {
                if (this.emitOptions.compilationSettings().moduleGenTarget() === ModuleGenTarget.Asynchronous) {
                    this.indenter.decreaseIndent();
                }

                if (isNonElidedExternalModule) {
                    var exportAssignmentIdentifier = this.getExportAssignmentIdentifier();
                    var exportAssignmentValueSymbol = (<PullContainerSymbol>externalModule.getSymbol()).getExportAssignedValueSymbol();

                    if (this.emitOptions.compilationSettings().moduleGenTarget() === ModuleGenTarget.Asynchronous) { // AMD
                        if (exportAssignmentIdentifier && exportAssignmentValueSymbol && !(exportAssignmentValueSymbol.kind & PullElementKind.SomeTypeReference)) {
                            // indent was decreased for AMD above
                            this.indenter.increaseIndent();
                            this.emitIndent();
                            this.writeLineToOutput("return " + exportAssignmentIdentifier + ";");
                            this.indenter.decreaseIndent();
                        }
                        this.writeToOutput("});");
                    }
                    else if (exportAssignmentIdentifier && exportAssignmentValueSymbol && !(exportAssignmentValueSymbol.kind & PullElementKind.SomeTypeReference)) {
                        this.emitIndent();
                        this.writeToOutput("module.exports = " + exportAssignmentIdentifier + ";");
                    }

                    this.recordSourceMappingEnd(sourceUnit);
                    this.writeLineToOutput("");
                }

                this.setContainer(temp);
                this.moduleName = svModuleName;
                this.popDecl(externalModule);
            }
        }

        public emitConstructorStatements(funcDecl: ConstructorDeclarationSyntax) {
            var list = funcDecl.block.statements;

            if (list === null) {
                return;
            }

            this.emitComments(list, true);

            var emitPropertyAssignmentsAfterSuperCall = getExtendsHeritageClause(this.thisClassNode.heritageClauses) !== null;
            var propertyAssignmentIndex = emitPropertyAssignmentsAfterSuperCall ? 1 : 0;
            var lastEmittedNode: ISyntaxElement = null;

            for (var i = 0, n = list.childCount(); i < n; i++) {
                // In some circumstances, class property initializers must be emitted immediately after the 'super' constructor
                // call which, in these cases, must be the first statement in the constructor body
                if (i === propertyAssignmentIndex) {
                    this.emitParameterPropertyAndMemberVariableAssignments();
                }

                var node = list.childAt(i);

                if (this.shouldEmit(node)) {
                    this.emitSpaceBetweenConstructs(lastEmittedNode, node);

                    this.emitJavascript(node, true);
                    this.writeLineToOutput("");

                    lastEmittedNode = node;
                }
            }

            if (i === propertyAssignmentIndex) {
                this.emitParameterPropertyAndMemberVariableAssignments();
            }

            this.emitComments(list, false);
        }

        // tokenId is the id the preceding token
        public emitJavascript(ast: ISyntaxElement, startLine: boolean) {
            if (ast === null) {
                return;
            }

            if (startLine &&
                this.indenter.indentAmt > 0) {

                this.emitIndent();
            }

            this.emit(ast);
        }

        public emitAccessorMemberDeclaration(funcDecl: ISyntaxElement, name: ISyntaxToken, className: string, isProto: boolean) {
            if (funcDecl.kind() !== SyntaxKind.GetAccessor) {
                var accessorSymbol = PullHelpers.getAccessorSymbol(funcDecl, this.semanticInfoChain);
                if (accessorSymbol.getGetter()) {
                    return;
                }
            }

            this.emitIndent();
            this.recordSourceMappingStart(funcDecl);

            this.writeToOutput("Object.defineProperty(" + className);
            if (isProto) {
                this.writeToOutput(".prototype, ");
            }
            else {
                this.writeToOutput(", ");
            }

            var functionName = name.text();
            if (isQuoted(functionName)) {
                this.writeToOutput(functionName);
            }
            else {
                this.writeToOutput('"' + functionName + '"');
            }

            this.writeLineToOutput(", {");

            this.indenter.increaseIndent();

            var accessors = PullHelpers.getGetterAndSetterFunction(funcDecl, this.semanticInfoChain);
            if (accessors.getter) {
                this.emitIndent();
                this.recordSourceMappingStart(accessors.getter);
                this.emitComments(accessors.getter, true);
                this.writeToOutput("get: ");
                this.emitAccessorBody(accessors.getter, accessors.getter.parameterList, accessors.getter.block);
                this.writeLineToOutput(",");
            }

            if (accessors.setter) {
                this.emitIndent();
                this.recordSourceMappingStart(accessors.setter);
                this.emitComments(accessors.setter, true);
                this.writeToOutput("set: ");
                this.emitAccessorBody(accessors.setter, accessors.setter.parameterList, accessors.setter.block);
                this.writeLineToOutput(",");
            }

            this.emitIndent();
            this.writeLineToOutput("enumerable: true,");
            this.emitIndent();
            this.writeLineToOutput("configurable: true");
            this.indenter.decreaseIndent();
            this.emitIndent();
            this.writeLineToOutput("});");
            this.recordSourceMappingEnd(funcDecl);
        }

        private emitAccessorBody(funcDecl: ISyntaxElement, parameterList: ParameterListSyntax, block: BlockSyntax): void {
            var pullDecl = this.semanticInfoChain.getDeclForAST(funcDecl);
            this.pushDecl(pullDecl);

            this.recordSourceMappingStart(funcDecl);
            this.writeToOutput("function ");
            this.emitParameterList(parameterList);

            var parameters = Parameters.fromParameterList(parameterList);
            this.emitFunctionBodyStatements(null, funcDecl, parameters, block, /*bodyExpression:*/ null);

            this.recordSourceMappingEnd(funcDecl);

            // The extra call is to make sure the caller's funcDecl end is recorded, since caller wont be able to record it
            this.recordSourceMappingEnd(funcDecl);
            this.popDecl(pullDecl);
        }

        public emitClass(classDecl: ClassDeclarationSyntax) {
            var pullDecl = this.semanticInfoChain.getDeclForAST(classDecl);
            this.pushDecl(pullDecl);

            var svClassNode = this.thisClassNode;
            this.thisClassNode = classDecl;
            var className = classDecl.identifier.text();
            this.emitComments(classDecl, true);
            var temp = this.setContainer(EmitContainer.Class);

            this.recordSourceMappingStart(classDecl);
            this.writeToOutput("var " + className);

            var hasBaseClass = getExtendsHeritageClause(classDecl.heritageClauses) !== null;
            var baseTypeReference: ISyntaxElement = null;
            var varDecl: VariableDeclaratorSyntax = null;

            if (hasBaseClass) {
                this.writeLineToOutput(" = (function (_super) {");
            } else {
                this.writeLineToOutput(" = (function () {");
            }

            this.recordSourceMappingNameStart(className);
            this.indenter.increaseIndent();

            if (hasBaseClass) {
                baseTypeReference = getExtendsHeritageClause(classDecl.heritageClauses).typeNames.nonSeparatorAt(0);
                this.emitIndent();
                this.writeLineToOutput("__extends(" + className + ", _super);");
            }

            this.emitIndent();

            var constrDecl = getLastConstructor(classDecl);

            // output constructor
            if (constrDecl) {
                // declared constructor
                this.emit(constrDecl);
                this.writeLineToOutput("");
            }
            else {
                this.recordSourceMappingStart(classDecl);
                // default constructor
                this.indenter.increaseIndent();
                this.writeLineToOutput("function " + classDecl.identifier.text() + "() {");
                this.recordSourceMappingNameStart("constructor");
                if (hasBaseClass) {
                    this.emitIndent();
                    this.writeLineToOutput("_super.apply(this, arguments);");
                }

                if (this.shouldCaptureThis(classDecl)) {
                    this.writeCaptureThisStatement(classDecl);
                }

                this.emitParameterPropertyAndMemberVariableAssignments();

                this.indenter.decreaseIndent();
                this.emitIndent();
                this.writeLineToOutput("}");

                this.recordSourceMappingNameEnd();
                this.recordSourceMappingEnd(classDecl);
            }

            this.emitClassMembers(classDecl);

            this.emitIndent();
            this.writeToOutputWithSourceMapRecord("return " + className + ";", classDecl.closeBraceToken);
            this.writeLineToOutput("");
            this.indenter.decreaseIndent();
            this.emitIndent();
            this.writeToOutputWithSourceMapRecord("}", classDecl.closeBraceToken);
            this.recordSourceMappingNameEnd();
            this.recordSourceMappingStart(classDecl);
            this.writeToOutput(")(");
            if (hasBaseClass) {
                this.emitJavascript(baseTypeReference, /*startLine:*/ false);
            }
            this.writeToOutput(");");
            this.recordSourceMappingEnd(classDecl);

            if ((temp === EmitContainer.Module || temp === EmitContainer.DynamicModule) && hasFlag(pullDecl.flags, PullElementFlags.Exported)) {
                this.writeLineToOutput("");
                this.emitIndent();
                var modName = temp === EmitContainer.Module ? this.moduleName : "exports";
                this.writeToOutputWithSourceMapRecord(modName + "." + className + " = " + className + ";", classDecl);
            }

            this.recordSourceMappingEnd(classDecl);
            this.emitComments(classDecl, false);
            this.setContainer(temp);
            this.thisClassNode = svClassNode;

            this.popDecl(pullDecl);
        }

        private emitClassMembers(classDecl: ClassDeclarationSyntax): void {
            // First, emit all the functions.
            var lastEmittedMember: ISyntaxElement = null;

            for (var i = 0, n = classDecl.classElements.childCount(); i < n; i++) {
                var memberDecl = classDecl.classElements.childAt(i);

                if (memberDecl.kind() === SyntaxKind.GetAccessor) {
                    this.emitSpaceBetweenConstructs(lastEmittedMember, memberDecl);
                    var getter = <GetAccessorSyntax>memberDecl;
                    this.emitAccessorMemberDeclaration(getter, getter.propertyName, classDecl.identifier.text(),
                        !hasModifier(getter.modifiers, PullElementFlags.Static));
                    lastEmittedMember = memberDecl;
                }
                else if (memberDecl.kind() === SyntaxKind.SetAccessor) {
                    this.emitSpaceBetweenConstructs(lastEmittedMember, memberDecl);
                    var setter = <SetAccessorSyntax>memberDecl;
                    this.emitAccessorMemberDeclaration(setter, setter.propertyName, classDecl.identifier.text(),
                        !hasModifier(setter.modifiers, PullElementFlags.Static));
                    lastEmittedMember = memberDecl;
                }
                else if (memberDecl.kind() === SyntaxKind.MemberFunctionDeclaration) {

                    var memberFunction = <MemberFunctionDeclarationSyntax>memberDecl;

                    if (memberFunction.block) {
                        this.emitSpaceBetweenConstructs(lastEmittedMember, memberDecl);

                        this.emitClassMemberFunctionDeclaration(classDecl, memberFunction);
                        lastEmittedMember = memberDecl;
                    }
                }
            }

            // Now emit all the statics.
            for (var i = 0, n = classDecl.classElements.childCount(); i < n; i++) {
                var memberDecl = classDecl.classElements.childAt(i);

                if (memberDecl.kind() === SyntaxKind.MemberVariableDeclaration) {
                    var varDecl = <MemberVariableDeclarationSyntax>memberDecl;

                    if (hasModifier(varDecl.modifiers, PullElementFlags.Static) && varDecl.variableDeclarator.equalsValueClause) {
                        this.emitSpaceBetweenConstructs(lastEmittedMember, varDecl);

                        this.emitIndent();
                        this.recordSourceMappingStart(varDecl);

                        var varDeclName = varDecl.variableDeclarator.propertyName.text();
                        if (isQuoted(varDeclName) || varDecl.variableDeclarator.propertyName.kind() !== SyntaxKind.IdentifierName) {
                            this.writeToOutput(classDecl.identifier.text() + "[" + varDeclName + "]");
                        }
                        else {
                            this.writeToOutput(classDecl.identifier.text() + "." + varDeclName);
                        }

                        this.emit(varDecl.variableDeclarator.equalsValueClause);

                        this.recordSourceMappingEnd(varDecl);
                        this.writeLineToOutput(";");

                        lastEmittedMember = varDecl;
                    }
                }
            }
        }

        private emitClassMemberFunctionDeclaration(classDecl: ClassDeclarationSyntax, funcDecl: MemberFunctionDeclarationSyntax): void {
            this.emitIndent();
            this.recordSourceMappingStart(funcDecl);
            this.emitComments(funcDecl, true);
            var functionName = funcDecl.propertyName.text();

            this.writeToOutput(classDecl.identifier.text());

            if (!hasModifier(funcDecl.modifiers, PullElementFlags.Static)) {
                this.writeToOutput(".prototype");
            }

            if (isQuoted(functionName) || funcDecl.propertyName.kind() !== SyntaxKind.IdentifierName) {
                this.writeToOutput("[" + functionName + "] = ");
            }
            else {
                this.writeToOutput("." + functionName + " = ");
            }

            var pullDecl = this.semanticInfoChain.getDeclForAST(funcDecl);
            this.pushDecl(pullDecl);

            this.recordSourceMappingStart(funcDecl);
            this.writeToOutput("function ");

            this.emitParameterList(funcDecl.callSignature.parameterList);

            var parameters = Parameters.fromParameterList(funcDecl.callSignature.parameterList);
            this.emitFunctionBodyStatements(funcDecl.propertyName.text(), funcDecl, parameters, funcDecl.block, /*bodyExpression:*/ null);

            this.recordSourceMappingEnd(funcDecl);

            this.emitComments(funcDecl, false);

            this.recordSourceMappingEnd(funcDecl);
            this.popDecl(pullDecl);

            this.writeLineToOutput(";");
        }

        private requiresExtendsBlock(moduleElements: ISyntaxList): boolean {
            for (var i = 0, n = moduleElements.childCount(); i < n; i++) {
                var moduleElement = moduleElements.childAt(i);

                if (moduleElement.kind() === SyntaxKind.ModuleDeclaration) {
                    var moduleAST = <ModuleDeclarationSyntax>moduleElement;

                    if (!hasModifier(moduleAST.modifiers, PullElementFlags.Ambient) && this.requiresExtendsBlock(moduleAST.moduleElements)) {
                        return true;
                    }
                }
                else if (moduleElement.kind() === SyntaxKind.ClassDeclaration) {
                    var classDeclaration = <ClassDeclarationSyntax>moduleElement;

                    if (!hasModifier(classDeclaration.modifiers, PullElementFlags.Ambient) && getExtendsHeritageClause(classDeclaration.heritageClauses) !== null) {
                        return true;
                    }
                }
            }

            return false;
        }

        public emitPrologue(sourceUnit: SourceUnitSyntax) {
            if (!this.extendsPrologueEmitted) {
                if (this.requiresExtendsBlock(sourceUnit.moduleElements)) {
                    this.extendsPrologueEmitted = true;
                    this.writeLineToOutput("var __extends = this.__extends || function (d, b) {");
                    this.writeLineToOutput("    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];");
                    this.writeLineToOutput("    function __() { this.constructor = d; }");
                    this.writeLineToOutput("    __.prototype = b.prototype;");
                    this.writeLineToOutput("    d.prototype = new __();");
                    this.writeLineToOutput("};");
                }
            }

            if (!this.globalThisCapturePrologueEmitted) {
                if (this.shouldCaptureThis(sourceUnit)) {
                    this.globalThisCapturePrologueEmitted = true;
                    this.writeLineToOutput(this.captureThisStmtString);
                }
            }
        }

        public emitThis() {
            if (!this.inWithBlock && this.inArrowFunction) {
                this.writeToOutput("_this");
            }
            else {
                this.writeToOutput("this");
            }
        }

        public emitBlockOrStatement(node: ISyntaxElement): void {
            if (node.kind() === SyntaxKind.Block) {
                this.emit(node);
            }
            else {
                this.writeLineToOutput("");
                this.indenter.increaseIndent();
                this.emitJavascript(node, true);
                this.indenter.decreaseIndent();
            }
        }

        public emitLiteralExpression(expression: ISyntaxToken): void {
            switch (expression.kind()) {
                case SyntaxKind.NullKeyword:
                    this.writeToOutputWithSourceMapRecord("null", expression);
                    break;
                case SyntaxKind.FalseKeyword:
                    this.writeToOutputWithSourceMapRecord("false", expression);
                    break;
                case SyntaxKind.TrueKeyword:
                    this.writeToOutputWithSourceMapRecord("true", expression);
                    break;
                default:
                    throw Errors.abstract();
            }
        }

        public emitThisExpression(expression: ISyntaxToken): void {
            if (!this.inWithBlock && this.inArrowFunction) {
                this.writeToOutputWithSourceMapRecord("_this", expression);
            }
            else {
                this.writeToOutputWithSourceMapRecord("this", expression);
            }
        }

        public emitSuperExpression(expression: ISyntaxToken): void {
            this.writeToOutputWithSourceMapRecord("_super.prototype", expression);
        }

        public emitParenthesizedExpression(parenthesizedExpression: ParenthesizedExpressionSyntax): void {
            if (parenthesizedExpression.expression.kind() === SyntaxKind.CastExpression && convertTokenTrailingComments(parenthesizedExpression.openParenToken) === null) {
                // We have an expression of the form: (<Type>SubExpr)
                // Emitting this as (SubExpr) is really not desirable.  Just emit the subexpr as is.
                this.emit(parenthesizedExpression.expression);
            }
            else {
                this.recordSourceMappingStart(parenthesizedExpression);
                this.writeToOutput("(");
                this.emitCommentsArray(convertTokenTrailingComments(parenthesizedExpression.openParenToken), /*trailing:*/ false);
                this.emit(parenthesizedExpression.expression);
                this.writeToOutput(")");
                this.recordSourceMappingEnd(parenthesizedExpression);
            }
        }

        public emitCastExpression(expression: CastExpressionSyntax): void {
            this.emit(expression.expression);
        }

        public emitPrefixUnaryExpression(expression: PrefixUnaryExpressionSyntax): void {
            var nodeType = expression.kind();

            this.recordSourceMappingStart(expression);
            switch (nodeType) {
                case SyntaxKind.LogicalNotExpression:
                    this.writeToOutput("!");
                    this.emit(expression.operand);
                    break;
                case SyntaxKind.BitwiseNotExpression:
                    this.writeToOutput("~");
                    this.emit(expression.operand);
                    break;
                case SyntaxKind.NegateExpression:
                    this.writeToOutput("-");
                    if (expression.operand.kind() === SyntaxKind.NegateExpression || expression.operand.kind() === SyntaxKind.PreDecrementExpression) {
                        this.writeToOutput(" ");
                    }
                    this.emit(expression.operand);
                    break;
                case SyntaxKind.PlusExpression:
                    this.writeToOutput("+");
                    if (expression.operand.kind() === SyntaxKind.PlusExpression || expression.operand.kind() === SyntaxKind.PreIncrementExpression) {
                        this.writeToOutput(" ");
                    }
                    this.emit(expression.operand);
                    break;
                case SyntaxKind.PreIncrementExpression:
                    this.writeToOutput("++");
                    this.emit(expression.operand);
                    break;
                case SyntaxKind.PreDecrementExpression:
                    this.writeToOutput("--");
                    this.emit(expression.operand);
                    break;
                default:
                    throw Errors.abstract();
            }

            this.recordSourceMappingEnd(expression);
        }

        public emitPostfixUnaryExpression(expression: PostfixUnaryExpressionSyntax): void {
            var nodeType = expression.kind();

            this.recordSourceMappingStart(expression);
            switch (nodeType) {
                case SyntaxKind.PostIncrementExpression:
                    this.emit(expression.operand);
                    this.writeToOutput("++");
                    break;
                case SyntaxKind.PostDecrementExpression:
                    this.emit(expression.operand);
                    this.writeToOutput("--");
                    break;
                default:
                    throw Errors.abstract();
            }

            this.recordSourceMappingEnd(expression);
        }

        public emitTypeOfExpression(expression: TypeOfExpressionSyntax): void {
            this.recordSourceMappingStart(expression);
            this.writeToOutput("typeof ");
            this.emit(expression.expression);
            this.recordSourceMappingEnd(expression);
        }

        public emitDeleteExpression(expression: DeleteExpressionSyntax): void {
            this.recordSourceMappingStart(expression);
            this.writeToOutput("delete ");
            this.emit(expression.expression);
            this.recordSourceMappingEnd(expression);
        }

        public emitVoidExpression(expression: VoidExpressionSyntax): void {
            this.recordSourceMappingStart(expression);
            this.writeToOutput("void ");
            this.emit(expression.expression);
            this.recordSourceMappingEnd(expression);
        }

        private canEmitDottedNameMemberAccessExpression(expression: MemberAccessExpressionSyntax) {
            var memberExpressionNodeType = expression.expression.kind();

            // If the memberAccess is of Name or another member access, we could potentially emit the symbol using the this memberAccessSymol
            if (memberExpressionNodeType == SyntaxKind.IdentifierName || memberExpressionNodeType == SyntaxKind.MemberAccessExpression) {
                var memberAccessSymbol = this.getSymbolForEmit(expression).symbol;
                var memberAccessExpressionSymbol = this.getSymbolForEmit(expression.expression).symbol;
                if (memberAccessSymbol && memberAccessExpressionSymbol // We have symbols resolved for this expression and access
                    && !this.semanticInfoChain.getAliasSymbolForAST(expression.expression) // The access is not off alias
                    && (PullHelpers.symbolIsModule(memberAccessExpressionSymbol) || memberAccessExpressionSymbol.kind === PullElementKind.Enum ||
                    memberAccessExpressionSymbol.anyDeclHasFlag(PullElementFlags.InitializedModule | PullElementFlags.Enum))) { // container is module

                    // If the memberAccess is in the context of the container, we could use the symbol to emit this expression
                    var memberAccessSymbolKind = memberAccessSymbol.kind;
                    if (memberAccessSymbolKind === PullElementKind.Property
                        || memberAccessSymbolKind === PullElementKind.EnumMember
                        || (memberAccessSymbol.anyDeclHasFlag(PullElementFlags.Exported) && memberAccessSymbolKind === PullElementKind.Variable && !memberAccessSymbol.anyDeclHasFlag(PullElementFlags.InitializedModule | PullElementFlags.Enum))
                        || ((memberAccessSymbol.anyDeclHasFlag(PullElementFlags.Exported) && !this.symbolIsUsedInItsEnclosingContainer(memberAccessSymbol)))) {

                        // If the expression is member access, we need to verify it as well
                        if (memberExpressionNodeType == SyntaxKind.MemberAccessExpression) {
                            return this.canEmitDottedNameMemberAccessExpression(<MemberAccessExpressionSyntax>expression.expression);
                        }

                        return true;
                    }
                }
            }

            return false;
        }

        // Emit the member access expression using the declPath
        private emitDottedNameMemberAccessExpressionWorker(expression: MemberAccessExpressionSyntax, potentialPath: PullDecl[], startingIndex: number, lastIndex: number) {
            this.recordSourceMappingStart(expression);
            if (expression.expression.kind() == SyntaxKind.MemberAccessExpression) {
                // Emit the dotted name access expression
                this.emitDottedNameMemberAccessExpressionRecurse(<MemberAccessExpressionSyntax>expression.expression, potentialPath, startingIndex, lastIndex - 1);
            } else { // Name
                this.emitComments(expression.expression, true);
                this.recordSourceMappingStart(expression.expression);

                // Emit the qualifying name fo the expression.expression
                this.emitDottedNameFromDeclPath(potentialPath, startingIndex, lastIndex - 2); // We would be emitting two identifiers as part of member access
                // Emit expression.expression
                this.writeToOutput((<ISyntaxToken>expression.expression).text());

                this.recordSourceMappingEnd(expression.expression);
                this.emitComments(expression.expression, false);
            }

            this.writeToOutput(".");
            this.emitName(expression.name, false);

            this.recordSourceMappingEnd(expression);
        }

        // Set the right indices for the recursive member access expression before emitting it using the decl path
        private emitDottedNameMemberAccessExpressionRecurse(expression: MemberAccessExpressionSyntax, potentialPath: PullDecl[], startingIndex: number, lastIndex: number) {
            this.emitComments(expression, true);

            if (lastIndex - startingIndex < 1) { // Member expression emits alteast two identifiers
                startingIndex = lastIndex - 1;
                Debug.assert(startingIndex >= 0);
            } 

            this.emitDottedNameMemberAccessExpressionWorker(expression, potentialPath, startingIndex, lastIndex);
            this.emitComments(expression, false);
        }

        private emitDottedNameMemberAccessExpression(expression: MemberAccessExpressionSyntax) {
            var memberAccessSymbol = this.getSymbolForEmit(expression).symbol;
            // Get the decl path info to emit this expression using declPath
            var potentialDeclInfo = this.getPotentialDeclPathInfoForEmit(memberAccessSymbol);
            this.emitDottedNameMemberAccessExpressionWorker(expression, potentialDeclInfo.potentialPath, potentialDeclInfo.startingIndex, potentialDeclInfo.potentialPath.length);
        }

        public emitMemberAccessExpression(expression: MemberAccessExpressionSyntax): void {
            if (!this.tryEmitConstant(expression)) {
                // If the expression is dotted name of the modules, emit it using decl path so the name could be resolved correctly.
                if (this.canEmitDottedNameMemberAccessExpression(expression)) {
                    this.emitDottedNameMemberAccessExpression(expression);
                } else {
                    this.recordSourceMappingStart(expression);
                    this.emit(expression.expression);
                    this.writeToOutput(".");
                    this.emitName(expression.name, false);
                    this.recordSourceMappingEnd(expression);
                }
            }
        }

        public emitQualifiedName(name: QualifiedNameSyntax): void {
            this.recordSourceMappingStart(name);

            this.emit(name.left);
            this.writeToOutput(".");
            this.emitName(name.right, false);

            this.recordSourceMappingEnd(name);
        }

        public emitBinaryExpression(expression: BinaryExpressionSyntax): void {
            this.recordSourceMappingStart(expression);
            switch (expression.kind()) {
                case SyntaxKind.CommaExpression:
                    this.emit(expression.left);
                    this.writeToOutput(", ");
                    this.emit(expression.right);
                    break;
                default:
                    {
                        this.emit(expression.left);
                        var binOp = SyntaxFacts.getText(SyntaxFacts.getOperatorTokenFromBinaryExpression(expression.kind()));
                        if (binOp === "instanceof") {
                            this.writeToOutput(" instanceof ");
                        }
                        else if (binOp === "in") {
                            this.writeToOutput(" in ");
                        }
                        else {
                            this.writeToOutput(" " + binOp + " ");
                        }
                        this.emit(expression.right);
                    }
            }
            this.recordSourceMappingEnd(expression);
        }

        public emitSimplePropertyAssignment(property: SimplePropertyAssignmentSyntax): void {
            this.recordSourceMappingStart(property);
            this.emit(property.propertyName);

            this.writeToOutput(": ");
            this.emitCommentsArray(convertTokenTrailingComments(property.colonToken), /*trailing:*/ true, /*noLeadingSpace:*/ true);

            this.emit(property.expression);
            this.recordSourceMappingEnd(property);
        }

        public emitFunctionPropertyAssignment(funcProp: FunctionPropertyAssignmentSyntax): void {
            this.recordSourceMappingStart(funcProp);

            this.emit(funcProp.propertyName);
            this.writeToOutput(": ");

            var pullFunctionDecl = this.semanticInfoChain.getDeclForAST(funcProp);

            var savedInArrowFunction = this.inArrowFunction;
            this.inArrowFunction = false;

            var temp = this.setContainer(EmitContainer.Function);
            var funcName = funcProp.propertyName;

            var pullDecl = this.semanticInfoChain.getDeclForAST(funcProp);
            this.pushDecl(pullDecl);

            this.recordSourceMappingStart(funcProp);
            this.writeToOutput("function ");

            //this.recordSourceMappingStart(funcProp.propertyName);
            //this.writeToOutput(funcProp.propertyName.actualText);
            //this.recordSourceMappingEnd(funcProp.propertyName);

            this.writeToOutput("(");

            var parameters = Parameters.fromParameterList(funcProp.callSignature.parameterList);
            this.emitFunctionParameters(parameters);
            this.writeToOutput(")");

            this.emitFunctionBodyStatements(funcProp.propertyName.text(), funcProp, parameters, funcProp.block, /*bodyExpression:*/ null);

            this.recordSourceMappingEnd(funcProp);

            // The extra call is to make sure the caller's funcDecl end is recorded, since caller wont be able to record it
            this.recordSourceMappingEnd(funcProp);

            this.emitComments(funcProp, false);

            this.popDecl(pullDecl);

            this.setContainer(temp);
            this.inArrowFunction = savedInArrowFunction;

            this.recordSourceMappingEnd(funcProp);
        }

        public emitConditionalExpression(expression: ConditionalExpressionSyntax): void {
            this.emit(expression.condition);
            this.writeToOutput(" ? ");
            this.emit(expression.whenTrue);
            this.writeToOutput(" : ");
            this.emit(expression.whenFalse);
        }

        public emitThrowStatement(statement: ThrowStatementSyntax): void {
            this.recordSourceMappingStart(statement);
            this.writeToOutput("throw ");
            this.emit(statement.expression);
            this.recordSourceMappingEnd(statement);
            this.writeToOutput(";");
        }

        public emitExpressionStatement(statement: ExpressionStatementSyntax): void {
            var isArrowExpression = statement.expression.kind() === SyntaxKind.SimpleArrowFunctionExpression || statement.expression.kind() === SyntaxKind.ParenthesizedArrowFunctionExpression;

            this.recordSourceMappingStart(statement);
            if (isArrowExpression) {
                this.writeToOutput("(");
            }

            this.emit(statement.expression);

            if (isArrowExpression) {
                this.writeToOutput(")");
            }

            this.recordSourceMappingEnd(statement);
            this.writeToOutput(";");
        }

        public emitLabeledStatement(statement: LabeledStatementSyntax): void {
            this.writeToOutputWithSourceMapRecord(statement.identifier.text(), statement.identifier);
            this.writeLineToOutput(":");
            this.emitJavascript(statement.statement, /*startLine:*/ true);
        }

        public emitBlock(block: BlockSyntax): void {
            this.recordSourceMappingStart(block);
            this.writeLineToOutput(" {");
            this.indenter.increaseIndent();
            if (block.statements) {
                this.emitList(block.statements);
            }
            this.emitCommentsArray(convertTokenLeadingComments(block.closeBraceToken), /*trailing:*/ false);
            this.indenter.decreaseIndent();
            this.emitIndent();
            this.writeToOutput("}");
            this.recordSourceMappingEnd(block);
        }

        public emitBreakStatement(jump: BreakStatementSyntax): void {
            this.recordSourceMappingStart(jump);
            this.writeToOutput("break");

            if (jump.identifier) {
                this.writeToOutput(" " + jump.identifier.text());
            }

            this.recordSourceMappingEnd(jump);
            this.writeToOutput(";");
        }

        public emitContinueStatement(jump: ContinueStatementSyntax): void {
            this.recordSourceMappingStart(jump);
            this.writeToOutput("continue");

            if (jump.identifier) {
                this.writeToOutput(" " + jump.identifier.text());
            }

            this.recordSourceMappingEnd(jump);
            this.writeToOutput(";");
        }

        public emitWhileStatement(statement: WhileStatementSyntax): void {
            this.recordSourceMappingStart(statement);
            this.writeToOutput("while (");
            this.emit(statement.condition);
            this.writeToOutput(")");
            this.emitBlockOrStatement(statement.statement);
            this.recordSourceMappingEnd(statement);
        }

        public emitDoStatement(statement: DoStatementSyntax): void {
            this.recordSourceMappingStart(statement);
            this.writeToOutput("do");
            this.emitBlockOrStatement(statement.statement);
            this.writeToOutputWithSourceMapRecord(" while", statement.whileKeyword);
            this.writeToOutput('(');
            this.emit(statement.condition);
            this.writeToOutput(")");
            this.recordSourceMappingEnd(statement);
            this.writeToOutput(";");
        }

        public emitIfStatement(statement: IfStatementSyntax): void {
            this.recordSourceMappingStart(statement);
            this.writeToOutput("if (");
            this.emit(statement.condition);
            this.writeToOutput(")");

            this.emitBlockOrStatement(statement.statement);

            if (statement.elseClause) {
                if (statement.statement.kind() !== SyntaxKind.Block) {
                    this.writeLineToOutput("");
                    this.emitIndent();
                }
                else {
                    this.writeToOutput(" ");
                }

                this.emit(statement.elseClause);
            }
            this.recordSourceMappingEnd(statement);
        }

        public emitElseClause(elseClause: ElseClauseSyntax): void {
            if (elseClause.statement.kind() === SyntaxKind.IfStatement) {
                this.writeToOutput("else ");
                this.emit(elseClause.statement);
            }
            else {
                this.writeToOutput("else");
                this.emitBlockOrStatement(elseClause.statement);
            }
        }

        public emitReturnStatement(statement: ReturnStatementSyntax): void {
            this.recordSourceMappingStart(statement);
            if (statement.expression) {
                this.writeToOutput("return ");
                this.emit(statement.expression);
            }
            else {
                this.writeToOutput("return");
            }
            this.recordSourceMappingEnd(statement);
            this.writeToOutput(";");
        }

        public emitForInStatement(statement: ForInStatementSyntax): void {
            this.recordSourceMappingStart(statement);
            this.writeToOutput("for (");
            if (statement.left) {
                this.emit(statement.left);
            }
            else {
                this.emit(statement.variableDeclaration);
            }
            this.writeToOutput(" in ");
            this.emit(statement.expression);
            this.writeToOutput(")");
            this.emitBlockOrStatement(statement.statement);
            this.recordSourceMappingEnd(statement);
        }

        public emitForStatement(statement: ForStatementSyntax): void {
            this.recordSourceMappingStart(statement);
            this.writeToOutput("for (");
            if (statement.variableDeclaration) {
                this.emit(statement.variableDeclaration);
            }
            else if (statement.initializer) {
                this.emit(statement.initializer);
            }

            this.writeToOutput("; ");
            this.emitJavascript(statement.condition, false);
            this.writeToOutput(";");
            if (statement.incrementor) {
                this.writeToOutput(" ");
                this.emitJavascript(statement.incrementor, false);
            }
            this.writeToOutput(")");
            this.emitBlockOrStatement(statement.statement);
            this.recordSourceMappingEnd(statement);
        }

        public emitWithStatement(statement: WithStatementSyntax): void {
            this.recordSourceMappingStart(statement);
            this.writeToOutput("with (");
            if (statement.condition) {
                this.emit(statement.condition);
            }

            this.writeToOutput(")");
            var prevInWithBlock = this.inWithBlock;
            this.inWithBlock = true;
            this.emitBlockOrStatement(statement.statement);
            this.inWithBlock = prevInWithBlock;
            this.recordSourceMappingEnd(statement);
        }

        public emitSwitchStatement(statement: SwitchStatementSyntax): void {
            this.recordSourceMappingStart(statement);
            this.writeToOutput("switch (");
            this.emit(statement.expression);
            this.recordSourceMappingStart(statement.closeParenToken);
            this.writeToOutput(")");
            this.recordSourceMappingEnd(statement.closeParenToken);
            this.writeLineToOutput(" {");
            this.indenter.increaseIndent();
            this.emitList(statement.switchClauses, /*useNewLineSeparator:*/ false);
            this.indenter.decreaseIndent();
            this.emitIndent();
            this.writeToOutput("}");
            this.recordSourceMappingEnd(statement);
        }

        public emitCaseSwitchClause(clause: CaseSwitchClauseSyntax): void {
            this.recordSourceMappingStart(clause);
            this.writeToOutput("case ");
            this.emit(clause.expression);
            this.writeToOutput(":");

            this.emitSwitchClauseBody(clause.statements);
            this.recordSourceMappingEnd(clause);
        }

        private emitSwitchClauseBody(body: ISyntaxList): void {
            if (body.childCount() === 1 && body.childAt(0).kind() === SyntaxKind.Block) {
                // The case statement was written with curly braces, so emit it with the appropriate formatting
                this.emit(body.childAt(0));
                this.writeLineToOutput("");
            }
            else {
                // No curly braces. Format in the expected way
                this.writeLineToOutput("");
                this.indenter.increaseIndent();
                this.emit(body);
                this.indenter.decreaseIndent();
            }
        }

        public emitDefaultSwitchClause(clause: DefaultSwitchClauseSyntax): void {
            this.recordSourceMappingStart(clause);
            this.writeToOutput("default:");

            this.emitSwitchClauseBody(clause.statements);
            this.recordSourceMappingEnd(clause);
        }

        public emitTryStatement(statement: TryStatementSyntax): void {
            this.recordSourceMappingStart(statement);
            this.writeToOutput("try ");
            this.emit(statement.block);
            this.emitJavascript(statement.catchClause, false);

            if (statement.finallyClause) {
                this.emit(statement.finallyClause);
            }
            this.recordSourceMappingEnd(statement);
        }

        public emitCatchClause(clause: CatchClauseSyntax): void {
            this.writeToOutput(" ");
            this.recordSourceMappingStart(clause);
            this.writeToOutput("catch (");
            this.emit(clause.identifier);
            this.writeToOutput(")");
            this.emit(clause.block);
            this.recordSourceMappingEnd(clause);
        }

        public emitFinallyClause(clause: FinallyClauseSyntax): void {
            this.writeToOutput(" finally");
            this.emit(clause.block);
        }

        public emitDebuggerStatement(statement: DebuggerStatementSyntax): void {
            this.writeToOutputWithSourceMapRecord("debugger", statement);
            this.writeToOutput(";");
        }

        public emitNumericLiteral(literal: ISyntaxToken): void {
            this.writeToOutputWithSourceMapRecord(literal.text(), literal);
        }

        public emitRegularExpressionLiteral(literal: ISyntaxToken): void {
            this.writeToOutputWithSourceMapRecord(literal.text(), literal);
        }

        public emitStringLiteral(literal: ISyntaxToken): void {
            this.writeToOutputWithSourceMapRecord(literal.text(), literal);
        }

        public emitEqualsValueClause(clause: EqualsValueClauseSyntax): void {
            this.writeToOutput(" = ");
            this.emitCommentsArray(convertTokenTrailingComments(clause.equalsToken), /*trailing:*/ true, /*noLeadingSpace:*/ true);

            this.emit(clause.value);
        }

        private emitParameter(parameter: ParameterSyntax): void {
            this.writeToOutputWithSourceMapRecord(parameter.identifier.text(), parameter);
        }

        public emitConstructorDeclaration(declaration: ConstructorDeclarationSyntax): void {
            if (declaration.block) {
                this.emitConstructor(declaration);
            }
            else {
                this.emitComments(declaration, /*pre:*/ true, /*onlyPinnedOrTripleSlashComments:*/ true);
            }
        }

        public shouldEmitFunctionDeclaration(declaration: FunctionDeclarationSyntax): boolean {
            return preComments(declaration) !== null || (!hasModifier(declaration.modifiers, PullElementFlags.Ambient) && declaration.block !== null);
        }

        public emitFunctionDeclaration(declaration: FunctionDeclarationSyntax): void {
            if (!hasModifier(declaration.modifiers, PullElementFlags.Ambient) && declaration.block !== null) {
                this.emitFunction(declaration);
            }
            else {
                this.emitComments(declaration, /*pre:*/ true, /*onlyPinnedOrTripleSlashComments:*/ true);
            }
        }

        private emitSourceUnit(sourceUnit: SourceUnitSyntax): void {
            if (!this.document.isDeclareFile()) {
                var pullDecl = this.semanticInfoChain.getDeclForAST(sourceUnit);
                this.pushDecl(pullDecl);
                this.emitScriptElements(sourceUnit);
                this.popDecl(pullDecl);
            }
        }

        public shouldEmitEnumDeclaration(declaration: EnumDeclarationSyntax): boolean {
            return preComments(declaration) !== null || ! enumIsElided(declaration);
        }

        public emitEnumDeclaration(declaration: EnumDeclarationSyntax): void {
            if (!enumIsElided(declaration)) {
                this.emitComments(declaration, true);
                this.emitEnum(declaration);
                this.emitComments(declaration, false);
            }
            else {
                this.emitComments(declaration, true, /*onlyPinnedOrTripleSlashComments:*/ true);
            }
        }

        public shouldEmitModuleDeclaration(declaration: ModuleDeclarationSyntax): boolean {
            return preComments(declaration) !== null || !moduleIsElided(declaration);
        }

        private emitModuleDeclaration(declaration: ModuleDeclarationSyntax): void {
            if (!moduleIsElided(declaration)) {
                this.emitModuleDeclarationWorker(declaration);
            }
            else {
                this.emitComments(declaration, true, /*onlyPinnedOrTripleSlashComments:*/ true);
            }
        }

        public shouldEmitClassDeclaration(declaration: ClassDeclarationSyntax): boolean {
            return preComments(declaration) !== null || !hasModifier(declaration.modifiers, PullElementFlags.Ambient);
        }

        public emitClassDeclaration(declaration: ClassDeclarationSyntax): void {
            if (!hasModifier(declaration.modifiers, PullElementFlags.Ambient)) {
                this.emitClass(declaration);
            }
            else {
                this.emitComments(declaration, /*pre:*/ true, /*onlyPinnedOrTripleSlashComments:*/ true);
            }
        }

        public shouldEmitInterfaceDeclaration(declaration: InterfaceDeclarationSyntax): boolean {
            return preComments(declaration) !== null;
        }

        public emitInterfaceDeclaration(declaration: InterfaceDeclarationSyntax): void {
            this.emitComments(declaration, /*pre:*/ true, /*onlyPinnedOrTripleSlashComments:*/ true);
        }

        private firstVariableDeclarator(statement: VariableStatementSyntax): VariableDeclaratorSyntax {
            return <VariableDeclaratorSyntax>statement.variableDeclaration.variableDeclarators.nonSeparatorAt(0);
        }

        private isNotAmbientOrHasInitializer(variableStatement: VariableStatementSyntax): boolean {
            return !hasModifier(variableStatement.modifiers, PullElementFlags.Ambient) || this.firstVariableDeclarator(variableStatement).equalsValueClause !== null;
        }

        public shouldEmitVariableStatement(statement: VariableStatementSyntax): boolean {
            return preComments(statement) !== null || this.isNotAmbientOrHasInitializer(statement);
        }

        public emitVariableStatement(statement: VariableStatementSyntax): void {
            if (this.isNotAmbientOrHasInitializer(statement)) {
                this.emitComments(statement, true);
                this.emit(statement.variableDeclaration);
                this.writeToOutput(";");
                this.emitComments(statement, false);
            }
            else {
                this.emitComments(statement, /*pre:*/ true, /*onlyPinnedOrTripleSlashComments:*/ true);
            }
        }

        public emitGenericType(type: GenericTypeSyntax): void {
            this.emit(type.name);
        }

        private shouldEmit(ast: ISyntaxElement): boolean {
            if (!ast) {
                return false;
            }

            switch (ast.kind()) {
                case SyntaxKind.ImportDeclaration:
                    return this.shouldEmitImportDeclaration(<ImportDeclarationSyntax>ast);
                case SyntaxKind.ClassDeclaration:
                    return this.shouldEmitClassDeclaration(<ClassDeclarationSyntax>ast);
                case SyntaxKind.InterfaceDeclaration:
                    return this.shouldEmitInterfaceDeclaration(<InterfaceDeclarationSyntax>ast);
                case SyntaxKind.FunctionDeclaration:
                    return this.shouldEmitFunctionDeclaration(<FunctionDeclarationSyntax>ast);
                case SyntaxKind.ModuleDeclaration:
                    return this.shouldEmitModuleDeclaration(<ModuleDeclarationSyntax>ast);
                case SyntaxKind.VariableStatement:
                    return this.shouldEmitVariableStatement(<VariableStatementSyntax>ast);
                case SyntaxKind.OmittedExpression:
                    return false;
                case SyntaxKind.EnumDeclaration:
                    return this.shouldEmitEnumDeclaration(<EnumDeclarationSyntax>ast);
            }

            return true;
        }

        private emit(ast: ISyntaxElement): void {
            if (!ast) {
                return;
            }

            switch (ast.kind()) {
                case SyntaxKind.SeparatedList:
                    return this.emitSeparatedList(<ISeparatedSyntaxList>ast);
                case SyntaxKind.List:
                    return this.emitList(<ISyntaxList>ast);
                case SyntaxKind.SourceUnit:
                    return this.emitSourceUnit(<SourceUnitSyntax>ast);
                case SyntaxKind.ImportDeclaration:
                    return this.emitImportDeclaration(<ImportDeclarationSyntax>ast);
                case SyntaxKind.ExportAssignment:
                    return this.setExportAssignmentIdentifier((<ExportAssignmentSyntax>ast).identifier.text());
                case SyntaxKind.ClassDeclaration:
                    return this.emitClassDeclaration(<ClassDeclarationSyntax>ast);
                case SyntaxKind.InterfaceDeclaration:
                    return this.emitInterfaceDeclaration(<InterfaceDeclarationSyntax>ast);
                case SyntaxKind.IdentifierName:
                    return this.emitName(<ISyntaxToken>ast, true);
                case SyntaxKind.VariableDeclarator:
                    return this.emitVariableDeclarator(<VariableDeclaratorSyntax>ast);
                case SyntaxKind.SimpleArrowFunctionExpression:
                    return this.emitSimpleArrowFunctionExpression(<SimpleArrowFunctionExpressionSyntax>ast);
                case SyntaxKind.ParenthesizedArrowFunctionExpression:
                    return this.emitParenthesizedArrowFunctionExpression(<ParenthesizedArrowFunctionExpressionSyntax>ast);
                case SyntaxKind.FunctionDeclaration:
                    return this.emitFunctionDeclaration(<FunctionDeclarationSyntax>ast);
                case SyntaxKind.ModuleDeclaration:
                    return this.emitModuleDeclaration(<ModuleDeclarationSyntax>ast);
                case SyntaxKind.VariableDeclaration:
                    return this.emitVariableDeclaration(<VariableDeclarationSyntax>ast);
                case SyntaxKind.GenericType:
                    return this.emitGenericType(<GenericTypeSyntax>ast);
                case SyntaxKind.ConstructorDeclaration:
                    return this.emitConstructorDeclaration(<ConstructorDeclarationSyntax>ast);
                case SyntaxKind.EnumDeclaration:
                    return this.emitEnumDeclaration(<EnumDeclarationSyntax>ast);
                case SyntaxKind.EnumElement:
                    return this.emitEnumElement(<EnumElementSyntax>ast);
                case SyntaxKind.FunctionExpression:
                    return this.emitFunctionExpression(<FunctionExpressionSyntax>ast);
                case SyntaxKind.VariableStatement:
                    return this.emitVariableStatement(<VariableStatementSyntax>ast);
            }

            this.emitComments(ast, true);
            this.emitWorker(ast);
            this.emitComments(ast, false);
        }

        private emitWorker(ast: ISyntaxElement): void {
            if (!ast) {
                return;
            }

            switch (ast.kind()) {
                case SyntaxKind.NumericLiteral:
                    return this.emitNumericLiteral(<ISyntaxToken>ast);
                case SyntaxKind.RegularExpressionLiteral:
                    return this.emitRegularExpressionLiteral(<ISyntaxToken>ast);
                case SyntaxKind.StringLiteral:
                    return this.emitStringLiteral(<ISyntaxToken>ast);
                case SyntaxKind.FalseKeyword:
                case SyntaxKind.NullKeyword:
                case SyntaxKind.TrueKeyword:
                    return this.emitLiteralExpression(<ISyntaxToken>ast);
                case SyntaxKind.ThisKeyword:
                    return this.emitThisExpression(<ISyntaxToken>ast);
                case SyntaxKind.SuperKeyword:
                    return this.emitSuperExpression(<ISyntaxToken>ast);
                case SyntaxKind.ParenthesizedExpression:
                    return this.emitParenthesizedExpression(<ParenthesizedExpressionSyntax>ast);
                case SyntaxKind.ArrayLiteralExpression:
                    return this.emitArrayLiteralExpression(<ArrayLiteralExpressionSyntax>ast);
                case SyntaxKind.PostDecrementExpression:
                case SyntaxKind.PostIncrementExpression:
                    return this.emitPostfixUnaryExpression(<PostfixUnaryExpressionSyntax>ast);
                case SyntaxKind.LogicalNotExpression:
                case SyntaxKind.BitwiseNotExpression:
                case SyntaxKind.NegateExpression:
                case SyntaxKind.PlusExpression:
                case SyntaxKind.PreIncrementExpression:
                case SyntaxKind.PreDecrementExpression:
                    return this.emitPrefixUnaryExpression(<PrefixUnaryExpressionSyntax>ast);
                case SyntaxKind.InvocationExpression:
                    return this.emitInvocationExpression(<InvocationExpressionSyntax>ast);
                case SyntaxKind.ElementAccessExpression:
                    return this.emitElementAccessExpression(<ElementAccessExpressionSyntax>ast);
                case SyntaxKind.MemberAccessExpression:
                    return this.emitMemberAccessExpression(<MemberAccessExpressionSyntax>ast);
                case SyntaxKind.QualifiedName:
                    return this.emitQualifiedName(<QualifiedNameSyntax>ast);
                case SyntaxKind.CommaExpression: 
                case SyntaxKind.AssignmentExpression: 
                case SyntaxKind.AddAssignmentExpression: 
                case SyntaxKind.SubtractAssignmentExpression: 
                case SyntaxKind.MultiplyAssignmentExpression: 
                case SyntaxKind.DivideAssignmentExpression: 
                case SyntaxKind.ModuloAssignmentExpression: 
                case SyntaxKind.AndAssignmentExpression: 
                case SyntaxKind.ExclusiveOrAssignmentExpression: 
                case SyntaxKind.OrAssignmentExpression: 
                case SyntaxKind.LeftShiftAssignmentExpression: 
                case SyntaxKind.SignedRightShiftAssignmentExpression: 
                case SyntaxKind.UnsignedRightShiftAssignmentExpression: 
                case SyntaxKind.LogicalOrExpression: 
                case SyntaxKind.LogicalAndExpression: 
                case SyntaxKind.BitwiseOrExpression: 
                case SyntaxKind.BitwiseExclusiveOrExpression: 
                case SyntaxKind.BitwiseAndExpression: 
                case SyntaxKind.EqualsWithTypeConversionExpression: 
                case SyntaxKind.NotEqualsWithTypeConversionExpression: 
                case SyntaxKind.EqualsExpression: 
                case SyntaxKind.NotEqualsExpression: 
                case SyntaxKind.LessThanExpression: 
                case SyntaxKind.GreaterThanExpression: 
                case SyntaxKind.LessThanOrEqualExpression: 
                case SyntaxKind.GreaterThanOrEqualExpression: 
                case SyntaxKind.InstanceOfExpression: 
                case SyntaxKind.InExpression: 
                case SyntaxKind.LeftShiftExpression: 
                case SyntaxKind.SignedRightShiftExpression: 
                case SyntaxKind.UnsignedRightShiftExpression: 
                case SyntaxKind.MultiplyExpression: 
                case SyntaxKind.DivideExpression: 
                case SyntaxKind.ModuloExpression: 
                case SyntaxKind.AddExpression: 
                case SyntaxKind.SubtractExpression:
                    return this.emitBinaryExpression(<BinaryExpressionSyntax>ast);
                case SyntaxKind.ConditionalExpression:
                    return this.emitConditionalExpression(<ConditionalExpressionSyntax>ast);
                case SyntaxKind.EqualsValueClause:
                    return this.emitEqualsValueClause(<EqualsValueClauseSyntax>ast);
                case SyntaxKind.Parameter:
                    return this.emitParameter(<ParameterSyntax>ast);
                case SyntaxKind.Block:
                    return this.emitBlock(<BlockSyntax>ast);
                case SyntaxKind.ElseClause:
                    return this.emitElseClause(<ElseClauseSyntax>ast);
                case SyntaxKind.IfStatement:
                    return this.emitIfStatement(<IfStatementSyntax>ast);
                case SyntaxKind.ExpressionStatement:
                    return this.emitExpressionStatement(<ExpressionStatementSyntax>ast);
                case SyntaxKind.GetAccessor:
                    return this.emitGetAccessor(<GetAccessorSyntax>ast);
                case SyntaxKind.SetAccessor:
                    return this.emitSetAccessor(<SetAccessorSyntax>ast);
                case SyntaxKind.ThrowStatement:
                    return this.emitThrowStatement(<ThrowStatementSyntax>ast);
                case SyntaxKind.ReturnStatement:
                    return this.emitReturnStatement(<ReturnStatementSyntax>ast);
                case SyntaxKind.ObjectCreationExpression:
                    return this.emitObjectCreationExpression(<ObjectCreationExpressionSyntax>ast);
                case SyntaxKind.SwitchStatement:
                    return this.emitSwitchStatement(<SwitchStatementSyntax>ast);
                case SyntaxKind.CaseSwitchClause:
                    return this.emitCaseSwitchClause(<CaseSwitchClauseSyntax>ast);
                case SyntaxKind.DefaultSwitchClause:
                    return this.emitDefaultSwitchClause(<DefaultSwitchClauseSyntax>ast);
                case SyntaxKind.BreakStatement:
                    return this.emitBreakStatement(<BreakStatementSyntax>ast);
                case SyntaxKind.ContinueStatement:
                    return this.emitContinueStatement(<ContinueStatementSyntax>ast);
                case SyntaxKind.ForStatement:
                    return this.emitForStatement(<ForStatementSyntax>ast);
                case SyntaxKind.ForInStatement:
                    return this.emitForInStatement(<ForInStatementSyntax>ast);
                case SyntaxKind.WhileStatement:
                    return this.emitWhileStatement(<WhileStatementSyntax>ast);
                case SyntaxKind.WithStatement:
                    return this.emitWithStatement(<WithStatementSyntax>ast);
                case SyntaxKind.CastExpression:
                    return this.emitCastExpression(<CastExpressionSyntax>ast);
                case SyntaxKind.ObjectLiteralExpression:
                    return this.emitObjectLiteralExpression(<ObjectLiteralExpressionSyntax>ast);
                case SyntaxKind.SimplePropertyAssignment:
                    return this.emitSimplePropertyAssignment(<SimplePropertyAssignmentSyntax>ast);
                case SyntaxKind.FunctionPropertyAssignment:
                    return this.emitFunctionPropertyAssignment(<FunctionPropertyAssignmentSyntax>ast);
                case SyntaxKind.EmptyStatement:
                    return this.writeToOutputWithSourceMapRecord(";", ast);
                case SyntaxKind.TryStatement:
                    return this.emitTryStatement(<TryStatementSyntax>ast);
                case SyntaxKind.CatchClause:
                    return this.emitCatchClause(<CatchClauseSyntax>ast);
                case SyntaxKind.FinallyClause:
                    return this.emitFinallyClause(<FinallyClauseSyntax>ast);
                case SyntaxKind.LabeledStatement:
                    return this.emitLabeledStatement(<LabeledStatementSyntax>ast);
                case SyntaxKind.DoStatement:
                    return this.emitDoStatement(<DoStatementSyntax>ast);
                case SyntaxKind.TypeOfExpression:
                    return this.emitTypeOfExpression(<TypeOfExpressionSyntax>ast);
                case SyntaxKind.DeleteExpression:
                    return this.emitDeleteExpression(<DeleteExpressionSyntax>ast);
                case SyntaxKind.VoidExpression:
                    return this.emitVoidExpression(<VoidExpressionSyntax>ast);
                case SyntaxKind.DebuggerStatement:
                    return this.emitDebuggerStatement(<DebuggerStatementSyntax>ast);
            }
        }
    }

    export function getLastConstructor(classDecl: ClassDeclarationSyntax): ConstructorDeclarationSyntax {
        return <ConstructorDeclarationSyntax>classDecl.classElements.lastOrDefault(e => e.kind() === SyntaxKind.ConstructorDeclaration);
    }

    export function getTrimmedTextLines(comment: Comment): string[] {
        if (comment.kind() === SyntaxKind.MultiLineCommentTrivia) {
            return comment.fullText().split("\n").map(s => s.trim());
        }
        else {
            return [comment.fullText().trim()];
        }
    }
}