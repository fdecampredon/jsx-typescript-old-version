///<reference path='references.ts' />

module TypeScript {
    // To save space in a token we use 60 bits to encode the following.
    //
    //   _packedFullStartAndTriviaInfo:
    //
    //      0000 0000 0000 0000 0000 0000 0000 0xxx    <-- Leading trivia info.
    //      0000 0000 0000 0000 0000 0000 00xx x000    <-- Trailing trivia info.
    //      0xxx xxxx xxxx xxxx xxxx xxxx xx00 0000    <-- Full start.
    //
    //  _packedFullWidthAndKind:
    //
    //      0000 0000 0000 0000 0000 0000 0xxx xxxx    <-- Kind.
    //      0xxx xxxx xxxx xxxx xxxx xxxx x000 0000    <-- Full width.

    enum ScannerConstants {
        LeadingTriviaShift      = 0,
        TrailingTriviaShift     = 3,
        FullStartShift          = 6,

        KindShift               = 0,
        FullWidthShift          = 7,

        KindBitMask             = 0x7F, // 01111111
        TriviaBitMask           = 0x07, // 00000111
        CommentTriviaBitMask    = 0x01, // 00000001
        NewLineTriviaBitMask    = 0x02, // 00000010
        WhitespaceTriviaBitMask = 0x04, // 00000100
    }

    function unpackKind(_packedFullWidthAndKind: number): SyntaxKind {
        return <SyntaxKind>((_packedFullWidthAndKind >> ScannerConstants.KindShift) & ScannerConstants.KindBitMask);
    }

    function unpackFullWidth(_packedFullWidthAndKind: number): number {
        return _packedFullWidthAndKind >> ScannerConstants.FullWidthShift;
    }

    function unpackFullStart(_packedFullStartAndTriviaInfo: number): number {
        return _packedFullStartAndTriviaInfo >> ScannerConstants.FullStartShift;
    }

    function unpackLeadingTriviaInfo(_packedFullStartAndTriviaInfo: number): number {
        return (_packedFullStartAndTriviaInfo >> ScannerConstants.LeadingTriviaShift) & ScannerConstants.TriviaBitMask;
    }

    function unpackTrailingTriviaInfo(_packedFullStartAndTriviaInfo: number): number {
        // The next two bits following the leading trivia are the trailing trivia info.
        return (_packedFullStartAndTriviaInfo >> ScannerConstants.TrailingTriviaShift) & ScannerConstants.TriviaBitMask;
    }

    //function packFullStartAndTriviaInfo(fullStart: number, leadingTriviaInfo: number, trailingTriviaInfo: number): number {
    //    return (fullStart << ScannerConstants.FullStartShift) | (leadingTriviaInfo << ScannerConstants.LeadingTriviaShift) | (trailingTriviaInfo << ScannerConstants.TrailingTriviaShift);
    //}

    //function packFullWidthAndKind(fullWidth: number, kind: SyntaxKind): number {
    //    return (fullWidth << ScannerConstants.FullWidthShift) | (kind << ScannerConstants.KindShift);
    //}

    var isKeywordStartCharacter: boolean[] = ArrayUtilities.createArray<boolean>(CharacterCodes.maxAsciiCharacter, false);
    var isIdentifierStartCharacter: boolean[] = ArrayUtilities.createArray<boolean>(CharacterCodes.maxAsciiCharacter, false);
    var isIdentifierPartCharacter: boolean[] = ArrayUtilities.createArray<boolean>(CharacterCodes.maxAsciiCharacter, false);
    var isNumericLiteralStart: boolean[] = ArrayUtilities.createArray<boolean>(CharacterCodes.maxAsciiCharacter, false);

    for (var character = 0; character < CharacterCodes.maxAsciiCharacter; character++) {
        if (character >= CharacterCodes.a && character <= CharacterCodes.z) {
            isIdentifierStartCharacter[character] = true;
            isIdentifierPartCharacter[character] = true;
        }
        else if ((character >= CharacterCodes.A && character <= CharacterCodes.Z) ||
            character === CharacterCodes._ ||
            character === CharacterCodes.$) {
            isIdentifierStartCharacter[character] = true;
            isIdentifierPartCharacter[character] = true;
        }
        else if (character >= CharacterCodes._0 && character <= CharacterCodes._9) {
            isIdentifierPartCharacter[character] = true;
            isNumericLiteralStart[character] = true;
        }
    }

    isNumericLiteralStart[CharacterCodes.dot] = true;

    for (var keywordKind = SyntaxKind.FirstKeyword; keywordKind <= SyntaxKind.LastKeyword; keywordKind++) {
        var keyword = SyntaxFacts.getText(keywordKind);
        isKeywordStartCharacter[keyword.charCodeAt(0)] = true;
    }

    export class Scanner {
        private _index: number = 0;
        private _length: number;

        // Operate on an actual string for perf.
        private _string: string;

        constructor(private _languageVersion: LanguageVersion,
                    private _fullText: ISimpleText) {

            if (_fullText !== null) {
                this.reset(_fullText, 0, _fullText.length());
            }
        }

        public reset(fullText: ISimpleText, index: number, textEnd: number) {
            Debug.assert(index <= fullText.length());
            Debug.assert(textEnd <= fullText.length());
            this._index = index;
            this._fullText = fullText;
            this._length = textEnd;

            this._string = fullText.substr(0, fullText.length());
        }

        public languageVersion(): LanguageVersion {
            return this._languageVersion;
        }

        public absoluteIndex(): number {
            return this._index;
        }

        private isAtEndOfSource(): boolean {
            return this._index >= this._length;
        }

        // Set's the scanner to a specific position in the text.
        public setAbsoluteIndex(index: number): void {
            this._index = index;
        }

        public fillSizeInfo(allowRegularExpression: boolean): void {
            var fullStart = this.absoluteIndex();
            var leadingTriviaInfo = this.scanTriviaInfo(null, /*isTrailing: */ false);

            var start = this.absoluteIndex();
            this.scanSyntaxToken(null, allowRegularExpression);
            var end = this.absoluteIndex();

            sizeInfo.leadingTriviaWidth = start - fullStart;
            sizeInfo.width = end - start;
        }

