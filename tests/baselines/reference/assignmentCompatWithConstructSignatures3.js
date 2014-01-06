// checking subtype relations for function types as it relates to contextual signature instantiation
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
var a7;
var a8;
var a9;
var a10;
var a11;
var a12;
var a13;
var a14;
var a15;
var a16;
var a17;
var a18;

var b;
a = b; // ok, instantiation of N is a subtype of M, T is number
b = a; // error
var b2;
a2 = b2; // ok
b2 = a2; // error
var b3;
a3 = b3; // ok since Base returns void
b3 = a3; // ok
var b4;
a4 = b4; // ok, instantiation of N is a subtype of M, T is string, U is number
b4 = a4; // error
var b5;
a5 = b5; // ok, U is in a parameter position so inferences can be made
b5 = a5; // error
var b6;
a6 = b6; // ok, same as a5 but with object type hierarchy
b6 = a6; // error
var b7;
a7 = b7; // ok
b7 = a7; // error
var b8;
a8 = b8; // ok
b8 = a8; // error
var b9;
a9 = b9; // ok, same as a8 with compatible object literal
b9 = a9; // error
var b10;
a10 = b10; // ok
b10 = a10; // error
var b11;
a11 = b11; // ok
b11 = a11; // error
var b12;
a12 = b12; // ok
b12 = a12; // error
var b13;
a13 = b13; // ok, T = Array<Derived>, satisfies constraint, contextual signature instantiation succeeds
b13 = a13; // error
var b14;
a14 = b14; // ok, best common type yields T = {} but that's satisfactory for this signature
b14 = a14; // error
var b15;
a15 = b15; // ok
b15 = a15; // error
var b16;
a16 = b16; // ok
b16 = a16; // ok
var b17;
a17 = b17; // ok
b17 = a17; // error
var b18;
a18 = b18; // ok, no inferences for T but assignable to any
b18 = a18; // error
