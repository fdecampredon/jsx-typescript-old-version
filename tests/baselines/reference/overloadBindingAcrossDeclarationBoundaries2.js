//// [overloadBindingAcrossDeclarationBoundaries_file0.js]
//// [overloadBindingAcrossDeclarationBoundaries_file1.js]
var a;

// These should all be Opt3
var a1 = a.a({});
var a1 = a({});
var a1 = new a({});
