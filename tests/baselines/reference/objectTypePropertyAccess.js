var C = (function () {
    function C() {
    }
    return C;
})();

var c;
var r1 = c.toString();
var r2 = c['toString']();

var i;
var r3 = i.toString();
var r4 = i['toString']();

var a = {
    foo: ''
};

var r5 = a.toString();
var r6 = a['toString']();
