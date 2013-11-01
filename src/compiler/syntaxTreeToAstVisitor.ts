/// <reference path='ast.ts' />

module TypeScript {
    export class SyntaxTreeToAstVisitor implements ISyntaxVisitor {
        public position = 0;

        public previousTokenTrailingComments: Comment[] = null;

        constructor(private fileName: string,
                    public lineMap: LineMap,
                    private compilationSettings: ImmutableCompilationSettings) {
        }

        public static visit(syntaxTree: SyntaxTree, fileName: string, compilationSettings: ImmutableCompilationSettings, incrementalAST: boolean): Script {
            var visitor = incrementalAST
                ? new SyntaxTreeToIncrementalAstVisitor(fileName, syntaxTree.lineMap(), compilationSettings)
                : new SyntaxTreeToAstVisitor(fileName, syntaxTree.lineMap(), compilationSettings);
            return syntaxTree.sourceUnit().accept(visitor);
        }

        public movePast(element: ISyntaxElement): void {
            if (element !== null) {
                this.position += element.fullWidth();
            }
        }

        private moveTo(element1: ISyntaxNodeOrToken, element2: ISyntaxElement): void {
            if (element2 !== null) {
                this.position += Syntax.childOffset(element1, element2);
            }
        }

        private setCommentsAndSpan(ast: AST, fullStart: number, node: SyntaxNode): void {
            var firstToken = node.firstToken();
            var lastToken = node.lastToken();

            this.setSpan(ast, fullStart, node, firstToken, lastToken);
            ast.setPreComments(this.convertTokenLeadingComments(firstToken, fullStart));
            ast.setPostComments(this.convertNodeTrailingComments(node, lastToken, fullStart));
        }

        public setTokenSpan(span: IASTSpan, fullStart: number, element: ISyntaxToken): void {
            var leadingTriviaWidth = element.leadingTriviaWidth();
            var trailingTriviaWidth = element.trailingTriviaWidth();

            var desiredMinChar = fullStart + leadingTriviaWidth;
            var desiredLimChar = fullStart + element.fullWidth() - trailingTriviaWidth;

            this.setSpanExplicit(span, desiredMinChar, desiredLimChar);
        }

        public setSpan(span: AST, fullStart: number, element: ISyntaxElement, firstToken = element.firstToken(), lastToken = element.lastToken()): void {
            var leadingTriviaWidth = firstToken ? firstToken.leadingTriviaWidth() : 0;
            var trailingTriviaWidth = lastToken ? lastToken.trailingTriviaWidth() : 0;

            var desiredMinChar = fullStart + leadingTriviaWidth;
            var desiredLimChar = fullStart + element.fullWidth() - trailingTriviaWidth;

            this.setSpanExplicit(span, desiredMinChar, desiredLimChar);

            span.trailingTriviaWidth = trailingTriviaWidth;
        }

        public setSpanExplicit(span: IASTSpan, start: number, end: number): void {
            // Have a new span, just set it to the lim/min we were given.
            span.minChar = start;
            span.limChar = end;
        }

        public identifierFromToken(token: ISyntaxToken, stringLiteralIsTextOfIdentifier?: boolean): Identifier {
            var result: Identifier = null;

            switch (token.tokenKind) {
                case SyntaxKind.IdentifierName:
                    result = new Identifier(token.text(), null, /*isStringOrNumericLiteral:*/ false);
                    break;

                case SyntaxKind.NumericLiteral:
                case SyntaxKind.StringLiteral:
                    var tokenText = token.text();
                    var text = token.valueText();
                    if (stringLiteralIsTextOfIdentifier && text) {
                        text = quoteStr(text);
                    }
                    result = new Identifier(tokenText, text, /*isStringOrNumericLiteral:*/ true);
                    break;

                default:
                    throw Errors.invalidOperation();
            }

            var start = this.position + token.leadingTriviaWidth();
            this.setSpanExplicit(result, start, start + token.width());

            return result;
        }

        public visitSyntaxList(node: ISyntaxList): ASTList {
            var start = this.position;
            var array = new Array<any>(node.childCount());

            for (var i = 0, n = node.childCount(); i < n; i++) {
                array[i] = node.childAt(i).accept(this);
            }
            
            var result = new ASTList(this.fileName, array);
            this.setSpan(result, start, node);

            return result;
        }

        public visitSeparatedSyntaxList(list: ISeparatedSyntaxList): ASTList {
            var start = this.position;
            var array = new Array<any>(list.nonSeparatorCount());

            for (var i = 0, n = list.childCount(); i < n; i++) {
                if (i % 2 === 0) {
                    array[i / 2] = list.childAt(i).accept(this);
                    this.previousTokenTrailingComments = null;
                }
                else {
                    var separatorToken = <ISyntaxToken>list.childAt(i);
                    this.previousTokenTrailingComments = this.convertTokenTrailingComments(
                        separatorToken, this.position + separatorToken.leadingTriviaWidth() + separatorToken.width());
                    this.movePast(separatorToken);
                }
            }

            var result = new ASTList(this.fileName, array, list.separatorCount());
            this.setSpan(result, start, list);

            result.setPostComments(this.previousTokenTrailingComments);
            this.previousTokenTrailingComments = null;

            return result;
        }

        private convertComment(trivia: ISyntaxTrivia, commentStartPosition: number, hasTrailingNewLine: boolean): Comment {
            var comment = new Comment(trivia, hasTrailingNewLine, commentStartPosition, commentStartPosition + trivia.fullWidth());

            return comment;
        }

        private convertComments(triviaList: ISyntaxTriviaList, commentStartPosition: number): Comment[] {
            var result: Comment[] = [];

            for (var i = 0, n = triviaList.count(); i < n; i++) {
                var trivia = triviaList.syntaxTriviaAt(i);

                if (trivia.isComment()) {
                    var hasTrailingNewLine = ((i + 1) < n) && triviaList.syntaxTriviaAt(i + 1).isNewLine();
                    result.push(this.convertComment(trivia, commentStartPosition, hasTrailingNewLine));
                }

                commentStartPosition += trivia.fullWidth();
            }

            return result;
        }

        private mergeComments(comments1: Comment[], comments2: Comment[]): Comment[] {
            if (comments1 === null) {
                return comments2;
            }

            if (comments2 === null) {
                return comments1;
            }

            return comments1.concat(comments2);
        }

        private convertTokenLeadingComments(token: ISyntaxToken, commentStartPosition: number): Comment[] {
            if (token === null) {
                return null;
            }

            var preComments = token.hasLeadingComment()
                ? this.convertComments(token.leadingTrivia(), commentStartPosition)
                : null;

            var previousTokenTrailingComments = this.previousTokenTrailingComments;
            this.previousTokenTrailingComments = null;

            return this.mergeComments(previousTokenTrailingComments, preComments);
        }

        private convertTokenTrailingComments(token: ISyntaxToken, commentStartPosition: number): Comment[] {
            if (token === null || !token.hasTrailingComment() || token.hasTrailingNewLine()) {
                return null;
            }

            return this.convertComments(token.trailingTrivia(), commentStartPosition);
        }

        private convertNodeTrailingComments(node: SyntaxNode, lastToken: ISyntaxToken, nodeStart: number): Comment[]{
            // Bail out quickly before doing any expensive math computation.
            if (lastToken === null || !lastToken.hasTrailingComment() || lastToken.hasTrailingNewLine()) {
                return null;
            }

            return this.convertComments(lastToken.trailingTrivia(), nodeStart + node.fullWidth() - lastToken.trailingTriviaWidth());
        }

        public visitToken(token: ISyntaxToken): AST {
            var fullStart = this.position;

            var result = this.visitTokenWorker(token);

            this.movePast(token);

            var start = fullStart + token.leadingTriviaWidth();
            this.setSpanExplicit(result, start, start + token.width());
            return result;
        }

        public visitTokenWorker(token: ISyntaxToken): AST {
            switch (token.tokenKind) {
                case SyntaxKind.AnyKeyword:
                    return new BuiltInType(NodeType.AnyType);
                case SyntaxKind.BooleanKeyword:
                    return new BuiltInType(NodeType.BooleanType);
                case SyntaxKind.NumberKeyword:
                    return new BuiltInType(NodeType.NumberType);
                case SyntaxKind.StringKeyword:
                    return new BuiltInType(NodeType.StringType);
                case SyntaxKind.VoidKeyword:
                    return new BuiltInType(NodeType.VoidType);
                case SyntaxKind.ThisKeyword:
                    return new ThisExpression();
                case SyntaxKind.SuperKeyword:
                    return new SuperExpression();
                case SyntaxKind.TrueKeyword:
                    return new LiteralExpression(NodeType.TrueLiteral);
                case SyntaxKind.FalseKeyword:
                    return new LiteralExpression(NodeType.FalseLiteral);
                case SyntaxKind.NullKeyword:
                    return new LiteralExpression(NodeType.NullLiteral);
                case SyntaxKind.StringLiteral:
                    return new StringLiteral(token.text(), token.valueText());
                case SyntaxKind.RegularExpressionLiteral:
                    return new RegularExpressionLiteral(token.text());
                case SyntaxKind.NumericLiteral:
                    var fullStart = this.position;
                    var preComments = this.convertTokenLeadingComments(token, fullStart);

                    var result = new NumericLiteral(token.value(), token.text(), token.valueText());

                    result.setPreComments(preComments);
                    return result;
                default:
                    return this.identifierFromToken(token, /*isOptional:*/ false);
            }
        }

