var C = (function () {
    function C() {
    }
    Object.defineProperty(C.prototype, "x", {
        get: function () {
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
        set: function (v) {
        },
        enumerable: true,
        configurable: true
    });
    return D;
})();

var x = {
    get a() {
        return 1;
    }
};

var y = {
    set b(v) {
    }
};
