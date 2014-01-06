var A;
(function (A) {
    var Point = (function () {
        function Point(x, y) {
            this.x = x;
            this.y = y;
        }
        return Point;
    })();
    A.Point = Point;

    A.Origin = new Point(0, 0);
})(A || (A = {}));

// no code gen expected
var B;
(function (B) {
})(B || (B = {}));

// no code gen expected
var C;
(function (C) {
    var m;
    var p;
    var p = { x: 0, y: 0 };
})(C || (C = {}));

// code gen expected
var D;
(function (D) {
    var a = A;

    var p = new a.Point(1, 1);
})(D || (D = {}));

var E;
(function (E) {
    var a = A;
    function xDist(x) {
        return (a.Origin.x - x.x);
    }
    E.xDist = xDist;
})(E || (E = {}));
