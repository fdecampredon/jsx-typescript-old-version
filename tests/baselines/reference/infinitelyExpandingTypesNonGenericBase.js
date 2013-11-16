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

// A and Base originating in infinitely expanding type reference do not refer to same named type.
o(A);
