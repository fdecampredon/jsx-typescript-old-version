var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var MyView = (function (_super) {
    __extends(MyView, _super);
    function MyView() {
        _super.apply(this, arguments);
    }
    MyView.prototype.getDataSeries = function () {
        var data = this.model.get("data");
        var allSeries = _.pluck(data, "series");

        return _.map(allSeries, _.first);
    };
    return MyView;
})(View);
