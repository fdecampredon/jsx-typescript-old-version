var MyClass = (function () {
    function MyClass() {
    }
    MyClass.prototype.fn = function () {
        //type of 'this' in an object literal is the containing scope's this
        var t = { x: this, y: this.t };
        var t;
    };
    return MyClass;
})();

//type of 'this' in an object literal property of a function type is Any
var obj = {
    f: function () {
        return this.spaaace;
    }
};
var obj;
