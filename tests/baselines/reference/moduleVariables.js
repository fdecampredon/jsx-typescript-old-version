var x = 1;
var M;
(function (M) {
    M.x = 2;
    console.log(M.x); // 2
})(M || (M = {}));

var M;
(function (M) {
    console.log(M.x); // 2
})(M || (M = {}));

var M;
(function (M) {
    var x = 3;
    console.log(x); // 3
})(M || (M = {}));
