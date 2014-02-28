// bug 757836: number not being Recognized as Number when extended and used as generic constraint
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};

var EndGate;
(function (EndGate) {
    (function (Tweening) {
        var Tween = (function () {
            function Tween(from) {
                this._from = from.Clone();
            }
            return Tween;
        })();
        Tweening.Tween = Tween;
    })(EndGate.Tweening || (EndGate.Tweening = {}));
    var Tweening = EndGate.Tweening;
})(EndGate || (EndGate = {}));

var EndGate;
(function (EndGate) {
    (function (Tweening) {
        var NumberTween = (function (_super) {
            __extends(NumberTween, _super);
            function NumberTween(from) {
                _super.call(this, from);
            }
            return NumberTween;
        })(Tweening.Tween);
        Tweening.NumberTween = NumberTween;
    })(EndGate.Tweening || (EndGate.Tweening = {}));
    var Tweening = EndGate.Tweening;
})(EndGate || (EndGate = {}));
