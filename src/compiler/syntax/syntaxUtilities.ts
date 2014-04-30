///<reference path='references.ts' />

module TypeScript {
    //export function visitSyntaxElement(visitor: ISyntaxVisitor, element: ISyntaxElement): any {
    //    if (element === null) { return null; }
    //    switch (element.kind()) {

    //    }
    //}

    export class SyntaxUtilities {
        public static isAngleBracket(positionedElement: ISyntaxElement): boolean {
            var element = positionedElement;
            var parent = positionedElement.parent;
            if (parent !== null && (element.kind() === SyntaxKind.LessThanToken || element.kind() === SyntaxKind.GreaterThanToken)) {
                switch (parent.kind()) {
                    case SyntaxKind.TypeArgumentList:
                    case SyntaxKind.TypeParameterList:
                    case SyntaxKind.CastExpression:
                        return true;
                }
            }

            return false;
        }

        public static getToken(list: ISyntaxList<ISyntaxToken>, kind: SyntaxKind): ISyntaxToken {
            for (var i = 0, n = list.childCount(); i < n; i++) {
                var token = list.childAt(i);
                if (token.kind() === kind) {
                    return token;
                }
            }

            return null;
        }

        public static containsToken(list: ISyntaxList<ISyntaxToken>, kind: SyntaxKind): boolean {
            return SyntaxUtilities.getToken(list, kind) !== null;
        }

        public static hasExportKeyword(moduleElement: IModuleElementSyntax): boolean {
            return SyntaxUtilities.getExportKeyword(moduleElement) !== null;
        }

        public static getExportKeyword(moduleElement: IModuleElementSyntax): ISyntaxToken {
            switch (moduleElement.kind()) {
                case SyntaxKind.ModuleDeclaration:
                case SyntaxKind.ClassDeclaration:
                case SyntaxKind.FunctionDeclaration:
                case SyntaxKind.VariableStatement:
                case SyntaxKind.EnumDeclaration:
                case SyntaxKind.InterfaceDeclaration:
                case SyntaxKind.ImportDeclaration:
                    return SyntaxUtilities.getToken((<any>moduleElement).modifiers, SyntaxKind.ExportKeyword);
                default: 
                    return null;
            }
        }

        public static isAmbientDeclarationSyntax(positionNode: SyntaxNode): boolean {
            if (!positionNode) {
                return false;
            }

            var node = positionNode;
            switch (node.kind()) {
                case SyntaxKind.ModuleDeclaration:
                case SyntaxKind.ClassDeclaration:
                case SyntaxKind.FunctionDeclaration:
                case SyntaxKind.VariableStatement:
                case SyntaxKind.EnumDeclaration:
                    if (SyntaxUtilities.containsToken(<ISyntaxList<ISyntaxToken>>(<any>node).modifiers, SyntaxKind.DeclareKeyword)) {
                        return true;
                    }
                    // Fall through to check if syntax container is ambient

                case SyntaxKind.ImportDeclaration:
                case SyntaxKind.ConstructorDeclaration:
                case SyntaxKind.MemberFunctionDeclaration:
                case SyntaxKind.GetAccessor:
                case SyntaxKind.SetAccessor:
                case SyntaxKind.MemberVariableDeclaration:
                    if (node.isClassElement() || node.isModuleElement()) {
                        return SyntaxUtilities.isAmbientDeclarationSyntax(Syntax.containingNode(positionNode));
                    }

                case SyntaxKind.EnumElement:
                    return SyntaxUtilities.isAmbientDeclarationSyntax(Syntax.containingNode(Syntax.containingNode(positionNode)));

                default: 
                    return SyntaxUtilities.isAmbientDeclarationSyntax(Syntax.containingNode(positionNode));
            }
        }
    }
}