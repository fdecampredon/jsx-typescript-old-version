function foo(x) {
    return x;
}
var f = function foo(x) {
    return x;
};
var f2 = function (x) {
    return x;
};
var f3 = function (x) {
    return x;
};

var C = (function () {
    function C() {
    }
    C.prototype.foo = function (x) {
        return x;
    };
    return C;
})();

var a;

var b = {
    foo: function (x) {
        return x;
    },
    a: function foo(x) {
        return x;
    },
    b: function (x) {
        return x;
    }
};
