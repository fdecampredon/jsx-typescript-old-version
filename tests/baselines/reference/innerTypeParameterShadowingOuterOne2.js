// inner type parameters shadow outer ones of the same name
// no errors expected
var C = (function () {
    function C() {
    }
    C.prototype.g = function () {
        var x;
        x.toFixed();
    };

    C.prototype.h = function () {
        var x;
        x.getDate();
    };
    return C;
})();

var C2 = (function () {
    function C2() {
    }
    C2.prototype.g = function () {
        var x;
        x.toFixed();
    };

    C2.prototype.h = function () {
        var x;
        x.getDate();
    };
    return C2;
})();
//class C2<T extends Date, U extends T> {
//    g<T extends Number, U extends T>() {
//        var x: U;
//        x.toFixed();
//    }
//    h() {
//        var x: U;
//        x.getDate();
//    }
//}
