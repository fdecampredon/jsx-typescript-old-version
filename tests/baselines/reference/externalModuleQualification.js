exports.ID = "test";
var DiffEditor = (function () {
    function DiffEditor(id) {
        if (typeof id === "undefined") { id = exports.ID; }
    }
    return DiffEditor;
})();
exports.DiffEditor = DiffEditor;
var NavigateAction = (function () {
    function NavigateAction() {
    }
    NavigateAction.prototype.f = function (editor) {
    };
    return NavigateAction;
})();
