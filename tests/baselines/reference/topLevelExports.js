//// [topLevelExports.ts]
export var foo = 3;

function log(n:number) { return n;}

void log(foo).toString();

//// [topLevelExports.js]
define(["require", "exports"], function(require, exports) {
    exports.foo = 3;

    function log(n) {
        return n;
    }

    void log(exports.foo).toString();
});
