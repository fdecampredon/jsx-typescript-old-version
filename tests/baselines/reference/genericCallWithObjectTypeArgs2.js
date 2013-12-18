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

// returns {}[]
function f(a) {
    return [a.x, a.y];
}

var r = f({ x: new Derived(), y: new Derived2() });
var r2 = f({ x: new Base(), y: new Derived2() });

function f2(a) {
    return function (x) {
        return a.y;
    };
}

var r3 = f2({ x: new Derived(), y: new Derived2() });

var i;
var r4 = f2(i); // Base => Derived
