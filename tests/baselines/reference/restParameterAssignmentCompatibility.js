var T = (function () {
    function T() {
    }
    T.prototype.m = function () {
        var p3 = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            p3[_i] = arguments[_i + 0];
        }
    };
    return T;
})();

var S = (function () {
    function S() {
    }
    S.prototype.m = function (p1, p2) {
    };
    return S;
})();

var t;
var s;

// M is a non - specialized call or construct signature and S’ contains a call or construct signature N where,
//  the number of non-optional parameters in N is less than or equal to that of M,
t = s; // Should be error

var T1 = (function () {
    function T1() {
    }
    T1.prototype.m = function (p1, p2) {
    };
    return T1;
})();
var t1;

// When comparing call or construct signatures, parameter names are ignored and rest parameters correspond to an unbounded expansion of optional parameters of the rest parameter element type.
t1 = s; // Just like this error
