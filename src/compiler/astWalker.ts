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
    export interface IAstWalker {
        walk(ast: AST): void;
        options: AstWalkOptions;
        state: any; // user state object
    }

    export class AstWalkOptions {
        public goChildren = true;
        public stopWalking = false;
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

            // If we're stopping, then bail out immediately.
            if (this.options.stopWalking) {
                return;
            }

            this.pre(ast, this);

            // If we were asked to stop, then stop.
            if (this.options.stopWalking) {
                return;
            }

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
            this.childrenWalkers[NodeType.ArrayLiteralExpression] = ChildrenWalkers.walkArrayLiteralExpressionChildren;
            this.childrenWalkers[NodeType.ObjectLiteralExpression] = ChildrenWalkers.walkObjectLiteralExpressionChildren;
            this.childrenWalkers[NodeType.SimplePropertyAssignment] = ChildrenWalkers.walkSimplePropertyAssignmentChildren;
            this.childrenWalkers[NodeType.FunctionPropertyAssignment] = ChildrenWalkers.walkFunctionPropertyAssignmentChildren;
            this.childrenWalkers[NodeType.GetAccessor] = ChildrenWalkers.walkGetAccessorChildren;
            this.childrenWalkers[NodeType.SetAccessor] = ChildrenWalkers.walkSetAccessorChildren;
            this.childrenWalkers[NodeType.VoidExpression] = ChildrenWalkers.walkVoidExpressionChildren;
            this.childrenWalkers[NodeType.CommaExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.PlusExpression] = ChildrenWalkers.walkPrefixUnaryExpressionChildren;
            this.childrenWalkers[NodeType.NegateExpression] = ChildrenWalkers.walkPrefixUnaryExpressionChildren;
            this.childrenWalkers[NodeType.DeleteExpression] = ChildrenWalkers.walkDeleteExpressionChildren;
            this.childrenWalkers[NodeType.InExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.MemberAccessExpression] = ChildrenWalkers.walkMemberAccessExpressionChildren;
            this.childrenWalkers[NodeType.QualifiedName] = ChildrenWalkers.walkQualifiedNameChildren;
            this.childrenWalkers[NodeType.InstanceOfExpression] = ChildrenWalkers.walkBinaryExpressionChildren;
            this.childrenWalkers[NodeType.TypeOfExpression] = ChildrenWalkers.walkTypeOfExpressionChildren;
            this.childrenWalkers[NodeType.NumericLiteral] = ChildrenWalkers.walkNone;
            this.childrenWalkers[NodeType.Name] = ChildrenWalkers.walkNone;
            this.childrenWalkers[NodeType.TypeParameter] = ChildrenWalkers.walkTypeParameterChildren;
            this.childrenWalkers[NodeType.GenericType] = ChildrenWalkers.walkGenericTypeChildren;
            this.childrenWalkers[NodeType.TypeRef] = ChildrenWalkers.walkTypeReferenceChildren;
            this.childrenWalkers[NodeType.TypeQuery] = ChildrenWalkers.walkTypeQueryChildren;
            this.childrenWalkers[NodeType.ElementAccessExpression] = ChildrenWalkers.walkElementAccessExpressionChildren;
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
            this.childrenWalkers[NodeType.BitwiseNotExpression] = ChildrenWalkers.walkPrefixUnaryExpressionChildren;
            this.childrenWalkers[NodeType.LogicalNotExpression] = ChildrenWalkers.walkPrefixUnaryExpressionChildren;
            this.childrenWalkers[NodeType.PreIncrementExpression] = ChildrenWalkers.walkPrefixUnaryExpressionChildren;
            this.childrenWalkers[NodeType.PreDecrementExpression] = ChildrenWalkers.walkPrefixUnaryExpressionChildren;
            this.childrenWalkers[NodeType.PostIncrementExpression] = ChildrenWalkers.walkPostfixUnaryExpressionChildren;
            this.childrenWalkers[NodeType.PostDecrementExpression] = ChildrenWalkers.walkPostfixUnaryExpressionChildren;
            this.childrenWalkers[NodeType.CastExpression] = ChildrenWalkers.walkCastExpressionChildren;
            this.childrenWalkers[NodeType.ParenthesizedExpression] = ChildrenWalkers.walkParenthesizedExpressionChildren;
            this.childrenWalkers[NodeType.ArrowFunctionExpression] = ChildrenWalkers.walkArrowFunctionExpressionChildren;
            this.childrenWalkers[NodeType.FunctionExpression] = ChildrenWalkers.walkFunctionExpressionChildren;
            this.childrenWalkers[NodeType.FunctionDeclaration] = ChildrenWalkers.walkFuncDeclChildren;
            this.childrenWalkers[NodeType.MemberFunctionDeclaration] = ChildrenWalkers.walkMemberFunctionDeclarationChildren;
            this.childrenWalkers[NodeType.ConstructorDeclaration] = ChildrenWalkers.walkConstructorDeclarationChildren;
            this.childrenWalkers[NodeType.VariableDeclarator] = ChildrenWalkers.walkVariableDeclaratorChildren;
            this.childrenWalkers[NodeType.MemberVariableDeclaration] = ChildrenWalkers.walkMemberVariableDeclarationChildren;
            this.childrenWalkers[NodeType.VariableDeclaration] = ChildrenWalkers.walkVariableDeclarationChildren;
            this.childrenWalkers[NodeType.Parameter] = ChildrenWalkers.walkParameterChildren;
            this.childrenWalkers[NodeType.ReturnStatement] = ChildrenWalkers.walkReturnStatementChildren;
            this.childrenWalkers[NodeType.BreakStatement] = ChildrenWalkers.walkNone;
            this.childrenWalkers[NodeType.ContinueStatement] = ChildrenWalkers.walkNone;
            this.childrenWalkers[NodeType.ThrowStatement] = ChildrenWalkers.walkThrowStatementChildren;
            this.childrenWalkers[NodeType.ForStatement] = ChildrenWalkers.walkForStatementChildren;
            this.childrenWalkers[NodeType.ForInStatement] = ChildrenWalkers.walkForInStatementChildren;
            this.childrenWalkers[NodeType.IfStatement] = ChildrenWalkers.walkIfStatementChildren;
            this.childrenWalkers[NodeType.ElseClause] = ChildrenWalkers.walkElseClauseChildren;
            this.childrenWalkers[NodeType.WhileStatement] = ChildrenWalkers.walkWhileStatementChildren;
            this.childrenWalkers[NodeType.DoStatement] = ChildrenWalkers.walkDoStatementChildren;
            this.childrenWalkers[NodeType.Block] = ChildrenWalkers.walkBlockChildren;
            this.childrenWalkers[NodeType.CaseSwitchClause] = ChildrenWalkers.walkCaseSwitchClauseChildren;
            this.childrenWalkers[NodeType.DefaultSwitchClause] = ChildrenWalkers.walkDefaultSwitchClauseChildren;
            this.childrenWalkers[NodeType.SwitchStatement] = ChildrenWalkers.walkSwitchStatementChildren;
            this.childrenWalkers[NodeType.TryStatement] = ChildrenWalkers.walkTryStatementChildren;
            this.childrenWalkers[NodeType.CatchClause] = ChildrenWalkers.walkCatchClauseChildren;
            this.childrenWalkers[NodeType.List] = ChildrenWalkers.walkListChildren;
            this.childrenWalkers[NodeType.Script] = ChildrenWalkers.walkScriptChildren;
            this.childrenWalkers[NodeType.ClassDeclaration] = ChildrenWalkers.walkClassDeclChildren;
            this.childrenWalkers[NodeType.InterfaceDeclaration] = ChildrenWalkers.walkInterfaceDeclerationChildren;
            this.childrenWalkers[NodeType.ExtendsHeritageClause] = ChildrenWalkers.walkHeritageClauseChildren;
            this.childrenWalkers[NodeType.ImplementsHeritageClause] = ChildrenWalkers.walkHeritageClauseChildren;
            this.childrenWalkers[NodeType.ObjectType] = ChildrenWalkers.walkObjectTypeChildren;
            this.childrenWalkers[NodeType.ArrayType] = ChildrenWalkers.walkArrayTypeChildren;
            this.childrenWalkers[NodeType.ModuleDeclaration] = ChildrenWalkers.walkModuleDeclChildren;
            this.childrenWalkers[NodeType.EnumDeclaration] = ChildrenWalkers.walkEnumDeclarationChildren;
            this.childrenWalkers[NodeType.EnumElement] = ChildrenWalkers.walkEnumElementChildren;
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

        export function walkPrefixUnaryExpressionChildren(preAst: PrefixUnaryExpression, walker: IAstWalker): void {
            walker.walk(preAst.operand);
        }

        export function walkPostfixUnaryExpressionChildren(preAst: PostfixUnaryExpression, walker: IAstWalker): void {
            walker.walk(preAst.operand);
        }

        export function walkDeleteExpressionChildren(preAst: DeleteExpression, walker: IAstWalker): void {
            walker.walk(preAst.expression);
        }

        export function walkTypeOfExpressionChildren(preAst: TypeOfExpression, walker: IAstWalker): void {
            walker.walk(preAst.expression);
        }

        export function walkVoidExpressionChildren(preAst: VoidExpression, walker: IAstWalker): void {
            walker.walk(preAst.expression);
        }

        export function walkArrayLiteralExpressionChildren(preAst: ArrayLiteralExpression, walker: IAstWalker): void {
            walker.walk(preAst.expressions);
        }

        export function walkSimplePropertyAssignmentChildren(preAst: SimplePropertyAssignment, walker: IAstWalker): void {
            walker.walk(preAst.propertyName);
            walker.walk(preAst.expression);
        }

        export function walkFunctionPropertyAssignmentChildren(preAst: FunctionPropertyAssignment, walker: IAstWalker): void {
            walker.walk(preAst.propertyName);
            walker.walk(preAst.typeParameters);
            walker.walk(preAst.parameterList);
            walker.walk(preAst.returnTypeAnnotation);
            walker.walk(preAst.block);
        }

        export function walkGetAccessorChildren(preAst: GetAccessor, walker: IAstWalker): void {
            walker.walk(preAst.propertyName);
            walker.walk(preAst.parameterList);
            walker.walk(preAst.returnTypeAnnotation);
            walker.walk(preAst.block);
        }

        export function walkSetAccessorChildren(preAst: SetAccessor, walker: IAstWalker): void {
            walker.walk(preAst.propertyName);
            walker.walk(preAst.parameterList);
            walker.walk(preAst.block);
        }

        export function walkObjectLiteralExpressionChildren(preAst: ObjectLiteralExpression, walker: IAstWalker): void {
            walker.walk(preAst.propertyAssignments);
        }

        export function walkCastExpressionChildren(preAst: CastExpression, walker: IAstWalker): void {
            walker.walk(preAst.castType);
            walker.walk(preAst.operand);
        }

        export function walkParenthesizedExpressionChildren(preAst: ParenthesizedExpression, walker: IAstWalker): void {
            walker.walk(preAst.expression);
        }

        export function walkElementAccessExpressionChildren(preAst: ElementAccessExpression, walker: IAstWalker): void {
            walker.walk(preAst.expression);
            walker.walk(preAst.argumentExpression);
        }

        export function walkMemberAccessExpressionChildren(preAst: MemberAccessExpression, walker: IAstWalker): void {
            walker.walk(preAst.expression);
            walker.walk(preAst.name);
        }

        export function walkQualifiedNameChildren(preAst: QualifiedName, walker: IAstWalker): void {
            walker.walk(preAst.left);
            walker.walk(preAst.right);
        }

        export function walkBinaryExpressionChildren(preAst: BinaryExpression, walker: IAstWalker): void {
            walker.walk(preAst.left);
            walker.walk(preAst.right);
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
            walker.walk(preAst.condition);
            walker.walk(preAst.whenTrue);
            walker.walk(preAst.whenFalse);
        }

        export function walkFunctionExpressionChildren(preAst: FunctionExpression, walker: IAstWalker): void {
            walker.walk(preAst.name);
            walker.walk(preAst.typeParameters);
            walker.walk(preAst.parameterList);
            walker.walk(preAst.returnTypeAnnotation);
            walker.walk(preAst.block);
        }

        export function walkArrowFunctionExpressionChildren(preAst: ArrowFunctionExpression, walker: IAstWalker): void {
            walker.walk(preAst.typeParameters);
            walker.walk(preAst.parameterList);
            walker.walk(preAst.returnTypeAnnotation);
            walker.walk(preAst.block);
        }

        export function walkMemberFunctionDeclarationChildren(preAst: MemberFunctionDeclaration, walker: IAstWalker): void {
            walker.walk(preAst.name);
            walker.walk(preAst.typeParameters);
            walker.walk(preAst.parameterList);
            walker.walk(preAst.returnTypeAnnotation);
            walker.walk(preAst.block);
        }

        export function walkFuncDeclChildren(preAst: FunctionDeclaration, walker: IAstWalker): void {
            walker.walk(preAst.name);
            walker.walk(preAst.typeParameters);
            walker.walk(preAst.parameterList);
            walker.walk(preAst.returnTypeAnnotation);
            walker.walk(preAst.block);
        }

        export function walkConstructorDeclarationChildren(preAst: ConstructorDeclaration, walker: IAstWalker): void {
            walker.walk(preAst.parameterList);
            walker.walk(preAst.block);
        }

        export function walkParameterChildren(preAst: Parameter, walker: IAstWalker): void {
            walker.walk(preAst.id);
            walker.walk(preAst.typeExpr);
            walker.walk(preAst.init);
        }

        export function walkVariableDeclaratorChildren(preAst: VariableDeclarator, walker: IAstWalker): void {
            walker.walk(preAst.id);
            walker.walk(preAst.typeExpr);
            walker.walk(preAst.init);
        }

        export function walkMemberVariableDeclarationChildren(preAst: MemberVariableDeclaration, walker: IAstWalker): void {
            walker.walk(preAst.id);
            walker.walk(preAst.typeExpr);
            walker.walk(preAst.init);
        }

        export function walkReturnStatementChildren(preAst: ReturnStatement, walker: IAstWalker): void {
            walker.walk(preAst.expression);
        }

        export function walkForStatementChildren(preAst: ForStatement, walker: IAstWalker): void {
            walker.walk(preAst.init);
            walker.walk(preAst.cond);
            walker.walk(preAst.incr);
            walker.walk(preAst.body);
        }

        export function walkForInStatementChildren(preAst: ForInStatement, walker: IAstWalker): void {
            walker.walk(preAst.variableDeclaration);
            walker.walk(preAst.expression);
            walker.walk(preAst.statement);
        }

        export function walkIfStatementChildren(preAst: IfStatement, walker: IAstWalker): void {
            walker.walk(preAst.condition);
            walker.walk(preAst.statement);
            walker.walk(preAst.elseClause);
        }

        export function walkElseClauseChildren(preAst: ElseClause, walker: IAstWalker): void {
            walker.walk(preAst.statement);
        }

        export function walkWhileStatementChildren(preAst: WhileStatement, walker: IAstWalker): void {
            walker.walk(preAst.condition);
            walker.walk(preAst.statement);
        }

        export function walkDoStatementChildren(preAst: DoStatement, walker: IAstWalker): void {
            walker.walk(preAst.condition);
            walker.walk(preAst.statement);
        }

        export function walkBlockChildren(preAst: Block, walker: IAstWalker): void {
            walker.walk(preAst.statements);
        }

        export function walkVariableDeclarationChildren(preAst: VariableDeclaration, walker: IAstWalker): void {
            walker.walk(preAst.declarators);
        }

        export function walkCaseSwitchClauseChildren(preAst: CaseSwitchClause, walker: IAstWalker): void {
            walker.walk(preAst.expr);
            walker.walk(preAst.body);
        }

        export function walkDefaultSwitchClauseChildren(preAst: DefaultSwitchClause, walker: IAstWalker): void {
            walker.walk(preAst.body);
        }

        export function walkSwitchStatementChildren(preAst: SwitchStatement, walker: IAstWalker): void {
            walker.walk(preAst.expression);
            walker.walk(preAst.caseList);
        }

        export function walkTryStatementChildren(preAst: TryStatement, walker: IAstWalker): void {
            walker.walk(preAst.block);
            walker.walk(preAst.catchClause);
            walker.walk(preAst.finallyBody);
        }

        export function walkCatchClauseChildren(preAst: CatchClause, walker: IAstWalker): void {
            walker.walk(preAst.param);
            walker.walk(preAst.block);
        }

        export function walkClassDeclChildren(preAst: ClassDeclaration, walker: IAstWalker): void {
            walker.walk(preAst.identifier);
            walker.walk(preAst.typeParameterList);
            walker.walk(preAst.heritageClauses);
            walker.walk(preAst.classElements);
        }

        export function walkScriptChildren(preAst: Script, walker: IAstWalker): void {
            walker.walk(preAst.moduleElements);
        }

        export function walkHeritageClauseChildren(preAst: HeritageClause, walker: IAstWalker): void {
            walker.walk(preAst.typeNames);
        }

        export function walkInterfaceDeclerationChildren(preAst: InterfaceDeclaration, walker: IAstWalker): void {
            walker.walk(preAst.identifier);
            walker.walk(preAst.typeParameterList);
            walker.walk(preAst.heritageClauses);
            walker.walk(preAst.body);
        }

        export function walkObjectTypeChildren(preAst: ObjectType, walker: IAstWalker): void {
            walker.walk(preAst.typeMembers);
        }

        export function walkArrayTypeChildren(preAst: ArrayType, walker: IAstWalker): void {
            walker.walk(preAst.type);
        }

        export function walkModuleDeclChildren(preAst: ModuleDeclaration, walker: IAstWalker): void {
            walker.walk(preAst.name);
            walker.walk(preAst.members);
        }

        export function walkEnumDeclarationChildren(preAst: EnumDeclaration, walker: IAstWalker): void {
            walker.walk(preAst.identifier);
            walker.walk(preAst.enumElements);
        }

        export function walkEnumElementChildren(preAst: EnumElement, walker: IAstWalker): void {
            walker.walk(preAst.identifier);
            walker.walk(preAst.value);
        }

        export function walkImportDeclChildren(preAst: ImportDeclaration, walker: IAstWalker): void {
            walker.walk(preAst.identifier);
            walker.walk(preAst.moduleReference);
        }

        export function walkExportAssignmentChildren(preAst: ExportAssignment, walker: IAstWalker): void {
            walker.walk(preAst.identifier);
        }

        export function walkWithStatementChildren(preAst: WithStatement, walker: IAstWalker): void {
            walker.walk(preAst.condition);
            walker.walk(preAst.statement);
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