        // Scans a token starting at the current position.  Any errors encountered will be added to 
        // 'diagnostics'.
        public scan(allowRegularExpression: boolean, reportDiagnostic: (position: number, fullWidth: number, diagnosticKey: string, args: any[]) => void): ISyntaxToken {
            var fullStart = this._index;

            var leadingTriviaInfo = this.scanTriviaInfo(reportDiagnostic, /*isTrailing: */ false);
            var kind = this.scanSyntaxToken(reportDiagnostic, allowRegularExpression);
            var trailingTriviaInfo = this.scanTriviaInfo(reportDiagnostic,/*isTrailing: */true);

            var fullEnd = this._index;
            // Debug.assert(fullEnd <= this._length);

            //function packFullStartAndTriviaInfo(fullStart: number, leadingTriviaInfo: number, trailingTriviaInfo: number): number {
            //    return ;
            //}

            //function packFullWidthAndKind(fullWidth: number, kind: SyntaxKind): number {
            //    return (fullWidth << ScannerConstants.FullWidthShift) | (kind << ScannerConstants.KindShift);
            //}

            var fullWidth = fullEnd - fullStart;
            var packedFullStartAndTriviaInfo = (fullStart << ScannerConstants.FullStartShift) | leadingTriviaInfo | (trailingTriviaInfo << ScannerConstants.TrailingTriviaShift);
            var packedFullWidthAndKind = (fullWidth << ScannerConstants.FullWidthShift) | kind;
            return new ScannerToken(this._fullText, packedFullStartAndTriviaInfo, packedFullWidthAndKind);
        }

        // Scans a subsection of 'text' as trivia.
        public scanTrivia(parent: ISyntaxToken, isTrailing: boolean): ISyntaxTriviaList {
            // Debug.assert(length > 0);

            // Keep this exactly in sync with scanTriviaInfo
            var trivia = new Array<ISyntaxTrivia>();

            while (true) {
                if (!this.isAtEndOfSource()) {
                    var ch = this._string.charCodeAt(this._index);
                    switch (ch) {
                        // Unicode 3.0 space characters
                        case CharacterCodes.space:
                        case CharacterCodes.nonBreakingSpace:
                        case CharacterCodes.enQuad:
                        case CharacterCodes.emQuad:
                        case CharacterCodes.enSpace:
                        case CharacterCodes.emSpace:
                        case CharacterCodes.threePerEmSpace:
                        case CharacterCodes.fourPerEmSpace:
                        case CharacterCodes.sixPerEmSpace:
                        case CharacterCodes.figureSpace:
                        case CharacterCodes.punctuationSpace:
                        case CharacterCodes.thinSpace:
                        case CharacterCodes.hairSpace:
                        case CharacterCodes.zeroWidthSpace:
                        case CharacterCodes.narrowNoBreakSpace:
                        case CharacterCodes.ideographicSpace:

                        case CharacterCodes.tab:
                        case CharacterCodes.verticalTab:
                        case CharacterCodes.formFeed:
                        case CharacterCodes.byteOrderMark:
                            // Normal whitespace.  Consume and continue.
                            trivia.push(this.scanWhitespaceTrivia());
                            continue;

                        case CharacterCodes.slash:
                            // Potential comment.  Consume if so.  Otherwise, break out and return.
                            var ch2 = this._string.charCodeAt(this._index + 1);
                            if (ch2 === CharacterCodes.slash) {
                                trivia.push(this.scanSingleLineCommentTrivia());
                                continue;
                            }

                            if (ch2 === CharacterCodes.asterisk) {
                                trivia.push(this.scanMultiLineCommentTrivia());
                                continue;
                            }

                            // Not a comment.  Don't consume.
                            throw Errors.invalidOperation();

                        case CharacterCodes.carriageReturn:
                        case CharacterCodes.lineFeed:
                        case CharacterCodes.paragraphSeparator:
                        case CharacterCodes.lineSeparator:
                            trivia.push(this.scanLineTerminatorSequenceTrivia(ch));

                            // If we're consuming leading trivia, then we will continue consuming more 
                            // trivia (including newlines) up to the first token we see.  If we're 
                            // consuming trailing trivia, then we break after the first newline we see.
                            if (!isTrailing) {
                                continue;
                            }

                            break;

                        default:
                            throw Errors.invalidOperation();
                    }
                }

                // Debug.assert(trivia.length > 0);
                var triviaList = Syntax.triviaList(trivia);
                triviaList.parent = parent;

                return triviaList;
            }
        }

        private scanTriviaInfo(reportDiagnostic: (position: number, fullWidth: number, diagnosticKey: string, args: any[]) => void, isTrailing: boolean): number {
            // Keep this exactly in sync with scanTrivia
            var commentInfo = 0;
            var whitespaceInfo = 0;
            var newLineInfo = 0;

            while (true) {
                var ch = this._string.charCodeAt(this._index);

                switch (ch) {
                    // Unicode 3.0 space characters
                    case CharacterCodes.space:
                    case CharacterCodes.nonBreakingSpace:
                    case CharacterCodes.enQuad:
                    case CharacterCodes.emQuad:
                    case CharacterCodes.enSpace:
                    case CharacterCodes.emSpace:
                    case CharacterCodes.threePerEmSpace:
                    case CharacterCodes.fourPerEmSpace:
                    case CharacterCodes.sixPerEmSpace:
                    case CharacterCodes.figureSpace:
                    case CharacterCodes.punctuationSpace:
                    case CharacterCodes.thinSpace:
                    case CharacterCodes.hairSpace:
                    case CharacterCodes.zeroWidthSpace:
                    case CharacterCodes.narrowNoBreakSpace:
                    case CharacterCodes.ideographicSpace:

                    case CharacterCodes.tab:
                    case CharacterCodes.verticalTab:
                    case CharacterCodes.formFeed:
                    case CharacterCodes.byteOrderMark:
                        // Normal whitespace.  Consume and continue.
                        whitespaceInfo = ScannerConstants.WhitespaceTriviaBitMask;
                        this._index++;
                        continue;

                    case CharacterCodes.slash:
                        // Potential comment.  Consume if so.  Otherwise, break out and return.
                        var ch2 = this._string.charCodeAt(this._index + 1);
                        if (ch2 === CharacterCodes.slash) {
                            commentInfo = ScannerConstants.CommentTriviaBitMask;
                            this.skipSingleLineCommentTrivia();
                            continue;
                        }

                        if (ch2 === CharacterCodes.asterisk) {
                            commentInfo = ScannerConstants.CommentTriviaBitMask;
                            this.skipMultiLineCommentTrivia(reportDiagnostic);
                            continue;
                        }

                        // Not a comment.  Don't consume.
                        break;

                    case CharacterCodes.carriageReturn:
                    case CharacterCodes.lineFeed:
                    case CharacterCodes.paragraphSeparator:
                    case CharacterCodes.lineSeparator:
                        newLineInfo = ScannerConstants.NewLineTriviaBitMask;
                        this.skipLineTerminatorSequence(ch);

                        // If we're consuming leading trivia, then we will continue consuming more 
                        // trivia (including newlines) up to the first token we see.  If we're 
                        // consuming trailing trivia, then we break after the first newline we see.
                        if (!isTrailing) {
                            continue;
                        }

                        break;
                }

                return commentInfo + newLineInfo + whitespaceInfo;
            }
        }

