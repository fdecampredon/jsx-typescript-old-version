///<reference path='references.ts' />

module TypeScript.Parser {
    // Information the parser needs to effectively rewind.
    interface IParserRewindPoint {
        // Information used by normal parser source.
        absolutePosition: number;
        slidingWindowIndex: number;

        // Information used by the incremental parser source.
        oldSourceUnitCursor: SyntaxCursor;
        changeDelta: number;
        changeRange: TextChangeRange;

        // Information used by the parser itself.

        // As we speculatively parse, we may build up diagnostics.  When we rewind we want to 
        // 'forget' that information.In order to do that we store the count of diagnostics and 
        // when we start speculating, and we reset to that count when we're done.  That way the
        // speculative parse does not affect any further results.
        diagnosticsCount: number;

        // For debug purposes only, we also track the following information. They help us assert 
        // that we're not doing anything unexpected.

        // Rewind points should work like a stack.  The first rewind point given out should be the
        // last one released.  By keeping track of the count of points out when this was created, 
        // we can ensure that invariant was preserved.
        pinCount: number;

        // isInStrictMode and listParsingState should not have to be tracked by a rewind point.
        // Because they are naturally mutated and restored based on the normal stack movement of 
        // the parser, they should automatically return to whatever value they had to begin with
        // if the parser decides to rewind or not.  However, to ensure that this is true, we track
        // these variables and check if they have the same value when we're rewinding/releasing.
        isInStrictMode: boolean;
        listParsingState: ListParsingState;
    }

    // The precedence of expressions in typescript.  While we're parsing an expression, we will 
    // continue to consume and form new trees if the precedence is *strictly* greater than our current
    // precedence.  For example, if we have: a + b * c, we will first parse 'a' with precedence 1 (Lowest). 
    // We will then see the + with precedence 10.  10 is greater than 1 so we will decide to create
    // a binary expression with the result of parsing the sub expression "b * c".  We'll then parse
    // the term 'b' (passing in precedence 10).  We will then see the * with precedence 11.  11 is
    // greater than 10, so we will create a binary expression from "b" and "c", return that, and 
    // join it with "a" producing:
    //
    //      +
    //     / \
    //    a   *
    //       / \
    //      b   c
    //
    // If we instead had: "a * b + c", we would first parser 'a' with precedence 1 (lowest).  We would then see 
    // the * with precedence 11.  11 is greater than 1 so we will decide to create a binary expression
    // with the result of parsing the sub expression "b + c".  We'll then parse the term 'b' (passing in
    // precedence 11).  We will then see the + with precedence 10.  10 is less than 11, so we won't 
    // continue parsing subexpressions and will just return the expression 'b'.  The caller will join 
    // that into "a * b" (and will be back at precedence 1). It will then see the + with precedence 10.
    // 10 is greater than 1 so it will parse the sub expression and make a binary expression out of it
    // producing:
    //
    //        +
    //       / \
    //      *   c
    //     / \
    //    a   b
    //
    // Note: because all these binary expressions have left-to-right precedence, if we see a * b * c 
    // then we parse it as:
    //
    //        *
    //       / \
    //      *   c
    //     / \
    //    a   b
    //
    // The code to do this uses the above logic.  It will see an operator with the same precedence,
    // and so it won't consume it.
    enum BinaryExpressionPrecedence {
        Lowest = 1,

        // Intuitively, logical || have the lowest precedence.  "a || b && c" is "a || (b && c)", not
        // "(a || b) && c"
        LogicalOrExpressionPrecedence = 2,
        LogicalAndExpressionPrecedence = 3,
        BitwiseOrExpressionPrecedence = 4,
        BitwiseExclusiveOrExpressionPrecedence = 5,
        BitwiseAndExpressionPrecedence = 6,
        EqualityExpressionPrecedence = 7,
        RelationalExpressionPrecedence = 8,
        ShiftExpressionPrecdence = 9,
        AdditiveExpressionPrecedence = 10,

        // Intuitively, multiplicative expressions have the highest precedence.  After all, if you have:
        //   a + b * c
        //
        // Then you have "a + (b * c)" not "(a + b) * c"
        MultiplicativeExpressionPrecedence = 11,
    }

    // The current state of the parser wrt to list parsing.  The way to read these is as:
    // CurrentProduction_SubList.  i.e. "Block_Statements" means "we're parsing a Block, and we're 
    // currently parsing list of statements within it".  This is used by the list parsing mechanism
    // to parse the elements of the lists, and recover from errors we encounter when we run into 
    // unexpected code.
    // 
    // For example, when we are in ArgumentList_Arguments, we will continue trying to consume code 
    // as long as "isArgument" is true.  If we run into a token for which "isArgument" is not true 
    // we will do the following:
    //
    // If the token is a StopToken for ArgumentList_Arguments (like ")" ) then we will stop parsing
    // the list of arguments with no error.
    //
    // Otherwise, we *do* report an error for this unexpected token, and then enter error recovery 
    // mode to decide how to try to recover from this unexpected token.
    //
    // Error recovery will walk up the list of states we're in seeing if the token is a stop token
    // for that construct *or* could start another element within what construct.  For example, if
    // the unexpected token was '}' then that would be a stop token for Block_Statements. 
    // Alternatively, if the unexpected token was 'return', then that would be a start token for 
    // the next statment in Block_Statements.
    // 
    // If either of those cases are true, We will then return *without* consuming  that token. 
    // (Remember, we've already reported an error).  Now we're just letting the higher up parse 
    // constructs eventually try to consume that token.
    //
    // If none of the higher up states consider this a stop or start token, then we will simply 
    // consume the token and add it to our list of 'skipped tokens'.  We will then repeat the 
    // above algorithm until we resynchronize at some point.
    enum ListParsingState {
        SourceUnit_ModuleElements = 1 << 0,
        ClassDeclaration_ClassElements = 1 << 1,
        ModuleDeclaration_ModuleElements = 1 << 2,
        SwitchStatement_SwitchClauses = 1 << 3,
        SwitchClause_Statements = 1 << 4,
        Block_Statements = 1 << 5,
        TryBlock_Statements = 1 << 6,
        CatchBlock_Statements = 1 << 7,
        EnumDeclaration_EnumElements = 1 << 8,
        ObjectType_TypeMembers = 1 << 9,
        ClassOrInterfaceDeclaration_HeritageClauses = 1 << 10,
        HeritageClause_TypeNameList = 1 << 11,
        VariableDeclaration_VariableDeclarators_AllowIn = 1 << 12,
        VariableDeclaration_VariableDeclarators_DisallowIn = 1 << 13,
        ArgumentList_AssignmentExpressions = 1 << 14,
        ObjectLiteralExpression_PropertyAssignments = 1 << 15,
        ArrayLiteralExpression_AssignmentExpressions = 1 << 16,
        ParameterList_Parameters = 1 << 17,
        TypeArgumentList_Types = 1 << 18,
        TypeParameterList_TypeParameters = 1 << 19,

        FirstListParsingState = SourceUnit_ModuleElements,
        LastListParsingState = TypeParameterList_TypeParameters,
    }

    class SyntaxCursorPiece {
        constructor(public element: ISyntaxElement,
                    public indexInParent: number) {
        }
    }

    // Pool syntax cursors so we don't churn too much memory when we need temporary cursors.  
    // i.e. when we're speculatively parsing, we can cheaply get a pooled cursor and then
    // return it when we no longer need it.
    var syntaxCursorPool: SyntaxCursor[] = [];
    var syntaxCursorPoolCount: number = 0;

    function returnSyntaxCursor(cursor: SyntaxCursor): void {
        // Make sure the cursor isn't holding onto any syntax elements.  We don't want to leak 
        // them when we return the cursor to the pool.
        cursor.clean();

        syntaxCursorPool[syntaxCursorPoolCount] = cursor;
        syntaxCursorPoolCount++;
    }

    function getSyntaxCursor(): SyntaxCursor {
        // Get an existing cursor from the pool if we have one.  Or create a new one if we don't.
        var cursor = syntaxCursorPoolCount > 0
            ? syntaxCursorPool[syntaxCursorPoolCount - 1]
            : new SyntaxCursor();

        if (syntaxCursorPoolCount > 0) {
            // If we reused an existing cursor, take it out of the pool so no one else uses it.
            syntaxCursorPoolCount--;
            syntaxCursorPool[syntaxCursorPoolCount] = null;
        }

        return cursor;
    }

    function cloneSyntaxCursor(cursor: SyntaxCursor): SyntaxCursor {
        var newCursor = getSyntaxCursor();

        // Make the new cursor a *deep* copy of the cursor passed in.  This ensures each cursor can
        // be moved without affecting the other.
        newCursor.deepCopyFrom(cursor);

        return newCursor;
    }

    class SyntaxCursor {
        // Our list of path pieces.  The piece pointed to by 'currentPieceIndex' must be a node or
        // token.  However, pieces earlier than that may point to list nodes.
        //
        // For perf we reuse pieces as much as possible.  i.e. instead of popping items off the 
        // list, we just will change currentPieceIndex so we can reuse that piece later.
        private pieces: SyntaxCursorPiece[] = [];
        private currentPieceIndex: number = -1;

        // Cleans up this cursor so that it doesn't have any references to actual syntax nodes.
        // This sould be done before returning the cursor to the pool so that the Parser module
        // doesn't unnecessarily keep old syntax trees alive.
        public clean(): void {
            for (var i = 0, n = this.pieces.length; i < n; i++) {
                var piece = this.pieces[i];

                if (piece.element === null) {
                    break;
                }

                piece.element = null;
                piece.indexInParent = -1;
            }

            this.currentPieceIndex = -1;
        }

        // Makes this cursor into a deep copy of the cursor passed in.
        public deepCopyFrom(other: SyntaxCursor): void {
            Debug.assert(this.currentPieceIndex === -1);
            for (var i = 0, n = other.pieces.length; i < n; i++) {
                var piece = other.pieces[i];

                if (piece.element === null) {
                    break;
                }

                this.pushElement(piece.element, piece.indexInParent);
            }

            Debug.assert(this.currentPieceIndex === other.currentPieceIndex);
        }

        public isFinished(): boolean {
            return this.currentPieceIndex < 0;
        }

        public currentNodeOrToken(): ISyntaxNodeOrToken {
            if (this.isFinished()) {
                return null;
            }

            var result = this.pieces[this.currentPieceIndex].element;

            // The current element must always be a node or a token.
            // Debug.assert(result !== null);
            // Debug.assert(result.isNode() || result.isToken());

            return <ISyntaxNodeOrToken>result;
        }

        public currentNode(): SyntaxNode {
            var element = this.currentNodeOrToken();
            return isNode(element) ? <SyntaxNode>element : null;
        }

        public moveToFirstChild() {
            var nodeOrToken = this.currentNodeOrToken();
            if (nodeOrToken === null) {
                return;
            }

            if (isToken(nodeOrToken)) {
                // If we're already on a token, there's nothing to do.
                return;
            }

            // The last element must be a token or a node.
            Debug.assert(isNode(nodeOrToken));

            // Either the node has some existent child, then move to it.  if it doesn't, then it's
            // an empty node.  Conceptually the first child of an empty node is really just the 
            // next sibling of the empty node.
            for (var i = 0, n = nodeOrToken.childCount(); i < n; i++) {
                var child = nodeOrToken.childAt(i);
                if (child !== null && !isShared(child)) {
                    // Great, we found a real child.  Push that.
                    this.pushElement(child, /*indexInParent:*/ i);

                    // If it was a list, make sure we're pointing at its first element.  We know we
                    // must have one because this is a non-shared list.
                    this.moveToFirstChildIfList();
                    return;
                }
            }

            // This element must have been an empty node.  Moving to its 'first child' is equivalent to just
            // moving to the next sibling.

            Debug.assert(fullWidth(nodeOrToken) === 0);
            this.moveToNextSibling();
        }

        public moveToNextSibling(): void {
            while (!this.isFinished()) {
                // first look to our parent and see if it has a sibling of us that we can move to.
                var currentPiece = this.pieces[this.currentPieceIndex];
                var parent = currentPiece.element.parent;

                // We start searching at the index one past our own index in the parent.
                for (var i = currentPiece.indexInParent + 1, n = parent.childCount(); i < n; i++) {
                    var sibling = parent.childAt(i);

                    if (sibling !== null && !isShared(sibling)) {
                        // We found a good sibling that we can move to.  Just reuse our existing piece
                        // so we don't have to push/pop.
                        currentPiece.element = sibling;
                        currentPiece.indexInParent = i;

                        // The sibling might have been a list.  Move to it's first child.  it must have
                        // one since this was a non-shared element.
                        this.moveToFirstChildIfList();
                        return;
                    }
                }

                // Didn't have a sibling for this element.  Go up to our parent and get its sibling.

                // Clear the data from the old piece.  We don't want to keep any elements around
                // unintentionally.
                currentPiece.element = null;
                currentPiece.indexInParent = -1;

                // Point at the parent.  if we move past the top of the path, then we're finished.
                this.currentPieceIndex--;
            }
        }

        private moveToFirstChildIfList(): void {
            var element = this.pieces[this.currentPieceIndex].element;

            if (isList(element) || isSeparatedList(element)) {
                // We cannot ever get an empty list in our piece path.  Empty lists are 'shared' and
                // we make sure to filter that out before pushing any children.
                Debug.assert(element.childCount() > 0);

                this.pushElement(element.childAt(0), /*indexInParent:*/ 0);
            }
        }

        public pushElement(element: ISyntaxElement, indexInParent: number): void {
            Debug.assert(element !== null);
            Debug.assert(indexInParent >= 0);
            this.currentPieceIndex++;

            // Reuse an existing piece if we have one.  Otherwise, push a new piece to our list.
            if (this.currentPieceIndex === this.pieces.length) {
                this.pieces.push(new SyntaxCursorPiece(element, indexInParent));
            }
            else {
                var piece = this.pieces[this.currentPieceIndex];
                piece.element = element;
                piece.indexInParent = indexInParent;
            }
        }

        public moveToFirstToken(): void {
            while (!this.isFinished()) {
                var element = this.pieces[this.currentPieceIndex].element;
                if (isNode(element)) {
                    this.moveToFirstChild();
                    continue;
                }

                Debug.assert(isToken(element));
                return;
            }
        }

        public currentToken(): ISyntaxToken {
            this.moveToFirstToken();

            var element = this.currentNodeOrToken();
            // Debug.assert(element === null || element.isToken());
            return element === null ? null : <ISyntaxToken>element;
        }
    }

    // Interface that represents the source that the parser pulls tokens from.  Essentially, this 
    // is the interface that the parser needs an underlying scanner to provide.  This allows us to
    // separate out "what" the parser does with the tokens it retrieves versus "how" it obtains
    // the tokens.  i.e. all the logic for parsing language constructs sits in ParserImpl, while 
    // all the logic for retrieving tokens sits in individual IParserSources.
    //
    // By separating out this interface, we also make incremental parsing much easier.  Instead of
    // having the parser directly sit on top of the scanner, we sit it on this abstraction.  Then
    // in incremental scenarios, we can use the IncrementalParserSource to pull tokens (or even 
    // full nodes) from the previous tree when possible.  Of course, we'll still end up using a 
    // scanner for new text.  But that can all happen inside the source, with none of the logic in
    // the parser having to be aware of it.
    //
    // In general terms, a parser source represents a position within a text.  At that position, 
    // one can ask for the 'currentToken' that the source is pointing at.  Then, once the parser 
    // consumes that token it can ask the source to 'moveToNextToken'.
    //
    // Additional special abilities include:
    //  1) Being able to peek an arbitrary number of tokens ahead efficiently.
    //  2) Being able to retrieve fully parsed nodes from the source, not just tokens. This happens
    //     in incremental scenarios when the source is certain that the node is completley safe to
    //     reuse.
    //  3) Being able to get a 'rewind point' to the current location.  This allows the parser to
    //     speculatively parse as much as it wants, and then reset itself back to that point, 
    //     ensuring that no state changes that occurred after getting the 'rewing point' are 
    //     observable.
    //  4) Being able to reinterpret the current token being pointed at as a regular expression 
    //     token.  This is necessary as the scanner does not have enough information to correctly
    //     distinguish "/" or "/=" as divide tokens, versus "/..../" as a regex token.  If the 
    //     parser sees a "/" in a place where a divide is not allowed, but a regex would be, then
    //     it can call into the source and ask if a regex token could be returned instead.  The 
    //     sources are smart enough to do that and not be affected by any additional work they may
    //     have done when they originally scanned that token.
    interface IParserSource {
        // The text we are parsing.
        text: ISimpleText;

        // The absolute index that the current token starts at.  'currentToken' and 'currentNode'
        // have their fullStart at this position.
        absolutePosition(): number;

        // The current syntax node the source is pointing at.  Only available in incremental settings.
        // The source can point at a node if that node doesn't intersect any of the text changes in
        // the file, and doesn't contain certain unacceptable constructs.  For example, if the node
        // contains skipped text, then it will not be reused.
        currentNode(): SyntaxNode;

        // The current token the source is pointing at.
        currentToken(): ISyntaxToken;

        // The current token reinterpretted as a regex token.  This must only be called when the 
        // source is pointing at a "/" or "/=" token. 
        currentTokenAllowingRegularExpression(): ISyntaxToken;

        // Peek any number of tokens ahead from the current location in source.  peekToken(0) is
        // equivalent to 'currentToken', peekToken(1) is the next token, peekToken(2) the token
        // after that, etc.  If the caller peeks past the end of the text, then EndOfFile tokens
        // will be returned.
        peekToken(n: number): ISyntaxToken;

        // Called to move the source to the next node or token once the parser has consumed the 
        // current one.
        moveToNextNode(): void;
        moveToNextToken(): void;

        // Gets a rewind point that the parser can use to move back to after it speculatively 
        // parses something.  The source guarantees that if the parser calls 'rewind' with that 
        // point that it will be mostly in the same state that it was in when 'getRewindPoint'
        // was called.  i.e. calling currentToken, peekToken, tokenDiagnostics, etc. will result
        // in the same values.  One allowed exemption to this is 'currentNode'.  If a rewind point
        // is requested and rewound, then getting the currentNode may not be possible.  However,
        // as this is purely a performance optimization, it will not affect correctness.
        //
        // Note: that rewind points are not free (but they should also not be too expensive).  So
        // they should be used judiciously.  While a rewind point is held by the parser, the source
        // is not free to do things that it would normally do.  For example, it cannot throw away
        // tokens that it has scanned on or after the rewind point as it must keep them alive for
        // the parser to move back to.
        //
        // Rewind points also work in a stack fashion.  The first rewind point given out must be
        // the last rewind point released.  Do not release them out of order, or bad things can 
        // happen.
        //
        // Do *NOT* forget to release a rewind point.  Always put them in a finally block to ensure
        // that they are released.  If they are not released, things will still work, you will just
        // consume far more memory than necessary.
        getRewindPoint(): IParserRewindPoint;

        // Rewinds the source to the position and state it was at when this rewind point was created.
        // This does not need to be called if the parser decides it does not need to rewind.  For 
        // example, the parser may speculatively parse out a lambda expression when it sees something
        // ambiguous like "(a = b, c = ...".  If it succeeds parsing that as a lambda, then it will
        // just return that result.  However, if it fails *then* it will rewind and try it again as
        // a parenthesized expression.  
        rewind(rewindPoint: IParserRewindPoint): void;

        // Called when the parser is done speculative parsing and no longer needs the rewind point.
        // Must be called for every rewind point retrived.
        releaseRewindPoint(rewindPoint: IParserRewindPoint): void;

        // Retrieves the diagnostics generated while the source was producing nodes or tokens. 
        // Should generally only be called after the document has been completely parsed.
        tokenDiagnostics(): Diagnostic[];
    }

    // Parser source used in batch scenarios.  Directly calls into an underlying text scanner and
    // supports none of the functionality to reuse nodes.  Good for when you just want want to do
    // a single parse of a file.
    class NormalParserSource implements IParserSource {
        // The sliding window that we store tokens in.
        private slidingWindow: SlidingWindow;

        // The scanner we're pulling tokens from.
        private scanner: Scanner;

        // The absolute position we're at in the text we're reading from.
        private _absolutePosition: number = 0;

        // The diagnostics we get while scanning.  Note: this never gets rewound when we do a normal
        // rewind.  That's because rewinding doesn't affect the tokens created.  It only affects where
        // in the token stream we're pointing at.  However, it will get modified if we we decide to
        // reparse a / or /= as a regular expression.
        private _tokenDiagnostics: Diagnostic[] = [];

        // Pool of rewind points we give out if the parser needs one.
        private rewindPointPool: IParserRewindPoint[] = [];
        private rewindPointPoolCount = 0;

        private lastDiagnostic: Diagnostic = null;
        private reportDiagnostic = (position: number, fullWidth: number, diagnosticKey: string, args: any[]) => {
            this.lastDiagnostic = new Diagnostic(this.fileName, this.text.lineMap(), position, fullWidth, diagnosticKey, args);
        }

        constructor(private fileName: string,
                    languageVersion: LanguageVersion,
                    public text: ISimpleText) {
            this.slidingWindow = new SlidingWindow(this, ArrayUtilities.createArray(/*defaultWindowSize:*/ 32, null), null);
            this.scanner = createScanner(languageVersion, text, this.reportDiagnostic);
        }

        public currentNode(): SyntaxNode {
            // The normal parser source never returns nodes.  They're only returned by the 
            // incremental parser source.
            return null;
        }

        public moveToNextNode(): void {
            // Should never get called.
            throw Errors.invalidOperation();
        }

        public absolutePosition() {
            return this._absolutePosition;
        }

        public tokenDiagnostics(): Diagnostic[] {
            return this._tokenDiagnostics;
        }

        private getOrCreateRewindPoint(): IParserRewindPoint {
            if (this.rewindPointPoolCount === 0) {
                return <IParserRewindPoint>{};
            }

            this.rewindPointPoolCount--;
            var result = this.rewindPointPool[this.rewindPointPoolCount];
            this.rewindPointPool[this.rewindPointPoolCount] = null;
            return result;
        }

        public getRewindPoint(): IParserRewindPoint {
            var slidingWindowIndex = this.slidingWindow.getAndPinAbsoluteIndex();

            var rewindPoint = this.getOrCreateRewindPoint();

            rewindPoint.slidingWindowIndex = slidingWindowIndex;
            rewindPoint.absolutePosition = this._absolutePosition;

            rewindPoint.pinCount = this.slidingWindow.pinCount();

            return rewindPoint;
        }

        public isPinned(): boolean {
            return this.slidingWindow.pinCount() > 0;
        }

        public rewind(rewindPoint: IParserRewindPoint): void {
            this.slidingWindow.rewindToPinnedIndex(rewindPoint.slidingWindowIndex);

            this._absolutePosition = rewindPoint.absolutePosition;
        }

        public releaseRewindPoint(rewindPoint: IParserRewindPoint): void {
            // Debug.assert(this.slidingWindow.pinCount() === rewindPoint.pinCount);
            this.slidingWindow.releaseAndUnpinAbsoluteIndex((<any>rewindPoint).absoluteIndex);

            this.rewindPointPool[this.rewindPointPoolCount] = rewindPoint;
            this.rewindPointPoolCount++;
        }

        public fetchNextItem(allowRegularExpression: boolean): ISyntaxToken {
            // Assert disabled because it is actually expensive enugh to affect perf.
            // Debug.assert(spaceAvailable > 0);
            var token = this.scanner.scan(allowRegularExpression);

            var lastDiagnostic = this.lastDiagnostic;
            if (lastDiagnostic === null) {
                return token;
            }

            // If we produced any diagnostics while creating this token, then realize the token so 
            // it won't be reused in incremental scenarios.

            this._tokenDiagnostics.push(lastDiagnostic);
            this.lastDiagnostic = null;
            return Syntax.realizeToken(token);
        }

        public peekToken(n: number): ISyntaxToken {
            return this.slidingWindow.peekItemN(n);
        }

        public moveToNextToken(): void {
            var currentToken = this.currentToken();
            this._absolutePosition += currentToken.fullWidth();

            this.slidingWindow.moveToNextItem();
        }

        public currentToken(): ISyntaxToken {
            return this.slidingWindow.currentItem(/*allowRegularExpression:*/ false);
        }

        private removeDiagnosticsOnOrAfterPosition(position: number): void {
            // walk backwards, removing any diagnostics that came after the the current token's
            // full start position.
            var tokenDiagnosticsLength = this._tokenDiagnostics.length;
            while (tokenDiagnosticsLength > 0) {
                var diagnostic = this._tokenDiagnostics[tokenDiagnosticsLength - 1];
                if (diagnostic.start() >= position) {
                    tokenDiagnosticsLength--;
                }
                else {
                    break;
                }
            }

            this._tokenDiagnostics.length = tokenDiagnosticsLength;
        }

        public resetToPosition(absolutePosition: number): void {
            this._absolutePosition = absolutePosition;

            // First, remove any diagnostics that came after this position.
            this.removeDiagnosticsOnOrAfterPosition(absolutePosition);

            // Now, tell our sliding window to throw away all tokens after this position as well.
            this.slidingWindow.disgardAllItemsFromCurrentIndexOnwards();

            // Now tell the scanner to reset its position to this position as well.  That way
            // when we try to scan the next item, we'll be at the right location.
            this.scanner.setIndex(absolutePosition);
        }

        public currentTokenAllowingRegularExpression(): ISyntaxToken {
            // We better be on a divide token right now.
            // Debug.assert(SyntaxFacts.isAnyDivideToken(this.currentToken().kind()));

            // First, we're going to rewind all our data to the point where this / or /= token started.
            // That's because if it does turn out to be a regular expression, then any tokens or token 
            // diagnostics we produced after the original / may no longer be valid.  This would actually
            // be a  fairly expected case.  For example, if you had:  / ... gibberish ... /, we may have 
            // produced several diagnostics in the process of scanning the tokens after the first / as
            // they may not have been legal javascript okens.
            //
            // We also need to remove all the tokens we've gotten from the slash and onwards.  They may
            // not have been what the scanner would have produced if it decides that this is actually
            // a regular expresion.
            this.resetToPosition(this._absolutePosition);

            // Now actually fetch the token again from the scanner. This time let it know that it
            // can scan it as a regex token if it wants to.
            var token = this.slidingWindow.currentItem(/*allowRegularExpression:*/ true);

            // We have better gotten some sort of regex token.  Otherwise, something *very* wrong has
            // occurred.
            // Debug.assert(SyntaxFacts.isAnyDivideOrRegularExpressionToken(token.kind()));

            return token;
        }
    }

    // Parser source used in incremental scenarios. This parser source wraps an old tree, text 
    // change and new text, and uses all three to provide nodes and tokens to the parser.  In
    // general, nodes from the old tree are returned as long as they do not intersect with the text 
    // change.  Then, once the text change is reached, tokens from the old tree are returned as 
    // long as they do not intersect with the text change.  Then, the text that is actually changed
    // will be scanned using a normal scanner.  Then, once the new text is scanned, the source will
    // attempt to sync back up with nodes or tokens that started where the new tokens end. Once it
    // can do that, then all subsequent data will come from the original tree.
    //
    // This allows for an enormous amount of tree reuse in common scenarios.  Situations that 
    // prevent this level of reuse include substantially destructive operations like introducing
    // "/*" without a "*/" nearby to terminate the comment.
    class IncrementalParserSource implements IParserSource {
        // The underlying parser source that we will use to scan tokens from any new text, or any 
        // tokens from the old tree that we decide we can't use for any reason.  We will also 
        // continue scanning tokens from this source until we've decided that we're resynchronized
        // and can read in subsequent data from the old tree.
        //
        // This parser source also keeps track of the absolute position in the text that we're in,
        // and any token diagnostics produced.  That way we dont' have to track that ourselves.
        private _normalParserSource: NormalParserSource;

        // The range of text in the *original* text that was changed, and the new length of it after
        // the change.
        private _changeRange: TextChangeRange;

        // Cached value of _changeRange.newSpan().  Cached for performance.
        private _changeRangeNewSpan: TextSpan;

        // This number represents how our position in the old tree relates to the position we're 
        // pointing at in the new text.  If it is 0 then our positions are in sync and we can read
        // nodes or tokens from the old tree.  If it is non-zero, then our positions are not in 
        // sync and we cannot use nodes or tokens from the old tree.
        //
        // Now, changeDelta could be negative or positive.  Negative means 'the position we're at
        // in the original tree is behind the position we're at in the text'.  In this case we 
        // keep throwing out old nodes or tokens (and thus move forward in the original tree) until
        // changeDelta becomes 0 again or positive.  If it becomes 0 then we are resynched and can
        // read nodes or tokesn from the tree.
        //
        // If changeDelta is positive, that means the current node or token we're pointing at in 
        // the old tree is at a further ahead position than the position we're pointing at in the
        // new text.  In this case we have no choice but to scan tokens from teh new text.  We will
        // continue to do so until, again, changeDelta becomes 0 and we've resynced, or change delta
        // becomes negative and we need to skip nodes or tokes in the original tree.
        private _changeDelta: number = 0;

        // The cursor we use to navigate through and retrieve nodes and tokens from the old tree.
        private _oldSourceUnitCursor: SyntaxCursor;

        constructor(oldSyntaxTree: SyntaxTree, textChangeRange: TextChangeRange, public text: ISimpleText) {
            var newText = text;

            var oldSourceUnit = oldSyntaxTree.sourceUnit();
            this._oldSourceUnitCursor = getSyntaxCursor();

            // Start the cursor pointing at the first element in the source unit (if it exists).
            if (oldSourceUnit.moduleElements.length > 0) {
                this._oldSourceUnitCursor.pushElement(oldSourceUnit.moduleElements.childAt(0), /*indexInParent:*/ 0);
            }

            // In general supporting multiple individual edits is just not that important.  So we 
            // just collapse this all down to a single range to make the code here easier.  The only
            // time this could be problematic would be if the user made a ton of discontinuous edits.
            // For example, doing a column select on a *large* section of a code.  If this is a 
            // problem, we can always update this code to handle multiple changes.
            this._changeRange = IncrementalParserSource.extendToAffectedRange(textChangeRange, oldSourceUnit);
            this._changeRangeNewSpan = this._changeRange.newSpan();

            // The old tree's length, plus whatever length change was caused by the edit
            // Had better equal the new text's length!
            if (Debug.shouldAssert(AssertionLevel.Aggressive)) {
                Debug.assert((fullWidth(oldSourceUnit) - this._changeRange.span().length() + this._changeRange.newLength()) === newText.length());
            }

            // Set up a scanner so that we can scan tokens out of the new text.
            this._normalParserSource = new NormalParserSource(oldSyntaxTree.fileName(), oldSyntaxTree.parseOptions().languageVersion(), text);
        }

