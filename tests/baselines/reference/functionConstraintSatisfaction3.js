function foo(x) {
    return x;
}

var i;

var C = (function () {
    function C() {
    }
    return C;
})();

var a;
var b;
var c;

var r1 = foo(function (x) {
    return x;
});
var r2 = foo(function (x) {
    return x;
});
var r3 = foo(function (x) {
    return x;
});
var r4 = foo(function (x) {
    return x;
});
var r5 = foo(i);
var r8 = foo(c);

var i2;

var C2 = (function () {
    function C2() {
    }
    return C2;
})();

var a2;
var b2;
var c2;

var r9 = foo(function (x) {
    return x;
});
var r10 = foo(function (x) {
    return x;
});
var r12 = foo(i2);
var r15 = foo(c2);
