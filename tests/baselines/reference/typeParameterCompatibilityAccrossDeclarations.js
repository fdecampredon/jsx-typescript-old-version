define(["require", "exports"], function(require, exports) {
    var a = {
        x: function (y) {
            return null;
        }
    };
    var a2 = {
        x: function (y) {
            return null;
        }
    };

    var i;
    var i2;

    a = i; // error
    i = a; // error

    a2 = i2; // no error
    i2 = a2; // no error
});
