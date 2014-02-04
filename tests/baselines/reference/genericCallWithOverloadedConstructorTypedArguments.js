// Function typed arguments with multiple signatures must be passed an implementation that matches all of them
// Inferences are made quadratic-pairwise to and from these overload sets
var NonGenericParameter;
(function (NonGenericParameter) {
    var a;

    function foo4(cb) {
        return new cb(null);
    }

    var r = foo4(a);
    var b;
    var r2 = foo4(b);
})(NonGenericParameter || (NonGenericParameter = {}));

var GenericParameter;
(function (GenericParameter) {
    function foo5(cb) {
        return cb;
    }

    var a;
    var r5 = foo5(a);
    var b;
    var r7 = foo5(b);

    function foo6(cb) {
        return cb;
    }

    var r8 = foo6(a);
    var r9 = foo6(b);

    function foo7(x, cb) {
        return cb;
    }

    var r13 = foo7(1, b);
    var c;
    var c2;
    var r14 = foo7(1, c);
    var r15 = foo7(1, c2);
})(GenericParameter || (GenericParameter = {}));
