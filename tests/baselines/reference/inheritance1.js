//// [inheritance1.js]
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Control = (function () {
    function Control() {
    }
    return Control;
})();

var Button = (function (_super) {
    __extends(Button, _super);
    function Button() {
        _super.apply(this, arguments);
    }
    Button.prototype.select = function () {
    };
    return Button;
})(Control);
var TextBox = (function (_super) {
    __extends(TextBox, _super);
    function TextBox() {
        _super.apply(this, arguments);
    }
    TextBox.prototype.select = function () {
    };
    return TextBox;
})(Control);
var ImageBase = (function (_super) {
    __extends(ImageBase, _super);
    function ImageBase() {
        _super.apply(this, arguments);
    }
    return ImageBase;
})(Control);
var Image1 = (function (_super) {
    __extends(Image1, _super);
    function Image1() {
        _super.apply(this, arguments);
    }
    return Image1;
})(Control);
var Locations = (function () {
    function Locations() {
    }
    Locations.prototype.select = function () {
    };
    return Locations;
})();
var Locations1 = (function () {
    function Locations1() {
    }
    Locations1.prototype.select = function () {
    };
    return Locations1;
})();
var sc;
var c;

var b;
sc = b;
c = b;
b = sc;
b = c;

var t;
sc = t;
c = t;
t = sc;
t = c;

var i;
sc = i;
c = i;
i = sc;
i = c;

var i1;
sc = i1;
c = i1;
i1 = sc;
i1 = c;

var l;
sc = l;
c = l;
l = sc;
l = c;

var l1;
sc = l1;
c = l1;
l1 = sc;
l1 = c;
