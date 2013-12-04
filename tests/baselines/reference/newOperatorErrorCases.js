var C0 = (function () {
    function C0() {
    }
    return C0;
})();
var C1 = (function () {
    function C1(n, s) {
    }
    return C1;
})();

var T = (function () {
    function T(n) {
    }
    return T;
})();

var anyCtor;

var anyCtor1;

var nestedCtor;

// Construct expression with no parentheses for construct signature with > 0 parameters
var b = new C0;
32, ''; // Parse error

// Generic construct expression with no parentheses
var c1 = new T;
var c1;
var c2 = new T < string > ;

// Construct expression of non-void returning function
function fnNumber() {
    return 32;
}
var s = new fnNumber();
