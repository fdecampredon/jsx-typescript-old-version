/// <reference path='fourslash.ts' />

////function map(fn: (variab/*1*/le1: string) => void) {
////}
////var x = <{ (fn: (va/*2*/riable2: string) => void, a: string): void; }> () => { };

// this line triggers a semantic/syntactic error check, remove line when 788570 is fixed
edit.insert('');

goTo.marker("1");
verify.quickInfoIs("string", undefined, "variable1", "parameter");

goTo.marker("2");
verify.quickInfoIs("string", undefined, "variable2", "parameter");
