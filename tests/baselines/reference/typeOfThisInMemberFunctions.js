var C = (function () {
    function C() {
    }
    C.prototype.foo = function () {
        var r = this;
    };

    C.bar = function () {
        var r2 = this;
    };
    return C;
})();

var D = (function () {
    function D() {
    }
    D.prototype.foo = function () {
        var r = this;
    };

    D.bar = function () {
        var r2 = this;
    };
    return D;
})();

var E = (function () {
    function E() {
    }
    E.prototype.foo = function () {
        var r = this;
    };

    E.bar = function () {
        var r2 = this;
    };
    return E;
})();
