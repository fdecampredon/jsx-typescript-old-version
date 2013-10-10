var a = null;
var b = null;
var c = null;
var d = null;

var e = null;

// BUG 791098
e = null; // should work

var E;
(function (E) {
    E[E["A"] = 0] = "A";
})(E || (E = {}));

// BUG 767030
e = null;
0 /* A */ = null;

var C = (function () {
    function C() {
    }
    return C;
})();
var f;
f = null;
C = null;

var g;
g = null;
I = null;

var M;
(function (M) {
    M.x = 1;
})(M || (M = {}));

// BUG 767030
M = null;

var h = null;

function i(a) {
    a = null;
}
i = null; // should be an error
