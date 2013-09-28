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
    export interface IAstWalker {
        walk(ast: AST): void;
        options: AstWalkOptions;
        state: any; // user state object
    }

    export class AstWalkOptions {
        public goChildren = true;
    }

    export interface IAstWalkCallback {
        (ast: AST, walker: IAstWalker): void;
    }

    export interface IAstWalkChildren {
        (preAst: AST, walker: IAstWalker): void;
    }

    class AstWalker implements IAstWalker {
        constructor(
            private childrenWalkers: IAstWalkChildren[],
            private pre: IAstWalkCallback,
            private post: IAstWalkCallback,
            public options: AstWalkOptions,
            public state: any) {
        }

        public walk(ast: AST): void {
            if (!ast) {
                return;
            }

            this.pre(ast, this);

            if (this.options.goChildren) {
                // Call the "walkChildren" function corresponding to "nodeType".
                this.childrenWalkers[ast.nodeType()](ast, this);
            }
            else {
                // no go only applies to children of node issuing it
                this.options.goChildren = true;
            }

            if (this.post) {
                this.post(ast, this);
            }
        }
    }

    export class AstWalkerFactory {
        private childrenWalkers: IAstWalkChildren[] = [];

        constructor() {
            this.initChildrenWalkers();
        }

        public walk(ast: AST, pre: IAstWalkCallback, post?: IAstWalkCallback, options?: AstWalkOptions, state?: any): void {
            this.getWalker(pre, post, options, state).walk(ast);
        }

        public getWalker(pre: IAstWalkCallback, post?: IAstWalkCallback, options?: AstWalkOptions, state?: any): IAstWalker {
            return this.getSlowWalker(pre, post, options, state);
        }

        private getSlowWalker(pre: IAstWalkCallback, post?: IAstWalkCallback, options?: AstWalkOptions, state?: any): IAstWalker {
            if (!options) {
                options = new AstWalkOptions();
            }

            return new AstWalker(this.childrenWalkers, pre, post, options, state);
        }

        private initChildrenWalkers(): void {
            this.childrenWalkers[NodeType.None] = ChildrenWalkers.walkNone;
            this.childrenWalkers[NodeType.EmptyStatement] = ChildrenWalkers.walkNone;
            this.childrenWalkers[NodeType.OmittedExpression] = ChildrenWalkers.walkNone;
            this.childrenWalkers[NodeType.TrueLiteral] = ChildrenWalkers.walkNone;
            this.childrenWalkers[NodeType.FalseLiteral] = ChildrenWalkers.walkNone;
            this.childrenWalkers[NodeType.ThisExpression] = ChildrenWalkers.walkNone;
            this.childrenWalkers[NodeType.SuperExpression] = ChildrenWalkers.walkNone;
            this.childrenWalkers[NodeType.StringLiteral] = ChildrenWalkers.walkNone;
            this.childrenWalkers[NodeType.RegularExpressionLiteral] = ChildrenWalkers.walkNone;
            this.childrenWalkers[NodeType.NullLiteral] = ChildrenWalkers.walkNone;
            this.childrenWalkers[NodeType.ArrayLiteralExpression] = ChildrenWalkers.walkUnaryExpressionChildren;
            this.childrenWalkers[NodeType.ObjectLiteralExpression] = ChildrenWalkers.walkUnaryExpressionChildren;
            this.childrenWalkers[NodeType.VoidExpression] = ChildrenWalkers.walkUnaryExpressionChildren;
            this.childrenWalkers[NodeType.CommaExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.PlusExpression] = ChildrenWalkers.walkUnaryExpressionChildren;
            this.childrenWalkers[NodeType.NegateExpression] = ChildrenWalkers.walkUnaryExpressionChildren;
            this.childrenWalkers[NodeType.DeleteExpression] = ChildrenWalkers.walkUnaryExpressionChildren;
            this.childrenWalkers[NodeType.InExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.MemberAccessExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.InstanceOfExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.TypeOfExpression] = ChildrenWalkers.walkUnaryExpressionChildren;
            this.childrenWalkers[NodeType.NumericLiteral] = ChildrenWalkers.walkNone;
            this.childrenWalkers[NodeType.Name] = ChildrenWalkers.walkNone;
            this.childrenWalkers[NodeType.TypeParameter] = ChildrenWalkers.walkTypeParameterChildren;
            this.childrenWalkers[NodeType.GenericType] = ChildrenWalkers.walkGenericTypeChildren;
            this.childrenWalkers[NodeType.TypeRef] = ChildrenWalkers.walkTypeReferenceChildren;
            this.childrenWalkers[NodeType.TypeQuery] = ChildrenWalkers.walkTypeQueryChildren;
            this.childrenWalkers[NodeType.ElementAccessExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.InvocationExpression] = ChildrenWalkers.walkInvocationExpressionChildren;
            this.childrenWalkers[NodeType.ObjectCreationExpression] = ChildrenWalkers.walkObjectCreationExpressionChildren;
            this.childrenWalkers[NodeType.AssignmentExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.AddAssignmentExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.SubtractAssignmentExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.DivideAssignmentExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.MultiplyAssignmentExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.ModuloAssignmentExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.AndAssignmentExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.ExclusiveOrAssignmentExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.OrAssignmentExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.LeftShiftAssignmentExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.SignedRightShiftAssignmentExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.UnsignedRightShiftAssignmentExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.ConditionalExpression] = ChildrenWalkers.walkTrinaryExpressionChildren;
            this.childrenWalkers[NodeType.LogicalOrExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.LogicalAndExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.BitwiseOrExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.BitwiseExclusiveOrExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.BitwiseAndExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.EqualsWithTypeConversionExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.NotEqualsWithTypeConversionExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.EqualsExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.NotEqualsExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.LessThanExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.LessThanOrEqualExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.GreaterThanExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.GreaterThanOrEqualExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.AddExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.SubtractExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.MultiplyExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.DivideExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.ModuloExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.LeftShiftExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.SignedRightShiftExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.UnsignedRightShiftExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.BitwiseNotExpression] = ChildrenWalkers.walkUnaryExpressionChildren;
            this.childrenWalkers[NodeType.LogicalNotExpression] = ChildrenWalkers.walkUnaryExpressionChildren;
            this.childrenWalkers[NodeType.PreIncrementExpression] = ChildrenWalkers.walkUnaryExpressionChildren;
            this.childrenWalkers[NodeType.PreDecrementExpression] = ChildrenWalkers.walkUnaryExpressionChildren;
            this.childrenWalkers[NodeType.PostIncrementExpression] = ChildrenWalkers.walkUnaryExpressionChildren;
            this.childrenWalkers[NodeType.PostDecrementExpression] = ChildrenWalkers.walkUnaryExpressionChildren;
            this.childrenWalkers[NodeType.CastExpression] = ChildrenWalkers.walkCastExpressionChildren;
            this.childrenWalkers[NodeType.ParenthesizedExpression] = ChildrenWalkers.walkParenthesizedExpressionChildren;
            this.childrenWalkers[NodeType.FunctionDeclaration] = ChildrenWalkers.walkFuncDeclChildren;
            this.childrenWalkers[NodeType.Member] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.VariableDeclarator] = ChildrenWalkers.walkBoundDeclChildren;
            this.childrenWalkers[NodeType.VariableDeclaration] = ChildrenWalkers.walkVariableDeclarationChildren;
            this.childrenWalkers[NodeType.Parameter] = ChildrenWalkers.walkBoundDeclChildren;
            this.childrenWalkers[NodeType.ReturnStatement] = ChildrenWalkers.walkReturnStatementChildren;
            this.childrenWalkers[NodeType.BreakStatement] = ChildrenWalkers.walkNone;
            this.childrenWalkers[NodeType.ContinueStatement] = ChildrenWalkers.walkNone;
            this.childrenWalkers[NodeType.ThrowStatement] = ChildrenWalkers.walkThrowStatementChildren;
            this.childrenWalkers[NodeType.ForStatement] = ChildrenWalkers.walkForStatementChildren;
            this.childrenWalkers[NodeType.ForInStatement] = ChildrenWalkers.walkForInStatementChildren;
            this.childrenWalkers[NodeType.IfStatement] = ChildrenWalkers.walkIfStatementChildren;
            this.childrenWalkers[NodeType.WhileStatement] = ChildrenWalkers.walkWhileStatementChildren;
            this.childrenWalkers[NodeType.DoStatement] = ChildrenWalkers.walkDoStatementChildren;
            this.childrenWalkers[NodeType.Block] = ChildrenWalkers.walkBlockChildren;
            this.childrenWalkers[NodeType.CaseClause] = ChildrenWalkers.walkCaseClauseChildren;
            this.childrenWalkers[NodeType.SwitchStatement] = ChildrenWalkers.walkSwitchStatementChildren;
            this.childrenWalkers[NodeType.TryStatement] = ChildrenWalkers.walkTryStatementChildren;
            this.childrenWalkers[NodeType.CatchClause] = ChildrenWalkers.walkCatchClauseChildren;
            this.childrenWalkers[NodeType.List] = ChildrenWalkers.walkListChildren;
            this.childrenWalkers[NodeType.Script] = ChildrenWalkers.walkScriptChildren;
            this.childrenWalkers[NodeType.ClassDeclaration] = ChildrenWalkers.walkClassDeclChildren;
            this.childrenWalkers[NodeType.InterfaceDeclaration] = ChildrenWalkers.walkInterfaceDeclerationChildren;
            this.childrenWalkers[NodeType.ObjectType] = ChildrenWalkers.walkObjectTypeChildren;
            this.childrenWalkers[NodeType.ModuleDeclaration] = ChildrenWalkers.walkModuleDeclChildren;
            this.childrenWalkers[NodeType.ImportDeclaration] = ChildrenWalkers.walkImportDeclChildren;
            this.childrenWalkers[NodeType.ExportAssignment] = ChildrenWalkers.walkExportAssignmentChildren;
            this.childrenWalkers[NodeType.WithStatement] = ChildrenWalkers.walkWithStatementChildren;
            this.childrenWalkers[NodeType.ExpressionStatement] = ChildrenWalkers.walkExpressionStatementChildren;
            this.childrenWalkers[NodeType.LabeledStatement] = ChildrenWalkers.walkLabeledStatementChildren;
            this.childrenWalkers[NodeType.VariableStatement] = ChildrenWalkers.walkVariableStatementChildren;
            this.childrenWalkers[NodeType.Comment] = ChildrenWalkers.walkNone;
            this.childrenWalkers[NodeType.DebuggerStatement] = ChildrenWalkers.walkNone;

            // Verify the code is up to date with the enum
            for (var e in NodeType) {
                if (NodeType.hasOwnProperty(e) && StringUtilities.isString(NodeType[e])) {
                    CompilerDiagnostics.assert(this.childrenWalkers[e] !== undefined, "initWalkers function is not up to date with enum content!");
                }
            }
        }
    }

    var globalAstWalkerFactory: AstWalkerFactory;

    export function getAstWalkerFactory(): AstWalkerFactory {
        if (!globalAstWalkerFactory) {
            globalAstWalkerFactory = new AstWalkerFactory();
        }
        return globalAstWalkerFactory;
    }

    module ChildrenWalkers {
        export function walkNone(preAst: ASTList, walker: IAstWalker): void {
            // Nothing to do
        }

        export function walkListChildren(preAst: ASTList, walker: IAstWalker): void {
            var len = preAst.members.length;

            for (var i = 0; i < len; i++) {
                walker.walk(preAst.members[i]);
            }
        }

        export function walkThrowStatementChildren(preAst: ThrowStatement, walker: IAstWalker): void {
            walker.walk(preAst.expression);
        }

        export function walkUnaryExpressionChildren(preAst: UnaryExpression, walker: IAstWalker): void {
            walker.walk(preAst.operand);
        }

        export function walkCastExpressionChildren(preAst: CastExpression, walker: IAstWalker): void {
            walker.walk(preAst.castType);
            walker.walk(preAst.operand);
        }

        export function walkParenthesizedExpressionChildren(preAst: ParenthesizedExpression, walker: IAstWalker): void {
            walker.walk(preAst.expression);
        }

        export function walkBinaryExpressionChildren(preAst: BinaryExpression, walker: IAstWalker): void {
            walker.walk(preAst.operand1);
            walker.walk(preAst.operand2);
        }

        export function walkTypeParameterChildren(preAst: TypeParameter, walker: IAstWalker): void {
            walker.walk(preAst.name);
            walker.walk(preAst.constraint);
        }

        export function walkGenericTypeChildren(preAst: GenericType, walker: IAstWalker): void {
            walker.walk(preAst.name);
            walker.walk(preAst.typeArguments);
        }

        export function walkTypeReferenceChildren(preAst: TypeReference, walker: IAstWalker): void {
            walker.walk(preAst.term);
        }

        export function walkTypeQueryChildren(preAst: TypeQuery, walker: IAstWalker): void {
            walker.walk(preAst.name);
        }

        export function walkInvocationExpressionChildren(preAst: InvocationExpression, walker: IAstWalker): void {
            walker.walk(preAst.target);
            walker.walk(preAst.typeArguments);
            walker.walk(preAst.arguments);
        }

        export function walkObjectCreationExpressionChildren(preAst: ObjectCreationExpression, walker: IAstWalker): void {
            walker.walk(preAst.target);

            walker.walk(preAst.typeArguments);
            walker.walk(preAst.arguments);
        }

        export function walkTrinaryExpressionChildren(preAst: ConditionalExpression, walker: IAstWalker): void {
            walker.walk(preAst.operand1);
            walker.walk(preAst.operand2);
            walker.walk(preAst.operand3);
        }

        export function walkFuncDeclChildren(preAst: FunctionDeclaration, walker: IAstWalker): void {
            walker.walk(preAst.name);
            walker.walk(preAst.typeArguments);
            walker.walk(preAst.arguments);
            walker.walk(preAst.returnTypeAnnotation);
            walker.walk(preAst.block);
        }

        export function walkBoundDeclChildren(preAst: BoundDecl, walker: IAstWalker): void {
            walker.walk(preAst.id);
            walker.walk(preAst.init);
            walker.walk(preAst.typeExpr);
        }

        export function walkReturnStatementChildren(preAst: ReturnStatement, walker: IAstWalker): void {
            walker.walk(preAst.returnExpression);
        }

        export function walkForStatementChildren(preAst: ForStatement, walker: IAstWalker): void {
            walker.walk(preAst.init);
            walker.walk(preAst.cond);
            walker.walk(preAst.incr);
            walker.walk(preAst.body);
        }

        export function walkForInStatementChildren(preAst: ForInStatement, walker: IAstWalker): void {
            walker.walk(preAst.lval);
            walker.walk(preAst.obj);
            walker.walk(preAst.body);
        }

        export function walkIfStatementChildren(preAst: IfStatement, walker: IAstWalker): void {
            walker.walk(preAst.cond);
            walker.walk(preAst.thenBod);
            walker.walk(preAst.elseBod);
        }

        export function walkWhileStatementChildren(preAst: WhileStatement, walker: IAstWalker): void {
            walker.walk(preAst.cond);
            walker.walk(preAst.body);
        }

        export function walkDoStatementChildren(preAst: DoStatement, walker: IAstWalker): void {
            walker.walk(preAst.cond);
            walker.walk(preAst.body);
        }

        export function walkBlockChildren(preAst: Block, walker: IAstWalker): void {
            walker.walk(preAst.statements);
        }

        export function walkVariableDeclarationChildren(preAst: VariableDeclaration, walker: IAstWalker): void {
            walker.walk(preAst.declarators);
        }

        export function walkCaseClauseChildren(preAst: CaseClause, walker: IAstWalker): void {
            walker.walk(preAst.expr);
            walker.walk(preAst.body);
        }

        export function walkSwitchStatementChildren(preAst: SwitchStatement, walker: IAstWalker): void {
            walker.walk(preAst.val);
            walker.walk(preAst.caseList);
        }

        export function walkTryStatementChildren(preAst: TryStatement, walker: IAstWalker): void {
            walker.walk(preAst.tryBody);
            walker.walk(preAst.catchClause);
            walker.walk(preAst.finallyBody);
        }

        export function walkCatchClauseChildren(preAst: CatchClause, walker: IAstWalker): void {
            walker.walk(preAst.param);
            walker.walk(preAst.body);
        }

        export function walkClassDeclChildren(preAst: ClassDeclaration, walker: IAstWalker): void {
            walker.walk(preAst.name);
            walker.walk(preAst.typeParameters);
            walker.walk(preAst.extendsList);
            walker.walk(preAst.implementsList);
            walker.walk(preAst.members);
        }

        export function walkScriptChildren(preAst: Script, walker: IAstWalker): void {
            walker.walk(preAst.moduleElements);
        }

        export function walkInterfaceDeclerationChildren(preAst: InterfaceDeclaration, walker: IAstWalker): void {
            walker.walk(preAst.name);
            walker.walk(preAst.typeParameters);
            walker.walk(preAst.extendsList);
            walker.walk(preAst.members);
        }

        export function walkObjectTypeChildren(preAst: ObjectType, walker: IAstWalker): void {
            walker.walk(preAst.members);
        }

        export function walkModuleDeclChildren(preAst: ModuleDeclaration, walker: IAstWalker): void {
            walker.walk(preAst.name);
            walker.walk(preAst.members);
        }

        export function walkImportDeclChildren(preAst: ImportDeclaration, walker: IAstWalker): void {
            walker.walk(preAst.id);
            walker.walk(preAst.alias);
        }

        export function walkExportAssignmentChildren(preAst: ExportAssignment, walker: IAstWalker): void {
            walker.walk(preAst.id);
        }

        export function walkWithStatementChildren(preAst: WithStatement, walker: IAstWalker): void {
            walker.walk(preAst.expr);
            walker.walk(preAst.body);
        }

        export function walkExpressionStatementChildren(preAst: ExpressionStatement, walker: IAstWalker): void {
            walker.walk(preAst.expression);
        }

        export function walkLabeledStatementChildren(preAst: LabeledStatement, walker: IAstWalker): void {
            walker.walk(preAst.identifier);
            walker.walk(preAst.statement);
        }

        export function walkVariableStatementChildren(preAst: VariableStatement, walker: IAstWalker): void {
            walker.walk(preAst.declaration);
        }
    }
}