//// [enumFromExternalModule_0.js]
(function (Mode) {
    Mode[Mode["Open"] = 0] = "Open";
})(exports.Mode || (exports.Mode = {}));
var Mode = exports.Mode;
//// [enumFromExternalModule_1.js]
///<reference path='enumFromExternalModule_0.ts'/>
var f = require('enumFromExternalModule_0');

var x = 0 /* Open */;
