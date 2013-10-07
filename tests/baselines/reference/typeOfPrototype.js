var Foo = (function () {
    function Foo() {
        this.bar = 3;
    }
    Foo.bar = '';
    return Foo;
})();
Foo.prototype.bar = undefined; // Should be OK
