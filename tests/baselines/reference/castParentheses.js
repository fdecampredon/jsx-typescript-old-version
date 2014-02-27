var a = (function () {
    function a() {
    }
    return a;
})();

var b = a;
var b = a.b;
var b = a.b.c;
var b = a.b().c;
var b = new a;
var b = new a.b;
var b = new a.b;
