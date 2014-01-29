var foo;
foo.then(function (x) {
    // x is inferred to be a number
    return "asdf";
}).then(function (x) {
    // x is inferred to be string
    x.length;
    return 123;
});
