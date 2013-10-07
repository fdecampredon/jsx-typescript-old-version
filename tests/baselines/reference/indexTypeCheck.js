var yellow;
var blue;
var s = "some string";

yellow[5]; // ok
yellow["hue"]; // ok
yellow[{}]; // ok

s[0]; // error
s["s"]; // ok
s[{}]; // ok

yellow[blue]; // error

var x;
x[0];

var Benchmark = (function () {
    function Benchmark() {
        this.results = {};
    }
    Benchmark.prototype.addTimingFor = function (name, timing) {
        this.results[name] = this.results[name];
    };
    return Benchmark;
})();
