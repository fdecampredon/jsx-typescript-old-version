var M;
(function (M) {
    var C = (function () {
        function C() {
        }
        return C;
    })();
    M.C = C;
    (function (_C) {
        _C.C = M.C;
    })(M.C || (M.C = {}));
    var C = M.C;
})(M || (M = {}));
