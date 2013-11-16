// Optional parameters cannot also have initializer expressions, these are all errors
function foo(x) {
    if (typeof x === "undefined") { x = 1; }
}
var f = function foo(x) {
    if (typeof x === "undefined") { x = 1; }
};
var f2 = function (x, y) {
    if (typeof y === "undefined") { y = 1; }
};

foo(1);
foo();
f(1);
f();
f2(1);
f2(1, 2);

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

var i;
i();
i(1);
i.foo(1);
i.foo(1, 2);

var a;

a();
a(1);
a.foo();
a.foo(1);

var b = {
    foo: function (x) {
        if (typeof x === "undefined") { x = 1; }
    },
    a: function foo(x, y) {
        if (typeof y === "undefined") { y = ''; }
    },
    b: function (x) {
        if (typeof x === "undefined") { x = ''; }
    }
};

b.foo();
b.foo(1);
b.a(1);
b.a(1, 2);
b.b();
b.b(1);
