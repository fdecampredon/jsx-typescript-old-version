module TypeScript.Services {
    export class GetScriptLexicalStructureWalker extends TypeScript.SyntaxWalker {
        private nameStack: string[] = [];
        private kindStack: string[] = [];

        constructor(private items: NavigateToItem[], private fileName: string) {
            super();
        }

        static getListsOfAllScriptLexicalStructure(items: NavigateToItem[], fileName: string, unit: TypeScript.SourceUnitSyntax) {
            var visitor = new GetScriptLexicalStructureWalker(items, fileName);
            unit.accept(visitor);
        }

        private createItem(node: TypeScript.SyntaxNode, modifiers: TypeScript.ISyntaxList<ISyntaxToken>, kind: string, name: string): void {
            var item = new NavigateToItem();
            item.name = name;
            item.kind = kind;
            item.matchKind = MatchKind.exact;
            item.fileName = this.fileName;
            item.kindModifiers = this.getKindModifiers(modifiers);
            item.minChar = node.start();
            item.limChar = node.end();
            item.containerName = this.nameStack.join(".");
            item.containerKind = this.kindStack.length === 0 ? "" : TypeScript.ArrayUtilities.last(this.kindStack);

            this.items.push(item);
        }

        private getKindModifiers(modifiers: TypeScript.ISyntaxList<ISyntaxToken>): string {
            var result: string[] = [];

            for (var i = 0, n = modifiers.childCount(); i < n; i++) {
                result.push(modifiers.childAt(i).text());
            }

            return result.length > 0 ? result.join(',') : ScriptElementKindModifier.none;
        }

        public visitModuleDeclaration(node: TypeScript.ModuleDeclarationSyntax): void {
            var names = this.getModuleNames(node);
            this.visitModuleDeclarationWorker(node, names, 0);
        }

        private visitModuleDeclarationWorker(node: TypeScript.ModuleDeclarationSyntax, names: string[], nameIndex: number): void {
            if (nameIndex === names.length) {
                // We're after all the module names, descend and process all children.
                super.visitModuleDeclaration(node);
            }
            else {
                // If we have a dotted module (like "module A.B.C"):
                //  1) If we're the outermost module, then use the modifiers provided on the node.
                //  2) For any inner modules, consider it exported.
                var modifiers = nameIndex === 0
                    ? node.modifiers
                    : TypeScript.Syntax.list([TypeScript.Syntax.token(TypeScript.SyntaxKind.ExportKeyword)]);
                var name = names[nameIndex];
                var kind = ScriptElementKind.moduleElement;
                this.createItem(node, node.modifiers, kind, name);

                this.nameStack.push(name);
                this.kindStack.push(kind);

                this.visitModuleDeclarationWorker(node, names, nameIndex + 1);

                this.nameStack.pop();
                this.kindStack.pop();
            }
        }

        private getModuleNames(node: TypeScript.ModuleDeclarationSyntax): string[] {
            var result: string[] = [];

            if (node.stringLiteral) {
                result.push(node.stringLiteral.text());
            }
            else {
                this.getModuleNamesHelper(node.name, result);
            }

            return result;
        }

        private getModuleNamesHelper(name: TypeScript.INameSyntax, result: string[]): void {
            if (name.kind() === TypeScript.SyntaxKind.QualifiedName) {
                var qualifiedName = <TypeScript.QualifiedNameSyntax>name;
                this.getModuleNamesHelper(qualifiedName.left, result);
                result.push(qualifiedName.right.text());
            }
            else {
                result.push((<TypeScript.ISyntaxToken>name).text());
            }
        }

        public visitClassDeclaration(node: TypeScript.ClassDeclarationSyntax): void {
            var name = node.identifier.text();
            var kind = ScriptElementKind.classElement;

            this.createItem(node, node.modifiers, kind, name);

            this.nameStack.push(name);
            this.kindStack.push(kind);

            super.visitClassDeclaration(node);

            this.nameStack.pop();
            this.kindStack.pop();
        }

        public visitInterfaceDeclaration(node: TypeScript.InterfaceDeclarationSyntax): void {
            var name = node.identifier.text();
            var kind = ScriptElementKind.interfaceElement;

            this.createItem(node, node.modifiers, kind, name);

            this.nameStack.push(name);
            this.kindStack.push(kind);

            super.visitInterfaceDeclaration(node);

            this.nameStack.pop();
            this.kindStack.pop();
        }

        public visitObjectType(node: TypeScript.ObjectTypeSyntax): void {
            // Ignore an object type if we aren't inside an interface declaration.  We don't want
            // to add some random object type's members to the nav bar.
            if (node.parent.kind() === SyntaxKind.InterfaceDeclaration) {
                super.visitObjectType(node);
            }
        }

        public visitEnumDeclaration(node: TypeScript.EnumDeclarationSyntax): void {
            var name = node.identifier.text();
            var kind = ScriptElementKind.enumElement;

            this.createItem(node, node.modifiers, kind, name);

            this.nameStack.push(name);
            this.kindStack.push(kind);

            super.visitEnumDeclaration(node);

            this.nameStack.pop();
            this.kindStack.pop();
        }

        public visitConstructorDeclaration(node: TypeScript.ConstructorDeclarationSyntax): void {
            this.createItem(node, TypeScript.Syntax.emptyList<ISyntaxToken>(), ScriptElementKind.constructorImplementationElement, "constructor");

            // Search the parameter list of class properties
            var parameters = node.callSignature.parameterList.parameters;
            if (parameters) {
                for (var i = 0, n = parameters.nonSeparatorCount(); i < n; i++) {
                    var parameter = <ParameterSyntax>parameters.nonSeparatorAt(i);

                    Debug.assert(parameter.kind() === SyntaxKind.Parameter);

                    if (SyntaxUtilities.containsToken(parameter.modifiers, SyntaxKind.PublicKeyword) ||
                        SyntaxUtilities.containsToken(parameter.modifiers, SyntaxKind.PrivateKeyword)) {
                        this.createItem(node, parameter.modifiers, ScriptElementKind.memberVariableElement, parameter.identifier.text());
                    }
                }
            }

            // No need to descend into a constructor;
        }

        public visitMemberFunctionDeclaration(node: TypeScript.MemberFunctionDeclarationSyntax): void {
            var item = this.createItem(node, node.modifiers, ScriptElementKind.memberFunctionElement, node.propertyName.text());

            // No need to descend into a member function;
        }

        public visitGetAccessor(node: TypeScript.GetAccessorSyntax): void {
            var item = this.createItem(node, node.modifiers, ScriptElementKind.memberGetAccessorElement, node.propertyName.text());

            // No need to descend into a member accessor;
        }

        public visitSetAccessor(node: TypeScript.SetAccessorSyntax): void {
            var item = this.createItem(node, node.modifiers, ScriptElementKind.memberSetAccessorElement, node.propertyName.text());

            // No need to descend into a member accessor;
        }

        public visitVariableDeclarator(node: TypeScript.VariableDeclaratorSyntax): void {
            var modifiers = node.parent.kind() === SyntaxKind.MemberVariableDeclaration
                ? (<MemberVariableDeclarationSyntax>node.parent).modifiers
                : TypeScript.Syntax.emptyList<ISyntaxToken>();
            var kind = node.parent.kind() === SyntaxKind.MemberVariableDeclaration
                ? ScriptElementKind.memberVariableElement
                : ScriptElementKind.variableElement;
            var item = this.createItem(node, modifiers, kind, node.propertyName.text());

            // No need to descend into a variable declarator;
        }

        public visitIndexSignature(node: TypeScript.IndexSignatureSyntax): void {
            var item = this.createItem(node, TypeScript.Syntax.emptyList<ISyntaxToken>(), ScriptElementKind.indexSignatureElement, "[]");

            // No need to descend into an index signature;
        }

        public visitEnumElement(node: TypeScript.EnumElementSyntax): void {
            var item = this.createItem(node, TypeScript.Syntax.emptyList<ISyntaxToken>(), ScriptElementKind.memberVariableElement, node.propertyName.text());

            // No need to descend into an enum element;
        }

        public visitCallSignature(node: TypeScript.CallSignatureSyntax): void {
            var item = this.createItem(node, TypeScript.Syntax.emptyList<ISyntaxToken>(), ScriptElementKind.callSignatureElement, "()");

            // No need to descend into a call signature;
        }

        public visitConstructSignature(node: TypeScript.ConstructSignatureSyntax): void {
            var item = this.createItem(node, TypeScript.Syntax.emptyList<ISyntaxToken>(), ScriptElementKind.constructSignatureElement, "new()");

            // No need to descend into a construct signature;
        }

        public visitMethodSignature(node: TypeScript.MethodSignatureSyntax): void {
            var item = this.createItem(node, TypeScript.Syntax.emptyList<ISyntaxToken>(), ScriptElementKind.memberFunctionElement, node.propertyName.text());

            // No need to descend into a method signature;
        }

        public visitPropertySignature(node: TypeScript.PropertySignatureSyntax): void {
            var item = this.createItem(node, TypeScript.Syntax.emptyList<ISyntaxToken>(), ScriptElementKind.memberVariableElement, node.propertyName.text());

            // No need to descend into a property signature;
        }

        public visitFunctionDeclaration(node: TypeScript.FunctionDeclarationSyntax): void {
            var item = this.createItem(node, node.modifiers, ScriptElementKind.functionElement, node.identifier.text());

            // No need to descend into a function declaration;
        }

        // Common statement types.  Don't even bother walking into them as we'll never find anything
        // inside that we'd put in the navbar.

        public visitBlock(node: TypeScript.BlockSyntax): void {
        }

        public visitIfStatement(node: TypeScript.IfStatementSyntax): void {
        }

        public visitExpressionStatement(node: TypeScript.ExpressionStatementSyntax): void {
        }

        public visitThrowStatement(node: TypeScript.ThrowStatementSyntax): void {
        }

        public visitReturnStatement(node: TypeScript.ReturnStatementSyntax): void {
        }

        public visitSwitchStatement(node: TypeScript.SwitchStatementSyntax): void {
        }

        public visitWithStatement(node: TypeScript.WithStatementSyntax): void {
        }

        public visitTryStatement(node: TypeScript.TryStatementSyntax): void {
        }

        public visitLabeledStatement(node: TypeScript.LabeledStatementSyntax): void {
        }
    }
}