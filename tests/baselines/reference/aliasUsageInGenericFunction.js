//// [aliasUsageInGenericFunction_backbone.js]
var Model = (function () {
    function Model() {
    }
    return Model;
})();
exports.Model = Model;
//// [aliasUsageInGenericFunction_moduleA.js]
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Backbone = require("aliasUsageInGenericFunction_backbone");
var VisualizationModel = (function (_super) {
    __extends(VisualizationModel, _super);
    function VisualizationModel() {
        _super.apply(this, arguments);
    }
    return VisualizationModel;
})(Backbone.Model);
exports.VisualizationModel = VisualizationModel;
//// [aliasUsageInGenericFunction_main.js]
var moduleA = require("aliasUsageInGenericFunction_moduleA");

function foo(x) {
    return x;
}
var r = foo({ a: moduleA });
var r2 = foo({ a: null });
