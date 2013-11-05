function f(p) {
}
;
f(function (x) {
    return f(function (y) {
        return x = y;
    });
});
