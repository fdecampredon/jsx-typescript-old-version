var enumdule;
(function (enumdule) {
    enumdule[enumdule["Red"] = 0] = "Red";
    enumdule[enumdule["Blue"] = 1] = "Blue";
})(enumdule || (enumdule = {}));

var enumdule;
(function (enumdule) {
    var Point = (function () {
        function Point(x, y) {
            this.x = x;
            this.y = y;
        }
        return Point;
    })();
    enumdule.Point = Point;
})(enumdule || (enumdule = {}));

var x;
var x = 0 /* Red */;

var y;
var y = new enumdule.Point(0, 0);
