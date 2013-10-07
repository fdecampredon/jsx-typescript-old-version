//// [moduleAliasAsFunctionArgument_0.js]
define(["require", "exports"], function(require, exports) {
    exports.x;
});
//// [moduleAliasAsFunctionArgument_1.js]
define(["require", "exports", 'moduleAliasAsFunctionArgument_0'], function(require, exports, a) {
    function fn(arg) {
    }

    a.x; // OK
    fn(a); // Error: property 'x' is missing from 'a'
});
