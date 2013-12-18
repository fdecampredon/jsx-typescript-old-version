// @module: commonjs
// @Filename: vs/foo_0.ts
export var x: number;

// @Filename: foo_1.ts
import foo = require("vs/foo_0");
var z = foo.x + 10;
