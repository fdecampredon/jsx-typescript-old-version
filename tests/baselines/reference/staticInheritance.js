var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
function doThing(x) {
}
var A = (function () {
    function A() {
        this.p = doThing(A);
    }
    return A;
})();
var B = (function (_super) {
    __extends(B, _super);
    function B() {
        _super.apply(this, arguments);
        this.p1 = doThing(A);
        this.p2 = doThing(B);
    }
    return B;
})(A);
doThing(B); //OK
