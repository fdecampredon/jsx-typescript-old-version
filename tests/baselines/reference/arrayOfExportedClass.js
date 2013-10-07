//// [arrayOfExportedClass_0.js]
var Car = (function () {
    function Car() {
    }
    return Car;
})();

module.exports = Car;
//// [arrayOfExportedClass_1.js]
///<reference path='arrayOfExportedClass_0.ts'/>
var Car = require('arrayOfExportedClass_0');

var Road = (function () {
    function Road() {
    }
    Road.prototype.AddCars = function (cars) {
        this.cars = cars;
    };
    return Road;
})();

module.exports = Road;
