///<reference path='references.ts' />

module TypeScript {
    export class SourceUnitSyntax extends SyntaxNode {
        public _syntaxTree: SyntaxTree = null;
        constructor(public moduleElements: ISyntaxList<IModuleElementSyntax>,
                    public endOfFileToken: ISyntaxToken,
                    data: number) {
            super(data); 

            !moduleElements.isShared() && (moduleElements.parent = this);
            endOfFileToken.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.SourceUnit;
        }

        public childCount(): number {
            return 2;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.moduleElements;
                case 1: return this.endOfFileToken;
                default: throw Errors.invalidOperation();
            }
        }

        public syntaxTree(): SyntaxTree {
            return this._syntaxTree;
        }

        public update(moduleElements: ISyntaxList<IModuleElementSyntax>,
                      endOfFileToken: ISyntaxToken): SourceUnitSyntax {
            if (this.moduleElements === moduleElements && this.endOfFileToken === endOfFileToken) {
                return this;
            }

            return new SourceUnitSyntax(moduleElements, endOfFileToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ExternalModuleReferenceSyntax extends SyntaxNode implements IModuleReferenceSyntax {
        constructor(public requireKeyword: ISyntaxToken,
                    public openParenToken: ISyntaxToken,
                    public stringLiteral: ISyntaxToken,
                    public closeParenToken: ISyntaxToken,
                    data: number) {
            super(data); 

            requireKeyword.parent = this;
            openParenToken.parent = this;
            stringLiteral.parent = this;
            closeParenToken.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ExternalModuleReference;
        }

        public childCount(): number {
            return 4;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.requireKeyword;
                case 1: return this.openParenToken;
                case 2: return this.stringLiteral;
                case 3: return this.closeParenToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isModuleReference(): boolean {
            return true;
        }

        public update(requireKeyword: ISyntaxToken,
                      openParenToken: ISyntaxToken,
                      stringLiteral: ISyntaxToken,
                      closeParenToken: ISyntaxToken): ExternalModuleReferenceSyntax {
            if (this.requireKeyword === requireKeyword && this.openParenToken === openParenToken && this.stringLiteral === stringLiteral && this.closeParenToken === closeParenToken) {
                return this;
            }

            return new ExternalModuleReferenceSyntax(requireKeyword, openParenToken, stringLiteral, closeParenToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ModuleNameModuleReferenceSyntax extends SyntaxNode implements IModuleReferenceSyntax {
        constructor(public moduleName: INameSyntax,
                    data: number) {
            super(data); 

            moduleName.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ModuleNameModuleReference;
        }

        public childCount(): number {
            return 1;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.moduleName;
                default: throw Errors.invalidOperation();
            }
        }

        public isModuleReference(): boolean {
            return true;
        }

        public update(moduleName: INameSyntax): ModuleNameModuleReferenceSyntax {
            if (this.moduleName === moduleName) {
                return this;
            }

            return new ModuleNameModuleReferenceSyntax(moduleName, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ImportDeclarationSyntax extends SyntaxNode implements IModuleElementSyntax {
        constructor(public modifiers: ISyntaxList<ISyntaxToken>,
                    public importKeyword: ISyntaxToken,
                    public identifier: ISyntaxToken,
                    public equalsToken: ISyntaxToken,
                    public moduleReference: IModuleReferenceSyntax,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(data); 

            !modifiers.isShared() && (modifiers.parent = this);
            importKeyword.parent = this;
            identifier.parent = this;
            equalsToken.parent = this;
            moduleReference.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ImportDeclaration;
        }

        public childCount(): number {
            return 6;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.modifiers;
                case 1: return this.importKeyword;
                case 2: return this.identifier;
                case 3: return this.equalsToken;
                case 4: return this.moduleReference;
                case 5: return this.semicolonToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(modifiers: ISyntaxList<ISyntaxToken>,
                      importKeyword: ISyntaxToken,
                      identifier: ISyntaxToken,
                      equalsToken: ISyntaxToken,
                      moduleReference: IModuleReferenceSyntax,
                      semicolonToken: ISyntaxToken): ImportDeclarationSyntax {
            if (this.modifiers === modifiers && this.importKeyword === importKeyword && this.identifier === identifier && this.equalsToken === equalsToken && this.moduleReference === moduleReference && this.semicolonToken === semicolonToken) {
                return this;
            }

            return new ImportDeclarationSyntax(modifiers, importKeyword, identifier, equalsToken, moduleReference, semicolonToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ExportAssignmentSyntax extends SyntaxNode implements IModuleElementSyntax {
        constructor(public exportKeyword: ISyntaxToken,
                    public equalsToken: ISyntaxToken,
                    public identifier: ISyntaxToken,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(data); 

            exportKeyword.parent = this;
            equalsToken.parent = this;
            identifier.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ExportAssignment;
        }

        public childCount(): number {
            return 4;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.exportKeyword;
                case 1: return this.equalsToken;
                case 2: return this.identifier;
                case 3: return this.semicolonToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(exportKeyword: ISyntaxToken,
                      equalsToken: ISyntaxToken,
                      identifier: ISyntaxToken,
                      semicolonToken: ISyntaxToken): ExportAssignmentSyntax {
            if (this.exportKeyword === exportKeyword && this.equalsToken === equalsToken && this.identifier === identifier && this.semicolonToken === semicolonToken) {
                return this;
            }

            return new ExportAssignmentSyntax(exportKeyword, equalsToken, identifier, semicolonToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ClassDeclarationSyntax extends SyntaxNode implements IModuleElementSyntax {
        constructor(public modifiers: ISyntaxList<ISyntaxToken>,
                    public classKeyword: ISyntaxToken,
                    public identifier: ISyntaxToken,
                    public typeParameterList: TypeParameterListSyntax,
                    public heritageClauses: ISyntaxList<HeritageClauseSyntax>,
                    public openBraceToken: ISyntaxToken,
                    public classElements: ISyntaxList<IClassElementSyntax>,
                    public closeBraceToken: ISyntaxToken,
                    data: number) {
            super(data); 

            !modifiers.isShared() && (modifiers.parent = this);
            classKeyword.parent = this;
            identifier.parent = this;
            typeParameterList && (typeParameterList.parent = this);
            !heritageClauses.isShared() && (heritageClauses.parent = this);
            openBraceToken.parent = this;
            !classElements.isShared() && (classElements.parent = this);
            closeBraceToken.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ClassDeclaration;
        }

        public childCount(): number {
            return 8;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.modifiers;
                case 1: return this.classKeyword;
                case 2: return this.identifier;
                case 3: return this.typeParameterList;
                case 4: return this.heritageClauses;
                case 5: return this.openBraceToken;
                case 6: return this.classElements;
                case 7: return this.closeBraceToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(modifiers: ISyntaxList<ISyntaxToken>,
                      classKeyword: ISyntaxToken,
                      identifier: ISyntaxToken,
                      typeParameterList: TypeParameterListSyntax,
                      heritageClauses: ISyntaxList<HeritageClauseSyntax>,
                      openBraceToken: ISyntaxToken,
                      classElements: ISyntaxList<IClassElementSyntax>,
                      closeBraceToken: ISyntaxToken): ClassDeclarationSyntax {
            if (this.modifiers === modifiers && this.classKeyword === classKeyword && this.identifier === identifier && this.typeParameterList === typeParameterList && this.heritageClauses === heritageClauses && this.openBraceToken === openBraceToken && this.classElements === classElements && this.closeBraceToken === closeBraceToken) {
                return this;
            }

            return new ClassDeclarationSyntax(modifiers, classKeyword, identifier, typeParameterList, heritageClauses, openBraceToken, classElements, closeBraceToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class InterfaceDeclarationSyntax extends SyntaxNode implements IModuleElementSyntax {
        constructor(public modifiers: ISyntaxList<ISyntaxToken>,
                    public interfaceKeyword: ISyntaxToken,
                    public identifier: ISyntaxToken,
                    public typeParameterList: TypeParameterListSyntax,
                    public heritageClauses: ISyntaxList<HeritageClauseSyntax>,
                    public body: ObjectTypeSyntax,
                    data: number) {
            super(data); 

            !modifiers.isShared() && (modifiers.parent = this);
            interfaceKeyword.parent = this;
            identifier.parent = this;
            typeParameterList && (typeParameterList.parent = this);
            !heritageClauses.isShared() && (heritageClauses.parent = this);
            body.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.InterfaceDeclaration;
        }

        public childCount(): number {
            return 6;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.modifiers;
                case 1: return this.interfaceKeyword;
                case 2: return this.identifier;
                case 3: return this.typeParameterList;
                case 4: return this.heritageClauses;
                case 5: return this.body;
                default: throw Errors.invalidOperation();
            }
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(modifiers: ISyntaxList<ISyntaxToken>,
                      interfaceKeyword: ISyntaxToken,
                      identifier: ISyntaxToken,
                      typeParameterList: TypeParameterListSyntax,
                      heritageClauses: ISyntaxList<HeritageClauseSyntax>,
                      body: ObjectTypeSyntax): InterfaceDeclarationSyntax {
            if (this.modifiers === modifiers && this.interfaceKeyword === interfaceKeyword && this.identifier === identifier && this.typeParameterList === typeParameterList && this.heritageClauses === heritageClauses && this.body === body) {
                return this;
            }

            return new InterfaceDeclarationSyntax(modifiers, interfaceKeyword, identifier, typeParameterList, heritageClauses, body, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class HeritageClauseSyntax extends SyntaxNode {
    private _kind: SyntaxKind;

        constructor(kind: SyntaxKind,
                    public extendsOrImplementsKeyword: ISyntaxToken,
                    public typeNames: ISeparatedSyntaxList<INameSyntax>,
                    data: number) {
            super(data); 

            this._kind = kind;
            extendsOrImplementsKeyword.parent = this;
            !typeNames.isShared() && (typeNames.parent = this);
        }

        public childCount(): number {
            return 2;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.extendsOrImplementsKeyword;
                case 1: return this.typeNames;
                default: throw Errors.invalidOperation();
            }
        }

        public kind(): SyntaxKind {
            return this._kind;
        }

        public update(kind: SyntaxKind,
                      extendsOrImplementsKeyword: ISyntaxToken,
                      typeNames: ISeparatedSyntaxList<INameSyntax>): HeritageClauseSyntax {
            if (this._kind === kind && this.extendsOrImplementsKeyword === extendsOrImplementsKeyword && this.typeNames === typeNames) {
                return this;
            }

            return new HeritageClauseSyntax(kind, extendsOrImplementsKeyword, typeNames, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ModuleDeclarationSyntax extends SyntaxNode implements IModuleElementSyntax {
        constructor(public modifiers: ISyntaxList<ISyntaxToken>,
                    public moduleKeyword: ISyntaxToken,
                    public name: INameSyntax,
                    public stringLiteral: ISyntaxToken,
                    public openBraceToken: ISyntaxToken,
                    public moduleElements: ISyntaxList<IModuleElementSyntax>,
                    public closeBraceToken: ISyntaxToken,
                    data: number) {
            super(data); 

            !modifiers.isShared() && (modifiers.parent = this);
            moduleKeyword.parent = this;
            name && (name.parent = this);
            stringLiteral && (stringLiteral.parent = this);
            openBraceToken.parent = this;
            !moduleElements.isShared() && (moduleElements.parent = this);
            closeBraceToken.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ModuleDeclaration;
        }

        public childCount(): number {
            return 7;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.modifiers;
                case 1: return this.moduleKeyword;
                case 2: return this.name;
                case 3: return this.stringLiteral;
                case 4: return this.openBraceToken;
                case 5: return this.moduleElements;
                case 6: return this.closeBraceToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(modifiers: ISyntaxList<ISyntaxToken>,
                      moduleKeyword: ISyntaxToken,
                      name: INameSyntax,
                      stringLiteral: ISyntaxToken,
                      openBraceToken: ISyntaxToken,
                      moduleElements: ISyntaxList<IModuleElementSyntax>,
                      closeBraceToken: ISyntaxToken): ModuleDeclarationSyntax {
            if (this.modifiers === modifiers && this.moduleKeyword === moduleKeyword && this.name === name && this.stringLiteral === stringLiteral && this.openBraceToken === openBraceToken && this.moduleElements === moduleElements && this.closeBraceToken === closeBraceToken) {
                return this;
            }

            return new ModuleDeclarationSyntax(modifiers, moduleKeyword, name, stringLiteral, openBraceToken, moduleElements, closeBraceToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class FunctionDeclarationSyntax extends SyntaxNode implements IStatementSyntax {
        constructor(public modifiers: ISyntaxList<ISyntaxToken>,
                    public functionKeyword: ISyntaxToken,
                    public identifier: ISyntaxToken,
                    public callSignature: CallSignatureSyntax,
                    public block: BlockSyntax,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(data); 

            !modifiers.isShared() && (modifiers.parent = this);
            functionKeyword.parent = this;
            identifier.parent = this;
            callSignature.parent = this;
            block && (block.parent = this);
            semicolonToken && (semicolonToken.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.FunctionDeclaration;
        }

        public childCount(): number {
            return 6;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.modifiers;
                case 1: return this.functionKeyword;
                case 2: return this.identifier;
                case 3: return this.callSignature;
                case 4: return this.block;
                case 5: return this.semicolonToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isStatement(): boolean {
            return true;
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(modifiers: ISyntaxList<ISyntaxToken>,
                      functionKeyword: ISyntaxToken,
                      identifier: ISyntaxToken,
                      callSignature: CallSignatureSyntax,
                      block: BlockSyntax,
                      semicolonToken: ISyntaxToken): FunctionDeclarationSyntax {
            if (this.modifiers === modifiers && this.functionKeyword === functionKeyword && this.identifier === identifier && this.callSignature === callSignature && this.block === block && this.semicolonToken === semicolonToken) {
                return this;
            }

            return new FunctionDeclarationSyntax(modifiers, functionKeyword, identifier, callSignature, block, semicolonToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class VariableStatementSyntax extends SyntaxNode implements IStatementSyntax {
        constructor(public modifiers: ISyntaxList<ISyntaxToken>,
                    public variableDeclaration: VariableDeclarationSyntax,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(data); 

            !modifiers.isShared() && (modifiers.parent = this);
            variableDeclaration.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.VariableStatement;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.modifiers;
                case 1: return this.variableDeclaration;
                case 2: return this.semicolonToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isStatement(): boolean {
            return true;
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(modifiers: ISyntaxList<ISyntaxToken>,
                      variableDeclaration: VariableDeclarationSyntax,
                      semicolonToken: ISyntaxToken): VariableStatementSyntax {
            if (this.modifiers === modifiers && this.variableDeclaration === variableDeclaration && this.semicolonToken === semicolonToken) {
                return this;
            }

            return new VariableStatementSyntax(modifiers, variableDeclaration, semicolonToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class VariableDeclarationSyntax extends SyntaxNode {
        constructor(public varKeyword: ISyntaxToken,
                    public variableDeclarators: ISeparatedSyntaxList<VariableDeclaratorSyntax>,
                    data: number) {
            super(data); 

            varKeyword.parent = this;
            !variableDeclarators.isShared() && (variableDeclarators.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.VariableDeclaration;
        }

        public childCount(): number {
            return 2;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.varKeyword;
                case 1: return this.variableDeclarators;
                default: throw Errors.invalidOperation();
            }
        }

        public update(varKeyword: ISyntaxToken,
                      variableDeclarators: ISeparatedSyntaxList<VariableDeclaratorSyntax>): VariableDeclarationSyntax {
            if (this.varKeyword === varKeyword && this.variableDeclarators === variableDeclarators) {
                return this;
            }

            return new VariableDeclarationSyntax(varKeyword, variableDeclarators, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class VariableDeclaratorSyntax extends SyntaxNode {
        constructor(public propertyName: ISyntaxToken,
                    public typeAnnotation: TypeAnnotationSyntax,
                    public equalsValueClause: EqualsValueClauseSyntax,
                    data: number) {
            super(data); 

            propertyName.parent = this;
            typeAnnotation && (typeAnnotation.parent = this);
            equalsValueClause && (equalsValueClause.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.VariableDeclarator;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.propertyName;
                case 1: return this.typeAnnotation;
                case 2: return this.equalsValueClause;
                default: throw Errors.invalidOperation();
            }
        }

        public update(propertyName: ISyntaxToken,
                      typeAnnotation: TypeAnnotationSyntax,
                      equalsValueClause: EqualsValueClauseSyntax): VariableDeclaratorSyntax {
            if (this.propertyName === propertyName && this.typeAnnotation === typeAnnotation && this.equalsValueClause === equalsValueClause) {
                return this;
            }

            return new VariableDeclaratorSyntax(propertyName, typeAnnotation, equalsValueClause, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class EqualsValueClauseSyntax extends SyntaxNode {
        constructor(public equalsToken: ISyntaxToken,
                    public value: IExpressionSyntax,
                    data: number) {
            super(data); 

            equalsToken.parent = this;
            value.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.EqualsValueClause;
        }

        public childCount(): number {
            return 2;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.equalsToken;
                case 1: return this.value;
                default: throw Errors.invalidOperation();
            }
        }

        public update(equalsToken: ISyntaxToken,
                      value: IExpressionSyntax): EqualsValueClauseSyntax {
            if (this.equalsToken === equalsToken && this.value === value) {
                return this;
            }

            return new EqualsValueClauseSyntax(equalsToken, value, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class PrefixUnaryExpressionSyntax extends SyntaxNode implements IUnaryExpressionSyntax {
    private _kind: SyntaxKind;

        constructor(kind: SyntaxKind,
                    public operatorToken: ISyntaxToken,
                    public operand: IUnaryExpressionSyntax,
                    data: number) {
            super(data); 

            this._kind = kind;
            operatorToken.parent = this;
            operand.parent = this;
        }

        public childCount(): number {
            return 2;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.operatorToken;
                case 1: return this.operand;
                default: throw Errors.invalidOperation();
            }
        }

        public isUnaryExpression(): boolean {
            return true;
        }

        public isExpression(): boolean {
            return true;
        }

        public kind(): SyntaxKind {
            return this._kind;
        }

        public update(kind: SyntaxKind,
                      operatorToken: ISyntaxToken,
                      operand: IUnaryExpressionSyntax): PrefixUnaryExpressionSyntax {
            if (this._kind === kind && this.operatorToken === operatorToken && this.operand === operand) {
                return this;
            }

            return new PrefixUnaryExpressionSyntax(kind, operatorToken, operand, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ArrayLiteralExpressionSyntax extends SyntaxNode implements IPrimaryExpressionSyntax {
        constructor(public openBracketToken: ISyntaxToken,
                    public expressions: ISeparatedSyntaxList<IExpressionSyntax>,
                    public closeBracketToken: ISyntaxToken,
                    data: number) {
            super(data); 

            openBracketToken.parent = this;
            !expressions.isShared() && (expressions.parent = this);
            closeBracketToken.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ArrayLiteralExpression;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.openBracketToken;
                case 1: return this.expressions;
                case 2: return this.closeBracketToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isPrimaryExpression(): boolean {
            return true;
        }

        public isMemberExpression(): boolean {
            return true;
        }

        public isLeftHandSideExpression(): boolean {
            return true;
        }

        public isPostfixExpression(): boolean {
            return true;
        }

        public isUnaryExpression(): boolean {
            return true;
        }

        public isExpression(): boolean {
            return true;
        }

        public update(openBracketToken: ISyntaxToken,
                      expressions: ISeparatedSyntaxList<IExpressionSyntax>,
                      closeBracketToken: ISyntaxToken): ArrayLiteralExpressionSyntax {
            if (this.openBracketToken === openBracketToken && this.expressions === expressions && this.closeBracketToken === closeBracketToken) {
                return this;
            }

            return new ArrayLiteralExpressionSyntax(openBracketToken, expressions, closeBracketToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class OmittedExpressionSyntax extends SyntaxNode implements IExpressionSyntax {
        constructor(data: number) {
            super(data); 
        }

        public kind(): SyntaxKind {
            return SyntaxKind.OmittedExpression;
        }

        public childCount(): number {
            return 0;
        }

        public childAt(slot: number): ISyntaxElement {
            throw Errors.invalidOperation();
        }

        public isExpression(): boolean {
            return true;
        }

        public update(): OmittedExpressionSyntax {
            return this;
        }
    }

    export class ParenthesizedExpressionSyntax extends SyntaxNode implements IPrimaryExpressionSyntax {
        constructor(public openParenToken: ISyntaxToken,
                    public expression: IExpressionSyntax,
                    public closeParenToken: ISyntaxToken,
                    data: number) {
            super(data); 

            openParenToken.parent = this;
            expression.parent = this;
            closeParenToken.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ParenthesizedExpression;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.openParenToken;
                case 1: return this.expression;
                case 2: return this.closeParenToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isPrimaryExpression(): boolean {
            return true;
        }

        public isMemberExpression(): boolean {
            return true;
        }

        public isLeftHandSideExpression(): boolean {
            return true;
        }

        public isPostfixExpression(): boolean {
            return true;
        }

        public isUnaryExpression(): boolean {
            return true;
        }

        public isExpression(): boolean {
            return true;
        }

        public update(openParenToken: ISyntaxToken,
                      expression: IExpressionSyntax,
                      closeParenToken: ISyntaxToken): ParenthesizedExpressionSyntax {
            if (this.openParenToken === openParenToken && this.expression === expression && this.closeParenToken === closeParenToken) {
                return this;
            }

            return new ParenthesizedExpressionSyntax(openParenToken, expression, closeParenToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class SimpleArrowFunctionExpressionSyntax extends SyntaxNode implements IArrowFunctionExpressionSyntax {
        constructor(public identifier: ISyntaxToken,
                    public equalsGreaterThanToken: ISyntaxToken,
                    public block: BlockSyntax,
                    public expression: IExpressionSyntax,
                    data: number) {
            super(data); 

            identifier.parent = this;
            equalsGreaterThanToken.parent = this;
            block && (block.parent = this);
            expression && (expression.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.SimpleArrowFunctionExpression;
        }

        public childCount(): number {
            return 4;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.identifier;
                case 1: return this.equalsGreaterThanToken;
                case 2: return this.block;
                case 3: return this.expression;
                default: throw Errors.invalidOperation();
            }
        }

        public isArrowFunctionExpression(): boolean {
            return true;
        }

        public isUnaryExpression(): boolean {
            return true;
        }

        public isExpression(): boolean {
            return true;
        }

        public update(identifier: ISyntaxToken,
                      equalsGreaterThanToken: ISyntaxToken,
                      block: BlockSyntax,
                      expression: IExpressionSyntax): SimpleArrowFunctionExpressionSyntax {
            if (this.identifier === identifier && this.equalsGreaterThanToken === equalsGreaterThanToken && this.block === block && this.expression === expression) {
                return this;
            }

            return new SimpleArrowFunctionExpressionSyntax(identifier, equalsGreaterThanToken, block, expression, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ParenthesizedArrowFunctionExpressionSyntax extends SyntaxNode implements IArrowFunctionExpressionSyntax {
        constructor(public callSignature: CallSignatureSyntax,
                    public equalsGreaterThanToken: ISyntaxToken,
                    public block: BlockSyntax,
                    public expression: IExpressionSyntax,
                    data: number) {
            super(data); 

            callSignature.parent = this;
            equalsGreaterThanToken.parent = this;
            block && (block.parent = this);
            expression && (expression.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ParenthesizedArrowFunctionExpression;
        }

        public childCount(): number {
            return 4;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.callSignature;
                case 1: return this.equalsGreaterThanToken;
                case 2: return this.block;
                case 3: return this.expression;
                default: throw Errors.invalidOperation();
            }
        }

        public isArrowFunctionExpression(): boolean {
            return true;
        }

        public isUnaryExpression(): boolean {
            return true;
        }

        public isExpression(): boolean {
            return true;
        }

        public update(callSignature: CallSignatureSyntax,
                      equalsGreaterThanToken: ISyntaxToken,
                      block: BlockSyntax,
                      expression: IExpressionSyntax): ParenthesizedArrowFunctionExpressionSyntax {
            if (this.callSignature === callSignature && this.equalsGreaterThanToken === equalsGreaterThanToken && this.block === block && this.expression === expression) {
                return this;
            }

            return new ParenthesizedArrowFunctionExpressionSyntax(callSignature, equalsGreaterThanToken, block, expression, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class QualifiedNameSyntax extends SyntaxNode implements INameSyntax {
        constructor(public left: INameSyntax,
                    public dotToken: ISyntaxToken,
                    public right: ISyntaxToken,
                    data: number) {
            super(data); 

            left.parent = this;
            dotToken.parent = this;
            right.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.QualifiedName;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.left;
                case 1: return this.dotToken;
                case 2: return this.right;
                default: throw Errors.invalidOperation();
            }
        }

        public isName(): boolean {
            return true;
        }

        public isType(): boolean {
            return true;
        }

        public update(left: INameSyntax,
                      dotToken: ISyntaxToken,
                      right: ISyntaxToken): QualifiedNameSyntax {
            if (this.left === left && this.dotToken === dotToken && this.right === right) {
                return this;
            }

            return new QualifiedNameSyntax(left, dotToken, right, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class TypeArgumentListSyntax extends SyntaxNode {
        constructor(public lessThanToken: ISyntaxToken,
                    public typeArguments: ISeparatedSyntaxList<ITypeSyntax>,
                    public greaterThanToken: ISyntaxToken,
                    data: number) {
            super(data); 

            lessThanToken.parent = this;
            !typeArguments.isShared() && (typeArguments.parent = this);
            greaterThanToken.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.TypeArgumentList;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.lessThanToken;
                case 1: return this.typeArguments;
                case 2: return this.greaterThanToken;
                default: throw Errors.invalidOperation();
            }
        }

        public update(lessThanToken: ISyntaxToken,
                      typeArguments: ISeparatedSyntaxList<ITypeSyntax>,
                      greaterThanToken: ISyntaxToken): TypeArgumentListSyntax {
            if (this.lessThanToken === lessThanToken && this.typeArguments === typeArguments && this.greaterThanToken === greaterThanToken) {
                return this;
            }

            return new TypeArgumentListSyntax(lessThanToken, typeArguments, greaterThanToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ConstructorTypeSyntax extends SyntaxNode implements ITypeSyntax {
        constructor(public newKeyword: ISyntaxToken,
                    public typeParameterList: TypeParameterListSyntax,
                    public parameterList: ParameterListSyntax,
                    public equalsGreaterThanToken: ISyntaxToken,
                    public type: ITypeSyntax,
                    data: number) {
            super(data); 

            newKeyword.parent = this;
            typeParameterList && (typeParameterList.parent = this);
            parameterList.parent = this;
            equalsGreaterThanToken.parent = this;
            type.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ConstructorType;
        }

        public childCount(): number {
            return 5;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.newKeyword;
                case 1: return this.typeParameterList;
                case 2: return this.parameterList;
                case 3: return this.equalsGreaterThanToken;
                case 4: return this.type;
                default: throw Errors.invalidOperation();
            }
        }

        public isType(): boolean {
            return true;
        }

        public update(newKeyword: ISyntaxToken,
                      typeParameterList: TypeParameterListSyntax,
                      parameterList: ParameterListSyntax,
                      equalsGreaterThanToken: ISyntaxToken,
                      type: ITypeSyntax): ConstructorTypeSyntax {
            if (this.newKeyword === newKeyword && this.typeParameterList === typeParameterList && this.parameterList === parameterList && this.equalsGreaterThanToken === equalsGreaterThanToken && this.type === type) {
                return this;
            }

            return new ConstructorTypeSyntax(newKeyword, typeParameterList, parameterList, equalsGreaterThanToken, type, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class FunctionTypeSyntax extends SyntaxNode implements ITypeSyntax {
        constructor(public typeParameterList: TypeParameterListSyntax,
                    public parameterList: ParameterListSyntax,
                    public equalsGreaterThanToken: ISyntaxToken,
                    public type: ITypeSyntax,
                    data: number) {
            super(data); 

            typeParameterList && (typeParameterList.parent = this);
            parameterList.parent = this;
            equalsGreaterThanToken.parent = this;
            type.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.FunctionType;
        }

        public childCount(): number {
            return 4;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.typeParameterList;
                case 1: return this.parameterList;
                case 2: return this.equalsGreaterThanToken;
                case 3: return this.type;
                default: throw Errors.invalidOperation();
            }
        }

        public isType(): boolean {
            return true;
        }

        public update(typeParameterList: TypeParameterListSyntax,
                      parameterList: ParameterListSyntax,
                      equalsGreaterThanToken: ISyntaxToken,
                      type: ITypeSyntax): FunctionTypeSyntax {
            if (this.typeParameterList === typeParameterList && this.parameterList === parameterList && this.equalsGreaterThanToken === equalsGreaterThanToken && this.type === type) {
                return this;
            }

            return new FunctionTypeSyntax(typeParameterList, parameterList, equalsGreaterThanToken, type, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ObjectTypeSyntax extends SyntaxNode implements ITypeSyntax {
        constructor(public openBraceToken: ISyntaxToken,
                    public typeMembers: ISeparatedSyntaxList<ITypeMemberSyntax>,
                    public closeBraceToken: ISyntaxToken,
                    data: number) {
            super(data); 

            openBraceToken.parent = this;
            !typeMembers.isShared() && (typeMembers.parent = this);
            closeBraceToken.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ObjectType;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.openBraceToken;
                case 1: return this.typeMembers;
                case 2: return this.closeBraceToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isType(): boolean {
            return true;
        }

        public update(openBraceToken: ISyntaxToken,
                      typeMembers: ISeparatedSyntaxList<ITypeMemberSyntax>,
                      closeBraceToken: ISyntaxToken): ObjectTypeSyntax {
            if (this.openBraceToken === openBraceToken && this.typeMembers === typeMembers && this.closeBraceToken === closeBraceToken) {
                return this;
            }

            return new ObjectTypeSyntax(openBraceToken, typeMembers, closeBraceToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ArrayTypeSyntax extends SyntaxNode implements ITypeSyntax {
        constructor(public type: ITypeSyntax,
                    public openBracketToken: ISyntaxToken,
                    public closeBracketToken: ISyntaxToken,
                    data: number) {
            super(data); 

            type.parent = this;
            openBracketToken.parent = this;
            closeBracketToken.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ArrayType;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.type;
                case 1: return this.openBracketToken;
                case 2: return this.closeBracketToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isType(): boolean {
            return true;
        }

        public update(type: ITypeSyntax,
                      openBracketToken: ISyntaxToken,
                      closeBracketToken: ISyntaxToken): ArrayTypeSyntax {
            if (this.type === type && this.openBracketToken === openBracketToken && this.closeBracketToken === closeBracketToken) {
                return this;
            }

            return new ArrayTypeSyntax(type, openBracketToken, closeBracketToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class GenericTypeSyntax extends SyntaxNode implements ITypeSyntax {
        constructor(public name: INameSyntax,
                    public typeArgumentList: TypeArgumentListSyntax,
                    data: number) {
            super(data); 

            name.parent = this;
            typeArgumentList.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.GenericType;
        }

        public childCount(): number {
            return 2;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.name;
                case 1: return this.typeArgumentList;
                default: throw Errors.invalidOperation();
            }
        }

        public isType(): boolean {
            return true;
        }

        public update(name: INameSyntax,
                      typeArgumentList: TypeArgumentListSyntax): GenericTypeSyntax {
            if (this.name === name && this.typeArgumentList === typeArgumentList) {
                return this;
            }

            return new GenericTypeSyntax(name, typeArgumentList, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class TypeQuerySyntax extends SyntaxNode implements ITypeSyntax {
        constructor(public typeOfKeyword: ISyntaxToken,
                    public name: INameSyntax,
                    data: number) {
            super(data); 

            typeOfKeyword.parent = this;
            name.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.TypeQuery;
        }

        public childCount(): number {
            return 2;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.typeOfKeyword;
                case 1: return this.name;
                default: throw Errors.invalidOperation();
            }
        }

        public isType(): boolean {
            return true;
        }

        public update(typeOfKeyword: ISyntaxToken,
                      name: INameSyntax): TypeQuerySyntax {
            if (this.typeOfKeyword === typeOfKeyword && this.name === name) {
                return this;
            }

            return new TypeQuerySyntax(typeOfKeyword, name, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class TypeAnnotationSyntax extends SyntaxNode {
        constructor(public colonToken: ISyntaxToken,
                    public type: ITypeSyntax,
                    data: number) {
            super(data); 

            colonToken.parent = this;
            type.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.TypeAnnotation;
        }

        public childCount(): number {
            return 2;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.colonToken;
                case 1: return this.type;
                default: throw Errors.invalidOperation();
            }
        }

        public update(colonToken: ISyntaxToken,
                      type: ITypeSyntax): TypeAnnotationSyntax {
            if (this.colonToken === colonToken && this.type === type) {
                return this;
            }

            return new TypeAnnotationSyntax(colonToken, type, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class BlockSyntax extends SyntaxNode implements IStatementSyntax {
        constructor(public openBraceToken: ISyntaxToken,
                    public statements: ISyntaxList<IStatementSyntax>,
                    public closeBraceToken: ISyntaxToken,
                    data: number) {
            super(data); 

            openBraceToken.parent = this;
            !statements.isShared() && (statements.parent = this);
            closeBraceToken.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.Block;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.openBraceToken;
                case 1: return this.statements;
                case 2: return this.closeBraceToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isStatement(): boolean {
            return true;
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(openBraceToken: ISyntaxToken,
                      statements: ISyntaxList<IStatementSyntax>,
                      closeBraceToken: ISyntaxToken): BlockSyntax {
            if (this.openBraceToken === openBraceToken && this.statements === statements && this.closeBraceToken === closeBraceToken) {
                return this;
            }

            return new BlockSyntax(openBraceToken, statements, closeBraceToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ParameterSyntax extends SyntaxNode {
        constructor(public dotDotDotToken: ISyntaxToken,
                    public modifiers: ISyntaxList<ISyntaxToken>,
                    public identifier: ISyntaxToken,
                    public questionToken: ISyntaxToken,
                    public typeAnnotation: TypeAnnotationSyntax,
                    public equalsValueClause: EqualsValueClauseSyntax,
                    data: number) {
            super(data); 

            dotDotDotToken && (dotDotDotToken.parent = this);
            !modifiers.isShared() && (modifiers.parent = this);
            identifier.parent = this;
            questionToken && (questionToken.parent = this);
            typeAnnotation && (typeAnnotation.parent = this);
            equalsValueClause && (equalsValueClause.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.Parameter;
        }

        public childCount(): number {
            return 6;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.dotDotDotToken;
                case 1: return this.modifiers;
                case 2: return this.identifier;
                case 3: return this.questionToken;
                case 4: return this.typeAnnotation;
                case 5: return this.equalsValueClause;
                default: throw Errors.invalidOperation();
            }
        }

        public update(dotDotDotToken: ISyntaxToken,
                      modifiers: ISyntaxList<ISyntaxToken>,
                      identifier: ISyntaxToken,
                      questionToken: ISyntaxToken,
                      typeAnnotation: TypeAnnotationSyntax,
                      equalsValueClause: EqualsValueClauseSyntax): ParameterSyntax {
            if (this.dotDotDotToken === dotDotDotToken && this.modifiers === modifiers && this.identifier === identifier && this.questionToken === questionToken && this.typeAnnotation === typeAnnotation && this.equalsValueClause === equalsValueClause) {
                return this;
            }

            return new ParameterSyntax(dotDotDotToken, modifiers, identifier, questionToken, typeAnnotation, equalsValueClause, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class MemberAccessExpressionSyntax extends SyntaxNode implements IMemberExpressionSyntax, ICallExpressionSyntax {
        constructor(public expression: ILeftHandSideExpressionSyntax,
                    public dotToken: ISyntaxToken,
                    public name: ISyntaxToken,
                    data: number) {
            super(data); 

            expression.parent = this;
            dotToken.parent = this;
            name.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.MemberAccessExpression;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.expression;
                case 1: return this.dotToken;
                case 2: return this.name;
                default: throw Errors.invalidOperation();
            }
        }

        public isMemberExpression(): boolean {
            return true;
        }

        public isCallExpression(): boolean {
            return true;
        }

        public isLeftHandSideExpression(): boolean {
            return true;
        }

        public isPostfixExpression(): boolean {
            return true;
        }

        public isUnaryExpression(): boolean {
            return true;
        }

        public isExpression(): boolean {
            return true;
        }

        public update(expression: ILeftHandSideExpressionSyntax,
                      dotToken: ISyntaxToken,
                      name: ISyntaxToken): MemberAccessExpressionSyntax {
            if (this.expression === expression && this.dotToken === dotToken && this.name === name) {
                return this;
            }

            return new MemberAccessExpressionSyntax(expression, dotToken, name, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class PostfixUnaryExpressionSyntax extends SyntaxNode implements IPostfixExpressionSyntax {
    private _kind: SyntaxKind;

        constructor(kind: SyntaxKind,
                    public operand: ILeftHandSideExpressionSyntax,
                    public operatorToken: ISyntaxToken,
                    data: number) {
            super(data); 

            this._kind = kind;
            operand.parent = this;
            operatorToken.parent = this;
        }

        public childCount(): number {
            return 2;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.operand;
                case 1: return this.operatorToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isPostfixExpression(): boolean {
            return true;
        }

        public isUnaryExpression(): boolean {
            return true;
        }

        public isExpression(): boolean {
            return true;
        }

        public kind(): SyntaxKind {
            return this._kind;
        }

        public update(kind: SyntaxKind,
                      operand: ILeftHandSideExpressionSyntax,
                      operatorToken: ISyntaxToken): PostfixUnaryExpressionSyntax {
            if (this._kind === kind && this.operand === operand && this.operatorToken === operatorToken) {
                return this;
            }

            return new PostfixUnaryExpressionSyntax(kind, operand, operatorToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ElementAccessExpressionSyntax extends SyntaxNode implements IMemberExpressionSyntax, ICallExpressionSyntax {
        constructor(public expression: ILeftHandSideExpressionSyntax,
                    public openBracketToken: ISyntaxToken,
                    public argumentExpression: IExpressionSyntax,
                    public closeBracketToken: ISyntaxToken,
                    data: number) {
            super(data); 

            expression.parent = this;
            openBracketToken.parent = this;
            argumentExpression.parent = this;
            closeBracketToken.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ElementAccessExpression;
        }

        public childCount(): number {
            return 4;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.expression;
                case 1: return this.openBracketToken;
                case 2: return this.argumentExpression;
                case 3: return this.closeBracketToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isMemberExpression(): boolean {
            return true;
        }

        public isCallExpression(): boolean {
            return true;
        }

        public isLeftHandSideExpression(): boolean {
            return true;
        }

        public isPostfixExpression(): boolean {
            return true;
        }

        public isUnaryExpression(): boolean {
            return true;
        }

        public isExpression(): boolean {
            return true;
        }

        public update(expression: ILeftHandSideExpressionSyntax,
                      openBracketToken: ISyntaxToken,
                      argumentExpression: IExpressionSyntax,
                      closeBracketToken: ISyntaxToken): ElementAccessExpressionSyntax {
            if (this.expression === expression && this.openBracketToken === openBracketToken && this.argumentExpression === argumentExpression && this.closeBracketToken === closeBracketToken) {
                return this;
            }

            return new ElementAccessExpressionSyntax(expression, openBracketToken, argumentExpression, closeBracketToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class InvocationExpressionSyntax extends SyntaxNode implements ICallExpressionSyntax {
        constructor(public expression: ILeftHandSideExpressionSyntax,
                    public argumentList: ArgumentListSyntax,
                    data: number) {
            super(data); 

            expression.parent = this;
            argumentList.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.InvocationExpression;
        }

        public childCount(): number {
            return 2;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.expression;
                case 1: return this.argumentList;
                default: throw Errors.invalidOperation();
            }
        }

        public isCallExpression(): boolean {
            return true;
        }

        public isLeftHandSideExpression(): boolean {
            return true;
        }

        public isPostfixExpression(): boolean {
            return true;
        }

        public isUnaryExpression(): boolean {
            return true;
        }

        public isExpression(): boolean {
            return true;
        }

        public update(expression: ILeftHandSideExpressionSyntax,
                      argumentList: ArgumentListSyntax): InvocationExpressionSyntax {
            if (this.expression === expression && this.argumentList === argumentList) {
                return this;
            }

            return new InvocationExpressionSyntax(expression, argumentList, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ArgumentListSyntax extends SyntaxNode {
    public arguments: ISeparatedSyntaxList<IExpressionSyntax>;
        constructor(public typeArgumentList: TypeArgumentListSyntax,
                    public openParenToken: ISyntaxToken,
                    _arguments: ISeparatedSyntaxList<IExpressionSyntax>,
                    public closeParenToken: ISyntaxToken,
                    data: number) {
            super(data); 

            this.arguments = _arguments;
            typeArgumentList && (typeArgumentList.parent = this);
            openParenToken.parent = this;
            !_arguments.isShared() && (_arguments.parent = this);
            closeParenToken.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ArgumentList;
        }

        public childCount(): number {
            return 4;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.typeArgumentList;
                case 1: return this.openParenToken;
                case 2: return this.arguments;
                case 3: return this.closeParenToken;
                default: throw Errors.invalidOperation();
            }
        }

        public update(typeArgumentList: TypeArgumentListSyntax,
                      openParenToken: ISyntaxToken,
                      _arguments: ISeparatedSyntaxList<IExpressionSyntax>,
                      closeParenToken: ISyntaxToken): ArgumentListSyntax {
            if (this.typeArgumentList === typeArgumentList && this.openParenToken === openParenToken && this.arguments === _arguments && this.closeParenToken === closeParenToken) {
                return this;
            }

            return new ArgumentListSyntax(typeArgumentList, openParenToken, _arguments, closeParenToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class BinaryExpressionSyntax extends SyntaxNode implements IExpressionSyntax {
    private _kind: SyntaxKind;

        constructor(kind: SyntaxKind,
                    public left: IExpressionSyntax,
                    public operatorToken: ISyntaxToken,
                    public right: IExpressionSyntax,
                    data: number) {
            super(data); 

            this._kind = kind;
            left.parent = this;
            operatorToken.parent = this;
            right.parent = this;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.left;
                case 1: return this.operatorToken;
                case 2: return this.right;
                default: throw Errors.invalidOperation();
            }
        }

        public isExpression(): boolean {
            return true;
        }

        public kind(): SyntaxKind {
            return this._kind;
        }

        public update(kind: SyntaxKind,
                      left: IExpressionSyntax,
                      operatorToken: ISyntaxToken,
                      right: IExpressionSyntax): BinaryExpressionSyntax {
            if (this._kind === kind && this.left === left && this.operatorToken === operatorToken && this.right === right) {
                return this;
            }

            return new BinaryExpressionSyntax(kind, left, operatorToken, right, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ConditionalExpressionSyntax extends SyntaxNode implements IExpressionSyntax {
        constructor(public condition: IExpressionSyntax,
                    public questionToken: ISyntaxToken,
                    public whenTrue: IExpressionSyntax,
                    public colonToken: ISyntaxToken,
                    public whenFalse: IExpressionSyntax,
                    data: number) {
            super(data); 

            condition.parent = this;
            questionToken.parent = this;
            whenTrue.parent = this;
            colonToken.parent = this;
            whenFalse.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ConditionalExpression;
        }

        public childCount(): number {
            return 5;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.condition;
                case 1: return this.questionToken;
                case 2: return this.whenTrue;
                case 3: return this.colonToken;
                case 4: return this.whenFalse;
                default: throw Errors.invalidOperation();
            }
        }

        public isExpression(): boolean {
            return true;
        }

        public update(condition: IExpressionSyntax,
                      questionToken: ISyntaxToken,
                      whenTrue: IExpressionSyntax,
                      colonToken: ISyntaxToken,
                      whenFalse: IExpressionSyntax): ConditionalExpressionSyntax {
            if (this.condition === condition && this.questionToken === questionToken && this.whenTrue === whenTrue && this.colonToken === colonToken && this.whenFalse === whenFalse) {
                return this;
            }

            return new ConditionalExpressionSyntax(condition, questionToken, whenTrue, colonToken, whenFalse, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ConstructSignatureSyntax extends SyntaxNode implements ITypeMemberSyntax {
        constructor(public newKeyword: ISyntaxToken,
                    public callSignature: CallSignatureSyntax,
                    data: number) {
            super(data); 

            newKeyword.parent = this;
            callSignature.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ConstructSignature;
        }

        public childCount(): number {
            return 2;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.newKeyword;
                case 1: return this.callSignature;
                default: throw Errors.invalidOperation();
            }
        }

        public isTypeMember(): boolean {
            return true;
        }

        public update(newKeyword: ISyntaxToken,
                      callSignature: CallSignatureSyntax): ConstructSignatureSyntax {
            if (this.newKeyword === newKeyword && this.callSignature === callSignature) {
                return this;
            }

            return new ConstructSignatureSyntax(newKeyword, callSignature, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class MethodSignatureSyntax extends SyntaxNode implements ITypeMemberSyntax {
        constructor(public propertyName: ISyntaxToken,
                    public questionToken: ISyntaxToken,
                    public callSignature: CallSignatureSyntax,
                    data: number) {
            super(data); 

            propertyName.parent = this;
            questionToken && (questionToken.parent = this);
            callSignature.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.MethodSignature;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.propertyName;
                case 1: return this.questionToken;
                case 2: return this.callSignature;
                default: throw Errors.invalidOperation();
            }
        }

        public isTypeMember(): boolean {
            return true;
        }

        public update(propertyName: ISyntaxToken,
                      questionToken: ISyntaxToken,
                      callSignature: CallSignatureSyntax): MethodSignatureSyntax {
            if (this.propertyName === propertyName && this.questionToken === questionToken && this.callSignature === callSignature) {
                return this;
            }

            return new MethodSignatureSyntax(propertyName, questionToken, callSignature, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class IndexSignatureSyntax extends SyntaxNode implements ITypeMemberSyntax {
        constructor(public openBracketToken: ISyntaxToken,
                    public parameter: ParameterSyntax,
                    public closeBracketToken: ISyntaxToken,
                    public typeAnnotation: TypeAnnotationSyntax,
                    data: number) {
            super(data); 

            openBracketToken.parent = this;
            parameter.parent = this;
            closeBracketToken.parent = this;
            typeAnnotation && (typeAnnotation.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.IndexSignature;
        }

        public childCount(): number {
            return 4;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.openBracketToken;
                case 1: return this.parameter;
                case 2: return this.closeBracketToken;
                case 3: return this.typeAnnotation;
                default: throw Errors.invalidOperation();
            }
        }

        public isTypeMember(): boolean {
            return true;
        }

        public update(openBracketToken: ISyntaxToken,
                      parameter: ParameterSyntax,
                      closeBracketToken: ISyntaxToken,
                      typeAnnotation: TypeAnnotationSyntax): IndexSignatureSyntax {
            if (this.openBracketToken === openBracketToken && this.parameter === parameter && this.closeBracketToken === closeBracketToken && this.typeAnnotation === typeAnnotation) {
                return this;
            }

            return new IndexSignatureSyntax(openBracketToken, parameter, closeBracketToken, typeAnnotation, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class PropertySignatureSyntax extends SyntaxNode implements ITypeMemberSyntax {
        constructor(public propertyName: ISyntaxToken,
                    public questionToken: ISyntaxToken,
                    public typeAnnotation: TypeAnnotationSyntax,
                    data: number) {
            super(data); 

            propertyName.parent = this;
            questionToken && (questionToken.parent = this);
            typeAnnotation && (typeAnnotation.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.PropertySignature;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.propertyName;
                case 1: return this.questionToken;
                case 2: return this.typeAnnotation;
                default: throw Errors.invalidOperation();
            }
        }

        public isTypeMember(): boolean {
            return true;
        }

        public update(propertyName: ISyntaxToken,
                      questionToken: ISyntaxToken,
                      typeAnnotation: TypeAnnotationSyntax): PropertySignatureSyntax {
            if (this.propertyName === propertyName && this.questionToken === questionToken && this.typeAnnotation === typeAnnotation) {
                return this;
            }

            return new PropertySignatureSyntax(propertyName, questionToken, typeAnnotation, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class CallSignatureSyntax extends SyntaxNode implements ITypeMemberSyntax {
        constructor(public typeParameterList: TypeParameterListSyntax,
                    public parameterList: ParameterListSyntax,
                    public typeAnnotation: TypeAnnotationSyntax,
                    data: number) {
            super(data); 

            typeParameterList && (typeParameterList.parent = this);
            parameterList.parent = this;
            typeAnnotation && (typeAnnotation.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.CallSignature;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.typeParameterList;
                case 1: return this.parameterList;
                case 2: return this.typeAnnotation;
                default: throw Errors.invalidOperation();
            }
        }

        public isTypeMember(): boolean {
            return true;
        }

        public update(typeParameterList: TypeParameterListSyntax,
                      parameterList: ParameterListSyntax,
                      typeAnnotation: TypeAnnotationSyntax): CallSignatureSyntax {
            if (this.typeParameterList === typeParameterList && this.parameterList === parameterList && this.typeAnnotation === typeAnnotation) {
                return this;
            }

            return new CallSignatureSyntax(typeParameterList, parameterList, typeAnnotation, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ParameterListSyntax extends SyntaxNode {
        constructor(public openParenToken: ISyntaxToken,
                    public parameters: ISeparatedSyntaxList<ParameterSyntax>,
                    public closeParenToken: ISyntaxToken,
                    data: number) {
            super(data); 

            openParenToken.parent = this;
            !parameters.isShared() && (parameters.parent = this);
            closeParenToken.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ParameterList;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.openParenToken;
                case 1: return this.parameters;
                case 2: return this.closeParenToken;
                default: throw Errors.invalidOperation();
            }
        }

        public update(openParenToken: ISyntaxToken,
                      parameters: ISeparatedSyntaxList<ParameterSyntax>,
                      closeParenToken: ISyntaxToken): ParameterListSyntax {
            if (this.openParenToken === openParenToken && this.parameters === parameters && this.closeParenToken === closeParenToken) {
                return this;
            }

            return new ParameterListSyntax(openParenToken, parameters, closeParenToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class TypeParameterListSyntax extends SyntaxNode {
        constructor(public lessThanToken: ISyntaxToken,
                    public typeParameters: ISeparatedSyntaxList<TypeParameterSyntax>,
                    public greaterThanToken: ISyntaxToken,
                    data: number) {
            super(data); 

            lessThanToken.parent = this;
            !typeParameters.isShared() && (typeParameters.parent = this);
            greaterThanToken.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.TypeParameterList;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.lessThanToken;
                case 1: return this.typeParameters;
                case 2: return this.greaterThanToken;
                default: throw Errors.invalidOperation();
            }
        }

        public update(lessThanToken: ISyntaxToken,
                      typeParameters: ISeparatedSyntaxList<TypeParameterSyntax>,
                      greaterThanToken: ISyntaxToken): TypeParameterListSyntax {
            if (this.lessThanToken === lessThanToken && this.typeParameters === typeParameters && this.greaterThanToken === greaterThanToken) {
                return this;
            }

            return new TypeParameterListSyntax(lessThanToken, typeParameters, greaterThanToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class TypeParameterSyntax extends SyntaxNode {
        constructor(public identifier: ISyntaxToken,
                    public constraint: ConstraintSyntax,
                    data: number) {
            super(data); 

            identifier.parent = this;
            constraint && (constraint.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.TypeParameter;
        }

        public childCount(): number {
            return 2;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.identifier;
                case 1: return this.constraint;
                default: throw Errors.invalidOperation();
            }
        }

        public update(identifier: ISyntaxToken,
                      constraint: ConstraintSyntax): TypeParameterSyntax {
            if (this.identifier === identifier && this.constraint === constraint) {
                return this;
            }

            return new TypeParameterSyntax(identifier, constraint, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ConstraintSyntax extends SyntaxNode {
        constructor(public extendsKeyword: ISyntaxToken,
                    public type: ITypeSyntax,
                    data: number) {
            super(data); 

            extendsKeyword.parent = this;
            type.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.Constraint;
        }

        public childCount(): number {
            return 2;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.extendsKeyword;
                case 1: return this.type;
                default: throw Errors.invalidOperation();
            }
        }

        public update(extendsKeyword: ISyntaxToken,
                      type: ITypeSyntax): ConstraintSyntax {
            if (this.extendsKeyword === extendsKeyword && this.type === type) {
                return this;
            }

            return new ConstraintSyntax(extendsKeyword, type, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ElseClauseSyntax extends SyntaxNode {
        constructor(public elseKeyword: ISyntaxToken,
                    public statement: IStatementSyntax,
                    data: number) {
            super(data); 

            elseKeyword.parent = this;
            statement.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ElseClause;
        }

        public childCount(): number {
            return 2;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.elseKeyword;
                case 1: return this.statement;
                default: throw Errors.invalidOperation();
            }
        }

        public update(elseKeyword: ISyntaxToken,
                      statement: IStatementSyntax): ElseClauseSyntax {
            if (this.elseKeyword === elseKeyword && this.statement === statement) {
                return this;
            }

            return new ElseClauseSyntax(elseKeyword, statement, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class IfStatementSyntax extends SyntaxNode implements IStatementSyntax {
        constructor(public ifKeyword: ISyntaxToken,
                    public openParenToken: ISyntaxToken,
                    public condition: IExpressionSyntax,
                    public closeParenToken: ISyntaxToken,
                    public statement: IStatementSyntax,
                    public elseClause: ElseClauseSyntax,
                    data: number) {
            super(data); 

            ifKeyword.parent = this;
            openParenToken.parent = this;
            condition.parent = this;
            closeParenToken.parent = this;
            statement.parent = this;
            elseClause && (elseClause.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.IfStatement;
        }

        public childCount(): number {
            return 6;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.ifKeyword;
                case 1: return this.openParenToken;
                case 2: return this.condition;
                case 3: return this.closeParenToken;
                case 4: return this.statement;
                case 5: return this.elseClause;
                default: throw Errors.invalidOperation();
            }
        }

        public isStatement(): boolean {
            return true;
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(ifKeyword: ISyntaxToken,
                      openParenToken: ISyntaxToken,
                      condition: IExpressionSyntax,
                      closeParenToken: ISyntaxToken,
                      statement: IStatementSyntax,
                      elseClause: ElseClauseSyntax): IfStatementSyntax {
            if (this.ifKeyword === ifKeyword && this.openParenToken === openParenToken && this.condition === condition && this.closeParenToken === closeParenToken && this.statement === statement && this.elseClause === elseClause) {
                return this;
            }

            return new IfStatementSyntax(ifKeyword, openParenToken, condition, closeParenToken, statement, elseClause, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ExpressionStatementSyntax extends SyntaxNode implements IStatementSyntax {
        constructor(public expression: IExpressionSyntax,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(data); 

            expression.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ExpressionStatement;
        }

        public childCount(): number {
            return 2;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.expression;
                case 1: return this.semicolonToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isStatement(): boolean {
            return true;
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(expression: IExpressionSyntax,
                      semicolonToken: ISyntaxToken): ExpressionStatementSyntax {
            if (this.expression === expression && this.semicolonToken === semicolonToken) {
                return this;
            }

            return new ExpressionStatementSyntax(expression, semicolonToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ConstructorDeclarationSyntax extends SyntaxNode implements IClassElementSyntax {
        constructor(public modifiers: ISyntaxList<ISyntaxToken>,
                    public constructorKeyword: ISyntaxToken,
                    public callSignature: CallSignatureSyntax,
                    public block: BlockSyntax,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(data); 

            !modifiers.isShared() && (modifiers.parent = this);
            constructorKeyword.parent = this;
            callSignature.parent = this;
            block && (block.parent = this);
            semicolonToken && (semicolonToken.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ConstructorDeclaration;
        }

        public childCount(): number {
            return 5;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.modifiers;
                case 1: return this.constructorKeyword;
                case 2: return this.callSignature;
                case 3: return this.block;
                case 4: return this.semicolonToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isClassElement(): boolean {
            return true;
        }

        public update(modifiers: ISyntaxList<ISyntaxToken>,
                      constructorKeyword: ISyntaxToken,
                      callSignature: CallSignatureSyntax,
                      block: BlockSyntax,
                      semicolonToken: ISyntaxToken): ConstructorDeclarationSyntax {
            if (this.modifiers === modifiers && this.constructorKeyword === constructorKeyword && this.callSignature === callSignature && this.block === block && this.semicolonToken === semicolonToken) {
                return this;
            }

            return new ConstructorDeclarationSyntax(modifiers, constructorKeyword, callSignature, block, semicolonToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class MemberFunctionDeclarationSyntax extends SyntaxNode implements IMemberDeclarationSyntax {
        constructor(public modifiers: ISyntaxList<ISyntaxToken>,
                    public propertyName: ISyntaxToken,
                    public callSignature: CallSignatureSyntax,
                    public block: BlockSyntax,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(data); 

            !modifiers.isShared() && (modifiers.parent = this);
            propertyName.parent = this;
            callSignature.parent = this;
            block && (block.parent = this);
            semicolonToken && (semicolonToken.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.MemberFunctionDeclaration;
        }

        public childCount(): number {
            return 5;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.modifiers;
                case 1: return this.propertyName;
                case 2: return this.callSignature;
                case 3: return this.block;
                case 4: return this.semicolonToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isMemberDeclaration(): boolean {
            return true;
        }

        public isClassElement(): boolean {
            return true;
        }

        public update(modifiers: ISyntaxList<ISyntaxToken>,
                      propertyName: ISyntaxToken,
                      callSignature: CallSignatureSyntax,
                      block: BlockSyntax,
                      semicolonToken: ISyntaxToken): MemberFunctionDeclarationSyntax {
            if (this.modifiers === modifiers && this.propertyName === propertyName && this.callSignature === callSignature && this.block === block && this.semicolonToken === semicolonToken) {
                return this;
            }

            return new MemberFunctionDeclarationSyntax(modifiers, propertyName, callSignature, block, semicolonToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class GetAccessorSyntax extends SyntaxNode implements IMemberDeclarationSyntax, IPropertyAssignmentSyntax {
        constructor(public modifiers: ISyntaxList<ISyntaxToken>,
                    public getKeyword: ISyntaxToken,
                    public propertyName: ISyntaxToken,
                    public parameterList: ParameterListSyntax,
                    public typeAnnotation: TypeAnnotationSyntax,
                    public block: BlockSyntax,
                    data: number) {
            super(data); 

            !modifiers.isShared() && (modifiers.parent = this);
            getKeyword.parent = this;
            propertyName.parent = this;
            parameterList.parent = this;
            typeAnnotation && (typeAnnotation.parent = this);
            block.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.GetAccessor;
        }

        public childCount(): number {
            return 6;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.modifiers;
                case 1: return this.getKeyword;
                case 2: return this.propertyName;
                case 3: return this.parameterList;
                case 4: return this.typeAnnotation;
                case 5: return this.block;
                default: throw Errors.invalidOperation();
            }
        }

        public isMemberDeclaration(): boolean {
            return true;
        }

        public isPropertyAssignment(): boolean {
            return true;
        }

        public isClassElement(): boolean {
            return true;
        }

        public update(modifiers: ISyntaxList<ISyntaxToken>,
                      getKeyword: ISyntaxToken,
                      propertyName: ISyntaxToken,
                      parameterList: ParameterListSyntax,
                      typeAnnotation: TypeAnnotationSyntax,
                      block: BlockSyntax): GetAccessorSyntax {
            if (this.modifiers === modifiers && this.getKeyword === getKeyword && this.propertyName === propertyName && this.parameterList === parameterList && this.typeAnnotation === typeAnnotation && this.block === block) {
                return this;
            }

            return new GetAccessorSyntax(modifiers, getKeyword, propertyName, parameterList, typeAnnotation, block, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class SetAccessorSyntax extends SyntaxNode implements IMemberDeclarationSyntax, IPropertyAssignmentSyntax {
        constructor(public modifiers: ISyntaxList<ISyntaxToken>,
                    public setKeyword: ISyntaxToken,
                    public propertyName: ISyntaxToken,
                    public parameterList: ParameterListSyntax,
                    public block: BlockSyntax,
                    data: number) {
            super(data); 

            !modifiers.isShared() && (modifiers.parent = this);
            setKeyword.parent = this;
            propertyName.parent = this;
            parameterList.parent = this;
            block.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.SetAccessor;
        }

        public childCount(): number {
            return 5;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.modifiers;
                case 1: return this.setKeyword;
                case 2: return this.propertyName;
                case 3: return this.parameterList;
                case 4: return this.block;
                default: throw Errors.invalidOperation();
            }
        }

        public isMemberDeclaration(): boolean {
            return true;
        }

        public isPropertyAssignment(): boolean {
            return true;
        }

        public isClassElement(): boolean {
            return true;
        }

        public update(modifiers: ISyntaxList<ISyntaxToken>,
                      setKeyword: ISyntaxToken,
                      propertyName: ISyntaxToken,
                      parameterList: ParameterListSyntax,
                      block: BlockSyntax): SetAccessorSyntax {
            if (this.modifiers === modifiers && this.setKeyword === setKeyword && this.propertyName === propertyName && this.parameterList === parameterList && this.block === block) {
                return this;
            }

            return new SetAccessorSyntax(modifiers, setKeyword, propertyName, parameterList, block, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class MemberVariableDeclarationSyntax extends SyntaxNode implements IMemberDeclarationSyntax {
        constructor(public modifiers: ISyntaxList<ISyntaxToken>,
                    public variableDeclarator: VariableDeclaratorSyntax,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(data); 

            !modifiers.isShared() && (modifiers.parent = this);
            variableDeclarator.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.MemberVariableDeclaration;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.modifiers;
                case 1: return this.variableDeclarator;
                case 2: return this.semicolonToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isMemberDeclaration(): boolean {
            return true;
        }

        public isClassElement(): boolean {
            return true;
        }

        public update(modifiers: ISyntaxList<ISyntaxToken>,
                      variableDeclarator: VariableDeclaratorSyntax,
                      semicolonToken: ISyntaxToken): MemberVariableDeclarationSyntax {
            if (this.modifiers === modifiers && this.variableDeclarator === variableDeclarator && this.semicolonToken === semicolonToken) {
                return this;
            }

            return new MemberVariableDeclarationSyntax(modifiers, variableDeclarator, semicolonToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class IndexMemberDeclarationSyntax extends SyntaxNode implements IClassElementSyntax {
        constructor(public modifiers: ISyntaxList<ISyntaxToken>,
                    public indexSignature: IndexSignatureSyntax,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(data); 

            !modifiers.isShared() && (modifiers.parent = this);
            indexSignature.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.IndexMemberDeclaration;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.modifiers;
                case 1: return this.indexSignature;
                case 2: return this.semicolonToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isClassElement(): boolean {
            return true;
        }

        public update(modifiers: ISyntaxList<ISyntaxToken>,
                      indexSignature: IndexSignatureSyntax,
                      semicolonToken: ISyntaxToken): IndexMemberDeclarationSyntax {
            if (this.modifiers === modifiers && this.indexSignature === indexSignature && this.semicolonToken === semicolonToken) {
                return this;
            }

            return new IndexMemberDeclarationSyntax(modifiers, indexSignature, semicolonToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ThrowStatementSyntax extends SyntaxNode implements IStatementSyntax {
        constructor(public throwKeyword: ISyntaxToken,
                    public expression: IExpressionSyntax,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(data); 

            throwKeyword.parent = this;
            expression.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ThrowStatement;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.throwKeyword;
                case 1: return this.expression;
                case 2: return this.semicolonToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isStatement(): boolean {
            return true;
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(throwKeyword: ISyntaxToken,
                      expression: IExpressionSyntax,
                      semicolonToken: ISyntaxToken): ThrowStatementSyntax {
            if (this.throwKeyword === throwKeyword && this.expression === expression && this.semicolonToken === semicolonToken) {
                return this;
            }

            return new ThrowStatementSyntax(throwKeyword, expression, semicolonToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ReturnStatementSyntax extends SyntaxNode implements IStatementSyntax {
        constructor(public returnKeyword: ISyntaxToken,
                    public expression: IExpressionSyntax,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(data); 

            returnKeyword.parent = this;
            expression && (expression.parent = this);
            semicolonToken && (semicolonToken.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ReturnStatement;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.returnKeyword;
                case 1: return this.expression;
                case 2: return this.semicolonToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isStatement(): boolean {
            return true;
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(returnKeyword: ISyntaxToken,
                      expression: IExpressionSyntax,
                      semicolonToken: ISyntaxToken): ReturnStatementSyntax {
            if (this.returnKeyword === returnKeyword && this.expression === expression && this.semicolonToken === semicolonToken) {
                return this;
            }

            return new ReturnStatementSyntax(returnKeyword, expression, semicolonToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ObjectCreationExpressionSyntax extends SyntaxNode implements IMemberExpressionSyntax {
        constructor(public newKeyword: ISyntaxToken,
                    public expression: IMemberExpressionSyntax,
                    public argumentList: ArgumentListSyntax,
                    data: number) {
            super(data); 

            newKeyword.parent = this;
            expression.parent = this;
            argumentList && (argumentList.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ObjectCreationExpression;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.newKeyword;
                case 1: return this.expression;
                case 2: return this.argumentList;
                default: throw Errors.invalidOperation();
            }
        }

        public isMemberExpression(): boolean {
            return true;
        }

        public isLeftHandSideExpression(): boolean {
            return true;
        }

        public isPostfixExpression(): boolean {
            return true;
        }

        public isUnaryExpression(): boolean {
            return true;
        }

        public isExpression(): boolean {
            return true;
        }

        public update(newKeyword: ISyntaxToken,
                      expression: IMemberExpressionSyntax,
                      argumentList: ArgumentListSyntax): ObjectCreationExpressionSyntax {
            if (this.newKeyword === newKeyword && this.expression === expression && this.argumentList === argumentList) {
                return this;
            }

            return new ObjectCreationExpressionSyntax(newKeyword, expression, argumentList, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class SwitchStatementSyntax extends SyntaxNode implements IStatementSyntax {
        constructor(public switchKeyword: ISyntaxToken,
                    public openParenToken: ISyntaxToken,
                    public expression: IExpressionSyntax,
                    public closeParenToken: ISyntaxToken,
                    public openBraceToken: ISyntaxToken,
                    public switchClauses: ISyntaxList<ISwitchClauseSyntax>,
                    public closeBraceToken: ISyntaxToken,
                    data: number) {
            super(data); 

            switchKeyword.parent = this;
            openParenToken.parent = this;
            expression.parent = this;
            closeParenToken.parent = this;
            openBraceToken.parent = this;
            !switchClauses.isShared() && (switchClauses.parent = this);
            closeBraceToken.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.SwitchStatement;
        }

        public childCount(): number {
            return 7;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.switchKeyword;
                case 1: return this.openParenToken;
                case 2: return this.expression;
                case 3: return this.closeParenToken;
                case 4: return this.openBraceToken;
                case 5: return this.switchClauses;
                case 6: return this.closeBraceToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isStatement(): boolean {
            return true;
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(switchKeyword: ISyntaxToken,
                      openParenToken: ISyntaxToken,
                      expression: IExpressionSyntax,
                      closeParenToken: ISyntaxToken,
                      openBraceToken: ISyntaxToken,
                      switchClauses: ISyntaxList<ISwitchClauseSyntax>,
                      closeBraceToken: ISyntaxToken): SwitchStatementSyntax {
            if (this.switchKeyword === switchKeyword && this.openParenToken === openParenToken && this.expression === expression && this.closeParenToken === closeParenToken && this.openBraceToken === openBraceToken && this.switchClauses === switchClauses && this.closeBraceToken === closeBraceToken) {
                return this;
            }

            return new SwitchStatementSyntax(switchKeyword, openParenToken, expression, closeParenToken, openBraceToken, switchClauses, closeBraceToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class CaseSwitchClauseSyntax extends SyntaxNode implements ISwitchClauseSyntax {
        constructor(public caseKeyword: ISyntaxToken,
                    public expression: IExpressionSyntax,
                    public colonToken: ISyntaxToken,
                    public statements: ISyntaxList<IStatementSyntax>,
                    data: number) {
            super(data); 

            caseKeyword.parent = this;
            expression.parent = this;
            colonToken.parent = this;
            !statements.isShared() && (statements.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.CaseSwitchClause;
        }

        public childCount(): number {
            return 4;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.caseKeyword;
                case 1: return this.expression;
                case 2: return this.colonToken;
                case 3: return this.statements;
                default: throw Errors.invalidOperation();
            }
        }

        public isSwitchClause(): boolean {
            return true;
        }

        public update(caseKeyword: ISyntaxToken,
                      expression: IExpressionSyntax,
                      colonToken: ISyntaxToken,
                      statements: ISyntaxList<IStatementSyntax>): CaseSwitchClauseSyntax {
            if (this.caseKeyword === caseKeyword && this.expression === expression && this.colonToken === colonToken && this.statements === statements) {
                return this;
            }

            return new CaseSwitchClauseSyntax(caseKeyword, expression, colonToken, statements, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class DefaultSwitchClauseSyntax extends SyntaxNode implements ISwitchClauseSyntax {
        constructor(public defaultKeyword: ISyntaxToken,
                    public colonToken: ISyntaxToken,
                    public statements: ISyntaxList<IStatementSyntax>,
                    data: number) {
            super(data); 

            defaultKeyword.parent = this;
            colonToken.parent = this;
            !statements.isShared() && (statements.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.DefaultSwitchClause;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.defaultKeyword;
                case 1: return this.colonToken;
                case 2: return this.statements;
                default: throw Errors.invalidOperation();
            }
        }

        public isSwitchClause(): boolean {
            return true;
        }

        public update(defaultKeyword: ISyntaxToken,
                      colonToken: ISyntaxToken,
                      statements: ISyntaxList<IStatementSyntax>): DefaultSwitchClauseSyntax {
            if (this.defaultKeyword === defaultKeyword && this.colonToken === colonToken && this.statements === statements) {
                return this;
            }

            return new DefaultSwitchClauseSyntax(defaultKeyword, colonToken, statements, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class BreakStatementSyntax extends SyntaxNode implements IStatementSyntax {
        constructor(public breakKeyword: ISyntaxToken,
                    public identifier: ISyntaxToken,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(data); 

            breakKeyword.parent = this;
            identifier && (identifier.parent = this);
            semicolonToken && (semicolonToken.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.BreakStatement;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.breakKeyword;
                case 1: return this.identifier;
                case 2: return this.semicolonToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isStatement(): boolean {
            return true;
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(breakKeyword: ISyntaxToken,
                      identifier: ISyntaxToken,
                      semicolonToken: ISyntaxToken): BreakStatementSyntax {
            if (this.breakKeyword === breakKeyword && this.identifier === identifier && this.semicolonToken === semicolonToken) {
                return this;
            }

            return new BreakStatementSyntax(breakKeyword, identifier, semicolonToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ContinueStatementSyntax extends SyntaxNode implements IStatementSyntax {
        constructor(public continueKeyword: ISyntaxToken,
                    public identifier: ISyntaxToken,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(data); 

            continueKeyword.parent = this;
            identifier && (identifier.parent = this);
            semicolonToken && (semicolonToken.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ContinueStatement;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.continueKeyword;
                case 1: return this.identifier;
                case 2: return this.semicolonToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isStatement(): boolean {
            return true;
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(continueKeyword: ISyntaxToken,
                      identifier: ISyntaxToken,
                      semicolonToken: ISyntaxToken): ContinueStatementSyntax {
            if (this.continueKeyword === continueKeyword && this.identifier === identifier && this.semicolonToken === semicolonToken) {
                return this;
            }

            return new ContinueStatementSyntax(continueKeyword, identifier, semicolonToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ForStatementSyntax extends SyntaxNode implements IStatementSyntax {
        constructor(public forKeyword: ISyntaxToken,
                    public openParenToken: ISyntaxToken,
                    public variableDeclaration: VariableDeclarationSyntax,
                    public initializer: IExpressionSyntax,
                    public firstSemicolonToken: ISyntaxToken,
                    public condition: IExpressionSyntax,
                    public secondSemicolonToken: ISyntaxToken,
                    public incrementor: IExpressionSyntax,
                    public closeParenToken: ISyntaxToken,
                    public statement: IStatementSyntax,
                    data: number) {
            super(data); 

            forKeyword.parent = this;
            openParenToken.parent = this;
            variableDeclaration && (variableDeclaration.parent = this);
            initializer && (initializer.parent = this);
            firstSemicolonToken.parent = this;
            condition && (condition.parent = this);
            secondSemicolonToken.parent = this;
            incrementor && (incrementor.parent = this);
            closeParenToken.parent = this;
            statement.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ForStatement;
        }

        public childCount(): number {
            return 10;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.forKeyword;
                case 1: return this.openParenToken;
                case 2: return this.variableDeclaration;
                case 3: return this.initializer;
                case 4: return this.firstSemicolonToken;
                case 5: return this.condition;
                case 6: return this.secondSemicolonToken;
                case 7: return this.incrementor;
                case 8: return this.closeParenToken;
                case 9: return this.statement;
                default: throw Errors.invalidOperation();
            }
        }

        public isStatement(): boolean {
            return true;
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(forKeyword: ISyntaxToken,
                      openParenToken: ISyntaxToken,
                      variableDeclaration: VariableDeclarationSyntax,
                      initializer: IExpressionSyntax,
                      firstSemicolonToken: ISyntaxToken,
                      condition: IExpressionSyntax,
                      secondSemicolonToken: ISyntaxToken,
                      incrementor: IExpressionSyntax,
                      closeParenToken: ISyntaxToken,
                      statement: IStatementSyntax): ForStatementSyntax {
            if (this.forKeyword === forKeyword && this.openParenToken === openParenToken && this.variableDeclaration === variableDeclaration && this.initializer === initializer && this.firstSemicolonToken === firstSemicolonToken && this.condition === condition && this.secondSemicolonToken === secondSemicolonToken && this.incrementor === incrementor && this.closeParenToken === closeParenToken && this.statement === statement) {
                return this;
            }

            return new ForStatementSyntax(forKeyword, openParenToken, variableDeclaration, initializer, firstSemicolonToken, condition, secondSemicolonToken, incrementor, closeParenToken, statement, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ForInStatementSyntax extends SyntaxNode implements IStatementSyntax {
        constructor(public forKeyword: ISyntaxToken,
                    public openParenToken: ISyntaxToken,
                    public variableDeclaration: VariableDeclarationSyntax,
                    public left: IExpressionSyntax,
                    public inKeyword: ISyntaxToken,
                    public expression: IExpressionSyntax,
                    public closeParenToken: ISyntaxToken,
                    public statement: IStatementSyntax,
                    data: number) {
            super(data); 

            forKeyword.parent = this;
            openParenToken.parent = this;
            variableDeclaration && (variableDeclaration.parent = this);
            left && (left.parent = this);
            inKeyword.parent = this;
            expression.parent = this;
            closeParenToken.parent = this;
            statement.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ForInStatement;
        }

        public childCount(): number {
            return 8;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.forKeyword;
                case 1: return this.openParenToken;
                case 2: return this.variableDeclaration;
                case 3: return this.left;
                case 4: return this.inKeyword;
                case 5: return this.expression;
                case 6: return this.closeParenToken;
                case 7: return this.statement;
                default: throw Errors.invalidOperation();
            }
        }

        public isStatement(): boolean {
            return true;
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(forKeyword: ISyntaxToken,
                      openParenToken: ISyntaxToken,
                      variableDeclaration: VariableDeclarationSyntax,
                      left: IExpressionSyntax,
                      inKeyword: ISyntaxToken,
                      expression: IExpressionSyntax,
                      closeParenToken: ISyntaxToken,
                      statement: IStatementSyntax): ForInStatementSyntax {
            if (this.forKeyword === forKeyword && this.openParenToken === openParenToken && this.variableDeclaration === variableDeclaration && this.left === left && this.inKeyword === inKeyword && this.expression === expression && this.closeParenToken === closeParenToken && this.statement === statement) {
                return this;
            }

            return new ForInStatementSyntax(forKeyword, openParenToken, variableDeclaration, left, inKeyword, expression, closeParenToken, statement, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class WhileStatementSyntax extends SyntaxNode implements IStatementSyntax {
        constructor(public whileKeyword: ISyntaxToken,
                    public openParenToken: ISyntaxToken,
                    public condition: IExpressionSyntax,
                    public closeParenToken: ISyntaxToken,
                    public statement: IStatementSyntax,
                    data: number) {
            super(data); 

            whileKeyword.parent = this;
            openParenToken.parent = this;
            condition.parent = this;
            closeParenToken.parent = this;
            statement.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.WhileStatement;
        }

        public childCount(): number {
            return 5;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.whileKeyword;
                case 1: return this.openParenToken;
                case 2: return this.condition;
                case 3: return this.closeParenToken;
                case 4: return this.statement;
                default: throw Errors.invalidOperation();
            }
        }

        public isStatement(): boolean {
            return true;
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(whileKeyword: ISyntaxToken,
                      openParenToken: ISyntaxToken,
                      condition: IExpressionSyntax,
                      closeParenToken: ISyntaxToken,
                      statement: IStatementSyntax): WhileStatementSyntax {
            if (this.whileKeyword === whileKeyword && this.openParenToken === openParenToken && this.condition === condition && this.closeParenToken === closeParenToken && this.statement === statement) {
                return this;
            }

            return new WhileStatementSyntax(whileKeyword, openParenToken, condition, closeParenToken, statement, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class WithStatementSyntax extends SyntaxNode implements IStatementSyntax {
        constructor(public withKeyword: ISyntaxToken,
                    public openParenToken: ISyntaxToken,
                    public condition: IExpressionSyntax,
                    public closeParenToken: ISyntaxToken,
                    public statement: IStatementSyntax,
                    data: number) {
            super(data); 

            withKeyword.parent = this;
            openParenToken.parent = this;
            condition.parent = this;
            closeParenToken.parent = this;
            statement.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.WithStatement;
        }

        public childCount(): number {
            return 5;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.withKeyword;
                case 1: return this.openParenToken;
                case 2: return this.condition;
                case 3: return this.closeParenToken;
                case 4: return this.statement;
                default: throw Errors.invalidOperation();
            }
        }

        public isStatement(): boolean {
            return true;
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(withKeyword: ISyntaxToken,
                      openParenToken: ISyntaxToken,
                      condition: IExpressionSyntax,
                      closeParenToken: ISyntaxToken,
                      statement: IStatementSyntax): WithStatementSyntax {
            if (this.withKeyword === withKeyword && this.openParenToken === openParenToken && this.condition === condition && this.closeParenToken === closeParenToken && this.statement === statement) {
                return this;
            }

            return new WithStatementSyntax(withKeyword, openParenToken, condition, closeParenToken, statement, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class EnumDeclarationSyntax extends SyntaxNode implements IModuleElementSyntax {
        constructor(public modifiers: ISyntaxList<ISyntaxToken>,
                    public enumKeyword: ISyntaxToken,
                    public identifier: ISyntaxToken,
                    public openBraceToken: ISyntaxToken,
                    public enumElements: ISeparatedSyntaxList<EnumElementSyntax>,
                    public closeBraceToken: ISyntaxToken,
                    data: number) {
            super(data); 

            !modifiers.isShared() && (modifiers.parent = this);
            enumKeyword.parent = this;
            identifier.parent = this;
            openBraceToken.parent = this;
            !enumElements.isShared() && (enumElements.parent = this);
            closeBraceToken.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.EnumDeclaration;
        }

        public childCount(): number {
            return 6;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.modifiers;
                case 1: return this.enumKeyword;
                case 2: return this.identifier;
                case 3: return this.openBraceToken;
                case 4: return this.enumElements;
                case 5: return this.closeBraceToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(modifiers: ISyntaxList<ISyntaxToken>,
                      enumKeyword: ISyntaxToken,
                      identifier: ISyntaxToken,
                      openBraceToken: ISyntaxToken,
                      enumElements: ISeparatedSyntaxList<EnumElementSyntax>,
                      closeBraceToken: ISyntaxToken): EnumDeclarationSyntax {
            if (this.modifiers === modifiers && this.enumKeyword === enumKeyword && this.identifier === identifier && this.openBraceToken === openBraceToken && this.enumElements === enumElements && this.closeBraceToken === closeBraceToken) {
                return this;
            }

            return new EnumDeclarationSyntax(modifiers, enumKeyword, identifier, openBraceToken, enumElements, closeBraceToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class EnumElementSyntax extends SyntaxNode {
        constructor(public propertyName: ISyntaxToken,
                    public equalsValueClause: EqualsValueClauseSyntax,
                    data: number) {
            super(data); 

            propertyName.parent = this;
            equalsValueClause && (equalsValueClause.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.EnumElement;
        }

        public childCount(): number {
            return 2;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.propertyName;
                case 1: return this.equalsValueClause;
                default: throw Errors.invalidOperation();
            }
        }

        public update(propertyName: ISyntaxToken,
                      equalsValueClause: EqualsValueClauseSyntax): EnumElementSyntax {
            if (this.propertyName === propertyName && this.equalsValueClause === equalsValueClause) {
                return this;
            }

            return new EnumElementSyntax(propertyName, equalsValueClause, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class CastExpressionSyntax extends SyntaxNode implements IUnaryExpressionSyntax {
        constructor(public lessThanToken: ISyntaxToken,
                    public type: ITypeSyntax,
                    public greaterThanToken: ISyntaxToken,
                    public expression: IUnaryExpressionSyntax,
                    data: number) {
            super(data); 

            lessThanToken.parent = this;
            type.parent = this;
            greaterThanToken.parent = this;
            expression.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.CastExpression;
        }

        public childCount(): number {
            return 4;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.lessThanToken;
                case 1: return this.type;
                case 2: return this.greaterThanToken;
                case 3: return this.expression;
                default: throw Errors.invalidOperation();
            }
        }

        public isUnaryExpression(): boolean {
            return true;
        }

        public isExpression(): boolean {
            return true;
        }

        public update(lessThanToken: ISyntaxToken,
                      type: ITypeSyntax,
                      greaterThanToken: ISyntaxToken,
                      expression: IUnaryExpressionSyntax): CastExpressionSyntax {
            if (this.lessThanToken === lessThanToken && this.type === type && this.greaterThanToken === greaterThanToken && this.expression === expression) {
                return this;
            }

            return new CastExpressionSyntax(lessThanToken, type, greaterThanToken, expression, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class ObjectLiteralExpressionSyntax extends SyntaxNode implements IPrimaryExpressionSyntax {
        constructor(public openBraceToken: ISyntaxToken,
                    public propertyAssignments: ISeparatedSyntaxList<IPropertyAssignmentSyntax>,
                    public closeBraceToken: ISyntaxToken,
                    data: number) {
            super(data); 

            openBraceToken.parent = this;
            !propertyAssignments.isShared() && (propertyAssignments.parent = this);
            closeBraceToken.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.ObjectLiteralExpression;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.openBraceToken;
                case 1: return this.propertyAssignments;
                case 2: return this.closeBraceToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isPrimaryExpression(): boolean {
            return true;
        }

        public isMemberExpression(): boolean {
            return true;
        }

        public isLeftHandSideExpression(): boolean {
            return true;
        }

        public isPostfixExpression(): boolean {
            return true;
        }

        public isUnaryExpression(): boolean {
            return true;
        }

        public isExpression(): boolean {
            return true;
        }

        public update(openBraceToken: ISyntaxToken,
                      propertyAssignments: ISeparatedSyntaxList<IPropertyAssignmentSyntax>,
                      closeBraceToken: ISyntaxToken): ObjectLiteralExpressionSyntax {
            if (this.openBraceToken === openBraceToken && this.propertyAssignments === propertyAssignments && this.closeBraceToken === closeBraceToken) {
                return this;
            }

            return new ObjectLiteralExpressionSyntax(openBraceToken, propertyAssignments, closeBraceToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class SimplePropertyAssignmentSyntax extends SyntaxNode implements IPropertyAssignmentSyntax {
        constructor(public propertyName: ISyntaxToken,
                    public colonToken: ISyntaxToken,
                    public expression: IExpressionSyntax,
                    data: number) {
            super(data); 

            propertyName.parent = this;
            colonToken.parent = this;
            expression.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.SimplePropertyAssignment;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.propertyName;
                case 1: return this.colonToken;
                case 2: return this.expression;
                default: throw Errors.invalidOperation();
            }
        }

        public isPropertyAssignment(): boolean {
            return true;
        }

        public update(propertyName: ISyntaxToken,
                      colonToken: ISyntaxToken,
                      expression: IExpressionSyntax): SimplePropertyAssignmentSyntax {
            if (this.propertyName === propertyName && this.colonToken === colonToken && this.expression === expression) {
                return this;
            }

            return new SimplePropertyAssignmentSyntax(propertyName, colonToken, expression, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class FunctionPropertyAssignmentSyntax extends SyntaxNode implements IPropertyAssignmentSyntax {
        constructor(public propertyName: ISyntaxToken,
                    public callSignature: CallSignatureSyntax,
                    public block: BlockSyntax,
                    data: number) {
            super(data); 

            propertyName.parent = this;
            callSignature.parent = this;
            block.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.FunctionPropertyAssignment;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.propertyName;
                case 1: return this.callSignature;
                case 2: return this.block;
                default: throw Errors.invalidOperation();
            }
        }

        public isPropertyAssignment(): boolean {
            return true;
        }

        public update(propertyName: ISyntaxToken,
                      callSignature: CallSignatureSyntax,
                      block: BlockSyntax): FunctionPropertyAssignmentSyntax {
            if (this.propertyName === propertyName && this.callSignature === callSignature && this.block === block) {
                return this;
            }

            return new FunctionPropertyAssignmentSyntax(propertyName, callSignature, block, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class FunctionExpressionSyntax extends SyntaxNode implements IPrimaryExpressionSyntax {
        constructor(public functionKeyword: ISyntaxToken,
                    public identifier: ISyntaxToken,
                    public callSignature: CallSignatureSyntax,
                    public block: BlockSyntax,
                    data: number) {
            super(data); 

            functionKeyword.parent = this;
            identifier && (identifier.parent = this);
            callSignature.parent = this;
            block.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.FunctionExpression;
        }

        public childCount(): number {
            return 4;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.functionKeyword;
                case 1: return this.identifier;
                case 2: return this.callSignature;
                case 3: return this.block;
                default: throw Errors.invalidOperation();
            }
        }

        public isPrimaryExpression(): boolean {
            return true;
        }

        public isMemberExpression(): boolean {
            return true;
        }

        public isLeftHandSideExpression(): boolean {
            return true;
        }

        public isPostfixExpression(): boolean {
            return true;
        }

        public isUnaryExpression(): boolean {
            return true;
        }

        public isExpression(): boolean {
            return true;
        }

        public update(functionKeyword: ISyntaxToken,
                      identifier: ISyntaxToken,
                      callSignature: CallSignatureSyntax,
                      block: BlockSyntax): FunctionExpressionSyntax {
            if (this.functionKeyword === functionKeyword && this.identifier === identifier && this.callSignature === callSignature && this.block === block) {
                return this;
            }

            return new FunctionExpressionSyntax(functionKeyword, identifier, callSignature, block, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class EmptyStatementSyntax extends SyntaxNode implements IStatementSyntax {
        constructor(public semicolonToken: ISyntaxToken,
                    data: number) {
            super(data); 

            semicolonToken.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.EmptyStatement;
        }

        public childCount(): number {
            return 1;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.semicolonToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isStatement(): boolean {
            return true;
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(semicolonToken: ISyntaxToken): EmptyStatementSyntax {
            if (this.semicolonToken === semicolonToken) {
                return this;
            }

            return new EmptyStatementSyntax(semicolonToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class TryStatementSyntax extends SyntaxNode implements IStatementSyntax {
        constructor(public tryKeyword: ISyntaxToken,
                    public block: BlockSyntax,
                    public catchClause: CatchClauseSyntax,
                    public finallyClause: FinallyClauseSyntax,
                    data: number) {
            super(data); 

            tryKeyword.parent = this;
            block.parent = this;
            catchClause && (catchClause.parent = this);
            finallyClause && (finallyClause.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.TryStatement;
        }

        public childCount(): number {
            return 4;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.tryKeyword;
                case 1: return this.block;
                case 2: return this.catchClause;
                case 3: return this.finallyClause;
                default: throw Errors.invalidOperation();
            }
        }

        public isStatement(): boolean {
            return true;
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(tryKeyword: ISyntaxToken,
                      block: BlockSyntax,
                      catchClause: CatchClauseSyntax,
                      finallyClause: FinallyClauseSyntax): TryStatementSyntax {
            if (this.tryKeyword === tryKeyword && this.block === block && this.catchClause === catchClause && this.finallyClause === finallyClause) {
                return this;
            }

            return new TryStatementSyntax(tryKeyword, block, catchClause, finallyClause, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class CatchClauseSyntax extends SyntaxNode {
        constructor(public catchKeyword: ISyntaxToken,
                    public openParenToken: ISyntaxToken,
                    public identifier: ISyntaxToken,
                    public typeAnnotation: TypeAnnotationSyntax,
                    public closeParenToken: ISyntaxToken,
                    public block: BlockSyntax,
                    data: number) {
            super(data); 

            catchKeyword.parent = this;
            openParenToken.parent = this;
            identifier.parent = this;
            typeAnnotation && (typeAnnotation.parent = this);
            closeParenToken.parent = this;
            block.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.CatchClause;
        }

        public childCount(): number {
            return 6;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.catchKeyword;
                case 1: return this.openParenToken;
                case 2: return this.identifier;
                case 3: return this.typeAnnotation;
                case 4: return this.closeParenToken;
                case 5: return this.block;
                default: throw Errors.invalidOperation();
            }
        }

        public update(catchKeyword: ISyntaxToken,
                      openParenToken: ISyntaxToken,
                      identifier: ISyntaxToken,
                      typeAnnotation: TypeAnnotationSyntax,
                      closeParenToken: ISyntaxToken,
                      block: BlockSyntax): CatchClauseSyntax {
            if (this.catchKeyword === catchKeyword && this.openParenToken === openParenToken && this.identifier === identifier && this.typeAnnotation === typeAnnotation && this.closeParenToken === closeParenToken && this.block === block) {
                return this;
            }

            return new CatchClauseSyntax(catchKeyword, openParenToken, identifier, typeAnnotation, closeParenToken, block, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class FinallyClauseSyntax extends SyntaxNode {
        constructor(public finallyKeyword: ISyntaxToken,
                    public block: BlockSyntax,
                    data: number) {
            super(data); 

            finallyKeyword.parent = this;
            block.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.FinallyClause;
        }

        public childCount(): number {
            return 2;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.finallyKeyword;
                case 1: return this.block;
                default: throw Errors.invalidOperation();
            }
        }

        public update(finallyKeyword: ISyntaxToken,
                      block: BlockSyntax): FinallyClauseSyntax {
            if (this.finallyKeyword === finallyKeyword && this.block === block) {
                return this;
            }

            return new FinallyClauseSyntax(finallyKeyword, block, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class LabeledStatementSyntax extends SyntaxNode implements IStatementSyntax {
        constructor(public identifier: ISyntaxToken,
                    public colonToken: ISyntaxToken,
                    public statement: IStatementSyntax,
                    data: number) {
            super(data); 

            identifier.parent = this;
            colonToken.parent = this;
            statement.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.LabeledStatement;
        }

        public childCount(): number {
            return 3;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.identifier;
                case 1: return this.colonToken;
                case 2: return this.statement;
                default: throw Errors.invalidOperation();
            }
        }

        public isStatement(): boolean {
            return true;
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(identifier: ISyntaxToken,
                      colonToken: ISyntaxToken,
                      statement: IStatementSyntax): LabeledStatementSyntax {
            if (this.identifier === identifier && this.colonToken === colonToken && this.statement === statement) {
                return this;
            }

            return new LabeledStatementSyntax(identifier, colonToken, statement, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class DoStatementSyntax extends SyntaxNode implements IStatementSyntax {
        constructor(public doKeyword: ISyntaxToken,
                    public statement: IStatementSyntax,
                    public whileKeyword: ISyntaxToken,
                    public openParenToken: ISyntaxToken,
                    public condition: IExpressionSyntax,
                    public closeParenToken: ISyntaxToken,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(data); 

            doKeyword.parent = this;
            statement.parent = this;
            whileKeyword.parent = this;
            openParenToken.parent = this;
            condition.parent = this;
            closeParenToken.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.DoStatement;
        }

        public childCount(): number {
            return 7;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.doKeyword;
                case 1: return this.statement;
                case 2: return this.whileKeyword;
                case 3: return this.openParenToken;
                case 4: return this.condition;
                case 5: return this.closeParenToken;
                case 6: return this.semicolonToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isStatement(): boolean {
            return true;
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(doKeyword: ISyntaxToken,
                      statement: IStatementSyntax,
                      whileKeyword: ISyntaxToken,
                      openParenToken: ISyntaxToken,
                      condition: IExpressionSyntax,
                      closeParenToken: ISyntaxToken,
                      semicolonToken: ISyntaxToken): DoStatementSyntax {
            if (this.doKeyword === doKeyword && this.statement === statement && this.whileKeyword === whileKeyword && this.openParenToken === openParenToken && this.condition === condition && this.closeParenToken === closeParenToken && this.semicolonToken === semicolonToken) {
                return this;
            }

            return new DoStatementSyntax(doKeyword, statement, whileKeyword, openParenToken, condition, closeParenToken, semicolonToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class TypeOfExpressionSyntax extends SyntaxNode implements IUnaryExpressionSyntax {
        constructor(public typeOfKeyword: ISyntaxToken,
                    public expression: IUnaryExpressionSyntax,
                    data: number) {
            super(data); 

            typeOfKeyword.parent = this;
            expression.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.TypeOfExpression;
        }

        public childCount(): number {
            return 2;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.typeOfKeyword;
                case 1: return this.expression;
                default: throw Errors.invalidOperation();
            }
        }

        public isUnaryExpression(): boolean {
            return true;
        }

        public isExpression(): boolean {
            return true;
        }

        public update(typeOfKeyword: ISyntaxToken,
                      expression: IUnaryExpressionSyntax): TypeOfExpressionSyntax {
            if (this.typeOfKeyword === typeOfKeyword && this.expression === expression) {
                return this;
            }

            return new TypeOfExpressionSyntax(typeOfKeyword, expression, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class DeleteExpressionSyntax extends SyntaxNode implements IUnaryExpressionSyntax {
        constructor(public deleteKeyword: ISyntaxToken,
                    public expression: IUnaryExpressionSyntax,
                    data: number) {
            super(data); 

            deleteKeyword.parent = this;
            expression.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.DeleteExpression;
        }

        public childCount(): number {
            return 2;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.deleteKeyword;
                case 1: return this.expression;
                default: throw Errors.invalidOperation();
            }
        }

        public isUnaryExpression(): boolean {
            return true;
        }

        public isExpression(): boolean {
            return true;
        }

        public update(deleteKeyword: ISyntaxToken,
                      expression: IUnaryExpressionSyntax): DeleteExpressionSyntax {
            if (this.deleteKeyword === deleteKeyword && this.expression === expression) {
                return this;
            }

            return new DeleteExpressionSyntax(deleteKeyword, expression, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class VoidExpressionSyntax extends SyntaxNode implements IUnaryExpressionSyntax {
        constructor(public voidKeyword: ISyntaxToken,
                    public expression: IUnaryExpressionSyntax,
                    data: number) {
            super(data); 

            voidKeyword.parent = this;
            expression.parent = this;
        }

        public kind(): SyntaxKind {
            return SyntaxKind.VoidExpression;
        }

        public childCount(): number {
            return 2;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.voidKeyword;
                case 1: return this.expression;
                default: throw Errors.invalidOperation();
            }
        }

        public isUnaryExpression(): boolean {
            return true;
        }

        public isExpression(): boolean {
            return true;
        }

        public update(voidKeyword: ISyntaxToken,
                      expression: IUnaryExpressionSyntax): VoidExpressionSyntax {
            if (this.voidKeyword === voidKeyword && this.expression === expression) {
                return this;
            }

            return new VoidExpressionSyntax(voidKeyword, expression, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }

    export class DebuggerStatementSyntax extends SyntaxNode implements IStatementSyntax {
        constructor(public debuggerKeyword: ISyntaxToken,
                    public semicolonToken: ISyntaxToken,
                    data: number) {
            super(data); 

            debuggerKeyword.parent = this;
            semicolonToken && (semicolonToken.parent = this);
        }

        public kind(): SyntaxKind {
            return SyntaxKind.DebuggerStatement;
        }

        public childCount(): number {
            return 2;
        }

        public childAt(slot: number): ISyntaxElement {
            switch (slot) {
                case 0: return this.debuggerKeyword;
                case 1: return this.semicolonToken;
                default: throw Errors.invalidOperation();
            }
        }

        public isStatement(): boolean {
            return true;
        }

        public isModuleElement(): boolean {
            return true;
        }

        public update(debuggerKeyword: ISyntaxToken,
                      semicolonToken: ISyntaxToken): DebuggerStatementSyntax {
            if (this.debuggerKeyword === debuggerKeyword && this.semicolonToken === semicolonToken) {
                return this;
            }

            return new DebuggerStatementSyntax(debuggerKeyword, semicolonToken, /*parsedInStrictMode:*/ this.parsedInStrictMode() ? SyntaxConstants.NodeParsedInStrictModeMask : 0);
        }
    }
}