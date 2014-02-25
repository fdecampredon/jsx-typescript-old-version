// enum is only a subtype of number, no types are subtypes of enum, all of these except the first are errors
var E;
(function (E) {
    E[E["A"] = 0] = "A";
})(E || (E = {}));

var r = foo(0 /* A */);
var r2 = foo(1);
var r3 = foo(null);

var r4 = foo2(0 /* A */);

var r4 = foo3(0 /* A */);

var r4 = foo4(0 /* A */);

var r4 = foo5(0 /* A */);

var r4 = foo6(0 /* A */);

var r4 = foo7(0 /* A */);

var r4 = foo8(0 /* A */);

var A = (function () {
    function A() {
    }
    return A;
})();

var r4 = foo9(0 /* A */);

var A2 = (function () {
    function A2() {
    }
    return A2;
})();

var r4 = foo10(0 /* A */);

var r4 = foo11(0 /* A */);

var r4 = foo12(0 /* A */);

var E2;
(function (E2) {
    E2[E2["A"] = 0] = "A";
})(E2 || (E2 = {}));

var r4 = foo13(0 /* A */);

function f() {
}
var f;
(function (f) {
    f.bar = 1;
})(f || (f = {}));

var r4 = foo14(0 /* A */);

var CC = (function () {
    function CC() {
    }
    return CC;
})();
var CC;
(function (CC) {
    CC.bar = 1;
})(CC || (CC = {}));

var r4 = foo15(0 /* A */);

var r4 = foo16(0 /* A */);

var r4 = foo16(0 /* A */);
