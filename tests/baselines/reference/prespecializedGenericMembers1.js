var Cat = (function () {
    function Cat() {
    }
    return Cat;
})();
exports.Cat = Cat;

var CatBag = (function () {
    function CatBag(cats) {
    }
    return CatBag;
})();
exports.CatBag = CatBag;
var cat = new Cat();
var catThing = {
    barry: cat
};
var catBag = new CatBag(catThing);
