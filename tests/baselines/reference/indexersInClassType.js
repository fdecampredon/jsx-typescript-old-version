var C = (function () {
    function C() {
    }
    C.prototype.fn = function () {
        return this;
    };
    return C;
})();

var c = new C();
var r = c.fn();
var r2 = r[1];
var r3 = r.a;
