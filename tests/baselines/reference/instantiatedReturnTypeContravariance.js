var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var c = (function () {
    function c() {
    }
    c.prototype.foo = function () {
        return null;
    };
    return c;
})();

var d = (function (_super) {
    __extends(d, _super);
    function d() {
        _super.apply(this, arguments);
    }
    d.prototype.foo = function () {
        return null;
    };
    return d;
})(c);
