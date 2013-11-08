/// <reference path="fourslash.ts" />

//// class A<B, B/**/>  { }

goTo.marker();
// Bug 820926: Crash here
// verify.quickInfoExists();

