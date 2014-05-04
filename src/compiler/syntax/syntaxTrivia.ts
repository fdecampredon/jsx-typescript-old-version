///<reference path='references.ts' />

module TypeScript {
    export interface ISyntaxTrivia {
        parent: ISyntaxTriviaList;
        kind: SyntaxKind;

        isWhitespace(): boolean;
        isComment(): boolean;
        isNewLine(): boolean;
        isSkippedToken(): boolean;

        fullStart(): number;
        fullWidth(): number;

        // Text for this trivia.
        fullText(): string;

        // If this is a skipped token trivia, then this was the token that was skipped.
        skippedToken(): ISyntaxToken;

        clone(): ISyntaxTrivia;
    }
}

module TypeScript.Syntax {
    class AbstractTrivia implements ISyntaxTrivia {
        public parent: ISyntaxTriviaList = null;

        constructor(public kind: SyntaxKind) {
        }

        public clone(): ISyntaxTrivia {
            throw Errors.abstract();
        }

        public fullStart(): number {
            throw Errors.abstract();
        }

        public fullWidth(): number {
            throw Errors.abstract();
        }

        public fullText(): string {
            throw Errors.abstract();
        }

        public skippedToken(): ISyntaxToken {
            throw Errors.abstract();
        }

        public isWhitespace(): boolean {
            return this.kind === SyntaxKind.WhitespaceTrivia;
        }

        public isComment(): boolean {
            return this.kind === SyntaxKind.SingleLineCommentTrivia || this.kind === SyntaxKind.MultiLineCommentTrivia;
        }

        public isNewLine(): boolean {
            return this.kind === SyntaxKind.NewLineTrivia;
        }

        public isSkippedToken(): boolean {
            return this.kind === SyntaxKind.SkippedTokenTrivia;
        }
    }

    class NormalTrivia extends AbstractTrivia {
        constructor(kind: SyntaxKind, private _text: string, private _fullStart: number) {
            super(kind);
        }

        public clone(): ISyntaxTrivia {
            return new NormalTrivia(this.kind, this._text, this._fullStart);
        }

        public fullStart(): number {
            return this._fullStart;
        }

        public fullWidth(): number {
            return this.fullText().length;
        }

        public fullText(): string {
            return this._text;
        }

        public skippedToken(): ISyntaxToken {
            throw Errors.invalidOperation();
        }
    }

    class SkippedTokenTrivia extends AbstractTrivia {
        constructor(private _skippedToken: ISyntaxToken) {
            super(SyntaxKind.SkippedTokenTrivia);

            _skippedToken.parent = <ISyntaxElement><any>this;
        }

        public clone(): ISyntaxTrivia {
            return new SkippedTokenTrivia(this._skippedToken.clone());
        }

        public fullStart(): number {
            return this._skippedToken.fullStart();
        }

        public fullWidth(): number {
            return this.fullText().length;
        }

        public fullText(): string {
            return this.skippedToken().fullText();
        }

        public skippedToken(): ISyntaxToken {
            return this._skippedToken;
        }
    }

    class DeferredTrivia extends AbstractTrivia {
        constructor(kind: SyntaxKind, private _text: ISimpleText, private _fullStart: number, private _fullWidth: number) {
            super(kind);
        }

        public clone(): ISyntaxTrivia {
            return new DeferredTrivia(this.kind, this._text, this._fullStart, this._fullWidth);
        }

        public fullStart(): number {
            return this._fullStart;
        }

        public fullWidth(): number {
            return this._fullWidth;
        }

        public fullText(): string {
            return this._text.substr(this._fullStart, this._fullWidth);
        }

        public skippedToken(): ISyntaxToken {
            throw Errors.invalidOperation();
        }
    }

    export function deferredTrivia(kind: SyntaxKind, text: ISimpleText, fullStart: number, fullWidth: number): ISyntaxTrivia {
        return new DeferredTrivia(kind, text, fullStart, fullWidth);
    }

    export function trivia(kind: SyntaxKind, text: string, fullStart: number): ISyntaxTrivia {
        // Debug.assert(kind === SyntaxKind.MultiLineCommentTrivia || kind === SyntaxKind.NewLineTrivia || kind === SyntaxKind.SingleLineCommentTrivia || kind === SyntaxKind.WhitespaceTrivia || kind === SyntaxKind.SkippedTextTrivia);
        // Debug.assert(text.length > 0);
        return new NormalTrivia(kind, text, fullStart);
    }

    export function skippedTokenTrivia(token: ISyntaxToken): ISyntaxTrivia {
        Debug.assert(!token.hasLeadingTrivia());
        Debug.assert(!token.hasTrailingTrivia());
        Debug.assert(token.fullWidth() > 0);
        return new SkippedTokenTrivia(token);
    }

    export function spaces(count: number): ISyntaxTrivia {
        return trivia(SyntaxKind.WhitespaceTrivia, StringUtilities.repeat(" ", count), -1);
    }

    export function whitespace(text: string): ISyntaxTrivia {
        return trivia(SyntaxKind.WhitespaceTrivia, text, -1);
    }

    export function multiLineComment(text: string): ISyntaxTrivia {
        return trivia(SyntaxKind.MultiLineCommentTrivia, text, -1);
    }

    export function singleLineComment(text: string): ISyntaxTrivia {
        return trivia(SyntaxKind.SingleLineCommentTrivia, text, -1);
    }

    export var spaceTrivia: ISyntaxTrivia = spaces(1);
    export var lineFeedTrivia: ISyntaxTrivia = trivia(SyntaxKind.NewLineTrivia, "\n", -1);
    export var carriageReturnTrivia: ISyntaxTrivia = trivia(SyntaxKind.NewLineTrivia, "\r", -1);
    export var carriageReturnLineFeedTrivia: ISyntaxTrivia = trivia(SyntaxKind.NewLineTrivia, "\r\n", -1);

    // Breaks a multiline trivia up into individual line components.  If the trivia doesn't span
    // any lines, then the result will be a single string with the entire text of the trivia. 
    // Otherwise, there will be one entry in the array for each line spanned by the trivia.  Each
    // entry will contain the line separator at the end of the string.
    export function splitMultiLineCommentTriviaIntoMultipleLines(trivia: ISyntaxTrivia): string[] {
        // Debug.assert(trivia.kind === SyntaxKind.MultiLineCommentTrivia);
        var result: string[] = [];

        var triviaText = trivia.fullText();
        var currentIndex = 0;

        for (var i = 0; i < triviaText.length; i++) {
            var ch = triviaText.charCodeAt(i);

            // When we run into a newline for the first time, create the string builder and copy
            // all the values up to this newline into it.
            var isCarriageReturnLineFeed = false;
            switch (ch) {
                case CharacterCodes.carriageReturn:
                    if (i < triviaText.length - 1 && triviaText.charCodeAt(i + 1) === CharacterCodes.lineFeed) {
                        // Consume the \r
                        i++;
                    }

                // Fall through.

                case CharacterCodes.lineFeed:
                case CharacterCodes.paragraphSeparator:
                case CharacterCodes.lineSeparator:
                    // Eat from the last starting position through to the end of the newline.
                    result.push(triviaText.substring(currentIndex, i + 1));

                    // Set the current index to *after* the newline.
                    currentIndex = i + 1;
                    continue;
            }
        }

        result.push(triviaText.substring(currentIndex));
        return result;
    }
}