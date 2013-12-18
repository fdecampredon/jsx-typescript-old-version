//// [foo_0.js]
var C1 = (function () {
    function C1() {
        this.m1 = 42;
    }
    C1.s1 = true;
    return C1;
})();
exports.C1 = C1;

(function (E1) {
    E1[E1["A"] = 0] = "A";
    E1[E1["B"] = 1] = "B";
    E1[E1["C"] = 2] = "C";
})(exports.E1 || (exports.E1 = {}));
var E1 = exports.E1;
//// [foo_1.js]
var i;
var x = {};
var y = false;
var z;
var e = 0;
