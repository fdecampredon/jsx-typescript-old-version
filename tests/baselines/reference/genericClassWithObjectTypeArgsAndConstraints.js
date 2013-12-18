// Generic call with constraints infering type parameter from object member properties
// No errors expected
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

var Class;
(function (Class) {
    var G = (function () {
        function G() {
        }
        G.prototype.foo = function (t, t2) {
            var x;
            return x;
        };
        return G;
    })();

    var c1 = new X();
    var d1 = new X();
    var g;
    var r = g.foo(c1, d1);
    var r2 = g.foo(c1, c1);

    var G2 = (function () {
        function G2() {
        }
        G2.prototype.foo2 = function (t, t2) {
            var x;
            return x;
        };
        return G2;
    })();
    var g2;
    var r = g2.foo2(c1, d1);
    var r2 = g2.foo2(c1, c1);
})(Class || (Class = {}));

var Interface;
(function (Interface) {
    var c1 = new X();
    var d1 = new X();
    var g;
    var r = g.foo(c1, d1);
    var r2 = g.foo(c1, c1);

    var g2;
    var r = g2.foo2(c1, d1);
    var r2 = g2.foo2(c1, c1);
})(Interface || (Interface = {}));
