// using a type parameter as a constraint for a type parameter is valid
// these should be errors unless otherwise noted
function foo(x, y) {
    return y;
}

foo(1, '');
foo(1, {});

var n;

// BUG 818783
var r3 = foo(1, n);

function foo2(x, y) {
    return y;
}
foo2(1, { length: '' });
foo2(1, { length: {} });
foo2([], ['']);
