//// [superCallsInConstructor.js]
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var C = (function () {
    function C() {
    }
    C.prototype.foo = function () {
    };
    C.prototype.bar = function () {
    };
    return C;
})();

var Base = (function () {
    function Base() {
    }
    return Base;
})();

var Derived = (function (_super) {
    __extends(Derived, _super);
    function Derived() {
        with (new C()) {
            foo();
            _super.call(this);
            bar();
        }

        try  {
        } catch (e) {
            _super.call(this);
        }
    }
    return Derived;
})(Base);
