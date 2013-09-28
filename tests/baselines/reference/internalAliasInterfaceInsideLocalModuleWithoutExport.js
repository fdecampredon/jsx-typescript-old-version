//// [internalAliasInterfaceInsideLocalModuleWithoutExport.js]
define(["require", "exports"], function(require, exports) {
    (function (c) {
        c.x;
    })(exports.c || (exports.c = {}));
    var c = exports.c;
});


////[internalAliasInterfaceInsideLocalModuleWithoutExport.d.ts]
export declare module a {
    interface I {
    }
}
export declare module c {
    var x: a.I;
}
