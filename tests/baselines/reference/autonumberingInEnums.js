var Foo;
(function (Foo) {
    Foo[Foo["a"] = 1] = "a";
})(Foo || (Foo = {}));

var Foo;
(function (Foo) {
    Foo[Foo["b"] = 0] = "b";
})(Foo || (Foo = {}));
