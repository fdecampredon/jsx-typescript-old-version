var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var NonGeneric;
(function (NonGeneric) {
    var C = (function () {
        function C() {
        }
        return C;
    })();

    var D = (function (_super) {
        __extends(D, _super);
        function D() {
            _super.apply(this, arguments);
        }
        return D;
    })(C);

    var r = C.prototype;
    r.foo;
    var r2 = D.prototype;
    r2.bar;
})(NonGeneric || (NonGeneric = {}));

var Generic;
(function (Generic) {
    var C = (function () {
        function C() {
        }
        return C;
    })();

    var D = (function (_super) {
        __extends(D, _super);
        function D() {
            _super.apply(this, arguments);
        }
        return D;
    })(C);

    var r = C.prototype;
    var ra = r.foo;
    var r2 = D.prototype;
    var rb = r2.baz;
})(Generic || (Generic = {}));
