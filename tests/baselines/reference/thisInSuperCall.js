var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Base = (function () {
    function Base(x) {
    }
    return Base;
})();

var Foo = (function (_super) {
    __extends(Foo, _super);
    function Foo() {
        _super.call(this, this); // no error
    }
    return Foo;
})(Base);

var Foo2 = (function (_super) {
    __extends(Foo2, _super);
    function Foo2() {
        _super.call(this, this); // error
        this.p = 0;
    }
    return Foo2;
})(Base);

var Foo3 = (function (_super) {
    __extends(Foo3, _super);
    function Foo3(p) {
        _super.call(this, this); // error
        this.p = p;
    }
    return Foo3;
})(Base);
