var C = (function () {
    function C() {
    }
    Object.defineProperty(C.prototype, "x", {
        get: function () {
            var r = this;
            return 1;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(C, "y", {
        get: function () {
            var r2 = this;
            return 1;
        },
        enumerable: true,
        configurable: true
    });
    return C;
})();

var D = (function () {
    function D() {
    }
    Object.defineProperty(D.prototype, "x", {
        get: function () {
            var r = this;
            return 1;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(D, "y", {
        get: function () {
            var r2 = this;
            return 1;
        },
        enumerable: true,
        configurable: true
    });
    return D;
})();

var x = {
    get a() {
        var r3 = this;
        return 1;
    }
};
