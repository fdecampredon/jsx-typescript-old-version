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
