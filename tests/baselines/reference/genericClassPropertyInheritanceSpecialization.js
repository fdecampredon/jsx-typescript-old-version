var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Portal;
(function (Portal) {
    (function (Controls) {
        (function (Validators) {
            var Validator = (function () {
                function Validator(message) {
                }
                Validator.prototype.destroy = function () {
                };
                Validator.prototype._validate = function (value) {
                    return 0;
                };
                return Validator;
            })();
            Validators.Validator = Validator;
        })(Controls.Validators || (Controls.Validators = {}));
        var Validators = Controls.Validators;
    })(Portal.Controls || (Portal.Controls = {}));
    var Controls = Portal.Controls;
})(Portal || (Portal = {}));

var PortalFx;
(function (PortalFx) {
    (function (ViewModels) {
        (function (Controls) {
            (function (Validators) {
                var Validator = (function (_super) {
                    __extends(Validator, _super);
                    function Validator(message) {
                        _super.call(this, message);
                    }
                    return Validator;
                })(Portal.Controls.Validators.Validator);
                Validators.Validator = Validator;
            })(Controls.Validators || (Controls.Validators = {}));
            var Validators = Controls.Validators;
        })(ViewModels.Controls || (ViewModels.Controls = {}));
        var Controls = ViewModels.Controls;
    })(PortalFx.ViewModels || (PortalFx.ViewModels = {}));
    var ViewModels = PortalFx.ViewModels;
})(PortalFx || (PortalFx = {}));

var ViewModel = (function () {
    function ViewModel() {
        this.validators = ko.observableArray();
    }
    return ViewModel;
})();
