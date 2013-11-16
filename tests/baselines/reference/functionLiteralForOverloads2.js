// basic uses of function literals with constructor overloads
var C = (function () {
    function C(x) {
    }
    return C;
})();

var D = (function () {
    function D(x) {
    }
    return D;
})();

var f = C;

var f2 = C;

var f3 = D;