        private isNewLineCharacter(ch: number): boolean {
            switch (ch) {
                case CharacterCodes.carriageReturn:
                case CharacterCodes.lineFeed:
                case CharacterCodes.paragraphSeparator:
                case CharacterCodes.lineSeparator:
                    return true;
                default:
                    return false;
            }
        }

        private scanWhitespaceTrivia(): ISyntaxTrivia {
            // We're going to be extracting text out of sliding window.  Make sure it can't move past
            // this point.
            var absoluteStartIndex = this.absoluteIndex();

            while (true) {
                var ch = this._string.charCodeAt(this._index);

                switch (ch) {
                    // Unicode 3.0 space characters
                    case CharacterCodes.space:
                    case CharacterCodes.nonBreakingSpace:
                    case CharacterCodes.enQuad:
                    case CharacterCodes.emQuad:
                    case CharacterCodes.enSpace:
                    case CharacterCodes.emSpace:
                    case CharacterCodes.threePerEmSpace:
                    case CharacterCodes.fourPerEmSpace:
                    case CharacterCodes.sixPerEmSpace:
                    case CharacterCodes.figureSpace:
                    case CharacterCodes.punctuationSpace:
                    case CharacterCodes.thinSpace:
                    case CharacterCodes.hairSpace:
                    case CharacterCodes.zeroWidthSpace:
                    case CharacterCodes.narrowNoBreakSpace:
                    case CharacterCodes.ideographicSpace:

                    case CharacterCodes.tab:
                    case CharacterCodes.verticalTab:
                    case CharacterCodes.formFeed:
                    case CharacterCodes.byteOrderMark:
                        // Normal whitespace.  Consume and continue.
                        this._index++;
                        continue;
                }

                break;
            }

            return this.createTrivia(SyntaxKind.WhitespaceTrivia, absoluteStartIndex);
        }

        private createTrivia(kind: SyntaxKind, absoluteStartIndex: number): ISyntaxTrivia {
            var fullWidth = this.absoluteIndex() - absoluteStartIndex;
            return Syntax.deferredTrivia(kind, this._fullText, absoluteStartIndex, fullWidth);
        }

        private scanSingleLineCommentTrivia(): ISyntaxTrivia {
            var absoluteStartIndex = this.absoluteIndex();
            this.skipSingleLineCommentTrivia();

            return this.createTrivia(SyntaxKind.SingleLineCommentTrivia, absoluteStartIndex);
        }

        private skipSingleLineCommentTrivia(): void {
            this._index += 2;

            // The '2' is for the "//" we consumed.
            while (true) {
                var ch = this._string.charCodeAt(this._index);
                if (isNaN(ch) || this.isNewLineCharacter(ch)) {
                    return;
                }

                this._index++;
            }
        }

        private scanMultiLineCommentTrivia(): ISyntaxTrivia {
            var absoluteStartIndex = this.absoluteIndex();
            this.skipMultiLineCommentTrivia(null);

            return this.createTrivia(SyntaxKind.MultiLineCommentTrivia, absoluteStartIndex);
        }

        private skipMultiLineCommentTrivia(reportDiagnostic: (position: number, fullWidth: number, diagnosticKey: string, args: any[]) => void): number {
            // The '2' is for the "/*" we consumed.
            this._index += 2;

            while (true) {
                if (this.isAtEndOfSource()) {
                    if (reportDiagnostic !== null) {
                        reportDiagnostic(this._length, 0, DiagnosticCode.AsteriskSlash_expected, null);
                    }

                    return;
                }

                if (this._string.charCodeAt(this._index) === CharacterCodes.asterisk &&
                    this._string.charCodeAt(this._index + 1) === CharacterCodes.slash) {

                    this._index += 2;
                    return;
                }

                this._index++;
            }
        }

        private scanLineTerminatorSequenceTrivia(ch: number): ISyntaxTrivia {
            var absoluteStartIndex = this.absoluteIndex();
            this.skipLineTerminatorSequence(ch);

            return this.createTrivia(SyntaxKind.NewLineTrivia, absoluteStartIndex);
        }

        private skipLineTerminatorSequence(ch: number): void {
            // Consume the first of the line terminator we saw.
            this._index++;

            // If it happened to be a \r and there's a following \n, then consume both.
            if (ch === CharacterCodes.carriageReturn && this._string.charCodeAt(this._index) === CharacterCodes.lineFeed) {
                this._index++;
            }
        }

