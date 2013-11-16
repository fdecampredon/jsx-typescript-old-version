var Validator2 = (function () {
    function Validator2() {
    }
    return Validator2;
})();
var ViewModel = (function () {
    function ViewModel() {
        this.validationPlacements = new Array();
    }
    return ViewModel;
})();
var Widget = (function () {
    function Widget(viewModelType) {
    }
    Object.defineProperty(Widget.prototype, "options", {
        get: function () {
            return null;
        },
        enumerable: true,
        configurable: true
    });
    return Widget;
})();
