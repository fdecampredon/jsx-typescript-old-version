//// [internalAliasUninitializedModuleInsideLocalModuleWithExport.js]
(function (c) {
    c.x;
    c.x.foo();
})(exports.c || (exports.c = {}));
var c = exports.c;


////[internalAliasUninitializedModuleInsideLocalModuleWithExport.d.ts]
export declare module a {
    module b {
        interface I {
            foo(): any;
        }
    }
}
export declare module c {
    export import b = a.b;
    var x: b.I;
}