        private getLeadingComments(node: SyntaxNode): ISyntaxTrivia[] {
            var firstToken = node.firstToken();
            var result: ISyntaxTrivia[] = [];

            if (firstToken.hasLeadingComment()) {
                var leadingTrivia = firstToken.leadingTrivia();

                for (var i = 0, n = leadingTrivia.count(); i < n; i++) {
                    var trivia = leadingTrivia.syntaxTriviaAt(i);

                    if (trivia.isComment()) {
                        result.push(trivia);
                    }
                }
            }

            return result;
        }

        private hasTopLevelImportOrExport(node: SourceUnitSyntax): boolean {
            // TODO: implement this.

            var firstToken: ISyntaxToken;

            for (var i = 0, n = node.moduleElements.childCount(); i < n; i++) {
                var moduleElement = node.moduleElements.childAt(i);

                firstToken = moduleElement.firstToken();
                if (firstToken !== null && firstToken.tokenKind === SyntaxKind.ExportKeyword) {
                    return true;
                }

                if (moduleElement.kind() === SyntaxKind.ImportDeclaration) {
                    var importDecl = <ImportDeclarationSyntax>moduleElement;
                    if (importDecl.moduleReference.kind() === SyntaxKind.ExternalModuleReference) {
                        return true;
                    }
                }
            }

            var leadingComments = this.getLeadingComments(node);
            for (var i = 0, n = leadingComments.length; i < n; i++) {
                var trivia = leadingComments[i];

                if (getImplicitImport(trivia.fullText())) {
                    return true;
                }
            }

            return false;
        }

