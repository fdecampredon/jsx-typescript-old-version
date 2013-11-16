// Call signature parameters do not allow accessibility modifiers
function foo(x, y) {
}
var f = function foo(x, y) {
};
var f2 = function (x, y) {
};
var f3 = function (x, y) {
};
var f4 = function (x, y) {
};

function foo2(x, y) {
}
var f5 = function foo(x, y) {
};
var f6 = function (x, y) {
};
var f7 = function (x, y) {
};
var f8 = function (x, y) {
};

var C = (function () {
    function C() {
    }
    C.prototype.foo = function (x, y) {
    };
    C.prototype.foo2 = function (x, y) {
    };
    C.prototype.foo3 = function (x, y) {
    };
    return C;
})();

var a;

var b = {
    foo: function (x, y) {
    },
    a: function foo(x, y) {
    },
    b: function (x, y) {
    }
};
