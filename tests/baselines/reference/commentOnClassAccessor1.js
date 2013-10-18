var C = (function () {
    function C() {
    }
    Object.defineProperty(C.prototype, "bar", {
        /**
        * @type {number}
        */
        get: function () {
            return 1;
        },
        enumerable: true,
        configurable: true
    });
    return C;
})();
