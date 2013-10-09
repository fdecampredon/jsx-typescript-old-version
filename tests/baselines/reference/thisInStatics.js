var C = (function () {
    function C() {
    }
    C.f = function () {
        var y = this;
    };

    Object.defineProperty(C, "x", {
        get: function () {
            var y = this;
            return y;
        },
        enumerable: true,
        configurable: true
    });
    return C;
})();
