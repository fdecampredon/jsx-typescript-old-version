//// [chainedCallsWithTypeParameterConstrainedToOtherTypeParameter.js]
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Chain = (function () {
    function Chain(value) {
        this.value = value;
    }
    Chain.prototype.then = function (cb) {
        return null;
    };
    return Chain;
})();

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
var C = (function (_super) {
    __extends(C, _super);
    function C() {
        _super.apply(this, arguments);
    }
    return C;
})(B);

// Ok to go down the chain, but error to try to climb back up
(new Chain(new A)).then(function (a) {
    return new B;
}).then(function (b) {
    return new C;
}).then(function (c) {
    return new B;
}).then(function (b) {
    return new A;
});