        private scanSyntaxToken(reportDiagnostic: (position: number, fullWidth: number, diagnosticKey: string, args: any[]) => void, allowRegularExpression: boolean): SyntaxKind {
            if (this.isAtEndOfSource()) {
                return SyntaxKind.EndOfFileToken;
            }

            var character = this._string.charCodeAt(this._index);

            switch (character) {
                case CharacterCodes.doubleQuote:
                case CharacterCodes.singleQuote:
                    return this.scanStringLiteral(reportDiagnostic);

                // These are the set of variable width punctuation tokens.
                case CharacterCodes.slash:
                    return this.scanSlashToken(allowRegularExpression);

                case CharacterCodes.dot:
                    return this.scanDotToken(reportDiagnostic);

                case CharacterCodes.minus:
                    return this.scanMinusToken();

                case CharacterCodes.exclamation:
                    return this.scanExclamationToken();

                case CharacterCodes.equals:
                    return this.scanEqualsToken();

                case CharacterCodes.bar:
                    return this.scanBarToken();

                case CharacterCodes.asterisk:
                    return this.scanAsteriskToken();

                case CharacterCodes.plus:
                    return this.scanPlusToken();

                case CharacterCodes.percent:
                    return this.scanPercentToken();

                case CharacterCodes.ampersand:
                    return this.scanAmpersandToken();

                case CharacterCodes.caret:
                    return this.scanCaretToken();

                case CharacterCodes.lessThan:
                    return this.scanLessThanToken();

                // These are the set of fixed, single character length punctuation tokens.
                // The token kind does not depend on what follows.
                case CharacterCodes.greaterThan:
                    return this.advanceAndSetTokenKind(SyntaxKind.GreaterThanToken);

                case CharacterCodes.comma:
                    return this.advanceAndSetTokenKind(SyntaxKind.CommaToken);

                case CharacterCodes.colon:
                    return this.advanceAndSetTokenKind(SyntaxKind.ColonToken);

                case CharacterCodes.semicolon:
                    return this.advanceAndSetTokenKind(SyntaxKind.SemicolonToken);

                case CharacterCodes.tilde:
                    return this.advanceAndSetTokenKind(SyntaxKind.TildeToken);

                case CharacterCodes.openParen:
                    return this.advanceAndSetTokenKind(SyntaxKind.OpenParenToken);

                case CharacterCodes.closeParen:
                    return this.advanceAndSetTokenKind(SyntaxKind.CloseParenToken);

                case CharacterCodes.openBrace:
                    return this.advanceAndSetTokenKind(SyntaxKind.OpenBraceToken);

                case CharacterCodes.closeBrace:
                    return this.advanceAndSetTokenKind(SyntaxKind.CloseBraceToken);

                case CharacterCodes.openBracket:
                    return this.advanceAndSetTokenKind(SyntaxKind.OpenBracketToken);

                case CharacterCodes.closeBracket:
                    return this.advanceAndSetTokenKind(SyntaxKind.CloseBracketToken);

                case CharacterCodes.question:
                    return this.advanceAndSetTokenKind(SyntaxKind.QuestionToken);
            }

            if (isNumericLiteralStart[character]) {
                return this.scanNumericLiteral(reportDiagnostic);
            }

            // We run into so many identifiers (and keywords) when scanning, that we want the code to
            // be as fast as possible.  To that end, we have an extremely fast path for scanning that
            // handles the 99.9% case of no-unicode characters and no unicode escapes.
            if (isIdentifierStartCharacter[character]) {
                var result = this.tryFastScanIdentifierOrKeyword(character);
                if (result !== SyntaxKind.None) {
                    return result;
                }
            }

            if (this.isIdentifierStart(this.peekCharOrUnicodeEscape())) {
                return this.slowScanIdentifierOrKeyword(reportDiagnostic);
            }

            return this.scanDefaultCharacter(character, reportDiagnostic);
        }

        private isIdentifierStart(interpretedChar: number): boolean {
            if (isIdentifierStartCharacter[interpretedChar]) {
                return true;
            }

            return interpretedChar > CharacterCodes.maxAsciiCharacter && Unicode.isIdentifierStart(interpretedChar, this._languageVersion);
        }

        private isIdentifierPart(interpretedChar: number): boolean {
            if (isIdentifierPartCharacter[interpretedChar]) {
                return true;
            }

            return interpretedChar > CharacterCodes.maxAsciiCharacter && Unicode.isIdentifierPart(interpretedChar, this._languageVersion);
        }

        private tryFastScanIdentifierOrKeyword(firstCharacter: number): SyntaxKind {
            var startIndex = this._index;
            var character: number = 0;

            // Note that we go up to the windowCount-1 so that we can read the character at the end
            // of the window and check if it's *not* an identifier part character.
            while (this._index < this._length) {
                character = this._string.charCodeAt(this._index);
                if (!isIdentifierPartCharacter[character]) {
                    break;
                }

                this._index++;
            }

            if (this._index < this._length && (character === CharacterCodes.backslash || character > CharacterCodes.maxAsciiCharacter)) {
                // We saw a \ (which could start a unicode escape), or we saw a unicode character.
                // This can't be scanned quickly.  Don't update the window position and just bail out
                // to the slow path.
                this._index = startIndex;
                return SyntaxKind.None;
            }
            else {
                // Saw an ascii character that wasn't a backslash and wasn't an identifier 
                // character.  Or we hit the end of the file  This identifier is done.

                // Also check if it a keyword if it started with a lowercase letter.
                var kind: SyntaxKind;
                var identifierLength = this._index - startIndex;
                if (isKeywordStartCharacter[firstCharacter]) {
                    kind = ScannerUtilities.identifierKind(this._string, startIndex, identifierLength);
                }
                else {
                    kind = SyntaxKind.IdentifierName;
                }

                return kind;
            }
        }

        // A slow path for scanning identifiers.  Called when we run into a unicode character or 
        // escape sequence while processing the fast path.
        private slowScanIdentifierOrKeyword(reportDiagnostic: (position: number, fullWidth: number, diagnosticKey: string, args: any[]) => void): SyntaxKind {
            var startIndex = this._index;

            do {
                this.scanCharOrUnicodeEscape(reportDiagnostic);
            }
            while (this.isIdentifierPart(this.peekCharOrUnicodeEscape()));

            // From ES6 specification.
            // The ReservedWord definitions are specified as literal sequences of Unicode 
            // characters.However, any Unicode character in a ReservedWord can also be 
            // expressed by a \ UnicodeEscapeSequence that expresses that same Unicode 
            // character's code point.Use of such escape sequences does not change the meaning 
            // of the ReservedWord.
            //
            // i.e. "\u0076ar" is the keyword 'var'.  Check for that here.
            var length = this._index - startIndex;
            var text = this._string.substr(startIndex, length);
            var valueText = Syntax.massageEscapes(text);

            var keywordKind = SyntaxFacts.getTokenKind(valueText);
            if (keywordKind >= SyntaxKind.FirstKeyword && keywordKind <= SyntaxKind.LastKeyword) {
                return keywordKind;
            }

            return SyntaxKind.IdentifierName;
        }

        private scanNumericLiteral(reportDiagnostic: (position: number, fullWidth: number, diagnosticKey: string, args: any[]) => void): SyntaxKind {
            if (this.isHexNumericLiteral()) {
                this.scanHexNumericLiteral();
            }
            else if (this.isOctalNumericLiteral()) {
                this.scanOctalNumericLiteral(reportDiagnostic);
            }
            else {
                this.scanDecimalNumericLiteral();
            }

            return SyntaxKind.NumericLiteral;
        }