        private getAmdDependency(comment: string): string {
            var amdDependencyRegEx = /^\/\/\/\s*<amd-dependency\s+path=('|")(.+?)\1/gim;
            var match = amdDependencyRegEx.exec(comment);
            return match ? match[2] : null;
        }

        public visitSourceUnit(node: SourceUnitSyntax): Script {
            var start = this.position;

            var bod = this.visitSyntaxList(node.moduleElements);

            var isExternalModule = false;
            var amdDependencies: string[] = [];
            var modifiers: PullElementFlags[] = [];
            if (this.hasTopLevelImportOrExport(node)) {
                isExternalModule = true;

                var correctedFileName = switchToForwardSlashes(this.fileName);
                var id: Identifier = new Identifier(correctedFileName, correctedFileName, /*isStringOrNumericLiteral:*/ false);

                modifiers.push(PullElementFlags.Exported);
                if (isDTSFile(this.fileName)) {
                    modifiers.push(PullElementFlags.Ambient);
                }

                var topLevelMod = new ModuleDeclaration(modifiers, id, bod, null, /*isExternalModule:*/ true);
                this.setSpanExplicit(topLevelMod, start, this.position);

                var leadingComments = this.getLeadingComments(node);
                for (var i = 0, n = leadingComments.length; i < n; i++) {
                    var trivia = leadingComments[i];
                    var amdDependency = this.getAmdDependency(trivia.fullText());
                    if (amdDependency) {
                        amdDependencies.push(amdDependency);
                    }
                }

                bod = new ASTList(this.fileName, [topLevelMod]);
                this.setSpanExplicit(bod, start, this.position);
            }

            var result = new Script(modifiers, bod, this.fileName, isExternalModule, amdDependencies);
            this.setSpanExplicit(result, start, start + node.fullWidth());

            return result;
        }

        public visitExternalModuleReference(node: ExternalModuleReferenceSyntax): any {
            this.moveTo(node, node.stringLiteral);
            var result = this.identifierFromToken(node.stringLiteral, /*isOptional:*/ false);
            this.movePast(node.stringLiteral);
            this.movePast(node.closeParenToken);

            return result;
        }

        public visitModuleNameModuleReference(node: ModuleNameModuleReferenceSyntax): any {
            return node.moduleName.accept(this);
        }

        public visitClassDeclaration(node: ClassDeclarationSyntax): ClassDeclaration {
            var start = this.position;

            this.moveTo(node, node.identifier);
            var name = this.identifierFromToken(node.identifier, /*isOptional:*/ false);
            this.movePast(node.identifier);

            var typeParameters = this.visitTypeParameterList(node.typeParameterList);
            var heritageClauses = node.heritageClauses ? this.visitSyntaxList(node.heritageClauses) : null;

            this.movePast(node.openBraceToken);
            var members = this.visitSyntaxList(node.classElements);
            var closeBracePosition = this.position;
            this.movePast(node.closeBraceToken);
            var closeBraceSpan = new ASTSpan();
            this.setTokenSpan(closeBraceSpan, closeBracePosition, node.closeBraceToken);

            var modifiers = this.visitModifiers(node.modifiers);
            var result = new ClassDeclaration(modifiers, name, typeParameters, heritageClauses, members, closeBraceSpan);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        private visitModifiers(modifiers: ISyntaxList): PullElementFlags[]{
            var result: PullElementFlags[] = null;
            if (SyntaxUtilities.containsToken(modifiers, SyntaxKind.ExportKeyword)) {
                result = result || [];
                result.push(PullElementFlags.Exported);
            }

            if (SyntaxUtilities.containsToken(modifiers, SyntaxKind.DeclareKeyword)) {
                result = result || [];
                result.push(PullElementFlags.Ambient);
            }

            if (SyntaxUtilities.containsToken(modifiers, SyntaxKind.StaticKeyword)) {
                result = result || [];
                result.push(PullElementFlags.Static);
            }

            if (SyntaxUtilities.containsToken(modifiers, SyntaxKind.PublicKeyword)) {
                result = result || [];
                result.push(PullElementFlags.Public);
            }

            if (SyntaxUtilities.containsToken(modifiers, SyntaxKind.PrivateKeyword)) {
                result = result || [];
                result.push(PullElementFlags.Private);
            }

            return result || sentinelEmptyArray;
        }

        public visitInterfaceDeclaration(node: InterfaceDeclarationSyntax): InterfaceDeclaration {
            var start = this.position;

            this.moveTo(node, node.identifier);
            var name = this.identifierFromToken(node.identifier, /*isOptional:*/ false);
            this.movePast(node.identifier);
            var typeParameters = this.visitTypeParameterList(node.typeParameterList);
            var heritageClauses = node.heritageClauses ? this.visitSyntaxList(node.heritageClauses) : null;

            var body = this.visitObjectType(node.body);

            var modifiers = this.visitModifiers(node.modifiers);
            var result = new InterfaceDeclaration(modifiers, name, typeParameters, heritageClauses, body);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitHeritageClause(node: HeritageClauseSyntax): HeritageClause {
            var start = this.position;

            this.movePast(node.extendsOrImplementsKeyword);
            var typeNames = this.visitSeparatedSyntaxList(node.typeNames);

            var result = new HeritageClause(
                node.extendsOrImplementsKeyword.tokenKind === SyntaxKind.ExtendsKeyword ? NodeType.ExtendsHeritageClause : NodeType.ImplementsHeritageClause,
                typeNames);
            this.setSpan(result, start, node);

            return result;
        }

        private getModuleNames(node: ModuleDeclarationSyntax): Identifier[] {
            var result: Identifier[] = [];

            if (node.stringLiteral !== null) {
                result.push(this.identifierFromToken(node.stringLiteral, true));
                this.movePast(node.stringLiteral);
            }
            else {
                this.getModuleNamesHelper(node.moduleName, result);
            }

            return result;
        }

        private getModuleNamesHelper(name: INameSyntax, result: Identifier[]): void {
            if (name.kind() === SyntaxKind.QualifiedName) {
                var qualifiedName = <QualifiedNameSyntax>name;
                this.getModuleNamesHelper(qualifiedName.left, result);
                this.movePast(qualifiedName.dotToken);
                result.push(this.identifierFromToken(qualifiedName.right, /*isOptional:*/ false));
                this.movePast(qualifiedName.right);
            }
            else {
                result.push(this.identifierFromToken(<ISyntaxToken>name, /*isOptional:*/ false));
                this.movePast(name);
            }
        }

        public visitModuleDeclaration(node: ModuleDeclarationSyntax): ModuleDeclaration {
            var start = this.position;

            var firstToken = node.firstToken();
            var preComments = this.convertTokenLeadingComments(firstToken, start);
            var postComments = this.convertNodeTrailingComments(node, node.closeBraceToken, start);

            this.moveTo(node, node.moduleKeyword);
            this.movePast(node.moduleKeyword);
            var names = this.getModuleNames(node);
            this.movePast(node.openBraceToken);

            var members = this.visitSyntaxList(node.moduleElements);

            var closeBracePosition = this.position;
            this.movePast(node.closeBraceToken);
            var closeBraceSpan = new ASTSpan();
            this.setTokenSpan(closeBraceSpan, closeBracePosition, node.closeBraceToken);

            for (var i = names.length - 1; i >= 0; i--) {
                var innerName = names[i];

                var modifiers: PullElementFlags[] = null;

                if (i > 0) {
                    // All inner modules are exported.
                    modifiers = [];
                    modifiers.push(PullElementFlags.Exported);
                }
                else {
                    modifiers = this.visitModifiers(node.modifiers);
                }

                var result = new ModuleDeclaration(modifiers, innerName, members, closeBraceSpan, /*isExternalModule:*/ false);
                this.setSpan(result, start, node);

                result.setPreComments(preComments);
                result.setPostComments(postComments);

                preComments = null;
                postComments = null;

                // REVIEW: will also possibly need to re-parent comments as well

                members = new ASTList(this.fileName, [result]);
            }

            this.setSpan(result, start, node);
            return result;
        }

        public visitFunctionDeclaration(node: FunctionDeclarationSyntax): FunctionDeclaration {
            var start = this.position;

            this.moveTo(node, node.identifier);
            var name = this.identifierFromToken(node.identifier, /*isOptional:*/ false);

            this.movePast(node.identifier);

            var callSignature = this.visitCallSignature(node.callSignature);
            var block = node.block ? this.visitBlock(node.block) : null;

            this.movePast(node.semicolonToken);

            var result = new FunctionDeclaration(this.visitModifiers(node.modifiers), name, callSignature, block);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitEnumDeclaration(node: EnumDeclarationSyntax): EnumDeclaration {
            var start = this.position;

            this.moveTo(node, node.identifier);
            var identifier = this.identifierFromToken(node.identifier, /*isOptional:*/ false);
            this.movePast(node.identifier);

            this.movePast(node.openBraceToken);

            var enumElements = this.visitSeparatedSyntaxList(node.enumElements);

            this.movePast(node.closeBraceToken);

            var result = new EnumDeclaration(this.visitModifiers(node.modifiers), identifier, enumElements);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitEnumElement(node: EnumElementSyntax): EnumElement {
            var start = this.position;

            var memberName = this.identifierFromToken(node.propertyName, /*isOptional:*/ false);
            this.movePast(node.propertyName);

            var value = node.equalsValueClause !== null ? this.visitEqualsValueClause(node.equalsValueClause) : null;

            var result = new EnumElement(memberName, value);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitImportDeclaration(node: ImportDeclarationSyntax): ImportDeclaration {
            var start = this.position;

            this.moveTo(node, node.identifier);
            var name = this.identifierFromToken(node.identifier, /*isOptional:*/ false);
            this.movePast(node.identifier);
            this.movePast(node.equalsToken);
            var alias = node.moduleReference.accept(this);
            this.movePast(node.semicolonToken);

            var modifiers = this.visitModifiers(node.modifiers);
            var result = new ImportDeclaration(modifiers, name, alias);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitExportAssignment(node: ExportAssignmentSyntax): ExportAssignment {
            var start = this.position;

            this.moveTo(node, node.identifier);
            var name = this.identifierFromToken(node.identifier, /*isOptional:*/ false);
            this.movePast(node.identifier);
            this.movePast(node.semicolonToken);

            var result = new ExportAssignment(name);
            this.setSpan(result, start, node);

            return result;
        }

        public visitVariableStatement(node: VariableStatementSyntax): VariableStatement {
            var start = this.position;

            this.moveTo(node, node.variableDeclaration);

            var declaration = node.variableDeclaration.accept(this);
            this.movePast(node.semicolonToken);

            var modifiers = this.visitModifiers(node.modifiers);

            var result = new VariableStatement(modifiers, declaration);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitVariableDeclaration(node: VariableDeclarationSyntax): VariableDeclaration {
            var start = this.position;

            this.moveTo(node, node.variableDeclarators);
            var variableDecls = this.visitSeparatedSyntaxList(node.variableDeclarators);

            var result = new VariableDeclaration(variableDecls);
            this.setSpan(result, start, node);

            return result;
        }

        public visitVariableDeclarator(node: VariableDeclaratorSyntax): VariableDeclarator {
            var start = this.position;
            var name = this.identifierFromToken(node.identifier, /*isOptional:*/ false);
            this.movePast(node.identifier);
            var typeExpr = this.visitTypeAnnotation(node.typeAnnotation);
            var init: EqualsValueClause = node.equalsValueClause ? node.equalsValueClause.accept(this) : null;

            var result = new VariableDeclarator(name, typeExpr, init);
            this.setSpan(result, start, node);

            return result;
        }

        public visitEqualsValueClause(node: EqualsValueClauseSyntax): EqualsValueClause {
            var start = this.position;
            var afterEqualsComments = this.convertTokenTrailingComments(node.equalsToken,
                this.position + node.equalsToken.leadingTriviaWidth() + node.equalsToken.width());

            this.movePast(node.equalsToken);
            var value: AST = node.value.accept(this);
            value.setPreComments(this.mergeComments(afterEqualsComments, value.preComments()));

            var result = new EqualsValueClause(value);
            this.setSpan(result, start, node);

            return result;
        }

        private getUnaryExpressionNodeType(kind: SyntaxKind): NodeType {
            switch (kind) {
                case SyntaxKind.PlusExpression: return NodeType.PlusExpression;
                case SyntaxKind.NegateExpression: return NodeType.NegateExpression;
                case SyntaxKind.BitwiseNotExpression: return NodeType.BitwiseNotExpression;
                case SyntaxKind.LogicalNotExpression: return NodeType.LogicalNotExpression;
                case SyntaxKind.PreIncrementExpression: return NodeType.PreIncrementExpression;
                case SyntaxKind.PreDecrementExpression: return NodeType.PreDecrementExpression;
                default:
                    throw Errors.invalidOperation();
            }
        }

        public visitPrefixUnaryExpression(node: PrefixUnaryExpressionSyntax): PrefixUnaryExpression {
            var start = this.position;

            this.movePast(node.operatorToken);
            var operand = node.operand.accept(this);

            var result = new PrefixUnaryExpression(this.getUnaryExpressionNodeType(node.kind()), operand);
            this.setSpan(result, start, node);

            return result;
        }

        public visitArrayLiteralExpression(node: ArrayLiteralExpressionSyntax): ArrayLiteralExpression {
            var start = this.position;
            var openStart = this.position + node.openBracketToken.leadingTriviaWidth();
            this.movePast(node.openBracketToken);

            var expressions = this.visitSeparatedSyntaxList(node.expressions);

            var closeStart = this.position + node.closeBracketToken.leadingTriviaWidth();
            this.movePast(node.closeBracketToken);

            var result = new ArrayLiteralExpression(expressions);
            this.setSpan(result, start, node);

            return result;
        }

        public visitOmittedExpression(node: OmittedExpressionSyntax): OmittedExpression {
            var start = this.position;

            var result = new OmittedExpression();
            this.setSpan(result, start, node);

            return result;
        }

        public visitParenthesizedExpression(node: ParenthesizedExpressionSyntax): ParenthesizedExpression {
            var start = this.position;

            var openParenToken = node.openParenToken;
            var openParenTrailingComments = this.convertTokenTrailingComments(
                openParenToken, start + openParenToken.leadingTriviaWidth() + openParenToken.width());

            this.movePast(openParenToken);

            var expr = node.expression.accept(this);
            this.movePast(node.closeParenToken);

            var result = new ParenthesizedExpression(openParenTrailingComments, expr);
            this.setSpan(result, start, node);

            return result;
        }

        private getArrowFunctionStatements(body: ISyntaxNodeOrToken): Block {
            if (body.kind() === SyntaxKind.Block) {
                return body.accept(this);
            }
            else {
                var expression = body.accept(this);
                var returnStatement = new ReturnStatement(expression);

                // Copy any comments before the body of the arrow function to the return statement.
                // This is necessary for emitting correctness so we don't emit something like this:
                //
                //      return
                //          // foo
                //          this.foo();
                //
                // Because of ASI, this gets parsed as "return;" which is *not* what we want for
                // proper semantics.  Also, we can no longer use this expression incrementally.
                var preComments = expression.preComments();
                if (preComments) {
                    (<any>body)._ast = undefined;
                    returnStatement.setPreComments(preComments);
                    expression.setPreComments(null);
                }

                var statements = new ASTList(this.fileName, [returnStatement]);

                var closeBraceSpan = new ASTSpan();
                closeBraceSpan.minChar = expression.minChar;
                closeBraceSpan.limChar = expression.limChar;
                closeBraceSpan.trailingTriviaWidth = expression.trailingTriviaWidth;

                var block = new Block(statements, null, closeBraceSpan);
                return block;
            }
        }

        public visitSimpleArrowFunctionExpression(node: SimpleArrowFunctionExpressionSyntax): SimpleArrowFunctionExpression {
            var start = this.position;

            var identifier = node.identifier.accept(this);
            this.movePast(node.equalsGreaterThanToken);

            var statements = this.getArrowFunctionStatements(node.body);

            var result = new SimpleArrowFunctionExpression(identifier, statements);
            this.setSpan(result, start, node);

            return result;
        }

        public visitParenthesizedArrowFunctionExpression(node: ParenthesizedArrowFunctionExpressionSyntax): ParenthesizedArrowFunctionExpression {
            var start = this.position;

            var callSignature = this.visitCallSignature(node.callSignature);
            this.movePast(node.equalsGreaterThanToken);

            var block = this.getArrowFunctionStatements(node.body);

            var result = new ParenthesizedArrowFunctionExpression(callSignature, block);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitType(type: ITypeSyntax): AST {
            return type ? type.accept(this) : null;
        }

        public visitTypeQuery(node: TypeQuerySyntax): TypeQuery {
            var start = this.position;
            this.movePast(node.typeOfKeyword);
            var name = node.name.accept(this);

            var result = new TypeQuery(name);
            this.setSpan(result, start, node);

            return result;
        }

        public visitQualifiedName(node: QualifiedNameSyntax): QualifiedName {
            var start = this.position;
            var left = this.visitType(node.left);
            this.movePast(node.dotToken);
            var right = this.identifierFromToken(node.right, /*isOptional:*/ false);
            this.movePast(node.right);

            var result = new QualifiedName(left, right);
            this.setSpan(result, start, node);

            return result;
        }

        public visitTypeArgumentList(node: TypeArgumentListSyntax): TypeArgumentList {
            if (node === null) {
                return null;
            }

            var start = this.position;
            this.movePast(node.lessThanToken);
            var typeArguments = this.visitSeparatedSyntaxList(node.typeArguments);
            this.movePast(node.greaterThanToken);

            var result = new TypeArgumentList(typeArguments);
            this.setSpan(result, start, node);

            return result;
        }

        public visitConstructorType(node: ConstructorTypeSyntax): ConstructorType {
            var start = this.position;

            this.movePast(node.newKeyword);
            var typeParameters = this.visitTypeParameterList(node.typeParameterList);
            var parameters = this.visitParameterList(node.parameterList);
            this.movePast(node.equalsGreaterThanToken);
            var returnType = this.visitType(node.type);

            var result = new ConstructorType(typeParameters, parameters, returnType);
            this.setSpan(result, start, node);

            return result;
        }

        public visitFunctionType(node: FunctionTypeSyntax): FunctionType {
            var start = this.position;
            var typeParameters = this.visitTypeParameterList(node.typeParameterList);
            var parameters = this.visitParameterList(node.parameterList);
            this.movePast(node.equalsGreaterThanToken);
            var returnType = this.visitType(node.type);

            var result = new FunctionType(typeParameters, parameters, returnType);
            this.setSpan(result, start, node);

            return result;
        }

        public visitObjectType(node: ObjectTypeSyntax): ObjectType {
            var start = this.position;

            this.movePast(node.openBraceToken);
            var typeMembers = this.visitSeparatedSyntaxList(node.typeMembers);
            this.movePast(node.closeBraceToken);

            var result = new ObjectType(typeMembers);
            this.setSpan(result, start, node);

            return result;
        }

        public visitArrayType(node: ArrayTypeSyntax): ArrayType {
            var start = this.position;

            var underlying: AST = this.visitType(node.type);
            this.movePast(node.openBracketToken);
            this.movePast(node.closeBracketToken);

            var result = new ArrayType(underlying);
            this.setSpan(result, start, node);

            return result;
        }

        public visitGenericType(node: GenericTypeSyntax): GenericType {
            var start = this.position;

            var underlying = this.visitType(node.name);
            var typeArguments = this.visitTypeArgumentList(node.typeArgumentList);

            var result = new GenericType(underlying, typeArguments);
            this.setSpan(result, start, node);

            return result;
        }

        public visitTypeAnnotation(node: TypeAnnotationSyntax): TypeAnnotation {
            if (!node) {
                return null;
            }

            var start = this.position;
            this.movePast(node.colonToken);
            var type = this.visitType(node.type);

            var result = new TypeAnnotation(type);
            this.setSpan(result, start, node);

            return result;
        }

        public visitBlock(node: BlockSyntax): Block {
            var start = this.position;

            this.movePast(node.openBraceToken);
            var statements = this.visitSyntaxList(node.statements);
            var closeBracePosition = this.position;

            var closeBraceLeadingComments = this.convertTokenLeadingComments(node.closeBraceToken, this.position);
            this.movePast(node.closeBraceToken);
            var closeBraceSpan = new ASTSpan();
            this.setTokenSpan(closeBraceSpan, closeBracePosition, node.closeBraceToken);

            var result = new Block(statements, closeBraceLeadingComments, closeBraceSpan);
            this.setSpan(result, start, node);

            return result;
        }

        public visitParameter(node: ParameterSyntax): Parameter {
            var start = this.position;

            this.moveTo(node, node.identifier);
            var identifier = this.identifierFromToken(node.identifier, !!node.questionToken);
            this.movePast(node.identifier);
            this.movePast(node.questionToken);
            var typeExpr = this.visitTypeAnnotation(node.typeAnnotation);
            var init: EqualsValueClause = node.equalsValueClause ? node.equalsValueClause.accept(this) : null;

            var modifiers = this.visitModifiers(node.modifiers);

            var result = new Parameter(node.dotDotDotToken ? new ASTSpan() : null, modifiers, identifier, node.questionToken ? new ASTSpan() : null, typeExpr, init);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitMemberAccessExpression(node: MemberAccessExpressionSyntax): MemberAccessExpression {
            var start = this.position;

            var expression: AST = node.expression.accept(this);
            this.movePast(node.dotToken);
            var name = this.identifierFromToken(node.name, /*isOptional:*/ false);
            this.movePast(node.name);

            var result = new MemberAccessExpression(expression, name);
            this.setSpan(result, start, node);

            return result;
        }

        public visitPostfixUnaryExpression(node: PostfixUnaryExpressionSyntax): PostfixUnaryExpression {
            var start = this.position;

            var operand = node.operand.accept(this);
            this.movePast(node.operatorToken);

            var result = new PostfixUnaryExpression(node.kind() === SyntaxKind.PostIncrementExpression ? NodeType.PostIncrementExpression : NodeType.PostDecrementExpression, operand);
            this.setSpan(result, start, node);

            return result;
        }

        public visitElementAccessExpression(node: ElementAccessExpressionSyntax): ElementAccessExpression {
            var start = this.position;

            var expression = node.expression.accept(this);
            this.movePast(node.openBracketToken);
            var argumentExpression = node.argumentExpression.accept(this);
            this.movePast(node.closeBracketToken);

            var result = new ElementAccessExpression(expression, argumentExpression);
            this.setSpan(result, start, node);

            return result;
        }

        public visitInvocationExpression(node: InvocationExpressionSyntax): InvocationExpression {
            var start = this.position;

            var expression = node.expression.accept(this);
            var argumentList = this.visitArgumentList(node.argumentList);

            var result = new InvocationExpression(expression, argumentList);
            this.setSpan(result, start, node);

            return result;
        }

        public visitArgumentList(node: ArgumentListSyntax): ArgumentList {
            if (node === null) {
                return null;
            }

            var start = this.position;

            var typeArguments = this.visitTypeArgumentList(node.typeArgumentList);

            this.movePast(node.openParenToken);

            var arguments = this.visitSeparatedSyntaxList(node.arguments);

            if (node.arguments.fullWidth() === 0 && node.closeParenToken.fullWidth() === 0) {
                // If the argument list was empty, and closing paren is missing, set the argument ofsets to be the open paren trivia
                var openParenTokenEnd = start + node.openParenToken.leadingTriviaWidth() + node.openParenToken.width();
                this.setSpanExplicit(arguments, openParenTokenEnd, openParenTokenEnd + node.openParenToken.trailingTriviaWidth());
            }

            var closeParenPos = this.position;
            this.movePast(node.closeParenToken);
            var closeParenSpan = new ASTSpan();
            this.setTokenSpan(closeParenSpan, closeParenPos, node.closeParenToken);

            var result = new ArgumentList(typeArguments, arguments, closeParenSpan);
            this.setSpan(result, start, node);

            return result;
        }

        private getBinaryExpressionNodeType(node: BinaryExpressionSyntax): NodeType {
            switch (node.kind()) {
                case SyntaxKind.CommaExpression: return NodeType.CommaExpression;
                case SyntaxKind.AssignmentExpression: return NodeType.AssignmentExpression;
                case SyntaxKind.AddAssignmentExpression: return NodeType.AddAssignmentExpression;
                case SyntaxKind.SubtractAssignmentExpression: return NodeType.SubtractAssignmentExpression;
                case SyntaxKind.MultiplyAssignmentExpression: return NodeType.MultiplyAssignmentExpression;
                case SyntaxKind.DivideAssignmentExpression: return NodeType.DivideAssignmentExpression;
                case SyntaxKind.ModuloAssignmentExpression: return NodeType.ModuloAssignmentExpression;
                case SyntaxKind.AndAssignmentExpression: return NodeType.AndAssignmentExpression;
                case SyntaxKind.ExclusiveOrAssignmentExpression: return NodeType.ExclusiveOrAssignmentExpression;
                case SyntaxKind.OrAssignmentExpression: return NodeType.OrAssignmentExpression;
                case SyntaxKind.LeftShiftAssignmentExpression: return NodeType.LeftShiftAssignmentExpression;
                case SyntaxKind.SignedRightShiftAssignmentExpression: return NodeType.SignedRightShiftAssignmentExpression;
                case SyntaxKind.UnsignedRightShiftAssignmentExpression: return NodeType.UnsignedRightShiftAssignmentExpression;
                case SyntaxKind.LogicalOrExpression: return NodeType.LogicalOrExpression;
                case SyntaxKind.LogicalAndExpression: return NodeType.LogicalAndExpression;
                case SyntaxKind.BitwiseOrExpression: return NodeType.BitwiseOrExpression;
                case SyntaxKind.BitwiseExclusiveOrExpression: return NodeType.BitwiseExclusiveOrExpression;
                case SyntaxKind.BitwiseAndExpression: return NodeType.BitwiseAndExpression;
                case SyntaxKind.EqualsWithTypeConversionExpression: return NodeType.EqualsWithTypeConversionExpression;
                case SyntaxKind.NotEqualsWithTypeConversionExpression: return NodeType.NotEqualsWithTypeConversionExpression;
                case SyntaxKind.EqualsExpression: return NodeType.EqualsExpression;
                case SyntaxKind.NotEqualsExpression: return NodeType.NotEqualsExpression;
                case SyntaxKind.LessThanExpression: return NodeType.LessThanExpression;
                case SyntaxKind.GreaterThanExpression: return NodeType.GreaterThanExpression;
                case SyntaxKind.LessThanOrEqualExpression: return NodeType.LessThanOrEqualExpression;
                case SyntaxKind.GreaterThanOrEqualExpression: return NodeType.GreaterThanOrEqualExpression;
                case SyntaxKind.InstanceOfExpression: return NodeType.InstanceOfExpression;
                case SyntaxKind.InExpression: return NodeType.InExpression;
                case SyntaxKind.LeftShiftExpression: return NodeType.LeftShiftExpression;
                case SyntaxKind.SignedRightShiftExpression: return NodeType.SignedRightShiftExpression;
                case SyntaxKind.UnsignedRightShiftExpression: return NodeType.UnsignedRightShiftExpression;
                case SyntaxKind.MultiplyExpression: return NodeType.MultiplyExpression;
                case SyntaxKind.DivideExpression: return NodeType.DivideExpression;
                case SyntaxKind.ModuloExpression: return NodeType.ModuloExpression;
                case SyntaxKind.AddExpression: return NodeType.AddExpression;
                case SyntaxKind.SubtractExpression: return NodeType.SubtractExpression;
            }

            throw Errors.invalidOperation();
        }

        public visitBinaryExpression(node: BinaryExpressionSyntax): BinaryExpression {
            var start = this.position;

            var nodeType = this.getBinaryExpressionNodeType(node);
            var left = node.left.accept(this);
            this.movePast(node.operatorToken);
            var right = node.right.accept(this);

            var result = new BinaryExpression(nodeType, left, right);
            this.setSpan(result, start, node);

            return result;
        }

        public visitConditionalExpression(node: ConditionalExpressionSyntax): ConditionalExpression {
            var start = this.position;

            var condition = node.condition.accept(this);
            this.movePast(node.questionToken);
            var whenTrue = node.whenTrue.accept(this);
            this.movePast(node.colonToken);
            var whenFalse = node.whenFalse.accept(this);

            var result = new ConditionalExpression(condition, whenTrue, whenFalse);
            this.setSpan(result, start, node);

            return result;
        }

        public visitConstructSignature(node: ConstructSignatureSyntax): ConstructSignature {
            var start = this.position;

            this.movePast(node.newKeyword);
            var callSignature = this.visitCallSignature(node.callSignature);

            var result = new ConstructSignature(callSignature);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitMethodSignature(node: MethodSignatureSyntax): MethodSignature {
            var start = this.position;

            var name = this.identifierFromToken(node.propertyName, !!node.questionToken);
            this.movePast(node.propertyName);
            this.movePast(node.questionToken);

            var callSignature = this.visitCallSignature(node.callSignature);

            var result = new MethodSignature(name, node.questionToken ? new ASTSpan() : null, callSignature);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitIndexSignature(node: IndexSignatureSyntax): IndexSignature {
            var start = this.position;

            this.movePast(node.openBracketToken);

            var parameter = node.parameter.accept(this);

            this.movePast(node.closeBracketToken);
            var returnType = this.visitTypeAnnotation(node.typeAnnotation);

            var result = new IndexSignature(parameter, returnType);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitPropertySignature(node: PropertySignatureSyntax): PropertySignature {
            var start = this.position;

            var name = this.identifierFromToken(node.propertyName, !!node.questionToken);
            this.movePast(node.propertyName);
            this.movePast(node.questionToken);
            var typeExpr = this.visitTypeAnnotation(node.typeAnnotation);

            var result = new PropertySignature(name, node.questionToken ? new ASTSpan() : null, typeExpr);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitParameterList(node: ParameterListSyntax): ParameterList {
            if (!node) {
                return null;
            }

            var start = this.position;

            var openParenToken = node.openParenToken;

            this.previousTokenTrailingComments = this.convertTokenTrailingComments(openParenToken, start + openParenToken.leadingTriviaWidth() + openParenToken.width());
            var openParenTrailingComments: Comment[] = null;
            if (node.parameters.childCount() === 0) {
                openParenTrailingComments = this.previousTokenTrailingComments;
                this.previousTokenTrailingComments = null;
            }

            this.movePast(node.openParenToken);
            var parameters = this.visitSeparatedSyntaxList(node.parameters);
            this.movePast(node.closeParenToken);

            var result = new ParameterList(openParenTrailingComments, parameters);
            this.setSpan(result, start, node);

            return result;
        }

        public visitCallSignature(node: CallSignatureSyntax): CallSignature {
            var start = this.position;

            var typeParameters = this.visitTypeParameterList(node.typeParameterList);
            var parameters = this.visitParameterList(node.parameterList);
            var returnType = this.visitTypeAnnotation(node.typeAnnotation);

            var result = new CallSignature(typeParameters, parameters, returnType);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitTypeParameterList(node: TypeParameterListSyntax): TypeParameterList {
            if (!node) {
                return null;
            }

            var start = this.position;
            this.movePast(node.lessThanToken);
            var typeParameters = this.visitSeparatedSyntaxList(node.typeParameters);
            this.movePast(node.greaterThanToken);

            var result = new TypeParameterList(typeParameters);
            this.setSpan(result, start, node);

            return result;
        }

        public visitTypeParameter(node: TypeParameterSyntax): TypeParameter {
            var start = this.position;

            var identifier = this.identifierFromToken(node.identifier, /*isOptional:*/ false);
            this.movePast(node.identifier);
            var constraint: Constraint = node.constraint ? node.constraint.accept(this) : null;

            var result = new TypeParameter(identifier, constraint);
            this.setSpan(result, start, node);

            return result;
        }

        public visitConstraint(node: ConstraintSyntax): Constraint {
            var start = this.position;
            this.movePast(node.extendsKeyword);
            var type = this.visitType(node.type);

            var result = new Constraint(type);
            this.setSpan(result, start, node);

            return result;
        }

        public visitIfStatement(node: IfStatementSyntax): IfStatement {
            var start = this.position;

            this.moveTo(node, node.condition);
            var condition = node.condition.accept(this);
            this.movePast(node.closeParenToken);
            var thenBod = node.statement.accept(this);
            var elseBod: ElseClause = node.elseClause ? node.elseClause.accept(this) : null;

            var result = new IfStatement(condition, thenBod, elseBod);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitElseClause(node: ElseClauseSyntax): ElseClause {
            var start = this.position;

            this.movePast(node.elseKeyword);
            var statement = node.statement.accept(this);

            var result = new ElseClause(statement);
            this.setSpan(result, start, node);

            return result;
        }

        public visitExpressionStatement(node: ExpressionStatementSyntax): ExpressionStatement {
            var start = this.position;

            var preComments = this.convertTokenLeadingComments(node.firstToken(), start);
            var expression = node.expression.accept(this);

            var semicolonPosition = this.position;

            var postComments = this.convertComments(node.semicolonToken.trailingTrivia(),
                this.position + node.semicolonToken.leadingTriviaWidth() + node.semicolonToken.width());
            this.movePast(node.semicolonToken);

            var result = new ExpressionStatement(expression);
            this.setSpan(result, start, node);

            result.setPreComments(preComments);
            result.setPostComments(postComments);

            return result;
        }

        public visitConstructorDeclaration(node: ConstructorDeclarationSyntax): ConstructorDeclaration {
            var start = this.position;

            this.moveTo(node, node.parameterList);
            var parameters = this.visitParameterList(node.parameterList);

            var block = node.block ? node.block.accept(this) : null;

            this.movePast(node.semicolonToken);

            var result = new ConstructorDeclaration(parameters, block);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitIndexMemberDeclaration(node: IndexMemberDeclarationSyntax): IndexMemberDeclaration {
            var start = this.position;

            this.moveTo(node, node.indexSignature);
            var indexSignature: IndexSignature = node.indexSignature.accept(this);

            this.movePast(node.semicolonToken);

            var result = new IndexMemberDeclaration(indexSignature);
            this.setSpan(result, start, node);

            return result;
        }

        public visitMemberFunctionDeclaration(node: MemberFunctionDeclarationSyntax): MemberFunctionDeclaration {
            var start = this.position;

            this.moveTo(node, node.propertyName);
            var name = this.identifierFromToken(node.propertyName, /*isOptional:*/ false);
            
            this.movePast(node.propertyName);

            var callSignature = this.visitCallSignature(node.callSignature);
            var block = node.block ? this.visitBlock(node.block) : null;
            this.movePast(node.semicolonToken);

            var result = new MemberFunctionDeclaration(this.visitModifiers(node.modifiers), name, callSignature, block);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitGetAccessor(node: GetAccessorSyntax): GetAccessor {
            var start = this.position;

            this.moveTo(node, node.propertyName);
            var name = this.identifierFromToken(node.propertyName, /*isOptional:*/ false);
            this.movePast(node.propertyName);
            var parameters = this.visitParameterList(node.parameterList);
            var returnType = this.visitTypeAnnotation(node.typeAnnotation);

            var block = node.block ? node.block.accept(this) : null;
            var result = new GetAccessor(this.visitModifiers(node.modifiers), name, parameters, returnType, block);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitSetAccessor(node: SetAccessorSyntax): SetAccessor {
            var start = this.position;

            this.moveTo(node, node.propertyName);
            var name = this.identifierFromToken(node.propertyName, /*isOptional:*/ false);
            this.movePast(node.propertyName);
            var parameters = this.visitParameterList(node.parameterList);
            var block = node.block ? node.block.accept(this) : null;
            var result = new SetAccessor(this.visitModifiers(node.modifiers), name, parameters, block);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitMemberVariableDeclaration(node: MemberVariableDeclarationSyntax): MemberVariableDeclaration {
            var start = this.position;

            this.moveTo(node, node.variableDeclarator);
            var variableDeclarator: VariableDeclarator = node.variableDeclarator.accept(this);
            this.movePast(node.semicolonToken);

            var modifiers = this.visitModifiers(node.modifiers);
            var result = new MemberVariableDeclaration(modifiers, variableDeclarator);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitThrowStatement(node: ThrowStatementSyntax): ThrowStatement {
            var start = this.position;

            this.movePast(node.throwKeyword);
            var expression = node.expression.accept(this);
            this.movePast(node.semicolonToken);

            var result = new ThrowStatement(expression);
            this.setSpan(result, start, node);

            return result;
        }

        public visitReturnStatement(node: ReturnStatementSyntax): ReturnStatement {
            var start = this.position;

            this.movePast(node.returnKeyword);
            var expression = node.expression ? node.expression.accept(this) : null;
            this.movePast(node.semicolonToken);

            var result = new ReturnStatement(expression);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitObjectCreationExpression(node: ObjectCreationExpressionSyntax): ObjectCreationExpression {
            var start = this.position;

            this.movePast(node.newKeyword);
            var expression = node.expression.accept(this);
            var argumentList = this.visitArgumentList(node.argumentList);

            var result = new ObjectCreationExpression(expression, argumentList);
            this.setSpan(result, start, node);

            return result;
        }

        public visitSwitchStatement(node: SwitchStatementSyntax): SwitchStatement {
            var start = this.position;

            this.movePast(node.switchKeyword);
            this.movePast(node.openParenToken);
            var expression = node.expression.accept(this);
            var closeParenStart = this.position + node.closeParenToken.leadingTriviaWidth();
            this.movePast(node.closeParenToken);
            this.movePast(node.openBraceToken);

            var switchClauses = this.visitSyntaxList(node.switchClauses);

            var span = new ASTSpan();
            span.minChar = closeParenStart;
            span.limChar = closeParenStart + node.closeParenToken.width();

            this.movePast(node.closeBraceToken);

            var result = new SwitchStatement(expression, span, switchClauses);
            this.setSpan(result, start, node);

            return result;
        }

        public visitCaseSwitchClause(node: CaseSwitchClauseSyntax): CaseSwitchClause {
            var start = this.position;

            this.movePast(node.caseKeyword);
            var expression = node.expression.accept(this);
            this.movePast(node.colonToken);
            var statements = this.visitSyntaxList(node.statements);

            var result = new CaseSwitchClause(expression, statements);
            this.setSpan(result, start, node);

            return result;
        }

        public visitDefaultSwitchClause(node: DefaultSwitchClauseSyntax): DefaultSwitchClause {
            var start = this.position;

            this.movePast(node.defaultKeyword);
            this.movePast(node.colonToken);
            var statements = this.visitSyntaxList(node.statements);

            var result = new DefaultSwitchClause(statements);
            this.setSpan(result, start, node);

            return result;
        }

        public visitBreakStatement(node: BreakStatementSyntax): BreakStatement {
            var start = this.position;

            this.movePast(node.breakKeyword);
            var identifier: Identifier = node.identifier ? node.identifier.accept(this) : null;
            this.movePast(node.semicolonToken);

            var result = new BreakStatement(identifier);
            this.setSpan(result, start, node);

            return result;
        }

        public visitContinueStatement(node: ContinueStatementSyntax): ContinueStatement {
            var start = this.position;

            this.movePast(node.continueKeyword);
            var identifier = node.identifier ? node.identifier.accept(this) : null;
            this.movePast(node.semicolonToken);

            var result = new ContinueStatement(identifier);
            this.setSpan(result, start, node);

            return result;
        }

        public visitForStatement(node: ForStatementSyntax): ForStatement {
            var start = this.position;

            this.movePast(node.forKeyword);
            this.movePast(node.openParenToken);
            var variableDeclaration: VariableDeclaration = node.variableDeclaration ? node.variableDeclaration.accept(this) : null;
            var initializer: AST = node.initializer ? node.initializer.accept(this) : null;

            this.movePast(node.firstSemicolonToken);
            var cond = node.condition ? node.condition.accept(this) : null;
            this.movePast(node.secondSemicolonToken);
            var incr = node.incrementor ? node.incrementor.accept(this) : null;
            this.movePast(node.closeParenToken);
            var body = node.statement.accept(this);

            var result = new ForStatement(variableDeclaration, initializer, cond, incr, body);
            this.setSpan(result, start, node);

            return result;
        }

        public visitForInStatement(node: ForInStatementSyntax): ForInStatement {
            var start = this.position;

            this.movePast(node.forKeyword);
            this.movePast(node.openParenToken);
            var variableDeclaration: VariableDeclaration = node.variableDeclaration ? node.variableDeclaration.accept(this) : null;
            var left: AST = node.left ? node.left.accept(this) : null;

            this.movePast(node.inKeyword);
            var expression = node.expression.accept(this);
            this.movePast(node.closeParenToken);
            var body = node.statement.accept(this);

            var result = new ForInStatement(variableDeclaration, left, expression, body);
            this.setSpan(result, start, node);

            return result;
        }

        public visitWhileStatement(node: WhileStatementSyntax): WhileStatement {
            var start = this.position;

            this.moveTo(node, node.condition);
            var condition = node.condition.accept(this);
            this.movePast(node.closeParenToken);
            var statement = node.statement.accept(this);

            var result = new WhileStatement(condition, statement);
            this.setSpan(result, start, node);

            return result;
        }

        public visitWithStatement(node: WithStatementSyntax): WithStatement {
            var start = this.position;

            this.moveTo(node, node.condition);
            var condition = node.condition.accept(this);
            this.movePast(node.closeParenToken);
            var statement = node.statement.accept(this);

            var result = new WithStatement(condition, statement);
            this.setSpan(result, start, node);

            return result;
        }

        public visitCastExpression(node: CastExpressionSyntax): CastExpression {
            var start = this.position;

            this.movePast(node.lessThanToken);
            var castTerm = this.visitType(node.type);
            this.movePast(node.greaterThanToken);
            var expression = node.expression.accept(this);

            var result = new CastExpression(castTerm, expression);
            this.setSpan(result, start, node);

            return result;
        }

        public visitObjectLiteralExpression(node: ObjectLiteralExpressionSyntax): ObjectLiteralExpression {
            var start = this.position;

            var openStart = this.position + node.openBraceToken.leadingTriviaWidth();
            this.movePast(node.openBraceToken);

            var propertyAssignments = this.visitSeparatedSyntaxList(node.propertyAssignments);

            var closeStart = this.position + node.closeBraceToken.leadingTriviaWidth();
            this.movePast(node.closeBraceToken);

            var result = new ObjectLiteralExpression(propertyAssignments);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitSimplePropertyAssignment(node: SimplePropertyAssignmentSyntax): SimplePropertyAssignment {
            var start = this.position;

            var preComments = this.convertTokenLeadingComments(node.firstToken(), start);
            var postComments = this.convertNodeTrailingComments(node, node.lastToken(), start);

            var propertyName: Identifier = node.propertyName.accept(this);

            var afterColonComments = this.convertTokenTrailingComments(
                node.colonToken, this.position + node.colonToken.leadingTriviaWidth() + node.colonToken.width());

            this.movePast(node.colonToken);
            var expression: AST = node.expression.accept(this);
            expression.setPreComments(this.mergeComments(afterColonComments, expression.preComments()));

            var result = new SimplePropertyAssignment(propertyName, expression);
            this.setSpan(result, start, node);

            result.setPreComments(preComments);
            result.setPostComments(postComments);

            return result;
        }

        public visitFunctionPropertyAssignment(node: FunctionPropertyAssignmentSyntax): FunctionPropertyAssignment {
            var start = this.position;

            var propertyName: Identifier = node.propertyName.accept(this);
            var callSignature = this.visitCallSignature(node.callSignature);
            var block = this.visitBlock(node.block);

            var result = new FunctionPropertyAssignment(propertyName, callSignature, block);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitFunctionExpression(node: FunctionExpressionSyntax): FunctionExpression {
            var start = this.position;

            this.movePast(node.functionKeyword);
            var name = node.identifier === null ? null : this.identifierFromToken(node.identifier, /*isOptional:*/ false);
            this.movePast(node.identifier);

            var callSignature = this.visitCallSignature(node.callSignature);
            var block: Block = node.block ? node.block.accept(this) : null;

            var result = new FunctionExpression(name, callSignature, block);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitEmptyStatement(node: EmptyStatementSyntax): EmptyStatement {
            var start = this.position;

            this.movePast(node.semicolonToken);

            var result = new EmptyStatement();
            this.setSpan(result, start, node);

            return result;
        }

        public visitTryStatement(node: TryStatementSyntax): TryStatement {
            var start = this.position;

            this.movePast(node.tryKeyword);
            var tryBody = node.block.accept(this);

            var catchClause: CatchClause = null;
            if (node.catchClause !== null) {
                catchClause = node.catchClause.accept(this);
            }

            var finallyBody: FinallyClause = null;
            if (node.finallyClause !== null) {
                finallyBody = node.finallyClause.accept(this);
            }

            var result = new TryStatement(tryBody, catchClause, finallyBody);
            this.setSpan(result, start, node);

            return result;
        }

        public visitCatchClause(node: CatchClauseSyntax): CatchClause {
            var start = this.position;

            this.movePast(node.catchKeyword);
            this.movePast(node.openParenToken);
            var identifier = this.identifierFromToken(node.identifier, /*isOptional:*/ false);
            this.movePast(node.identifier);
            var typeAnnotation = this.visitTypeAnnotation(node.typeAnnotation);
            this.movePast(node.closeParenToken);
            var block = node.block.accept(this);

            var result = new CatchClause(identifier, typeAnnotation, block);
            this.setSpan(result, start, node);

            return result;
        }

        public visitFinallyClause(node: FinallyClauseSyntax): FinallyClause {
            var start = this.position;
            this.movePast(node.finallyKeyword);
            var block: Block = node.block.accept(this);

            var result = new FinallyClause(block);
            this.setSpan(result, start, node);

            return result;
        }

        public visitLabeledStatement(node: LabeledStatementSyntax): LabeledStatement {
            var start = this.position;

            var identifier = this.identifierFromToken(node.identifier, /*isOptional:*/ false);
            this.movePast(node.identifier);
            this.movePast(node.colonToken);
            var statement = node.statement.accept(this);

            var result = new LabeledStatement(identifier, statement);
            this.setSpan(result, start, node);

            return result;
        }

        public visitDoStatement(node: DoStatementSyntax): DoStatement {
            var start = this.position;

            this.movePast(node.doKeyword);
            var statement: AST = node.statement.accept(this);
            var whileSpan = new ASTSpan();
            this.setTokenSpan(whileSpan, this.position, node.whileKeyword);

            this.movePast(node.whileKeyword);
            this.movePast(node.openParenToken);
            var condition: AST = node.condition.accept(this);
            this.movePast(node.closeParenToken);
            this.movePast(node.semicolonToken);

            var result = new DoStatement(statement, whileSpan, condition);
            this.setSpan(result, start, node);

            return result;
        }

        public visitTypeOfExpression(node: TypeOfExpressionSyntax): TypeOfExpression {
            var start = this.position;

            this.movePast(node.typeOfKeyword);
            var expression = node.expression.accept(this);

            var result = new TypeOfExpression(expression);
            this.setSpan(result, start, node);

            return result;
        }

        public visitDeleteExpression(node: DeleteExpressionSyntax): DeleteExpression {
            var start = this.position;

            this.movePast(node.deleteKeyword);
            var expression = node.expression.accept(this);

            var result = new DeleteExpression(expression);
            this.setSpan(result, start, node);

            return result;
        }

        public visitVoidExpression(node: VoidExpressionSyntax): VoidExpression {
            var start = this.position;

            this.movePast(node.voidKeyword);
            var expression = node.expression.accept(this);

            var result = new VoidExpression(expression);
            this.setSpan(result, start, node);

            return result;
        }

        public visitDebuggerStatement(node: DebuggerStatementSyntax): DebuggerStatement {
            var start = this.position;

            this.movePast(node.debuggerKeyword);
            this.movePast(node.semicolonToken);

            var result = new DebuggerStatement();
            this.setSpan(result, start, node);

            return result;
        }
    }

    function applyDelta(ast: TypeScript.IASTSpan, delta: number) {
        if (ast) {
            if (ast.minChar !== -1) {
                ast.minChar += delta;
            }

            if (ast.limChar !== -1) {
                ast.limChar += delta;
            }
        }
    }

    function applyDeltaToComments(comments: TypeScript.Comment[], delta: number) {
        if (comments && comments.length > 0) {
            for (var i = 0; i < comments.length; i++) {
                var comment = comments[i];
                applyDelta(comment, delta);
            }
        }
    }

    class SyntaxTreeToIncrementalAstVisitor extends SyntaxTreeToAstVisitor {
        private applyDelta(ast: TypeScript.AST, delta: number) {
            if (delta === 0) {
                return;
            }

            var pre = function (cur: TypeScript.AST) {
                // Apply delta to this node
                applyDelta(cur, delta);
                applyDeltaToComments(cur.preComments(), delta);
                applyDeltaToComments(cur.postComments(), delta);

                // Apply delta to all custom span fields
                switch (cur.nodeType()) {
                    case NodeType.Block:
                        applyDelta((<Block>cur).closeBraceToken, delta);
                        break; 

                    case NodeType.ArgumentList:
                        applyDelta((<ArgumentList>cur).closeParenToken, delta);
                        break;

                    case NodeType.ModuleDeclaration:
                        applyDelta((<ModuleDeclaration>cur).endingToken, delta);
                        break;

                    case NodeType.ClassDeclaration:
                        applyDelta((<ClassDeclaration>cur).closeBraceToken, delta);
                        break;

                    case NodeType.DoStatement:
                        applyDelta((<DoStatement>cur).whileKeyword, delta);
                        break;

                    case NodeType.SwitchStatement:
                        applyDelta((<SwitchStatement>cur).closeParenToken, delta);
                        break;
                }
            };

            TypeScript.getAstWalkerFactory().simpleWalk(ast, pre);
        }

        public setSpanExplicit(span: IASTSpan, start: number, end: number): void {
            if (span.minChar !== -1) {
                // Have an existing span.  We need to adjust it so that it starts at the provided
                // desiredMinChar.

                var delta = start - span.minChar;
                this.applyDelta(<AST>span, delta);

                span.limChar = end;
            }
            else {
                super.setSpanExplicit(span, start, end);
            }
        }

        private getAndMovePastAST(element: ISyntaxElement): any {
            if (this.previousTokenTrailingComments !== null) {
                return null;
            }

            var result = (<any>element)._ast;
            if (!result) {
                return null;
            }

            // We previous mapped this element to an AST node.  Return the AST node (with its 
            // positions properly updated), and move past it.
            var start = this.position;
            this.movePast(element);
            this.setSpan(result, start, element);
            return result;
        }

        private setAST(element: ISyntaxElement, ast: IASTSpan): void {
            (<any>element)._ast = ast;
        }

        public visitSyntaxList(list: ISyntaxList): ASTList {
            var result: ASTList = this.getAndMovePastAST(list);
            if (!result) {
                result = super.visitSyntaxList(list);

                if (list.childCount() > 0) {
                    // Don't cache 0 lengthed lists as we only have a single sentinel value for them
                    this.setAST(list, result);
                }
            }

            return result;
        }

        public visitSeparatedSyntaxList(list: ISeparatedSyntaxList): ASTList {
            var result: ASTList = this.getAndMovePastAST(list);
            if (!result) {
                result = super.visitSeparatedSyntaxList(list);

                if (list.childCount() > 0) {
                    // Don't cache 0 lengthed lists as we only have a single sentinel value for them
                    this.setAST(list, result);
                }
            }

            return result;
        }

        public visitToken(token: ISyntaxToken): AST {
            var result = this.getAndMovePastAST(token);

            if (!result) {
                result = super.visitToken(token);
                this.setAST(token, result);
            }

            return result;
        }

        public visitClassDeclaration(node: ClassDeclarationSyntax): ClassDeclaration {
            var result: ClassDeclaration = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitClassDeclaration(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitInterfaceDeclaration(node: InterfaceDeclarationSyntax): InterfaceDeclaration {
            var result: InterfaceDeclaration = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitInterfaceDeclaration(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitHeritageClause(node: HeritageClauseSyntax): HeritageClause {
            var result: HeritageClause = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitHeritageClause(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitModuleDeclaration(node: ModuleDeclarationSyntax): ModuleDeclaration {
            var result: ModuleDeclaration = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitModuleDeclaration(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitFunctionDeclaration(node: FunctionDeclarationSyntax): FunctionDeclaration {
            var result: FunctionDeclaration = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitFunctionDeclaration(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitImportDeclaration(node: ImportDeclarationSyntax): ImportDeclaration {
            var result: ImportDeclaration = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitImportDeclaration(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitExportAssignment(node: ExportAssignmentSyntax): ExportAssignment {
            var result: ExportAssignment = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitExportAssignment(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitPrefixUnaryExpression(node: PrefixUnaryExpressionSyntax): PrefixUnaryExpression {
            var result: PrefixUnaryExpression = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitPrefixUnaryExpression(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitArrayLiteralExpression(node: ArrayLiteralExpressionSyntax): ArrayLiteralExpression {
            var result: ArrayLiteralExpression = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitArrayLiteralExpression(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitOmittedExpression(node: OmittedExpressionSyntax): OmittedExpression {
            var result: OmittedExpression = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitOmittedExpression(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitParenthesizedExpression(node: ParenthesizedExpressionSyntax): ParenthesizedExpression {
            var result: ParenthesizedExpression = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitParenthesizedExpression(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitSimpleArrowFunctionExpression(node: SimpleArrowFunctionExpressionSyntax): SimpleArrowFunctionExpression {
            var result: SimpleArrowFunctionExpression = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitSimpleArrowFunctionExpression(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitParenthesizedArrowFunctionExpression(node: ParenthesizedArrowFunctionExpressionSyntax): ParenthesizedArrowFunctionExpression {
            var result: ParenthesizedArrowFunctionExpression = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitParenthesizedArrowFunctionExpression(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitQualifiedName(node: QualifiedNameSyntax): QualifiedName {
            var result: QualifiedName = this.getAndMovePastAST(node);
            if (!result) {
                var result = super.visitQualifiedName(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitConstructorType(node: ConstructorTypeSyntax): ConstructorType {
            var result: ConstructorType = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitConstructorType(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitFunctionType(node: FunctionTypeSyntax): FunctionType {
            var result: FunctionType = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitFunctionType(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitObjectType(node: ObjectTypeSyntax): ObjectType {
            var result: ObjectType = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitObjectType(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitArrayType(node: ArrayTypeSyntax): ArrayType {
            var result: ArrayType = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitArrayType(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitGenericType(node: GenericTypeSyntax): GenericType {
            var result: GenericType = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitGenericType(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitBlock(node: BlockSyntax): Block {
            var result: Block = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitBlock(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitParameter(node: ParameterSyntax): Parameter {
            var result: Parameter = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitParameter(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitMemberAccessExpression(node: MemberAccessExpressionSyntax): MemberAccessExpression {
            var result: MemberAccessExpression = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitMemberAccessExpression(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitPostfixUnaryExpression(node: PostfixUnaryExpressionSyntax): PostfixUnaryExpression {
            var result: PostfixUnaryExpression = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitPostfixUnaryExpression(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitElementAccessExpression(node: ElementAccessExpressionSyntax): ElementAccessExpression {
            var result: ElementAccessExpression = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitElementAccessExpression(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitInvocationExpression(node: InvocationExpressionSyntax): InvocationExpression {
            var result: InvocationExpression = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitInvocationExpression(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitBinaryExpression(node: BinaryExpressionSyntax): BinaryExpression {
            var result: BinaryExpression = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitBinaryExpression(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitConditionalExpression(node: ConditionalExpressionSyntax): ConditionalExpression {
            var result: ConditionalExpression = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitConditionalExpression(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitConstructSignature(node: ConstructSignatureSyntax): ConstructSignature {
            var result: ConstructSignature = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitConstructSignature(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitMethodSignature(node: MethodSignatureSyntax): MethodSignature {
            var result: MethodSignature = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitMethodSignature(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitIndexSignature(node: IndexSignatureSyntax): IndexSignature {
            var result: IndexSignature = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitIndexSignature(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitPropertySignature(node: PropertySignatureSyntax): PropertySignature {
            var result: PropertySignature = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitPropertySignature(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitCallSignature(node: CallSignatureSyntax): CallSignature {
            var result: CallSignature = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitCallSignature(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitTypeParameter(node: TypeParameterSyntax): TypeParameter {
            var result: TypeParameter = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitTypeParameter(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitIfStatement(node: IfStatementSyntax): IfStatement {
            var result: IfStatement = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitIfStatement(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitExpressionStatement(node: ExpressionStatementSyntax): ExpressionStatement {
            var result: ExpressionStatement = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitExpressionStatement(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitConstructorDeclaration(node: ConstructorDeclarationSyntax): ConstructorDeclaration {
            var result: ConstructorDeclaration = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitConstructorDeclaration(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitMemberFunctionDeclaration(node: MemberFunctionDeclarationSyntax): MemberFunctionDeclaration {
            var result: MemberFunctionDeclaration = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitMemberFunctionDeclaration(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitGetAccessor(node: GetAccessorSyntax): GetAccessor {
            var result: GetAccessor = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitGetAccessor(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitSetAccessor(node: SetAccessorSyntax): SetAccessor {
            var result: SetAccessor = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitSetAccessor(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitMemberVariableDeclaration(node: MemberVariableDeclarationSyntax): MemberVariableDeclaration {
            var result: MemberVariableDeclaration = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitMemberVariableDeclaration(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitThrowStatement(node: ThrowStatementSyntax): ThrowStatement {
            var result: ThrowStatement = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitThrowStatement(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitReturnStatement(node: ReturnStatementSyntax): ReturnStatement {
            var result: ReturnStatement = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitReturnStatement(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitObjectCreationExpression(node: ObjectCreationExpressionSyntax): ObjectCreationExpression {
            var result: ObjectCreationExpression = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitObjectCreationExpression(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitSwitchStatement(node: SwitchStatementSyntax): SwitchStatement {
            var result: SwitchStatement = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitSwitchStatement(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitCaseSwitchClause(node: CaseSwitchClauseSyntax): CaseSwitchClause {
            var result: CaseSwitchClause = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitCaseSwitchClause(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitDefaultSwitchClause(node: DefaultSwitchClauseSyntax): DefaultSwitchClause {
            var result: DefaultSwitchClause = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitDefaultSwitchClause(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitBreakStatement(node: BreakStatementSyntax): BreakStatement {
            var result: BreakStatement = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitBreakStatement(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitContinueStatement(node: ContinueStatementSyntax): ContinueStatement {
            var result: ContinueStatement = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitContinueStatement(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitForStatement(node: ForStatementSyntax): ForStatement {
            var result: ForStatement = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitForStatement(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitForInStatement(node: ForInStatementSyntax): ForInStatement {
            var result: ForInStatement = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitForInStatement(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitWhileStatement(node: WhileStatementSyntax): WhileStatement {
            var result: WhileStatement = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitWhileStatement(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitWithStatement(node: WithStatementSyntax): WithStatement {
            var result: WithStatement = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitWithStatement(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitCastExpression(node: CastExpressionSyntax): CastExpression {
            var result: CastExpression = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitCastExpression(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitObjectLiteralExpression(node: ObjectLiteralExpressionSyntax): ObjectLiteralExpression {
            var result: ObjectLiteralExpression = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitObjectLiteralExpression(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitSimplePropertyAssignment(node: SimplePropertyAssignmentSyntax): SimplePropertyAssignment {
            var result: SimplePropertyAssignment = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitSimplePropertyAssignment(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitFunctionPropertyAssignment(node: FunctionPropertyAssignmentSyntax): FunctionPropertyAssignment {
            var result: FunctionPropertyAssignment = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitFunctionPropertyAssignment(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitFunctionExpression(node: FunctionExpressionSyntax): FunctionExpression {
            var result: FunctionExpression = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitFunctionExpression(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitEmptyStatement(node: EmptyStatementSyntax): EmptyStatement {
            var result: EmptyStatement = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitEmptyStatement(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitTryStatement(node: TryStatementSyntax): TryStatement {
            var result: TryStatement = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitTryStatement(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitCatchClause(node: CatchClauseSyntax): CatchClause {
            var result: CatchClause = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitCatchClause(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitLabeledStatement(node: LabeledStatementSyntax): LabeledStatement {
            var result: LabeledStatement = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitLabeledStatement(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitDoStatement(node: DoStatementSyntax): DoStatement {
            var result: DoStatement = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitDoStatement(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitTypeOfExpression(node: TypeOfExpressionSyntax): TypeOfExpression {
            var result: TypeOfExpression = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitTypeOfExpression(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitDeleteExpression(node: DeleteExpressionSyntax): DeleteExpression {
            var result: DeleteExpression = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitDeleteExpression(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitVoidExpression(node: VoidExpressionSyntax): VoidExpression {
            var result: VoidExpression = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitVoidExpression(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitDebuggerStatement(node: DebuggerStatementSyntax): DebuggerStatement {
            var result: DebuggerStatement = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitDebuggerStatement(node);
                this.setAST(node, result);
            }

            return result;
        }
    }
}