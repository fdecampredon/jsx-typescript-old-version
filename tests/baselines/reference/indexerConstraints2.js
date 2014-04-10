//// [indexerConstraints2.js]
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var A = (function () {
    function A() {
    }
    return A;
})();
var B = (function (_super) {
    __extends(B, _super);
    function B() {
        _super.apply(this, arguments);
    }
    return B;
})(A);

// Inheritance
var F = (function () {
    function F() {
    }
    return F;
})();
var G = (function (_super) {
    __extends(G, _super);
    function G() {
        _super.apply(this, arguments);
    }
    return G;
})(F);

// Other way
var H = (function () {
    function H() {
    }
    return H;
})();
var I = (function (_super) {
    __extends(I, _super);
    function I() {
        _super.apply(this, arguments);
    }
    return I;
})(H);

// With hidden indexer
var J = (function () {
    function J() {
    }
    return J;
})();

var K = (function (_super) {
    __extends(K, _super);
    function K() {
        _super.apply(this, arguments);
    }
    return K;
})(J);
