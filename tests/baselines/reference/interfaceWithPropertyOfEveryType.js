var C = (function () {
    function C() {
    }
    return C;
})();
function f1() {
}
var M;
(function (M) {
    M.y = 1;
})(M || (M = {}));
var E;
(function (E) {
    E[E["A"] = 0] = "A";
})(E || (E = {}));

var a = {
    a: 1,
    b: '',
    c: true,
    d: {},
    e: null,
    f: [1],
    g: {},
    h: function (x) {
        return 1;
    },
    i: function (x) {
        return x;
    },
    j: null,
    k: new C(),
    l: f1,
    m: M,
    n: {},
    o: 0 /* A */
};
