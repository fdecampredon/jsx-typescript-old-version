var s;
var s2 = s.groupBy(function (s) {
    return s.length;
});
var s3 = s2.each(function (x) {
    x.key; /* Type is K, should be number */ 
});
