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

        public identifierFromToken(token: ISyntaxToken, isOptional: boolean, stringLiteralIsTextOfIdentifier?: boolean): Identifier {
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

            if (isOptional) {
                result.setFlags(result.getFlags() | ASTFlags.OptionalName);
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
            var moduleFlags = ModuleFlags.None;
            if (this.hasTopLevelImportOrExport(node)) {
                isExternalModule = true;

                var correctedFileName = switchToForwardSlashes(this.fileName);
                var id: Identifier = new Identifier(correctedFileName, correctedFileName, /*isStringOrNumericLiteral:*/ false);
                var topLevelMod = new ModuleDeclaration(id, bod, null);
                this.setSpanExplicit(topLevelMod, start, this.position);

                moduleFlags = ModuleFlags.IsExternalModule | ModuleFlags.Exported;
                if (isDTSFile(this.fileName)) {
                    moduleFlags |= ModuleFlags.Ambient;
                }

                topLevelMod.setModuleFlags(moduleFlags);

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

            var result = new Script(bod, this.fileName, isExternalModule, amdDependencies);
            this.setSpanExplicit(result, start, start + node.fullWidth());

            result.setModuleFlags(moduleFlags);

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

            var typeParameters = node.typeParameterList === null ? null : node.typeParameterList.accept(this);
            var heritageClauses = node.heritageClauses ? this.visitSyntaxList(node.heritageClauses) : null;

            this.movePast(node.openBraceToken);
            var members = this.visitSyntaxList(node.classElements);
            var closeBracePosition = this.position;
            this.movePast(node.closeBraceToken);
            var closeBraceSpan = new ASTSpan();
            this.setTokenSpan(closeBraceSpan, closeBracePosition, node.closeBraceToken);

            var result = new ClassDeclaration(name, typeParameters, heritageClauses, members, closeBraceSpan);
            this.setCommentsAndSpan(result, start, node);

            var flags = result.getVarFlags();
            if (SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.ExportKeyword)) {
                flags = flags | VariableFlags.Exported;
            }

            if (SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.DeclareKeyword)) {
                flags = flags | VariableFlags.Ambient;
            }

            result.setVarFlags(flags);

            return result;
        }

        public visitInterfaceDeclaration(node: InterfaceDeclarationSyntax): InterfaceDeclaration {
            var start = this.position;

            this.moveTo(node, node.identifier);
            var name = this.identifierFromToken(node.identifier, /*isOptional:*/ false);
            this.movePast(node.identifier);
            var typeParameters = node.typeParameterList === null ? null : node.typeParameterList.accept(this);
            var heritageClauses = node.heritageClauses ? this.visitSyntaxList(node.heritageClauses) : null;

            var body = this.visitObjectTypeWorker(node.body);

            var result = new InterfaceDeclaration(name, typeParameters, heritageClauses, body);
            this.setCommentsAndSpan(result, start, node);

            if (SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.ExportKeyword)) {
                result.setVarFlags(result.getVarFlags() | VariableFlags.Exported);
            }

            return result;
        }

        public visitHeritageClause(node: HeritageClauseSyntax): HeritageClause {
            var start = this.position;
            var array = new Array<any>(node.typeNames.nonSeparatorCount());

            this.movePast(node.extendsOrImplementsKeyword);
            for (var i = 0, n = node.typeNames.childCount(); i < n; i++) {
                if (i % 2 === 1) {
                    this.movePast(node.typeNames.childAt(i));
                }
                else {
                    var type = this.visitType(node.typeNames.childAt(i));
                    array[i / 2] = type;
                }
            }

            var result = new ASTList(this.fileName, array);
            this.setSpan(result, start, node);

            var heritageClause = new HeritageClause(
                node.extendsOrImplementsKeyword.tokenKind === SyntaxKind.ExtendsKeyword ? NodeType.ExtendsHeritageClause : NodeType.ImplementsHeritageClause,
                result);
            this.setSpan(heritageClause, start, node);

            return heritageClause;
        }

        private getModuleNames(node: ModuleDeclarationSyntax): Identifier[] {
            var result: Identifier[] = [];

            if (node.stringLiteral !== null) {
                result.push(this.identifierFromToken(node.stringLiteral, /*isOptional:*/false, true));
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

                var result = new ModuleDeclaration(innerName, members, closeBraceSpan);
                this.setSpan(result, start, node);

                result.setPreComments(preComments);
                result.setPostComments(postComments);

                preComments = null;
                postComments = null;

                // mark the inner module declarations as exported
                // outer module is exported if export key word or parsing ambient module
                if (i || SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.ExportKeyword)) {
                    result.setModuleFlags(result.getModuleFlags() | ModuleFlags.Exported);
                }

                // REVIEW: will also possibly need to re-parent comments as well

                members = new ASTList(this.fileName, [result]);
            }

            // mark ambient if declare keyword or parsing ambient module or parsing declare file
            if (SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.DeclareKeyword)) {
                result.setModuleFlags(result.getModuleFlags() | ModuleFlags.Ambient);
            }

            this.setSpan(result, start, node);
            return result;
        }

        public visitFunctionDeclaration(node: FunctionDeclarationSyntax): FunctionDeclaration {
            var start = this.position;

            this.moveTo(node, node.identifier);
            var name = this.identifierFromToken(node.identifier, /*isOptional:*/ false);

            this.movePast(node.identifier);

            var typeParameters = node.callSignature.typeParameterList === null ? null : node.callSignature.typeParameterList.accept(this);
            var parameters = node.callSignature.parameterList.accept(this);

            var returnType = node.callSignature.typeAnnotation
                ? node.callSignature.typeAnnotation.accept(this)
                : null;

            var block = node.block ? node.block.accept(this) : null;

            this.movePast(node.semicolonToken);

            var result = new FunctionDeclaration(name, typeParameters, parameters, returnType, block);
            this.setCommentsAndSpan(result, start, node);

            if (node.semicolonToken) {
                result.setFunctionFlags(result.getFunctionFlags() | FunctionFlags.Signature);
            }

            var flags = result.getFunctionFlags();
            if (SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.ExportKeyword)) {
                flags = flags | FunctionFlags.Exported;
            }

            if (SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.DeclareKeyword)) {
                flags = flags | FunctionFlags.Ambient;
            }

            result.setFunctionFlags(flags);

            return result;
        }

        public visitEnumDeclaration(node: EnumDeclarationSyntax): EnumDeclaration {
            var start = this.position;

            this.moveTo(node, node.identifier);
            var identifier = this.identifierFromToken(node.identifier, /*isOptional:*/ false);
            this.movePast(node.identifier);

            this.movePast(node.openBraceToken);

            var enumElements: EnumElement[] = [];
            for (var i = 0, n = node.enumElements.childCount(); i < n; i++) {
                if (i % 2 === 1) {
                    this.movePast(node.enumElements.childAt(i));
                }
                else {
                    var enumElementSyntax = <EnumElementSyntax>node.enumElements.childAt(i);
                    var enumElementFullStart = this.position;
                    var memberStart = this.position + enumElementSyntax.leadingTriviaWidth();

                    var memberName = this.identifierFromToken(enumElementSyntax.propertyName, /*isOptional:*/ false);
                    this.movePast(enumElementSyntax.propertyName);

                    var value = enumElementSyntax.equalsValueClause !== null ? enumElementSyntax.equalsValueClause.accept(this) : null;

                    var enumElement = new EnumElement(memberName, value);
                    this.setCommentsAndSpan(enumElement, enumElementFullStart, enumElementSyntax);
                    enumElement.constantValue = this.determineConstantValue(enumElementSyntax.equalsValueClause, enumElements);

                    enumElements.push(enumElement);
                }
            }

            this.movePast(node.closeBraceToken);

            var result = new EnumDeclaration(identifier, new ASTList(this.fileName, enumElements));
            this.setCommentsAndSpan(result, start, node);

            var flags = ModuleFlags.None;
            if (SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.ExportKeyword)) {
                flags = flags | ModuleFlags.Exported;
            }

            if (SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.DeclareKeyword)) {
                flags = flags | ModuleFlags.Ambient;
            }

            result.setModuleFlags(flags);

            return result;
        }

        public visitEnumElement(node: EnumElementSyntax): void {
            // Processing enum elements should be handled from inside visitEnumDeclaration.
            throw Errors.invalidOperation();
        }

        private determineConstantValue(equalsValue: EqualsValueClauseSyntax, declarators: EnumElement[]): number {
            var value = equalsValue === null ? null : equalsValue.value;

            if (value === null) {
                // If they provided no value, then our constant value is 0 if we're the first 
                // element, or one greater than the last constant value.
                if (declarators.length === 0) {
                    return 0;
                }
                else {
                    var lastConstantValue = ArrayUtilities.last(declarators).constantValue;
                    return lastConstantValue !== null ? lastConstantValue + 1 : null;
                }
            }
            else {
                return this.computeConstantValue(value, declarators);
            }
        }

        private computeConstantValue(expression: IExpressionSyntax, declarators: EnumElement[]): number {
            if (Syntax.isIntegerLiteral(expression)) {
                // Always produce a value for an integer literal.
                var token: ISyntaxToken;
                switch (expression.kind()) {
                    case SyntaxKind.PlusExpression:
                    case SyntaxKind.NegateExpression:
                        token = <ISyntaxToken>(<PrefixUnaryExpressionSyntax>expression).operand;
                        break;
                    default:
                        token = <ISyntaxToken>expression;
                }

                var value = token.value();
                return value && expression.kind() === SyntaxKind.NegateExpression ? -value : value;
            }
            else if (this.compilationSettings.propagateEnumConstants()) {
                switch (expression.kind()) {
                    case SyntaxKind.IdentifierName:
                        // If it's a name, see if we already had an enum value named this.  If so,
                        // return that value.
                        var variableDeclarator = ArrayUtilities.firstOrDefault(declarators, d => d.identifier.valueText() === (<ISyntaxToken>expression).valueText());
                        return variableDeclarator ? variableDeclarator.constantValue : null;

                    case SyntaxKind.LeftShiftExpression:
                        // Handle the common case of a left shifted value.
                        var binaryExpression = <BinaryExpressionSyntax>expression;
                        return this.computeConstantValue(binaryExpression.left, declarators) << this.computeConstantValue(binaryExpression.right, declarators);

                    case SyntaxKind.BitwiseOrExpression:
                        // Handle the common case of an or'ed value.
                        var binaryExpression = <BinaryExpressionSyntax>expression;
                        return this.computeConstantValue(binaryExpression.left, declarators) | this.computeConstantValue(binaryExpression.right, declarators);
                }

                // TODO: add more cases.
                return null;
            }
            else {
                // Wasn't an integer literal, and we're not aggressively propagating constants.
                // There is no constant value for this expression.
                return null;
            }
        }

        public visitImportDeclaration(node: ImportDeclarationSyntax): ImportDeclaration {
            var start = this.position;

            this.moveTo(node, node.identifier);
            var name = this.identifierFromToken(node.identifier, /*isOptional:*/ false);
            this.movePast(node.identifier);
            this.movePast(node.equalsToken);
            var alias = node.moduleReference.accept(this);
            this.movePast(node.semicolonToken);

            var result = new ImportDeclaration(name, alias);
            this.setCommentsAndSpan(result, start, node);

            var flags = result.getVarFlags();
            if (SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.ExportKeyword)) {
                flags = flags | VariableFlags.Exported;
            }
            result.setVarFlags(flags);

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

            var preComments: Comment[] = null;
            if (node.modifiers.childCount() > 0) {
                preComments = this.convertTokenLeadingComments(node.modifiers.firstToken(), start);
            }

            this.moveTo(node, node.variableDeclaration);

            var declaration = node.variableDeclaration.accept(this);
            this.movePast(node.semicolonToken);

            for (var i = 0, n = declaration.declarators.members.length; i < n; i++) {
                var varDecl = <VariableDeclarator>declaration.declarators.members[i];

                if (i === 0) {
                    varDecl.setPreComments(this.mergeComments(preComments, varDecl.preComments()));
                }

                var flags = varDecl.getVarFlags();
                if (SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.ExportKeyword)) {
                    flags = flags | VariableFlags.Exported;
                }

                if (SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.DeclareKeyword)) {
                    flags = flags | VariableFlags.Ambient;
                }

                varDecl.setVarFlags(flags);
            }

            var result = new VariableStatement(declaration);
            this.setSpan(result, start, node);

            return result;
        }

        public visitVariableDeclaration(node: VariableDeclarationSyntax): VariableDeclaration {
            var start = this.position;

            var firstToken = node.firstToken();
            var preComments = this.convertTokenLeadingComments(firstToken, start);
            var postComments = this.convertNodeTrailingComments(node, node.lastToken(), start);

            this.moveTo(node, node.variableDeclarators);
            var variableDecls = this.visitSeparatedSyntaxList(node.variableDeclarators);

            for (var i = 0; i < variableDecls.members.length; i++) {
                if (i === 0) {
                    variableDecls.members[i].setPreComments(preComments);
                    variableDecls.members[i].setPostComments(postComments);
                }
            }

            var result = new VariableDeclaration(variableDecls);
            this.setSpan(result, start, node);

            return result;
        }

        public visitVariableDeclarator(node: VariableDeclaratorSyntax): VariableDeclarator {
            var start = this.position;
            var name = this.identifierFromToken(node.identifier, /*isOptional:*/ false);
            this.movePast(node.identifier);
            var typeExpr = node.typeAnnotation ? node.typeAnnotation.accept(this) : null;
            var init = node.equalsValueClause ? node.equalsValueClause.accept(this) : null;

            var result = new VariableDeclarator(name, typeExpr, init);
            this.setSpan(result, start, node);

            if (init) {
                if (init.nodeType() === NodeType.ArrowFunctionExpression) {
                    var arrowFunction = <ArrowFunctionExpression>init;
                    arrowFunction.hint = name.text();
                }
                else if (init.nodeType() === NodeType.FunctionExpression) {
                    var expression = <FunctionExpression>init;
                    expression.hint = name.text();
                }
            }

            return result;
        }

        public visitEqualsValueClause(node: EqualsValueClauseSyntax): AST {
            var afterEqualsComments = this.convertTokenTrailingComments(node.equalsToken,
                this.position + node.equalsToken.leadingTriviaWidth() + node.equalsToken.width());

            this.movePast(node.equalsToken);
            var result: AST = node.value.accept(this);
            result.setPreComments(this.mergeComments(afterEqualsComments, result.preComments()));

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

            if (!node.openBracketToken.hasTrailingNewLine()) {
                var childCount = node.expressions.childCount();
                if (childCount === 0 ||
                    !node.expressions.childAt(childCount - 1).lastToken().hasTrailingNewLine()) {

                    result.setFlags(result.getFlags() | ASTFlags.SingleLine);
                }
            }

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

            var result = new ParenthesizedExpression(expr);
            this.setSpan(result, start, node);

            result.openParenTrailingComments = openParenTrailingComments;
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

                var block = new Block(statements, closeBraceSpan);
                return block;
            }
        }

        public visitSimpleArrowFunctionExpression(node: SimpleArrowFunctionExpressionSyntax): ArrowFunctionExpression {
            var start = this.position;

            var identifier = this.identifierFromToken(node.identifier, /*isOptional:*/ false);
            this.movePast(node.identifier);
            this.movePast(node.equalsGreaterThanToken);

            var parameter = new Parameter(identifier, null, null, false, /*isRest:*/ false);
            this.setSpanExplicit(parameter, identifier.minChar, identifier.limChar);

            var parameters = new ASTList(this.fileName, [parameter]);

            var statements = this.getArrowFunctionStatements(node.body);

            var result = new ArrowFunctionExpression(null, parameters, null, statements);
            this.setSpan(result, start, node);

            return result;
        }

        public visitParenthesizedArrowFunctionExpression(node: ParenthesizedArrowFunctionExpressionSyntax): ArrowFunctionExpression {
            var start = this.position;

            var typeParameters = node.callSignature.typeParameterList === null ? null : node.callSignature.typeParameterList.accept(this);
            var parameters = node.callSignature.parameterList.accept(this);
            var returnType = node.callSignature.typeAnnotation ? node.callSignature.typeAnnotation.accept(this) : null;
            this.movePast(node.equalsGreaterThanToken);

            var block = this.getArrowFunctionStatements(node.body);

            var result = new ArrowFunctionExpression(typeParameters, parameters, returnType, block);
            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitType(type: ITypeSyntax): TypeReference {
            if (type.isToken()) {
                return new TypeReference(type.accept(this));
            }
            else {
                return type.accept(this);
            }
        }

        public visitTypeQuery(node: TypeQuerySyntax): TypeReference {
            var start = this.position;
            this.movePast(node.typeOfKeyword);
            var name = node.name.accept(this);

            var typeQuery = new TypeQuery(name);
            this.setSpan(typeQuery, start, node);

            return new TypeReference(typeQuery);
        }

        public visitQualifiedName(node: QualifiedNameSyntax): TypeReference {
            var start = this.position;
            var left = this.visitType(node.left).term;
            this.movePast(node.dotToken);
            var right = this.identifierFromToken(node.right, /*isOptional:*/ false);
            this.movePast(node.right);

            var term = new QualifiedName(left, right);
            this.setSpan(term, start, node);

            return new TypeReference(term);
        }

        public visitTypeArgumentList(node: TypeArgumentListSyntax): ASTList {
            var array = new Array<any>(node.typeArguments.nonSeparatorCount());

            this.movePast(node.lessThanToken);

            var start = this.position;

            for (var i = 0, n = node.typeArguments.childCount(); i < n; i++) {
                if (i % 2 === 1) {
                    this.movePast(node.typeArguments.childAt(i));
                }
                else {
                    array[i / 2] = this.visitType(node.typeArguments.childAt(i));
                }
            }
            this.movePast(node.greaterThanToken);
            
            var result = new ASTList(this.fileName, array);
            this.setSpan(result, start, node.typeArguments);

            return result;
        }

        public visitConstructorType(node: ConstructorTypeSyntax): TypeReference {
            var start = this.position;

            this.movePast(node.newKeyword);
            var typeParameters = node.typeParameterList === null ? null : node.typeParameterList.accept(this);
            var parameters = node.parameterList.accept(this);
            this.movePast(node.equalsGreaterThanToken);
            var returnType = node.type ? this.visitType(node.type) : null;

            var funcDecl = new FunctionDeclaration(null, typeParameters, parameters, returnType, null);
            this.setSpan(funcDecl, start, node);

            funcDecl.setFunctionFlags(funcDecl.getFunctionFlags() | FunctionFlags.Signature | FunctionFlags.ConstructMember);

            funcDecl.setFlags(funcDecl.getFlags() | ASTFlags.TypeReference);
            funcDecl.hint = "_construct";

            return new TypeReference(funcDecl);
        }

        public visitFunctionType(node: FunctionTypeSyntax): TypeReference {
            var start = this.position;
            var typeParameters = node.typeParameterList === null ? null : node.typeParameterList.accept(this);
            var parameters = node.parameterList.accept(this);
            this.movePast(node.equalsGreaterThanToken);
            var returnType = node.type ? this.visitType(node.type) : null;

            var funcDecl = new FunctionDeclaration(null, typeParameters, parameters, returnType, null);
            this.setSpan(funcDecl, start, node);

            funcDecl.setFlags(funcDecl.getFunctionFlags() | FunctionFlags.Signature);
            funcDecl.setFlags(funcDecl.getFlags() | ASTFlags.TypeReference);

            return new TypeReference(funcDecl);
        }

        public visitObjectType(node: ObjectTypeSyntax): TypeReference {
            var start = this.position;

            var objectType = this.visitObjectTypeWorker(node);
            objectType.setFlags(objectType.getFlags() | ASTFlags.TypeReference);

            return new TypeReference(objectType);
        }

        private visitObjectTypeWorker(node: ObjectTypeSyntax): ObjectType {
            var start = this.position;

            this.movePast(node.openBraceToken);
            var typeMembers = this.visitSeparatedSyntaxList(node.typeMembers);
            this.movePast(node.closeBraceToken);

            var objectType = new ObjectType(typeMembers);
            this.setSpan(objectType, start, node);

            return objectType;
        }

        public visitArrayType(node: ArrayTypeSyntax): TypeReference {
            var start = this.position;

            var underlying: AST = this.visitType(node.type);
            this.movePast(node.openBracketToken);
            this.movePast(node.closeBracketToken);

            if (underlying.nodeType() === NodeType.TypeRef) {
                underlying = (<TypeReference>underlying).term;
            }

            var arrayType = new ArrayType(underlying);
            this.setSpan(arrayType, start, node);

            var result = new TypeReference(arrayType);
            result.setFlags(result.getFlags() | ASTFlags.TypeReference);

            return result;
        }

        public visitGenericType(node: GenericTypeSyntax): TypeReference {
            var start = this.position;

            var underlying = this.visitType(node.name).term;
            var typeArguments = node.typeArgumentList.accept(this);

            var genericType = new GenericType(underlying, typeArguments);
            this.setSpan(genericType, start, node);

            genericType.setFlags(genericType.getFlags() | ASTFlags.TypeReference);

            return new TypeReference(genericType);
        }

        public visitTypeAnnotation(node: TypeAnnotationSyntax): TypeReference {
            this.movePast(node.colonToken);
            return this.visitType(node.type);
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

            var result = new Block(statements, closeBraceSpan);
            this.setSpan(result, start, node);

            result.closeBraceLeadingComments = closeBraceLeadingComments;

            return result;
        }

        public visitParameter(node: ParameterSyntax): Parameter {
            var start = this.position;

            this.moveTo(node, node.identifier);
            var identifier = this.identifierFromToken(node.identifier, !!node.questionToken);
            this.movePast(node.identifier);
            this.movePast(node.questionToken);
            var typeExpr = node.typeAnnotation ? node.typeAnnotation.accept(this) : null;
            var init = node.equalsValueClause ? node.equalsValueClause.accept(this) : null;

            var result = new Parameter(identifier, typeExpr, init, !!node.questionToken, node.dotDotDotToken !== null);
            this.setCommentsAndSpan(result, start, node);

            if (node.publicOrPrivateKeyword) {
                if (node.publicOrPrivateKeyword.tokenKind === SyntaxKind.PublicKeyword) {
                    result.setVarFlags(result.getVarFlags() | VariableFlags.Public);
                }
                else if (node.publicOrPrivateKeyword.tokenKind === SyntaxKind.PrivateKeyword) {
                    result.setVarFlags(result.getVarFlags() | VariableFlags.Private);
                }
            }

            if (node.equalsValueClause || node.dotDotDotToken) {
                result.setFlags(result.getFlags() | ASTFlags.OptionalName);
            }

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

        private convertArgumentListArguments(node: ArgumentListSyntax) {
            if (node === null) {
                return null;
            }

            var start = this.position;

            this.movePast(node.openParenToken);

            var result = this.visitSeparatedSyntaxList(node.arguments);

            if (node.arguments.fullWidth() === 0 && node.closeParenToken.fullWidth() === 0) {
                // If the argument list was empty, and closing paren is missing, set the argument ofsets to be the open paren trivia
                var openParenTokenEnd = start + node.openParenToken.leadingTriviaWidth() + node.openParenToken.width();
                this.setSpanExplicit(result, openParenTokenEnd, openParenTokenEnd + node.openParenToken.trailingTriviaWidth());
            }

            var closeParenPos = this.position;
            this.movePast(node.closeParenToken);
            var closeParenSpan = new ASTSpan();
            this.setTokenSpan(closeParenSpan, closeParenPos, node.closeParenToken);
            
            return {
                argumentList: result,
                closeParenSpan: closeParenSpan
            };
        }

        public visitInvocationExpression(node: InvocationExpressionSyntax): InvocationExpression {
            var start = this.position;

            var expression = node.expression.accept(this);
            var typeArguments = node.argumentList.typeArgumentList !== null
                ? node.argumentList.typeArgumentList.accept(this)
                : null;
            var argumentList = this.convertArgumentListArguments(node.argumentList);

            var result = new InvocationExpression(expression, typeArguments,
                argumentList ? argumentList.argumentList : null, argumentList ? argumentList.closeParenSpan : null);
            this.setSpan(result, start, node);

            return result;
        }

        public visitArgumentList(node: ArgumentListSyntax): ASTList {
            // Processing argument lists should be handled from inside visitInvocationExpression or 
            // visitObjectCreationExpression.
            throw Errors.invalidOperation();
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

            if (right.nodeType() === NodeType.FunctionDeclaration ||
                right.nodeType() === NodeType.ArrowFunctionExpression) {
                var id = left.nodeType() === NodeType.MemberAccessExpression ? (<MemberAccessExpression>left).name : left;
                var idHint: string = id.nodeType() === NodeType.Name ? id.actualText : null;

                var funcDecl = <FunctionDeclaration>right;
                funcDecl.hint = idHint;
            }

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

        public visitConstructSignature(node: ConstructSignatureSyntax): FunctionDeclaration {
            var start = this.position;

            this.movePast(node.newKeyword);
            var typeParameters = node.callSignature.typeParameterList === null ? null : node.callSignature.typeParameterList.accept(this);
            var parameters = node.callSignature.parameterList.accept(this);
            var returnType = node.callSignature.typeAnnotation ? node.callSignature.typeAnnotation.accept(this) : null;

            var result = new FunctionDeclaration(null, typeParameters, parameters, returnType, null);
            this.setCommentsAndSpan(result, start, node);

            result.hint = "_construct";
            result.setFunctionFlags(result.getFunctionFlags() | FunctionFlags.ConstructMember | FunctionFlags.Method | FunctionFlags.Signature);

            return result;
        }

        public visitMethodSignature(node: MethodSignatureSyntax): FunctionDeclaration {
            var start = this.position;

            var name = this.identifierFromToken(node.propertyName, !!node.questionToken);
            this.movePast(node.propertyName);
            this.movePast(node.questionToken);

            var typeParameters = node.callSignature.typeParameterList ? node.callSignature.typeParameterList.accept(this) : null;
            var parameters = node.callSignature.parameterList.accept(this);
            var returnType = node.callSignature.typeAnnotation ? node.callSignature.typeAnnotation.accept(this) : null;

            var result = new FunctionDeclaration(name, typeParameters, parameters, returnType, null);
            this.setCommentsAndSpan(result, start, node);

            result.setFunctionFlags(result.getFunctionFlags() | FunctionFlags.Method | FunctionFlags.Signature);

            return result;
        }

        public visitIndexSignature(node: IndexSignatureSyntax): FunctionDeclaration {
            var start = this.position;

            this.movePast(node.openBracketToken);

            var parameter = node.parameter.accept(this);

            this.movePast(node.closeBracketToken);
            var returnType = node.typeAnnotation ? node.typeAnnotation.accept(this) : null;

            var name = new Identifier("__item", "__item", /*isStringOrNumericLiteral:*/ false);
            this.setSpanExplicit(name, start, start);   // 0 length name.

            var parameters = new ASTList(this.fileName, [parameter]);

            var result = new FunctionDeclaration(name, null, parameters, returnType, null);
            this.setCommentsAndSpan(result, start, node);

            result.setFunctionFlags(result.getFunctionFlags() | FunctionFlags.IndexerMember | FunctionFlags.Method | FunctionFlags.Signature);

            return result;
        }

        public visitPropertySignature(node: PropertySignatureSyntax): VariableDeclarator {
            var start = this.position;

            var name = this.identifierFromToken(node.propertyName, !!node.questionToken);
            this.movePast(node.propertyName);
            this.movePast(node.questionToken);
            var typeExpr = node.typeAnnotation ? node.typeAnnotation.accept(this) : null;

            var result = new VariableDeclarator(name, typeExpr, null);
            this.setCommentsAndSpan(result, start, node);

            result.setVarFlags(result.getVarFlags() | VariableFlags.Property);

            return result;
        }

        public visitParameterList(node: ParameterListSyntax): ASTList {
            var start = this.position;

            var openParenToken = node.openParenToken;
            this.previousTokenTrailingComments = this.convertTokenTrailingComments(
                openParenToken, start + openParenToken.leadingTriviaWidth() + openParenToken.width());

            this.movePast(node.openParenToken);
            var result = this.visitSeparatedSyntaxList(node.parameters);
            this.movePast(node.closeParenToken);

            return result;
        }

        public visitCallSignature(node: CallSignatureSyntax): FunctionDeclaration {
            var start = this.position;

            var typeParameters = node.typeParameterList === null ? null : node.typeParameterList.accept(this);
            var parameters = node.parameterList.accept(this);
            var returnType = node.typeAnnotation ? node.typeAnnotation.accept(this) : null;

            var result = new FunctionDeclaration(null, typeParameters, parameters, returnType, null);
            this.setCommentsAndSpan(result, start, node);

            result.hint = "_call";
            result.setFunctionFlags(result.getFunctionFlags() | FunctionFlags.CallSignature | FunctionFlags.Method | FunctionFlags.Signature);

            return result;
        }

        public visitTypeParameterList(node: TypeParameterListSyntax): ASTList {
            this.movePast(node.lessThanToken);
            var result = this.visitSeparatedSyntaxList(node.typeParameters);
            this.movePast(node.greaterThanToken);

            return result;
        }

        public visitTypeParameter(node: TypeParameterSyntax): TypeParameter {
            var start = this.position;

            var identifier = this.identifierFromToken(node.identifier, /*isOptional:*/ false);
            this.movePast(node.identifier);
            var constraint = node.constraint ? node.constraint.accept(this) : null;

            var result = new TypeParameter(identifier, constraint);
            this.setSpan(result, start, node);

            return result;
        }

        public visitConstraint(node: ConstraintSyntax): TypeReference {
            this.movePast(node.extendsKeyword);
            return this.visitType(node.type);
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
            var parameters = node.parameterList.accept(this);

            var block = node.block ? node.block.accept(this) : null;

            this.movePast(node.semicolonToken);

            var result = new ConstructorDeclaration(parameters, block);
            this.setCommentsAndSpan(result, start, node);

            if (node.semicolonToken) {
                result.setFunctionFlags(result.getFunctionFlags() | FunctionFlags.Signature);
            }

            return result;
        }

        public visitIndexMemberDeclaration(node: IndexMemberDeclarationSyntax): FunctionDeclaration {
            var start = this.position;

            this.moveTo(node, node.indexSignature);
            var result = node.indexSignature.accept(this);
            this.setCommentsAndSpan(result, start, node);

            this.movePast(node.semicolonToken);

            return result;
        }

        public visitMemberFunctionDeclaration(node: MemberFunctionDeclarationSyntax): MemberFunctionDeclaration {
            var start = this.position;

            this.moveTo(node, node.propertyName);
            var name = this.identifierFromToken(node.propertyName, /*isOptional:*/ false);
            
            this.movePast(node.propertyName);

            var typeParameters = node.callSignature.typeParameterList === null ? null : node.callSignature.typeParameterList.accept(this);
            var parameters = node.callSignature.parameterList.accept(this);
            var returnType = node.callSignature.typeAnnotation
                ? node.callSignature.typeAnnotation.accept(this)
                : null;

            var block = node.block ? node.block.accept(this) : null;
            this.movePast(node.semicolonToken);

            var result = new MemberFunctionDeclaration(name, typeParameters, parameters, returnType, block);
            this.setCommentsAndSpan(result, start, node);

            var flags = result.getFunctionFlags();
            if (node.semicolonToken) {
                flags = flags | FunctionFlags.Signature;
            }

            if (SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.PrivateKeyword)) {
                flags = flags | FunctionFlags.Private;
            }
            else {
                flags = flags | FunctionFlags.Public;
            }

            if (SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.StaticKeyword)) {
                flags = flags | FunctionFlags.Static;
            }

            result.setFunctionFlags(flags);

            return result;
        }

        public visitGetAccessor(node: GetAccessorSyntax): GetAccessor {
            var start = this.position;

            this.moveTo(node, node.propertyName);
            var name = this.identifierFromToken(node.propertyName, /*isOptional:*/ false);
            this.movePast(node.propertyName);
            var parameters = node.parameterList.accept(this);
            var returnType = node.typeAnnotation ? node.typeAnnotation.accept(this) : null;

            var block = node.block ? node.block.accept(this) : null;
            var result = new GetAccessor(name, parameters, returnType, block);
            this.setCommentsAndSpan(result, start, node);

            if (SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.PrivateKeyword)) {
                result.setFunctionFlags(result.getFunctionFlags() | FunctionFlags.Private);
            }
            else {
                result.setFunctionFlags(result.getFunctionFlags() | FunctionFlags.Public);
            }

            if (SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.StaticKeyword)) {
                result.setFunctionFlags(result.getFunctionFlags() | FunctionFlags.Static);
            }

            return result;
        }

        public visitSetAccessor(node: SetAccessorSyntax): SetAccessor {
            var start = this.position;

            this.moveTo(node, node.propertyName);
            var name = this.identifierFromToken(node.propertyName, /*isOptional:*/ false);
            this.movePast(node.propertyName);
            var parameters = node.parameterList.accept(this);

            var block = node.block ? node.block.accept(this) : null;
            var result = new SetAccessor(name, parameters, block);
            this.setCommentsAndSpan(result, start, node);

            if (SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.PrivateKeyword)) {
                result.setFunctionFlags(result.getFunctionFlags() | FunctionFlags.Private);
            }
            else {
                result.setFunctionFlags(result.getFunctionFlags() | FunctionFlags.Public);
            }

            if (SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.StaticKeyword)) {
                result.setFunctionFlags(result.getFunctionFlags() | FunctionFlags.Static);
            }

            return result;
        }

        public visitMemberVariableDeclaration(node: MemberVariableDeclarationSyntax): MemberVariableDeclaration {
            var start = this.position;

            this.moveTo(node, node.variableDeclarator);
            this.moveTo(node.variableDeclarator, node.variableDeclarator.identifier);

            var name = this.identifierFromToken(node.variableDeclarator.identifier, /*isOptional:*/ false);
            this.movePast(node.variableDeclarator.identifier);
            var typeExpr = node.variableDeclarator.typeAnnotation ? node.variableDeclarator.typeAnnotation.accept(this) : null;
            var init = node.variableDeclarator.equalsValueClause ? node.variableDeclarator.equalsValueClause.accept(this) : null;
            this.movePast(node.semicolonToken);

            var result = new MemberVariableDeclaration(name, typeExpr, init);
            this.setCommentsAndSpan(result, start, node);

            if (SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.StaticKeyword)) {
                result.setVarFlags(result.getVarFlags() | VariableFlags.Static);
            }

            if (SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.PrivateKeyword)) {
                result.setVarFlags(result.getVarFlags() | VariableFlags.Private);
            }
            else {
                result.setVarFlags(result.getVarFlags() | VariableFlags.Public);
            }

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
            var typeArgumentList = node.argumentList === null || node.argumentList.typeArgumentList === null ? null : node.argumentList.typeArgumentList.accept(this);
            var argumentList = this.convertArgumentListArguments(node.argumentList);

            var result = new ObjectCreationExpression(expression, typeArgumentList,
                argumentList ? argumentList.argumentList : null, argumentList ? argumentList.closeParenSpan : null);
            this.setSpan(result, start, node);

            return result;
        }

        public visitSwitchStatement(node: SwitchStatementSyntax): SwitchStatement {
            var start = this.position;

            this.movePast(node.switchKeyword);
            this.movePast(node.openParenToken);
            var expression = node.expression.accept(this);
            this.movePast(node.closeParenToken);
            var closeParenPosition = this.position;
            this.movePast(node.openBraceToken);

            var array = new Array<any>(node.switchClauses.childCount());

            for (var i = 0, n = node.switchClauses.childCount(); i < n; i++) {
                var switchClause = node.switchClauses.childAt(i);
                var translated = switchClause.accept(this);

                array[i] = translated;
            }

            var span = new ASTSpan();
            span.minChar = start;
            span.limChar = closeParenPosition;

            this.movePast(node.closeBraceToken);

            var result = new SwitchStatement(expression, new ASTList(this.fileName, array), span);
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
            this.movePast(node.identifier);
            this.movePast(node.semicolonToken);
            var identifier = node.identifier ? node.identifier.valueText() : null;

            var result = new BreakStatement(identifier);
            this.setSpan(result, start, node);

            return result;
        }

        public visitContinueStatement(node: ContinueStatementSyntax): ContinueStatement {
            var start = this.position;

            this.movePast(node.continueKeyword);
            this.movePast(node.identifier);
            this.movePast(node.semicolonToken);

            var identifier = node.identifier ? node.identifier.valueText() : null;
            var result = new ContinueStatement(identifier);
            this.setSpan(result, start, node);

            return result;
        }

        public visitForStatement(node: ForStatementSyntax): ForStatement {
            var start = this.position;

            this.movePast(node.forKeyword);
            this.movePast(node.openParenToken);
            var init = node.variableDeclaration
                ? node.variableDeclaration.accept(this)
                : node.initializer
                ? node.initializer.accept(this)
                : null;
            this.movePast(node.firstSemicolonToken);
            var cond = node.condition ? node.condition.accept(this) : null;
            this.movePast(node.secondSemicolonToken);
            var incr = node.incrementor ? node.incrementor.accept(this) : null;
            this.movePast(node.closeParenToken);
            var body = node.statement.accept(this);

            var result = new ForStatement(init, cond, incr, body);
            this.setSpan(result, start, node);

            return result;
        }

        public visitForInStatement(node: ForInStatementSyntax): ForInStatement {
            var start = this.position;

            this.movePast(node.forKeyword);
            this.movePast(node.openParenToken);
            var init = node.variableDeclaration ? node.variableDeclaration.accept(this) : node.left.accept(this);
            if (node.variableDeclaration) {
                var variableDeclaration: VariableDeclaration = init;
                for (var i = 0, n = variableDeclaration.declarators.members.length; i < n; i++) {
                    var boundDecl = <VariableDeclarator>variableDeclaration.declarators.members[i];
                    boundDecl.setVarFlags(boundDecl.getVarFlags() | VariableFlags.ForInVariable);
                }
            }

            this.movePast(node.inKeyword);
            var expression = node.expression.accept(this);
            this.movePast(node.closeParenToken);
            var body = node.statement.accept(this);

            var result = new ForInStatement(init, expression, body);
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

            if (!node.openBraceToken.hasTrailingNewLine()) {
                var childCount = node.propertyAssignments.childCount();
                if (childCount === 0 ||
                    !node.propertyAssignments.childAt(childCount - 1).lastToken().hasTrailingNewLine()) {

                    result.setFlags(result.getFlags() | ASTFlags.SingleLine);
                }
            }

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

            if (expression.nodeType() === NodeType.FunctionDeclaration ||
                expression.nodeType() === NodeType.ArrowFunctionExpression ||
                expression.nodeType() === NodeType.FunctionExpression) {
                var funcDecl = <FunctionDeclaration>expression;
                    funcDecl.hint = propertyName.valueText();
            }

            return result;
        }

        public visitFunctionPropertyAssignment(node: FunctionPropertyAssignmentSyntax): FunctionPropertyAssignment {
            var start = this.position;

            var propertyName: Identifier = node.propertyName.accept(this);
            var typeParameters = node.callSignature.typeParameterList === null ? null : node.callSignature.typeParameterList.accept(this);
            var parameters = node.callSignature.parameterList.accept(this);
            var returnType = node.callSignature.typeAnnotation ? node.callSignature.typeAnnotation.accept(this) : null;
            var block = node.block.accept(this);

            var result = new FunctionPropertyAssignment(
                propertyName, typeParameters, parameters, returnType, block);

            this.setCommentsAndSpan(result, start, node);

            return result;
        }

        public visitFunctionExpression(node: FunctionExpressionSyntax): FunctionExpression {
            var start = this.position;

            this.movePast(node.functionKeyword);
            var name = node.identifier === null ? null : this.identifierFromToken(node.identifier, /*isOptional:*/ false);
            this.movePast(node.identifier);
            var typeParameters = node.callSignature.typeParameterList === null ? null : node.callSignature.typeParameterList.accept(this);
            var parameters = node.callSignature.parameterList.accept(this);
            var returnType = node.callSignature.typeAnnotation
                ? node.callSignature.typeAnnotation.accept(this)
                : null;

            var block = node.block ? node.block.accept(this) : null;

            var result = new FunctionExpression(name, typeParameters, parameters, returnType, block);
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

            var finallyBody: Block = null;
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
            var typeExpr = node.typeAnnotation ? node.typeAnnotation.accept(this) : null;
            this.movePast(node.closeParenToken);
            var block = node.block.accept(this);

            var varDecl = new VariableDeclarator(identifier, typeExpr, null);
            this.setSpanExplicit(varDecl, identifier.minChar, identifier.limChar);

            var result = new CatchClause(varDecl, block);
            this.setSpan(result, start, node);

            return result;
        }

        public visitFinallyClause(node: FinallyClauseSyntax): Block {
            this.movePast(node.finallyKeyword);
            return node.block.accept(this);
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
            var statement = node.statement.accept(this);
            var whileSpan = new ASTSpan();
            this.setTokenSpan(whileSpan, this.position, node.whileKeyword);

            this.movePast(node.whileKeyword);
            this.movePast(node.openParenToken);
            var condition = node.condition.accept(this);
            this.movePast(node.closeParenToken);
            this.movePast(node.semicolonToken);

            var result = new DoStatement(statement, condition, whileSpan);
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
                        applyDelta((<Block>cur).closeBraceSpan, delta);
                        break; 

                    case NodeType.ObjectCreationExpression:
                        applyDelta((<ObjectCreationExpression>cur).closeParenSpan, delta);
                        break;

                    case NodeType.InvocationExpression:
                        applyDelta((<InvocationExpression>cur).closeParenSpan, delta);
                        break;

                    case NodeType.ModuleDeclaration:
                        applyDelta((<ModuleDeclaration>cur).endingToken, delta);
                        break;

                    case NodeType.ClassDeclaration:
                        applyDelta((<ClassDeclaration>cur).endingToken, delta);
                        break;

                    case NodeType.DoStatement:
                        applyDelta((<DoStatement>cur).whileSpan, delta);
                        break;

                    case NodeType.SwitchStatement:
                        applyDelta((<SwitchStatement>cur).statement, delta);
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

        public visitSimpleArrowFunctionExpression(node: SimpleArrowFunctionExpressionSyntax): ArrowFunctionExpression {
            var result: ArrowFunctionExpression = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitSimpleArrowFunctionExpression(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitParenthesizedArrowFunctionExpression(node: ParenthesizedArrowFunctionExpressionSyntax): ArrowFunctionExpression {
            var result: ArrowFunctionExpression = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitParenthesizedArrowFunctionExpression(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitQualifiedName(node: QualifiedNameSyntax): TypeReference {
            var result: TypeReference = this.getAndMovePastAST(node);
            if (!result) {
                var result = super.visitQualifiedName(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitConstructorType(node: ConstructorTypeSyntax): TypeReference {
            var result: TypeReference = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitConstructorType(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitFunctionType(node: FunctionTypeSyntax): TypeReference {
            var result: TypeReference = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitFunctionType(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitObjectType(node: ObjectTypeSyntax): TypeReference {
            var start = this.position;
            var result: TypeReference = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitObjectType(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitArrayType(node: ArrayTypeSyntax): TypeReference {
            var result: TypeReference = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitArrayType(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitGenericType(node: GenericTypeSyntax): TypeReference {
            var result: TypeReference = this.getAndMovePastAST(node);
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

        public visitConstructSignature(node: ConstructSignatureSyntax): FunctionDeclaration {
            var result: FunctionDeclaration = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitConstructSignature(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitMethodSignature(node: MethodSignatureSyntax): FunctionDeclaration {
            var result: FunctionDeclaration = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitMethodSignature(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitIndexSignature(node: IndexSignatureSyntax): FunctionDeclaration {
            var result: FunctionDeclaration = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitIndexSignature(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitPropertySignature(node: PropertySignatureSyntax): VariableDeclarator {
            var result: VariableDeclarator = this.getAndMovePastAST(node);
            if (!result) {
                result = super.visitPropertySignature(node);
                this.setAST(node, result);
            }

            return result;
        }

        public visitCallSignature(node: CallSignatureSyntax): FunctionDeclaration {
            var result: FunctionDeclaration = this.getAndMovePastAST(node);
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