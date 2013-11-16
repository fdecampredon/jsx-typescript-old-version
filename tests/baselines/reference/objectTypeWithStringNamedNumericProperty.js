// string named numeric properties are legal and distinct when indexed by string values
// indexed numerically the value is converted to a number
// no errors expected below
var C = (function () {
    function C() {
    }
    return C;
})();

var c;
var r1 = c['0.1'];
var r2 = c['.1'];
var r3 = c['1'];
var r3 = c[1];
var r4 = c['1.'];
var r3 = c[1.];
var r5 = c['1..'];
var r6 = c['1.0'];
var r3 = c[1.0];

// BUG 823822
var r7 = i[-1];
var r7 = i[-1.0];
var r8 = i["-1.0"];
var r9 = i["-1"];
var r10 = i[0x1];
var r11 = i[-0x1];
var r12 = i[01];
var r13 = i[-01];

var i;
var r1 = i['0.1'];
var r2 = i['.1'];
var r3 = i['1'];
var r3 = c[1];
var r4 = i['1.'];
var r3 = c[1.];
var r5 = i['1..'];
var r6 = i['1.0'];
var r3 = c[1.0];

// BUG 823822
var r7 = i[-1];
var r7 = i[-1.0];
var r8 = i["-1.0"];
var r9 = i["-1"];
var r10 = i[0x1];
var r11 = i[-0x1];
var r12 = i[01];
var r13 = i[-01];

var a;

var r1 = a['0.1'];
var r2 = a['.1'];
var r3 = a['1'];
var r3 = c[1];
var r4 = a['1.'];
var r3 = c[1.];
var r5 = a['1..'];
var r6 = a['1.0'];
var r3 = c[1.0];

// BUG 823822
var r7 = i[-1];
var r7 = i[-1.0];
var r8 = i["-1.0"];
var r9 = i["-1"];
var r10 = i[0x1];
var r11 = i[-0x1];
var r12 = i[01];
var r13 = i[-01];

var b = {
    "0.1": null,
    ".1": new Object(),
    "1": 1,
    "1.": "",
    "1..": true,
    "1.0": new Date(),
    "-1.0": /123/,
    "-1": Date
};

var r1 = b['0.1'];
var r2 = b['.1'];
var r3 = b['1'];
var r3 = c[1];
var r4 = b['1.'];
var r3 = c[1.];
var r5 = b['1..'];
var r6 = b['1.0'];
var r3 = c[1.0];

// BUG 823822
var r7 = i[-1];
var r7 = i[-1.0];
var r8 = i["-1.0"];
var r9 = i["-1"];
var r10 = i[0x1];
var r11 = i[-0x1];
var r12 = i[01];
var r13 = i[-01];
