var C = (function () {
    function C(x) {
        var _this = this;
        this.x = x;
        this.ia = 1;
        this.ib = function () {
            return _this.ia;
        };
    }
    C.foo = function (x) {
    };

    C.bar = function (x) {
    };

    Object.defineProperty(C, "sc", {
        get: function () {
            return 1;
        },
        set: function (x) {
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(C, "sd", {
        get: function () {
            return 1;
        },
        enumerable: true,
        configurable: true
    });

    C.prototype.baz = function (x) {
        return '';
    };

    Object.defineProperty(C.prototype, "ic", {
        get: function () {
            return 1;
        },
        set: function (x) {
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(C.prototype, "id", {
        get: function () {
            return 1;
        },
        enumerable: true,
        configurable: true
    });
    C.sa = 1;
    C.sb = function () {
        return 1;
    };
    return C;
})();

var c;

// BUG 820454
var r1;
var r2;

var D = (function () {
    function D(y) {
        this.y = y;
    }
    D.prototype.foo = function () {
    };
    return D;
})();

var d;
var r3;
var r4;
