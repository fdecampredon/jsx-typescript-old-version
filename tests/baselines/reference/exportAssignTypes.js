//// [expString.js]
var x = "test";
module.exports = x;
//// [expNumber.js]
var x = 42;
module.exports = x;
//// [expBoolean.js]
var x = true;
module.exports = x;
//// [expArray.js]
var x = [1, 2];
module.exports = x;
//// [expObject.js]
var x = { answer: 42, when: 1776 };
module.exports = x;
//// [expAny.js]
var x;
module.exports = x;
//// [expGeneric.js]
function x(a) {
    return a;
}
module.exports = x;
//// [consumer.js]
var iString = require('./expString');
var v1 = iString;

var iNumber = require('./expNumber');
var v2 = iNumber;

var iBoolean = require('./expBoolean');
var v3 = iBoolean;

var iArray = require('./expArray');
var v4 = iArray;

var iObject = require('./expObject');
var v5 = iObject;

var iAny = require('./expAny');
var v6 = iAny;

var iGeneric = require('./expGeneric');
var v7 = iGeneric;
