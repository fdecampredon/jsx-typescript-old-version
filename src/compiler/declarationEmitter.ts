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
    export class TextWriter implements ITextWriter {
        private contents = "";
        public onNewLine = true;
        constructor(private ioHost: EmitterIOHost, private path: string, private writeByteOrderMark: boolean) {
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

        public Close() {
            try {
                this.ioHost.writeFile(this.path, this.contents, this.writeByteOrderMark);
            }
            catch (e) {
                Emitter.throwEmitterError(e);
            }
        }
    }

    export class DeclarationEmitter {
        private declFile: TextWriter = null;
        private indenter = new Indenter();
        private declarationContainerStack: AST[] = [];
        private emittedReferencePaths = false;

        constructor(private emittingFileName: string, public document: Document, private compiler: TypeScriptCompiler) {
            this.declFile = new TextWriter(this.compiler.emitOptions.ioHost, emittingFileName, this.document.byteOrderMark !== ByteOrderMark.None);
        }

        private widenType(type: PullTypeSymbol) {
            if (type === this.compiler.semanticInfoChain.undefinedTypeSymbol || type === this.compiler.semanticInfoChain.nullTypeSymbol) {
                return this.compiler.semanticInfoChain.anyTypeSymbol;
            }

            return type;
        }

        public close() {
            try {
                this.declFile.Close();
            }
            catch (e) {
                Emitter.throwEmitterError(e);
            }
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
                case NodeType.VariableDeclaration:
                    return this.emitDeclarationsForVariableDeclaration(<VariableDeclaration>ast);
                case NodeType.VariableDeclarator:
                    return this.emitDeclarationsForVariableDeclarator(<VariableDeclarator>ast, true, true);
                case NodeType.FunctionDeclaration:
                    return this.emitDeclarationsForFunctionDeclaration(<FunctionDeclaration>ast);
                case NodeType.ClassDeclaration:
                    return this.emitDeclarationsForClassDeclaration(<ClassDeclaration>ast);
                case NodeType.InterfaceDeclaration:
                    return this.emitDeclarationsForInterfaceDeclaration(<InterfaceDeclaration>ast);
                case NodeType.ImportDeclaration:
                    return this.emitDeclarationsForImportDeclaration(<ImportDeclaration>ast);
                case NodeType.ModuleDeclaration:
                    return this.emitDeclarationsForModuleDeclaration(<ModuleDeclaration>ast);
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

        private canEmitDeclarations(declFlags: DeclFlags, declAST: AST) {
            var container = this.getAstDeclarationContainer();

            var pullDecl = this.compiler.semanticInfoChain.getDeclForAST(declAST, this.document.fileName);
            if (container.nodeType() === NodeType.ModuleDeclaration) {
                if (!hasFlag(pullDecl.flags, PullElementFlags.Exported)) {
                    var start = new Date().getTime();
                    var declSymbol = this.compiler.semanticInfoChain.getSymbolForAST(declAST, this.document.fileName);
                    var result = declSymbol && declSymbol.isExternallyVisible();
                    TypeScript.declarationEmitIsExternallyVisibleTime += new Date().getTime() - start;

                    return result;
                }
            }

            return true;
        }

        private getDeclFlagsString(declFlags: DeclFlags, pullDecl: PullDecl, typeString: string) {
            var result = this.getIndentString();
            var pullFlags = pullDecl.flags;

            // Static/public/private/global declare
            if (hasFlag(declFlags, DeclFlags.Static)) {
                if (hasFlag(declFlags, DeclFlags.Private)) {
                    result += "private ";
                }
                result += "static ";
            }
            else {
                if (hasFlag(declFlags, DeclFlags.Private)) {
                    result += "private ";
                }
                else if (hasFlag(declFlags, DeclFlags.Public)) {
                    result += "public ";
                }
                else {
                    var emitDeclare = !hasFlag(pullFlags, PullElementFlags.Exported);

                    var container = this.getAstDeclarationContainer();
                    var isExternalModule = container.nodeType() === NodeType.ModuleDeclaration &&
                        hasFlag((<ModuleDeclaration>container).getModuleFlags(), ModuleFlags.IsExternalModule);

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

        private emitDeclFlags(declFlags: DeclFlags, pullDecl: PullDecl, typeString: string) {
            this.declFile.Write(this.getDeclFlagsString(declFlags, pullDecl, typeString));
        }

        private canEmitTypeAnnotationSignature(declFlag: DeclFlags = DeclFlags.None) {
            // Private declaration, shouldnt emit type any time.
            return !hasFlag(declFlag, DeclFlags.Private);
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
            var declarationContainerDecl = this.compiler.semanticInfoChain.getDeclForAST(declarationContainerAst, this.document.fileName);
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
            else if (!comment.isBlockComment) {
                this.declFile.WriteLine("");
                this.emitIndent();
            }

            this.declFile.Write(text[0]);

            for (var i = 1; i < text.length; i++) {
                this.declFile.WriteLine("");
                this.emitIndent();
                this.declFile.Write(text[i]);
            }

            if (comment.endsLine || !comment.isBlockComment) {
                this.declFile.WriteLine("");
            }
            else {
                this.declFile.Write(" ");
            }
        }

        private emitDeclarationComments(ast: AST, endLine?: boolean): void;
        private emitDeclarationComments(astOrSymbol: any, endLine = true) {
            if (this.compiler.emitOptions.compilationSettings.removeComments) {
                return;
            }

            var declComments = <Comment[]>astOrSymbol.docComments();
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
            var decl = this.compiler.semanticInfoChain.getDeclForAST(boundDecl, this.document.fileName);
            var pullSymbol = decl.getSymbol();
            TypeScript.declarationEmitGetBoundDeclTypeTime += new Date().getTime() - start;

            var type = this.widenType(pullSymbol.type);
            if (!type) {
                // PULLTODO
                return;
            }

            this.declFile.Write(": ");
            this.emitTypeSignature(type);
        }

        private emitDeclarationsForVariableDeclarator(varDecl: VariableDeclarator, isFirstVarInList: boolean, isLastVarInList: boolean) {
            if (this.canEmitDeclarations(ToDeclFlags(varDecl.getVarFlags()), varDecl)) {
                var interfaceMember = (this.getAstDeclarationContainer().nodeType() === NodeType.InterfaceDeclaration);
                this.emitDeclarationComments(varDecl);
                if (!interfaceMember) {
                    // If it is var list of form var a, b, c = emit it only if count > 0 - which will be when emitting first var
                    // If it is var list of form  var a = varList count will be 0
                    if (isFirstVarInList) {
                        this.emitDeclFlags(ToDeclFlags(varDecl.getVarFlags()), this.compiler.semanticInfoChain.getDeclForAST(varDecl, this.document.fileName), "var");
                    }

                    this.declFile.Write(varDecl.id.actualText);
                }
                else {
                    this.emitIndent();
                    this.declFile.Write(varDecl.id.actualText);
                    if (hasFlag(varDecl.id.getFlags(), ASTFlags.OptionalName)) {
                        this.declFile.Write("?");
                    }
                }

                if (this.canEmitTypeAnnotationSignature(ToDeclFlags(varDecl.getVarFlags()))) {
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

        private emitDeclarationsForVariableStatement(variableStatement: VariableStatement) {
            this.emitDeclarationsForVariableDeclaration(variableStatement.declaration);
        }

        private emitDeclarationsForVariableDeclaration(variableDeclaration: VariableDeclaration) {
            var varListCount = variableDeclaration.declarators.members.length;
            for (var i = 0; i < varListCount; i++) {
                this.emitDeclarationsForVariableDeclarator(<VariableDeclarator>variableDeclaration.declarators.members[i], i == 0, i == varListCount - 1);
            }
        }

        private emitArgDecl(argDecl: Parameter, funcDecl: FunctionDeclaration) {
            this.indenter.increaseIndent();

            this.emitDeclarationComments(argDecl, false);
            this.declFile.Write(argDecl.id.actualText);
            if (argDecl.isOptionalArg()) {
                this.declFile.Write("?");
            }

            this.indenter.decreaseIndent();

            if (this.canEmitTypeAnnotationSignature(ToDeclFlags(funcDecl.getFunctionFlags()))) {
                this.emitTypeOfVariableDeclaratorOrParameter(argDecl);
            }
        }

        private isOverloadedCallSignature(funcDecl: FunctionDeclaration) {
            var start = new Date().getTime();
            var functionDecl = this.compiler.semanticInfoChain.getDeclForAST(funcDecl, this.document.fileName);
            var funcSymbol = functionDecl.getSymbol();
            TypeScript.declarationEmitIsOverloadedCallSignatureTime += new Date().getTime() - start;

            var funcTypeSymbol = funcSymbol.type;
            var signatures = funcTypeSymbol.getCallSignatures();
            var result = signatures && signatures.length > 1;

            return result;
        }

        private emitDeclarationsForFunctionDeclaration(funcDecl: FunctionDeclaration) {
            if (funcDecl.isAccessor()) {
                return this.emitPropertyAccessorSignature(funcDecl);
            }

            var isInterfaceMember = (this.getAstDeclarationContainer().nodeType() === NodeType.InterfaceDeclaration);

            var start = new Date().getTime();
            var funcSymbol = this.compiler.semanticInfoChain.getSymbolForAST(funcDecl, this.document.fileName);

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
            else if (!isInterfaceMember && hasFlag(funcDecl.getFunctionFlags(), FunctionFlags.Private) && this.isOverloadedCallSignature(funcDecl)) {
                // Print only first overload of private function
                var callSignatures = funcTypeSymbol.getCallSignatures();
                Debug.assert(callSignatures && callSignatures.length > 1);
                var firstSignature = callSignatures[0].isDefinition() ? callSignatures[1] : callSignatures[0];
                var firstSignatureDecl = firstSignature.getDeclarations()[0];
                var firstFuncDecl = <FunctionDeclaration>this.compiler.semanticInfoChain.getASTForDecl(firstSignatureDecl);
                if (firstFuncDecl !== funcDecl) {
                    return;
                }
            }

            if (!this.canEmitDeclarations(ToDeclFlags(funcDecl.getFunctionFlags()), funcDecl)) {
                return;
            }

            var funcPullDecl = this.compiler.semanticInfoChain.getDeclForAST(funcDecl, this.document.fileName);
            var funcSignature = funcPullDecl.getSignatureSymbol();
            this.emitDeclarationComments(funcDecl);
            if (funcDecl.isConstructor) {
                this.emitIndent();
                this.declFile.Write("constructor");
                this.emitTypeParameters(funcDecl.typeParameters, funcSignature);
            }
            else {
                var id = funcDecl.getNameText();
                if (!isInterfaceMember) {
                    this.emitDeclFlags(ToDeclFlags(funcDecl.getFunctionFlags()), funcPullDecl, "function");
                    if (id !== "__missing" || !funcDecl.name || !funcDecl.name.isMissing()) {
                        this.declFile.Write(id);
                    }
                    else if (funcDecl.isConstructMember()) {
                        this.declFile.Write("new");
                    }
                }
                else {
                    this.emitIndent();
                    if (funcDecl.isConstructMember()) {
                        this.declFile.Write("new");
                    }
                    else if (!funcDecl.isCallMember() && !funcDecl.isIndexerMember()) {
                        this.declFile.Write(id);
                        if (hasFlag(funcDecl.name.getFlags(), ASTFlags.OptionalName)) {
                            this.declFile.Write("? ");
                        }
                    }
                }
                this.emitTypeParameters(funcDecl.typeParameters, funcSignature);
            }

            if (!funcDecl.isIndexerMember()) {
                this.declFile.Write("(");
            }
            else {
                this.declFile.Write("[");
            }

            if (funcDecl.parameters) {
                var argsLen = funcDecl.parameters.members.length;
                if (lastParameterIsRest(funcDecl.parameters)) {
                    argsLen--;
                }

                for (var i = 0; i < argsLen; i++) {
                    var argDecl = <Parameter>funcDecl.parameters.members[i];
                    this.emitArgDecl(argDecl, funcDecl);
                    if (i < (argsLen - 1)) {
                        this.declFile.Write(", ");
                    }
                }
            }

            if (lastParameterIsRest(funcDecl.parameters)) {
                var lastArg = <Parameter>funcDecl.parameters.members[funcDecl.parameters.members.length - 1];
                if (funcDecl.parameters.members.length > 1) {
                    this.declFile.Write(", ...");
                }
                else {
                    this.declFile.Write("...");
                }

                this.emitArgDecl(lastArg, funcDecl);
            }

            if (!funcDecl.isIndexerMember()) {
                this.declFile.Write(")");
            }
            else {
                this.declFile.Write("]");
            }

            if (!funcDecl.isConstructor &&
                this.canEmitTypeAnnotationSignature(ToDeclFlags(funcDecl.getFunctionFlags()))) {
                var returnType = funcSignature.returnType;
                this.declFile.Write(": ");
                this.emitTypeSignature(returnType);
            }

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
                    var baseType = <PullTypeSymbol>this.compiler.semanticInfoChain.getSymbolForAST(bases.members[i], this.document.fileName);
                    this.emitTypeSignature(baseType);
                }
            }
        }

        private emitAccessorDeclarationComments(funcDecl: FunctionDeclaration) {
            if (this.compiler.emitOptions.compilationSettings.removeComments) {
                return;
            }

            var start = new Date().getTime();
            var accessors = PullHelpers.getGetterAndSetterFunction(funcDecl, this.compiler.semanticInfoChain, this.document.fileName);
            TypeScript.declarationEmitGetAccessorFunctionTime += new Date().getTime();

            var comments: Comment[] = [];
            if (accessors.getter) {
                comments = comments.concat(accessors.getter.docComments());
            }
            if (accessors.setter) {
                comments = comments.concat(accessors.setter.docComments());
            }

            this.writeDeclarationComments(comments);
        }

        private emitPropertyAccessorSignature(funcDecl: FunctionDeclaration) {
            var start = new Date().getTime();
            var accessorSymbol = PullHelpers.getAccessorSymbol(funcDecl, this.compiler.semanticInfoChain, this.document.fileName);
            TypeScript.declarationEmitGetAccessorFunctionTime += new Date().getTime();

            if (!hasFlag(funcDecl.getFunctionFlags(), FunctionFlags.GetAccessor) && accessorSymbol.getGetter()) {
                // Setter is being used to emit the type info. 
                return;
            }

            this.emitAccessorDeclarationComments(funcDecl);
            this.emitDeclFlags(ToDeclFlags(funcDecl.getFunctionFlags()), this.compiler.semanticInfoChain.getDeclForAST(funcDecl, this.document.fileName), "var");
            this.declFile.Write(funcDecl.name.actualText);
            if (this.canEmitTypeAnnotationSignature(ToDeclFlags(funcDecl.getFunctionFlags()))) {
                this.declFile.Write(" : ");
                var type = accessorSymbol.type;
                this.emitTypeSignature(type);
            }
            this.declFile.WriteLine(";");
        }

        private emitClassMembersFromConstructorDefinition(funcDecl: FunctionDeclaration) {
            if (funcDecl.parameters) {
                var argsLen = funcDecl.parameters.members.length;
                if (lastParameterIsRest(funcDecl.parameters)) {
                    argsLen--;
                }

                for (var i = 0; i < argsLen; i++) {
                    var argDecl = <Parameter>funcDecl.parameters.members[i];
                    if (hasFlag(argDecl.getVarFlags(), VariableFlags.Property)) {
                        var funcPullDecl = this.compiler.semanticInfoChain.getDeclForAST(funcDecl, this.document.fileName);
                        this.emitDeclarationComments(argDecl);
                        this.emitDeclFlags(ToDeclFlags(argDecl.getVarFlags()), funcPullDecl, "var");
                        this.declFile.Write(argDecl.id.actualText);

                        if (this.canEmitTypeAnnotationSignature(ToDeclFlags(argDecl.getVarFlags()))) {
                            this.emitTypeOfVariableDeclaratorOrParameter(argDecl);
                        }
                        this.declFile.WriteLine(";");
                    }
                }
            }
        }

        private emitDeclarationsForClassDeclaration(classDecl: ClassDeclaration) {
            if (!this.canEmitDeclarations(ToDeclFlags(classDecl.getVarFlags()), classDecl)) {
                return;
            }

            var className = classDecl.name.actualText;
            this.emitDeclarationComments(classDecl);
            var classPullDecl = this.compiler.semanticInfoChain.getDeclForAST(classDecl, this.document.fileName);
            this.emitDeclFlags(ToDeclFlags(classDecl.getVarFlags()), classPullDecl, "class");
            this.declFile.Write(className);
            this.pushDeclarationContainer(classDecl);
            this.emitTypeParameters(classDecl.typeParameters);
            this.emitBaseList(classDecl.extendsList, true);
            this.emitBaseList(classDecl.implementsList, false);
            this.declFile.WriteLine(" {");

            this.indenter.increaseIndent();

            var constructorDecl = getClassConstructor(classDecl);
            if (constructorDecl) {
                this.emitClassMembersFromConstructorDefinition(constructorDecl);
            }

            this.emitDeclarationsForList(classDecl.members);

            this.indenter.decreaseIndent();
            this.popDeclarationContainer(classDecl);

            this.emitIndent();
            this.declFile.WriteLine("}");
        }

        private emitTypeParameters(typeParams: ASTList, funcSignature?: PullSignatureSymbol) {
            if (!typeParams || !typeParams.members.length) {
                return;
            }

            this.declFile.Write("<");
            var containerAst = this.getAstDeclarationContainer();

            var start = new Date().getTime();
            var containerDecl = this.compiler.semanticInfoChain.getDeclForAST(containerAst, this.document.fileName);
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
            if (!this.canEmitDeclarations(ToDeclFlags(interfaceDecl.getVarFlags()), interfaceDecl)) {
                return;
            }

            var interfaceName = interfaceDecl.name.actualText;
            this.emitDeclarationComments(interfaceDecl);
            var interfacePullDecl = this.compiler.semanticInfoChain.getDeclForAST(interfaceDecl, this.document.fileName);
            this.emitDeclFlags(ToDeclFlags(interfaceDecl.getVarFlags()), interfacePullDecl, "interface");
            this.declFile.Write(interfaceName);
            this.pushDeclarationContainer(interfaceDecl);
            this.emitTypeParameters(interfaceDecl.typeParameters);
            this.emitBaseList(interfaceDecl.extendsList, true);
            this.declFile.WriteLine(" {");

            this.indenter.increaseIndent();

            this.emitDeclarationsForList(interfaceDecl.members);

            this.indenter.decreaseIndent();
            this.popDeclarationContainer(interfaceDecl);

            this.emitIndent();
            this.declFile.WriteLine("}");
        }

        private emitDeclarationsForImportDeclaration(importDeclAST: ImportDeclaration) {
            var importDecl = this.compiler.semanticInfoChain.getDeclForAST(importDeclAST, this.document.fileName);
            var importSymbol = <PullTypeAliasSymbol>importDecl.getSymbol();
            var isExportedImportDecl = hasFlag(importDeclAST.getVarFlags(), VariableFlags.Exported);

            if (isExportedImportDecl || importSymbol.typeUsedExternally || PullContainerSymbol.usedAsSymbol(importSymbol.getContainer(), importSymbol)) {
                this.emitDeclarationComments(importDeclAST);
                this.emitIndent();
                if (isExportedImportDecl) {
                    this.declFile.Write("export ");
                }
                this.declFile.Write("import ");
                this.declFile.Write(importDeclAST.id.actualText + " = ");
                if (importDeclAST.isExternalImportDeclaration()) {
                    this.declFile.WriteLine("require(" + importDeclAST.getAliasName() + ");");
                }
                else {
                    this.declFile.WriteLine(importDeclAST.getAliasName() + ";");
                }
            }
        }

        private emitEnumSignature(moduleDecl: ModuleDeclaration) {
            if (!this.canEmitDeclarations(ToDeclFlags(moduleDecl.getModuleFlags()), moduleDecl)) {
                return;
            }

            this.emitDeclarationComments(moduleDecl);
            var modulePullDecl = this.compiler.semanticInfoChain.getDeclForAST(moduleDecl, this.document.fileName);
            this.emitDeclFlags(ToDeclFlags(moduleDecl.getModuleFlags()), modulePullDecl, "enum");
            this.declFile.WriteLine(moduleDecl.name.actualText + " {");

            this.indenter.increaseIndent();
            var membersLen = moduleDecl.members.members.length;
            for (var j = 0; j < membersLen; j++) {
                var memberDecl: AST = moduleDecl.members.members[j];
                var variableStatement = <VariableStatement>memberDecl;
                var varDeclarator = <VariableDeclarator>variableStatement.declaration.declarators.members[0];
                this.emitDeclarationComments(varDeclarator);
                this.emitIndent();
                this.declFile.Write(varDeclarator.id.actualText);
                if (varDeclarator.init && varDeclarator.init.nodeType() == NodeType.NumericLiteral) {
                    this.declFile.Write(" = " + (<NumericLiteral>varDeclarator.init).text());
                }
                this.declFile.WriteLine(",");
            }
            this.indenter.decreaseIndent();

            this.emitIndent();
            this.declFile.WriteLine("}");
        }

        private emitDeclarationsForModuleDeclaration(moduleDecl: ModuleDeclaration) {
            if (moduleDecl.isEnum()) {
                return this.emitEnumSignature(moduleDecl);
            }

            var isExternalModule = hasFlag(moduleDecl.getModuleFlags(), ModuleFlags.IsExternalModule);
            if (!isExternalModule && !this.canEmitDeclarations(ToDeclFlags(moduleDecl.getModuleFlags()), moduleDecl)) {
                return;
            }

            var dottedModuleContainers: ModuleDeclaration[] = [];
            if (!isExternalModule) {
                var modulePullDecl = this.compiler.semanticInfoChain.getDeclForAST(moduleDecl, this.document.fileName);
                var moduleName = this.getDeclFlagsString(ToDeclFlags(moduleDecl.getModuleFlags()), modulePullDecl, "module");

                if (!isQuoted(moduleDecl.name.text())) {
                    // Module is dotted if it contains single module element with exported flag and it does not have doc comments for it
                    for (;
                        // Till the module has single module element with exported flag and without doc comments,
                        //  we traverse the module element so we can create a dotted module name.
                        moduleDecl.members.members.length === 1 &&
                        moduleDecl.members.members[0].nodeType() === NodeType.ModuleDeclaration &&
                        !(<ModuleDeclaration>moduleDecl.members.members[0]).isEnum() &&
                        hasFlag((<ModuleDeclaration>moduleDecl.members.members[0]).getModuleFlags(), ModuleFlags.Exported) &&
                        (moduleDecl.docComments() === null || moduleDecl.docComments().length === 0)

                        // Module to look up is the single module element of the current module
                        ; moduleDecl = <ModuleDeclaration>moduleDecl.members.members[0]) {

                        // construct dotted name
                        moduleName += moduleDecl.name.actualText + ".";
                        dottedModuleContainers.push(moduleDecl);
                        this.pushDeclarationContainer(moduleDecl);
                    }
                }

                moduleName += moduleDecl.name.actualText;

                this.emitDeclarationComments(moduleDecl);
                this.declFile.Write(moduleName);
                this.declFile.WriteLine(" {");
                this.indenter.increaseIndent();
            }

            this.pushDeclarationContainer(moduleDecl);

            this.emitDeclarationsForList(moduleDecl.members);

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
            this.declFile.Write(ast.id.actualText);
            this.declFile.WriteLine(";");
        }

        private resolveScriptReference(document: Document, reference: string) {
            if (!this.compiler.settings.noResolve || isRooted(reference)) {
                return reference;
            }

            var documentDir = convertToDirectoryPath(switchToForwardSlashes(getRootFilePath(document.fileName)));
            var resolvedReferencePath = this.compiler.emitOptions.ioHost.resolvePath(documentDir + reference);
            return resolvedReferencePath;
        }

        private emitReferencePaths(script: Script) {
            // In case of shared handler we collect all the references and emit them
            if (this.emittedReferencePaths) {
                return;
            }

            // Collect all the documents that need to be emitted as reference
            var documents: Document[] = [];
            if (this.compiler.emitOptions.outputMany || script.isExternalModule) {
                // Emit only from this file
                var scriptReferences = this.document.referencedFiles;
                var addedGlobalDocument = false;
                for (var j = 0; j < scriptReferences.length; j++) {
                    var currentReference = this.resolveScriptReference(this.document, scriptReferences[j]);
                    var document = this.compiler.getDocument(currentReference);
                    // All the references that are not going to be part of same file

                    if (document &&
                        (this.compiler.emitOptions.outputMany || document.script.isDeclareFile || document.script.isExternalModule || !addedGlobalDocument)) {

                        documents = documents.concat(document);

                        if (!document.script.isDeclareFile && document.script.isExternalModule) {
                            addedGlobalDocument = true;
                        }
                    }
                }
            } else {
                // Collect from all the references and emit
                var allDocuments = this.compiler.getDocuments();
                for (var i = 0; i < allDocuments.length; i++) {
                    if (!allDocuments[i].script.isDeclareFile && !allDocuments[i].script.isExternalModule) {
                        // Check what references need to be added
                        var scriptReferences = allDocuments[i].referencedFiles;
                        for (var j = 0; j < scriptReferences.length; j++) {
                            var currentReference = this.resolveScriptReference(allDocuments[i], scriptReferences[j]);
                            var document = this.compiler.getDocument(currentReference);
                            // All the references that are not going to be part of same file
                            if (document &&
                                (document.script.isDeclareFile || document.script.isExternalModule)) {
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
                if (document.script.isDeclareFile) {
                    declFileName = document.fileName;
                } else {
                    declFileName = this.compiler.emitOptions.mapOutputFileName(document, TypeScriptCompiler.mapToDTSFileName);
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