//// [genericClassWithStaticsUsingTypeArguments.js]
// Should be error to use 'T' in all declarations within Foo.
var Foo = (function () {
    function Foo() {
    }
    Foo.f = function (xs) {
        return xs.reverse();
    };
    Foo.a = function (n) {
    };

    Foo.c = [];

    Foo.d = false || (function (x) {
        return x || undefined;
    })(null);

    Foo.e = function (x) {
        return null;
    };
    return Foo;
})();
