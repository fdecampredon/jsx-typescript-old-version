//// [propertySignatures.js]
// Should be error - duplicate identifiers
var foo1;

// Should be OK
var foo2;
foo2.a = 2;
foo2.a = "0";

// Should be error
var foo3;

// Should be OK
var foo4;
var test = foo();

// Should be OK
var foo5;
var test = foo5();
test.bar = 2;
