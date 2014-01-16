// no errors expected
var combine = function (f) {
    return function (g) {
        return function (x) {
            return f(g(x));
        };
    };
};

var foo = function (g) {
    return function (h) {
        return function (f) {
            return h(combine(f)(g));
        };
    };
};
