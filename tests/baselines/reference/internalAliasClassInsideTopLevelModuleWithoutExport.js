//// [internalAliasClassInsideTopLevelModuleWithoutExport.js]
(function (x) {
    var c = (function () {
        function c() {
        }
        c.prototype.foo = function (a) {
            return a;
        };
        return c;
    })();
    x.c = c;
})(exports.x || (exports.x = {}));
var x = exports.x;

var xc = x.c;
exports.cProp = new xc();
var cReturnVal = exports.cProp.foo(10);


////[internalAliasClassInsideTopLevelModuleWithoutExport.d.ts]
export declare module x {
    class c {
        public foo(a: number): number;
    }
}
export declare var cProp: x.c;
