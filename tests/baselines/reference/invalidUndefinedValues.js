var x;

x = 1;
x = '';
x = true;
var a;
x = a;
x = null;

var C = (function () {
    function C() {
    }
    return C;
})();
var b;
x = C;
x = b;

var c;
x = c;

var M;
(function (M) {
    M.x = 1;
})(M || (M = {}));
x = M;

x = { f: function () {
    } };

function f(a) {
    x = a;
}
x = f;

var E;
(function (E) {
    E[E["A"] = 0] = "A";
})(E || (E = {}));
x = E;
x = 0 /* A */;
