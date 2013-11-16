// Optional parameters allow initializers only in implementation signatures
// All the below declarations are errors
function foo(x) {
    if (typeof x === "undefined") { x = 1; }
}

foo(1);
foo();

var C = (function () {
    function C() {
    }
    C.prototype.foo = function (x) {
        if (typeof x === "undefined") { x = 1; }
    };
    return C;
})();

var c;
c.foo();
c.foo(1);

var b = {
    foo: function (x) {
        if (typeof x === "undefined") { x = 1; }
    },
    foo: function (x) {
        if (typeof x === "undefined") { x = 1; }
    }
};

b.foo();
b.foo(1);
