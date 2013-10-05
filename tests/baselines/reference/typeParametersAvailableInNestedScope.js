var C = (function () {
    function C() {
        this.x = function (a) {
            var y;
            return y;
        };
    }
    C.prototype.foo = function () {
        function temp(a) {
            var y;
            return y;
        }
        return temp(null);
    };
    return C;
})();

var c = new C();
c.data = c.x(null);
c.data = c.foo();
