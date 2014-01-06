// no errors
var C = (function () {
    function C() {
    }
    Object.defineProperty(C.prototype, "y", {
        get: function () {
            return this.x;
        },
        set: function (x) {
            this.y = this.x;
        },
        enumerable: true,
        configurable: true
    });
    C.prototype.foo = function () {
        return this.foo;
    };

    Object.defineProperty(C, "y", {
        get: function () {
            return this.x;
        },
        set: function (x) {
            this.y = this.x;
        },
        enumerable: true,
        configurable: true
    });
    C.foo = function () {
        return this.foo;
    };
    C.bar = function () {
        this.foo();
    };
    return C;
})();

// added level of function nesting
var C2 = (function () {
    function C2() {
    }
    Object.defineProperty(C2.prototype, "y", {
        get: function () {
            var _this = this;
            (function () {
                return _this.x;
            });
            return null;
        },
        set: function (x) {
            var _this = this;
            (function () {
                _this.y = _this.x;
            });
        },
        enumerable: true,
        configurable: true
    });
    C2.prototype.foo = function () {
        var _this = this;
        (function () {
            return _this.foo;
        });
    };

    Object.defineProperty(C2, "y", {
        get: function () {
            var _this = this;
            (function () {
                return _this.x;
            });
            return null;
        },
        set: function (x) {
            var _this = this;
            (function () {
                _this.y = _this.x;
            });
        },
        enumerable: true,
        configurable: true
    });
    C2.foo = function () {
        var _this = this;
        (function () {
            return _this.foo;
        });
    };
    C2.bar = function () {
        var _this = this;
        (function () {
            return _this.foo();
        });
    };
    return C2;
})();
