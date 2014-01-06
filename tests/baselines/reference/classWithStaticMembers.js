var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var C = (function () {
    function C(a, b) {
        this.a = a;
        this.b = b;
    }
    C.fn = function () {
        return this;
    };
    Object.defineProperty(C, "x", {
        get: function () {
            return 1;
        },
        set: function (v) {
        },
        enumerable: true,
        configurable: true
    });
    return C;
})();

var r = C.fn();
var r2 = r.x;
var r3 = r.foo;

var D = (function (_super) {
    __extends(D, _super);
    function D() {
        _super.apply(this, arguments);
    }
    return D;
})(C);

var r = D.fn();
var r2 = r.x;
var r3 = r.foo;
