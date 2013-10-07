//// [declFileForExportedImport_0.js]
exports.x;
//// [declFileForExportedImport_1.js]
///<reference path='declFileForExportedImport_0.ts'/>
var a = require('declFileForExportedImport_0');
exports.a = a;
var y = exports.a.x;

var b = a;
exports.b = b;
var z = exports.b.x;


////[declFileForExportedImport_0.d.ts]
export declare var x: number;
////[declFileForExportedImport_1.d.ts]
/// <reference path="declFileForExportedImport_0.d.ts" />
export import a = require('declFileForExportedImport_0');
export import b = a;
