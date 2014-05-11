///<reference path='references.ts' />

module TypeScript {
    // Make sure we can encode a token's kind in 7 bits.
    Debug.assert(SyntaxKind.LastToken <= 127);

    //   _packedFullStartAndInfo:
    //
    // 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 000x    <-- has leading trivia
    // 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 00x0    <-- has trailing trivia
    // 0000 0000 0000 0000 0000 0000 0000 0000 0xxx xxxx xxxx xxxx xxxx xxxx xxxx xx00    <-- full start
    // ^                                        ^                                    ^
    // |                                        |                                    |
    // Bit 64                                   Bit 31                               Bit 1
    //
    // This gives us 29 bits for the start of the token.  At 512MB That's more than enough for
    // any codebase.

    //   _packedFullWidthAndKind:
    //
    // 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0xxx xxxx    <-- kind
    // 0000 0000 0000 0000 0000 0000 0000 0000 0xxx xxxx xxxx xxxx xxxx xxxx x000 0000    <-- full width
    // ^                                        ^                                    ^
    // |                                        |                                    |
    // Bit 64                                   Bit 31                               Bit 1
    //
    // This gives us 24bit for trivia (or 16MB of trivia).
    enum ScannerConstants {
        LargeTokenFullStartShift           = 2,
        LargeTokenFullWidthShift           = 7,

        LeadingTriviaBitMask                = 0x01, // 00000001
        TrailingTriviaBitMask               = 0x02, // 00000010
        KindMask                            = 0x7F, // 01111111
    }

    // Make sure our math works for packing/unpacking large fullStarts.
    Debug.assert(largeTokenUnpackFullStart(largeTokenPackFullStartAndInfo(1 << 28, 1, 1)) === (1 << 28));
    Debug.assert(largeTokenUnpackFullStart(largeTokenPackFullStartAndInfo(3 << 27, 0, 1)) === (3 << 27));
    Debug.assert(largeTokenUnpackFullStart(largeTokenPackFullStartAndInfo(10 << 25, 1, 0)) === (10 << 25));

    function largeTokenPackFullStartAndInfo(fullStart: number, hasLeadingTriviaInfo: number, hasTrailingTriviaInfo: number): number {
        return (fullStart << ScannerConstants.LargeTokenFullStartShift) | hasLeadingTriviaInfo | hasTrailingTriviaInfo;
    }

    function largeTokenPackFullWidthAndKind(fullWidth: number, kind: number) {
        return (fullWidth << ScannerConstants.LargeTokenFullWidthShift) | kind;
    }

    function largeTokenUnpackFullWidth(packedFullWidthAndKind: number) {
        return packedFullWidthAndKind >> ScannerConstants.LargeTokenFullWidthShift;
    }

    function largeTokenUnpackKind(packedFullWidthAndKind: number) {
        return packedFullWidthAndKind & ScannerConstants.KindMask;
    }

    function largeTokenUnpackFullStart(packedFullStartAndInfo: number): number {
        return packedFullStartAndInfo >> ScannerConstants.LargeTokenFullStartShift;
    }

    function unpackHasLeadingTriviaInfo(packed: number): number {
        return packed & ScannerConstants.LeadingTriviaBitMask;
    }

    function unpackHasTrailingTriviaInfo(packed: number): number {
        return packed & ScannerConstants.TrailingTriviaBitMask;
    }

    var isKeywordStartCharacter: boolean[] = ArrayUtilities.createArray<boolean>(CharacterCodes.maxAsciiCharacter, false);
    var isIdentifierStartCharacter: boolean[] = ArrayUtilities.createArray<boolean>(CharacterCodes.maxAsciiCharacter, false);
    var isIdentifierPartCharacter: boolean[] = ArrayUtilities.createArray<boolean>(CharacterCodes.maxAsciiCharacter, false);

