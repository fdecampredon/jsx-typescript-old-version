foo(function () {
    var Far = [];
    for (var _i = 0; _i < (arguments.length - 0); _i++) {
        Far[_i] = arguments[_i + 0];
    }
    return 0;
});
foo((1), function () {
    return 0;
});
foo(function (x) {
    return x;
});
foo(function (x) {
    if (typeof x === "undefined") { x = 0; }
    return x;
});
var y = x, number;
(function () {
    return x * x;
});
false ? (function () {
    return null;
}) : null;

// missing fatarrow
var x1 = function () {
};
var x2 = function (a) {
};
var x3 = function (a) {
};
var x4 = function () {
    var a = [];
    for (var _i = 0; _i < (arguments.length - 0); _i++) {
        a[_i] = arguments[_i + 0];
    }
};
