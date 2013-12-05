var M;
(function (M) {
    M.a = 1;
})(M || (M = {}));

// primary expression
var m;
var m = M;

var a1;
var a1 = M.a;

var a2;
var a2 = m.a;

var M2;
(function (M2) {
    (function (Point) {
        function Origin() {
            return { x: 0, y: 0 };
        }
        Point.Origin = Origin;
    })(M2.Point || (M2.Point = {}));
    var Point = M2.Point;
})(M2 || (M2 = {}));

var p;
var p;

var p2;
var p2;

var M3;
(function (M3) {
    var Utils = (function () {
        function Utils() {
        }
        return Utils;
    })();
    M3.Utils = Utils;
})(M3 || (M3 = {}));