        private static extendToAffectedRange(changeRange:TextChangeRange,
                                             sourceUnit: SourceUnitSyntax): TextChangeRange {
            // Consider the following code:
            //      void foo() { /; }
            //
            // If the text changes with an insertion of / just before the semicolon then we end up with:
            //      void foo() { //; }
            //
            // If we were to just use the changeRange a is, then we would not rescan the { token 
            // (as it does not intersect the actual original change range).  Because an edit may
            // change the token touching it, we actually need to look back *at least* one token so
            // that the prior token sees that change.  
            //
            // Note: i believe (outside of regex tokens) max lookahead is just one token for 
            // TypeScript.  However, if this turns out to be wrong, we may have to increase how much
            // futher we look back. 
            //
            // Note: lookahead handling for regex characters is handled specially in during 
            // incremental parsing, and does not need to be handled here.

            var maxLookahead = 1;

            var start = changeRange.span().start();

            // the first iteration aligns us with the change start. subsequent iteration move us to
            // the left by maxLookahead tokens.  We only need to do this as long as we're not at the
            // start of the tree.
            for (var i = 0; start > 0 && i <= maxLookahead; i++) {
                var token = Syntax.findToken(sourceUnit, start);

                // Debug.assert(token.kind() !== SyntaxKind.None);
                // Debug.assert(token.kind() === SyntaxKind.EndOfFileToken || token.fullWidth() > 0);

                var position = token.fullStart();

                start = MathPrototype.max(0, position - 1);
            }

            var finalSpan = TextSpan.fromBounds(start, changeRange.span().end());
            var finalLength = changeRange.newLength() + (changeRange.span().start() - start);

            return new TextChangeRange(finalSpan, finalLength);
        }

        public absolutePosition() {
            return this._normalParserSource.absolutePosition();
        }

        public tokenDiagnostics(): Diagnostic[] {
            return this._normalParserSource.tokenDiagnostics();
        }

        public getRewindPoint(): IParserRewindPoint {
            // Get a rewind point for our new text reader and for our old source unit cursor.
            var rewindPoint = this._normalParserSource.getRewindPoint();

            // Clone our cursor.  That way we can restore to that point if hte parser needs to rewind.
            var oldSourceUnitCursorClone = cloneSyntaxCursor(this._oldSourceUnitCursor);

            // Store where we were when the rewind point was created.
            rewindPoint.changeDelta = this._changeDelta;
            rewindPoint.changeRange = this._changeRange;
            rewindPoint.oldSourceUnitCursor = this._oldSourceUnitCursor;

            this._oldSourceUnitCursor = oldSourceUnitCursorClone;

            // Debug.assert(rewindPoint.pinCount === this._oldSourceUnitCursor.pinCount());

            return rewindPoint;
        }

        public rewind(rewindPoint: IParserRewindPoint): void {
            // Restore our state to the values when the rewind point was created.
            this._changeRange = rewindPoint.changeRange;
            this._changeDelta = rewindPoint.changeDelta;

            // Reset the cursor to what it was when we got the rewind point.  Make sure to return 
            // our existing cursor to the pool so it can be reused.
            returnSyntaxCursor(this._oldSourceUnitCursor);
            this._oldSourceUnitCursor = rewindPoint.oldSourceUnitCursor;

            // Null out the cursor that the rewind point points to.  This way we don't try
            // to return it in 'releaseRewindPoint'.
            rewindPoint.oldSourceUnitCursor = null;

            this._normalParserSource.rewind(rewindPoint);
        }

        public releaseRewindPoint(rewindPoint: IParserRewindPoint): void {
            if (rewindPoint.oldSourceUnitCursor !== null) {
                returnSyntaxCursor(rewindPoint.oldSourceUnitCursor);
            }

            this._normalParserSource.releaseRewindPoint(rewindPoint);
        }

        private canReadFromOldSourceUnit() {
            // If we're currently pinned, then do not want to touch the cursor.  If we end up 
            // reading from the old source unit, we'll try to then set the position of the normal
            // parser source to an absolute position (in moveToNextToken).  Doing is unsupported
            // while the underlying source is pinned.
            if (this._normalParserSource.isPinned()) {
                return false;
            }

            // If our current absolute position is in the middle of the changed range in the new text
            // then we definitely can't read from the old source unit right now.
            if (this._changeRange !== null && this._changeRangeNewSpan.intersectsWithPosition(this.absolutePosition())) {
                return false;
            }

            // First, try to sync up with the new text if we're behind.
            this.syncCursorToNewTextIfBehind();

            // Now, if we're synced up *and* we're not currently pinned in the new text scanner,
            // then we can read a node from the cursor.  If we're pinned in the scanner then we
            // can't read a node from the cursor because we will mess up the pinned scanner when
            // we try to move it forward past this node.
            return this._changeDelta === 0 &&
                   !this._oldSourceUnitCursor.isFinished();
        }

        private updateTokens(nodeOrToken: ISyntaxNodeOrToken): void {
            // If we got a node or token, and we're past the range of edited text, then walk its
            // constituent tokens, making sure all their positions are correct.  We don't need to
            // do this for the tokens before the edited range (since their positions couldn't have 
            // been affected by the edit), and we don't need to do this for the tokens in the 
            // edited range, as their positions will be correct when the underlying parser source 
            // creates them.

            var position = this.absolutePosition();
            var tokenWasMoved = this.isPastChangeRange() && fullStart(nodeOrToken) !== position;

            if (tokenWasMoved) {
                setTokenTextAndFullStartWalker.text = this.text;
                setTokenTextAndFullStartWalker.position = position;

                visitNodeOrToken(setTokenTextAndFullStartWalker, nodeOrToken);
            }
        }

        public currentNode(): SyntaxNode {
            if (this.canReadFromOldSourceUnit()) {
                // Try to read a node.  If we can't then our caller will call back in and just try
                // to get a token.
                var node = this.tryGetNodeFromOldSourceUnit();
                if (node !== null) {
                    // Make sure the positions for the tokens in this node are correct.
                    this.updateTokens(node);
                    return node;
                }
            }

            // Either we were ahead of the old text, or we were pinned.  No node can be read here.
            return null;
        }

        public currentToken(): ISyntaxToken {
            if (this.canReadFromOldSourceUnit()) {
                var token = this.tryGetTokenFromOldSourceUnit();
                if (token !== null) {
                    // Make sure the token's position/text is correct.
                    this.updateTokens(token);
                    return token;
                }
            }

            // Either we couldn't read from the old source unit, or we weren't able to successfully
            // get a token from it.  In this case we need to read a token from the underlying text.
            return this._normalParserSource.currentToken();
        }

        public currentTokenAllowingRegularExpression(): ISyntaxToken {
            // Just delegate to the underlying source to handle this.
            return this._normalParserSource.currentTokenAllowingRegularExpression();
        }

        private syncCursorToNewTextIfBehind() {
            while (true) {
                if (this._oldSourceUnitCursor.isFinished()) {
                    // Can't sync up if the cursor is finished.
                    break;
                }

                if (this._changeDelta >= 0) {
                    // Nothing to do if we're synced up or ahead of the text.
                    break;
                }

                // We're behind in the original tree.  Throw out a node or token in an attempt to 
                // catch up to the position we're at in the new text.

                var currentNodeOrToken = this._oldSourceUnitCursor.currentNodeOrToken();

                // If we're pointing at a node, and that node's width is less than our delta,
                // then we can just skip that node.  Otherwise, if we're pointing at a node
                // whose width is greater than the delta, then crumble it and try again.
                // Otherwise, we must be pointing at a token.  Just skip it and try again.
                    
                if (isNode(currentNodeOrToken) && (fullWidth(currentNodeOrToken) > Math.abs(this._changeDelta))) {
                    // We were pointing at a node whose width was more than changeDelta.  Crumble the 
                    // node and try again.  Note: we haven't changed changeDelta.  So the callers loop
                    // will just repeat this until we get to a node or token that we can skip over.
                    this._oldSourceUnitCursor.moveToFirstChild();
                }
                else {
                    this._oldSourceUnitCursor.moveToNextSibling();

                    // Get our change delta closer to 0 as we skip past this item.
                    this._changeDelta += fullWidth(currentNodeOrToken);

                    // If this was a node, then our changeDelta is 0 or negative.  If this was a 
                    // token, then we could still be negative (and we have to read another token),
                    // we could be zero (we're done), or we could be positive (we've moved ahead
                    // of the new text).  Only if we're negative will we continue looping.
                }
            }

            // At this point, we must be either:
            //   a) done with the cursor
            //   b) (ideally) caught up to the new text position.
            //   c) ahead of the new text position.
            // In case 'b' we can try to reuse a node from teh old tree.
            // Debug.assert(this._oldSourceUnitCursor.isFinished() || this._changeDelta >= 0);
        }

        private intersectsWithChangeRangeSpanInOriginalText(start: number, length: number) {
            return !this.isPastChangeRange() && this._changeRange.span().intersectsWith(start, length);
        }

        private tryGetNodeFromOldSourceUnit(): SyntaxNode {
            // Debug.assert(this.canReadFromOldSourceUnit());

            // Keep moving the cursor down to the first node that is safe to return.  A node is 
            // safe to return if:
            //  a) it does not intersect the changed text.
            //  b) it does not contain skipped text.
            //  c) it does not have any zero width tokens in it.
            //  d) it does not have a regex token in it.
            //  e) we are still in the same strict or non-strict state that the node was originally parsed in.
            while (true) {
                var node = this._oldSourceUnitCursor.currentNode();
                if (node === null) {
                    // Couldn't even read a node, nothing to return.
                    return null;
                }

                if (!this.intersectsWithChangeRangeSpanInOriginalText(this.absolutePosition(), fullWidth(node))) {
                    // Didn't intersect with the change range.
                    var isIncrementallyUnusuable = TypeScript.isIncrementallyUnusable(node);
                    if (!isIncrementallyUnusuable) {

                        // Didn't contain anything that would make it unusable.  Awesome.  This is
                        // a node we can reuse.
                        return node;
                    }
                }

                // We couldn't use currentNode. Try to move to its first child (in case that's a 
                // node).  If it is we can try using that.  Otherwise we'll just bail out in the
                // next iteration of the loop.
                this._oldSourceUnitCursor.moveToFirstChild();
            }
        }

        private canReuseTokenFromOldSourceUnit(position: number, token: ISyntaxToken): boolean {
            // A token is safe to return if:
            //  a) it does not intersect the changed text.
            //  b) it does not contain skipped text.
            //  c) it is not zero width.
            //  d) it is not a regex token.
            //  e) it is not a parser generated token.
            //
            // NOTE: It is safe to get a token regardless of what our strict context was/is.  That's 
            // because the strict context doesn't change what tokens are scanned, only how the 
            // parser reacts to them.
            //
            // NOTE: we don't mark a keyword that was converted to an identifier as 'incrementally 
            // unusable.  This is because we don't want to mark it's containing parent node as 
            // unusable.  i.e. if i have this:  "public Foo(string: Type) { }", then that *entire* node 
            // is reusuable even though "string" was converted to an identifier.  However, we still
            // need to make sure that if that the parser asks for a *token* we don't return it.  
            // Converted identifiers can't ever be created by the scanner, and as such, should not 
            // be returned by this source.
            if (token !== null) {
                if (!this.intersectsWithChangeRangeSpanInOriginalText(position, token.fullWidth())) {
                    // Didn't intersect with the change range.
                    if (!token.isIncrementallyUnusable() && !token.isKeywordConvertedToIdentifier()) {

                        // Didn't contain anything that would make it unusable.  Awesome.  This is
                        // a token we can reuse.
                        return true;
                    }
                }
            }

            return false;
        }

        private tryGetTokenFromOldSourceUnit(): ISyntaxToken {
            // Debug.assert(this.canReadFromOldSourceUnit());

            // get the current token that the cursor is pointing at.
            var token = this._oldSourceUnitCursor.currentToken();

            return this.canReuseTokenFromOldSourceUnit(this.absolutePosition(), token) 
                ? token : null;
        }

        public peekToken(n: number): ISyntaxToken {
            if (this.canReadFromOldSourceUnit()) {
                var token = this.tryPeekTokenFromOldSourceUnit(n);
                if (token !== null) {
                    return token;
                }
            }

            // Couldn't peek this far in the old tree.  Get the token from the new text.
            return this._normalParserSource.peekToken(n);
        }

        private tryPeekTokenFromOldSourceUnit(n: number): ISyntaxToken {
            // Debug.assert(this.canReadFromOldSourceUnit());
            
            // clone the existing cursor so we can move it forward and then restore ourselves back
            // to where we started from.

            var cursorClone = cloneSyntaxCursor(this._oldSourceUnitCursor);

            var token = this.tryPeekTokenFromOldSourceUnitWorker(n);

            returnSyntaxCursor(this._oldSourceUnitCursor);
            this._oldSourceUnitCursor = cursorClone;

            return token;
        }

        private tryPeekTokenFromOldSourceUnitWorker(n: number): ISyntaxToken {
            // In order to peek the 'nth' token we need all the tokens up to that point.  That way
            // we know we know position that the nth token is at.  The position is necessary so 
            // that we can test if this token (or any that precede it cross the change range).
            var currentPosition = this.absolutePosition();

            // First, make sure the cursor is pointing at a token.
            this._oldSourceUnitCursor.moveToFirstToken();

            // Now, keep walking forward to successive tokens.
            for (var i = 0; i < n; i++) {
                var interimToken = this._oldSourceUnitCursor.currentToken();

                if (!this.canReuseTokenFromOldSourceUnit(currentPosition, interimToken)) {
                    return null;
                }

                currentPosition += interimToken.fullWidth();
                this._oldSourceUnitCursor.moveToNextSibling();
            }

            var token = this._oldSourceUnitCursor.currentToken();
            return this.canReuseTokenFromOldSourceUnit(currentPosition, token) 
                ? token : null;
        }

        public moveToNextNode(): void {
            // A node could have only come from the old source unit cursor.  Update it and our 
            // current state.
            // Debug.assert(this._changeDelta === 0);

            // Get the current node we were pointing at, and move to the next element.
            var currentElement = this._oldSourceUnitCursor.currentNodeOrToken();
            var currentNode = this._oldSourceUnitCursor.currentNode();

            // We better still be pointing at the node.
            Debug.assert(currentElement === currentNode);
            this._oldSourceUnitCursor.moveToNextSibling();

            // Update the underlying source with where it should now be currently pointing, and 
            // what the previous token is before that position.
            var absolutePosition = this.absolutePosition() + fullWidth(currentNode);
            this._normalParserSource.resetToPosition(absolutePosition);

            // Debug.assert(previousToken !== null);
            // Debug.assert(previousToken.width() > 0);

            if (!this.isPastChangeRange()) {
                // If we still have a change range, then this node must have ended before the 
                // change range starts.  Thus, we don't need to call 'skipPastChanges'.
                // Debug.assert(this.absolutePosition() < this._changeRange.span().start());
            }
        }

        public moveToNextToken(): void {
            // This token may have come from the old source unit, or from the new text.  Handle
            // both accordingly.
            var currentToken = this.currentToken();

            if (this._oldSourceUnitCursor.currentToken() === currentToken) {
                // The token came from the old source unit.  So our tree and text must be in sync.
                // Debug.assert(this._changeDelta === 0);

                // Move the cursor past this token.
                this._oldSourceUnitCursor.moveToNextSibling();

                // Debug.assert(!this._normalParserSource.isPinned());
                
                // Update the underlying source with where it should now be currently pointing, and 
                // what the previous token is before that position.  We don't need to do this when
                // the token came from the new text as the source will automatically be placed in
                // the right position.
                var absolutePosition = this.absolutePosition() + currentToken.fullWidth();
                this._normalParserSource.resetToPosition(absolutePosition);

                // Debug.assert(previousToken !== null);
                // Debug.assert(previousToken.width() > 0);

                // if (!this.isPastChangeRange()) {
                //     // If we still have a change range, then this token must have ended before the 
                //     // change range starts.  Thus, we don't need to call 'skipPastChanges'.
                //     // Debug.assert(this.absolutePosition() < this._changeRange.span().start());
                // }
            }
            else {
                // the token came from the new text.  We have to update our delta appropriately.
                this._changeDelta -= currentToken.fullWidth();

                // Move our underlying source forward.
                this._normalParserSource.moveToNextToken();

                // Because we read a token from the new text, we may have moved ourselves past the
                // change range.  If we did, then we may also have to update our change delta to
                // compensate for the length change between the old and new text.
                if (!this.isPastChangeRange()) {
                    // var changeEndInNewText = this._changeRange.span().start() + this._changeRange.newLength();
                    if (this.absolutePosition() >= this._changeRangeNewSpan.end()) {
                        this._changeDelta += this._changeRange.newLength() - this._changeRange.span().length();

                        // Once we're past the change range, we no longer need it.  Null it out.
                        // From now on we can check if we're past the change range just by seeing
                        // if this is null.
                        this._changeRange = null;
                    }
                }
            }
        }

        private isPastChangeRange(): boolean {
            return this._changeRange === null;
        }
    }

    // A simple walker we use to hit all the tokens of a node and update their positions when they
    // are reused in a different location because of an incremental parse.

    class SetTokenTextAndFullStartWalker extends SyntaxWalker {
        public position: number;
        public text: ISimpleText;

        public visitToken(token: ISyntaxToken): void {
            var position = this.position;
            token.setTextAndFullStart(this.text, position);

            this.position = position + token.fullWidth();
        }
    }

    var setTokenTextAndFullStartWalker = new SetTokenTextAndFullStartWalker();

    var arrayPool: any[][] = [];
    var arrayPoolCount: number = 0;

    function getArray(): any[] {
        if (arrayPoolCount === 0) {
            return [];
        }

        arrayPoolCount--;
        var result = arrayPool[arrayPoolCount];
        arrayPool[arrayPoolCount] = null;

        return result;
    }

    function returnZeroLengthArray(array: any[]) {
        if (array.length === 0) {
            returnArray(array);
        }
    }

    function returnArray(array: any[]) {
        array.length = 0;
        arrayPool[arrayPoolCount] = array;
        arrayPoolCount++;
    }

    // Contains the actual logic to parse typescript/javascript.  This is the code that generally
    // represents the logic necessary to handle all the language grammar constructs.  When the 
    // language changes, this should generally only be the place necessary to fix up.
    class ParserImpl {
        // Underlying source where we pull nodes and tokens from.
        private source: IParserSource;
        private fileName: string;

        private parseOptions: ParseOptions;

        // TODO: do we need to store/restore this when speculative parsing?  I don't think so.  The
        // parsing logic already handles storing/restoring this and should work properly even if we're
        // speculative parsing.
        private listParsingState: ListParsingState = 0;

        // Whether or not we are in strict parsing mode.  All that changes in strict parsing mode is
        // that some tokens that would be considered identifiers may be considered keywords.  When 
        // rewinding, we need to store and restore this as the mode may have changed.
        //
        // TODO: do we need to store/restore this when speculative parsing?  I don't think so.  The
        // parsing logic already handles storing/restoring this and should work properly even if we're
        // speculative parsing.
        private isInStrictMode: boolean = false;

        // Current state of the parser.  If we need to rewind we will store and reset these values as
        // appropriate.

        // Diagnostics created when parsing invalid code.  Any diagnosics created when speculative 
        // parsing need to removed when rewinding.  To do this we store the count of diagnostics when 
        // we start speculative parsing.  And if we rewind, we restore this to the same count that we 
        // started at.
        private diagnostics: Diagnostic[] = [];

        private parseNodeData: number = 0;

        // It can be expensive to compute these values, and we find ourselves accessing them quite
        // a lot (esp due to the nature of our "isXXX / parseXXX" pattern).  So cache these values
        // to save time.
        //
        // Note: any time we access our 'source' object, we need to thoughtfully consider if we need
        // to clear these values.  Fortunately, all those accesses are contined in just a few methods
        // at the start of this class.
        private _currentToken: ISyntaxToken = null;
        private _currentNode: SyntaxNode = null;

        constructor(fileName: string, source: IParserSource, parseOptions: ParseOptions) {
            this.fileName = fileName;
            this.source = source;
            this.parseOptions = parseOptions;
        }

        private clearCachedData(): void {
            this._currentNode = null;
            this._currentToken = null;
        }

        private getRewindPoint(): IParserRewindPoint {
            this.clearCachedData();

            var rewindPoint = this.source.getRewindPoint();

            rewindPoint.diagnosticsCount = this.diagnostics.length;

            // Values we keep around for debug asserting purposes.
            rewindPoint.isInStrictMode = this.isInStrictMode;
            rewindPoint.listParsingState = this.listParsingState;

            return rewindPoint;
        }

        public rewind(rewindPoint: IParserRewindPoint): void {
            this.clearCachedData();

            this.source.rewind(rewindPoint);

            this.diagnostics.length = rewindPoint.diagnosticsCount;
        }

        public releaseRewindPoint(rewindPoint: IParserRewindPoint): void {
            this.clearCachedData();

            // Debug.assert(this.listParsingState === rewindPoint.listParsingState);
            // Debug.assert(this.isInStrictMode === rewindPoint.isInStrictMode);

            this.source.releaseRewindPoint(rewindPoint);
        }

        private currentNode(): SyntaxNode {
            this._currentToken = null;

            if (this._currentNode === null) {
                this._currentNode = this.currentNodeWorker();
            }

            return this._currentNode;
        }

        private currentNodeWorker(): SyntaxNode {
            var node = this.source.currentNode();

            // We can only reuse a node if it was parsed under the same strict mode that we're 
            // currently in.  i.e. if we originally parsed a node in non-strict mode, but then
            // the user added 'using strict' at the top of the file, then we can't use that node
            // again as the presense of strict mode may cause us to parse the tokens in the file
            // differetly.
            //
            // Note: we *can* reuse tokens when the strict mode changes.  That's because tokens
            // are unaffected by strict mode.  It's just the parser will decide what to do with it
            // differently depending on what mode it is in.
            if (node === null || parsedInStrictMode(node) !== this.isInStrictMode) {
                return null;
            }

            return node;
        }

        private currentToken(): ISyntaxToken {
            this._currentNode = null;

            if (this._currentToken === null) {
                this._currentToken = this.source.currentToken();
            }

            return this._currentToken;
        }

        private currentTokenAllowingRegularExpression(): ISyntaxToken {
            // We're mutating the source here.  We are potentially overwriting the original token we
            // scanned with a regex token.  So we have to clear our state.
            this.clearCachedData();

            return this.source.currentTokenAllowingRegularExpression();
        }

        private peekToken(n: number): ISyntaxToken {
            this.clearCachedData();

            return this.source.peekToken(n);
        }

        private eatAnyToken(): ISyntaxToken {
            var token = this.currentToken();
            this.moveToNextToken();
            return token;
        }

        private moveToNextToken(): void {
            this.clearCachedData();

            this.source.moveToNextToken();
        }

        private moveToNextTokenN(count: number): void {
            for (var i = 0; i < count; i++) {
                this.moveToNextToken();
            }
        }

        private moveToNextNode(): void {
            this.clearCachedData();

            this.source.moveToNextNode();
        }

        //this method is called very frequently
        //we should keep it simple so that it can be inlined.
        private eatToken(kind: SyntaxKind): ISyntaxToken {
            // Assert disabled because it is actually expensive enugh to affect perf.
            // Debug.assert(SyntaxFacts.isTokenKind(kind))

            var token = this.currentToken();
            if (token.kind() === kind) {
                this.moveToNextToken();
                return token;
            }

            //slow part of EatToken(SyntaxKind kind)
            return this.createMissingToken(kind, token);
        }

        // Eats the token if it is there.  Otherwise does nothing.  Will not report errors.
        private tryEatToken(kind: SyntaxKind): ISyntaxToken {
            if (this.currentToken().kind() === kind) {
                return this.eatToken(kind);
            }

            return null;
        }

        private eatKeyword(kind: SyntaxKind): ISyntaxToken {
            // Debug.assert(SyntaxFacts.isTokenKind(kind))

            var token = this.currentToken();
            if (token.kind() === kind) {
                this.moveToNextToken();
                return token;
            }

            //slow part of EatToken(SyntaxKind kind)
            return this.createMissingToken(kind, token);
        }

        // An identifier is basically any word, unless it is a reserved keyword.  so 'foo' is an 
        // identifier and 'return' is not.  Note: a word may or may not be an identifier depending 
        // on the state of the parser.  For example, 'yield' is an identifier *unless* the parser 
        // is in strict mode.
        private isIdentifier(token: ISyntaxToken): boolean {
            var tokenKind = token.kind();

            if (tokenKind === SyntaxKind.IdentifierName) {
                return true;
            }

            // Keywords are only identifiers if they're FutureReservedStrictWords and we're in 
            // strict mode.  *Or* if it's a typescript 'keyword'. 
            if (tokenKind >= SyntaxKind.FirstFutureReservedStrictKeyword) {
                if (tokenKind <= SyntaxKind.LastFutureReservedStrictKeyword) {
                    // Could be a keyword or identifier.  It's an identifier if we're not in strict
                    // mode.
                    return !this.isInStrictMode;
                }
                
                // If it's typescript keyword, then it's actually a javascript identifier.
                return tokenKind <= SyntaxKind.LastTypeScriptKeyword;
            }

            // Anything else is not an identifier.
            return false;
        }

        // This method should be called when the grammar calls for an *IdentifierName* and not an
        // *Identifier*.
        private eatIdentifierNameToken(): ISyntaxToken {
            var token = this.currentToken();

            // If we have an identifier name, then consume and return it.
            if (token.kind() === SyntaxKind.IdentifierName) {
                this.moveToNextToken();
                return token;
            }

            // If we have a keyword, then it cna be used as an identifier name.  However, we need 
            // to convert it to an identifier so that no later parts of the systems see it as a 
            // keyword.
            if (SyntaxFacts.isAnyKeyword(token.kind())) {
                this.moveToNextToken();
                return Syntax.convertToIdentifierName(token);
            }

            return this.createMissingToken(SyntaxKind.IdentifierName, token);
        }

        // This method should be called when the grammar calls for an *Identifier* and not an
        // *IdentifierName*.
        private eatIdentifierToken(): ISyntaxToken {
            var token = this.currentToken();
            if (this.isIdentifier(token)) {
                this.moveToNextToken();

                if (token.kind() === SyntaxKind.IdentifierName) {
                    return token;
                }

                return Syntax.convertToIdentifierName(token);
            }

            return this.createMissingToken(SyntaxKind.IdentifierName, token);
        }

        private previousTokenHasTrailingNewLine(token: ISyntaxToken): boolean {
            var tokenFullStart = token.fullStart();
            if (tokenFullStart === 0) {
                // First token in the document.  Thus it has no 'previous' token, and there is 
                // no preceding newline.
                return false;
            }

            // If our previous token ended with a newline, then *by definition* we must have started
            // at the beginning of a line.  
            var lineNumber = this.source.text.lineMap().getLineNumberFromPosition(tokenFullStart);
            var lineStart = this.source.text.lineMap().getLineStartPosition(lineNumber);

            return lineStart == tokenFullStart;
        }

        private canEatAutomaticSemicolon(allowWithoutNewLine: boolean): boolean {
            var token = this.currentToken();

            // An automatic semicolon is always allowed if we're at the end of the file.
            if (token.kind() === SyntaxKind.EndOfFileToken) {
                return true;
            }

            // Or if the next token is a close brace (regardless of which line it is on).
            if (token.kind() === SyntaxKind.CloseBraceToken) {
                return true;
            }

            if (allowWithoutNewLine) {
                return true;
            }

            // It is also allowed if there is a newline between the last token seen and the next one.
            if (this.previousTokenHasTrailingNewLine(token)) {
                return true;
            }

            return false;
        }

        private canEatExplicitOrAutomaticSemicolon(allowWithoutNewline: boolean): boolean {
            var token = this.currentToken();

            if (token.kind() === SyntaxKind.SemicolonToken) {
                return true;
            }

            return this.canEatAutomaticSemicolon(allowWithoutNewline);
        }

        private eatExplicitOrAutomaticSemicolon(allowWithoutNewline: boolean): ISyntaxToken {
            var token = this.currentToken();

            // If we see a semicolon, then we can definitely eat it.
            if (token.kind() === SyntaxKind.SemicolonToken) {
                return this.eatToken(SyntaxKind.SemicolonToken);
            }

            // Check if an automatic semicolon could go here.  If so, then there's no problem and
            // we can proceed without error.  Return 'null' as there's no actual token for this 
            // position. 
            if (this.canEatAutomaticSemicolon(allowWithoutNewline)) {
                return null;
            }

            // No semicolon could be consumed here at all.  Just call the standard eating function
            // so we get the token and the error for it.
            return this.eatToken(SyntaxKind.SemicolonToken);
        }

        private isKeyword(kind: SyntaxKind): boolean {
            if (kind >= SyntaxKind.FirstKeyword) {
                if (kind <= SyntaxKind.LastFutureReservedKeyword) {
                    return true;
                }

                if (this.isInStrictMode) {
                    return kind <= SyntaxKind.LastFutureReservedStrictKeyword;
                }
            }

            return false;
        }

        private createMissingToken(expectedKind: SyntaxKind, actual: ISyntaxToken): ISyntaxToken {
            var diagnostic = this.getExpectedTokenDiagnostic(expectedKind, actual);
            this.addDiagnostic(diagnostic);

            // The missing token will be at the full start of the current token.  That way empty tokens
            // will always be between real tokens and not inside an actual token.
            return Syntax.emptyToken(expectedKind);
        }

