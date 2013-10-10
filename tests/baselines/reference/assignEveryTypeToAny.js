var x;

x = 1;
var a = 2;
x = a;

x = true;
var b = true;
x = b;

x = "";
var c = "";
x = c;

var d;
x = d;

var e = undefined;
x = e;

var e2;
x = e2;

var E;
(function (E) {
    E[E["A"] = 0] = "A";
})(E || (E = {}));

x = 0 /* A */;
var f = 0 /* A */;
x = f;

var g;
x = g;

var C = (function () {
    function C() {
    }
    return C;
})();

var h;
x = h;

var i;
x = i;
x = { f: function () {
        return 1;
    } };
x = { f: function (x) {
        return x;
    } };

function j(a) {
    x = a;
}
