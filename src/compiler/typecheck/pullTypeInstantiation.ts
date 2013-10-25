// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
///<reference path="..\typescript.ts" />

module TypeScript {
    export enum GenerativeTypeClassification {
        Unknown,
        Open,
        Closed,
        InfinitelyExpanding
    }


    // Type references and instantiated type references
    export class PullTypeReferenceSymbol extends PullTypeSymbol {

        public static createTypeReference(resolver: PullTypeResolver, type: PullTypeSymbol): PullTypeReferenceSymbol {

            if (type.isTypeReference()) {
                return <PullTypeReferenceSymbol>type;
            }

            var typeReference = type.typeReference;

            if (!typeReference) {
                typeReference = new PullTypeReferenceSymbol(resolver, type);
                type.typeReference = typeReference;
            }

            return typeReference;
        }

        // use the root symbol to model the actual type
        // do not call this directly!
        constructor(public resolver: PullTypeResolver, public referencedTypeSymbol: PullTypeSymbol) {
            super(referencedTypeSymbol.name, referencedTypeSymbol.kind);

            Debug.assert(resolver);
            Debug.assert(referencedTypeSymbol != null, "Type root symbol may not be null");

            this.setRootSymbol(referencedTypeSymbol);

            this.typeReference = this;
        }

        public isTypeReference() {
            return true;
        }

        public isResolved = true;

        public setResolved() { }

        // do nothing on invalidate
        public setUnresolved(): void { }
        public invalidate(): void { }

        public ensureReferencedTypeIsResolved(): void {
            this.resolver.resolveDeclaredSymbol(this.referencedTypeSymbol);
        }

        public getReferencedTypeSymbol(): PullTypeSymbol {
            this.ensureReferencedTypeIsResolved();

            return this.referencedTypeSymbol;
        }

        // type symbol shims
        public hasMembers(): boolean {
            // no need to resolve first - members are collected during binding

            return this.referencedTypeSymbol.hasMembers();
        }

        public setAssociatedContainerType(type: PullTypeSymbol): void {
            Debug.fail("Reference symbol " + this.pullSymbolID + ": setAssociatedContainerType");
        }

        public getAssociatedContainerType(): PullTypeSymbol {
            return this.referencedTypeSymbol.getAssociatedContainerType();
        }

        public getFunctionSymbol(): PullSymbol {
            // necessary because the function symbol may be set during type resolution to
            // facilitate doc comments
            this.ensureReferencedTypeIsResolved();

            return this.referencedTypeSymbol.getFunctionSymbol();
        }
        public setFunctionSymbol(symbol: PullSymbol): void {
            Debug.fail("Reference symbol " + this.pullSymbolID + ": setFunctionSymbol");
        }

        public addContainedNonMember(nonMember: PullSymbol): void {
            Debug.fail("Reference symbol " + this.pullSymbolID + ": addContainedNonMember");
        }
        public findContainedNonMemberContainer(containerName: string, kind = PullElementKind.None): PullTypeSymbol {
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.findContainedNonMemberContainer(containerName, kind);
        }

        public addMember(memberSymbol: PullSymbol): void {
            Debug.fail("Reference symbol " + this.pullSymbolID + ": addMember");
        }
        public addEnclosedMemberType(enclosedType: PullTypeSymbol): void {
            Debug.fail("Reference symbol " + this.pullSymbolID + ": addEnclosedMemberType");
        }
        public addEnclosedMemberContainer(enclosedContainer: PullTypeSymbol): void {
            Debug.fail("Reference symbol " + this.pullSymbolID + ": addEnclosedMemberContainer");
        }
        public addEnclosedNonMember(enclosedNonMember: PullSymbol): void {
            Debug.fail("Reference symbol " + this.pullSymbolID + ": addEnclosedNonMember");
        }
        public addEnclosedNonMemberType(enclosedNonMemberType: PullTypeSymbol): void {
            Debug.fail("Reference symbol " + this.pullSymbolID + ": addEnclosedNonMemberType");
        }
        public addEnclosedNonMemberContainer(enclosedNonMemberContainer: PullTypeSymbol): void {
            Debug.fail("Reference symbol " + this.pullSymbolID + ": addEnclosedNonMemberContainer");
        }
        public addTypeParameter(typeParameter: PullTypeParameterSymbol): void {
            Debug.fail("Reference symbol " + this.pullSymbolID + ": addTypeParameter");
        }
        public addConstructorTypeParameter(typeParameter: PullTypeParameterSymbol): void {
            Debug.fail("Reference symbol " + this.pullSymbolID + ": addConstructorTypeParameter");
        }

