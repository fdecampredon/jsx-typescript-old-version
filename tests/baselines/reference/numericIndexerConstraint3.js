//// [numericIndexerConstraint3.ts]
class A {
    foo: number;
}

class B extends A {
    bar: string;
}

class C {
    0: B;
    [x: number]: A;
}

//// [numericIndexerConstraint3.js]
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var A = (function () {
    function A() {
    }
    return A;
})();

var B = (function (_super) {
    __extends(B, _super);
    function B() {
        _super.apply(this, arguments);
    }
    return B;
})(A);

var C = (function () {
    function C() {
    }
    return C;
})();
