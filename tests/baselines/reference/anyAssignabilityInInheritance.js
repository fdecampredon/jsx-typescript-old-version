// any is not a subtype of any other types, errors expected on all the below derived classes unless otherwise noted

var a;

var r3 = foo2(a);

var r3 = foo3(a);

var r3 = foo3(a);

var r3 = foo3(a);

var r3 = foo3(a);

var r3 = foo3(a);

var r3 = foo3(a);

var r3 = foo3(a);

var A = (function () {
    function A() {
    }
    return A;
})();

var r3 = foo3(a);

var A2 = (function () {
    function A2() {
    }
    return A2;
})();

var r3 = foo3(a);

var r3 = foo3(a);

var r3 = foo3(a);

var E;
(function (E) {
    E[E["A"] = 0] = "A";
})(E || (E = {}));

var r3 = foo3(a);

function f() {
}
var f;
(function (f) {
    f.bar = 1;
})(f || (f = {}));

var r3 = foo3(a);

var CC = (function () {
    function CC() {
    }
    return CC;
})();
var CC;
(function (CC) {
    CC.bar = 1;
})(CC || (CC = {}));

var r3 = foo3(a);

var r3 = foo3(a);

var r3 = foo3(a); // any
