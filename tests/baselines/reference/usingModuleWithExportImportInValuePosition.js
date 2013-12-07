var A;
(function (A) {
    A.x = 'hello world';
    var Point = (function () {
        function Point(x, y) {
            this.x = x;
            this.y = y;
        }
        return Point;
    })();
    A.Point = Point;
})(A || (A = {}));
var C;
(function (C) {
    var a = A;
    C.a = a;
})(C || (C = {}));

var a = C.a.x;
var b = new C.a.Point(0, 0);
var c;
var c;