        public findContainedNonMember(name: string): PullSymbol {
            // need to ensure the referenced type is resolved so we can find the non-member
            this.ensureReferencedTypeIsResolved();

            return this.referencedTypeSymbol.findContainedNonMember(name);
        }

        public findContainedNonMemberType(typeName: string, kind = PullElementKind.None): PullTypeSymbol {
            // similar to the above, need to ensure that the type is resolved so we can introspect any
            // contained types
            this.ensureReferencedTypeIsResolved();

            return this.referencedTypeSymbol.findContainedNonMemberType(typeName, kind);
        }

        public getMembers(): PullSymbol[]{
            // need to resolve the referenced types to get the members
            this.ensureReferencedTypeIsResolved();

            return this.referencedTypeSymbol.getMembers();
        }

        public setHasDefaultConstructor(hasOne= true): void {
            Debug.fail("Reference symbol " + this.pullSymbolID + ":setHasDefaultConstructor");
        }
        public getHasDefaultConstructor(): boolean {
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.getHasDefaultConstructor();
        }
        public getConstructorMethod(): PullSymbol {
            // need to resolve so we don't accidentally substitute in a default constructor
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.getConstructorMethod();
        }
        public setConstructorMethod(constructorMethod: PullSymbol): void {
            Debug.fail("Reference symbol " + this.pullSymbolID + ": setConstructorMethod");
        }
        public getTypeParameters(): PullTypeParameterSymbol[]{
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.getTypeParameters();
        }

        public isGeneric(): boolean {
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.isGeneric();
        }

        public addSpecialization(specializedVersionOfThisType: PullTypeSymbol, substitutingTypes: PullTypeSymbol[]): void {
            //Debug.fail("Reference symbol " + this.pullSymbolIDString + ": addSpecialization");
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.addSpecialization(specializedVersionOfThisType, substitutingTypes);
        }
        public getSpecialization(substitutingTypes: PullTypeSymbol[]): PullTypeSymbol {
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.getSpecialization(substitutingTypes);
        }
        public getKnownSpecializations(): PullTypeSymbol[] {
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.getKnownSpecializations();
        }
        public getTypeArguments(): PullTypeSymbol[] {
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.getTypeArguments();
        }
        public getTypeArgumentsOrTypeParameters(): PullTypeSymbol[] {
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.getTypeArgumentsOrTypeParameters();
        }

        public addCallSignature(callSignature: PullSignatureSymbol): void {
            Debug.fail("Reference symbol " + this.pullSymbolID + ": addCallSignature");
        }
        public addConstructSignature(constructSignature: PullSignatureSymbol): void {
            Debug.fail("Reference symbol " + this.pullSymbolID + ": addConstructSignature");
        }
        public addIndexSignature(indexSignature: PullSignatureSymbol): void {
            Debug.fail("Reference symbol " + this.pullSymbolID + ": addIndexSignature");
        }

        public hasOwnCallSignatures(): boolean {
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.hasOwnCallSignatures();
        }
        public getCallSignatures(collectBaseSignatures= true): PullSignatureSymbol[]{
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.getCallSignatures(collectBaseSignatures);
        }
        public hasOwnConstructSignatures(): boolean {
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.hasOwnConstructSignatures();
        }
        public getConstructSignatures(collectBaseSignatures= true): PullSignatureSymbol[]{
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.getConstructSignatures(collectBaseSignatures);
        }
        public hasOwnIndexSignatures(): boolean {
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.hasOwnIndexSignatures();
        }
        public getIndexSignatures(collectBaseSignatures= true): PullSignatureSymbol[]{
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.getIndexSignatures(collectBaseSignatures);
        }

        public addImplementedType(implementedType: PullTypeSymbol): void {
            this.referencedTypeSymbol.addImplementedType(implementedType);
        }
        public getImplementedTypes(): PullTypeSymbol[] {
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.getImplementedTypes();
        }
        public addExtendedType(extendedType: PullTypeSymbol): void {
            this.referencedTypeSymbol.addExtendedType(extendedType);
        }
        public getExtendedTypes(): PullTypeSymbol[] {
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.getExtendedTypes();
        }
        public addTypeThatExtendsThisType(type: PullTypeSymbol): void {
            this.referencedTypeSymbol.addTypeThatExtendsThisType(type);
        }
        public getTypesThatExtendThisType(): PullTypeSymbol[] {
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.getTypesThatExtendThisType();
        }
        public addTypeThatExplicitlyImplementsThisType(type: PullTypeSymbol): void {
            this.referencedTypeSymbol.addTypeThatExplicitlyImplementsThisType(type);
        }
        public getTypesThatExplicitlyImplementThisType(): PullTypeSymbol[] {
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.getTypesThatExplicitlyImplementThisType();
        }

