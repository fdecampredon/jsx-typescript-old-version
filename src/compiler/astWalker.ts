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
    function walkListChildren(preAst: ASTList, walker: AstWalker): void {
        var members = preAst.members;
        for (var i = 0, n = members.length; i < n; i++) {
            walker.walk(members[i]);
        }
    }

    function walkThrowStatementChildren(preAst: ThrowStatement, walker: AstWalker): void {
        walker.walk(preAst.expression);
    }

    function walkPrefixUnaryExpressionChildren(preAst: PrefixUnaryExpression, walker: AstWalker): void {
        walker.walk(preAst.operand);
    }

    function walkPostfixUnaryExpressionChildren(preAst: PostfixUnaryExpression, walker: AstWalker): void {
        walker.walk(preAst.operand);
    }

    function walkDeleteExpressionChildren(preAst: DeleteExpression, walker: AstWalker): void {
        walker.walk(preAst.expression);
    }

    function walkTypeOfExpressionChildren(preAst: TypeOfExpression, walker: AstWalker): void {
        walker.walk(preAst.expression);
    }

    function walkVoidExpressionChildren(preAst: VoidExpression, walker: AstWalker): void {
        walker.walk(preAst.expression);
    }

    function walkArrayLiteralExpressionChildren(preAst: ArrayLiteralExpression, walker: AstWalker): void {
        walker.walk(preAst.expressions);
    }

    function walkSimplePropertyAssignmentChildren(preAst: SimplePropertyAssignment, walker: AstWalker): void {
        walker.walk(preAst.propertyName);
        walker.walk(preAst.expression);
    }

    function walkFunctionPropertyAssignmentChildren(preAst: FunctionPropertyAssignment, walker: AstWalker): void {
        walker.walk(preAst.propertyName);
        walker.walk(preAst.typeParameters);
        walker.walk(preAst.parameterList);
        walker.walk(preAst.returnTypeAnnotation);
        walker.walk(preAst.block);
    }

    function walkGetAccessorChildren(preAst: GetAccessor, walker: AstWalker): void {
        walker.walk(preAst.propertyName);
        walker.walk(preAst.parameterList);
        walker.walk(preAst.returnTypeAnnotation);
        walker.walk(preAst.block);
    }

    function walkSetAccessorChildren(preAst: SetAccessor, walker: AstWalker): void {
        walker.walk(preAst.propertyName);
        walker.walk(preAst.parameterList);
        walker.walk(preAst.block);
    }

    function walkObjectLiteralExpressionChildren(preAst: ObjectLiteralExpression, walker: AstWalker): void {
        walker.walk(preAst.propertyAssignments);
    }

    function walkCastExpressionChildren(preAst: CastExpression, walker: AstWalker): void {
        walker.walk(preAst.castType);
        walker.walk(preAst.operand);
    }

    function walkParenthesizedExpressionChildren(preAst: ParenthesizedExpression, walker: AstWalker): void {
        walker.walk(preAst.expression);
    }

    function walkElementAccessExpressionChildren(preAst: ElementAccessExpression, walker: AstWalker): void {
        walker.walk(preAst.expression);
        walker.walk(preAst.argumentExpression);
    }

    function walkMemberAccessExpressionChildren(preAst: MemberAccessExpression, walker: AstWalker): void {
        walker.walk(preAst.expression);
        walker.walk(preAst.name);
    }

    function walkQualifiedNameChildren(preAst: QualifiedName, walker: AstWalker): void {
        walker.walk(preAst.left);
        walker.walk(preAst.right);
    }

    function walkBinaryExpressionChildren(preAst: BinaryExpression, walker: AstWalker): void {
        walker.walk(preAst.left);
        walker.walk(preAst.right);
    }

    function walkTypeParameterChildren(preAst: TypeParameter, walker: AstWalker): void {
        walker.walk(preAst.name);
        walker.walk(preAst.constraint);
    }

    function walkGenericTypeChildren(preAst: GenericType, walker: AstWalker): void {
        walker.walk(preAst.name);
        walker.walk(preAst.typeArguments);
    }

    function walkTypeReferenceChildren(preAst: TypeReference, walker: AstWalker): void {
        walker.walk(preAst.term);
    }

    function walkTypeQueryChildren(preAst: TypeQuery, walker: AstWalker): void {
        walker.walk(preAst.name);
    }

    function walkInvocationExpressionChildren(preAst: InvocationExpression, walker: AstWalker): void {
        walker.walk(preAst.target);
        walker.walk(preAst.typeArguments);
        walker.walk(preAst.arguments);
    }

    function walkObjectCreationExpressionChildren(preAst: ObjectCreationExpression, walker: AstWalker): void {
        walker.walk(preAst.target);

        walker.walk(preAst.typeArguments);
        walker.walk(preAst.arguments);
    }

    function walkTrinaryExpressionChildren(preAst: ConditionalExpression, walker: AstWalker): void {
        walker.walk(preAst.condition);
        walker.walk(preAst.whenTrue);
        walker.walk(preAst.whenFalse);
    }

    function walkFunctionExpressionChildren(preAst: FunctionExpression, walker: AstWalker): void {
        walker.walk(preAst.name);
        walker.walk(preAst.typeParameters);
        walker.walk(preAst.parameterList);
        walker.walk(preAst.returnTypeAnnotation);
        walker.walk(preAst.block);
    }

    function walkArrowFunctionExpressionChildren(preAst: ArrowFunctionExpression, walker: AstWalker): void {
        walker.walk(preAst.typeParameters);
        walker.walk(preAst.parameterList);
        walker.walk(preAst.returnTypeAnnotation);
        walker.walk(preAst.block);
    }

    function walkMemberFunctionDeclarationChildren(preAst: MemberFunctionDeclaration, walker: AstWalker): void {
        walker.walk(preAst.name);
        walker.walk(preAst.typeParameters);
        walker.walk(preAst.parameterList);
        walker.walk(preAst.returnTypeAnnotation);
        walker.walk(preAst.block);
    }

    function walkFuncDeclChildren(preAst: FunctionDeclaration, walker: AstWalker): void {
        walker.walk(preAst.name);
        walker.walk(preAst.typeParameters);
        walker.walk(preAst.parameterList);
        walker.walk(preAst.returnTypeAnnotation);
        walker.walk(preAst.block);
    }

    function walkConstructorDeclarationChildren(preAst: ConstructorDeclaration, walker: AstWalker): void {
        walker.walk(preAst.parameterList);
        walker.walk(preAst.block);
    }

    function walkParameterChildren(preAst: Parameter, walker: AstWalker): void {
        walker.walk(preAst.id);
        walker.walk(preAst.typeExpr);
        walker.walk(preAst.init);
    }

    function walkVariableDeclaratorChildren(preAst: VariableDeclarator, walker: AstWalker): void {
        walker.walk(preAst.id);
        walker.walk(preAst.typeExpr);
        walker.walk(preAst.init);
    }

    function walkMemberVariableDeclarationChildren(preAst: MemberVariableDeclaration, walker: AstWalker): void {
        walker.walk(preAst.id);
        walker.walk(preAst.typeExpr);
        walker.walk(preAst.init);
    }

    function walkReturnStatementChildren(preAst: ReturnStatement, walker: AstWalker): void {
        walker.walk(preAst.expression);
    }

    function walkForStatementChildren(preAst: ForStatement, walker: AstWalker): void {
        walker.walk(preAst.init);
        walker.walk(preAst.cond);
        walker.walk(preAst.incr);
        walker.walk(preAst.body);
    }

    function walkForInStatementChildren(preAst: ForInStatement, walker: AstWalker): void {
        walker.walk(preAst.variableDeclaration);
        walker.walk(preAst.expression);
        walker.walk(preAst.statement);
    }

    function walkIfStatementChildren(preAst: IfStatement, walker: AstWalker): void {
        walker.walk(preAst.condition);
        walker.walk(preAst.statement);
        walker.walk(preAst.elseClause);
    }

    function walkElseClauseChildren(preAst: ElseClause, walker: AstWalker): void {
        walker.walk(preAst.statement);
    }

    function walkWhileStatementChildren(preAst: WhileStatement, walker: AstWalker): void {
        walker.walk(preAst.condition);
        walker.walk(preAst.statement);
    }

    function walkDoStatementChildren(preAst: DoStatement, walker: AstWalker): void {
        walker.walk(preAst.condition);
        walker.walk(preAst.statement);
    }

    function walkBlockChildren(preAst: Block, walker: AstWalker): void {
        walker.walk(preAst.statements);
    }

    function walkVariableDeclarationChildren(preAst: VariableDeclaration, walker: AstWalker): void {
        walker.walk(preAst.declarators);
    }

    function walkCaseSwitchClauseChildren(preAst: CaseSwitchClause, walker: AstWalker): void {
        walker.walk(preAst.expr);
        walker.walk(preAst.body);
    }

    function walkDefaultSwitchClauseChildren(preAst: DefaultSwitchClause, walker: AstWalker): void {
        walker.walk(preAst.body);
    }

    function walkSwitchStatementChildren(preAst: SwitchStatement, walker: AstWalker): void {
        walker.walk(preAst.expression);
        walker.walk(preAst.caseList);
    }

    function walkTryStatementChildren(preAst: TryStatement, walker: AstWalker): void {
        walker.walk(preAst.block);
        walker.walk(preAst.catchClause);
        walker.walk(preAst.finallyBody);
    }

    function walkCatchClauseChildren(preAst: CatchClause, walker: AstWalker): void {
        walker.walk(preAst.param);
        walker.walk(preAst.block);
    }

    function walkClassDeclChildren(preAst: ClassDeclaration, walker: AstWalker): void {
        walker.walk(preAst.identifier);
        walker.walk(preAst.typeParameterList);
        walker.walk(preAst.heritageClauses);
        walker.walk(preAst.classElements);
    }

    function walkScriptChildren(preAst: Script, walker: AstWalker): void {
        walker.walk(preAst.moduleElements);
    }

    function walkHeritageClauseChildren(preAst: HeritageClause, walker: AstWalker): void {
        walker.walk(preAst.typeNames);
    }

    function walkInterfaceDeclerationChildren(preAst: InterfaceDeclaration, walker: AstWalker): void {
        walker.walk(preAst.identifier);
        walker.walk(preAst.typeParameterList);
        walker.walk(preAst.heritageClauses);
        walker.walk(preAst.body);
    }

    function walkObjectTypeChildren(preAst: ObjectType, walker: AstWalker): void {
        walker.walk(preAst.typeMembers);
    }

    function walkArrayTypeChildren(preAst: ArrayType, walker: AstWalker): void {
        walker.walk(preAst.type);
    }

    function walkModuleDeclChildren(preAst: ModuleDeclaration, walker: AstWalker): void {
        walker.walk(preAst.name);
        walker.walk(preAst.members);
    }

    function walkEnumDeclarationChildren(preAst: EnumDeclaration, walker: AstWalker): void {
        walker.walk(preAst.identifier);
        walker.walk(preAst.enumElements);
    }

    function walkEnumElementChildren(preAst: EnumElement, walker: AstWalker): void {
        walker.walk(preAst.identifier);
        walker.walk(preAst.value);
    }

    function walkImportDeclChildren(preAst: ImportDeclaration, walker: AstWalker): void {
        walker.walk(preAst.identifier);
        walker.walk(preAst.moduleReference);
    }

    function walkExportAssignmentChildren(preAst: ExportAssignment, walker: AstWalker): void {
        walker.walk(preAst.identifier);
    }

    function walkWithStatementChildren(preAst: WithStatement, walker: AstWalker): void {
        walker.walk(preAst.condition);
        walker.walk(preAst.statement);
    }

    function walkExpressionStatementChildren(preAst: ExpressionStatement, walker: AstWalker): void {
        walker.walk(preAst.expression);
    }

    function walkLabeledStatementChildren(preAst: LabeledStatement, walker: AstWalker): void {
        walker.walk(preAst.identifier);
        walker.walk(preAst.statement);
    }

    function walkVariableStatementChildren(preAst: VariableStatement, walker: AstWalker): void {
        walker.walk(preAst.declaration);
    }

    var childrenWalkers: IAstWalkChildren[] = new Array<IAstWalkChildren>(NodeType.LastNodeType + 1);

    childrenWalkers[NodeType.None] = null;
    childrenWalkers[NodeType.EmptyStatement] = null;
    childrenWalkers[NodeType.OmittedExpression] = null;
    childrenWalkers[NodeType.TrueLiteral] = null;
    childrenWalkers[NodeType.FalseLiteral] = null;
    childrenWalkers[NodeType.ThisExpression] = null;
    childrenWalkers[NodeType.SuperExpression] = null;
    childrenWalkers[NodeType.StringLiteral] = null;
    childrenWalkers[NodeType.RegularExpressionLiteral] = null;
    childrenWalkers[NodeType.NullLiteral] = null;
    childrenWalkers[NodeType.ArrayLiteralExpression] = walkArrayLiteralExpressionChildren;
    childrenWalkers[NodeType.ObjectLiteralExpression] = walkObjectLiteralExpressionChildren;
    childrenWalkers[NodeType.SimplePropertyAssignment] = walkSimplePropertyAssignmentChildren;
    childrenWalkers[NodeType.FunctionPropertyAssignment] = walkFunctionPropertyAssignmentChildren;
    childrenWalkers[NodeType.GetAccessor] = walkGetAccessorChildren;
    childrenWalkers[NodeType.SetAccessor] = walkSetAccessorChildren;
    childrenWalkers[NodeType.VoidExpression] = walkVoidExpressionChildren;
    childrenWalkers[NodeType.CommaExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.PlusExpression] = walkPrefixUnaryExpressionChildren;
    childrenWalkers[NodeType.NegateExpression] = walkPrefixUnaryExpressionChildren;
    childrenWalkers[NodeType.DeleteExpression] = walkDeleteExpressionChildren;
    childrenWalkers[NodeType.InExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.MemberAccessExpression] = walkMemberAccessExpressionChildren;
    childrenWalkers[NodeType.QualifiedName] = walkQualifiedNameChildren;
    childrenWalkers[NodeType.InstanceOfExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.TypeOfExpression] = walkTypeOfExpressionChildren;
    childrenWalkers[NodeType.NumericLiteral] = null;
    childrenWalkers[NodeType.Name] = null;
    childrenWalkers[NodeType.TypeParameter] = walkTypeParameterChildren;
    childrenWalkers[NodeType.GenericType] = walkGenericTypeChildren;
    childrenWalkers[NodeType.TypeRef] = walkTypeReferenceChildren;
    childrenWalkers[NodeType.TypeQuery] = walkTypeQueryChildren;
    childrenWalkers[NodeType.ElementAccessExpression] = walkElementAccessExpressionChildren;
    childrenWalkers[NodeType.InvocationExpression] = walkInvocationExpressionChildren;
    childrenWalkers[NodeType.ObjectCreationExpression] = walkObjectCreationExpressionChildren;
    childrenWalkers[NodeType.AssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.AddAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.SubtractAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.DivideAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.MultiplyAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.ModuloAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.AndAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.ExclusiveOrAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.OrAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.LeftShiftAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.SignedRightShiftAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.UnsignedRightShiftAssignmentExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.ConditionalExpression] = walkTrinaryExpressionChildren;
    childrenWalkers[NodeType.LogicalOrExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.LogicalAndExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.BitwiseOrExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.BitwiseExclusiveOrExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.BitwiseAndExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.EqualsWithTypeConversionExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.NotEqualsWithTypeConversionExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.EqualsExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.NotEqualsExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.LessThanExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.LessThanOrEqualExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.GreaterThanExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.GreaterThanOrEqualExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.AddExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.SubtractExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.MultiplyExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.DivideExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.ModuloExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.LeftShiftExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.SignedRightShiftExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.UnsignedRightShiftExpression] = walkBinaryExpressionChildren;
    childrenWalkers[NodeType.BitwiseNotExpression] = walkPrefixUnaryExpressionChildren;
    childrenWalkers[NodeType.LogicalNotExpression] = walkPrefixUnaryExpressionChildren;
    childrenWalkers[NodeType.PreIncrementExpression] = walkPrefixUnaryExpressionChildren;
    childrenWalkers[NodeType.PreDecrementExpression] = walkPrefixUnaryExpressionChildren;
    childrenWalkers[NodeType.PostIncrementExpression] = walkPostfixUnaryExpressionChildren;
    childrenWalkers[NodeType.PostDecrementExpression] = walkPostfixUnaryExpressionChildren;
    childrenWalkers[NodeType.CastExpression] = walkCastExpressionChildren;
    childrenWalkers[NodeType.ParenthesizedExpression] = walkParenthesizedExpressionChildren;
    childrenWalkers[NodeType.ArrowFunctionExpression] = walkArrowFunctionExpressionChildren;
    childrenWalkers[NodeType.FunctionExpression] = walkFunctionExpressionChildren;
    childrenWalkers[NodeType.FunctionDeclaration] = walkFuncDeclChildren;
    childrenWalkers[NodeType.MemberFunctionDeclaration] = walkMemberFunctionDeclarationChildren;
    childrenWalkers[NodeType.ConstructorDeclaration] = walkConstructorDeclarationChildren;
    childrenWalkers[NodeType.VariableDeclarator] = walkVariableDeclaratorChildren;
    childrenWalkers[NodeType.MemberVariableDeclaration] = walkMemberVariableDeclarationChildren;
    childrenWalkers[NodeType.VariableDeclaration] = walkVariableDeclarationChildren;
    childrenWalkers[NodeType.Parameter] = walkParameterChildren;
    childrenWalkers[NodeType.ReturnStatement] = walkReturnStatementChildren;
    childrenWalkers[NodeType.BreakStatement] = null;
    childrenWalkers[NodeType.ContinueStatement] = null;
    childrenWalkers[NodeType.ThrowStatement] = walkThrowStatementChildren;
    childrenWalkers[NodeType.ForStatement] = walkForStatementChildren;
    childrenWalkers[NodeType.ForInStatement] = walkForInStatementChildren;
    childrenWalkers[NodeType.IfStatement] = walkIfStatementChildren;
    childrenWalkers[NodeType.ElseClause] = walkElseClauseChildren;
    childrenWalkers[NodeType.WhileStatement] = walkWhileStatementChildren;
    childrenWalkers[NodeType.DoStatement] = walkDoStatementChildren;
    childrenWalkers[NodeType.Block] = walkBlockChildren;
    childrenWalkers[NodeType.CaseSwitchClause] = walkCaseSwitchClauseChildren;
    childrenWalkers[NodeType.DefaultSwitchClause] = walkDefaultSwitchClauseChildren;
    childrenWalkers[NodeType.SwitchStatement] = walkSwitchStatementChildren;
    childrenWalkers[NodeType.TryStatement] = walkTryStatementChildren;
    childrenWalkers[NodeType.CatchClause] = walkCatchClauseChildren;
    childrenWalkers[NodeType.List] = walkListChildren;
    childrenWalkers[NodeType.Script] = walkScriptChildren;
    childrenWalkers[NodeType.ClassDeclaration] = walkClassDeclChildren;
    childrenWalkers[NodeType.InterfaceDeclaration] = walkInterfaceDeclerationChildren;
    childrenWalkers[NodeType.ExtendsHeritageClause] = walkHeritageClauseChildren;
    childrenWalkers[NodeType.ImplementsHeritageClause] = walkHeritageClauseChildren;
    childrenWalkers[NodeType.ObjectType] = walkObjectTypeChildren;
    childrenWalkers[NodeType.ArrayType] = walkArrayTypeChildren;
    childrenWalkers[NodeType.ModuleDeclaration] = walkModuleDeclChildren;
    childrenWalkers[NodeType.EnumDeclaration] = walkEnumDeclarationChildren;
    childrenWalkers[NodeType.EnumElement] = walkEnumElementChildren;
    childrenWalkers[NodeType.ImportDeclaration] = walkImportDeclChildren;
    childrenWalkers[NodeType.ExportAssignment] = walkExportAssignmentChildren;
    childrenWalkers[NodeType.WithStatement] = walkWithStatementChildren;
    childrenWalkers[NodeType.ExpressionStatement] = walkExpressionStatementChildren;
    childrenWalkers[NodeType.LabeledStatement] = walkLabeledStatementChildren;
    childrenWalkers[NodeType.VariableStatement] = walkVariableStatementChildren;
    childrenWalkers[NodeType.DebuggerStatement] = null;

    // Verify the code is up to date with the enum
    for (var e in NodeType) {
        if (NodeType.hasOwnProperty(e) && StringUtilities.isString(NodeType[e])) {
            CompilerDiagnostics.assert(childrenWalkers[e] !== undefined, "initWalkers function is not up to date with enum content!");
        }
    }

    export class AstWalkOptions {
        public goChildren = true;
        public stopWalking = false;
    }

    interface IAstWalkChildren {
        (preAst: AST, walker: AstWalker): void;
    }

    export interface IAstWalker {
        options: AstWalkOptions;
        state: any
    }

    interface AstWalker {
        walk(ast: AST): void;
    }

    class SimplePreAstWalker implements AstWalker {
        public options: AstWalkOptions = new AstWalkOptions();

        constructor(
            private pre: (ast: AST, state: any) => void,
            public state: any) {
        }

        public walk(ast: AST): void {
            if (!ast) {
                return;
            }

            this.pre(ast, this.state);

            var walker = childrenWalkers[ast.nodeType()];
            if (walker) {
                walker(ast, this);
            }
        }
    }

    class SimplePrePostAstWalker implements AstWalker {
        public options: AstWalkOptions = new AstWalkOptions();

        constructor(
            private pre: (ast: AST, state: any) => void,
            private post: (ast: AST, state: any) => void,
            public state: any) {
        }

        public walk(ast: AST): void {
            if (!ast) {
                return;
            }

            this.pre(ast, this.state);

            var walker = childrenWalkers[ast.nodeType()];
            if (walker) {
                walker(ast, this);
            }

            this.post(ast, this.state);
        }
    }

    class NormalAstWalker implements AstWalker {
        public options: AstWalkOptions = new AstWalkOptions();

        constructor(
            private pre: (ast: AST, walker: IAstWalker) => void,
            private post: (ast: AST, walker: IAstWalker) => void,
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
                var walker = childrenWalkers[ast.nodeType()];
                if (walker) {
                    walker(ast, this);
                }
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
        public walk(ast: AST, pre: (ast: AST, walker: IAstWalker) => void, post?: (ast: AST, walker: IAstWalker) => void, state?: any): void {
            new NormalAstWalker(pre, post, state).walk(ast);
        }

        public simpleWalk(ast: AST, pre: (ast: AST, state: any) => void, post?: (ast: AST, state: any) => void, state?: any): void {
            if (post) {
                new SimplePrePostAstWalker(pre, post, state).walk(ast);
            }
            else {
                new SimplePreAstWalker(pre, state).walk(ast);
            }
        }
    }

    var globalAstWalkerFactory = new AstWalkerFactory();

    export function getAstWalkerFactory(): AstWalkerFactory {
        return globalAstWalkerFactory;
    }
}