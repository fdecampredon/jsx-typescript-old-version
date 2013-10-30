var Base = (function () {
    function Base() {
    }
    Base.prototype.foo = function () {
    };
    return Base;
})();

var anyVar;

//
// Property signatures
//
var obj0;
var obj1 = {
    p: null,
    p3: function () {
        return 0;
    },
    p6: function (pa1) {
        return 0;
    },
    p7: function (pa1, pa2) {
        return 0;
    }
};
var obj2 = new Object();
var obj3 = new obj0;
var obj4 = new Base;
var obj5 = null;
var obj6 = function () {
};

//var obj7: i1 = function foo() { };
var obj8 = anyVar;
var obj9 = new  < i1 > anyVar;
var obj10 = new {};

//
// Call signatures
//
var obj11;
var obj12 = {};
var obj13 = new Object();
var obj14 = new obj11;
var obj15 = new Base;
var obj16 = null;
var obj17 = function () {
    return 0;
};

//var obj18: i2 = function foo() { };
var obj19 = anyVar;
var obj20 = new  < i2 > anyVar;
var obj21 = new {};

//
// Construct Signatures
//
var obj22;
var obj23 = {};
var obj24 = new Object();
var obj25 = new obj22;
var obj26 = new Base;
var obj27 = null;
var obj28 = function () {
};

//var obj29: i3 = function foo() { };
var obj30 = anyVar;
var obj31 = new  < i3 > anyVar;
var obj32 = new {};

//
// Index Signatures
//
var obj33;
var obj34 = {};
var obj35 = new Object();
var obj36 = new obj33;
var obj37 = new Base;
var obj38 = null;
var obj39 = function () {
};

//var obj40: i4 = function foo() { };
var obj41 = anyVar;
var obj42 = new  < i4 > anyVar;
var obj43 = new {};

//
// Interface Derived I1
//
var obj44;
var obj45 = {};
var obj46 = new Object();
var obj47 = new obj44;
var obj48 = new Base;
var obj49 = null;
var obj50 = function () {
};

//var obj51: i5 = function foo() { };
var obj52 = anyVar;
var obj53 = new  < i5 > anyVar;
var obj54 = new {};

//
// Interface Derived I2
//
var obj55;
var obj56 = {};
var obj57 = new Object();
var obj58 = new obj55;
var obj59 = new Base;
var obj60 = null;
var obj61 = function () {
};

//var obj62: i6 = function foo() { };
var obj63 = anyVar;
var obj64 = new  < i6 > anyVar;
var obj65 = new {};

//
// Interface Derived I3
//
var obj66;
var obj67 = {};
var obj68 = new Object();
var obj69 = new obj66;
var obj70 = new Base;
var obj71 = null;
var obj72 = function () {
};

//var obj73: i7 = function foo() { };
var obj74 = anyVar;
var obj75 = new  < i7 > anyVar;
var obj76 = new {};

//
// Interface Derived I4
//
var obj77;
var obj78 = {};
var obj79 = new Object();
var obj80 = new obj77;
var obj81 = new Base;
var obj82 = null;
var obj83 = function () {
};

//var obj84: i8 = function foo() { };
var obj85 = anyVar;
var obj86 = new  < i8 > anyVar;
var obj87 = new {};
