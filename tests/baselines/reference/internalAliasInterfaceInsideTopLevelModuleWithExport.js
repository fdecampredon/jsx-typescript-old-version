//// [internalAliasInterfaceInsideTopLevelModuleWithExport.js]
exports.x;


////[internalAliasInterfaceInsideTopLevelModuleWithExport.d.ts]
export declare module a {
    interface I {
    }
}
export import b = a.I;
export declare var x: b;
