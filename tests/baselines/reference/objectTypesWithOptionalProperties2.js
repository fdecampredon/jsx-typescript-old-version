// Illegal attempts to define optional methods
var a;

var C = (function () {
    function C() {
    }
    return C;
})();

var C2 = (function () {
    function C2() {
    }
    return C2;
})();

var b = {
    x: function () {
    }, 1: 
};
