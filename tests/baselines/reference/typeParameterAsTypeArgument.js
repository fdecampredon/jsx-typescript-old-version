// Valid uses of type parameters  as the type argument for other generics
function foo(x, y) {
    foo(y, y);
    return new C();
}

var C = (function () {
    function C() {
    }
    return C;
})();
