var C = (function () {
    function C() {
    }
    C.prototype.f = function () {
        var x;
        var a = x['toString']();
        return a + x.toString();
    };
    return C;
})();

var r = (new C()).f();

var i;
var r2 = i.foo.toString();
var r2b = i.foo['toString']();

var a;
var r3 = a().toString();
var r3b = a()['toString']();

var b = {
    foo: function (x) {
        var a = x['toString']();
        return a + x.toString();
    }
};

var r4 = b.foo(1);
