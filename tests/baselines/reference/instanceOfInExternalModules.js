//// [instanceOfInExternalModules_require.js]
define(["require", "exports"], function(require, exports) {
    var Foo = (function () {
        function Foo() {
        }
        return Foo;
    })();
    exports.Foo = Foo;
});
//// [instanceOfInExternalModules_1.js]
define(["require", "exports", "instanceOfInExternalModules_require"], function(require, exports, Bar) {
    function IsFoo(value) {
        return value instanceof Bar.Foo;
    }
});
