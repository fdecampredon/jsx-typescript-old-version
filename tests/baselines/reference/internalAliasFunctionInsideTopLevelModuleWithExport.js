//// [internalAliasFunctionInsideTopLevelModuleWithExport.js]
define(["require", "exports"], function(require, exports) {
    (function (a) {
        function foo(x) {
            return x;
        }
        a.foo = foo;
    })(exports.a || (exports.a = {}));
    var a = exports.a;

    var b = a.foo;
    exports.b = b;
    exports.bVal = exports.b(10);
    exports.bVal2 = exports.b;
});


////[internalAliasFunctionInsideTopLevelModuleWithExport.d.ts]
export declare module a {
    function foo(x: number): number;
}
export import b = a.foo;
export declare var bVal: number;
export declare var bVal2: typeof b;
