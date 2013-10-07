//// [privacyCheckExternalModuleExportAssignmentOfGenericClass_0.js]
var Foo = (function () {
    function Foo(a) {
        this.a = a;
    }
    return Foo;
})();
module.exports = Foo;
//// [privacyCheckExternalModuleExportAssignmentOfGenericClass_1.js]
var Foo = require("privacyCheckExternalModuleExportAssignmentOfGenericClass_0");
