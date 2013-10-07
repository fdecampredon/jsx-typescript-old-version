//// [exportAssignClassAndModule_0.js]
var Foo = (function () {
    function Foo() {
    }
    return Foo;
})();

module.exports = Foo;
//// [exportAssignClassAndModule_1.js]
///<reference path='exportAssignClassAndModule_0.ts'/>
var Foo = require('exportAssignClassAndModule_0');

var z;
var zz;
zz.x;
