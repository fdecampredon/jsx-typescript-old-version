var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var P = (function () {
    function P() {
    }
    P.prototype.x = function () {
    };
    P.y = function () {
    };
    return P;
})();

var Q = (function (_super) {
    __extends(Q, _super);
    // Super is not allowed in constructor args
    function Q(z, zz, zzz) {
        if (typeof z === "undefined") { z = _super.prototype.; }
        if (typeof zz === "undefined") { zz = _super.prototype.; }
        if (typeof zzz === "undefined") { zzz = function () {
            return _super.prototype.;
        }; }
        _super.call(this);
        this.z = z;
        this.xx = _super.prototype.;
    }
    Q.prototype.foo = function (zz) {
        if (typeof zz === "undefined") { zz = _super.prototype.; }
        _super.prototype.x.call(this);
        _super.prototype.y.call(this); // error
    };

    Q.bar = function (zz) {
        if (typeof zz === "undefined") { zz = _super.prototype.; }
        _super.prototype.x.call(this); // error
        _super.prototype.y.call(this);
    };
    Q.yy = _super.prototype.;
    return Q;
})(P);
