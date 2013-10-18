var C = (function () {
    function C() {
    }
    Object.defineProperty(C.prototype, "bar", {
        /**
        * Getter.
        */
        get: function () {
            return 1;
        },
        /**
        * Setter.
        */
        set: function (v) {
        },
        enumerable: true,
        configurable: true
    });

    return C;
})();
