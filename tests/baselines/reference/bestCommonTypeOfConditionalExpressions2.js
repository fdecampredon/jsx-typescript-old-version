// conditional expressions return the best common type of the branches plus contextual type (using the first candidate if multiple BCTs exist)
// these are errors
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
})(Base);
var base;
var derived;
var derived2;

var r2 = true ? 1 : '';
var r9 = true ? derived : derived2;

function foo(t, u) {
    return true ? t : u;
}

function foo2(t, u) {
    return true ? t : u;
}

function foo3(t, u) {
    return true ? t : u;
}
