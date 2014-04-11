//// [aliasUsageInTypeArgumentOfExtendsClause_main.ts]
import Backbone = require("aliasUsageInTypeArgumentOfExtendsClause_backbone");
import moduleA = require("aliasUsageInTypeArgumentOfExtendsClause_moduleA");
interface IHasVisualizationModel {
    VisualizationModel: typeof Backbone.Model;
}
class C<T extends IHasVisualizationModel> {
    x: T;
}
class D extends C<IHasVisualizationModel> {
    x = moduleA;
}

//// [aliasUsageInTypeArgumentOfExtendsClause_backbone.js]
var Model = (function () {
    function Model() {
    }
    return Model;
})();
exports.Model = Model;
//// [aliasUsageInTypeArgumentOfExtendsClause_moduleA.js]
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Backbone = require("aliasUsageInTypeArgumentOfExtendsClause_backbone");
var VisualizationModel = (function (_super) {
    __extends(VisualizationModel, _super);
    function VisualizationModel() {
        _super.apply(this, arguments);
    }
    return VisualizationModel;
})(Backbone.Model);
exports.VisualizationModel = VisualizationModel;
//// [aliasUsageInTypeArgumentOfExtendsClause_main.js]
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var moduleA = require("aliasUsageInTypeArgumentOfExtendsClause_moduleA");

var C = (function () {
    function C() {
    }
    return C;
})();
var D = (function (_super) {
    __extends(D, _super);
    function D() {
        _super.apply(this, arguments);
        this.x = moduleA;
    }
    return D;
})(C);
