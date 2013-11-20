///<reference path='references.ts' />

module TypeScript {
    export class SyntaxTree {
        private _sourceUnit: SourceUnitSyntax;
        private _isDeclaration: boolean;
        private _parserDiagnostics: Diagnostic[];
        private _allDiagnostics: Diagnostic[] = null;
        private _fileName: string;
        private _lineMap: LineMap;
        private _parseOptions: ParseOptions;

        constructor(sourceUnit: SourceUnitSyntax,
                    isDeclaration: boolean,
                    diagnostics: Diagnostic[],
                    fileName: string,
                    lineMap: LineMap,
                    parseOtions: ParseOptions) {
            this._sourceUnit = sourceUnit;
            this._isDeclaration = isDeclaration;
            this._parserDiagnostics = diagnostics;
            this._fileName = fileName;
            this._lineMap = lineMap;
            this._parseOptions = parseOtions;
        }

        public toJSON(key: any): any {
            var result: any = {};

            result.isDeclaration = this._isDeclaration;
            result.languageVersion = LanguageVersion[this._parseOptions.languageVersion()];
            result.parseOptions = this._parseOptions;

            if (this.diagnostics().length > 0) {
                result.diagnostics = this.diagnostics();
            }

            result.sourceUnit = this._sourceUnit;
            result.lineMap = this._lineMap;

            return result;
        }

        public sourceUnit(): SourceUnitSyntax {
            return this._sourceUnit;
        }

        public isDeclaration(): boolean {
            return this._isDeclaration;
        }

        private computeDiagnostics(): Diagnostic[] {
            if (this._parserDiagnostics.length > 0) {
                return this._parserDiagnostics;
            }

            // No parser reported diagnostics.  Check for any additional grammar diagnostics.
            var diagnostics: Diagnostic[] = [];
            this.sourceUnit().accept(new GrammarCheckerWalker(this, diagnostics));

            return diagnostics;
        }

        public diagnostics(): Diagnostic[] {
            if (this._allDiagnostics === null) {
                this._allDiagnostics = this.computeDiagnostics();
            }

            return this._allDiagnostics;
        }

        public fileName(): string {
            return this._fileName;
        }

        public lineMap(): LineMap {
            return this._lineMap;
        }

        public parseOptions(): ParseOptions {
            return this._parseOptions;
        }

        public structuralEquals(tree: SyntaxTree): boolean {
            return ArrayUtilities.sequenceEquals(this.diagnostics(), tree.diagnostics(), Diagnostic.equals) &&
                this.sourceUnit().structuralEquals(tree.sourceUnit());
        }
    }

    class GrammarCheckerWalker extends SyntaxWalker {
        private inAmbientDeclaration: boolean = false;
        private inBlock: boolean = false;
        private inObjectLiteralExpression: boolean = false;
        private currentConstructor: ConstructorDeclarationSyntax = null;

        constructor(private syntaxTree: SyntaxTree,
                    private diagnostics: Diagnostic[]) {
            super();
        }

        private pushDiagnostic(element: ISyntaxElement, diagnosticKey: string, args: any[] = null): void {
            this.diagnostics.push(new Diagnostic(
                this.syntaxTree.fileName(), this.syntaxTree.lineMap(), element.start(), element.width(), diagnosticKey, args));
        }

        public visitCatchClause(node: CatchClauseSyntax): void {
            if (node.typeAnnotation) {
                this.pushDiagnostic(node.typeAnnotation,
                    DiagnosticCode.Catch_clause_parameter_cannot_have_a_type_annotation);
            }

            super.visitCatchClause(node);
        }

        private checkParameterListOrder(node: ParameterListSyntax): boolean {
            var seenOptionalParameter = false;
            var parameterCount = node.parameters.nonSeparatorCount();

            for (var i = 0; i < parameterCount; i++) {
                var parameter = node.parameters.nonSeparatorAt(i);

                if (parameter.dotDotDotToken) {
                    if (i !== (parameterCount - 1)) {
                        this.pushDiagnostic(
                            parameter,
                            DiagnosticCode.Rest_parameter_must_be_last_in_list);
                        return true;
                    }

                    if (parameter.questionToken) {
                        this.pushDiagnostic(
                            parameter,
                            DiagnosticCode.Rest_parameter_cannot_be_optional);
                        return true;
                    }

                    if (parameter.equalsValueClause) {
                        this.pushDiagnostic(
                            parameter,
                            DiagnosticCode.Rest_parameter_cannot_have_an_initializer);
                        return true;
                    }
                }
                else if (parameter.questionToken || parameter.equalsValueClause) {
                    seenOptionalParameter = true;

                    if (parameter.questionToken && parameter.equalsValueClause) {
                        this.pushDiagnostic(
                            parameter,
                            DiagnosticCode.Parameter_cannot_have_question_mark_and_initializer);
                        return true;
                    }
                }
                else {
                    if (seenOptionalParameter) {
                        this.pushDiagnostic(
                            parameter,
                            DiagnosticCode.Required_parameter_cannot_follow_optional_parameter);
                        return true;
                    }
                }
            }

            return false;
        }

        private checkParameterListAcessibilityModifiers(node: ParameterListSyntax): boolean {
            for (var i = 0, n = node.parameters.nonSeparatorCount(); i < n; i++) {
                var parameter = node.parameters.nonSeparatorAt(i);

                if (this.checkParameterAccessibilityModifiers(node, parameter)) {
                    return true;
                }
            }

            return false;
        }

        private checkParameterAccessibilityModifiers(parameterList: ParameterListSyntax, parameter: ParameterSyntax): boolean {
            if (parameter.modifiers.childCount() > 0) {
                var modifiers = parameter.modifiers;

                for (var i = 0, n = modifiers.childCount(); i < n; i++) {
                    var modifier = modifiers.childAt(i);

                    if (this.checkParameterAccessibilityModifier(parameterList, modifier, i)) {
                        return true;
                    }
                }
            }

            return false;
        }

