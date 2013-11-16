// Rest parameters must be an array type if they have a type annotation,
// BUG 824316, these should be allowed

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

function foo2() {
    var x = [];
    for (var _i = 0; _i < (arguments.length - 0); _i++) {
        x[_i] = arguments[_i + 0];
    }
}
var f3 = function foo() {
    var x = [];
    for (var _i = 0; _i < (arguments.length - 0); _i++) {
        x[_i] = arguments[_i + 0];
    }
};
var f4 = function (x) {
    var y = [];
    for (var _i = 0; _i < (arguments.length - 1); _i++) {
        y[_i] = arguments[_i + 1];
    }
};

var C2 = (function () {
    function C2() {
    }
    C2.prototype.foo = function () {
        var x = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            x[_i] = arguments[_i + 0];
        }
    };
    return C2;
})();

var a2;

var b2 = {
    foo: function () {
        var x = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            x[_i] = arguments[_i + 0];
        }
    },
    a: function foo(x, string) {
        if (typeof x === "undefined") { x = 2; }
        var y = [];
        for (var _i = 0; _i < (arguments.length - 2); _i++) {
            y[_i] = arguments[_i + 2];
        }
    },
    b: function () {
        var x = [];
        for (var _i = 0; _i < (arguments.length - 0); _i++) {
            x[_i] = arguments[_i + 0];
        }
    }
};
