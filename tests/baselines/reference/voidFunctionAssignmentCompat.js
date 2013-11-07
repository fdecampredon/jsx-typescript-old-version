var fa = function () {
    return 3;
};
fa = function () {
}; // should not work

var fv = function () {
};
fv = function () {
    return 0;
}; // should work

function execAny(callback) {
    return callback(0);
}
execAny(function () {
}); // should work

function execVoid(callback) {
    callback(0);
}
execVoid(function () {
    return 0;
}); // should work

var fra = function () {
    return function () {
    };
};
var frv = function () {
    return function () {
        return 0;
    };
};

var fra3 = (function () {
    return function (v) {
        return v;
    };
})();
var frv3 = (function () {
    return function () {
        return 0;
    };
})();
