// it is always an error to provide a type argument list whose count does not match the type parameter list
// both of these attempts to construct a type is an error
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
