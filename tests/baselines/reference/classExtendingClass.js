var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var C = (function () {
    function C() {
    }
    C.prototype.thing = function () {
    };
    C.other = function () {
    };
    return C;
})();

var D = (function (_super) {
    __extends(D, _super);
    function D() {
        _super.apply(this, arguments);
    }
    return D;
})(C);

var d;
var r = d.foo;
var r2 = d.bar;
var r3 = d.thing();
var r4 = D.other();

var C2 = (function () {
    function C2() {
    }
    C2.prototype.thing = function (x) {
    };
    C2.other = function (x) {
    };
    return C2;
})();

var D2 = (function (_super) {
    __extends(D2, _super);
    function D2() {
        _super.apply(this, arguments);
    }
    return D2;
})(C2);

var d2;
var r5 = d2.foo;
var r6 = d2.bar;
var r7 = d2.thing('');
var r8 = D2.other(1);
