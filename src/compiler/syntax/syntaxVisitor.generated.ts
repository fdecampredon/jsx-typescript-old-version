///<reference path='references.ts' />

module TypeScript {
    export function visitNodeOrToken(visitor: ISyntaxVisitor, element: ISyntaxNodeOrToken): any {
        if (element === null) { return null; }
        if (isToken(element)) { return visitor.visitToken(<ISyntaxToken>element); }
        switch (element.kind) {
            case SyntaxKind.SourceUnit:
                return visitor.visitSourceUnit(<SourceUnitSyntax>element);
            case SyntaxKind.ExternalModuleReference:
                return visitor.visitExternalModuleReference(<ExternalModuleReferenceSyntax>element);
            case SyntaxKind.ModuleNameModuleReference:
                return visitor.visitModuleNameModuleReference(<ModuleNameModuleReferenceSyntax>element);
            case SyntaxKind.ImportDeclaration:
                return visitor.visitImportDeclaration(<ImportDeclarationSyntax>element);
            case SyntaxKind.ExportAssignment:
                return visitor.visitExportAssignment(<ExportAssignmentSyntax>element);
            case SyntaxKind.ClassDeclaration:
                return visitor.visitClassDeclaration(<ClassDeclarationSyntax>element);
            case SyntaxKind.InterfaceDeclaration:
                return visitor.visitInterfaceDeclaration(<InterfaceDeclarationSyntax>element);
            case SyntaxKind.ExtendsHeritageClause: case SyntaxKind.ImplementsHeritageClause:
                return visitor.visitHeritageClause(<HeritageClauseSyntax>element);
            case SyntaxKind.ModuleDeclaration:
                return visitor.visitModuleDeclaration(<ModuleDeclarationSyntax>element);
            case SyntaxKind.FunctionDeclaration:
                return visitor.visitFunctionDeclaration(<FunctionDeclarationSyntax>element);
            case SyntaxKind.VariableStatement:
                return visitor.visitVariableStatement(<VariableStatementSyntax>element);
            case SyntaxKind.VariableDeclaration:
                return visitor.visitVariableDeclaration(<VariableDeclarationSyntax>element);
            case SyntaxKind.VariableDeclarator:
                return visitor.visitVariableDeclarator(<VariableDeclaratorSyntax>element);
            case SyntaxKind.EqualsValueClause:
                return visitor.visitEqualsValueClause(<EqualsValueClauseSyntax>element);
            case SyntaxKind.PreIncrementExpression: case SyntaxKind.PreDecrementExpression: case SyntaxKind.PlusExpression: case SyntaxKind.NegateExpression: case SyntaxKind.BitwiseNotExpression: case SyntaxKind.LogicalNotExpression:
                return visitor.visitPrefixUnaryExpression(<PrefixUnaryExpressionSyntax>element);
            case SyntaxKind.ArrayLiteralExpression:
                return visitor.visitArrayLiteralExpression(<ArrayLiteralExpressionSyntax>element);
            case SyntaxKind.OmittedExpression:
                return visitor.visitOmittedExpression(<OmittedExpressionSyntax>element);
            case SyntaxKind.ParenthesizedExpression:
                return visitor.visitParenthesizedExpression(<ParenthesizedExpressionSyntax>element);
            case SyntaxKind.SimpleArrowFunctionExpression:
                return visitor.visitSimpleArrowFunctionExpression(<SimpleArrowFunctionExpressionSyntax>element);
            case SyntaxKind.ParenthesizedArrowFunctionExpression:
                return visitor.visitParenthesizedArrowFunctionExpression(<ParenthesizedArrowFunctionExpressionSyntax>element);
            case SyntaxKind.QualifiedName:
                return visitor.visitQualifiedName(<QualifiedNameSyntax>element);
            case SyntaxKind.TypeArgumentList:
                return visitor.visitTypeArgumentList(<TypeArgumentListSyntax>element);
            case SyntaxKind.ConstructorType:
                return visitor.visitConstructorType(<ConstructorTypeSyntax>element);
            case SyntaxKind.FunctionType:
                return visitor.visitFunctionType(<FunctionTypeSyntax>element);
            case SyntaxKind.ObjectType:
                return visitor.visitObjectType(<ObjectTypeSyntax>element);
            case SyntaxKind.ArrayType:
                return visitor.visitArrayType(<ArrayTypeSyntax>element);
            case SyntaxKind.GenericType:
                return visitor.visitGenericType(<GenericTypeSyntax>element);
            case SyntaxKind.TypeQuery:
                return visitor.visitTypeQuery(<TypeQuerySyntax>element);
            case SyntaxKind.TypeAnnotation:
                return visitor.visitTypeAnnotation(<TypeAnnotationSyntax>element);
            case SyntaxKind.Block:
                return visitor.visitBlock(<BlockSyntax>element);
            case SyntaxKind.Parameter:
                return visitor.visitParameter(<ParameterSyntax>element);
            case SyntaxKind.MemberAccessExpression:
                return visitor.visitMemberAccessExpression(<MemberAccessExpressionSyntax>element);
            case SyntaxKind.PostIncrementExpression: case SyntaxKind.PostDecrementExpression:
                return visitor.visitPostfixUnaryExpression(<PostfixUnaryExpressionSyntax>element);
            case SyntaxKind.ElementAccessExpression:
                return visitor.visitElementAccessExpression(<ElementAccessExpressionSyntax>element);
            case SyntaxKind.InvocationExpression:
                return visitor.visitInvocationExpression(<InvocationExpressionSyntax>element);
            case SyntaxKind.ArgumentList:
                return visitor.visitArgumentList(<ArgumentListSyntax>element);
            case SyntaxKind.MultiplyExpression: case SyntaxKind.DivideExpression: case SyntaxKind.ModuloExpression: case SyntaxKind.AddExpression: case SyntaxKind.SubtractExpression: case SyntaxKind.LeftShiftExpression: case SyntaxKind.SignedRightShiftExpression: case SyntaxKind.UnsignedRightShiftExpression: case SyntaxKind.LessThanExpression: case SyntaxKind.GreaterThanExpression: case SyntaxKind.LessThanOrEqualExpression: case SyntaxKind.GreaterThanOrEqualExpression: case SyntaxKind.InstanceOfExpression: case SyntaxKind.InExpression: case SyntaxKind.EqualsWithTypeConversionExpression: case SyntaxKind.NotEqualsWithTypeConversionExpression: case SyntaxKind.EqualsExpression: case SyntaxKind.NotEqualsExpression: case SyntaxKind.BitwiseAndExpression: case SyntaxKind.BitwiseExclusiveOrExpression: case SyntaxKind.BitwiseOrExpression: case SyntaxKind.LogicalAndExpression: case SyntaxKind.LogicalOrExpression: case SyntaxKind.OrAssignmentExpression: case SyntaxKind.AndAssignmentExpression: case SyntaxKind.ExclusiveOrAssignmentExpression: case SyntaxKind.LeftShiftAssignmentExpression: case SyntaxKind.SignedRightShiftAssignmentExpression: case SyntaxKind.UnsignedRightShiftAssignmentExpression: case SyntaxKind.AddAssignmentExpression: case SyntaxKind.SubtractAssignmentExpression: case SyntaxKind.MultiplyAssignmentExpression: case SyntaxKind.DivideAssignmentExpression: case SyntaxKind.ModuloAssignmentExpression: case SyntaxKind.AssignmentExpression: case SyntaxKind.CommaExpression:
                return visitor.visitBinaryExpression(<BinaryExpressionSyntax>element);
            case SyntaxKind.ConditionalExpression:
                return visitor.visitConditionalExpression(<ConditionalExpressionSyntax>element);
            case SyntaxKind.ConstructSignature:
                return visitor.visitConstructSignature(<ConstructSignatureSyntax>element);
            case SyntaxKind.MethodSignature:
                return visitor.visitMethodSignature(<MethodSignatureSyntax>element);
            case SyntaxKind.IndexSignature:
                return visitor.visitIndexSignature(<IndexSignatureSyntax>element);
            case SyntaxKind.PropertySignature:
                return visitor.visitPropertySignature(<PropertySignatureSyntax>element);
            case SyntaxKind.CallSignature:
                return visitor.visitCallSignature(<CallSignatureSyntax>element);
            case SyntaxKind.ParameterList:
                return visitor.visitParameterList(<ParameterListSyntax>element);
            case SyntaxKind.TypeParameterList:
                return visitor.visitTypeParameterList(<TypeParameterListSyntax>element);
            case SyntaxKind.TypeParameter:
                return visitor.visitTypeParameter(<TypeParameterSyntax>element);
            case SyntaxKind.Constraint:
                return visitor.visitConstraint(<ConstraintSyntax>element);
            case SyntaxKind.ElseClause:
                return visitor.visitElseClause(<ElseClauseSyntax>element);
            case SyntaxKind.IfStatement:
                return visitor.visitIfStatement(<IfStatementSyntax>element);
            case SyntaxKind.ExpressionStatement:
                return visitor.visitExpressionStatement(<ExpressionStatementSyntax>element);
            case SyntaxKind.ConstructorDeclaration:
                return visitor.visitConstructorDeclaration(<ConstructorDeclarationSyntax>element);
            case SyntaxKind.MemberFunctionDeclaration:
                return visitor.visitMemberFunctionDeclaration(<MemberFunctionDeclarationSyntax>element);
            case SyntaxKind.GetAccessor:
                return visitor.visitGetAccessor(<GetAccessorSyntax>element);
            case SyntaxKind.SetAccessor:
                return visitor.visitSetAccessor(<SetAccessorSyntax>element);
            case SyntaxKind.MemberVariableDeclaration:
                return visitor.visitMemberVariableDeclaration(<MemberVariableDeclarationSyntax>element);
            case SyntaxKind.IndexMemberDeclaration:
                return visitor.visitIndexMemberDeclaration(<IndexMemberDeclarationSyntax>element);
            case SyntaxKind.ThrowStatement:
                return visitor.visitThrowStatement(<ThrowStatementSyntax>element);
            case SyntaxKind.ReturnStatement:
                return visitor.visitReturnStatement(<ReturnStatementSyntax>element);
            case SyntaxKind.ObjectCreationExpression:
                return visitor.visitObjectCreationExpression(<ObjectCreationExpressionSyntax>element);
            case SyntaxKind.SwitchStatement:
                return visitor.visitSwitchStatement(<SwitchStatementSyntax>element);
            case SyntaxKind.CaseSwitchClause:
                return visitor.visitCaseSwitchClause(<CaseSwitchClauseSyntax>element);
            case SyntaxKind.DefaultSwitchClause:
                return visitor.visitDefaultSwitchClause(<DefaultSwitchClauseSyntax>element);
            case SyntaxKind.BreakStatement:
                return visitor.visitBreakStatement(<BreakStatementSyntax>element);
            case SyntaxKind.ContinueStatement:
                return visitor.visitContinueStatement(<ContinueStatementSyntax>element);
            case SyntaxKind.ForStatement:
                return visitor.visitForStatement(<ForStatementSyntax>element);
            case SyntaxKind.ForInStatement:
                return visitor.visitForInStatement(<ForInStatementSyntax>element);
            case SyntaxKind.WhileStatement:
                return visitor.visitWhileStatement(<WhileStatementSyntax>element);
            case SyntaxKind.WithStatement:
                return visitor.visitWithStatement(<WithStatementSyntax>element);
            case SyntaxKind.EnumDeclaration:
                return visitor.visitEnumDeclaration(<EnumDeclarationSyntax>element);
            case SyntaxKind.EnumElement:
                return visitor.visitEnumElement(<EnumElementSyntax>element);
            case SyntaxKind.CastExpression:
                return visitor.visitCastExpression(<CastExpressionSyntax>element);
            case SyntaxKind.ObjectLiteralExpression:
                return visitor.visitObjectLiteralExpression(<ObjectLiteralExpressionSyntax>element);
            case SyntaxKind.SimplePropertyAssignment:
                return visitor.visitSimplePropertyAssignment(<SimplePropertyAssignmentSyntax>element);
            case SyntaxKind.FunctionPropertyAssignment:
                return visitor.visitFunctionPropertyAssignment(<FunctionPropertyAssignmentSyntax>element);
            case SyntaxKind.FunctionExpression:
                return visitor.visitFunctionExpression(<FunctionExpressionSyntax>element);
            case SyntaxKind.EmptyStatement:
                return visitor.visitEmptyStatement(<EmptyStatementSyntax>element);
            case SyntaxKind.TryStatement:
                return visitor.visitTryStatement(<TryStatementSyntax>element);
            case SyntaxKind.CatchClause:
                return visitor.visitCatchClause(<CatchClauseSyntax>element);
            case SyntaxKind.FinallyClause:
                return visitor.visitFinallyClause(<FinallyClauseSyntax>element);
            case SyntaxKind.LabeledStatement:
                return visitor.visitLabeledStatement(<LabeledStatementSyntax>element);
            case SyntaxKind.DoStatement:
                return visitor.visitDoStatement(<DoStatementSyntax>element);
            case SyntaxKind.TypeOfExpression:
                return visitor.visitTypeOfExpression(<TypeOfExpressionSyntax>element);
            case SyntaxKind.DeleteExpression:
                return visitor.visitDeleteExpression(<DeleteExpressionSyntax>element);
            case SyntaxKind.VoidExpression:
                return visitor.visitVoidExpression(<VoidExpressionSyntax>element);
            case SyntaxKind.DebuggerStatement:
                return visitor.visitDebuggerStatement(<DebuggerStatementSyntax>element);
        }

        throw Errors.invalidOperation();
    }

