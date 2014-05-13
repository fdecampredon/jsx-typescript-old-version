//// [nonContextuallyTypedLogicalOr.js]
var c;
var e;

// This should error. Even though we are contextually typing e with Contextual, the RHS still
// needs to be a supertype of the LHS to win as the best common type.
(c || e).dummy;
