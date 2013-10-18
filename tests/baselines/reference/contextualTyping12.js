var foo = (function () {
    function foo() {
        this.bar = [{ id: 1 }, { id: 2, name: "foo" }];
    }
    return foo;
})();
