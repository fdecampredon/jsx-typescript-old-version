var Test;
(function (Test) {
    var MyClass = (function () {
        function MyClass(func) {
        }
        return MyClass;
    })();
    Test.MyClass = MyClass;

    function F(func) {
    }
    Test.F = F;
})(Test || (Test = {}));
var func;
Test.F(func); // OK
var test = new Test.MyClass(func);
