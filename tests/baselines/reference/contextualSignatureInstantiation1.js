var e = function (x, y) {
    return x.length;
};
var r99 = map(e);

var e2 = function (x, y) {
    return x.length;
};
var r100 = map2(e2); // type arg inference should fail for S since a generic lambda is not inferentially typed. Falls back to { length: number }
