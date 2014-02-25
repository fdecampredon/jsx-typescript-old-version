//// [declarationEmit_nameConflictsWithAlias.js]

(function (M) {
    M.w;
})(exports.M || (exports.M = {}));
var M = exports.M;


////[declarationEmit_nameConflictsWithAlias.d.ts]
export declare module C {
    interface I {
    }
}
export import v = C;
export declare module M {
    module C {
        interface I {
        }
    }
    var w: C.I;
}
