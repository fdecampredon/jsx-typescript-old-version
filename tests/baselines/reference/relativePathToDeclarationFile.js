var foo = require('foo');
var other = require('./other');
var relMod = require('./sub/relMod');

if (foo.M2.x) {
    var x = new relMod(other.M2.x.charCodeAt(0));
}
