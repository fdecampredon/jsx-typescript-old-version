//// [w1.js]
define(["require", "exports"], function(require, exports) {
    
    var Widget1 = (function () {
        function Widget1() {
            this.name = 'one';
        }
        return Widget1;
    })();
    return Widget1;
});
//// [exporter.js]
define(["require", "exports", './w1'], function(require, exports, w) {
    exports.w = w;
});
//// [consumer.js]
define(["require", "exports", './exporter'], function(require, exports, e) {
    

    function w() {
        return new e.w();
    }
    exports.w = w;
});
