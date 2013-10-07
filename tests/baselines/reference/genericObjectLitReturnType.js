var X = (function () {
    function X() {
    }
    X.prototype.f = function (t) {
        return { a: t };
    };
    return X;
})();

var x;
var t1 = x.f(5);
t1.a = 5; // Should not error: t1 should have type {a: number}, instead has type {a: T}
