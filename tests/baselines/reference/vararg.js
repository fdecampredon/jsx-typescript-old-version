var M;
(function (M) {
    var C = (function () {
        function C() {
        }
        C.prototype.f = function (x) {
            var rest = [];
            for (var _i = 0; _i < (arguments.length - 1); _i++) {
                rest[_i] = arguments[_i + 1];
            }
            var sum = 0;
            for (var i = 0; i < rest.length; i++) {
                sum += rest[i];
            }
            result += (x + ": " + sum);
            return result;
        };

        C.prototype.fnope = function (x) {
            var rest = [];
            for (var _i = 0; _i < (arguments.length - 1); _i++) {
                rest[_i] = arguments[_i + 1];
            }
        };

        C.prototype.fonly = function () {
            var rest = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                rest[_i] = arguments[_i + 0];
            }
            builder = "";
            for (var i = 0; i < rest.length; i++) {
                builder += rest[i];
            }
            return builder;
        };
        return C;
    })();
    M.C = C;
})(M || (M = {}));

var x = new M.C();
var result = "";
result += x.f(x, 3, 3); // bad first param
result += x.f(3, "hello", 3); // bad second param
result += x.f("hello", 3, 3, 3, 3, 3); // ok
result += x.f("hello"); // ok varargs length 0
result += x.fonly(3); // ok conversion
result += x.fonly(x); // bad param
result += x.fonly("a"); // ok
result += x.fonly("a", "b", "c", "d"); //ok
