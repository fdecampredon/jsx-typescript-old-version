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
            // Debug.assert(this.currentPieceIndex === -1);
            for (var i = 0, n = other.pieces.length; i < n; i++) {
                var piece = other.pieces[i];

                if (piece.element === null) {
                    break;
                }

                this.pushElement(piece.element, piece.indexInParent);
            }

            // Debug.assert(this.currentPieceIndex === other.currentPieceIndex);
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

        public currentNode(): ISyntaxNode {
            var element = this.currentNodeOrToken();
            return isNode(element) ? <ISyntaxNode>element : null;
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
            // Debug.assert(isNode(nodeOrToken));

            // Either the node has some existent child, then move to it.  if it doesn't, then it's
            // an empty node.  Conceptually the first child of an empty node is really just the 
            // next sibling of the empty node.
            for (var i = 0, n = childCount(nodeOrToken); i < n; i++) {
                var child = childAt(nodeOrToken, i);
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

            // Debug.assert(fullWidth(nodeOrToken) === 0);
            this.moveToNextSibling();
        }

        public moveToNextSibling(): void {
            while (!this.isFinished()) {
                // first look to our parent and see if it has a sibling of us that we can move to.
                var currentPiece = this.pieces[this.currentPieceIndex];
                var parent = currentPiece.element.parent;

                // We start searching at the index one past our own index in the parent.
                for (var i = currentPiece.indexInParent + 1, n = childCount(parent); i < n; i++) {
                    var sibling = childAt(parent, i);

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
                // Debug.assert(childCount(element) > 0);

                this.pushElement(childAt(element, 0), /*indexInParent:*/ 0);
            }
        }

        public pushElement(element: ISyntaxElement, indexInParent: number): void {
            // Debug.assert(element !== null);
            // Debug.assert(indexInParent >= 0);
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

                // Debug.assert(isToken(element));
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

        // The current syntax node the source is pointing at.  Only available in incremental settings.
        // The source can point at a node if that node doesn't intersect any of the text changes in
        // the file, and doesn't contain certain unacceptable constructs.  For example, if the node
        // contains skipped text, then it will not be reused.
        currentNode(): ISyntaxNode;

        // The current token the source is pointing at.
        currentToken(): ISyntaxToken;

        // The current token reinterpretted contextually based on where the parser is.  If the
        // source is on a / or /= token, then it can be reinterpretted as a regex token.  If the
        // source is on a > token, it may be reinterpretted to: >>  >>>  >=  >>=  >>>=
        currentContextualToken(): ISyntaxToken;

        // Peek any number of tokens ahead from the current location in source.  peekToken(0) is
        // equivalent to 'currentToken', peekToken(1) is the next token, peekToken(2) the token
        // after that, etc.  If the caller peeks past the end of the text, then EndOfFile tokens
        // will be returned.
        peekToken(n: number): ISyntaxToken;

        // Called to move the source to the next node or token once the parser has consumed the 
        // current one.
        consumeNode(node: ISyntaxNode): void;
        consumeToken(token: ISyntaxToken): void;

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

        release(): void;
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

        public release() {
            this.slidingWindow = null;
            this.scanner = null;
            this._tokenDiagnostics = [];
            this.rewindPointPool = [];
            this.lastDiagnostic = null;
            this.reportDiagnostic = null;
        }

        constructor(private fileName: string,
                    languageVersion: LanguageVersion,
                    public text: ISimpleText) {
            this.slidingWindow = new SlidingWindow(this, ArrayUtilities.createArray(/*defaultWindowSize:*/ 1024, null), null);
            this.scanner = createScanner(languageVersion, text, this.reportDiagnostic);
        }

        public currentNode(): ISyntaxNode {
            // The normal parser source never returns nodes.  They're only returned by the 
            // incremental parser source.
            return null;
        }

        public consumeNode(node: ISyntaxNode): void {
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

        public fetchNextItem(allowContextualToken: boolean): ISyntaxToken {
            // Assert disabled because it is actually expensive enugh to affect perf.
            // Debug.assert(spaceAvailable > 0);
            var token = this.scanner.scan(allowContextualToken);

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

        public consumeToken(token: ISyntaxToken): void {
            // Debug.assert(this.currentToken() === token);
            this._absolutePosition += token.fullWidth();

            this.slidingWindow.moveToNextItem();
        }

        public currentToken(): ISyntaxToken {
            return this.slidingWindow.currentItem(/*allowContextualToken:*/ false);
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

        public currentContextualToken(): ISyntaxToken {
            // We better be on a / or > token right now.
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
            var token = this.slidingWindow.currentItem(/*allowContextualToken:*/ true);

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

        public release() {
            this._normalParserSource.release();
            this._normalParserSource = null;
            this._oldSourceUnitCursor = null;
        }

        constructor(oldSyntaxTree: SyntaxTree, textChangeRange: TextChangeRange, public text: ISimpleText) {
            var newText = text;

            var oldSourceUnit = oldSyntaxTree.sourceUnit();
            this._oldSourceUnitCursor = getSyntaxCursor();

            // Start the cursor pointing at the first element in the source unit (if it exists).
            if (oldSourceUnit.moduleElements.length > 0) {
                this._oldSourceUnitCursor.pushElement(childAt(oldSourceUnit.moduleElements, 0), /*indexInParent:*/ 0);
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
            this._normalParserSource = new NormalParserSource(oldSyntaxTree.fileName(), oldSyntaxTree.languageVersion(), text);
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
                var token = findToken(sourceUnit, start);

                // Debug.assert(token.kind !== SyntaxKind.None);
                // Debug.assert(token.kind() === SyntaxKind.EndOfFileToken || token.fullWidth() > 0);

                var position = token.fullStart();

                start = MathPrototype.max(0, position - 1);
            }

            var finalSpan = TextSpan.fromBounds(start, changeRange.span().end());
            var finalLength = changeRange.newLength() + (changeRange.span().start() - start);

            return new TextChangeRange(finalSpan, finalLength);
        }

        private absolutePosition() {
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

        public currentNode(): ISyntaxNode {
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

        public currentContextualToken(): ISyntaxToken {
            // Just delegate to the underlying source to handle this.
            return this._normalParserSource.currentContextualToken();
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

        private tryGetNodeFromOldSourceUnit(): ISyntaxNode {
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
            //  d) it is not a contextual parser token.
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
                    if (!token.isIncrementallyUnusable() && !isContextualToken(token)) {

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

        public consumeNode(node: ISyntaxNode): void {
            // A node could have only come from the old source unit cursor.  Update it and our 
            // current state.
            // Debug.assert(this._changeDelta === 0);
            // Debug.assert(this.currentNode() === node);

            this._oldSourceUnitCursor.moveToNextSibling();

            // Update the underlying source with where it should now be currently pointin.
            var absolutePosition = this.absolutePosition() + fullWidth(node);
            this._normalParserSource.resetToPosition(absolutePosition);

            // Debug.assert(previousToken !== null);
            // Debug.assert(previousToken.width() > 0);

            //if (!this.isPastChangeRange()) {
            //    // If we still have a change range, then this node must have ended before the 
            //    // change range starts.  Thus, we don't need to call 'skipPastChanges'.
            //    Debug.assert(this.absolutePosition() < this._changeRange.span().start());
            //}
        }

        public consumeToken(currentToken: ISyntaxToken): void {
            // This token may have come from the old source unit, or from the new text.  Handle
            // both accordingly.

            if (this._oldSourceUnitCursor.currentToken() === currentToken) {
                // The token came from the old source unit.  So our tree and text must be in sync.
                // Debug.assert(this._changeDelta === 0);

                // Move the cursor past this token.
                this._oldSourceUnitCursor.moveToNextSibling();

                // Debug.assert(!this._normalParserSource.isPinned());
                
                // Update the underlying source with where it should now be currently pointing. We 
                // don't need to do this when the token came from the new text as the source will
                // automatically be placed in the right position.
                var absolutePosition = this.absolutePosition() + currentToken.fullWidth();
                this._normalParserSource.resetToPosition(absolutePosition);

                // Debug.assert(previousToken !== null);
                // Debug.assert(previousToken.width() > 0);

                //if (!this.isPastChangeRange()) {
                //    // If we still have a change range, then this token must have ended before the 
                //    // change range starts.  Thus, we don't need to call 'skipPastChanges'.
                //    Debug.assert(this.absolutePosition() < this._changeRange.span().start());
                //}
            }
            else {
                // the token came from the new text.  That means the normal source moved forward,
                // while the syntax cursor stayed in the same place.  Thus our delta moves even 
                // further back.
                this._changeDelta -= currentToken.fullWidth();

                // Move our underlying source forward.
                this._normalParserSource.consumeToken(currentToken);

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

    interface IParser {
        parseSyntaxTree(fileName: string, source: IParserSource, languageVersion: LanguageVersion, isDeclaration: boolean): SyntaxTree;
    }

    // Contains the actual logic to parse typescript/javascript.  This is the code that generally
    // represents the logic necessary to handle all the language grammar constructs.  When the 
    // language changes, this should generally only be the place necessary to fix up.
    function createParser(): IParser {
        // Name of the file we're parsing.
        var fileName: string;

        // Underlying source where we pull nodes and tokens from.
        var source: IParserSource;

        var languageVersion: LanguageVersion;

        // TODO: do we need to store/restore this when speculative parsing?  I don't think so.  The
        // parsing logic already handles storing/restoring this and should work properly even if we're
        // speculative parsing.
        var listParsingState: ListParsingState = 0;

        // Whether or not we are in strict parsing mode.  All that changes in strict parsing mode is
        // that some tokens that would be considered identifiers may be considered keywords.  When 
        // rewinding, we need to store and restore this as the mode may have changed.
        //
        // TODO: do we need to store/restore this when speculative parsing?  I don't think so.  The
        // parsing logic already handles storing/restoring this and should work properly even if we're
        // speculative parsing.
        var isInStrictMode: boolean = false;

        // Current state of the parser.  If we need to rewind we will store and reset these values as
        // appropriate.

        // Diagnostics created when parsing invalid code.  Any diagnosics created when speculative 
        // parsing need to removed when rewinding.  To do this we store the count of diagnostics when 
        // we start speculative parsing.  And if we rewind, we restore this to the same count that we 
        // started at.
        var diagnostics: Diagnostic[] = [];

        var parseNodeData: number = 0;

        function parseSyntaxTree(_fileName: string, _source: IParserSource, _languageVersion: LanguageVersion, isDeclaration: boolean): SyntaxTree {
            // First, set up our state.
            fileName = _fileName;
            source = _source;
            languageVersion = _languageVersion;

            // Now actually parse the tree.
            var result = parseSyntaxTreeWorker(isDeclaration);

            // Now, clear out our state so that our singleton parser doesn't keep things alive.
            diagnostics = [];
            parseNodeData = SyntaxConstants.None;
            fileName = null;
            source.release();
            source = null;
            _source = null;

            return result;
        }


        function parseSyntaxTreeWorker(isDeclaration: boolean): SyntaxTree {
            var sourceUnit = parseSourceUnit();

            var allDiagnostics = source.tokenDiagnostics().concat(diagnostics);
            allDiagnostics.sort((a: Diagnostic, b: Diagnostic) => a.start() - b.start());

            return new SyntaxTree(sourceUnit, isDeclaration, allDiagnostics, fileName, source.text.lineMap(), languageVersion);
        }

        function getRewindPoint(): IParserRewindPoint {
            var rewindPoint = source.getRewindPoint();

            rewindPoint.diagnosticsCount = diagnostics.length;

            // Values we keep around for debug asserting purposes.
            rewindPoint.isInStrictMode = isInStrictMode;
            rewindPoint.listParsingState = listParsingState;

            return rewindPoint;
        }

        function rewind(rewindPoint: IParserRewindPoint): void {
            source.rewind(rewindPoint);

            diagnostics.length = rewindPoint.diagnosticsCount;
        }

        function releaseRewindPoint(rewindPoint: IParserRewindPoint): void {
            // Debug.assert(listParsingState === rewindPoint.listParsingState);
            // Debug.assert(isInStrictMode === rewindPoint.isInStrictMode);

            source.releaseRewindPoint(rewindPoint);
        }

        function currentNode(): ISyntaxNode {
            var node = source.currentNode();

            // We can only reuse a node if it was parsed under the same strict mode that we're 
            // currently in.  i.e. if we originally parsed a node in non-strict mode, but then
            // the user added 'using strict' at the top of the file, then we can't use that node
            // again as the presense of strict mode may cause us to parse the tokens in the file
            // differetly.
            //
            // Note: we *can* reuse tokens when the strict mode changes.  That's because tokens
            // are unaffected by strict mode.  It's just the parser will decide what to do with it
            // differently depending on what mode it is in.
            if (node === null || parsedInStrictMode(node) !== isInStrictMode) {
                return null;
            }

            return node;
        }

        function currentToken(): ISyntaxToken {
            return source.currentToken();
        }

        function currentContextualToken(): ISyntaxToken {
            // We're mutating the source here.  We are potentially overwriting the original token we
            // scanned with a regex token.  So we have to clear our state.
            return source.currentContextualToken();
        }

        function peekToken(n: number): ISyntaxToken {
            return source.peekToken(n);
        }

        function consumeToken(token: ISyntaxToken): void {
            source.consumeToken(token);
        }

        function consumeNode(node: ISyntaxNode): void {
            source.consumeNode(node);
        }

        //this method is called very frequently
        //we should keep it simple so that it can be inlined.
        function eatToken(kind: SyntaxKind): ISyntaxToken {
            // Assert disabled because it is actually expensive enugh to affect perf.
            // Debug.assert(SyntaxFacts.isTokenKind(kind()))

            var token = currentToken();
            if (token.kind() === kind) {
                consumeToken(token);
                return token;
            }

            //slow part of EatToken(SyntaxKind kind)
            return createMissingToken(kind, token);
        }

        // Eats the token if it is there.  Otherwise does nothing.  Will not report errors.
        function tryEatToken(kind: SyntaxKind): ISyntaxToken {
            var _currentToken = currentToken();
            if (_currentToken.kind() === kind) {
                consumeToken(_currentToken);
                return _currentToken;
            }

            return null;
        }

        function eatKeyword(kind: SyntaxKind): ISyntaxToken {
            // Debug.assert(SyntaxFacts.isTokenKind(kind))

            var token = currentToken();
            if (token.kind() === kind) {
                consumeToken(token);
                return token;
            }

            //slow part of EatToken(SyntaxKind kind)
            return createMissingToken(kind, token);
        }

        // An identifier is basically any word, unless it is a reserved keyword.  so 'foo' is an 
        // identifier and 'return' is not.  Note: a word may or may not be an identifier depending 
        // on the state of the parser.  For example, 'yield' is an identifier *unless* the parser 
        // is in strict mode.
        function isIdentifier(token: ISyntaxToken): boolean {
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
                    return !isInStrictMode;
                }

                // If it's typescript keyword, then it's actually a javascript identifier.
                return tokenKind <= SyntaxKind.LastTypeScriptKeyword;
            }

            // Anything else is not an identifier.
            return false;
        }

        // This method should be called when the grammar calls for an *IdentifierName* and not an
        // *Identifier*.
        function eatIdentifierNameToken(): ISyntaxToken {
            var token = currentToken();

            // If we have an identifier name, then consume and return it.
            var tokenKind = token.kind();
            if (tokenKind === SyntaxKind.IdentifierName) {
                consumeToken(token);
                return token;
            }

            // If we have a keyword, then it can be used as an identifier name.  However, we need 
            // to convert it to an identifier so that no later parts of the systems see it as a 
            // keyword.
            if (SyntaxFacts.isAnyKeyword(tokenKind)) {
                consumeToken(token);
                return TypeScript.Syntax.convertKeywordToIdentifier(token);
            }

            return createMissingToken(SyntaxKind.IdentifierName, token);
        }

        function eatOptionalIdentifierToken(): ISyntaxToken {
            return isIdentifier(currentToken()) ? eatIdentifierToken() : null;
        }

        // This method should be called when the grammar calls for an *Identifier* and not an
        // *IdentifierName*.
        function eatIdentifierToken(): ISyntaxToken {
            var token = currentToken();
            if (isIdentifier(token)) {
                consumeToken(token);

                if (token.kind() === SyntaxKind.IdentifierName) {
                    return token;
                }

                return TypeScript.Syntax.convertKeywordToIdentifier(token);
            }

            return createMissingToken(SyntaxKind.IdentifierName, token);
        }

        function previousTokenHasTrailingNewLine(token: ISyntaxToken): boolean {
            var tokenFullStart = token.fullStart();
            if (tokenFullStart === 0) {
                // First token in the document.  Thus it has no 'previous' token, and there is 
                // no preceding newline.
                return false;
            }

            // If our previous token ended with a newline, then *by definition* we must have started
            // at the beginning of a line.  
            var lineNumber = source.text.lineMap().getLineNumberFromPosition(tokenFullStart);
            var lineStart = source.text.lineMap().getLineStartPosition(lineNumber);

            return lineStart == tokenFullStart;
        }

        function canEatAutomaticSemicolon(allowWithoutNewLine: boolean): boolean {
            var token = currentToken();

            // An automatic semicolon is always allowed if we're at the end of the file.
            var tokenKind = token.kind();
            if (tokenKind === SyntaxKind.EndOfFileToken) {
                return true;
            }

            // Or if the next token is a close brace (regardless of which line it is on).
            if (tokenKind === SyntaxKind.CloseBraceToken) {
                return true;
            }

            if (allowWithoutNewLine) {
                return true;
            }

            // It is also allowed if there is a newline between the last token seen and the next one.
            if (previousTokenHasTrailingNewLine(token)) {
                return true;
            }

            return false;
        }

        function canEatExplicitOrAutomaticSemicolon(allowWithoutNewline: boolean): boolean {
            var token = currentToken();

            if (token.kind() === SyntaxKind.SemicolonToken) {
                return true;
            }

            return canEatAutomaticSemicolon(allowWithoutNewline);
        }

        function eatExplicitOrAutomaticSemicolon(allowWithoutNewline: boolean): ISyntaxToken {
            var token = currentToken();

            // If we see a semicolon, then we can definitely eat it.
            if (token.kind() === SyntaxKind.SemicolonToken) {
                consumeToken(token);
                return token;
            }

            // Check if an automatic semicolon could go here.  If so, then there's no problem and
            // we can proceed without error.  Return 'null' as there's no actual token for this 
            // position. 
            if (canEatAutomaticSemicolon(allowWithoutNewline)) {
                return null;
            }

            // No semicolon could be consumed here at all.  Just call the standard eating function
            // so we get the token and the error for it.
            return eatToken(SyntaxKind.SemicolonToken);
        }

        function isKeyword(kind: SyntaxKind): boolean {
            if (kind >= SyntaxKind.FirstKeyword) {
                if (kind <= SyntaxKind.LastFutureReservedKeyword) {
                    return true;
                }

                if (isInStrictMode) {
                    return kind <= SyntaxKind.LastFutureReservedStrictKeyword;
                }
            }

            return false;
        }

        function createMissingToken(expectedKind: SyntaxKind, actual: ISyntaxToken): ISyntaxToken {
            var diagnostic = getExpectedTokenDiagnostic(expectedKind, actual);
            addDiagnostic(diagnostic);

            // The missing token will be at the full start of the current token.  That way empty tokens
            // will always be between real tokens and not inside an actual token.
            return Syntax.emptyToken(expectedKind);
        }

        function getExpectedTokenDiagnostic(expectedKind: SyntaxKind, actual: ISyntaxToken): Diagnostic {
            var token = currentToken();

            // They wanted something specific, just report that that token was missing.
            if (SyntaxFacts.isAnyKeyword(expectedKind) || SyntaxFacts.isAnyPunctuation(expectedKind)) {
                return new Diagnostic(fileName, source.text.lineMap(), start(token), width(token), DiagnosticCode._0_expected, [SyntaxFacts.getText(expectedKind)]);
            }
            else {
                // They wanted an identifier.

                // If the user supplied a keyword, give them a specialized message.
                if (actual !== null && SyntaxFacts.isAnyKeyword(actual.kind())) {
                    return new Diagnostic(fileName, source.text.lineMap(), start(token), width(token), DiagnosticCode.Identifier_expected_0_is_a_keyword, [SyntaxFacts.getText(actual.kind())]);
                }
                else {
                    // Otherwise just report that an identifier was expected.
                    return new Diagnostic(fileName, source.text.lineMap(), start(token), width(token), DiagnosticCode.Identifier_expected, null);
                }
            }
        }

        function getBinaryExpressionPrecedence(tokenKind: SyntaxKind): BinaryExpressionPrecedence {
            switch (tokenKind) {
                case SyntaxKind.BarBarToken:
                    return BinaryExpressionPrecedence.LogicalOrExpressionPrecedence;

                case SyntaxKind.AmpersandAmpersandToken:
                    return BinaryExpressionPrecedence.LogicalAndExpressionPrecedence;

                case SyntaxKind.BarToken:
                    return BinaryExpressionPrecedence.BitwiseOrExpressionPrecedence;

                case SyntaxKind.CaretToken:
                    return BinaryExpressionPrecedence.BitwiseExclusiveOrExpressionPrecedence;

                case SyntaxKind.AmpersandToken:
                    return BinaryExpressionPrecedence.BitwiseAndExpressionPrecedence;

                case SyntaxKind.EqualsEqualsToken:
                case SyntaxKind.ExclamationEqualsToken:
                case SyntaxKind.EqualsEqualsEqualsToken:
                case SyntaxKind.ExclamationEqualsEqualsToken:
                    return BinaryExpressionPrecedence.EqualityExpressionPrecedence;

                case SyntaxKind.LessThanToken:
                case SyntaxKind.GreaterThanToken:
                case SyntaxKind.LessThanEqualsToken:
                case SyntaxKind.GreaterThanEqualsToken:
                case SyntaxKind.InstanceOfKeyword:
                case SyntaxKind.InKeyword:
                    return BinaryExpressionPrecedence.RelationalExpressionPrecedence;

                case SyntaxKind.LessThanLessThanToken:
                case SyntaxKind.GreaterThanGreaterThanToken:
                case SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
                    return BinaryExpressionPrecedence.ShiftExpressionPrecdence;

                case SyntaxKind.PlusToken:
                case SyntaxKind.MinusToken:
                    return BinaryExpressionPrecedence.AdditiveExpressionPrecedence;

                case SyntaxKind.AsteriskToken:
                case SyntaxKind.SlashToken:
                case SyntaxKind.PercentToken:
                    return BinaryExpressionPrecedence.MultiplicativeExpressionPrecedence;
            }

            throw Errors.invalidOperation();
        }

        function addSkippedTokenAfterNodeOrToken(nodeOrToken: ISyntaxNodeOrToken, skippedToken: ISyntaxToken): ISyntaxNodeOrToken {
            if (isToken(nodeOrToken)) {
                return addSkippedTokenAfterToken(<ISyntaxToken>nodeOrToken, skippedToken);
            }
            else if (isNode(nodeOrToken)) {
                return addSkippedTokenAfterNode(<ISyntaxNode>nodeOrToken, skippedToken);
            }
            else {
                throw Errors.invalidOperation();
            }
        }

        function clearCachedNodeData(element: ISyntaxElement): void {
        }

        function replaceTokenInParent(oldToken: ISyntaxToken, newToken: ISyntaxToken): void {
            // oldToken may be parented by a node or a list.
            replaceTokenInParentWorker(oldToken, newToken);

            var parent = oldToken.parent;
            newToken.parent = parent;

            // Parent must be a list or a node.  All of those have a 'data' element.
            Debug.assert(isNode(parent) || isList(parent) || isSeparatedList(parent));
            var dataElement = <{ data: number }><any>parent;
            if (dataElement.data) {
                dataElement.data &= SyntaxConstants.NodeParsedInStrictModeMask
            }
        }

        function replaceTokenInParentWorker(oldToken: ISyntaxToken, newToken: ISyntaxToken): void {
            var parent = oldToken.parent;

            if (isNode(parent)) {
                var node = <any>parent;
                for (var key in node) {
                    if (node[key] === oldToken) {
                        node[key] = newToken;
                        return;
                    }
                }
            }
            else if (isList(parent)) {
                var list1 = <ISyntaxNodeOrToken[]>parent;
                for (var i = 0, n = list1.length; i < n; i++) {
                    if (list1[i] === oldToken) {
                        list1[i] = newToken;
                        return;
                    }
                }
            }
            else if (isSeparatedList(parent)) {
                var list2 = <ISyntaxNodeOrToken[]>parent;
                for (var i = 0, n = childCount(list2); i < n; i++) {
                    if (childAt(list2, i) === oldToken) {
                        if (i % 2 === 0) {
                            list2[i / 2] = newToken;
                        }
                        else {
                            list2.separators[(i - 1) / 2] = newToken;
                        }
                        return;
                    }
                }
            }

            throw Errors.invalidOperation();
        }

        function addSkippedTokenAfterNode(node: ISyntaxNode, skippedToken: ISyntaxToken): ISyntaxNode {
            var oldToken = lastToken(node);
            var newToken = addSkippedTokenAfterToken(oldToken, skippedToken);

            replaceTokenInParent(oldToken, newToken);
            return node;
        }

        function addSkippedTokensBeforeNode(node: ISyntaxNode, skippedTokens: ISyntaxToken[]): ISyntaxNode {
            if (skippedTokens.length > 0) {
                var oldToken = firstToken(node);
                var newToken = addSkippedTokensBeforeToken(oldToken, skippedTokens);

                replaceTokenInParent(oldToken, newToken);
            }

            return node;
        }

        function addSkippedTokensBeforeToken(token: ISyntaxToken, skippedTokens: ISyntaxToken[]): ISyntaxToken {
            // Debug.assert(token.fullWidth() > 0 || token.kind() === SyntaxKind.EndOfFileToken);
            // Debug.assert(skippedTokens.length > 0);

            var leadingTrivia: ISyntaxTrivia[] = [];
            for (var i = 0, n = skippedTokens.length; i < n; i++) {
                var skippedToken = skippedTokens[i];
                addSkippedTokenToTriviaArray(leadingTrivia, skippedToken);
            }

            addTriviaTo(token.leadingTrivia(), leadingTrivia);

            var updatedToken = Syntax.withLeadingTrivia(token, Syntax.triviaList(leadingTrivia));

            // We've prepending this token with new leading trivia.  This means the full start of
            // the token is not where the scanner originally thought it was, but is instead at the
            // start of the first skipped token.
            updatedToken.setTextAndFullStart(source.text, skippedTokens[0].fullStart());

            // Don't need this array anymore.  Give it back so we can reuse it.
            returnArray(skippedTokens);

            return updatedToken;
        }

        function addSkippedTokensAfterToken(token: ISyntaxToken, skippedTokens: ISyntaxToken[]): ISyntaxToken {
            // Debug.assert(token.fullWidth() > 0);
            if (skippedTokens.length === 0) {
                returnArray(skippedTokens);
                return token;
            }

            var trailingTrivia = token.trailingTrivia().toArray();

            for (var i = 0, n = skippedTokens.length; i < n; i++) {
                addSkippedTokenToTriviaArray(trailingTrivia, skippedTokens[i]);
            }

            // Don't need this array anymore.  Give it back so we can reuse it.
            returnArray(skippedTokens);
            return Syntax.withTrailingTrivia(token, Syntax.triviaList(trailingTrivia));
        }

        function addSkippedTokenAfterToken(token: ISyntaxToken, skippedToken: ISyntaxToken): ISyntaxToken {
            // Debug.assert(token.fullWidth() > 0);

            var trailingTrivia = token.trailingTrivia().toArray();
            addSkippedTokenToTriviaArray(trailingTrivia, skippedToken);

            return Syntax.withTrailingTrivia(token, Syntax.triviaList(trailingTrivia));
        }

        function addSkippedTokenToTriviaArray(array: ISyntaxTrivia[], skippedToken: ISyntaxToken): void {
            // Debug.assert(skippedToken.text().length > 0);

            // first, add the leading trivia of the skipped token to the array
            addTriviaTo(skippedToken.leadingTrivia(), array);

            // now, add the text of the token as skipped text to the trivia array.
            var trimmedToken = Syntax.withTrailingTrivia(Syntax.withLeadingTrivia(skippedToken, Syntax.emptyTriviaList), Syntax.emptyTriviaList);

            // Because we removed the leading trivia from the skipped token, the full start of the
            // trimmed token is the start of the skipped token.
            trimmedToken.setTextAndFullStart(source.text, start(skippedToken));

            array.push(Syntax.skippedTokenTrivia(trimmedToken));

            // Finally, add the trailing trivia of the skipped token to the trivia array.
            addTriviaTo(skippedToken.trailingTrivia(), array);
        }

        function addTriviaTo(list: ISyntaxTriviaList, array: ISyntaxTrivia[]): void {
            for (var i = 0, n = list.count(); i < n; i++) {
                array.push(list.syntaxTriviaAt(i));
            }
        }

        function setStrictMode(_isInStrictMode: boolean) {
            isInStrictMode = _isInStrictMode;
            parseNodeData = _isInStrictMode ? SyntaxConstants.NodeParsedInStrictModeMask : 0;
        }

        function parseSourceUnit(): SourceUnitSyntax {
            // Note: technically we don't need to save and restore this here.  After all, this the top
            // level parsing entrypoint.  So it will always start as false and be reset to false when the
            // loop ends.  However, for sake of symmetry and consistancy we do this.
            var savedIsInStrictMode = isInStrictMode;

            var result = parseSyntaxList<IModuleElementSyntax>(ListParsingState.SourceUnit_ModuleElements, updateStrictModeState);
            var moduleElements = result.list;

            setStrictMode(savedIsInStrictMode);

            var sourceUnit = new SourceUnitSyntax(parseNodeData, moduleElements, currentToken());

            sourceUnit = <SourceUnitSyntax>addSkippedTokensBeforeNode(sourceUnit, result.skippedTokens);

            if (Debug.shouldAssert(AssertionLevel.Aggressive)) {
                Debug.assert(fullWidth(sourceUnit) === source.text.length());

                if (Debug.shouldAssert(AssertionLevel.VeryAggressive)) {
                    Debug.assert(fullText(sourceUnit) === source.text.substr(0, source.text.length()));
                }
            }

            return sourceUnit;
        }

        function updateStrictModeState(items: any[]): void {
            if (!isInStrictMode) {
                // Check if all the items are directive prologue elements.
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    if (!SyntaxFacts.isDirectivePrologueElement(item)) {
                        return;
                    }
                }

                setStrictMode(SyntaxFacts.isUseStrictDirective(items[items.length - 1]));
            }
        }

        function isModuleElement(inErrorRecovery: boolean): boolean {
            if (SyntaxUtilities.isModuleElement(currentNode())) {
                return true;
            }

            var _modifierCount = modifierCount();
            return isInterfaceEnumClassModuleImportOrExport(_modifierCount) ||
                   isStatement(_modifierCount, inErrorRecovery);
        }

        function tryParseModuleElement(inErrorRecovery: boolean): IModuleElementSyntax {
            var node = currentNode();
            if (SyntaxUtilities.isModuleElement(node)) {
                consumeNode(node);
                return <IModuleElementSyntax>node;
            }

            var _currentToken = currentToken();
            var _modifierCount = modifierCount();

            if (_modifierCount) {
                // if we have modifiers, then these are definitely TS constructs and we can 
                // immediately start parsing them.
                switch (peekToken(_modifierCount).kind()) {
                    case SyntaxKind.ImportKeyword: return parseImportDeclaration();
                    case SyntaxKind.ModuleKeyword: return parseModuleDeclaration();
                    case SyntaxKind.InterfaceKeyword: return parseInterfaceDeclaration();
                    case SyntaxKind.ClassKeyword: return parseClassDeclaration();
                    case SyntaxKind.EnumKeyword: return parseEnumDeclaration();
                }
            }

            // No modifiers.  If we see 'class, enum, import and export' we could technically 
            // aggressively consume them as they can't start another construct.  However, it's 
            // not uncommon in error recovery to run into a situation where we see those keywords,
            // but the code was using it as the name of an object property.  To avoid overzealously
            // consuming these, we only parse them out if we can see enough context to 'prove' that
            // they really do start the module element
            var nextToken = peekToken(1);
            switch (_currentToken.kind()) {
                case SyntaxKind.ModuleKeyword:
                    if (isIdentifier(nextToken) || nextToken.kind() === SyntaxKind.StringLiteral) {
                        return parseModuleDeclaration();
                    }
                    break;

                case SyntaxKind.ImportKeyword:
                    if (isIdentifier(nextToken)) {
                        return parseImportDeclaration();
                    }
                    break;

                case SyntaxKind.ClassKeyword:
                    if (isIdentifier(nextToken)) {
                        return parseClassDeclaration();
                    }
                    break;

                case SyntaxKind.EnumKeyword:
                    if (isIdentifier(nextToken)) {
                        return parseEnumDeclaration();
                    }
                    break;

                case SyntaxKind.InterfaceKeyword:
                    if (isIdentifier(nextToken)) {
                        return parseInterfaceDeclaration();
                    }
                    break;

                case SyntaxKind.ExportKeyword:
                    // 'export' could be a modifier on a statement (like export var ...).  So we 
                    // only want to parse out an export assignment here if we actually see the equals.
                    if (nextToken.kind() === SyntaxKind.EqualsToken) {
                        return parseExportAssignment();
                    }
                    break;
            }

            return tryParseStatement(_modifierCount, inErrorRecovery);
        }

        function parseImportDeclaration(): ImportDeclarationSyntax {
            return new ImportDeclarationSyntax(parseNodeData,
                parseModifiers(),
                eatKeyword(SyntaxKind.ImportKeyword),
                eatIdentifierToken(),
                eatToken(SyntaxKind.EqualsToken),
                parseModuleReference(),
                eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false));
        }

        function parseExportAssignment(): ExportAssignmentSyntax {
            return new ExportAssignmentSyntax(parseNodeData,
                eatKeyword(SyntaxKind.ExportKeyword),
                eatToken(SyntaxKind.EqualsToken),
                eatIdentifierToken(),
                eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false));
        }

        function parseModuleReference(): IModuleReferenceSyntax {
            if (isExternalModuleReference()) {
                return parseExternalModuleReference();
            }
            else {
                return parseModuleNameModuleReference();
            }
        }

        function isExternalModuleReference(): boolean {
            var token0 = currentToken();
            if (token0.kind() === SyntaxKind.RequireKeyword) {
                return peekToken(1).kind() === SyntaxKind.OpenParenToken;
            }

            return false;
        }

        function parseExternalModuleReference(): ExternalModuleReferenceSyntax {
            return new ExternalModuleReferenceSyntax(parseNodeData,
                eatKeyword(SyntaxKind.RequireKeyword),
                eatToken(SyntaxKind.OpenParenToken),
                eatToken(SyntaxKind.StringLiteral),
                eatToken(SyntaxKind.CloseParenToken));
        }

        function parseModuleNameModuleReference(): ModuleNameModuleReferenceSyntax {
            return new ModuleNameModuleReferenceSyntax(parseNodeData, parseName());
        }

        // NOTE: This will allow all identifier names.  Even the ones that are keywords.
        function parseIdentifierName(): INameSyntax {
            var identifierName = eatIdentifierNameToken();
            return identifierName;
        }

        function tryParseTypeArgumentList(inExpression: boolean): TypeArgumentListSyntax {
            if (currentToken().kind() !== SyntaxKind.LessThanToken) {
                return null;
            }

            var lessThanToken: ISyntaxToken;
            var greaterThanToken: ISyntaxToken;
            var result: { skippedTokens: ISyntaxToken[]; list: ITypeSyntax[]; };
            var typeArguments: ITypeSyntax[];

            if (!inExpression) {
                // if we're not in an expression, this must be a type argument list.  Just parse
                // it out as such.
                lessThanToken = eatToken(SyntaxKind.LessThanToken);
                // Debug.assert(lessThanToken.fullWidth() > 0);

                result = parseSeparatedSyntaxList<ITypeSyntax>(ListParsingState.TypeArgumentList_Types);
                typeArguments = result.list;
                lessThanToken = addSkippedTokensAfterToken(lessThanToken, result.skippedTokens);

                greaterThanToken = eatToken(SyntaxKind.GreaterThanToken);

                return new TypeArgumentListSyntax(parseNodeData, lessThanToken, typeArguments, greaterThanToken);
            }

            // If we're in an expression, then we only want to consume this as a type argument list
            // if we're sure that it's a type arg list and not an arithmetic expression.

            var rewindPoint = getRewindPoint();

            // We've seen a '<'.  Try to parse it out as a type argument list.
            lessThanToken = eatToken(SyntaxKind.LessThanToken);
            // Debug.assert(lessThanToken.fullWidth() > 0);

            result = parseSeparatedSyntaxList<ITypeSyntax>(ListParsingState.TypeArgumentList_Types);
            typeArguments = result.list;
            lessThanToken = addSkippedTokensAfterToken(lessThanToken, result.skippedTokens);

            greaterThanToken = eatToken(SyntaxKind.GreaterThanToken);

            // We're in a context where '<' could be the start of a type argument list, or part
            // of an arithmetic expression.  We'll presume it's the latter unless we see the '>'
            // and a following token that guarantees that it's supposed to be a type argument list.
            if (greaterThanToken.fullWidth() === 0 || !canFollowTypeArgumentListInExpression(currentToken().kind())) {
                rewind(rewindPoint);

                releaseRewindPoint(rewindPoint);
                return null;
            }
            else {
                releaseRewindPoint(rewindPoint);
                return new TypeArgumentListSyntax(parseNodeData, lessThanToken, typeArguments, greaterThanToken);
            }
        }

        function canFollowTypeArgumentListInExpression(kind: SyntaxKind): boolean {
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

        function parseName(): INameSyntax {
            return tryParseName() || eatIdentifierToken();
        }

        function eatRightSideOfName(): ISyntaxToken {
            var _currentToken = currentToken();

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
            if (SyntaxFacts.isAnyKeyword(_currentToken.kind()) &&
                previousTokenHasTrailingNewLine(_currentToken)) {

                var token1 = peekToken(1);
                if (!existsNewLineBetweenTokens(_currentToken, token1, source.text.lineMap()) &&
                    SyntaxFacts.isIdentifierNameOrAnyKeyword(token1)) {

                    return createMissingToken(SyntaxKind.IdentifierName, _currentToken);
                }
            }

            return eatIdentifierNameToken();
        }

        function tryParseName(): INameSyntax {
            var token0 = currentToken();
            var shouldContinue = isIdentifier(token0);
            if (!shouldContinue) {
                return null;
            }

            // Call eatIdentifierName to convert the token to an identifier if it is as keyword.
            var current: INameSyntax = eatIdentifierToken();

            while (shouldContinue && currentToken().kind() === SyntaxKind.DotToken) {
                var dotToken = currentToken();
                consumeToken(dotToken);

                var identifierName = eatRightSideOfName();

                current = new QualifiedNameSyntax(parseNodeData, current, dotToken, identifierName);
                shouldContinue = identifierName.fullWidth() > 0;
            }

            return current;
        }

        function parseEnumDeclaration(): EnumDeclarationSyntax {
            // Debug.assert(isEnumDeclaration());

            var modifiers = parseModifiers();
            var enumKeyword = eatKeyword(SyntaxKind.EnumKeyword);
            var identifier = eatIdentifierToken();

            var openBraceToken = eatToken(SyntaxKind.OpenBraceToken);
            var enumElements = Syntax.emptySeparatedList<EnumElementSyntax>();

            if (openBraceToken.fullWidth() > 0) {
                var listResult = parseSeparatedSyntaxList<EnumElementSyntax>(ListParsingState.EnumDeclaration_EnumElements);
                enumElements = listResult.list;
                openBraceToken = addSkippedTokensAfterToken(openBraceToken, listResult.skippedTokens);
            }

            var closeBraceToken = eatToken(SyntaxKind.CloseBraceToken);

            return new EnumDeclarationSyntax(parseNodeData, modifiers, enumKeyword, identifier, openBraceToken, enumElements, closeBraceToken);
        }

        function isEnumElement(inErrorRecovery: boolean): boolean {
            if (currentNode() !== null && currentNode().kind() === SyntaxKind.EnumElement) {
                return true;
            }

            return isPropertyName(currentToken(), inErrorRecovery);
        }

        function tryParseEnumElementEqualsValueClause(): EqualsValueClauseSyntax {
            return isEqualsValueClause(/*inParameter*/ false) ? parseEqualsValueClause(/*allowIn:*/ true) : null;
        }

        function tryParseEnumElement(inErrorRecovery: boolean): EnumElementSyntax {
            // Debug.assert(isEnumElement());
            var node = currentNode();
            if (node !== null && node.kind() === SyntaxKind.EnumElement) {
                consumeNode(node);
                return <EnumElementSyntax>node;
            }

            if (!isPropertyName(currentToken(), inErrorRecovery)) {
                return null;
            }

            return new EnumElementSyntax(parseNodeData, eatPropertyName(), tryParseEnumElementEqualsValueClause());
        }

        function isModifier(token: ISyntaxToken): boolean {
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

        function modifierCount(): number {
            var modifierCount = 0;
            while (isModifier(peekToken(modifierCount))) {
                modifierCount++;
            }

            return modifierCount;
        }

        function parseModifiers(): ISyntaxToken[] {
            var tokens: ISyntaxToken[] = getArray();

            while (true) {
                var token = currentToken();
                if (isModifier(token)) {
                    consumeToken(token);
                    tokens.push(token);
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

        function parseHeritageClauses(): HeritageClauseSyntax[] {
            var heritageClauses = Syntax.emptyList<HeritageClauseSyntax>();
            
            if (isHeritageClause()) {
                var result = parseSyntaxList<HeritageClauseSyntax>(ListParsingState.ClassOrInterfaceDeclaration_HeritageClauses);
                heritageClauses = result.list;
                // Debug.assert(result.skippedTokens.length === 0);
            }

            return heritageClauses;
        }

        function tryParseHeritageClauseTypeName(): ITypeSyntax {
            if (!isHeritageClauseTypeName()) {
                return null;
            }

            return tryParseNameOrGenericType();
        }

        function parseClassDeclaration(): ClassDeclarationSyntax {
            // Debug.assert(isClassDeclaration());

            var modifiers = parseModifiers();

            var classKeyword = eatKeyword(SyntaxKind.ClassKeyword);
            var identifier = eatIdentifierToken();
            var typeParameterList = tryParseTypeParameterList(/*requireCompleteTypeParameterList:*/ false);
            var heritageClauses = parseHeritageClauses();
            var openBraceToken = eatToken(SyntaxKind.OpenBraceToken);
            var classElements = Syntax.emptyList<IClassElementSyntax>();

            if (openBraceToken.fullWidth() > 0) {
                var listResult = parseSyntaxList<IClassElementSyntax>(ListParsingState.ClassDeclaration_ClassElements);

                classElements = listResult.list;
                openBraceToken = addSkippedTokensAfterToken(openBraceToken, listResult.skippedTokens);
            }

            var closeBraceToken = eatToken(SyntaxKind.CloseBraceToken);

            return new ClassDeclarationSyntax(parseNodeData, modifiers, classKeyword, identifier, typeParameterList, heritageClauses, openBraceToken, classElements, closeBraceToken);
        }

        function isAccessor(modifierCount: number, inErrorRecovery: boolean): boolean {
            var tokenN = peekToken(modifierCount);
            var tokenKind = tokenN.kind();
            if (tokenKind !== SyntaxKind.GetKeyword &&
                tokenKind !== SyntaxKind.SetKeyword) {
                return false;
            }

            return isPropertyName(peekToken(modifierCount + 1), inErrorRecovery);
        }

        function parseAccessor(checkForStrictMode: boolean): ISyntaxNode {
            // Debug.assert(isMemberAccessorDeclaration());

            var modifiers = parseModifiers();
            var tokenKind = currentToken().kind();

            if (tokenKind === SyntaxKind.GetKeyword) {
                return parseGetMemberAccessorDeclaration(modifiers, checkForStrictMode);
            }
            else if (tokenKind === SyntaxKind.SetKeyword) {
                return parseSetMemberAccessorDeclaration(modifiers, checkForStrictMode);
            }
            else {
                throw Errors.invalidOperation();
            }
        }

        function parseGetMemberAccessorDeclaration(modifiers: ISyntaxToken[], checkForStrictMode: boolean): GetAccessorSyntax {
            return new GetAccessorSyntax(parseNodeData,
                modifiers,
                eatKeyword(SyntaxKind.GetKeyword),
                eatPropertyName(),
                parseCallSignature(/*requireCompleteTypeParameterList:*/ false),
                parseBlock(/*parseStatementsEvenWithNoOpenBrace:*/ false, checkForStrictMode));
        }

        function parseSetMemberAccessorDeclaration(modifiers: ISyntaxToken[], checkForStrictMode: boolean): SetAccessorSyntax {
            return new SetAccessorSyntax(parseNodeData,
                modifiers,
                eatKeyword(SyntaxKind.SetKeyword),
                eatPropertyName(),
                parseCallSignature(/*requireCompleteTypeParameterList:*/ false),
                parseBlock(/*parseStatementsEvenWithNoOpenBrace:*/ false, checkForStrictMode));
        }

        function isClassElement(inErrorRecovery: boolean): boolean {
            if (SyntaxUtilities.isClassElement(currentNode())) {
                return true;
            }

            // Note: the order of these calls is important.  Specifically, isMemberVariableDeclaration
            // checks for a subset of the conditions of the previous two calls.
            var _modifierCount = modifierCount();
            return isConstructorDeclaration(_modifierCount) ||
                   isMemberFunctionDeclaration(inErrorRecovery) ||
                   isAccessor(_modifierCount, inErrorRecovery) ||
                   isMemberVariableDeclaration(inErrorRecovery) ||
                   isIndexMemberDeclaration(_modifierCount);
        }

        function tryParseClassElement(inErrorRecovery: boolean): IClassElementSyntax {
            // Debug.assert(isClassElement());
            var node = currentNode();
            if (SyntaxUtilities.isClassElement(node)) {
                consumeNode(node);
                return <IClassElementSyntax>node;
            }

            var _modifierCount = modifierCount();
            if (isConstructorDeclaration(_modifierCount)) {
                return parseConstructorDeclaration();
            }
            else if (isMemberFunctionDeclaration(inErrorRecovery)) {
                return parseMemberFunctionDeclaration();
            }
            else if (isAccessor(_modifierCount, inErrorRecovery)) {
                return parseAccessor(/*checkForStrictMode:*/ false);
            }
            else if (isMemberVariableDeclaration(inErrorRecovery)) {
                return parseMemberVariableDeclaration();
            }
            else if (isIndexMemberDeclaration(_modifierCount)) {
                return parseIndexMemberDeclaration();
            }
            else {
                return null;
            }
        }

        function isConstructorDeclaration(modifierCount: number): boolean {
            // Note: we deviate slightly from the spec here.  If we see 'constructor' then we 
            // assume this is a constructor.  That means, if a user writes "public constructor;"
            // it won't be viewed as a member.  As a workaround, they can simply write:
            //      public 'constructor';

            return peekToken(modifierCount).kind() === SyntaxKind.ConstructorKeyword;
        }

        function parseConstructorDeclaration(): ConstructorDeclarationSyntax {
            // Debug.assert(isConstructorDeclaration());

            var modifiers = parseModifiers();
            var constructorKeyword = eatKeyword(SyntaxKind.ConstructorKeyword);
            var callSignature = parseCallSignature(/*requireCompleteTypeParameterList:*/ false);

            var semicolonToken: ISyntaxToken = null;
            var block: BlockSyntax = null;

            if (isBlock()) {
                block = parseBlock(/*parseStatementsEvenWithNoOpenBrace:*/ false, /*checkForStrictMode:*/ true);
            }
            else {
                semicolonToken = eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false);
            }

            return new ConstructorDeclarationSyntax(parseNodeData, modifiers, constructorKeyword, callSignature, block, semicolonToken);
        }

        function isMemberFunctionDeclaration(inErrorRecovery: boolean): boolean {
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
                var token = peekToken(index);
                if (isPropertyName(token, inErrorRecovery) &&
                    isCallSignature(index + 1)) {
                    return true;
                }

                // We weren't at the name of the function.  If we have a modifier token, then 
                // consume it and try again.
                if (isModifier(token)) {
                    index++;
                    continue;
                }

                // Wasn't a member function.
                return false;
            }
        }

        function parseMemberFunctionDeclaration(): MemberFunctionDeclarationSyntax {
            // Debug.assert(isMemberFunctionDeclaration());

            var modifierArray: ISyntaxToken[] = getArray();

            while (true) {
                var _currentToken = currentToken();
                if (isPropertyName(_currentToken, /*inErrorRecovery:*/ false) &&
                    isCallSignature(1)) {
                    break;
                }

                // Debug.assert(ParserImpl.isModifier(currentToken));
                consumeToken(_currentToken);
                modifierArray.push(_currentToken);
            }

            var modifiers = Syntax.list(modifierArray);
            returnZeroLengthArray(modifierArray);

            var propertyName = eatPropertyName();
            var callSignature = parseCallSignature(/*requireCompleteTypeParameterList:*/ false);

            // If we got an errant => then we want to parse what's coming up without requiring an
            // open brace.
            var parseBlockEvenWithNoOpenBrace = tryAddUnexpectedEqualsGreaterThanToken(callSignature);

            var block: BlockSyntax = null;
            var semicolon: ISyntaxToken = null;

            if (parseBlockEvenWithNoOpenBrace || isBlock()) {
                block = parseBlock(parseBlockEvenWithNoOpenBrace, /*checkForStrictMode:*/ true);
            }
            else {
                semicolon = eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false);
            }

            return new MemberFunctionDeclarationSyntax(parseNodeData, modifiers, propertyName, callSignature, block, semicolon);
        }
        
        function isDefinitelyMemberVariablePropertyName(index: number): boolean {
            // keywords are also property names.  Only accept a keyword as a property 
            // name if is of the form:
            //      public;
            //      public=
            //      public:
            //      public }
            //      public <eof>
            if (SyntaxFacts.isAnyKeyword(peekToken(index).kind())) {
                switch (peekToken(index + 1).kind()) {
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

        function isMemberVariableDeclaration(inErrorRecovery: boolean): boolean {
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
                var token = peekToken(index);
                if (isPropertyName(token, inErrorRecovery) &&
                    isDefinitelyMemberVariablePropertyName(index)) {
                        return true;
                }

                // We weren't at the name of the variable.  If we have a modifier token, then 
                // consume it and try again.
                if (isModifier(peekToken(index))) {
                    index++;
                    continue;
                }

                // Wasn't a member variable.
                return false;
            }
        }

        function parseMemberVariableDeclaration(): MemberVariableDeclarationSyntax {
            // Debug.assert(isMemberVariableDeclaration());

            var modifierArray: ISyntaxToken[] = getArray();

            while (true) {
                var _currentToken = currentToken();
                if (isPropertyName(_currentToken, /*inErrorRecovery:*/ false) &&
                    isDefinitelyMemberVariablePropertyName(0)) {
                    break;
                }

                // Debug.assert(ParserImpl.isModifier(currentToken));
                consumeToken(_currentToken);
                modifierArray.push(_currentToken);
            }

            var modifiers = Syntax.list(modifierArray);
            returnZeroLengthArray(modifierArray);

            return new MemberVariableDeclarationSyntax(parseNodeData, modifiers,
                tryParseVariableDeclarator(/*allowIn:*/ true, /*allowPropertyName:*/ true),

                // Even though we're calling tryParseVariableDeclarator, we must get one (we've already
                // verified that because of of hte call to isMemberVariableDecalrator above.
                // Debug.assert(variableDeclarator !== null);
                eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false));
        }

        function isIndexMemberDeclaration(modifierCount: number): boolean {
            return isIndexSignature(modifierCount);
        }

        function parseIndexMemberDeclaration(): IndexMemberDeclarationSyntax {
            return new IndexMemberDeclarationSyntax(parseNodeData,
                parseModifiers(),
                parseIndexSignature(),
                eatExplicitOrAutomaticSemicolon(/*allowWithoutNewLine:*/ false));
        }

        function tryAddUnexpectedEqualsGreaterThanToken(callSignature: CallSignatureSyntax): boolean {
            var token0 = currentToken();

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
                    var diagnostic = new Diagnostic(fileName, source.text.lineMap(),
                        start(token0), width(token0), DiagnosticCode.Unexpected_token_0_expected, [SyntaxFacts.getText(SyntaxKind.OpenBraceToken)]);
                    addDiagnostic(diagnostic);

                    consumeToken(token0);
                    addSkippedTokenAfterNode(callSignature, token0);

                    return true;
                }
            }


            return false;
        }

        function isFunctionDeclaration(modifierCount: number): boolean {
            return peekToken(modifierCount).kind() === SyntaxKind.FunctionKeyword;
        }

        function parseFunctionDeclaration(): FunctionDeclarationSyntax {
            // Debug.assert(isFunctionDeclaration());

            var modifiers = parseModifiers();
            var functionKeyword = eatKeyword(SyntaxKind.FunctionKeyword);
            var identifier = eatIdentifierToken();
            var callSignature = parseCallSignature(/*requireCompleteTypeParameterList:*/ false);

            // If we got an errant => then we want to parse what's coming up without requiring an
            // open brace.
            var parseBlockEvenWithNoOpenBrace = tryAddUnexpectedEqualsGreaterThanToken(callSignature);

            var semicolonToken: ISyntaxToken = null;
            var block: BlockSyntax = null;

            // Parse a block if we're on a bock, or if we saw a '=>'
            if (parseBlockEvenWithNoOpenBrace || isBlock()) {
                block = parseBlock(parseBlockEvenWithNoOpenBrace, /*checkForStrictMode:*/ true);
            }
            else {
                semicolonToken = eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false);
            }

            return new FunctionDeclarationSyntax(parseNodeData, modifiers, functionKeyword, identifier, callSignature, block, semicolonToken);
        }

        function parseModuleDeclaration(): ModuleDeclarationSyntax {
            // Debug.assert(isModuleDeclaration());

            var modifiers = parseModifiers();
            var moduleKeyword = eatKeyword(SyntaxKind.ModuleKeyword);

            var moduleName: INameSyntax = null;
            var stringLiteral: ISyntaxToken = null;

            if (currentToken().kind() === SyntaxKind.StringLiteral) {
                stringLiteral = eatToken(SyntaxKind.StringLiteral);
            }
            else {
                moduleName = parseName();
            }

            var openBraceToken = eatToken(SyntaxKind.OpenBraceToken);

            var moduleElements = Syntax.emptyList<IModuleElementSyntax>();
            if (openBraceToken.fullWidth() > 0) {
                var listResult = parseSyntaxList<IModuleElementSyntax>(ListParsingState.ModuleDeclaration_ModuleElements);
                moduleElements = listResult.list;
                openBraceToken = addSkippedTokensAfterToken(openBraceToken, listResult.skippedTokens);
            }

            var closeBraceToken = eatToken(SyntaxKind.CloseBraceToken);

            return new ModuleDeclarationSyntax(parseNodeData, modifiers, moduleKeyword, moduleName, stringLiteral, openBraceToken, moduleElements, closeBraceToken);
        }

        function parseInterfaceDeclaration(): InterfaceDeclarationSyntax {
            return new InterfaceDeclarationSyntax(parseNodeData,
                parseModifiers(),
                eatKeyword(SyntaxKind.InterfaceKeyword),
                eatIdentifierToken(),
                tryParseTypeParameterList(/*requireCompleteTypeParameterList:*/ false),
                parseHeritageClauses(),
                parseObjectType());
        }

        function parseObjectType(): ObjectTypeSyntax {
            var openBraceToken = eatToken(SyntaxKind.OpenBraceToken);

            var typeMembers = Syntax.emptySeparatedList<ITypeMemberSyntax>();
            if (openBraceToken.fullWidth() > 0) {
                var listResult = parseSeparatedSyntaxList<ITypeMemberSyntax>(ListParsingState.ObjectType_TypeMembers);
                typeMembers = listResult.list;
                openBraceToken = addSkippedTokensAfterToken(openBraceToken, listResult.skippedTokens);
            }

            var closeBraceToken = eatToken(SyntaxKind.CloseBraceToken);

            return new ObjectTypeSyntax(parseNodeData, openBraceToken, typeMembers, closeBraceToken);
        }

        function isTypeMember(inErrorRecovery: boolean): boolean {
            if (SyntaxUtilities.isTypeMember(currentNode())) {
                return true;
            }

            return isCallSignature(/*tokenIndex:*/ 0) ||
                   isConstructSignature() ||
                   isIndexSignature(/*tokenIndex:*/ 0) ||
                   isMethodSignature(inErrorRecovery) ||
                   isPropertySignature(inErrorRecovery);
        }

        function tryParseTypeMember(inErrorRecovery: boolean): ITypeMemberSyntax {
            var node = currentNode();
            if (SyntaxUtilities.isTypeMember(node)) {
                consumeNode(node);
                return <ITypeMemberSyntax>node;
            }

            if (isCallSignature(/*tokenIndex:*/ 0)) {
                return parseCallSignature(/*requireCompleteTypeParameterList:*/ false);
            }
            else if (isConstructSignature()) {
                return parseConstructSignature();
            }
            else if (isIndexSignature(/*tokenIndex:*/ 0)) {
                return parseIndexSignature();
            }
            else if (isMethodSignature(inErrorRecovery)) {
                // Note: it is important that isFunctionSignature is called before isPropertySignature.
                // isPropertySignature checks for a subset of isFunctionSignature.
                return parseMethodSignature();
            }
            else if (isPropertySignature(inErrorRecovery)) {
                return parsePropertySignature();
            }
            else {
                return null;
            }
        }

        function parseConstructSignature(): ConstructSignatureSyntax {
            return new ConstructSignatureSyntax(parseNodeData,
                eatKeyword(SyntaxKind.NewKeyword),
                parseCallSignature(/*requireCompleteTypeParameterList:*/ false));
        }

        function parseIndexSignature(): IndexSignatureSyntax {
            return new IndexSignatureSyntax(parseNodeData,
                eatToken(SyntaxKind.OpenBracketToken),
                parseParameter(),
                eatToken(SyntaxKind.CloseBracketToken),
                parseOptionalTypeAnnotation(/*allowStringLiteral:*/ false));
        }

        function parseMethodSignature(): MethodSignatureSyntax {
            return new MethodSignatureSyntax(parseNodeData,
                eatPropertyName(),
                tryEatToken(SyntaxKind.QuestionToken),
                parseCallSignature(/*requireCompleteTypeParameterList:*/ false));
        }

        function parsePropertySignature(): PropertySignatureSyntax {
            return new PropertySignatureSyntax(parseNodeData,
                eatPropertyName(),
                tryEatToken(SyntaxKind.QuestionToken),
                parseOptionalTypeAnnotation(/*allowStringLiteral:*/ false));
        }

        function isCallSignature(tokenIndex: number): boolean {
            var tokenKind = peekToken(tokenIndex).kind();
            return tokenKind === SyntaxKind.OpenParenToken || tokenKind === SyntaxKind.LessThanToken;
        }

        function isConstructSignature(): boolean {
            if (currentToken().kind() !== SyntaxKind.NewKeyword) {
                return false;
            }

            var token1 = peekToken(1);
            return token1.kind() === SyntaxKind.LessThanToken || token1.kind() === SyntaxKind.OpenParenToken;
        }

        function isIndexSignature(tokenIndex: number): boolean {
            return peekToken(tokenIndex).kind() === SyntaxKind.OpenBracketToken;
        }

        function isMethodSignature(inErrorRecovery: boolean): boolean {
            if (isPropertyName(currentToken(), inErrorRecovery)) {
                // id(
                if (isCallSignature(1)) {
                    return true;
                }

                // id?(
                if (peekToken(1).kind() === SyntaxKind.QuestionToken &&
                    isCallSignature(2)) {
                    return true;
                }
            }

            return false;
        }

        function isPropertySignature(inErrorRecovery: boolean): boolean {
            var _currentToken = currentToken();

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
            if (isModifier(_currentToken)) {
                if (!existsNewLineBetweenTokens(_currentToken, peekToken(1), source.text.lineMap()) &&
                    isPropertyName(peekToken(1), inErrorRecovery)) {

                    return false;
                }
            }

            // Note: property names also start function signatures.  So it's important that we call this
            // after we calll isFunctionSignature.
            return isPropertyName(_currentToken, inErrorRecovery);
        }

        function isHeritageClause(): boolean {
            var token0 = currentToken();
            var tokenKind = token0.kind();
            return tokenKind === SyntaxKind.ExtendsKeyword || tokenKind === SyntaxKind.ImplementsKeyword;
        }

        function isNotHeritageClauseTypeName(): boolean {
            var tokenKind = currentToken().kind();
            if (tokenKind === SyntaxKind.ImplementsKeyword ||
                tokenKind === SyntaxKind.ExtendsKeyword) {

                return isIdentifier(peekToken(1));
            }

            return false;
        }

        function isHeritageClauseTypeName(): boolean {
            if (isIdentifier(currentToken())) {
                // We want to make sure that the "extends" in "extends foo" or the "implements" in
                // "implements foo" is not considered a type name.
                return !isNotHeritageClauseTypeName();
            }
            
            return false;
        }

        function tryParseHeritageClause(): HeritageClauseSyntax {
            var extendsOrImplementsKeyword = currentToken();
            var tokenKind = extendsOrImplementsKeyword.kind();
            if (tokenKind !== SyntaxKind.ExtendsKeyword && tokenKind !== SyntaxKind.ImplementsKeyword) {
                return null;
            }

            consumeToken(extendsOrImplementsKeyword);

            var listResult = parseSeparatedSyntaxList<INameSyntax>(ListParsingState.HeritageClause_TypeNameList);
            var typeNames = listResult.list;
            extendsOrImplementsKeyword = addSkippedTokensAfterToken(extendsOrImplementsKeyword, listResult.skippedTokens);

            return new HeritageClauseSyntax(parseNodeData, extendsOrImplementsKeyword, typeNames);
        }

        function isInterfaceEnumClassModuleImportOrExport(modifierCount: number): boolean {
            var _currentToken = currentToken();

            if (modifierCount) {
                // Any of these keywords following a modifier is definitely a TS construct.
                switch (peekToken(modifierCount).kind()) {
                    case SyntaxKind.ImportKeyword: 
                    case SyntaxKind.ModuleKeyword: 
                    case SyntaxKind.InterfaceKeyword: 
                    case SyntaxKind.ClassKeyword: 
                    case SyntaxKind.EnumKeyword: 
                        return true;
                }
            }

            // no modifiers.  While certain of these keywords are javascript keywords as well, it
            // is possible to run into them in some circumstances in error recovery where we don't
            // want to consider them the start of the module element construct.  For example, they
            // might be hte name in an object literal.  Because of that, we check the next token to
            // make sure it really is the start of a module element.
            var nextToken = peekToken(1);

            switch (_currentToken.kind()) {
                case SyntaxKind.ModuleKeyword:
                    if (isIdentifier(nextToken) || nextToken.kind() === SyntaxKind.StringLiteral) {
                        return true;
                    }
                    break;

                case SyntaxKind.ImportKeyword:
                case SyntaxKind.ClassKeyword:
                case SyntaxKind.EnumKeyword:
                case SyntaxKind.InterfaceKeyword:
                    if (isIdentifier(nextToken)) {
                        return true;
                    }
                    break;

                case SyntaxKind.ExportKeyword:
                    if (nextToken.kind() === SyntaxKind.EqualsToken) {
                        return true;
                    }
                    break;
            }

            return false;
        }

        function isStatement(modifierCount: number, inErrorRecovery: boolean): boolean {
            if (SyntaxUtilities.isStatement(currentNode())) {
                return true;
            }

            var _currentToken = currentToken();
            var currentTokenKind = _currentToken.kind();
            switch (currentTokenKind) {
                // ERROR RECOVERY
                case SyntaxKind.PublicKeyword:
                case SyntaxKind.PrivateKeyword:
                case SyntaxKind.StaticKeyword:
                    // None of the above are actually keywords.  And they might show up in a real
                    // statement (i.e. "public();").  However, if we see 'public <identifier>' then 
                    // that can't possibly be a statement (and instead will be a class element), 
                    // and we should not parse it out here.
                    var token1 = peekToken(1);
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
            if (isInterfaceEnumClassModuleImportOrExport(modifierCount)) {
                return false;
            }

            // More complicated cases.
            return isLabeledStatement(_currentToken) ||
                isVariableStatement(modifierCount) ||
                isFunctionDeclaration(modifierCount) ||
                isEmptyStatement(_currentToken, inErrorRecovery) ||
                isExpressionStatement(_currentToken);
        }

        function parseStatement(inErrorRecovery: boolean): IStatementSyntax {
            return tryParseStatement(modifierCount(), inErrorRecovery) || parseExpressionStatement();
        }

        function tryParseStatement(modifierCount: number, inErrorRecovery: boolean): IStatementSyntax {
            var node = currentNode();
            if (SyntaxUtilities.isStatement(node)) {
                consumeNode(node);
                return <IStatementSyntax><ISyntaxNode>node;
            }

            var _currentToken = currentToken();
            var currentTokenKind = _currentToken.kind();

            switch (currentTokenKind) {
                // ERROR RECOVERY
                case SyntaxKind.PublicKeyword:
                case SyntaxKind.PrivateKeyword:
                case SyntaxKind.StaticKeyword:
                    // None of the above are actually keywords.  And they might show up in a real
                    // statement (i.e. "public();").  However, if we see 'public <identifier>' then 
                    // that can't possibly be a statement (and instead will be a class element), 
                    // and we should not parse it out here.
                    if (SyntaxFacts.isIdentifierNameOrAnyKeyword(peekToken(1))) {
                        // Definitely not a statement.
                        return null;
                    }
                    else {
                        break;
                    }

                case SyntaxKind.IfKeyword: return parseIfStatement();
                case SyntaxKind.OpenBraceToken: return parseBlock(/*parseStatementsEvenWithNoOpenBrace:*/ false, /*checkForStrictMode:*/ false);
                case SyntaxKind.ReturnKeyword: return parseReturnStatement();
                case SyntaxKind.SwitchKeyword: return parseSwitchStatement(_currentToken);
                case SyntaxKind.ThrowKeyword: return parseThrowStatement();
                case SyntaxKind.BreakKeyword: return parseBreakStatement();
                case SyntaxKind.ContinueKeyword: return parseContinueStatement();
                case SyntaxKind.ForKeyword: return parseForOrForInStatement(_currentToken);
                case SyntaxKind.WhileKeyword: return parseWhileStatement(_currentToken);
                case SyntaxKind.WithKeyword: return parseWithStatement(_currentToken);
                case SyntaxKind.DoKeyword: return parseDoStatement(_currentToken);
                case SyntaxKind.TryKeyword: return parseTryStatement();
                case SyntaxKind.DebuggerKeyword: return parseDebuggerStatement();
            }
            
            // Check for common things that might appear where we expect a statement, but which we 
            // do not want to consume.  This can happen when the user does not terminate their 
            // existing block properly.  We don't want to accidently consume these as expression 
            // below.
            if (isInterfaceEnumClassModuleImportOrExport(modifierCount)) {
                return null;
            }

            if (isVariableStatement(modifierCount)) {
                return parseVariableStatement();
            }
            else if (isLabeledStatement(_currentToken)) {
                return parseLabeledStatement();
            }
            else if (isFunctionDeclaration(modifierCount)) {
                return parseFunctionDeclaration();
            }
            else if (isEmptyStatement(_currentToken, inErrorRecovery)) {
                return parseEmptyStatement(_currentToken);
            }
            else if (isExpressionStatement(_currentToken)) {
                return parseExpressionStatement();
            }
            else {
                return null;
            }
        }

        function parseDebuggerStatement(): DebuggerStatementSyntax {
            return new DebuggerStatementSyntax(parseNodeData,
                eatKeyword(SyntaxKind.DebuggerKeyword),
                eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false));
        }

        function parseDoStatement(doKeyword: ISyntaxToken): DoStatementSyntax {
            consumeToken(doKeyword);
            return new DoStatementSyntax(parseNodeData,
                doKeyword,
                parseStatement(/*inErrorRecovery:*/ false),
                eatKeyword(SyntaxKind.WhileKeyword),
                eatToken(SyntaxKind.OpenParenToken),
                parseExpression(/*allowIn:*/ true),
                eatToken(SyntaxKind.CloseParenToken),

                // From: https://mail.mozilla.org/pipermail/es-discuss/2011-August/016188.html
                // 157 min --- All allen at wirfs-brock.com CONF --- "do{;}while(false)false" prohibited in 
                // spec but allowed in consensus reality. Approved -- this is the de-facto standard whereby
                //  do;while(0)x will have a semicolon inserted before x.
                eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ true));
        }

        function isLabeledStatement(currentToken: ISyntaxToken): boolean {
            return isIdentifier(currentToken) && peekToken(1).kind() === SyntaxKind.ColonToken;
        }

        function parseLabeledStatement(): LabeledStatementSyntax {
            return new LabeledStatementSyntax(parseNodeData,
                eatIdentifierToken(),
                eatToken(SyntaxKind.ColonToken),
                parseStatement(/*inErrorRecovery:*/ false));
        }

        function parseTryStatement(): TryStatementSyntax {
            // Debug.assert(isTryStatement());

            var tryKeyword = eatKeyword(SyntaxKind.TryKeyword);

            var savedListParsingState = listParsingState;
            listParsingState |= ListParsingState.TryBlock_Statements;
            var block = parseBlock(/*parseStatementsEvenWithNoOpenBrace:*/ false, /*checkForStrictMode:*/ false);
            listParsingState = savedListParsingState;

            var catchClause: CatchClauseSyntax = null;
            if (isCatchClause()) {
                catchClause = parseCatchClause();
            }

            // If we don't have a catch clause, then we must have a finally clause.  Try to parse
            // one out no matter what.
            var finallyClause: FinallyClauseSyntax = null;
            if (catchClause === null || isFinallyClause()) {
                finallyClause = parseFinallyClause();
            }

            return new TryStatementSyntax(parseNodeData, tryKeyword, block, catchClause, finallyClause);
        }

        function isCatchClause(): boolean {
            return currentToken().kind() === SyntaxKind.CatchKeyword;
        }

        function parseCatchClauseBlock(): BlockSyntax {
            var savedListParsingState = listParsingState;
            listParsingState |= ListParsingState.CatchBlock_Statements;
            var block = parseBlock(/*parseStatementsEvenWithNoOpenBrace:*/ false, /*checkForStrictMode:*/ false);
            listParsingState = savedListParsingState;

            return block;
        }

        function parseCatchClause(): CatchClauseSyntax {
            return new CatchClauseSyntax(parseNodeData,
                eatToken(SyntaxKind.CatchKeyword),
                eatToken(SyntaxKind.OpenParenToken),
                eatIdentifierToken(),
                parseOptionalTypeAnnotation(/*allowStringLiteral:*/ false),
                eatToken(SyntaxKind.CloseParenToken),
                parseCatchClauseBlock());
        }

        function isFinallyClause(): boolean {
            return currentToken().kind() === SyntaxKind.FinallyKeyword;
        }

        function parseFinallyClause(): FinallyClauseSyntax {
            return new FinallyClauseSyntax(parseNodeData,
                eatKeyword(SyntaxKind.FinallyKeyword),
                parseBlock(/*parseStatementsEvenWithNoOpenBrace:*/ false, /*checkForStrictMode:*/ false));
        }

        function parseWithStatement(withKeyword: ISyntaxToken): WithStatementSyntax {
            consumeToken(withKeyword);
            return new WithStatementSyntax(parseNodeData,
                withKeyword,
                eatToken(SyntaxKind.OpenParenToken),
                parseExpression(/*allowIn:*/ true),
                eatToken(SyntaxKind.CloseParenToken),
                parseStatement(/*inErrorRecovery:*/ false));
        }

        function parseWhileStatement(whileKeyword: ISyntaxToken): WhileStatementSyntax {
            consumeToken(whileKeyword);
            return new WhileStatementSyntax(parseNodeData,
                whileKeyword,
                eatToken(SyntaxKind.OpenParenToken),
                parseExpression(/*allowIn:*/ true),
                eatToken(SyntaxKind.CloseParenToken),
                parseStatement(/*inErrorRecovery:*/ false));
        }

        function isEmptyStatement(currentToken: ISyntaxToken, inErrorRecovery: boolean): boolean {
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

        function parseEmptyStatement(semicolonToken: ISyntaxToken): EmptyStatementSyntax {
            consumeToken(semicolonToken);
            return new EmptyStatementSyntax(parseNodeData, semicolonToken);
        }

        function parseForOrForInStatement(forKeyword: ISyntaxToken): IStatementSyntax {
            // Debug.assert(isForOrForInStatement());

            consumeToken(forKeyword);
            var openParenToken = eatToken(SyntaxKind.OpenParenToken);

            var _currentToken = currentToken();
            var tokenKind = _currentToken.kind();
            if (tokenKind === SyntaxKind.VarKeyword) {
                // for ( var VariableDeclarationListNoIn; Expressionopt ; Expressionopt ) Statement
                // for ( var VariableDeclarationNoIn in Expression ) Statement
                return parseForOrForInStatementWithVariableDeclaration(forKeyword, openParenToken);
            }
            else if (tokenKind === SyntaxKind.SemicolonToken) {
                // for ( ; Expressionopt ; Expressionopt ) Statement
                return parseForStatementWithNoVariableDeclarationOrInitializer(forKeyword, openParenToken);
            }
            else {
                // for ( ExpressionNoInopt; Expressionopt ; Expressionopt ) Statement
                // for ( LeftHandSideExpression in Expression ) Statement
                return parseForOrForInStatementWithInitializer(forKeyword, openParenToken);
            }
        }

        function parseForOrForInStatementWithVariableDeclaration(forKeyword: ISyntaxToken, openParenToken: ISyntaxToken): IStatementSyntax {
            // Debug.assert(forKeyword.kind === SyntaxKind.ForKeyword && openParenToken.kind() === SyntaxKind.OpenParenToken);
            // Debug.assert(currentToken().kind() === SyntaxKind.VarKeyword);

            // for ( var VariableDeclarationListNoIn; Expressionopt ; Expressionopt ) Statement
            // for ( var VariableDeclarationNoIn in Expression ) Statement

            var variableDeclaration = parseVariableDeclaration(/*allowIn:*/ false);

            if (currentToken().kind() === SyntaxKind.InKeyword) {
                return parseForInStatementWithVariableDeclarationOrInitializer(forKeyword, openParenToken, variableDeclaration, null);
            }

            return parseForStatementWithVariableDeclarationOrInitializer(forKeyword, openParenToken, variableDeclaration, null);
        }

        function parseForInStatementWithVariableDeclarationOrInitializer(
                forKeyword: ISyntaxToken,
                openParenToken: ISyntaxToken,
                variableDeclaration: VariableDeclarationSyntax,
                initializer: IExpressionSyntax): ForInStatementSyntax {
            // for ( var VariableDeclarationNoIn in Expression ) Statement

            return new ForInStatementSyntax(parseNodeData,
                forKeyword, openParenToken, variableDeclaration, initializer,
                eatKeyword(SyntaxKind.InKeyword),
                parseExpression(/*allowIn:*/ true),
                eatToken(SyntaxKind.CloseParenToken),
                parseStatement(/*inErrorRecovery:*/ false));
        }

        function parseForOrForInStatementWithInitializer(forKeyword: ISyntaxToken, openParenToken: ISyntaxToken): IStatementSyntax {
            // Debug.assert(forKeyword.kind() === SyntaxKind.ForKeyword && openParenToken.kind() === SyntaxKind.OpenParenToken);

            // for ( ExpressionNoInopt; Expressionopt ; Expressionopt ) Statement
            // for ( LeftHandSideExpression in Expression ) Statement

            var initializer = parseExpression(/*allowIn:*/ false);
            if (currentToken().kind() === SyntaxKind.InKeyword) {
                return parseForInStatementWithVariableDeclarationOrInitializer(forKeyword, openParenToken, null, initializer);
            }
            else {
                return parseForStatementWithVariableDeclarationOrInitializer(forKeyword, openParenToken, null, initializer);
            }
        }

        function parseForStatementWithNoVariableDeclarationOrInitializer(forKeyword: ISyntaxToken, openParenToken: ISyntaxToken): ForStatementSyntax {
            // Debug.assert(forKeyword.kind() === SyntaxKind.ForKeyword && openParenToken.kind() === SyntaxKind.OpenParenToken);
            // Debug.assert(currentToken().kind() === SyntaxKind.SemicolonToken);
            // for ( ; Expressionopt ; Expressionopt ) Statement

            return parseForStatementWithVariableDeclarationOrInitializer(forKeyword, openParenToken, /*variableDeclaration:*/ null, /*initializer:*/ null);
        }

        function tryParseForStatementCondition(): IExpressionSyntax {
            var token0 = currentToken();
            var tokenKind = token0.kind();
            if (tokenKind !== SyntaxKind.SemicolonToken &&
                tokenKind !== SyntaxKind.CloseParenToken &&
                tokenKind !== SyntaxKind.EndOfFileToken) {
                return parseExpression(/*allowIn:*/ true);
            }

            return null;
        }

        function tryParseForStatementIncrementor(): IExpressionSyntax {
            var token0 = currentToken();
            var tokenKind = token0.kind();
            if (tokenKind !== SyntaxKind.CloseParenToken &&
                tokenKind !== SyntaxKind.EndOfFileToken) {
                return parseExpression(/*allowIn:*/ true);
            }

            return null;
        }

        function parseForStatementWithVariableDeclarationOrInitializer(
                    forKeyword: ISyntaxToken,
                    openParenToken: ISyntaxToken,
                    variableDeclaration: VariableDeclarationSyntax,
                    initializer: IExpressionSyntax): ForStatementSyntax {

            return new ForStatementSyntax(parseNodeData,
                forKeyword, openParenToken, variableDeclaration, initializer,

                // NOTE: From the es5 section on Automatic Semicolon Insertion.
                // a semicolon is never inserted automatically if the semicolon would then ... become 
                // one of the two semicolons in the header of a for statement
                eatToken(SyntaxKind.SemicolonToken),
                tryParseForStatementCondition(),

                // NOTE: See above.  Semicolons in for statements don't participate in automatic 
                // semicolon insertion.
                eatToken(SyntaxKind.SemicolonToken),
                tryParseForStatementIncrementor(),
                eatToken(SyntaxKind.CloseParenToken),
                parseStatement(/*inErrorRecovery:*/ false));
        }

        function tryEatBreakOrContinueLabel(): ISyntaxToken {
            // If there is no newline after the break keyword, then we can consume an optional 
            // identifier.
            var identifier: ISyntaxToken = null;
            if (!canEatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false)) {
                if (isIdentifier(currentToken())) {
                    return eatIdentifierToken();
                }
            }

            return null;
        }

        function parseBreakStatement(): BreakStatementSyntax {
            return new BreakStatementSyntax(parseNodeData,
                eatKeyword(SyntaxKind.BreakKeyword),
                tryEatBreakOrContinueLabel(),
                eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false));
        }

        function parseContinueStatement(): ContinueStatementSyntax {
            return new ContinueStatementSyntax(parseNodeData,
                eatKeyword(SyntaxKind.ContinueKeyword),
                tryEatBreakOrContinueLabel(),
                eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false));
        }

        function parseSwitchStatement(switchKeyword: ISyntaxToken) {
            // Debug.assert(isSwitchStatement());

            consumeToken(switchKeyword);
            var openParenToken = eatToken(SyntaxKind.OpenParenToken);
            var expression = parseExpression(/*allowIn:*/ true);
            var closeParenToken = eatToken(SyntaxKind.CloseParenToken);

            var openBraceToken = eatToken(SyntaxKind.OpenBraceToken);

            var switchClauses = Syntax.emptyList<ISwitchClauseSyntax>();
            if (openBraceToken.fullWidth() > 0) {
                var listResult = parseSyntaxList<ISwitchClauseSyntax>(ListParsingState.SwitchStatement_SwitchClauses);
                switchClauses = listResult.list;
                openBraceToken = addSkippedTokensAfterToken(openBraceToken, listResult.skippedTokens);
            }

            var closeBraceToken = eatToken(SyntaxKind.CloseBraceToken);

            return new SwitchStatementSyntax(parseNodeData, switchKeyword, openParenToken, expression, closeParenToken, openBraceToken, switchClauses, closeBraceToken);
        }

        function isSwitchClause(): boolean {
            if (SyntaxUtilities.isSwitchClause(currentNode())) {
                return true;
            }

            var currentTokenKind = currentToken().kind();
            return currentTokenKind === SyntaxKind.CaseKeyword || currentTokenKind === SyntaxKind.DefaultKeyword;
        }

        function tryParseSwitchClause(): ISwitchClauseSyntax {
            // Debug.assert(isSwitchClause());
            var node = currentNode();
            if (SyntaxUtilities.isSwitchClause(node)) {
                consumeNode(node);
                return <ISwitchClauseSyntax><ISyntaxNode>node;
            }

            var _currentToken = currentToken();
            var kind = _currentToken.kind();
            if (kind === SyntaxKind.CaseKeyword) {
                return parseCaseSwitchClause(_currentToken);
            }
            else if (kind === SyntaxKind.DefaultKeyword) {
                return parseDefaultSwitchClause(_currentToken);
            }
            else {
                return null;
            }
        }

        function parseCaseSwitchClause(caseKeyword: ISyntaxToken): CaseSwitchClauseSyntax {
            // Debug.assert(isCaseSwitchClause());

            consumeToken(caseKeyword);
            var expression = parseExpression(/*allowIn:*/ true);
            var colonToken = eatToken(SyntaxKind.ColonToken);
            var statements = Syntax.emptyList<IStatementSyntax>();

            // TODO: allow parsing of the list evne if there's no colon.  However, we have to make 
            // sure we add any skipped tokens to the right previous node or token.
            if (colonToken.fullWidth() > 0) {
                var listResult = parseSyntaxList<IStatementSyntax>(ListParsingState.SwitchClause_Statements);
                statements = listResult.list;
                colonToken = addSkippedTokensAfterToken(colonToken, listResult.skippedTokens);
            }

            return new CaseSwitchClauseSyntax(parseNodeData, caseKeyword, expression, colonToken, statements);
        }

        function parseDefaultSwitchClause(defaultKeyword: ISyntaxToken): DefaultSwitchClauseSyntax {
            // Debug.assert(isDefaultSwitchClause());

            consumeToken(defaultKeyword);
            var colonToken = eatToken(SyntaxKind.ColonToken);
            var statements = Syntax.emptyList<IStatementSyntax>();

            // TODO: Allow parsing without a colon here.  However, ensure that we attach any skipped 
            // tokens to the defaultKeyword.
            if (colonToken.fullWidth() > 0) {
                var listResult = parseSyntaxList<IStatementSyntax>(ListParsingState.SwitchClause_Statements);
                statements = listResult.list;
                colonToken = addSkippedTokensAfterToken(colonToken, listResult.skippedTokens);
            }

            return new DefaultSwitchClauseSyntax(parseNodeData, defaultKeyword, colonToken, statements);
        }

        function parseThrowStatementExpression(): IExpressionSyntax {
            if (canEatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false)) {
                // Because of automatic semicolon insertion, we need to report error if this 
                // throw could be terminated with a semicolon.  Note: we can't call 'parseExpression'
                // directly as that might consume an expression on the following line.  
                return createMissingToken(SyntaxKind.IdentifierName, null);
            }
            else {
                return parseExpression(/*allowIn:*/ true);
            }
        }

        function parseThrowStatement(): ThrowStatementSyntax {
            return new ThrowStatementSyntax(parseNodeData,
                eatKeyword(SyntaxKind.ThrowKeyword),
                parseThrowStatementExpression(),
                eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false));
        }

        function tryParseReturnStatementExpression(): IExpressionSyntax {
            if (!canEatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false)) {
                return parseExpression(/*allowIn:*/ true);
            }

            return null;
        }

        function parseReturnStatement(): ReturnStatementSyntax {
            return new ReturnStatementSyntax(parseNodeData,
                eatKeyword(SyntaxKind.ReturnKeyword),
                tryParseReturnStatementExpression(),
                eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false));
        }

        function isExpressionStatement(currentToken: ISyntaxToken): boolean {
            // As per the gramar, neither { nor 'function' can start an expression statement.
            var tokenKind = currentToken.kind();
            if (tokenKind === SyntaxKind.OpenBraceToken || tokenKind === SyntaxKind.FunctionKeyword) {
                return false;
            }

            return isExpression(currentToken);
        }

        function isAssignmentOrOmittedExpression(): boolean {
            var _currentToken = currentToken();
            if (_currentToken.kind() === SyntaxKind.CommaToken) {
                return true;
            }

            return isExpression(_currentToken);
        }

        function tryParseAssignmentOrOmittedExpression(): IExpressionSyntax {
            // Debug.assert(isAssignmentOrOmittedExpression());

            if (currentToken().kind() === SyntaxKind.CommaToken) {
                return new OmittedExpressionSyntax(parseNodeData);
            }

            return tryParseAssignmentExpressionOrHigher(/*force:*/ false, /*allowIn:*/ true);
        }

        function isExpression(currentToken: ISyntaxToken): boolean {
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

            return isIdentifier(currentToken);
        }

        function parseExpressionStatement(): ExpressionStatementSyntax {
            return new ExpressionStatementSyntax(parseNodeData,
                parseExpression(/*allowIn:*/ true),
                eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false));
        }

        function parseIfStatement(): IfStatementSyntax {
            return new IfStatementSyntax(parseNodeData,
                eatKeyword(SyntaxKind.IfKeyword),
                eatToken(SyntaxKind.OpenParenToken),
                parseExpression(/*allowIn:*/ true),
                eatToken(SyntaxKind.CloseParenToken),
                parseStatement(/*inErrorRecovery:*/ false),
                parseOptionalElseClause());
        }

        function parseOptionalElseClause(): ElseClauseSyntax {
            return currentToken().kind() === SyntaxKind.ElseKeyword ? parseElseClause() : null;
        }

        function parseElseClause(): ElseClauseSyntax {
            return new ElseClauseSyntax(parseNodeData,
                eatKeyword(SyntaxKind.ElseKeyword),
                parseStatement(/*inErrorRecovery:*/ false));
        }

        function isVariableStatement(modifierCount: number): boolean {
            return peekToken(modifierCount).kind() === SyntaxKind.VarKeyword;
        }

        function parseVariableStatement(): VariableStatementSyntax {
            return new VariableStatementSyntax(parseNodeData,
                parseModifiers(),
                parseVariableDeclaration(/*allowIn:*/ true),
                eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false));
        }

        function parseVariableDeclaration(allowIn: boolean): VariableDeclarationSyntax {
            // Debug.assert(currentToken().kind() === SyntaxKind.VarKeyword);

            var varKeyword = eatKeyword(SyntaxKind.VarKeyword);
            // Debug.assert(varKeyword.fullWidth() > 0);

            var listParsingState = allowIn
                ? ListParsingState.VariableDeclaration_VariableDeclarators_AllowIn
                : ListParsingState.VariableDeclaration_VariableDeclarators_DisallowIn;

            var resultList = parseSeparatedSyntaxList<VariableDeclaratorSyntax>(listParsingState);
            var variableDeclarators = resultList.list;
            varKeyword = addSkippedTokensAfterToken(varKeyword, resultList.skippedTokens);

            return new VariableDeclarationSyntax(parseNodeData, varKeyword, variableDeclarators);
        }

        function isVariableDeclarator(): boolean {
            if (currentNode() !== null && currentNode().kind() === SyntaxKind.VariableDeclarator) {
                return true;
            }

            return isIdentifier(currentToken());
        }

        function canReuseVariableDeclaratorNode(node: ISyntaxNode) {
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

        function tryParseVariableDeclarator(allowIn: boolean, allowPropertyName: boolean): VariableDeclaratorSyntax {
            // TODO(cyrusn): What if the 'allowIn' context has changed between when we last parsed 
            // and now?  We could end up with an incorrect tree.  For example, say we had in the old 
            // tree "var i = a in b".  Then, in the new tree the declarator portion moved into:
            // "for (var i = a in b".  We would not want to reuse the declarator as the "in b" portion 
            // would need to be consumed by the for declaration instead.  Need to see if it is possible
            // to hit this case.
            var node = currentNode();
            if (canReuseVariableDeclaratorNode(node)) {
                consumeNode(node);
                return <VariableDeclaratorSyntax>node;
            }

            if (allowPropertyName) {
                // Debug.assert(isPropertyName(currentToken(), /*inErrorRecovery:*/ false));
            }

            if (!allowPropertyName && !isIdentifier(currentToken())) {
                return null;
            }

            var propertyName = allowPropertyName ? eatPropertyName() : eatIdentifierToken();
            var equalsValueClause: EqualsValueClauseSyntax = null;
            var typeAnnotation: TypeAnnotationSyntax = null;

            if (propertyName.fullWidth() > 0) {
                typeAnnotation = parseOptionalTypeAnnotation(/*allowStringLiteral:*/ false);

                if (isEqualsValueClause(/*inParameter*/ false)) {
                    equalsValueClause = parseEqualsValueClause(allowIn);
                }
            }

            return new VariableDeclaratorSyntax(parseNodeData, propertyName, typeAnnotation, equalsValueClause);
        }

        function isEqualsValueClause(inParameter: boolean): boolean {
            var token0 = currentToken();
            if (token0.kind() === SyntaxKind.EqualsToken) {
                return true;
            }

            // It's not uncommon during typing for the user to miss writing the '=' token.  Check if
            // there is no newline after the last token and if we're on an expression.  If so, parse
            // this as an equals-value clause with a missing equals.
            if (!previousTokenHasTrailingNewLine(token0)) {
                var tokenKind = token0.kind();

                // The 'isExpression' call below returns true for "=>".  That's because it smartly
                // assumes that there is just a missing identifier and the user wanted a lambda.  
                // While this is sensible, we don't want to allow that here as that would mean we're
                // glossing over multiple erorrs and we're probably making things worse.  So don't
                // treat this as an equals value clause and let higher up code handle things.
                if (tokenKind === SyntaxKind.EqualsGreaterThanToken) {
                    return false;
                }

                // There are two places where we allow equals-value clauses.  The first is in a 
                // variable declarator.  The second is with a parameter.  For variable declarators
                // it's more likely that a { would be a allowed (as an object literal).  While this
                // is also allowed for parameters, the risk is that we consume the { as an object
                // literal when it really will be for the block following the parameter.
                if (tokenKind === SyntaxKind.OpenBraceToken &&
                    inParameter) {
                    return false;
                }

                return isExpression(token0);
            }

            return false;
        }

        function parseEqualsValueClause(allowIn: boolean): EqualsValueClauseSyntax {
            return new EqualsValueClauseSyntax(parseNodeData,
                eatToken(SyntaxKind.EqualsToken),
                tryParseAssignmentExpressionOrHigher(/*force:*/ true, allowIn));
        }

        function parseExpression(allowIn: boolean): IExpressionSyntax {
            // Expression[in]:
            //      AssignmentExpression[in] 
            //      Expression[in] , AssignmentExpression[in]

            var leftOperand = tryParseAssignmentExpressionOrHigher(/*force:*/ true, allowIn);
            while (true) {
                var token0 = currentToken();
                var token0Kind = token0.kind();

                if (token0Kind !== SyntaxKind.CommaToken) {
                    break;
                }

                consumeToken(token0);

                var rightOperand = tryParseAssignmentExpressionOrHigher(/*force:*/ true, allowIn);
                leftOperand = new BinaryExpressionSyntax(parseNodeData, leftOperand, token0, rightOperand);
            }

            return leftOperand;
        }

        // Called when you need to parse an expression, but you do not want to allow 'CommaExpressions'.
        // i.e. if you have "var a = 1, b = 2" then when we parse '1' we want to parse with higher 
        // precedence than 'comma'.  Otherwise we'll get: "var a = (1, (b = 2))", instead of
        // "var a = (1), b = (2)");
        function tryParseAssignmentExpressionOrHigher(force: boolean, allowIn: boolean): IExpressionSyntax {
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

            var arrowFunction = tryParseAnyArrowFunctionExpression();
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
            var leftOperand = tryParseBinaryExpressionOrHigher(force, BinaryExpressionPrecedence.Lowest, allowIn);
            if (leftOperand === null) {
                return null;
            }

            if (SyntaxUtilities.isLeftHandSizeExpression(leftOperand)) {
                // Note: we call currentOperatorToken so that we get an appropriately merged token
                // for cases like > > =  becoming >>=
                var token0 = currentOperatorToken();
                var token0Kind = token0.kind();

                // Check for recursive assignment expressions.
                if (isAssignmentOperatorToken(token0Kind)) {
                    consumeToken(token0);

                    var rightOperand = tryParseAssignmentExpressionOrHigher(/*force:*/ true, allowIn);

                    return new BinaryExpressionSyntax(parseNodeData, leftOperand, token0, rightOperand);
                }
            }

            // It wasn't an assignment or a lambda.  This is a conditional expression:
            return parseConditionalExpressionRest(allowIn, leftOperand);
        }

        function isAssignmentOperatorToken(tokenKind: SyntaxKind): boolean {
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

        function tryParseAnyArrowFunctionExpression(): IExpressionSyntax {
            if (isSimpleArrowFunctionExpression()) {
                return parseSimpleArrowFunctionExpression();
            }

            return tryParseParenthesizedArrowFunctionExpression();
        }

        function tryParseUnaryExpressionOrHigher(force: boolean): IUnaryExpressionSyntax {
            var _currentToken = currentToken();
            var currentTokenKind = _currentToken.kind();
            var operatorKind = SyntaxFacts.getPrefixUnaryExpressionFromOperatorToken(currentTokenKind);

            if (operatorKind !== SyntaxKind.None) {
                consumeToken(_currentToken);
                return new PrefixUnaryExpressionSyntax(parseNodeData, _currentToken, tryParseUnaryExpressionOrHigher(/*force:*/ true));
            }
            else if (currentTokenKind === SyntaxKind.TypeOfKeyword) {
                return parseTypeOfExpression();
            }
            else if (currentTokenKind === SyntaxKind.VoidKeyword) {
                return parseVoidExpression();
            }
            else if (currentTokenKind === SyntaxKind.DeleteKeyword) {
                return parseDeleteExpression();
            }
            else if (currentTokenKind === SyntaxKind.LessThanToken) {
                return parseCastExpression();
            }
            else {
                return tryParsePostfixExpressionOrHigher(force);
            }
        }

        function tryParseBinaryExpressionOrHigher(force: boolean, precedence: BinaryExpressionPrecedence, allowIn: boolean): IExpressionSyntax {
            // The binary expressions are incredibly left recursive in their definitions. We 
            // clearly can't implement that through recursion.  So, instead, we first bottom out 
            // of all the recursion by jumping to this production and consuming a UnaryExpression 
            // first.
            //
            // MultiplicativeExpression: See 11.5 
            //      UnaryExpression 
            var leftOperand = tryParseUnaryExpressionOrHigher(force);
            if (leftOperand === null) {
                return null;
            }

            // We then pop up the stack consuming the other side of the binary exprssion if it exists.
            return parseBinaryExpressionRest(precedence, allowIn, leftOperand);
        }

        function parseConditionalExpressionRest(allowIn: boolean, leftOperand: IExpressionSyntax): IExpressionSyntax {
            // Note: we are passed in an expression which was produced from parseBinaryExpressionOrHigher.

            var _currentToken = currentToken();

            // Now check for conditional expression.
            if (_currentToken.kind() !== SyntaxKind.QuestionToken) {
                return leftOperand;
            }

            consumeToken(_currentToken);
            return new ConditionalExpressionSyntax(parseNodeData,
                leftOperand,
                _currentToken,

                // Note: we explicitly do *not* pass 'allowIn' here.  An 'in' expression is always
                // allowed in the 'true' part of a conditional expression.
                tryParseAssignmentExpressionOrHigher(/*force:*/ true, /*allowIn:*/ true),
                eatToken(SyntaxKind.ColonToken),
                tryParseAssignmentExpressionOrHigher(/*force:*/ true, allowIn));
        }

        function parseBinaryExpressionRest(precedence: BinaryExpressionPrecedence, allowIn: boolean, leftOperand: IExpressionSyntax): IExpressionSyntax {
            while (true) {
                // We either have a binary operator here, or we're finished.  We call 
                // currentOperatorToken versus currentToken here so that we merge token sequences
                // like > and = into >=
                var operatorToken = currentOperatorToken();
                var tokenKind = operatorToken.kind();

                // Only proceed if we see binary expression token.  However we don't parse 
                // assignment expressions or comma expressions here.  Those are taken care of 
                // respectively in parseAssignmentExpression and parseExpression.
                if (!SyntaxFacts.isBinaryExpressionOperatorToken(tokenKind) ||
                    tokenKind === SyntaxKind.CommaToken ||
                    isAssignmentOperatorToken(tokenKind)) {

                    break;
                }

                // also, if it's the 'in' operator, only allow if our caller allows it.
                if (tokenKind === SyntaxKind.InKeyword && !allowIn) {
                    break;
                }

                var newPrecedence = getBinaryExpressionPrecedence(tokenKind);

                // All binary operators must have precedence > 0
                // Debug.assert(newPrecedence > 0);

                // Check the precedence to see if we should "take" this operator
                if (newPrecedence <= precedence) {
                    break;
                }

                // Precedence is okay, so we'll "take" this operator.
                // Now skip the operator token we're on.
                consumeToken(operatorToken);

                var rightOperand = tryParseBinaryExpressionOrHigher(/*force:*/ true, newPrecedence, allowIn);
                leftOperand = new BinaryExpressionSyntax(parseNodeData, leftOperand, operatorToken, rightOperand);
            }

            return leftOperand;
        }

        var mergeTokensStorage: SyntaxKind[] = [];

        function currentOperatorToken(): ISyntaxToken {
            var token0 = currentToken();

            // If we see a > we need to see if we can actually merge this contextually into a 
            // >>  >>>  >=  >>=  >>>=  token.
            if (token0.kind() === SyntaxKind.GreaterThanToken) {
                token0 = currentContextualToken();
                // var kind = token0.kind;
                //Debug.assert(kind() === SyntaxKind.GreaterThanToken || kind() === SyntaxKind.GreaterThanGreaterThanToken ||
                //             kind() === SyntaxKind.GreaterThanGreaterThanGreaterThanToken || kind() === SyntaxKind.GreaterThanEqualsToken ||
                //             kind() === SyntaxKind.GreaterThanGreaterThanEqualsToken || kind() === SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken);
            }

            return token0;
        }

        function tryParseMemberExpressionOrHigher(force: boolean, inObjectCreation: boolean): IMemberExpressionSyntax {
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
            if (currentToken().kind() === SyntaxKind.NewKeyword) {
                expression = parseObjectCreationExpression();
            }
            else {
                expression = tryParsePrimaryExpression(force);
                if (expression === null) {
                    return null;
                }
            }
        
            return parseMemberExpressionRest(expression, /*inObjectCreation:*/ inObjectCreation); 
        }

        function parseCallExpressionRest(expression: ILeftHandSideExpressionSyntax, inObjectCreation: boolean): ILeftHandSideExpressionSyntax {
            return parseCallOrMemberExpressionRest(expression, /*allowArguments:*/ true, inObjectCreation);
        }

        function parseMemberExpressionRest(expression: IMemberExpressionSyntax, inObjectCreation: boolean): IMemberExpressionSyntax {
            return <IMemberExpressionSyntax>parseCallOrMemberExpressionRest(expression, /*allowArguments:*/ false, inObjectCreation);
        }

        function parseCallOrMemberExpressionRest(
            expression: ILeftHandSideExpressionSyntax, allowArguments: boolean, inObjectCreation: boolean): ILeftHandSideExpressionSyntax {

            while (true) {
                var _currentToken = currentToken();
                var currentTokenKind = _currentToken.kind();

                switch (currentTokenKind) {
                    case SyntaxKind.OpenParenToken:
                        if (!allowArguments) {
                            break;
                        }

                        expression = new InvocationExpressionSyntax(parseNodeData, expression, parseArgumentList(/*typeArgumentList:*/ null));
                        continue;

                    case SyntaxKind.LessThanToken:
                        if (!allowArguments) {
                            break;
                        }

                        // See if this is the start of a generic invocation.  If so, consume it and
                        // keep checking for postfix expressions.  Otherwise, it's just a '<' that's 
                        // part of an arithmetic expression.  Break out so we consume it higher in the
                        // stack.
                        var argumentList = tryParseArgumentList();
                        if (argumentList === null) {
                            break;
                        }

                        expression = new InvocationExpressionSyntax(parseNodeData, expression, argumentList);
                        continue;

                    case SyntaxKind.OpenBracketToken:
                        expression = parseElementAccessExpression(expression, inObjectCreation);
                        continue;

                    case SyntaxKind.DotToken:
                        consumeToken(_currentToken);
                        expression = new MemberAccessExpressionSyntax(parseNodeData, expression, _currentToken, eatIdentifierNameToken());
                        continue;
                }

                return expression;
            }
        }

        function tryParseLeftHandSideExpressionOrHigher(force: boolean): ILeftHandSideExpressionSyntax {
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
            var _currentToken = currentToken();
            if (_currentToken.kind() === SyntaxKind.SuperKeyword) {
                expression = parseSuperExpression(_currentToken);
            }
            else {
                expression = tryParseMemberExpressionOrHigher(force, /*inObjectCreation:*/ false);
                if (expression === null) {
                    return null;
                }
            }

            // Now, we *may* be complete.  However, we might have consumed the start of a 
            // CallExpression.  As such, we need to consume the rest of it here to be complete.
            return parseCallExpressionRest(expression, /*inObjectCreation:*/ false);
        }

        function parseSuperExpression(superToken: ISyntaxToken): ILeftHandSideExpressionSyntax {
            consumeToken(superToken);
            var expression: ILeftHandSideExpressionSyntax = superToken;

            // If we have seen "super" it must be followed by '(' or '.'.
            // If it wasn't then just try to parse out a '.' and report an error.
            var currentTokenKind = currentToken().kind();
            if (currentTokenKind === SyntaxKind.OpenParenToken || currentTokenKind === SyntaxKind.DotToken) {
                return expression;
            }

            return new MemberAccessExpressionSyntax(parseNodeData, expression, eatToken(SyntaxKind.DotToken), eatIdentifierNameToken());
        }

        function tryParsePostfixExpressionOrHigher(force: boolean): IPostfixExpressionSyntax {
            var expression = tryParseLeftHandSideExpressionOrHigher(force);
            if (expression === null) {
                return null;
            }

            var _currentToken = currentToken();
            var currentTokenKind = _currentToken.kind();

            switch (currentTokenKind) {
                case SyntaxKind.PlusPlusToken:
                case SyntaxKind.MinusMinusToken:
                    // Because of automatic semicolon insertion, we should only consume the ++ or -- 
                    // if it is on the same line as the previous token.
                    if (previousTokenHasTrailingNewLine(_currentToken)) {
                        break;
                    }

                    consumeToken(_currentToken);
                    return new PostfixUnaryExpressionSyntax(parseNodeData, expression, _currentToken);
            }

            return expression;
        }

        function tryParseGenericArgumentList(): ArgumentListSyntax {
            // Debug.assert(currentToken().kind() === SyntaxKind.LessThanToken);
            // If we have a '<', then only parse this as a arugment list if the type arguments
            // are complete and we have an open paren.  if we don't, rewind and return nothing.
            var rewindPoint = getRewindPoint();

            var typeArgumentList = tryParseTypeArgumentList(/*inExpression:*/ true);
            var token0 = currentToken();
            var tokenKind = token0.kind();

            var isOpenParen = tokenKind === SyntaxKind.OpenParenToken;
            var isDot = tokenKind === SyntaxKind.DotToken;
            var isOpenParenOrDot = isOpenParen || isDot;

            var argumentList: ArgumentListSyntax = null;
            if (typeArgumentList === null || !isOpenParenOrDot) {
                // Wasn't generic.  Rewind to where we started so this can be parsed as an 
                // arithmetic expression.
                rewind(rewindPoint);
                releaseRewindPoint(rewindPoint);
                return null;
            }
            else {
                releaseRewindPoint(rewindPoint);
                // It's not uncommon for a user to type: "Foo<T>."
                //
                // This is not legal in typescript (as an parameter list must follow the type
                // arguments).  We want to give a good error message for this as otherwise
                // we'll bail out here and give a poor error message when we try to parse this
                // as an arithmetic expression.
                if (isDot) {
                    // A parameter list must follow a generic type argument list.
                    var diagnostic = new Diagnostic(fileName, source.text.lineMap(), start(token0), width(token0),
                        DiagnosticCode.A_parameter_list_must_follow_a_generic_type_argument_list_expected, null);
                    addDiagnostic(diagnostic);

                    return new ArgumentListSyntax(parseNodeData, typeArgumentList,
                        Syntax.emptyToken(SyntaxKind.OpenParenToken), Syntax.emptySeparatedList<IExpressionSyntax>(), Syntax.emptyToken(SyntaxKind.CloseParenToken));
                }
                else {
                    return parseArgumentList(typeArgumentList);
                }
            }
        }

        function tryParseArgumentList(): ArgumentListSyntax {
            var tokenKind = currentToken().kind();
            if (tokenKind === SyntaxKind.LessThanToken) {
                return tryParseGenericArgumentList();
            }

            if (tokenKind === SyntaxKind.OpenParenToken) {
                return parseArgumentList(null);
            }

            return null;
        }

        function parseArgumentList(typeArgumentList: TypeArgumentListSyntax): ArgumentListSyntax {
            var openParenToken = eatToken(SyntaxKind.OpenParenToken);

            // Don't use the name 'arguments' it prevents V8 from optimizing this method.
            var _arguments = Syntax.emptySeparatedList<IExpressionSyntax>();

            if (openParenToken.fullWidth() > 0) {
                var result = parseSeparatedSyntaxList<IExpressionSyntax>(ListParsingState.ArgumentList_AssignmentExpressions);
                _arguments = result.list;
                openParenToken = addSkippedTokensAfterToken(openParenToken, result.skippedTokens);
            }

            var closeParenToken = eatToken(SyntaxKind.CloseParenToken);

            return new ArgumentListSyntax(parseNodeData, typeArgumentList, openParenToken, _arguments, closeParenToken);
        }

        function tryParseArgumentListExpression(): IExpressionSyntax {
            // Generally while parsing lists, we don't want to 'force' the parser to parse
            // the item.  That way, if the expected item isn't htere, we can bail out and
            // move to a higher stage of list parsing.  However, it's extremely common to 
            // see something like "Foo(, a".  in this case, even though there isn't an expression
            // after the open paren, we still want to force parsing an expression (which will
            // cause a missing identiifer to be created), so that we will then consume the
            // comma and the following list items).
            var force = currentToken().kind() === SyntaxKind.CommaToken;
            return tryParseAssignmentExpressionOrHigher(force, /*allowIn:*/ true);
        }

        function parseElementAccessExpression(expression: ILeftHandSideExpressionSyntax, inObjectCreation: boolean): ElementAccessExpressionSyntax {
            // Debug.assert(currentToken().kind() === SyntaxKind.OpenBracketToken);

            var openBracketToken = eatToken(SyntaxKind.OpenBracketToken);
            var argumentExpression: IExpressionSyntax;

            // It's not uncommon for a user to write: "new Type[]".  Check for that common pattern
            // and report a better error message.
            if (currentToken().kind() === SyntaxKind.CloseBracketToken &&
                inObjectCreation) {

                var start = TypeScript.start(openBracketToken);
                var end = TypeScript.end(currentToken());
                var diagnostic = new Diagnostic(fileName, source.text.lineMap(), start, end - start,
                    DiagnosticCode.new_T_cannot_be_used_to_create_an_array_Use_new_Array_T_instead, null);
                addDiagnostic(diagnostic);

                argumentExpression = Syntax.emptyToken(SyntaxKind.IdentifierName);
            }
            else {
                argumentExpression = parseExpression(/*allowIn:*/ true);
            }

            var closeBracketToken = eatToken(SyntaxKind.CloseBracketToken);

            return new ElementAccessExpressionSyntax(parseNodeData, expression, openBracketToken, argumentExpression, closeBracketToken);
        }

        function tryParsePrimaryExpression(force: boolean): IPrimaryExpressionSyntax {
            var _currentToken = currentToken();

            if (isIdentifier(_currentToken)) {
                return eatIdentifierToken();
            }

            var currentTokenKind = _currentToken.kind();
            switch (currentTokenKind) {
                case SyntaxKind.ThisKeyword:
                case SyntaxKind.TrueKeyword:
                case SyntaxKind.FalseKeyword:
                case SyntaxKind.NullKeyword:
                case SyntaxKind.NumericLiteral:
                case SyntaxKind.RegularExpressionLiteral:
                case SyntaxKind.StringLiteral:
                    consumeToken(_currentToken);
                    return _currentToken;

                case SyntaxKind.FunctionKeyword:
                    return parseFunctionExpression();

                case SyntaxKind.OpenBracketToken:
                    return parseArrayLiteralExpression(_currentToken);

                case SyntaxKind.OpenBraceToken:
                    return parseObjectLiteralExpression(_currentToken);

                case SyntaxKind.OpenParenToken:
                    return parseParenthesizedExpression();

                case SyntaxKind.SlashToken:
                case SyntaxKind.SlashEqualsToken:
                    // If we see a standalone / or /= and we're expecting a term, then try to reparse
                    // it as a regular expression.  If we succeed, then return that.  Otherwise, fall
                    // back and just return a missing identifier as usual.  We'll then form a binary
                    // expression out of of the / as usual.
                    var result = tryReparseDivideAsRegularExpression();
                    return result || eatIdentifierToken()
            }

            if (!force) {
                return null;
            }

            // Nothing else worked, just try to consume an identifier so we report an error.
            return eatIdentifierToken();
        }

        function tryReparseDivideAsRegularExpression(): IPrimaryExpressionSyntax {
            // If we see a / or /= token, then that may actually be the start of a regex in certain 
            // contexts.

            // var currentToken = this.currentToken();
            // Debug.assert(SyntaxFacts.isAnyDivideToken(currentToken.kind()));

            // Ok, from our quick lexical check, this could be a place where a regular expression could
            // go.  Now we have to do a bunch of work.  Ask the source to retrive the token at the 
            // current position again.  But this time allow it to retrieve it as a regular expression.
            var currentToken = currentContextualToken();

            // Note: we *must* have gotten a /, /= or regular expression.  Or else something went *very*
            // wrong with our logic above.
            // Debug.assert(SyntaxFacts.isAnyDivideOrRegularExpressionToken(currentToken.kind()));

            var tokenKind = currentToken.kind();
            if (tokenKind === SyntaxKind.SlashToken || tokenKind === SyntaxKind.SlashEqualsToken) {
                // Still came back as a / or /=.   This is not a regular expression literal.
                return null;
            }
            else if (tokenKind === SyntaxKind.RegularExpressionLiteral) {
                consumeToken(currentToken);
                return currentToken;
            }
            else {
                // Something *very* wrong happened.  This is an internal parser fault that we need 
                // to figure out and fix.
                throw Errors.invalidOperation();
            }
        }

        function parseTypeOfExpression(): TypeOfExpressionSyntax {
            return new TypeOfExpressionSyntax(parseNodeData,
                eatKeyword(SyntaxKind.TypeOfKeyword),
                tryParseUnaryExpressionOrHigher(/*force:*/ true));
        }

        function parseDeleteExpression(): DeleteExpressionSyntax {
            return new DeleteExpressionSyntax(parseNodeData,
                eatKeyword(SyntaxKind.DeleteKeyword),
                tryParseUnaryExpressionOrHigher(/*force:*/ true));
        }

        function parseVoidExpression(): VoidExpressionSyntax {
            return new VoidExpressionSyntax(parseNodeData,
                eatKeyword(SyntaxKind.VoidKeyword),
                tryParseUnaryExpressionOrHigher(/*force:*/ true));
        }

        function parseFunctionExpression(): FunctionExpressionSyntax {
            return new FunctionExpressionSyntax(parseNodeData,
                eatKeyword(SyntaxKind.FunctionKeyword),
                eatOptionalIdentifierToken(),
                parseCallSignature(/*requireCompleteTypeParameterList:*/ false),
                parseBlock(/*parseStatementsEvenWithNoOpenBrace:*/ false, /*checkForStrictMode:*/ true));
        }

        function parseObjectCreationExpression(): ObjectCreationExpressionSyntax {
            // ObjectCreationExpression
            //      new MemberExpression Arguments?
            //
            // Note: if we see arguments we absolutely take them and attach them tightly to this
            // object creation expression.
            //
            // See comment in tryParseMemberExpressionOrHigher for a more complete explanation of
            // this decision.

            return new ObjectCreationExpressionSyntax(parseNodeData,
                eatKeyword(SyntaxKind.NewKeyword),
                tryParseMemberExpressionOrHigher(/*force:*/ true, /*inObjectCreation:*/ true),
                tryParseArgumentList());
        }

        function parseCastExpression(): CastExpressionSyntax {
            return new CastExpressionSyntax(parseNodeData,
                eatToken(SyntaxKind.LessThanToken),
                parseType(),
                eatToken(SyntaxKind.GreaterThanToken),
                tryParseUnaryExpressionOrHigher(/*force:*/ true));
        }

        function parseParenthesizedExpression(): ParenthesizedExpressionSyntax {
            return new ParenthesizedExpressionSyntax(parseNodeData,
                eatToken(SyntaxKind.OpenParenToken),
                parseExpression(/*allowIn:*/ true),
                eatToken(SyntaxKind.CloseParenToken));
        }

        function tryParseParenthesizedArrowFunctionExpression(): ParenthesizedArrowFunctionExpressionSyntax {
            var tokenKind = currentToken().kind();
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

            if (isDefinitelyArrowFunctionExpression()) {
                // We have something like "() =>" or "(a) =>".  Definitely a lambda, so parse it
                // unilaterally as such.
                return tryParseParenthesizedArrowFunctionExpressionWorker(/*requiresArrow:*/ false);
            }

            // Now, look for cases where we're sure it's not an arrow function.  This will help save us
            // a costly parse.
            if (!isPossiblyArrowFunctionExpression()) {
                return null;
            }

            // Then, try to actually parse it as a arrow function, and only return if we see an => 
            var rewindPoint = getRewindPoint();

            var arrowFunction = tryParseParenthesizedArrowFunctionExpressionWorker(/*requiresArrow:*/ true);
            if (arrowFunction === null) {
                rewind(rewindPoint);
            }

            releaseRewindPoint(rewindPoint);
            return arrowFunction;
        }

        function tryParseParenthesizedArrowFunctionExpressionWorker(requireArrow: boolean): ParenthesizedArrowFunctionExpressionSyntax {
            var _currentToken = currentToken();
            // Debug.assert(currentToken.kind() === SyntaxKind.OpenParenToken || currentToken.kind() === SyntaxKind.LessThanToken);

            var callSignature = parseCallSignature(/*requireCompleteTypeParameterList:*/ true);

            if (requireArrow && currentToken().kind() !== SyntaxKind.EqualsGreaterThanToken) {
                return null;
            }

            var equalsGreaterThanToken = eatToken(SyntaxKind.EqualsGreaterThanToken);

            var block = tryParseArrowFunctionBlock();
            var expression: IExpressionSyntax = null;
            if (block === null) {
                expression = tryParseAssignmentExpressionOrHigher(/*force:*/ true, /*allowIn:*/ true);
            }

            return new ParenthesizedArrowFunctionExpressionSyntax(parseNodeData, callSignature, equalsGreaterThanToken, block, expression);
        }

        function tryParseArrowFunctionBlock(): BlockSyntax {
            if (isBlock()) {
                return parseBlock(/*parseStatementsEvenWithNoOpenBrace:*/ false, /*checkForStrictMode:*/ false);
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
                var _modifierCount = modifierCount();
                if (isStatement(_modifierCount, /*inErrorRecovery:*/ false) &&
                    !isExpressionStatement(currentToken()) &&
                    !isFunctionDeclaration(_modifierCount)) {
                    // We've seen a statement (and it isn't an expressionStatement like 'foo()'), 
                    // so treat this like a block with a missing open brace.
                    return parseBlock(/*parseStatementsEvenWithNoOpenBrace:*/ true, /*checkForStrictMode:*/ false);
                }
                else {
                    return null;
                }
            }
        }

        function isSimpleArrowFunctionExpression(): boolean {
            // ERROR RECOVERY TWEAK:
            // If we see a standalone => try to parse it as an arrow function as that's likely what
            // the user intended to write.
            var token0 = currentToken();
            if (token0.kind() === SyntaxKind.EqualsGreaterThanToken) {
                return true;
            }

            return isIdentifier(token0) &&
                   peekToken(1).kind() === SyntaxKind.EqualsGreaterThanToken;
        }

        function parseSimpleArrowFunctionExpression(): SimpleArrowFunctionExpressionSyntax {
            // Debug.assert(isSimpleArrowFunctionExpression());

            var identifier = eatIdentifierToken();
            var equalsGreaterThanToken = eatToken(SyntaxKind.EqualsGreaterThanToken);

            var block = tryParseArrowFunctionBlock();
            var expression: IExpressionSyntax = null;
            if (block === null) {
                expression = tryParseAssignmentExpressionOrHigher(/*force:*/ true, /*allowIn:*/ true);
            }

            return new SimpleArrowFunctionExpressionSyntax(parseNodeData, identifier, equalsGreaterThanToken, block, expression);
        }

        function isBlock(): boolean {
            return currentToken().kind() === SyntaxKind.OpenBraceToken;
        }

        function isDefinitelyArrowFunctionExpression(): boolean {
            var token0 = currentToken();
            if (token0.kind() !== SyntaxKind.OpenParenToken) {
                // If it didn't start with an (, then it could be generic.  That's too complicated 
                // and we can't say it's 'definitely' an arrow function.             
                return false;
            }

            var token1 = peekToken(1);
            var token1Kind = token1.kind();

            var token2: ISyntaxToken;

            if (token1Kind === SyntaxKind.CloseParenToken) {
                // ()
                // Definitely an arrow function.  Could never be a parenthesized expression.  
                // *However*, because of error situations, we could end up with things like "().foo".
                // In this case, we don't want to think of this as the start of an arrow function.
                // To prevent this, we are a little stricter, and we require that we at least see:
                //      "():"  or  "() =>"  or "() {}".  Note: the last one is illegal.  However it
                // most likely is a missing => and not a parenthesized expression.
                token2 = peekToken(2);
                var token2Kind = token2.kind();
                return token2Kind === SyntaxKind.ColonToken ||
                       token2Kind === SyntaxKind.EqualsGreaterThanToken ||
                       token2Kind === SyntaxKind.OpenBraceToken;
            }

            if (token1Kind === SyntaxKind.DotDotDotToken) {
                // (...
                // Definitely an arrow function.  Could never be a parenthesized expression.
                return true;
            }

            token2 = peekToken(2); 
            token2Kind = token2.kind();

            if (token1Kind === SyntaxKind.PublicKeyword || token1Kind === SyntaxKind.PrivateKeyword) {
                if (isIdentifier(token2)) {
                    // "(public id" or "(function id".  Definitely an arrow function.  Could never 
                    // be a parenthesized expression.  Note: this will be an *illegal* arrow 
                    // function (as accessibility modifiers are not allowed in it).  However, that
                    // will be reported by the grammar checker walker.
                    return true;
                }
            }

            if (!isIdentifier(token1)) {
                // All other arrow functions must start with (id
                // so this is definitely not an arrow function.
                return false;
            }

            // (id
            //
            // Lots of options here.  Check for things that make us certain it's an
            // arrow function.
            if (token2Kind === SyntaxKind.ColonToken) {
                // (id:
                // Definitely an arrow function.  Could never be a parenthesized expression.
                return true;
            }

            var token3 = peekToken(3);
            var token3Kind = token3.kind();
            if (token2Kind === SyntaxKind.QuestionToken) {
                // (id?
                // Could be an arrow function, or a parenthesized conditional expression.

                // Check for the things that could only be arrow functions.
                if (token3Kind === SyntaxKind.ColonToken ||
                    token3Kind === SyntaxKind.CloseParenToken ||
                    token3Kind === SyntaxKind.CommaToken) {
                    // (id?:
                    // (id?)
                    // (id?,
                    // These are the only cases where this could be an arrow function.
                    // And none of them can be parenthesized expression.
                    return true;
                }
            }

            if (token2Kind === SyntaxKind.CloseParenToken) {
                // (id)
                // Could be an arrow function, or a parenthesized conditional expression.

                if (token3Kind === SyntaxKind.EqualsGreaterThanToken) {
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

        function isPossiblyArrowFunctionExpression(): boolean {
            var token0 = currentToken();
            if (token0.kind() !== SyntaxKind.OpenParenToken) {
                // If it didn't start with an (, then it could be generic.  That's too complicated 
                // and we have to say it's possibly an arrow function.
                return true;
            }

            var token1 = peekToken(1);

            if (!isIdentifier(token1)) {
                // All other arrow functions must start with (id
                // so this is definitely not an arrow function.
                return false;
            }

            var token2 = peekToken(2);
            var token2Kind = token2.kind();
            if (token2Kind === SyntaxKind.EqualsToken) {
                // (id =
                //
                // This *could* be an arrow function.  i.e. (id = 0) => { }
                // Or it could be a parenthesized expression.  So we'll have to actually
                // try to parse it.
                return true;
            }

            if (token2Kind === SyntaxKind.CommaToken) {
                // (id,

                // This *could* be an arrow function.  i.e. (id, id2) => { }
                // Or it could be a parenthesized expression (as javascript supports
                // the comma operator).  So we'll have to actually try to parse it.
                return true;
            }

            if (token2Kind === SyntaxKind.CloseParenToken) {
                // (id)

                var token3 = peekToken(3);
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

        function parseObjectLiteralExpression(openBraceToken: ISyntaxToken): ObjectLiteralExpressionSyntax {
            // Debug.assert(currentToken().kind() === SyntaxKind.OpenBraceToken);

            consumeToken(openBraceToken);
            // Debug.assert(openBraceToken.fullWidth() > 0);

            var result = parseSeparatedSyntaxList<IPropertyAssignmentSyntax>(ListParsingState.ObjectLiteralExpression_PropertyAssignments);
            var propertyAssignments = result.list;
            openBraceToken = addSkippedTokensAfterToken(openBraceToken, result.skippedTokens);

            var closeBraceToken = eatToken(SyntaxKind.CloseBraceToken);

            return new ObjectLiteralExpressionSyntax(parseNodeData, openBraceToken, propertyAssignments, closeBraceToken);
        }

        function tryParsePropertyAssignment(inErrorRecovery: boolean): IPropertyAssignmentSyntax {
            // Debug.assert(isPropertyAssignment(/*inErrorRecovery:*/ false));

            if (isAccessor(modifierCount(), inErrorRecovery)) {
                return parseAccessor(/*checkForStrictMode:*/ true);
            }
            else if (isFunctionPropertyAssignment(inErrorRecovery)) {
                return parseFunctionPropertyAssignment();
            }
            else if (isSimplePropertyAssignment(inErrorRecovery)) {
                return parseSimplePropertyAssignment();
            }
            else {
                return null;
            }
        }

        function isPropertyAssignment(inErrorRecovery: boolean): boolean {
            return isAccessor(modifierCount(), inErrorRecovery) ||
                   isFunctionPropertyAssignment(inErrorRecovery) ||
                   isSimplePropertyAssignment(inErrorRecovery);
        }

        function eatPropertyName(): ISyntaxToken {
            var _currentToken = currentToken();
            if (SyntaxFacts.isIdentifierNameOrAnyKeyword(_currentToken)) {
                return eatIdentifierNameToken();
            }

            // Debug.assert(isPropertyName(currentToken, false));
            consumeToken(_currentToken);
            return _currentToken;
        }

        function isFunctionPropertyAssignment(inErrorRecovery: boolean): boolean {
            return isPropertyName(currentToken(), inErrorRecovery) &&
                   isCallSignature(/*index:*/ 1);
        }

        function parseFunctionPropertyAssignment(): FunctionPropertyAssignmentSyntax {
            return new FunctionPropertyAssignmentSyntax(parseNodeData,
                eatPropertyName(),
                parseCallSignature(/*requireCompleteTypeParameterList:*/ false),
                parseBlock(/*parseBlockEvenWithNoOpenBrace:*/ false, /*checkForStrictMode:*/ true));
        }

        function isSimplePropertyAssignment(inErrorRecovery: boolean): boolean {
            return isPropertyName(currentToken(), inErrorRecovery);
        }

        function parseSimplePropertyAssignment(): SimplePropertyAssignmentSyntax {
            return new SimplePropertyAssignmentSyntax(parseNodeData,
                eatPropertyName(),
                eatToken(SyntaxKind.ColonToken),
                tryParseAssignmentExpressionOrHigher(/*force:*/ true, /*allowIn:*/ true));
        }

        function isPropertyName(token: ISyntaxToken, inErrorRecovery: boolean): boolean {
            // NOTE: we do *not* want to check "isIdentifier" here.  Any IdentifierName is 
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
                    return isIdentifier(token);
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

        function parseArrayLiteralExpression(openBracketToken: ISyntaxToken): ArrayLiteralExpressionSyntax {
            // Debug.assert(currentToken().kind() === SyntaxKind.OpenBracketToken);
            consumeToken(openBracketToken);
            // Debug.assert(openBracketToken.fullWidth() > 0);

            var result = parseSeparatedSyntaxList<IExpressionSyntax>(ListParsingState.ArrayLiteralExpression_AssignmentExpressions);
            var expressions = result.list;
            openBracketToken = addSkippedTokensAfterToken(openBracketToken, result.skippedTokens);

            var closeBracketToken = eatToken(SyntaxKind.CloseBracketToken);

            return new ArrayLiteralExpressionSyntax(parseNodeData, openBracketToken, expressions, closeBracketToken);
        }

        function parseBlock(parseBlockEvenWithNoOpenBrace: boolean, checkForStrictMode: boolean): BlockSyntax {
            var openBraceToken = eatToken(SyntaxKind.OpenBraceToken);

            var statements = Syntax.emptyList<IStatementSyntax>();

            if (parseBlockEvenWithNoOpenBrace || openBraceToken.fullWidth() > 0) {
                var savedIsInStrictMode = isInStrictMode;
                
                var processItems = checkForStrictMode ? updateStrictModeState : null;
                var result = parseSyntaxList<IStatementSyntax>(ListParsingState.Block_Statements, processItems);
                statements = result.list;
                openBraceToken = addSkippedTokensAfterToken(openBraceToken, result.skippedTokens);

                setStrictMode(savedIsInStrictMode);
            }

            var closeBraceToken = eatToken(SyntaxKind.CloseBraceToken);

            return new BlockSyntax(parseNodeData, openBraceToken, statements, closeBraceToken);
        }

        function parseCallSignature(requireCompleteTypeParameterList: boolean): CallSignatureSyntax {
            return new CallSignatureSyntax(parseNodeData,
                tryParseTypeParameterList(requireCompleteTypeParameterList),
                parseParameterList(),
                parseOptionalTypeAnnotation(/*allowStringLiteral:*/ false));
        }

        function tryParseTypeParameterList(requireCompleteTypeParameterList: boolean): TypeParameterListSyntax {
            if (currentToken().kind() !== SyntaxKind.LessThanToken) {
                return null;
            }

            var rewindPoint = getRewindPoint();

            var lessThanToken = eatToken(SyntaxKind.LessThanToken);
            // Debug.assert(lessThanToken.fullWidth() > 0);

            var result = parseSeparatedSyntaxList<TypeParameterSyntax>(ListParsingState.TypeParameterList_TypeParameters);
            var typeParameters = result.list;
            lessThanToken = addSkippedTokensAfterToken(lessThanToken, result.skippedTokens);

            var greaterThanToken = eatToken(SyntaxKind.GreaterThanToken);

            // return null if we were required to have a '>' token and we did not  have one.
            if (requireCompleteTypeParameterList && greaterThanToken.fullWidth() === 0) {
                rewind(rewindPoint);
                releaseRewindPoint(rewindPoint);
                return null;
            }
            else {
                releaseRewindPoint(rewindPoint);
                return new TypeParameterListSyntax(parseNodeData, lessThanToken, typeParameters, greaterThanToken);
            }
        }

        function isTypeParameter(): boolean {
            return isIdentifier(currentToken());
        }

        function parseTypeParameter(): TypeParameterSyntax {
            return tryParseTypeParameter() || new TypeParameterSyntax(parseNodeData, eatIdentifierToken(), /*constraint:*/ null);
        }

        function tryParseTypeParameter(): TypeParameterSyntax {
            // Debug.assert(isTypeParameter());
            if (!isIdentifier(currentToken())) {
                return null;
            }

            return new TypeParameterSyntax(parseNodeData, eatIdentifierToken(), tryParseConstraint());
        }

        function tryParseConstraint(): ConstraintSyntax {
            if (currentToken().kind() !== SyntaxKind.ExtendsKeyword) {
                return null;
            }

            return new ConstraintSyntax(parseNodeData, eatKeyword(SyntaxKind.ExtendsKeyword), parseType());
        }

        function parseParameterList(): ParameterListSyntax {
            var openParenToken = eatToken(SyntaxKind.OpenParenToken);
            var parameters = Syntax.emptySeparatedList<ParameterSyntax>();

            if (openParenToken.fullWidth() > 0) {
                var result = parseSeparatedSyntaxList<ParameterSyntax>(ListParsingState.ParameterList_Parameters);
                parameters = result.list;
                openParenToken = addSkippedTokensAfterToken(openParenToken, result.skippedTokens);
            }

            var closeParenToken = eatToken(SyntaxKind.CloseParenToken);
            return new ParameterListSyntax(parseNodeData, openParenToken, parameters, closeParenToken);
        }

        function parseOptionalTypeAnnotation(allowStringLiteral: boolean): TypeAnnotationSyntax {
            return currentToken().kind() === SyntaxKind.ColonToken ? parseTypeAnnotation(allowStringLiteral) : null;
        }

        function parseTypeAnnotation(allowStringLiteral: boolean): TypeAnnotationSyntax {
            // Debug.assert(isTypeAnnotation());

            var colonToken = eatToken(SyntaxKind.ColonToken);
            var type = allowStringLiteral && currentToken().kind() === SyntaxKind.StringLiteral
                ? eatToken(SyntaxKind.StringLiteral)
                : parseType();

            return new TypeAnnotationSyntax(parseNodeData, colonToken, type);
        }

        function isType(): boolean {
            var _currentToken = currentToken();
            var currentTokenKind = _currentToken.kind();

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
            return isIdentifier(_currentToken);
        }

        function parseType(): ITypeSyntax {
            return tryParseType() || eatIdentifierToken();
        }

        function tryParseType(): ITypeSyntax {
            var type = tryParseNonArrayType();
            if (type === null) {
                return null;
            }

            while (currentToken().kind() === SyntaxKind.OpenBracketToken) {
                var openBracketToken = eatToken(SyntaxKind.OpenBracketToken);
                var closeBracketToken = eatToken(SyntaxKind.CloseBracketToken);

                type = new ArrayTypeSyntax(parseNodeData, type, openBracketToken, closeBracketToken);
            }

            return type;
        }

        function parseTypeQuery(typeOfKeyword: ISyntaxToken): TypeQuerySyntax {
            consumeToken(typeOfKeyword);
            return new TypeQuerySyntax(parseNodeData, typeOfKeyword, parseName());
        }

        function tryParseNonArrayType(): ITypeSyntax {
            var _currentToken = currentToken();
            switch (_currentToken.kind()) {
                // Pedefined types:
                case SyntaxKind.VoidKeyword:
                    consumeToken(_currentToken);
                    return _currentToken;

                case SyntaxKind.AnyKeyword:
                case SyntaxKind.NumberKeyword:
                case SyntaxKind.BooleanKeyword:
                case SyntaxKind.StringKeyword:
                    // if any of these are followed by '.', then this is actually a module name,
                    // and these keywords will be reinterpreted as an identifier.
                    if (peekToken(1).kind() === SyntaxKind.DotToken) {
                        break;
                    }

                    consumeToken(_currentToken);
                    return _currentToken;

                // Object type
                case SyntaxKind.OpenBraceToken:
                    return parseObjectType();

                // Function type:
                case SyntaxKind.OpenParenToken:
                case SyntaxKind.LessThanToken:
                    return parseFunctionType();

                // Constructor type:
                case SyntaxKind.NewKeyword:
                    return parseConstructorType();

                case SyntaxKind.TypeOfKeyword:
                    return parseTypeQuery(_currentToken);
            }

            return tryParseNameOrGenericType();
        }

        function tryParseNameOrGenericType(): ITypeSyntax {
            var name = tryParseName();
            if (name === null) {
                return null;
            }

            var typeArgumentList = tryParseTypeArgumentList(/*inExpression:*/ false);

            if (typeArgumentList === null) {
                return name;
            }

            return new GenericTypeSyntax(parseNodeData, name, typeArgumentList);
        }

        function parseFunctionType(): FunctionTypeSyntax {
            return new FunctionTypeSyntax(parseNodeData,
                tryParseTypeParameterList(/*requireCompleteTypeParameterList:*/ false),
                parseParameterList(),
                eatToken(SyntaxKind.EqualsGreaterThanToken),
                parseType());
        }

        function parseConstructorType(): ConstructorTypeSyntax {
            return new ConstructorTypeSyntax(parseNodeData,
                eatKeyword(SyntaxKind.NewKeyword),
                tryParseTypeParameterList(/*requireCompleteTypeParameterList:*/ false),
                parseParameterList(),
                eatToken(SyntaxKind.EqualsGreaterThanToken),
                parseType());
        }

        function isParameter(): boolean {
            if (currentNode() !== null && currentNode().kind() === SyntaxKind.Parameter) {
                return true;
            }

            var token = currentToken();
            var tokenKind = token.kind();
            if (tokenKind === SyntaxKind.DotDotDotToken) {
                return true;
            }

            if (isModifier(token) && !isModifierUsedAsParameterIdentifier(token)) {
                return true;
            }

            return isIdentifier(token);
        }

        // Modifiers are perfectly legal names for parameters.  i.e.  you can have: foo(public: number) { }
        // Most of the time we want to treat the modifier as a modifier.  However, if we're certain 
        // it's a parameter identifier, then don't consider it as a modifier.
        function isModifierUsedAsParameterIdentifier(token: ISyntaxToken): boolean {
            if (isIdentifier(token)) {
                // Check for:
                // foo(public)
                // foo(public: ...
                // foo(public= ...
                // foo(public, ...
                // foo(public? ...
                //
                // In all these cases, it's not actually a modifier, but is instead the identifier.
                // In any other case treat it as the modifier.
                var nextTokenKind = peekToken(1).kind();
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

        function parseParameter(): ParameterSyntax {
            var result = tryParseParameter();
            if (result !== null) {
                return result;
            }

            return new ParameterSyntax(parseNodeData,
                /*dotDotDotToken:*/ null, /*modifiers:*/ Syntax.emptyList<ISyntaxToken>(), /*identifier:*/ eatIdentifierToken(),
                /*questionToken:*/ null, /*typeAnnotation:*/ null, /*equalsValueClause:*/ null);
        }

        function tryParseParameter(): ParameterSyntax {
            var node = currentNode();
            if (node !== null && node.kind() === SyntaxKind.Parameter) {
                consumeNode(node);
                return <ParameterSyntax>node;
            }

            var dotDotDotToken = tryEatToken(SyntaxKind.DotDotDotToken);

            var modifierArray: ISyntaxToken[] = getArray();

            while (true) {
                var _currentToken = currentToken();
                if (isModifier(_currentToken) && !isModifierUsedAsParameterIdentifier(_currentToken)) {
                    consumeToken(_currentToken);
                    modifierArray.push(_currentToken);
                    continue;
                }

                break;
            }

            var modifiers = Syntax.list(modifierArray);
            returnZeroLengthArray(modifierArray);

            // If we're not forcing, and we don't see anything to indicate this is a parameter, then 
            // bail out.
            if (!isIdentifier(currentToken()) && dotDotDotToken === null && modifiers.length === 0) {
                return null;
            }

            var identifier = eatIdentifierToken();
            var questionToken = tryEatToken(SyntaxKind.QuestionToken);
            var typeAnnotation = parseOptionalTypeAnnotation(/*allowStringLiteral:*/ true);

            var equalsValueClause: EqualsValueClauseSyntax = null;
            if (isEqualsValueClause(/*inParameter*/ true)) {
                equalsValueClause = parseEqualsValueClause(/*allowIn:*/ true);
            }

            return new ParameterSyntax(parseNodeData, dotDotDotToken, modifiers, identifier, questionToken, typeAnnotation, equalsValueClause);
        }

        function parseSyntaxList<T extends ISyntaxNodeOrToken>(
                currentListType: ListParsingState,
                processItems: (items: any[]) => void = null): { skippedTokens: ISyntaxToken[]; list: T[]; } {
            var savedListParsingState = listParsingState;
            listParsingState |= currentListType;

            var result = parseSyntaxListWorker<T>(currentListType, processItems);

            listParsingState = savedListParsingState;

            return result;
        }

        function parseSeparatedSyntaxList<T extends ISyntaxNodeOrToken>(currentListType: ListParsingState): { skippedTokens: ISyntaxToken[]; list: T[]; } {
            var savedListParsingState = listParsingState;
            listParsingState |= currentListType;

            var result = parseSeparatedSyntaxListWorker<T>(currentListType);

            listParsingState = savedListParsingState;

            return result;
        }

        // Returns true if we should abort parsing.
        function abortParsingListOrMoveToNextToken<T extends ISyntaxNodeOrToken>(
                currentListType: ListParsingState,
                nodes: T[],
                separators: ISyntaxToken[],
                skippedTokens: ISyntaxToken[]): boolean {
            // Ok.  We're at a token that is not a terminator for the list and wasn't the start of 
            // an item in the list. Definitely report an error for this token.
            reportUnexpectedTokenDiagnostic(currentListType);

            // Now, check if the token is a terminator for one our parent lists, or the start of an
            // item in one of our parent lists.  If so, we won't want to consume the token.  We've 
            // already reported the error, so just return to our caller so that a higher up 
            // production can consume it.
            for (var state = ListParsingState.LastListParsingState;
                 state >= ListParsingState.FirstListParsingState;
                 state >>= 1) {

                if ((listParsingState & state) !== 0) {
                    if (isExpectedListTerminator(state) || isExpectedListItem(state, /*inErrorRecovery:*/ true)) {
                        // Abort parsing this list.
                        return true;
                    }
                }
            }

            // Otherwise, if none of the lists we're in can capture this token, then we need to 
            // unilaterally skip it.  Note: we've already reported an error above.
            var skippedToken = currentToken();

            // Consume this token and move onto the next item in the list.
            consumeToken(skippedToken);

            addSkippedTokenToList(nodes, separators, skippedTokens, skippedToken);

            // Continue parsing this list.  Attach this token to whatever we've seen already.
            return false;
        }
        
        function addSkippedTokenToList<T extends ISyntaxNodeOrToken>(
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
                    array[arrayIndex] = <T>addSkippedTokenAfterNodeOrToken(item, skippedToken);
                    return;
                }
            }

            // Didn't have anything in the list we could add to.  Add to the skipped items array
            // for our caller to handle.
            skippedTokens.push(skippedToken);
        }

        function tryParseExpectedListItem(currentListType: ListParsingState,
                                          inErrorRecovery: boolean,
                                          items: ISyntaxElement[],
                                          processItems: (items: any[]) => void): boolean {
            var item = tryParseExpectedListItemWorker(currentListType, inErrorRecovery);

            if (item === null) {
                return false;
            }
            // Debug.assert(item !== null);

            items.push(item);

            if (processItems !== null) {
                processItems(items);
            }

            return true;
        }

        function listIsTerminated(currentListType: ListParsingState): boolean {
            return isExpectedListTerminator(currentListType) ||
                   currentToken().kind() === SyntaxKind.EndOfFileToken;
        }

        function parseSyntaxListWorker<T extends ISyntaxNodeOrToken>(
                currentListType: ListParsingState,
                processItems: (items: any[]) => void ): { skippedTokens: ISyntaxToken[]; list: T[]; } {
            var items: T[] = getArray();
            var skippedTokens: ISyntaxToken[] = getArray();

            while (true) {
                // Try to parse an item of the list.  If we fail then decide if we need to abort or 
                // continue parsing.
                var succeeded = tryParseExpectedListItem(currentListType, /*inErrorRecovery:*/ false, items, processItems);

                if (!succeeded) {
                    // We weren't able to parse out a list element.

                    // That may have been because the list is complete.  In that case, break out 
                    // and return the items we were able parse.
                    if (listIsTerminated(currentListType)) {
                        break;
                    }

                    // List wasn't complete and we didn't get an item.  Figure out if we should bail out
                    // or skip a token and continue.
                    var abort = abortParsingListOrMoveToNextToken(currentListType, items, null, skippedTokens);
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

        function parseSeparatedSyntaxListWorker<T extends ISyntaxNodeOrToken>(currentListType: ListParsingState): { skippedTokens: ISyntaxToken[]; list: T[]; } {
            var nodes: T[] = getArray();
            var separators: ISyntaxToken[] = getArray();
            var skippedTokens: ISyntaxToken[] = getArray();

            // Debug.assert(nodes.length === 0);
            // Debug.assert(separators.length === 0);
            // Debug.assert(skippedTokens.length === 0);
            // Debug.assert(<any>skippedTokens !== nodes);
            // Debug.assert(skippedTokens !== separators);
            // Debug.assert(<any>nodes !== separators);

            var _separatorKind = separatorKind(currentListType);
            var allowAutomaticSemicolonInsertion = _separatorKind === SyntaxKind.SemicolonToken;

            var inErrorRecovery = false;
            while (true) {
                // Try to parse an item of the list.  If we fail then decide if we need to abort or 
                // continue parsing.

                // Debug.assert(oldItemsCount % 2 === 0);
                var succeeded = tryParseExpectedListItem(currentListType, inErrorRecovery, nodes, null);

                if (!succeeded) {
                    // We weren't able to parse out a list element.
                    // Debug.assert(items === null || items.length % 2 === 0);
                    
                    // That may have been because the list is complete.  In that case, break out 
                    // and return the items we were able parse.
                    if (listIsTerminated(currentListType)) {
                        break;
                    }

                    // List wasn't complete and we didn't get an item.  Figure out if we should bail out
                    // or skip a token and continue.
                    var abort = abortParsingListOrMoveToNextToken(currentListType, nodes, separators, skippedTokens);
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
                var _currentToken = currentToken();
                var tokenKind = _currentToken.kind();
                if (tokenKind === _separatorKind || tokenKind === SyntaxKind.CommaToken) {
                    // Consume the last separator and continue parsing list elements.
                    consumeToken(_currentToken);
                    separators.push(_currentToken);
                    continue;
                }

                // We didn't see the expected separator.  There are two reasons this might happen.
                // First, we may actually be at the end of the list.  If we are, then we're done
                // parsing list elements.  
                if (listIsTerminated(currentListType)) {
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

                if (allowAutomaticSemicolonInsertion && canEatAutomaticSemicolon(/*allowWithoutNewline:*/ false)) {
                    var semicolonToken = eatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false) || Syntax.emptyToken(SyntaxKind.SemicolonToken);
                    separators.push(semicolonToken);
                    // Debug.assert(items.length % 2 === 0);
                    continue;
                }

                // We weren't at the end of the list.  And thre was no separator we could parse out.
                // Try parse the separator we expected, and continue parsing more list elements.
                // This time mark that we're in error recovery mode though.
                //
                // Note: trying to eat this token will emit the appropriate diagnostic.
                separators.push(eatToken(_separatorKind));

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

        function separatorKind(currentListType: ListParsingState): SyntaxKind {
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

        function reportUnexpectedTokenDiagnostic(listType: ListParsingState): void {
            var token = currentToken();

            var diagnostic = new Diagnostic(fileName, source.text.lineMap(),
                start(token), width(token), DiagnosticCode.Unexpected_token_0_expected, [getExpectedListElementType(listType)]);
            addDiagnostic(diagnostic);
        }

        function addDiagnostic(diagnostic: Diagnostic): void {
            // Except: if we already have a diagnostic for this position, don't report another one.
            if (diagnostics.length > 0 &&
                diagnostics[diagnostics.length - 1].start() === diagnostic.start()) {
                return;
            }

            diagnostics.push(diagnostic);
        }

        function isExpectedListTerminator(currentListType: ListParsingState): boolean {
            switch (currentListType) {
                case ListParsingState.SourceUnit_ModuleElements:
                    return isExpectedSourceUnit_ModuleElementsTerminator();

                case ListParsingState.ClassOrInterfaceDeclaration_HeritageClauses:
                    return isExpectedClassOrInterfaceDeclaration_HeritageClausesTerminator();

                case ListParsingState.ClassDeclaration_ClassElements:
                    return isExpectedClassDeclaration_ClassElementsTerminator();

                case ListParsingState.ModuleDeclaration_ModuleElements:
                    return isExpectedModuleDeclaration_ModuleElementsTerminator();

                case ListParsingState.SwitchStatement_SwitchClauses:
                    return isExpectedSwitchStatement_SwitchClausesTerminator();

                case ListParsingState.SwitchClause_Statements:
                    return isExpectedSwitchClause_StatementsTerminator();

                case ListParsingState.Block_Statements:
                    return isExpectedBlock_StatementsTerminator();

                case ListParsingState.TryBlock_Statements:
                    return isExpectedTryBlock_StatementsTerminator();

                case ListParsingState.CatchBlock_Statements:
                    return isExpectedCatchBlock_StatementsTerminator();

                case ListParsingState.EnumDeclaration_EnumElements:
                    return isExpectedEnumDeclaration_EnumElementsTerminator();

                case ListParsingState.ObjectType_TypeMembers:
                    return isExpectedObjectType_TypeMembersTerminator();

                case ListParsingState.ArgumentList_AssignmentExpressions:
                    return isExpectedArgumentList_AssignmentExpressionsTerminator();

                case ListParsingState.HeritageClause_TypeNameList:
                    return isExpectedHeritageClause_TypeNameListTerminator();

                case ListParsingState.VariableDeclaration_VariableDeclarators_AllowIn:
                    return isExpectedVariableDeclaration_VariableDeclarators_AllowInTerminator();

                case ListParsingState.VariableDeclaration_VariableDeclarators_DisallowIn:
                    return isExpectedVariableDeclaration_VariableDeclarators_DisallowInTerminator();

                case ListParsingState.ObjectLiteralExpression_PropertyAssignments:
                    return isExpectedObjectLiteralExpression_PropertyAssignmentsTerminator();

                case ListParsingState.ParameterList_Parameters:
                    return isExpectedParameterList_ParametersTerminator();

                case ListParsingState.TypeArgumentList_Types:
                    return isExpectedTypeArgumentList_TypesTerminator();

                case ListParsingState.TypeParameterList_TypeParameters:
                    return isExpectedTypeParameterList_TypeParametersTerminator();

                case ListParsingState.ArrayLiteralExpression_AssignmentExpressions:
                    return isExpectedLiteralExpression_AssignmentExpressionsTerminator();

                default:
                    throw Errors.invalidOperation();
            }
        }

        function isExpectedSourceUnit_ModuleElementsTerminator(): boolean {
            return currentToken().kind() === SyntaxKind.EndOfFileToken;
        }

        function isExpectedEnumDeclaration_EnumElementsTerminator(): boolean {
            return currentToken().kind() === SyntaxKind.CloseBraceToken;
        }

        function isExpectedModuleDeclaration_ModuleElementsTerminator(): boolean {
            return currentToken().kind() === SyntaxKind.CloseBraceToken;
        }

        function isExpectedObjectType_TypeMembersTerminator(): boolean {
            return currentToken().kind() === SyntaxKind.CloseBraceToken;
        }

        function isExpectedObjectLiteralExpression_PropertyAssignmentsTerminator(): boolean {
            return currentToken().kind() === SyntaxKind.CloseBraceToken;
        }

        function isExpectedLiteralExpression_AssignmentExpressionsTerminator(): boolean {
            return currentToken().kind() === SyntaxKind.CloseBracketToken;
        }

        function isExpectedTypeArgumentList_TypesTerminator(): boolean {
            var token = currentToken();
            var tokenKind = token.kind();
            if (tokenKind === SyntaxKind.GreaterThanToken) {
                return true;
            }

            // If we're at a token that can follow the type argument list, then we'll also consider
            // the list terminated.
            if (canFollowTypeArgumentListInExpression(tokenKind)) {
                return true;
            }

            // TODO: add more cases as necessary for error tolerance.
            return false;
        }

        function isExpectedTypeParameterList_TypeParametersTerminator(): boolean {
            var token = currentToken();
            var tokenKind = token.kind();
            if (tokenKind === SyntaxKind.GreaterThanToken) {
                return true;
            }

            // These commonly follow type parameter lists.
            if (tokenKind === SyntaxKind.OpenParenToken ||
                tokenKind === SyntaxKind.OpenBraceToken ||
                tokenKind === SyntaxKind.ExtendsKeyword ||
                tokenKind === SyntaxKind.ImplementsKeyword) {
                return true;
            }

            // TODO: add more cases as necessary for error tolerance.
            return false;
        }

        function isExpectedParameterList_ParametersTerminator(): boolean {
            var token = currentToken();
            var tokenKind = token.kind();
            if (tokenKind === SyntaxKind.CloseParenToken) {
                return true;
            }

            // We may also see a { in an error case.  i.e.:
            // function (a, b, c  {
            if (tokenKind === SyntaxKind.OpenBraceToken) {
                return true;
            }

            // We may also see a => in an error case.  i.e.:
            // (f: number => { ... }
            if (tokenKind === SyntaxKind.EqualsGreaterThanToken) {
                return true;
            }

            return false;
        }

        function isExpectedVariableDeclaration_VariableDeclarators_DisallowInTerminator(): boolean {
            // This is the case when we're parsing variable declarations in a for/for-in statement.
            var _currentToken = currentToken();
            var tokenKind = _currentToken.kind();

            if (tokenKind === SyntaxKind.SemicolonToken ||
                tokenKind === SyntaxKind.CloseParenToken) {
                return true;
            }

            if (tokenKind === SyntaxKind.InKeyword) {
                return true;
            }

            return false;
        }

        function isExpectedVariableDeclaration_VariableDeclarators_AllowInTerminator(): boolean {
            //// This is the case when we're parsing variable declarations in a variable statement.

            // ERROR RECOVERY TWEAK:
            // For better error recovery, if we see a => then we just stop immediately.  We've got an
            // arrow function here and it's going to be very unlikely that we'll resynchronize and get
            // another variable declaration.
            if (currentToken().kind() === SyntaxKind.EqualsGreaterThanToken) {
                return true;
            }

            // We're done when we can eat a semicolon.
            return canEatExplicitOrAutomaticSemicolon(/*allowWithoutNewline:*/ false);
        }

        function isExpectedClassOrInterfaceDeclaration_HeritageClausesTerminator(): boolean {
            var token0 = currentToken();
            var tokenKind = token0.kind();
            if (tokenKind === SyntaxKind.OpenBraceToken ||
                tokenKind === SyntaxKind.CloseBraceToken) {
                return true;
            }

            return false;
        }

        function isExpectedHeritageClause_TypeNameListTerminator(): boolean {
            var token0 = currentToken();
            var tokenKind = token0.kind();
            if (tokenKind === SyntaxKind.ExtendsKeyword ||
                tokenKind === SyntaxKind.ImplementsKeyword) {
                return true;
            }

            if (isExpectedClassOrInterfaceDeclaration_HeritageClausesTerminator()) {
                return true;
            }

            return false;
        }

        function isExpectedArgumentList_AssignmentExpressionsTerminator(): boolean {
            var token0 = currentToken();
            var tokenKind = token0.kind();
            return tokenKind === SyntaxKind.CloseParenToken ||
                   tokenKind === SyntaxKind.SemicolonToken;
        }

        function isExpectedClassDeclaration_ClassElementsTerminator(): boolean {
            return currentToken().kind() === SyntaxKind.CloseBraceToken;
        }

        function isExpectedSwitchStatement_SwitchClausesTerminator(): boolean {
            return currentToken().kind() === SyntaxKind.CloseBraceToken;
        }

        function isExpectedSwitchClause_StatementsTerminator(): boolean {
            return currentToken().kind() === SyntaxKind.CloseBraceToken ||
                   isSwitchClause();
        }

        function isExpectedBlock_StatementsTerminator(): boolean {
            return currentToken().kind() === SyntaxKind.CloseBraceToken;
        }

        function isExpectedTryBlock_StatementsTerminator(): boolean {
            var tokenKind = currentToken().kind();
            return tokenKind === SyntaxKind.CatchKeyword ||
                    tokenKind === SyntaxKind.FinallyKeyword;
        }

        function isExpectedCatchBlock_StatementsTerminator(): boolean {
            return currentToken().kind() === SyntaxKind.FinallyKeyword;
        }

        function isExpectedListItem(currentListType: ListParsingState, inErrorRecovery: boolean): any {
            switch (currentListType) {
                case ListParsingState.SourceUnit_ModuleElements:
                    return isModuleElement(inErrorRecovery);

                case ListParsingState.ClassOrInterfaceDeclaration_HeritageClauses:
                    return isHeritageClause();

                case ListParsingState.ClassDeclaration_ClassElements:
                    return isClassElement(inErrorRecovery);

                case ListParsingState.ModuleDeclaration_ModuleElements:
                    return isModuleElement(inErrorRecovery);

                case ListParsingState.SwitchStatement_SwitchClauses:
                    return isSwitchClause();

                case ListParsingState.SwitchClause_Statements:
                    return isStatement(modifierCount(), inErrorRecovery);

                case ListParsingState.Block_Statements:
                    return isStatement(modifierCount(), inErrorRecovery);

                case ListParsingState.TryBlock_Statements:
                case ListParsingState.CatchBlock_Statements:
                    // These two are special.  They're just augmentations of "Block_Statements" 
                    // used so we can abort out of the try block if we see a 'catch' or 'finally'
                    // keyword.  There are no additional list items that they add, so we just
                    // return 'false' here.
                    return false;

                case ListParsingState.EnumDeclaration_EnumElements:
                    return isEnumElement(inErrorRecovery);
                
                case ListParsingState.VariableDeclaration_VariableDeclarators_AllowIn:
                case ListParsingState.VariableDeclaration_VariableDeclarators_DisallowIn:
                    return isVariableDeclarator();

                case ListParsingState.ObjectType_TypeMembers:
                    return isTypeMember(inErrorRecovery);

                case ListParsingState.ArgumentList_AssignmentExpressions:
                    return isExpectedArgumentList_AssignmentExpression();

                case ListParsingState.HeritageClause_TypeNameList:
                    return isHeritageClauseTypeName();

                case ListParsingState.ObjectLiteralExpression_PropertyAssignments:
                    return isPropertyAssignment(inErrorRecovery);

                case ListParsingState.ParameterList_Parameters:
                    return isParameter();

                case ListParsingState.TypeArgumentList_Types:
                    return isType();

                case ListParsingState.TypeParameterList_TypeParameters:
                    return isTypeParameter();

                case ListParsingState.ArrayLiteralExpression_AssignmentExpressions:
                    return isAssignmentOrOmittedExpression();

                default:
                    throw Errors.invalidOperation();
            }
        }

        function isExpectedArgumentList_AssignmentExpression(): boolean {
            var _currentToken = currentToken();
            if (isExpression(_currentToken)) {
                return true;
            }

            // If we're on a comma then the user has written something like "Foo(a,," or "Foo(,".
            // Instead of skipping the comma, create an empty expression to go before the comma 
            // so that the tree is more well formed and doesn't have skipped tokens.
            if (_currentToken.kind() === SyntaxKind.CommaToken) {
                return true;
            }

            return false;
        }

        function tryParseExpectedListItemWorker(currentListType: ListParsingState, inErrorRecovery: boolean): ISyntaxNodeOrToken {
            switch (currentListType) {
                case ListParsingState.SourceUnit_ModuleElements:
                    return tryParseModuleElement(inErrorRecovery);

                case ListParsingState.ClassOrInterfaceDeclaration_HeritageClauses:
                    return tryParseHeritageClause();

                case ListParsingState.ClassDeclaration_ClassElements:
                    return tryParseClassElement(inErrorRecovery);

                case ListParsingState.ModuleDeclaration_ModuleElements:
                    return tryParseModuleElement(inErrorRecovery);

                case ListParsingState.SwitchStatement_SwitchClauses:
                    return tryParseSwitchClause();

                case ListParsingState.SwitchClause_Statements:
                    return tryParseStatement(modifierCount(), inErrorRecovery);

                case ListParsingState.Block_Statements:
                    return tryParseStatement(modifierCount(), inErrorRecovery);

                case ListParsingState.EnumDeclaration_EnumElements:
                    return tryParseEnumElement(inErrorRecovery);

                case ListParsingState.ObjectType_TypeMembers:
                    return tryParseTypeMember(inErrorRecovery);

                case ListParsingState.ArgumentList_AssignmentExpressions:
                    return tryParseArgumentListExpression();

                case ListParsingState.HeritageClause_TypeNameList:
                    return tryParseHeritageClauseTypeName();

                case ListParsingState.VariableDeclaration_VariableDeclarators_AllowIn:
                    return tryParseVariableDeclarator(/*allowIn:*/ true, /*allowIdentifierName:*/ false);

                case ListParsingState.VariableDeclaration_VariableDeclarators_DisallowIn:
                    return tryParseVariableDeclarator(/*allowIn:*/ false, /*allowIdentifierName:*/ false);

                case ListParsingState.ObjectLiteralExpression_PropertyAssignments:
                    return tryParsePropertyAssignment(inErrorRecovery);

                case ListParsingState.ArrayLiteralExpression_AssignmentExpressions:
                    return tryParseAssignmentOrOmittedExpression();

                case ListParsingState.ParameterList_Parameters:
                    return tryParseParameter();

                case ListParsingState.TypeArgumentList_Types:
                    return tryParseType();

                case ListParsingState.TypeParameterList_TypeParameters:
                    return tryParseTypeParameter();

                default:
                    throw Errors.invalidOperation();
            }
        }

        function getExpectedListElementType(currentListType: ListParsingState): string {
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

        return {
            parseSyntaxTree: parseSyntaxTree
        };
    }

    // We keep the parser around as a singleton.  This is because calling createParser is actually
    // expensive in V8 currently.  We then clear it after a parse so that it doesn't  keep state 
    // alive unintentionally.
    var parser = createParser();

    export function parse(fileName: string,
                          text: ISimpleText,
                          isDeclaration: boolean,
                          languageVersion: LanguageVersion): SyntaxTree {
        var source = new NormalParserSource(fileName, languageVersion, text);
        return parser.parseSyntaxTree(fileName, source, languageVersion, isDeclaration);
    }

    export function incrementalParse(oldSyntaxTree: SyntaxTree,
                                     textChangeRange: TextChangeRange,
                                     newText: ISimpleText): SyntaxTree {
        if (textChangeRange.isUnchanged()) {
            return oldSyntaxTree;
        }

        var source = new IncrementalParserSource(oldSyntaxTree, textChangeRange, newText);
        return parser.parseSyntaxTree(oldSyntaxTree.fileName(), source, oldSyntaxTree.languageVersion(), oldSyntaxTree.isDeclaration());
    }
}