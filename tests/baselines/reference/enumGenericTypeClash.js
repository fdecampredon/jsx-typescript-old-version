//// [enumGenericTypeClash.js]
var X = (function () {
    function X() {
    }
    return X;
})();
var X;
(function (X) {
    X[X["MyVal"] = 0] = "MyVal";
})(X || (X = {}));
