//// [w1.js]
define(["require", "exports"], function(require, exports) {
    
});
//// [exporter.js]
define(["require", "exports"], function(require, exports) {
});
//// [consumer.js]
define(["require", "exports"], function(require, exports) {
    function w() {
        return { name: 'value' };
    }
    exports.w = w;
});


////[w1.d.ts]
export = Widget1;
interface Widget1 {
    name: string;
}
////[exporter.d.ts]
export import w = require('./w1');
////[consumer.d.ts]
import e = require('./exporter');
export declare function w(): e.w;
