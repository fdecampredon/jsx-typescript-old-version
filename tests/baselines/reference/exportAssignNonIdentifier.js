//// [foo1.js]
var x = 10;
typeof x; // Error
//// [foo2.js]
"sausages"; // Error
//// [foo3.js]
var Foo3 = (function () {
    function Foo3() {
    }
    return Foo3;
})();
;
//// [foo4.js]
true; // Error
//// [foo5.js]
module.exports = undefined;
//// [foo6.js]
void ; // Error
//// [foo7.js]
String; // Error
module.exports = Date;
//// [foo8.js]
null; // Error
