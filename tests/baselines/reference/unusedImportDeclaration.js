//// [unusedImportDeclaration_testerB.js]
var TesterB = (function () {
    function TesterB() {
    }
    return TesterB;
})();
module.exports = TesterB;
//// [unusedImportDeclaration_testerA.js]
var thingy = {
    me: "A"
};

foo("IN " + thingy.me + "!");
