var A = (function () {
    function A(a1) {
        this.a1 = a1;
    }
    return A;
})();
function foo(x) {
    if (typeof x === "undefined") { x = new A(123); }
}
