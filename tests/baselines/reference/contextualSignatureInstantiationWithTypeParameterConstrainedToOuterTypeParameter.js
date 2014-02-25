function f() {
    function g(u) {
        return null;
    }
    return g;
}
var h;
var x = h("", f()); // Call should succeed and x should be string. All type parameters should be instantiated to string
