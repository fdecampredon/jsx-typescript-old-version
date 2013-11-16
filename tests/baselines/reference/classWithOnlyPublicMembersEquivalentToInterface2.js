// no errors expected
var C = (function () {
    function C() {
    }
    C.prototype.y = function (a) {
        return null;
    };
    Object.defineProperty(C.prototype, "z", {
        get: function () {
            return 1;
        },
        set: function (v) {
        },
        enumerable: true,
        configurable: true
    });
    return C;
})();

var c;
var i;
c = i;
i = c;
