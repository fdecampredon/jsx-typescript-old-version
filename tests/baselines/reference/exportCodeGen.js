//// [exportCodeGen.ts]

// should replace all refs to 'x' in the body,
// with fully qualified
module A {
    export var x = 12;
    function lt12() {
        return x < 12;
    }
} 

// should not fully qualify 'x'
module B {
    var x = 12;
    function lt12() {
        return x < 12;
    }
}

// not copied, since not exported
module C {
    function no() {
        return false;
    }
}

// copies, since exported
module D {
    export function yes() {
        return true;
    }
}

// validate all exportable statements
module E {
    export enum Color { Red }
    export function fn() { }
    export interface I { id: number }
    export class C { name: string }
    export module M {
        export var x = 42;
    }
}

// validate all exportable statements,
// which are not exported
module F {
    enum Color { Red }
    function fn() { }
    interface I { id: number }
    class C { name: string }
    module M {
        var x = 42;
    }
}

//// [exportCodeGen.js]
// should replace all refs to 'x' in the body,
// with fully qualified
var A;
(function (A) {
    A.x = 12;
    function lt12() {
        return A.x < 12;
    }
})(A || (A = {}));

// should not fully qualify 'x'
var B;
(function (B) {
    var x = 12;
    function lt12() {
        return x < 12;
    }
})(B || (B = {}));

// not copied, since not exported
var C;
(function (C) {
    function no() {
        return false;
    }
})(C || (C = {}));

// copies, since exported
var D;
(function (D) {
    function yes() {
        return true;
    }
    D.yes = yes;
})(D || (D = {}));

// validate all exportable statements
var E;
(function (E) {
    (function (Color) {
        Color[Color["Red"] = 0] = "Red";
    })(E.Color || (E.Color = {}));
    var Color = E.Color;
    function fn() {
    }
    E.fn = fn;

    var C = (function () {
        function C() {
        }
        return C;
    })();
    E.C = C;
    (function (M) {
        M.x = 42;
    })(E.M || (E.M = {}));
    var M = E.M;
})(E || (E = {}));

// validate all exportable statements,
// which are not exported
var F;
(function (F) {
    var Color;
    (function (Color) {
        Color[Color["Red"] = 0] = "Red";
    })(Color || (Color = {}));
    function fn() {
    }

    var C = (function () {
        function C() {
        }
        return C;
    })();
    var M;
    (function (M) {
        var x = 42;
    })(M || (M = {}));
})(F || (F = {}));
