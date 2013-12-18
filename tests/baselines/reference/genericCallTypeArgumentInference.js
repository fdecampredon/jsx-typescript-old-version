// Basic type inference with generic calls, no errors expected
function foo(t) {
    return t;
}

var r = foo('');

function foo2(t, u) {
    return u;
}

function foo2b(u) {
    var x;
    return x;
}

var r2 = foo2('', 1);
var r3 = foo2b(1);

var C = (function () {
    function C(t, u) {
        this.t = t;
        this.u = u;
    }
    C.prototype.foo = function (t, u) {
        return t;
    };

    C.prototype.foo2 = function (t, u) {
        return u;
    };

    C.prototype.foo3 = function (t, u) {
        return t;
    };

    C.prototype.foo4 = function (t, u) {
        return t;
    };

    C.prototype.foo5 = function (t, u) {
        return t;
    };

    C.prototype.foo6 = function () {
        var x;
        return x;
    };

    C.prototype.foo7 = function (u) {
        var x;
        return x;
    };

    C.prototype.foo8 = function () {
        var x;
        return x;
    };
    return C;
})();

var c = new C('', 1);
var r4 = c.foo('', 1);
var r5 = c.foo2('', 1);
var r6 = c.foo3(true, 1);
var r7 = c.foo4('', true);
var r8 = c.foo5(true, 1);
var r9 = c.foo6();
var r10 = c.foo7('');
var r11 = c.foo8();

var i;
var r4 = i.foo('', 1);
var r5 = i.foo2('', 1);
var r6 = i.foo3(true, 1);
var r7 = i.foo4('', true);
var r8 = i.foo5(true, 1);
var r9 = i.foo6();
var r10 = i.foo7('');
var r11 = i.foo8(); // {}