        private isOctalNumericLiteral(): boolean {
            return this._string.charCodeAt(this._index) === CharacterCodes._0 &&
                   CharacterInfo.isOctalDigit(this._string.charCodeAt(this._index + 1));
        }

        private scanOctalNumericLiteral(reportDiagnostic: (position: number, fullWidth: number, diagnosticKey: string, args: any[]) => void): void {
            var position = this.absoluteIndex();

            while (CharacterInfo.isOctalDigit(this._string.charCodeAt(this._index))) {
                this._index++;
            }

            if (this.languageVersion() >= LanguageVersion.EcmaScript5 && reportDiagnostic !== null) {
                reportDiagnostic(
                    position, this._index - position, DiagnosticCode.Octal_literals_are_not_available_when_targeting_ECMAScript_5_and_higher, null);
            }
        }

        private scanDecimalDigits(): void {
            while (CharacterInfo.isDecimalDigit(this._string.charCodeAt(this._index))) {
                this._index++;
            }
        }

        private scanDecimalNumericLiteral(): void {
            this.scanDecimalDigits();

            if (this._string.charCodeAt(this._index) === CharacterCodes.dot) {
                this._index++;
            }

            this.scanDecimalDigits();

            // If we see an 'e' or 'E' we should only consume it if its of the form:
            // e<number> or E<number> 
            // e+<number>   E+<number>
            // e-<number>   E-<number>
            var ch = this._string.charCodeAt(this._index);
            if (ch === CharacterCodes.e || ch === CharacterCodes.E) {
                // Ok, we've got 'e' or 'E'.  Make sure it's followed correctly.
                var nextChar1 = this._string.charCodeAt(this._index + 1);

                if (CharacterInfo.isDecimalDigit(nextChar1)) {
                    // e<number> or E<number>
                    // Consume 'e' or 'E' and the number portion.
                    this._index++;
                    this.scanDecimalDigits();
                }
                else if (nextChar1 === CharacterCodes.minus || nextChar1 === CharacterCodes.plus) {
                    // e+ or E+ or e- or E-
                    var nextChar2 = this._string.charCodeAt(this._index + 2);
                    if (CharacterInfo.isDecimalDigit(nextChar2)) {
                        // e+<number> or E+<number> or e-<number> or E-<number>
                        // Consume first two characters and the number portion.
                        this._index += 2;
                        this.scanDecimalDigits();
                    }
                }
            }
        }

        private scanHexNumericLiteral(): void {
            // Debug.assert(this.isHexNumericLiteral());

            // Move past the 0x.
            this._index += 2;

            while (CharacterInfo.isHexDigit(this._string.charCodeAt(this._index))) {
                this._index++;
            }
        }

        private isHexNumericLiteral(): boolean {
            if (this._string.charCodeAt(this._index) === CharacterCodes._0) {
                var ch = this._string.charCodeAt(this._index + 1);

                if (ch === CharacterCodes.x || ch === CharacterCodes.X) {
                    ch = this._string.charCodeAt(this._index + 2);

                    return CharacterInfo.isHexDigit(ch);
                }
            }

            return false;
        }

        private advanceAndSetTokenKind(kind: SyntaxKind): SyntaxKind {
            this._index++;
            return kind;
        }

        private scanLessThanToken(): SyntaxKind {
            this._index++;
            var ch0 = this._string.charCodeAt(this._index);
            if (ch0 === CharacterCodes.equals) {
                this._index++;
                return SyntaxKind.LessThanEqualsToken;
            }
            else if (ch0 === CharacterCodes.lessThan) {
                this._index++;
                if (this._string.charCodeAt(this._index) === CharacterCodes.equals) {
                    this._index++;
                    return SyntaxKind.LessThanLessThanEqualsToken;
                }
                else {
                    return SyntaxKind.LessThanLessThanToken;
                }
            }
            else {
                return SyntaxKind.LessThanToken;
            }
        }

        private scanBarToken(): SyntaxKind {
            this._index++;
            var ch = this._string.charCodeAt(this._index);
            if (ch === CharacterCodes.equals) {
                this._index++;
                return SyntaxKind.BarEqualsToken;
            }
            else if (ch === CharacterCodes.bar) {
                this._index++;
                return SyntaxKind.BarBarToken;
            }
            else {
                return SyntaxKind.BarToken;
            }
        }

        private scanCaretToken(): SyntaxKind {
            this._index++;
            if (this._string.charCodeAt(this._index) === CharacterCodes.equals) {
                this._index++;
                return SyntaxKind.CaretEqualsToken;
            }
            else {
                return SyntaxKind.CaretToken;
            }
        }

        private scanAmpersandToken(): SyntaxKind {
            this._index++;
            var character = this._string.charCodeAt(this._index);
            if (character === CharacterCodes.equals) {
                this._index++;
                return SyntaxKind.AmpersandEqualsToken;
            }
            else if (character === CharacterCodes.ampersand) {
                this._index++;
                return SyntaxKind.AmpersandAmpersandToken;
            }
            else {
                return SyntaxKind.AmpersandToken;
            }
        }

        private scanPercentToken(): SyntaxKind {
            this._index++;
            if (this._string.charCodeAt(this._index) === CharacterCodes.equals) {
                this._index++;
                return SyntaxKind.PercentEqualsToken;
            }
            else {
                return SyntaxKind.PercentToken;
            }
        }

        private scanMinusToken(): SyntaxKind {
            this._index++;
            var character = this._string.charCodeAt(this._index);

            if (character === CharacterCodes.equals) {
                this._index++;
                return SyntaxKind.MinusEqualsToken;
            }
            else if (character === CharacterCodes.minus) {
                this._index++;
                return SyntaxKind.MinusMinusToken;
            }
            else {
                return SyntaxKind.MinusToken;
            }
        }

        private scanPlusToken(): SyntaxKind {
            this._index++;
            var character = this._string.charCodeAt(this._index);
            if (character === CharacterCodes.equals) {
                this._index++;
                return SyntaxKind.PlusEqualsToken;
            }
            else if (character === CharacterCodes.plus) {
                this._index++;
                return SyntaxKind.PlusPlusToken;
            }
            else {
                return SyntaxKind.PlusToken;
            }
        }

