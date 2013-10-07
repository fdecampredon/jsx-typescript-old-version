var b;
b.reduce(function (c, d) {
    return c + d;
}, 0); // should not error on '+'
