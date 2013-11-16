// Type parameters are in scope in their own and other type parameter lists
// Object types
var C = (function () {
    function C() {
    }
    C.prototype.foo = function (x) {
        var r;
        return x;
    };
    return C;
})();

var C2 = (function () {
    function C2() {
    }
    C2.prototype.foo = function (x) {
        var r;
        return x;
    };
    return C2;
})();
