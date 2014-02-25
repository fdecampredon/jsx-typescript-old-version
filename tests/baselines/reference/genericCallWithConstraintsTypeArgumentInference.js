// Basic type inference with generic calls and constraints, no errors expected
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
var b;
var d1;
var d2;

function foo(t) {
    return t;
}

var r = foo(b);
var r2 = foo(d1);

function foo2(t, u) {
    return u;
}

function foo2b(u) {
    var x;
    return x;
}

function foo2c() {
    var x;
    return x;
}

var r3 = foo2b(d1);
var r3b = foo2c();

var C = (function () {
    function C(t, u) {
        this.t = t;
        this.u = u;
    }
    C.prototype.foo = function (t, u) {
        return t;
    };

    C.prototype.foo2 = function (t, u) {
        return u;
    };

    C.prototype.foo3 = function (t, u) {
        return t;
    };

    C.prototype.foo4 = function (t, u) {
        return t;
    };

    C.prototype.foo5 = function (t, u) {
        return t;
    };

    C.prototype.foo6 = function () {
        var x;
        return x;
    };

    C.prototype.foo7 = function (u) {
        var x;
        return x;
    };

    C.prototype.foo8 = function () {
        var x;
        return x;
    };
    return C;
})();

var c = new C(b, d1);
var r4 = c.foo(d1, d2);
var r5 = c.foo2(b, d2);
var r6 = c.foo3(d1, d1);
var r7 = c.foo4(d1, d2);
var r8 = c.foo5(d1, d2);
var r8b = c.foo5(d2, d2);
var r9 = c.foo6();
var r10 = c.foo7(d1);
var r11 = c.foo8();

var i;
var r4 = i.foo(d1, d2);
var r5 = i.foo2(b, d2);
var r6 = i.foo3(d1, d1);
var r7 = i.foo4(d1, d2);
var r8 = i.foo5(d1, d2);
var r8b = i.foo5(d2, d2);
var r9 = i.foo6();
var r10 = i.foo7(d1);
var r11 = i.foo8();