        private scanAsteriskToken(): SyntaxKind {
            this._index++;
            if (this._string.charCodeAt(this._index) === CharacterCodes.equals) {
                this._index++;
                return SyntaxKind.AsteriskEqualsToken;
            }
            else {
                return SyntaxKind.AsteriskToken;
            }
        }

        private scanEqualsToken(): SyntaxKind {
            this._index++;
            var character = this._string.charCodeAt(this._index);
            if (character === CharacterCodes.equals) {
                this._index++;

                if (this._string.charCodeAt(this._index) === CharacterCodes.equals) {
                    this._index++;

                    return SyntaxKind.EqualsEqualsEqualsToken;
                }
                else {
                    return SyntaxKind.EqualsEqualsToken;
                }
            }
            else if (character === CharacterCodes.greaterThan) {
                this._index++;
                return SyntaxKind.EqualsGreaterThanToken;
            }
            else {
                return SyntaxKind.EqualsToken;
            }
        }

        private isDotPrefixedNumericLiteral(): boolean {
            if (this._string.charCodeAt(this._index) === CharacterCodes.dot) {
                var ch = this._string.charCodeAt(this._index + 1);
                return CharacterInfo.isDecimalDigit(ch);
            }

            return false;
        }

        private scanDotToken(reportDiagnostic: (position: number, fullWidth: number, diagnosticKey: string, args: any[]) => void): SyntaxKind {
            if (this.isDotPrefixedNumericLiteral()) {
                return this.scanNumericLiteral(reportDiagnostic);
            }

            this._index++;
            if (this._string.charCodeAt(this._index) === CharacterCodes.dot &&
                this._string.charCodeAt(this._index + 1) === CharacterCodes.dot) {

                this._index += 2;
                return SyntaxKind.DotDotDotToken;
            }
            else {
                return SyntaxKind.DotToken;
            }
        }

        private scanSlashToken(allowRegularExpression: boolean): SyntaxKind {
            // NOTE: By default, we do not try scanning a / as a regexp here.  We instead consider it a
            // div or div-assign.  Later on, if the parser runs into a situation where it would like a 
            // term, and it sees one of these then it may restart us asking specifically if we could 
            // scan out a regex.
            if (allowRegularExpression) {
                var result = this.tryScanRegularExpressionToken();
                if (result !== SyntaxKind.None) {
                    return result;
                }
            }

            this._index++;
            if (this._string.charCodeAt(this._index) === CharacterCodes.equals) {
                this._index++;
                return SyntaxKind.SlashEqualsToken;
            }
            else {
                return SyntaxKind.SlashToken;
            }
        }

        private tryScanRegularExpressionToken(): SyntaxKind {
            // Debug.assert(this.currentCharCode() === CharacterCodes.slash);

            var startIndex = this.absoluteIndex();

            this._index++;

            var inEscape = false;
            var inCharacterClass = false;
            while (true) {
                var ch = this._string.charCodeAt(this._index);

                if (isNaN(ch) || this.isNewLineCharacter(ch)) {
                    this.setAbsoluteIndex(startIndex);
                    return SyntaxKind.None;
                }

                this._index++;
                if (inEscape) {
                    inEscape = false;
                    continue;
                }

                switch (ch) {
                    case CharacterCodes.backslash:
                        // We're now in an escape.  Consume the next character we see (unless it's
                        // a newline or null.
                        inEscape = true;
                        continue;

                    case CharacterCodes.openBracket:
                        // If we see a [ then we're starting an character class.  Note: it's ok if 
                        // we then hit another [ inside a character class.  We'll just set the value
                        // to true again and that's ok.
                        inCharacterClass = true;
                        continue;

                    case CharacterCodes.closeBracket:
                        // If we ever hit a cloe bracket then we're now no longer in a character 
                        // class.  If we weren't in a character class to begin with, then this has 
                        // no effect.
                        inCharacterClass = false;
                        continue;

                    case CharacterCodes.slash:
                        // If we see a slash, and we're in a character class, then ignore it.
                        if (inCharacterClass) {
                            continue;
                        }

                        // We're done with the regex.  Break out of the switch (which will break 
                        // out of hte loop.
                        break;

                    default:
                        // Just consume any other characters.
                        continue;
                }

                break;
            }

            // TODO: The grammar says any identifier part is allowed here.  Do we need to support
            // \u identifiers here?  The existing typescript parser does not.  
            while (isIdentifierPartCharacter[this._string.charCodeAt(this._index)]) {
                this._index++;
            }

            return SyntaxKind.RegularExpressionLiteral;
        }

        private scanExclamationToken(): SyntaxKind {
            this._index++;
            if (this._string.charCodeAt(this._index) === CharacterCodes.equals) {
                this._index++;

                if (this._string.charCodeAt(this._index) === CharacterCodes.equals) {
                    this._index++;

                    return SyntaxKind.ExclamationEqualsEqualsToken;
                }
                else {
                    return SyntaxKind.ExclamationEqualsToken;
                }
            }
            else {
                return SyntaxKind.ExclamationToken;
            }
        }

        private scanDefaultCharacter(character: number, reportDiagnostic: (position: number, fullWidth: number, diagnosticKey: string, args: any[]) => void): SyntaxKind {
            var position = this.absoluteIndex();
            this._index++;

            if (reportDiagnostic !== null) {
                var text = String.fromCharCode(character);
                var messageText = this.getErrorMessageText(text);
                reportDiagnostic(position, 1, DiagnosticCode.Unexpected_character_0, [messageText]);
            }

            return SyntaxKind.ErrorToken;
        }

        // Convert text into a printable form usable for an error message.  This will both quote the 
        // string, and ensure all characters printable (i.e. by using unicode escapes when they're not).
        private getErrorMessageText(text: string): string {
            // For just a simple backslash, we return it as is.  The default behavior of JSON.stringify
            // is not what we want here.
            if (text === "\\") {
                return '"\\"';
            }

            return JSON.stringify(text);
        }

