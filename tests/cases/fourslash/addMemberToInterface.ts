/// <reference path="fourslash.ts" />

//// 
//// module /*check*/Mod{
//// }
//// 
//// interface MyInterface {
////     /*insert*/
//// }

edit.disableFormatting();
diagnostics.setEditValidation(IncrementalEditValidation.SyntacticOnly);

debugger;
goTo.marker('check');
verify.quickInfoSymbolNameIs('Mod');

goTo.marker('insert');
edit.insert("x: number;\n");

goTo.marker('check');
// Bug 771749: Mismatched full/incremental info here
// verify.quickInfoSymbolNameIs('Mod');