        public hasBase(potentialBase: PullTypeSymbol, visited: PullSymbol[]= []): boolean {
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.hasBase(potentialBase, visited);
        }
        public isValidBaseKind(baseType: PullTypeSymbol, isExtendedType: boolean): boolean {
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.isValidBaseKind(baseType, isExtendedType);
        }

        public findMember(name: string, lookInParent = true): PullSymbol {
            // ensure that the type is resolved before looking for members
            this.ensureReferencedTypeIsResolved();

            return this.referencedTypeSymbol.findMember(name, lookInParent);
        }
        public findNestedType(name: string, kind = PullElementKind.None): PullTypeSymbol {
            // ensure that the type is resolved before looking for nested types
            this.ensureReferencedTypeIsResolved();

            return this.referencedTypeSymbol.findNestedType(name, kind);
        }
        public findNestedContainer(name: string, kind = PullElementKind.None): PullTypeSymbol {
            // ensure that the type is resolved before looking for nested containers
            this.ensureReferencedTypeIsResolved();

            return this.referencedTypeSymbol.findNestedContainer(name, kind);
        }
        public getAllMembers(searchDeclKind: PullElementKind, memberVisiblity: GetAllMembersVisiblity): PullSymbol[]{
            // ensure that the type is resolved before trying to collect all members
            this.ensureReferencedTypeIsResolved();

            return this.referencedTypeSymbol.getAllMembers(searchDeclKind, memberVisiblity);
        }

        public findTypeParameter(name: string): PullTypeParameterSymbol {
            // ensure that the type is resolved before trying to look up a type parameter
            this.ensureReferencedTypeIsResolved();

            return this.referencedTypeSymbol.findTypeParameter(name);
        }

        /*
        public getNamePartForFullName(): string {
            return this.referencedTypeSymbol.getNamePartForFullName();
        }
        public getScopedName(scopeSymbol?: PullSymbol, useConstraintInName?: boolean): string {
            return this.referencedTypeSymbol.getScopedName(scopeSymbol, useConstraintInName);
        }
        public isNamedTypeSymbol(): boolean {
            return this.referencedTypeSymbol.isNamedTypeSymbol();
        }

        public toString(scopeSymbol?: PullSymbol, useConstraintInName?: boolean): string {
            return this.referencedTypeSymbol.toString(scopeSymbol, useConstraintInName);
        }

        public getScopedNameEx(scopeSymbol?: PullSymbol, useConstraintInName?: boolean, getPrettyTypeName?: boolean, getTypeParamMarkerInfo?: boolean): MemberName {
            return this.referencedTypeSymbol.getScopedNameEx(scopeSymbol, useConstraintInName, getPrettyTypeName, getTypeParamMarkerInfo);
        }
        */

        public hasOnlyOverloadCallSignatures(): boolean {
            // no need to resolve the referenced type - only computed during printing
            return this.referencedTypeSymbol.hasOnlyOverloadCallSignatures();
        }
    }

    export var nSpecializationsCreated = 0;
    export var nSpecializedSignaturesCreated = 0;    

    export class PullInstantiatedTypeReferenceSymbol extends PullTypeReferenceSymbol {

        private _instantiatedMembers: PullSymbol[] = null;
        private _allInstantiatedMemberNameCache: { [name: string]: PullSymbol; } = null;
        private _instantiatedMemberNameCache = createIntrinsicsObject<PullSymbol>(); // cache from member names to pull symbols
        private _instantiatedCallSignatures: PullSignatureSymbol[] = null;
        private _instantiatedConstructSignatures: PullSignatureSymbol[] = null;
        private _instantiatedIndexSignatures: PullSignatureSymbol[] = null;
        private _typeArgumentReferences: PullTypeSymbol[] = null;
        private _instantiatedConstructorMethod: PullSymbol = null;
        private _instantiatedAssociatedContainerType: PullTypeSymbol = null;
        private _isArray:boolean = undefined;

