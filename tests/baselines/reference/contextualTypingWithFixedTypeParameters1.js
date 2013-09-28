var f10;
f10('', function () {
    return function (a) {
        return a.foo;
    };
}, '');
var r9 = f10('', function () {
    return (function (a) {
        return a.foo;
    });
}, 1);
