// Generic functions used as arguments for function typed parameters are not used to make inferences from
// Using function arguments, no errors expected
var ImmediatelyFix;
(function (ImmediatelyFix) {
    var C = (function () {
        function C() {
        }
        C.prototype.foo = function (x) {
            return x(null);
        };
        return C;
    })();

    var c = new C();
    var r = c.foo(function (x) {
        return '';
    });
    var r2 = c.foo(function (x) {
        return '';
    });
    var r3 = c.foo(function (x) {
        return '';
    });

    var C2 = (function () {
        function C2() {
        }
        C2.prototype.foo = function (x) {
            return x(null);
        };
        return C2;
    })();

    var c2 = new C2();
    var ra = c2.foo(function (x) {
        return 1;
    });
    var r3a = c2.foo(function (x) {
        return 1;
    });
})(ImmediatelyFix || (ImmediatelyFix = {}));

var WithCandidates;
(function (WithCandidates) {
    var C = (function () {
        function C() {
        }
        C.prototype.foo2 = function (x, cb) {
            return cb(x);
        };
        return C;
    })();

    var c;
    var r4 = c.foo2(1, function (a) {
        return '';
    });
    var r5 = c.foo2(1, function (a) {
        return '';
    });
    var r6 = c.foo2('', function (a) {
        return 1;
    });

    var C2 = (function () {
        function C2() {
        }
        C2.prototype.foo3 = function (x, cb, y) {
            return cb(x);
        };
        return C2;
    })();

    var c2;
    var r7 = c2.foo3(1, function (a) {
        return '';
    }, '');
    var r8 = c2.foo3(1, function (a) {
        return '';
    }, '');

    var C3 = (function () {
        function C3() {
        }
        C3.prototype.foo3 = function (x, cb, y) {
            return cb(x);
        };
        return C3;
    })();
    var c3;

    function other(t, u) {
        var r10 = c.foo2(1, function (x) {
            return '';
        });
        var r10 = c.foo2(1, function (x) {
            return '';
        });

        var r11 = c3.foo3(1, function (x) {
            return '';
        }, '');
        var r11b = c3.foo3(1, function (x) {
            return '';
        }, 1);
        var r12 = c3.foo3(1, function (a) {
            return '';
        }, 1);
    }
})(WithCandidates || (WithCandidates = {}));
