var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// There should be no errors in this file
var Derived = (function (_super) {
    __extends(Derived, _super);
    function Derived() {
        _super.apply(this, arguments);
    }
    Derived.createEmpty = function () {
        var item = new Derived();
        return item;
    };
    return Derived;
})(Base);
var BaseCollection = (function () {
    function BaseCollection(f) {
        (function (item) {
            return [item.Components];
        });
    }
    return BaseCollection;
})();
var Base = (function () {
    function Base() {
    }
    return Base;
})();

var Thing = (function () {
    function Thing() {
    }
    Object.defineProperty(Thing.prototype, "Components", {
        get: function () {
            return null;
        },
        enumerable: true,
        configurable: true
    });
    return Thing;
})();

var ComponentCollection = (function () {
    function ComponentCollection() {
    }
    ComponentCollection.sortComponents = function (p) {
        return p.prop1;
    };
    return ComponentCollection;
})();

var Foo = (function () {
    function Foo() {
    }
    Object.defineProperty(Foo.prototype, "prop1", {
        get: function () {
            return new GenericType(this);
        },
        enumerable: true,
        configurable: true
    });
    Foo.prototype.populate = function () {
        this.prop2;
    };
    Object.defineProperty(Foo.prototype, "prop2", {
        get: function () {
            return new BaseCollection(Derived.createEmpty);
        },
        enumerable: true,
        configurable: true
    });
    return Foo;
})();

var GenericType = (function () {
    function GenericType(parent) {
    }
    return GenericType;
})();

var FooBase = (function () {
    function FooBase() {
    }
    FooBase.prototype.populate = function () {
    };
    return FooBase;
})();
