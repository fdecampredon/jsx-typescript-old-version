var Foo = (function () {
    function Foo() {
    }
    return Foo;
})();
;

function bar(x) {
}

bar(Foo); // Error, but should be allowed
