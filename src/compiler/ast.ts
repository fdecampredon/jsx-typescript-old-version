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
        trailingTriviaWidth: number;
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

    function structuralEquals(ast1: AST, ast2: AST, includingPosition: boolean): boolean {
        if (ast1 === ast2) {
            return true;
        }

        return ast1 !== null && ast2 !== null &&
               ast1.nodeType() === ast2.nodeType() &&
               ast1.structuralEquals(ast2, includingPosition);
    }

    function astArrayStructuralEquals(array1: AST[], array2: AST[], includingPosition: boolean): boolean {
        return ArrayUtilities.sequenceEquals(array1, array2,
            includingPosition ? structuralEqualsIncludingPosition : structuralEqualsNotIncludingPosition);
    }

    export interface IAST extends IASTSpan {
        nodeType(): NodeType;
        astID: number;
        astIDString: string;
        getLength(): number;
    }

    export class AST implements IAST {
        public parent: AST = null;
        public minChar: number = -1;  // -1 = "undefined" or "compiler generated"
        public limChar: number = -1;  // -1 = "undefined" or "compiler generated"
        public trailingTriviaWidth = 0;

        private _flags = ASTFlags.None;

        public typeCheckPhase = -1;

        public astIDString: string = astID.toString();
        public astID: number = astID++;

        private _preComments: Comment[] = null;
        private _postComments: Comment[] = null;
        private _docComments: Comment[] = null;

        constructor() {
        }

        public fileName(): string {
            return this.parent.fileName();
        }

        public nodeType(): NodeType {
            throw Errors.abstract();
        }

        public isStatement() {
            return false;
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

        public shouldEmit(emitter: Emitter): boolean {
            return true;
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

        public _isDeclaration() { return false; }

        public emit(emitter: Emitter) {
            emitter.emitComments(this, true);
            this.emitWorker(emitter);
            emitter.emitComments(this, false);
        }

        public emitWorker(emitter: Emitter) {
            throw Errors.abstract();
        }

        public docComments(): Comment[] {
            if (!this._isDeclaration() || !this.preComments() || this.preComments().length === 0) {
                return [];
            }

            if (!this._docComments) {
                var preComments = this.preComments();
                var preCommentsLength = preComments.length;
                var docComments = new Array<Comment>();
                for (var i = preCommentsLength - 1; i >= 0; i--) {
                    if (preComments[i].isDocComment()) {
                        docComments.push(preComments[i]);
                        continue;
                    }
                    break;
                }

                this._docComments = docComments.reverse();
            }

            return this._docComments;
        }

        public structuralEquals(ast: AST, includingPosition: boolean): boolean {
            if (includingPosition) {
                if (this.minChar !== ast.minChar || this.limChar !== ast.limChar) {
                    return false;
                }
            }

            return this._flags === ast._flags &&
                astArrayStructuralEquals(this.preComments(), ast.preComments(), includingPosition) &&
                astArrayStructuralEquals(this.postComments(), ast.postComments(), includingPosition);
        }
    }

    export class ASTList extends AST {
        constructor(public members: AST[], public separatorCount?: number) {
            super();

            for (var i = 0, n = members.length; i < n; i++) {
                members[i].parent = this;
            }
        }

        public nodeType(): NodeType {
            return NodeType.List;
        }

        public emit(emitter: Emitter) {
            emitter.emitList(this);
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

        public emit(emitter: Emitter) {
            emitter.emitScript(this);
        }

        public structuralEquals(ast: Script, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.moduleElements, ast.moduleElements, includingPosition);
        }
    }

    export class ImportDeclaration extends AST {
        private _varFlags = VariableFlags.None;
        constructor(public identifier: Identifier, public moduleReference: AST) {
            super();
            identifier && (identifier.parent = this);
            moduleReference && (moduleReference.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ImportDeclaration;
        }

        public _isDeclaration() { return true; }

        public getVarFlags(): VariableFlags {
            return this._varFlags;
        }

        // Must only be called from SyntaxTreeVisitor
        public setVarFlags(flags: VariableFlags): void {
            this._varFlags = flags;
        }

        public isExternalImportDeclaration() {
            if (this.moduleReference.nodeType() == NodeType.Name) {
                var text = (<Identifier>this.moduleReference).actualText;
                return isQuoted(text);
            }

            return false;
        }

        public shouldEmit(emitter: Emitter): boolean {
            return emitter.shouldEmitImportDeclaration(this);
        }

        public emit(emitter: Emitter) {
            emitter.emitImportDeclaration(this);
        }

        public getAliasName(aliasAST: AST = this.moduleReference): string {
            if (aliasAST.nodeType() == NodeType.TypeRef) {
                aliasAST = (<TypeReference>aliasAST).term;
            }

            if (aliasAST.nodeType() === NodeType.Name) {
                return (<Identifier>aliasAST).actualText;
            } else {
                var dotExpr = <QualifiedName>aliasAST;
                return this.getAliasName(dotExpr.left) + "." + this.getAliasName(dotExpr.right);
            }
        }

        public structuralEquals(ast: ImportDeclaration, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                this._varFlags === ast._varFlags &&
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

        public emit(emitter: Emitter) {
            emitter.setExportAssignmentIdentifier(this.identifier.actualText);
        }
    }

    export class ClassDeclaration extends AST {
        private _varFlags = VariableFlags.None;

        constructor(public identifier: Identifier,
            public typeParameterList: ASTList,
            public heritageClauses: ASTList,
            public classElements: ASTList,
            public endingToken: ASTSpan) {
            super();
                identifier && (identifier.parent = this);
                typeParameterList && (typeParameterList.parent = this);
                heritageClauses && (heritageClauses.parent = this);
                classElements && (classElements.parent = this);
        }

        public _isDeclaration() {
            return true;
        }

        public getVarFlags(): VariableFlags {
            return this._varFlags;
        }

        // Must only be called from SyntaxTreeVisitor
        public setVarFlags(flags: VariableFlags): void {
            this._varFlags = flags;
        }

        public nodeType(): NodeType {
            return NodeType.ClassDeclaration;
        }

        public shouldEmit(emitter: Emitter): boolean {
            return emitter.shouldEmitClassDeclaration(this);
        }

        public emit(emitter: Emitter): void {
            emitter.emitClassDeclaration(this);
        }

        public structuralEquals(ast: ClassDeclaration, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                this._varFlags === ast._varFlags &&
                structuralEquals(this.identifier, ast.identifier, includingPosition) &&
                structuralEquals(this.classElements, ast.classElements, includingPosition) &&
                structuralEquals(this.typeParameterList, ast.typeParameterList, includingPosition) &&
                structuralEquals(this.heritageClauses, ast.heritageClauses, includingPosition);
        }
    }

    export class InterfaceDeclaration extends AST {
        private _varFlags = VariableFlags.None;

        constructor(public identifier: Identifier,
            public typeParameterList: ASTList,
            public heritageClauses: ASTList,
            public members: ASTList) {
            super();
                identifier && (identifier.parent = this);
                typeParameterList && (typeParameterList.parent = this);
            members && (members.parent = this);
            heritageClauses && (heritageClauses.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.InterfaceDeclaration;
        }

        public _isDeclaration() {
            return true;
        }

        public getVarFlags(): VariableFlags {
            return this._varFlags;
        }

        // Must only be called from SyntaxTreeVisitor
        public setVarFlags(flags: VariableFlags): void {
            this._varFlags = flags;
        }

        public shouldEmit(emitter: Emitter): boolean {
            return emitter.shouldEmitInterfaceDeclaration(this);
        }

        public emit(emitter: Emitter): void {
            emitter.emitInterfaceDeclaration(this);
        }

        public structuralEquals(ast: InterfaceDeclaration, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                this._varFlags === ast._varFlags &&
                structuralEquals(this.identifier, ast.identifier, includingPosition) &&
                structuralEquals(this.members, ast.members, includingPosition) &&
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

        public shouldEmit(emitter: Emitter): boolean {
            return false;
        }

        public structuralEquals(ast: HeritageClause, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.typeNames, ast.typeNames, includingPosition);
        }

    }

    export class Identifier extends AST {
        private _text: string;

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
        constructor(public actualText: string, text: string, public isNumber: boolean = false) {
            super();
            this._text = text;
        }

        public text(): string {
            if (!this._text) {
                this._text = Syntax.massageEscapes(this.actualText);
            }

            return this._text;
        }

        public nodeType(): NodeType {
            return NodeType.Name;
        }

        public isMissing() { return false; }

        public emit(emitter: Emitter) {
            emitter.emitName(this, true);
        }

        public structuralEquals(ast: Identifier, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   this.actualText === ast.actualText &&
                   this.isMissing() === ast.isMissing();
        }
    }

    export class MissingIdentifier extends Identifier {
        constructor() {
            super("__missing", "__missing");
        }

        public isMissing() {
            return true;
        }

        public emit(emitter: Emitter) {
            // Emit nothing for a missing ID
        }
    }

    export class LiteralExpression extends AST {
        constructor(private _nodeType: NodeType) {
            super();
        }

        public nodeType(): NodeType {
            return this._nodeType;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitLiteralExpression(this);
        }

        public structuralEquals(ast: ParenthesizedExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition);
        }
    }

    export class ThisExpression extends AST {
        public nodeType(): NodeType {
            return NodeType.ThisExpression;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitThisExpression(this);
        }

        public structuralEquals(ast: ParenthesizedExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition);
        }
    }

    export class SuperExpression extends AST {
        public nodeType(): NodeType {
            return NodeType.SuperExpression;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitSuperExpression(this);
        }

        public structuralEquals(ast: ParenthesizedExpression, includingPosition: boolean): boolean {
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

        public emitWorker(emitter: Emitter) {
            emitter.emitParenthesizedExpression(this);
        }

        public structuralEquals(ast: ParenthesizedExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.expression, ast.expression, includingPosition);
        }
    }

    export class CastExpression extends AST {
        constructor(public castType: TypeReference, public operand: AST) {
            super();
            castType && (castType.parent = this);
            operand && (operand.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.CastExpression;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitCastExpression(this);
        }

        public structuralEquals(ast: CastExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.castType, ast.castType, includingPosition) &&
                structuralEquals(this.operand, ast.operand, includingPosition);
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

        public _isDeclaration() {
            return true;
        }

        public emitWorker(emitter: Emitter): void {
            emitter.emitSimplePropertyAssignment(this);
        }
    }

    export class FunctionPropertyAssignment extends AST {
        constructor(public propertyName: Identifier,
                    public typeParameters: ASTList,
                    public parameterList: ASTList,
                    public returnTypeAnnotation: TypeReference,
                    public block: Block) {
            super();
            propertyName && (propertyName.parent = this);
            typeParameters && (typeParameters.parent = this);
            parameterList && (parameterList.parent = this);
            returnTypeAnnotation && (returnTypeAnnotation.parent = this);
            block && (block.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.FunctionPropertyAssignment;
        }

        public _isDeclaration() {
            return true;
        }

        public emitWorker(emitter: Emitter): void {
            emitter.emitFunctionPropertyAssignment(this);
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

        public emitWorker(emitter: Emitter) {
            emitter.emitObjectLiteralExpression(this);
        }

        public structuralEquals(ast: ObjectLiteralExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.propertyAssignments, ast.propertyAssignments, includingPosition);
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

        public emitWorker(emitter: Emitter) {
            emitter.emitArrayLiteralExpression(this);
        }

        public structuralEquals(ast: ArrayLiteralExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.expressions, ast.expressions, includingPosition);
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

        public emitWorker(emitter: Emitter) {
            emitter.emitPostfixUnaryExpression(this);
        }

        public structuralEquals(ast: PostfixUnaryExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.operand, ast.operand, includingPosition);
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

        public emitWorker(emitter: Emitter) {
            emitter.emitPrefixUnaryExpression(this);
        }

        public structuralEquals(ast: PrefixUnaryExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.operand, ast.operand, includingPosition);
        }
    }

    export class ContinueStatement extends AST {
        constructor(public identifier: string) {
            super();
        }

        public nodeType(): NodeType {
            return NodeType.ContinueStatement;
        }

        public isStatement() {
            return true;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitContinueStatement(this);
        }

        public structuralEquals(ast: ContinueStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition);
        }
    }

    export class BreakStatement extends AST {
        constructor(public identifier: string) {
            super();
        }

        public nodeType(): NodeType {
            return NodeType.BreakStatement;
        }

        public isStatement() {
            return true;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitBreakStatement(this);
        }

        public structuralEquals(ast: BreakStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition);
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

        public emitWorker(emitter: Emitter) {
            emitter.emitTypeOfExpression(this);
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

        public emitWorker(emitter: Emitter) {
            emitter.emitDeleteExpression(this);
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

        public emitWorker(emitter: Emitter) {
            emitter.emitVoidExpression(this);
        }

        public structuralEquals(ast: VoidExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.expression, ast.expression, includingPosition);
        }
    }

    export interface ICallExpression extends IAST {
        target: AST;
        typeArguments: ASTList;
        arguments: ASTList;
        closeParenSpan: ASTSpan;
        callResolutionData: PullAdditionalCallResolutionData;
    }

    export class ObjectCreationExpression extends AST implements ICallExpression {
        callResolutionData: PullAdditionalCallResolutionData = null;
        constructor(public target: AST,
                    public typeArguments: ASTList,
                    public arguments: ASTList,
                    public closeParenSpan: ASTSpan) {
                        super();
            target && (target.parent = this);
            typeArguments && (typeArguments.parent = this);
            arguments && (arguments.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ObjectCreationExpression;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitObjectCreationExpression(this);
        }

        public structuralEquals(ast: ObjectCreationExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.target, ast.target, includingPosition) &&
                structuralEquals(this.typeArguments, ast.typeArguments, includingPosition) &&
                structuralEquals(this.arguments, ast.arguments, includingPosition);
        }
    }

    export class InvocationExpression extends AST implements ICallExpression {
        callResolutionData: PullAdditionalCallResolutionData = null;
        constructor(public target: AST,
                    public typeArguments: ASTList,
                    public arguments: ASTList,
                    public closeParenSpan: ASTSpan) {
                        super();
            target && (target.parent = this);
            typeArguments && (typeArguments.parent = this);
            arguments && (arguments.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.InvocationExpression;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitInvocationExpression(this);
        }

        public structuralEquals(ast: InvocationExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.target, ast.target, includingPosition) &&
                   structuralEquals(this.typeArguments, ast.typeArguments, includingPosition) &&
                   structuralEquals(this.arguments, ast.arguments, includingPosition);
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

        public emitWorker(emitter: Emitter) {
            emitter.emitElementAccessExpression(this);
        }

        public structuralEquals(ast: ElementAccessExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.expression, ast.expression, includingPosition) &&
                structuralEquals(this.argumentExpression, ast.argumentExpression, includingPosition);
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

        public emitWorker(emitter: Emitter) {
            emitter.emitMemberAccessExpression(this);
        }

        public structuralEquals(ast: MemberAccessExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.expression, ast.expression, includingPosition) &&
                structuralEquals(this.name, ast.name, includingPosition);
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

        public emitWorker(emitter: Emitter) {
            emitter.emitQualifiedName(this);
        }

        public structuralEquals(ast: QualifiedName, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.left, ast.left, includingPosition) &&
                structuralEquals(this.right, ast.right, includingPosition);
        }
    }

    export class BinaryExpression extends AST {
        constructor(private _nodeType: NodeType,
                    public operand1: AST,
                    public operand2: AST) {
            super();
            operand1 && (operand1.parent = this);
            operand2 && (operand2.parent = this);
        }

        public nodeType(): NodeType {
            return this._nodeType;
        }

        public static getTextForBinaryToken(nodeType: NodeType): string {
            switch (nodeType) {
                case NodeType.CommaExpression: return ",";
                case NodeType.AssignmentExpression: return "=";
                case NodeType.AddAssignmentExpression: return "+=";
                case NodeType.SubtractAssignmentExpression: return "-=";
                case NodeType.MultiplyAssignmentExpression: return "*=";
                case NodeType.DivideAssignmentExpression: return "/=";
                case NodeType.ModuloAssignmentExpression: return "%=";
                case NodeType.AndAssignmentExpression: return "&=";
                case NodeType.ExclusiveOrAssignmentExpression: return "^=";
                case NodeType.OrAssignmentExpression: return "|=";
                case NodeType.LeftShiftAssignmentExpression: return "<<=";
                case NodeType.SignedRightShiftAssignmentExpression: return ">>=";
                case NodeType.UnsignedRightShiftAssignmentExpression: return ">>>=";
                case NodeType.LogicalOrExpression: return "||";
                case NodeType.LogicalAndExpression: return "&&";
                case NodeType.BitwiseOrExpression: return "|";
                case NodeType.BitwiseExclusiveOrExpression: return "^";
                case NodeType.BitwiseAndExpression: return "&";
                case NodeType.EqualsWithTypeConversionExpression: return "==";
                case NodeType.NotEqualsWithTypeConversionExpression: return "!=";
                case NodeType.EqualsExpression: return "===";
                case NodeType.NotEqualsExpression: return "!==";
                case NodeType.LessThanExpression: return "<";
                case NodeType.GreaterThanExpression: return ">";
                case NodeType.LessThanOrEqualExpression: return "<=";
                case NodeType.GreaterThanOrEqualExpression: return ">=";
                case NodeType.InstanceOfExpression: return "instanceof";
                case NodeType.InExpression: return "in";
                case NodeType.LeftShiftExpression: return "<<";
                case NodeType.SignedRightShiftExpression: return ">>";
                case NodeType.UnsignedRightShiftExpression: return ">>>";
                case NodeType.MultiplyExpression: return "*";
                case NodeType.DivideExpression: return "/";
                case NodeType.ModuloExpression: return "%";
                case NodeType.AddExpression: return "+";
                case NodeType.SubtractExpression: return "-";
            }

            throw Errors.invalidOperation();
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitBinaryExpression(this);
        }

        public structuralEquals(ast: BinaryExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.operand1, ast.operand1, includingPosition) &&
                   structuralEquals(this.operand2, ast.operand2, includingPosition);
        }
    }

    export class ConditionalExpression extends AST {
        constructor(public operand1: AST,
                    public operand2: AST,
                    public operand3: AST) {
            super();
            operand1 && (operand1.parent = this);
            operand2 && (operand2.parent = this);
            operand3 && (operand3.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ConditionalExpression;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitConditionalExpression(this);
        }

        public structuralEquals(ast: ConditionalExpression, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.operand1, ast.operand1, includingPosition) &&
                   structuralEquals(this.operand2, ast.operand2, includingPosition) &&
                   structuralEquals(this.operand3, ast.operand3, includingPosition);
        }
    }

    export class NumericLiteral extends AST {
        private _text: string;

        constructor(public value: number,
                    text: string) {
            super();
            this._text = text;
        }

        public text(): string { return this._text; }

        public nodeType(): NodeType {
            return NodeType.NumericLiteral;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitNumericLiteral(this);
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

        public emitWorker(emitter: Emitter) {
            emitter.emitRegularExpressionLiteral(this);
        }

        public structuralEquals(ast: RegularExpressionLiteral, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   this.text === ast.text;
        }
    }

    export class StringLiteral extends AST {
        private _text: string;

        constructor(public actualText: string, text: string) {
            super();
            this._text = text;
        }

        public text(): string { return this._text; }

        public nodeType(): NodeType {
            return NodeType.StringLiteral;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitStringLiteral(this);
        }

        public structuralEquals(ast: StringLiteral, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   this.actualText === ast.actualText;
        }
    }

    export class VariableDeclarator extends AST {
        private _varFlags = VariableFlags.None;

        constructor(public id: Identifier, public typeExpr: TypeReference, public init: AST) {
            super();
            id && (id.parent = this);
            typeExpr && (typeExpr.parent = this);
            init && (init.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.VariableDeclarator;
        }

        public isStatic() { return hasFlag(this.getVarFlags(), VariableFlags.Static); }

        public emit(emitter: Emitter) {
            emitter.emitVariableDeclarator(this);
        }

        public _isDeclaration() { return true; }

        public getVarFlags(): VariableFlags {
            return this._varFlags;
        }

        // Must only be called from SyntaxTreeVisitor
        public setVarFlags(flags: VariableFlags): void {
            this._varFlags = flags;
        }

        public isProperty() { return hasFlag(this.getVarFlags(), VariableFlags.Property); }

        public structuralEquals(ast: VariableDeclarator, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                this._varFlags === ast._varFlags &&
                structuralEquals(this.init, ast.init, includingPosition) &&
                structuralEquals(this.typeExpr, ast.typeExpr, includingPosition) &&
                structuralEquals(this.id, ast.id, includingPosition);
        }
    }

    export class Parameter extends AST {
        private _varFlags = VariableFlags.None;

        constructor(public id: Identifier, public typeExpr: TypeReference, public init: AST, public isOptional: boolean, public isRest: boolean) {
            super();
            id && (id.parent = this);
            typeExpr && (typeExpr.parent = this);
            init && (init.parent = this);
        }

        public _isDeclaration() { return true; }

        public getVarFlags(): VariableFlags {
            return this._varFlags;
        }

        // Must only be called from SyntaxTreeVisitor
        public setVarFlags(flags: VariableFlags): void {
            this._varFlags = flags;
        }

        public nodeType(): NodeType {
            return NodeType.Parameter;
        }

        public isOptionalArg(): boolean { return this.isOptional || this.init !== null; }

        public emitWorker(emitter: Emitter) {
            emitter.emitParameter(this);
        }

        public structuralEquals(ast: Parameter, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                this.isOptional === ast.isOptional &&
                this.isRest === ast.isRest;
        }
    }

    export class ArrowFunctionExpression extends AST {
        public hint: string = null;

        constructor(public typeParameters: ASTList,
                    public parameterList: ASTList,
                    public returnTypeAnnotation: TypeReference,
                    public block: Block) {
            super();
            typeParameters && (typeParameters.parent = this);
            parameterList && (parameterList.parent = this);
            returnTypeAnnotation && (returnTypeAnnotation.parent = this);
            block && (block.parent = this);
        }

        public _isDeclaration() { return true; }

        public nodeType(): NodeType {
            return NodeType.ArrowFunctionExpression;
        }

        public structuralEquals(ast: FunctionDeclaration, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                this.hint === ast.hint &&
                structuralEquals(this.block, ast.block, includingPosition) &&
                structuralEquals(this.typeParameters, ast.typeParameters, includingPosition) &&
                structuralEquals(this.parameterList, ast.parameterList, includingPosition);
        }

        public emit(emitter: Emitter) {
            emitter.emitArrowFunctionExpression(this);
        }

        public getNameText() {
            return this.hint;
        }
    }

    export class ConstructorDeclaration extends AST {
        private _functionFlags = FunctionFlags.None;

        constructor(public parameterList: ASTList, public block: Block) {
                super();
            parameterList && (parameterList.parent = this);
            block && (block.parent = this);
        }

        public _isDeclaration() { return true; }

        public getFunctionFlags(): FunctionFlags {
            return this._functionFlags;
        }

        // Must only be called from SyntaxTreeVisitor
        public setFunctionFlags(flags: FunctionFlags): void {
            this._functionFlags = flags;
        }

        public nodeType(): NodeType {
            return NodeType.ConstructorDeclaration;
        }

        public shouldEmit(emitter: Emitter): boolean {
            return emitter.shouldEmitConstructorDeclaration(this);
        }

        public emit(emitter: Emitter) {
            emitter.emitConstructorDeclaration(this);
        }
    }

    export class FunctionDeclaration extends AST {
        public hint: string = null;
        private _functionFlags = FunctionFlags.None;

        constructor(public name: Identifier,
                    public typeParameters: ASTList,
                    public parameterList: ASTList,
                    public returnTypeAnnotation: TypeReference,
                    public block: Block) {
            super();
            name && (name.parent = this);
            typeParameters && (typeParameters.parent = this);
            parameterList && (parameterList.parent = this);
            returnTypeAnnotation && (returnTypeAnnotation.parent = this);
            block && (block.parent = this);
        }

        public _isDeclaration() { return true; }

        public nodeType(): NodeType {
            return NodeType.FunctionDeclaration;
        }

        public getFunctionFlags(): FunctionFlags {
            return this._functionFlags;
        }

        // Must only be called from SyntaxTreeVisitor
        public setFunctionFlags(flags: FunctionFlags): void {
            this._functionFlags = flags;
        }

        public structuralEquals(ast: FunctionDeclaration, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   this._functionFlags === ast._functionFlags &&
                   this.hint === ast.hint &&
                   structuralEquals(this.name, ast.name, includingPosition) &&
                   structuralEquals(this.block, ast.block, includingPosition) &&
                   structuralEquals(this.typeParameters, ast.typeParameters, includingPosition) &&
                   structuralEquals(this.parameterList, ast.parameterList, includingPosition);
        }

        public shouldEmit(emitter: Emitter): boolean {
            return emitter.shouldEmitFunctionDeclaration(this);
        }

        public emit(emitter: Emitter) {
            emitter.emitFunctionDeclaration(this);
        }

        public getNameText() {
            if (this.name) {
                return this.name.actualText;
            }
            else {
                return this.hint;
            }
        }

        public isMethod() {
            return (this.getFunctionFlags() & FunctionFlags.Method) !== FunctionFlags.None;
        }

        public isAccessor() { return hasFlag(this.getFunctionFlags(), FunctionFlags.GetAccessor) || hasFlag(this.getFunctionFlags(), FunctionFlags.SetAccessor); }
        public isGetAccessor() { return hasFlag(this.getFunctionFlags(), FunctionFlags.GetAccessor); }
        public isSetAccessor() { return hasFlag(this.getFunctionFlags(), FunctionFlags.SetAccessor); }
        public isStatic() { return hasFlag(this.getFunctionFlags(), FunctionFlags.Static); }
    }

    export class ModuleDeclaration extends AST {
        private _moduleFlags = ModuleFlags.None;

        constructor(public name: Identifier,
                    public members: ASTList,
                    public endingToken: ASTSpan) {
            super();
            name && (name.parent = this);
            members && (members.parent = this);
        }

        public _isDeclaration() {
            return true;
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
                structuralEquals(this.members, ast.members, includingPosition);
        }

        public shouldEmit(emitter: Emitter): boolean {
            return emitter.shouldEmitModuleDeclaration(this);
        }

        public emit(emitter: Emitter) {
            return emitter.emitModuleDeclaration(this);
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

        public _isDeclaration() {
            return true;
        }

        public shouldEmit(emitter: Emitter): boolean {
            return false;
        }

        public structuralEquals(ast: ArrayType, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.type, ast.type, includingPosition);
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

        public _isDeclaration() {
            return true;
        }

        public shouldEmit(emitter: Emitter): boolean {
            return false;
        }

        public structuralEquals(ast: ObjectType, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.typeMembers, ast.typeMembers, includingPosition);
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

        public isStatement() {
            return true;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitThrowStatement(this);
        }

        public structuralEquals(ast: ThrowStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
            structuralEquals(this.expression, ast.expression, includingPosition);
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

        public isStatement() {
            return true;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitExpressionStatement(this);
        }

        public structuralEquals(ast: ExpressionStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.expression, ast.expression, includingPosition);
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

        public isStatement() {
            return true;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitLabeledStatement(this);
        }

        public structuralEquals(ast: LabeledStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.identifier, ast.identifier, includingPosition) &&
                   structuralEquals(this.statement, ast.statement, includingPosition);
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

        public emit(emitter: Emitter) {
            emitter.emitVariableDeclaration(this);
        }

        public structuralEquals(ast: VariableDeclaration, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.declarators, ast.declarators, includingPosition);
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

        public isStatement() {
            return true;
        }

        public shouldEmit(emitter: Emitter): boolean {
            return emitter.shouldEmitVariableStatement(this);
        }

        public emitWorker(emitter: Emitter) {
            return emitter.emitVariableStatement(this);
        }

        public structuralEquals(ast: VariableStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.declaration, ast.declaration, includingPosition);
        }
    }

    export class Block extends AST {
        public closeBraceLeadingComments: Comment[] = null;

        constructor(public statements: ASTList, public closeBraceSpan: IASTSpan) {
            super();
            statements && (statements.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.Block;
        }

        public isStatement() {
            return true;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitBlock(this);
        }

        public structuralEquals(ast: Block, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.statements, ast.statements, includingPosition);
        }
    }

    export class WhileStatement extends AST {
        constructor(public cond: AST, public body: AST) {
            super();
            cond && (cond.parent = this);
            body && (body.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.WhileStatement;
        }

        public isStatement() {
            return true;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitWhileStatement(this);
        }

        public structuralEquals(ast: WhileStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.cond, ast.cond, includingPosition) &&
                   structuralEquals(this.body, ast.body, includingPosition);
        }
    }

    export class DoStatement extends AST {
        constructor(public body: AST, public cond: AST, public whileSpan: ASTSpan) {
            super();
            body && (body.parent = this);
            cond && (cond.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.DoStatement;
        }

        public isStatement() {
            return true;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitDoStatement(this);
        }

        public structuralEquals(ast: DoStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.body, ast.body, includingPosition) &&
                   structuralEquals(this.cond, ast.cond, includingPosition);
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

        public isStatement() {
            return true;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitIfStatement(this);
        }

        public structuralEquals(ast: IfStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.condition, ast.condition, includingPosition) &&
                   structuralEquals(this.statement, ast.statement, includingPosition) &&
                   structuralEquals(this.elseClause, ast.elseClause, includingPosition);
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

        public emitWorker(emitter: Emitter) {
            emitter.emitElseClause(this);
        }

        public structuralEquals(ast: ElseClause, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.statement, ast.statement, includingPosition);
        }
    }

    export class ReturnStatement extends AST {
        constructor(public returnExpression: AST) {
            super();
            returnExpression && (returnExpression.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ReturnStatement;
        }

        public isStatement() {
            return true;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitReturnStatement(this);
        }

        public structuralEquals(ast: ReturnStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.returnExpression, ast.returnExpression, includingPosition);
        }
    }

    export class ForInStatement extends AST {
        constructor(public lval: AST, public obj: AST, public body: AST) {
            super();
            lval && (lval.parent = this);
            obj && (obj.parent = this);
            body && (body.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ForInStatement;
        }

        public isStatement() {
            return true;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitForInStatement(this);
        }

        public structuralEquals(ast: ForInStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.lval, ast.lval, includingPosition) &&
                   structuralEquals(this.obj, ast.obj, includingPosition) &&
                   structuralEquals(this.body, ast.body, includingPosition);
        }
    }

    export class ForStatement extends AST {
        constructor(public init: AST,
                    public cond: AST,
                    public incr: AST,
                    public body: AST) {
            super();
            init && (init.parent = this);
            cond && (cond.parent = this);
            incr && (incr.parent = this);
            body && (body.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.ForStatement;
        }

        public isStatement() {
            return true;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitForStatement(this);
        }

        public structuralEquals(ast: ForStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.init, ast.init, includingPosition) &&
                   structuralEquals(this.cond, ast.cond, includingPosition) &&
                   structuralEquals(this.incr, ast.incr, includingPosition) &&
                   structuralEquals(this.body, ast.body, includingPosition);
        }
    }

    export class WithStatement extends AST {
        constructor(public expr: AST, public body: AST) {
            super();
            expr && (expr.parent = this);
            body && (body.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.WithStatement;
        }

        public isStatement() {
            return true;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitWithStatement(this);
        }

        public structuralEquals(ast: WithStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.expr, ast.expr, includingPosition) &&
                   structuralEquals(this.body, ast.body, includingPosition);
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

        public _isDeclaration(): boolean {
            return true;
        }

        public shouldEmit(emitter: Emitter): boolean {
            return emitter.shouldEmitEnumDeclaration(this);
        }

        public emit(emitter: Emitter): void {
            emitter.emitEnumDeclaration(this);
        }
    }

    export class EnumElement extends AST {
        public constantValue: number = null;

        constructor(public identifier: Identifier, public value: AST) {
            super();
            identifier && (identifier.parent = this);
            value && (value.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.EnumElement;
        }

        public _isDeclaration(): boolean {
            return true;
        }

        public emit(emitter: Emitter): void {
            emitter.emitEnumElement(this);
        }
    }

    export class SwitchStatement extends AST {
        constructor(public val: AST, public caseList: ASTList, public statement: ASTSpan) {
            super();
            val && (val.parent = this);
            caseList && (caseList.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.SwitchStatement;
        }

        public isStatement() {
            return true;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitSwitchStatement(this);
        }

        public structuralEquals(ast: SwitchStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.caseList, ast.caseList, includingPosition) &&
                   structuralEquals(this.val, ast.val, includingPosition);
        }
    }

    export class CaseSwitchClause extends AST {
        constructor(public expr: AST, public body: ASTList) {
            super();
            expr && (expr.parent = this);
            body && (body.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.CaseSwitchClause;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitCaseSwitchClause(this);
        }

        public structuralEquals(ast: CaseSwitchClause, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.expr, ast.expr, includingPosition) &&
                   structuralEquals(this.body, ast.body, includingPosition);
        }
    }

    export class DefaultSwitchClause extends AST {
        constructor(public body: ASTList) {
            super();
            body && (body.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.DefaultSwitchClause;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitDefaultSwitchClause(this);
        }

        public structuralEquals(ast: DefaultSwitchClause, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.body, ast.body, includingPosition);
        }
    }

    export class TypeParameter extends AST {
        constructor(public name: Identifier, public constraint: TypeReference) {
            super();
            name && (name.parent = this);
            constraint && (constraint.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.TypeParameter;
        }

        public _isDeclaration() {
            return true;
        }

        public structuralEquals(ast: TypeParameter, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.name, ast.name, includingPosition) &&
                   structuralEquals(this.constraint, ast.constraint, includingPosition);
        }
    }

    export class GenericType extends AST {
        constructor(public name: AST, public typeArguments: ASTList) {
            super();
            name && (name.parent = this);
            typeArguments && (typeArguments.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.GenericType;
        }

        public emit(emitter: Emitter): void {
            emitter.emitGenericType(this);
        }

        public structuralEquals(ast: GenericType, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.name, ast.name, includingPosition) &&
                   structuralEquals(this.typeArguments, ast.typeArguments, includingPosition);
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

        public emit(emitter: Emitter) {
            throw Errors.invalidOperation("Should not emit a type query.");
        }

        public structuralEquals(ast: TypeQuery, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.name, ast.name, includingPosition);
        }
    }

    export class TypeReference extends AST {
        constructor(public term: AST) {
            super();
            term && (term.parent = this);
            Debug.assert(term !== null && term !== undefined);
            this.minChar = term.minChar;
            this.limChar = term.limChar;
        }

        public nodeType(): NodeType {
            return NodeType.TypeRef;
        }

        public emit(emitter: Emitter) {
            throw Errors.invalidOperation("Should not emit a type reference.");
        }

        public structuralEquals(ast: TypeReference, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                structuralEquals(this.term, ast.term, includingPosition);
        }
    }

    export class TryStatement extends AST {
        constructor(public tryBody: Block, public catchClause: CatchClause, public finallyBody: Block) {
            super();
            tryBody && (tryBody.parent = this);
            catchClause && (catchClause.parent = this);
            finallyBody && (finallyBody.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.TryStatement;
        }

        public isStatement() {
            return true;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitTryStatement(this);
        }

        public structuralEquals(ast: TryStatement, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.tryBody, ast.tryBody, includingPosition) &&
                   structuralEquals(this.catchClause, ast.catchClause, includingPosition) &&
                   structuralEquals(this.finallyBody, ast.finallyBody, includingPosition);
        }
    }

    export class CatchClause extends AST {
        constructor(public param: VariableDeclarator, public body: Block) {
            super();
            param && (param.parent = this);
            body && (body.parent = this);
        }

        public nodeType(): NodeType {
            return NodeType.CatchClause;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitCatchClause(this);
        }

        public structuralEquals(ast: CatchClause, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   structuralEquals(this.param, ast.param, includingPosition) &&
                   structuralEquals(this.body, ast.body, includingPosition);
        }
    }

    export class DebuggerStatement extends AST {
        public nodeType(): NodeType {
            return NodeType.DebuggerStatement;
        }

        public isStatement() {
            return true;
        }

        public emitWorker(emitter: Emitter) {
            emitter.emitDebuggerStatement(this);
        }
    }

    export class OmittedExpression extends AST {
        public nodeType(): NodeType {
            return NodeType.OmittedExpression;
        }

        public emitWorker(emitter: Emitter) {
        }

        public structuralEquals(ast: CatchClause, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition);
        }
    }

    export class EmptyStatement extends AST {
        public nodeType(): NodeType {
            return NodeType.EmptyStatement;
        }

        public isStatement() {
            return true;
        }

        public emitWorker(emitter: Emitter) {
            emitter.writeToOutputWithSourceMapRecord(";", this);
        }

        public structuralEquals(ast: CatchClause, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition);
        }
    }

    export class Comment extends AST {
        public text: string[] = null;
        private docCommentText: string = null;

        constructor(public content: string,
                    public isBlockComment: boolean,
                    public endsLine: boolean) {
            super();
        }

        public nodeType(): NodeType {
            return NodeType.Comment;
        }

        public structuralEquals(ast: Comment, includingPosition: boolean): boolean {
            return super.structuralEquals(ast, includingPosition) &&
                   this.content === ast.content &&
                   this.isBlockComment === ast.isBlockComment &&
                   this.endsLine === ast.endsLine;
        }

        public isPinnedOrTripleSlash(): boolean {
            if (this.content.match(tripleSlashReferenceRegExp)) {
                return true;
            }
            else {
                return this.content.indexOf("/*!") === 0;
            }
        }

        public getText(): string[] {
            if (this.text === null) {
                if (this.isBlockComment) {
                    this.text = this.content.split("\n");
                    for (var i = 0; i < this.text.length; i++) {
                        this.text[i] = this.text[i].replace(/^\s+|\s+$/g, '');
                    }
                }
                else {
                    this.text = [(this.content.replace(/^\s+|\s+$/g, ''))];
                }
            }

            return this.text;
        }

        public isDocComment() {
            if (this.isBlockComment) {
                return this.content.charAt(2) === "*" && this.content.charAt(3) !== "/";
            }

            return false;
        }

        public getDocCommentTextValue() {
            if (this.docCommentText === null) {
                this.docCommentText = Comment.cleanJSDocComment(this.content);
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
            if (fncDocComments.length === 0 || !fncDocComments[0].isBlockComment) {
                // there were no fnc doc comments and the comment is not block comment then it cannot have 
                // @param comment that can be parsed
                return "";
            }

            for (var i = 0; i < fncDocComments.length; i++) {
                var commentContents = fncDocComments[i].content;
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

    export function diagnosticFromAST(ast: AST, diagnosticKey: string, arguments: any[] = null): Diagnostic {
        return new Diagnostic(ast.fileName(), ast.minChar, ast.getLength(), diagnosticKey, arguments);
    }

    export function diagnosticFromDecl(decl: PullDecl, diagnosticKey: string, arguments: any[]= null): Diagnostic {
        var span = decl.getSpan();
        return new Diagnostic(decl.fileName(), span.start(), span.length(), diagnosticKey, arguments);
    }

    function min(a: number, b: number): number {
        return a <= b ? a : b;
    }

    export function isValidAstNode(ast: IASTSpan): boolean {
        if (!ast)
            return false;

        if (ast.minChar === -1 || ast.limChar === -1)
            return false;

        return true;
    }

    ///
    /// Return the AST containing "position"
    ///
    export function getAstAtPosition(script: AST, pos: number, useTrailingTriviaAsLimChar: boolean = true, forceInclusive: boolean = false): AST {
        var top: AST = null;

        var pre = function (cur: AST, walker: IAstWalker) {
            if (isValidAstNode(cur)) {
                var isInvalid1 = cur.nodeType() === NodeType.ExpressionStatement && cur.getLength() === 0;

                if (isInvalid1) {
                    walker.options.goChildren = false;
                }
                else {
                    // Add "cur" to the stack if it contains our position
                    // For "identifier" nodes, we need a special case: A position equal to "limChar" is
                    // valid, since the position corresponds to a caret position (in between characters)
                    // For example:
                    //  bar
                    //  0123
                    // If "position === 3", the caret is at the "right" of the "r" character, which should be considered valid
                    var inclusive =
                        forceInclusive ||
                        cur.nodeType() === NodeType.Name ||
                        cur.nodeType() === NodeType.MemberAccessExpression ||
                        cur.nodeType() === NodeType.QualifiedName ||
                        cur.nodeType() === NodeType.TypeRef ||
                        cur.nodeType() === NodeType.VariableDeclaration ||
                        cur.nodeType() === NodeType.VariableDeclarator ||
                        cur.nodeType() === NodeType.InvocationExpression ||
                        pos === script.limChar + script.trailingTriviaWidth; // Special "EOF" case

                    var minChar = cur.minChar;
                    var limChar = cur.limChar + (useTrailingTriviaAsLimChar ? cur.trailingTriviaWidth : 0) + (inclusive ? 1 : 0);
                    if (pos >= minChar && pos < limChar) {

                        // Ignore empty lists
                        if (cur.nodeType() !== NodeType.List || cur.limChar > cur.minChar) {
                            // TODO: Since AST is sometimes not correct wrt to position, only add "cur" if it's better
                            //       than top of the stack.
                            if (top === null) {
                                top = cur;
                            }
                            else if (cur.minChar >= top.minChar &&
                                (cur.limChar + (useTrailingTriviaAsLimChar ? cur.trailingTriviaWidth : 0)) <= (top.limChar + (useTrailingTriviaAsLimChar ? top.trailingTriviaWidth : 0))) {
                                // this new node appears to be better than the one we're 
                                // storing.  Make this the new node.

                                // However, If the current top is a missing identifier, we 
                                // don't want to replace it with another missing identifier.
                                // We want to return the first missing identifier found in a
                                // depth first walk of  the tree.
                                if (top.getLength() !== 0 || cur.getLength() !== 0) {
                                    top = cur;
                                }
                            }
                        }
                    }

                    // Don't go further down the tree if pos is outside of [minChar, limChar]
                    walker.options.goChildren = (minChar <= pos && pos <= limChar);
                }
            }
        };

        getAstWalkerFactory().walk(script, pre);
        return top;
    }

    export function getExtendsHeritageClause(clauses: ASTList): HeritageClause {
        if (!clauses) {
            return null;
        }

        return ArrayUtilities.firstOrDefault(<HeritageClause[]>clauses.members,
            c => c.typeNames.members.length > 0 && c.nodeType() === NodeType.ExtendsHeritageClause);
    }

    export function getImplementsHeritageClause(clauses: ASTList): HeritageClause {
        if (!clauses) {
            return null;
        }

        return ArrayUtilities.firstOrDefault(<HeritageClause[]>clauses.members,
            c => c.typeNames.members.length > 0 && c.nodeType() === NodeType.ImplementsHeritageClause);
    }

    export function isCallExpression(ast: AST): boolean {
        return (ast && ast.nodeType() === NodeType.InvocationExpression) ||
            (ast && ast.nodeType() === NodeType.ObjectCreationExpression);
    }

    export function isCallExpressionTarget(ast: AST): boolean {
        if (!ast) {
            return false;
        }

        var current = ast;

        while (current && current.parent) {
            if (current.parent.nodeType() === NodeType.MemberAccessExpression &&
                (<MemberAccessExpression>current.parent).name === current) {
                current = current.parent;
                continue;
            }

            break;
        }

        if (current && current.parent) {
            if (current.parent.nodeType() === NodeType.InvocationExpression || current.parent.nodeType() === NodeType.ObjectCreationExpression) {
                return current === (<InvocationExpression>current.parent).target;
            }
        }

        return false;
    }

    function isNameOfSomeDeclaration(ast: AST) {
        if (ast === null || ast.parent === null) {
            return false;
        }
        if (ast.nodeType() !== NodeType.Name) {
            return false;
        }

        switch (ast.parent.nodeType()) {
            case NodeType.ClassDeclaration:
                return (<ClassDeclaration>ast.parent).identifier === ast;
            case NodeType.InterfaceDeclaration:
                return (<InterfaceDeclaration>ast.parent).identifier === ast;
            case NodeType.EnumDeclaration:
                return (<EnumDeclaration>ast.parent).identifier === ast;
            case NodeType.ModuleDeclaration:
                return (<ModuleDeclaration>ast.parent).name === ast;
            case NodeType.VariableDeclarator:
                return (<VariableDeclarator>ast.parent).id === ast;
            case NodeType.FunctionDeclaration:
                return (<FunctionDeclaration>ast.parent).name === ast;
            case NodeType.Parameter:
                return (<Parameter>ast.parent).id === ast;
            case NodeType.TypeParameter:
                return (<TypeParameter>ast.parent).name === ast;
            case NodeType.SimplePropertyAssignment:
                return (<SimplePropertyAssignment>ast.parent).propertyName === ast;
            case NodeType.FunctionPropertyAssignment:
                return (<FunctionPropertyAssignment>ast.parent).propertyName === ast;
            case NodeType.EnumElement:
                return (<EnumElement>ast.parent).identifier === ast;
            case NodeType.ImportDeclaration:
                return (<ImportDeclaration>ast.parent).identifier === ast;
        }

        return false;
    }

    export function isDeclarationASTOrDeclarationNameAST(ast: AST) {
        return isNameOfSomeDeclaration(ast) || ast._isDeclaration();
    }

    export function isNameOfFunction(ast: AST) {
        return ast
            && ast.parent
            && ast.nodeType() === NodeType.Name
            && ast.parent.nodeType() === NodeType.FunctionDeclaration
            && (<FunctionDeclaration>ast.parent).name === ast;
    }

    export function isNameOfMemberAccessExpression(ast: AST) {
        if (ast &&
            ast.parent &&
            ast.parent.nodeType() === NodeType.MemberAccessExpression &&
            (<MemberAccessExpression>ast.parent).name === ast) {

            return true;
        }

        return false;
    }

    export function isRightSideOfQualifiedName(ast: AST) {
        if (ast &&
            ast.parent &&
            ast.parent.nodeType() === NodeType.QualifiedName &&
            (<QualifiedName>ast.parent).right === ast) {

            return true;
        }

        return false;
    }
}