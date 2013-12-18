var M;
(function (_M) {
    _M.x = 3;
    var c = (function () {
        function c() {
        }
        Object.defineProperty(c.prototype, "Z", {
            set: function (M) {
                this.y = _M.x;
            },
            enumerable: true,
            configurable: true
        });
        return c;
    })();
})(M || (M = {}));

var M;
(function (_M) {
    var d = (function () {
        function d() {
        }
        Object.defineProperty(d.prototype, "Z", {
            set: function (p) {
                var M = 10;
                this.y = _M.x;
            },
            enumerable: true,
            configurable: true
        });
        return d;
    })();
})(M || (M = {}));

var M;
(function (M) {
    var e = (function () {
        function e() {
        }
        Object.defineProperty(e.prototype, "M", {
            set: function (p) {
                this.y = M.x;
            },
            enumerable: true,
            configurable: true
        });
        return e;
    })();
})(M || (M = {}));

var M;
(function (_M) {
    var f = (function () {
        function f() {
        }
        Object.defineProperty(f.prototype, "Z", {
            get: function () {
                var M = 10;
                return _M.x;
            },
            enumerable: true,
            configurable: true
        });
        return f;
    })();
})(M || (M = {}));

var M;
(function (M) {
    var e = (function () {
        function e() {
        }
        Object.defineProperty(e.prototype, "M", {
            get: function () {
                return M.x;
            },
            enumerable: true,
            configurable: true
        });
        return e;
    })();
})(M || (M = {}));
