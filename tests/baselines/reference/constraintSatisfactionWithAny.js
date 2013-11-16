// any satisfies any constraint, no errors expected
function foo(x) {
    return null;
}
function foo2(x) {
    return null;
}
function foo3(x) {
    return null;
}
function foo4(x) {
    return null;
}
var a;
foo(a);
foo2(a);
foo3(a);
foo4(a);

var b;
foo(b);
foo2(b);
foo3(b);
foo4(b);

function foo5(x, y) {
    return null;
}
foo5(a, a);
foo5(b, b);

var C = (function () {
    function C(x) {
        this.x = x;
    }
    return C;
})();

var c1 = new C(a);
var c2 = new C(b);

var C2 = (function () {
    function C2(x) {
        this.x = x;
    }
    return C2;
})();

var c3 = new C2(a);
var c4 = new C2(b);

var C3 = (function () {
    function C3(x) {
        this.x = x;
    }
    return C3;
})();

var c5 = new C3(a);
var c6 = new C3(b);

var C4 = (function () {
    function C4(x) {
        this.x = x;
    }
    return C4;
})();

var c7 = new C4(a);
var c8 = new C4(b);
