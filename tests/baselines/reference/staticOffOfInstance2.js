var List = (function () {
    function List() {
    }
    List.prototype.Blah = function () {
        this.Foo(); // no error
        List.Foo();
    };
    List.Foo = function () {
    };
    return List;
})();
