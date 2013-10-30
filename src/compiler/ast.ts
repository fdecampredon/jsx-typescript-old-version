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
    export interface IASTSpan {
        minChar: number;
        limChar: number;
    }

    export class ASTSpan implements IASTSpan {
        public minChar: number = -1;  // -1 = "undefined" or "compiler generated"
        public limChar: number = -1;  // -1 = "undefined" or "compiler generated"
        public trailingTriviaWidth = 0;
    }

    var astID = 0;

    export function structuralEqualsNotIncludingPosition(ast1: AST, ast2: AST): boolean {
        return structuralEquals(ast1, ast2, false);
    }

    export function structuralEqualsIncludingPosition(ast1: AST, ast2: AST): boolean {
        return structuralEquals(ast1, ast2, true);
    }

    function commentStructuralEqualsNotIncludingPosition(ast1: Comment, ast2: Comment): boolean {
        return commentStructuralEquals(ast1, ast2, false);
    }

    function commentStructuralEqualsIncludingPosition(ast1: Comment, ast2: Comment): boolean {
        return commentStructuralEquals(ast1, ast2, true);
    }

    function structuralEquals(ast1: AST, ast2: AST, includingPosition: boolean): boolean {
        if (ast1 === ast2) {
            return true;
        }

        return ast1 !== null && ast2 !== null &&
               ast1.nodeType() === ast2.nodeType() &&
               ast1.structuralEquals(ast2, includingPosition);
    }

    function commentStructuralEquals(ast1: Comment, ast2: Comment, includingPosition: boolean): boolean {
        if (ast1 === ast2) {
            return true;
        }

        return ast1 !== null && ast2 !== null &&
            ast1.structuralEquals(ast2, includingPosition);
    }

    function astArrayStructuralEquals(array1: AST[], array2: AST[], includingPosition: boolean): boolean {
        return ArrayUtilities.sequenceEquals(array1, array2,
            includingPosition ? structuralEqualsIncludingPosition : structuralEqualsNotIncludingPosition);
    }

    function commentArrayStructuralEquals(array1: Comment[], array2: Comment[], includingPosition: boolean): boolean {
        return ArrayUtilities.sequenceEquals(array1, array2,
            includingPosition ? commentStructuralEqualsIncludingPosition : commentStructuralEqualsNotIncludingPosition);
    }

    export class AST implements IASTSpan {
        public parent: AST = null;
        public minChar: number = -1;  // -1 = "undefined" or "compiler generated"
        public limChar: number = -1;  // -1 = "undefined" or "compiler generated"
        public trailingTriviaWidth = 0;

        private _flags = ASTFlags.None;

        public typeCheckPhase = -1;

        private _astID: number = astID++;

        private _preComments: Comment[] = null;
        private _postComments: Comment[] = null;
        private _docComments: Comment[] = null;

        constructor() {
        }

        public astID(): number {
            return this._astID;
        }

        public fileName(): string {
            return this.parent.fileName();
        }

        public nodeType(): NodeType {
            throw Errors.abstract();
        }

        public preComments(): Comment[] {
            return this._preComments;
        }

        public postComments(): Comment[] {
            return this._postComments;
        }

        public setPreComments(comments: Comment[]) {
            if (comments && comments.length) {
                this._preComments = comments;
            }
            else if (this._preComments) {
                this._preComments = null;
            }
        }

        public setPostComments(comments: Comment[]) {
            if (comments && comments.length) {
                this._postComments = comments;
            }
            else if (this._postComments) {
                this._postComments = null;
            }
        }

        public getFlags(): ASTFlags {
            return this._flags;
        }

        // Must only be called from SyntaxTreeVisitor
        public setFlags(flags: ASTFlags): void {
            this._flags = flags;
        }

        public getLength(): number {
            return this.limChar - this.minChar;
        }

        public structuralEquals(ast: AST, includingPosition: boolean): boolean {
            if (includingPosition) {
                if (this.minChar !== ast.minChar || this.limChar !== ast.limChar) {
                    return false;
                }
            }

            return this._flags === ast._flags &&
                commentArrayStructuralEquals(this.preComments(), ast.preComments(), includingPosition) &&
                commentArrayStructuralEquals(this.postComments(), ast.postComments(), includingPosition);
        }
    }

    export class ASTList extends AST {
        constructor(private _fileName: string, public members: AST[], public separatorCount?: number) {
            super();

            for (var i = 0, n = members.length; i < n; i++) {
                members[i].parent = this;
            }
        }

        public fileName(): string {
            return this._fileName;
        }

        public nodeType(): NodeType {
            return NodeType.List;
        }

        public structuralEquals(ast: ASTList, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   astArrayStructuralEquals(this.members, ast.members, includingPosition);
        }
    }

    export class Script extends AST {
        private _moduleFlags = ModuleFlags.None;

        constructor(public moduleElements: ASTList,
                    private _fileName: string,
                    public isExternalModule: boolean,
                    public amdDependencies: string[]) {
            super();
            moduleElements && (moduleElements.parent = this);
        }

        public fileName(): string {
            return this._fileName;
        }

        public isDeclareFile(): boolean {
            return isDTSFile(this.fileName());
        }

        public nodeType(): NodeType {
            return NodeType.Script;
        }

        public getModuleFlags(): ModuleFlags {
            return this._moduleFlags;
        }

        public setModuleFlags(flags: ModuleFlags): void {
            this._moduleFlags = flags;
        }

        public structuralEquals(ast: Script, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.moduleElements, ast.moduleElements, includingPosition);
        }
    }

    export class Identifier extends AST {
        // 'actualText' is the text that the user has entered for the identifier. the text might 
        // include any Unicode escape sequences (e.g.: \u0041 for 'A'). 'text', however, contains 
        // the resolved value of any escape sequences in the actual text; so in the previous 
        // example, actualText = '\u0041', text = 'A'.
        // Also, in the case where actualText is "__proto__", we substitute "#__proto__" as the _text
        // so that we can safely use it as a key in a javascript object.
        //
        // For purposes of finding a symbol, use text, as this will allow you to match all 
        // variations of the variable text. For full-fidelity translation of the user input, such
        // as emitting, use the actualText field.
        constructor(private _text: string, private _valueText: string, public isStringOrNumericLiteral: boolean) {
            super();
        }

        public text(): string {
            return this._text;
        }

        public valueText(): string {
            if (!this._valueText) {
                // In the case where actualText is "__proto__", we substitute "#__proto__" as the _text
                // so that we can safely use it as a key in a javascript object.
                var text = this._text;
                if (text === "__proto__") {
                    this._valueText = "#__proto__";
                }
                else {
                    this._valueText = Syntax.massageEscapes(text);
                }
            }

            return this._valueText;
        }

        public nodeType(): NodeType {
            return NodeType.Name;
        }

        public structuralEquals(ast: Identifier, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   this._text === ast._text;
        }
    }

    export class LiteralExpression extends AST {
        constructor(private _nodeType: NodeType) {
            super();
        }

        public nodeType(): NodeType {
            return this._nodeType;
        }

        public structuralEquals(ast: ParenthesizedExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition);
        }
    }

    export class ThisExpression extends AST {
        public nodeType(): NodeType {
            return NodeType.ThisExpression;
        }

        public structuralEquals(ast: ParenthesizedExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition);
        }
    }

    export class SuperExpression extends AST {
        public nodeType(): NodeType {
            return NodeType.SuperExpression;
        }

        public structuralEquals(ast: ParenthesizedExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition);
        }
    }

    export class NumericLiteral extends AST {
        constructor(public value: number,
                    private _text: string,
                    private _valueText: string) {
            super();
        }

        public text(): string { return this._text; }
        public valueText(): string { return this._valueText; }

        public nodeType(): NodeType {
            return NodeType.NumericLiteral;
        }

        public structuralEquals(ast: NumericLiteral, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   (this.value === ast.value || (isNaN(this.value) && isNaN(ast.value))) &&
                   this._text === ast._text;
        }
    }

    export class RegularExpressionLiteral extends AST {
        constructor(public text: string) {
            super();
        }

        public nodeType(): NodeType {
            return NodeType.RegularExpressionLiteral;
        }

        public structuralEquals(ast: RegularExpressionLiteral, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   this.text === ast.text;
        }
    }

    export class StringLiteral extends AST {
        constructor(private _text: string, private _valueText: string) {
            super();
        }

        public text(): string { return this._text; }
        public valueText(): string { return this._valueText; }

        public nodeType(): NodeType {
            return NodeType.StringLiteral;
        }

        public structuralEquals(ast: StringLiteral, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   this._text === ast._text;
        }
    }

    export class TypeReference extends AST {
        constructor(public term: AST) {
            super();
            term && (term.parent = this);
            Debug.assert(term !== null && term !== undefined);
            this.minChar = term.minChar;
            this.limChar = term.limChar;
            this.trailingTriviaWidth = term.trailingTriviaWidth;
        }

        public nodeType(): NodeType {
            return NodeType.TypeRef;
        }

        public structuralEquals(ast: TypeReference, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.term, ast.term, includingPosition);
        }
    }

    export class BuiltInType extends AST {
        constructor(private _nodeType: NodeType) {
            super();
        }

        public nodeType(): NodeType {
            return this._nodeType;
        }
    }

    export class ImportDeclaration extends AST {
        constructor(public modifiers: PullElementFlags[], public identifier: Identifier, public moduleReference: AST) {
            super();
            identifier && (identifier.parent = this);
            moduleReference && (moduleReference.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ImportDeclaration;
        }

        public isExternalImportDeclaration() {
            if (this.moduleReference.nodeType() == NodeType.Name) {
                var text = (<Identifier>this.moduleReference).text();
                return isQuoted(text);
            }

            return false;
        }

        public getAliasName(aliasAST: AST = this.moduleReference): string {
            if (aliasAST.nodeType() == NodeType.TypeRef) {
                aliasAST = (<TypeReference>aliasAST).term;
            }

            if (aliasAST.nodeType() === NodeType.Name) {
                return (<Identifier>aliasAST).text();
            } else {
                var dotExpr = <QualifiedName>aliasAST;
                return this.getAliasName(dotExpr.left) + "." + this.getAliasName(dotExpr.right);
            }
        }

        public structuralEquals(ast: ImportDeclaration, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.identifier, ast.identifier, includingPosition) &&
                structuralEquals(this.moduleReference, ast.moduleReference, includingPosition);
        }
    }

    export class ExportAssignment extends AST {
        constructor(public identifier: Identifier) {
            super();
            identifier && (identifier.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ExportAssignment;
        }

        public structuralEquals(ast: ExportAssignment, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.identifier, ast.identifier, includingPosition);
        }
    }

    export class ClassDeclaration extends AST {
        constructor(public modifiers: PullElementFlags[],
                    public identifier: Identifier,
                    public typeParameterList: ASTList,
                    public heritageClauses: ASTList,
                    public classElements: ASTList,
                    public closeBraceToken: ASTSpan) {
            super();
            identifier && (identifier.parent = this);
            typeParameterList && (typeParameterList.parent = this);
            heritageClauses && (heritageClauses.parent = this);
            classElements && (classElements.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ClassDeclaration;
        }

        public structuralEquals(ast: ClassDeclaration, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.identifier, ast.identifier, includingPosition) &&
                structuralEquals(this.classElements, ast.classElements, includingPosition) &&
                structuralEquals(this.typeParameterList, ast.typeParameterList, includingPosition) &&
                structuralEquals(this.heritageClauses, ast.heritageClauses, includingPosition);
        }
    }

    export class InterfaceDeclaration extends AST {
        constructor(public modifiers: PullElementFlags[],
                    public identifier: Identifier,
                    public typeParameterList: ASTList,
                    public heritageClauses: ASTList,
                    public body: ObjectType) {
            super();
            identifier && (identifier.parent = this);
            typeParameterList && (typeParameterList.parent = this);
            body && (body.parent = this);
            heritageClauses && (heritageClauses.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.InterfaceDeclaration;
        }

        public structuralEquals(ast: InterfaceDeclaration, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.identifier, ast.identifier, includingPosition) &&
                structuralEquals(this.body, ast.body, includingPosition) &&
                structuralEquals(this.typeParameterList, ast.typeParameterList, includingPosition) &&
                structuralEquals(this.heritageClauses, ast.heritageClauses, includingPosition);
        }
    }

    export class HeritageClause extends AST {
        constructor(private _nodeType: NodeType, public typeNames: ASTList) {
            super();
            typeNames && (typeNames.parent = this);
        }

        public nodeType(): NodeType {
            return this._nodeType;
        }

        public structuralEquals(ast: HeritageClause, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.typeNames, ast.typeNames, includingPosition);
        }
    }

    export class ModuleDeclaration extends AST {
        private _moduleFlags = ModuleFlags.None;

        constructor(public name: Identifier, public moduleElements: ASTList, public endingToken: ASTSpan) {
            super();
            name && (name.parent = this);
            moduleElements && (moduleElements.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ModuleDeclaration;
        }

        public getModuleFlags(): ModuleFlags {
            return this._moduleFlags;
        }

        // Must only be called from SyntaxTreeVisitor
        public setModuleFlags(flags: ModuleFlags): void {
            this._moduleFlags = flags;
        }

        public structuralEquals(ast: ModuleDeclaration, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                this._moduleFlags === ast._moduleFlags &&
                structuralEquals(this.name, ast.name, includingPosition) &&
                structuralEquals(this.moduleElements, ast.moduleElements, includingPosition);
        }
    }

    export class FunctionDeclaration extends AST {
        constructor(public modifiers: PullElementFlags[], public identifier: Identifier, public callSignature: CallSignature, public block: Block) {
            super();
            identifier && (identifier.parent = this);
            callSignature && (callSignature.parent = this);
            block && (block.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.FunctionDeclaration;
        }

        public structuralEquals(ast: FunctionDeclaration, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.identifier, ast.identifier, includingPosition) &&
                structuralEquals(this.block, ast.block, includingPosition) &&
                structuralEquals(this.callSignature, ast.callSignature, includingPosition);
        }
    }

    export class VariableStatement extends AST {
        constructor(public declaration: VariableDeclaration) {
            super();
            declaration && (declaration.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.VariableStatement;
        }

        public structuralEquals(ast: VariableStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.declaration, ast.declaration, includingPosition);
        }
    }

    export class VariableDeclaration extends AST {
        constructor(public declarators: ASTList) {
            super();
            declarators && (declarators.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.VariableDeclaration;
        }

        public structuralEquals(ast: VariableDeclaration, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.declarators, ast.declarators, includingPosition);
        }
    }

    export class VariableDeclarator extends AST {
        constructor(public modifiers: PullElementFlags[], public identifier: Identifier, public typeAnnotation: TypeReference, public equalsValueClause: EqualsValueClause) {
            super();
            identifier && (identifier.parent = this);
            typeAnnotation && (typeAnnotation.parent = this);
            equalsValueClause && (equalsValueClause.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.VariableDeclarator;
        }

        public structuralEquals(ast: VariableDeclarator, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.equalsValueClause, ast.equalsValueClause, includingPosition) &&
                structuralEquals(this.typeAnnotation, ast.typeAnnotation, includingPosition) &&
                structuralEquals(this.identifier, ast.identifier, includingPosition);
        }
    }

    export class EqualsValueClause extends AST {
        constructor(public value: AST) {
            super();
            value && (value.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.EqualsValueClause;
        }
    }

    export class PrefixUnaryExpression extends AST {
        constructor(private _nodeType: NodeType, public operand: AST) {
            super();
            operand && (operand.parent = this);
        }

        public nodeType(): NodeType {
            return this._nodeType;
        }

        public structuralEquals(ast: PrefixUnaryExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.operand, ast.operand, includingPosition);
        }
    }

    export class ArrayLiteralExpression extends AST {
        constructor(public expressions: ASTList) {
            super();
            expressions && (expressions.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ArrayLiteralExpression;
        }

        public structuralEquals(ast: ArrayLiteralExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.expressions, ast.expressions, includingPosition);
        }
    }

    export class OmittedExpression extends AST {
        public nodeType(): NodeType {
            return NodeType.OmittedExpression;
        }

        public structuralEquals(ast: CatchClause, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition);
        }
    }

    export class ParenthesizedExpression extends AST {
        public openParenTrailingComments: Comment[] = null;

        constructor(public expression: AST) {
            super();
            expression && (expression.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ParenthesizedExpression;
        }

        public structuralEquals(ast: ParenthesizedExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.expression, ast.expression, includingPosition);
        }
    }

    export interface ICallExpression extends IASTSpan {
        expression: AST;
        argumentList: ArgumentList;
    }

    export class SimpleArrowFunctionExpression extends AST {
        constructor(public identifier: Identifier,
                    public block: Block) {
            super();
            identifier && (identifier.parent = this);
            block && (block.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.SimpleArrowFunctionExpression;
        }

        public structuralEquals(ast: SimpleArrowFunctionExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.identifier, ast.identifier, includingPosition) &&
                structuralEquals(this.block, ast.block, includingPosition);
        }
    }

    export class ParenthesizedArrowFunctionExpression extends AST {
        constructor(public callSignature: CallSignature, public block: Block) {
            super();
            callSignature && (callSignature.parent = this);
            block && (block.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ParenthesizedArrowFunctionExpression;
        }

        public structuralEquals(ast: ParenthesizedArrowFunctionExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.block, ast.block, includingPosition) &&
                structuralEquals(this.callSignature, ast.callSignature, includingPosition);
        }
    }

    export class QualifiedName extends AST {
        constructor(public left: AST,
                    public right: Identifier) {
            super();
            left && (left.parent = this);
            right && (right.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.QualifiedName;
        }

        public structuralEquals(ast: QualifiedName, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.left, ast.left, includingPosition) &&
                structuralEquals(this.right, ast.right, includingPosition);
        }
    }

    export class ConstructorType extends AST {
        constructor(public typeParameterList: ASTList, public parameterList: ASTList, public type: TypeReference) {
            super();
            typeParameterList && (typeParameterList.parent = this);
            parameterList && (parameterList.parent = this);
            type && (type.parent = this);
        }

        nodeType(): NodeType {
            return NodeType.ConstructorType;
        }
    }

    export class FunctionType extends AST {
        constructor(public typeParameterList: ASTList, public parameterList: ASTList, public type: TypeReference) {
            super();
            typeParameterList && (typeParameterList.parent = this);
            parameterList && (parameterList.parent = this);
            type && (type.parent = this);
        }

        nodeType(): NodeType {
            return NodeType.FunctionType;
        }
    }

    export class ObjectType extends AST {
        constructor(public typeMembers: ASTList) {
            super();
            typeMembers && (typeMembers.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ObjectType;
        }

        public structuralEquals(ast: ObjectType, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.typeMembers, ast.typeMembers, includingPosition);
        }
    }

    export class ArrayType extends AST {
        constructor(public type: AST) {
            super();
            type && (type.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ArrayType;
        }

        public structuralEquals(ast: ArrayType, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.type, ast.type, includingPosition);
        }
    }

    export class GenericType extends AST {
        constructor(public name: AST, public typeArgumentList: ASTList) {
            super();
            name && (name.parent = this);
            typeArgumentList && (typeArgumentList.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.GenericType;
        }

        public structuralEquals(ast: GenericType, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.name, ast.name, includingPosition) &&
                structuralEquals(this.typeArgumentList, ast.typeArgumentList, includingPosition);
        }
    }

    export class TypeQuery extends AST {
        constructor(public name: AST) {
            super();
            name && (name.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.TypeQuery;
        }

        public structuralEquals(ast: TypeQuery, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.name, ast.name, includingPosition);
        }
    }

    export class Block extends AST {
        public closeBraceLeadingComments: Comment[] = null;

        constructor(public statements: ASTList, public closeBraceToken: IASTSpan) {
            super();
            statements && (statements.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.Block;
        }

        public structuralEquals(ast: Block, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.statements, ast.statements, includingPosition);
        }
    }

    export class Parameter extends AST {
        constructor(public modifiers: PullElementFlags[], public identifier: Identifier, public typeAnnotation: TypeReference, public equalsValueClause: EqualsValueClause, public isOptional: boolean, public isRest: boolean) {
            super();
            identifier && (identifier.parent = this);
            typeAnnotation && (typeAnnotation.parent = this);
            equalsValueClause && (equalsValueClause.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.Parameter;
        }

        public isOptionalArg(): boolean { return this.isOptional || this.equalsValueClause !== null; }

        public structuralEquals(ast: Parameter, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                this.isOptional === ast.isOptional &&
                this.isRest === ast.isRest;
        }
    }

    export class MemberAccessExpression extends AST {
        constructor(public expression: AST,
                    public name: Identifier) {
            super();
            expression && (expression.parent = this);
            name && (name.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.MemberAccessExpression;
        }

        public structuralEquals(ast: MemberAccessExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.expression, ast.expression, includingPosition) &&
                structuralEquals(this.name, ast.name, includingPosition);
        }
    }

    export class PostfixUnaryExpression extends AST {
        constructor(private _nodeType: NodeType, public operand: AST) {
            super();
            operand && (operand.parent = this);
        }

        public nodeType(): NodeType {
            return this._nodeType;
        }

        public structuralEquals(ast: PostfixUnaryExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.operand, ast.operand, includingPosition);
        }
    }

    export class ElementAccessExpression extends AST {
        constructor(public expression: AST,
                    public argumentExpression: AST) {
            super();
            expression && (expression.parent = this);
            argumentExpression && (argumentExpression.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ElementAccessExpression;
        }

        public structuralEquals(ast: ElementAccessExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.expression, ast.expression, includingPosition) &&
                structuralEquals(this.argumentExpression, ast.argumentExpression, includingPosition);
        }
    }

    export class InvocationExpression extends AST implements ICallExpression {
        constructor(public expression: AST,
                    public argumentList: ArgumentList) {
            super();
            expression && (expression.parent = this);
            argumentList && (argumentList.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.InvocationExpression;
        }

        public structuralEquals(ast: InvocationExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.expression, ast.expression, includingPosition) &&
                structuralEquals(this.argumentList, ast.argumentList, includingPosition);
        }
    }

    export class ArgumentList extends AST {
        constructor(public typeArgumentList: ASTList, public arguments: ASTList, public closeParenToken: ASTSpan) {
            super();
            typeArgumentList && (typeArgumentList.parent = this);
            arguments && (arguments.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ArgumentList;
        }
    }

    export class BinaryExpression extends AST {
        constructor(private _nodeType: NodeType, public left: AST, public right: AST) {
            super();
            left && (left.parent = this);
            right && (right.parent = this);
        }

        public nodeType(): NodeType {
            return this._nodeType;
        }

        public structuralEquals(ast: BinaryExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.left, ast.left, includingPosition) &&
                structuralEquals(this.right, ast.right, includingPosition);
        }
    }

    export class ConditionalExpression extends AST {
        constructor(public condition: AST, public whenTrue: AST, public whenFalse: AST) {
            super();
            condition && (condition.parent = this);
            whenTrue && (whenTrue.parent = this);
            whenFalse && (whenFalse.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ConditionalExpression;
        }

        public structuralEquals(ast: ConditionalExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.condition, ast.condition, includingPosition) &&
                structuralEquals(this.whenTrue, ast.whenTrue, includingPosition) &&
                structuralEquals(this.whenFalse, ast.whenFalse, includingPosition);
        }
    }

    export class ConstructSignature extends AST {
        constructor(public callSignature: CallSignature) {
            super();
            callSignature && (callSignature.parent = this);
        }

        nodeType(): NodeType {
            return NodeType.ConstructSignature;
        }
    }

    export class MethodSignature extends AST {
        constructor(public propertyName: Identifier, public callSignature: CallSignature) {
            super();
            propertyName && (propertyName.parent = this);
            callSignature && (callSignature.parent = this);
        }

        nodeType(): NodeType {
            return NodeType.MethodSignature;
        }
    }

    export class IndexSignature extends AST {
        constructor(public parameter: Parameter,
                    public typeAnnotation: TypeReference) {
            super();
            parameter && (parameter.parent = this);
            typeAnnotation && (typeAnnotation.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.IndexSignature;
        }
    }

    export class PropertySignature extends AST {
        constructor(public propertyName: Identifier, public typeAnnotation: TypeReference) {
            super();
            propertyName && (propertyName.parent = this);
            typeAnnotation && (typeAnnotation.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.PropertySignature;
        }
    }

    export class CallSignature extends AST {
        constructor(public typeParameterList: ASTList, public parameterList: ASTList, public typeAnnotation: TypeReference) {
            super();
            typeParameterList && (typeParameterList.parent = this);
            parameterList && (parameterList.parent = this);
            typeAnnotation && (typeAnnotation.parent = this);
        }

        nodeType(): NodeType {
            return NodeType.CallSignature;
        }
    }

    export class TypeParameter extends AST {
        constructor(public identifier: Identifier, public constraint: Constraint) {
            super();
            identifier && (identifier.parent = this);
            constraint && (constraint.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.TypeParameter;
        }

        public structuralEquals(ast: TypeParameter, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.identifier, ast.identifier, includingPosition) &&
                structuralEquals(this.constraint, ast.constraint, includingPosition);
        }
    }

    export class Constraint extends AST {
        constructor(public type: TypeReference) {
            super();
            type && (type.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.Constraint;
        }
    }

    export class ElseClause extends AST {
        constructor(public statement: AST) {
            super();
            statement && (statement.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ElseClause;
        }

        public structuralEquals(ast: ElseClause, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.statement, ast.statement, includingPosition);
        }
    }

    export class IfStatement extends AST {
        constructor(public condition: AST,
                    public statement: AST,
                    public elseClause: ElseClause) {
            super();
            condition && (condition.parent = this);
            statement && (statement.parent = this);
            elseClause && (elseClause.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.IfStatement;
        }

        public structuralEquals(ast: IfStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.condition, ast.condition, includingPosition) &&
                structuralEquals(this.statement, ast.statement, includingPosition) &&
                structuralEquals(this.elseClause, ast.elseClause, includingPosition);
        }
    }

    export class ExpressionStatement extends AST {
        constructor(public expression: AST) {
            super();
            expression && (expression.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ExpressionStatement;
        }

        public structuralEquals(ast: ExpressionStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.expression, ast.expression, includingPosition);
        }
    }

    export class ConstructorDeclaration extends AST {
        constructor(public parameterList: ASTList, public block: Block) {
            super();
            parameterList && (parameterList.parent = this);
            block && (block.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ConstructorDeclaration;
        }
    }

    export class MemberFunctionDeclaration extends AST {
        constructor(public modifiers: PullElementFlags[], public propertyName: Identifier, public callSignature: CallSignature, public block: Block) {
            super();
            propertyName && (propertyName.parent = this);
            callSignature && (callSignature.parent = this);
            block && (block.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.MemberFunctionDeclaration;
        }
    }

    export class GetAccessor extends AST {
        constructor(public modifiers: PullElementFlags[],
                    public propertyName: Identifier,
                    public parameterList: ASTList,
                    public typeAnnotation: TypeReference,
                    public block: Block) {
            super();
            propertyName && (propertyName.parent = this);
            parameterList && (parameterList.parent = this);
            typeAnnotation && (typeAnnotation.parent = this);
            block && (block.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.GetAccessor;
        }
    }

    export class SetAccessor extends AST {
        constructor(public modifiers: PullElementFlags[],
                    public propertyName: Identifier,
                    public parameterList: ASTList,
                    public block: Block) {
            super();
            propertyName && (propertyName.parent = this);
            parameterList && (parameterList.parent = this);
            block && (block.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.SetAccessor;
        }
    }

    export class MemberVariableDeclaration extends AST {
        constructor(public modifiers: PullElementFlags[], public variableDeclarator: VariableDeclarator) {
            super();
            variableDeclarator && (variableDeclarator.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.MemberVariableDeclaration;
        }
    }

    export class IndexMemberDeclaration extends AST {
        constructor(public indexSignature: IndexSignature) {
            super();
            indexSignature && (indexSignature.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.IndexMemberDeclaration;
        }
    }

    export class ThrowStatement extends AST {
        constructor(public expression: AST) {
            super();
            expression && (expression.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ThrowStatement;
        }

        public structuralEquals(ast: ThrowStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.expression, ast.expression, includingPosition);
        }
    }

    export class ReturnStatement extends AST {
        constructor(public expression: AST) {
            super();
            expression && (expression.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ReturnStatement;
        }

        public structuralEquals(ast: ReturnStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.expression, ast.expression, includingPosition);
        }
    }

    export class ObjectCreationExpression extends AST implements ICallExpression {
        constructor(public expression: AST,
                    public argumentList: ArgumentList) {
            super();
            expression && (expression.parent = this);
            argumentList && (argumentList.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ObjectCreationExpression;
        }

        public structuralEquals(ast: ObjectCreationExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.expression, ast.expression, includingPosition) &&
                structuralEquals(this.argumentList, ast.argumentList, includingPosition);
        }
    }

    export class SwitchStatement extends AST {
        constructor(public expression: AST, public switchClauses: ASTList, public statement: ASTSpan) {
            super();
            expression && (expression.parent = this);
            switchClauses && (switchClauses.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.SwitchStatement;
        }

        public structuralEquals(ast: SwitchStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.switchClauses, ast.switchClauses, includingPosition) &&
                structuralEquals(this.expression, ast.expression, includingPosition);
        }
    }

    export class CaseSwitchClause extends AST {
        constructor(public expression: AST, public statements: ASTList) {
            super();
            expression && (expression.parent = this);
            statements && (statements.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.CaseSwitchClause;
        }

        public structuralEquals(ast: CaseSwitchClause, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.expression, ast.expression, includingPosition) &&
                structuralEquals(this.statements, ast.statements, includingPosition);
        }
    }

    export class DefaultSwitchClause extends AST {
        constructor(public statements: ASTList) {
            super();
            statements && (statements.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.DefaultSwitchClause;
        }

        public structuralEquals(ast: DefaultSwitchClause, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.statements, ast.statements, includingPosition);
        }
    }

    export class BreakStatement extends AST {
        constructor(public identifier: Identifier) {
            super();
        }

        public nodeType(): NodeType {
            return NodeType.BreakStatement;
        }

        public structuralEquals(ast: BreakStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition);
        }
    }

    export class ContinueStatement extends AST {
        constructor(public identifier: Identifier) {
            super();
        }

        public nodeType(): NodeType {
            return NodeType.ContinueStatement;
        }

        public structuralEquals(ast: ContinueStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition);
        }
    }

    export class ForStatement extends AST {
        constructor(public variableDeclaration: VariableDeclaration,
                    public initializer: AST,
                    public condition: AST,
                    public incrementor: AST,
                    public statement: AST) {
            super();
            variableDeclaration && (variableDeclaration.parent = this);
            initializer && (initializer.parent = this);
            condition && (condition.parent = this);
            incrementor && (incrementor.parent = this);
            statement && (statement.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ForStatement;
        }

        public structuralEquals(ast: ForStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.initializer, ast.initializer, includingPosition) &&
                structuralEquals(this.condition, ast.condition, includingPosition) &&
                structuralEquals(this.incrementor, ast.incrementor, includingPosition) &&
                structuralEquals(this.statement, ast.statement, includingPosition);
        }
    }

    export class ForInStatement extends AST {
        constructor(public variableDeclaration: VariableDeclaration, public left: AST, public expression: AST, public statement: AST) {
            super();
            variableDeclaration && (variableDeclaration.parent = this);
            left && (left.parent = this);
            expression && (expression.parent = this);
            statement && (statement.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ForInStatement;
        }

        public structuralEquals(ast: ForInStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.variableDeclaration, ast.variableDeclaration, includingPosition) &&
                structuralEquals(this.expression, ast.expression, includingPosition) &&
                structuralEquals(this.statement, ast.statement, includingPosition);
        }
    }

    export class WhileStatement extends AST {
        constructor(public condition: AST, public statement: AST) {
            super();
            condition && (condition.parent = this);
            statement && (statement.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.WhileStatement;
        }

        public structuralEquals(ast: WhileStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.condition, ast.condition, includingPosition) &&
                structuralEquals(this.statement, ast.statement, includingPosition);
        }
    }

    export class WithStatement extends AST {
        constructor(public condition: AST, public statement: AST) {
            super();
            condition && (condition.parent = this);
            statement && (statement.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.WithStatement;
        }

        public structuralEquals(ast: WithStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.condition, ast.condition, includingPosition) &&
                structuralEquals(this.statement, ast.statement, includingPosition);
        }
    }

    export class EnumDeclaration extends AST {
        private _moduleFlags: ModuleFlags = ModuleFlags.None;

        constructor(public identifier: Identifier, public enumElements: ASTList) {
            super();
            identifier && (identifier.parent = this);
            enumElements && (enumElements.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.EnumDeclaration;
        }

        public getModuleFlags(): ModuleFlags {
            return this._moduleFlags;
        }

        public setModuleFlags(flags: ModuleFlags): void {
            this._moduleFlags = flags;
        }
    }

    export class EnumElement extends AST {
        public constantValue: number = null;

        constructor(public propertyName: Identifier, public equalsValueClause: EqualsValueClause) {
            super();
            propertyName && (propertyName.parent = this);
            equalsValueClause && (equalsValueClause.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.EnumElement;
        }
    }

    export class CastExpression extends AST {
        constructor(public type: TypeReference, public expression: AST) {
            super();
            type && (type.parent = this);
            expression && (expression.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.CastExpression;
        }

        public structuralEquals(ast: CastExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.type, ast.type, includingPosition) &&
                structuralEquals(this.expression, ast.expression, includingPosition);
        }
    }

    export class ObjectLiteralExpression extends AST {
        constructor(public propertyAssignments: ASTList) {
            super();
            propertyAssignments && (propertyAssignments.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ObjectLiteralExpression;
        }

        public structuralEquals(ast: ObjectLiteralExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.propertyAssignments, ast.propertyAssignments, includingPosition);
        }
    }

    export class SimplePropertyAssignment extends AST {
        constructor(public propertyName: Identifier,
                    public expression: AST) {
            super();
            propertyName && (propertyName.parent = this);
            expression && (expression.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.SimplePropertyAssignment;
        }
    }

    export class FunctionPropertyAssignment extends AST {
        constructor(public propertyName: Identifier, public callSignature: CallSignature, public block: Block) {
            super();
            propertyName && (propertyName.parent = this);
            callSignature && (callSignature.parent = this);
            block && (block.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.FunctionPropertyAssignment;
        }
    }

    export class FunctionExpression extends AST {
        constructor(public identifier: Identifier, public callSignature: CallSignature, public block: Block) {
            super();
            identifier && (identifier.parent = this);
            callSignature && (callSignature.parent = this);
            block && (block.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.FunctionExpression;
        }
    }

    export class EmptyStatement extends AST {
        public nodeType(): NodeType {
            return NodeType.EmptyStatement;
        }

        public structuralEquals(ast: CatchClause, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition);
        }
    }

    export class TryStatement extends AST {
        constructor(public block: Block, public catchClause: CatchClause, public finallyClause: FinallyClause) {
            super();
            block && (block.parent = this);
            catchClause && (catchClause.parent = this);
            finallyClause && (finallyClause.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.TryStatement;
        }

        public structuralEquals(ast: TryStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.block, ast.block, includingPosition) &&
                   structuralEquals(this.catchClause, ast.catchClause, includingPosition) &&
                   structuralEquals(this.finallyClause, ast.finallyClause, includingPosition);
        }
    }

    export class CatchClause extends AST {
        constructor(public identifier: Identifier, public typeAnnotation: TypeReference, public block: Block) {
            super();
            identifier && (identifier.parent = this);
            typeAnnotation && (typeAnnotation.parent = this);
            block && (block.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.CatchClause;
        }

        public structuralEquals(ast: CatchClause, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.identifier, ast.identifier, includingPosition) &&
                   structuralEquals(this.typeAnnotation, ast.typeAnnotation, includingPosition) &&
                   structuralEquals(this.block, ast.block, includingPosition);
        }
    }

    export class FinallyClause extends AST {
        constructor(public block: Block) {
            super();
            block && (block.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.FinallyClause;
        }

        public structuralEquals(ast: CatchClause, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.block, ast.block, includingPosition);
        }
    }

    export class LabeledStatement extends AST {
        constructor(public identifier: Identifier, public statement: AST) {
            super();
            identifier && (identifier.parent = this);
            statement && (statement.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.LabeledStatement;
        }

        public structuralEquals(ast: LabeledStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.identifier, ast.identifier, includingPosition) &&
                structuralEquals(this.statement, ast.statement, includingPosition);
        }
    }

    export class DoStatement extends AST {
        constructor(public statement: AST, public whileKeyword: ASTSpan, public condition: AST) {
            super();
            statement && (statement.parent = this);
            condition && (condition.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.DoStatement;
        }

        public structuralEquals(ast: DoStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.statement, ast.statement, includingPosition) &&
                structuralEquals(this.condition, ast.condition, includingPosition);
        }
    }

    export class TypeOfExpression extends AST {
        constructor(public expression: AST) {
            super();
            expression && (expression.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.TypeOfExpression;
        }

        public structuralEquals(ast: TypeOfExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.expression, ast.expression, includingPosition);
        }
    }

    export class DeleteExpression extends AST {
        constructor(public expression: AST) {
            super();
            expression && (expression.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.DeleteExpression;
        }

        public structuralEquals(ast: DeleteExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.expression, ast.expression, includingPosition);
        }
    }

    export class VoidExpression extends AST {
        constructor(public expression: AST) {
            super();
            expression && (expression.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.VoidExpression;
        }

        public structuralEquals(ast: VoidExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.expression, ast.expression, includingPosition);
        }
    }

    export class DebuggerStatement extends AST {
        public nodeType(): NodeType {
            return NodeType.DebuggerStatement;
        }
    }

    export class Comment {
        public text: string[] = null;
        private docCommentText: string = null;
        public trailingTriviaWidth = 0;

        constructor(private _trivia: ISyntaxTrivia,
                    public endsLine: boolean,
                    public minChar: number,
                    public limChar: number) {
        }

        public fullText(): string {
            return this._trivia.fullText();
        }

        public isBlockComment(): boolean {
            return this._trivia.kind() === SyntaxKind.MultiLineCommentTrivia;
        }

        public structuralEquals(ast: Comment, includingPosition: boolean): boolean {
            if (includingPosition) {
                if (this.minChar !== ast.minChar || this.limChar !== ast.limChar) {
                    return false;
                }
            }

            return this._trivia.fullText() === ast._trivia.fullText() &&
                   this.endsLine === ast.endsLine;
        }

        public isPinnedOrTripleSlash(): boolean {
            if (this.fullText().match(tripleSlashReferenceRegExp)) {
                return true;
            }
            else {
                return this.fullText().indexOf("/*!") === 0;
            }
        }

        public getText(): string[] {
            if (this.text === null) {
                if (this.isBlockComment()) {
                    this.text = this.fullText().split("\n");
                    for (var i = 0; i < this.text.length; i++) {
                        this.text[i] = this.text[i].replace(/^\s+|\s+$/g, '');
                    }
                }
                else {
                    this.text = [(this.fullText().replace(/^\s+|\s+$/g, ''))];
                }
            }

            return this.text;
        }

        public isDocComment() {
            if (this.isBlockComment()) {
                return this.fullText().charAt(2) === "*" && this.fullText().charAt(3) !== "/";
            }

            return false;
        }

        public getDocCommentTextValue() {
            if (this.docCommentText === null) {
                this.docCommentText = Comment.cleanJSDocComment(this.fullText());
            }

            return this.docCommentText;
        }

        static consumeLeadingSpace(line: string, startIndex: number, maxSpacesToRemove?: number) {
            var endIndex = line.length;
            if (maxSpacesToRemove !== undefined) {
                endIndex = min(startIndex + maxSpacesToRemove, endIndex);
            }

            for (; startIndex < endIndex; startIndex++) {
                var charCode = line.charCodeAt(startIndex);
                if (charCode !== CharacterCodes.space && charCode !== CharacterCodes.tab) {
                    return startIndex;
                }
            }

            if (endIndex !== line.length) {
                return endIndex;
            }

            return -1;
        }

        static isSpaceChar(line: string, index: number) {
            var length = line.length;
            if (index < length) {
                var charCode = line.charCodeAt(index);
                // If the character is space
                return charCode === CharacterCodes.space || charCode === CharacterCodes.tab;
            }

            // If the index is end of the line it is space
            return index === length;
        }

        static cleanDocCommentLine(line: string, jsDocStyleComment: boolean, jsDocLineSpaceToRemove?: number) {
            var nonSpaceIndex = Comment.consumeLeadingSpace(line, 0);
            if (nonSpaceIndex !== -1) {
                var jsDocSpacesRemoved = nonSpaceIndex;
                if (jsDocStyleComment && line.charAt(nonSpaceIndex) === '*') { // remove leading * in case of jsDocComment
                    var startIndex = nonSpaceIndex + 1;
                    nonSpaceIndex = Comment.consumeLeadingSpace(line, startIndex, jsDocLineSpaceToRemove);

                    if (nonSpaceIndex !== -1) {
                        jsDocSpacesRemoved = nonSpaceIndex - startIndex;
                    } else {
                        return null;
                    }
                }

                return {
                    minChar: nonSpaceIndex,
                    limChar: line.charAt(line.length - 1) === "\r" ? line.length - 1 : line.length,
                    jsDocSpacesRemoved: jsDocSpacesRemoved
                };
            }

            return null;
        }

        static cleanJSDocComment(content: string, spacesToRemove?: number) {

            var docCommentLines = new Array<string>();
            content = content.replace("/**", ""); // remove /**
            if (content.length >= 2 && content.charAt(content.length - 1) === "/" && content.charAt(content.length - 2) === "*") {
                content = content.substring(0, content.length - 2); // remove last */
            }
            var lines = content.split("\n");
            var inParamTag = false;
            for (var l = 0; l < lines.length; l++) {
                var line = lines[l];
                var cleanLinePos = Comment.cleanDocCommentLine(line, true, spacesToRemove);
                if (!cleanLinePos) {
                    // Whole line empty, read next line
                    continue;
                }

                var docCommentText = "";
                var prevPos = cleanLinePos.minChar;
                for (var i = line.indexOf("@", cleanLinePos.minChar); 0 <= i && i < cleanLinePos.limChar; i = line.indexOf("@", i + 1)) {
                    // We have encoutered @. 
                    // If we were omitting param comment, we dont have to do anything
                    // other wise the content of the text till @ tag goes as doc comment
                    var wasInParamtag = inParamTag;

                    // Parse contents next to @
                    if (line.indexOf("param", i + 1) === i + 1 && Comment.isSpaceChar(line, i + 6)) {
                        // It is param tag. 

                        // If we were not in param tag earlier, push the contents from prev pos of the tag this tag start as docComment
                        if (!wasInParamtag) {
                            docCommentText += line.substring(prevPos, i);
                        }

                        // New start of contents 
                        prevPos = i;
                        inParamTag = true;
                    } else if (wasInParamtag) {
                        // Non param tag start
                        prevPos = i;
                        inParamTag = false;
                    }
                }

                if (!inParamTag) {
                    docCommentText += line.substring(prevPos, cleanLinePos.limChar);
                }

                // Add line to comment text if it is not only white space line
                var newCleanPos = Comment.cleanDocCommentLine(docCommentText, false);
                if (newCleanPos) {
                    if (spacesToRemove === undefined) {
                        spacesToRemove = cleanLinePos.jsDocSpacesRemoved;
                    }
                    docCommentLines.push(docCommentText);
                }
            }

            return docCommentLines.join("\n");
        }

        static getDocCommentText(comments: Comment[]) {
            var docCommentText = new Array<string>();
            for (var c = 0 ; c < comments.length; c++) {
                var commentText = comments[c].getDocCommentTextValue();
                if (commentText !== "") {
                    docCommentText.push(commentText);
                }
            }
            return docCommentText.join("\n");
        }

        static getParameterDocCommentText(param: string, fncDocComments: Comment[]) {
            if (fncDocComments.length === 0 || !fncDocComments[0].isBlockComment()) {
                // there were no fnc doc comments and the comment is not block comment then it cannot have 
                // @param comment that can be parsed
                return "";
            }

            for (var i = 0; i < fncDocComments.length; i++) {
                var commentContents = fncDocComments[i].fullText();
                for (var j = commentContents.indexOf("@param", 0); 0 <= j; j = commentContents.indexOf("@param", j)) {
                    j += 6;
                    if (!Comment.isSpaceChar(commentContents, j)) {
                        // This is not param tag but a tag line @paramxxxxx
                        continue;
                    }

                    // This is param tag. Check if it is what we are looking for
                    j = Comment.consumeLeadingSpace(commentContents, j);
                    if (j === -1) {
                        break;
                    }

                    // Ignore the type expression
                    if (commentContents.charCodeAt(j) === CharacterCodes.openBrace) {
                        j++;
                        // Consume the type
                        var charCode = 0;
                        for (var curlies = 1; j < commentContents.length; j++) {
                            charCode = commentContents.charCodeAt(j);
                            // { character means we need to find another } to match the found one
                            if (charCode === CharacterCodes.openBrace) {
                                curlies++;
                                continue;
                            }

                            // } char
                            if (charCode === CharacterCodes.closeBrace) {
                                curlies--;
                                if (curlies === 0) {
                                    // We do not have any more } to match the type expression is ignored completely
                                    break;
                                } else {
                                    // there are more { to be matched with }
                                    continue;
                                }
                            }

                            // Found start of another tag
                            if (charCode === CharacterCodes.at) {
                                break;
                            }
                        }

                        // End of the comment
                        if (j === commentContents.length) {
                            break;
                        }

                        // End of the tag, go onto looking for next tag
                        if (charCode === CharacterCodes.at) {
                            continue;
                        }

                        j = Comment.consumeLeadingSpace(commentContents, j + 1);
                        if (j === -1) {
                            break;
                        }
                    }

                    // Parameter name
                    if (param !== commentContents.substr(j, param.length) || !Comment.isSpaceChar(commentContents, j + param.length)) {
                        // this is not the parameter we are looking for
                        continue;
                    }

                    // Found the parameter we were looking for
                    j = Comment.consumeLeadingSpace(commentContents, j + param.length);
                    if (j === -1) {
                        return "";
                    }

                    var endOfParam = commentContents.indexOf("@", j);
                    var paramHelpString = commentContents.substring(j, endOfParam < 0 ? commentContents.length : endOfParam);

                    // Find alignement spaces to remove
                    var paramSpacesToRemove: number = undefined;
                    var paramLineIndex = commentContents.substring(0, j).lastIndexOf("\n") + 1;
                    if (paramLineIndex !== 0) {
                        if (paramLineIndex < j && commentContents.charAt(paramLineIndex + 1) === "\r") {
                            paramLineIndex++;
                        }
                    }
                    var startSpaceRemovalIndex = Comment.consumeLeadingSpace(commentContents, paramLineIndex);
                    if (startSpaceRemovalIndex !== j && commentContents.charAt(startSpaceRemovalIndex) === "*") {
                        paramSpacesToRemove = j - startSpaceRemovalIndex - 1;
                    }

                    // Clean jsDocComment and return
                    return Comment.cleanJSDocComment(paramHelpString, paramSpacesToRemove);
                }
            }

            return "";
        }
    }

    export function diagnosticFromDecl(decl: PullDecl, diagnosticKey: string, arguments: any[]= null): Diagnostic {
        var span = decl.getSpan();
        return new Diagnostic(decl.fileName(), decl.semanticInfoChain().lineMap(decl.fileName()), span.start(), span.length(), diagnosticKey, arguments);
    }

    function min(a: number, b: number): number {
        return a <= b ? a : b;
    }
}