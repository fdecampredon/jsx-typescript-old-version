var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Base = (function () {
    function Base() {
    }
    Base.prototype.foo = function () {
        return 1;
    };
    Base.create = function () {
        return new this();
    };
    return Base;
})();

var Derived = (function (_super) {
    __extends(Derived, _super);
    function Derived() {
        _super.apply(this, arguments);
    }
    Derived.prototype.foo = function () {
        return 2;
    };
    return Derived;
})(Base);
var d = Derived.create();

d.foo();
