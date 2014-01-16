//// [A.js]
define(["require", "exports"], function(require, exports) {
    var A = (function () {
        function A() {
        }
        return A;
    })();
    exports.A = A;
});
//// [B.js]
define(["require", "exports", 'A'], function(require, exports, a) {
    var A = a.A;

    
    return A;
});
