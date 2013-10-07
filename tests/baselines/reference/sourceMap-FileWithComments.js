
// Module
var Shapes;
(function (Shapes) {
    // Class
    var Point = (function () {
        // Constructor
        function Point(x, y) {
            this.x = x;
            this.y = y;
        }
        // Instance member
        Point.prototype.getDist = function () {
            return Math.sqrt(this.x * this.x + this.y * this.y);
        };

        Point.origin = new Point(0, 0);
        return Point;
    })();
    Shapes.Point = Point;

    // Variable comment after class
    var a = 10;

    function foo() {
    }
    Shapes.foo = foo;

    /**  comment after function
    * this is another comment
    */
    var b = 10;
})(Shapes || (Shapes = {}));

/** Local Variable */
var p = new Shapes.Point(3, 4);
var dist = p.getDist();
//# sourceMappingURL=sourceMap-FileWithComments.js.map
