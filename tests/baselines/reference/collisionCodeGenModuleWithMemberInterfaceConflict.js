var m1;
(function (m1) {
    var m2 = (function () {
        function m2() {
        }
        return m2;
    })();
    m1.m2 = m2;
})(m1 || (m1 = {}));
var foo = new m1.m2();
