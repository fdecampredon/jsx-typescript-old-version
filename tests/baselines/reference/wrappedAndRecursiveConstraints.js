var C = (function () {
    function C(data) {
        this.data = data;
    }
    C.prototype.foo = function (x) {
        return x;
    };
    return C;
})();

var y = null;
var c = new C(y);
var r = c.foo(y);
