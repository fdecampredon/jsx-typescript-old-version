//// [foo1.js]
module.exports = M1;
//// [foo2.js]
var foo1 = require('./foo1');
var x = foo1.b();