        private checkParameterAccessibilityModifier(parameterList: ParameterListSyntax, modifier: ISyntaxToken, modifierIndex: number): boolean {
            if (modifier.tokenKind !== SyntaxKind.PublicKeyword && modifier.tokenKind !== SyntaxKind.PrivateKeyword) {
                this.pushDiagnostic(modifier,
                    DiagnosticCode._0_modifier_cannot_appear_on_a_parameter, [modifier.text()]);
                return true;
            }
            else {
                if (modifierIndex > 0) {
                    this.pushDiagnostic(modifier, DiagnosticCode.Accessibility_modifier_already_seen);
                    return true;
                }

                if (!this.inAmbientDeclaration && this.currentConstructor && !this.currentConstructor.block && this.currentConstructor.parameterList === parameterList) {
                    this.pushDiagnostic(modifier, DiagnosticCode.Parameter_property_declarations_cannot_be_used_in_a_constructor_overload);
                    return true;
                }
                else if (this.inAmbientDeclaration || this.currentConstructor === null || this.currentConstructor.parameterList !== parameterList) {
                    this.pushDiagnostic(modifier, DiagnosticCode.Parameter_property_declarations_can_only_be_used_in_a_non_ambient_constructor_declaration);
                    return true;
                }
            }

            return false;
        }

        private checkForTrailingSeparator(parent: ISyntaxElement, list: ISeparatedSyntaxList<ISyntaxNodeOrToken>): boolean {
            // If we have at least one child, and we have an even number of children, then that 
            // means we have an illegal trailing separator.
            if (list.childCount() === 0 || list.childCount() % 2 === 1) {
                return false;
            }

            for (var i = 0, n = list.childCount(); i < n; i++) {
                var child = list.childAt(i);
                if (i === n - 1) {
                    this.pushDiagnostic(child, DiagnosticCode.Trailing_separator_not_allowed);
                }
            }

            return true;
        }

        private checkForAtLeastOneElement(parent: ISyntaxElement, list: ISeparatedSyntaxList<ISyntaxNodeOrToken>, expected: string): boolean {
            if (list.childCount() > 0) {
                return false;
            }

            var listFullStart = parent.fullStart() + Syntax.childOffset(parent, list);
            var tokenAtStart = this.syntaxTree.sourceUnit().findToken(listFullStart);

            this.pushDiagnostic(tokenAtStart, DiagnosticCode.Unexpected_token_0_expected, [expected]);

            return true;
        }

        public visitParameterList(node: ParameterListSyntax): void {
            if (this.checkParameterListAcessibilityModifiers(node) ||
                this.checkParameterListOrder(node) ||
                this.checkForTrailingSeparator(node, node.parameters)) {

                return;
            }

            super.visitParameterList(node);
        }

        public visitHeritageClause(node: HeritageClauseSyntax): void {
            if (this.checkForTrailingSeparator(node, node.typeNames) ||
                this.checkForAtLeastOneElement(node, node.typeNames, getLocalizedText(DiagnosticCode.type_name, null))) {
                return;
            }

            super.visitHeritageClause(node);
        }

        public visitArgumentList(node: ArgumentListSyntax): void {
            if (this.checkForTrailingSeparator(node, node.arguments)) {
                return;
            }

            super.visitArgumentList(node);
        }

        public visitVariableDeclaration(node: VariableDeclarationSyntax): void {
            if (this.checkForTrailingSeparator(node, node.variableDeclarators) ||
                this.checkForAtLeastOneElement(node, node.variableDeclarators, getLocalizedText(DiagnosticCode.identifier, null))) {
                return;
            }

            super.visitVariableDeclaration(node);
        }

        public visitTypeArgumentList(node: TypeArgumentListSyntax): void {
            if (this.checkForTrailingSeparator(node, node.typeArguments) ||
                this.checkForAtLeastOneElement(node, node.typeArguments, getLocalizedText(DiagnosticCode.identifier, null))) {
                return;
            }

            super.visitTypeArgumentList(node);
        }

        public visitTypeParameterList(node: TypeParameterListSyntax): void {
            if (this.checkForTrailingSeparator(node, node.typeParameters) ||
                this.checkForAtLeastOneElement(node, node.typeParameters, getLocalizedText(DiagnosticCode.identifier, null))) {
                return;
            }

            super.visitTypeParameterList(node);
        }

        private checkIndexSignatureParameter(node: IndexSignatureSyntax): boolean {
            var parameter = node.parameter;

            if (parameter.dotDotDotToken) {
                this.pushDiagnostic(
                    parameter,
                    DiagnosticCode.Index_signatures_cannot_have_rest_parameters);
                return true;
            }
            else if (parameter.modifiers.childCount() > 0) {
                this.pushDiagnostic(
                    parameter,
                    DiagnosticCode.Index_signature_parameter_cannot_have_accessibility_modifiers);
                return true;
            }
            else if (parameter.questionToken) {
                this.pushDiagnostic(
                    parameter,
                    DiagnosticCode.Index_signature_parameter_cannot_have_a_question_mark);
                return true;
            }
            else if (parameter.equalsValueClause) {
                this.pushDiagnostic(
                    parameter,
                    DiagnosticCode.Index_signature_parameter_cannot_have_an_initializer);
                return true;
            }
            else if (!parameter.typeAnnotation) {
                this.pushDiagnostic(
                    parameter,
                    DiagnosticCode.Index_signature_parameter_must_have_a_type_annotation);
                return true;
            }
            else if (parameter.typeAnnotation.type.kind() !== SyntaxKind.StringKeyword &&
                     parameter.typeAnnotation.type.kind() !== SyntaxKind.NumberKeyword) {
                this.pushDiagnostic(
                    parameter,
                    DiagnosticCode.Index_signature_parameter_type_must_be_string_or_number);
                return true;
            }

            return false;
        }

        public visitIndexSignature(node: IndexSignatureSyntax): void {
            if (this.checkIndexSignatureParameter(node)) {
                return;
            }

            if (!node.typeAnnotation) {
                this.pushDiagnostic(node, DiagnosticCode.Index_signature_must_have_a_type_annotation);
                return;
            }

            super.visitIndexSignature(node);
        }

