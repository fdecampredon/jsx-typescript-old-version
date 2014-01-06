//// [foo1.js]
var x = 10;
var y = 20;
module.exports = y;
//// [foo2.js]
var x = 10;
var y = (function () {
    function y() {
    }
    return y;
})();
;
module.exports = y;
//// [foo3.js]
var x;
(function (_x) {
    _x.x = 10;
})(x || (x = {}));
var y = (function () {
    function y() {
    }
    return y;
})();
module.exports = y;
//// [foo4.js]
function x() {
    return 42;
}
function y() {
    return 42;
}
module.exports = y;
//// [foo5.js]
var x = 5;
var y = "test";
var z = {};
module.exports = z;
