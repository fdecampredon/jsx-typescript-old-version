var v = { a: function (s) {
        return s.length;
    } } || { a: function (s) {
        return 1;
    } };

var v2 = function (s) {
    return s.length || function (s) {
        s.aaa;
    };
};
