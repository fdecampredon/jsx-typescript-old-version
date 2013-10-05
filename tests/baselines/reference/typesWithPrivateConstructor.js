var C = (function () {
    function C() {
    }
    C.prototype.constructor = function () {
    };
    return C;
})();

var c = new C();
var r = c.constructor;

var C2 = (function () {
    function C2() {
    }
    C2.prototype.constructor = function (x) {
    };
    return C2;
})();

var c2 = new C2();
var r2 = c2.constructor;
