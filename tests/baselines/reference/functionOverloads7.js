var foo = (function () {
    function foo() {
    }
    foo.prototype.bar = function (foo) {
        return "foo";
    };
    foo.prototype.n = function () {
        var foo = this.bar();
        foo = this.bar("test");
    };
    return foo;
})();
