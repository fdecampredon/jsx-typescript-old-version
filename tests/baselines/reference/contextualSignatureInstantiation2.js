// dot f g x = f(g(x))
var dot;
dot = function (f) {
    return function (g) {
        return function (x) {
            return f(g(x));
        };
    };
};
var id;
var r23 = dot(id)(id);
