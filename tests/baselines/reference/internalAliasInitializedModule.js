//// [internalAliasInitializedModule.js]
var a;
(function (a) {
    (function (b) {
        var c = (function () {
            function c() {
            }
            return c;
        })();
        b.c = c;
    })(a.b || (a.b = {}));
    var b = a.b;
})(a || (a = {}));

var c;
(function (c) {
    var b = a.b;
    c.x = new b.c();
})(c || (c = {}));


////[internalAliasInitializedModule.d.ts]
declare module a {
    module b {
        class c {
        }
    }
}
declare module c {
    var x: a.b.c;
}
