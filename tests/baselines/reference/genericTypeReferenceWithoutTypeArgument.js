// it is an error to use a generic type without type arguments
// all of these are errors
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

var c;

var a;
var b;
var d;

var e = function (x) {
    var y;
    return y;
};

function f(x) {
    var y;
    return y;
}

var g = function f(x) {
    var y;
    return y;
};

var D = (function (_super) {
    __extends(D, _super);
    function D() {
        _super.apply(this, arguments);
    }
    return D;
})(C);

var M;
(function (M) {
    var E = (function () {
        function E() {
        }
        return E;
    })();
    M.E = E;
})(M || (M = {}));

var D2 = (function (_super) {
    __extends(D2, _super);
    function D2() {
        _super.apply(this, arguments);
    }
    return D2;
})(M.E);
var D3 = (function () {
    function D3() {
    }
    return D3;
})();

function h(x) {
}
function i(x) {
}

var j = null;
var k = null;
