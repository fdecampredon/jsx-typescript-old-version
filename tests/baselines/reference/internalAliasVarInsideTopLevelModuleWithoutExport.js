//// [internalAliasVarInsideTopLevelModuleWithoutExport.ts]
export module a {
    export var x = 10;
}

import b = a.x;
export var bVal = b;



//// [internalAliasVarInsideTopLevelModuleWithoutExport.js]
(function (a) {
    a.x = 10;
})(exports.a || (exports.a = {}));
var a = exports.a;

var b = a.x;
exports.bVal = b;


////[internalAliasVarInsideTopLevelModuleWithoutExport.d.ts]
export declare module a {
    var x: number;
}
export declare var bVal: number;
