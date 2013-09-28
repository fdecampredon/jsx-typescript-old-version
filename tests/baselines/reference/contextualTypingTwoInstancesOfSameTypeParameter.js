function f6(x) {
    return null;
}
f6(function (x) {
    return f6(function (y) {
        return x = y;
    });
});
