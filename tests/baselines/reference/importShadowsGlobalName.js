//// [Foo.js]
define(["require", "exports"], function(require, exports) {
    var Foo = (function () {
        function Foo() {
        }
        return Foo;
    })();
    
    return Foo;
});
//// [Bar.js]
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
define(["require", "exports", 'Foo'], function(require, exports, Error) {
    var Bar = (function (_super) {
        __extends(Bar, _super);
        function Bar() {
            _super.apply(this, arguments);
        }
        return Bar;
    })(Error);
    
    return Bar;
});
