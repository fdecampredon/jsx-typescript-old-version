// generic types should behave as if they have properties of their constraint type
// no errors expected
var C = (function () {
    function C() {
    }
    C.prototype.f = function () {
        var x;
        var a = x['getDate']();
        return a + x.getDate();
    };
    return C;
})();

var r = (new C()).f();

var i;
var r2 = i.foo.getDate();
var r2b = i.foo['getDate']();

var a;
var r3 = a().getDate();
var r3b = a()['getDate']();

var b = {
    foo: function (x) {
        var a = x['getDate']();
        return a + x.getDate();
    }
};

var r4 = b.foo(new Date());
