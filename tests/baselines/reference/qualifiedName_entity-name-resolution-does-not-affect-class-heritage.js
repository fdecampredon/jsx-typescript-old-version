var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Alpha;
(function (Alpha) {
    Alpha.x = 100;
})(Alpha || (Alpha = {}));

var Beta = (function (_super) {
    __extends(Beta, _super);
    function Beta() {
        _super.apply(this, arguments);
    }
    return Beta;
})(Alpha.x);
