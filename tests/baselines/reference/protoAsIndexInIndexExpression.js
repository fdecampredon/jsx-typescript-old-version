//// [protoAsIndexInIndexExpression_0.js]
exports.x;
//// [protoAsIndexInIndexExpression_1.js]
///<reference path='protoAsIndexInIndexExpression_0.ts'/>
var EntityPrototype = undefined;
var WorkspacePrototype = {
    serialize: function () {
    }
};
WorkspacePrototype['__proto__'] = EntityPrototype;

var o = {
    "__proto__": 0
};
var C = (function () {
    function C() {
        this["__proto__"] = 0;
    }
    return C;
})();
