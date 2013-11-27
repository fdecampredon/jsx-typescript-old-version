// when multiple best common types exist we will choose the first candidate
var a;
var b;
var c;

var as = [a, b];
var bs = [b, a];
var cs = [a, b, c];

var ds = [function (x) {
        return 1;
    }, function (x) {
        return 2;
    }];
var es = [function (x) {
        return 2;
    }, function (x) {
        return 1;
    }];
var fs = [function (a) {
        return 1;
    }, function (b) {
        return 2;
    }];
var gs = [function (b) {
        return 2;
    }, function (a) {
        return 1;
    }];