    export interface ISyntaxVisitor {
        visitToken(token: ISyntaxToken): any;
        visitSourceUnit(node: SourceUnitSyntax): any;
        visitExternalModuleReference(node: ExternalModuleReferenceSyntax): any;
        visitModuleNameModuleReference(node: ModuleNameModuleReferenceSyntax): any;
        visitImportDeclaration(node: ImportDeclarationSyntax): any;
        visitExportAssignment(node: ExportAssignmentSyntax): any;
        visitClassDeclaration(node: ClassDeclarationSyntax): any;
        visitInterfaceDeclaration(node: InterfaceDeclarationSyntax): any;
        visitHeritageClause(node: HeritageClauseSyntax): any;
        visitModuleDeclaration(node: ModuleDeclarationSyntax): any;
        visitFunctionDeclaration(node: FunctionDeclarationSyntax): any;
        visitVariableStatement(node: VariableStatementSyntax): any;
        visitVariableDeclaration(node: VariableDeclarationSyntax): any;
        visitVariableDeclarator(node: VariableDeclaratorSyntax): any;
        visitEqualsValueClause(node: EqualsValueClauseSyntax): any;
        visitPrefixUnaryExpression(node: PrefixUnaryExpressionSyntax): any;
        visitArrayLiteralExpression(node: ArrayLiteralExpressionSyntax): any;
        visitOmittedExpression(node: OmittedExpressionSyntax): any;
        visitParenthesizedExpression(node: ParenthesizedExpressionSyntax): any;
        visitSimpleArrowFunctionExpression(node: SimpleArrowFunctionExpressionSyntax): any;
        visitParenthesizedArrowFunctionExpression(node: ParenthesizedArrowFunctionExpressionSyntax): any;
        visitQualifiedName(node: QualifiedNameSyntax): any;
        visitTypeArgumentList(node: TypeArgumentListSyntax): any;
        visitConstructorType(node: ConstructorTypeSyntax): any;
        visitFunctionType(node: FunctionTypeSyntax): any;
        visitObjectType(node: ObjectTypeSyntax): any;
        visitArrayType(node: ArrayTypeSyntax): any;
        visitGenericType(node: GenericTypeSyntax): any;
        visitTypeQuery(node: TypeQuerySyntax): any;
        visitTypeAnnotation(node: TypeAnnotationSyntax): any;
        visitBlock(node: BlockSyntax): any;
        visitParameter(node: ParameterSyntax): any;
        visitMemberAccessExpression(node: MemberAccessExpressionSyntax): any;
        visitPostfixUnaryExpression(node: PostfixUnaryExpressionSyntax): any;
        visitElementAccessExpression(node: ElementAccessExpressionSyntax): any;
        visitInvocationExpression(node: InvocationExpressionSyntax): any;
        visitArgumentList(node: ArgumentListSyntax): any;
        visitBinaryExpression(node: BinaryExpressionSyntax): any;
        visitConditionalExpression(node: ConditionalExpressionSyntax): any;
        visitConstructSignature(node: ConstructSignatureSyntax): any;
        visitMethodSignature(node: MethodSignatureSyntax): any;
        visitIndexSignature(node: IndexSignatureSyntax): any;
        visitPropertySignature(node: PropertySignatureSyntax): any;
        visitCallSignature(node: CallSignatureSyntax): any;
        visitParameterList(node: ParameterListSyntax): any;
        visitTypeParameterList(node: TypeParameterListSyntax): any;
        visitTypeParameter(node: TypeParameterSyntax): any;
        visitConstraint(node: ConstraintSyntax): any;
        visitElseClause(node: ElseClauseSyntax): any;
        visitIfStatement(node: IfStatementSyntax): any;
        visitExpressionStatement(node: ExpressionStatementSyntax): any;
        visitConstructorDeclaration(node: ConstructorDeclarationSyntax): any;
        visitMemberFunctionDeclaration(node: MemberFunctionDeclarationSyntax): any;
        visitGetAccessor(node: GetAccessorSyntax): any;
        visitSetAccessor(node: SetAccessorSyntax): any;
        visitMemberVariableDeclaration(node: MemberVariableDeclarationSyntax): any;
        visitIndexMemberDeclaration(node: IndexMemberDeclarationSyntax): any;
        visitThrowStatement(node: ThrowStatementSyntax): any;
        visitReturnStatement(node: ReturnStatementSyntax): any;
        visitObjectCreationExpression(node: ObjectCreationExpressionSyntax): any;
        visitSwitchStatement(node: SwitchStatementSyntax): any;
        visitCaseSwitchClause(node: CaseSwitchClauseSyntax): any;
        visitDefaultSwitchClause(node: DefaultSwitchClauseSyntax): any;
        visitBreakStatement(node: BreakStatementSyntax): any;
        visitContinueStatement(node: ContinueStatementSyntax): any;
        visitForStatement(node: ForStatementSyntax): any;
        visitForInStatement(node: ForInStatementSyntax): any;
        visitWhileStatement(node: WhileStatementSyntax): any;
        visitWithStatement(node: WithStatementSyntax): any;
        visitEnumDeclaration(node: EnumDeclarationSyntax): any;
        visitEnumElement(node: EnumElementSyntax): any;
        visitCastExpression(node: CastExpressionSyntax): any;
        visitObjectLiteralExpression(node: ObjectLiteralExpressionSyntax): any;
        visitSimplePropertyAssignment(node: SimplePropertyAssignmentSyntax): any;
        visitFunctionPropertyAssignment(node: FunctionPropertyAssignmentSyntax): any;
        visitFunctionExpression(node: FunctionExpressionSyntax): any;
        visitEmptyStatement(node: EmptyStatementSyntax): any;
        visitTryStatement(node: TryStatementSyntax): any;
        visitCatchClause(node: CatchClauseSyntax): any;
        visitFinallyClause(node: FinallyClauseSyntax): any;
        visitLabeledStatement(node: LabeledStatementSyntax): any;
        visitDoStatement(node: DoStatementSyntax): any;
        visitTypeOfExpression(node: TypeOfExpressionSyntax): any;
        visitDeleteExpression(node: DeleteExpressionSyntax): any;
        visitVoidExpression(node: VoidExpressionSyntax): any;
        visitDebuggerStatement(node: DebuggerStatementSyntax): any;
    }

