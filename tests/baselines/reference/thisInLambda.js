var Foo = (function () {
    function Foo() {
        this.x = "hello";
    }
    Foo.prototype.bar = function () {
        var _this = this;
        this.x; // 'this' is type 'Foo'
        var f = function () {
            return _this.x;
        };
    };
    return Foo;
})();

function myFn(a) {
}
var myCls = (function () {
    function myCls() {
        var _this = this;
        myFn(function () {
            myFn(function () {
                var x = _this;
            });
        });
    }
    return myCls;
})();
