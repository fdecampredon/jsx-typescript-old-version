var C = (function () {
    function C() {
    }
    return C;
})();

var c;
var r1 = c['0.1'];
var r2 = c['.1'];
var r3 = c['1'];
var r4 = c['1.'];
var r5 = c['1..'];
var r6 = c['1.0'];
var r7 = c['-1.0'];

var i;
var r1 = i['0.1'];
var r2 = i['.1'];
var r3 = i['1'];
var r4 = i['1.'];
var r5 = i['1..'];
var r6 = i['1.0'];
var r7 = i['-1.0'];

var a;

var r1 = a['0.1'];
var r2 = a['.1'];
var r3 = a['1'];
var r4 = a['1.'];
var r5 = a['1..'];
var r6 = a['1.0'];
var r7 = a['-1.0'];

var b = {
    "0.1": null,
    ".1": new Object(),
    "1": 1,
    "1.": "",
    "1..": true,
    "1.0": new Date(),
    "-1.0": /123/
};

var r1 = b['0.1'];
var r2 = b['.1'];
var r3 = b['1'];
var r4 = b['1.'];
var r5 = b['1..'];
var r6 = b['1.0'];
var r7 = b['-1.0'];
