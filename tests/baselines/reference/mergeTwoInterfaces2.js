// two interfaces with the same root module should merge
// root module now multiple module declarations
// BUG 856468
var M2;
(function (M2) {
    var a;
    var r1 = a.foo;
    var r2 = a.bar;
})(M2 || (M2 = {}));

var M2;
(function (M2) {
    var a;
    var r1 = a.foo;
    var r2 = a.bar;
})(M2 || (M2 = {}));

// same as above but with an additional level of nesting
var M2;
(function (M2) {
    (function (M3) {
        var a;
        var r1 = a.foo;
        var r2 = a.bar;
    })(M2.M3 || (M2.M3 = {}));
    var M3 = M2.M3;
})(M2 || (M2 = {}));

var M2;
(function (M2) {
    (function (M3) {
        var a;
        var r1 = a.foo;
        var r2 = a.bar;
    })(M2.M3 || (M2.M3 = {}));
    var M3 = M2.M3;
})(M2 || (M2 = {}));
