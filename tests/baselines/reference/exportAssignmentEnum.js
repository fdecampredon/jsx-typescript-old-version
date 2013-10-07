//// [exportAssignmentEnum_A.js]
var E;
(function (E) {
    E[E["A"] = 0] = "A";
    E[E["B"] = 1] = "B";
    E[E["C"] = 2] = "C";
})(E || (E = {}));

module.exports = E;
//// [exportAssignmentEnum_B.js]
var EnumE = require("exportAssignmentEnum_A");

var a = EnumE.A;
var b = EnumE.B;
var c = EnumE.C;
