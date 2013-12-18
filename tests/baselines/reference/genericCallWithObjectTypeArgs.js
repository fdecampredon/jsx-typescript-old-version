var C = (function () {
    function C() {
    }
    return C;
})();

var D = (function () {
    function D() {
    }
    return D;
})();

var X = (function () {
    function X() {
    }
    return X;
})();

function foo(t, t2) {
    var x;
    return x;
}

var c1 = new X();
var d1 = new X();
var r = foo(c1, d1);
var r2 = foo(c1, c1); // ok
