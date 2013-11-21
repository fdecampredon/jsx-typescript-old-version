var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
//super call in class constructor with no base type
var NoBase = (function () {
    function NoBase() {
        //super call in class member initializer with no base type
        this.p = _super.call(this);
        _super.call(this);
    }
    //super call in class member function with no base type
    NoBase.prototype.fn = function () {
        _super.prototype();
    };

    Object.defineProperty(NoBase.prototype, "foo", {
        //super call in class accessor (get and set) with no base type
        get: function () {
            _super.prototype();
            return null;
        },
        set: function (v) {
            _super.prototype();
        },
        enumerable: true,
        configurable: true
    });

    //super call in static class member function with no base type
    NoBase.fn = function () {
        _super.prototype();
    };

    Object.defineProperty(NoBase, "q", {
        //super call in static class accessor (get and set) with no base type
        get: function () {
            _super.prototype();
            return null;
        },
        set: function (n) {
            _super.prototype();
        },
        enumerable: true,
        configurable: true
    });
    NoBase.k = _super.prototype();
    return NoBase;
})();

var Base = (function () {
    function Base() {
    }
    return Base;
})();
var Derived = (function (_super) {
    __extends(Derived, _super);
    //super call with type arguments
    function Derived() {
        _super.prototype..call(this);
        _super.call(this);
    }
    return Derived;
})(Base);

var OtherBase = (function () {
    function OtherBase() {
    }
    return OtherBase;
})();

var OtherDerived = (function (_super) {
    __extends(OtherDerived, _super);
    function OtherDerived() {
        _super.apply(this, arguments);
        //super call in class member initializer of derived type
        this.t = _super.prototype();
    }
    OtherDerived.prototype.fn = function () {
        //super call in class member function of derived type
        _super.prototype();
    };

    Object.defineProperty(OtherDerived.prototype, "foo", {
        //super call in class accessor (get and set) of derived type
        get: function () {
            _super.prototype();
            return null;
        },
        set: function (n) {
            _super.prototype();
        },
        enumerable: true,
        configurable: true
    });
    return OtherDerived;
})(OtherBase);
