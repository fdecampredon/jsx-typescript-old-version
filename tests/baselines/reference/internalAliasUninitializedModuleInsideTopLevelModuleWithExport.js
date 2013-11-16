//// [internalAliasUninitializedModuleInsideTopLevelModuleWithExport.js]
define(["require", "exports"], function(require, exports) {
    exports.x;
    exports.x.foo();
});


////[internalAliasUninitializedModuleInsideTopLevelModuleWithExport.d.ts]
export declare module a {
    module b {
        interface I {
            foo(): any;
        }
    }
}
export import b = a.b;
export declare var x: b.I;
