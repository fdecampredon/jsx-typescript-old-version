var foo = (function () {
    function foo() {
    }
    foo.bar = function () {
        return this.x;
    };
    foo.x = 3;
    return foo;
})();
var x = foo.bar();
