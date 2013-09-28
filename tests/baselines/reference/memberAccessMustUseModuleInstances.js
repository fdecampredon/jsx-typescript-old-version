//// [memberAccessMustUseModuleInstances_0.js]
define(["require", "exports"], function(require, exports) {
    var Promise = (function () {
        function Promise() {
        }
        Promise.timeout = function (delay) {
            return null;
        };
        return Promise;
    })();
    exports.Promise = Promise;
});
//// [memberAccessMustUseModuleInstances_1.js]
define(["require", "exports", 'memberAccessMustUseModuleInstances_0'], function(require, exports, WinJS) {
    WinJS.Promise.timeout(10);
});