    export class SyntaxVisitor implements ISyntaxVisitor {
        public defaultVisit(node: ISyntaxNodeOrToken): any {
            return null;
        }

        public visitToken(token: ISyntaxToken): any {
            return this.defaultVisit(token);
        }

        public visitSourceUnit(node: SourceUnitSyntax): any {
            return this.defaultVisit(node);
        }

        public visitExternalModuleReference(node: ExternalModuleReferenceSyntax): any {
            return this.defaultVisit(node);
        }

        public visitModuleNameModuleReference(node: ModuleNameModuleReferenceSyntax): any {
            return this.defaultVisit(node);
        }

        public visitImportDeclaration(node: ImportDeclarationSyntax): any {
            return this.defaultVisit(node);
        }

        public visitExportAssignment(node: ExportAssignmentSyntax): any {
            return this.defaultVisit(node);
        }

        public visitClassDeclaration(node: ClassDeclarationSyntax): any {
            return this.defaultVisit(node);
        }

        public visitInterfaceDeclaration(node: InterfaceDeclarationSyntax): any {
            return this.defaultVisit(node);
        }

        public visitHeritageClause(node: HeritageClauseSyntax): any {
            return this.defaultVisit(node);
        }

        public visitModuleDeclaration(node: ModuleDeclarationSyntax): any {
            return this.defaultVisit(node);
        }

