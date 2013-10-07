//// [internalAliasUninitializedModuleInsideTopLevelModuleWithoutExport.js]
exports.x;
exports.x.foo();


////[internalAliasUninitializedModuleInsideTopLevelModuleWithoutExport.d.ts]
export declare module a.b {
    interface I {
        foo(): any;
    }
}
export declare var x: a.b.I;
