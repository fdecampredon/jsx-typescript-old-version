//// [declFileWithInternalModuleNameConflictsInExtendsClause2.js]
var X;
(function (X) {
    (function (A) {
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
        })(A.B || (A.B = {}));
        var B = A.B;
    })(X.A || (X.A = {}));
    var A = X.A;
})(X || (X = {}));


////[declFileWithInternalModuleNameConflictsInExtendsClause2.d.ts]
declare module X.A.C {
    interface Z {
    }
}
declare module X.A.B.C {
    class W implements A.C.Z {
    }
}
declare module X.A.B.C {
}
