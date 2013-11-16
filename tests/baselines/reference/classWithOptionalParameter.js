// classes do not permit optional parameters, these are errors
var C = (function () {
    function C() {
    }
    return C;
})();
(function () {
});

var C2 = (function () {
    function C2() {
    }
    return C2;
})();
(function (x) {
});