    for (var character = 0; character < CharacterCodes.maxAsciiCharacter; character++) {
        if ((character >= CharacterCodes.a && character <= CharacterCodes.z) ||
            (character >= CharacterCodes.A && character <= CharacterCodes.Z) ||
            character === CharacterCodes._ || character === CharacterCodes.$) {

            isIdentifierStartCharacter[character] = true;
            isIdentifierPartCharacter[character] = true;
        }
        else if (character >= CharacterCodes._0 && character <= CharacterCodes._9) {
            isIdentifierPartCharacter[character] = true;
        }
    }

    for (var keywordKind = SyntaxKind.FirstKeyword; keywordKind <= SyntaxKind.LastKeyword; keywordKind++) {
        var keyword = SyntaxFacts.getText(keywordKind);
        isKeywordStartCharacter[keyword.charCodeAt(0)] = true;
    }

    export function isContextualToken(token: ISyntaxToken): boolean {
        // These tokens are contextually created based on parsing decisions.  We can't reuse 
        // them in incremental scenarios as we may be in a context where the parser would not
        // create them.
        switch (token.kind()) {
            // Created by the parser when it sees / or /= in a location where it needs an expression.
            case SyntaxKind.RegularExpressionLiteral:

            // Created by the parser when it sees > in a binary expression operator context.
            case SyntaxKind.GreaterThanGreaterThanToken:
            case SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
            case SyntaxKind.GreaterThanEqualsToken:
            case SyntaxKind.GreaterThanGreaterThanEqualsToken:
            case SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
                return true;

            default:
                return token.isKeywordConvertedToIdentifier();
        }
    }

    var lastTokenInfo = { leadingTriviaWidth: -1, width: -1 };
    var lastTokenInfoTokenID: number = -1;

    var triviaScanner = createScannerInternal(LanguageVersion.EcmaScript5, SimpleText.fromString(""), () => { });

    interface IScannerToken extends ISyntaxToken { 
        _text: ISimpleText;
    }

    function fillSizeInfo(token: IScannerToken): void {
        if (lastTokenInfoTokenID !== syntaxID(token)) {
            triviaScanner.fillTokenInfo(token, lastTokenInfo);
            lastTokenInfoTokenID = syntaxID(token);
        }
    }

    function fullText(token: IScannerToken): string {
        return token._text.substr(token.fullStart(), token.fullWidth());
    }

    function text(token: IScannerToken): string {
        fillSizeInfo(token);
        return token._text.substr(token.fullStart() + lastTokenInfo.leadingTriviaWidth, lastTokenInfo.width);
    }

    function leadingTrivia(token: IScannerToken): ISyntaxTriviaList {
        if (!token.hasLeadingTrivia()) {
            return Syntax.emptyTriviaList;
        }

        return triviaScanner.scanTrivia(token, /*isTrailing:*/ false);
    }

    function trailingTrivia(token: IScannerToken): ISyntaxTriviaList {
        if (!token.hasTrailingTrivia()) {
            return Syntax.emptyTriviaList;
        }

        return triviaScanner.scanTrivia(token, /*isTrailing:*/ true);
    }

    function leadingTriviaWidth(token: IScannerToken): number {
        if (!token.hasLeadingTrivia()) {
            return 0;
        }

        fillSizeInfo(token);
        return lastTokenInfo.leadingTriviaWidth;
    }

    function trailingTriviaWidth(token: IScannerToken): number {
        if (!token.hasTrailingTrivia()) {
            return 0;
        }

        fillSizeInfo(token);
        return token.fullWidth() - lastTokenInfo.leadingTriviaWidth - lastTokenInfo.width;
    }

    export class LargeScannerToken implements ISyntaxToken {
        public parent: ISyntaxElement = null;

        public _isPrimaryExpression: any; public _isMemberExpression: any; public _isLeftHandSideExpression: any; public _isPostfixExpression: any; public _isUnaryExpression: any; public _isExpression: any; 

        constructor(public _text: ISimpleText,
                    private _packedFullStartAndInfo: number,
                    private _packedFullWidthAndKind: number) {
        }

