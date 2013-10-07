var p = null;

p.then(function (x) {
}); // should not error
p.then(function (x) {
    return "hello";
}).then(function (x) {
    return x;
}); // should not error
