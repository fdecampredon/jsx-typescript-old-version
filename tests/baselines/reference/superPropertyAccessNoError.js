//super.publicInstanceMemberFunction in constructor of derived class
//super.publicInstanceMemberFunction in instance member function of derived class
//super.publicInstanceMemberFunction in instance member accessor(get and set) of derived class
//super.publicStaticMemberFunction in static member function of derived class
//super.publicStaticMemberFunction in static member accessor(get and set) of derived class
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var SomeBaseClass = (function () {
    function SomeBaseClass() {
    }
    SomeBaseClass.prototype.func = function () {
        return '';
    };

    SomeBaseClass.func = function () {
        return 3;
    };
    return SomeBaseClass;
})();

var SomeDerivedClass = (function (_super) {
    __extends(SomeDerivedClass, _super);
    function SomeDerivedClass() {
        _super.call(this);
        var x = _super.prototype.func.call(this);
        var x;
    }
    SomeDerivedClass.prototype.fn = function () {
        var x = _super.prototype.func.call(this);
        var x;
    };

    Object.defineProperty(SomeDerivedClass.prototype, "a", {
        get: function () {
            var x = _super.prototype.func.call(this);
            var x;
            return null;
        },
        set: function (n) {
            var x = _super.prototype.func.call(this);
            var x;
        },
        enumerable: true,
        configurable: true
    });


    SomeDerivedClass.fn = function () {
        var x = _super.prototype.func.call(this);
        var x;
    };

    Object.defineProperty(SomeDerivedClass, "a", {
        get: function () {
            var x = _super.prototype.func.call(this);
            var x;
            return null;
        },
        set: function (n) {
            var x = _super.prototype.func.call(this);
            var x;
        },
        enumerable: true,
        configurable: true
    });

    return SomeDerivedClass;
})(SomeBaseClass);
