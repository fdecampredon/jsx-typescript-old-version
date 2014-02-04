var A = (function () {
    function A() {
    }
    return A;
})();
;
var B = (function () {
    function B() {
    }
    return B;
})();
;

// OK
var X = (function () {
    function X() {
    }
    X.prototype.f = function () {
        return undefined;
    };
    return X;
})();

// OK
var Y = (function () {
    function Y() {
    }
    Y.prototype.f = function () {
        return undefined;
    };
    return Y;
})();

// OK
var Z = (function () {
    function Z() {
    }
    Z.prototype.f = function () {
        return undefined;
    };
    return Z;
})(); // { f: <T>() => T }
