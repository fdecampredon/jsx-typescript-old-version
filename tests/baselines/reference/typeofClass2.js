var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var C = (function () {
    function C(x) {
    }
    C.foo = function (x) {
    };

    C.bar = function (x) {
    };
    return C;
})();

var D = (function (_super) {
    __extends(D, _super);
    function D() {
        _super.apply(this, arguments);
    }
    D.baz = function (x) {
    };
    D.prototype.foo = function () {
    };
    return D;
})(C);

var d;

var r1;
var r2;