        private checkClassDeclarationHeritageClauses(node: ClassDeclarationSyntax): boolean {
            var seenExtendsClause = false;
            var seenImplementsClause = false;

            for (var i = 0, n = node.heritageClauses.childCount(); i < n; i++) {
                Debug.assert(i <= 2);
                var heritageClause = node.heritageClauses.childAt(i);

                if (heritageClause.extendsOrImplementsKeyword.tokenKind === SyntaxKind.ExtendsKeyword) {
                    if (seenExtendsClause) {
                        this.pushDiagnostic(heritageClause,
                            DiagnosticCode.extends_clause_already_seen);
                        return true;
                    }

                    if (seenImplementsClause) {
                        this.pushDiagnostic(heritageClause,
                            DiagnosticCode.extends_clause_must_precede_implements_clause);
                        return true;
                    }

                    if (heritageClause.typeNames.nonSeparatorCount() > 1) {
                        this.pushDiagnostic(heritageClause,
                            DiagnosticCode.Classes_can_only_extend_a_single_class);
                        return true;
                    }

                    seenExtendsClause = true;
                }
                else {
                    Debug.assert(heritageClause.extendsOrImplementsKeyword.tokenKind === SyntaxKind.ImplementsKeyword);
                    if (seenImplementsClause) {
                        this.pushDiagnostic(heritageClause,
                            DiagnosticCode.implements_clause_already_seen);
                        return true;
                    }

                    seenImplementsClause = true;
                }
            }

            return false;
        }

        private checkForDisallowedDeclareModifier(modifiers: ISyntaxList<ISyntaxToken>): boolean {
            if (this.inAmbientDeclaration) {
                // If we're already in an ambient declaration, then 'declare' is not allowed.
                var declareToken = SyntaxUtilities.getToken(modifiers, SyntaxKind.DeclareKeyword);

                if (declareToken) {
                    this.pushDiagnostic(declareToken,
                        DiagnosticCode.declare_modifier_not_allowed_for_code_already_in_an_ambient_context);
                    return true;
                }
            }

            return false;
        }

        private checkForRequiredDeclareModifier(moduleElement: IModuleElementSyntax,
                                                typeKeyword: ISyntaxElement,
                                                modifiers: ISyntaxList<ISyntaxToken>): boolean {
            if (!this.inAmbientDeclaration && this.syntaxTree.isDeclaration()) {
                // We're at the top level in a declaration file, a 'declare' modifiers is required
                // on most module elements.
                if (!SyntaxUtilities.containsToken(modifiers, SyntaxKind.DeclareKeyword)) {
                    this.pushDiagnostic(typeKeyword.firstToken(),
                        DiagnosticCode.declare_modifier_required_for_top_level_element);
                    return true;
                }
            }
        }

        private checkFunctionOverloads(node: ISyntaxElement, moduleElements: ISyntaxList<IModuleElementSyntax>): boolean {
            if (!this.inAmbientDeclaration && !this.syntaxTree.isDeclaration()) {
                var inFunctionOverloadChain = false;
                var functionOverloadChainName: string = null;

                for (var i = 0, n = moduleElements.childCount(); i < n; i++) {
                    var moduleElement = moduleElements.childAt(i);
                    var lastElement = i === (n - 1);

                    if (inFunctionOverloadChain) {
                        if (moduleElement.kind() !== SyntaxKind.FunctionDeclaration) {
                            this.pushDiagnostic(moduleElement.firstToken(),
                                DiagnosticCode.Function_implementation_expected);
                            return true;
                        }

                        var functionDeclaration = <FunctionDeclarationSyntax>moduleElement;
                        if (functionDeclaration.identifier.valueText() !== functionOverloadChainName) {
                            this.pushDiagnostic(functionDeclaration.identifier,
                                DiagnosticCode.Function_overload_name_must_be_0, [functionOverloadChainName]);
                            return true;
                        }
                    }

                    if (moduleElement.kind() === SyntaxKind.FunctionDeclaration) {
                        functionDeclaration = <FunctionDeclarationSyntax>moduleElement;
                        if (!SyntaxUtilities.containsToken(functionDeclaration.modifiers, SyntaxKind.DeclareKeyword)) {
                            inFunctionOverloadChain = functionDeclaration.block === null;
                            functionOverloadChainName = functionDeclaration.identifier.valueText();

                            if (lastElement && inFunctionOverloadChain) {
                                this.pushDiagnostic(moduleElement.firstToken(),
                                    DiagnosticCode.Function_implementation_expected);
                                return true;
                            }
                        }
                        else {
                            inFunctionOverloadChain = false;
                            functionOverloadChainName = "";
                        }
                    }
                }
            }

            return false;
        }