        public visitFunctionDeclaration(node: FunctionDeclarationSyntax): any {
            return this.defaultVisit(node);
        }

        public visitVariableStatement(node: VariableStatementSyntax): any {
            return this.defaultVisit(node);
        }

        public visitVariableDeclaration(node: VariableDeclarationSyntax): any {
            return this.defaultVisit(node);
        }

        public visitVariableDeclarator(node: VariableDeclaratorSyntax): any {
            return this.defaultVisit(node);
        }

        public visitEqualsValueClause(node: EqualsValueClauseSyntax): any {
            return this.defaultVisit(node);
        }

        public visitPrefixUnaryExpression(node: PrefixUnaryExpressionSyntax): any {
            return this.defaultVisit(node);
        }

        public visitArrayLiteralExpression(node: ArrayLiteralExpressionSyntax): any {
            return this.defaultVisit(node);
        }

        public visitOmittedExpression(node: OmittedExpressionSyntax): any {
            return this.defaultVisit(node);
        }

        public visitParenthesizedExpression(node: ParenthesizedExpressionSyntax): any {
            return this.defaultVisit(node);
        }

        public visitSimpleArrowFunctionExpression(node: SimpleArrowFunctionExpressionSyntax): any {
            return this.defaultVisit(node);
        }

        public visitParenthesizedArrowFunctionExpression(node: ParenthesizedArrowFunctionExpressionSyntax): any {
            return this.defaultVisit(node);
        }

