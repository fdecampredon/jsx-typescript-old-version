function fn() {
    return fn.n;
}
var fn;
(function (fn) {
    fn.n = 1;
})(fn || (fn = {}));
