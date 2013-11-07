var A = (function () {
    function A() {
    }
    A.prototype.foo = function () {
    };
    return A;
})();
var B = (function () {
    function B() {
    }
    B.prototype.bar = function () {
    };
    return B;
})();

function g(x) {
}
g(7); // the parameter list is fixed, so this should not error
