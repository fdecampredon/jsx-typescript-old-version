//// [function.js]
var A;
(function (A) {
    function Point() {
        return { x: 0, y: 0 };
    }
    A.Point = Point;
})(A || (A = {}));
//// [module.js]
var B;
(function (B) {
    (function (Point) {
        Point.Origin = { x: 0, y: 0 };
    })(B.Point || (B.Point = {}));
    var Point = B.Point;
})(B || (B = {}));
//// [test.js]
var fn;
var fn = A.Point;

var cl;
var cl = B.Point.Origin;
