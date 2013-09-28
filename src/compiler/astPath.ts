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
    export function max(a: number, b: number): number {
        return a >= b ? a : b;
    }

    export function min(a: number, b: number): number {
        return a <= b ? a : b;
    }

    //
    // Helper class representing a path from a root ast node to a (grand)child ast node.
    // This is helpful as our tree don't have parents.
    //
    export class AstPath {
        public asts: AST[] = [];
        public top: number = -1;

        static reverseIndexOf(items: any[], index: number): any {
            return (items === null || items.length <= index) ? null : items[items.length - index - 1];
        }

        public pop(): TypeScript.AST {
            var head = this.ast();
            this.up();

            while (this.asts.length > this.count()) {
                this.asts.pop();
            }
            return head;
        }

        public push(ast: TypeScript.AST) {
            while (this.asts.length > this.count()) {
                this.asts.pop();
            }
            this.top = this.asts.length;
            this.asts.push(ast);
        }

        public up() {
            if (this.top <= -1)
                throw Errors.invalidOperation(getLocalizedText(DiagnosticCode.Invalid_call_to_up, null));
            this.top--;
        }

        public ast() {
            return <TypeScript.AST>AstPath.reverseIndexOf(this.asts, this.asts.length - (this.top + 1));
        }

        public parent() {
            return <TypeScript.AST>AstPath.reverseIndexOf(this.asts, this.asts.length - this.top);
        }

        public count() {
            return this.top + 1;
        }

        public get(index: number): TypeScript.AST {
            return this.asts[index];
        }

        public isNameOfClass(): boolean {
            if (this.ast() === null || this.parent() === null)
                return false;

            return (this.ast().nodeType() === TypeScript.NodeType.Name) &&
                (this.parent().nodeType() === TypeScript.NodeType.ClassDeclaration) &&
                ((<TypeScript.InterfaceDeclaration>this.parent()).name === this.ast());
        }

        public isNameOfInterface(): boolean {
            if (this.ast() === null || this.parent() === null)
                return false;

            return (this.ast().nodeType() === TypeScript.NodeType.Name) &&
                (this.parent().nodeType() === TypeScript.NodeType.InterfaceDeclaration) &&
                ((<TypeScript.InterfaceDeclaration>this.parent()).name === this.ast());
        }

        public isNameOfVariable(): boolean {
            if (this.ast() === null || this.parent() === null)
                return false;

            return (this.ast().nodeType() === TypeScript.NodeType.Name) &&
                (this.parent().nodeType() === TypeScript.NodeType.VariableDeclarator) &&
                ((<TypeScript.VariableDeclarator>this.parent()).id === this.ast());
        }

        public isNameOfFunction(): boolean {
            if (this.ast() === null || this.parent() === null)
                return false;

            return (this.ast().nodeType() === TypeScript.NodeType.Name) &&
                (this.parent().nodeType() === TypeScript.NodeType.FunctionDeclaration) &&
                ((<TypeScript.FunctionDeclaration>this.parent()).name === this.ast());
        }

        public isMemberOfMemberAccessExpression() {
            if (this.count() > 1 &&
                this.parent().nodeType() === NodeType.MemberAccessExpression &&
                (<BinaryExpression>this.parent()).operand2 === this.asts[this.top]) {
                return true;
            }

            return false;
        }
        
        public isCallExpression(): boolean {
            return this.count() >= 1 &&
            (this.asts[this.top - 0].nodeType() === TypeScript.NodeType.InvocationExpression || this.asts[this.top - 0].nodeType() === TypeScript.NodeType.ObjectCreationExpression);
        }

        public isCallExpressionTarget(): boolean {
            if (this.count() < 2) {
                return false;
            }

            var current = this.top;
            
            var nodeType = this.asts[current].nodeType();
            if (nodeType === TypeScript.NodeType.ThisExpression || nodeType === TypeScript.NodeType.SuperExpression || nodeType === TypeScript.NodeType.Name) {
                current--;
            }

            while (current >= 0) {
                // if this is a dot, then skip to find the outter most qualifed name
                if (current < this.top && this.asts[current].nodeType() === TypeScript.NodeType.MemberAccessExpression &&
                    (<TypeScript.BinaryExpression>this.asts[current]).operand2 === this.asts[current + 1]) {
                    current--;
                    continue;
                }

                break;
            }

            return current < this.top &&
                (this.asts[current].nodeType() === TypeScript.NodeType.InvocationExpression || this.asts[current].nodeType() === TypeScript.NodeType.ObjectCreationExpression) &&
                this.asts[current + 1] === (<TypeScript.InvocationExpression>this.asts[current]).target;
        }

        public isDeclaration(): boolean {
            if (this.ast() !== null) {
                switch (this.ast().nodeType()) {
                    case TypeScript.NodeType.ClassDeclaration:
                    case TypeScript.NodeType.InterfaceDeclaration:
                    case TypeScript.NodeType.ModuleDeclaration:
                    case TypeScript.NodeType.FunctionDeclaration:
                    case TypeScript.NodeType.VariableDeclarator:
                    case TypeScript.NodeType.ArrowFunctionExpression:
                       return true;
                }
            }

            return false;
        }
    }

    export function isValidAstNode(ast: TypeScript.IASTSpan): boolean {
        if (!ast)
            return false;

        if (ast.minChar === -1 || ast.limChar === -1)
            return false;

        return true;
    }

    class AstPathContext {
        public path = new TypeScript.AstPath();
    }

    ///
    /// Return the stack of AST nodes containing "position"
    ///
    export function getAstPathToPosition(script: TypeScript.AST, pos: number, useTrailingTriviaAsLimChar: boolean, forceInclusive: boolean): TypeScript.AstPath {
        var lookInComments = (comments: TypeScript.Comment[]) => {
            if (comments && comments.length > 0) {
                for (var i = 0; i < comments.length; i++) {
                    var minChar = comments[i].minChar;
                    var limChar = comments[i].limChar + (useTrailingTriviaAsLimChar ? comments[i].trailingTriviaWidth : 0);
                    if (!comments[i].isBlockComment) {
                        limChar++; // For single line comments, include 1 more character (for the newline)
                    }
                    if (pos >= minChar && pos < limChar) {
                        ctx.path.push(comments[i]);
                    }
                }
            }
        };

        var pre = function (cur: TypeScript.AST, walker: IAstWalker) {
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
                        cur.nodeType() === TypeScript.NodeType.Name ||
                        cur.nodeType() === TypeScript.NodeType.MemberAccessExpression ||
                        cur.nodeType() === TypeScript.NodeType.TypeRef ||
                        cur.nodeType() === TypeScript.NodeType.VariableDeclaration ||
                        cur.nodeType() === TypeScript.NodeType.VariableDeclarator ||
                        cur.nodeType() === TypeScript.NodeType.InvocationExpression ||
                        pos === script.limChar + script.trailingTriviaWidth; // Special "EOF" case

                    var minChar = cur.minChar;
                    var limChar = cur.limChar + (useTrailingTriviaAsLimChar ? cur.trailingTriviaWidth : 0) + (inclusive ? 1 : 0);
                    if (pos >= minChar && pos < limChar) {

                        // Ignore empty lists
                        if (cur.nodeType() !== TypeScript.NodeType.List || cur.limChar > cur.minChar) {
                            // TODO: Since AST is sometimes not correct wrt to position, only add "cur" if it's better
                            //       than top of the stack.
                            var previous = ctx.path.ast();
                            if (previous === null || (cur.minChar >= previous.minChar &&
                                (cur.limChar + (useTrailingTriviaAsLimChar ? cur.trailingTriviaWidth : 0)) <= (previous.limChar + (useTrailingTriviaAsLimChar ? previous.trailingTriviaWidth : 0)))) {
                                ctx.path.push(cur);
                            }
                            else {
                                //logger.log("TODO: Ignoring node because minChar, limChar not better than previous node in stack");
                            }
                        }
                    }

                    // The AST walker skips comments, but we might be in one, so check the pre/post comments for this node manually
                    if (pos < limChar) {
                        lookInComments(cur.preComments());
                    }
                    if (pos >= minChar) {
                        lookInComments(cur.postComments());
                    }

                    // Don't go further down the tree if pos is outside of [minChar, limChar]
                    walker.options.goChildren = (minChar <= pos && pos <= limChar);
                }
            }
        };

        var ctx = new AstPathContext();
        TypeScript.getAstWalkerFactory().walk(script, pre, null, null, ctx);
        return ctx.path;
    }
}
