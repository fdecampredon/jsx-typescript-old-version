var M;
(function (_M) {
    _M.x = 3;
    var c = (function () {
        function c() {
        }
        c.prototype.fn = function (M, p) {
            if (typeof p === "undefined") { p = _M.x; }
        };
        return c;
    })();
})(M || (M = {}));

var M;
(function (_M) {
    var d = (function () {
        function d() {
        }
        d.prototype.fn2 = function () {
            var M;
            var p = _M.x;
        };
        return d;
    })();
})(M || (M = {}));

var M;
(function (_M) {
    var e = (function () {
        function e() {
        }
        e.prototype.fn3 = function () {
            function M() {
                var p = _M.x;
            }
        };
        return e;
    })();
})(M || (M = {}));

var M;
(function (M) {
    var f = (function () {
        function f() {
        }
        f.prototype.M = function () {
        };
        return f;
    })();
})(M || (M = {}));
