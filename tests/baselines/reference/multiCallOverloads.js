function load(f) {
}

var f1 = function (z) {
};
var f2 = function (z) {
};
load(f1); // ok
load(f2); // ok
load(function () {
}); // this shouldn’t be an error
load(function (z) {
}); // this shouldn't be an error
