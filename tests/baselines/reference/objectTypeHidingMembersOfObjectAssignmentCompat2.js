var i;
var o;
o = i; // ok
i = o; // error

var C = (function () {
    function C() {
    }
    C.prototype.toString = function () {
        return 1;
    };
    return C;
})();
var c;
o = c; // ok
c = o; // error

var a = {
    toString: function () {
    }
};
o = a; // ok
a = o; // ok
