// type of 'this' in FunctionExpression is Any
function fn() {
    var p = this;
    var p;
}

var t = function () {
    var p = this;
    var p;
};

var t2 = function f() {
    var x = this;
    var x;
};

var C = (function () {
    function C() {
        this.x = function () {
            var q;
            var q = this;
        };
        this.y = function ff() {
            var q;
            var q = this;
        };
    }
    return C;
})();

var M;
(function (M) {
    function fn() {
        var p = this;
        var p;
    }

    var t = function () {
        var p = this;
        var p;
    };

    var t2 = function f() {
        var x = this;
        var x;
    };
})(M || (M = {}));
