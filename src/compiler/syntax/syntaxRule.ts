module TypeScript {
    export interface ISyntaxRule<T> {
        filter?: SyntaxKind[]
        check(syntaxElement: T, context: IRuleContext): void;
    }

    export interface IRuleContext {
        reportError(syntaxElement: ISyntaxElement, message: string): void;
        reportError(syntaxElement: ISyntaxTrivia, message: string): void;
        lineMap(): LineMap;
    }

    export module RuleContextUtils {
        export function isFirstTokenInLine(context: IRuleContext, token: TypeScript.ISyntaxToken): boolean {
            var prevToken = token.previousToken();
            if (!prevToken) {
                return true;
            }

            var tokenLine = context.lineMap().getLineNumberFromPosition(this.start(token));
            var prevTokenLine = context.lineMap().getLineNumberFromPosition(this.end(prevToken));
            return prevTokenLine < tokenLine;
        }

        export function isLastTokenInLine(context: IRuleContext, token: TypeScript.ISyntaxToken): boolean {
            var nextToken = token.nextToken();
            if (!nextToken || nextToken.tokenKind === TypeScript.SyntaxKind.EndOfFileToken) {
                return true;
            }

            var tokenLine = context.lineMap().getLineNumberFromPosition(this.end(token));
            var nextTokenLine = context.lineMap().getLineNumberFromPosition(this.start(nextToken));
            return nextTokenLine > tokenLine;
        }
    }

    export interface ISyntaxRuleProvider {
        create(ruleNames: string[]): ISyntaxRule<ISyntaxElement>[];
    }
}