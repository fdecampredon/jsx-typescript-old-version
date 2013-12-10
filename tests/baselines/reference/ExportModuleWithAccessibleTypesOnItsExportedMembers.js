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

    (function (B) {
        B.Origin = new A.Point(0, 0);

        var Line = (function () {
            function Line(start, end) {
            }
            Line.fromOrigin = function (p) {
                return new Line({ x: 0, y: 0 }, p);
            };
            return Line;
        })();
        B.Line = Line;
    })(A.B || (A.B = {}));
    var B = A.B;
})(A || (A = {}));
