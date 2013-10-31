var LazyArray = (function () {
    function LazyArray() {
        this.objects = {};
    }
    LazyArray.prototype.array = function () {
        return this.objects;
    };
    return LazyArray;
})();
var lazyArray = new LazyArray();
var value = lazyArray.array()["test"]; // used to be an error