        private getExpectedTokenDiagnostic(expectedKind: SyntaxKind, actual: ISyntaxToken): Diagnostic {
            var token = this.currentToken();

            // They wanted something specific, just report that that token was missing.
            if (SyntaxFacts.isAnyKeyword(expectedKind) || SyntaxFacts.isAnyPunctuation(expectedKind)) {
                return new Diagnostic(this.fileName, this.source.text.lineMap(), start(token), width(token), DiagnosticCode._0_expected, [SyntaxFacts.getText(expectedKind)]);
            }
            else {
                // They wanted an identifier.

                // If the user supplied a keyword, give them a specialized message.
                if (actual !== null && SyntaxFacts.isAnyKeyword(actual.kind())) {
                    return new Diagnostic(this.fileName, this.source.text.lineMap(), start(token), width(token), DiagnosticCode.Identifier_expected_0_is_a_keyword, [SyntaxFacts.getText(actual.kind())]);
                }
                else {
                    // Otherwise just report that an identifier was expected.
                    return new Diagnostic(this.fileName, this.source.text.lineMap(), start(token), width(token), DiagnosticCode.Identifier_expected, null);
                }
            }

            // throw Errors.notYetImplemented();
        }

        private static getBinaryExpressionPrecedence(expressionKind: SyntaxKind): BinaryExpressionPrecedence {
            switch (expressionKind) {
                case SyntaxKind.LogicalOrExpression:
                    return BinaryExpressionPrecedence.LogicalOrExpressionPrecedence;

                case SyntaxKind.LogicalAndExpression:
                    return BinaryExpressionPrecedence.LogicalAndExpressionPrecedence;

                case SyntaxKind.BitwiseOrExpression:
                    return BinaryExpressionPrecedence.BitwiseOrExpressionPrecedence;

                case SyntaxKind.BitwiseExclusiveOrExpression:
                    return BinaryExpressionPrecedence.BitwiseExclusiveOrExpressionPrecedence;

                case SyntaxKind.BitwiseAndExpression:
                    return BinaryExpressionPrecedence.BitwiseAndExpressionPrecedence;

                case SyntaxKind.EqualsWithTypeConversionExpression:
                case SyntaxKind.NotEqualsWithTypeConversionExpression:
                case SyntaxKind.EqualsExpression:
                case SyntaxKind.NotEqualsExpression:
                    return BinaryExpressionPrecedence.EqualityExpressionPrecedence;

                case SyntaxKind.LessThanExpression:
                case SyntaxKind.GreaterThanExpression:
                case SyntaxKind.LessThanOrEqualExpression:
                case SyntaxKind.GreaterThanOrEqualExpression:
                case SyntaxKind.InstanceOfExpression:
                case SyntaxKind.InExpression:
                    return BinaryExpressionPrecedence.RelationalExpressionPrecedence;

                case SyntaxKind.LeftShiftExpression:
                case SyntaxKind.SignedRightShiftExpression:
                case SyntaxKind.UnsignedRightShiftExpression:
                    return BinaryExpressionPrecedence.ShiftExpressionPrecdence;

                case SyntaxKind.AddExpression:
                case SyntaxKind.SubtractExpression:
                    return BinaryExpressionPrecedence.AdditiveExpressionPrecedence;

                case SyntaxKind.MultiplyExpression:
                case SyntaxKind.DivideExpression:
                case SyntaxKind.ModuloExpression:
                    return BinaryExpressionPrecedence.MultiplicativeExpressionPrecedence;
            }

            throw Errors.invalidOperation();
        }
        
        private addSkippedTokenAfterNodeOrToken(nodeOrToken: ISyntaxNodeOrToken, skippedToken: ISyntaxToken): ISyntaxNodeOrToken {
            if (isToken(nodeOrToken)) {
                return this.addSkippedTokenAfterToken(<ISyntaxToken>nodeOrToken, skippedToken);
            }
            else if (isNode(nodeOrToken)) {
                return this.addSkippedTokenAfterNode(<SyntaxNode>nodeOrToken, skippedToken);
            }
            else {
                throw Errors.invalidOperation();
            }
        }

        private replaceTokenInParent(oldToken: ISyntaxToken, newToken: ISyntaxToken): void {
            // oldToken may be parented by a node or a list.
            var parent: any = oldToken.parent;
            if (isNode(parent)) {
                var node = <SyntaxNode>parent;
                for (var key in parent) {
                    if (parent[key] === oldToken) {
                        parent[key] = newToken;
                        newToken.parent = parent;
                        node.resetData();
                        return;
                    }
                }
            }
            else if (isList(parent)) {
                var list1 = <ISyntaxNodeOrToken[]>parent;
                for (var i = 0, n = list1.length; i < n; i++) {
                    if (list1[i] === oldToken) {
                        list1.setChildAt(i, newToken);
                        return;
                    }
                }
            }
            else if (isSeparatedList(parent)) {
                var list2 = <ISyntaxNodeOrToken[]>parent;
                for (var i = 0, n = list2.childCount(); i < n; i++) {
                    if (list2.childAt(i) === oldToken) {
                        list2.setChildAt(i, newToken);
                        return;
                    }
                }
            }

            throw Errors.invalidOperation();
        }

        private addSkippedTokenAfterNode(node: SyntaxNode, skippedToken: ISyntaxToken): SyntaxNode {
            var oldToken = lastToken(node);
            var newToken = this.addSkippedTokenAfterToken(oldToken, skippedToken);

            this.replaceTokenInParent(oldToken, newToken);
            return node;
        }

        private addSkippedTokensBeforeNode(node: SyntaxNode, skippedTokens: ISyntaxToken[]): SyntaxNode {
            if (skippedTokens.length > 0) {
                var oldToken = firstToken(node);
                var newToken = this.addSkippedTokensBeforeToken(oldToken, skippedTokens);

                this.replaceTokenInParent(oldToken, newToken);
            }

            return node;
        }

        private addSkippedTokensBeforeToken(token: ISyntaxToken, skippedTokens: ISyntaxToken[]): ISyntaxToken {
            // Debug.assert(token.fullWidth() > 0 || token.kind() === SyntaxKind.EndOfFileToken);
            // Debug.assert(skippedTokens.length > 0);

            var leadingTrivia: ISyntaxTrivia[] = [];
            for (var i = 0, n = skippedTokens.length; i < n; i++) {
                var skippedToken = skippedTokens[i];
                this.addSkippedTokenToTriviaArray(leadingTrivia, skippedToken);
            }

            this.addTriviaTo(token.leadingTrivia(), leadingTrivia);

            var updatedToken = token.withLeadingTrivia(Syntax.triviaList(leadingTrivia));

            // We've prepending this token with new leading trivia.  This means the full start of
            // the token is not where the scanner originally thought it was, but is instead at the
            // start of the first skipped token.
            updatedToken.setTextAndFullStart(this.source.text, skippedTokens[0].fullStart());

            // Don't need this array anymore.  Give it back so we can reuse it.
            returnArray(skippedTokens);

            return updatedToken;
        }

        private addSkippedTokensAfterToken(token: ISyntaxToken, skippedTokens: ISyntaxToken[]): ISyntaxToken {
            // Debug.assert(token.fullWidth() > 0);
            if (skippedTokens.length === 0) {
                returnArray(skippedTokens);
                return token;
            }

            var trailingTrivia = token.trailingTrivia().toArray();

            for (var i = 0, n = skippedTokens.length; i < n; i++) {
                this.addSkippedTokenToTriviaArray(trailingTrivia, skippedTokens[i]);
            }

            // Don't need this array anymore.  Give it back so we can reuse it.
            returnArray(skippedTokens);
            return token.withTrailingTrivia(Syntax.triviaList(trailingTrivia));
        }

        private addSkippedTokenAfterToken(token: ISyntaxToken, skippedToken: ISyntaxToken): ISyntaxToken {
            // Debug.assert(token.fullWidth() > 0);

            var trailingTrivia = token.trailingTrivia().toArray();
            this.addSkippedTokenToTriviaArray(trailingTrivia, skippedToken);

            return token.withTrailingTrivia(Syntax.triviaList(trailingTrivia));
        }

        private addSkippedTokenToTriviaArray(array: ISyntaxTrivia[], skippedToken: ISyntaxToken): void {
            // Debug.assert(skippedToken.text().length > 0);
            
            // first, add the leading trivia of the skipped token to the array
            this.addTriviaTo(skippedToken.leadingTrivia(), array);

            // now, add the text of the token as skipped text to the trivia array.
            var trimmedToken = skippedToken.withLeadingTrivia(Syntax.emptyTriviaList).withTrailingTrivia(Syntax.emptyTriviaList);

            // Because we removed the leading trivia from the skipped token, the full start of the
            // trimmed token is the start of the skipped token.
            trimmedToken.setTextAndFullStart(this.source.text, start(skippedToken));

            array.push(Syntax.skippedTokenTrivia(trimmedToken));

            // Finally, add the trailing trivia of the skipped token to the trivia array.
            this.addTriviaTo(skippedToken.trailingTrivia(), array);
        }

        private addTriviaTo(list: ISyntaxTriviaList, array: ISyntaxTrivia[]): void {
            for (var i = 0, n = list.count(); i < n; i++) {
                array.push(list.syntaxTriviaAt(i));
            }
        }

        public parseSyntaxTree(isDeclaration: boolean): SyntaxTree {
            var sourceUnit = this.parseSourceUnit();

            var allDiagnostics = this.source.tokenDiagnostics().concat(this.diagnostics);
            allDiagnostics.sort((a: Diagnostic, b: Diagnostic) => a.start() - b.start());

            return new SyntaxTree(sourceUnit, isDeclaration, allDiagnostics, this.fileName, this.source.text.lineMap(), this.parseOptions);
        }

        private setStrictMode(isInStrictMode: boolean) {
            this.isInStrictMode = isInStrictMode;
            this.parseNodeData = isInStrictMode ? SyntaxConstants.NodeParsedInStrictModeMask : 0;
        }

        private parseSourceUnit(): SourceUnitSyntax {
            // Note: technically we don't need to save and restore this here.  After all, this the top
            // level parsing entrypoint.  So it will always start as false and be reset to false when the
            // loop ends.  However, for sake of symmetry and consistancy we do this.
            var savedIsInStrictMode = this.isInStrictMode;

            var result = this.parseSyntaxList<IModuleElementSyntax>(ListParsingState.SourceUnit_ModuleElements, ParserImpl.updateStrictModeState);
            var moduleElements = result.list;

            this.setStrictMode(savedIsInStrictMode);

            var sourceUnit = new SourceUnitSyntax(moduleElements, this.currentToken(), this.parseNodeData);
            sourceUnit = <SourceUnitSyntax>this.addSkippedTokensBeforeNode(sourceUnit, result.skippedTokens);

            if (Debug.shouldAssert(AssertionLevel.Aggressive)) {
                Debug.assert(fullWidth(sourceUnit) === this.source.text.length());

                if (Debug.shouldAssert(AssertionLevel.VeryAggressive)) {
                    Debug.assert(fullText(sourceUnit) === this.source.text.substr(0, this.source.text.length()));
                }
            }

            return sourceUnit;
        }

        private static updateStrictModeState(parser: ParserImpl, items: any[]): void {
            if (!parser.isInStrictMode) {
                // Check if all the items are directive prologue elements.
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    if (!SyntaxFacts.isDirectivePrologueElement(item)) {
                        return;
                    }
                }

                parser.setStrictMode(SyntaxFacts.isUseStrictDirective(items[items.length - 1]));
            }
        }

        private isModuleElement(inErrorRecovery: boolean): boolean {
            if (SyntaxUtilities.isModuleElement(this.currentNode())) {
                return true;
            }

            var currentToken = this.currentToken();
            var nextToken = this.peekToken(1);
            var modifierCount = this.modifierCount();
            var tokenAfterModifiers = this.peekToken(modifierCount);
            return this.isImportDeclaration(currentToken, nextToken, modifierCount, tokenAfterModifiers) ||
                   this.isExportAssignment() ||
                   this.isModuleDeclaration(currentToken, nextToken, modifierCount, tokenAfterModifiers) ||
                   this.isInterfaceDeclaration(currentToken, nextToken, modifierCount, tokenAfterModifiers) ||
                   this.isClassDeclaration(currentToken, nextToken, modifierCount, tokenAfterModifiers) ||
                   this.isEnumDeclaration(currentToken, nextToken, modifierCount, tokenAfterModifiers) ||
                   this.isStatement(inErrorRecovery);
        }
        
        private tryParseModuleElement(inErrorRecovery: boolean): IModuleElementSyntax {
            var node = this.currentNode();
            if (SyntaxUtilities.isModuleElement(node)) {
                this.moveToNextNode();
                return <IModuleElementSyntax>node;
            }

            var currentToken = this.currentToken();
            var nextToken = this.peekToken(1);
            var modifierCount = this.modifierCount();
            var tokenAfterModifiers = this.peekToken(modifierCount);

            if (this.isImportDeclaration(currentToken, nextToken, modifierCount, tokenAfterModifiers)) {
                return this.parseImportDeclaration();
            }
            else if (this.isExportAssignment()) {
                return this.parseExportAssignment();
            }
            else if (this.isModuleDeclaration(currentToken, nextToken, modifierCount, tokenAfterModifiers)) {
                return this.parseModuleDeclaration();
            }
            else if (this.isInterfaceDeclaration(currentToken, nextToken, modifierCount, tokenAfterModifiers)) {
                return this.parseInterfaceDeclaration();
            }
            else if (this.isClassDeclaration(currentToken, nextToken, modifierCount, tokenAfterModifiers)) {
                return this.parseClassDeclaration();
            }
            else if (this.isEnumDeclaration(currentToken, nextToken, modifierCount, tokenAfterModifiers)) {
                return this.parseEnumDeclaration();
            }
            else {
                return this.tryParseStatement(inErrorRecovery);
            }
        }

        private isImportDeclaration(currentToken: ISyntaxToken, nextToken: ISyntaxToken, modifierCount: number, tokenAfterModifiers: ISyntaxToken): boolean {
            // If we have at least one modifier, and we see 'import', then consider this an import
            // declaration.
            if (modifierCount > 0 &&
                tokenAfterModifiers.kind() === SyntaxKind.ImportKeyword) {
                return true;
            }

            // 'import' is not a javascript keyword.  So we need to use a bit of lookahead here to ensure
            // that we're actually looking at a import construct and not some javascript expression.
            return currentToken.kind() === SyntaxKind.ImportKeyword &&
                this.isIdentifier(nextToken);
        }

        private parseImportDeclaration(): ImportDeclarationSyntax {
            // Debug.assert(this.isImportDeclaration());

            var modifiers = this.parseModifiers();
            var importKeyword = this.eatKeyword(SyntaxKind.ImportKeyword);
            var identifier = this.eatIdentifierToken();
            var equalsToken = this.eatToken(SyntaxKind.EqualsToken);
            var moduleReference = this.parseModuleReference();
            var semicolonToken = this.eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false);

