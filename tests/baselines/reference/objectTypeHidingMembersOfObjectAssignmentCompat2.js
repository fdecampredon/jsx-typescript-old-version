var i;
var o;
o = i;
i = o;

var C = (function () {
    function C() {
    }
    C.prototype.toString = function () {
        return 1;
    };
    return C;
})();
var c;
o = c;
c = o;

var a = {
    toString: function () {
    }
};
o = a;
a = o;
