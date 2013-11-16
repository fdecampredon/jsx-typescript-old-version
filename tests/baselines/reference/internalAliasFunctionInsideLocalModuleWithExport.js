//// [internalAliasFunctionInsideLocalModuleWithExport.js]
(function (a) {
    function foo(x) {
        return x;
    }
    a.foo = foo;
})(exports.a || (exports.a = {}));
var a = exports.a;

(function (c) {
    var b = a.foo;
    c.b = b;
    c.bVal = b(10);
    c.bVal2 = b;
})(exports.c || (exports.c = {}));
var c = exports.c;


////[internalAliasFunctionInsideLocalModuleWithExport.d.ts]
export declare module a {
    function foo(x: number): number;
}
export declare module c {
    export import b = a.foo;
    var bVal: number;
    var bVal2: typeof b;
}