        private checkClassOverloads(node: ClassDeclarationSyntax): boolean {
            if (!this.inAmbientDeclaration && !SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.DeclareKeyword)) {
                var inFunctionOverloadChain = false;
                var inConstructorOverloadChain = false;

                var functionOverloadChainName: string = null;
                var isInStaticOverloadChain: boolean = null;
                var memberFunctionDeclaration: MemberFunctionDeclarationSyntax = null;

                for (var i = 0, n = node.classElements.childCount(); i < n; i++) {
                    var classElement = node.classElements.childAt(i);
                    var lastElement = i === (n - 1);
                    var isStaticOverload: boolean = null;

                    if (inFunctionOverloadChain) {
                        if (classElement.kind() !== SyntaxKind.MemberFunctionDeclaration) {
                            this.pushDiagnostic(classElement.firstToken(),
                                DiagnosticCode.Function_implementation_expected);
                            return true;
                        }

                        memberFunctionDeclaration = <MemberFunctionDeclarationSyntax>classElement;
                        if (memberFunctionDeclaration.propertyName.valueText() !== functionOverloadChainName) {
                            this.pushDiagnostic(memberFunctionDeclaration.propertyName,
                                DiagnosticCode.Function_overload_name_must_be_0, [functionOverloadChainName]);
                            return true;
                        }
                        isStaticOverload = SyntaxUtilities.containsToken(memberFunctionDeclaration.modifiers, SyntaxKind.StaticKeyword);
                        if (isStaticOverload !== isInStaticOverloadChain) {
                            var diagnostic = isInStaticOverloadChain ? DiagnosticCode.Function_overload_must_be_static : DiagnosticCode.Function_overload_must_not_be_static;
                            this.pushDiagnostic(memberFunctionDeclaration.propertyName,
                                diagnostic, null);
                            return true;
                        }
                    }
                    else if (inConstructorOverloadChain) {
                        if (classElement.kind() !== SyntaxKind.ConstructorDeclaration) {
                            this.pushDiagnostic(classElement.firstToken(),
                                DiagnosticCode.Constructor_implementation_expected);
                            return true;
                        }
                    }

                    if (classElement.kind() === SyntaxKind.MemberFunctionDeclaration) {
                        memberFunctionDeclaration = <MemberFunctionDeclarationSyntax>classElement;

                        inFunctionOverloadChain = memberFunctionDeclaration.block === null;
                        functionOverloadChainName = memberFunctionDeclaration.propertyName.valueText();
                        isInStaticOverloadChain = SyntaxUtilities.containsToken(memberFunctionDeclaration.modifiers, SyntaxKind.StaticKeyword);

                        if (lastElement && inFunctionOverloadChain) {
                            this.pushDiagnostic(classElement.firstToken(),
                                DiagnosticCode.Function_implementation_expected);
                            return true;
                        }
                    }
                    else if (classElement.kind() === SyntaxKind.ConstructorDeclaration) {
                        var constructorDeclaration = <ConstructorDeclarationSyntax>classElement;

                        inConstructorOverloadChain = constructorDeclaration.block === null;
                        if (lastElement && inConstructorOverloadChain) {
                            this.pushDiagnostic(classElement.firstToken(),
                                DiagnosticCode.Constructor_implementation_expected);
                            return true;
                        }
                    }
                }
            }

            return false;
        }

        private checkForReservedName(parent: ISyntaxElement, name: INameSyntax, diagnosticKey: string): boolean {
            var token: ISyntaxToken;

            var current = name;
            while (current !== null) {
                if (current.kind() === SyntaxKind.QualifiedName) {
                    var qualifiedName = <QualifiedNameSyntax>current;
                    token = qualifiedName.right;
                    current = qualifiedName.left;
                }
                else {
                    Debug.assert(current.kind() === SyntaxKind.IdentifierName);
                    token = <ISyntaxToken>current;
                    current = null;
                }

                switch (token.valueText()) {
                    case "any":
                    case "number":
                    case "boolean":
                    case "string":
                    case "void":
                        this.pushDiagnostic(token, diagnosticKey, [token.valueText()]);
                        return true;
                }
            }

            return false;
        }

