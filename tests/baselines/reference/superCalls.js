var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Base = (function () {
    function Base(n) {
        this.x = 43;
    }
    return Base;
})();

function v() {
}

var Derived = (function (_super) {
    __extends(Derived, _super);
    //super call in class constructor of derived type
    function Derived(q) {
        _super.call(this, '');
        this.q = q;

        //type of super call expression is void
        var p = _super.call(this, '');
        var p = v();
    }
    return Derived;
})(Base);

var OtherBase = (function () {
    function OtherBase() {
    }
    return OtherBase;
})();

var OtherDerived = (function (_super) {
    __extends(OtherDerived, _super);
    function OtherDerived() {
        var p = '';
        _super.call(this);
    }
    return OtherDerived;
})(OtherBase);
