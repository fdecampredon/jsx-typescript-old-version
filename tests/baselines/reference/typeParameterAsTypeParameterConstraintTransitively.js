var a;
var b;
var c;

function foo(x, y, z) {
    return z;
}

foo(1, 2, 3);
foo({ x: 1 }, { x: 1, y: '' }, { x: 2, y: '', z: true });
foo(a, b, c);
foo(a, b, { foo: 1, bar: '', hm: true });
foo(function (x, y) {
}, function (x) {
}, function () {
});

function foo2(x, y, z) {
    return z;
}
foo(a, a, a);
foo(a, b, c);
foo(b, b, { foo: 1, bar: '', hm: '' });
