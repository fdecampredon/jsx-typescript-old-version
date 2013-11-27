// enum is only a subtype of number, no types are subtypes of enum, all of these except the first are errors
var E;
(function (E) {
    E[E["A"] = 0] = "A";
})(E || (E = {}));

var A = (function () {
    function A() {
    }
    return A;
})();

var A2 = (function () {
    function A2() {
    }
    return A2;
})();

var E2;
(function (E2) {
    E2[E2["A"] = 0] = "A";
})(E2 || (E2 = {}));

function f() {
}
var f;
(function (f) {
    f.bar = 1;
})(f || (f = {}));

var c = (function () {
    function c() {
    }
    return c;
})();
var c;
(function (c) {
    c.bar = 1;
})(c || (c = {}));
