//// [infinitelyExpandingTypesNonGenericBase.ts]
class Functionality<V> {
    property: Options<V>;
}

class Base {
}

class A<T> extends Base {
    options: Options<Functionality<T>[]>;
}

interface OptionsBase<T> {
    Options: Options<T>;
}

interface Options<T> extends OptionsBase<T> {
}


function o(type: new () => Base) {
}

o(A);


//// [infinitelyExpandingTypesNonGenericBase.js]
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Functionality = (function () {
    function Functionality() {
    }
    return Functionality;
})();

var Base = (function () {
    function Base() {
    }
    return Base;
})();

var A = (function (_super) {
    __extends(A, _super);
    function A() {
        _super.apply(this, arguments);
    }
    return A;
})(Base);

function o(type) {
}

o(A);
