var CallSignature;
(function (CallSignature) {
    var r = foo1(function (x) {
        return 1;
    });
    var r2 = foo1(function (x) {
        return '';
    });

    var r3 = foo2(function (x, y) {
        return 1;
    });
    var r4 = foo2(function (x) {
        return '';
    });
})(CallSignature || (CallSignature = {}));
