var A;
(function (A) {
    var Point = (function () {
        function Point() {
        }
        return Point;
    })();
    A.Point = Point;
})(A || (A = {}));

var A;
(function (A) {
    var Point = (function () {
        function Point() {
        }
        Point.prototype.fromCarthesian = function (p) {
            return { x: p.x, y: p.y };
        };
        return Point;
    })();
})(A || (A = {}));

// ensure merges as expected
var p;
var p;

var X;
(function (X) {
    (function (Y) {
        (function (Z) {
            var Line = (function () {
                function Line() {
                }
                return Line;
            })();
            Z.Line = Line;
        })(Y.Z || (Y.Z = {}));
        var Z = Y.Z;
    })(X.Y || (X.Y = {}));
    var Y = X.Y;
})(X || (X = {}));

var X;
(function (X) {
    (function (Y) {
        (function (Z) {
            var Line = (function () {
                function Line() {
                }
                return Line;
            })();
        })(Y.Z || (Y.Z = {}));
        var Z = Y.Z;
    })(X.Y || (X.Y = {}));
    var Y = X.Y;
})(X || (X = {}));

// ensure merges as expected
var l;
var l;
