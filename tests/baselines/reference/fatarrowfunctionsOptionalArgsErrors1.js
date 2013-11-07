(function (arg1, arg2) {
    return 101;
});
(function () {
    var arg = [];
    for (var _i = 0; _i < (arguments.length - 0); _i++) {
        arg[_i] = arguments[_i + 0];
    }
    return 102;
});
(function () {
    var arg = [];
    for (var _i = 0; _i < (arguments.length - 0); _i++) {
        arg[_i] = arguments[_i + 0];
    }
    return 103;
});
(function () {
    var arg = [];
    for (var _i = 0; _i < (arguments.length - 0); _i++) {
        arg[_i] = arguments[_i + 0];
    }
    return 104;
});
(function () {
    var  = [];
    for (var _i = 0; _i < (arguments.length - 0); _i++) {
        [_i] = arguments[_i + 0];
    }
    return 105;
});

// Non optional parameter following an optional one
(function (arg1, arg2) {
    if (typeof arg1 === "undefined") { arg1 = 1; }
    return 1;
});