        public visitQualifiedName(node: QualifiedNameSyntax): any {
            return this.defaultVisit(node);
        }

        public visitTypeArgumentList(node: TypeArgumentListSyntax): any {
            return this.defaultVisit(node);
        }

        public visitConstructorType(node: ConstructorTypeSyntax): any {
            return this.defaultVisit(node);
        }

        public visitFunctionType(node: FunctionTypeSyntax): any {
            return this.defaultVisit(node);
        }

        public visitObjectType(node: ObjectTypeSyntax): any {
            return this.defaultVisit(node);
        }

        public visitArrayType(node: ArrayTypeSyntax): any {
            return this.defaultVisit(node);
        }

        public visitGenericType(node: GenericTypeSyntax): any {
            return this.defaultVisit(node);
        }

        public visitTypeQuery(node: TypeQuerySyntax): any {
            return this.defaultVisit(node);
        }

        public visitTypeAnnotation(node: TypeAnnotationSyntax): any {
            return this.defaultVisit(node);
        }

        public visitBlock(node: BlockSyntax): any {
            return this.defaultVisit(node);
        }

        public visitParameter(node: ParameterSyntax): any {
            return this.defaultVisit(node);
        }

        public visitMemberAccessExpression(node: MemberAccessExpressionSyntax): any {
            return this.defaultVisit(node);
        }

