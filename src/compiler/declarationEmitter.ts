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
    export class TextWriter {
        private contents = "";
        public onNewLine = true;
        constructor(private name: string, private writeByteOrderMark: boolean, private outputFileType: OutputFileType) {
        }

        public Write(s: string) {
            this.contents += s;
            this.onNewLine = false;
        }

        public WriteLine(s: string) {
            this.contents += s;
            this.contents += TypeScript.newLine();
            this.onNewLine = true;
        }

        public Close(): void {
        }

        public getOutputFile(): OutputFile {
            return new OutputFile(this.name, this.writeByteOrderMark, this.contents, this.outputFileType);
        }
    }

    export class DeclarationEmitter {
        private declFile: TextWriter = null;
        private indenter = new Indenter();
        private declarationContainerStack: AST[] = [];
        private emittedReferencePaths = false;

        constructor(private emittingFileName: string,
                    public document: Document,
                    private compiler: TypeScriptCompiler,
                    private emitOptions: EmitOptions,
                    private semanticInfoChain: SemanticInfoChain) {
            this.declFile = new TextWriter(emittingFileName, this.document.byteOrderMark !== ByteOrderMark.None, OutputFileType.Declaration);
        }

        public getOutputFile(): OutputFile {
            return this.declFile.getOutputFile();
        }

        public emitDeclarations(script: Script) {
            this.emitDeclarationsForScript(script);
        }

        private emitDeclarationsForList(list: ASTList) {
            for (var i = 0; i < list.members.length; i++) {
                this.emitDeclarationsForAST(list.members[i]);
            }
        }

        private emitDeclarationsForAST(ast: AST) {
            switch (ast.nodeType()) {
                case NodeType.VariableStatement:
                    return this.emitDeclarationsForVariableStatement(<VariableStatement>ast);
                case NodeType.PropertySignature:
                    return this.emitPropertySignature(<PropertySignature>ast);
                case NodeType.VariableDeclarator:
                    return this.emitVariableDeclarator(<VariableDeclarator>ast, true, true);
                case NodeType.MemberVariableDeclaration:
                    return this.emitDeclarationsForMemberVariableDeclaration(<MemberVariableDeclaration>ast);
                case NodeType.ConstructorDeclaration:
                    return this.emitDeclarationsForConstructorDeclaration(<ConstructorDeclaration>ast);
                case NodeType.GetAccessor:
                    return this.emitDeclarationsForGetAccessor(<GetAccessor>ast);
                case NodeType.SetAccessor:
                    return this.emitDeclarationsForSetAccessor(<SetAccessor>ast);
                case NodeType.IndexMemberDeclaration:
                    return this.emitIndexMemberDeclaration(<IndexMemberDeclaration>ast);
                case NodeType.IndexSignature:
                    return this.emitIndexSignature(<IndexSignature>ast);
                case NodeType.CallSignature:
                    return this.emitCallSignature(<CallSignature>ast);
                case NodeType.ConstructSignature:
                    return this.emitConstructSignature(<ConstructSignature>ast);
                case NodeType.MethodSignature:
                    return this.emitMethodSignature(<MethodSignature>ast);
                case NodeType.FunctionDeclaration:
                    return this.emitDeclarationsForFunctionDeclaration(<FunctionDeclaration>ast);
                case NodeType.MemberFunctionDeclaration:
                    return this.emitMemberFunctionDeclaration(<MemberFunctionDeclaration>ast);
                case NodeType.ClassDeclaration:
                    return this.emitDeclarationsForClassDeclaration(<ClassDeclaration>ast);
                case NodeType.InterfaceDeclaration:
                    return this.emitDeclarationsForInterfaceDeclaration(<InterfaceDeclaration>ast);
                case NodeType.ImportDeclaration:
                    return this.emitDeclarationsForImportDeclaration(<ImportDeclaration>ast);
                case NodeType.ModuleDeclaration:
                    return this.emitDeclarationsForModuleDeclaration(<ModuleDeclaration>ast);
                case NodeType.EnumDeclaration:
                    return this.emitDeclarationsForEnumDeclaration(<EnumDeclaration>ast);
                case NodeType.ExportAssignment:
                    return this.emitDeclarationsForExportAssignment(<ExportAssignment>ast);
            }
        }

        private getAstDeclarationContainer() {
            return this.declarationContainerStack[this.declarationContainerStack.length - 1];
        }

        private getIndentString(declIndent = false) {
            return this.indenter.getIndent();
        }

        private emitIndent() {
            this.declFile.Write(this.getIndentString());
        }

        private canEmitDeclarations(declAST: AST) {
            var container = this.getAstDeclarationContainer();
            if (container.nodeType() === NodeType.ModuleDeclaration) {
                var pullDecl = this.semanticInfoChain.getDeclForAST(declAST);
                if (!hasFlag(pullDecl.flags, PullElementFlags.Exported)) {
                    var start = new Date().getTime();
                    var declSymbol = this.semanticInfoChain.getSymbolForAST(declAST);
                    var result = declSymbol && declSymbol.isExternallyVisible();
                    TypeScript.declarationEmitIsExternallyVisibleTime += new Date().getTime() - start;

                    return result;
                }
            }

            return true;
        }

        private getDeclFlagsString(pullDecl: PullDecl, typeString: string) {
            var result = this.getIndentString();
            var pullFlags = pullDecl.flags;

            // Static/public/private/global declare
            if (hasFlag(pullFlags, PullElementFlags.Static)) {
                if (hasFlag(pullFlags, PullElementFlags.Private)) {
                    result += "private ";
                }
                result += "static ";
            }
            else {
                if (hasFlag(pullFlags, PullElementFlags.Private)) {
                    result += "private ";
                }
                else if (hasFlag(pullFlags, PullElementFlags.Public)) {
                    result += "public ";
                }
                else {
                    var emitDeclare = !hasFlag(pullFlags, PullElementFlags.Exported);

                    var container = this.getAstDeclarationContainer();
                    var isExternalModule = container.nodeType() === NodeType.ModuleDeclaration && (<ModuleDeclaration>container).isExternalModule;

                    // Emit export only for global export statements. 
                    // The container for this would be dynamic module which is whole file
                    if (isExternalModule && hasFlag(pullFlags, PullElementFlags.Exported)) {
                        result += "export ";
                        emitDeclare = true;
                    }

                    // Emit declare only in global context
                    if (isExternalModule || container.nodeType() == NodeType.Script) {
                        // Emit declare if not interface declaration or import declaration && is not from module
                        if (emitDeclare && typeString !== "interface" && typeString != "import") {
                            result += "declare ";
                        }
                    }

                    result += typeString + " ";
                }
            }

            return result;
        }

        private emitDeclFlags(pullDecl: PullDecl, typeString: string) {
            this.declFile.Write(this.getDeclFlagsString(pullDecl, typeString));
        }

        private pushDeclarationContainer(ast: AST) {
            this.declarationContainerStack.push(ast);
        }

        private popDeclarationContainer(ast: AST) {
            CompilerDiagnostics.assert(ast !== this.getAstDeclarationContainer(), 'Declaration container mismatch');
            this.declarationContainerStack.pop();
        }

        private emitTypeNamesMember(memberName: MemberName, emitIndent: boolean = false) {
            if (memberName.prefix === "{ ") {
                if (emitIndent) {
                    this.emitIndent();
                }

                this.declFile.WriteLine("{");
                this.indenter.increaseIndent();
                emitIndent = true;
            }
            else if (memberName.prefix !== "") {
                if (emitIndent) {
                    this.emitIndent();
                }

                this.declFile.Write(memberName.prefix);
                emitIndent = false;
            }

            if (memberName.isString()) {
                if (emitIndent) {
                    this.emitIndent();
                }

                this.declFile.Write((<MemberNameString>memberName).text);
            }
            else if (memberName.isArray()) {
                var ar = <MemberNameArray>memberName;
                for (var index = 0; index < ar.entries.length; index++) {
                    this.emitTypeNamesMember(ar.entries[index], emitIndent);
                    if (ar.delim === "; ") {
                        this.declFile.WriteLine(";");
                    }
                }
            }

            if (memberName.suffix === "}") {
                this.indenter.decreaseIndent();
                this.emitIndent();
                this.declFile.Write(memberName.suffix);
            }
            else {
                this.declFile.Write(memberName.suffix);
            }
        }

        private emitTypeSignature(type: PullTypeSymbol) {
            var declarationContainerAst = this.getAstDeclarationContainer();

            var start = new Date().getTime();
            var declarationContainerDecl = this.semanticInfoChain.getDeclForAST(declarationContainerAst);
            var declarationPullSymbol = declarationContainerDecl.getSymbol();
            TypeScript.declarationEmitTypeSignatureTime += new Date().getTime() - start;

            var typeNameMembers = type.getScopedNameEx(declarationPullSymbol);
            this.emitTypeNamesMember(typeNameMembers);
        }

        private emitComment(comment: Comment) {
            var text = comment.getText();
            if (this.declFile.onNewLine) {
                this.emitIndent();
            }
            else if (!comment.isBlockComment()) {
                this.declFile.WriteLine("");
                this.emitIndent();
            }

            this.declFile.Write(text[0]);

            for (var i = 1; i < text.length; i++) {
                this.declFile.WriteLine("");
                this.emitIndent();
                this.declFile.Write(text[i]);
            }

            if (comment.endsLine || !comment.isBlockComment()) {
                this.declFile.WriteLine("");
            }
            else {
                this.declFile.Write(" ");
            }
        }

        private emitDeclarationComments(ast: AST, endLine?: boolean): void;
        private emitDeclarationComments(astOrSymbol: any, endLine = true) {
            if (this.emitOptions.compilationSettings().removeComments()) {
                return;
            }

            var declComments: Comment[] = astOrSymbol.docComments ? astOrSymbol.docComments() : docComments(astOrSymbol);
            this.writeDeclarationComments(declComments, endLine);
        }

        private writeDeclarationComments(declComments: Comment[], endLine = true) {
            if (declComments.length > 0) {
                for (var i = 0; i < declComments.length; i++) {
                    this.emitComment(declComments[i]);
                }

                if (endLine) {
                    if (!this.declFile.onNewLine) {
                        this.declFile.WriteLine("");
                    }
                }
                else {
                    if (this.declFile.onNewLine) {
                        this.emitIndent();
                    }
                }
            }
        }

        private emitTypeOfVariableDeclaratorOrParameter(boundDecl: AST) {
            var start = new Date().getTime();
            var decl = this.semanticInfoChain.getDeclForAST(boundDecl);
            var pullSymbol = decl.getSymbol();
            TypeScript.declarationEmitGetBoundDeclTypeTime += new Date().getTime() - start;

            var type = pullSymbol.type;
            Debug.assert(type);

            this.declFile.Write(": ");
            this.emitTypeSignature(type);
        }

        private emitPropertySignature(varDecl: PropertySignature): void {
            this.emitDeclarationComments(varDecl);
            this.emitIndent();
            this.declFile.Write(varDecl.propertyName.text());
            if (varDecl.questionToken) {
                this.declFile.Write("?");
            }

            this.emitTypeOfVariableDeclaratorOrParameter(varDecl);

            this.declFile.WriteLine(";");
        }

        private emitVariableDeclarator(varDecl: VariableDeclarator, isFirstVarInList: boolean, isLastVarInList: boolean) {
            if (this.canEmitDeclarations(varDecl)) {
                var interfaceMember = (this.getAstDeclarationContainer().nodeType() === NodeType.InterfaceDeclaration);
                this.emitDeclarationComments(varDecl);
                if (!interfaceMember) {
                    // If it is var list of form var a, b, c = emit it only if count > 0 - which will be when emitting first var
                    // If it is var list of form  var a = varList count will be 0
                    if (isFirstVarInList) {
                        this.emitDeclFlags(this.semanticInfoChain.getDeclForAST(varDecl), "var");
                    }

                    this.declFile.Write(varDecl.identifier.text());
                }
                else {
                    this.emitIndent();
                    this.declFile.Write(varDecl.identifier.text());
                }

                if (!hasModifier(getVariableDeclaratorModifiers(varDecl), PullElementFlags.Private)) {
                    this.emitTypeOfVariableDeclaratorOrParameter(varDecl);
                }

                // Write ; or ,
                if (isLastVarInList) {
                    this.declFile.WriteLine(";");
                }
                else {
                    this.declFile.Write(", ");
                }
            }
        }

        private emitClassElementModifiers(modifiers: PullElementFlags[]): void {
            if (hasModifier(modifiers, PullElementFlags.Static)) {
                if (hasModifier(modifiers, PullElementFlags.Private)) {
                    this.declFile.Write("private ");
                }
                this.declFile.Write("static ");
            }
            else {
                if (hasModifier(modifiers, PullElementFlags.Private)) {
                    this.declFile.Write("private ");
                }
                else {
                    this.declFile.Write("public ");
                }
            }
        }

        private emitDeclarationsForMemberVariableDeclaration(varDecl: MemberVariableDeclaration) {
            if (this.canEmitDeclarations(varDecl)) {
                this.emitDeclarationComments(varDecl);

                this.declFile.Write(this.getIndentString());
                this.emitClassElementModifiers(varDecl.modifiers);;

                this.declFile.Write(varDecl.variableDeclarator.identifier.text());

                if (!hasModifier(varDecl.modifiers, PullElementFlags.Private)) {
                    this.emitTypeOfVariableDeclaratorOrParameter(varDecl);
                }

                this.declFile.WriteLine(";");
            }
        }

        private emitDeclarationsForVariableStatement(variableStatement: VariableStatement) {
            this.emitDeclarationsForVariableDeclaration(variableStatement.declaration);
        }

        private emitDeclarationsForVariableDeclaration(variableDeclaration: VariableDeclaration) {
            var varListCount = variableDeclaration.declarators.members.length;
            for (var i = 0; i < varListCount; i++) {
                this.emitVariableDeclarator(<VariableDeclarator>variableDeclaration.declarators.members[i], i == 0, i == varListCount - 1);
            }
        }

        private emitArgDecl(argDecl: AST, id: Identifier, isOptional: boolean, isPrivate: boolean) {
            this.indenter.increaseIndent();

            this.emitDeclarationComments(argDecl, false);
            this.declFile.Write(id.text());
            if (isOptional) {
                this.declFile.Write("?");
            }

            this.indenter.decreaseIndent();

            if (!isPrivate) {
                this.emitTypeOfVariableDeclaratorOrParameter(argDecl);
            }
        }

        private isOverloadedCallSignature(funcDecl: AST) {
            var start = new Date().getTime();
            var functionDecl = this.semanticInfoChain.getDeclForAST(funcDecl);
            var funcSymbol = functionDecl.getSymbol();
            TypeScript.declarationEmitIsOverloadedCallSignatureTime += new Date().getTime() - start;

            var funcTypeSymbol = funcSymbol.type;
            var signatures = funcTypeSymbol.getCallSignatures();
            var result = signatures && signatures.length > 1;

            return result;
        }

        private emitDeclarationsForConstructorDeclaration(funcDecl: ConstructorDeclaration) {
            var start = new Date().getTime();
            var funcSymbol = this.semanticInfoChain.getSymbolForAST(funcDecl);

            TypeScript.declarationEmitFunctionDeclarationGetSymbolTime += new Date().getTime() - start;

            var funcTypeSymbol = funcSymbol.type;
            if (funcDecl.block) {
                var constructSignatures = funcTypeSymbol.getConstructSignatures();
                if (constructSignatures && constructSignatures.length > 1) {
                    return;
                }
                //else if (this.isOverloadedCallSignature(funcDecl)) {
                //    // This means its implementation of overload signature. do not emit
                //    return;
                //}
            }

            var funcPullDecl = this.semanticInfoChain.getDeclForAST(funcDecl);
            var funcSignature = funcPullDecl.getSignatureSymbol();
            this.emitDeclarationComments(funcDecl);

            this.emitIndent();
            this.declFile.Write("constructor");

            this.declFile.Write("(");
            this.emitParameters(/*isPrivate:*/ false, Parameters.fromParameterList(funcDecl.parameterList));
            this.declFile.Write(")");
            this.declFile.WriteLine(";");
        }

        private emitParameterList(isPrivate: boolean, parameterList: ParameterList): void {
            this.declFile.Write("(");
            this.emitParameters(isPrivate, Parameters.fromParameterList(parameterList));
            this.declFile.Write(")");
        }

        private emitParameters(isPrivate: boolean, parameterList: IParameters): void {
            var hasLastParameterRestParameter = parameterList.lastParameterIsRest();
            var argsLen = parameterList.length;
            if (hasLastParameterRestParameter) {
                argsLen--;
            }

            for (var i = 0; i < argsLen; i++) {
                this.emitArgDecl(parameterList.astAt(i), parameterList.identifierAt(i), parameterList.isOptionalAt(i), isPrivate);
                if (i < (argsLen - 1)) {
                    this.declFile.Write(", ");
                }
            }

            if (hasLastParameterRestParameter) {
                if (parameterList.length > 1) {
                    this.declFile.Write(", ...");
                }
                else {
                    this.declFile.Write("...");
                }

                var index = parameterList.length - 1;
                this.emitArgDecl(parameterList.astAt(index), parameterList.identifierAt(index), parameterList.isOptionalAt(index), isPrivate);
            }
        }

        private emitMemberFunctionDeclaration(funcDecl: MemberFunctionDeclaration) {
            var start = new Date().getTime();
            var funcSymbol = this.semanticInfoChain.getSymbolForAST(funcDecl);

            TypeScript.declarationEmitFunctionDeclarationGetSymbolTime += new Date().getTime() - start;

            var funcTypeSymbol = funcSymbol.type;
            if (funcDecl.block) {
                var constructSignatures = funcTypeSymbol.getConstructSignatures();
                if (constructSignatures && constructSignatures.length > 1) {
                    return;
                }
                else if (this.isOverloadedCallSignature(funcDecl)) {
                    // This means its implementation of overload signature. do not emit
                    return;
                }
            }
            else if (hasModifier(funcDecl.modifiers, PullElementFlags.Private) && this.isOverloadedCallSignature(funcDecl)) {
                // Print only first overload of private function
                var callSignatures = funcTypeSymbol.getCallSignatures();
                Debug.assert(callSignatures && callSignatures.length > 1);
                var firstSignature = callSignatures[0].isDefinition() ? callSignatures[1] : callSignatures[0];
                var firstSignatureDecl = firstSignature.getDeclarations()[0];
                var firstFuncDecl = this.semanticInfoChain.getASTForDecl(firstSignatureDecl);
                if (firstFuncDecl !== funcDecl) {
                    return;
                }
            }

            if (!this.canEmitDeclarations(funcDecl)) {
                return;
            }

            var funcPullDecl = this.semanticInfoChain.getDeclForAST(funcDecl);
            var funcSignature = funcPullDecl.getSignatureSymbol();
            this.emitDeclarationComments(funcDecl);

            this.emitDeclFlags(funcPullDecl, "function");
            var id = funcDecl.propertyName.text();
            this.declFile.Write(id);
            this.emitTypeParameters(funcDecl.callSignature.typeParameterList, funcSignature);

            var isPrivate = hasModifier(funcDecl.modifiers, PullElementFlags.Private);

            this.emitParameterList(isPrivate, funcDecl.callSignature.parameterList);

            if (!isPrivate) {
                var returnType = funcSignature.returnType;
                this.declFile.Write(": ");
                this.emitTypeSignature(returnType);
            }

            this.declFile.WriteLine(";");
        }

        private emitCallSignature(funcDecl: CallSignature): void {
            var funcPullDecl = this.semanticInfoChain.getDeclForAST(funcDecl);

            this.emitDeclarationComments(funcDecl);

            var funcSignature = funcPullDecl.getSignatureSymbol();
            this.emitTypeParameters(funcDecl.typeParameterList, funcSignature);

            this.emitIndent();
            this.declFile.Write("(");
            this.emitParameters(/*isPrivate:*/ false, Parameters.fromParameterList(funcDecl.parameterList));
            this.declFile.Write(")");

            var returnType = funcSignature.returnType;
            this.declFile.Write(": ");
            if (returnType) {
                this.emitTypeSignature(returnType);
            }
            else {
                this.declFile.Write("any");
            }

            this.declFile.WriteLine(";");
        }

        private emitConstructSignature(funcDecl: ConstructSignature) {
            var funcPullDecl = this.semanticInfoChain.getDeclForAST(funcDecl);

            var start = new Date().getTime();
            var funcSymbol = this.semanticInfoChain.getSymbolForAST(funcDecl);

            TypeScript.declarationEmitFunctionDeclarationGetSymbolTime += new Date().getTime() - start;

            this.emitDeclarationComments(funcDecl);

            this.emitIndent();
            this.declFile.Write("new");

            var funcSignature = funcPullDecl.getSignatureSymbol();
            this.emitTypeParameters(funcDecl.callSignature.typeParameterList, funcSignature);

            this.declFile.Write("(");
            this.emitParameters(/*isPrivate:*/ false, Parameters.fromParameterList(funcDecl.callSignature.parameterList));
            this.declFile.Write(")");

            var returnType = funcSignature.returnType;
            this.declFile.Write(": ");
            if (returnType) {
                this.emitTypeSignature(returnType);
            }
            else {
                this.declFile.Write("any");
            }

            this.declFile.WriteLine(";");
        }

        private emitMethodSignature(funcDecl: MethodSignature) {
            var funcPullDecl = this.semanticInfoChain.getDeclForAST(funcDecl);

            var isInterfaceMember = (this.getAstDeclarationContainer().nodeType() === NodeType.InterfaceDeclaration);

            var start = new Date().getTime();
            var funcSymbol = this.semanticInfoChain.getSymbolForAST(funcDecl);

            TypeScript.declarationEmitFunctionDeclarationGetSymbolTime += new Date().getTime() - start;

            this.emitDeclarationComments(funcDecl);

            this.emitIndent();
            this.declFile.Write(funcDecl.propertyName.text());
            if (funcDecl.questionToken) {
                this.declFile.Write("? ");
            }

            var funcSignature = funcPullDecl.getSignatureSymbol();
            this.emitTypeParameters(funcDecl.callSignature.typeParameterList, funcSignature);

            this.declFile.Write("(");
            this.emitParameters(/*isPrivate:*/ false, Parameters.fromParameterList(funcDecl.callSignature.parameterList));
            this.declFile.Write(")");

            var returnType = funcSignature.returnType;
            this.declFile.Write(": ");
            if (returnType) {
                this.emitTypeSignature(returnType);
            }
            else {
                this.declFile.Write("any");
            }

            this.declFile.WriteLine(";");
        }

        private emitDeclarationsForFunctionDeclaration(funcDecl: FunctionDeclaration) {
            var funcPullDecl = this.semanticInfoChain.getDeclForAST(funcDecl);

            var isInterfaceMember = (this.getAstDeclarationContainer().nodeType() === NodeType.InterfaceDeclaration);

            var start = new Date().getTime();
            var funcSymbol = this.semanticInfoChain.getSymbolForAST(funcDecl);

            TypeScript.declarationEmitFunctionDeclarationGetSymbolTime += new Date().getTime() - start;

            if (funcDecl.block) {
                var funcTypeSymbol = funcSymbol.type;
                var constructSignatures = funcTypeSymbol.getConstructSignatures();
                if (constructSignatures && constructSignatures.length > 1) {
                    return;
                }
                else if (this.isOverloadedCallSignature(funcDecl)) {
                    // This means its implementation of overload signature. do not emit
                    return;
                }
            }

            if (!this.canEmitDeclarations(funcDecl)) {
                return;
            }

            this.emitDeclarationComments(funcDecl);

            var id = funcDecl.identifier.text();
            if (!isInterfaceMember) {
                this.emitDeclFlags(funcPullDecl, "function");
                if (id !== "" || !funcDecl.identifier || funcDecl.identifier.text().length > 0) {
                    this.declFile.Write(id);
                }
                else if (funcPullDecl.kind === PullElementKind.ConstructSignature) {
                    this.declFile.Write("new");
                }
            }
            else {
                this.emitIndent();
                if (funcPullDecl.kind === PullElementKind.ConstructSignature) {
                    this.declFile.Write("new");
                }
                else if (funcPullDecl.kind !== PullElementKind.CallSignature) {
                    this.declFile.Write(id);
                }
            }

            var funcSignature = funcPullDecl.getSignatureSymbol();
            this.emitTypeParameters(funcDecl.callSignature.typeParameterList, funcSignature);

            this.declFile.Write("(");
            this.emitParameters(/*isPrivate:*/ false, Parameters.fromParameterList(funcDecl.callSignature.parameterList));
            this.declFile.Write(")");

            var returnType = funcSignature.returnType;
            this.declFile.Write(": ");
            if (returnType) {
                this.emitTypeSignature(returnType);
            }
            else {
                this.declFile.Write("any");
            }

            this.declFile.WriteLine(";");
        }

        private emitIndexMemberDeclaration(funcDecl: IndexMemberDeclaration) {
            this.emitDeclarationsForAST(funcDecl.indexSignature);
        }

        private emitIndexSignature(funcDecl: IndexSignature) {
            if (!this.canEmitDeclarations(funcDecl)) {
                return;
            }

            this.emitDeclarationComments(funcDecl);

            this.emitIndent();
            this.declFile.Write("[");
            this.emitParameters(/*isPrivate:*/ false, Parameters.fromParameter(funcDecl.parameter));
            this.declFile.Write("]");

            var funcPullDecl = this.semanticInfoChain.getDeclForAST(funcDecl);
            var funcSignature = funcPullDecl.getSignatureSymbol();
            var returnType = funcSignature.returnType;
            this.declFile.Write(": ");
            this.emitTypeSignature(returnType);

            this.declFile.WriteLine(";");
        }

        private emitBaseList(bases: ASTList, useExtendsList: boolean) {
            if (bases && (bases.members.length > 0)) {
                var qual = useExtendsList ? "extends" : "implements";
                this.declFile.Write(" " + qual + " ");
                var basesLen = bases.members.length;
                for (var i = 0; i < basesLen; i++) {
                    if (i > 0) {
                        this.declFile.Write(", ");
                    }
                    var baseType = <PullTypeSymbol>this.semanticInfoChain.getSymbolForAST(bases.members[i]);
                    this.emitTypeSignature(baseType);
                }
            }
        }

        private emitAccessorDeclarationComments(funcDecl: AST) {
            if (this.emitOptions.compilationSettings().removeComments()) {
                return;
            }

            var start = new Date().getTime();
            var accessors = PullHelpers.getGetterAndSetterFunction(funcDecl, this.semanticInfoChain);
            TypeScript.declarationEmitGetAccessorFunctionTime += new Date().getTime();

            var comments: Comment[] = [];
            if (accessors.getter) {
                comments = comments.concat(docComments(accessors.getter));
            }
            if (accessors.setter) {
                comments = comments.concat(docComments(accessors.setter));
            }

            this.writeDeclarationComments(comments);
        }

        private emitDeclarationsForGetAccessor(funcDecl: GetAccessor): void {
            this.emitMemberAccessorDeclaration(funcDecl, funcDecl.modifiers, funcDecl.propertyName);
        }

        private emitDeclarationsForSetAccessor(funcDecl: SetAccessor): void {
            this.emitMemberAccessorDeclaration(funcDecl, funcDecl.modifiers, funcDecl.propertyName);
        }

        private emitMemberAccessorDeclaration(funcDecl: AST, modifiers: PullElementFlags[], name: Identifier) {
            var start = new Date().getTime();
            var accessorSymbol = PullHelpers.getAccessorSymbol(funcDecl, this.semanticInfoChain);
            TypeScript.declarationEmitGetAccessorFunctionTime += new Date().getTime();

            if (funcDecl.nodeType() === NodeType.SetAccessor && accessorSymbol.getGetter()) {
                // Setter is being used to emit the type info. 
                return;
            }

            var isPrivate = hasModifier(modifiers, PullElementFlags.Private);
            this.emitAccessorDeclarationComments(funcDecl);
            this.declFile.Write(this.getIndentString());
            this.emitClassElementModifiers(modifiers);
            this.declFile.Write(name.text());
            if (!isPrivate) {
                this.declFile.Write(" : ");
                var type = accessorSymbol.type;
                this.emitTypeSignature(type);
            }
            this.declFile.WriteLine(";");
        }

        private emitClassMembersFromConstructorDefinition(funcDecl: ConstructorDeclaration) {
            if (funcDecl.parameterList) {
                var argsLen = funcDecl.parameterList.parameters.members.length;
                if (lastParameterIsRest(funcDecl.parameterList)) {
                    argsLen--;
                }

                for (var i = 0; i < argsLen; i++) {
                    var parameter = <Parameter>funcDecl.parameterList.parameters.members[i];
                    var parameterDecl = this.semanticInfoChain.getDeclForAST(parameter);
                    if (hasFlag(parameterDecl.flags, PullElementFlags.PropertyParameter)) {
                        var funcPullDecl = this.semanticInfoChain.getDeclForAST(funcDecl);
                        this.emitDeclarationComments(parameter);
                        this.declFile.Write(this.getIndentString());
                        this.emitClassElementModifiers(parameter.modifiers);
                        this.declFile.Write(parameter.identifier.text());

                        if (!hasModifier(parameter.modifiers, PullElementFlags.Private)) {
                            this.emitTypeOfVariableDeclaratorOrParameter(parameter);
                        }
                        this.declFile.WriteLine(";");
                    }
                }
            }
        }

        private emitDeclarationsForClassDeclaration(classDecl: ClassDeclaration) {
            if (!this.canEmitDeclarations(classDecl)) {
                return;
            }

            var className = classDecl.identifier.text();
            this.emitDeclarationComments(classDecl);
            var classPullDecl = this.semanticInfoChain.getDeclForAST(classDecl);
            this.emitDeclFlags(classPullDecl, "class");
            this.declFile.Write(className);
            this.pushDeclarationContainer(classDecl);
            this.emitTypeParameters(classDecl.typeParameterList);
            this.emitHeritageClauses(classDecl.heritageClauses);
            this.declFile.WriteLine(" {");

            this.indenter.increaseIndent();
            var constructorDecl = getLastConstructor(classDecl);
            if (constructorDecl) {
                this.emitClassMembersFromConstructorDefinition(constructorDecl);
            }

            this.emitDeclarationsForList(classDecl.classElements);

            this.indenter.decreaseIndent();
            this.popDeclarationContainer(classDecl);

            this.emitIndent();
            this.declFile.WriteLine("}");
        }

        private emitHeritageClauses(clauses: ASTList): void {
            if (clauses) {
                for (var i = 0, n = clauses.members.length; i < n; i++) {
                    this.emitHeritageClause(<HeritageClause>clauses.members[i]);
                }
            }
        }

        private emitHeritageClause(clause: HeritageClause) {
            this.emitBaseList(clause.typeNames, clause.nodeType() === NodeType.ExtendsHeritageClause);
        }

        private emitTypeParameters(typeParams: TypeParameterList, funcSignature?: PullSignatureSymbol) {
            if (!typeParams || !typeParams.typeParameters.members.length) {
                return;
            }

            this.declFile.Write("<");
            var containerAst = this.getAstDeclarationContainer();

            var start = new Date().getTime();
            var containerDecl = this.semanticInfoChain.getDeclForAST(containerAst);
            var containerSymbol = <PullTypeSymbol>containerDecl.getSymbol();
            TypeScript.declarationEmitGetTypeParameterSymbolTime += new Date().getTime() - start;

            var typars: PullTypeSymbol[];
            if (funcSignature) {
                typars = funcSignature.getTypeParameters();
            }
            else {
                typars = containerSymbol.getTypeArgumentsOrTypeParameters();
            }

            for (var i = 0; i < typars.length; i++) {
                if (i) {
                    this.declFile.Write(", ");
                }

                var memberName = typars[i].getScopedNameEx(containerSymbol, /*useConstraintInName:*/ true);
                this.emitTypeNamesMember(memberName);
            }

            this.declFile.Write(">");
        }

        private emitDeclarationsForInterfaceDeclaration(interfaceDecl: InterfaceDeclaration) {
            if (!this.canEmitDeclarations(interfaceDecl)) {
                return;
            }

            var interfaceName = interfaceDecl.identifier.text();
            this.emitDeclarationComments(interfaceDecl);
            var interfacePullDecl = this.semanticInfoChain.getDeclForAST(interfaceDecl);
            this.emitDeclFlags(interfacePullDecl, "interface");
            this.declFile.Write(interfaceName);
            this.pushDeclarationContainer(interfaceDecl);
            this.emitTypeParameters(interfaceDecl.typeParameterList);
            this.emitHeritageClauses(interfaceDecl.heritageClauses);
            this.declFile.WriteLine(" {");

            this.indenter.increaseIndent();

            this.emitDeclarationsForList(interfaceDecl.body.typeMembers);

            this.indenter.decreaseIndent();
            this.popDeclarationContainer(interfaceDecl);

            this.emitIndent();
            this.declFile.WriteLine("}");
        }

        private emitDeclarationsForImportDeclaration(importDeclAST: ImportDeclaration) {
            var importDecl = this.semanticInfoChain.getDeclForAST(importDeclAST);
            var importSymbol = <PullTypeAliasSymbol>importDecl.getSymbol();
            var isExportedImportDecl = hasModifier(importDeclAST.modifiers, PullElementFlags.Exported);

            if (isExportedImportDecl || importSymbol.typeUsedExternally() || PullContainerSymbol.usedAsSymbol(importSymbol.getContainer(), importSymbol)) {
                this.emitDeclarationComments(importDeclAST);
                this.emitIndent();
                if (isExportedImportDecl) {
                    this.declFile.Write("export ");
                }
                this.declFile.Write("import ");
                this.declFile.Write(importDeclAST.identifier.text() + " = ");
                if (importDeclAST.moduleReference.nodeType() === NodeType.ExternalModuleReference) {
                    this.declFile.WriteLine("require(" + (<ExternalModuleReference>importDeclAST.moduleReference).stringLiteral.text() + ");");
                }
                else {
                    this.declFile.WriteLine(this.getAliasName((<ModuleNameModuleReference>importDeclAST.moduleReference).moduleName) + ";");
                }
            }
        }

        public getAliasName(aliasAST: AST): string {
            if (aliasAST.nodeType() === NodeType.Name) {
                return (<Identifier>aliasAST).text();
            } else {
                var dotExpr = <QualifiedName>aliasAST;
                return this.getAliasName(dotExpr.left) + "." + this.getAliasName(dotExpr.right);
            }
        }

        private emitDeclarationsForEnumDeclaration(moduleDecl: EnumDeclaration): void {
            if (!this.canEmitDeclarations(moduleDecl)) {
                return;
            }

            this.emitDeclarationComments(moduleDecl);
            var modulePullDecl = this.semanticInfoChain.getDeclForAST(moduleDecl);
            this.emitDeclFlags(modulePullDecl, "enum");
            this.declFile.WriteLine(moduleDecl.identifier.text() + " {");

            this.indenter.increaseIndent();
            var membersLen = moduleDecl.enumElements.members.length;
            for (var j = 0; j < membersLen; j++) {
                var memberDecl: AST = moduleDecl.enumElements.members[j];
                var enumElement = <EnumElement>memberDecl;
                this.emitDeclarationComments(enumElement);
                this.emitIndent();
                this.declFile.Write(enumElement.propertyName.text());
                if (enumElement.equalsValueClause && enumElement.equalsValueClause.value.nodeType() == NodeType.NumericLiteral) {
                    this.declFile.Write(" = " + (<NumericLiteral>enumElement.equalsValueClause.value).text());
                }
                this.declFile.WriteLine(",");
            }
            this.indenter.decreaseIndent();

            this.emitIndent();
            this.declFile.WriteLine("}");
        }

        private emitDeclarationsForModuleDeclaration(moduleDecl: ModuleDeclaration) {
            var isExternalModule = moduleDecl.isExternalModule;
            if (!isExternalModule && !this.canEmitDeclarations(moduleDecl)) {
                return;
            }

            var dottedModuleContainers: ModuleDeclaration[] = [];
            if (!isExternalModule) {
                var modulePullDecl = this.semanticInfoChain.getDeclForAST(moduleDecl);
                var moduleName = this.getDeclFlagsString(modulePullDecl, "module");

                if (!isQuoted(moduleDecl.name.valueText())) {
                    // Module is dotted if it contains single module element with exported flag and it does not have doc comments for it
                    for (;
                        // Till the module has single module element with exported flag and without doc comments,
                        //  we traverse the module element so we can create a dotted module name.
                        moduleDecl.moduleElements.members.length === 1 &&
                        moduleDecl.moduleElements.members[0].nodeType() === NodeType.ModuleDeclaration &&
                        hasModifier((<ModuleDeclaration>moduleDecl.moduleElements.members[0]).modifiers, PullElementFlags.Exported) &&
                        (docComments(moduleDecl) === null || docComments(moduleDecl).length === 0)

                        // Module to look up is the single module element of the current module
                        ; moduleDecl = <ModuleDeclaration>moduleDecl.moduleElements.members[0]) {

                        // construct dotted name
                        moduleName += moduleDecl.name.text() + ".";
                        dottedModuleContainers.push(moduleDecl);
                        this.pushDeclarationContainer(moduleDecl);
                    }
                }

                moduleName += moduleDecl.name.text();

                this.emitDeclarationComments(moduleDecl);
                this.declFile.Write(moduleName);
                this.declFile.WriteLine(" {");
                this.indenter.increaseIndent();
            }

            this.pushDeclarationContainer(moduleDecl);

            this.emitDeclarationsForList(moduleDecl.moduleElements);

            if (!isExternalModule) {
                this.indenter.decreaseIndent();
                this.emitIndent();
                this.declFile.WriteLine("}");
            }

            this.popDeclarationContainer(moduleDecl);

            while (moduleDecl = dottedModuleContainers.pop()) {
                this.popDeclarationContainer(moduleDecl);
            }
        }

        private emitDeclarationsForExportAssignment(ast: ExportAssignment) {
            this.emitIndent();
            this.declFile.Write("export = ");
            this.declFile.Write(ast.identifier.text());
            this.declFile.WriteLine(";");
        }

        private resolveScriptReference(document: Document, reference: string) {
            if (!this.emitOptions.compilationSettings().noResolve() || isRooted(reference)) {
                return reference;
            }

            var documentDir = convertToDirectoryPath(switchToForwardSlashes(getRootFilePath(document.fileName)));
            var resolvedReferencePath = this.emitOptions.resolvePath(documentDir + reference);
            return resolvedReferencePath;
        }

        private emitReferencePaths(script: Script) {
            // In case of shared handler we collect all the references and emit them
            if (this.emittedReferencePaths) {
                return;
            }

            // Collect all the documents that need to be emitted as reference
            var documents: Document[] = [];
            if (this.document.emitToOwnOutputFile()) {
                // Emit only from this file
                var scriptReferences = this.document.referencedFiles;
                var addedGlobalDocument = false;
                for (var j = 0; j < scriptReferences.length; j++) {
                    var currentReference = this.resolveScriptReference(this.document, scriptReferences[j]);
                    var document = this.compiler.getDocument(currentReference);
                    // All the references that are not going to be part of same file

                    if (document &&
                        (document.emitToOwnOutputFile() || document.script().isDeclareFile() || !addedGlobalDocument)) {

                        documents = documents.concat(document);

                        if (!document.script().isDeclareFile() && document.script().isExternalModule) {
                            addedGlobalDocument = true;
                        }
                    }
                }
            } else {
                // Collect from all the references and emit
                var fileNames = this.compiler.fileNames();
                for (var i = 0; i < fileNames.length; i++) {
                    var doc = this.compiler.getDocument(fileNames[i]);
                    if (!doc.script().isDeclareFile() && !doc.script().isExternalModule) {
                        // Check what references need to be added
                        var scriptReferences = doc.referencedFiles;
                        for (var j = 0; j < scriptReferences.length; j++) {
                            var currentReference = this.resolveScriptReference(doc, scriptReferences[j]);
                            var document = this.compiler.getDocument(currentReference);
                            // All the references that are not going to be part of same file
                            if (document &&
                                (document.script().isDeclareFile() || document.script().isExternalModule)) {
                                for (var k = 0; k < documents.length; k++) {
                                    if (documents[k] == document) {
                                        break;
                                    }
                                }

                                if (k == documents.length) {
                                    documents = documents.concat(document);
                                }
                            }
                        }
                    }
                }
            }

            // Emit the references
            var emittingFilePath = documents.length ? getRootFilePath(this.emittingFileName) : null;
            for (var i = 0; i < documents.length; i++) {
                var document = documents[i];
                var declFileName: string;
                if (document.script().isDeclareFile()) {
                    declFileName = document.fileName;
                } else {
                    declFileName = this.compiler.mapOutputFileName(document, this.emitOptions, TypeScriptCompiler.mapToDTSFileName);
                }

                // Get the relative path
                declFileName = getRelativePathToFixedPath(emittingFilePath, declFileName, false);
                this.declFile.WriteLine('/// <reference path="' + declFileName + '" />');
            }

            this.emittedReferencePaths = true;
        }

        private emitDeclarationsForScript(script: Script) {
            this.emitReferencePaths(script);
            this.pushDeclarationContainer(script);

            this.emitDeclarationsForList(script.moduleElements);

            this.popDeclarationContainer(script);
        }
    }
}