var M;
(function (M) {
    (function (N) {
        function f(x) {
            2 * x;
        }
        N.f = f;
        (function (X) {
            (function (Y) {
                (function (Z) {
                    Z.v2 = N.f(M.N.X.Y.Z.v);
                })(Y.Z || (Y.Z = {}));
                var Z = Y.Z;
            })(X.Y || (X.Y = {}));
            var Y = X.Y;
        })(N.X || (N.X = {}));
        var X = N.X;
    })(M.N || (M.N = {}));
    var N = M.N;
})(M || (M = {}));

var M;
(function (M) {
    (function (N) {
        (function (X) {
            (function (Y) {
                (function (Z) {
                    Z.v = M.N.f(10);
                })(Y.Z || (Y.Z = {}));
                var Z = Y.Z;
            })(X.Y || (X.Y = {}));
            var Y = X.Y;
        })(N.X || (N.X = {}));
        var X = N.X;
    })(M.N || (M.N = {}));
    var N = M.N;
})(M || (M = {}));
