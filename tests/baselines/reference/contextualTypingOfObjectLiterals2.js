function f2(args) {
}
f2({ foo: function (s) {
        return s.hmm;
    } }); // 's' should be 'string', so this should be an error
