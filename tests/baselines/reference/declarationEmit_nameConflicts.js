//// [declarationEmit_nameConflicts_1.js]
function f() {
}
module.exports = f;
//// [declarationEmit_nameConflicts_0.js]
var im = require('declarationEmit_nameConflicts_1');
(function (M) {
    function f() {
    }
    M.f = f;
    var C = (function () {
        function C() {
        }
        return C;
    })();
    M.C = C;
    (function (N) {
        function g() {
        }
        N.g = g;
        ;
    })(M.N || (M.N = {}));
    var N = M.N;

    var a = M.f;
    M.a = a;
    var b = M.C;
    M.b = b;
    var c = N;
    M.c = c;
    var d = im;
    M.d = d;
})(exports.M || (exports.M = {}));
var M = exports.M;

(function (M) {
    (function (P) {
        function f() {
        }
        P.f = f;
        var C = (function () {
            function C() {
            }
            return C;
        })();
        P.C = C;
        (function (N) {
            function g() {
            }
            N.g = g;
            ;
        })(P.N || (P.N = {}));
        var N = P.N;
        var im = M.P.f;
        P.im = im;

        // Bug 887180
        P.a = M.a;
        P.b = M.b;
        P.c = M.c;
        P.g = M.c.g;
        P.d = M.d;
    })(M.P || (M.P = {}));
    var P = M.P;
})(exports.M || (exports.M = {}));
var M = exports.M;

(function (M) {
    (function (Q) {
        function f() {
        }
        Q.f = f;
        var C = (function () {
            function C() {
            }
            return C;
        })();
        Q.C = C;
        (function (N) {
            function g() {
            }
            N.g = g;
            ;
        })(Q.N || (Q.N = {}));
        var N = Q.N;
    })(M.Q || (M.Q = {}));
    var Q = M.Q;
})(exports.M || (exports.M = {}));
var M = exports.M;


////[declarationEmit_nameConflicts_1.d.ts]
declare function f(): void;
export = f;
////[declarationEmit_nameConflicts_0.d.ts]
import im = require('declarationEmit_nameConflicts_1');
export declare module M {
    function f(): void;
    class C {
    }
    module N {
        function g(): void;
        interface I {
        }
    }
    export import a = M.f;
    export import b = M.C;
    export import c = N;
    export import d = im;
}
export declare module M.P {
    function f(): void;
    class C {
    }
    module N {
        function g(): void;
        interface I {
        }
    }
    export import im = M.P.f;
    var a: typeof f;
    var b: typeof M.C;
    var c: typeof M.N;
    var g: typeof M.N.g;
    var d: typeof im;
}
export declare module M.Q {
    function f(): void;
    class C {
    }
    module N {
        function g(): void;
        interface I {
        }
    }
    interface b extends M.C {
    }
    interface I extends M.N.I {
    }
    module c {
        interface I extends M.N.I {
        }
    }
}
