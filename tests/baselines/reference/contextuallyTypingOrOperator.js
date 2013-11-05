var v = { a: function (s) {
        return s.length;
    } } || { a: function (s) {
        return 1;
    } };

var v2 = function (s) {
    return s.length || function (s) {
        s.length;
    };
};

var v3 = function (s) {
    return s.length || function (s) {
        return 1;
    };
};
var v4 = function (s) {
    return 1 || function (s) {
        return s.length;
    };
};
