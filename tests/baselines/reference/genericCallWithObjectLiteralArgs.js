function foo(x) {
    return x;
}

var r = foo({ bar: 1, baz: '' });
var r2 = foo({ bar: 1, baz: 1 });

// BUG 835724
var r3 = foo({ bar: foo, baz: foo });
var r4 = foo({ bar: 1, baz: '' }); // T = Object