        public isInstanceReferenceType: boolean = false;

        public getIsSpecialized() { return !this.isInstanceReferenceType; }

        private _generativeTypeClassification: GenerativeTypeClassification = GenerativeTypeClassification.Unknown;

        public getGenerativeTypeClassification(enclosingType: PullTypeSymbol): GenerativeTypeClassification {

            if (this._generativeTypeClassification == GenerativeTypeClassification.Unknown) {

                var rootType: PullTypeSymbol = <PullTypeSymbol>enclosingType.getRootSymbol();
                var rootThis: PullTypeSymbol = <PullTypeReferenceSymbol>this.getRootSymbol();

                var prevRootType: PullTypeSymbol = null;
                var prevRootThis: PullTypeSymbol = null;

                while (true) {
                    prevRootType = rootType;
                    rootType = <PullTypeSymbol>rootType.getRootSymbol();

                    if (prevRootType == rootType) {
                        break;
                    }
                }

                // With respect to the enclosing type, is this type reference open, closed or 
                // infinitely expanding?

                var typeParameters = enclosingType.getTypeParameters();
                var typeReferenceTypeArguments = rootThis.getTypeArguments();
                var referenceTypeArgument: PullTypeSymbol = null;

                // may have an object literal or a function signature
                if (!typeReferenceTypeArguments) {

                    while (true) {
                        prevRootThis = rootThis;
                        rootThis = <PullTypeSymbol>rootThis.getRootSymbol();

                        if (prevRootThis == rootThis) {
                            break;
                        }
                    }

                    // create a new type map with just the type parameter
                    var typeParametersMap: PullTypeSymbol[] = [];

                    for (var i = 0; i < typeParameters.length; i++) {
                        typeParametersMap[typeParameters[i].pullSymbolID] = typeParameters[i];
                    }

                    var wrapsSomeTypeParameters = rootThis.wrapsSomeTypeParameter(typeParametersMap);

                    // It's a wrap of a wrap
                    if (wrapsSomeTypeParameters && rootThis.wrapsSomeNestedType(rootType, /*isCheckingNestedType:*/ false)) {
                        this._generativeTypeClassification = GenerativeTypeClassification.InfinitelyExpanding;
                    }
                    else if (wrapsSomeTypeParameters) {
                        this._generativeTypeClassification = GenerativeTypeClassification.Open;
                    }
                    else {
                        this._generativeTypeClassification = GenerativeTypeClassification.Closed;
                    }
                }
                else {
                    var i = 0;

                    while (i < typeReferenceTypeArguments.length) {
                        referenceTypeArgument = <PullTypeSymbol>typeReferenceTypeArguments[i].getRootSymbol();

                        if (referenceTypeArgument.wrapsSomeTypeParameter(this._typeParameterArgumentMap)) {
                            break;
                        }

                        i++;
                    }

                    // if none of the type parameters are wrapped, the type reference is closed
                    if (i == typeParameters.length) {
                        this._generativeTypeClassification = GenerativeTypeClassification.Closed;
                    }

                    // If the type reference is not closed, it's either open or infinitely expanding
                    if (this._generativeTypeClassification == GenerativeTypeClassification.Unknown) {

                        // A type reference that references any of this type's type parameters in a type
                        // argument position is 'open'

                        var i = 0;

                        while ((this._generativeTypeClassification == GenerativeTypeClassification.Unknown) &&
                            (i < typeReferenceTypeArguments.length)) {

                                for (var j = 0; j < typeParameters.length; j++) {
                                    if (typeParameters[j] == typeReferenceTypeArguments[i]) {
                                        this._generativeTypeClassification = GenerativeTypeClassification.Open;
                                        break;
                                    }
                                }

                                i++;
                        }

                        // if it's not open, then it's infinitely expanding (given that the 'wrap' check above
                        // returned true
                        if (this._generativeTypeClassification != GenerativeTypeClassification.Open) {
                            this._generativeTypeClassification = GenerativeTypeClassification.InfinitelyExpanding;
                        }
                    }
                }
            }

            return this._generativeTypeClassification;
        }

        // shims

        public isArrayNamedTypeReference(): boolean {
            if (this._isArray === undefined) {
                this._isArray = this.getRootSymbol().isArrayNamedTypeReference() || (this.getRootSymbol() == this.resolver.getArrayNamedType());
            }
            return this._isArray;
        }

