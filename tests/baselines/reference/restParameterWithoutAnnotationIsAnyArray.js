// Rest parameters without type annotations are 'any', errors only for the functions with 2 rest params
function foo() {
    var x = [];
    for (var _i = 0; _i < (arguments.length - 0); _i++) {
        x[_i] = arguments[_i + 0];
    }
}
var f = function foo() {
    var x = [];
    for (var _i = 0; _i < (arguments.length - 0); _i++) {
        x[_i] = arguments[_i + 0];
    }
};
var f2 = function (x) {
    var y = [];
    for (var _i = 0; _i < (arguments.length - 1); _i++) {
        y[_i] = arguments[_i + 1];
    }
};

var C = (function () {
    function C() {
    }
    C.prototype.foo = function () {
        var x = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            x[_i] = arguments[_i + 0];
        }
    };
    return C;
})();

var a;

var b = {
    foo: function () {
        var x = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            x[_i] = arguments[_i + 0];
        }
    },
    a: function foo(x) {
        var y = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            y[_i] = arguments[_i + 1];
        }
    },
    b: function () {
        var x = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            x[_i] = arguments[_i + 0];
        }
    }
};
