var C = (function () {
    function C() {
    }
    return C;
})();

var c = new C();

var D = (function () {
    function D() {
    }
    return D;
})();

// BUG 794238
var d = new D();
