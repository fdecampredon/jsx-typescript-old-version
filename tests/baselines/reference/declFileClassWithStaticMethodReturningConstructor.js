//// [declFileClassWithStaticMethodReturningConstructor.js]
var Enhancement = (function () {
    function Enhancement() {
    }
    Enhancement.getType = function () {
        return this;
    };
    return Enhancement;
})();
exports.Enhancement = Enhancement;


////[declFileClassWithStaticMethodReturningConstructor.d.ts]
export declare class Enhancement {
    static getType(): {
        prototype: Enhancement;
        getType(): typeof Enhancement;
        new(): Enhancement;
    };
}