        public getElementType(): PullTypeSymbol {
            if (!this.isArrayNamedTypeReference()) {
                return null;
            }

            var typeArguments = this.getTypeArguments();

            if (typeArguments != null) {
                return typeArguments[0];
            }

            return null;
        }

        public getReferencedTypeSymbol(): PullTypeSymbol {
            this.ensureReferencedTypeIsResolved();

            return this;
        }

        // The typeParameterArgumentMap parameter represents a mapping of PUllSymbolID strings of type parameters to type argument symbols
        // The instantiateFunctionTypeParameters parameter is set to true when a signature is being specialized at a call site, or if its
        // type parameters need to otherwise be specialized (say, during a type relationship check)
        public static create(resolver: PullTypeResolver, type: PullTypeSymbol, typeParameterArgumentMap: PullTypeSymbol[], instantiateFunctionTypeParameters = false): PullInstantiatedTypeReferenceSymbol {
            Debug.assert(resolver);

            // check for an existing instantiation
            var rootType = <PullTypeSymbol>type.getRootSymbol();

            var reconstructedTypeArgumentList: PullTypeSymbol[] = [];
            var typeArguments = type.getTypeArguments();
            var typeParameters = rootType.getTypeParameters();

            // if the type is already specialized, we need to create a new type argument map that represents the mapping of type arguments we've just received
            // to type arguments as previously passed through
            if (type.getIsSpecialized() && typeArguments && typeArguments.length) {
                for (var i = 0; i < typeArguments.length; i++) {
                    reconstructedTypeArgumentList[reconstructedTypeArgumentList.length] = resolver.instantiateType(typeArguments[i], typeParameterArgumentMap, instantiateFunctionTypeParameters);
                }
                
                for (var i = 0; i < typeArguments.length; i++) {
                    typeParameterArgumentMap[typeArguments[i].pullSymbolID] = reconstructedTypeArgumentList[i];
                }
            }
            else {
                var tyArg: PullTypeSymbol = null;

                for (var typeParameterID in typeParameterArgumentMap) {
                    if (typeParameterArgumentMap.hasOwnProperty(typeParameterID)) {
                        tyArg = typeParameterArgumentMap[typeParameterID];

                        if (tyArg) {
                            reconstructedTypeArgumentList[reconstructedTypeArgumentList.length] = tyArg;
                        }
                    }
                }
            }

            if (!instantiateFunctionTypeParameters) {
                var instantiation = <PullInstantiatedTypeReferenceSymbol>rootType.getSpecialization(reconstructedTypeArgumentList);

                if (instantiation) {
                    return instantiation;
                }
            }

            // If the reference is made to itself (e.g., referring to Array<T> within the declaration of Array<T>,
            // We want to special-case the reference so later calls to getMember, etc., will delegate directly
            // to the referenced declaration type, and not force any additional instantiation
            var isReferencedType = (type.kind & PullElementKind.SomeInstantiatableType) != 0;

            if (isReferencedType) {
                if (typeParameters && reconstructedTypeArgumentList) {
                    if (typeParameters.length == reconstructedTypeArgumentList.length) {
                        for (var i = 0; i < typeParameters.length; i++) {
                            if (!PullHelpers.typeSymbolsAreIdentical(typeParameters[i], reconstructedTypeArgumentList[i])) {
                                isReferencedType = false;
                                break;
                            }
                        }

                        if (isReferencedType) {
                            typeParameterArgumentMap = [];
                        }
                    }
                    else {
                        isReferencedType = false; // the same number of type parameters are not shared
                    }
                }
            }

            // if we're re-specializing a generic type (say, if a signature parameter gets specialized
            // from 'Array<S>' to 'Array<foo>', then we'll need to create a new initialization map.  This helps
            // us get the type argument list right when it's requested via getTypeArguments
            if (type.isTypeReference() && type.isGeneric()) {
                var initializationMap: PullTypeSymbol[] = [];

                // first, initialize the argument map
                for (var typeParameterID in typeParameterArgumentMap) {
                    if (typeParameterArgumentMap.hasOwnProperty(typeParameterID)) {
                        initializationMap[typeParameterID] = typeParameterArgumentMap[typeParameterID];
                    }
                }

                // next, overwrite any entries that should be re-directed to new type parameters
                var outerTypeMap = (<PullInstantiatedTypeReferenceSymbol>type)._typeParameterArgumentMap;
                for (var typeParameterID in outerTypeMap) {
                    if (outerTypeMap.hasOwnProperty(typeParameterID)) {
                        if (typeParameterArgumentMap[outerTypeMap[typeParameterID].pullSymbolID]) {
                            initializationMap[typeParameterID] = typeParameterArgumentMap[outerTypeMap[typeParameterID].pullSymbolID];
                        }
                    }
                }

                typeParameterArgumentMap = initializationMap;
            }

            instantiation = new PullInstantiatedTypeReferenceSymbol(resolver, isReferencedType ? rootType : type, typeParameterArgumentMap);

            if (!instantiateFunctionTypeParameters) {
                rootType.addSpecialization(instantiation, reconstructedTypeArgumentList);
            }

            if (isReferencedType) {
                instantiation.isInstanceReferenceType = true;
            }

            return instantiation;
        }

