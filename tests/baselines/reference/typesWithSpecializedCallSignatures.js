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
var Derived1 = (function (_super) {
    __extends(Derived1, _super);
    function Derived1() {
        _super.apply(this, arguments);
    }
    return Derived1;
})(Base);
var Derived2 = (function (_super) {
    __extends(Derived2, _super);
    function Derived2() {
        _super.apply(this, arguments);
    }
    return Derived2;
})(Base);

var C = (function () {
    function C() {
    }
    C.prototype.foo = function (x) {
        return x;
    };
    return C;
})();
var c = new C();

var i;

var a;

c = i;
c = a;

i = c;
i = a;

a = c;
a = i;

var r1 = c.foo('hi');
var r2 = c.foo('bye');
var r3 = c.foo('hm');
