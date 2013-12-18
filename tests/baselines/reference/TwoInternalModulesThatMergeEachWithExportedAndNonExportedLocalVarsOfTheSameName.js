//// [part1.js]
var A;
(function (A) {
    (function (Utils) {
        function mirror(p) {
            return { x: p.y, y: p.x };
        }
        Utils.mirror = mirror;
    })(A.Utils || (A.Utils = {}));
    var Utils = A.Utils;
    A.Origin = { x: 0, y: 0 };
})(A || (A = {}));
//// [part2.js]
var A;
(function (A) {
    // not a collision, since we don't export
    var Origin = "0,0";

    (function (Utils) {
        var Plane = (function () {
            function Plane(tl, br) {
                this.tl = tl;
                this.br = br;
            }
            return Plane;
        })();
        Utils.Plane = Plane;
    })(A.Utils || (A.Utils = {}));
    var Utils = A.Utils;
})(A || (A = {}));
//// [part3.js]
// test the merging actually worked
var o;
var o;
var o = A.Origin;
var o = A.Utils.mirror(o);

var p;
var p;
var p = new A.Utils.Plane(o, { x: 1, y: 1 });
