// no errors expected
var C = (function () {
    function C(x) {
    }
    C.prototype.foo = function (x) {
        function bar(x) {
            return x;
        }
        return bar;
    };
    return C;
})();

var c = new C({ length: 2 });
var r = c.foo({ length: 3, charAt: function (x) {
        '';
    } });
var r2 = r('');
