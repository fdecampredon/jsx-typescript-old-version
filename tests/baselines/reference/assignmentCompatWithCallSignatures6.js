// checking assignment compatibility relations for function types. All valid
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Base = (function () {
    function Base() {
    }
    return Base;
})();
var Derived = (function (_super) {
    __extends(Derived, _super);
    function Derived() {
        _super.apply(this, arguments);
    }
    return Derived;
})(Base);
var Derived2 = (function (_super) {
    __extends(Derived2, _super);
    function Derived2() {
        _super.apply(this, arguments);
    }
    return Derived2;
})(Derived);
var OtherDerived = (function (_super) {
    __extends(OtherDerived, _super);
    function OtherDerived() {
        _super.apply(this, arguments);
    }
    return OtherDerived;
})(Base);

var x;

var b;
x.a = b;
b = x.a;
var b2;
x.a2 = b2;
b2 = x.a2;
var b3;
x.a3 = b3;
b3 = x.a3;
var b4;
x.a4 = b4;
b4 = x.a4;
var b5;
x.a5 = b5;
b5 = x.a5;
var b11;
x.a11 = b11;
b11 = x.a11;
var b16;
x.a16 = b16;
b16 = x.a16;
