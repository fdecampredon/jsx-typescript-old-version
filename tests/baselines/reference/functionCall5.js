var m1;
(function (m1) {
    var c1 = (function () {
        function c1() {
        }
        return c1;
    })();
    m1.c1 = c1;
})(m1 || (m1 = {}));
function foo() {
    return new m1.c1();
}
;
var x = foo();
