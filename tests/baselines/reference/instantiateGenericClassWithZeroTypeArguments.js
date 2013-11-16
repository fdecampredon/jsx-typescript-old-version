// no errors expected when instantiating a generic type with no type arguments provided
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

var d = new D();
