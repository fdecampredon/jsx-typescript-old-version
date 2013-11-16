//// [internalAliasFunction.js]
var a;
(function (a) {
    function foo(x) {
        return x;
    }
    a.foo = foo;
})(a || (a = {}));

var c;
(function (c) {
    var b = a.foo;
    c.bVal = b(10);
    c.bVal2 = b;
})(c || (c = {}));


////[internalAliasFunction.d.ts]
declare module a {
    function foo(x: number): number;
}
declare module c {
    var bVal: number;
    var bVal2: typeof a.foo;
}
