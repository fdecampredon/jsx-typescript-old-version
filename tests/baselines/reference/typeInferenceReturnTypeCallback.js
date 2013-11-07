var Nil = (function () {
    function Nil() {
    }
    Nil.prototype.map = function (f) {
        return null;
    };
    return Nil;
})();

var Cons = (function () {
    function Cons() {
    }
    Cons.prototype.map = function (f) {
        return this.foldRight(new Nil(), function (t, acc) {
            return new Cons();
        });
    };

    Cons.prototype.foldRight = function (z, f) {
        return null;
    };
    return Cons;
})();
