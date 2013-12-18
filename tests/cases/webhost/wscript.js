var RealActiveXObject = ActiveXObject

var WScript;
(function (WScript) {
    WScript.Arguments = [];
    WScript.Echo = function (str) { }
    WScript.Quit = function (exitCode) { }
})(WScript || (WScript = {}));

var ActiveXObject = (function () {
    function ActiveXObject(name) {
    }
    return ActiveXObject;
})();

