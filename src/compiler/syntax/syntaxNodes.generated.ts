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
    }

    export class SimpleArrowFunctionExpressionSyntax extends SyntaxNode implements IUnaryExpressionSyntax {
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

        public isUnaryExpression(): boolean {
            return true;
        }

        public isExpression(): boolean {
            return true;
        }
    }

    export class ParenthesizedArrowFunctionExpressionSyntax extends SyntaxNode implements IUnaryExpressionSyntax {
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

        public isUnaryExpression(): boolean {
            return true;
        }

        public isExpression(): boolean {
            return true;
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
    }
}