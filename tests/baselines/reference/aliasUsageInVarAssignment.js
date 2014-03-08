//// [aliasUsageInVarAssignment_backbone.js]
var Model = (function () {
    function Model() {
    }
    return Model;
})();
exports.Model = Model;
//// [aliasUsageInVarAssignment_moduleA.js]
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Backbone = require("aliasUsageInVarAssignment_backbone");
var VisualizationModel = (function (_super) {
    __extends(VisualizationModel, _super);
    function VisualizationModel() {
        _super.apply(this, arguments);
    }
    return VisualizationModel;
})(Backbone.Model);
exports.VisualizationModel = VisualizationModel;
//// [aliasUsageInVarAssignment_main.js]
var i;
var m = i;