        private skipEscapeSequence(reportDiagnostic: (position: number, fullWidth: number, diagnosticKey: string, args: any[]) => void): void {
            // Debug.assert(this.currentCharCode() === CharacterCodes.backslash);

            var rewindPoint = this._index;

            // Consume the backslash.
            this._index++;

            // Get the char after the backslash
            var ch = this._string.charCodeAt(this._index);
            if (isNaN(ch)) {
                // if we're at teh end of the file, just return, the string scanning code will 
                // report an appropriate error.
                return;
            }

            this._index++;
            switch (ch) {
                case CharacterCodes.x:
                case CharacterCodes.u:
                    this.setAbsoluteIndex(rewindPoint);
                    var value = this.scanUnicodeOrHexEscape(reportDiagnostic);
                    break;

                case CharacterCodes.carriageReturn:
                    // If it's \r\n then consume both characters.
                    if (this._string.charCodeAt(this._index) === CharacterCodes.lineFeed) {
                        this._index++;
                    }
                    break;

                // We don't have to do anything special about these characters.  I'm including them
                // Just so it's clear that we intentially process them in the exact same way:
                //case CharacterCodes.singleQuote:
                //case CharacterCodes.doubleQuote:
                //case CharacterCodes.backslash:
                //case CharacterCodes._0:
                //case CharacterCodes.b:
                //case CharacterCodes.f:
                //case CharacterCodes.n:
                //case CharacterCodes.r:
                //case CharacterCodes.t:
                //case CharacterCodes.v:
                //case CharacterCodes.lineFeed:
                //case CharacterCodes.paragraphSeparator:
                //case CharacterCodes.lineSeparator:
                default:
                    // Any other character is ok as well.  As per rule:
                    // EscapeSequence :: CharacterEscapeSequence
                    // CharacterEscapeSequence :: NonEscapeCharacter
                    // NonEscapeCharacter :: SourceCharacter but notEscapeCharacter or LineTerminator
                    break;
            }
        }

        private scanStringLiteral(reportDiagnostic: (position: number, fullWidth: number, diagnosticKey: string, args: any[]) => void): SyntaxKind {
            var quoteCharacter = this._string.charCodeAt(this._index);

            // Debug.assert(quoteCharacter === CharacterCodes.singleQuote || quoteCharacter === CharacterCodes.doubleQuote);

            this._index++;

            while (true) {
                var ch = this._string.charCodeAt(this._index);
                if (ch === CharacterCodes.backslash) {
                    this.skipEscapeSequence(reportDiagnostic);
                }
                else if (ch === quoteCharacter) {
                    this._index++;
                    break;
                }
                else if (isNaN(ch) || this.isNewLineCharacter(ch)) {
                    if (reportDiagnostic) {
                        reportDiagnostic(MathPrototype.min(this._index, this._length), 1, DiagnosticCode.Missing_close_quote_character, null);
                    }
                    break;
                }
                else {
                    this._index++;
                }
            }

            return SyntaxKind.StringLiteral;
        }

        private isUnicodeEscape(character: number): boolean {
            return character === CharacterCodes.backslash &&
                this._string.charCodeAt(this._index + 1) === CharacterCodes.u;
        }

        private peekCharOrUnicodeEscape(): number {
            var character = this._string.charCodeAt(this._index);
            if (this.isUnicodeEscape(character)) {
                return this.peekUnicodeOrHexEscape();
            }
            else {
                return character;
            }
        }

        private peekUnicodeOrHexEscape(): number {
            var startIndex = this._index;

            // if we're peeking, then we don't want to change the position
            var ch = this.scanUnicodeOrHexEscape(/*errors:*/ null);

            this._index = startIndex;

            return ch;
        }

        // Returns true if this was a unicode escape.
        private scanCharOrUnicodeEscape(reportDiagnostic: (position: number, fullWidth: number, diagnosticKey: string, args: any[]) => void): void {
            if (this._string.charCodeAt(this._index) === CharacterCodes.backslash &&
                this._string.charCodeAt(this._index + 1) === CharacterCodes.u) {

                this.scanUnicodeOrHexEscape(reportDiagnostic);
            }
            else {
                this._index++;
            }
        }

        private scanUnicodeOrHexEscape(reportDiagnostic: (position: number, fullWidth: number, diagnosticKey: string, args: any[]) => void): number {
            var start = this._index;
            var character = this._string.charCodeAt(this._index);
            // Debug.assert(character === CharacterCodes.backslash);
            this._index++;

            character = this._string.charCodeAt(this._index);
            // Debug.assert(character === CharacterCodes.u || character === CharacterCodes.x);

            var intChar = 0;
            this._index++;

            var count = character === CharacterCodes.u ? 4 : 2;

            for (var i = 0; i < count; i++) {
                var ch2 = this._string.charCodeAt(this._index);
                if (!CharacterInfo.isHexDigit(ch2)) {
                    if (reportDiagnostic !== null) {
                        reportDiagnostic(start, this._index - start, DiagnosticCode.Unrecognized_escape_sequence, null)
                    }

                    break;
                }

                intChar = (intChar << 4) + CharacterInfo.hexValue(ch2);
                this._index++;
            }

            return intChar;
        }

        public static isValidIdentifier(text: ISimpleText, languageVersion: LanguageVersion): boolean {
            var scanner = new Scanner(languageVersion, text);

            var hadError = false;
            var token = scanner.scan(false, () => hadError = true);

            return !hadError && SyntaxFacts.isIdentifierNameOrAnyKeyword(token) && token.width() === text.length();
        }
    }

    var triviaScanner = new Scanner(LanguageVersion.EcmaScript5, null);

    var sizeInfo = { leadingTriviaWidth: -1, width: -1 };
    var sizeInfoToken: ScannerToken = null;

    class ScannerToken implements ISyntaxToken {
        public parent: ISyntaxElement = null;
        private _syntaxID: number;

        constructor(private _text: ISimpleText,
                    private _packedFullStartAndTriviaInfo: number,
                    private _packedFullWidthAndKind: number) {
        }

        public setTextAndFullStart(text: ISimpleText, fullStart: number): void {
            this._text = text;

            this._packedFullStartAndTriviaInfo =
                (fullStart << ScannerConstants.FullStartShift) |
                (unpackLeadingTriviaInfo(this._packedFullStartAndTriviaInfo) << ScannerConstants.LeadingTriviaShift) |
                (unpackTrailingTriviaInfo(this._packedFullStartAndTriviaInfo) << ScannerConstants.TrailingTriviaShift);
        }

        public syntaxID(): number {
            if (this._syntaxID === undefined) {
                this._syntaxID = Syntax._nextSyntaxID++;
            }

            return this._syntaxID;
        }

        public syntaxTree(): SyntaxTree {
            return this.parent.syntaxTree();
        }

        public fileName(): string {
            return this.parent.fileName();
        }