            return new ImportDeclarationSyntax(modifiers, importKeyword, identifier, equalsToken, moduleReference, semicolonToken, this.parseNodeData);
        }

        private isExportAssignment(): boolean {
            return this.currentToken().kind() === SyntaxKind.ExportKeyword &&
                   this.peekToken(1).kind() === SyntaxKind.EqualsToken;
        }

        private parseExportAssignment(): ExportAssignmentSyntax {
            // Debug.assert(this.isExportAssignment());

            var exportKeyword = this.eatKeyword(SyntaxKind.ExportKeyword);
            var equalsToken = this.eatToken(SyntaxKind.EqualsToken);
            var identifier = this.eatIdentifierToken();
            var semicolonToken = this.eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false);

            return new ExportAssignmentSyntax(exportKeyword, equalsToken, identifier, semicolonToken, this.parseNodeData);
        }

        private parseModuleReference(): IModuleReferenceSyntax {
            if (this.isExternalModuleReference()) {
                return this.parseExternalModuleReference();
            }
            else {
                return this.parseModuleNameModuleReference();
            }
        }

        private isExternalModuleReference(): boolean {
            var token0 = this.currentToken();
            if (token0.kind() === SyntaxKind.RequireKeyword) {
                return this.peekToken(1).kind() === SyntaxKind.OpenParenToken;
            }

            return false;
        }

        private parseExternalModuleReference(): ExternalModuleReferenceSyntax {
            // Debug.assert(this.isExternalModuleReference());

            var requireKeyword = this.eatKeyword(SyntaxKind.RequireKeyword);
            var openParenToken = this.eatToken(SyntaxKind.OpenParenToken);
            var stringLiteral = this.eatToken(SyntaxKind.StringLiteral);
            var closeParenToken = this.eatToken(SyntaxKind.CloseParenToken);

            return new ExternalModuleReferenceSyntax(requireKeyword, openParenToken, stringLiteral, closeParenToken, this.parseNodeData);
        }

        private parseModuleNameModuleReference(): ModuleNameModuleReferenceSyntax {
            var name = this.parseName();
            return new ModuleNameModuleReferenceSyntax(name, this.parseNodeData);
        }

        // NOTE: This will allow all identifier names.  Even the ones that are keywords.
        private parseIdentifierName(): INameSyntax {
            var identifierName = this.eatIdentifierNameToken();
            return identifierName;
        }

        private tryParseTypeArgumentList(inExpression: boolean): TypeArgumentListSyntax {
            if (this.currentToken().kind() !== SyntaxKind.LessThanToken) {
                return null;
            }

            var lessThanToken: ISyntaxToken;
            var greaterThanToken: ISyntaxToken;
            var result: { skippedTokens: ISyntaxToken[]; list: ITypeSyntax[]; };
            var typeArguments: ITypeSyntax[];

            if (!inExpression) {
                // if we're not in an expression, this must be a type argument list.  Just parse
                // it out as such.
                lessThanToken = this.eatToken(SyntaxKind.LessThanToken);
                // Debug.assert(lessThanToken.fullWidth() > 0);

                result = this.parseSeparatedSyntaxList<ITypeSyntax>(ListParsingState.TypeArgumentList_Types);
                typeArguments = result.list;
                lessThanToken = this.addSkippedTokensAfterToken(lessThanToken, result.skippedTokens);

                greaterThanToken = this.eatToken(SyntaxKind.GreaterThanToken);

                return new TypeArgumentListSyntax(lessThanToken, typeArguments, greaterThanToken, this.parseNodeData);
            }

            // If we're in an expression, then we only want to consume this as a type argument list
            // if we're sure that it's a type arg list and not an arithmetic expression.

            var rewindPoint = this.getRewindPoint();

            // We've seen a '<'.  Try to parse it out as a type argument list.
            lessThanToken = this.eatToken(SyntaxKind.LessThanToken);
            // Debug.assert(lessThanToken.fullWidth() > 0);

            result = this.parseSeparatedSyntaxList<ITypeSyntax>(ListParsingState.TypeArgumentList_Types);
            typeArguments = result.list;
            lessThanToken = this.addSkippedTokensAfterToken(lessThanToken, result.skippedTokens);

            greaterThanToken = this.eatToken(SyntaxKind.GreaterThanToken);

            // We're in a context where '<' could be the start of a type argument list, or part
            // of an arithmetic expression.  We'll presume it's the latter unless we see the '>'
            // and a following token that guarantees that it's supposed to be a type argument list.
            if (greaterThanToken.fullWidth() === 0 || !this.canFollowTypeArgumentListInExpression(this.currentToken().kind())) {
                this.rewind(rewindPoint);

                this.releaseRewindPoint(rewindPoint);
                return null;
            }
            else {
                this.releaseRewindPoint(rewindPoint);
                var typeArgumentList = new TypeArgumentListSyntax(lessThanToken, typeArguments, greaterThanToken, this.parseNodeData);

                return typeArgumentList;
            }
        }

        private canFollowTypeArgumentListInExpression(kind: SyntaxKind): boolean {
            switch (kind) {
                case SyntaxKind.OpenParenToken:                 // foo<x>(   
                case SyntaxKind.DotToken:                       // foo<x>.
                    // These two cases are the only cases where this token can legally follow a
                    // type argument list.  So we definitely want to treat this as a type arg list.

                case SyntaxKind.CloseParenToken:                // foo<x>)
                case SyntaxKind.CloseBracketToken:              // foo<x>]
                case SyntaxKind.ColonToken:                     // foo<x>:
                case SyntaxKind.SemicolonToken:                 // foo<x>;
                case SyntaxKind.CommaToken:                     // foo<x>,
                case SyntaxKind.QuestionToken:                  // foo<x>?
                case SyntaxKind.EqualsEqualsToken:              // foo<x> ==
                case SyntaxKind.EqualsEqualsEqualsToken:        // foo<x> ===
                case SyntaxKind.ExclamationEqualsToken:         // foo<x> !=
                case SyntaxKind.ExclamationEqualsEqualsToken:   // foo<x> !==
                case SyntaxKind.AmpersandAmpersandToken:        // foo<x> &&
                case SyntaxKind.BarBarToken:                    // foo<x> ||
                case SyntaxKind.CaretToken:                     // foo<x> ^
                case SyntaxKind.AmpersandToken:                 // foo<x> &
                case SyntaxKind.BarToken:                       // foo<x> |
                case SyntaxKind.CloseBraceToken:                // foo<x> }
                case SyntaxKind.EndOfFileToken:                 // foo<x>
                    // these cases can't legally follow a type arg list.  However, they're not legal 
                    // expressions either.  The user is probably in the middle of a generic type. So
                    // treat it as such.
                    return true;

                default:
                    // Anything else treat as an expression.
                    return false;
            }
        }

        private parseName(): INameSyntax {
            return this.tryParseName() || this.eatIdentifierToken();
        }

        private tryParseName(): INameSyntax {
            var token0 = this.currentToken();
            var shouldContinue = this.isIdentifier(token0);
            if (!shouldContinue) {
                return null;
            }

            // Call eatIdentifierName to convert the token to an identifier if it is as keyword.
            var current: INameSyntax = this.eatIdentifierToken();

            while (shouldContinue && this.currentToken().kind() === SyntaxKind.DotToken) {
                var dotToken = this.eatToken(SyntaxKind.DotToken);

                var currentToken = this.currentToken();
                var identifierName: ISyntaxToken;

                // Technically a keyword is valid here as all keywords are identifier names.
                // However, often we'll encounter this in error situations when the keyword
                // is actually starting another valid construct.

                // So, we check for the following specific case:

                //      name.
                //      keyword identifierNameOrKeyword

                // Note: the newlines are important here.  For example, if that above code 
                // were rewritten into:

                //      name.keyword
                //      identifierNameOrKeyword

                // Then we would consider it valid.  That's because ASI would take effect and
                // the code would be implicitly: "name.keyword; identifierNameOrKeyword".  
                // In the first case though, ASI will not take effect because there is not a
                // line terminator after the dot.
                if (SyntaxFacts.isAnyKeyword(currentToken.kind()) &&
                    this.previousTokenHasTrailingNewLine(currentToken) &&
                    !currentToken.hasTrailingNewLine() &&
                    SyntaxFacts.isIdentifierNameOrAnyKeyword(this.peekToken(1))) {

                    identifierName = this.createMissingToken(SyntaxKind.IdentifierName, currentToken);
                }
                else {
                    identifierName = this.eatIdentifierNameToken();
                }

                current = new QualifiedNameSyntax(current, dotToken, identifierName, this.parseNodeData);

                shouldContinue = identifierName.fullWidth() > 0;
            }

            return current;
        }

        private isEnumDeclaration(currentToken: ISyntaxToken, nextToken: ISyntaxToken, modifierCount: number, tokenAfterModifiers: ISyntaxToken): boolean {
            // If we have at least one modifier, and we see 'enum', then consider this an enum
            // declaration.
            if (modifierCount > 0 &&
                tokenAfterModifiers.kind() === SyntaxKind.EnumKeyword) {
                return true;
            }

            // 'enum' is not a javascript keyword.  So we need to use a bit of lookahead here to ensure
            // that we're actually looking at a enum construct and not some javascript expression.
            return currentToken.kind() === SyntaxKind.EnumKeyword &&
                   this.isIdentifier(nextToken);
        }

        private parseEnumDeclaration(): EnumDeclarationSyntax {
            // Debug.assert(this.isEnumDeclaration());

            var modifiers = this.parseModifiers();
            var enumKeyword = this.eatKeyword(SyntaxKind.EnumKeyword);
            var identifier = this.eatIdentifierToken();

            var openBraceToken = this.eatToken(SyntaxKind.OpenBraceToken);
            var enumElements = Syntax.emptySeparatedList<EnumElementSyntax>();

            if (openBraceToken.fullWidth() > 0) {
                var result = this.parseSeparatedSyntaxList<EnumElementSyntax>(ListParsingState.EnumDeclaration_EnumElements);
                enumElements = result.list;
                openBraceToken = this.addSkippedTokensAfterToken(openBraceToken, result.skippedTokens);
            }

            var closeBraceToken = this.eatToken(SyntaxKind.CloseBraceToken);

            return new EnumDeclarationSyntax(modifiers, enumKeyword, identifier,
                openBraceToken, enumElements, closeBraceToken, this.parseNodeData);
        }

        private isEnumElement(inErrorRecovery: boolean): boolean {
            if (this.currentNode() !== null && this.currentNode().kind() === SyntaxKind.EnumElement) {
                return true;
            }

            return this.isPropertyName(this.currentToken(), inErrorRecovery);
        }

        private tryParseEnumElement(inErrorRecovery: boolean): EnumElementSyntax {
            // Debug.assert(this.isEnumElement());
            var node = this.currentNode();
            if (node !== null && node.kind() === SyntaxKind.EnumElement) {
                this.moveToNextNode();
                return <EnumElementSyntax>node;
            }

            if (!this.isPropertyName(this.currentToken(), inErrorRecovery)) {
                return null;
            }

            var propertyName = this.eatPropertyName();
            var equalsValueClause: EqualsValueClauseSyntax = null;
            if (this.isEqualsValueClause(/*inParameter*/ false)) {
                equalsValueClause = this.parseEqualsValueClause(/*allowIn:*/ true);
            }

            return new EnumElementSyntax(propertyName, equalsValueClause, this.parseNodeData);
        }

        private static isModifier(token: ISyntaxToken): boolean {
            switch (token.kind()) {
                case SyntaxKind.PublicKeyword:
                case SyntaxKind.PrivateKeyword:
                case SyntaxKind.StaticKeyword:
                case SyntaxKind.ExportKeyword:
                case SyntaxKind.DeclareKeyword:
                    return true;

                default:
                    return false;
            }
        }

        private modifierCount(): number {
            var modifierCount = 0;
            while (true) {
                if (ParserImpl.isModifier(this.peekToken(modifierCount))) {
                    modifierCount++;
                    continue;
                }

                break;
            }

            return modifierCount;
        }

        private parseModifiers(): ISyntaxToken[] {
            var tokens: ISyntaxToken[] = getArray();

            while (true) {
                if (ParserImpl.isModifier(this.currentToken())) {
                    tokens.push(this.eatAnyToken());
                    continue;
                }

                break;
            }

            var result = Syntax.list(tokens);

            // If the tokens array is greater than one, then we can't return it.  It will have been 
            // copied directly into the syntax list.
            returnZeroLengthArray(tokens);

            return result;
        }

        private isClassDeclaration(currentToken: ISyntaxToken, nextToken: ISyntaxToken, modifierCount: number, tokenAfterModifiers: ISyntaxToken): boolean {
            // If we have at least one modifier, and we see 'class', then consider this a class
            // declaration.
            if (modifierCount > 0 &&
                tokenAfterModifiers.kind() === SyntaxKind.ClassKeyword) {
                return true;
            }

            // 'class' is not a javascript keyword.  So we need to use a bit of lookahead here to ensure
            // that we're actually looking at a class construct and not some javascript expression.
            return currentToken.kind() === SyntaxKind.ClassKeyword &&
                   this.isIdentifier(nextToken);
        }

        private parseHeritageClauses(): HeritageClauseSyntax[] {
            var heritageClauses = Syntax.emptyList<HeritageClauseSyntax>();
            
            if (this.isHeritageClause()) {
                var result = this.parseSyntaxList<HeritageClauseSyntax>(ListParsingState.ClassOrInterfaceDeclaration_HeritageClauses);
                heritageClauses = result.list;
                Debug.assert(result.skippedTokens.length === 0);
            }

            return heritageClauses;
        }

        private tryParseHeritageClauseTypeName(): ITypeSyntax {
            if (!this.isHeritageClauseTypeName()) {
                return null;
            }

            return this.tryParseNameOrGenericType();
        }

        private parseClassDeclaration(): ClassDeclarationSyntax {
            // Debug.assert(this.isClassDeclaration());

            var modifiers = this.parseModifiers();

            var classKeyword = this.eatKeyword(SyntaxKind.ClassKeyword);
            var identifier = this.eatIdentifierToken();
            var typeParameterList = this.tryParseTypeParameterList(/*requireCompleteTypeParameterList:*/ false);
            var heritageClauses = this.parseHeritageClauses();
            var openBraceToken = this.eatToken(SyntaxKind.OpenBraceToken);
            var classElements = Syntax.emptyList<IClassElementSyntax>();

            if (openBraceToken.fullWidth() > 0) {
                var result = this.parseSyntaxList<IClassElementSyntax>(ListParsingState.ClassDeclaration_ClassElements);

                classElements = result.list;
                openBraceToken = this.addSkippedTokensAfterToken(openBraceToken, result.skippedTokens);
            }

            var closeBraceToken = this.eatToken(SyntaxKind.CloseBraceToken);
            return new ClassDeclarationSyntax(
                modifiers, classKeyword, identifier, typeParameterList, heritageClauses, openBraceToken, classElements, closeBraceToken, this.parseNodeData);
        }

        private static isPublicOrPrivateKeyword(token: ISyntaxToken): boolean {
            return token.kind() === SyntaxKind.PublicKeyword || token.kind() === SyntaxKind.PrivateKeyword;
        }

        private isAccessor(inErrorRecovery: boolean): boolean {
            var index = this.modifierCount();

            if (this.peekToken(index).kind() !== SyntaxKind.GetKeyword &&
                this.peekToken(index).kind() !== SyntaxKind.SetKeyword) {
                return false;
            }

            index++;
            return this.isPropertyName(this.peekToken(index), inErrorRecovery);
        }

        private parseAccessor(checkForStrictMode: boolean): SyntaxNode {
            // Debug.assert(this.isMemberAccessorDeclaration());

            var modifiers = this.parseModifiers();

            if (this.currentToken().kind() === SyntaxKind.GetKeyword) {
                return this.parseGetMemberAccessorDeclaration(modifiers, checkForStrictMode);
            }
            else if (this.currentToken().kind() === SyntaxKind.SetKeyword) {
                return this.parseSetMemberAccessorDeclaration(modifiers, checkForStrictMode);
            }
            else {
                throw Errors.invalidOperation();
            }
        }

        private parseGetMemberAccessorDeclaration(modifiers: ISyntaxToken[], checkForStrictMode: boolean): GetAccessorSyntax {
            // Debug.assert(this.currentToken().kind() === SyntaxKind.GetKeyword);

            var getKeyword = this.eatKeyword(SyntaxKind.GetKeyword);
            var propertyName = this.eatPropertyName();
            var parameterList = this.parseParameterList();
            var typeAnnotation = this.parseOptionalTypeAnnotation(/*allowStringLiteral:*/ false);
            var block = this.parseBlock(/*parseStatementsEvenWithNoOpenBrace:*/ false, checkForStrictMode);

            return new GetAccessorSyntax(
                modifiers, getKeyword, propertyName, parameterList, typeAnnotation, block, this.parseNodeData);
        }

        private parseSetMemberAccessorDeclaration(modifiers: ISyntaxToken[], checkForStrictMode: boolean): SetAccessorSyntax {
            // Debug.assert(this.currentToken().kind() === SyntaxKind.SetKeyword);

            var setKeyword = this.eatKeyword(SyntaxKind.SetKeyword);
            var propertyName = this.eatPropertyName();
            var parameterList = this.parseParameterList();
            var block = this.parseBlock(/*parseStatementsEvenWithNoOpenBrace:*/ false, checkForStrictMode);

            return new SetAccessorSyntax(modifiers, setKeyword, propertyName, parameterList, block, this.parseNodeData);
        }

        private isClassElement(inErrorRecovery: boolean): boolean {
            if (SyntaxUtilities.isClassElement(this.currentNode())) {
                return true;
            }

            // Note: the order of these calls is important.  Specifically, isMemberVariableDeclaration
            // checks for a subset of the conditions of the previous two calls.
            return this.isConstructorDeclaration() ||
                   this.isMemberFunctionDeclaration(inErrorRecovery) ||
                   this.isAccessor(inErrorRecovery) ||
                   this.isMemberVariableDeclaration(inErrorRecovery) ||
                   this.isIndexMemberDeclaration();
        }

        private tryParseClassElement(inErrorRecovery: boolean): IClassElementSyntax {
            // Debug.assert(this.isClassElement());
            var node = this.currentNode();
            if (SyntaxUtilities.isClassElement(node)) {
                this.moveToNextNode();
                return <IClassElementSyntax>node;
            }

            if (this.isConstructorDeclaration()) {
                return this.parseConstructorDeclaration();
            }
            else if (this.isMemberFunctionDeclaration(inErrorRecovery)) {
                return this.parseMemberFunctionDeclaration();
            }
            else if (this.isAccessor(inErrorRecovery)) {
                return this.parseAccessor(/*checkForStrictMode:*/ false);
            }
            else if (this.isMemberVariableDeclaration(inErrorRecovery)) {
                return this.parseMemberVariableDeclaration();
            }
            else if (this.isIndexMemberDeclaration()) {
                return this.parseIndexMemberDeclaration();
            }
            else {
                return null;
            }
        }

        private isConstructorDeclaration(): boolean {
            // Note: we deviate slightly from the spec here.  If we see 'constructor' then we 
            // assume this is a constructor.  That means, if a user writes "public constructor;"
            // it won't be viewed as a member.  As a workaround, they can simply write:
            //      public 'constructor';

            var index = this.modifierCount();
            return this.peekToken(index).kind() === SyntaxKind.ConstructorKeyword;
        }

        private parseConstructorDeclaration(): ConstructorDeclarationSyntax {
            // Debug.assert(this.isConstructorDeclaration());

            var modifiers = this.parseModifiers();
            var constructorKeyword = this.eatKeyword(SyntaxKind.ConstructorKeyword);
            var callSignature = this.parseCallSignature(/*requireCompleteTypeParameterList:*/ false);

            var semicolonToken: ISyntaxToken = null;
            var block: BlockSyntax = null;

            if (this.isBlock()) {
                block = this.parseBlock(/*parseStatementsEvenWithNoOpenBrace:*/ false, /*checkForStrictMode:*/ true);
            }
            else {
                semicolonToken = this.eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false);
            }

            return new ConstructorDeclarationSyntax(modifiers, constructorKeyword, callSignature, block, semicolonToken, this.parseNodeData);
        }

        private isMemberFunctionDeclaration(inErrorRecovery: boolean): boolean {
            var index = 0;

            // Note: typescript is highly ambiguous here.  We may have things like:
            //      public()
            //      public public()
            //      public static()
            //      public static public()
            //
            // etc.
            //
            // This means we can't just blindly consume and move past modifier tokens.  Instead, we 
            // need to see if we're at the function's name, and only skip it if we're not.
            while (true) {
                var token = this.peekToken(index);
                if (this.isPropertyName(token, inErrorRecovery) &&
                    this.isCallSignature(index + 1)) {
                    return true;
                }

                // We weren't at the name of the function.  If we have a modifier token, then 
                // consume it and try again.
                if (ParserImpl.isModifier(token)) {
                    index++;
                    continue;
                }

                // Wasn't a member function.
                return false;
            }
        }

        private parseMemberFunctionDeclaration(): MemberFunctionDeclarationSyntax {
            // Debug.assert(this.isMemberFunctionDeclaration());

            var modifierArray: ISyntaxToken[] = getArray();

            while (true) {
                var currentToken = this.currentToken();
                if (this.isPropertyName(currentToken, /*inErrorRecovery:*/ false) &&
                    this.isCallSignature(1)) {
                    break;
                }

                Debug.assert(ParserImpl.isModifier(currentToken));
                modifierArray.push(this.eatAnyToken());
            }

            var modifiers = Syntax.list(modifierArray);
            returnZeroLengthArray(modifierArray);

            var propertyName = this.eatPropertyName();
            var callSignature = this.parseCallSignature(/*requireCompleteTypeParameterList:*/ false);

            // If we got an errant => then we want to parse what's coming up without requiring an
            // open brace.
            var parseBlockEvenWithNoOpenBrace = this.tryAddUnexpectedEqualsGreaterThanToken(callSignature);

            var block: BlockSyntax = null;
            var semicolon: ISyntaxToken = null;

            if (parseBlockEvenWithNoOpenBrace || this.isBlock()) {
                block = this.parseBlock(parseBlockEvenWithNoOpenBrace, /*checkForStrictMode:*/ true);
            }
            else {
                semicolon = this.eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false);
            }

            return new MemberFunctionDeclarationSyntax(modifiers, propertyName, callSignature, block, semicolon, this.parseNodeData);
        }
        
        private isDefinitelyMemberVariablePropertyName(index: number): boolean {
            // keywords are also property names.  Only accept a keyword as a property 
            // name if is of the form:
            //      public;
            //      public=
            //      public:
            //      public }
            //      public <eof>
            if (SyntaxFacts.isAnyKeyword(this.peekToken(index).kind())) {
                switch (this.peekToken(index + 1).kind()) {
                    case SyntaxKind.SemicolonToken:
                    case SyntaxKind.EqualsToken:
                    case SyntaxKind.ColonToken:
                    case SyntaxKind.CloseBraceToken:
                    case SyntaxKind.EndOfFileToken:
                       return true;
                    default:
                        return false;
                }
            }
            else {
                // If was a property name and not a keyword, then we're good to go.
                return true;
            }
        }

        private isMemberVariableDeclaration(inErrorRecovery: boolean): boolean {
            var index = 0;

            // Note: typescript is highly ambiguous here.  We may have things like:
            //      public;
            //      public public;
            //      public static;
            //      public static public;
            //
            // etc.
            //
            // This means we can't just blindly consume and move past modifier tokens.  Instead, we 
            // need to see if we're at the function's name, and only skip it if we're not.
            while (true) {
                var token = this.peekToken(index);
                if (this.isPropertyName(token, inErrorRecovery) &&
                    this.isDefinitelyMemberVariablePropertyName(index)) {
                        return true;
                }

                // We weren't at the name of the variable.  If we have a modifier token, then 
                // consume it and try again.
                if (ParserImpl.isModifier(this.peekToken(index))) {
                    index++;
                    continue;
                }

                // Wasn't a member variable.
                return false;
            }
        }

        private parseMemberVariableDeclaration(): MemberVariableDeclarationSyntax {
            // Debug.assert(this.isMemberVariableDeclaration());

            var modifierArray: ISyntaxToken[] = getArray();

            while (true) {
                var currentToken = this.currentToken();
                if (this.isPropertyName(currentToken, /*inErrorRecovery:*/ false) &&
                    this.isDefinitelyMemberVariablePropertyName(0)) {
                    break;
                }

                Debug.assert(ParserImpl.isModifier(currentToken));
                modifierArray.push(this.eatAnyToken());
            }

            var modifiers = Syntax.list(modifierArray);
            returnZeroLengthArray(modifierArray);

            var variableDeclarator = this.tryParseVariableDeclarator(/*allowIn:*/ true, /*allowPropertyName:*/ true);

            // Even though we're calling tryParseVariableDeclarator, we must get one (we've already
            // verified that because of of hte call to isMemberVariableDecalrator above.
            Debug.assert(variableDeclarator !== null);

            var semicolon = this.eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false);

            return new MemberVariableDeclarationSyntax(modifiers, variableDeclarator, semicolon, this.parseNodeData);
        }

        private isIndexMemberDeclaration(): boolean {
            var index = this.modifierCount();
            return this.isIndexSignature(index);
        }

        private parseIndexMemberDeclaration(): IndexMemberDeclarationSyntax {
            // Debug.assert(this.isIndexMemberDeclaration()
            var modifiers = this.parseModifiers();
            var indexSignature = this.parseIndexSignature();
            var semicolonToken = this.eatExplicitOrAutomaticSemicolon(/*allowWithoutNewLine:*/ false);

            return new IndexMemberDeclarationSyntax(modifiers, indexSignature, semicolonToken, this.parseNodeData);
        }

        private tryAddUnexpectedEqualsGreaterThanToken(callSignature: CallSignatureSyntax): boolean {
            var token0 = this.currentToken();

            var hasEqualsGreaterThanToken = token0.kind() === SyntaxKind.EqualsGreaterThanToken;
            if (hasEqualsGreaterThanToken) {
                // We can only do this if the call signature actually contains a final token that we 
                // could add the => to.
                var _lastToken = lastToken(callSignature);
                if (_lastToken && _lastToken.fullWidth() > 0) {
                    // Previously the language allowed "function f() => expr;" as a shorthand for 
                    // "function f() { return expr; }.
                    // 
                    // Detect if the user is typing this and attempt recovery.
                    var diagnostic = new Diagnostic(this.fileName, this.source.text.lineMap(),
                        start(token0), width(token0), DiagnosticCode.Unexpected_token_0_expected, [SyntaxFacts.getText(SyntaxKind.OpenBraceToken)]);
                    this.addDiagnostic(diagnostic);

                    var token = this.eatAnyToken();
                    this.addSkippedTokenAfterNode(callSignature, token0);

                    return true;
                }
            }


            return false;
        }

        private isFunctionDeclaration(): boolean {
            var index = this.modifierCount();
            return this.peekToken(index).kind() === SyntaxKind.FunctionKeyword;
        }

        private parseFunctionDeclaration(): FunctionDeclarationSyntax {
            // Debug.assert(this.isFunctionDeclaration());

            var modifiers = this.parseModifiers();
            var functionKeyword = this.eatKeyword(SyntaxKind.FunctionKeyword);
            var identifier = this.eatIdentifierToken();
            var callSignature = this.parseCallSignature(/*requireCompleteTypeParameterList:*/ false);

            // If we got an errant => then we want to parse what's coming up without requiring an
            // open brace.
            var parseBlockEvenWithNoOpenBrace = this.tryAddUnexpectedEqualsGreaterThanToken(callSignature);

            var semicolonToken: ISyntaxToken = null;
            var block: BlockSyntax = null;

            // Parse a block if we're on a bock, or if we saw a '=>'
            if (parseBlockEvenWithNoOpenBrace || this.isBlock()) {
                block = this.parseBlock(parseBlockEvenWithNoOpenBrace, /*checkForStrictMode:*/ true);
            }
            else {
                semicolonToken = this.eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false);
            }

            return new FunctionDeclarationSyntax(modifiers, functionKeyword, identifier, callSignature, block, semicolonToken, this.parseNodeData);
        }

        private isModuleDeclaration(currentToken: ISyntaxToken, nextToken: ISyntaxToken, modifierCount: number, tokenAfterModifiers: ISyntaxToken): boolean {
            // If we have at least one modifier, and we see 'module', then consider this a module
            // declaration.
            if (modifierCount > 0 &&
                tokenAfterModifiers.kind() === SyntaxKind.ModuleKeyword) {
                return true;
            }

            // 'module' is not a javascript keyword.  So we need to use a bit of lookahead here to ensure
            // that we're actually looking at a module construct and not some javascript expression.
            if (currentToken.kind() === SyntaxKind.ModuleKeyword) {
                return this.isIdentifier(nextToken) || nextToken.kind() === SyntaxKind.StringLiteral;
            }

            return false;
        }

        private parseModuleDeclaration(): ModuleDeclarationSyntax {
            // Debug.assert(this.isModuleDeclaration());

            var modifiers = this.parseModifiers();
            var moduleKeyword = this.eatKeyword(SyntaxKind.ModuleKeyword);

            var moduleName: INameSyntax = null;
            var stringLiteral: ISyntaxToken = null;

            if (this.currentToken().kind() === SyntaxKind.StringLiteral) {
                stringLiteral = this.eatToken(SyntaxKind.StringLiteral);
            }
            else {
                moduleName = this.parseName();
            }

            var openBraceToken = this.eatToken(SyntaxKind.OpenBraceToken);

            var moduleElements = Syntax.emptyList<IModuleElementSyntax>();
            if (openBraceToken.fullWidth() > 0) {
                var result = this.parseSyntaxList<IModuleElementSyntax>(ListParsingState.ModuleDeclaration_ModuleElements);
                moduleElements = result.list;
                openBraceToken = this.addSkippedTokensAfterToken(openBraceToken, result.skippedTokens);
            }

            var closeBraceToken = this.eatToken(SyntaxKind.CloseBraceToken);

            return new ModuleDeclarationSyntax(modifiers, moduleKeyword, moduleName, stringLiteral, openBraceToken, moduleElements, closeBraceToken, this.parseNodeData);
        }

        private isInterfaceDeclaration(currentToken: ISyntaxToken, nextToken: ISyntaxToken, modifierCount: number, tokenAfterModifiers: ISyntaxToken): boolean {
            // If we have at least one modifier, and we see 'interface', then consider this an interface
            // declaration.
            if (modifierCount > 0 &&
                tokenAfterModifiers.kind() === SyntaxKind.InterfaceKeyword) {
                return true;
            }

            // 'interface' is not a javascript keyword.  So we need to use a bit of lookahead here to ensure
            // that we're actually looking at a interface construct and not some javascript expression.
            return currentToken.kind() === SyntaxKind.InterfaceKeyword &&
                   this.isIdentifier(nextToken);
        }

        private parseInterfaceDeclaration(): InterfaceDeclarationSyntax {
            // Debug.assert(this.isInterfaceDeclaration());

            var modifiers = this.parseModifiers();
            var interfaceKeyword = this.eatKeyword(SyntaxKind.InterfaceKeyword);
            var identifier = this.eatIdentifierToken();
            var typeParameterList = this.tryParseTypeParameterList(/*requireCompleteTypeParameterList:*/ false);
            var heritageClauses = this.parseHeritageClauses();

            var objectType = this.parseObjectType();
            return new InterfaceDeclarationSyntax(modifiers, interfaceKeyword, identifier, typeParameterList, heritageClauses, objectType, this.parseNodeData);
        }

        private parseObjectType(): ObjectTypeSyntax {
            var openBraceToken = this.eatToken(SyntaxKind.OpenBraceToken);

            var typeMembers = Syntax.emptySeparatedList<ITypeMemberSyntax>();
            if (openBraceToken.fullWidth() > 0) {
                var result = this.parseSeparatedSyntaxList<ITypeMemberSyntax>(ListParsingState.ObjectType_TypeMembers);
                typeMembers = result.list;
                openBraceToken = this.addSkippedTokensAfterToken(openBraceToken, result.skippedTokens);
            }

            var closeBraceToken = this.eatToken(SyntaxKind.CloseBraceToken);
            return new ObjectTypeSyntax(openBraceToken, typeMembers, closeBraceToken, this.parseNodeData);
        }

        private isTypeMember(inErrorRecovery: boolean): boolean {
            if (SyntaxUtilities.isTypeMember(this.currentNode())) {
                return true;
            }

            return this.isCallSignature(/*tokenIndex:*/ 0) ||
                   this.isConstructSignature() ||
                   this.isIndexSignature(/*tokenIndex:*/ 0) ||
                   this.isMethodSignature(inErrorRecovery) ||
                   this.isPropertySignature(inErrorRecovery);
        }

        private tryParseTypeMember(inErrorRecovery: boolean): ITypeMemberSyntax {
            var node = this.currentNode();
            if (SyntaxUtilities.isTypeMember(node)) {
                this.moveToNextNode();
                return <ITypeMemberSyntax>node;
            }

            if (this.isCallSignature(/*tokenIndex:*/ 0)) {
                return this.parseCallSignature(/*requireCompleteTypeParameterList:*/ false);
            }
            else if (this.isConstructSignature()) {
                return this.parseConstructSignature();
            }
            else if (this.isIndexSignature(/*tokenIndex:*/ 0)) {
                return this.parseIndexSignature();
            }
            else if (this.isMethodSignature(inErrorRecovery)) {
                // Note: it is important that isFunctionSignature is called before isPropertySignature.
                // isPropertySignature checks for a subset of isFunctionSignature.
                return this.parseMethodSignature();
            }
            else if (this.isPropertySignature(inErrorRecovery)) {
                return this.parsePropertySignature();
            }
            else {
                return null;
            }
        }

        private parseConstructSignature(): ConstructSignatureSyntax {
            // Debug.assert(this.isConstructSignature());

            var newKeyword = this.eatKeyword(SyntaxKind.NewKeyword);
            var callSignature = this.parseCallSignature(/*requireCompleteTypeParameterList:*/ false);

            return new ConstructSignatureSyntax(newKeyword, callSignature, this.parseNodeData);
        }

        private parseIndexSignature(): IndexSignatureSyntax {
            // Debug.assert(this.isIndexSignature());

            var openBracketToken = this.eatToken(SyntaxKind.OpenBracketToken);
            var parameter = this.parseParameter();
            var closeBracketToken = this.eatToken(SyntaxKind.CloseBracketToken);
            var typeAnnotation = this.parseOptionalTypeAnnotation(/*allowStringLiteral:*/ false);

            return new IndexSignatureSyntax(openBracketToken, parameter, closeBracketToken, typeAnnotation, this.parseNodeData);
        }

        private parseMethodSignature(): MethodSignatureSyntax {
            // Debug.assert(this.isMethodSignature());

            var propertyName = this.eatPropertyName();
            var questionToken = this.tryEatToken(SyntaxKind.QuestionToken);
            var callSignature = this.parseCallSignature(/*requireCompleteTypeParameterList:*/ false);

            return new MethodSignatureSyntax(propertyName, questionToken, callSignature, this.parseNodeData);
        }

        private parsePropertySignature(): PropertySignatureSyntax {
            // Debug.assert(this.isPropertySignature());

            var propertyName = this.eatPropertyName();
            var questionToken = this.tryEatToken(SyntaxKind.QuestionToken);
            var typeAnnotation = this.parseOptionalTypeAnnotation(/*allowStringLiteral:*/ false);

            return new PropertySignatureSyntax(propertyName, questionToken, typeAnnotation, this.parseNodeData);
        }

        private isCallSignature(tokenIndex: number): boolean {
            var tokenKind = this.peekToken(tokenIndex).kind();
            return tokenKind === SyntaxKind.OpenParenToken || tokenKind === SyntaxKind.LessThanToken;
        }

        private isConstructSignature(): boolean {
            if (this.currentToken().kind() !== SyntaxKind.NewKeyword) {
                return false;
            }

            var token1 = this.peekToken(1);
            return token1.kind() === SyntaxKind.LessThanToken || token1.kind() === SyntaxKind.OpenParenToken;
        }

        private isIndexSignature(tokenIndex: number): boolean {
            return this.peekToken(tokenIndex).kind() === SyntaxKind.OpenBracketToken;
        }

        private isMethodSignature(inErrorRecovery: boolean): boolean {
            if (this.isPropertyName(this.currentToken(), inErrorRecovery)) {
                // id(
                if (this.isCallSignature(1)) {
                    return true;
                }

                // id?(
                if (this.peekToken(1).kind() === SyntaxKind.QuestionToken &&
                    this.isCallSignature(2)) {
                    return true;
                }
            }

            return false;
        }

        private isPropertySignature(inErrorRecovery: boolean): boolean {
            var currentToken = this.currentToken();

            // Keywords can start properties.  However, they're often intended to start something
            // else.  If we see a modifier before something that can be a property, then don't
            // try parse it out as a property.  For example, if we have:
            //
            //      public foo
            //
            // Then don't parse 'public' as a property name.  Note: if you have:
            //
            //      public
            //      foo
            //
            // Then we *should* parse it as a property name, as ASI takes effect here.
            if (ParserImpl.isModifier(currentToken) &&
                !currentToken.hasTrailingNewLine() &&
                this.isPropertyName(this.peekToken(1), inErrorRecovery))
            {
                return false;
            }

            // Note: property names also start function signatures.  So it's important that we call this
            // after we calll isFunctionSignature.
            return this.isPropertyName(currentToken, inErrorRecovery);
        }

        private isHeritageClause(): boolean {
            var token0 = this.currentToken();
            return token0.kind() === SyntaxKind.ExtendsKeyword || token0.kind() === SyntaxKind.ImplementsKeyword;
        }

        private isNotHeritageClauseTypeName(): boolean {
            if (this.currentToken().kind() === SyntaxKind.ImplementsKeyword ||
                this.currentToken().kind() === SyntaxKind.ExtendsKeyword) {

                return this.isIdentifier(this.peekToken(1));
            }

            return false;
        }

        private isHeritageClauseTypeName(): boolean {
            if (this.isIdentifier(this.currentToken())) {
                // We want to make sure that the "extends" in "extends foo" or the "implements" in
                // "implements foo" is not considered a type name.
                return !this.isNotHeritageClauseTypeName();
            }
            
            return false;
        }

        private tryParseHeritageClause(): HeritageClauseSyntax {
            var extendsOrImplementsKeyword = this.currentToken();
            if (extendsOrImplementsKeyword.kind() !== SyntaxKind.ExtendsKeyword && extendsOrImplementsKeyword.kind() !== SyntaxKind.ImplementsKeyword) {
                return null;
            }

            this.moveToNextToken();

            var result = this.parseSeparatedSyntaxList<INameSyntax>(ListParsingState.HeritageClause_TypeNameList);
            var typeNames = result.list;
            extendsOrImplementsKeyword = this.addSkippedTokensAfterToken(extendsOrImplementsKeyword, result.skippedTokens);

            return new HeritageClauseSyntax(
                extendsOrImplementsKeyword.kind() === SyntaxKind.ExtendsKeyword ? SyntaxKind.ExtendsHeritageClause : SyntaxKind.ImplementsHeritageClause,
                extendsOrImplementsKeyword, typeNames, this.parseNodeData);
        }

        private isInterfaceEnumClassOrModule(): boolean {
            var currentToken = this.currentToken();
            var nextToken = this.peekToken(1);
            var modifierCount = this.modifierCount();
            var tokenAfterModifiers = this.peekToken(modifierCount);
            if (this.isInterfaceDeclaration(currentToken, nextToken, modifierCount, tokenAfterModifiers) ||
                this.isClassDeclaration(currentToken, nextToken, modifierCount, tokenAfterModifiers) ||
                this.isEnumDeclaration(currentToken, nextToken, modifierCount, tokenAfterModifiers) ||
                this.isModuleDeclaration(currentToken, nextToken, modifierCount, tokenAfterModifiers)) {

                return true;
            }

            return false;
        }

        private isStatement(inErrorRecovery: boolean): boolean {
            if (SyntaxUtilities.isStatement(this.currentNode())) {
                return true;
            }

            var currentToken = this.currentToken();
            var currentTokenKind = currentToken.kind();
            switch (currentTokenKind) {
                // ERROR RECOVERY
                case SyntaxKind.PublicKeyword:
                case SyntaxKind.PrivateKeyword:
                case SyntaxKind.StaticKeyword:
                    // None of the above are actually keywords.  And they might show up in a real
                    // statement (i.e. "public();").  However, if we see 'public <identifier>' then 
                    // that can't possibly be a statement (and instead will be a class element), 
                    // and we should not parse it out here.
                    var token1 = this.peekToken(1);
                    if (SyntaxFacts.isIdentifierNameOrAnyKeyword(token1)) {
                        // Definitely not a statement.
                        return false;
                    }

                    // Handle this below in 'isExpressionStatement()'
                    break;

                // Common cases that we can immediately assume are statements.
                case SyntaxKind.IfKeyword:
                case SyntaxKind.OpenBraceToken:
                case SyntaxKind.ReturnKeyword:
                case SyntaxKind.SwitchKeyword:
                case SyntaxKind.ThrowKeyword:
                case SyntaxKind.BreakKeyword:
                case SyntaxKind.ContinueKeyword:
                case SyntaxKind.ForKeyword:
                case SyntaxKind.WhileKeyword:
                case SyntaxKind.WithKeyword:
                case SyntaxKind.DoKeyword:
                case SyntaxKind.TryKeyword:
                case SyntaxKind.DebuggerKeyword:
                    return true;
            }
            
            // Check for common things that might appear where we expect a statement, but which we 
            // do not want to consume.  This can happen when the user does not terminate their 
            // existing block properly.  We don't want to accidently consume these as expression 
            // below.
            if (this.isInterfaceEnumClassOrModule()) {
                return false;
            }

            // More complicated cases.
            return this.isLabeledStatement(currentToken) ||
                this.isVariableStatement() ||
                this.isFunctionDeclaration() ||
                this.isEmptyStatement(currentToken, inErrorRecovery) ||
                this.isExpressionStatement(currentToken);
        }

        private parseStatement(inErrorRecovery: boolean): IStatementSyntax {
            return this.tryParseStatement(inErrorRecovery) || this.parseExpressionStatement();
        }

        private tryParseStatement(inErrorRecovery: boolean): IStatementSyntax {
            var node = this.currentNode();
            if (SyntaxUtilities.isStatement(node)) {
                this.moveToNextNode();
                return <IStatementSyntax><ISyntaxNode>node;
            }

            var currentToken = this.currentToken();
            var currentTokenKind = currentToken.kind();

            switch (currentTokenKind) {
                // ERROR RECOVERY
                case SyntaxKind.PublicKeyword:
                case SyntaxKind.PrivateKeyword:
                case SyntaxKind.StaticKeyword:
                    // None of the above are actually keywords.  And they might show up in a real
                    // statement (i.e. "public();").  However, if we see 'public <identifier>' then 
                    // that can't possibly be a statement (and instead will be a class element), 
                    // and we should not parse it out here.
                    if (SyntaxFacts.isIdentifierNameOrAnyKeyword(this.peekToken(1))) {
                        // Definitely not a statement.
                        return null;
                    }
                    else {
                        break;
                    }

                case SyntaxKind.IfKeyword: return this.parseIfStatement();
                case SyntaxKind.OpenBraceToken: return this.parseBlock(/*parseStatementsEvenWithNoOpenBrace:*/ false, /*checkForStrictMode:*/ false);
                case SyntaxKind.ReturnKeyword: return this.parseReturnStatement();
                case SyntaxKind.SwitchKeyword: return this.parseSwitchStatement();
                case SyntaxKind.ThrowKeyword: return this.parseThrowStatement();
                case SyntaxKind.BreakKeyword: return this.parseBreakStatement();
                case SyntaxKind.ContinueKeyword: return this.parseContinueStatement();
                case SyntaxKind.ForKeyword: return this.parseForOrForInStatement();
                case SyntaxKind.WhileKeyword: return this.parseWhileStatement();
                case SyntaxKind.WithKeyword: return this.parseWithStatement();
                case SyntaxKind.DoKeyword: return this.parseDoStatement();
                case SyntaxKind.TryKeyword: return this.parseTryStatement();
                case SyntaxKind.DebuggerKeyword: return this.parseDebuggerStatement();
            }
            
            // Check for common things that might appear where we expect a statement, but which we 
            // do not want to consume.  This can happen when the user does not terminate their 
            // existing block properly.  We don't want to accidently consume these as expression 
            // below.
            if (this.isInterfaceEnumClassOrModule()) {
                return null;
            }

            if (this.isVariableStatement()) {
                return this.parseVariableStatement();
            }
            else if (this.isLabeledStatement(currentToken)) {
                return this.parseLabeledStatement();
            }
            else if (this.isFunctionDeclaration()) {
                return this.parseFunctionDeclaration();
            }
            else if (this.isEmptyStatement(currentToken, inErrorRecovery)) {
                return this.parseEmptyStatement();
            }
            else if (this.isExpressionStatement(currentToken)) {
                // Fall back to parsing this as expression statement.
                return this.parseExpressionStatement();
            }
            else {
                return null;
            }
        }

        private parseDebuggerStatement(): DebuggerStatementSyntax {
            // Debug.assert(this.isDebuggerStatement());

            var debuggerKeyword = this.eatKeyword(SyntaxKind.DebuggerKeyword);
            var semicolonToken = this.eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false);

            return new DebuggerStatementSyntax(debuggerKeyword, semicolonToken, this.parseNodeData);
        }

        private parseDoStatement(): DoStatementSyntax {
            // Debug.assert(this.isDoStatement());

            var doKeyword = this.eatKeyword(SyntaxKind.DoKeyword);
            var statement = this.parseStatement(/*inErrorRecovery:*/ false);
            var whileKeyword = this.eatKeyword(SyntaxKind.WhileKeyword);
            var openParenToken = this.eatToken(SyntaxKind.OpenParenToken);
            var condition = this.parseExpression(/*allowIn:*/ true);
            var closeParenToken = this.eatToken(SyntaxKind.CloseParenToken);

            // From: https://mail.mozilla.org/pipermail/es-discuss/2011-August/016188.html
            // 157 min --- All allen at wirfs-brock.com CONF --- "do{;}while(false)false" prohibited in 
            // spec but allowed in consensus reality. Approved -- this is the de-facto standard whereby
            //  do;while(0)x will have a semicolon inserted before x.
            var semicolonToken = this.eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ true);

            return new DoStatementSyntax(doKeyword, statement, whileKeyword, openParenToken, condition, closeParenToken, semicolonToken, this.parseNodeData);
        }

        private isLabeledStatement(currentToken: ISyntaxToken): boolean {
            return this.isIdentifier(currentToken) && this.peekToken(1).kind() === SyntaxKind.ColonToken;
        }

        private parseLabeledStatement(): LabeledStatementSyntax {
            // Debug.assert(this.isLabeledStatement());

            var identifier = this.eatIdentifierToken();
            var colonToken = this.eatToken(SyntaxKind.ColonToken);
            var statement = this.parseStatement(/*inErrorRecovery:*/ false);

            return new LabeledStatementSyntax(identifier, colonToken, statement, this.parseNodeData);
        }

        private parseTryStatement(): TryStatementSyntax {
            // Debug.assert(this.isTryStatement());

            var tryKeyword = this.eatKeyword(SyntaxKind.TryKeyword);

            var savedListParsingState = this.listParsingState;
            this.listParsingState |= ListParsingState.TryBlock_Statements;
            var block = this.parseBlock(/*parseStatementsEvenWithNoOpenBrace:*/ false, /*checkForStrictMode:*/ false);
            this.listParsingState = savedListParsingState;

            var catchClause: CatchClauseSyntax = null;
            if (this.isCatchClause()) {
                catchClause = this.parseCatchClause();
            }

            // If we don't have a catch clause, then we must have a finally clause.  Try to parse
            // one out no matter what.
            var finallyClause: FinallyClauseSyntax = null;
            if (catchClause === null || this.isFinallyClause()) {
                finallyClause = this.parseFinallyClause();
            }

            return new TryStatementSyntax(tryKeyword, block, catchClause, finallyClause, this.parseNodeData);
        }

        private isCatchClause(): boolean {
            return this.currentToken().kind() === SyntaxKind.CatchKeyword;
        }

        private parseCatchClause(): CatchClauseSyntax {
            // Debug.assert(this.isCatchClause());

            var catchKeyword = this.eatKeyword(SyntaxKind.CatchKeyword);
            var openParenToken = this.eatToken(SyntaxKind.OpenParenToken);
            var identifier = this.eatIdentifierToken();
            var typeAnnotation = this.parseOptionalTypeAnnotation(/*allowStringLiteral:*/ false);
            var closeParenToken = this.eatToken(SyntaxKind.CloseParenToken);

            var savedListParsingState = this.listParsingState;
            this.listParsingState |= ListParsingState.CatchBlock_Statements;
            var block = this.parseBlock(/*parseStatementsEvenWithNoOpenBrace:*/ false, /*checkForStrictMode:*/ false);
            this.listParsingState = savedListParsingState;

            return new CatchClauseSyntax(catchKeyword, openParenToken, identifier, typeAnnotation, closeParenToken, block, this.parseNodeData);
        }

        private isFinallyClause(): boolean {
            return this.currentToken().kind() === SyntaxKind.FinallyKeyword;
        }

        private parseFinallyClause(): FinallyClauseSyntax {
            var finallyKeyword = this.eatKeyword(SyntaxKind.FinallyKeyword);
            var block = this.parseBlock(/*parseStatementsEvenWithNoOpenBrace:*/ false, /*checkForStrictMode:*/ false);

            return new FinallyClauseSyntax(finallyKeyword, block, this.parseNodeData);
        }

        private parseWithStatement(): WithStatementSyntax {
            // Debug.assert(this.isWithStatement());

            var withKeyword = this.eatKeyword(SyntaxKind.WithKeyword);
            var openParenToken = this.eatToken(SyntaxKind.OpenParenToken);
            var condition = this.parseExpression(/*allowIn:*/ true);
            var closeParenToken = this.eatToken(SyntaxKind.CloseParenToken);
            var statement = this.parseStatement(/*inErrorRecovery:*/ false);

            return new WithStatementSyntax(withKeyword, openParenToken, condition, closeParenToken, statement, this.parseNodeData);
        }

        private parseWhileStatement(): WhileStatementSyntax {
            // Debug.assert(this.isWhileStatement());

            var whileKeyword = this.eatKeyword(SyntaxKind.WhileKeyword);
            var openParenToken = this.eatToken(SyntaxKind.OpenParenToken);
            var condition = this.parseExpression(/*allowIn:*/ true);
            var closeParenToken = this.eatToken(SyntaxKind.CloseParenToken);
            var statement = this.parseStatement(/*inErrorRecovery:*/ false);

            return new WhileStatementSyntax(whileKeyword, openParenToken, condition, closeParenToken, statement, this.parseNodeData);
        }

        private isEmptyStatement(currentToken: ISyntaxToken, inErrorRecovery: boolean): boolean {
            // If we're in error recovery, then we don't want to treat ';' as an empty statement.
            // The problem is that ';' can show up in far too many contexts, and if we see one 
            // and assume it's a statement, then we may bail out innapropriately from whatever 
            // we're parsing.  For example, if we have a semicolon in the middle of a class, then
            // we really don't want to assume the class is over and we're on a statement in the
            // outer module.  We just want to consume and move on.
            if (inErrorRecovery) {
                return false;
            }

            return currentToken.kind() === SyntaxKind.SemicolonToken;
        }

        private parseEmptyStatement(): EmptyStatementSyntax {
            // Debug.assert(this.isEmptyStatement());

            var semicolonToken = this.eatToken(SyntaxKind.SemicolonToken);
            return new EmptyStatementSyntax(semicolonToken, this.parseNodeData);
        }

        private parseForOrForInStatement(): IStatementSyntax {
            // Debug.assert(this.isForOrForInStatement());

            var forKeyword = this.eatKeyword(SyntaxKind.ForKeyword);
            var openParenToken = this.eatToken(SyntaxKind.OpenParenToken);

            var currentToken = this.currentToken();
            if (currentToken.kind() === SyntaxKind.VarKeyword) {
                // for ( var VariableDeclarationListNoIn; Expressionopt ; Expressionopt ) Statement
                // for ( var VariableDeclarationNoIn in Expression ) Statement
                return this.parseForOrForInStatementWithVariableDeclaration(forKeyword, openParenToken);
            }
            else if (currentToken.kind() === SyntaxKind.SemicolonToken) {
                // for ( ; Expressionopt ; Expressionopt ) Statement
                return this.parseForStatementWithNoVariableDeclarationOrInitializer(forKeyword, openParenToken);
            }
            else {
                // for ( ExpressionNoInopt; Expressionopt ; Expressionopt ) Statement
                // for ( LeftHandSideExpression in Expression ) Statement
                return this.parseForOrForInStatementWithInitializer(forKeyword, openParenToken);
            }
        }

        private parseForOrForInStatementWithVariableDeclaration(forKeyword: ISyntaxToken, openParenToken: ISyntaxToken): IStatementSyntax {
            // Debug.assert(forKeyword.kind() === SyntaxKind.ForKeyword && openParenToken.kind() === SyntaxKind.OpenParenToken);
            // Debug.assert(this.currentToken().kind() === SyntaxKind.VarKeyword);

            // for ( var VariableDeclarationListNoIn; Expressionopt ; Expressionopt ) Statement
            // for ( var VariableDeclarationNoIn in Expression ) Statement

            var variableDeclaration = this.parseVariableDeclaration(/*allowIn:*/ false);

            if (this.currentToken().kind() === SyntaxKind.InKeyword) {
                return this.parseForInStatementWithVariableDeclarationOrInitializer(forKeyword, openParenToken, variableDeclaration, null);
            }

            return this.parseForStatementWithVariableDeclarationOrInitializer(forKeyword, openParenToken, variableDeclaration, null);
        }

        private parseForInStatementWithVariableDeclarationOrInitializer(
                forKeyword: ISyntaxToken,
                openParenToken: ISyntaxToken,
                variableDeclaration: VariableDeclarationSyntax,
                initializer: IExpressionSyntax): ForInStatementSyntax {
            // Debug.assert(this.currentToken().kind() === SyntaxKind.InKeyword);

            // for ( var VariableDeclarationNoIn in Expression ) Statement
            var inKeyword = this.eatKeyword(SyntaxKind.InKeyword);
            var expression = this.parseExpression(/*allowIn:*/ true);
            var closeParenToken = this.eatToken(SyntaxKind.CloseParenToken);
            var statement = this.parseStatement(/*inErrorRecovery:*/ false);

            return new ForInStatementSyntax(forKeyword, openParenToken, variableDeclaration, initializer, inKeyword, expression, closeParenToken, statement, this.parseNodeData);
        }

        private parseForOrForInStatementWithInitializer(forKeyword: ISyntaxToken, openParenToken: ISyntaxToken): IStatementSyntax {
            // Debug.assert(forKeyword.kind() === SyntaxKind.ForKeyword && openParenToken.kind() === SyntaxKind.OpenParenToken);

            // for ( ExpressionNoInopt; Expressionopt ; Expressionopt ) Statement
            // for ( LeftHandSideExpression in Expression ) Statement

            var initializer = this.parseExpression(/*allowIn:*/ false);
            if (this.currentToken().kind() === SyntaxKind.InKeyword) {
                return this.parseForInStatementWithVariableDeclarationOrInitializer(forKeyword, openParenToken, null, initializer);
            }
            else {
                return this.parseForStatementWithVariableDeclarationOrInitializer(forKeyword, openParenToken, null, initializer);
            }
        }

        private parseForStatementWithNoVariableDeclarationOrInitializer(forKeyword: ISyntaxToken, openParenToken: ISyntaxToken): ForStatementSyntax {
            // Debug.assert(forKeyword.kind() === SyntaxKind.ForKeyword && openParenToken.kind() === SyntaxKind.OpenParenToken);
            // Debug.assert(this.currentToken().kind() === SyntaxKind.SemicolonToken);
            // for ( ; Expressionopt ; Expressionopt ) Statement

            return this.parseForStatementWithVariableDeclarationOrInitializer(forKeyword, openParenToken, /*variableDeclaration:*/ null, /*initializer:*/ null);
        }

        private parseForStatementWithVariableDeclarationOrInitializer(
                    forKeyword: ISyntaxToken,
                    openParenToken: ISyntaxToken,
                    variableDeclaration: VariableDeclarationSyntax,
                    initializer: IExpressionSyntax): ForStatementSyntax {

            // NOTE: From the es5 section on Automatic Semicolon Insertion.
            // a semicolon is never inserted automatically if the semicolon would then ... become 
            // one of the two semicolons in the header of a for statement
            var firstSemicolonToken = this.eatToken(SyntaxKind.SemicolonToken);

            var condition: IExpressionSyntax = null;
            if (this.currentToken().kind() !== SyntaxKind.SemicolonToken &&
                this.currentToken().kind() !== SyntaxKind.CloseParenToken &&
                this.currentToken().kind() !== SyntaxKind.EndOfFileToken) {
                condition = this.parseExpression(/*allowIn:*/ true);
            }

            // NOTE: See above.  Semicolons in for statements don't participate in automatic 
            // semicolon insertion.
            var secondSemicolonToken = this.eatToken(SyntaxKind.SemicolonToken);

            var incrementor: IExpressionSyntax = null;
            if (this.currentToken().kind() !== SyntaxKind.CloseParenToken &&
                this.currentToken().kind() !== SyntaxKind.EndOfFileToken) {
                incrementor = this.parseExpression(/*allowIn:*/ true);
            }

            var closeParenToken = this.eatToken(SyntaxKind.CloseParenToken);
            var statement = this.parseStatement(/*inErrorRecovery:*/ false);

            return new ForStatementSyntax(forKeyword, openParenToken, variableDeclaration, initializer,
                firstSemicolonToken, condition, secondSemicolonToken, incrementor, closeParenToken, statement, this.parseNodeData);
        }

        private parseBreakStatement(): BreakStatementSyntax {
            // Debug.assert(this.isBreakStatement());

            var breakKeyword = this.eatKeyword(SyntaxKind.BreakKeyword);

            // If there is no newline after the break keyword, then we can consume an optional 
            // identifier.
            var identifier: ISyntaxToken = null;
            if (!this.canEatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false)) {
                if (this.isIdentifier(this.currentToken())) {
                    identifier = this.eatIdentifierToken();
                }
            }

            var semicolon = this.eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false);
            return new BreakStatementSyntax(breakKeyword, identifier, semicolon, this.parseNodeData);
        }

        private parseContinueStatement(): ContinueStatementSyntax {
            // Debug.assert(this.isContinueStatement());

            var continueKeyword = this.eatKeyword(SyntaxKind.ContinueKeyword);

            // If there is no newline after the break keyword, then we can consume an optional 
            // identifier.
            var identifier: ISyntaxToken = null;
            if (!this.canEatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false)) {
                if (this.isIdentifier(this.currentToken())) {
                    identifier = this.eatIdentifierToken();
                }
            }

            var semicolon = this.eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false);
            return new ContinueStatementSyntax(continueKeyword, identifier, semicolon, this.parseNodeData);
        }

        private parseSwitchStatement() {
            // Debug.assert(this.isSwitchStatement());

            var switchKeyword = this.eatKeyword(SyntaxKind.SwitchKeyword);
            var openParenToken = this.eatToken(SyntaxKind.OpenParenToken);
            var expression = this.parseExpression(/*allowIn:*/ true);
            var closeParenToken = this.eatToken(SyntaxKind.CloseParenToken);

            var openBraceToken = this.eatToken(SyntaxKind.OpenBraceToken);

            var switchClauses = Syntax.emptyList<ISwitchClauseSyntax>();
            if (openBraceToken.fullWidth() > 0) {
                var result = this.parseSyntaxList<ISwitchClauseSyntax>(ListParsingState.SwitchStatement_SwitchClauses);
                switchClauses = result.list;
                openBraceToken = this.addSkippedTokensAfterToken(openBraceToken, result.skippedTokens);
            }

            var closeBraceToken = this.eatToken(SyntaxKind.CloseBraceToken);
            return new SwitchStatementSyntax(switchKeyword, openParenToken, expression, closeParenToken, openBraceToken, switchClauses, closeBraceToken, this.parseNodeData);
        }

        private isCaseSwitchClause(): boolean {
            return this.currentToken().kind() === SyntaxKind.CaseKeyword;
        }

        private isDefaultSwitchClause(): boolean {
            return this.currentToken().kind() === SyntaxKind.DefaultKeyword;
        }

        private isSwitchClause(): boolean {
            if (SyntaxUtilities.isSwitchClause(this.currentNode())) {
                return true;
            }

            return this.isCaseSwitchClause() || this.isDefaultSwitchClause();
        }

        private tryParseSwitchClause(): ISwitchClauseSyntax {
            // Debug.assert(this.isSwitchClause());
            var node = this.currentNode();
            if (SyntaxUtilities.isSwitchClause(node)) {
                this.moveToNextNode();
                return <ISwitchClauseSyntax><ISyntaxNode>node;
            }

            if (this.isCaseSwitchClause()) {
                return this.parseCaseSwitchClause();
            }
            else if (this.isDefaultSwitchClause()) {
                return this.parseDefaultSwitchClause();
            }
            else {
                return null;
            }
        }

        private parseCaseSwitchClause(): CaseSwitchClauseSyntax {
            // Debug.assert(this.isCaseSwitchClause());

            var caseKeyword = this.eatKeyword(SyntaxKind.CaseKeyword);
            var expression = this.parseExpression(/*allowIn:*/ true);
            var colonToken = this.eatToken(SyntaxKind.ColonToken);
            var statements = Syntax.emptyList<IStatementSyntax>();

            // TODO: allow parsing of the list evne if there's no colon.  However, we have to make 
            // sure we add any skipped tokens to the right previous node or token.
            if (colonToken.fullWidth() > 0) {
                var result = this.parseSyntaxList<IStatementSyntax>(ListParsingState.SwitchClause_Statements);
                statements = result.list;
                colonToken = this.addSkippedTokensAfterToken(colonToken, result.skippedTokens);
            }

            return new CaseSwitchClauseSyntax(caseKeyword, expression, colonToken, statements, this.parseNodeData);
        }

        private parseDefaultSwitchClause(): DefaultSwitchClauseSyntax {
            // Debug.assert(this.isDefaultSwitchClause());

            var defaultKeyword = this.eatKeyword(SyntaxKind.DefaultKeyword);
            var colonToken = this.eatToken(SyntaxKind.ColonToken);
            var statements = Syntax.emptyList<IStatementSyntax>();

            // TODO: Allow parsing witha colon here.  However, ensure that we attach any skipped 
            // tokens to the defaultKeyword.
            if (colonToken.fullWidth() > 0) {
                var result = this.parseSyntaxList<IStatementSyntax>(ListParsingState.SwitchClause_Statements);
                statements = result.list;
                colonToken = this.addSkippedTokensAfterToken(colonToken, result.skippedTokens);
            }

            return new DefaultSwitchClauseSyntax(defaultKeyword, colonToken, statements, this.parseNodeData);
        }

        private parseThrowStatement(): ThrowStatementSyntax {
            // Debug.assert(this.isThrowStatement());

            var throwKeyword = this.eatKeyword(SyntaxKind.ThrowKeyword);

            var expression: IExpressionSyntax = null;
            if (this.canEatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false)) {
                // Because of automatic semicolon insertion, we need to report error if this 
                // throw could be terminated with a semicolon.  Note: we can't call 'parseExpression'
                // directly as that might consume an expression on the following line.  
                var token = this.createMissingToken(SyntaxKind.IdentifierName, null);
                expression = token;
            }
            else {
                expression = this.parseExpression(/*allowIn:*/ true);
            }

            var semicolonToken = this.eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false);

            return new ThrowStatementSyntax(throwKeyword, expression, semicolonToken, this.parseNodeData);
        }

        private parseReturnStatement(): ReturnStatementSyntax {
            // Debug.assert(this.isReturnStatement());

            var returnKeyword = this.eatKeyword(SyntaxKind.ReturnKeyword);

            var expression: IExpressionSyntax = null;
            if (!this.canEatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false)) {
                expression = this.parseExpression(/*allowIn:*/ true);
            }

            var semicolonToken = this.eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false);

            return new ReturnStatementSyntax(returnKeyword, expression, semicolonToken, this.parseNodeData);
        }

        private isExpressionStatement(currentToken: ISyntaxToken): boolean {
            // As per the gramar, neither { nor 'function' can start an expression statement.
            var kind = currentToken.kind();
            if (kind === SyntaxKind.OpenBraceToken || kind === SyntaxKind.FunctionKeyword) {
                return false;
            }

            return this.isExpression(currentToken);
        }

        private isAssignmentOrOmittedExpression(): boolean {
            var currentToken = this.currentToken();
            if (currentToken.kind() === SyntaxKind.CommaToken) {
                return true;
            }

            return this.isExpression(currentToken);
        }

        private tryParseAssignmentOrOmittedExpression(): IExpressionSyntax {
            // Debug.assert(this.isAssignmentOrOmittedExpression());

            if (this.currentToken().kind() === SyntaxKind.CommaToken) {
                return new OmittedExpressionSyntax(this.parseNodeData);
            }

            return this.tryParseAssignmentExpressionOrHigher(/*force:*/ false, /*allowIn:*/ true);
        }

        private isExpression(currentToken: ISyntaxToken): boolean {
            switch (currentToken.kind()) {
                // Literals
                case SyntaxKind.NumericLiteral:
                case SyntaxKind.StringLiteral:
                case SyntaxKind.RegularExpressionLiteral:

                 // For array literals.
                case SyntaxKind.OpenBracketToken:

                // For parenthesized expressions
                case SyntaxKind.OpenParenToken: 

                // For cast expressions.
                case SyntaxKind.LessThanToken:

                // Prefix unary expressions.
                case SyntaxKind.PlusPlusToken:
                case SyntaxKind.MinusMinusToken:
                case SyntaxKind.PlusToken:
                case SyntaxKind.MinusToken:
                case SyntaxKind.TildeToken:
                case SyntaxKind.ExclamationToken:

                // For object type literal expressions.
                case SyntaxKind.OpenBraceToken: 

                // ERROR TOLERANCE:
                // If we see a => then we know the user was probably trying to type in an arrow 
                // function.  So allow this as the start of an expression, knowing that when we 
                // actually try to parse it we'll report the missing identifier.
                case SyntaxKind.EqualsGreaterThanToken:

                case SyntaxKind.SlashToken:
                case SyntaxKind.SlashEqualsToken:
                    // Note: if we see a / or /= token then we always consider this an expression.  Why?
                    // Well, either that / or /= is actually a regular expression, in which case we're 
                    // definitely an expression.  Or, it's actually a divide.  In which case, we *still*
                    // want to think of ourself as an expression.  "But wait", you say.  '/' doesn't
                    // start an expression.  That's true.  BUt like the above check for =>, for error
                    // tolerance, we will consider ourselves in an expression.  We'll then parse out an
                    // missing identifier and then will consume the / token naturally as a binary 
                    // expression.

                // Simple epxressions.
                case SyntaxKind.SuperKeyword:
                case SyntaxKind.ThisKeyword:
                case SyntaxKind.TrueKeyword:
                case SyntaxKind.FalseKeyword:
                case SyntaxKind.NullKeyword:

                // For object creation expressions.
                case SyntaxKind.NewKeyword: 

                // Prefix unary expressions
                case SyntaxKind.DeleteKeyword:
                case SyntaxKind.VoidKeyword:
                case SyntaxKind.TypeOfKeyword:

                // For function expressions.
                case SyntaxKind.FunctionKeyword:
                    return true;
            }

            return this.isIdentifier(currentToken);
        }

        private parseExpressionStatement(): ExpressionStatementSyntax {
            var expression = this.parseExpression(/*allowIn:*/ true);

            var semicolon = this.eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false);

            return new ExpressionStatementSyntax(expression, semicolon, this.parseNodeData);
        }

        private parseIfStatement(): IfStatementSyntax {
            // Debug.assert(this.isIfStatement());

            var ifKeyword = this.eatKeyword(SyntaxKind.IfKeyword);
            var openParenToken = this.eatToken(SyntaxKind.OpenParenToken);
            var condition = this.parseExpression(/*allowIn:*/ true);
            var closeParenToken = this.eatToken(SyntaxKind.CloseParenToken);
            var statement = this.parseStatement(/*inErrorRecovery:*/ false);

            var elseClause: ElseClauseSyntax = null;
            if (this.isElseClause()) {
                elseClause = this.parseElseClause();
            }

            return new IfStatementSyntax(ifKeyword, openParenToken, condition, closeParenToken, statement, elseClause, this.parseNodeData);
        }

        private isElseClause(): boolean {
            return this.currentToken().kind() === SyntaxKind.ElseKeyword;
        }

        private parseElseClause(): ElseClauseSyntax {
            // Debug.assert(this.isElseClause());

            var elseKeyword = this.eatKeyword(SyntaxKind.ElseKeyword);
            var statement = this.parseStatement(/*inErrorRecovery:*/ false);

            return new ElseClauseSyntax(elseKeyword, statement, this.parseNodeData);
        }

        private isVariableStatement(): boolean {
            var index = this.modifierCount();
            return this.peekToken(index).kind() === SyntaxKind.VarKeyword;
        }

        private parseVariableStatement(): VariableStatementSyntax {
            // Debug.assert(this.isVariableStatement());

            var modifiers = this.parseModifiers();
            var variableDeclaration = this.parseVariableDeclaration(/*allowIn:*/ true);
            var semicolonToken = this.eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false);

            return new VariableStatementSyntax(modifiers, variableDeclaration, semicolonToken, this.parseNodeData);
        }

        private parseVariableDeclaration(allowIn: boolean): VariableDeclarationSyntax {
            // Debug.assert(this.currentToken().kind() === SyntaxKind.VarKeyword);

            var varKeyword = this.eatKeyword(SyntaxKind.VarKeyword);
            // Debug.assert(varKeyword.fullWidth() > 0);

            var listParsingState = allowIn
                ? ListParsingState.VariableDeclaration_VariableDeclarators_AllowIn
                : ListParsingState.VariableDeclaration_VariableDeclarators_DisallowIn;

            var result = this.parseSeparatedSyntaxList<VariableDeclaratorSyntax>(listParsingState);
            var variableDeclarators = result.list;
            varKeyword = this.addSkippedTokensAfterToken(varKeyword, result.skippedTokens);

            return new VariableDeclarationSyntax(varKeyword, variableDeclarators, this.parseNodeData);
        }

        private isVariableDeclarator(): boolean {
            if (this.currentNode() !== null && this.currentNode().kind() === SyntaxKind.VariableDeclarator) {
                return true;
            }

            return this.isIdentifier(this.currentToken());
        }

        private canReuseVariableDeclaratorNode(node: ISyntaxNode) {
            if (node === null || node.kind() !== SyntaxKind.VariableDeclarator) {
                return false;
            }

            // Very subtle incremental parsing bug.  Consider the following code:
            //
            //      var v = new List < A, B
            //
            // This is actually legal code.  It's a list of variable declarators "v = new List<A" 
            // on one side and "B" on the other. If you then change that to:
            //
            //      var v = new List < A, B >()
            // 
            // then we have a problem.  "v = new List<A" doesn't intersect the change range, so we
            // start reparsing at "B" and we completely fail to handle this properly.
            //
            // In order to prevent this, we do not allow a variable declarator to be reused if it
            // has an initializer.
            var variableDeclarator = <VariableDeclaratorSyntax>node;
            return variableDeclarator.equalsValueClause === null;
        }

        private tryParseVariableDeclarator(allowIn: boolean, allowPropertyName: boolean): VariableDeclaratorSyntax {
            // TODO(cyrusn): What if the 'allowIn' context has changed between when we last parsed 
            // and now?  We could end up with an incorrect tree.  For example, say we had in the old 
            // tree "var i = a in b".  Then, in the new tree the declarator portion moved into:
            // "for (var i = a in b".  We would not want to reuse the declarator as the "in b" portion 
            // would need to be consumed by the for declaration instead.  Need to see if it is possible
            // to hit this case.
            var node = this.currentNode();
            if (this.canReuseVariableDeclaratorNode(node)) {
                this.moveToNextNode();
                return <VariableDeclaratorSyntax>node;
            }

            if (allowPropertyName) {
                Debug.assert(this.isPropertyName(this.currentToken(), /*inErrorRecovery:*/ false));
            }

            if (!allowPropertyName && !this.isIdentifier(this.currentToken())) {
                return null;
            }

            var propertyName = allowPropertyName ? this.eatPropertyName() : this.eatIdentifierToken();
            var equalsValueClause: EqualsValueClauseSyntax = null;
            var typeAnnotation: TypeAnnotationSyntax = null;

            if (propertyName.fullWidth() > 0) {
                typeAnnotation = this.parseOptionalTypeAnnotation(/*allowStringLiteral:*/ false);

                if (this.isEqualsValueClause(/*inParameter*/ false)) {
                    equalsValueClause = this.parseEqualsValueClause(allowIn);
                }
            }

            return new VariableDeclaratorSyntax(propertyName, typeAnnotation, equalsValueClause, this.parseNodeData);
        }

        private isColonValueClause(): boolean {
            return this.currentToken().kind() === SyntaxKind.ColonToken;
        }

        private isEqualsValueClause(inParameter: boolean): boolean {
            var token0 = this.currentToken();
            if (token0.kind() === SyntaxKind.EqualsToken) {
                return true;
            }

            // It's not uncommon during typing for the user to miss writing the '=' token.  Check if
            // there is no newline after the last token and if we're on an expression.  If so, parse
            // this as an equals-value clause with a missing equals.
            if (!this.previousTokenHasTrailingNewLine(token0)) {
                // The 'isExpression' call below returns true for "=>".  That's because it smartly
                // assumes that there is just a missing identifier and the user wanted a lambda.  
                // While this is sensible, we don't want to allow that here as that would mean we're
                // glossing over multiple erorrs and we're probably making things worse.  So don't
                // treat this as an equals value clause and let higher up code handle things.
                if (token0.kind() === SyntaxKind.EqualsGreaterThanToken) {
                    return false;
                }

                // There are two places where we allow equals-value clauses.  The first is in a 
                // variable declarator.  The second is with a parameter.  For variable declarators
                // it's more likely that a { would be a allowed (as an object literal).  While this
                // is also allowed for parameters, the risk is that we consume the { as an object
                // literal when it really will be for the block following the parameter.
                if (token0.kind() === SyntaxKind.OpenBraceToken &&
                    inParameter) {
                    return false;
                }

                return this.isExpression(token0);
            }

            return false;
        }

        private parseEqualsValueClause(allowIn: boolean): EqualsValueClauseSyntax {
            // Debug.assert(this.isEqualsValueClause());

            var equalsToken = this.eatToken(SyntaxKind.EqualsToken);
            var value = this.tryParseAssignmentExpressionOrHigher(/*force:*/ true, allowIn);

            return new EqualsValueClauseSyntax(equalsToken, value, this.parseNodeData);
        }

        private parseExpression(allowIn: boolean): IExpressionSyntax {
            // Expression[in]:
            //      AssignmentExpression[in] 
            //      Expression[in] , AssignmentExpression[in]

            var leftOperand = this.tryParseAssignmentExpressionOrHigher(/*force:*/ true, allowIn);
            while (true) {
                var token0 = this.currentToken();
                var token0Kind = token0.kind();

                if (token0Kind !== SyntaxKind.CommaToken) {
                    break;
                }

                this.eatAnyToken();

                var rightOperand = this.tryParseAssignmentExpressionOrHigher(/*force:*/ true, allowIn);
                leftOperand = new BinaryExpressionSyntax(SyntaxKind.CommaExpression, leftOperand, token0, rightOperand, this.parseNodeData);
            }

            return leftOperand;
        }

        // Called when you need to parse an expression, but you do not want to allow 'CommaExpressions'.
        // i.e. if you have "var a = 1, b = 2" then when we parse '1' we want to parse with higher 
        // precedence than 'comma'.  Otherwise we'll get: "var a = (1, (b = 2))", instead of
        // "var a = (1), b = (2)");
        private tryParseAssignmentExpressionOrHigher(force: boolean, allowIn: boolean): IExpressionSyntax {
            // Augmented by TypeScript:
            //
            //  AssignmentExpression[in]:
            //      1) ConditionalExpression[in]
            //      2) LeftHandSideExpression = AssignmentExpression[in]
            //      3) LeftHandSideExpression AssignmentOperator AssignmentExpression[in]
            //      4) ArrowFunctionExpression <-- added by TypeScript
            //
            // Open spec question.  Right now, there is no 'ArrowFunctionExpression[in]' variant.
            // Thus, if the user has:
            //
            //      for (var a = () => b in c) {}
            //
            // Then we will fail to parse (because the 'in' will be consumed as part of the body of
            // the lambda, and not as part of the 'for' statement).  This is likely not an issue
            // whatsoever as there seems to be no good reason why anyone would ever write code like
            // the above.
            //
            // Note: for ease of implementation we treat productions '2' and '3' as the same thing. 
            // (i.e. they're both BinaryExpressions with an assignment operator in it).

            // First, check if we have production '4' (an arrow function).  Note that if we do, we
            // must *not* recurse for productsion 1, 2 or 3. An ArrowFunction is not a 
            // LeftHandSideExpression, nor does it start a ConditionalExpression.  So we are done 
            // with AssignmentExpression if we see one.

            var arrowFunction = this.tryParseAnyArrowFunctionExpression();
            if (arrowFunction !== null) {
                return arrowFunction;
            }

            // Now try to see if we're in production '1', '2' or '3'.  A conditional expression can
            // start with a LogicalOrExpression, while the assignment productions can only start with
            // LeftHandSideExpressions.
            //
            // So, first, we try to just parse out a BinaryExpression.  If we get something that is a 
            // LeftHandSide or higher, then we can try to parse out the assignment expression part.  
            // Otherwise, we try to parse out the conditional expression bit.  We want to allow any 
            // binary expression here, so we pass in the 'lowest' precedence here so that it matches
            // and consumes anything.
            var leftOperand = this.tryParseBinaryExpressionOrHigher(force, BinaryExpressionPrecedence.Lowest, allowIn);
            if (leftOperand === null) {
                return null;
            }

            if (SyntaxUtilities.isLeftHandSizeExpression(leftOperand)) {
                // Note: we call currentOperatorToken so that we get an appropriately merged token
                // for cases like > > =  becoming >>=
                var token0 = this.currentOperatorToken();
                var token0Kind = token0.kind();

                // Check for recursive assignment expressions.
                if (ParserImpl.isAssignmentOperatorToken(token0Kind)) {
                    this.moveToNextTokenN(this.unmergedTokenCount(token0Kind));

                    var rightOperand = this.tryParseAssignmentExpressionOrHigher(/*force:*/ true, allowIn);
                    var binaryExpressionKind = SyntaxFacts.getBinaryExpressionFromOperatorToken(token0Kind);
                    return new BinaryExpressionSyntax(binaryExpressionKind, leftOperand, token0, rightOperand, this.parseNodeData);
                }
            }

            // It wasn't an assignment or a lambda.  This is a conditional expression:
            return this.parseConditionalExpressionRest(allowIn, leftOperand);
        }

        private static isAssignmentOperatorToken(tokenKind: SyntaxKind): boolean {
            switch (tokenKind) {
                case SyntaxKind.BarEqualsToken:
                case SyntaxKind.AmpersandEqualsToken:
                case SyntaxKind.CaretEqualsToken:
                case SyntaxKind.LessThanLessThanEqualsToken:
                case SyntaxKind.GreaterThanGreaterThanEqualsToken:
                case SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
                case SyntaxKind.PlusEqualsToken:
                case SyntaxKind.MinusEqualsToken:
                case SyntaxKind.AsteriskEqualsToken:
                case SyntaxKind.SlashEqualsToken:
                case SyntaxKind.PercentEqualsToken:
                case SyntaxKind.EqualsToken:
                    return true;

                default:
                    return false;
            }
        }

        private tryParseAnyArrowFunctionExpression(): IExpressionSyntax {
            if (this.isSimpleArrowFunctionExpression()) {
                return this.parseSimpleArrowFunctionExpression();
            }

            return this.tryParseParenthesizedArrowFunctionExpression();
        }

        private tryParseUnaryExpressionOrHigher(force: boolean): IUnaryExpressionSyntax {
            var currentTokenKind = this.currentToken().kind(); 
            if (SyntaxFacts.isPrefixUnaryExpressionOperatorToken(currentTokenKind)) {
                var operatorKind = SyntaxFacts.getPrefixUnaryExpressionFromOperatorToken(currentTokenKind);

                var operatorToken = this.eatAnyToken();

                var operand = this.tryParseUnaryExpressionOrHigher(/*force:*/ true);
                return new PrefixUnaryExpressionSyntax(operatorKind, operatorToken, operand, this.parseNodeData);
            }
            else if (currentTokenKind === SyntaxKind.TypeOfKeyword) {
                return this.parseTypeOfExpression();
            }
            else if (currentTokenKind === SyntaxKind.VoidKeyword) {
                return this.parseVoidExpression();
            }
            else if (currentTokenKind === SyntaxKind.DeleteKeyword) {
                return this.parseDeleteExpression();
            }
            else if (currentTokenKind === SyntaxKind.LessThanToken) {
                return this.parseCastExpression();
            }
            else {
                return this.tryParsePostfixExpressionOrHigher(force);
            }
        }

        private tryParseBinaryExpressionOrHigher(force: boolean, precedence: BinaryExpressionPrecedence, allowIn: boolean): IExpressionSyntax {
            // The binary expressions are incredibly left recursive in their definitions. We 
            // clearly can't implement that through recursion.  So, instead, we first bottom out 
            // of all the recursion by jumping to this production and consuming a UnaryExpression 
            // first.
            //
            // MultiplicativeExpression: See 11.5 
            //      UnaryExpression 
            var leftOperand = this.tryParseUnaryExpressionOrHigher(force);
            if (leftOperand === null) {
                return null;
            }

            // We then pop up the stack consuming the other side of the binary exprssion if it exists.
            return this.parseBinaryExpressionRest(precedence, allowIn, leftOperand);
        }

        private parseConditionalExpressionRest(allowIn: boolean, leftOperand: IExpressionSyntax): IExpressionSyntax {
            // Note: we are passed in an expression which was produced from parseBinaryExpressionOrHigher.

            var token0 = this.currentToken();
            var token0Kind = token0.kind();

            // Now check for conditional expression.
            if (token0Kind !== SyntaxKind.QuestionToken) {
                return leftOperand;
            }

            var questionToken = this.eatToken(SyntaxKind.QuestionToken);

            // Note: we explicitly do *not* pass 'allowIn' here.  An 'in' expression is always
            // allowed in the 'true' part of a conditional expression.
            var whenTrueExpression = this.tryParseAssignmentExpressionOrHigher(/*force:*/ true, /*allowIn:*/ true);
            var colon = this.eatToken(SyntaxKind.ColonToken);

            var whenFalseExpression = this.tryParseAssignmentExpressionOrHigher(/*force:*/ true, allowIn);
            return new ConditionalExpressionSyntax(leftOperand, questionToken, whenTrueExpression, colon, whenFalseExpression, this.parseNodeData);
        }

        private parseBinaryExpressionRest(precedence: BinaryExpressionPrecedence, allowIn: boolean, leftOperand: IExpressionSyntax): IExpressionSyntax {
            while (true) {
                // We either have a binary operator here, or we're finished.  We call 
                // currentOperatorToken versus currentToken here so that we merge token sequences
                // like > and = into >=
                var operatorToken = this.currentOperatorToken();
                var tokenKind = operatorToken.kind();

                // Only proceed if we see binary expression token.  However we don't parse 
                // assignment expressions or comma expressions here.  Those are taken care of 
                // respectively in parseAssignmentExpression and parseExpression.
                if (!SyntaxFacts.isBinaryExpressionOperatorToken(tokenKind) ||
                    tokenKind === SyntaxKind.CommaToken ||
                    ParserImpl.isAssignmentOperatorToken(tokenKind)) {

                    break;
                }

                // also, if it's the 'in' operator, only allow if our caller allows it.
                if (tokenKind === SyntaxKind.InKeyword && !allowIn) {
                    break;
                }

                var binaryExpressionKind = SyntaxFacts.getBinaryExpressionFromOperatorToken(tokenKind);
                var newPrecedence = ParserImpl.getBinaryExpressionPrecedence(binaryExpressionKind);

                // All binary operators must have precedence > 0
                // Debug.assert(newPrecedence > 0);

                // Check the precedence to see if we should "take" this operator
                if (newPrecedence <= precedence) {
                    break;
                }

                // Precedence is okay, so we'll "take" this operator.
                // Now skip the operator token we're on, or the tokens we merged.
                var skipCount = this.unmergedTokenCount(operatorToken.kind());
                this.moveToNextTokenN(skipCount);

                var rightOperand = this.tryParseBinaryExpressionOrHigher(/*force:*/ true, newPrecedence, allowIn);
                leftOperand = new BinaryExpressionSyntax(binaryExpressionKind, leftOperand, operatorToken, rightOperand, this.parseNodeData);
            }

            return leftOperand;
        }

        private mergeTokensStorage: SyntaxKind[] = [];

        private currentOperatorToken(): ISyntaxToken {
            var token0 = this.currentToken();

            // Only merge if we have a '>' token with no trailing trivia.
            if (token0.kind() === SyntaxKind.GreaterThanToken && !token0.hasTrailingTrivia()) {
                var storage = this.mergeTokensStorage;
                storage[0] = SyntaxKind.None;
                storage[1] = SyntaxKind.None;
                storage[2] = SyntaxKind.None;

                for (var i = 0; i < storage.length; i++) {
                    var nextToken = this.peekToken(i + 1);

                    // We can merge with the next token if it doesn't have any leading trivia.
                    if (!nextToken.hasLeadingTrivia()) {
                        storage[i] = nextToken.kind();
                    }

                    // Stop merging additional tokens if this token has any trailing trivia.
                    if (nextToken.hasTrailingTrivia()) {
                        break;
                    }
                }

                if (storage[0] === SyntaxKind.GreaterThanToken) {
                    if (storage[1] === SyntaxKind.GreaterThanToken) {
                        if (storage[2] === SyntaxKind.EqualsToken) {
                            // >>>=
                            return this.createMergedToken(SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken); 
                        }
                        else {
                            // >>>
                            return this.createMergedToken(SyntaxKind.GreaterThanGreaterThanGreaterThanToken);
                        }
                    }
                    else if (storage[1] === SyntaxKind.EqualsToken) {
                        // >>=
                        return this.createMergedToken(SyntaxKind.GreaterThanGreaterThanEqualsToken);
                    }
                    else {
                        // >>
                        return this.createMergedToken(SyntaxKind.GreaterThanGreaterThanToken);
                    }
                }
                else if (storage[0] === SyntaxKind.EqualsToken) {
                    // >=
                    return this.createMergedToken(SyntaxKind.GreaterThanEqualsToken);
                }
            }

            // Just use the normal logic as we're not merging the token with anything.
            return token0;
        }

        private createMergedToken(kind: SyntaxKind): ISyntaxToken {
            var token0 = this.currentToken();
            var tokenCount = this.unmergedTokenCount(kind);
            var mergedToken = Syntax.token(kind)
                .withLeadingTrivia(token0.leadingTrivia())
                .withTrailingTrivia(this.peekToken(tokenCount - 1).trailingTrivia());

            // We're synthesizing a new operator token.  We need to ensure it starts at 
            // the right position.
            mergedToken.setTextAndFullStart(this.source.text, token0.fullStart());

            return mergedToken;
        }

        private unmergedTokenCount(tokenKind: SyntaxKind): number {
            switch (tokenKind) {
                case SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken: /* >>>= */ return 4;
                case SyntaxKind.GreaterThanGreaterThanGreaterThanToken:       /* >>>  */ return 3;
                case SyntaxKind.GreaterThanGreaterThanEqualsToken:            /* >>=  */ return 3;
                case SyntaxKind.GreaterThanGreaterThanToken:                  /* >>   */ return 2;
                case SyntaxKind.GreaterThanEqualsToken:                       /* >=   */ return 2;
            }

            return 1;
        }

        private tryParseMemberExpressionOrHigher(force: boolean, inObjectCreation: boolean): IMemberExpressionSyntax {
            // Note: to make our lives simpler, we merge the NewExpression production into the
            // MemberExpression construct like so:
            //
            //   MemberExpression : See 11.2 
            //      1) PrimaryExpression 
            //      2) FunctionExpression
            //      3) MemberExpression[Expression]
            //      4) MemberExpression.IdentifierName
            //      5) new MemberExpression Arguments?
            //
            // Technically this is ambiguous.  i.e. CallExpression defines:
            //
            //   CallExpression:
            //      MemberExpression Arguments
            // 
            // If you see: "new Foo()"
            //
            // Then that could be treated as a single ObjectCreationExpression, or it could be 
            // treated as the invocation of "new Foo".  We disambiguate that in code (to match
            // the original grammar) by making sure that if we see an ObjectCreationExpression
            // we always consume arguments if they are there. So we treat "new Foo()" as an
            // object creation only, and not at all as an invocation)  Another way to think 
            // about this is that for every "new" that we see, we will consume an argument
            // list if it is there as part of the associated object creation node.  Any
            // *additional* argument lists we see, will become invocation expressions.
            //
            // Also, for simplicity, we merge FunctionExpression into PrimaryExpression.  There
            // are no other places where these expressions are referred to independently in the
            // grammar.
            //
            // Because MemberExpression is left recursive, we need to bottom out of the recursion
            // immediately.  The two possible bottom out states are 'new' or a primary/function
            // expression.  So we parse those out first.
            var expression: IMemberExpressionSyntax = null;
            if (this.currentToken().kind() === SyntaxKind.NewKeyword) {
                expression = this.parseObjectCreationExpression();
            }
            else {
                expression = this.tryParsePrimaryExpression(force);
                if (expression === null) {
                    return null;
                }
            }
        
            return this.parseMemberExpressionRest(expression, /*inObjectCreation:*/ inObjectCreation); 
        }

        private parseCallExpressionRest(expression: ILeftHandSideExpressionSyntax, inObjectCreation: boolean): ILeftHandSideExpressionSyntax {
            return this.parseCallOrMemberExpressionRest(expression, /*allowArguments:*/ true, inObjectCreation);
        }

        private parseMemberExpressionRest(expression: IMemberExpressionSyntax, inObjectCreation: boolean): IMemberExpressionSyntax {
            return <IMemberExpressionSyntax>this.parseCallOrMemberExpressionRest(expression, /*allowArguments:*/ false, inObjectCreation);
        }

        private parseCallOrMemberExpressionRest(
            expression: ILeftHandSideExpressionSyntax, allowArguments: boolean, inObjectCreation: boolean): ILeftHandSideExpressionSyntax {

            while (true) {
                var currentTokenKind = this.currentToken().kind();

                switch (currentTokenKind) {
                    case SyntaxKind.OpenParenToken:
                        if (!allowArguments) {
                            break;
                        }

                        expression = new InvocationExpressionSyntax(expression, this.parseArgumentList(/*typeArgumentList:*/ null), this.parseNodeData);
                        continue;

                    case SyntaxKind.LessThanToken:
                        if (!allowArguments) {
                            break;
                        }

                        // See if this is the start of a generic invocation.  If so, consume it and
                        // keep checking for postfix expressions.  Otherwise, it's just a '<' that's 
                        // part of an arithmetic expression.  Break out so we consume it higher in the
                        // stack.
                        var argumentList = this.tryParseArgumentList();
                        if (argumentList === null) {
                            break;
                        }

                        expression = new InvocationExpressionSyntax(expression, argumentList, this.parseNodeData);
                        continue;

                    case SyntaxKind.OpenBracketToken:
                        expression = this.parseElementAccessExpression(expression, inObjectCreation);
                        continue;

                    case SyntaxKind.DotToken:
                        expression = new MemberAccessExpressionSyntax(expression, this.eatToken(SyntaxKind.DotToken), this.eatIdentifierNameToken(), this.parseNodeData);
                        continue;
                }

                return expression;
            }
        }

        private tryParseLeftHandSideExpressionOrHigher(force: boolean): ILeftHandSideExpressionSyntax {
            // Original Ecma:
            // LeftHandSideExpression: See 11.2 
            //      NewExpression
            //      CallExpression 
            //
            // Our simplification:
            //
            // LeftHandSideExpression: See 11.2 
            //      MemberExpression  
            //      CallExpression 
            //
            // See comment in parseMemberExpressionOrHigher on how we replaced NewExpression with
            // MemberExpression to make our lives easier.
            //
            // to best understand the below code, it's important to see how CallExpression expands
            // out into its own productions:
            //
            // CallExpression:
            //      MemberExpression Arguments 
            //      CallExpression Arguments
            //      CallExpression[Expression]
            //      CallExpression.IdentifierName
            //      super   (   ArgumentListopt   )
            //      super.IdentifierName
            //
            // Because of the recursion in these calls, we need to bottom out first.  There are two 
            // bottom out states we can run into.  Either we see 'super' which must start either of
            // the last two CallExpression productions.  Or we have a MemberExpression which either
            // completes the LeftHandSideExpression, or starts the beginning of the first four
            // CallExpression productions.

            var expression: ILeftHandSideExpressionSyntax = null;
            if (this.currentToken().kind() === SyntaxKind.SuperKeyword) {
                expression = this.parseSuperExpression();
            }
            else {
                expression = this.tryParseMemberExpressionOrHigher(force, /*inObjectCreation:*/ false);
                if (expression === null) {
                    return null;
                }
            }

            // Now, we *may* be complete.  However, we might have consumed the start of a 
            // CallExpression.  As such, we need to consume the rest of it here to be complete.
            return this.parseCallExpressionRest(expression, /*inObjectCreation:*/ false);
        }

        private parseSuperExpression(): ILeftHandSideExpressionSyntax {
            var expression = this.eatKeyword(SyntaxKind.SuperKeyword);

            // If we have seen "super" it must be followed by '(' or '.'.
            // If it wasn't then just try to parse out a '.' and report an error.
            var currentTokenKind = this.currentToken().kind();
            if (currentTokenKind === SyntaxKind.OpenParenToken || currentTokenKind === SyntaxKind.DotToken) {
                return expression;
            }

            return new MemberAccessExpressionSyntax(expression, this.eatToken(SyntaxKind.DotToken), this.eatIdentifierNameToken(), this.parseNodeData);
        }

        private tryParsePostfixExpressionOrHigher(force: boolean): IPostfixExpressionSyntax {
            var expression = this.tryParseLeftHandSideExpressionOrHigher(force);
            if (expression === null) {
                return null;
            }

            var currentToken = this.currentToken();
            var currentTokenKind = currentToken.kind();

            switch (currentTokenKind) {
                case SyntaxKind.PlusPlusToken:
                case SyntaxKind.MinusMinusToken:
                    // Because of automatic semicolon insertion, we should only consume the ++ or -- 
                    // if it is on the same line as the previous token.
                    if (this.previousTokenHasTrailingNewLine(currentToken)) {
                        break;
                    }

                    return new PostfixUnaryExpressionSyntax(SyntaxFacts.getPostfixUnaryExpressionFromOperatorToken(currentTokenKind), expression, this.eatAnyToken(), this.parseNodeData);
            }

            return expression;
        }

        private tryParseGenericArgumentList(): ArgumentListSyntax {
            // Debug.assert(this.currentToken().kind() === SyntaxKind.LessThanToken);
            // If we have a '<', then only parse this as a arugment list if the type arguments
            // are complete and we have an open paren.  if we don't, rewind and return nothing.
            var rewindPoint = this.getRewindPoint();

            var typeArgumentList = this.tryParseTypeArgumentList(/*inExpression:*/ true);
            var token0 = this.currentToken();

            var isOpenParen = token0.kind() === SyntaxKind.OpenParenToken;
            var isDot = token0.kind() === SyntaxKind.DotToken;
            var isOpenParenOrDot = isOpenParen || isDot;

            var argumentList: ArgumentListSyntax = null;
            if (typeArgumentList === null || !isOpenParenOrDot) {
                // Wasn't generic.  Rewind to where we started so this can be parsed as an 
                // arithmetic expression.
                this.rewind(rewindPoint);
                this.releaseRewindPoint(rewindPoint);
                return null;
            }
            else {
                this.releaseRewindPoint(rewindPoint);
                // It's not uncommon for a user to type: "Foo<T>."
                //
                // This is not legal in typescript (as an parameter list must follow the type
                // arguments).  We want to give a good error message for this as otherwise
                // we'll bail out here and give a poor error message when we try to parse this
                // as an arithmetic expression.
                if (isDot) {
                    // A parameter list must follow a generic type argument list.
                    var diagnostic = new Diagnostic(this.fileName, this.source.text.lineMap(), start(token0), width(token0),
                        DiagnosticCode.A_parameter_list_must_follow_a_generic_type_argument_list_expected, null);
                    this.addDiagnostic(diagnostic);

                    return new ArgumentListSyntax(typeArgumentList,
                        Syntax.emptyToken(SyntaxKind.OpenParenToken), Syntax.emptySeparatedList<IExpressionSyntax>(), Syntax.emptyToken(SyntaxKind.CloseParenToken), this.parseNodeData);
                }
                else {
                    return this.parseArgumentList(typeArgumentList);
                }
            }
        }

        private tryParseArgumentList(): ArgumentListSyntax {
            if (this.currentToken().kind() === SyntaxKind.LessThanToken) {
                return this.tryParseGenericArgumentList();
            }

            if (this.currentToken().kind() === SyntaxKind.OpenParenToken) {
                return this.parseArgumentList(null);
            }

            return null;
        }

        private parseArgumentList(typeArgumentList: TypeArgumentListSyntax): ArgumentListSyntax {
            var openParenToken = this.eatToken(SyntaxKind.OpenParenToken);

            // Don't use the name 'arguments' it prevents V8 from optimizing this method.
            var _arguments = Syntax.emptySeparatedList<IExpressionSyntax>();

            if (openParenToken.fullWidth() > 0) {
                var result = this.parseSeparatedSyntaxList<IExpressionSyntax>(ListParsingState.ArgumentList_AssignmentExpressions);
                _arguments = result.list;
                openParenToken = this.addSkippedTokensAfterToken(openParenToken, result.skippedTokens);
            }

            var closeParenToken = this.eatToken(SyntaxKind.CloseParenToken);

            return new ArgumentListSyntax(typeArgumentList, openParenToken, _arguments, closeParenToken, this.parseNodeData);
        }

        private tryParseArgumentListExpression(): IExpressionSyntax {
            // Generally while parsing lists, we don't want to 'force' the parser to parse
            // the item.  That way, if the expected item isn't htere, we can bail out and
            // move to a higher stage of list parsing.  However, it's extremely common to 
            // see something like "Foo(, a".  in this case, even though there isn't an expression
            // after the open paren, we still want to force parsing an expression (which will
            // cause a missing identiifer to be created), so that we will then consume the
            // comma and the following list items).
            var force = this.currentToken().kind() === SyntaxKind.CommaToken;
            return this.tryParseAssignmentExpressionOrHigher(force, /*allowIn:*/ true);
        }

        private parseElementAccessExpression(expression: ILeftHandSideExpressionSyntax, inObjectCreation: boolean): ElementAccessExpressionSyntax {
            // Debug.assert(this.currentToken().kind() === SyntaxKind.OpenBracketToken);

            var openBracketToken = this.eatToken(SyntaxKind.OpenBracketToken);
            var argumentExpression: IExpressionSyntax;

            // It's not uncommon for a user to write: "new Type[]".  Check for that common pattern
            // and report a better error message.
            if (this.currentToken().kind() === SyntaxKind.CloseBracketToken &&
                inObjectCreation) {

                var start = TypeScript.start(openBracketToken);
                var end = TypeScript.end(this.currentToken());
                var diagnostic = new Diagnostic(this.fileName, this.source.text.lineMap(), start, end - start,
                    DiagnosticCode.new_T_cannot_be_used_to_create_an_array_Use_new_Array_T_instead, null);
                this.addDiagnostic(diagnostic);

                argumentExpression = Syntax.emptyToken(SyntaxKind.IdentifierName);
            }
            else {
                argumentExpression = this.parseExpression(/*allowIn:*/ true);
            }

            var closeBracketToken = this.eatToken(SyntaxKind.CloseBracketToken);

            return new ElementAccessExpressionSyntax(expression, openBracketToken, argumentExpression, closeBracketToken, this.parseNodeData);
        }

        private tryParsePrimaryExpression(force: boolean): IPrimaryExpressionSyntax {
            var currentToken = this.currentToken();

            if (this.isIdentifier(currentToken)) {
                return this.eatIdentifierToken();
            }

            var currentTokenKind = currentToken.kind();
            switch (currentTokenKind) {
                case SyntaxKind.ThisKeyword:
                    return this.parseThisExpression();

                case SyntaxKind.TrueKeyword:
                case SyntaxKind.FalseKeyword:
                    return this.parseLiteralExpression();

                case SyntaxKind.NullKeyword:
                    return this.parseLiteralExpression();

                case SyntaxKind.FunctionKeyword:
                    return this.parseFunctionExpression();

                case SyntaxKind.NumericLiteral:
                    return this.parseLiteralExpression();

                case SyntaxKind.RegularExpressionLiteral:
                    return this.parseLiteralExpression();

                case SyntaxKind.StringLiteral:
                    return this.parseLiteralExpression();

                case SyntaxKind.OpenBracketToken:
                    return this.parseArrayLiteralExpression();

                case SyntaxKind.OpenBraceToken:
                    return this.parseObjectLiteralExpression();

                case SyntaxKind.OpenParenToken:
                    return this.parseParenthesizedExpression();

                case SyntaxKind.SlashToken:
                case SyntaxKind.SlashEqualsToken:
                    // If we see a standalone / or /= and we're expecting a term, then try to reparse
                    // it as a regular expression.  If we succeed, then return that.  Otherwise, fall
                    // back and just return a missing identifier as usual.  We'll then form a binary
                    // expression out of of the / as usual.
                    var result = this.tryReparseDivideAsRegularExpression();
                    return result || this.eatIdentifierToken()
            }

            if (!force) {
                return null;
            }

            // Nothing else worked, just try to consume an identifier so we report an error.
            return this.eatIdentifierToken();
        }

        private tryReparseDivideAsRegularExpression(): IPrimaryExpressionSyntax {
            // If we see a / or /= token, then that may actually be the start of a regex in certain 
            // contexts.

            var currentToken = this.currentToken();
            // Debug.assert(SyntaxFacts.isAnyDivideToken(currentToken.kind()));

            // Ok, from our quick lexical check, this could be a place where a regular expression could
            // go.  Now we have to do a bunch of work.  Ask the source to retrive the token at the 
            // current position again.  But this time allow it to retrieve it as a regular expression.
            currentToken = this.currentTokenAllowingRegularExpression();

            // Note: we *must* have gotten a /, /= or regular expression.  Or else something went *very*
            // wrong with our logic above.
            // Debug.assert(SyntaxFacts.isAnyDivideOrRegularExpressionToken(currentToken.kind()));

            if (currentToken.kind() === SyntaxKind.SlashToken || currentToken.kind() === SyntaxKind.SlashEqualsToken) {
                // Still came back as a / or /=.   This is not a regular expression literal.
                return null;
            }
            else if (currentToken.kind() === SyntaxKind.RegularExpressionLiteral) {
                return this.parseLiteralExpression();
            }
            else {
                // Something *very* wrong happened.  This is an internal parser fault that we need 
                // to figure out and fix.
                throw Errors.invalidOperation();
            }
        }

        private parseTypeOfExpression(): TypeOfExpressionSyntax {
            // Debug.assert(this.currentToken().kind() === SyntaxKind.TypeOfKeyword);

            var typeOfKeyword = this.eatKeyword(SyntaxKind.TypeOfKeyword);
            var expression = this.tryParseUnaryExpressionOrHigher(/*force:*/ true);

            return new TypeOfExpressionSyntax(typeOfKeyword, expression, this.parseNodeData);
        }

        private parseDeleteExpression(): DeleteExpressionSyntax {
            // Debug.assert(this.currentToken().kind() === SyntaxKind.DeleteKeyword);

            var deleteKeyword = this.eatKeyword(SyntaxKind.DeleteKeyword);
            var expression = this.tryParseUnaryExpressionOrHigher(/*force:*/ true);

            return new DeleteExpressionSyntax(deleteKeyword, expression, this.parseNodeData);
        }

        private parseVoidExpression(): VoidExpressionSyntax {
            // Debug.assert(this.currentToken().kind() === SyntaxKind.VoidKeyword);

            var voidKeyword = this.eatKeyword(SyntaxKind.VoidKeyword);
            var expression = this.tryParseUnaryExpressionOrHigher(/*force:*/ true);

            return new VoidExpressionSyntax(voidKeyword, expression, this.parseNodeData);
        }

        private parseFunctionExpression(): FunctionExpressionSyntax {
            // Debug.assert(this.currentToken().kind() === SyntaxKind.FunctionKeyword);

            var functionKeyword = this.eatKeyword(SyntaxKind.FunctionKeyword);
            var identifier: ISyntaxToken = null;

            if (this.isIdentifier(this.currentToken())) {
                identifier = this.eatIdentifierToken();
            }

            var callSignature = this.parseCallSignature(/*requireCompleteTypeParameterList:*/ false);
            var block = this.parseBlock(/*parseStatementsEvenWithNoOpenBrace:*/ false, /*checkForStrictMode:*/ true);

            return new FunctionExpressionSyntax(functionKeyword, identifier, callSignature, block, this.parseNodeData);
        }

        private parseObjectCreationExpression(): ObjectCreationExpressionSyntax {
            // ObjectCreationExpression
            //      new MemberExpression Arguments?
            //
            // Note: if we see arguments we absolutely take them and attach them tightly to this
            // object creation expression.
            //
            // See comment in tryParseMemberExpressionOrHigher for a more complete explanation of
            // this decision.

            // Debug.assert(this.currentToken().kind() === SyntaxKind.NewKeyword);
            var newKeyword = this.eatKeyword(SyntaxKind.NewKeyword);

            var expression = this.tryParseMemberExpressionOrHigher(/*force:*/ true, /*inObjectCreation:*/ true);

            var argumentList = this.tryParseArgumentList();

            return new ObjectCreationExpressionSyntax(newKeyword, expression, argumentList, this.parseNodeData);
        }

        private parseCastExpression(): CastExpressionSyntax {
            // Debug.assert(this.currentToken().kind() === SyntaxKind.LessThanToken);

            var lessThanToken = this.eatToken(SyntaxKind.LessThanToken);
            var type = this.parseType();
            var greaterThanToken = this.eatToken(SyntaxKind.GreaterThanToken);
            var expression = this.tryParseUnaryExpressionOrHigher(/*force:*/ true);

            return new CastExpressionSyntax(lessThanToken, type, greaterThanToken, expression, this.parseNodeData);
        }

        private parseParenthesizedExpression(): ParenthesizedExpressionSyntax {
            var openParenToken = this.eatToken(SyntaxKind.OpenParenToken);
            var expression = this.parseExpression(/*allowIn:*/ true);
            var closeParenToken = this.eatToken(SyntaxKind.CloseParenToken);

            return new ParenthesizedExpressionSyntax(openParenToken, expression, closeParenToken, this.parseNodeData);
        }

        private tryParseParenthesizedArrowFunctionExpression(): ParenthesizedArrowFunctionExpressionSyntax {
            var tokenKind = this.currentToken().kind();
            if (tokenKind !== SyntaxKind.OpenParenToken && tokenKind !== SyntaxKind.LessThanToken) {
                return null;
            }

            // Because arrow functions and parenthesized expressions look similar, we have to check far
            // enough ahead to be sure we've actually got an arrow function. For example, both nodes can
            // start with:
            //    (a = b, c = d, ..., e = f).
            //So we effectively need infinite lookahead to decide which node we're in.
            //
            // First, check for things that definitely have enough information to let us know it's an
            // arrow function.

            if (this.isDefinitelyArrowFunctionExpression()) {
                // We have something like "() =>" or "(a) =>".  Definitely a lambda, so parse it
                // unilaterally as such.
                return this.tryParseParenthesizedArrowFunctionExpressionWorker(/*requiresArrow:*/ false);
            }

            // Now, look for cases where we're sure it's not an arrow function.  This will help save us
            // a costly parse.
            if (!this.isPossiblyArrowFunctionExpression()) {
                return null;
            }

            // Then, try to actually parse it as a arrow function, and only return if we see an => 
            var rewindPoint = this.getRewindPoint();

            var arrowFunction = this.tryParseParenthesizedArrowFunctionExpressionWorker(/*requiresArrow:*/ true);
            if (arrowFunction === null) {
                this.rewind(rewindPoint);
            }

            this.releaseRewindPoint(rewindPoint);
            return arrowFunction;
        }

        private tryParseParenthesizedArrowFunctionExpressionWorker(requireArrow: boolean): ParenthesizedArrowFunctionExpressionSyntax {
            var currentToken = this.currentToken();
            // Debug.assert(currentToken.kind() === SyntaxKind.OpenParenToken || currentToken.kind() === SyntaxKind.LessThanToken);

            var callSignature = this.parseCallSignature(/*requireCompleteTypeParameterList:*/ true);

            if (requireArrow && this.currentToken().kind() !== SyntaxKind.EqualsGreaterThanToken) {
                return null;
            }

            var equalsGreaterThanToken = this.eatToken(SyntaxKind.EqualsGreaterThanToken);

            var block = this.tryParseArrowFunctionBlock();
            var expression: IExpressionSyntax = null;
            if (block === null) {
                expression = this.tryParseAssignmentExpressionOrHigher(/*force:*/ true, /*allowIn:*/ true);
            }

            return new ParenthesizedArrowFunctionExpressionSyntax(callSignature, equalsGreaterThanToken, block, expression, this.parseNodeData);
        }

        private tryParseArrowFunctionBlock(): BlockSyntax {
            if (this.isBlock()) {
                return this.parseBlock(/*parseStatementsEvenWithNoOpenBrace:*/ false, /*checkForStrictMode:*/ false);
            }
            else {
                // We didn't have a block.  However, we may be in an error situation.  For example,
                // if the user wrote:
                //
                //  a => 
                //      var v = 0;
                //  }
                //
                // (i.e. they're missing the open brace).  See if that's the case so we can try to 
                // recover better.  If we don't do this, then the next close curly we see may end
                // up preemptively closing the containing construct.
                if (this.isStatement(/*inErrorRecovery:*/ false) &&
                    !this.isExpressionStatement(this.currentToken()) &&
                    !this.isFunctionDeclaration()) {
                    // We've seen a statement (and it isn't an expressionStatement like 'foo()'), 
                    // so treat this like a block with a missing open brace.
                    return this.parseBlock(/*parseStatementsEvenWithNoOpenBrace:*/ true, /*checkForStrictMode:*/ false);
                }
                else {
                    return null;
                }
            }
        }

        private isSimpleArrowFunctionExpression(): boolean {
            // ERROR RECOVERY TWEAK:
            // If we see a standalone => try to parse it as an arrow function as that's likely what
            // the user intended to write.
            if (this.currentToken().kind() === SyntaxKind.EqualsGreaterThanToken) {
                return true;
            }

            return this.isIdentifier(this.currentToken()) &&
                   this.peekToken(1).kind() === SyntaxKind.EqualsGreaterThanToken;
        }

        private parseSimpleArrowFunctionExpression(): SimpleArrowFunctionExpressionSyntax {
            // Debug.assert(this.isSimpleArrowFunctionExpression());

            var identifier = this.eatIdentifierToken();
            var equalsGreaterThanToken = this.eatToken(SyntaxKind.EqualsGreaterThanToken);

            var block = this.tryParseArrowFunctionBlock();
            var expression: IExpressionSyntax = null;
            if (block === null) {
                expression = this.tryParseAssignmentExpressionOrHigher(/*force:*/ true, /*allowIn:*/ true);
            }

            return new SimpleArrowFunctionExpressionSyntax(identifier, equalsGreaterThanToken, block, expression, this.parseNodeData);
        }

        private isBlock(): boolean {
            return this.currentToken().kind() === SyntaxKind.OpenBraceToken;
        }

        private isDefinitelyArrowFunctionExpression(): boolean {
            var token0 = this.currentToken();
            if (token0.kind() !== SyntaxKind.OpenParenToken) {
                // If it didn't start with an (, then it could be generic.  That's too complicated 
                // and we can't say it's 'definitely' an arrow function.             
                return false;
            }

            var token1 = this.peekToken(1);
            var token2: ISyntaxToken;

            if (token1.kind() === SyntaxKind.CloseParenToken) {
                // ()
                // Definitely an arrow function.  Could never be a parenthesized expression.  
                // *However*, because of error situations, we could end up with things like "().foo".
                // In this case, we don't want to think of this as the start of an arrow function.
                // To prevent this, we are a little stricter, and we require that we at least see:
                //      "():"  or  "() =>"  or "() {}".  Note: the last one is illegal.  However it
                // most likely is a missing => and not a parenthesized expression.
                token2 = this.peekToken(2);
                return token2.kind() === SyntaxKind.ColonToken ||
                       token2.kind() === SyntaxKind.EqualsGreaterThanToken ||
                       token2.kind() === SyntaxKind.OpenBraceToken;
            }

            if (token1.kind() === SyntaxKind.DotDotDotToken) {
                // (...
                // Definitely an arrow function.  Could never be a parenthesized expression.
                return true;
            }

            token2 = this.peekToken(2);
            if (token1.kind() === SyntaxKind.PublicKeyword || token1.kind() === SyntaxKind.PrivateKeyword) {
                if (this.isIdentifier(token2)) {
                    // "(public id" or "(private id".  Definitely an arrow function.  Could never 
                    // be a parenthesized expression.  Note: this will be an *illegal* arrow 
                    // function (as accessibility modifiers are not allowed in it).  However, that
                    // will be reported by the grammar checker walker.
                    return true;
                }
            }

            if (!this.isIdentifier(token1)) {
                // All other arrow functions must start with (id
                // so this is definitely not an arrow function.
                return false;
            }

            // (id
            //
            // Lots of options here.  Check for things that make us certain it's an
            // arrow function.
            if (token2.kind() === SyntaxKind.ColonToken) {
                // (id:
                // Definitely an arrow function.  Could never be a parenthesized expression.
                return true;
            }

            var token3 = this.peekToken(3);
            if (token2.kind() === SyntaxKind.QuestionToken) {
                // (id?
                // Could be an arrow function, or a parenthesized conditional expression.

                // Check for the things that could only be arrow functions.
                if (token3.kind() === SyntaxKind.ColonToken ||
                    token3.kind() === SyntaxKind.CloseParenToken ||
                    token3.kind() === SyntaxKind.CommaToken) {
                    // (id?:
                    // (id?)
                    // (id?,
                    // These are the only cases where this could be an arrow function.
                    // And none of them can be parenthesized expression.
                    return true;
                }
            }

            if (token2.kind() === SyntaxKind.CloseParenToken) {
                // (id)
                // Could be an arrow function, or a parenthesized conditional expression.

                if (token3.kind() === SyntaxKind.EqualsGreaterThanToken) {
                    // (id) =>
                    // Definitely an arrow function.  Could not be a parenthesized expression.
                    return true;
                }

                // Note: "(id):" *looks* like it could be an arrow function.  However, it could
                // show up in:  "foo ? (id): 
                // So we can't return true here for that case.
            }

            // TODO: Add more cases if you're sure that there is enough information to know to 
            // parse this as an arrow function.  Note: be very careful here.

            // Anything else wasn't clear enough.  Try to parse the expression as an arrow function and bail out
            // if we fail.
            return false;
        }

        private isPossiblyArrowFunctionExpression(): boolean {
            var token0 = this.currentToken();
            if (token0.kind() !== SyntaxKind.OpenParenToken) {
                // If it didn't start with an (, then it could be generic.  That's too complicated 
                // and we have to say it's possibly an arrow function.
                return true;
            }

            var token1 = this.peekToken(1);

            if (!this.isIdentifier(token1)) {
                // All other arrow functions must start with (id
                // so this is definitely not an arrow function.
                return false;
            }

            var token2 = this.peekToken(2);
            if (token2.kind() === SyntaxKind.EqualsToken) {
                // (id =
                //
                // This *could* be an arrow function.  i.e. (id = 0) => { }
                // Or it could be a parenthesized expression.  So we'll have to actually
                // try to parse it.
                return true;
            }

            if (token2.kind() === SyntaxKind.CommaToken) {
                // (id,

                // This *could* be an arrow function.  i.e. (id, id2) => { }
                // Or it could be a parenthesized expression (as javascript supports
                // the comma operator).  So we'll have to actually try to parse it.
                return true;
            }

            if (token2.kind() === SyntaxKind.CloseParenToken) {
                // (id)

                var token3 = this.peekToken(3);
                if (token3.kind() === SyntaxKind.ColonToken) {
                    // (id):
                    //
                    // This could be an arrow function. i.e. (id): number => { }
                    // Or it could be parenthesized exprssion: foo ? (id) :
                    // So we'll have to actually try to parse it.
                    return true;
                }
            }

            // Nothing else could be an arrow function.
            return false;
        }

        private parseObjectLiteralExpression(): ObjectLiteralExpressionSyntax {
            // Debug.assert(this.currentToken().kind() === SyntaxKind.OpenBraceToken);

            var openBraceToken = this.eatToken(SyntaxKind.OpenBraceToken);
            // Debug.assert(openBraceToken.fullWidth() > 0);

            var result = this.parseSeparatedSyntaxList<IPropertyAssignmentSyntax>(ListParsingState.ObjectLiteralExpression_PropertyAssignments);
            var propertyAssignments = result.list;
            openBraceToken = this.addSkippedTokensAfterToken(openBraceToken, result.skippedTokens);

            var closeBraceToken = this.eatToken(SyntaxKind.CloseBraceToken);

            return new ObjectLiteralExpressionSyntax(openBraceToken, propertyAssignments, closeBraceToken, this.parseNodeData);
        }

        private tryParsePropertyAssignment(inErrorRecovery: boolean): IPropertyAssignmentSyntax {
            // Debug.assert(this.isPropertyAssignment(/*inErrorRecovery:*/ false));

            if (this.isAccessor(inErrorRecovery)) {
                return this.parseAccessor(/*checkForStrictMode:*/ true);
            }
            else if (this.isFunctionPropertyAssignment(inErrorRecovery)) {
                return this.parseFunctionPropertyAssignment();
            }
            else if (this.isSimplePropertyAssignment(inErrorRecovery)) {
                return this.parseSimplePropertyAssignment();
            }
            else {
                return null;
            }
        }

        private isPropertyAssignment(inErrorRecovery: boolean): boolean {
            return this.isAccessor(inErrorRecovery) ||
                   this.isFunctionPropertyAssignment(inErrorRecovery) ||
                   this.isSimplePropertyAssignment(inErrorRecovery);
        }

        private eatPropertyName(): ISyntaxToken {
            var currentToken = this.currentToken();
            if (SyntaxFacts.isIdentifierNameOrAnyKeyword(currentToken)) {
                return this.eatIdentifierNameToken();
            }

            Debug.assert(this.isPropertyName(currentToken, false));
            this.moveToNextToken();
            return currentToken;
        }

        private isFunctionPropertyAssignment(inErrorRecovery: boolean): boolean {
            return this.isPropertyName(this.currentToken(), inErrorRecovery) &&
                   this.isCallSignature(/*index:*/ 1);
        }

        private parseFunctionPropertyAssignment(): FunctionPropertyAssignmentSyntax {
            // Debug.assert(this.isFunctionPropertyAssignment(/*inErrorRecovery:*/ false));

            var propertyName = this.eatPropertyName();
            var callSignature = this.parseCallSignature(/*requireCompleteTypeParameterList:*/ false);
            var block = this.parseBlock(/*parseBlockEvenWithNoOpenBrace:*/ false, /*checkForStrictMode:*/ true);

            return new FunctionPropertyAssignmentSyntax(propertyName, callSignature, block, this.parseNodeData);
        }

        private isSimplePropertyAssignment(inErrorRecovery: boolean): boolean {
            return this.isPropertyName(this.currentToken(), inErrorRecovery);
        }

        private parseSimplePropertyAssignment(): SimplePropertyAssignmentSyntax {
            // Debug.assert(this.isSimplePropertyAssignment(/*inErrorRecovery:*/ false));

            var propertyName = this.eatPropertyName();
            var colonToken = this.eatToken(SyntaxKind.ColonToken);
            var expression = this.tryParseAssignmentExpressionOrHigher(/*force:*/ true, /*allowIn:*/ true);

            return new SimplePropertyAssignmentSyntax(propertyName, colonToken, expression, this.parseNodeData);
        }

        private isPropertyName(token: ISyntaxToken, inErrorRecovery: boolean): boolean {
            // NOTE: we do *not* want to check "this.isIdentifier" here.  Any IdentifierName is 
            // allowed here, even reserved words like keywords.
            if (SyntaxFacts.isIdentifierNameOrAnyKeyword(token)) {
                // Except: if we're in error recovery, then we don't want to consider keywords. 
                // After all, if we have:
                //
                //      { a: 1
                //      return
                //
                // we don't want consider 'return' to be the next property in the object literal.
                if (inErrorRecovery) {
                    return this.isIdentifier(token);
                }
                else {
                    return true;
                }
            }

            switch (token.kind()) {
                case SyntaxKind.StringLiteral:
                case SyntaxKind.NumericLiteral:
                    return true;

                default:
                    return false;
            }
        }

        private parseArrayLiteralExpression(): ArrayLiteralExpressionSyntax {
            // Debug.assert(this.currentToken().kind() === SyntaxKind.OpenBracketToken);

            var openBracketToken = this.eatToken(SyntaxKind.OpenBracketToken);
            // Debug.assert(openBracketToken.fullWidth() > 0);

            var result = this.parseSeparatedSyntaxList<IExpressionSyntax>(ListParsingState.ArrayLiteralExpression_AssignmentExpressions);
            var expressions = result.list;
            openBracketToken = this.addSkippedTokensAfterToken(openBracketToken, result.skippedTokens);

            var closeBracketToken = this.eatToken(SyntaxKind.CloseBracketToken);

            return new ArrayLiteralExpressionSyntax(openBracketToken, expressions, closeBracketToken, this.parseNodeData);
        }

        private parseLiteralExpression(): IPrimaryExpressionSyntax {
            // TODO: add appropriate asserts here.
            return this.eatAnyToken();
        }

        private parseThisExpression(): IPrimaryExpressionSyntax {
            // Debug.assert(this.currentToken().kind() === SyntaxKind.ThisKeyword);
            return this.eatKeyword(SyntaxKind.ThisKeyword);
        }

        private parseBlock(parseBlockEvenWithNoOpenBrace: boolean, checkForStrictMode: boolean): BlockSyntax {
            var openBraceToken = this.eatToken(SyntaxKind.OpenBraceToken);

            var statements = Syntax.emptyList<IStatementSyntax>();

            if (parseBlockEvenWithNoOpenBrace || openBraceToken.fullWidth() > 0) {
                var savedIsInStrictMode = this.isInStrictMode;
                
                var processItems = checkForStrictMode ? ParserImpl.updateStrictModeState : null;
                var result = this.parseSyntaxList<IStatementSyntax>(ListParsingState.Block_Statements, processItems);
                statements = result.list;
                openBraceToken = this.addSkippedTokensAfterToken(openBraceToken, result.skippedTokens);

                this.setStrictMode(savedIsInStrictMode);
            }

            var closeBraceToken = this.eatToken(SyntaxKind.CloseBraceToken);

            return new BlockSyntax(openBraceToken, statements, closeBraceToken, this.parseNodeData);
        }

        private parseCallSignature(requireCompleteTypeParameterList: boolean): CallSignatureSyntax {
            var typeParameterList = this.tryParseTypeParameterList(requireCompleteTypeParameterList);
            var parameterList = this.parseParameterList();
            var typeAnnotation = this.parseOptionalTypeAnnotation(/*allowStringLiteral:*/ false);

            return new CallSignatureSyntax(typeParameterList, parameterList, typeAnnotation, this.parseNodeData);
        }

        private tryParseTypeParameterList(requireCompleteTypeParameterList: boolean): TypeParameterListSyntax {
            if (this.currentToken().kind() !== SyntaxKind.LessThanToken) {
                return null;
            }

            var rewindPoint = this.getRewindPoint();

            var lessThanToken = this.eatToken(SyntaxKind.LessThanToken);
            // Debug.assert(lessThanToken.fullWidth() > 0);

            var result = this.parseSeparatedSyntaxList<TypeParameterSyntax>(ListParsingState.TypeParameterList_TypeParameters);
            var typeParameters = result.list;
            lessThanToken = this.addSkippedTokensAfterToken(lessThanToken, result.skippedTokens);

            var greaterThanToken = this.eatToken(SyntaxKind.GreaterThanToken);

            // return null if we were required to have a '>' token and we did not  have one.
            if (requireCompleteTypeParameterList && greaterThanToken.fullWidth() === 0) {
                this.rewind(rewindPoint);
                this.releaseRewindPoint(rewindPoint);
                return null;
            }
            else {
                this.releaseRewindPoint(rewindPoint);
                var typeParameterList = new TypeParameterListSyntax(lessThanToken, typeParameters, greaterThanToken, this.parseNodeData);

                return typeParameterList;
            }
        }

        private isTypeParameter(): boolean {
            return this.isIdentifier(this.currentToken());
        }

        private parseTypeParameter(): TypeParameterSyntax {
            return this.tryParseTypeParameter() || new TypeParameterSyntax(this.eatIdentifierToken(), null, this.parseNodeData);
        }

        private tryParseTypeParameter(): TypeParameterSyntax {
            // Debug.assert(this.isTypeParameter());
            if (!this.isIdentifier(this.currentToken())) {
                return null;
            }

            var identifier = this.eatIdentifierToken();
            var constraint = this.tryParseConstraint();

            return new TypeParameterSyntax(identifier, constraint, this.parseNodeData);
        }

        private tryParseConstraint(): ConstraintSyntax {
            if (this.currentToken().kind() !== SyntaxKind.ExtendsKeyword) {
                return null;
            }

            var extendsKeyword = this.eatKeyword(SyntaxKind.ExtendsKeyword);
            var type = this.parseType();

            return new ConstraintSyntax(extendsKeyword, type, this.parseNodeData);
        }

        private parseParameterList(): ParameterListSyntax {
            var openParenToken = this.eatToken(SyntaxKind.OpenParenToken);
            var parameters = Syntax.emptySeparatedList<ParameterSyntax>();

            if (openParenToken.fullWidth() > 0) {
                var result = this.parseSeparatedSyntaxList<ParameterSyntax>(ListParsingState.ParameterList_Parameters);
                parameters = result.list;
                openParenToken = this.addSkippedTokensAfterToken(openParenToken, result.skippedTokens);
            }

            var closeParenToken = this.eatToken(SyntaxKind.CloseParenToken);
            return new ParameterListSyntax(openParenToken, parameters, closeParenToken, this.parseNodeData);
        }

        private isTypeAnnotation(): boolean {
            return this.currentToken().kind() === SyntaxKind.ColonToken;
        }

        private parseOptionalTypeAnnotation(allowStringLiteral: boolean): TypeAnnotationSyntax {
            return this.isTypeAnnotation()
                ? this.parseTypeAnnotation(allowStringLiteral)
                : null;
        }

        private parseTypeAnnotation(allowStringLiteral: boolean): TypeAnnotationSyntax {
            // Debug.assert(this.isTypeAnnotation());

            var colonToken = this.eatToken(SyntaxKind.ColonToken);
            var type = allowStringLiteral && this.currentToken().kind() === SyntaxKind.StringLiteral
                ? this.eatToken(SyntaxKind.StringLiteral)
                : this.parseType();

            return new TypeAnnotationSyntax(colonToken, type, this.parseNodeData);
        }

        private isType(): boolean {
            var currentToken = this.currentToken();
            var currentTokenKind = currentToken.kind();

            switch (currentTokenKind) {
                // TypeQuery
                case SyntaxKind.TypeOfKeyword:

                // Pedefined types:
                case SyntaxKind.AnyKeyword:
                case SyntaxKind.NumberKeyword:
                case SyntaxKind.BooleanKeyword:
                case SyntaxKind.StringKeyword:
                case SyntaxKind.VoidKeyword:

                // Object type
                case SyntaxKind.OpenBraceToken:

                // Function type:
                case SyntaxKind.OpenParenToken:
                case SyntaxKind.LessThanToken:

                // Constructor type:
                case SyntaxKind.NewKeyword:
                    return true;
            }

            // Name
            return this.isIdentifier(currentToken);
        }

        private parseType(): ITypeSyntax {
            return this.tryParseType() || this.eatIdentifierToken();
        }

        private tryParseType(): ITypeSyntax {
            var type = this.tryParseNonArrayType();
            if (type === null) {
                return null;
            }

            while (this.currentToken().kind() === SyntaxKind.OpenBracketToken) {
                var openBracketToken = this.eatToken(SyntaxKind.OpenBracketToken);
                var closeBracketToken = this.eatToken(SyntaxKind.CloseBracketToken);

                type = new ArrayTypeSyntax(type, openBracketToken, closeBracketToken, this.parseNodeData);
            }

            return type;
        }

        private isTypeQuery(): boolean {
            return this.currentToken().kind() === SyntaxKind.TypeOfKeyword;
        }

        private parseTypeQuery(): TypeQuerySyntax {
            // Debug.assert(this.isTypeQuery());
            var typeOfKeyword = this.eatToken(SyntaxKind.TypeOfKeyword);
            var name = this.parseName();

            return new TypeQuerySyntax(typeOfKeyword, name, this.parseNodeData);
        }

        private tryParseNonArrayType(): ITypeSyntax {
            var currentToken = this.currentToken();
            switch (currentToken.kind()) {
                // Pedefined types:
                case SyntaxKind.AnyKeyword:
                case SyntaxKind.NumberKeyword:
                case SyntaxKind.BooleanKeyword:
                case SyntaxKind.StringKeyword:
                case SyntaxKind.VoidKeyword:
                    this.moveToNextToken();
                    return currentToken;

                // Object type
                case SyntaxKind.OpenBraceToken:
                    return this.parseObjectType();

                // Function type:
                case SyntaxKind.OpenParenToken:
                case SyntaxKind.LessThanToken:
                    return this.parseFunctionType();

                // Constructor type:
                case SyntaxKind.NewKeyword:
                    return this.parseConstructorType();

                case SyntaxKind.TypeOfKeyword:
                    return this.parseTypeQuery();
            }

            return this.tryParseNameOrGenericType();
        }

        private tryParseNameOrGenericType(): ITypeSyntax {
            var name = this.tryParseName();
            if (name === null) {
                return null;
            }

            var typeArgumentList = this.tryParseTypeArgumentList(/*inExpression:*/ false);

            return typeArgumentList === null
                ? name
                : new GenericTypeSyntax(name, typeArgumentList, this.parseNodeData);
        }

        private parseFunctionType(): FunctionTypeSyntax {
            // Debug.assert(this.isFunctionType());

            var typeParameterList = this.tryParseTypeParameterList(/*requireCompleteTypeParameterList:*/ false);
            var parameterList = this.parseParameterList();
            var equalsGreaterThanToken = this.eatToken(SyntaxKind.EqualsGreaterThanToken);
            var returnType = this.parseType();

            return new FunctionTypeSyntax(typeParameterList, parameterList, equalsGreaterThanToken, returnType, this.parseNodeData);
        }

        private parseConstructorType(): ConstructorTypeSyntax {
            // Debug.assert(this.isConstructorType());

            var newKeyword = this.eatKeyword(SyntaxKind.NewKeyword);
            var typeParameterList = this.tryParseTypeParameterList(/*requireCompleteTypeParameterList:*/ false);
            var parameterList = this.parseParameterList();
            var equalsGreaterThanToken = this.eatToken(SyntaxKind.EqualsGreaterThanToken);
            var type = this.parseType();

            return new ConstructorTypeSyntax(newKeyword, typeParameterList, parameterList, equalsGreaterThanToken, type, this.parseNodeData);
        }

        private isParameter(): boolean {
            if (this.currentNode() !== null && this.currentNode().kind() === SyntaxKind.Parameter) {
                return true;
            }

            var token = this.currentToken();
            var tokenKind = token.kind();
            if (tokenKind === SyntaxKind.DotDotDotToken) {
                return true;
            }

            if (ParserImpl.isModifier(token) && !this.isModifierUsedAsParameterIdentifier(token)) {
                return true;
            }

            return this.isIdentifier(token);
        }

        // Modifiers are perfectly legal names for parameters.  i.e.  you can have: foo(public: number) { }
        // Most of the time we want to treat the modifier as a modifier.  However, if we're certain 
        // it's a parameter identifier, then don't consider it as a modifier.
        private isModifierUsedAsParameterIdentifier(token: ISyntaxToken): boolean {
            if (this.isIdentifier(token)) {
                // Check for:
                // foo(public)
                // foo(public: ...
                // foo(public= ...
                // foo(public, ...
                // foo(public? ...
                //
                // In all these cases, it's not actually a modifier, but is instead the identifier.
                // In any other case treat it as the modifier.
                var nextTokenKind = this.peekToken(1).kind();
                switch (nextTokenKind) {
                    case SyntaxKind.CloseParenToken:
                    case SyntaxKind.ColonToken:
                    case SyntaxKind.EqualsToken:
                    case SyntaxKind.CommaToken:
                    case SyntaxKind.QuestionToken:
                        return true;
                }
            }

            return false;
        }

        private parseParameter(): ParameterSyntax {
            return this.tryParseParameter() || new ParameterSyntax(
                /*dotDotDotToken:*/ null, Syntax.emptyList<ISyntaxToken>(), this.eatIdentifierToken(),
                /*questionToken:*/ null, /*typeAnnotation:*/ null, /*equalsValueClause:*/ null, this.parseNodeData);
        }

        private tryParseParameter(): ParameterSyntax {
            var node = this.currentNode();
            if (node !== null && node.kind() === SyntaxKind.Parameter) {
                this.moveToNextNode();
                return <ParameterSyntax>node;
            }

            var dotDotDotToken = this.tryEatToken(SyntaxKind.DotDotDotToken);

            var modifierArray: ISyntaxToken[] = getArray();

            while (true) {
                var currentToken = this.currentToken();
                if (ParserImpl.isModifier(currentToken) && !this.isModifierUsedAsParameterIdentifier(currentToken)) {
                    modifierArray.push(this.eatAnyToken());
                    continue;
                }

                break;
            }

            var modifiers = Syntax.list(modifierArray);
            returnZeroLengthArray(modifierArray);

            // If we're not forcing, and we don't see anything to indicate this is a parameter, then 
            // bail out.
            if (!this.isIdentifier(this.currentToken()) && dotDotDotToken === null && modifiers.length === 0) {
                return null;
            }

            var identifier = this.eatIdentifierToken();
            var questionToken = this.tryEatToken(SyntaxKind.QuestionToken);
            var typeAnnotation = this.parseOptionalTypeAnnotation(/*allowStringLiteral:*/ true);

            var equalsValueClause: EqualsValueClauseSyntax = null;
            if (this.isEqualsValueClause(/*inParameter*/ true)) {
                equalsValueClause = this.parseEqualsValueClause(/*allowIn:*/ true);
            }

            return new ParameterSyntax(dotDotDotToken, modifiers, identifier, questionToken, typeAnnotation, equalsValueClause, this.parseNodeData);
        }

        private parseSyntaxList<T extends ISyntaxNodeOrToken>(
                currentListType: ListParsingState,
                processItems: (parser: ParserImpl, items: any[]) => void = null): { skippedTokens: ISyntaxToken[]; list: T[]; } {
            var savedListParsingState = this.listParsingState;
            this.listParsingState |= currentListType;

            var result = this.parseSyntaxListWorker<T>(currentListType, processItems);

            this.listParsingState = savedListParsingState;

            return result;
        }

        private parseSeparatedSyntaxList<T extends ISyntaxNodeOrToken>(currentListType: ListParsingState): { skippedTokens: ISyntaxToken[]; list: T[]; } {
            var savedListParsingState = this.listParsingState;
            this.listParsingState |= currentListType;

            var result = this.parseSeparatedSyntaxListWorker<T>(currentListType);

            this.listParsingState = savedListParsingState;

            return result;
        }

        // Returns true if we should abort parsing.
        private abortParsingListOrMoveToNextToken<T extends ISyntaxNodeOrToken>(
                currentListType: ListParsingState,
                nodes: T[],
                separators: ISyntaxToken[],
                skippedTokens: ISyntaxToken[]): boolean {
            // Ok.  We're at a token that is not a terminator for the list and wasn't the start of 
            // an item in the list. Definitely report an error for this token.
            this.reportUnexpectedTokenDiagnostic(currentListType);

            // Now, check if the token is a terminator for one our parent lists, or the start of an
            // item in one of our parent lists.  If so, we won't want to consume the token.  We've 
            // already reported the error, so just return to our caller so that a higher up 
            // production can consume it.
            for (var state = ListParsingState.LastListParsingState;
                 state >= ListParsingState.FirstListParsingState;
                 state >>= 1) {

                if ((this.listParsingState & state) !== 0) {
                    if (this.isExpectedListTerminator(state) || this.isExpectedListItem(state, /*inErrorRecovery:*/ true)) {
                        // Abort parsing this list.
                        return true;
                    }
                }
            }

            // Otherwise, if none of the lists we're in can capture this token, then we need to 
            // unilaterally skip it.  Note: we've already reported an error above.
            var skippedToken = this.currentToken();

            // Consume this token and move onto the next item in the list.
            this.moveToNextToken();

            this.addSkippedTokenToList(nodes, separators, skippedTokens, skippedToken);

            // Continue parsing this list.  Attach this token to whatever we've seen already.
            return false;
        }
        
        private addSkippedTokenToList<T extends ISyntaxNodeOrToken>(
                nodes: T[],
                separators: ISyntaxToken[],
                skippedTokens: ISyntaxToken[],
                skippedToken: ISyntaxToken): void {
            // Now, add this skipped token to the last item we successfully parsed in the list.  Or
            // add it to the list of skipped tokens if we haven't parsed anything.  Our caller will
            // have to deal with them.

            var length = nodes.length + (separators ? separators.length : 0);

            for (var i = length - 1; i >= 0; i--) {
                var array: ISyntaxNodeOrToken[] = separators && (i % 2 === 1) ? separators : nodes;
                var arrayIndex = separators ? IntegerUtilities.integerDivide(i, 2) : i;

                var item = array[arrayIndex];
                var _lastToken = lastToken(item);
                if (_lastToken && _lastToken.fullWidth() > 0) {
                    array[arrayIndex] = <T>this.addSkippedTokenAfterNodeOrToken(item, skippedToken);
                    return;
                }
            }

            // Didn't have anything in the list we could add to.  Add to the skipped items array
            // for our caller to handle.
            skippedTokens.push(skippedToken);
        }

        private tryParseExpectedListItem(currentListType: ListParsingState,
                                         inErrorRecovery: boolean,
                                         items: ISyntaxElement[],
                                         processItems: (parser: ParserImpl, items: any[]) => void): void {
            var item = this.tryParseExpectedListItemWorker(currentListType, inErrorRecovery);

            if (item !== null) {
                // Debug.assert(item !== null);

                items.push(item);

                if (processItems !== null) {
                    processItems(this, items);
                }
            }
        }

        private listIsTerminated(currentListType: ListParsingState): boolean {
            return this.isExpectedListTerminator(currentListType) ||
                   this.currentToken().kind() === SyntaxKind.EndOfFileToken;
        }

        private parseSyntaxListWorker<T extends ISyntaxNodeOrToken>(
                currentListType: ListParsingState,
                processItems: (parser: ParserImpl, items: any[]) => void ): { skippedTokens: ISyntaxToken[]; list: T[]; } {
            var items: T[] = getArray();
            var skippedTokens: ISyntaxToken[] = getArray();

            while (true) {
                // Try to parse an item of the list.  If we fail then decide if we need to abort or 
                // continue parsing.
                var oldItemsCount = items.length;
                this.tryParseExpectedListItem(currentListType, /*inErrorRecovery:*/ false, items, processItems);

                var newItemsCount = items.length;
                if (newItemsCount === oldItemsCount) {
                    // We weren't able to parse out a list element.

                    // That may have been because the list is complete.  In that case, break out 
                    // and return the items we were able parse.
                    if (this.listIsTerminated(currentListType)) {
                        break;
                    }

                    // List wasn't complete and we didn't get an item.  Figure out if we should bail out
                    // or skip a token and continue.
                    var abort = this.abortParsingListOrMoveToNextToken(currentListType, items, null, skippedTokens);
                    if (abort) {
                        break;
                    }
                }

                // We either parsed an element.  Or we failed to, but weren't at the end of the list
                // and didn't want to abort. Continue parsing elements.
            }

            var result = Syntax.list<T>(items);

            // Can't return if it has more then 1 element.  In that case, the list will have been
            // copied into the SyntaxList.
            returnZeroLengthArray(items);

            return { skippedTokens: skippedTokens, list: result };
        }

        private parseSeparatedSyntaxListWorker<T extends ISyntaxNodeOrToken>(currentListType: ListParsingState): { skippedTokens: ISyntaxToken[]; list: T[]; } {
            var nodes: T[] = getArray();
            var separators: ISyntaxToken[] = getArray();
            var skippedTokens: ISyntaxToken[] = getArray();

            Debug.assert(nodes.length === 0);
            Debug.assert(separators.length === 0);
            Debug.assert(skippedTokens.length === 0);
            Debug.assert(<any>skippedTokens !== nodes);
            Debug.assert(skippedTokens !== separators);
            Debug.assert(<any>nodes !== separators);

            var separatorKind = this.separatorKind(currentListType);
            var allowAutomaticSemicolonInsertion = separatorKind === SyntaxKind.SemicolonToken;

            var inErrorRecovery = false;
            var listWasTerminated = false;
            while (true) {
                // Try to parse an item of the list.  If we fail then decide if we need to abort or 
                // continue parsing.
                var oldItemsCount = nodes.length;
                // Debug.assert(oldItemsCount % 2 === 0);
                this.tryParseExpectedListItem(currentListType, inErrorRecovery, nodes, null);
                
                var newItemsCount = nodes.length;
                if (newItemsCount === oldItemsCount) {
                    // We weren't able to parse out a list element.
                    // Debug.assert(items === null || items.length % 2 === 0);
                    
                    // That may have been because the list is complete.  In that case, break out 
                    // and return the items we were able parse.
                    if (this.listIsTerminated(currentListType)) {
                        listWasTerminated = true;
                        break;
                    }
                    
                    // List wasn't complete and we didn't get an item.  Figure out if we should bail out
                    // or skip a token and continue.
                    var abort = this.abortParsingListOrMoveToNextToken(currentListType, nodes, separators, skippedTokens);
                    if (abort) {
                        break;
                    }
                    else {
                        // We just skipped a token.  We're now in error recovery mode.
                        inErrorRecovery = true;
                        continue;
                    }
                }

                // Debug.assert(newItemsCount % 2 === 1);

                // We were able to successfully parse out a list item.  So we're no longer in error
                // recovery.
                inErrorRecovery = false;

                // Now, we have to see if we have a separator or not.  If we do have a separator
                // we've got to consume it and continue trying to parse list items.  Note: we always
                // allow 'comma' as a separator (for error tolerance).  We will later do a post pass
                // to report when a comma was used improperly in a list that needed semicolons.
                var currentToken = this.currentToken();
                if (currentToken.kind() === separatorKind || currentToken.kind() === SyntaxKind.CommaToken) {
                    // Consume the last separator and continue parsing list elements.
                    separators.push(this.eatAnyToken());
                    continue;
                }

                // We didn't see the expected separator.  There are two reasons this might happen.
                // First, we may actually be at the end of the list.  If we are, then we're done
                // parsing list elements.  
                if (this.listIsTerminated(currentListType)) {
                    listWasTerminated = true;
                    break;
                }

                // Otherwise, it might be a case where we can parse out an implicit semicolon.

                // Note: it's important that we check this *after* the check above for
                // 'listIsTerminated'.  Consider the following case:
                //
                //      {
                //          a       // <-- just finished parsing 'a'
                //      }
                //
                // Automatic semicolon insertion rules state: "When, as the program is parsed from
                // left to right, a token (called the offending token) is encountered that is not 
                // allowed by any production of the grammar".  So we should only ever insert a 
                // semicolon if we couldn't consume something normally.  in the above case, we can
                // consume the '}' just fine.  So ASI doesn't apply.

                if (allowAutomaticSemicolonInsertion && this.canEatAutomaticSemicolon(/*allowWithoutNewline:*/ false)) {
                    var semicolonToken = this.eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false) || Syntax.emptyToken(SyntaxKind.SemicolonToken);
                    separators.push(semicolonToken);
                    // Debug.assert(items.length % 2 === 0);
                    continue;
                }

                // We weren't at the end of the list.  And thre was no separator we could parse out.
                // Try parse the separator we expected, and continue parsing more list elements.
                // This time mark that we're in error recovery mode though.
                //
                // Note: trying to eat this token will emit the appropriate diagnostic.
                separators.push(this.eatToken(separatorKind));

                // Now that we're in 'error recovery' mode we cantweak some parsing rules as 
                // appropriate.  For example, if we have:
                //
                //      var v = { a
                //      return
                //
                // Then we'll be missing the comma.  As such, we want to parse 'return' in a less
                // tolerant manner.  Normally 'return' could be a property in an object literal.
                // However, in error recovery mode, we do *not* want it to be.
                //
                // Continue trying to parse out list elements.
                inErrorRecovery = true;
            }

            var result = Syntax.separatedList<T>(nodes, separators);

            // Can't return if it has more then 0 elements.  In that case, the list will have been
            // copied into the SyntaxList.
            returnZeroLengthArray(nodes);
            returnZeroLengthArray(separators);

            return { skippedTokens: skippedTokens, list: result };
        }

        private separatorKind(currentListType: ListParsingState): SyntaxKind {
            switch (currentListType) {
                case ListParsingState.HeritageClause_TypeNameList:
                case ListParsingState.ArgumentList_AssignmentExpressions:
                case ListParsingState.EnumDeclaration_EnumElements:
                case ListParsingState.VariableDeclaration_VariableDeclarators_AllowIn:
                case ListParsingState.VariableDeclaration_VariableDeclarators_DisallowIn:
                case ListParsingState.ObjectLiteralExpression_PropertyAssignments:
                case ListParsingState.ParameterList_Parameters:
                case ListParsingState.ArrayLiteralExpression_AssignmentExpressions:
                case ListParsingState.TypeArgumentList_Types:
                case ListParsingState.TypeParameterList_TypeParameters:
                    return SyntaxKind.CommaToken;

                case ListParsingState.ObjectType_TypeMembers:
                    return SyntaxKind.SemicolonToken;

                case ListParsingState.SourceUnit_ModuleElements:
                case ListParsingState.ClassOrInterfaceDeclaration_HeritageClauses:
                case ListParsingState.ClassDeclaration_ClassElements:
                case ListParsingState.ModuleDeclaration_ModuleElements:
                case ListParsingState.SwitchStatement_SwitchClauses:
                case ListParsingState.SwitchClause_Statements:
                case ListParsingState.Block_Statements:
                default:
                    throw Errors.notYetImplemented();
            }
        }

        private reportUnexpectedTokenDiagnostic(listType: ListParsingState): void {
            var token = this.currentToken();

            var diagnostic = new Diagnostic(this.fileName, this.source.text.lineMap(),
                start(token), width(token), DiagnosticCode.Unexpected_token_0_expected, [this.getExpectedListElementType(listType)]);
            this.addDiagnostic(diagnostic);
        }

        private addDiagnostic(diagnostic: Diagnostic): void {
            // Except: if we already have a diagnostic for this position, don't report another one.
            if (this.diagnostics.length > 0 &&
                this.diagnostics[this.diagnostics.length - 1].start() === diagnostic.start()) {
                return;
            }

            this.diagnostics.push(diagnostic);
        }

        private isExpectedListTerminator(currentListType: ListParsingState): boolean {
            switch (currentListType) {
                case ListParsingState.SourceUnit_ModuleElements:
                    return this.isExpectedSourceUnit_ModuleElementsTerminator();

                case ListParsingState.ClassOrInterfaceDeclaration_HeritageClauses:
                    return this.isExpectedClassOrInterfaceDeclaration_HeritageClausesTerminator();

                case ListParsingState.ClassDeclaration_ClassElements:
                    return this.isExpectedClassDeclaration_ClassElementsTerminator();

                case ListParsingState.ModuleDeclaration_ModuleElements:
                    return this.isExpectedModuleDeclaration_ModuleElementsTerminator();

                case ListParsingState.SwitchStatement_SwitchClauses:
                    return this.isExpectedSwitchStatement_SwitchClausesTerminator();

                case ListParsingState.SwitchClause_Statements:
                    return this.isExpectedSwitchClause_StatementsTerminator();

                case ListParsingState.Block_Statements:
                    return this.isExpectedBlock_StatementsTerminator();

                case ListParsingState.TryBlock_Statements:
                    return this.isExpectedTryBlock_StatementsTerminator();

                case ListParsingState.CatchBlock_Statements:
                    return this.isExpectedCatchBlock_StatementsTerminator();

                case ListParsingState.EnumDeclaration_EnumElements:
                    return this.isExpectedEnumDeclaration_EnumElementsTerminator();

                case ListParsingState.ObjectType_TypeMembers:
                    return this.isExpectedObjectType_TypeMembersTerminator();

                case ListParsingState.ArgumentList_AssignmentExpressions:
                    return this.isExpectedArgumentList_AssignmentExpressionsTerminator();

                case ListParsingState.HeritageClause_TypeNameList:
                    return this.isExpectedHeritageClause_TypeNameListTerminator();

                case ListParsingState.VariableDeclaration_VariableDeclarators_AllowIn:
                    return this.isExpectedVariableDeclaration_VariableDeclarators_AllowInTerminator();

                case ListParsingState.VariableDeclaration_VariableDeclarators_DisallowIn:
                    return this.isExpectedVariableDeclaration_VariableDeclarators_DisallowInTerminator();

                case ListParsingState.ObjectLiteralExpression_PropertyAssignments:
                    return this.isExpectedObjectLiteralExpression_PropertyAssignmentsTerminator();

                case ListParsingState.ParameterList_Parameters:
                    return this.isExpectedParameterList_ParametersTerminator();

                case ListParsingState.TypeArgumentList_Types:
                    return this.isExpectedTypeArgumentList_TypesTerminator();

                case ListParsingState.TypeParameterList_TypeParameters:
                    return this.isExpectedTypeParameterList_TypeParametersTerminator();

                case ListParsingState.ArrayLiteralExpression_AssignmentExpressions:
                    return this.isExpectedLiteralExpression_AssignmentExpressionsTerminator();

                default:
                    throw Errors.invalidOperation();
            }
        }

        private isExpectedSourceUnit_ModuleElementsTerminator(): boolean {
            return this.currentToken().kind() === SyntaxKind.EndOfFileToken;
        }

        private isExpectedEnumDeclaration_EnumElementsTerminator(): boolean {
            return this.currentToken().kind() === SyntaxKind.CloseBraceToken;
        }

        private isExpectedModuleDeclaration_ModuleElementsTerminator(): boolean {
            return this.currentToken().kind() === SyntaxKind.CloseBraceToken;
        }

        private isExpectedObjectType_TypeMembersTerminator(): boolean {
            return this.currentToken().kind() === SyntaxKind.CloseBraceToken;
        }

        private isExpectedObjectLiteralExpression_PropertyAssignmentsTerminator(): boolean {
            return this.currentToken().kind() === SyntaxKind.CloseBraceToken;
        }

        private isExpectedLiteralExpression_AssignmentExpressionsTerminator(): boolean {
            return this.currentToken().kind() === SyntaxKind.CloseBracketToken;
        }

        private isExpectedTypeArgumentList_TypesTerminator(): boolean {
            var token = this.currentToken();
            if (token.kind() === SyntaxKind.GreaterThanToken) {
                return true;
            }

            // If we're at a token that can follow the type argument list, then we'll also consider
            // the list terminated.
            if (this.canFollowTypeArgumentListInExpression(token.kind())) {
                return true;
            }

            // TODO: add more cases as necessary for error tolerance.
            return false;
        }

        private isExpectedTypeParameterList_TypeParametersTerminator(): boolean {
            var token = this.currentToken();
            if (token.kind() === SyntaxKind.GreaterThanToken) {
                return true;
            }

            // These commonly follow type parameter lists.
            if (token.kind() === SyntaxKind.OpenParenToken ||
                token.kind() === SyntaxKind.OpenBraceToken ||
                token.kind() === SyntaxKind.ExtendsKeyword ||
                token.kind() === SyntaxKind.ImplementsKeyword) {
                return true;
            }

            // TODO: add more cases as necessary for error tolerance.
            return false;
        }

        private isExpectedParameterList_ParametersTerminator(): boolean {
            var token = this.currentToken();
            if (token.kind() === SyntaxKind.CloseParenToken) {
                return true;
            }

            // We may also see a { in an error case.  i.e.:
            // function (a, b, c  {
            if (token.kind() === SyntaxKind.OpenBraceToken) {
                return true;
            }

            // We may also see a => in an error case.  i.e.:
            // (f: number => { ... }
            if (token.kind() === SyntaxKind.EqualsGreaterThanToken) {
                return true;
            }

            return false;
        }

        private isExpectedVariableDeclaration_VariableDeclarators_DisallowInTerminator(): boolean {
            // This is the case when we're parsing variable declarations in a for/for-in statement.
            if (this.currentToken().kind() === SyntaxKind.SemicolonToken ||
                this.currentToken().kind() === SyntaxKind.CloseParenToken) {
                return true;
            }

            if (this.currentToken().kind() === SyntaxKind.InKeyword) {
                return true;
            }

            return false;
        }

        private isExpectedVariableDeclaration_VariableDeclarators_AllowInTerminator(): boolean {
            //// This is the case when we're parsing variable declarations in a variable statement.

            // ERROR RECOVERY TWEAK:
            // For better error recovery, if we see a => then we just stop immediately.  We've got an
            // arrow function here and it's going to be very unlikely that we'll resynchronize and get
            // another variable declaration.
            if (this.currentToken().kind() === SyntaxKind.EqualsGreaterThanToken) {
                return true;
            }

            // We're done when we can eat a semicolon.
            return this.canEatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false);
        }

        private isExpectedClassOrInterfaceDeclaration_HeritageClausesTerminator(): boolean {
            var token0 = this.currentToken();
            if (token0.kind() === SyntaxKind.OpenBraceToken ||
                token0.kind() === SyntaxKind.CloseBraceToken) {
                return true;
            }

            return false;
        }

        private isExpectedHeritageClause_TypeNameListTerminator(): boolean {
            var token0 = this.currentToken();
            if (token0.kind() === SyntaxKind.ExtendsKeyword ||
                token0.kind() === SyntaxKind.ImplementsKeyword) {
                return true;
            }

            if (this.isExpectedClassOrInterfaceDeclaration_HeritageClausesTerminator()) {
                return true;
            }

            return false;
        }

        private isExpectedArgumentList_AssignmentExpressionsTerminator(): boolean {
            var token0 = this.currentToken();
            return token0.kind() === SyntaxKind.CloseParenToken ||
                   token0.kind() === SyntaxKind.SemicolonToken;
        }

        private isExpectedClassDeclaration_ClassElementsTerminator(): boolean {
            return this.currentToken().kind() === SyntaxKind.CloseBraceToken;
        }

        private isExpectedSwitchStatement_SwitchClausesTerminator(): boolean {
            return this.currentToken().kind() === SyntaxKind.CloseBraceToken;
        }

        private isExpectedSwitchClause_StatementsTerminator(): boolean {
            return this.currentToken().kind() === SyntaxKind.CloseBraceToken ||
                   this.isSwitchClause();
        }

        private isExpectedBlock_StatementsTerminator(): boolean {
            return this.currentToken().kind() === SyntaxKind.CloseBraceToken;
        }

        private isExpectedTryBlock_StatementsTerminator(): boolean {
            return this.currentToken().kind() === SyntaxKind.CatchKeyword ||
                   this.currentToken().kind() === SyntaxKind.FinallyKeyword;
        }

        private isExpectedCatchBlock_StatementsTerminator(): boolean {
            return this.currentToken().kind() === SyntaxKind.FinallyKeyword;
        }

        private isExpectedListItem(currentListType: ListParsingState, inErrorRecovery: boolean): any {
            switch (currentListType) {
                case ListParsingState.SourceUnit_ModuleElements:
                    return this.isModuleElement(inErrorRecovery);

                case ListParsingState.ClassOrInterfaceDeclaration_HeritageClauses:
                    return this.isHeritageClause();

                case ListParsingState.ClassDeclaration_ClassElements:
                    return this.isClassElement(inErrorRecovery);

                case ListParsingState.ModuleDeclaration_ModuleElements:
                    return this.isModuleElement(inErrorRecovery);

                case ListParsingState.SwitchStatement_SwitchClauses:
                    return this.isSwitchClause();

                case ListParsingState.SwitchClause_Statements:
                    return this.isStatement(inErrorRecovery);

                case ListParsingState.Block_Statements:
                    return this.isStatement(inErrorRecovery);

                case ListParsingState.TryBlock_Statements:
                case ListParsingState.CatchBlock_Statements:
                    // These two are special.  They're just augmentations of "Block_Statements" 
                    // used so we can abort out of the try block if we see a 'catch' or 'finally'
                    // keyword.  There are no additional list items that they add, so we just
                    // return 'false' here.
                    return false;

                case ListParsingState.EnumDeclaration_EnumElements:
                    return this.isEnumElement(inErrorRecovery);
                
                case ListParsingState.VariableDeclaration_VariableDeclarators_AllowIn:
                case ListParsingState.VariableDeclaration_VariableDeclarators_DisallowIn:
                    return this.isVariableDeclarator();

                case ListParsingState.ObjectType_TypeMembers:
                    return this.isTypeMember(inErrorRecovery);

                case ListParsingState.ArgumentList_AssignmentExpressions:
                    return this.isExpectedArgumentList_AssignmentExpression();

                case ListParsingState.HeritageClause_TypeNameList:
                    return this.isHeritageClauseTypeName();

                case ListParsingState.ObjectLiteralExpression_PropertyAssignments:
                    return this.isPropertyAssignment(inErrorRecovery);

                case ListParsingState.ParameterList_Parameters:
                    return this.isParameter();

                case ListParsingState.TypeArgumentList_Types:
                    return this.isType();

                case ListParsingState.TypeParameterList_TypeParameters:
                    return this.isTypeParameter();

                case ListParsingState.ArrayLiteralExpression_AssignmentExpressions:
                    return this.isAssignmentOrOmittedExpression();

                default:
                    throw Errors.invalidOperation();
            }
        }

        private isExpectedArgumentList_AssignmentExpression(): boolean {
            var currentToken = this.currentToken();
            if (this.isExpression(currentToken)) {
                return true;
            }

            // If we're on a comma then the user has written something like "Foo(a,," or "Foo(,".
            // Instead of skipping the comma, create an empty expression to go before the comma 
            // so that the tree is more well formed and doesn't have skipped tokens.
            if (currentToken.kind() === SyntaxKind.CommaToken) {
                return true;
            }

            return false;
        }

        private tryParseExpectedListItemWorker(currentListType: ListParsingState, inErrorRecovery: boolean): ISyntaxNodeOrToken {
            switch (currentListType) {
                case ListParsingState.SourceUnit_ModuleElements:
                    return this.tryParseModuleElement(inErrorRecovery);

                case ListParsingState.ClassOrInterfaceDeclaration_HeritageClauses:
                    return this.tryParseHeritageClause();

                case ListParsingState.ClassDeclaration_ClassElements:
                    return this.tryParseClassElement(inErrorRecovery);

                case ListParsingState.ModuleDeclaration_ModuleElements:
                    return this.tryParseModuleElement(inErrorRecovery);

                case ListParsingState.SwitchStatement_SwitchClauses:
                    return this.tryParseSwitchClause();

                case ListParsingState.SwitchClause_Statements:
                    return this.tryParseStatement(inErrorRecovery);

                case ListParsingState.Block_Statements:
                    return this.tryParseStatement(inErrorRecovery);

                case ListParsingState.EnumDeclaration_EnumElements:
                    return this.tryParseEnumElement(inErrorRecovery);

                case ListParsingState.ObjectType_TypeMembers:
                    return this.tryParseTypeMember(inErrorRecovery);

                case ListParsingState.ArgumentList_AssignmentExpressions:
                    return this.tryParseArgumentListExpression();

                case ListParsingState.HeritageClause_TypeNameList:
                    return this.tryParseHeritageClauseTypeName();

                case ListParsingState.VariableDeclaration_VariableDeclarators_AllowIn:
                    return this.tryParseVariableDeclarator(/*allowIn:*/ true, /*allowIdentifierName:*/ false);

                case ListParsingState.VariableDeclaration_VariableDeclarators_DisallowIn:
                    return this.tryParseVariableDeclarator(/*allowIn:*/ false, /*allowIdentifierName:*/ false);

                case ListParsingState.ObjectLiteralExpression_PropertyAssignments:
                    return this.tryParsePropertyAssignment(inErrorRecovery);

                case ListParsingState.ArrayLiteralExpression_AssignmentExpressions:
                    return this.tryParseAssignmentOrOmittedExpression();

                case ListParsingState.ParameterList_Parameters:
                    return this.tryParseParameter();

                case ListParsingState.TypeArgumentList_Types:
                    return this.tryParseType();

                case ListParsingState.TypeParameterList_TypeParameters:
                    return this.tryParseTypeParameter();

                default:
                    throw Errors.invalidOperation();
            }
        }

        private getExpectedListElementType(currentListType: ListParsingState): string {
            switch (currentListType) {
                case ListParsingState.SourceUnit_ModuleElements:
                    return getLocalizedText(DiagnosticCode.module_class_interface_enum_import_or_statement, null);

                case ListParsingState.ClassOrInterfaceDeclaration_HeritageClauses:
                    return '{';

                case ListParsingState.ClassDeclaration_ClassElements:
                    return getLocalizedText(DiagnosticCode.constructor_function_accessor_or_variable, null);

                case ListParsingState.ModuleDeclaration_ModuleElements:
                    return getLocalizedText(DiagnosticCode.module_class_interface_enum_import_or_statement, null);

                case ListParsingState.SwitchStatement_SwitchClauses:
                    return getLocalizedText(DiagnosticCode.case_or_default_clause, null);

                case ListParsingState.SwitchClause_Statements:
                    return getLocalizedText(DiagnosticCode.statement, null);

                case ListParsingState.Block_Statements:
                    return getLocalizedText(DiagnosticCode.statement, null);

                case ListParsingState.VariableDeclaration_VariableDeclarators_AllowIn:
                case ListParsingState.VariableDeclaration_VariableDeclarators_DisallowIn:
                    return getLocalizedText(DiagnosticCode.identifier, null);

                case ListParsingState.EnumDeclaration_EnumElements:
                    return getLocalizedText(DiagnosticCode.identifier, null);

                case ListParsingState.ObjectType_TypeMembers:
                    return getLocalizedText(DiagnosticCode.call_construct_index_property_or_function_signature, null);

                case ListParsingState.ArgumentList_AssignmentExpressions:
                    return getLocalizedText(DiagnosticCode.expression, null);

                case ListParsingState.HeritageClause_TypeNameList:
                    return getLocalizedText(DiagnosticCode.type_name, null);

                case ListParsingState.ObjectLiteralExpression_PropertyAssignments:
                    return getLocalizedText(DiagnosticCode.property_or_accessor, null);

                case ListParsingState.ParameterList_Parameters:
                    return getLocalizedText(DiagnosticCode.parameter, null);

                case ListParsingState.TypeArgumentList_Types:
                    return getLocalizedText(DiagnosticCode.type, null);

                case ListParsingState.TypeParameterList_TypeParameters:
                    return getLocalizedText(DiagnosticCode.type_parameter, null);

                case ListParsingState.ArrayLiteralExpression_AssignmentExpressions:
                    return getLocalizedText(DiagnosticCode.expression, null);

                default:
                    throw Errors.invalidOperation();
            }
        }
    }

    export function parse(fileName: string,
                          text: ISimpleText,
                          isDeclaration: boolean,
                          options: ParseOptions): SyntaxTree {
        var source = new NormalParserSource(fileName, options.languageVersion(), text);

        return new ParserImpl(fileName, source, options).parseSyntaxTree(isDeclaration);
    }

    export function incrementalParse(oldSyntaxTree: SyntaxTree,
                                     textChangeRange: TextChangeRange,
                                     newText: ISimpleText): SyntaxTree {
        if (textChangeRange.isUnchanged()) {
            return oldSyntaxTree;
        }

        var source = new IncrementalParserSource(oldSyntaxTree, textChangeRange, newText);

        return new ParserImpl(oldSyntaxTree.fileName(), source, oldSyntaxTree.parseOptions()).parseSyntaxTree(oldSyntaxTree.isDeclaration());
    }
}