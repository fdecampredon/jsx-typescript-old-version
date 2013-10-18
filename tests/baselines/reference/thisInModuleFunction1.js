var bar;
(function (_bar) {
    function bar() {
        return this;
    }
    _bar.bar = bar;
})(bar || (bar = {}));
var z = bar.bar();
