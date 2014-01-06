//// [foo1.js]
function x() {
    return true;
}
exports.x = x;
//// [foo2.js]
x; // Error, export assignment must be identifier only
module.exports = foo1;
