// checking assignment compat for function types as it relates to contextual signature instantiation
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
var OtherDerived = (function (_super) {
    __extends(OtherDerived, _super);
    function OtherDerived() {
        _super.apply(this, arguments);
    }
    return OtherDerived;
})(Base);

var a;
var a2;
var a3;
var a4;
var a5;
var a6;
var a11;
var a15;
var a16;
var a17;
var a18;

var b;
a = b; // ok, instantiation of N is a subtype of M, T is number
b = a; // ok
var b2;
a2 = b2; // ok
b2 = a2; // ok
var b3;
a3 = b3; // ok since Base returns void
b3 = a3; // error
var b4;
a4 = b4; // ok, instantiation of N is a subtype of M, T is string, U is number
b4 = a4; // ok
var b5;
a5 = b5; // ok, U is in a parameter position so inferences can be made
b5 = a5; // ok
var b6;
a6 = b6; // ok, same as a5 but with object type hierarchy
b6 = a6; // ok
var b11;
a11 = b11; // ok
b11 = a11; // ok
var b15;
a15 = b15; // ok, T = U, T = V
b15 = a15; // error
var b16;
a15 = b16; // ok, more general parameter type
b15 = a16; // error
var b17;
a17 = b17; // ok
b17 = a17; // error
var b18;
a18 = b18; // ok
b18 = a18; // ok
