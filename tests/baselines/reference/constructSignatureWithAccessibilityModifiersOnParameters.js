// Parameter properties are only valid in constructor definitions, not even in other forms of construct signatures
var C = (function () {
    function C(x, y) {
        this.x = x;
        this.y = y;
    }
    return C;
})();

var C2 = (function () {
    function C2(x) {
        this.x = x;
    }
    return C2;
})();

var C3 = (function () {
    function C3(x) {
        this.x = x;
    }
    return C3;
})();

var a;

var b;
