///<reference path='..\..\..\..\src\harness\harness.ts'/>

describe("Assignment compatibility", function() {
    var typeFactory = new Harness.Compiler.TypeFactory();
    var any     = typeFactory.any;
    var number  = typeFactory.number;
    var string  = typeFactory.string;
    var boolean    = typeFactory.boolean;

    var nullType = typeFactory.get('var obj = null', 'obj');
    var undefinedType = typeFactory.get('var obj = undefined', 'obj');
    var anyArray = typeFactory.get('var arr = []', 'arr');
    var someFunction = typeFactory.get('function f() {}', 'f');

    var someObject = typeFactory.get('var obj = {one: 1}', 'obj');
    var someClass = typeFactory.get('class Foo {public p;};', 'Foo');
    var someInstance = typeFactory.get('class Foo2 {public p;}; var f = new Foo2();', 'f');

    var AnythingBasic = [any, number, string, boolean, anyArray, someFunction, someObject, someClass, someInstance];
    function AnythingBasicBut(these: any[]) {
        return AnythingBasic.filter(x => !these.some(y => x === y));
    }

    describe("undefined type", function () {
        it("is assignment compatible with everything", function () {
            undefinedType.assertAssignmentCompatibleWith(AnythingBasic);
        });
    });

    describe("null type", function () {
        var these = [undefinedType];
        it("is assignment compatible with everything but undefined", function () {
            nullType.assertAssignmentCompatibleWith(AnythingBasicBut(these));
        });
        // TODO: can't represent void/undefined propertly with this system? TypeFactory makes them any?
        //it("is not assignment compatible with undefined", function () {
        //    nullType.assertNotAssignmentCompatibleWith(these);
        //});
    });

    describe("any type", function() {
        it("is assignment compatible with everything", function () {
            any.assertAssignmentCompatibleWith(AnythingBasic);
        });
    });

    describe("number type", function () {
        var these = [any, number];
        it("is assignment compatible with any and number", function() {
            number.assertAssignmentCompatibleWith(these);
        });

        it("is not assignment compatible with anything else", function () {
            number.assertNotAssignmentCompatibleWith(AnythingBasicBut(these));
        });
    });

    describe("boolean type", function () {
        var these = [any, boolean];
        it("is assignment compatible with any and boolean", function() {
            boolean.assertAssignmentCompatibleWith(these);
        });

        it("is not assignment compatible with anything else", function () {
            boolean.assertNotAssignmentCompatibleWith(AnythingBasicBut(these));
        });
    });

    describe("string type", function () {
        var these = [any, string];
        it("is assignment compatible with any and string", function() {
            string.assertAssignmentCompatibleWith(these);
        });

        it("is not assignment compatible with anything else", function () {
            string.assertNotAssignmentCompatibleWith(AnythingBasicBut(these));
        });
    });


    describe("array type", function () {
        var boolArray   = typeFactory.get('var arr_bool : boolean[]', 'arr_bool');
        var numberArray = typeFactory.get('var arr_number : number[]', 'arr_number');
        var stringArray = typeFactory.get('var arr_string : string[]', 'arr_string');
        var funcArray   = typeFactory.get('var f : () => void = null; var arr_func = [f];', 'arr_func');
        var objectArray = typeFactory.get('var o = {one: 1}; var arr_obj = [o];', 'arr_obj'); 
        var instanceArray = typeFactory.get('class Foo { public p  = 0;}; var arr_Foo : Foo[];', 'arr_Foo');
        var classArray = typeFactory.get('class Foo { public p = 0; }; var arr_Foo2 = [new Foo()]', 'arr_Foo2');

        var AnyArrayType = [anyArray, boolArray, numberArray, stringArray, funcArray, objectArray, instanceArray, classArray];
        function AnyArrayTypeBut(these: any[]) {
            return AnyArrayType.filter(x => !these.some(y => x === y));
        }

        describe("any[]", function() {
            it("is assignment compatible with any and all arrays", function () {
                anyArray.assertAssignmentCompatibleWith(AnyArrayType);
            });

            it("is not assignment compatible with anything else", function () {
                anyArray.assertNotAssignmentCompatibleWith(AnythingBasicBut([any, anyArray]));
            });
        });

        describe("boolean[]", function () {
            var these = [any, boolArray, anyArray];
            it("is assignment compatible with any, any arrays, and boolean arrays", function() {
                boolArray.assertAssignmentCompatibleWith(these);
            });

            it("is not assignment compatible with anything else", function() {
                boolArray.assertNotAssignmentCompatibleWith(AnythingBasicBut(these));
                boolArray.assertNotAssignmentCompatibleWith(AnyArrayTypeBut(these));
            });
        });

        describe("number[]", function () {
            var these = [any, numberArray, anyArray];
            it("is assignment compatible with any, any arrays, and number arrays", function() {
                numberArray.assertAssignmentCompatibleWith(these);
            });

            it("is not assignment compatible with anything else", function() {
                numberArray.assertNotAssignmentCompatibleWith(AnythingBasicBut(these));
                numberArray.assertNotAssignmentCompatibleWith(AnyArrayTypeBut(these));
            });
        });

        describe("string[]", function () {
            var these = [any, stringArray, anyArray];
            it("is assignment compatible with any, any arrays, and string arrays", function() {
                stringArray.assertAssignmentCompatibleWith(these);
            });

            it("is not assignment compatible with anything else", function() {
                stringArray.assertNotAssignmentCompatibleWith(AnythingBasicBut(these));
                stringArray.assertNotAssignmentCompatibleWith(AnyArrayTypeBut(these));
            });
        });
    });

    describe("Objects", function () {
        var emptyObj = typeFactory.get('var aa = {};', 'aa');
        var emptySig = typeFactory.get('var aa:{};', 'aa');

        var singleNumObj1 = typeFactory.get('var obj = {one: 1}', 'obj');
        var singleNumObj2 = typeFactory.get('var obj = {two: 1}', 'obj');
        var singleNumSig = typeFactory.get('var aa:{one:number;};', 'aa')
        var singleNumSig2 = typeFactory.get('var aa:{two:number;};', 'aa')

        var singleStringObj1 = typeFactory.get('var obj = {one: "1"}', 'obj');
        var singleStringObj2 = typeFactory.get('var obj = {two: "1"}', 'obj');
        var singleStringSig = typeFactory.get('var aa:{one:string;};', 'aa');
        var singleStringSig2 = typeFactory.get('var aa:{two:string;};', 'aa');

        var singleBoolObj1 = typeFactory.get('var obj = {one: true}', 'obj');
        var singleBoolObj2 = typeFactory.get('var obj = {two: true}', 'obj');
        var singleBoolSig = typeFactory.get('var aa:{one:boolean;};', 'aa');

        var singleAnyArrayObj1 = typeFactory.get('var obj = {one: <any[]>[1]}', 'obj');
        var singleAnyArrayObj2 = typeFactory.get('var obj = {two: <any[]>[1]}', 'obj');
        var singleAnyArraySig = typeFactory.get('var aa:{one:any[];};', 'aa');

        var singleNumArrayObj1 = typeFactory.get('var obj = {one: [1]}', 'obj');
        var singleNumArrayObj2 = typeFactory.get('var obj = {two: [1]}', 'obj');
        var singleNumArraySig = typeFactory.get('var aa:{one:number[];};', 'aa');

        var singleStringArrayObj1 = typeFactory.get('var obj = {one: ["1"]}', 'obj');
        var singleStringArrayObj2 = typeFactory.get('var obj = {two: ["1"]}', 'obj');
        var singleStringArraySig = typeFactory.get('var aa:{one:string[];};', 'aa');

        var singleBoolArrayObj1 = typeFactory.get('var obj = {one: [true]}', 'obj');
        var singleBoolArrayObj2 = typeFactory.get('var obj = {two: [true]}', 'obj');
        var singleBoolArraySig = typeFactory.get('var aa:{one:boolean[];};', 'aa');

        var callObjString = typeFactory.get('var obj = function (a: string) { return a; };', 'obj');
        var callSigString = typeFactory.get('var obj: { (a:string):string;}', 'obj');

        var callObjNum = typeFactory.get('var obj = function (a: number) { return a; };', 'obj');
        var callSigNum = typeFactory.get('var obj: { (a:number):number;}', 'obj');

        var indexerSigNum = typeFactory.get('var aa:{[index:number]:number;};', 'aa');
        var indexerSigString = typeFactory.get('var aa:{[index:string]:any;};', 'aa');

        var constructorSigNum = typeFactory.get('var aa:{ new (param: number); };', 'aa');
        var constructorSigString = typeFactory.get('var aa:{ new (param: string); };', 'aa');

        var AnyInstances = [emptyObj, singleNumObj1, singleNumObj2, singleStringObj1, singleStringObj2, singleBoolObj1, singleBoolObj2, singleAnyArrayObj1, singleAnyArrayObj2, singleNumArrayObj1, singleNumArrayObj2, singleStringArrayObj1, singleStringArrayObj2, singleBoolArrayObj1, singleBoolArrayObj2, callObjString];
        var AnySig = [emptySig, singleNumSig, singleNumSig2, singleStringSig, singleStringSig2, singleBoolSig, singleAnyArraySig, singleNumArraySig, singleStringArraySig, singleBoolArraySig, callSigString, callSigNum, indexerSigNum, indexerSigString, constructorSigNum, constructorSigString];
        var AnyLiterals = AnyInstances.concat(AnySig);

        function AnyLiteralsBut(these: any[]) {
            return AnyLiterals.filter(x => !these.some(y => x === y));
        } 

        describe("Object literal with 1 number property", function () {
            var these = [emptyObj, singleNumObj1, emptySig, singleNumSig];
            it("is assignment compatible with", function () {
                singleNumObj1.assertAssignmentCompatibleWith(these);
            });

            it("is not assignment compatible with anything else", function () {
                singleNumObj1.assertNotAssignmentCompatibleWith(AnyLiteralsBut(these));
            });

            var these2 = [emptyObj, singleNumObj2, emptySig, singleNumSig2];
            it("is assignment compatible with", function () {
                singleNumObj2.assertAssignmentCompatibleWith(these2);
            });

            it("is not assignment compatible with anything else", function () {
                singleNumObj2.assertNotAssignmentCompatibleWith(AnyLiteralsBut(these2));
            });
        });

        describe("Object literal with 1 string property", function () {
            var these = [emptyObj, singleStringObj1, emptySig, singleStringSig];
            it("is assignment compatible with", function () {
                singleStringObj1.assertAssignmentCompatibleWith(these);
            });

            it("is not assignment compatible with anything else", function () {
                singleStringObj1.assertNotAssignmentCompatibleWith(AnyLiteralsBut(these));
            });

            var these2 = [emptyObj, singleStringObj2, emptySig, singleStringSig2];
            it("is assignment compatible with", function () {
                singleStringObj2.assertAssignmentCompatibleWith(these2);
            });

            it("is not assignment compatible with anything else", function () {
                singleStringObj2.assertNotAssignmentCompatibleWith(AnyLiteralsBut(these2));
            });
        });

        describe("Callable properties", function () {
            var these = [callObjString, callSigString, emptySig, emptyObj];
            //var these = [emptyObj, singleNumObj1, singleNumObj2, indexerNumSig, constructorNumSig];
            it("Properties assignment compatible types", function () {
                callSigString.assertAssignmentCompatibleWith(these);
            });
            it("Properties not assignment compatible types", function () {
                callSigString.assertNotAssignmentCompatibleWith(AnyLiteralsBut(these));
            });
        });

        var classWithPublic = typeFactory.get('           class Foo1 { constructor(public one: number) {} }                        var x1 = new Foo1(1);', 'x1');
        var classWithTwoPublic = typeFactory.get('        class Foo2 { constructor(public one: number, public two: string) {} }    var x2 = new Foo2(1, "a");', 'x2');
        var classWithOptional = typeFactory.get('         class Foo3 { constructor(public one?: number) {} }                       var x3 = new Foo3();', 'x3');
        var classWithPublicAndOptional = typeFactory.get('class Foo4 { constructor(public one: number, public two?: string) {} }   var x4 = new Foo4(1);', 'x4');
        var classWithPrivate = typeFactory.get('          class Foo5 { constructor(private one: number) {} }                       var x5 = new Foo5(1);', 'x5');
        var classWithTwoPrivate = typeFactory.get('       class Foo6 { constructor(private one: number, private two: string) {} }  var x6 = new Foo6(1, "a");', 'x6');
        var classWithPublicPrivate = typeFactory.get('    class Foo7 { constructor(public one: number, private two: string) {} }   var x7 = new Foo7(1, "a");', 'x7');

        var interfaceOne = typeFactory.get('                  interface I1 { one: number; };                var obj1: I1 = { one: 1 };', 'obj1');
        var interfaceTwo = typeFactory.get('                  interface I2 { one: number; two: string; };   var obj2: I2 = { one: 1, two: "a" };', 'obj2');
        var interfaceWithOptional = typeFactory.get('         interface I3 { one?: number; };               var obj3: I3 = { };', 'obj3');
        var interfaceWithPublicAndOptional = typeFactory.get('interface I4 { one: number; two?: string; };  var obj4: I4 = { one: 1 };', 'obj4');

        var AnyClass = [classWithPublic, classWithTwoPublic, classWithOptional, classWithPublicAndOptional, classWithPrivate, classWithTwoPrivate, classWithPublicPrivate];
        var AnyInterface = [interfaceOne, interfaceTwo, interfaceWithOptional, interfaceWithPublicAndOptional];
        var AnyObject = AnyClass.concat(AnyInterface);
        function AnyObjectBut(these: any[]) {
            return AnyObject.filter(x => !these.some(y => x === y));
        }

        describe("Classes with properties 1", function () {
            var these = [emptyObj, emptySig, singleNumObj1, singleNumSig, classWithPublic, classWithOptional, classWithPublicAndOptional, interfaceOne, interfaceWithOptional, interfaceWithPublicAndOptional];
            
            it("Class with public property assignable to", function () {
                classWithPublic.assertAssignmentCompatibleWith(these);
            });
            it("Class with public property not assignable to", function () {
                classWithPublic.assertNotAssignmentCompatibleWith(AnyLiteralsBut(these));
                classWithPublic.assertNotAssignmentCompatibleWith(AnyObjectBut(these));
            });

            var these2 = [emptyObj, emptySig, singleNumObj1, singleNumSig, singleStringObj2, singleStringSig2, classWithPublic, classWithOptional, classWithTwoPublic, classWithPublicAndOptional, interfaceOne, interfaceTwo, interfaceWithOptional, interfaceWithPublicAndOptional];
            it("Class with public properties assignable to", function () {
                classWithTwoPublic.assertAssignmentCompatibleWith(these2);
            });
            it("Class with public properties not assignable to", function () {                
                classWithTwoPublic.assertNotAssignmentCompatibleWith(AnyLiteralsBut(these2));
                classWithTwoPublic.assertNotAssignmentCompatibleWith(AnyObjectBut(these2));
            });

            var these3 = [emptyObj, emptySig, interfaceWithOptional, classWithOptional];

            it("Class with optional property assignable to", function () {
                classWithOptional.assertAssignmentCompatibleWith(these3);
            });
            it("Class with optional property not assignable to", function () {
                classWithOptional.assertNotAssignmentCompatibleWith(AnyLiteralsBut(these3));
                classWithOptional.assertNotAssignmentCompatibleWith(AnyObjectBut(these3));
            });            

            var these4 = [emptyObj, emptySig, singleNumObj1, singleNumSig, interfaceOne, interfaceWithOptional, interfaceWithPublicAndOptional, classWithPublic, classWithOptional, classWithPublicAndOptional];

            it("Class with public and optional property assignable to", function () {
                classWithPublicAndOptional.assertAssignmentCompatibleWith(these4);
            });
            it("Class with public and optional property not assignable to", function () {
                classWithPublicAndOptional.assertNotAssignmentCompatibleWith(AnyLiteralsBut(these4));
                classWithPublicAndOptional.assertNotAssignmentCompatibleWith(AnyObjectBut(these4));
            });

            // TODO: harness issue makes it claim class with private isn't assignable to itself
            var these5 = [emptyObj, emptySig]; // classWithPrivate
            
            it("Class with private property assignable to", function () {
                classWithPrivate.assertAssignmentCompatibleWith(these5);
            });
            it("Class with private property not assignable to", function () {
                classWithPrivate.assertNotAssignmentCompatibleWith(AnyLiteralsBut(these5));
                classWithPrivate.assertNotAssignmentCompatibleWith(AnyObjectBut(these5));
            });

            var these6 = [emptyObj, emptySig]; // classWithTwoPrivate TODO: see harness issue above

            it("Class with two private properties assignable to", function () {
                classWithTwoPrivate.assertAssignmentCompatibleWith(these6);
            });
            it("Class with two private properties not assignable to", function () {
                classWithTwoPrivate.assertNotAssignmentCompatibleWith(AnyLiteralsBut(these6));
                classWithTwoPrivate.assertNotAssignmentCompatibleWith(AnyObjectBut(these6));
            });

            // TODO: see harness issue above for why classWithPublicPrivate not included
            var these7 = [emptyObj, emptySig, singleNumObj1, singleNumSig, interfaceWithOptional, interfaceOne, classWithPublic, classWithOptional];

            it("Class with public and private properties assignable to", function () {
                classWithPublicPrivate.assertAssignmentCompatibleWith(these7);
            });
            it("Class with public and private properties not assignable to", function () {
                classWithPublicPrivate.assertNotAssignmentCompatibleWith(AnyLiteralsBut(these7));
                classWithPublicPrivate.assertNotAssignmentCompatibleWith(AnyObjectBut(these7));
            });
        });

        describe("Interfaces", function () {
            var these = [emptyObj, emptySig, singleNumObj1, singleNumSig, interfaceOne, interfaceWithOptional, classWithPublic, classWithOptional, classWithPublicAndOptional, interfaceWithPublicAndOptional];

            it("Interface with public property assignable to", function () {
                interfaceOne.assertAssignmentCompatibleWith(these);
            });
            it("Interface with public property not assignable to", function () {
                interfaceOne.assertNotAssignmentCompatibleWith(AnyLiteralsBut(these));
                interfaceOne.assertNotAssignmentCompatibleWith(AnyObjectBut(these));
            });

            var these2 = [emptyObj, emptySig, singleNumObj1, singleNumSig, singleStringObj2, singleStringSig2, interfaceOne, interfaceTwo, interfaceWithOptional, interfaceWithPublicAndOptional, classWithPublic, classWithOptional, classWithTwoPublic, classWithPublicAndOptional];

            it("Interface with public properties assignable to", function () {
                interfaceTwo.assertAssignmentCompatibleWith(these2);
            });
            it("Interface with public properties not assignable to", function () {
                interfaceTwo.assertNotAssignmentCompatibleWith(AnyLiteralsBut(these2));
                interfaceTwo.assertNotAssignmentCompatibleWith(AnyObjectBut(these2));
            });

            var these3 = [emptyObj, emptySig, interfaceWithOptional, classWithOptional];
            
            it("Interface with optional property assignable to", function () {
                interfaceWithOptional.assertAssignmentCompatibleWith(these3);
            });
            it("Interface with optional property not assignable to", function () {
                interfaceWithOptional.assertNotAssignmentCompatibleWith(AnyLiteralsBut(these3));
                interfaceWithOptional.assertNotAssignmentCompatibleWith(AnyObjectBut(these3));
            });

            var these4 = [emptyObj, emptySig, singleNumObj1, singleNumSig, interfaceOne, interfaceWithOptional, interfaceWithPublicAndOptional, classWithPublic, classWithOptional, classWithPublicAndOptional];

            it("Interface with public and optional property assignable to", function () {
                interfaceWithPublicAndOptional.assertAssignmentCompatibleWith(these4);
            });
            it("Interface with public and optional property not assignable to", function () {
                interfaceWithPublicAndOptional.assertNotAssignmentCompatibleWith(AnyLiteralsBut(these4));
                interfaceWithPublicAndOptional.assertNotAssignmentCompatibleWith(AnyObjectBut(these4));
            });
        });
    });
});