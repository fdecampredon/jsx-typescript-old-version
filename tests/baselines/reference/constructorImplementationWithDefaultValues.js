var C = (function () {
    function C(x) {
        if (typeof x === "undefined") { x = 1; }
        var y = x;
    }
    return C;
})();

var D = (function () {
    function D(x) {
        if (typeof x === "undefined") { x = null; }
        var y = x;
    }
    return D;
})();

var E = (function () {
    function E(x) {
        if (typeof x === "undefined") { x = null; }
        var y = x;
    }
    return E;
})();
