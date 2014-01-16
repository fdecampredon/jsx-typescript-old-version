var E;
(function (E) {
    E[E["a"] = 0] = "a";
    E[E["b"] = 1] = "b";
})(E || (E = {}));

var a;
var b;

var r1 = a + a;
var r2 = a + b;
var r3 = b + a;
var r4 = b + b;

var r5 = 0 + a;
var r6 = 0 /* a */ + 0;
var r7 = 0 /* a */ + 1 /* b */;
var r8 = E['a'] + E['b'];
