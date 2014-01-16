/// <reference path="fourslash.ts" />

//// interface B {
////     1: any;
//// }
//// interface C {
////     [s]: any;
//// }
//// interface D extends B, C /**/ {
//// }

goTo.marker();
// Bug 859263: Error here
// edit.insert(" ");
