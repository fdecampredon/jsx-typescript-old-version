var Foo = (function () {
    function Foo(x, y) {
        if (typeof y === "undefined") { y = x; }
        this.x = x;
        this.y = y;
    }
    return Foo;
})();
