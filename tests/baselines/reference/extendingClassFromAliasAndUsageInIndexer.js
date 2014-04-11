//// [extendingClassFromAliasAndUsageInIndexer_main.ts]
import Backbone = require("extendingClassFromAliasAndUsageInIndexer_backbone");
import moduleA = require("extendingClassFromAliasAndUsageInIndexer_moduleA");
import moduleB = require("extendingClassFromAliasAndUsageInIndexer_moduleB");
interface IHasVisualizationModel {
    VisualizationModel: typeof Backbone.Model;
}
var moduleATyped: IHasVisualizationModel = moduleA;
var moduleMap: { [key: string]: IHasVisualizationModel } = {
    "moduleA": moduleA,
    "moduleB": moduleB
};
var moduleName: string;
var visModel = new moduleMap[moduleName].VisualizationModel();

//// [extendingClassFromAliasAndUsageInIndexer_backbone.js]
var Model = (function () {
    function Model() {
    }
    return Model;
})();
exports.Model = Model;
//// [extendingClassFromAliasAndUsageInIndexer_moduleA.js]
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Backbone = require("extendingClassFromAliasAndUsageInIndexer_backbone");
var VisualizationModel = (function (_super) {
    __extends(VisualizationModel, _super);
    function VisualizationModel() {
        _super.apply(this, arguments);
    }
    return VisualizationModel;
})(Backbone.Model);
exports.VisualizationModel = VisualizationModel;
//// [extendingClassFromAliasAndUsageInIndexer_moduleB.js]
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Backbone = require("extendingClassFromAliasAndUsageInIndexer_backbone");
var VisualizationModel = (function (_super) {
    __extends(VisualizationModel, _super);
    function VisualizationModel() {
        _super.apply(this, arguments);
    }
    return VisualizationModel;
})(Backbone.Model);
exports.VisualizationModel = VisualizationModel;
//// [extendingClassFromAliasAndUsageInIndexer_main.js]
var moduleA = require("extendingClassFromAliasAndUsageInIndexer_moduleA");
var moduleB = require("extendingClassFromAliasAndUsageInIndexer_moduleB");

var moduleATyped = moduleA;
var moduleMap = {
    "moduleA": moduleA,
    "moduleB": moduleB
};
var moduleName;
var visModel = new moduleMap[moduleName].VisualizationModel();
