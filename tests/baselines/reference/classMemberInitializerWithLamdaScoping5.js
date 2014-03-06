var Greeter = (function () {
    function Greeter(message) {
        this.messageHandler = function (message) {
            console.log(message); // This shouldnt be error
        };
    }
    return Greeter;
})();