        constructor(resolver: PullTypeResolver, public referencedTypeSymbol: PullTypeSymbol, private _typeParameterArgumentMap: PullTypeSymbol[]) {
            super(resolver, referencedTypeSymbol);

            nSpecializationsCreated++;
        }

        public isGeneric(): boolean {
            return !!this.referencedTypeSymbol.getTypeParameters().length;
        }

        public getTypeParameterArgumentMap(): PullTypeSymbol[] {
            return this._typeParameterArgumentMap;
        }

        public getTypeArguments(): PullTypeSymbol[]{

            if (this.isInstanceReferenceType) {
                return this.getTypeParameters();
            }

            if (!this._typeArgumentReferences) {
                var typeParameters = this.referencedTypeSymbol.getTypeParameters();

                if (typeParameters.length) {
                    var typeArgument: PullTypeSymbol = null;
                    var typeArguments: PullTypeSymbol[] = [];

                    for (var i = 0; i < typeParameters.length; i++) {
                        typeArgument = <PullTypeSymbol>this._typeParameterArgumentMap[typeParameters[i].pullSymbolID];

                        if (!typeArgument) {
                            Debug.fail("type argument count mismatch");
                        }

                        if (typeArgument) {
                            typeArguments[typeArguments.length] = typeArgument;
                        }
                    }

                    this._typeArgumentReferences = typeArguments;
                }
            }

            return this._typeArgumentReferences;
        }
        
        public getTypeArgumentsOrTypeParameters() {
            return this.getTypeArguments();
        }

        //
        // lazily evaluated members
        //
        public getMembers(): PullSymbol[] {
            // need to resolve the referenced types to get the members
            this.ensureReferencedTypeIsResolved();

            if (this.isInstanceReferenceType) {
                return this.referencedTypeSymbol.getMembers();
            }

            // for each of the referenced type's members, need to properly instantiate their
            // type references
            if (!this._instantiatedMembers) {
                var referencedMembers = this.referencedTypeSymbol.getMembers();
                var referencedMember: PullSymbol = null;
                var instantiatedMember: PullSymbol = null;

                this._instantiatedMembers = [];

                for (var i = 0; i < referencedMembers.length; i++) {
                    referencedMember = referencedMembers[i];

                    this.resolver.resolveDeclaredSymbol(referencedMember);

                    if (!this._instantiatedMemberNameCache[referencedMember.name]) {

                        // if the member does not require further specialization, re-use the referenced symbol
                        if (!referencedMember.type.wrapsSomeTypeParameter(this._typeParameterArgumentMap)) {
                            instantiatedMember = referencedMember;
                        }
                        else {
                            instantiatedMember = new PullSymbol(referencedMember.name, referencedMember.kind);
                            instantiatedMember.setRootSymbol(referencedMember);
                            instantiatedMember.type = this.resolver.instantiateType(referencedMember.type, this._typeParameterArgumentMap);
                            instantiatedMember.isOptional = referencedMember.isOptional;
                        }

                        this._instantiatedMemberNameCache[instantiatedMember.name] = instantiatedMember;
                    }
                    else {
                        instantiatedMember = this._instantiatedMemberNameCache[referencedMember.name]
                    }

                    this._instantiatedMembers[this._instantiatedMembers.length] = instantiatedMember;
                }
            }

            return this._instantiatedMembers;
        }

