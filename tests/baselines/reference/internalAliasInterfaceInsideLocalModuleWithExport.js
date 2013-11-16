//// [internalAliasInterfaceInsideLocalModuleWithExport.js]
define(["require", "exports"], function(require, exports) {
    (function (c) {
        c.x;
    })(exports.c || (exports.c = {}));
    var c = exports.c;
});


////[internalAliasInterfaceInsideLocalModuleWithExport.d.ts]
export declare module a {
    interface I {
    }
}
export declare module c {
    export import b = a.I;
    var x: b;
}
