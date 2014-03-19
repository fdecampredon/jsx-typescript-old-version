var Chain = (function () {
    function Chain(value) {
        this.value = value;
    }
    Chain.prototype.then = function (cb) {
        var t;
        var s;

        // Ok to go down the chain, but error to climb up the chain
        (new Chain(t)).then(function (tt) {
            return s;
        }).then(function (ss) {
            return t;
        });

        // But error to try to climb up the chain
        (new Chain(s)).then(function (ss) {
            return t;
        });

        // Staying at T or S should be fine
        (new Chain(t)).then(function (tt) {
            return t;
        }).then(function (tt) {
            return t;
        }).then(function (tt) {
            return t;
        });
        (new Chain(s)).then(function (ss) {
            return s;
        }).then(function (ss) {
            return s;
        }).then(function (ss) {
            return s;
        });

        return null;
    };
    return Chain;
})();
