//// [declFileModuleWithPropertyOfTypeModule.js]
var m;
(function (m) {
    var c = (function () {
        function c() {
        }
        return c;
    })();
    m.c = c;

    m.a = m;
})(m || (m = {}));


////[declFileModuleWithPropertyOfTypeModule.d.ts]
declare module m {
    class c {
    }
    var a: {
        c: {
            prototype: c;
            new(): c;
        };
        a: typeof m;
    };
}
