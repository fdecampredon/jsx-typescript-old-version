var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var A;
(function (_A) {
    var A = (function () {
        function A() {
        }
        return A;
    })();
    var AA = (function () {
        function AA() {
        }
        return AA;
    })();

    var B = (function (_super) {
        __extends(B, _super);
        function B() {
            _super.apply(this, arguments);
        }
        return B;
    })(AA);
    var BB = (function (_super) {
        __extends(BB, _super);
        function BB() {
            _super.apply(this, arguments);
        }
        return BB;
    })(A);

    var Module;
    (function (Module) {
        var A = (function () {
            function A() {
            }
            return A;
        })();
    })(Module || (Module = {}));
    var Color;
    (function (Color) {
        Color[Color["Blue"] = 0] = "Blue";
        Color[Color["Red"] = 1] = "Red";
    })(Color || (Color = {}));
    var x = 12;
    function F(s) {
        return 2;
    }
    var array = null;
    var fn = function (s) {
        return 'hello ' + s;
    };
    var ol = { s: 'hello', id: 2, isvalid: true };
})(A || (A = {}));

var Y;
(function (Y) {
    var A = (function () {
        function A() {
        }
        return A;
    })();
    Y.A = A;
    var AA = (function () {
        function AA() {
        }
        return AA;
    })();
    Y.AA = AA;

    var B = (function (_super) {
        __extends(B, _super);
        function B() {
            _super.apply(this, arguments);
        }
        return B;
    })(AA);
    Y.B = B;
    var BB = (function (_super) {
        __extends(BB, _super);
        function BB() {
            _super.apply(this, arguments);
        }
        return BB;
    })(A);
    Y.BB = BB;

    (function (Module) {
        var A = (function () {
            function A() {
            }
            return A;
        })();
    })(Y.Module || (Y.Module = {}));
    var Module = Y.Module;
    (function (Color) {
        Color[Color["Blue"] = 0] = "Blue";
        Color[Color["Red"] = 1] = "Red";
    })(Y.Color || (Y.Color = {}));
    var Color = Y.Color;
    Y.x = 12;
    function F(s) {
        return 2;
    }
    Y.F = F;
    Y.array = null;
    Y.fn = function (s) {
        return 'hello ' + s;
    };
    Y.ol = { s: 'hello', id: 2, isvalid: true };
})(Y || (Y = {}));
