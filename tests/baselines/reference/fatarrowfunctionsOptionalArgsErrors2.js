var tt1 = (a, (b, c));
(function () {
    return a + b + c;
});
var tt2 = ((a), b, c);
(function () {
    return a + b + c;
});

var tt3 = ((a));
(function () {
    return a;
});
