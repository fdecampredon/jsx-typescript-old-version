// interfaces with the same root module should merge

var a;
var r1 = a.foo;
var r2 = a.bar;
var r3 = a.baz;


var b;
var r4 = b.foo;
var r5 = b.bar;
var r6 = b.baz;

// basic non-generic and generic case inside a module
var M;
(function (M) {
    var a;
    var r1 = a.foo;

    // BUG 856491
    var r2 = a.bar;

    // BUG 856491
    var r3 = a.baz;

    var b;
    var r4 = b.foo;

    // BUG 856491
    var r5 = b.bar;

    // BUG 856491
    var r6 = b.baz;
})(M || (M = {}));
