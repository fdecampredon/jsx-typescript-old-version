//// [declFileInternalAliases.js]
var m;
(function (m) {
    var c = (function () {
        function c() {
        }
        return c;
    })();
    m.c = c;
})(m || (m = {}));
var m1;
(function (m1) {
    var x = m.c;
    m1.d = new x();
})(m1 || (m1 = {}));
var m2;
(function (m2) {
    var x = m.c;
    m2.x = x;
    m2.d = new x();
})(m2 || (m2 = {}));


////[declFileInternalAliases.d.ts]
declare module m {
    class c {
    }
}
declare module m1 {
    var d: m.c;
}
declare module m2 {
    export import x = m.c;
    var d: x;
}
