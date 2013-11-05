//// [internalAliasUninitializedModuleInsideLocalModuleWithoutExport.js]
(function (c) {
    c.x;
    c.x.foo();
})(exports.c || (exports.c = {}));
var c = exports.c;


////[internalAliasUninitializedModuleInsideLocalModuleWithoutExport.d.ts]
export declare module a {
    module b {
        interface I {
            foo(): any;
        }
    }
}
export declare module c {
    var x: a.b.I;
}