        public setTextAndFullStart(text: ISimpleText, fullStart: number): void {
            this._text = text;

            this._packedFullStartAndInfo = largeTokenPackFullStartAndInfo(fullStart,
                unpackHasLeadingTriviaInfo(this._packedFullStartAndInfo),
                unpackHasTrailingTriviaInfo(this._packedFullStartAndInfo));
        }

        public kind(): SyntaxKind {
            return largeTokenUnpackKind(this._packedFullWidthAndKind);
        }

        public isIncrementallyUnusable(): boolean {
            // No scanner tokens make their *containing node* incrementally unusable.  
            // Note: several scanner tokens may themselves be unusable.  i.e. if the parser asks
            // for a full node, then that ndoe can be returned even if it contains parser generated
            // tokens (like regexs and merged operator tokens). However, if the parser asks for a
            // for a token, then those contextual tokens will not be reusable.
            return false;
        }

        public isKeywordConvertedToIdentifier(): boolean {
            return false;
        }

        public fullWidth(): number { return largeTokenUnpackFullWidth(this._packedFullWidthAndKind); }
        public fullStart(): number { return largeTokenUnpackFullStart(this._packedFullStartAndInfo); }

        public fullText(): string {
            return fullText(this);
        }

        public text(): string {
            return text(this);
        }

        public leadingTrivia(): ISyntaxTriviaList {
            return leadingTrivia(this);
        }

        public trailingTrivia(): ISyntaxTriviaList {
            return trailingTrivia(this);
        }

        public leadingTriviaWidth(): number {
            return leadingTriviaWidth(this);
        }

        public trailingTriviaWidth(): number {
            return trailingTriviaWidth(this);
        }

        public hasLeadingTrivia(): boolean {
            return unpackHasLeadingTriviaInfo(this._packedFullStartAndInfo) !== 0;
        }

        public hasTrailingTrivia(): boolean {
            return unpackHasTrailingTriviaInfo(this._packedFullStartAndInfo) !== 0;
        }

        public hasSkippedToken(): boolean { return false; }

        public clone(): ISyntaxToken {
            return new LargeScannerToken(this._text, this._packedFullStartAndInfo, this._packedFullWidthAndKind);
        }
    }

    export interface DiagnosticCallback {
        (position: number, width: number, key: string, arguments: any[]): void;
    }

    interface TokenInfo {
        leadingTriviaWidth: number;
        width: number;
    }

    interface ScannerInternal extends Scanner {
        fillTokenInfo(token: IScannerToken, tokenInfo: TokenInfo): void;
        scanTrivia(token: IScannerToken, isTrailing: boolean): ISyntaxTriviaList;
    }

    export interface Scanner {
        setIndex(index: number): void;
        scan(allowContextualToken: boolean): ISyntaxToken;
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

        function scan(allowContextualToken: boolean): ISyntaxToken {
            var fullStart = index;

            var hasLeadingTrivia = scanTriviaInfo(/*isTrailing: */ false);
            var kind = scanSyntaxKind(allowContextualToken);
            var hasTrailingTrivia = scanTriviaInfo(/*isTrailing: */true);

            // inline the packing logic for perf.
            var packedFullStartAndTriviaInfo = (fullStart << ScannerConstants.LargeTokenFullStartShift) |
                (hasLeadingTrivia ? ScannerConstants.LeadingTriviaBitMask : 0) |
                (hasTrailingTrivia ? ScannerConstants.TrailingTriviaBitMask : 0);
  
            var packedFullWidthAndKind = ((index - fullStart) << ScannerConstants.LargeTokenFullWidthShift) | kind;
            return new LargeScannerToken(text, packedFullStartAndTriviaInfo, packedFullWidthAndKind);
        }

