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
        this.x = _super.prototype.foo;
        this.z = _super.prototype.foo;
        this.a = this.foo;
    }
    Derived.prototype.y = function () {
        return _super.prototype.foo;
    };
    return Derived;
})(Base);
