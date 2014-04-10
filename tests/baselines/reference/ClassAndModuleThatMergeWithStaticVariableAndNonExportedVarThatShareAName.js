//// [ClassAndModuleThatMergeWithStaticVariableAndNonExportedVarThatShareAName.ts]
class Point {
    constructor(public x: number, public y: number) { }

    static Origin: Point = { x: 0, y: 0 };
}

module Point {
    var Origin = ""; // not an error, since not exported
}


module A {
    export class Point {
        constructor(public x: number, public y: number) { }

        static Origin: Point = { x: 0, y: 0 };
    }

    export module Point {
        var Origin = ""; // not an error since not exported
    }
}

//// [ClassAndModuleThatMergeWithStaticVariableAndNonExportedVarThatShareAName.js]
var Point = (function () {
    function Point(x, y) {
        this.x = x;
        this.y = y;
    }
    Point.Origin = { x: 0, y: 0 };
    return Point;
})();

var Point;
(function (Point) {
    var Origin = "";
})(Point || (Point = {}));

var A;
(function (A) {
    var Point = (function () {
        function Point(x, y) {
            this.x = x;
            this.y = y;
        }
        Point.Origin = { x: 0, y: 0 };
        return Point;
    })();
    A.Point = Point;

    (function (Point) {
        var Origin = "";
    })(A.Point || (A.Point = {}));
    var Point = A.Point;
})(A || (A = {}));
