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
    // Note: Any addition to the NodeType should also be supported with addition to AstWalkerDetailCallback
    export enum NodeType {
        None,
        List,
        Script,
        ArgumentList,

        // Literals
        TrueLiteral,
        FalseLiteral,
        StringLiteral,
        RegularExpressionLiteral,
        NumericLiteral,
        NullLiteral,

        // Types
        AnyType,
        BooleanType,
        NumberType,
        StringType,
        VoidType,
        TypeParameter,
        Constraint,
        GenericType,
        TypeRef,
        TypeQuery,
        QualifiedName,
        FunctionType,
        ConstructorType,
        CallSignature,
        ConstructSignature,
        MethodSignature,
        PropertySignature,
        ParameterList,
        TypeArgumentList,
        TypeParameterList,

        // Declarations
        FunctionDeclaration,
        ConstructorDeclaration,
        ClassDeclaration,
        InterfaceDeclaration,
        GetAccessor,
        SetAccessor,
        ObjectType,
        ArrayType,
        ModuleDeclaration,
        ImportDeclaration,
        VariableDeclarator,
        VariableDeclaration,
        Parameter,
        SimplePropertyAssignment,
        FunctionPropertyAssignment,
        EnumDeclaration,
        EnumElement,
        MemberVariableDeclaration,
        MemberFunctionDeclaration,
        IndexSignature,
        IndexMemberDeclaration,

        // Expressions
        Name,
        ArrayLiteralExpression,
        ObjectLiteralExpression,
        OmittedExpression,
        VoidExpression,
        CommaExpression,
        PlusExpression,
        NegateExpression,
        DeleteExpression,
        ThisExpression,
        SuperExpression,
        InExpression,
        MemberAccessExpression,
        InstanceOfExpression,
        TypeOfExpression,
        ElementAccessExpression,
        InvocationExpression,
        ObjectCreationExpression,
        AssignmentExpression,
        AddAssignmentExpression,
        SubtractAssignmentExpression,
        DivideAssignmentExpression,
        MultiplyAssignmentExpression,
        ModuloAssignmentExpression,
        AndAssignmentExpression,
        ExclusiveOrAssignmentExpression,
        OrAssignmentExpression,
        LeftShiftAssignmentExpression,
        SignedRightShiftAssignmentExpression,
        UnsignedRightShiftAssignmentExpression,
        ConditionalExpression,
        LogicalOrExpression,
        LogicalAndExpression,
        BitwiseOrExpression,
        BitwiseExclusiveOrExpression,
        BitwiseAndExpression,
        EqualsWithTypeConversionExpression,
        NotEqualsWithTypeConversionExpression,
        EqualsExpression,
        NotEqualsExpression,
        LessThanExpression,
        LessThanOrEqualExpression,
        GreaterThanExpression,
        GreaterThanOrEqualExpression,
        AddExpression,
        SubtractExpression,
        MultiplyExpression,
        DivideExpression,
        ModuloExpression,
        LeftShiftExpression,
        SignedRightShiftExpression,
        UnsignedRightShiftExpression,
        BitwiseNotExpression,
        LogicalNotExpression,
        PreIncrementExpression,
        PreDecrementExpression,
        PostIncrementExpression,
        PostDecrementExpression,
        CastExpression,
        ParenthesizedExpression,
        SimpleArrowFunctionExpression,
        ParenthesizedArrowFunctionExpression,
        FunctionExpression,

        // Statements
        Block,
        BreakStatement,
        ContinueStatement,
        DebuggerStatement,
        DoStatement,
        EmptyStatement,
        ExportAssignment,
        ExpressionStatement,
        ForInStatement,
        ForStatement,
        IfStatement,
        LabeledStatement,
        ReturnStatement,
        SwitchStatement,
        ThrowStatement,
        TryStatement,
        VariableStatement,
        WhileStatement,
        WithStatement,

        // Clauses
        CaseSwitchClause,
        DefaultSwitchClause,
        CatchClause,
        FinallyClause,
        ExtendsHeritageClause,
        ImplementsHeritageClause,
        ElseClause,
        EqualsValueClause,

        LastNodeType = EqualsValueClause
    }
}