        public kind(): SyntaxKind {
            return unpackKind(this._packedFullWidthAndKind);
        }

        public childCount(): number { return 0; }
        public childAt(index: number): ISyntaxElement { throw Errors.argumentOutOfRange('index'); }

        public isShared(): boolean { return false; }

        public isIncrementallyUnusable(): boolean { return this.fullWidth() === 0 || SyntaxFacts.isAnyDivideOrRegularExpressionToken(this.kind()); }
        public isKeywordConvertedToIdentifier(): boolean { return false; }

        public fullWidth(): number { return unpackFullWidth(this._packedFullWidthAndKind); }
        public fullStart(): number { return unpackFullStart(this._packedFullStartAndTriviaInfo); }
        public fullEnd(): number { return this.fullStart() + this.fullWidth(); }

        public fillSizeInfo(): void {
            if (sizeInfoToken !== this) {
                // TODO: share this scanner instance.
                triviaScanner.reset(this._text, this.fullStart(), this.fullEnd());
                triviaScanner.fillSizeInfo(this.kind() === SyntaxKind.RegularExpressionLiteral);

                sizeInfoToken = this;
            }
        }

        public width(): number {
            this.fillSizeInfo();
            return sizeInfo.width;
        }

        public start(): number {
            this.fillSizeInfo();
            return this.fullStart() + sizeInfo.leadingTriviaWidth;
        }

        public end(): number {
            this.fillSizeInfo();
            return this.fullStart() + sizeInfo.leadingTriviaWidth + sizeInfo.width;
        }

        public fullText(): string {
            return this._text.substr(this.fullStart(), this.fullWidth());
        }

        public text(): string {
            this.fillSizeInfo();
            return this._text.substr(this.fullStart() + sizeInfo.leadingTriviaWidth, sizeInfo.width);
        }

        public value(): any { return Syntax.value(this); }
        public valueText(): string { return Syntax.valueText(this); }

        public toJSON(key: any): any { return Syntax.tokenToJSON(this); }

        public leadingTrivia(): ISyntaxTriviaList {
            if (!this.hasLeadingTrivia()) {
                return Syntax.emptyTriviaList;
            }

            this.fillSizeInfo();

            var fullStart = this.fullStart();
            triviaScanner.reset(this._text, fullStart, fullStart + sizeInfo.leadingTriviaWidth);
            return triviaScanner.scanTrivia(this, /*isTrailing:*/ false);
        }

        public trailingTrivia(): ISyntaxTriviaList {
            if (!this.hasTrailingTrivia()) {
                return Syntax.emptyTriviaList;
            }

            this.fillSizeInfo();
            var triviaStart = this.fullStart() + sizeInfo.leadingTriviaWidth + sizeInfo.width;
            var fullEnd = this.fullEnd();
            var triviaWidth = fullEnd - triviaStart;

            triviaScanner.reset(this._text, triviaStart, fullEnd);
            return triviaScanner.scanTrivia(this, /*isTrailing:*/ true);
        }

        public leadingTriviaWidth(): number {
            if (!this.hasLeadingTrivia()) {
                return 0;
            }

            this.fillSizeInfo();
            return sizeInfo.leadingTriviaWidth;
        }

        public trailingTriviaWidth(): number {
            if (!this.hasTrailingTrivia()) {
                return 0;
            }

            this.fillSizeInfo();
            return this.fullWidth() - sizeInfo.leadingTriviaWidth - sizeInfo.width;
        }

        public firstToken(): ISyntaxToken { return this; }
        public lastToken(): ISyntaxToken { return this; }

        public collectTextElements(elements: string[]): void {
            elements.push(this.fullText());
        }

        public hasLeadingTrivia(): boolean {
            var info = unpackLeadingTriviaInfo(this._packedFullStartAndTriviaInfo);
            return info !== 0;
        }

        public hasLeadingComment(): boolean {
            var info = unpackLeadingTriviaInfo(this._packedFullStartAndTriviaInfo);
            return (info & ScannerConstants.CommentTriviaBitMask) !== 0;
        }

        public hasLeadingNewLine(): boolean {
            var info = unpackLeadingTriviaInfo(this._packedFullStartAndTriviaInfo);
            return (info & ScannerConstants.NewLineTriviaBitMask) !== 0;
        }

        public hasTrailingTrivia(): boolean {
            var info = unpackTrailingTriviaInfo(this._packedFullStartAndTriviaInfo);
            return info !== 0;
        }

        public hasTrailingComment(): boolean {
            var info = unpackTrailingTriviaInfo(this._packedFullStartAndTriviaInfo);
            return (info & ScannerConstants.CommentTriviaBitMask) !== 0;
        }

        public hasTrailingNewLine(): boolean {
            var info = unpackTrailingTriviaInfo(this._packedFullStartAndTriviaInfo);
            return (info & ScannerConstants.NewLineTriviaBitMask) !== 0;
        }

        public hasLeadingSkippedText(): boolean { return false; }
        public hasTrailingSkippedText(): boolean { return false; }
        public hasSkippedToken(): boolean { return false; }

        public withLeadingTrivia(leadingTrivia: ISyntaxTriviaList): ISyntaxToken {
            return Syntax.realizeToken(this).withLeadingTrivia(leadingTrivia);
        }

        public withTrailingTrivia(trailingTrivia: ISyntaxTriviaList): ISyntaxToken {
            return Syntax.realizeToken(this).withTrailingTrivia(trailingTrivia);
        }

        public previousToken(includeSkippedTokens: boolean = false): ISyntaxToken { return Syntax.previousToken(this, includeSkippedTokens); }
        public nextToken(includeSkippedTokens: boolean = false): ISyntaxToken { return Syntax.nextToken(this, includeSkippedTokens); }

        public clone(): ISyntaxToken {
            return new ScannerToken(this._text, this._packedFullStartAndTriviaInfo, this._packedFullWidthAndKind);
        }

        public isPrimaryExpression(): boolean { return Syntax.isPrimaryExpression(this); }
        public isExpression(): boolean { return this.isPrimaryExpression(); }
        public isMemberExpression(): boolean { return this.isPrimaryExpression(); }
        public isLeftHandSideExpression(): boolean { return this.isPrimaryExpression(); }
        public isPostfixExpression(): boolean { return this.isPrimaryExpression(); }
        public isUnaryExpression(): boolean { return this.isPrimaryExpression(); }
    }
}