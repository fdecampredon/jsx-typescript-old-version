var Foo = (function () {
    function Foo() {
    }
    return Foo;
})();

var Foo;
(function (Foo) {
    var Baz = (function () {
        function Baz() {
        }
        return Baz;
    })();
    Foo.Baz = Baz;
})(Foo || (Foo = {}));
