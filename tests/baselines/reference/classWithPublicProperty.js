var C = (function () {
    function C() {
        this.a = '';
        this.b = '';
        this.d = function () {
            return '';
        };
    }
    C.prototype.c = function () {
        return '';
    };

    C.f = function () {
        return '';
    };
    C.g = function () {
        return '';
    };
    return C;
})();

// all of these are valid
var c = new C();
var r1 = c.x;
var r2 = c.a;
var r3 = c.b;
var r4 = c.c();
var r5 = c.d();
var r6 = C.e;
var r7 = C.f();
var r8 = C.g();
