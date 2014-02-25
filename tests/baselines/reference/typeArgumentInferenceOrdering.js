function foo(f) {
    return null;
}
var x = foo(new C()).x;

var C = (function () {
    function C() {
    }
    return C;
})();