        public findMember(name: string, lookInParent = true): PullSymbol {
            // ensure that the type is resolved before looking for members
            this.ensureReferencedTypeIsResolved();

            if (this.isInstanceReferenceType) {
                return this.referencedTypeSymbol.findMember(name, lookInParent);
            }

            // if the member exists on the referenced type, need to ensure that it's
            // instantiated

            var memberSymbol = <PullSymbol>this._instantiatedMemberNameCache[name];

            if (!memberSymbol) {
                var referencedMemberSymbol = this.referencedTypeSymbol.findMember(name, lookInParent);

                if (referencedMemberSymbol) {
                    memberSymbol = new PullSymbol(referencedMemberSymbol.name, referencedMemberSymbol.kind);
                    memberSymbol.setRootSymbol(referencedMemberSymbol);

                    this.resolver.resolveDeclaredSymbol(referencedMemberSymbol);

                    memberSymbol.type = this.resolver.instantiateType(referencedMemberSymbol.type, this._typeParameterArgumentMap);

                    memberSymbol.isOptional = referencedMemberSymbol.isOptional;

                    this._instantiatedMemberNameCache[memberSymbol.name] = memberSymbol;
                }
                else {
                    memberSymbol = null;
                }
            }

            return memberSymbol;
        }

        // May need to cache based on search kind / visibility combinations
        public getAllMembers(searchDeclKind: PullElementKind, memberVisiblity: GetAllMembersVisiblity): PullSymbol[]{

            // ensure that the type is resolved before trying to collect all members
            this.ensureReferencedTypeIsResolved();

            if (this.isInstanceReferenceType) {
                return this.referencedTypeSymbol.getAllMembers(searchDeclKind, memberVisiblity);
            }

            var requestedMembers: PullSymbol[] = [];
            var allReferencedMembers = this.referencedTypeSymbol.getAllMembers(searchDeclKind, memberVisiblity);

            if (!this._allInstantiatedMemberNameCache) {
                this._allInstantiatedMemberNameCache = createIntrinsicsObject<PullSymbol>();

                // first, seed with this type's members
                var members = this.getMembers();

                for (var i = 0; i < members.length; i++) {
                    this._allInstantiatedMemberNameCache[members[i].name] = members[i];
                }
            }

            // next, for add any symbols belonging to the parent type, if necessary
            var referencedMember: PullSymbol = null;
            var requestedMember: PullSymbol = null;

            for (var i = 0; i < allReferencedMembers.length; i++) {
                referencedMember = allReferencedMembers[i];

                this.resolver.resolveDeclaredSymbol(referencedMember);

                if (this._allInstantiatedMemberNameCache[referencedMember.name]) {
                    requestedMembers[requestedMembers.length] = this._allInstantiatedMemberNameCache[referencedMember.name];
                }
                else {
                    if (!referencedMember.type.wrapsSomeTypeParameter(this._typeParameterArgumentMap)) {
                        this._allInstantiatedMemberNameCache[referencedMember.name] = referencedMember;
                        requestedMembers[requestedMembers.length] = referencedMember;
                    }
                    else {
                        requestedMember = new PullSymbol(referencedMember.name, referencedMember.kind);
                        requestedMember.setRootSymbol(referencedMember);

                        requestedMember.type = this.resolver.instantiateType(referencedMember.type, this._typeParameterArgumentMap);
                        requestedMember.isOptional = referencedMember.isOptional;

                        this._allInstantiatedMemberNameCache[requestedMember.name] = requestedMember;
                        requestedMembers[requestedMembers.length] = requestedMember;
                    }
                }
            }
            
            return requestedMembers;
        }

        public getConstructorMethod(): PullSymbol {

            if (this.isInstanceReferenceType) {
                return this.referencedTypeSymbol.getConstructorMethod();
            }

            if (!this._instantiatedConstructorMethod) {
                var referencedConstructorMethod = this.referencedTypeSymbol.getConstructorMethod();
                this._instantiatedConstructorMethod = new PullSymbol(referencedConstructorMethod.name, referencedConstructorMethod.kind);
                this._instantiatedConstructorMethod.type = PullInstantiatedTypeReferenceSymbol.create(this.resolver, referencedConstructorMethod.type, this._typeParameterArgumentMap);
            }


            return this._instantiatedConstructorMethod;
        }

        public getAssociatedContainerType(): PullTypeSymbol {

            if (!this.isInstanceReferenceType) {
                return this.referencedTypeSymbol.getAssociatedContainerType();
            }

            if (!this._instantiatedAssociatedContainerType) {
                var referencedAssociatedContainerType = this.referencedTypeSymbol.getAssociatedContainerType();

                if (referencedAssociatedContainerType) {
                    this._instantiatedAssociatedContainerType = PullInstantiatedTypeReferenceSymbol.create(this.resolver, referencedAssociatedContainerType, this._typeParameterArgumentMap);
                }
            }

            return this._instantiatedAssociatedContainerType;
        }

