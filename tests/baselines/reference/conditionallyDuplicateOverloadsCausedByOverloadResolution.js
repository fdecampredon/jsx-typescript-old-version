var out = foo(function (x, y) {
    function bar() {
    }
    return bar;
});

var out2 = foo2(function (x, y) {
    var bar;
    return bar;
});
