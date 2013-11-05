var B = (function () {
    function B() {
    }
    return B;
})();

var A = (function () {
    function A() {
    }
    return A;
})();

function Choice() {
    var v_args = [];
    for (var _i = 0; _i < (arguments.length - 0); _i++) {
        v_args[_i] = arguments[_i + 0];
    }
    return new A();
}