        public visitPostfixUnaryExpression(node: PostfixUnaryExpressionSyntax): any {
            return this.defaultVisit(node);
        }

        public visitElementAccessExpression(node: ElementAccessExpressionSyntax): any {
            return this.defaultVisit(node);
        }

        public visitInvocationExpression(node: InvocationExpressionSyntax): any {
            return this.defaultVisit(node);
        }

        public visitArgumentList(node: ArgumentListSyntax): any {
            return this.defaultVisit(node);
        }

        public visitBinaryExpression(node: BinaryExpressionSyntax): any {
            return this.defaultVisit(node);
        }

        public visitConditionalExpression(node: ConditionalExpressionSyntax): any {
            return this.defaultVisit(node);
        }

        public visitConstructSignature(node: ConstructSignatureSyntax): any {
            return this.defaultVisit(node);
        }

        public visitMethodSignature(node: MethodSignatureSyntax): any {
            return this.defaultVisit(node);
        }

        public visitIndexSignature(node: IndexSignatureSyntax): any {
            return this.defaultVisit(node);
        }

        public visitPropertySignature(node: PropertySignatureSyntax): any {
            return this.defaultVisit(node);
        }

        public visitCallSignature(node: CallSignatureSyntax): any {
            return this.defaultVisit(node);
        }

        public visitParameterList(node: ParameterListSyntax): any {
            return this.defaultVisit(node);
        }

        public visitTypeParameterList(node: TypeParameterListSyntax): any {
            return this.defaultVisit(node);
        }

        public visitTypeParameter(node: TypeParameterSyntax): any {
            return this.defaultVisit(node);
        }

        public visitConstraint(node: ConstraintSyntax): any {
            return this.defaultVisit(node);
        }

        public visitElseClause(node: ElseClauseSyntax): any {
            return this.defaultVisit(node);
        }

