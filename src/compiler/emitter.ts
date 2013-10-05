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

///<reference path='typescript.ts' />

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
        public ioHost: EmitterIOHost = null;
        public outputMany: boolean = true;
        public commonDirectoryPath = "";

        constructor(public compilationSettings: CompilationSettings) {
        }

        public mapOutputFileName(document: Document, extensionChanger: (fname: string, wholeFileNameReplaced: boolean) => string) {
            if (this.outputMany || document.script.isExternalModule) {
                var updatedFileName = document.fileName;
                if (this.compilationSettings.outDirOption !== "") {
                    // Replace the common directory path with the option specified
                    updatedFileName = document.fileName.replace(this.commonDirectoryPath, "");
                    updatedFileName = this.compilationSettings.outDirOption + updatedFileName;
                }
                return extensionChanger(updatedFileName, false);
            } else {
                return extensionChanger(this.compilationSettings.outFileOption, true);
            }
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
        public allSourceMappers: SourceMapper[] = [];
        public sourceMapper: SourceMapper = null;
        public captureThisStmtString = "var _this = this;";
        private currentVariableDeclaration: VariableDeclaration;
        private declStack: PullDecl[] = [];
        private resolvingContext = new PullTypeResolutionContext(null);
        private exportAssignmentIdentifier: string = null;

        public document: Document = null;
        private copyrightElement: AST = null;

        constructor(public emittingFileName: string,
            public outfile: ITextWriter,
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
            var isAmdCodeGen = this.emitOptions.compilationSettings.moduleGenTarget == ModuleGenTarget.Asynchronous;

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

                return importSymbol.isUsedAsValue;
            }

            return false;
        }

        public emitImportDeclaration(importDeclAST: ImportDeclaration) {
            var isExternalModuleReference = importDeclAST.isExternalImportDeclaration();
            var importDecl = this.semanticInfoChain.getDeclForAST(importDeclAST);
            var isExported = hasFlag(importDecl.flags, PullElementFlags.Exported);
            var isAmdCodeGen = this.emitOptions.compilationSettings.moduleGenTarget == ModuleGenTarget.Asynchronous;

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
                this.writeToOutput(importDeclAST.id.actualText + " = ");
                var aliasAST = importDeclAST.alias.nodeType() === NodeType.TypeRef ? (<TypeReference>importDeclAST.alias).term : importDeclAST.alias;

                if (isExternalModuleReference) {
                    this.writeToOutput("require(" + (<Identifier>aliasAST).actualText + ")");
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
                this.writeToOutputWithSourceMapRecord(moduleNamePrefix + importDeclAST.id.actualText + " = " + importDeclAST.id.actualText, importDeclAST);
                this.writeToOutput(";");
            }
            this.emitComments(importDeclAST, false);
        }

        public createSourceMapper(document: Document, jsFileName: string, jsFile: ITextWriter, sourceMapOut: ITextWriter) {
            this.sourceMapper = new SourceMapper(jsFile, sourceMapOut, document, jsFileName, this.emitOptions);
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

        public writeLineToOutput(s: string) {
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

        public emitComment(comment: Comment) {
            if (this.emitOptions.compilationSettings.removeComments) {
                return;
            }

            var text = comment.getText();
            var emitColumn = this.emitState.column;

            if (emitColumn === 0) {
                this.emitIndent();
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

            if (emitColumn != 0) {
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

                this.emitCommentsArray(preComments);
            }
            else {
                this.emitCommentsArray(ast.postComments());
            }
        }

        public emitCommentsArray(comments: Comment[]): void {
            if (!this.emitOptions.compilationSettings.removeComments && comments) {
                for (var i = 0, n = comments.length; i < n; i++) {
                    this.emitComment(comments[i]);
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
            if (target.nodeType() === NodeType.TypeRef) {
                var typeRef = <TypeReference>target;
                if (typeRef.arrayCount) {
                    this.writeToOutput("Array()");
                }
                else {
                    typeRef.term.emit(this);
                    this.writeToOutput("()");
                }
            }
            else {
                target.emit(this);
                this.recordSourceMappingStart(args);
                this.writeToOutput("(");
                this.emitCommaSeparatedList(args);
                this.writeToOutputWithSourceMapRecord(")", objectCreationExpression.closeParenSpan);
                this.recordSourceMappingEnd(args);
            }
            this.recordSourceMappingEnd(objectCreationExpression);
        }

        public getConstantDecl(dotExpr: BinaryExpression): VariableDeclarator {
            var pullSymbol = this.semanticInfoChain.getSymbolForAST(dotExpr);
            if (pullSymbol && pullSymbol.hasFlag(PullElementFlags.Constant)) {
                var pullDecls = pullSymbol.getDeclarations();
                if (pullDecls.length === 1) {
                    var pullDecl = pullDecls[0];
                    var ast = this.semanticInfoChain.getASTForDecl(pullDecl);
                    if (ast && ast.nodeType() === NodeType.VariableDeclarator) {
                        var varDecl = <VariableDeclarator>ast;
                        // If the enum member declaration is in an ambient context, don't propagate the constant because 
                        // the ambient enum member may have been generated based on a computed value - unless it is
                        // explicitly initialized in the ambient enum to an integer constant.
                        var memberIsAmbient = hasFlag(pullDecl.getParentDecl().flags, PullElementFlags.Ambient);
                        var memberIsInitialized = varDecl.init != null;
                        if (!memberIsAmbient || memberIsInitialized) {
                            return varDecl;
                        }
                    }
                }
            }

            return null;
        }

        public tryEmitConstant(dotExpr: BinaryExpression) {
            if (!this.emitOptions.compilationSettings.propagateEnumConstants) {
                return false;
            }
            var propertyName = <Identifier>dotExpr.operand2;
            var boundDecl = this.getConstantDecl(dotExpr);
            if (boundDecl) {
                var value = boundDecl.constantValue;
                if (value !== null) {
                    this.writeToOutput(value.toString());
                    var comment = " /* ";
                    comment += propertyName.actualText;
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

            if (target.nodeType() === NodeType.MemberAccessExpression && (<BinaryExpression>target).operand1.nodeType() === NodeType.SuperExpression) {
                var dotNode = <BinaryExpression>target;
                dotNode.emit(this);
                this.writeToOutput(".call");
                this.recordSourceMappingStart(args);
                this.writeToOutput("(");
                this.emitThis();
                if (args && args.members.length > 0) {
                    this.writeToOutput(", ");
                    this.emitCommaSeparatedList(args);
                }
            } else {
                if (target.nodeType() === NodeType.FunctionDeclaration) {
                    this.writeToOutput("(");
                }
                if (callNode.target.nodeType() === NodeType.SuperExpression && this.emitState.container === EmitContainer.Constructor) {
                    this.writeToOutput("_super.call");
                }
                else {
                    this.emitJavascript(target, false);
                }
                if (target.nodeType() === NodeType.FunctionDeclaration) {
                    this.writeToOutput(")");
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

            /// REVIEW: The code below causes functions to get pushed to a newline in cases where they shouldn't
            /// such as: 
            ///     Foo.prototype.bar = 
            ///         function() {
            ///         };
            /// Once we start emitting comments, we should pull this code out to place on the outer context where the function
            /// is used.
            //if (funcDecl.preComments!=null && funcDecl.preComments.length>0) {
            //    this.writeLineToOutput("");
            //    this.increaseIndent();
            //    emitIndent();
            //}

            var pullDecl = this.semanticInfoChain.getDeclForAST(funcDecl);
            this.pushDecl(pullDecl);

            // We have no way of knowing if the current function is used as an expression or a statement, so as to enusre that the emitted
            // JavaScript is always valid, add an extra parentheses for unparenthesized function expressions
            var shouldParenthesize = false;// hasFlag(funcDecl.getFunctionFlags(), FunctionFlags.IsFunctionExpression) && !funcDecl.isAccessor() && (hasFlag(funcDecl.getFlags(), ASTFlags.ExplicitSemicolon) || hasFlag(funcDecl.getFlags(), ASTFlags.AutomaticSemicolon));

            if (includePreComments) {
                this.emitComments(funcDecl, true);
            }

            if (shouldParenthesize) {
                this.writeToOutput("(");
            }
            this.recordSourceMappingStart(funcDecl);
            var accessorSymbol = funcDecl.isAccessor() ? PullHelpers.getAccessorSymbol(funcDecl, this.semanticInfoChain) : null;
            var container = accessorSymbol ? accessorSymbol.getContainer() : null;
            var containerKind = container ? container.kind : PullElementKind.None;
            if (!(funcDecl.isAccessor() && containerKind !== PullElementKind.Class && containerKind !== PullElementKind.ConstructorType)) {
                this.writeToOutput("function ");
            }

            if (hasFlag(funcDecl.getFunctionFlags(), FunctionFlags.Constructor)) {
                this.writeToOutput(this.thisClassNode.name.actualText);
            }

            if (printName) {
                var id = funcDecl.getNameText();
                if (id && !funcDecl.isAccessor()) {
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
            this.emitFunctionParameters(funcDecl.parameters);
            this.writeLineToOutput(") {");

            if (hasFlag(funcDecl.getFunctionFlags(), FunctionFlags.Constructor)) {
                this.recordSourceMappingNameStart("constructor");
            } else if (funcDecl.isGetAccessor()) {
                this.recordSourceMappingNameStart("get_" + funcDecl.getNameText());
            } else if (funcDecl.isSetAccessor()) {
                this.recordSourceMappingNameStart("set_" + funcDecl.getNameText());
            } else {
                this.recordSourceMappingNameStart(funcDecl.getNameText());
            }
            this.indenter.increaseIndent();

            this.emitDefaultValueAssignments(funcDecl.parameters);
            this.emitRestParameterInitializer(funcDecl.parameters);

            if (this.shouldCaptureThis(funcDecl)) {
                this.writeCaptureThisStatement(funcDecl);
            }

            if (hasFlag(funcDecl.getFunctionFlags(), FunctionFlags.Constructor)) {
                this.emitConstructorStatements(funcDecl);
            }
            else {
                this.emitList(funcDecl.block.statements);
            }

            this.emitCommentsArray(funcDecl.block.closeBraceLeadingComments);

            this.indenter.decreaseIndent();
            this.emitIndent();
            this.writeToOutputWithSourceMapRecord("}", funcDecl.block.closeBraceSpan);

            this.recordSourceMappingNameEnd();
            this.recordSourceMappingEnd(funcDecl);

            if (shouldParenthesize) {
                this.writeToOutput(")");
            }

            // The extra call is to make sure the caller's funcDecl end is recorded, since caller wont be able to record it
            this.recordSourceMappingEnd(funcDecl);

            this.emitComments(funcDecl, false);

            this.popDecl(pullDecl);
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
                    this.writeToOutput("if (typeof " + arg.id.actualText + " === \"undefined\") { ");//
                    this.writeToOutputWithSourceMapRecord(arg.id.actualText, arg.id);
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
                this.writeToOutputWithSourceMapRecord(lastArg.id.actualText, lastArg.id);
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

                this.writeToOutputWithSourceMapRecord(lastArg.id.actualText + "[_i] = arguments[_i + " + (n - 1) + "];", lastArg);
                this.writeLineToOutput("");
                this.indenter.decreaseIndent();
                this.emitIndent();
                this.writeLineToOutput("}");
            }
        }

        private getImportDecls(fileName: string): PullDecl[] {
            var topLevelDecl = this.semanticInfoChain.getTopLevelDecl(this.document.fileName);
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

                    if (importStatementSymbol.isUsedAsValue) {
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
                var scriptDecl = this.semanticInfoChain.getTopLevelDecl(this.document.fileName);
                return (scriptDecl.flags & PullElementFlags.MustCaptureThis) === PullElementFlags.MustCaptureThis;
            }

            var decl = this.semanticInfoChain.getDeclForAST(ast);
            if (decl) {
                return (decl.flags & PullElementFlags.MustCaptureThis) === PullElementFlags.MustCaptureThis;
            }

            return false;
        }

        public emitModule(moduleDecl: ModuleDeclaration) {
            var pullDecl = this.semanticInfoChain.getDeclForAST(moduleDecl);
            this.pushDecl(pullDecl);

            var svModuleName = this.moduleName;
            this.moduleName = moduleDecl.name.actualText;
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
                this.writeToOutputWithSourceMapRecord(this.moduleName, moduleDecl.name);
                this.writeLineToOutput(") {");

                this.recordSourceMappingNameStart(this.moduleName);
            }

            // body - don't indent for Node
            if (!isExternalModule || this.emitOptions.compilationSettings.moduleGenTarget === ModuleGenTarget.Asynchronous) {
                this.indenter.increaseIndent();
            }

            if (this.shouldCaptureThis(moduleDecl)) {
                this.writeCaptureThisStatement(moduleDecl);
            }

            this.emitList(moduleDecl.members);
            if (!isExternalModule || this.emitOptions.compilationSettings.moduleGenTarget === ModuleGenTarget.Asynchronous) {
                this.indenter.decreaseIndent();
            }
            this.emitIndent();

            // epilogue
            if (isExternalModule) {
                var exportAssignmentIdentifier = this.getExportAssignmentIdentifier();
                var exportAssignmentValueSymbol = (<PullContainerSymbol>pullDecl.getSymbol()).getExportAssignedValueSymbol();

                if (this.emitOptions.compilationSettings.moduleGenTarget === ModuleGenTarget.Asynchronous) { // AMD
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

        public emitEnumElement(varDecl: VariableDeclarator): void {
            // <EnumName>[<EnumName>["<MemberName>"] = <MemberValue>] = "<MemberName>";
            this.emitComments(varDecl, true);
            this.recordSourceMappingStart(varDecl);
            var name = varDecl.id.actualText;
            var quoted = isQuoted(name);
            this.writeToOutput(this.moduleName);
            this.writeToOutput('[');
            this.writeToOutput(this.moduleName);
            this.writeToOutput('[');
            this.writeToOutput(quoted ? name : '"' + name + '"');
            this.writeToOutput('] = ');

            if (varDecl.init) {
                varDecl.init.emit(this);
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

        public emitIndex(operand1: AST, operand2: AST) {
            operand1.emit(this);
            this.writeToOutput("[");
            operand2.emit(this);
            this.writeToOutput("]");
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
            this.emitFunctionParameters(arrowFunction.parameters);
            this.writeLineToOutput(") {");

            this.recordSourceMappingNameStart(arrowFunction.getNameText());

            this.indenter.increaseIndent();

            this.emitDefaultValueAssignments(arrowFunction.parameters);
            this.emitRestParameterInitializer(arrowFunction.parameters);

            if (this.shouldCaptureThis(arrowFunction)) {
                this.writeCaptureThisStatement(arrowFunction);
            }

            this.emitList(arrowFunction.block.statements);

            this.emitCommentsArray(arrowFunction.block.closeBraceLeadingComments);

            this.indenter.decreaseIndent();
            this.emitIndent();
            this.writeToOutputWithSourceMapRecord("}", arrowFunction.block.closeBraceSpan);

            this.recordSourceMappingNameEnd();
            this.recordSourceMappingEnd(arrowFunction);

            // The extra call is to make sure the caller's funcDecl end is recorded, since caller wont be able to record it
            this.recordSourceMappingEnd(arrowFunction);

            this.emitComments(arrowFunction, false);

            this.popDecl(pullDecl);
            this.setContainer(temp);
            this.inArrowFunction = savedInArrowFunction;
        }

        public emitFunction(funcDecl: FunctionDeclaration) {
            if (hasFlag(funcDecl.getFunctionFlags(), FunctionFlags.Signature) /*|| funcDecl.isOverload*/) {
                return;
            }
            var temp: number;
            var savedInArrowFunction = this.inArrowFunction;
            this.inArrowFunction = false;

            if (hasFlag(funcDecl.getFunctionFlags(), FunctionFlags.Constructor)) {
                temp = this.setContainer(EmitContainer.Constructor);
            }
            else {
                temp = this.setContainer(EmitContainer.Function);
            }

            var funcName = funcDecl.getNameText();

            if (((temp !== EmitContainer.Constructor) ||
                ((funcDecl.getFunctionFlags() & FunctionFlags.Method) === FunctionFlags.None))) {
                this.recordSourceMappingStart(funcDecl);
                this.emitInnerFunction(funcDecl, (funcDecl.name && !funcDecl.name.isMissing()));
            }
            this.setContainer(temp);
            this.inArrowFunction = savedInArrowFunction;

            if (!hasFlag(funcDecl.getFunctionFlags(), FunctionFlags.Signature)) {
                var pullFunctionDecl = this.semanticInfoChain.getDeclForAST(funcDecl);
                if (hasFlag(funcDecl.getFunctionFlags(), FunctionFlags.Static)) {
                    if (this.thisClassNode) {
                        this.writeLineToOutput("");
                        if (funcDecl.isAccessor()) {
                            this.emitPropertyAccessor(funcDecl, this.thisClassNode.name.actualText, false);
                        }
                        else {
                            this.emitIndent();
                            this.recordSourceMappingStart(funcDecl);
                            this.writeToOutput(this.thisClassNode.name.actualText + "." + funcName + " = " + funcName + ";");
                            this.recordSourceMappingEnd(funcDecl);
                        }
                    }
                }
                else if ((this.emitState.container === EmitContainer.Module || this.emitState.container === EmitContainer.DynamicModule) && pullFunctionDecl && hasFlag(pullFunctionDecl.flags, PullElementFlags.Exported)) {
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
                this.writeToOutputWithSourceMapRecord(varDecl.id.actualText, varDecl.id);
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
            var inClass = parentKind === PullElementKind.Class;

            this.emitComments(declaration, true);

            var pullVarDecl = this.semanticInfoChain.getDeclForAST(varDecl);
            var isAmbientWithoutInit = pullVarDecl && hasFlag(pullVarDecl.flags, PullElementFlags.Ambient) && varDecl.init === null;
            if (!isAmbientWithoutInit) {
                var prevVariableDeclaration = this.currentVariableDeclaration;
                this.currentVariableDeclaration = declaration;

                for (var i = 0, n = declaration.declarators.members.length; i < n; i++) {
                    var declarator = declaration.declarators.members[i];

                    if (i > 0) {
                        if (inClass) {
                            this.writeToOutput(";");
                        }
                        else {
                            this.writeToOutput(", ");
                        }
                    }

                    declarator.emit(this);
                }
                this.currentVariableDeclaration = prevVariableDeclaration;

                // Declarator emit would take care of emitting start of the variable declaration start
                this.recordSourceMappingEnd(declaration);
            }

            this.emitComments(declaration, false);
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

                var varDeclName = varDecl.id.actualText;
                var quotedOrNumber = isQuoted(varDeclName) || varDecl.id.isNumber;

                var symbol = this.semanticInfoChain.getSymbolForAST(varDecl);
                var parentSymbol = symbol ? symbol.getContainer() : null;
                var parentDecl = pullDecl && pullDecl.getParentDecl();
                var parentIsClass = parentDecl && parentDecl.kind === PullElementKind.Class;
                var parentIsModule = parentDecl && (parentDecl.flags & PullElementFlags.SomeInitializedModule);
                if (parentIsClass) {
                    // class
                    if (this.emitState.container !== EmitContainer.Args) {
                        if (varDecl.isStatic()) {
                            if (quotedOrNumber) {
                                this.writeToOutput(parentSymbol.getName() + "[");
                            }
                            else {
                                this.writeToOutput(parentSymbol.getName() + ".");
                            }
                        }
                        else {
                            if (quotedOrNumber) {
                                this.writeToOutput("this[");
                            }
                            else {
                                this.writeToOutput("this.");
                            }
                        }
                    }
                }
                else if (parentIsModule) {
                    // module
                    if (!hasFlag(pullDecl.flags, PullElementFlags.Exported) && !varDecl.isProperty()) {
                        this.emitVarDeclVar();
                    }
                    else {
                        if (this.emitState.container === EmitContainer.DynamicModule) {
                            if (quotedOrNumber) {
                                this.writeToOutput("exports[");
                            }
                            else {
                                this.writeToOutput("exports.");
                            }
                        }
                        else {
                            if (quotedOrNumber) {
                                this.writeToOutput(this.moduleName + "[");
                            }
                            else {
                                this.writeToOutput(this.moduleName + ".");
                            }
                        }
                    }
                }
                else {
                    this.emitVarDeclVar();
                }

                this.writeToOutputWithSourceMapRecord(varDecl.id.actualText, varDecl.id);

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

                if (parentIsClass) {
                    // class
                    if (this.emitState.container !== EmitContainer.Args) {
                        this.writeToOutput(";");
                    }
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
            var symbolContainerDeclPath = parentDecl? parentDecl.getParentPath(): <PullDecl[]>[];

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
                    this.writeToOutput(potentialDeclPath[i].getDisplayName() + ".");
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
                    var symbolToCompare = this.resolvingContext.resolvingTypeReference ?
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
                            pullSymbolContainer.hasFlag(PullElementFlags.InitializedModule | PullElementFlags.InitializedEnum)) {
                            // If property or, say, a constructor being invoked locally within the module of its definition
                            if (pullSymbolKind === PullElementKind.Property || pullSymbolKind === PullElementKind.EnumMember) {
                                this.emitSymbolContainerNameInEnclosingContext(pullSymbol);
                            }
                            else if (pullSymbol.hasFlag(PullElementFlags.Exported) &&
                                pullSymbolKind === PullElementKind.Variable &&
                                !pullSymbol.hasFlag(PullElementFlags.InitializedModule | PullElementFlags.InitializedEnum)) {
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

                this.writeToOutput(name.actualText);
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
                var lineMap = this.document.lineMap;
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
        public emitSourceMapsAndClose(): void {
            // Output a source mapping.  As long as we haven't gotten any errors yet.
            if (this.sourceMapper !== null) {
                this.sourceMapper.emitSourceMapping(this.emitOptions.compilationSettings.sourceMapEmitterCallback);
            }

            try {
                this.outfile.Close();
            }
            catch (e) {
                Emitter.throwEmitterError(e);
            }
        }

        private emitParameterPropertyAndMemberVariableAssignments(): void {
            // emit any parameter properties first
            var constructorDecl = this.thisClassNode.constructorDecl;

            if (constructorDecl && constructorDecl.parameters) {
                for (var i = 0, n = constructorDecl.parameters.members.length; i < n; i++) {
                    var arg = <Parameter>constructorDecl.parameters.members[i];
                    if ((arg.getVarFlags() & VariableFlags.Property) !== VariableFlags.None) {
                        this.emitIndent();
                        this.recordSourceMappingStart(arg);
                        this.writeToOutputWithSourceMapRecord("this." + arg.id.actualText, arg.id);
                        this.writeToOutput(" = ");
                        this.writeToOutputWithSourceMapRecord(arg.id.actualText, arg.id);
                        this.writeLineToOutput(";");
                        this.recordSourceMappingEnd(arg);
                    }
                }
            }

            for (var i = 0, n = this.thisClassNode.members.members.length; i < n; i++) {
                if (this.thisClassNode.members.members[i].nodeType() === NodeType.VariableDeclarator) {
                    var varDecl = <VariableDeclarator>this.thisClassNode.members.members[i];
                    if (!hasFlag(varDecl.getVarFlags(), VariableFlags.Static) && varDecl.init) {
                        this.emitIndent();
                        this.emitVariableDeclarator(varDecl);
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

            var lineMap = this.document.lineMap;
            var node1EndLine = lineMap.getLineNumberFromPosition(node1.limChar);
            var node2StartLine = lineMap.getLineNumberFromPosition(node2.minChar);

            if ((node2StartLine - node1EndLine) > 1) {
                this.writeLineToOutput("");
            }
        }

        // We consider a sequence of comments to be a copyright header if there are no blank lines 
        // between them, and there is a blank line after the last one and the node they're attached 
        // to.
        private getCopyrightComments(): Comment[] {
            var preComments = this.copyrightElement.preComments();
            if (preComments) {
                var lineMap = this.document.lineMap;

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
                this.emitCommentsArray(this.getCopyrightComments());
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

                if (this.emitOptions.compilationSettings.moduleGenTarget === ModuleGenTarget.Asynchronous) { // AMD
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

        public emitConstructorStatements(funcDecl: FunctionDeclaration) {
            var list = funcDecl.block.statements;

            if (list === null) {
                return;
            }

            this.emitComments(list, true);

            var emitPropertyAssignmentsAfterSuperCall = this.thisClassNode.extendsList && this.thisClassNode.extendsList.members.length > 0;
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

        public emitPropertyAccessor(funcDecl: FunctionDeclaration, className: string, isProto: boolean) {
            if (!hasFlag(funcDecl.getFunctionFlags(), FunctionFlags.GetAccessor)) {
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

            var functionName = funcDecl.name.actualText;
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
                this.emitInnerFunction(accessors.getter, false);
                this.writeLineToOutput(",");
            }

            if (accessors.setter) {
                this.emitIndent();
                this.recordSourceMappingStart(accessors.setter);
                this.writeToOutput("set: ");
                this.emitInnerFunction(accessors.setter, false);
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

        public emitPrototypeMember(funcDecl: FunctionDeclaration, className: string) {
            if (funcDecl.isAccessor()) {
                this.emitPropertyAccessor(funcDecl, className, true);
            }
            else {
                this.emitIndent();
                this.recordSourceMappingStart(funcDecl);
                this.emitComments(funcDecl, true);

                var functionName = funcDecl.getNameText();
                if (isQuoted(functionName) || funcDecl.name.isNumber) {
                    this.writeToOutput(className + ".prototype[" + functionName + "] = ");
                }
                else {
                    this.writeToOutput(className + ".prototype." + functionName + " = ");
                }

                this.emitInnerFunction(funcDecl, /*printName:*/ false, /*includePreComments:*/ false);
                this.writeLineToOutput(";");
            }
        }

        public emitClass(classDecl: ClassDeclaration) {
            var pullDecl = this.semanticInfoChain.getDeclForAST(classDecl);
            this.pushDecl(pullDecl);

            var svClassNode = this.thisClassNode;
            this.thisClassNode = classDecl;
            var className = classDecl.name.actualText;
            this.emitComments(classDecl, true);
            var temp = this.setContainer(EmitContainer.Class);

            this.recordSourceMappingStart(classDecl);
            this.writeToOutput("var " + className);

            var hasBaseClass = classDecl.extendsList && classDecl.extendsList.members.length;
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
                baseTypeReference = <TypeReference>classDecl.extendsList.members[0];
                this.emitIndent();
                this.writeLineToOutput("__extends(" + className + ", _super);");
            }

            this.emitIndent();

            var constrDecl = classDecl.constructorDecl;

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
                this.writeLineToOutput("function " + classDecl.name.actualText + "() {");
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
                this.resolvingContext.resolvingTypeReference = true;
                this.emitJavascript(baseTypeReference.term, /*startLine:*/ false);
                this.resolvingContext.resolvingTypeReference = false;
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

            for (var i = 0, n = classDecl.members.members.length; i < n; i++) {
                var memberDecl = classDecl.members.members[i];

                if (memberDecl.nodeType() === NodeType.FunctionDeclaration) {
                    var functionDeclaration = <FunctionDeclaration>memberDecl;

                    if (hasFlag(functionDeclaration.getFunctionFlags(), FunctionFlags.Method) && !functionDeclaration.isSignature()) {
                        this.emitSpaceBetweenConstructs(lastEmittedMember, functionDeclaration);

                        if (!hasFlag(functionDeclaration.getFunctionFlags(), FunctionFlags.Static)) {
                            this.emitPrototypeMember(functionDeclaration, classDecl.name.actualText);
                        }
                        else {
                            // static functions
                            if (functionDeclaration.isAccessor()) {
                                this.emitPropertyAccessor(functionDeclaration, this.thisClassNode.name.actualText, false);
                            }
                            else {
                                this.emitIndent();
                                this.recordSourceMappingStart(functionDeclaration);
                                this.emitComments(functionDeclaration, true);

                                var functionName = functionDeclaration.name.actualText;
                                if (isQuoted(functionName) || functionDeclaration.name.isNumber) {
                                    this.writeToOutput(classDecl.name.actualText + "[" + functionName + "] = ");
                                }
                                else {
                                    this.writeToOutput(classDecl.name.actualText + "." + functionName + " = ");
                                }

                                this.emitInnerFunction(functionDeclaration, /*printName:*/ false, /*includePreComments:*/ false);
                                this.writeLineToOutput(";");
                            }
                        }

                        lastEmittedMember = functionDeclaration;
                    }
                }
            }

            // Now emit all the statics.
            for (var i = 0, n = classDecl.members.members.length; i < n; i++) {
                var memberDecl = classDecl.members.members[i];

                if (memberDecl.nodeType() === NodeType.VariableDeclarator) {
                    var varDecl = <VariableDeclarator>memberDecl;

                    if (hasFlag(varDecl.getVarFlags(), VariableFlags.Static) && varDecl.init) {
                        this.emitSpaceBetweenConstructs(lastEmittedMember, varDecl);

                        this.emitIndent();
                        this.recordSourceMappingStart(varDecl);

                        var varDeclName = varDecl.id.actualText;
                        if (isQuoted(varDeclName) || varDecl.id.isNumber) {
                            this.writeToOutput(classDecl.name.actualText + "[" + varDeclName + "] = ");
                        }
                        else {
                            this.writeToOutput(classDecl.name.actualText + "." + varDeclName + " = ");
                        }

                        varDecl.init.emit(this);

                        this.recordSourceMappingEnd(varDecl);
                        this.writeLineToOutput(";");

                        lastEmittedMember = varDecl;
                    }
                }
            }
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

                    if (!hasFlag(classDeclaration.getVarFlags(), VariableFlags.Ambient) && classDeclaration.extendsList && classDeclaration.extendsList.members.length > 0) {
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
            if (this.inArrowFunction) {
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

        public static throwEmitterError(e: Error): void {
            var error: any = new Error(e.message);
            error.isEmitterError = true;
            throw error;
        }

        public static handleEmitterError(fileName: string, e: Error): Diagnostic[] {
            if ((<any>e).isEmitterError === true) {
                return [new Diagnostic(fileName, 0, 0, DiagnosticCode.Emit_Error_0, [e.message])];
            }

            throw e;
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
            if (this.inArrowFunction) {
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
                this.emitCommentsArray(parenthesizedExpression.openParenTrailingComments);
                parenthesizedExpression.expression.emit(this);
                this.writeToOutput(")");
                this.recordSourceMappingEnd(parenthesizedExpression);
            }
        }

        public emitCastExpression(expression: CastExpression): void {
            expression.operand.emit(this);
        }

        public emitUnaryExpression(expression: UnaryExpression): void {
            var nodeType = expression.nodeType();

            this.recordSourceMappingStart(expression);
            switch (nodeType) {
                case NodeType.PostIncrementExpression:
                    expression.operand.emit(this);
                    this.writeToOutput("++");
                    break;
                case NodeType.LogicalNotExpression:
                    this.writeToOutput("!");
                    expression.operand.emit(this);
                    break;
                case NodeType.PostDecrementExpression:
                    expression.operand.emit(this);
                    this.writeToOutput("--");
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
                case NodeType.TypeOfExpression:
                    this.writeToOutput("typeof ");
                    expression.operand.emit(this);
                    break;
                case NodeType.DeleteExpression:
                    this.writeToOutput("delete ");
                    expression.operand.emit(this);
                    break;
                case NodeType.VoidExpression:
                    this.writeToOutput("void ");
                    expression.operand.emit(this);
                    break;
                default:
                    throw Errors.abstract();
            }

            this.recordSourceMappingEnd(expression);
        }

        public emitBinaryExpression(expression: BinaryExpression): void {
            this.recordSourceMappingStart(expression);
            switch (expression.nodeType()) {
                case NodeType.MemberAccessExpression:
                    if (!this.tryEmitConstant(expression)) {
                        expression.operand1.emit(this);
                        this.writeToOutput(".");
                        this.emitName(<Identifier>expression.operand2, false);
                    }
                    break;
                case NodeType.ElementAccessExpression:
                    this.emitIndex(expression.operand1, expression.operand2);
                    break;

                case NodeType.Member:
                    if (expression.operand2.nodeType() === NodeType.FunctionDeclaration && (<FunctionDeclaration>expression.operand2).isAccessor()) {
                        var funcDecl = <FunctionDeclaration>expression.operand2;
                        if (hasFlag(funcDecl.getFunctionFlags(), FunctionFlags.GetAccessor)) {
                            this.writeToOutput("get ");
                        }
                        else {
                            this.writeToOutput("set ");
                        }
                        expression.operand1.emit(this);
                    }
                    else {
                        expression.operand1.emit(this);
                        this.writeToOutput(": ");
                    }
                    expression.operand2.emit(this);
                    break;
                case NodeType.CommaExpression:
                    expression.operand1.emit(this);
                    this.writeToOutput(", ");
                    expression.operand2.emit(this);
                    break;
                default:
                    {
                        expression.operand1.emit(this);
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
                        expression.operand2.emit(this);
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

            this.emitComments(funcProp, true);

            this.recordSourceMappingStart(funcProp);
            this.writeToOutput("function ");

            //this.recordSourceMappingStart(funcProp.propertyName);
            //this.writeToOutput(funcProp.propertyName.actualText);
            //this.recordSourceMappingEnd(funcProp.propertyName);

            this.writeToOutput("(");
            this.emitFunctionParameters(funcProp.parameters);
            this.writeLineToOutput(") {");

            this.recordSourceMappingNameStart(funcProp.propertyName.actualText);
            this.indenter.increaseIndent();

            this.emitDefaultValueAssignments(funcProp.parameters);
            this.emitRestParameterInitializer(funcProp.parameters);

            if (this.shouldCaptureThis(funcProp)) {
                this.writeCaptureThisStatement(funcProp);
            }

            this.emitList(funcProp.block.statements);
            this.emitCommentsArray(funcProp.block.closeBraceLeadingComments);

            this.indenter.decreaseIndent();
            this.emitIndent();
            this.writeToOutputWithSourceMapRecord("}", funcProp.block.closeBraceSpan);

            this.recordSourceMappingNameEnd();
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
            expression.operand1.emit(this);
            this.writeToOutput(" ? ");
            expression.operand2.emit(this);
            this.writeToOutput(" : ");
            expression.operand3.emit(this);
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
            this.writeToOutputWithSourceMapRecord(statement.identifier.actualText, statement.identifier);
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
            this.emitCommentsArray(block.closeBraceLeadingComments);
            this.indenter.decreaseIndent();
            this.emitIndent();
            this.writeToOutput("}");
            this.recordSourceMappingEnd(block);
        }

        public emitJump(jump: Jump): void {
            this.recordSourceMappingStart(jump);
            if (jump.nodeType() === NodeType.BreakStatement) {
                this.writeToOutput("break");
            }
            else {
                this.writeToOutput("continue");
            }
            if (jump.target) {
                this.writeToOutput(" " + jump.target);
            }
            this.recordSourceMappingEnd(jump);
            this.writeToOutput(";");
        }

        public emitWhileStatement(statement: WhileStatement): void {
            this.recordSourceMappingStart(statement);
            this.writeToOutput("while (");
            statement.cond.emit(this);
            this.writeToOutput(")");
            this.emitBlockOrStatement(statement.body);
            this.recordSourceMappingEnd(statement);
        }

        public emitDoStatement(statement: DoStatement): void {
            this.recordSourceMappingStart(statement);
            this.writeToOutput("do");
            this.emitBlockOrStatement(statement.body);
            this.writeToOutputWithSourceMapRecord(" while", statement.whileSpan);
            this.writeToOutput('(');
            statement.cond.emit(this);
            this.writeToOutput(")");
            this.recordSourceMappingEnd(statement);
            this.writeToOutput(";");
        }

        public emitIfStatement(statement: IfStatement): void {
            this.recordSourceMappingStart(statement);
            this.writeToOutput("if (");
            statement.cond.emit(this);
            this.writeToOutput(")");

            this.emitBlockOrStatement(statement.thenBod);

            if (statement.elseBod) {
                if (statement.thenBod.nodeType() !== NodeType.Block) {
                    this.writeLineToOutput("");
                    this.emitIndent();
                }
                else {
                    this.writeToOutput(" ");
                }

                if (statement.elseBod.nodeType() === NodeType.IfStatement) {
                    this.writeToOutput("else ");
                    statement.elseBod.emit(this);
                }
                else {
                    this.writeToOutput("else");
                    this.emitBlockOrStatement(statement.elseBod);
                }
            }
            this.recordSourceMappingEnd(statement);
        }

        public emitReturnStatement(statement: ReturnStatement): void {
            this.recordSourceMappingStart(statement);
            if (statement.returnExpression) {
                this.writeToOutput("return ");
                statement.returnExpression.emit(this);
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
            statement.lval.emit(this);
            this.writeToOutput(" in ");
            statement.obj.emit(this);
            this.writeToOutput(")");
            this.emitBlockOrStatement(statement.body);
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
            if (statement.expr) {
                statement.expr.emit(this);
            }

            this.writeToOutput(")");
            this.emitBlockOrStatement(statement.body);
            this.recordSourceMappingEnd(statement);
        }

        public emitSwitchStatement(statement: SwitchStatement): void {
            this.recordSourceMappingStart(statement);
            this.recordSourceMappingStart(statement.statement);
            this.writeToOutput("switch (");
            statement.val.emit(this);
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

        public emitCaseClause(clause: CaseClause): void {
            this.recordSourceMappingStart(clause);
            if (clause.expr) {
                this.writeToOutput("case ");
                clause.expr.emit(this);
            }
            else {
                this.writeToOutput("default");
            }
            this.writeToOutput(":");

            if (clause.body.members.length === 1 && clause.body.members[0].nodeType() === NodeType.Block) {
                // The case statement was written with curly braces, so emit it with the appropriate formatting
                clause.body.members[0].emit(this);
                this.writeLineToOutput("");
            }
            else {
                // No curly braces. Format in the expected way
                this.writeLineToOutput("");
                this.indenter.increaseIndent();
                clause.body.emit(this);
                this.indenter.decreaseIndent();
            }
            this.recordSourceMappingEnd(clause);
        }

        public emitTryStatement(statement: TryStatement): void {
            this.recordSourceMappingStart(statement);
            this.writeToOutput("try ");
            statement.tryBody.emit(this);
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
            clause.body.emit(this);
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
            this.writeToOutputWithSourceMapRecord(literal.actualText, literal);
        }

        public emitParameter(parameter: Parameter): void {
            this.writeToOutputWithSourceMapRecord(parameter.id.actualText, parameter);
        }

        private isNonAmbientAndNotSignature(declaration: FunctionDeclaration): boolean {
            return !hasFlag(declaration.getFunctionFlags(), FunctionFlags.Signature) &&
                !hasFlag(declaration.getFunctionFlags(), FunctionFlags.Ambient);
        }

        public shouldEmitFunctionDeclaration(declaration: FunctionDeclaration): boolean {
            return declaration.preComments() !== null || this.isNonAmbientAndNotSignature(declaration);
        }

        public emitFunctionDeclaration(declaration: FunctionDeclaration): void {
            if (this.isNonAmbientAndNotSignature(declaration)) {
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

        private moduleIsElided(declaration: ModuleDeclaration): boolean {
            if (hasFlag(declaration.getModuleFlags(), ModuleFlags.Ambient)) {
                return true;
            }

            // Always emit a non ambient enum (even empty ones).
            if (hasFlag(declaration.getModuleFlags(), ModuleFlags.IsEnum)) {
                return false;
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
                if (hasFlag(statement.getFlags(), ASTFlags.EnumElement)) {
                    this.emitEnumElement(varDecl);
                }
                else {
                    statement.declaration.emit(this);
                    this.writeToOutput(";");
                }
            }
            else {
                this.emitComments(varDecl, /*pre:*/ true, /*onlyPinnedOrTripleSlashComments:*/ true);
            }
        }

        public emitGenericType(type: GenericType): void {
            type.name.emit(this);
        }
    }
}