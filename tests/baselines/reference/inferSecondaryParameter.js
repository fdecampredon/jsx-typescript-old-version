// type inference on 'bug' should give 'any'

var b = { m: function (test, fn) {
    } };

b.m("test", function (bug) {
    var a = bug;
});