        public visitIfStatement(node: IfStatementSyntax): any {
            return this.defaultVisit(node);
        }

        public visitExpressionStatement(node: ExpressionStatementSyntax): any {
            return this.defaultVisit(node);
        }

        public visitConstructorDeclaration(node: ConstructorDeclarationSyntax): any {
            return this.defaultVisit(node);
        }

        public visitMemberFunctionDeclaration(node: MemberFunctionDeclarationSyntax): any {
            return this.defaultVisit(node);
        }

        public visitGetAccessor(node: GetAccessorSyntax): any {
            return this.defaultVisit(node);
        }

        public visitSetAccessor(node: SetAccessorSyntax): any {
            return this.defaultVisit(node);
        }

        public visitMemberVariableDeclaration(node: MemberVariableDeclarationSyntax): any {
            return this.defaultVisit(node);
        }

        public visitIndexMemberDeclaration(node: IndexMemberDeclarationSyntax): any {
            return this.defaultVisit(node);
        }

        public visitThrowStatement(node: ThrowStatementSyntax): any {
            return this.defaultVisit(node);
        }

        public visitReturnStatement(node: ReturnStatementSyntax): any {
            return this.defaultVisit(node);
        }

        public visitObjectCreationExpression(node: ObjectCreationExpressionSyntax): any {
            return this.defaultVisit(node);
        }

        public visitSwitchStatement(node: SwitchStatementSyntax): any {
            return this.defaultVisit(node);
        }

        public visitCaseSwitchClause(node: CaseSwitchClauseSyntax): any {
            return this.defaultVisit(node);
        }

        public visitDefaultSwitchClause(node: DefaultSwitchClauseSyntax): any {
            return this.defaultVisit(node);
        }

        public visitBreakStatement(node: BreakStatementSyntax): any {
            return this.defaultVisit(node);
        }

        public visitContinueStatement(node: ContinueStatementSyntax): any {
            return this.defaultVisit(node);
        }

        public visitForStatement(node: ForStatementSyntax): any {
            return this.defaultVisit(node);
        }

        public visitForInStatement(node: ForInStatementSyntax): any {
            return this.defaultVisit(node);
        }

        public visitWhileStatement(node: WhileStatementSyntax): any {
            return this.defaultVisit(node);
        }

        public visitWithStatement(node: WithStatementSyntax): any {
            return this.defaultVisit(node);
        }

        public visitEnumDeclaration(node: EnumDeclarationSyntax): any {
            return this.defaultVisit(node);
        }

        public visitEnumElement(node: EnumElementSyntax): any {
            return this.defaultVisit(node);
        }

        public visitCastExpression(node: CastExpressionSyntax): any {
            return this.defaultVisit(node);
        }

        public visitObjectLiteralExpression(node: ObjectLiteralExpressionSyntax): any {
            return this.defaultVisit(node);
        }

        public visitSimplePropertyAssignment(node: SimplePropertyAssignmentSyntax): any {
            return this.defaultVisit(node);
        }

        public visitFunctionPropertyAssignment(node: FunctionPropertyAssignmentSyntax): any {
            return this.defaultVisit(node);
        }

        public visitFunctionExpression(node: FunctionExpressionSyntax): any {
            return this.defaultVisit(node);
        }

        public visitEmptyStatement(node: EmptyStatementSyntax): any {
            return this.defaultVisit(node);
        }

        public visitTryStatement(node: TryStatementSyntax): any {
            return this.defaultVisit(node);
        }

        public visitCatchClause(node: CatchClauseSyntax): any {
            return this.defaultVisit(node);
        }

        public visitFinallyClause(node: FinallyClauseSyntax): any {
            return this.defaultVisit(node);
        }

        public visitLabeledStatement(node: LabeledStatementSyntax): any {
            return this.defaultVisit(node);
        }

        public visitDoStatement(node: DoStatementSyntax): any {
            return this.defaultVisit(node);
        }

        public visitTypeOfExpression(node: TypeOfExpressionSyntax): any {
            return this.defaultVisit(node);
        }

        public visitDeleteExpression(node: DeleteExpressionSyntax): any {
            return this.defaultVisit(node);
        }

        public visitVoidExpression(node: VoidExpressionSyntax): any {
            return this.defaultVisit(node);
        }

        public visitDebuggerStatement(node: DebuggerStatementSyntax): any {
            return this.defaultVisit(node);
        }
    }
}