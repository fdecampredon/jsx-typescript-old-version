var C = (function () {
    function C(data, data2) {
        this.data = data;
        this.data2 = data2;
    }
    C.prototype.create = function () {
        var x = new this.data();
        var x2 = new this.data2();
    };
    return C;
})();
