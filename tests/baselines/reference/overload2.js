var A;
(function (A) {
})(A || (A = {}));
var B;
(function (B) {
})(B || (B = {}));

// should be ok
function foo(x) {
}

var C = (function () {
    function C() {
    }
    return C;
})();

// should be ok
function foo1(x) {
}
