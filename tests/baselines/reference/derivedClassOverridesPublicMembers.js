var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var x;
var y;

var Base = (function () {
    function Base(a) {
    }
    Base.prototype.b = function (a) {
    };
    Object.defineProperty(Base.prototype, "c", {
        get: function () {
            return x;
        },
        set: function (v) {
        },
        enumerable: true,
        configurable: true
    });

    Base.s = function (a) {
    };
    Object.defineProperty(Base, "t", {
        get: function () {
            return x;
        },
        set: function (v) {
        },
        enumerable: true,
        configurable: true
    });
    return Base;
})();

var Derived = (function (_super) {
    __extends(Derived, _super);
    function Derived(a) {
        _super.call(this, x);
    }
    Derived.prototype.b = function (a) {
    };
    Object.defineProperty(Derived.prototype, "c", {
        get: function () {
            return y;
        },
        set: function (v) {
        },
        enumerable: true,
        configurable: true
    });

    Derived.s = function (a) {
    };
    Object.defineProperty(Derived, "t", {
        get: function () {
            return y;
        },
        set: function (a) {
        },
        enumerable: true,
        configurable: true
    });
    return Derived;
})(Base);

var d = new Derived(y);
var r1 = d.a;
var r2 = d.b(y);
var r3 = d.c;
var r3a = d.d;
d.c = y;
var r4 = Derived.r;
var r5 = Derived.s(y);
var r6 = Derived.t;
var r6a = Derived.u;
Derived.t = y;

var Base2 = (function () {
    function Base2() {
    }
    return Base2;
})();

var Derived2 = (function (_super) {
    __extends(Derived2, _super);
    function Derived2() {
        _super.apply(this, arguments);
    }
    return Derived2;
})(Base2);

var d2;
var r7 = d2[''];
var r8 = d2[1];
