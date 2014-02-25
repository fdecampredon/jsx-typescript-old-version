// accessors are not contextually typed
var C = (function () {
    function C() {
    }

    Object.defineProperty(C.prototype, "x", {
        get: function () {
            return function (x) {
                return "";
            };
        },
        set: function (v) {
        },
        enumerable: true,
        configurable: true
    });
    return C;
})();

var c;
var r = c.x(''); // string
