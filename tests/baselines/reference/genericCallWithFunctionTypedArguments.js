// Generic functions used as arguments for function typed parameters are not used to make inferences from
// Using function arguments, no errors expected
function foo(x) {
    return x(null);
}

var r = foo(function (x) {
    return '';
});
var r2 = foo(function (x) {
    return '';
});
var r3 = foo(function (x) {
    return '';
});

function foo2(x, cb) {
    return cb(x);
}

var r4 = foo2(1, function (a) {
    return '';
});
var r5 = foo2(1, function (a) {
    return '';
});
var r6 = foo2('', function (a) {
    return 1;
});

function foo3(x, cb, y) {
    return cb(x);
}

var r7 = foo3(1, function (a) {
    return '';
}, '');

var r8 = foo3(1, function (a) {
    return '';
}, 1);
var r9 = foo3(1, function (a) {
    return '';
}, '');

function other(t, u) {
    var r10 = foo2(1, function (x) {
        return '';
    });
    var r10 = foo2(1, function (x) {
        return '';
    });

    var r11 = foo3(1, function (x) {
        return '';
    }, '');
    var r11b = foo3(1, function (x) {
        return '';
    }, 1);
    var r12 = foo3(1, function (a) {
        return '';
    }, 1);
}