        public getCallSignatures(collectBaseSignatures= true): PullSignatureSymbol[]{
            this.ensureReferencedTypeIsResolved();

            if (this.isInstanceReferenceType) {
                return this.referencedTypeSymbol.getCallSignatures(collectBaseSignatures);
            }

            if (this._instantiatedCallSignatures) {
                return this._instantiatedCallSignatures;
            }

            var referencedCallSignatures = this.referencedTypeSymbol.getCallSignatures(collectBaseSignatures);
            this._instantiatedCallSignatures = [];

            for (var i = 0; i < referencedCallSignatures.length; i++) {
                this.resolver.resolveDeclaredSymbol(referencedCallSignatures[i]);

                if (!referencedCallSignatures[i].wrapsSomeTypeParameter(this._typeParameterArgumentMap)) {
                    this._instantiatedCallSignatures[this._instantiatedCallSignatures.length] = referencedCallSignatures[i];
                }
                else {
                    this._instantiatedCallSignatures[this._instantiatedCallSignatures.length] = this.resolver.instantiateSignature(referencedCallSignatures[i], this._typeParameterArgumentMap);
                    this._instantiatedCallSignatures[this._instantiatedCallSignatures.length - 1].functionType = this;
                }
            }

            return this._instantiatedCallSignatures;
        }

        public getConstructSignatures(collectBaseSignatures= true): PullSignatureSymbol[]{
            this.ensureReferencedTypeIsResolved();

            if (this.isInstanceReferenceType) {
                return this.referencedTypeSymbol.getConstructSignatures(collectBaseSignatures);
            }

            if (this._instantiatedConstructSignatures) {
                return this._instantiatedConstructSignatures;
            }

            var referencedConstructSignatures = this.referencedTypeSymbol.getConstructSignatures(collectBaseSignatures);
            this._instantiatedConstructSignatures = [];

            for (var i = 0; i < referencedConstructSignatures.length; i++) {
                this.resolver.resolveDeclaredSymbol(referencedConstructSignatures[i]);

                if (!referencedConstructSignatures[i].wrapsSomeTypeParameter(this._typeParameterArgumentMap)) {
                    this._instantiatedConstructSignatures[this._instantiatedConstructSignatures.length] = referencedConstructSignatures[i];
                }
                else {
                    this._instantiatedConstructSignatures[this._instantiatedConstructSignatures.length] = this.resolver.instantiateSignature(referencedConstructSignatures[i], this._typeParameterArgumentMap);
                    this._instantiatedConstructSignatures[this._instantiatedConstructSignatures.length - 1].functionType = this;
                }
            }

            return this._instantiatedConstructSignatures;
        }

        public getIndexSignatures(collectBaseSignatures= true): PullSignatureSymbol[]{
            this.ensureReferencedTypeIsResolved();

            if (this.isInstanceReferenceType) {
                return this.referencedTypeSymbol.getIndexSignatures(collectBaseSignatures);
            }

            if (this._instantiatedIndexSignatures) {
                return this._instantiatedIndexSignatures;
            }

            var referencedIndexSignatures = this.referencedTypeSymbol.getIndexSignatures(collectBaseSignatures);
            this._instantiatedIndexSignatures = [];

            for (var i = 0; i < referencedIndexSignatures.length; i++) {
                this.resolver.resolveDeclaredSymbol(referencedIndexSignatures[i]);

                if (!referencedIndexSignatures[i].wrapsSomeTypeParameter(this._typeParameterArgumentMap)) {
                    this._instantiatedIndexSignatures[this._instantiatedIndexSignatures.length] = referencedIndexSignatures[i];
                }
                else {
                    this._instantiatedIndexSignatures[this._instantiatedIndexSignatures.length] = this.resolver.instantiateSignature(referencedIndexSignatures[i], this._typeParameterArgumentMap);
                    this._instantiatedIndexSignatures[this._instantiatedIndexSignatures.length - 1].functionType = this;
                }
            }

            return this._instantiatedIndexSignatures;
        }

        public hasBase(potentialBase: PullTypeSymbol, visited: PullSymbol[]= []): boolean {
            return this.referencedTypeSymbol.hasBase(potentialBase, visited);
        }
    }
}