// Function typed arguments with multiple signatures must be passed an implementation that matches all of them
// No inferences are made to or from such types
var NonGenericParameter;
(function (NonGenericParameter) {
    var a;

    function foo4(cb) {
        return cb;
    }

    var r = foo4(a);
    var r2 = foo4(function (x) {
        return x;
    });
    var r4 = foo4(function (x) {
        return x;
    });
})(NonGenericParameter || (NonGenericParameter = {}));

var GenericParameter;
(function (GenericParameter) {
    function foo5(cb) {
        return cb;
    }

    var r5 = foo5(function (x) {
        return x;
    });
    var a;
    var r7 = foo5(a);

    function foo6(cb) {
        return cb;
    }

    var r8 = foo6(function (x) {
        return x;
    });
    var r9 = foo6(function (x) {
        return '';
    });
    var r11 = foo6(function (x, y) {
        return '';
    });

    function foo7(x, cb) {
        return cb;
    }

    var r12 = foo7(1, function (x) {
        return x;
    });
    var r13 = foo7(1, function (x) {
        return '';
    });
    var a;
    var r14 = foo7(1, a);
})(GenericParameter || (GenericParameter = {}));
