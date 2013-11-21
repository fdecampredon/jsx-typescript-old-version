// Empty array literal with no contextual type has type Undefined[]
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var arr1 = [[], [1], ['']];
var arr1;

var arr2 = [[null], [1], ['']];
var arr2;

// Array literal with elements of only EveryType E has type E[]
var stringArrArr = [[''], [""]];
var stringArrArr;

var stringArr = ['', ""];
var stringArr;

var numberArr = [0, 0.0, 0x00, 1e1];
var numberArr;

var boolArr = [false, true, false, true];
var boolArr;

var C = (function () {
    function C() {
    }
    return C;
})();
var classArr = [new C(), new C()];
var classArr;

var classTypeArray = [C, C, C];
var classTypeArray;

// Contextual type C with numeric index signature makes array literal of EveryType E of type BCT(E,C)[]
var context1 = [{ a: '', b: 0, c: '' }, { a: "", b: 3, c: 0 }];
var context2 = [{ a: '', b: 0, c: '' }, { a: "", b: 3, c: 0 }];
var context2;

// Contextual type C with numeric index signature of type Base makes array literal of Derived have type Base[]
var Base = (function () {
    function Base() {
    }
    return Base;
})();
var Derived1 = (function (_super) {
    __extends(Derived1, _super);
    function Derived1() {
        _super.apply(this, arguments);
    }
    return Derived1;
})(Base);
;
var Derived2 = (function (_super) {
    __extends(Derived2, _super);
    function Derived2() {
        _super.apply(this, arguments);
    }
    return Derived2;
})(Base);
;
var context3 = [new Derived1(), new Derived2()];

// Contextual type C with numeric index signature of type Base makes array literal of Derived1 and Derived2 have type Base[]
var context4 = [new Derived1(), new Derived1()];
