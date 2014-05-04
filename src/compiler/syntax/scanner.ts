///<reference path='references.ts' />

module TypeScript {
    // To save space in a token we use 60 bits to encode the following.
    //
    //   _packedFullStartAndInfo:
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
        LeadingTriviaShift         = 0,
        TrailingTriviaShift        = 3,
        FullStartShift             = 6,

        KindShift                  = 0,
        FullWidthShift             = 7,

        KindBitMask                = 0x7F, // 01111111
        TriviaBitMask              = 0x07, // 00000111
        CommentTriviaBitMask       = 0x01, // 00000001
        NewLineTriviaBitMask       = 0x02, // 00000010
        WhitespaceTriviaBitMask    = 0x04, // 00000100
    }

    function packFullStartAndInfo(fullStart: number, leadingTriviaInfo: number, trailingTriviaInfo: number): number {
        return (fullStart << ScannerConstants.FullStartShift) | 
            (leadingTriviaInfo << ScannerConstants.LeadingTriviaShift) |
            (trailingTriviaInfo << ScannerConstants.TrailingTriviaShift);
    }

    function packFullWidthAndKind(fullWidth: number, kind: SyntaxKind): number {
        return (fullWidth << ScannerConstants.FullWidthShift) | (kind << ScannerConstants.KindShift);
    }

    function unpackKind(_packedFullWidthAndKind: number): SyntaxKind {
        return <SyntaxKind>((_packedFullWidthAndKind >> ScannerConstants.KindShift) & ScannerConstants.KindBitMask);
    }

    function unpackFullWidth(_packedFullWidthAndKind: number): number {
        return _packedFullWidthAndKind >> ScannerConstants.FullWidthShift;
    }

    function unpackFullStart(_packedFullStartAndInfo: number): number {
        return _packedFullStartAndInfo >> ScannerConstants.FullStartShift;
    }

    function unpackLeadingTriviaInfo(_packedFullStartAndInfo: number): number {
        return (_packedFullStartAndInfo >> ScannerConstants.LeadingTriviaShift) & ScannerConstants.TriviaBitMask;
    }

    function unpackTrailingTriviaInfo(_packedFullStartAndInfo: number): number {
        return (_packedFullStartAndInfo >> ScannerConstants.TrailingTriviaShift) & ScannerConstants.TriviaBitMask;
    }

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

    class ScannerToken implements ISyntaxToken {
        private static lastTokenInfo = { leadingTriviaWidth: -1, width: -1 };
        private static lastTokenInfoToken: ScannerToken = null;
        private static triviaScanner = createScannerInternal(LanguageVersion.EcmaScript5, SimpleText.fromString(""), () => { });

        public parent: ISyntaxElement = null;

        public _isPrimaryExpression: any;
        public _isMemberExpression: any;
        public _isLeftHandSideExpression: any;
        public _isPostfixExpression: any;
        public _isUnaryExpression: any;
        public _isExpression: any;

        constructor(public _text: ISimpleText,
                    private _packedFullStartAndInfo: number,
                    private _packedFullWidthAndKind: number) {
        }

        public setTextAndFullStart(text: ISimpleText, fullStart: number): void {
            this._text = text;

            this._packedFullStartAndInfo = packFullStartAndInfo(fullStart,
                unpackLeadingTriviaInfo(this._packedFullStartAndInfo),
                unpackTrailingTriviaInfo(this._packedFullStartAndInfo));
        }

        public get kind(): SyntaxKind {
            return unpackKind(this._packedFullWidthAndKind);
        }

        public childCount(): number { return 0; }
        public childAt(index: number): ISyntaxElement { throw Errors.argumentOutOfRange('index'); }

        public isIncrementallyUnusable(): boolean { return this.fullWidth() === 0 || SyntaxFacts.isAnyDivideOrRegularExpressionToken(this.kind); }

        public isKeywordConvertedToIdentifier(): boolean { return false; }

        public fullWidth(): number { return unpackFullWidth(this._packedFullWidthAndKind); }
        public fullStart(): number { return unpackFullStart(this._packedFullStartAndInfo); }

        private fillSizeInfo(): void {
            if (ScannerToken.lastTokenInfoToken !== this) {
                ScannerToken.triviaScanner.fillTokenInfo(this, ScannerToken.lastTokenInfo);
                ScannerToken.lastTokenInfoToken = this;
            }
        }

        public fullText(): string {
            return this._text.substr(this.fullStart(), this.fullWidth());
        }

        public text(): string {
            this.fillSizeInfo();
            return this._text.substr(this.fullStart() + ScannerToken.lastTokenInfo.leadingTriviaWidth, ScannerToken.lastTokenInfo.width);
        }

        public leadingTrivia(): ISyntaxTriviaList {
            if (!this.hasLeadingTrivia()) {
                return Syntax.emptyTriviaList;
            }

            return ScannerToken.triviaScanner.scanTrivia(this, /*isTrailing:*/ false);
        }

        public trailingTrivia(): ISyntaxTriviaList {
            if (!this.hasTrailingTrivia()) {
                return Syntax.emptyTriviaList;
            }

            return ScannerToken.triviaScanner.scanTrivia(this, /*isTrailing:*/ true);
        }

        public leadingTriviaWidth(): number {
            if (!this.hasLeadingTrivia()) {
                return 0;
            }

            this.fillSizeInfo();
            return ScannerToken.lastTokenInfo.leadingTriviaWidth;
        }

        public trailingTriviaWidth(): number {
            if (!this.hasTrailingTrivia()) {
                return 0;
            }

            this.fillSizeInfo();
            return this.fullWidth() - ScannerToken.lastTokenInfo.leadingTriviaWidth - ScannerToken.lastTokenInfo.width;
        }

        public hasLeadingTrivia(): boolean {
            var info = unpackLeadingTriviaInfo(this._packedFullStartAndInfo);
            return info !== 0;
        }

        public hasLeadingComment(): boolean {
            var info = unpackLeadingTriviaInfo(this._packedFullStartAndInfo);
            return (info & ScannerConstants.CommentTriviaBitMask) !== 0;
        }

        public hasLeadingNewLine(): boolean {
            var info = unpackLeadingTriviaInfo(this._packedFullStartAndInfo);
            return (info & ScannerConstants.NewLineTriviaBitMask) !== 0;
        }

        public hasTrailingTrivia(): boolean {
            var info = unpackTrailingTriviaInfo(this._packedFullStartAndInfo);
            return info !== 0;
        }

        public hasTrailingComment(): boolean {
            var info = unpackTrailingTriviaInfo(this._packedFullStartAndInfo);
            return (info & ScannerConstants.CommentTriviaBitMask) !== 0;
        }

        public hasTrailingNewLine(): boolean {
            var info = unpackTrailingTriviaInfo(this._packedFullStartAndInfo);
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
            return new ScannerToken(this._text, this._packedFullStartAndInfo, this._packedFullWidthAndKind);
        }
    }

    export interface DiagnosticCallback {
        (position: number, width: number, key: string, arguments: any[]): void;
    }

    export interface TokenInfo {
        leadingTriviaWidth: number;
        width: number;
    }

    interface ScannerInternal extends Scanner {
        fillTokenInfo(token: ScannerToken, tokenInfo: TokenInfo): void;
        scanTrivia(token: ScannerToken, isTrailing: boolean): ISyntaxTriviaList;
    }

    export interface Scanner {
        setIndex(index: number): void;
        scan(allowRegularExpression: boolean): ISyntaxToken;
    }

    export function createScanner(languageVersion: LanguageVersion, text: ISimpleText, reportDiagnostic: DiagnosticCallback): Scanner {
        var scanner = createScannerInternal(languageVersion, text, reportDiagnostic);
        return {
            setIndex: scanner.setIndex,
            scan: scanner.scan,
        };
    }

    function createScannerInternal(languageVersion: LanguageVersion, text: ISimpleText, reportDiagnostic: DiagnosticCallback): ScannerInternal {
        var str: string;
        var index: number;
        var start: number;
        var end: number;

        function setIndex(_index: number) {
            index = _index;
        }

        function reset(_text: ISimpleText, _start: number, _end: number) {
            Debug.assert(_start <= _text.length());
            Debug.assert(_end <= _text.length());

            if (!str || text !== _text) {
                text = _text;
                str = _text.substr(0, _text.length());
            }

            start = _start;
            end = _end;
            index = _start;
        }

        function isAtEndOfSource(): boolean {
            return index >= end;
        }

        function scan(allowRegularExpression: boolean): ISyntaxToken {
            var fullStart = index;

            var leadingTriviaInfo = scanTriviaInfo(/*isTrailing: */ false);
            var kind = scanSyntaxKind(allowRegularExpression);
            var trailingTriviaInfo = scanTriviaInfo(/*isTrailing: */true);

            var fullEnd = index;

            // Pack functions inlined for perf.
            var fullWidth = fullEnd - fullStart;
            var packedFullStartAndTriviaInfo = (fullStart << ScannerConstants.FullStartShift) | leadingTriviaInfo | (trailingTriviaInfo << ScannerConstants.TrailingTriviaShift);
            var packedFullWidthAndKind = (fullWidth << ScannerConstants.FullWidthShift) | kind;
            return new ScannerToken(text, packedFullStartAndTriviaInfo, packedFullWidthAndKind);
        }

        function scanTrivia(parent: ScannerToken, isTrailing: boolean): ISyntaxTriviaList {
            if (isTrailing) {
                reset(parent._text, TypeScript.end(parent), fullEnd(parent));
            }
            else {
                reset(parent._text, parent.fullStart(), TypeScript.start(parent));
            }
            // Debug.assert(length > 0);

            // Keep this exactly in sync with scanTriviaInfo
            var trivia: ISyntaxTrivia[] = [];

            while (true) {
                if (!isAtEndOfSource()) {
                    var ch = str.charCodeAt(index);
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
                            trivia.push(scanWhitespaceTrivia());
                            continue;

                        case CharacterCodes.slash:
                            // Potential comment.  Consume if so.  Otherwise, break out and return.
                            var ch2 = str.charCodeAt(index + 1);
                            if (ch2 === CharacterCodes.slash) {
                                trivia.push(scanSingleLineCommentTrivia());
                                continue;
                            }

                            if (ch2 === CharacterCodes.asterisk) {
                                trivia.push(scanMultiLineCommentTrivia());
                                continue;
                            }

                            // Not a comment.  Don't consume.
                            throw Errors.invalidOperation();

                        case CharacterCodes.carriageReturn:
                        case CharacterCodes.lineFeed:
                        case CharacterCodes.paragraphSeparator:
                        case CharacterCodes.lineSeparator:
                            trivia.push(scanLineTerminatorSequenceTrivia(ch));

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

        function scanTriviaInfo(isTrailing: boolean): number {
            // Keep this exactly in sync with scanTrivia
            var commentInfo = 0;
            var whitespaceInfo = 0;
            var newLineInfo = 0;

            while (true) {
                var ch = str.charCodeAt(index);

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
                        index++;
                        continue;

                    case CharacterCodes.slash:
                        // Potential comment.  Consume if so.  Otherwise, break out and return.
                        var ch2 = str.charCodeAt(index + 1);
                        if (ch2 === CharacterCodes.slash) {
                            commentInfo = ScannerConstants.CommentTriviaBitMask;
                            skipSingleLineCommentTrivia();
                            continue;
                        }

                        if (ch2 === CharacterCodes.asterisk) {
                            commentInfo = ScannerConstants.CommentTriviaBitMask;
                            skipMultiLineCommentTrivia();
                            continue;
                        }

                        // Not a comment.  Don't consume.
                        break;

                    case CharacterCodes.carriageReturn:
                    case CharacterCodes.lineFeed:
                    case CharacterCodes.paragraphSeparator:
                    case CharacterCodes.lineSeparator:
                        newLineInfo = ScannerConstants.NewLineTriviaBitMask;
                        skipLineTerminatorSequence(ch);

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

        function isNewLineCharacter(ch: number): boolean {
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

        function scanWhitespaceTrivia(): ISyntaxTrivia {
            // We're going to be extracting text out of sliding window.  Make sure it can't move past
            // this point.
            var absoluteStartIndex = index;

            while (true) {
                var ch = str.charCodeAt(index);

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
                        index++;
                        continue;
                }

                break;
            }

            return createTrivia(SyntaxKind.WhitespaceTrivia, absoluteStartIndex);
        }

        function createTrivia(kind: SyntaxKind, absoluteStartIndex: number): ISyntaxTrivia {
            var fullWidth = index - absoluteStartIndex;
            return Syntax.deferredTrivia(kind, text, absoluteStartIndex, fullWidth);
        }

        function scanSingleLineCommentTrivia(): ISyntaxTrivia {
            var absoluteStartIndex = index;
            skipSingleLineCommentTrivia();

            return createTrivia(SyntaxKind.SingleLineCommentTrivia, absoluteStartIndex);
        }

        function skipSingleLineCommentTrivia(): void {
            index += 2;

            // The '2' is for the "//" we consumed.
            while (true) {
                var ch = str.charCodeAt(index);
                if (isNaN(ch) || isNewLineCharacter(ch)) {
                    return;
                }

                index++;
            }
        }

        function scanMultiLineCommentTrivia(): ISyntaxTrivia {
            var absoluteStartIndex = index;
            skipMultiLineCommentTrivia();

            return createTrivia(SyntaxKind.MultiLineCommentTrivia, absoluteStartIndex);
        }

        function skipMultiLineCommentTrivia(): number {
            // The '2' is for the "/*" we consumed.
            index += 2;

            while (true) {
                if (isAtEndOfSource()) {
                    reportDiagnostic(end, 0, DiagnosticCode.AsteriskSlash_expected, null);
                    return;
                }

                if (str.charCodeAt(index) === CharacterCodes.asterisk &&
                    str.charCodeAt(index + 1) === CharacterCodes.slash) {

                    index += 2;
                    return;
                }

                index++;
            }
        }

        function scanLineTerminatorSequenceTrivia(ch: number): ISyntaxTrivia {
            var absoluteStartIndex = index;
            skipLineTerminatorSequence(ch);

            return createTrivia(SyntaxKind.NewLineTrivia, absoluteStartIndex);
        }

        function skipLineTerminatorSequence(ch: number): void {
            // Consume the first of the line terminator we saw.
            index++;

            // If it happened to be a \r and there's a following \n, then consume both.
            if (ch === CharacterCodes.carriageReturn && str.charCodeAt(index) === CharacterCodes.lineFeed) {
                index++;
            }
        }

        function scanSyntaxKind(allowRegularExpression: boolean): SyntaxKind {
            if (isAtEndOfSource()) {
                return SyntaxKind.EndOfFileToken;
            }

            var character = str.charCodeAt(index);

            switch (character) {
                case CharacterCodes.doubleQuote:
                case CharacterCodes.singleQuote:
                    return scanStringLiteral();

                // These are the set of variable width punctuation tokens.
                case CharacterCodes.slash:
                    return scanSlashToken(allowRegularExpression);

                case CharacterCodes.dot:
                    return scanDotToken();

                case CharacterCodes.minus:
                    return scanMinusToken();

                case CharacterCodes.exclamation:
                    return scanExclamationToken();

                case CharacterCodes.equals:
                    return scanEqualsToken();

                case CharacterCodes.bar:
                    return scanBarToken();

                case CharacterCodes.asterisk:
                    return scanAsteriskToken();

                case CharacterCodes.plus:
                    return scanPlusToken();

                case CharacterCodes.percent:
                    return scanPercentToken();

                case CharacterCodes.ampersand:
                    return scanAmpersandToken();

                case CharacterCodes.caret:
                    return scanCaretToken();

                case CharacterCodes.lessThan:
                    return scanLessThanToken();

                // These are the set of fixed, single character length punctuation tokens.
                // The token kind does not depend on what follows.
                case CharacterCodes.greaterThan:
                    return advanceAndSetTokenKind(SyntaxKind.GreaterThanToken);

                case CharacterCodes.comma:
                    return advanceAndSetTokenKind(SyntaxKind.CommaToken);

                case CharacterCodes.colon:
                    return advanceAndSetTokenKind(SyntaxKind.ColonToken);

                case CharacterCodes.semicolon:
                    return advanceAndSetTokenKind(SyntaxKind.SemicolonToken);

                case CharacterCodes.tilde:
                    return advanceAndSetTokenKind(SyntaxKind.TildeToken);

                case CharacterCodes.openParen:
                    return advanceAndSetTokenKind(SyntaxKind.OpenParenToken);

                case CharacterCodes.closeParen:
                    return advanceAndSetTokenKind(SyntaxKind.CloseParenToken);

                case CharacterCodes.openBrace:
                    return advanceAndSetTokenKind(SyntaxKind.OpenBraceToken);

                case CharacterCodes.closeBrace:
                    return advanceAndSetTokenKind(SyntaxKind.CloseBraceToken);

                case CharacterCodes.openBracket:
                    return advanceAndSetTokenKind(SyntaxKind.OpenBracketToken);

                case CharacterCodes.closeBracket:
                    return advanceAndSetTokenKind(SyntaxKind.CloseBracketToken);

                case CharacterCodes.question:
                    return advanceAndSetTokenKind(SyntaxKind.QuestionToken);
            }

            if (isNumericLiteralStart[character]) {
                return scanNumericLiteral();
            }

            // We run into so many identifiers (and keywords) when scanning, that we want the code to
            // be as fast as possible.  To that end, we have an extremely fast path for scanning that
            // handles the 99.9% case of no-unicode characters and no unicode escapes.
            if (isIdentifierStartCharacter[character]) {
                var result = tryFastScanIdentifierOrKeyword(character);
                if (result !== SyntaxKind.None) {
                    return result;
                }
            }

            if (isIdentifierStart(peekCharOrUnicodeEscape())) {
                return slowScanIdentifierOrKeyword();
            }

            return scanDefaultCharacter(character);
        }

        function isIdentifierStart(interpretedChar: number): boolean {
            if (isIdentifierStartCharacter[interpretedChar]) {
                return true;
            }

            return interpretedChar > CharacterCodes.maxAsciiCharacter && Unicode.isIdentifierStart(interpretedChar, languageVersion);
        }

        function isIdentifierPart(interpretedChar: number): boolean {
            if (isIdentifierPartCharacter[interpretedChar]) {
                return true;
            }

            return interpretedChar > CharacterCodes.maxAsciiCharacter && Unicode.isIdentifierPart(interpretedChar, languageVersion);
        }

        function tryFastScanIdentifierOrKeyword(firstCharacter: number): SyntaxKind {
            var startIndex = index;
            var character: number = 0;

            // Note that we go up to the windowCount-1 so that we can read the character at the end
            // of the window and check if it's *not* an identifier part character.
            while (index < end) {
                character = str.charCodeAt(index);
                if (!isIdentifierPartCharacter[character]) {
                    break;
                }

                index++;
            }

            if (index < end && (character === CharacterCodes.backslash || character > CharacterCodes.maxAsciiCharacter)) {
                // We saw a \ (which could start a unicode escape), or we saw a unicode character.
                // This can't be scanned quickly.  Don't update the window position and just bail out
                // to the slow path.
                index = startIndex;
                return SyntaxKind.None;
            }
            else {
                // Saw an ascii character that wasn't a backslash and wasn't an identifier 
                // character.  Or we hit the end of the file  This identifier is done.

                // Also check if it a keyword if it started with a lowercase letter.
                var kind: SyntaxKind;
                var identifierLength = index - startIndex;
                if (isKeywordStartCharacter[firstCharacter]) {
                    kind = ScannerUtilities.identifierKind(str, startIndex, identifierLength);
                }
                else {
                    kind = SyntaxKind.IdentifierName;
                }

                return kind;
            }
        }

        // A slow path for scanning identifiers.  Called when we run into a unicode character or
        // escape sequence while processing the fast path.
        function slowScanIdentifierOrKeyword(): SyntaxKind {
            var startIndex = index;

            do {
                scanCharOrUnicodeEscape();
            }
            while (isIdentifierPart(peekCharOrUnicodeEscape()));

            // From ES6 specification.
            // The ReservedWord definitions are specified as literal sequences of Unicode 
            // characters.However, any Unicode character in a ReservedWord can also be 
            // expressed by a \ UnicodeEscapeSequence that expresses that same Unicode 
            // character's code point.Use of such escape sequences does not change the meaning 
            // of the ReservedWord.
            //
            // i.e. "\u0076ar" is the keyword 'var'.  Check for that here.
            var length = index - startIndex;
            var text = str.substr(startIndex, length);
            var valueText = massageEscapes(text);

            var keywordKind = SyntaxFacts.getTokenKind(valueText);
            if (keywordKind >= SyntaxKind.FirstKeyword && keywordKind <= SyntaxKind.LastKeyword) {
                return keywordKind;
            }

            return SyntaxKind.IdentifierName;
        }

        function scanNumericLiteral(): SyntaxKind {
            if (isHexNumericLiteral()) {
                scanHexNumericLiteral();
            }
            else if (isOctalNumericLiteral()) {
                scanOctalNumericLiteral();
            }
            else {
                scanDecimalNumericLiteral();
            }

            return SyntaxKind.NumericLiteral;
        }

        function isOctalNumericLiteral(): boolean {
            return str.charCodeAt(index) === CharacterCodes._0 &&
                CharacterInfo.isOctalDigit(str.charCodeAt(index + 1));
        }

        function scanOctalNumericLiteral(): void {
            var position = index

            while (CharacterInfo.isOctalDigit(str.charCodeAt(index))) {
                index++;
            }

            if (languageVersion >= LanguageVersion.EcmaScript5) {
                reportDiagnostic(
                    position, index - position, DiagnosticCode.Octal_literals_are_not_available_when_targeting_ECMAScript_5_and_higher, null);
            }
        }

        function scanDecimalDigits(): void {
            while (CharacterInfo.isDecimalDigit(str.charCodeAt(index))) {
                index++;
            }
        }

        function scanDecimalNumericLiteral(): void {
            scanDecimalDigits();

            if (str.charCodeAt(index) === CharacterCodes.dot) {
                index++;
            }

            scanDecimalDigits();

            // If we see an 'e' or 'E' we should only consume it if its of the form:
            // e<number> or E<number> 
            // e+<number>   E+<number>
            // e-<number>   E-<number>
            var ch = str.charCodeAt(index);
            if (ch === CharacterCodes.e || ch === CharacterCodes.E) {
                // Ok, we've got 'e' or 'E'.  Make sure it's followed correctly.
                var nextChar1 = str.charCodeAt(index + 1);

                if (CharacterInfo.isDecimalDigit(nextChar1)) {
                    // e<number> or E<number>
                    // Consume 'e' or 'E' and the number portion.
                    index++;
                    scanDecimalDigits();
                }
                else if (nextChar1 === CharacterCodes.minus || nextChar1 === CharacterCodes.plus) {
                    // e+ or E+ or e- or E-
                    var nextChar2 = str.charCodeAt(index + 2);
                    if (CharacterInfo.isDecimalDigit(nextChar2)) {
                        // e+<number> or E+<number> or e-<number> or E-<number>
                        // Consume first two characters and the number portion.
                        index += 2;
                        scanDecimalDigits();
                    }
                }
            }
        }

        function scanHexNumericLiteral(): void {
            // Move past the 0x.
            index += 2;

            while (CharacterInfo.isHexDigit(str.charCodeAt(index))) {
                index++;
            }
        }

        function isHexNumericLiteral(): boolean {
            if (str.charCodeAt(index) === CharacterCodes._0) {
                var ch = str.charCodeAt(index + 1);

                if (ch === CharacterCodes.x || ch === CharacterCodes.X) {
                    ch = str.charCodeAt(index + 2);

                    return CharacterInfo.isHexDigit(ch);
                }
            }

            return false;
        }

        function advanceAndSetTokenKind(kind: SyntaxKind): SyntaxKind {
            index++;
            return kind;
        }

        function scanLessThanToken(): SyntaxKind {
            index++;
            var ch0 = str.charCodeAt(index);
            if (ch0 === CharacterCodes.equals) {
                index++;
                return SyntaxKind.LessThanEqualsToken;
            }
            else if (ch0 === CharacterCodes.lessThan) {
                index++;
                if (str.charCodeAt(index) === CharacterCodes.equals) {
                    index++;
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

        function scanBarToken(): SyntaxKind {
            index++;
            var ch = str.charCodeAt(index);
            if (ch === CharacterCodes.equals) {
                index++;
                return SyntaxKind.BarEqualsToken;
            }
            else if (ch === CharacterCodes.bar) {
                index++;
                return SyntaxKind.BarBarToken;
            }
            else {
                return SyntaxKind.BarToken;
            }
        }

        function scanCaretToken(): SyntaxKind {
            index++;
            if (str.charCodeAt(index) === CharacterCodes.equals) {
                index++;
                return SyntaxKind.CaretEqualsToken;
            }
            else {
                return SyntaxKind.CaretToken;
            }
        }

        function scanAmpersandToken(): SyntaxKind {
            index++;
            var character = str.charCodeAt(index);
            if (character === CharacterCodes.equals) {
                index++;
                return SyntaxKind.AmpersandEqualsToken;
            }
            else if (character === CharacterCodes.ampersand) {
                index++;
                return SyntaxKind.AmpersandAmpersandToken;
            }
            else {
                return SyntaxKind.AmpersandToken;
            }
        }

        function scanPercentToken(): SyntaxKind {
            index++;
            if (str.charCodeAt(index) === CharacterCodes.equals) {
                index++;
                return SyntaxKind.PercentEqualsToken;
            }
            else {
                return SyntaxKind.PercentToken;
            }
        }

        function scanMinusToken(): SyntaxKind {
            index++;
            var character = str.charCodeAt(index);

            if (character === CharacterCodes.equals) {
                index++;
                return SyntaxKind.MinusEqualsToken;
            }
            else if (character === CharacterCodes.minus) {
                index++;
                return SyntaxKind.MinusMinusToken;
            }
            else {
                return SyntaxKind.MinusToken;
            }
        }

        function scanPlusToken(): SyntaxKind {
            index++;
            var character = str.charCodeAt(index);
            if (character === CharacterCodes.equals) {
                index++;
                return SyntaxKind.PlusEqualsToken;
            }
            else if (character === CharacterCodes.plus) {
                index++;
                return SyntaxKind.PlusPlusToken;
            }
            else {
                return SyntaxKind.PlusToken;
            }
        }

        function scanAsteriskToken(): SyntaxKind {
            index++;
            if (str.charCodeAt(index) === CharacterCodes.equals) {
                index++;
                return SyntaxKind.AsteriskEqualsToken;
            }
            else {
                return SyntaxKind.AsteriskToken;
            }
        }

        function scanEqualsToken(): SyntaxKind {
            index++;
            var character = str.charCodeAt(index);
            if (character === CharacterCodes.equals) {
                index++;

                if (str.charCodeAt(index) === CharacterCodes.equals) {
                    index++;

                    return SyntaxKind.EqualsEqualsEqualsToken;
                }
                else {
                    return SyntaxKind.EqualsEqualsToken;
                }
            }
            else if (character === CharacterCodes.greaterThan) {
                index++;
                return SyntaxKind.EqualsGreaterThanToken;
            }
            else {
                return SyntaxKind.EqualsToken;
            }
        }

        function isDotPrefixedNumericLiteral(): boolean {
            if (str.charCodeAt(index) === CharacterCodes.dot) {
                var ch = str.charCodeAt(index + 1);
                return CharacterInfo.isDecimalDigit(ch);
            }

            return false;
        }

        function scanDotToken(): SyntaxKind {
            if (isDotPrefixedNumericLiteral()) {
                return scanNumericLiteral();
            }

            index++;
            if (str.charCodeAt(index) === CharacterCodes.dot &&
                str.charCodeAt(index + 1) === CharacterCodes.dot) {

                index += 2;
                return SyntaxKind.DotDotDotToken;
            }
            else {
                return SyntaxKind.DotToken;
            }
        }

        function scanSlashToken(allowRegularExpression: boolean): SyntaxKind {
            // NOTE: By default, we do not try scanning a / as a regexp here.  We instead consider it a
            // div or div-assign.  Later on, if the parser runs into a situation where it would like a 
            // term, and it sees one of these then it may restart us asking specifically if we could 
            // scan out a regex.
            if (allowRegularExpression) {
                var result = tryScanRegularExpressionToken();
                if (result !== SyntaxKind.None) {
                    return result;
                }
            }

            index++;
            if (str.charCodeAt(index) === CharacterCodes.equals) {
                index++;
                return SyntaxKind.SlashEqualsToken;
            }
            else {
                return SyntaxKind.SlashToken;
            }
        }

        function tryScanRegularExpressionToken(): SyntaxKind {
            var startIndex = index;

            index++;

            var inEscape = false;
            var inCharacterClass = false;
            while (true) {
                var ch = str.charCodeAt(index);

                if (isNaN(ch) || isNewLineCharacter(ch)) {
                    index = startIndex;
                    return SyntaxKind.None;
                }

                index++;
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
            while (isIdentifierPartCharacter[str.charCodeAt(index)]) {
                index++;
            }

            return SyntaxKind.RegularExpressionLiteral;
        }

        function scanExclamationToken(): SyntaxKind {
            index++;
            if (str.charCodeAt(index) === CharacterCodes.equals) {
                index++;

                if (str.charCodeAt(index) === CharacterCodes.equals) {
                    index++;

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

        function scanDefaultCharacter(character: number): SyntaxKind {
            var position = index;
            index++;

            var text = String.fromCharCode(character);
            var messageText = getErrorMessageText(text);
            reportDiagnostic(position, 1, DiagnosticCode.Unexpected_character_0, [messageText]);

            return SyntaxKind.ErrorToken;
        }

        // Convert text into a printable form usable for an error message.  This will both quote the 
        // string, and ensure all characters printable (i.e. by using unicode escapes when they're not).
        function getErrorMessageText(text: string): string {
            // For just a simple backslash, we return it as is.  The default behavior of JSON.stringify
            // is not what we want here.
            if (text === "\\") {
                return '"\\"';
            }

            return JSON.stringify(text);
        }

        function skipEscapeSequence(): void {
            var rewindPoint = index;

            // Consume the backslash.
            index++;

            // Get the char after the backslash
            var ch = str.charCodeAt(index);
            if (isNaN(ch)) {
                // if we're at teh end of the file, just return, the string scanning code will 
                // report an appropriate error.
                return;
            }

            index++;
            switch (ch) {
                case CharacterCodes.x:
                case CharacterCodes.u:
                    index = rewindPoint;
                    var value = scanUnicodeOrHexEscape(/*report:*/ true);
                    break;

                case CharacterCodes.carriageReturn:
                    // If it's \r\n then consume both characters.
                    if (str.charCodeAt(index) === CharacterCodes.lineFeed) {
                        index++;
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

        function scanStringLiteral(): SyntaxKind {
            var quoteCharacter = str.charCodeAt(index);

            // Debug.assert(quoteCharacter === CharacterCodes.singleQuote || quoteCharacter === CharacterCodes.doubleQuote);

            index++;

            while (true) {
                var ch = str.charCodeAt(index);
                if (ch === CharacterCodes.backslash) {
                    skipEscapeSequence();
                }
                else if (ch === quoteCharacter) {
                    index++;
                    break;
                }
                else if (isNaN(ch) || isNewLineCharacter(ch)) {
                    reportDiagnostic(MathPrototype.min(index, end), 1, DiagnosticCode.Missing_close_quote_character, null);
                    break;
                }
                else {
                    index++;
                }
            }

            return SyntaxKind.StringLiteral;
        }

        function isUnicodeEscape(character: number): boolean {
            return character === CharacterCodes.backslash &&
                str.charCodeAt(index + 1) === CharacterCodes.u;
        }

        function peekCharOrUnicodeEscape(): number {
            var character = str.charCodeAt(index);
            if (isUnicodeEscape(character)) {
                return peekUnicodeOrHexEscape();
            }
            else {
                return character;
            }
        }

        function peekUnicodeOrHexEscape(): number {
            var startIndex = index;

            // if we're peeking, then we don't want to change the position
            var ch = scanUnicodeOrHexEscape(/*report:*/ false);

            index = startIndex;

            return ch;
        }

        // Returns true if this was a unicode escape.
        function scanCharOrUnicodeEscape(): void {
            if (str.charCodeAt(index) === CharacterCodes.backslash &&
                str.charCodeAt(index + 1) === CharacterCodes.u) {

                scanUnicodeOrHexEscape(/*report:*/ true);
            }
            else {
                index++;
            }
        }

        function scanUnicodeOrHexEscape(report: boolean): number {
            var start = index;
            var character = str.charCodeAt(index);
            // Debug.assert(character === CharacterCodes.backslash);
            index++;

            character = str.charCodeAt(index);
            // Debug.assert(character === CharacterCodes.u || character === CharacterCodes.x);

            var intChar = 0;
            index++;

            var count = character === CharacterCodes.u ? 4 : 2;

            for (var i = 0; i < count; i++) {
                var ch2 = str.charCodeAt(index);
                if (!CharacterInfo.isHexDigit(ch2)) {
                    if (report) {
                        reportDiagnostic(start, index - start, DiagnosticCode.Unrecognized_escape_sequence, null)
                    }

                    break;
                }

                intChar = (intChar << 4) + CharacterInfo.hexValue(ch2);
                index++;
            }

            return intChar;
        }

        function fillTokenInfo(token: ScannerToken, tokenInfo: TokenInfo): void {
            reset(token._text, token.fullStart(), fullEnd(token));

            var fullStart = index;
            var leadingTriviaInfo = scanTriviaInfo(/*isTrailing: */ false);

            var start = index;
            scanSyntaxKind(token.kind === SyntaxKind.RegularExpressionLiteral);
            var end = index;

            tokenInfo.leadingTriviaWidth = start - fullStart;
            tokenInfo.width = end - start;
        }

        reset(text, 0, text.length());

        return {
            setIndex: setIndex,
            scan: scan,
            fillTokenInfo: fillTokenInfo,
            scanTrivia: scanTrivia,
        };
    }

    export function isValidIdentifier(text: ISimpleText, languageVersion: LanguageVersion): boolean {
        var hadError = false;
        var scanner = createScanner(languageVersion, text, () => hadError = true);

        var token = scanner.scan(/*allowRegularExpression:*/ false);

        return !hadError && SyntaxFacts.isIdentifierNameOrAnyKeyword(token) && width(token) === text.length();
    }
}