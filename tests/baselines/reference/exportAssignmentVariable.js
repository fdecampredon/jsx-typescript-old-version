//// [exportAssignmentVariable_A.js]
var x = 0;

module.exports = x;
//// [exportAssignmentVariable_B.js]
var y = require("exportAssignmentVariable_A");

var n = y;
