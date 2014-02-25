//// [declFileWithInternalModuleNameConflictsInExtendsClause1.js]
var X;
(function (X) {
    (function (_A) {
        (function (B) {
            (function (C) {
                var W = (function () {
                    function W() {
                    }
                    return W;
                })();
                C.W = W;
            })(B.C || (B.C = {}));
            var C = B.C;
        })(_A.B || (_A.B = {}));
        var B = _A.B;
    })(X.A || (X.A = {}));
    var A = X.A;
})(X || (X = {}));


////[declFileWithInternalModuleNameConflictsInExtendsClause1.d.ts]
declare module X.A.C {
    interface Z {
    }
}
declare module X.A.B.C {
    class W implements X.A.C.Z {
    }
}
