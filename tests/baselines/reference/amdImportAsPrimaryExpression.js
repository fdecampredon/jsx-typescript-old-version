//// [foo_0.js]
define(["require", "exports"], function(require, exports) {
    (function (E1) {
        E1[E1["A"] = 0] = "A";
        E1[E1["B"] = 1] = "B";
        E1[E1["C"] = 2] = "C";
    })(exports.E1 || (exports.E1 = {}));
    var E1 = exports.E1;
});
//// [foo_1.js]
define(["require", "exports", "./foo_0"], function(require, exports, foo) {
    if (0 /* A */ === 0) {
        // Should cause runtime import - interesting optimization possibility, as gets inlined to 0.
    }
});
