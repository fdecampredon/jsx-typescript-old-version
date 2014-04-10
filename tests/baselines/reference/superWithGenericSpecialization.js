//// [superWithGenericSpecialization.ts]
class C<T> {
    x: T;
}

class D<T> extends C<string> {
    y: T;
    constructor() {
        super(); // uses the type parameter type of the base class, ie string
    }
}

var d: D<number>;
var r: string = d.x;
var r2: number = d.y;

//// [superWithGenericSpecialization.js]
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var C = (function () {
    function C() {
    }
    return C;
})();

var D = (function (_super) {
    __extends(D, _super);
    function D() {
        _super.call(this); // uses the type parameter type of the base class, ie string
    }
    return D;
})(C);

var d;
var r = d.x;
var r2 = d.y;
