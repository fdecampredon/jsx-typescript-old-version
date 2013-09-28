//// [exportEqualErrorType_0.js]
define(["require", "exports"], function(require, exports) {
    var server;
    
    return server;
});
//// [exportEqualErrorType_1.js]
define(["require", "exports", 'exportEqualErrorType_0'], function(require, exports, connect) {
    connect().use(connect.static('foo'));
});
