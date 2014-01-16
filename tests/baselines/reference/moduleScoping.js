//// [file1.js]
var v1 = "sausages";
//// [file2.js]
var v2 = 42;
var v4 = function () {
    return 5;
};
//// [file3.js]
exports.v3 = true;
var v2 = [1, 2, 3];
//// [file4.js]
var file3 = require('./file3');
var t1 = v1;
var t2 = v2;
var t3 = file3.v3;
var v4 = { a: true, b: NaN };
//// [file5.js]
var x = v2;
