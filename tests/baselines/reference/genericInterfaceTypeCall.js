var foo;

var test;

test.fail(function (arg) {
    return foo.reject(arg);
});
test.fail2(function (arg) {
    return foo.reject(arg);
}); // Error: Supplied parameters do not match any signature of call target