        public visitClassDeclaration(node: ClassDeclarationSyntax): void {
            if (this.checkForReservedName(node, node.identifier, DiagnosticCode.Class_name_cannot_be_0) ||
                this.checkForDisallowedDeclareModifier(node.modifiers) ||
                this.checkForRequiredDeclareModifier(node, node.classKeyword, node.modifiers) ||
                this.checkModuleElementModifiers(node.modifiers) ||
                this.checkClassDeclarationHeritageClauses(node) ||
                this.checkClassOverloads(node)) {

                return;
            }

            var savedInAmbientDeclaration = this.inAmbientDeclaration;
            this.inAmbientDeclaration = this.inAmbientDeclaration || this.syntaxTree.isDeclaration() || SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.DeclareKeyword);
            super.visitClassDeclaration(node);
            this.inAmbientDeclaration = savedInAmbientDeclaration;
        }

        private checkInterfaceDeclarationHeritageClauses(node: InterfaceDeclarationSyntax): boolean {
            var seenExtendsClause = false;

            for (var i = 0, n = node.heritageClauses.childCount(); i < n; i++) {
                Debug.assert(i <= 1);
                var heritageClause = node.heritageClauses.childAt(i);

                if (heritageClause.extendsOrImplementsKeyword.tokenKind === SyntaxKind.ExtendsKeyword) {
                    if (seenExtendsClause) {
                        this.pushDiagnostic(heritageClause,
                            DiagnosticCode.extends_clause_already_seen);
                        return true;
                    }

                    seenExtendsClause = true;
                }
                else {
                    Debug.assert(heritageClause.extendsOrImplementsKeyword.tokenKind === SyntaxKind.ImplementsKeyword);
                    this.pushDiagnostic(heritageClause,
                        DiagnosticCode.Interface_declaration_cannot_have_implements_clause);
                    return true;
                }
            }

            return false;
        }

        private checkInterfaceModifiers(modifiers: ISyntaxList<ISyntaxToken>): boolean {
            for (var i = 0, n = modifiers.childCount(); i < n; i++) {
                var modifier = modifiers.childAt(i);
                if (modifier.tokenKind === SyntaxKind.DeclareKeyword) {
                    this.pushDiagnostic(modifier,
                        DiagnosticCode.declare_modifier_cannot_appear_on_an_interface_declaration);
                    return true;
                }
            }

            return false;
        }

        public visitInterfaceDeclaration(node: InterfaceDeclarationSyntax): void {
            if (this.checkForReservedName(node, node.identifier, DiagnosticCode.Interface_name_cannot_be_0) ||
                this.checkInterfaceModifiers(node.modifiers) ||
                this.checkModuleElementModifiers(node.modifiers) ||
                this.checkInterfaceDeclarationHeritageClauses(node)) {

                return;
            }

            super.visitInterfaceDeclaration(node);
        }

        private checkClassElementModifiers(list: ISyntaxList<ISyntaxToken>): boolean {
            var seenAccessibilityModifier = false;
            var seenStaticModifier = false;

            for (var i = 0, n = list.childCount(); i < n; i++) {
                var modifier = list.childAt(i);
                if (modifier.tokenKind === SyntaxKind.PublicKeyword ||
                    modifier.tokenKind === SyntaxKind.PrivateKeyword) {

                    if (seenAccessibilityModifier) {
                        this.pushDiagnostic(modifier,
                            DiagnosticCode.Accessibility_modifier_already_seen);
                        return true;
                    }

                    if (seenStaticModifier) {
                        var previousToken = list.childAt(i - 1);
                        this.pushDiagnostic(modifier,
                            DiagnosticCode._0_modifier_must_precede_1_modifier, [modifier.text(), previousToken.text()]);
                        return true;
                    }

                    seenAccessibilityModifier = true;
                }
                else if (modifier.tokenKind === SyntaxKind.StaticKeyword) {
                    if (seenStaticModifier) {
                        this.pushDiagnostic(modifier,
                            DiagnosticCode._0_modifier_already_seen, [modifier.text()]);
                        return true;
                    }

                    seenStaticModifier = true;
                }
                else {
                    this.pushDiagnostic(modifier,
                        DiagnosticCode._0_modifier_cannot_appear_on_a_class_element, [modifier.text()]);
                    return true;
                }
            }

            return false;
        }

        public visitMemberVariableDeclaration(node: MemberVariableDeclarationSyntax): void {
            if (this.checkClassElementModifiers(node.modifiers)) {
                return;
            }

            super.visitMemberVariableDeclaration(node);
        }

        public visitMemberFunctionDeclaration(node: MemberFunctionDeclarationSyntax): void {
            if (this.checkClassElementModifiers(node.modifiers)) {
                return;
            }

            super.visitMemberFunctionDeclaration(node);
        }

        private checkGetAccessorParameter(node: SyntaxNode, getKeyword: ISyntaxToken, parameterList: ParameterListSyntax): boolean {
            if (parameterList.parameters.childCount() !== 0) {
                this.pushDiagnostic(getKeyword,
                    DiagnosticCode.get_accessor_cannot_have_parameters);
                return true;
            }

            return false;
        }

        public visitIndexMemberDeclaration(node: IndexMemberDeclarationSyntax): void {
            if (this.checkIndexMemberModifiers(node)) {
                return;
            }

            super.visitIndexMemberDeclaration(node);
        }

        private checkIndexMemberModifiers(node: IndexMemberDeclarationSyntax): boolean {
            if (node.modifiers.childCount() > 0) {
                this.pushDiagnostic(node.modifiers.childAt(0), DiagnosticCode.Modifiers_cannot_appear_here);
                return true;
            }

            return false;
        }

        private checkEcmaScriptVersionIsAtLeast(parent: ISyntaxElement, node: ISyntaxElement, languageVersion: LanguageVersion, diagnosticKey: string): boolean {
            if (this.syntaxTree.parseOptions().languageVersion() < languageVersion) {
                this.pushDiagnostic(node, diagnosticKey);
                return true;
            }

            return false;
        }

        public visitObjectLiteralExpression(node: ObjectLiteralExpressionSyntax): void {
            var savedInObjectLiteralExpression = this.inObjectLiteralExpression;
            this.inObjectLiteralExpression = true;
            super.visitObjectLiteralExpression(node);
            this.inObjectLiteralExpression = savedInObjectLiteralExpression;
        }

        public visitGetAccessor(node: GetAccessorSyntax): void {
            if (this.checkForAccessorDeclarationInAmbientContext(node) ||
                this.checkEcmaScriptVersionIsAtLeast(node, node.getKeyword, LanguageVersion.EcmaScript5, DiagnosticCode.Accessors_are_only_available_when_targeting_ECMAScript_5_and_higher) ||
                this.checkForDisallowedModifiers(node, node.modifiers) ||
                this.checkClassElementModifiers(node.modifiers) ||
                this.checkGetAccessorParameter(node, node.getKeyword, node.parameterList)) {
                return;
            }

            super.visitGetAccessor(node);
        }

        private checkForAccessorDeclarationInAmbientContext(accessor: SyntaxNode): boolean {
            if (this.inAmbientDeclaration) {
                this.pushDiagnostic(accessor, DiagnosticCode.Accessors_are_not_allowed_in_ambient_contexts, null);
                return true;
            }

            return false;
        }

        private checkSetAccessorParameter(node: SyntaxNode, setKeyword: ISyntaxToken, parameterList: ParameterListSyntax): boolean {
            if (parameterList.parameters.childCount() !== 1) {
                this.pushDiagnostic(setKeyword,
                    DiagnosticCode.set_accessor_must_have_one_and_only_one_parameter);
                return true;
            }

            var parameter = <ParameterSyntax>parameterList.parameters.childAt(0);

            if (parameter.questionToken) {
                this.pushDiagnostic(parameter,
                    DiagnosticCode.set_accessor_parameter_cannot_be_optional);
                return true;
            }

            if (parameter.equalsValueClause) {
                this.pushDiagnostic(parameter,
                    DiagnosticCode.set_accessor_parameter_cannot_have_an_initializer);
                return true;
            }

            if (parameter.dotDotDotToken) {
                this.pushDiagnostic(parameter,
                    DiagnosticCode.set_accessor_cannot_have_rest_parameter);
                return true;
            }

            return false;
        }

        public visitSetAccessor(node: SetAccessorSyntax): void {
            if (this.checkForAccessorDeclarationInAmbientContext(node) ||
                this.checkEcmaScriptVersionIsAtLeast(node, node.setKeyword, LanguageVersion.EcmaScript5, DiagnosticCode.Accessors_are_only_available_when_targeting_ECMAScript_5_and_higher) ||
                this.checkForDisallowedModifiers(node, node.modifiers) ||
                this.checkClassElementModifiers(node.modifiers) ||
                this.checkSetAccessorParameter(node, node.setKeyword, node.parameterList)) {
                return;
            }

            super.visitSetAccessor(node);
        }

        public visitEnumDeclaration(node: EnumDeclarationSyntax): void {
            if (this.checkForReservedName(node, node.identifier, DiagnosticCode.Enum_name_cannot_be_0) ||
                this.checkForDisallowedDeclareModifier(node.modifiers) ||
                this.checkForRequiredDeclareModifier(node, node.enumKeyword, node.modifiers) ||
                this.checkModuleElementModifiers(node.modifiers),
                this.checkEnumElements(node)) {

                return;
            }

            var savedInAmbientDeclaration = this.inAmbientDeclaration;
            this.inAmbientDeclaration = this.inAmbientDeclaration || this.syntaxTree.isDeclaration() || SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.DeclareKeyword);
            super.visitEnumDeclaration(node);
            this.inAmbientDeclaration = savedInAmbientDeclaration;
        }

        private checkEnumElements(node: EnumDeclarationSyntax): boolean {
            var seenComputedValue = false;
            for (var i = 0, n = node.enumElements.childCount(); i < n; i++) {
                var child = node.enumElements.childAt(i);

                if (i % 2 === 0) {
                    var enumElement = <EnumElementSyntax>child;

                    if (!enumElement.equalsValueClause && seenComputedValue) {
                        this.pushDiagnostic(enumElement, DiagnosticCode.Enum_member_must_have_initializer, null);
                        return true;
                    }

                    if (enumElement.equalsValueClause) {
                        var value = enumElement.equalsValueClause.value;
                        if (!Syntax.isIntegerLiteral(value)) {
                            seenComputedValue = true;
                        }
                    }
                }
            }

            return false;
        }

        public visitEnumElement(node: EnumElementSyntax): void {
            if (this.inAmbientDeclaration && node.equalsValueClause) {
                var expression = node.equalsValueClause.value;
                if (!Syntax.isIntegerLiteral(expression)) {
                    this.pushDiagnostic(node.equalsValueClause.equalsToken,
                        DiagnosticCode.Ambient_enum_elements_can_only_have_integer_literal_initializers);
                    return;
                }
            }

            super.visitEnumElement(node);
        }

        public visitInvocationExpression(node: InvocationExpressionSyntax): void {
            if (node.expression.kind() === SyntaxKind.SuperKeyword &&
                node.argumentList.typeArgumentList !== null) {
                this.pushDiagnostic(node,
                    DiagnosticCode.super_invocation_cannot_have_type_arguments);
            }

            super.visitInvocationExpression(node);
        }

        private checkModuleElementModifiers(modifiers: ISyntaxList<ISyntaxToken>): boolean {
            var seenExportModifier = false;
            var seenDeclareModifier = false;

            for (var i = 0, n = modifiers.childCount(); i < n; i++) {
                var modifier = modifiers.childAt(i);
                if (modifier.tokenKind === SyntaxKind.PublicKeyword ||
                    modifier.tokenKind === SyntaxKind.PrivateKeyword ||
                    modifier.tokenKind === SyntaxKind.StaticKeyword) {
                    this.pushDiagnostic(modifier,
                        DiagnosticCode._0_modifier_cannot_appear_on_a_module_element, [modifier.text()]);
                    return true;
                }

                if (modifier.tokenKind === SyntaxKind.DeclareKeyword) {
                    if (seenDeclareModifier) {
                        this.pushDiagnostic(modifier,
                            DiagnosticCode.Accessibility_modifier_already_seen);
                        return;
                    }

                    seenDeclareModifier = true;
                }
                else if (modifier.tokenKind === SyntaxKind.ExportKeyword) {
                    if (seenExportModifier) {
                        this.pushDiagnostic(modifier,
                            DiagnosticCode._0_modifier_already_seen, [modifier.text()]);
                        return;
                    }

                    if (seenDeclareModifier) {
                        this.pushDiagnostic(modifier,
                            DiagnosticCode._0_modifier_must_precede_1_modifier,
                            [SyntaxFacts.getText(SyntaxKind.ExportKeyword), SyntaxFacts.getText(SyntaxKind.DeclareKeyword)]);
                        return;
                    }

                    seenExportModifier = true;
                }
            }

            return false;
        }

        private checkForDisallowedImportDeclaration(node: ModuleDeclarationSyntax): boolean {
            for (var i = 0, n = node.moduleElements.childCount(); i < n; i++) {
                var child = node.moduleElements.childAt(i);
                if (child.kind() === SyntaxKind.ImportDeclaration) {
                    var importDeclaration = <ImportDeclarationSyntax>child;
                    if (importDeclaration.moduleReference.kind() === SyntaxKind.ExternalModuleReference) {
                        if (node.stringLiteral === null) {
                            this.pushDiagnostic(importDeclaration,
                                DiagnosticCode.Import_declarations_in_an_internal_module_cannot_reference_an_external_module, null);
                        }
                    }
                }
            }

            return false;
        }

        private checkForDisallowedDeclareModifierOnImportDeclaration(modifiers: ISyntaxList<ISyntaxToken>): boolean {
            var declareToken = SyntaxUtilities.getToken(modifiers, SyntaxKind.DeclareKeyword);

            if (declareToken) {
                this.pushDiagnostic(declareToken,
                    DiagnosticCode.declare_modifier_not_allowed_on_import_declaration);
                return true;
            }
        }

        public visitImportDeclaration(node: ImportDeclarationSyntax): any {
            if (this.checkForDisallowedDeclareModifierOnImportDeclaration(node.modifiers) ||
                this.checkModuleElementModifiers(node.modifiers)) {
                return;
            }

            super.visitImportDeclaration(node);
        }

        public visitModuleDeclaration(node: ModuleDeclarationSyntax): void {
            if (this.checkForReservedName(node, node.name, DiagnosticCode.Module_name_cannot_be_0) ||
                this.checkForDisallowedDeclareModifier(node.modifiers) ||
                this.checkForRequiredDeclareModifier(node, node.moduleKeyword, node.modifiers) ||
                this.checkModuleElementModifiers(node.modifiers) ||
                this.checkForDisallowedImportDeclaration(node) ||
                this.checkForDisallowedExports(node, node.moduleElements) ||
                this.checkForMultipleExportAssignments(node, node.moduleElements)) {

                return;
            }

            if (!SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.DeclareKeyword) && this.checkFunctionOverloads(node, node.moduleElements)) {
                return;
            }

            if (node.stringLiteral) {
                if (!this.inAmbientDeclaration && !SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.DeclareKeyword)) {
                    this.pushDiagnostic(node.stringLiteral,
                        DiagnosticCode.Only_ambient_modules_can_use_quoted_names);
                    return;
                }
            }

            if (!node.stringLiteral &&
                this.checkForDisallowedExportAssignment(node)) {

                return;
            }

            var savedInAmbientDeclaration = this.inAmbientDeclaration;
            this.inAmbientDeclaration = this.inAmbientDeclaration || this.syntaxTree.isDeclaration() || SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.DeclareKeyword);
            super.visitModuleDeclaration(node);
            this.inAmbientDeclaration = savedInAmbientDeclaration;
        }

        private checkForDisallowedExports(node: ISyntaxElement, moduleElements: ISyntaxList<IModuleElementSyntax>): boolean {
            var seenExportedElement = false;
            for (var i = 0, n = moduleElements.childCount(); i < n; i++) {
                var child = moduleElements.childAt(i);

                if (SyntaxUtilities.hasExportKeyword(child)) {
                    seenExportedElement = true;
                    break;
                }
            }

            if (seenExportedElement) {
                for (var i = 0, n = moduleElements.childCount(); i < n; i++) {
                    var child = moduleElements.childAt(i);

                    if (child.kind() === SyntaxKind.ExportAssignment) {
                        this.pushDiagnostic(child, DiagnosticCode.Export_assignment_not_allowed_in_module_with_exported_element);
                        return true;
                    }
                }
            }

            return false;
        }

        private checkForMultipleExportAssignments(node: ISyntaxElement, moduleElements: ISyntaxList<IModuleElementSyntax>): boolean {
            var seenExportAssignment = false;
            var errorFound = false;
            for (var i = 0, n = moduleElements.childCount(); i < n; i++) {
                var child = moduleElements.childAt(i);
                if (child.kind() === SyntaxKind.ExportAssignment) {
                    if (seenExportAssignment) {
                        this.pushDiagnostic(child, DiagnosticCode.Module_cannot_have_multiple_export_assignments);
                        errorFound = true;
                    }
                    seenExportAssignment = true;
                }
            }

            return errorFound;
        }

        private checkForDisallowedExportAssignment(node: ModuleDeclarationSyntax): boolean {
            for (var i = 0, n = node.moduleElements.childCount(); i < n; i++) {
                var child = node.moduleElements.childAt(i);

                if (child.kind() === SyntaxKind.ExportAssignment) {
                    this.pushDiagnostic(child, DiagnosticCode.Export_assignment_cannot_be_used_in_internal_modules);

                    return true;
                }
            }

            return false;
        }

        public visitBlock(node: BlockSyntax): void {
            if (this.inAmbientDeclaration || this.syntaxTree.isDeclaration()) {
                this.pushDiagnostic(node.firstToken(), DiagnosticCode.Implementations_are_not_allowed_in_ambient_contexts);
                return;
            }

            if (this.checkFunctionOverloads(node, node.statements)) {
                return;
            }

            var savedInBlock = this.inBlock;
            this.inBlock = true;
            super.visitBlock(node);
            this.inBlock = savedInBlock;
        }

        private checkForStatementInAmbientContxt(node: IStatementSyntax): boolean {
            if (this.inAmbientDeclaration || this.syntaxTree.isDeclaration()) {
                this.pushDiagnostic(node.firstToken(),
                    DiagnosticCode.Statements_are_not_allowed_in_ambient_contexts);
                return true;
            }

            return false;
        }

        public visitBreakStatement(node: BreakStatementSyntax): void {
            if (this.checkForStatementInAmbientContxt(node)) {
                return;
            }

            super.visitBreakStatement(node);
        }

        public visitContinueStatement(node: ContinueStatementSyntax): void {
            if (this.checkForStatementInAmbientContxt(node)) {
                return;
            }

            super.visitContinueStatement(node);
        }

        public visitDebuggerStatement(node: DebuggerStatementSyntax): void {
            if (this.checkForStatementInAmbientContxt(node)) {
                return;
            }

            super.visitDebuggerStatement(node);
        }

        public visitDoStatement(node: DoStatementSyntax): void {
            if (this.checkForStatementInAmbientContxt(node)) {
                return;
            }

            super.visitDoStatement(node);
        }

        public visitEmptyStatement(node: EmptyStatementSyntax): void {
            if (this.checkForStatementInAmbientContxt(node)) {
                return;
            }

            super.visitEmptyStatement(node);
        }

        public visitExpressionStatement(node: ExpressionStatementSyntax): void {
            if (this.checkForStatementInAmbientContxt(node)) {
                return;
            }

            super.visitExpressionStatement(node);
        }

        public visitForInStatement(node: ForInStatementSyntax): void {
            if (this.checkForStatementInAmbientContxt(node)) {
                return;
            }

            super.visitForInStatement(node);
        }

        public visitForStatement(node: ForStatementSyntax): void {
            if (this.checkForStatementInAmbientContxt(node)) {
                return;
            }

            super.visitForStatement(node);
        }

        public visitIfStatement(node: IfStatementSyntax): void {
            if (this.checkForStatementInAmbientContxt(node)) {
                return;
            }

            super.visitIfStatement(node);
        }

        public visitLabeledStatement(node: LabeledStatementSyntax): void {
            if (this.checkForStatementInAmbientContxt(node)) {
                return;
            }

            super.visitLabeledStatement(node);
        }

        public visitReturnStatement(node: ReturnStatementSyntax): void {
            if (this.checkForStatementInAmbientContxt(node)) {
                return;
            }

            super.visitReturnStatement(node);
        }

        public visitSwitchStatement(node: SwitchStatementSyntax): void {
            if (this.checkForStatementInAmbientContxt(node)) {
                return;
            }

            super.visitSwitchStatement(node);
        }

        public visitThrowStatement(node: ThrowStatementSyntax): void {
            if (this.checkForStatementInAmbientContxt(node)) {
                return;
            }

            super.visitThrowStatement(node);
        }

        public visitTryStatement(node: TryStatementSyntax): void {
            if (this.checkForStatementInAmbientContxt(node)) {
                return;
            }

            super.visitTryStatement(node);
        }

        public visitWhileStatement(node: WhileStatementSyntax): void {
            if (this.checkForStatementInAmbientContxt(node)) {
                return;
            }

            super.visitWhileStatement(node);
        }

        public visitWithStatement(node: WithStatementSyntax): void {
            if (this.checkForStatementInAmbientContxt(node)) {
                return;
            }

            super.visitWithStatement(node);
        }

        private checkForDisallowedModifiers(parent: ISyntaxElement, modifiers: ISyntaxList<ISyntaxToken>): boolean {
            if (this.inBlock || this.inObjectLiteralExpression) {
                if (modifiers.childCount() > 0) {
                    this.pushDiagnostic(modifiers.childAt(0), DiagnosticCode.Modifiers_cannot_appear_here);
                    return true;
                }
            }

            return false;
        }

        public visitFunctionDeclaration(node: FunctionDeclarationSyntax): void {
            if (this.checkForDisallowedDeclareModifier(node.modifiers) ||
                this.checkForDisallowedModifiers(node, node.modifiers) ||
                this.checkForRequiredDeclareModifier(node, node.functionKeyword, node.modifiers) ||
                this.checkModuleElementModifiers(node.modifiers)) {

                return;
            }

            var savedInAmbientDeclaration = this.inAmbientDeclaration;
            this.inAmbientDeclaration = this.inAmbientDeclaration || this.syntaxTree.isDeclaration() || SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.DeclareKeyword);
            super.visitFunctionDeclaration(node);
            this.inAmbientDeclaration = savedInAmbientDeclaration;
        }

        public visitVariableStatement(node: VariableStatementSyntax): void {
            if (this.checkForDisallowedDeclareModifier(node.modifiers) ||
                this.checkForDisallowedModifiers(node, node.modifiers) ||
                this.checkForRequiredDeclareModifier(node, node.variableDeclaration, node.modifiers) ||
                this.checkModuleElementModifiers(node.modifiers)) {

                return;
            }

            var savedInAmbientDeclaration = this.inAmbientDeclaration;
            this.inAmbientDeclaration = this.inAmbientDeclaration || this.syntaxTree.isDeclaration() || SyntaxUtilities.containsToken(node.modifiers, SyntaxKind.DeclareKeyword);
            super.visitVariableStatement(node);
            this.inAmbientDeclaration = savedInAmbientDeclaration;
        }

        private checkListSeparators<T extends ISyntaxNodeOrToken>(parent: ISyntaxElement, list: ISeparatedSyntaxList<T>, kind: SyntaxKind): boolean {
            for (var i = 0, n = list.childCount(); i < n; i++) {
                var child = list.childAt(i);
                if (i % 2 === 1 && child.kind() !== kind) {
                    this.pushDiagnostic(child, DiagnosticCode._0_expected, [SyntaxFacts.getText(kind)]);
                }
            }

            return false;
        }

        public visitObjectType(node: ObjectTypeSyntax): void {
            if (this.checkListSeparators(node, node.typeMembers, SyntaxKind.SemicolonToken)) {
                return;
            }

            // All code in an object type is implicitly ambient. (i.e. parameters can't have initializer, etc.)
            var savedInAmbientDeclaration = this.inAmbientDeclaration;
            this.inAmbientDeclaration = true;
            super.visitObjectType(node);
            this.inAmbientDeclaration = savedInAmbientDeclaration;
        }

        public visitArrayType(node: ArrayTypeSyntax): void {
            // All code in an object type is implicitly ambient. (i.e. parameters can't have initializer, etc.)
            var savedInAmbientDeclaration = this.inAmbientDeclaration;
            this.inAmbientDeclaration = true;
            super.visitArrayType(node);
            this.inAmbientDeclaration = savedInAmbientDeclaration;
        }

        public visitFunctionType(node: FunctionTypeSyntax): void {
            // All code in an object type is implicitly ambient. (i.e. parameters can't have initializer, etc.)
            var savedInAmbientDeclaration = this.inAmbientDeclaration;
            this.inAmbientDeclaration = true;
            super.visitFunctionType(node);
            this.inAmbientDeclaration = savedInAmbientDeclaration;
        }

        public visitConstructorType(node: ConstructorTypeSyntax): void {
            // All code in an object type is implicitly ambient. (i.e. parameters can't have initializer, etc.)
            var savedInAmbientDeclaration = this.inAmbientDeclaration;
            this.inAmbientDeclaration = true;
            super.visitConstructorType(node);
            this.inAmbientDeclaration = savedInAmbientDeclaration;
        }

        public visitVariableDeclarator(node: VariableDeclaratorSyntax): void {
            if (this.inAmbientDeclaration && node.equalsValueClause) {
                this.pushDiagnostic(node.equalsValueClause.equalsToken,
                    DiagnosticCode.Initializers_are_not_allowed_in_ambient_contexts);
                return;
            }

            super.visitVariableDeclarator(node);
        }

        public visitConstructorDeclaration(node: ConstructorDeclarationSyntax): void {
            if (this.checkClassElementModifiers(node.modifiers) ||
                this.checkConstructorModifiers(node.modifiers)) {

                return;
            }

            var savedCurrentConstructor = this.currentConstructor;
            this.currentConstructor = node;
            super.visitConstructorDeclaration(node);
            this.currentConstructor = savedCurrentConstructor;
        }

        private checkConstructorModifiers(modifiers: ISyntaxList<ISyntaxToken>): boolean {
            for (var i = 0, n = modifiers.childCount(); i < n; i++) {
                var child = modifiers.childAt(i);
                if (child.kind() !== SyntaxKind.PublicKeyword) {
                    this.pushDiagnostic(child, DiagnosticCode._0_modifier_cannot_appear_on_a_constructor_declaration, [SyntaxFacts.getText(child.kind())]);
                    return true;
                }
            }

            return false;
        }

        public visitSourceUnit(node: SourceUnitSyntax): void {
            if (this.checkFunctionOverloads(node, node.moduleElements) ||
                this.checkForDisallowedExports(node, node.moduleElements) ||
                this.checkForMultipleExportAssignments(node, node.moduleElements)) {
                
                return;
            }

            super.visitSourceUnit(node);
        }
    }
}