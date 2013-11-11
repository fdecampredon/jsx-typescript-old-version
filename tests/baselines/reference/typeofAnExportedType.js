exports.x = 1;
exports.r1;
exports.y = { foo: '' };
exports.r2;
var C = (function () {
    function C() {
    }
    return C;
})();
exports.C = C;
exports.c;
var c2;

exports.r3;
exports.r4;
exports.r4b;

exports.i;
var i2;
exports.r5;
exports.r5;

(function (M) {
    M.foo = '';
    var C = (function () {
        function C() {
        }
        return C;
    })();
    M.C = C;
})(exports.M || (exports.M = {}));
var M = exports.M;
exports.r6;
exports.r7;

var Z = M;
exports.Z = Z;
exports.r8;
exports.r9;

(function (E) {
    E[E["A"] = 0] = "A";
})(exports.E || (exports.E = {}));
var E = exports.E;
exports.r10;
exports.r11;

exports.r12;

function foo() {
}
exports.foo = foo;
(function (foo) {
    foo.y = 1;
    var C = (function () {
        function C() {
        }
        return C;
    })();
    foo.C = C;
})(exports.foo || (exports.foo = {}));
var foo = exports.foo;
exports.r13;
