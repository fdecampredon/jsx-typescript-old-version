var Chain = (function () {
    function Chain(value) {
        this.value = value;
    }
    Chain.prototype.then = function (cb) {
        var result = cb(this.value);

        // should get a fresh type parameter which each then call
        var z = this.then(function (x) {
            return result;
        }).then(function (x) {
            return "abc";
        }).then(function (x) {
            return x.length;
        });
        return new Chain(result);
    };
    return Chain;
})();
