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
                var script = document.script();

                if (!script.isDeclareFile()) {
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

    export function lastParameterIsRest(parameters: ASTList): boolean {
        return parameters.members.length > 0 && ArrayUtilities.last(<Parameter[]>parameters.members).isRest;
    }

    export class Emitter {
        public globalThisCapturePrologueEmitted = false;
        public extendsPrologueEmitted = false;
        public thisClassNode: ClassDeclaration = null;
        public inArrowFunction: boolean = false;
        public moduleName = "";
        public emitState = new EmitState();
        public indenter = new Indenter();
        public sourceMapper: SourceMapper = null;
        public captureThisStmtString = "var _this = this;";
        private currentVariableDeclaration: VariableDeclaration;
        private declStack: PullDecl[] = [];
        private resolvingContext = new PullTypeResolutionContext(null);
        private exportAssignmentIdentifier: string = null;
        private inWithBlock = false;

        public document: Document = null;
        private copyrightElement: AST = null;

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

        public shouldEmitImportDeclaration(importDeclAST: ImportDeclaration) {
            var isExternalModuleReference = importDeclAST.isExternalImportDeclaration();
            var importDecl = this.semanticInfoChain.getDeclForAST(importDeclAST);
            var isExported = hasFlag(importDecl.flags, PullElementFlags.Exported);
            var isAmdCodeGen = this.emitOptions.compilationSettings().moduleGenTarget() == ModuleGenTarget.Asynchronous;

            if (!isExternalModuleReference || // Any internal reference needs to check if the emit can happen
                isExported || // External module reference with export modifier always needs to be emitted
                !isAmdCodeGen) {// commonjs needs the var declaration for the import declaration
                var importSymbol = <PullTypeAliasSymbol>importDecl.getSymbol();
                if (!importDeclAST.isExternalImportDeclaration()) {
                    if (importSymbol.getExportAssignedValueSymbol()) {
                        return true;
                    }
                    var containerSymbol = importSymbol.getExportAssignedContainerSymbol();
                    if (containerSymbol && containerSymbol.getInstanceSymbol()) {
                        return true;
                    }
                }

                return importSymbol.isUsedAsValue();
            }

            return false;
        }

        public emitImportDeclaration(importDeclAST: ImportDeclaration) {
            var isExternalModuleReference = importDeclAST.isExternalImportDeclaration();
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
                var aliasAST = importDeclAST.moduleReference.nodeType() === NodeType.TypeRef ? (<TypeReference>importDeclAST.moduleReference).term : importDeclAST.moduleReference;

                if (isExternalModuleReference) {
                    this.writeToOutput("require(" + (<Identifier>aliasAST).text() + ")");
                } else {
                    this.emitJavascript(aliasAST, false);
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
            var lineNumbers = TextUtilities.parseLineStarts(TextFactory.createText(s));
            if (lineNumbers.length > 1) {
                // There are new lines in the string, update the line and column number accordingly
                this.emitState.line += lineNumbers.length - 1;
                this.emitState.column = s.length - lineNumbers[lineNumbers.length - 1];
            } else {
                // No new lines in the string
                this.emitState.column += s.length;
            }
        }

        public writeToOutputWithSourceMapRecord(s: string, astSpan: IASTSpan) {
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

        public writeCaptureThisStatement(ast: AST) {
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

        public emitComment(comment: Comment, trailing: boolean, first: boolean) {
            if (this.emitOptions.compilationSettings().removeComments()) {
                return;
            }

            var text = comment.getText();
            var emitColumn = this.emitState.column;

            if (emitColumn === 0) {
                this.emitIndent();
            }
            else if (trailing && first) {
                this.writeToOutput(" ");
            }

            if (comment.isBlockComment) {
                this.recordSourceMappingStart(comment);
                this.writeToOutput(text[0]);

                if (text.length > 1 || comment.endsLine) {
                    for (var i = 1; i < text.length; i++) {
                        this.writeLineToOutput("");
                        this.emitIndent();
                        this.writeToOutput(text[i]);
                    }
                    this.recordSourceMappingEnd(comment);
                    this.writeLineToOutput("");
                    // Fall through
                } else {
                    this.recordSourceMappingEnd(comment);
                    this.writeToOutput(" ");
                    return;
                }
            }
            else {
                this.recordSourceMappingStart(comment);
                this.writeToOutput(text[0]);
                this.recordSourceMappingEnd(comment);
                this.writeLineToOutput("");
                // Fall through
            }

            if (!trailing && emitColumn != 0) {
                // If we were indented before, stay indented after.
                this.emitIndent();
            }
        }

        public emitComments(ast: AST, pre: boolean, onlyPinnedOrTripleSlashComments: boolean = false) {
            if (pre) {
                var preComments = ast.preComments();

                if (preComments && ast === this.copyrightElement) {
                    // We're emitting the comments for the first script element.  Skip any 
                    // copyright comments, as we'll already have emitted those.
                    var copyrightComments = this.getCopyrightComments();
                    preComments = preComments.slice(copyrightComments.length);
                }

                // We're emitting comments on an elided element.  Only keep the comment if it is
                // a triple slash or pinned comment.
                if (onlyPinnedOrTripleSlashComments) {
                    preComments = ArrayUtilities.where(preComments, c => c.isPinnedOrTripleSlash());
                }

                this.emitCommentsArray(preComments, /*trailing:*/ false);
            }
            else {
                this.emitCommentsArray(ast.postComments(), /*trailing:*/ true);
            }
        }

        public emitCommentsArray(comments: Comment[], trailing: boolean): void {
            if (!this.emitOptions.compilationSettings().removeComments() && comments) {
                for (var i = 0, n = comments.length; i < n; i++) {
                    this.emitComment(comments[i], trailing, /*first:*/ i === 0);
                }
            }
        }

        public emitObjectLiteralExpression(objectLiteral: ObjectLiteralExpression) {
            var useNewLines = !hasFlag(objectLiteral.getFlags(), ASTFlags.SingleLine);

            this.recordSourceMappingStart(objectLiteral);

            this.writeToOutput("{");
            var list = objectLiteral.propertyAssignments;
            if (list.members.length > 0) {
                if (useNewLines) {
                    this.writeLineToOutput("");
                }
                else {
                    this.writeToOutput(" ");
                }

                this.indenter.increaseIndent();
                this.emitCommaSeparatedList(list, useNewLines);
                this.indenter.decreaseIndent();
                if (useNewLines) {
                    this.emitIndent();
                }
                else {
                    this.writeToOutput(" ");
                }
            }
            this.writeToOutput("}");

            this.recordSourceMappingEnd(objectLiteral);
        }

        public emitArrayLiteralExpression(arrayLiteral: ArrayLiteralExpression) {
            var useNewLines = !hasFlag(arrayLiteral.getFlags(), ASTFlags.SingleLine);

            this.recordSourceMappingStart(arrayLiteral);

            this.writeToOutput("[");
            var list = arrayLiteral.expressions;
            if (list.members.length > 0) {
                if (useNewLines) {
                    this.writeLineToOutput("");
                }

                this.indenter.increaseIndent();
                this.emitCommaSeparatedList(list, useNewLines);
                this.indenter.decreaseIndent();
                if (useNewLines) {
                    this.emitIndent();
                }
            }
            this.writeToOutput("]");

            this.recordSourceMappingEnd(arrayLiteral);
        }

        public emitObjectCreationExpression(objectCreationExpression: ObjectCreationExpression) {
            this.recordSourceMappingStart(objectCreationExpression);
            this.writeToOutput("new ");
            var target = objectCreationExpression.target;
            var args = objectCreationExpression.arguments;

            target.emit(this);
            this.recordSourceMappingStart(args);
            this.writeToOutput("(");
            this.emitCommaSeparatedList(args);
            this.writeToOutputWithSourceMapRecord(")", objectCreationExpression.closeParenSpan);
            this.recordSourceMappingEnd(args);

            this.recordSourceMappingEnd(objectCreationExpression);
        }

        public getConstantDecl(dotExpr: MemberAccessExpression): EnumElement {
            var pullSymbol = this.semanticInfoChain.getSymbolForAST(dotExpr);
            if (pullSymbol && pullSymbol.hasFlag(PullElementFlags.Constant)) {
                var pullDecls = pullSymbol.getDeclarations();
                if (pullDecls.length === 1) {
                    var pullDecl = pullDecls[0];
                    var ast = this.semanticInfoChain.getASTForDecl(pullDecl);
                    if (ast && ast.nodeType() === NodeType.EnumElement) {
                        var varDecl = <EnumElement>ast;
                        // If the enum member declaration is in an ambient context, don't propagate the constant because 
                        // the ambient enum member may have been generated based on a computed value - unless it is
                        // explicitly initialized in the ambient enum to an integer constant.
                        var memberIsAmbient = hasFlag(pullDecl.getParentDecl().flags, PullElementFlags.Ambient);
                        var memberIsInitialized = varDecl.value !== null;
                        if (!memberIsAmbient || memberIsInitialized) {
                            return varDecl;
                        }
                    }
                }
            }

            return null;
        }

        public tryEmitConstant(dotExpr: MemberAccessExpression) {
            var propertyName = dotExpr.name;
            var boundDecl = this.getConstantDecl(dotExpr);
            if (boundDecl) {
                var value = boundDecl.constantValue;
                if (value !== null) {
                    this.writeToOutput(value.toString());
                    var comment = " /* ";
                    comment += propertyName.text();
                    comment += " */";
                    this.writeToOutput(comment);
                    return true;
                }
            }

            return false;
        }

        public emitInvocationExpression(callNode: InvocationExpression) {
            this.recordSourceMappingStart(callNode);
            var target = callNode.target;
            var args = callNode.arguments;

            if (target.nodeType() === NodeType.MemberAccessExpression && (<MemberAccessExpression>target).expression.nodeType() === NodeType.SuperExpression) {
                target.emit(this);
                this.writeToOutput(".call");
                this.recordSourceMappingStart(args);
                this.writeToOutput("(");
                this.emitThis();
                if (args && args.members.length > 0) {
                    this.writeToOutput(", ");
                    this.emitCommaSeparatedList(args);
                }
            } else {
                if (callNode.target.nodeType() === NodeType.SuperExpression && this.emitState.container === EmitContainer.Constructor) {
                    this.writeToOutput("_super.call");
                }
                else {
                    this.emitJavascript(target, false);
                }
                this.recordSourceMappingStart(args);
                this.writeToOutput("(");
                if (callNode.target.nodeType() === NodeType.SuperExpression && this.emitState.container === EmitContainer.Constructor) {
                    this.writeToOutput("this");
                    if (args && args.members.length) {
                        this.writeToOutput(", ");
                    }
                }
                this.emitCommaSeparatedList(args);
            }

            this.writeToOutputWithSourceMapRecord(")", callNode.closeParenSpan);
            this.recordSourceMappingEnd(args);
            this.recordSourceMappingEnd(callNode);
        }

        private emitFunctionParameters(parameters: ASTList): void {
            var argsLen = 0;

            if (parameters) {
                this.emitComments(parameters, true);

                var tempContainer = this.setContainer(EmitContainer.Args);
                argsLen = parameters.members.length;
                var printLen = argsLen;
                if (lastParameterIsRest(parameters)) {
                    printLen--;
                }
                for (var i = 0; i < printLen; i++) {
                    var arg = <Parameter>parameters.members[i];
                    arg.emit(this);

                    if (i < (printLen - 1)) {
                        this.writeToOutput(", ");
                    }
                }
                this.setContainer(tempContainer);

                this.emitComments(parameters, false);
            }
        }

        public emitInnerFunction(funcDecl: FunctionDeclaration, printName: boolean, includePreComments = true) {
            var pullDecl = this.semanticInfoChain.getDeclForAST(funcDecl);
            this.pushDecl(pullDecl);

            if (includePreComments) {
                this.emitComments(funcDecl, true);
            }

            this.recordSourceMappingStart(funcDecl);
            this.writeToOutput("function ");

            if (printName) {
                var id = funcDecl.getNameText();
                if (id) {
                    if (funcDecl.name) {
                        this.recordSourceMappingStart(funcDecl.name);
                    }
                    this.writeToOutput(id);
                    if (funcDecl.name) {
                        this.recordSourceMappingEnd(funcDecl.name);
                    }
                }
            }

            this.writeToOutput("(");
            this.emitFunctionParameters(funcDecl.parameterList);
            this.writeToOutput(")");

            this.emitFunctionBodyStatements(funcDecl.getNameText(), funcDecl, funcDecl.parameterList, funcDecl.block);

            this.recordSourceMappingEnd(funcDecl);

            // The extra call is to make sure the caller's funcDecl end is recorded, since caller wont be able to record it
            this.recordSourceMappingEnd(funcDecl);

            this.emitComments(funcDecl, false);

            this.popDecl(pullDecl);
        }

        private emitFunctionBodyStatements(name: string, funcDecl: AST, parameterList: ASTList, block: Block): void {
            this.writeLineToOutput(" {");
            if (name) {
                this.recordSourceMappingNameStart(name);
            }

            this.indenter.increaseIndent();

            if (parameterList) {
                this.emitDefaultValueAssignments(parameterList);
                this.emitRestParameterInitializer(parameterList);
            }

            if (this.shouldCaptureThis(funcDecl)) {
                this.writeCaptureThisStatement(funcDecl);
            }

            this.emitList(block.statements);

            this.emitCommentsArray(block.closeBraceLeadingComments, /*trailing:*/ false);

            this.indenter.decreaseIndent();
            this.emitIndent();
            this.writeToOutputWithSourceMapRecord("}", block.closeBraceSpan);

            if (name) {
                this.recordSourceMappingNameEnd();
            }
        }

        private emitDefaultValueAssignments(parameters: ASTList): void {
            var n = parameters.members.length;
            if (lastParameterIsRest(parameters)) {
                n--;
            }

            for (var i = 0; i < n; i++) {
                var arg = <Parameter>parameters.members[i];
                if (arg.init) {
                    this.emitIndent();
                    this.recordSourceMappingStart(arg);
                    this.writeToOutput("if (typeof " + arg.id.text() + " === \"undefined\") { ");//
                    this.writeToOutputWithSourceMapRecord(arg.id.text(), arg.id);
                    this.writeToOutput(" = ");
                    this.emitJavascript(arg.init, false);
                    this.writeLineToOutput("; }");
                    this.recordSourceMappingEnd(arg);
                }
            }
        }

        private emitRestParameterInitializer(parameters: ASTList): void {
            if (lastParameterIsRest(parameters)) {
                var n = parameters.members.length;
                var lastArg = <Parameter>parameters.members[n - 1];
                this.emitIndent();
                this.recordSourceMappingStart(lastArg);
                this.writeToOutput("var ");
                this.writeToOutputWithSourceMapRecord(lastArg.id.text(), lastArg.id);
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

                this.writeToOutputWithSourceMapRecord(lastArg.id.text() + "[_i] = arguments[_i + " + (n - 1) + "];", lastArg);
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
                    var importStatementAST = <ImportDeclaration>this.semanticInfoChain.getASTForDecl(decl);
                    if (importStatementAST.isExternalImportDeclaration()) { // external module
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

        public getModuleImportAndDependencyList(script: Script) {
            var importList = "";
            var dependencyList = "";

            var importDecls = this.getImportDecls(this.document.fileName);

            // all dependencies are quoted
            if (importDecls.length) {
                for (var i = 0; i < importDecls.length; i++) {
                    var importStatementDecl = importDecls[i];
                    var importStatementSymbol = <PullTypeAliasSymbol>importStatementDecl.getSymbol();
                    var importStatementAST = <ImportDeclaration>this.semanticInfoChain.getASTForDecl(importStatementDecl);

                    if (importStatementSymbol.isUsedAsValue()) {
                        if (i <= importDecls.length - 1) {
                            dependencyList += ", ";
                            importList += ", ";
                        }

                        importList += importStatementDecl.name;
                        dependencyList += importStatementAST.getAliasName();
                    }
                }
            }

            // emit any potential amd dependencies
            for (var i = 0; i < script.amdDependencies.length; i++) {
                dependencyList += ", \"" + script.amdDependencies[i] + "\"";
            }

            return {
                importList: importList,
                dependencyList: dependencyList
            };
        }

        public shouldCaptureThis(ast: AST) {
            if (ast.nodeType() === NodeType.Script) {
                var scriptDecl = this.semanticInfoChain.topLevelDecl(this.document.fileName);
                return (scriptDecl.flags & PullElementFlags.MustCaptureThis) === PullElementFlags.MustCaptureThis;
            }

            var decl = this.semanticInfoChain.getDeclForAST(ast);
            if (decl) {
                return (decl.flags & PullElementFlags.MustCaptureThis) === PullElementFlags.MustCaptureThis;
            }

            return false;
        }

        public emitEnum(moduleDecl: EnumDeclaration) {
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

            this.emitList(moduleDecl.enumElements);
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
                    if (childAST.shouldEmit(this)) {
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

        public emitModule(moduleDecl: ModuleDeclaration) {
            var pullDecl = this.semanticInfoChain.getDeclForAST(moduleDecl);
            this.pushDecl(pullDecl);

            var svModuleName = this.moduleName;
            this.moduleName = moduleDecl.name.text();
            if (isTSFile(this.moduleName)) {
                this.moduleName = this.moduleName.substring(0, this.moduleName.length - ".ts".length);
            }

            var isExternalModule = hasFlag(moduleDecl.getModuleFlags(), ModuleFlags.IsExternalModule);
            var temp = this.setContainer(EmitContainer.Module);
            var isExported = hasFlag(pullDecl.flags, PullElementFlags.Exported);

            // prologue
            if (isExternalModule) {
                // if the external module has an "export =" identifier, we'll
                // set it in the ExportAssignment emit method
                this.setExportAssignmentIdentifier(null);
                this.setContainer(EmitContainer.DynamicModule); // discard the previous 'Module' container
            }
            else {
                if (!isExported) {
                    this.recordSourceMappingStart(moduleDecl);
                    this.writeToOutput("var ");
                    this.recordSourceMappingStart(moduleDecl.name);
                    this.writeToOutput(this.moduleName);
                    this.recordSourceMappingEnd(moduleDecl.name);
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
                this.writeToOutputWithSourceMapRecord(this.moduleName, moduleDecl.name);
                this.writeLineToOutput(") {");

                this.recordSourceMappingNameStart(moduleDecl.name.text());
            }

            // body - don't indent for Node
            if (!isExternalModule || this.emitOptions.compilationSettings().moduleGenTarget() === ModuleGenTarget.Asynchronous) {
                this.indenter.increaseIndent();
            }

            if (this.shouldCaptureThis(moduleDecl)) {
                this.writeCaptureThisStatement(moduleDecl);
            }

            this.emitList(moduleDecl.members);
            this.moduleName = moduleDecl.name.text();
            if (!isExternalModule || this.emitOptions.compilationSettings().moduleGenTarget() === ModuleGenTarget.Asynchronous) {
                this.indenter.decreaseIndent();
            }
            this.emitIndent();

            // epilogue
            if (isExternalModule) {
                var exportAssignmentIdentifier = this.getExportAssignmentIdentifier();
                var exportAssignmentValueSymbol = (<PullContainerSymbol>pullDecl.getSymbol()).getExportAssignedValueSymbol();

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
                    this.writeLineToOutput("module.exports = " + exportAssignmentIdentifier + ";");
                }

                this.recordSourceMappingEnd(moduleDecl);
            }
            else {
                var parentIsDynamic = temp === EmitContainer.DynamicModule;
                this.recordSourceMappingStart(moduleDecl.endingToken);
                if (temp === EmitContainer.Prog && isExported) {
                    this.writeToOutput("}");
                    this.recordSourceMappingNameEnd();
                    this.recordSourceMappingEnd(moduleDecl.endingToken);
                    this.writeToOutput(")(this." + this.moduleName + " || (this." + this.moduleName + " = {}));");
                }
                else if (isExported || temp === EmitContainer.Prog) {
                    var dotMod = svModuleName !== "" ? (parentIsDynamic ? "exports" : svModuleName) + "." : svModuleName;
                    this.writeToOutput("}");
                    this.recordSourceMappingNameEnd();
                    this.recordSourceMappingEnd(moduleDecl.endingToken);
                    this.writeToOutput(")(" + dotMod + this.moduleName + " || (" + dotMod + this.moduleName + " = {}));");
                }
                else if (!isExported && temp !== EmitContainer.Prog) {
                    this.writeToOutput("}");
                    this.recordSourceMappingNameEnd();
                    this.recordSourceMappingEnd(moduleDecl.endingToken);
                    this.writeToOutput(")(" + this.moduleName + " || (" + this.moduleName + " = {}));");
                }
                else {
                    this.writeToOutput("}");
                    this.recordSourceMappingNameEnd();
                    this.recordSourceMappingEnd(moduleDecl.endingToken);
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
            }

            this.setContainer(temp);
            this.moduleName = svModuleName;

            this.popDecl(pullDecl);
        }

        public emitEnumElement(varDecl: EnumElement): void {
            // <EnumName>[<EnumName>["<MemberName>"] = <MemberValue>] = "<MemberName>";
            this.emitComments(varDecl, true);
            this.recordSourceMappingStart(varDecl);
            var name = varDecl.identifier.text();
            var quoted = isQuoted(name);
            this.writeToOutput(this.moduleName);
            this.writeToOutput('[');
            this.writeToOutput(this.moduleName);
            this.writeToOutput('[');
            this.writeToOutput(quoted ? name : '"' + name + '"');
            this.writeToOutput('] = ');

            if (varDecl.value) {
                varDecl.value.emit(this);
            }
            else if (varDecl.constantValue !== null) {
                this.writeToOutput(varDecl.constantValue.toString());
            }
            else {
                this.writeToOutput("null");
            }

            this.writeToOutput('] = ');
            this.writeToOutput(quoted ? name : '"' + name + '"');
            this.recordSourceMappingEnd(varDecl);
            this.emitComments(varDecl, false);
            this.writeToOutput(';');
        }

        public emitElementAccessExpression(expression: ElementAccessExpression) {
            this.recordSourceMappingStart(expression);
            expression.expression.emit(this);
            this.writeToOutput("[");
            expression.argumentExpression.emit(this);
            this.writeToOutput("]");
            this.recordSourceMappingEnd(expression);
        }

        public emitArrowFunctionExpression(arrowFunction: ArrowFunctionExpression): void {
            var savedInArrowFunction = this.inArrowFunction;
            this.inArrowFunction = true;

            var temp = this.setContainer(EmitContainer.Function);

            var funcName = arrowFunction.getNameText();

            this.recordSourceMappingStart(arrowFunction);

            // Start
            var pullDecl = this.semanticInfoChain.getDeclForAST(arrowFunction);
            this.pushDecl(pullDecl);

            this.emitComments(arrowFunction, true);

            this.recordSourceMappingStart(arrowFunction);
            this.writeToOutput("function ");
            this.writeToOutput("(");
            this.emitFunctionParameters(arrowFunction.parameterList);
            this.writeToOutput(")");

            this.emitFunctionBodyStatements(arrowFunction.getNameText(), arrowFunction, arrowFunction.parameterList, arrowFunction.block);

            this.recordSourceMappingEnd(arrowFunction);

            // The extra call is to make sure the caller's funcDecl end is recorded, since caller wont be able to record it
            this.recordSourceMappingEnd(arrowFunction);

            this.emitComments(arrowFunction, false);

            this.popDecl(pullDecl);
            this.setContainer(temp);
            this.inArrowFunction = savedInArrowFunction;
        }

        public emitConstructor(funcDecl: ConstructorDeclaration) {
            if (hasFlag(funcDecl.getFunctionFlags(), FunctionFlags.Signature) /*|| funcDecl.isOverload*/) {
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
            this.writeToOutput("(");
            this.emitFunctionParameters(funcDecl.parameterList);
            this.writeLineToOutput(") {");

            this.recordSourceMappingNameStart("constructor");
            this.indenter.increaseIndent();

            this.emitDefaultValueAssignments(funcDecl.parameterList);
            this.emitRestParameterInitializer(funcDecl.parameterList);

            if (this.shouldCaptureThis(funcDecl)) {
                this.writeCaptureThisStatement(funcDecl);
            }

            this.emitConstructorStatements(funcDecl);
            this.emitCommentsArray(funcDecl.block.closeBraceLeadingComments, /*trailing:*/ false);

            this.indenter.decreaseIndent();
            this.emitIndent();
            this.writeToOutputWithSourceMapRecord("}", funcDecl.block.closeBraceSpan);

            this.recordSourceMappingNameEnd();
            this.recordSourceMappingEnd(funcDecl);

            // The extra call is to make sure the caller's funcDecl end is recorded, since caller wont be able to record it
            this.recordSourceMappingEnd(funcDecl);

            this.emitComments(funcDecl, false);

            this.popDecl(pullDecl);
            this.setContainer(temp);
        }

        public emitGetAccessor(accessor: GetAccessor): void {
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
            this.writeToOutput("(");
            this.writeToOutput(")");

            this.emitFunctionBodyStatements(null, accessor, accessor.parameterList, accessor.block);

            this.recordSourceMappingEnd(accessor);

            // The extra call is to make sure the caller's funcDecl end is recorded, since caller wont be able to record it
            this.recordSourceMappingEnd(accessor);

            this.popDecl(pullDecl);
            this.setContainer(temp);
            this.recordSourceMappingEnd(accessor);
        }

        public emitSetAccessor(accessor: SetAccessor): void {
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
            this.writeToOutput("(");
            this.emitFunctionParameters(accessor.parameterList);
            this.writeToOutput(")");

            this.emitFunctionBodyStatements(null, accessor, accessor.parameterList, accessor.block);

            this.recordSourceMappingEnd(accessor);

            // The extra call is to make sure the caller's funcDecl end is recorded, since caller wont be able to record it
            this.recordSourceMappingEnd(accessor);

            this.popDecl(pullDecl);
            this.setContainer(temp);
            this.recordSourceMappingEnd(accessor);
        }

        public emitFunctionExpression(funcDecl: FunctionExpression): void {
            var savedInArrowFunction = this.inArrowFunction;
            this.inArrowFunction = false;

            var temp = this.setContainer(EmitContainer.Function);

            var funcName = funcDecl.getNameText();

            this.recordSourceMappingStart(funcDecl);

            var pullDecl = this.semanticInfoChain.getDeclForAST(funcDecl);
            this.pushDecl(pullDecl);

            this.recordSourceMappingStart(funcDecl);
            this.writeToOutput("function ");

            //var id = funcDecl.getNameText();
            if (funcDecl.name) {
                this.recordSourceMappingStart(funcDecl.name);
                this.writeToOutput(funcDecl.name.text());
                this.recordSourceMappingEnd(funcDecl.name);
            }

            this.writeToOutput("(");
            this.emitFunctionParameters(funcDecl.parameterList);
            this.writeToOutput(")");

            this.emitFunctionBodyStatements(funcDecl.getNameText(), funcDecl, funcDecl.parameterList, funcDecl.block);

            this.recordSourceMappingEnd(funcDecl);

            // The extra call is to make sure the caller's funcDecl end is recorded, since caller wont be able to record it
            this.recordSourceMappingEnd(funcDecl);

            this.emitComments(funcDecl, false);

            this.popDecl(pullDecl);

            this.setContainer(temp);
            this.inArrowFunction = savedInArrowFunction;
        }

        public emitFunction(funcDecl: FunctionDeclaration) {
            if (hasFlag(funcDecl.getFunctionFlags(), FunctionFlags.Signature) /*|| funcDecl.isOverload*/) {
                return;
            }
            var savedInArrowFunction = this.inArrowFunction;
            this.inArrowFunction = false;

            var temp = this.setContainer(EmitContainer.Function);

            var funcName = funcDecl.getNameText();

            if (((temp !== EmitContainer.Constructor) ||
                ((funcDecl.getFunctionFlags() & FunctionFlags.Method) === FunctionFlags.None))) {
                this.recordSourceMappingStart(funcDecl);
                this.emitInnerFunction(funcDecl, (funcDecl.name && !funcDecl.name.isMissing()));
            }
            this.setContainer(temp);
            this.inArrowFunction = savedInArrowFunction;

            var functionFlags = funcDecl.getFunctionFlags();
            if (!hasFlag(functionFlags, FunctionFlags.Signature)) {
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

        public emitAmbientVarDecl(varDecl: VariableDeclarator) {
            this.recordSourceMappingStart(this.currentVariableDeclaration);
            if (varDecl.init) {
                this.emitComments(varDecl, true);
                this.recordSourceMappingStart(varDecl);
                this.writeToOutputWithSourceMapRecord(varDecl.id.text(), varDecl.id);
                this.writeToOutput(" = ");
                this.emitJavascript(varDecl.init, false);
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

        public emitVariableDeclaration(declaration: VariableDeclaration) {
            var varDecl = <VariableDeclarator>declaration.declarators.members[0];

            var symbol = this.semanticInfoChain.getSymbolForAST(varDecl);

            var parentSymbol = symbol ? symbol.getContainer() : null;
            var parentKind = parentSymbol ? parentSymbol.kind : PullElementKind.None;

            this.emitComments(declaration, true);

            var pullVarDecl = this.semanticInfoChain.getDeclForAST(varDecl);
            var isAmbientWithoutInit = pullVarDecl && hasFlag(pullVarDecl.flags, PullElementFlags.Ambient) && varDecl.init === null;
            if (!isAmbientWithoutInit) {
                var prevVariableDeclaration = this.currentVariableDeclaration;
                this.currentVariableDeclaration = declaration;

                for (var i = 0, n = declaration.declarators.members.length; i < n; i++) {
                    var declarator = declaration.declarators.members[i];

                    if (i > 0) {
                        this.writeToOutput(", ");
                    }

                    declarator.emit(this);
                }
                this.currentVariableDeclaration = prevVariableDeclaration;

                // Declarator emit would take care of emitting start of the variable declaration start
                this.recordSourceMappingEnd(declaration);
            }

            this.emitComments(declaration, false);
        }

        private emitMemberVariableDeclaration(varDecl: MemberVariableDeclaration) {
            Debug.assert(!hasFlag(varDecl.getVarFlags(), VariableFlags.Static) && varDecl.init);

            var pullDecl = this.semanticInfoChain.getDeclForAST(varDecl);
            this.pushDecl(pullDecl);

            this.emitComments(varDecl, true);
            this.recordSourceMappingStart(varDecl);

            var varDeclName = varDecl.id.text();
            var quotedOrNumber = isQuoted(varDeclName) || varDecl.id.isStringOrNumericLiteral;

            var symbol = this.semanticInfoChain.getSymbolForAST(varDecl);
            var parentSymbol = symbol ? symbol.getContainer() : null;
            var parentDecl = pullDecl && pullDecl.getParentDecl();

            if (quotedOrNumber) {
                this.writeToOutput("this[");
            }
            else {
                this.writeToOutput("this.");
            }

            this.writeToOutputWithSourceMapRecord(varDecl.id.text(), varDecl.id);

            if (quotedOrNumber) {
                this.writeToOutput("]");
            }

            if (varDecl.init) {
                this.writeToOutput(" = ");

                // Ensure we have a fresh var list count when recursing into the variable 
                // initializer.  We don't want our current list of variables to affect how we
                // emit nested variable lists.
                var prevVariableDeclaration = this.currentVariableDeclaration;
                varDecl.init.emit(this);
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

        public emitVariableDeclarator(varDecl: VariableDeclarator) {
            var pullDecl = this.semanticInfoChain.getDeclForAST(varDecl);
            this.pushDecl(pullDecl);
            if (pullDecl && (pullDecl.flags & PullElementFlags.Ambient) === PullElementFlags.Ambient) {
                this.emitAmbientVarDecl(varDecl);
            }
            else {
                this.emitComments(varDecl, true);
                this.recordSourceMappingStart(this.currentVariableDeclaration);
                this.recordSourceMappingStart(varDecl);

                var varDeclName = varDecl.id.text();

                var symbol = this.semanticInfoChain.getSymbolForAST(varDecl);
                var parentSymbol = symbol ? symbol.getContainer() : null;
                var parentDecl = pullDecl && pullDecl.getParentDecl();
                var parentIsModule = parentDecl && (parentDecl.flags & PullElementFlags.SomeInitializedModule);

                if (parentIsModule) {
                    // module
                    if (!hasFlag(pullDecl.flags, PullElementFlags.Exported) && !varDecl.isProperty()) {
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

                this.writeToOutputWithSourceMapRecord(varDecl.id.text(), varDecl.id);

                if (varDecl.init) {
                    this.writeToOutput(" = ");

                    // Ensure we have a fresh var list count when recursing into the variable 
                    // initializer.  We don't want our current list of variables to affect how we
                    // emit nested variable lists.
                    var prevVariableDeclaration = this.currentVariableDeclaration;
                    varDecl.init.emit(this);
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
                            if (!same && symbol.hasFlag(PullElementFlags.InitializedModule)) {
                                same = symbolDeclarationEnclosingContainer === enclosingContainer.getParentDecl();
                            }

                            return same;
                        }
                    }
                }
            }

            return false;
        }

        // Emits the container name of the symbol in the given enclosing context
        private emitSymbolContainerNameInEnclosingContext(pullSymbol: PullSymbol) {
            var decl = pullSymbol.getDeclarations()[0];
            var parentDecl = decl.getParentDecl();
            var symbolContainerDeclPath = parentDecl ? parentDecl.getParentPath() : <PullDecl[]>[];

            var enclosingContextDeclPath = this.declStack;
            var potentialDeclPath = symbolContainerDeclPath;

            // Find the container decl path and the declStack of the context
            if (enclosingContextDeclPath.length) {
                var commonNodeIndex = -1;
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

                if (commonNodeIndex >= 0) {
                    potentialDeclPath = symbolContainerDeclPath.slice(commonNodeIndex);
                }
            }

            // We can emit dotted names only of exported declarations, so find the index to start emitting dotted name
            var startingIndex = potentialDeclPath.length - 1
            for (var i = startingIndex - 1; i >= 0; i--) {
                if (potentialDeclPath[i + 1].flags & PullElementFlags.Exported) {
                    startingIndex = i;
                } else {
                    break;
                }
            }

            // Emit dotted names for the path
            for (var i = startingIndex; i < potentialDeclPath.length; i++) {
                if (potentialDeclPath[i].kind === PullElementKind.DynamicModule ||
                    potentialDeclPath[i].flags & PullElementFlags.InitializedDynamicModule) {
                    this.writeToOutput("exports.");
                } else {
                    // Get the name of the decl that would need to referenced and is conflict free.
                    this.writeToOutput(this.getModuleName(potentialDeclPath[i], /* changeNameIfAnyDeclarationInContext */ true) + ".");
                }
            }
        }

        public emitName(name: Identifier, addThis: boolean) {
            this.emitComments(name, true);
            this.recordSourceMappingStart(name);
            if (!name.isMissing()) {
                var pullSymbol = this.semanticInfoChain.getSymbolForAST(name);
                if (!pullSymbol) {
                    pullSymbol = this.semanticInfoChain.anyTypeSymbol;
                }
                var pullSymbolAlias = this.semanticInfoChain.getAliasSymbolForAST(name);
                if (pullSymbol && pullSymbolAlias) {
                    var symbolToCompare = isTypesOnlyLocation(name) ?
                        pullSymbolAlias.getExportAssignedTypeSymbol() :
                        pullSymbolAlias.getExportAssignedValueSymbol();

                    if (pullSymbol == symbolToCompare) {
                        pullSymbol = pullSymbolAlias;
                        pullSymbolAlias = null;
                    }
                }

                var pullSymbolKind = pullSymbol.kind;
                var isLocalAlias = pullSymbolAlias && (pullSymbolAlias.getDeclarations()[0].getParentDecl() == this.getEnclosingDecl());
                if (addThis && (this.emitState.container !== EmitContainer.Args) && pullSymbol) {
                    var pullSymbolContainer = pullSymbol.getContainer();

                    if (pullSymbolContainer) {
                        var pullSymbolContainerKind = pullSymbolContainer.kind;

                        if (pullSymbolContainerKind === PullElementKind.Class) {
                            if (pullSymbol.hasFlag(PullElementFlags.Static)) {
                                // This is static symbol
                                this.emitSymbolContainerNameInEnclosingContext(pullSymbol);
                            }
                            else if (pullSymbolKind === PullElementKind.Property) {
                                this.emitThis();
                                this.writeToOutput(".");
                            }
                        }
                        else if (PullHelpers.symbolIsModule(pullSymbolContainer) || pullSymbolContainerKind === PullElementKind.Enum ||
                            pullSymbolContainer.hasFlag(PullElementFlags.InitializedModule | PullElementFlags.Enum)) {
                            // If property or, say, a constructor being invoked locally within the module of its definition
                            if (pullSymbolKind === PullElementKind.Property || pullSymbolKind === PullElementKind.EnumMember) {
                                this.emitSymbolContainerNameInEnclosingContext(pullSymbol);
                            }
                            else if (pullSymbol.hasFlag(PullElementFlags.Exported) &&
                                pullSymbolKind === PullElementKind.Variable &&
                                !pullSymbol.hasFlag(PullElementFlags.InitializedModule | PullElementFlags.Enum)) {
                                this.emitSymbolContainerNameInEnclosingContext(pullSymbol);
                            }
                            else if (pullSymbol.hasFlag(PullElementFlags.Exported) && !this.symbolIsUsedInItsEnclosingContainer(pullSymbol)) {
                                this.emitSymbolContainerNameInEnclosingContext(pullSymbol);
                            }
                        }
                        else if (pullSymbolContainerKind === PullElementKind.DynamicModule ||
                            pullSymbolContainer.hasFlag(PullElementFlags.InitializedDynamicModule)) {
                            if (pullSymbolKind === PullElementKind.Property) {
                                // If dynamic module
                                this.writeToOutput("exports.");
                            }
                            else if (pullSymbol.hasFlag(PullElementFlags.Exported) &&
                                !isLocalAlias &&
                                !pullSymbol.hasFlag(PullElementFlags.ImplicitVariable) &&
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

        public recordSourceMappingStart(ast: IASTSpan) {
            if (this.sourceMapper && isValidAstNode(ast)) {
                var lineCol = { line: -1, character: -1 };
                var sourceMapping = new SourceMapping();
                sourceMapping.start.emittedColumn = this.emitState.column;
                sourceMapping.start.emittedLine = this.emitState.line;
                // REVIEW: check time consumed by this binary search (about two per leaf statement)
                var lineMap = this.document.lineMap();
                lineMap.fillLineAndCharacterFromPosition(ast.minChar, lineCol);
                sourceMapping.start.sourceColumn = lineCol.character;
                sourceMapping.start.sourceLine = lineCol.line + 1;
                lineMap.fillLineAndCharacterFromPosition(ast.limChar, lineCol);
                sourceMapping.end.sourceColumn = lineCol.character;
                sourceMapping.end.sourceLine = lineCol.line + 1;
                if (this.sourceMapper.currentNameIndex.length > 0) {
                    sourceMapping.nameIndex = this.sourceMapper.currentNameIndex[this.sourceMapper.currentNameIndex.length - 1];
                }
                // Set parent and child relationship
                var siblings = this.sourceMapper.currentMappings[this.sourceMapper.currentMappings.length - 1];
                siblings.push(sourceMapping);
                this.sourceMapper.currentMappings.push(sourceMapping.childMappings);
            }
        }

        public recordSourceMappingEnd(ast: IASTSpan) {
            if (this.sourceMapper && isValidAstNode(ast)) {
                // Pop source mapping childs
                this.sourceMapper.currentMappings.pop();

                // Get the last source mapping from sibling list = which is the one we are recording end for
                var siblings = this.sourceMapper.currentMappings[this.sourceMapper.currentMappings.length - 1];
                var sourceMapping = siblings[siblings.length - 1];

                sourceMapping.end.emittedColumn = this.emitState.column;
                sourceMapping.end.emittedLine = this.emitState.line;
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
                for (var i = 0, n = constructorDecl.parameterList.members.length; i < n; i++) {
                    var parameter = <Parameter>constructorDecl.parameterList.members[i];
                    var parameterDecl = this.semanticInfoChain.getDeclForAST(parameter);
                    if (hasFlag(parameterDecl.flags, PullElementFlags.PropertyParameter)) {
                        this.emitIndent();
                        this.recordSourceMappingStart(parameter);
                        this.writeToOutputWithSourceMapRecord("this." + parameter.id.text(), parameter.id);
                        this.writeToOutput(" = ");
                        this.writeToOutputWithSourceMapRecord(parameter.id.text(), parameter.id);
                        this.writeLineToOutput(";");
                        this.recordSourceMappingEnd(parameter);
                    }
                }
            }

            for (var i = 0, n = this.thisClassNode.classElements.members.length; i < n; i++) {
                if (this.thisClassNode.classElements.members[i].nodeType() === NodeType.MemberVariableDeclaration) {
                    var varDecl = <MemberVariableDeclaration>this.thisClassNode.classElements.members[i];
                    if (!hasFlag(varDecl.getVarFlags(), VariableFlags.Static) && varDecl.init) {
                        this.emitIndent();
                        this.emitMemberVariableDeclaration(varDecl);
                        this.writeLineToOutput("");
                    }
                }
            }
        }

        public emitCommaSeparatedList(list: ASTList, startLine: boolean = false): void {
            if (list === null) {
                return;
            }
            else {
                // this.emitComments(ast, true);
                // this.emitComments(ast, false);

                for (var i = 0, n = list.members.length; i < n; i++) {
                    var emitNode = list.members[i];
                    this.emitJavascript(emitNode, startLine);

                    if (i < (n - 1)) {
                        this.writeToOutput(startLine ? "," : ", ");
                    }

                    if (startLine) {
                        this.writeLineToOutput("");
                    }
                }
            }
        }

        public emitList(list: ASTList, useNewLineSeparator = true, startInclusive = 0, endExclusive = list.members.length) {
            if (list === null) {
                return;
            }

            this.emitComments(list, true);
            var lastEmittedNode: AST = null;

            for (var i = startInclusive; i < endExclusive; i++) {
                var node = list.members[i];

                if (node.shouldEmit(this)) {
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

        private isDirectivePrologueElement(node: AST) {
            if (node.nodeType() === NodeType.ExpressionStatement) {
                var exprStatement = <ExpressionStatement>node;
                return exprStatement.expression.nodeType() === NodeType.StringLiteral;
            }

            return false;
        }

        // If these two constructs had more than one line between them originally, then emit at 
        // least one blank line between them.
        public emitSpaceBetweenConstructs(node1: AST, node2: AST): void {
            if (node1 === null || node2 === null) {
                return;
            }

            if (node1.minChar === -1 || node1.limChar === -1 || node2.minChar === -1 || node2.limChar === -1) {
                return;
            }

            var lineMap = this.document.lineMap();
            var node1EndLine = lineMap.getLineNumberFromPosition(node1.limChar);
            var node2StartLine = lineMap.getLineNumberFromPosition(node2.minChar);

            if ((node2StartLine - node1EndLine) > 1) {
                this.writeLineToOutput("", /*force:*/ true);
            }
        }

        // We consider a sequence of comments to be a copyright header if there are no blank lines 
        // between them, and there is a blank line after the last one and the node they're attached 
        // to.
        private getCopyrightComments(): Comment[] {
            var preComments = this.copyrightElement.preComments();
            if (preComments) {
                var lineMap = this.document.lineMap();

                var copyrightComments: Comment[] = [];
                var lastComment: Comment = null;

                for (var i = 0, n = preComments.length; i < n; i++) {
                    var comment = preComments[i];

                    if (lastComment) {
                        var lastCommentLine = lineMap.getLineNumberFromPosition(lastComment.limChar);
                        var commentLine = lineMap.getLineNumberFromPosition(comment.minChar);

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
                var lastCommentLine = lineMap.getLineNumberFromPosition(ArrayUtilities.last(copyrightComments).limChar);
                var astLine = lineMap.getLineNumberFromPosition(this.copyrightElement.minChar);
                if (astLine >= lastCommentLine + 2) {
                    return copyrightComments;
                }
            }

            // No usable copyright comments found.
            return [];
        }

        private emitPossibleCopyrightHeaders(script: Script): void {
            var list = script.moduleElements;
            if (list.members.length > 0) {
                var firstElement = list.members[0];
                if (firstElement.nodeType() === NodeType.ModuleDeclaration) {
                    var moduleDeclaration = <ModuleDeclaration>firstElement;
                    if (hasFlag(moduleDeclaration.getModuleFlags(), ModuleFlags.IsExternalModule)) {
                        firstElement = moduleDeclaration.members.members[0];
                    }
                }

                this.copyrightElement = firstElement;
                this.emitCommentsArray(this.getCopyrightComments(), /*trailing:*/ false);
            }
        }

        public emitScriptElements(script: Script) {
            var list = script.moduleElements;

            this.emitPossibleCopyrightHeaders(script);

            // First, emit all the prologue elements.
            for (var i = 0, n = list.members.length; i < n; i++) {
                var node = list.members[i];

                if (!this.isDirectivePrologueElement(node)) {
                    break;
                }

                this.emitJavascript(node, true);
                this.writeLineToOutput("");
            }

            // Now emit __extends or a _this capture if necessary.
            this.emitPrologue(script);

            var isNonElidedExternalModule = hasFlag(script.getModuleFlags(), ModuleFlags.IsExternalModule) && !this.scriptIsElided(script);
            if (isNonElidedExternalModule) {
                this.recordSourceMappingStart(script);

                if (this.emitOptions.compilationSettings().moduleGenTarget() === ModuleGenTarget.Asynchronous) { // AMD
                    var dependencyList = "[\"require\", \"exports\"";
                    var importList = "require, exports";

                    var importAndDependencyList = this.getModuleImportAndDependencyList(script);
                    importList += importAndDependencyList.importList;
                    dependencyList += importAndDependencyList.dependencyList + "]";

                    this.writeLineToOutput("define(" + dependencyList + "," + " function(" + importList + ") {");
                }
            }

            this.emitList(list, /*useNewLineSeparator:*/ true, /*startInclusive:*/ i, /*endExclusive:*/ n);
        }

        public emitConstructorStatements(funcDecl: ConstructorDeclaration) {
            var list = funcDecl.block.statements;

            if (list === null) {
                return;
            }

            this.emitComments(list, true);

            var emitPropertyAssignmentsAfterSuperCall = getExtendsHeritageClause(this.thisClassNode.heritageClauses) !== null;
            var propertyAssignmentIndex = emitPropertyAssignmentsAfterSuperCall ? 1 : 0;
            var lastEmittedNode: AST = null;

            for (var i = 0, n = list.members.length; i < n; i++) {
                // In some circumstances, class property initializers must be emitted immediately after the 'super' constructor
                // call which, in these cases, must be the first statement in the constructor body
                if (i === propertyAssignmentIndex) {
                    this.emitParameterPropertyAndMemberVariableAssignments();
                }

                var node = list.members[i];

                if (node.shouldEmit(this)) {
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
        public emitJavascript(ast: AST, startLine: boolean) {
            if (ast === null) {
                return;
            }

            if (startLine &&
                this.indenter.indentAmt > 0) {

                this.emitIndent();
            }

            ast.emit(this);
        }

        public emitAccessorMemberDeclaration(funcDecl: AST, name: Identifier, className: string, isProto: boolean) {
            if (funcDecl.nodeType() !== NodeType.GetAccessor) {
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
                this.writeToOutput("get: ");
                this.emitComments(accessors.getter, true);
                this.emitAccessorBody(accessors.getter, accessors.getter.parameterList, accessors.getter.block);
                this.writeLineToOutput(",");
            }

            if (accessors.setter) {
                this.emitIndent();
                this.recordSourceMappingStart(accessors.setter);
                this.writeToOutput("set: ");
                this.emitComments(accessors.setter, true);
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

        private emitAccessorBody(funcDecl: AST, parameterList: ASTList, block: Block): void {
            var pullDecl = this.semanticInfoChain.getDeclForAST(funcDecl);
            this.pushDecl(pullDecl);

            this.recordSourceMappingStart(funcDecl);
            this.writeToOutput("function ");

            this.writeToOutput("(");
            this.emitFunctionParameters(parameterList);
            this.writeToOutput(")");

            this.emitFunctionBodyStatements(null, funcDecl, parameterList, block);

            this.recordSourceMappingEnd(funcDecl);

            // The extra call is to make sure the caller's funcDecl end is recorded, since caller wont be able to record it
            this.recordSourceMappingEnd(funcDecl);
            this.popDecl(pullDecl);
        }

        public emitClass(classDecl: ClassDeclaration) {
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
            var baseTypeReference: TypeReference = null;
            var varDecl: VariableDeclarator = null;

            if (hasBaseClass) {
                this.writeLineToOutput(" = (function (_super) {");
            } else {
                this.writeLineToOutput(" = (function () {");
            }

            this.recordSourceMappingNameStart(className);
            this.indenter.increaseIndent();

            if (hasBaseClass) {
                baseTypeReference = <TypeReference>getExtendsHeritageClause(classDecl.heritageClauses).typeNames.members[0];
                this.emitIndent();
                this.writeLineToOutput("__extends(" + className + ", _super);");
            }

            this.emitIndent();

            var constrDecl = getLastConstructor(classDecl);

            // output constructor
            if (constrDecl) {
                // declared constructor
                constrDecl.emit(this);
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
            this.writeToOutputWithSourceMapRecord("return " + className + ";", classDecl.endingToken);
            this.writeLineToOutput("");
            this.indenter.decreaseIndent();
            this.emitIndent();
            this.writeToOutputWithSourceMapRecord("}", classDecl.endingToken);
            this.recordSourceMappingNameEnd();
            this.recordSourceMappingStart(classDecl);
            this.writeToOutput(")(");
            if (hasBaseClass) {
                this.emitJavascript(baseTypeReference.term, /*startLine:*/ false);
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

        private emitClassMembers(classDecl: ClassDeclaration): void {
            // First, emit all the functions.
            var lastEmittedMember: AST = null;

            for (var i = 0, n = classDecl.classElements.members.length; i < n; i++) {
                var memberDecl = classDecl.classElements.members[i];

                if (memberDecl.nodeType() === NodeType.GetAccessor) {
                    this.emitSpaceBetweenConstructs(lastEmittedMember, memberDecl);
                    var getter = <GetAccessor>memberDecl;
                    this.emitAccessorMemberDeclaration(getter, getter.propertyName, classDecl.identifier.text(),
                        !hasFlag(getter.getFunctionFlags(), FunctionFlags.Static));
                    lastEmittedMember = memberDecl;
                }
                else if (memberDecl.nodeType() === NodeType.SetAccessor) {
                    this.emitSpaceBetweenConstructs(lastEmittedMember, memberDecl);
                    var setter = <SetAccessor>memberDecl;
                    this.emitAccessorMemberDeclaration(setter, setter.propertyName, classDecl.identifier.text(),
                        !hasFlag(setter.getFunctionFlags(), FunctionFlags.Static));
                    lastEmittedMember = memberDecl;
                }
                else if (memberDecl.nodeType() === NodeType.MemberFunctionDeclaration) {

                    var memberFunction = <MemberFunctionDeclaration>memberDecl;

                    var functionFlags = memberFunction.getFunctionFlags();
                    if (!hasFlag(functionFlags, FunctionFlags.Signature)) {
                        this.emitSpaceBetweenConstructs(lastEmittedMember, memberDecl);

                        this.emitClassMemberFunctionDeclaration(classDecl, memberFunction);
                        lastEmittedMember = memberDecl;
                    }
                }
            }

            // Now emit all the statics.
            for (var i = 0, n = classDecl.classElements.members.length; i < n; i++) {
                var memberDecl = classDecl.classElements.members[i];

                if (memberDecl.nodeType() === NodeType.MemberVariableDeclaration) {
                    var varDecl = <MemberVariableDeclaration>memberDecl;

                    if (hasFlag(varDecl.getVarFlags(), VariableFlags.Static) && varDecl.init) {
                        this.emitSpaceBetweenConstructs(lastEmittedMember, varDecl);

                        this.emitIndent();
                        this.recordSourceMappingStart(varDecl);

                        var varDeclName = varDecl.id.text();
                        if (isQuoted(varDeclName) || varDecl.id.isStringOrNumericLiteral) {
                            this.writeToOutput(classDecl.identifier.text() + "[" + varDeclName + "] = ");
                        }
                        else {
                            this.writeToOutput(classDecl.identifier.text() + "." + varDeclName + " = ");
                        }

                        varDecl.init.emit(this);

                        this.recordSourceMappingEnd(varDecl);
                        this.writeLineToOutput(";");

                        lastEmittedMember = varDecl;
                    }
                }
            }
        }

        private emitClassMemberFunctionDeclaration(classDecl: ClassDeclaration, funcDecl: MemberFunctionDeclaration): void {
            var functionFlags = funcDecl.getFunctionFlags();

            this.emitIndent();
            this.recordSourceMappingStart(funcDecl);
            this.emitComments(funcDecl, true);
            var functionName = funcDecl.name.text();

            this.writeToOutput(classDecl.identifier.text());

            if (!hasFlag(functionFlags, FunctionFlags.Static)) {
                this.writeToOutput(".prototype");
            }

            if (isQuoted(functionName) || funcDecl.name.isStringOrNumericLiteral) {
                this.writeToOutput("[" + functionName + "] = ");
            }
            else {
                this.writeToOutput("." + functionName + " = ");
            }

            var pullDecl = this.semanticInfoChain.getDeclForAST(funcDecl);
            this.pushDecl(pullDecl);

            this.recordSourceMappingStart(funcDecl);
            this.writeToOutput("function ");

            this.writeToOutput("(");
            this.emitFunctionParameters(funcDecl.parameterList);
            this.writeToOutput(")");

            this.emitFunctionBodyStatements(funcDecl.name.text(), funcDecl, funcDecl.parameterList, funcDecl.block);

            this.recordSourceMappingEnd(funcDecl);

            // The extra call is to make sure the caller's funcDecl end is recorded, since caller wont be able to record it
            this.recordSourceMappingEnd(funcDecl);

            this.emitComments(funcDecl, false);

            this.popDecl(pullDecl);

            this.writeLineToOutput(";");
        }

        private requiresExtendsBlock(moduleElements: ASTList): boolean {
            for (var i = 0, n = moduleElements.members.length; i < n; i++) {
                var moduleElement = moduleElements.members[i];

                if (moduleElement.nodeType() === NodeType.ModuleDeclaration) {
                    var moduleAST = <ModuleDeclaration>moduleElement;
                    if (!hasFlag(moduleAST.getModuleFlags(), ModuleFlags.Ambient) && this.requiresExtendsBlock(moduleAST.members)) {
                        return true;
                    }
                }
                else if (moduleElement.nodeType() === NodeType.ClassDeclaration) {
                    var classDeclaration = <ClassDeclaration>moduleElement;

                    if (!hasFlag(classDeclaration.getVarFlags(), VariableFlags.Ambient) && getExtendsHeritageClause(classDeclaration.heritageClauses) !== null) {
                        return true;
                    }
                }
            }

            return false;
        }

        public emitPrologue(script: Script) {
            if (!this.extendsPrologueEmitted) {
                if (this.requiresExtendsBlock(script.moduleElements)) {
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
                if (this.shouldCaptureThis(script)) {
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

        public emitBlockOrStatement(node: AST): void {
            if (node.nodeType() === NodeType.Block) {
                node.emit(this);
            }
            else {
                this.writeLineToOutput("");
                this.indenter.increaseIndent();
                this.emitJavascript(node, true);
                this.indenter.decreaseIndent();
            }
        }

        public emitLiteralExpression(expression: LiteralExpression): void {
            switch (expression.nodeType()) {
                case NodeType.NullLiteral:
                    this.writeToOutputWithSourceMapRecord("null", expression);
                    break;
                case NodeType.FalseLiteral:
                    this.writeToOutputWithSourceMapRecord("false", expression);
                    break;
                case NodeType.TrueLiteral:
                    this.writeToOutputWithSourceMapRecord("true", expression);
                    break;
                default:
                    throw Errors.abstract();
            }
        }

        public emitThisExpression(expression: ThisExpression): void {
            if (!this.inWithBlock && this.inArrowFunction) {
                this.writeToOutputWithSourceMapRecord("_this", expression);
            }
            else {
                this.writeToOutputWithSourceMapRecord("this", expression);
            }
        }

        public emitSuperExpression(expression: SuperExpression): void {
            this.writeToOutputWithSourceMapRecord("_super.prototype", expression);
        }

        public emitParenthesizedExpression(parenthesizedExpression: ParenthesizedExpression): void {
            if (parenthesizedExpression.expression.nodeType() === NodeType.CastExpression && parenthesizedExpression.openParenTrailingComments === null) {
                // We have an expression of the form: (<Type>SubExpr)
                // Emitting this as (SubExpr) is really not desirable.  Just emit the subexpr as is.
                parenthesizedExpression.expression.emit(this);
            }
            else {
                this.recordSourceMappingStart(parenthesizedExpression);
                this.writeToOutput("(");
                this.emitCommentsArray(parenthesizedExpression.openParenTrailingComments, /*trailing:*/ false);
                parenthesizedExpression.expression.emit(this);
                this.writeToOutput(")");
                this.recordSourceMappingEnd(parenthesizedExpression);
            }
        }

        public emitCastExpression(expression: CastExpression): void {
            expression.operand.emit(this);
        }

        public emitPrefixUnaryExpression(expression: PrefixUnaryExpression): void {
            var nodeType = expression.nodeType();

            this.recordSourceMappingStart(expression);
            switch (nodeType) {
                case NodeType.LogicalNotExpression:
                    this.writeToOutput("!");
                    expression.operand.emit(this);
                    break;
                case NodeType.BitwiseNotExpression:
                    this.writeToOutput("~");
                    expression.operand.emit(this);
                    break;
                case NodeType.NegateExpression:
                    this.writeToOutput("-");
                    if (expression.operand.nodeType() === NodeType.NegateExpression || expression.operand.nodeType() === NodeType.PreDecrementExpression) {
                        this.writeToOutput(" ");
                    }
                    expression.operand.emit(this);
                    break;
                case NodeType.PlusExpression:
                    this.writeToOutput("+");
                    if (expression.operand.nodeType() === NodeType.PlusExpression || expression.operand.nodeType() === NodeType.PreIncrementExpression) {
                        this.writeToOutput(" ");
                    }
                    expression.operand.emit(this);
                    break;
                case NodeType.PreIncrementExpression:
                    this.writeToOutput("++");
                    expression.operand.emit(this);
                    break;
                case NodeType.PreDecrementExpression:
                    this.writeToOutput("--");
                    expression.operand.emit(this);
                    break;
                default:
                    throw Errors.abstract();
            }

            this.recordSourceMappingEnd(expression);
        }

        public emitPostfixUnaryExpression(expression: PostfixUnaryExpression): void {
            var nodeType = expression.nodeType();

            this.recordSourceMappingStart(expression);
            switch (nodeType) {
                case NodeType.PostIncrementExpression:
                    expression.operand.emit(this);
                    this.writeToOutput("++");
                    break;
                case NodeType.PostDecrementExpression:
                    expression.operand.emit(this);
                    this.writeToOutput("--");
                    break;
                default:
                    throw Errors.abstract();
            }

            this.recordSourceMappingEnd(expression);
        }

        public emitTypeOfExpression(expression: TypeOfExpression): void {
            this.recordSourceMappingStart(expression);
            this.writeToOutput("typeof ");
            expression.expression.emit(this);
            this.recordSourceMappingEnd(expression);
        }

        public emitDeleteExpression(expression: DeleteExpression): void {
            this.recordSourceMappingStart(expression);
            this.writeToOutput("delete ");
            expression.expression.emit(this);
            this.recordSourceMappingEnd(expression);
        }

        public emitVoidExpression(expression: VoidExpression): void {
            this.recordSourceMappingStart(expression);
            this.writeToOutput("void ");
            expression.expression.emit(this);
            this.recordSourceMappingEnd(expression);
        }

        public emitMemberAccessExpression(expression: MemberAccessExpression): void {
            this.recordSourceMappingStart(expression);

            if (!this.tryEmitConstant(expression)) {
                expression.expression.emit(this);
                this.writeToOutput(".");
                this.emitName(expression.name, false);
            }

            this.recordSourceMappingEnd(expression);
        }

        public emitQualifiedName(name: QualifiedName): void {
            this.recordSourceMappingStart(name);

            name.left.emit(this);
            this.writeToOutput(".");
            this.emitName(name.right, false);

            this.recordSourceMappingEnd(name);
        }

        public emitBinaryExpression(expression: BinaryExpression): void {
            this.recordSourceMappingStart(expression);
            switch (expression.nodeType()) {
                case NodeType.CommaExpression:
                    expression.left.emit(this);
                    this.writeToOutput(", ");
                    expression.right.emit(this);
                    break;
                default:
                    {
                        expression.left.emit(this);
                        var binOp = BinaryExpression.getTextForBinaryToken(expression.nodeType());
                        if (binOp === "instanceof") {
                            this.writeToOutput(" instanceof ");
                        }
                        else if (binOp === "in") {
                            this.writeToOutput(" in ");
                        }
                        else {
                            this.writeToOutput(" " + binOp + " ");
                        }
                        expression.right.emit(this);
                    }
            }
            this.recordSourceMappingEnd(expression);
        }

        public emitSimplePropertyAssignment(property: SimplePropertyAssignment): void {
            this.recordSourceMappingStart(property);
            property.propertyName.emit(this);
            this.writeToOutput(": ");
            property.expression.emit(this);
            this.recordSourceMappingEnd(property);
        }

        public emitFunctionPropertyAssignment(funcProp: FunctionPropertyAssignment): void {
            this.recordSourceMappingStart(funcProp);

            funcProp.propertyName.emit(this);
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
            this.emitFunctionParameters(funcProp.parameterList);
            this.writeToOutput(")");

            this.emitFunctionBodyStatements(funcProp.propertyName.text(), funcProp, funcProp.parameterList, funcProp.block);

            this.recordSourceMappingEnd(funcProp);

            // The extra call is to make sure the caller's funcDecl end is recorded, since caller wont be able to record it
            this.recordSourceMappingEnd(funcProp);

            this.emitComments(funcProp, false);

            this.popDecl(pullDecl);

            this.setContainer(temp);
            this.inArrowFunction = savedInArrowFunction;

            this.recordSourceMappingEnd(funcProp);
        }

        public emitConditionalExpression(expression: ConditionalExpression): void {
            expression.condition.emit(this);
            this.writeToOutput(" ? ");
            expression.whenTrue.emit(this);
            this.writeToOutput(" : ");
            expression.whenFalse.emit(this);
        }

        public emitThrowStatement(statement: ThrowStatement): void {
            this.recordSourceMappingStart(statement);
            this.writeToOutput("throw ");
            statement.expression.emit(this);
            this.recordSourceMappingEnd(statement);
            this.writeToOutput(";");
        }

        public emitExpressionStatement(statement: ExpressionStatement): void {
            var isArrowExpression = statement.expression.nodeType() === NodeType.ArrowFunctionExpression;

            this.recordSourceMappingStart(statement);
            if (isArrowExpression) {
                this.writeToOutput("(");
            }

            statement.expression.emit(this);

            if (isArrowExpression) {
                this.writeToOutput(")");
            }

            this.recordSourceMappingEnd(statement);
            this.writeToOutput(";");
        }

        public emitLabeledStatement(statement: LabeledStatement): void {
            this.writeToOutputWithSourceMapRecord(statement.identifier.text(), statement.identifier);
            this.writeLineToOutput(":");
            this.emitJavascript(statement.statement, /*startLine:*/ true);
        }

        public emitBlock(block: Block): void {
            this.recordSourceMappingStart(block);
            this.writeLineToOutput(" {");
            this.indenter.increaseIndent();
            if (block.statements) {
                this.emitList(block.statements);
            }
            this.emitCommentsArray(block.closeBraceLeadingComments, /*trailing:*/ false);
            this.indenter.decreaseIndent();
            this.emitIndent();
            this.writeToOutput("}");
            this.recordSourceMappingEnd(block);
        }

        public emitBreakStatement(jump: BreakStatement): void {
            this.recordSourceMappingStart(jump);
            this.writeToOutput("break");

            if (jump.identifier) {
                this.writeToOutput(" " + jump.identifier);
            }

            this.recordSourceMappingEnd(jump);
            this.writeToOutput(";");
        }

        public emitContinueStatement(jump: ContinueStatement): void {
            this.recordSourceMappingStart(jump);
            this.writeToOutput("continue");

            if (jump.identifier) {
                this.writeToOutput(" " + jump.identifier);
            }

            this.recordSourceMappingEnd(jump);
            this.writeToOutput(";");
        }

        public emitWhileStatement(statement: WhileStatement): void {
            this.recordSourceMappingStart(statement);
            this.writeToOutput("while (");
            statement.condition.emit(this);
            this.writeToOutput(")");
            this.emitBlockOrStatement(statement.statement);
            this.recordSourceMappingEnd(statement);
        }

        public emitDoStatement(statement: DoStatement): void {
            this.recordSourceMappingStart(statement);
            this.writeToOutput("do");
            this.emitBlockOrStatement(statement.statement);
            this.writeToOutputWithSourceMapRecord(" while", statement.whileSpan);
            this.writeToOutput('(');
            statement.condition.emit(this);
            this.writeToOutput(")");
            this.recordSourceMappingEnd(statement);
            this.writeToOutput(";");
        }

        public emitIfStatement(statement: IfStatement): void {
            this.recordSourceMappingStart(statement);
            this.writeToOutput("if (");
            statement.condition.emit(this);
            this.writeToOutput(")");

            this.emitBlockOrStatement(statement.statement);

            if (statement.elseClause) {
                if (statement.statement.nodeType() !== NodeType.Block) {
                    this.writeLineToOutput("");
                    this.emitIndent();
                }
                else {
                    this.writeToOutput(" ");
                }

                statement.elseClause.emit(this);
            }
            this.recordSourceMappingEnd(statement);
        }

        public emitElseClause(elseClause: ElseClause): void {
            if (elseClause.statement.nodeType() === NodeType.IfStatement) {
                this.writeToOutput("else ");
                elseClause.statement.emit(this);
            }
            else {
                this.writeToOutput("else");
                this.emitBlockOrStatement(elseClause.statement);
            }
        }

        public emitReturnStatement(statement: ReturnStatement): void {
            this.recordSourceMappingStart(statement);
            if (statement.expression) {
                this.writeToOutput("return ");
                statement.expression.emit(this);
            }
            else {
                this.writeToOutput("return");
            }
            this.recordSourceMappingEnd(statement);
            this.writeToOutput(";");
        }

        public emitForInStatement(statement: ForInStatement): void {
            this.recordSourceMappingStart(statement);
            this.writeToOutput("for (");
            statement.variableDeclaration.emit(this);
            this.writeToOutput(" in ");
            statement.expression.emit(this);
            this.writeToOutput(")");
            this.emitBlockOrStatement(statement.statement);
            this.recordSourceMappingEnd(statement);
        }

        public emitForStatement(statement: ForStatement): void {
            this.recordSourceMappingStart(statement);
            this.writeToOutput("for (");
            if (statement.init) {
                if (statement.init.nodeType() !== NodeType.List) {
                    statement.init.emit(this);
                }
                else {
                    this.emitCommaSeparatedList(<ASTList>statement.init);
                }
            }

            this.writeToOutput("; ");
            this.emitJavascript(statement.cond, false);
            this.writeToOutput(";");
            if (statement.incr) {
                this.writeToOutput(" ");
                this.emitJavascript(statement.incr, false);
            }
            this.writeToOutput(")");
            this.emitBlockOrStatement(statement.body);
            this.recordSourceMappingEnd(statement);
        }

        public emitWithStatement(statement: WithStatement): void {
            this.recordSourceMappingStart(statement);
            this.writeToOutput("with (");
            if (statement.condition) {
                statement.condition.emit(this);
            }

            this.writeToOutput(")");
            var prevInWithBlock = this.inWithBlock;
            this.inWithBlock = true;
            this.emitBlockOrStatement(statement.statement);
            this.inWithBlock = prevInWithBlock;
            this.recordSourceMappingEnd(statement);
        }

        public emitSwitchStatement(statement: SwitchStatement): void {
            this.recordSourceMappingStart(statement);
            this.recordSourceMappingStart(statement.statement);
            this.writeToOutput("switch (");
            statement.expression.emit(this);
            this.writeToOutput(")");
            this.recordSourceMappingEnd(statement.statement);
            this.writeLineToOutput(" {");
            this.indenter.increaseIndent();
            this.emitList(statement.caseList, /*useNewLineSeparator:*/ false);
            this.indenter.decreaseIndent();
            this.emitIndent();
            this.writeToOutput("}");
            this.recordSourceMappingEnd(statement);
        }

        public emitCaseSwitchClause(clause: CaseSwitchClause): void {
            this.recordSourceMappingStart(clause);
            this.writeToOutput("case ");
            clause.expr.emit(this);
            this.writeToOutput(":");

            this.emitSwitchClauseBody(clause.body);
            this.recordSourceMappingEnd(clause);
        }

        private emitSwitchClauseBody(body: ASTList): void {
            if (body.members.length === 1 && body.members[0].nodeType() === NodeType.Block) {
                // The case statement was written with curly braces, so emit it with the appropriate formatting
                body.members[0].emit(this);
                this.writeLineToOutput("");
            }
            else {
                // No curly braces. Format in the expected way
                this.writeLineToOutput("");
                this.indenter.increaseIndent();
                body.emit(this);
                this.indenter.decreaseIndent();
            }
        }

        public emitDefaultSwitchClause(clause: DefaultSwitchClause): void {
            this.recordSourceMappingStart(clause);
            this.writeToOutput("default");
            this.writeToOutput(":");

            this.emitSwitchClauseBody(clause.body);
            this.recordSourceMappingEnd(clause);
        }

        public emitTryStatement(statement: TryStatement): void {
            this.recordSourceMappingStart(statement);
            this.writeToOutput("try ");
            statement.block.emit(this);
            this.emitJavascript(statement.catchClause, false);

            if (statement.finallyBody) {
                this.writeToOutput(" finally");
                statement.finallyBody.emit(this);
            }
            this.recordSourceMappingEnd(statement);
        }

        public emitCatchClause(clause: CatchClause): void {
            this.writeToOutput(" ");
            this.recordSourceMappingStart(clause);
            this.writeToOutput("catch (");
            clause.param.id.emit(this);
            this.writeToOutput(")");
            clause.block.emit(this);
            this.recordSourceMappingEnd(clause);
        }

        public emitDebuggerStatement(statement: DebuggerStatement): void {
            this.writeToOutputWithSourceMapRecord("debugger", statement);
            this.writeToOutput(";");
        }

        public emitNumericLiteral(literal: NumericLiteral): void {
            this.writeToOutputWithSourceMapRecord(literal.text(), literal);
        }

        public emitRegularExpressionLiteral(literal: RegularExpressionLiteral): void {
            this.writeToOutputWithSourceMapRecord(literal.text, literal);
        }

        public emitStringLiteral(literal: StringLiteral): void {
            this.writeToOutputWithSourceMapRecord(literal.text(), literal);
        }

        public emitParameter(parameter: Parameter): void {
            this.writeToOutputWithSourceMapRecord(parameter.id.text(), parameter);
        }

        private isNonAmbientAndNotSignature(flags: FunctionFlags): boolean {
            return !hasFlag(flags, FunctionFlags.Signature) &&
                   !hasFlag(flags, FunctionFlags.Ambient);
        }

        public shouldEmitConstructorDeclaration(declaration: ConstructorDeclaration): boolean {
            return declaration.preComments() !== null || this.isNonAmbientAndNotSignature(declaration.getFunctionFlags());
        }

        public emitConstructorDeclaration(declaration: ConstructorDeclaration): void {
            if (this.isNonAmbientAndNotSignature(declaration.getFunctionFlags())) {
                this.emitConstructor(declaration);
            }
            else {
                this.emitComments(declaration, /*pre:*/ true, /*onlyPinnedOrTripleSlashComments:*/ true);
            }
        }

        public shouldEmitFunctionDeclaration(declaration: FunctionDeclaration): boolean {
            return declaration.preComments() !== null || this.isNonAmbientAndNotSignature(declaration.getFunctionFlags());
        }

        public emitFunctionDeclaration(declaration: FunctionDeclaration): void {
            if (this.isNonAmbientAndNotSignature(declaration.getFunctionFlags())) {
                this.emitFunction(declaration);
            }
            else {
                this.emitComments(declaration, /*pre:*/ true, /*onlyPinnedOrTripleSlashComments:*/ true);
            }
        }

        public emitScript(script: Script): void {
            if (!script.isDeclareFile()) {
                this.emitScriptElements(script);
            }
        }

        private scriptIsElided(script: Script): boolean {
            if (hasFlag(script.getModuleFlags(), ModuleFlags.Ambient)) {
                return true;
            }

            return this.moduleMembersAreElided(script.moduleElements);
        }

        private enumIsElided(declaration: EnumDeclaration): boolean {
            if (hasFlag(declaration.getModuleFlags(), ModuleFlags.Ambient)) {
                return true;
            }

            return false;
        }

        private moduleIsElided(declaration: ModuleDeclaration): boolean {
            if (hasFlag(declaration.getModuleFlags(), ModuleFlags.Ambient)) {
                return true;
            }

            return this.moduleMembersAreElided(declaration.members);
        }

        private moduleMembersAreElided(members: ASTList): boolean {
            for (var i = 0, n = members.members.length; i < n; i++) {
                var member = members.members[i];

                // We should emit *this* module if it contains any non-interface types. 
                // Caveat: if we have contain a module, then we should be emitted *if we want to
                // emit that inner module as well.
                if (member.nodeType() === NodeType.ModuleDeclaration) {
                    if (!this.moduleIsElided(<ModuleDeclaration>member)) {
                        return false;
                    }
                }
                else if (member.nodeType() !== NodeType.InterfaceDeclaration) {
                    return false;
                }
            }

            return true;
        }

        public shouldEmitEnumDeclaration(declaration: EnumDeclaration): boolean {
            return declaration.preComments() !== null || ! this.enumIsElided(declaration);
        }

        public emitEnumDeclaration(declaration: EnumDeclaration): void {
            if (!this.enumIsElided(declaration)) {
                this.emitComments(declaration, true);
                this.emitEnum(declaration);
                this.emitComments(declaration, false);
            }
            else {
                this.emitComments(declaration, true, /*onlyPinnedOrTripleSlashComments:*/ true);
            }
        }

        public shouldEmitModuleDeclaration(declaration: ModuleDeclaration): boolean {
            return declaration.preComments() !== null || !this.moduleIsElided(declaration);
        }

        public emitModuleDeclaration(declaration: ModuleDeclaration): void {
            if (!this.moduleIsElided(declaration)) {
                this.emitComments(declaration, true);
                this.emitModule(declaration);
                this.emitComments(declaration, false);
            }
            else {
                this.emitComments(declaration, true, /*onlyPinnedOrTripleSlashComments:*/ true);
            }
        }

        public shouldEmitClassDeclaration(declaration: ClassDeclaration): boolean {
            return declaration.preComments() !== null || !hasFlag(declaration.getVarFlags(), VariableFlags.Ambient);
        }

        public emitClassDeclaration(declaration: ClassDeclaration): void {
            if (!hasFlag(declaration.getVarFlags(), VariableFlags.Ambient)) {
                this.emitClass(declaration);
            }
            else {
                this.emitComments(declaration, /*pre:*/ true, /*onlyPinnedOrTripleSlashComments:*/ true);
            }
        }

        public shouldEmitInterfaceDeclaration(declaration: InterfaceDeclaration): boolean {
            return declaration.preComments() !== null;
        }

        public emitInterfaceDeclaration(declaration: InterfaceDeclaration): void {
            this.emitComments(declaration, /*pre:*/ true, /*onlyPinnedOrTripleSlashComments:*/ true);
        }

        private firstVariableDeclarator(statement: VariableStatement): VariableDeclarator {
            return <VariableDeclarator>statement.declaration.declarators.members[0];
        }

        private isNotAmbientOrHasInitializer(varDecl: VariableDeclarator): boolean {
            return !hasFlag(varDecl.getVarFlags(), VariableFlags.Ambient) || varDecl.init !== null;
        }

        public shouldEmitVariableStatement(statement: VariableStatement): boolean {
            var varDecl = this.firstVariableDeclarator(statement);
            return varDecl.preComments() !== null || this.isNotAmbientOrHasInitializer(varDecl);
        }

        public emitVariableStatement(statement: VariableStatement): void {
            var varDecl = this.firstVariableDeclarator(statement);
            if (this.isNotAmbientOrHasInitializer(varDecl)) {
                statement.declaration.emit(this);
                this.writeToOutput(";");
            }
            else {
                this.emitComments(varDecl, /*pre:*/ true, /*onlyPinnedOrTripleSlashComments:*/ true);
            }
        }

        public emitGenericType(type: GenericType): void {
            type.name.emit(this);
        }
    }

    export function getLastConstructor(classDecl: ClassDeclaration): ConstructorDeclaration {
        return <ConstructorDeclaration>ArrayUtilities.lastOrDefault(classDecl.classElements.members,
            m => m.nodeType() === NodeType.ConstructorDeclaration);
    }
}