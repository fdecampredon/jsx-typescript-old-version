var s;

// dotted name
var dottedIdentity = { x: identity };
s = map("", dottedIdentity.x);

// index expression
s = map("", dottedIdentity['x']);

// function call
s = map("", (function () {
    return identity;
})());

var ic;
s = map("", new ic());

// assignment
var t;
s = map("", t = identity);

// type assertion
s = map("", identity);

// parenthesized expression
s = map("", (identity));

// comma
s = map("", ("", identity));