        function scanTrivia(parent: IScannerToken, isTrailing: boolean): ISyntaxTriviaList {
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
                if (index < end) {
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

        function scanTriviaInfo(isTrailing: boolean): boolean {
            // Keep this exactly in sync with scanTrivia
            var result = false;

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
                        result = true;
                        index++;
                        continue;

                    case CharacterCodes.slash:
                        // Potential comment.  Consume if so.  Otherwise, break out and return.
                        var ch2 = str.charCodeAt(index + 1);
                        if (ch2 === CharacterCodes.slash) {
                            result = true;
                            skipSingleLineCommentTrivia();
                            continue;
                        }

                        if (ch2 === CharacterCodes.asterisk) {
                            result = true;
                            skipMultiLineCommentTrivia();
                            continue;
                        }

                        // Not a comment.  Don't consume.
                        break;

                    case CharacterCodes.carriageReturn:
                    case CharacterCodes.lineFeed:
                    case CharacterCodes.paragraphSeparator:
                    case CharacterCodes.lineSeparator:
                        result = true;
                        skipLineTerminatorSequence(ch);

                        // If we're consuming leading trivia, then we will continue consuming more 
                        // trivia (including newlines) up to the first token we see.  If we're 
                        // consuming trailing trivia, then we break after the first newline we see.
                        if (!isTrailing) {
                            continue;
                        }

                        break;
                }

                return result;
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
                if (index >= end) {
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

        function scanSyntaxKind(allowContextualToken: boolean): SyntaxKind {
            if (index >= end) {
                return SyntaxKind.EndOfFileToken;
            }

            var character = str.charCodeAt(index);

            switch (character) {
                case CharacterCodes.doubleQuote:
                case CharacterCodes.singleQuote:
                    return scanStringLiteral();

                // These are the set of variable width punctuation tokens.
                case CharacterCodes.slash:
                    return scanSlashToken(allowContextualToken);

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
                    return scanGreaterThanToken(allowContextualToken);

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

                case CharacterCodes._0: case CharacterCodes._1: case CharacterCodes._2: case CharacterCodes._3:
                case CharacterCodes._4: case CharacterCodes._5: case CharacterCodes._6: case CharacterCodes._7:
                case CharacterCodes._8: case CharacterCodes._9:
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

        function scanGreaterThanToken(allowContextualToken: boolean): SyntaxKind {
            index++;
            if (allowContextualToken) {
                var ch0 = str.charCodeAt(index);
                if (ch0 === CharacterCodes.greaterThan) {
                    // >>
                    index++;
                    var ch1 = str.charCodeAt(index);
                    if (ch1 === CharacterCodes.greaterThan) {
                        // >>>
                        index++;
                        var ch2 = str.charCodeAt(index);
                        if (ch2 === CharacterCodes.equals) {
                            // >>>=
                            index++;
                            return SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken;
                        }
                        else {
                            return SyntaxKind.GreaterThanGreaterThanGreaterThanToken;
                        }
                    }
                    else if (ch1 === CharacterCodes.equals) {
                        // >>=
                        index++;
                        return SyntaxKind.GreaterThanGreaterThanEqualsToken;
                    }
                    else {
                        return SyntaxKind.GreaterThanGreaterThanToken;
                    }
                }
                else if (ch0 === CharacterCodes.equals) {
                    // >=
                    index++;
                    return SyntaxKind.GreaterThanEqualsToken;
                }
            }

            return SyntaxKind.GreaterThanToken;
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

        function scanSlashToken(allowContextualToken: boolean): SyntaxKind {
            // NOTE: By default, we do not try scanning a / as a regexp here.  We instead consider it a
            // div or div-assign.  Later on, if the parser runs into a situation where it would like a 
            // term, and it sees one of these then it may restart us asking specifically if we could 
            // scan out a regex.
            if (allowContextualToken) {
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

        function fillTokenInfo(token: IScannerToken, tokenInfo: TokenInfo): void {
            var fullStart = token.fullStart();
            var fullEnd = fullStart + token.fullWidth();
            reset(token._text, fullStart, fullEnd);

            var leadingTriviaInfo = scanTriviaInfo(/*isTrailing: */ false);

            var start = index;
            scanSyntaxKind(isContextualToken(token));
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

        var token = scanner.scan(/*allowContextualToken:*/ false);

        return !hadError && SyntaxFacts.isIdentifierNameOrAnyKeyword(token) && width(token) === text.length();
    }
}