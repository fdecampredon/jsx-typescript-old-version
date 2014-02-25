var Foo = (function () {
    function Foo() {
    }
    Foo.prototype.y = function () {
    };
    Object.defineProperty(Foo.prototype, "Z", {
        get: function () {
            return 1;
        },
        enumerable: true,
        configurable: true
    });
    return Foo;
})();

var i;
var r1 = i.x;
var r2 = i.y();
var r3 = i.Z;

var f = i;
i = f;
