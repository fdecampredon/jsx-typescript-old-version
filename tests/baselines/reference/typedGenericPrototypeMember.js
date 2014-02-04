var List = (function () {
    function List() {
    }
    List.prototype.add = function (item) {
    };
    return List;
})();

List.prototype.add("abc"); // Valid because T is instantiated to any
