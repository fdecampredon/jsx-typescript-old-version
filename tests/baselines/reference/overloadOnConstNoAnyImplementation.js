function x1(a, cb) {
    cb('hi');
    cb('bye');
    var hm = 'hm';
    cb(hm);
    cb('uh');
    cb(1); // error
}

var cb = function (x) {
    return 1;
};
x1(1, cb);
x1(1, function (x) {
    return 1;
}); // error
x1(1, function (x) {
    return 1;
});
