var A = (function () {
    function A() {
    }
    return A;
})();

var B;
(function (B) {
    var A = 1;
})(B || (B = {}));
