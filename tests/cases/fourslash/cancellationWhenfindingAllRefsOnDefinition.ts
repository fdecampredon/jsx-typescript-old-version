/// <reference path="fourslash.ts" />

//@Filename: findAllRefsOnDefinition-import.ts
////export class Test{
////
////    constructor(){
////
////    }
////
////    public /*1*/start(){
////        return this;
////    }
////
////    public stop(){
////        return this;
////    }
////}

//@Filename: findAllRefsOnDefinition.ts
////import Second = require("findAllRefsOnDefinition-import");
////
////var second = new Second.Test()
////second.start();
////second.stop();

diagnostics.setEditValidation(IncrementalEditValidation.None);

goTo.file("findAllRefsOnDefinition-import.ts");
goTo.marker("1");

verify.referencesCountIs(2);

cancellation.setCancelled();
goTo.marker("1");
verifyOperationIsCancelled(() => verify.referencesCountIs(0) );

// verify that internal state is still correct
cancellation.resetCancelled();
goTo.marker("1");           
verify.referencesCountIs(2);

