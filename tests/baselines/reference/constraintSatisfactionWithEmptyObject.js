// Object constraint
function foo(x) {
}
var r = foo({});
var a = {};
var r = foo({});

var C = (function () {
    function C(x) {
        this.x = x;
    }
    return C;
})();

var r2 = new C({});

var i;

// {} constraint
function foo2(x) {
}
var r = foo2({});
var a = {};
var r = foo2({});

var C2 = (function () {
    function C2(x) {
        this.x = x;
    }
    return C2;
})();

var r2 = new C2({});

var i2;
