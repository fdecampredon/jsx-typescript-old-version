//// [externalModuleAssignToVar_core_require.js]
define(["require", "exports"], function(require, exports) {
    var C = (function () {
        function C() {
        }
        return C;
    })();
    exports.C = C;
});
//// [externalModuleAssignToVar_core_require2.js]
define(["require", "exports"], function(require, exports) {
    var C = (function () {
        function C() {
        }
        return C;
    })();
    
    return C;
});
//// [externalModuleAssignToVar_ext.js]
define(["require", "exports"], function(require, exports) {
    var D = (function () {
        function D() {
        }
        return D;
    })();
    
    return D;
});
//// [externalModuleAssignToVar_core.js]
define(["require", "exports", 'externalModuleAssignToVar_core_require', 'externalModuleAssignToVar_core_require2', 'externalModuleAssignToVar_ext'], function(require, exports, ext, ext2, ext3) {
    var y1 = ext;
    y1 = ext;

    var y2 = ext2;
    y2 = ext2;

    var y3 = ext3;
    y3 = ext3;
});
