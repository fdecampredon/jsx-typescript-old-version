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


var x = null;
var y = x[0];
/*
// Note - the equivalent for normal interface methods works fine:
interface A {
foo(): Base;
}
interface B<TBase extends Base> extends A {
foo(): TBase;
}
var b: B<Derived> = null;
var z: Derived = b.foo();
*/
