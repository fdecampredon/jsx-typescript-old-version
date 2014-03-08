//// [aliasUsageInFunctionExpression_backbone.js]
var Model = (function () {
    function Model() {
    }
    return Model;
})();
exports.Model = Model;
//// [aliasUsageInFunctionExpression_moduleA.js]
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Backbone = require("aliasUsageInFunctionExpression_backbone");
var VisualizationModel = (function (_super) {
    __extends(VisualizationModel, _super);
    function VisualizationModel() {
        _super.apply(this, arguments);
    }
    return VisualizationModel;
})(Backbone.Model);
exports.VisualizationModel = VisualizationModel;
//// [aliasUsageInFunctionExpression_main.js]
var moduleA = require("aliasUsageInFunctionExpression_moduleA");

var f = function (x) {
    return x;
};
f = function (x) {
    return moduleA;
};
