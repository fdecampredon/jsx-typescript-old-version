// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
///<reference path="..\typescript.ts" />

module TypeScript {
    export enum GenerativeTypeClassification {
        Unknown,
        Open,
        Closed,
        InfinitelyExpanding
    }

    export interface TypeSubstitutionMap {
        [n: number]: PullTypeSymbol;
    }

    // Type references and instantiated type references
    export class TypeReferenceSymbol extends PullTypeSymbol {
        public static createTypeReference(type: PullTypeSymbol): TypeReferenceSymbol {

            if (type.isTypeReference()) {
                return <TypeReferenceSymbol>type;
            }

            var typeReference = type.typeReference;

            if (!typeReference) {
                typeReference = new TypeReferenceSymbol(type);
                type.typeReference = typeReference;
            }

            return typeReference;
        }

        // use the root symbol to model the actual type
        // do not call this directly!
        constructor(public referencedTypeSymbol: PullTypeSymbol) {
            super(referencedTypeSymbol.name, referencedTypeSymbol.kind);

            Debug.assert(referencedTypeSymbol !== null, "Type root symbol may not be null");

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
            this._getResolver().resolveDeclaredSymbol(this.referencedTypeSymbol);
        }

        public getReferencedTypeSymbol(): PullTypeSymbol {
            this.ensureReferencedTypeIsResolved();

            return this.referencedTypeSymbol;
        }

        public _getResolver(): PullTypeResolver {
            return this.referencedTypeSymbol._getResolver();
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

        public setHasDefaultConstructor(hasOne = true): void {
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

        public appendCallSignature(callSignature: PullSignatureSymbol): void {
            Debug.fail("Reference symbol " + this.pullSymbolID + ": appendCallSignature");
        }
        public insertCallSignatureAtIndex(callSignature: PullSignatureSymbol, index: number): void {
            Debug.fail("Reference symbol " + this.pullSymbolID + ": insertCallSignatureAtIndex");
        }
        public appendConstructSignature(callSignature: PullSignatureSymbol): void {
            Debug.fail("Reference symbol " + this.pullSymbolID + ": appendConstructSignature");
        }
        public insertConstructSignatureAtIndex(callSignature: PullSignatureSymbol, index: number): void {
            Debug.fail("Reference symbol " + this.pullSymbolID + ": insertConstructSignatureAtIndex");
        }
        public addIndexSignature(indexSignature: PullSignatureSymbol): void {
            Debug.fail("Reference symbol " + this.pullSymbolID + ": addIndexSignature");
        }

        public hasOwnCallSignatures(): boolean {
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.hasOwnCallSignatures();
        }
        public getCallSignatures(): PullSignatureSymbol[]{
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.getCallSignatures();
        }
        public hasOwnConstructSignatures(): boolean {
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.hasOwnConstructSignatures();
        }
        public getConstructSignatures(): PullSignatureSymbol[]{
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.getConstructSignatures();
        }
        public hasOwnIndexSignatures(): boolean {
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.hasOwnIndexSignatures();
        }
        public getIndexSignatures(): PullSignatureSymbol[]{
            this.ensureReferencedTypeIsResolved();
            return this.referencedTypeSymbol.getIndexSignatures();
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
    export var nSpecializedTypeParameterCreated = 0;

    export class InstantiatedTypeReferenceSymbol extends TypeReferenceSymbol {

        private _instantiatedMembers: PullSymbol[] = null;
        private _allInstantiatedMemberNameCache: { [name: string]: PullSymbol; } = null;
        private _instantiatedMemberNameCache = createIntrinsicsObject<PullSymbol>(); // cache from member names to pull symbols
        private _instantiatedCallSignatures: PullSignatureSymbol[] = null;
        private _instantiatedConstructSignatures: PullSignatureSymbol[] = null;
        private _instantiatedIndexSignatures: PullSignatureSymbol[] = null;
        private _typeArgumentReferences: PullTypeSymbol[] = undefined;
        private _instantiatedConstructorMethod: PullSymbol = null;
        private _instantiatedAssociatedContainerType: PullTypeSymbol = null;
        private _isArray:boolean = undefined;
        public getIsSpecialized() { return !this.isInstanceReferenceType; }

        private _generativeTypeClassification: GenerativeTypeClassification[] = [];

        public getGenerativeTypeClassification(enclosingType: PullTypeSymbol): GenerativeTypeClassification {
            // Generative type classification is available only on named type symbols
            if (!this.isNamedTypeSymbol()) {
                return GenerativeTypeClassification.Unknown;
            }

            var generativeTypeClassification = this._generativeTypeClassification[enclosingType.pullSymbolID] || GenerativeTypeClassification.Unknown;
            if (generativeTypeClassification === GenerativeTypeClassification.Unknown) {
                // With respect to the enclosing type, is this type reference open, closed or 
                // infinitely expanding?

                // Create a type parameter map for figuring out if the typeParameter wraps
                var typeParameters = enclosingType.getTypeParameters();
                var enclosingTypeParameterMap: PullTypeSymbol[] = [];
                for (var i = 0; i < typeParameters.length; i++) {
                    enclosingTypeParameterMap[typeParameters[i].pullSymbolID] = typeParameters[i];
                }

                var typeArguments = this.getTypeArguments();
                for (var i = 0; i < typeArguments.length; i++) {
                    // Spec section 3.8.7 Recursive Types:
                    // - A type reference without type arguments or with type arguments that do not reference 
                    //      any of G's type parameters is classified as a closed type reference.
                    // - A type reference that references any of G's type parameters in a type argument is 
                    //      classified as an open type reference.
                    if (typeArguments[i].wrapsSomeTypeParameter(enclosingTypeParameterMap, /*skipTypeArgumentCheck*/ true)) {
                        // This type wraps type parameter of the enclosing type so it is at least open
                        generativeTypeClassification = GenerativeTypeClassification.Open;
                        break;
                    }
                }

                // If the type reference is determined to be atleast open, determine if it is infinitely expanding
                if (generativeTypeClassification === GenerativeTypeClassification.Open) {
                    if (this.wrapsSomeTypeParameterIntoInfinitelyExpandingTypeReference(enclosingType)) {
                        generativeTypeClassification = GenerativeTypeClassification.InfinitelyExpanding;
                    }
                }
                else {
                    // This type doesnot wrap any type parameter from the enclosing type so it is closed
                    generativeTypeClassification = GenerativeTypeClassification.Closed;
                }

                this._generativeTypeClassification[enclosingType.pullSymbolID] = generativeTypeClassification;
            }

            return generativeTypeClassification;
        }

        // shims

        public isArrayNamedTypeReference(): boolean {
            if (this._isArray === undefined) {
                this._isArray = this.getRootSymbol().isArrayNamedTypeReference() || (this.getRootSymbol() === this._getResolver().getArrayNamedType());
            }
            return this._isArray;
        }

        public getElementType(): PullTypeSymbol {
            if (!this.isArrayNamedTypeReference()) {
                return null;
            }

            var typeArguments = this.getTypeArguments();
            return typeArguments ? typeArguments[0] : null;
        }

        public getReferencedTypeSymbol(): PullTypeSymbol {
            this.ensureReferencedTypeIsResolved();

            if (this.getIsSpecialized()) {
                return this;
            }

            return this.referencedTypeSymbol;
        }

        // The typeParameterSubstitutionMap parameter represents a mapping of PUllSymbolID strings of type parameters to type argument symbols
        // The instantiateFunctionTypeParameters parameter is set to true when a signature is being specialized at a call site, or if its
        // type parameters need to otherwise be specialized (say, during a type relationship check)
        public static create(resolver: PullTypeResolver, type: PullTypeSymbol, typeParameterSubstitutionMap: TypeSubstitutionMap): InstantiatedTypeReferenceSymbol {
            Debug.assert(resolver);

            // check for an existing instantiation

            // If the type substitution map is going to change, we need to create copy so that 
            // we dont polute the map entry passed in by the caller. 
            // (eg. when getting the member type using enclosing types type substitution map)
            var mutableTypeParameterMap = new PullInstantiationHelpers.MutableTypeParameterSubstitutionMap(typeParameterSubstitutionMap);

            // if the type is already specialized, we need to create a new type substitution map that represents 
            // the mapping of type arguments we've just received to type arguments as previously passed through
            // If we have below sample
            //interface IList<T> {
            //    owner: IList<IList<T>>;
            //}
            //class List<U> implements IList<U> {
            //    owner: IList<IList<U>>;
            //}
            //class List2<V> extends List<V> {
            //    owner: List2<List2<V>>;
            //}
            // When instantiating List<V> with U = V and trying to get owner property we would have the map that
            // says U = V, but when creating the IList<V> we want to updates its type substitution maps to say T = V because 
            // IList<T>  would now be instantiated with V
            PullInstantiationHelpers.instantiateTypeArgument(resolver, type, mutableTypeParameterMap);

            // Lookup in cache if this specialization already exists
            var rootType = <PullTypeSymbol>type.getRootSymbol();
            var instantiation = <InstantiatedTypeReferenceSymbol>rootType.getSpecialization(mutableTypeParameterMap.typeParameterSubstitutionMap);
            if (instantiation) {
                return instantiation;
            }

            // In any type, typeparameter map should only contain information about the allowed to reference type parameters 
            // so remove unnecessary entries that are outside these scope, eg. from above sample we need to remove entry U = V
            // and keep only T = V
            PullInstantiationHelpers.cleanUpTypeParameterSubstitutionMap(type, mutableTypeParameterMap);
            typeParameterSubstitutionMap = mutableTypeParameterMap.typeParameterSubstitutionMap;

            // If the reference is made to itself (e.g., referring to Array<T> within the declaration of Array<T>,
            // We want to special-case the reference so later calls to getMember, etc., will delegate directly
            // to the referenced declaration type, and not force any additional instantiation
            var isInstanceReferenceType = (type.kind & PullElementKind.SomeInstantiatableType) != 0;
            var resolvedTypeParameterArgumentMap = typeParameterSubstitutionMap;
            if (isInstanceReferenceType) {
                var typeParameters = rootType.getTypeParameters();
                for (var i = 0; i < typeParameters.length; i++) {
                    if (!PullHelpers.typeSymbolsAreIdentical(typeParameters[i], typeParameterSubstitutionMap[typeParameters[i].pullSymbolID])) {
                        isInstanceReferenceType = false;
                        break;
                    }
                }

                if (isInstanceReferenceType) {
                    typeParameterSubstitutionMap = [];
                }
            }

            // Create the type using type substitution map
            instantiation = new InstantiatedTypeReferenceSymbol(rootType, typeParameterSubstitutionMap, isInstanceReferenceType);

            // Store in the cache
            rootType.addSpecialization(instantiation, resolvedTypeParameterArgumentMap);

            return instantiation;
        }

        constructor(public referencedTypeSymbol: PullTypeSymbol, private _typeParameterSubstitutionMap: TypeSubstitutionMap,
            public isInstanceReferenceType: boolean) {
            super(referencedTypeSymbol);

            nSpecializationsCreated++;
        }

        public isGeneric(): boolean {
            return (<PullTypeSymbol>this.getRootSymbol()).isGeneric();
        }

        public getTypeParameterSubstitutionMap(): TypeSubstitutionMap {
            return this._typeParameterSubstitutionMap;
        }

        public getTypeArguments(): PullTypeSymbol[]{

            if (this.isInstanceReferenceType) {
                return this.getTypeParameters();
            }

            if (this._typeArgumentReferences === undefined) {
                var typeParameters = this.referencedTypeSymbol.getTypeParameters();

                if (typeParameters.length) {
                    var typeArgument: PullTypeSymbol = null;
                    var typeArguments: PullTypeSymbol[] = [];

                    for (var i = 0; i < typeParameters.length; i++) {
                        typeArgument = <PullTypeSymbol>this._typeParameterSubstitutionMap[typeParameters[i].pullSymbolID];

                        if (!typeArgument) {
                            Debug.fail("type argument count mismatch");
                        }

                        if (typeArgument) {
                            typeArguments[typeArguments.length] = typeArgument;
                        }
                    }

                    this._typeArgumentReferences = typeArguments;
                }
                else {
                    this._typeArgumentReferences = null;
                }
            }

            return this._typeArgumentReferences;
        }
        
        public getTypeArgumentsOrTypeParameters() {
            return this.getTypeArguments();
        }


        private populateInstantiatedMemberFromReferencedMember(referencedMember: PullSymbol) {
            var instantiatedMember: PullSymbol;
            PullHelpers.resolveDeclaredSymbolToUseType(referencedMember);

            // if the member does not require further specialization, re-use the referenced symbol
            if (!referencedMember.type.wrapsSomeTypeParameter(this._typeParameterSubstitutionMap)) {
                instantiatedMember = referencedMember;
            }
            else {
                instantiatedMember = new PullSymbol(referencedMember.name, referencedMember.kind);
                instantiatedMember.setRootSymbol(referencedMember);
                instantiatedMember.type = this._getResolver().instantiateType(referencedMember.type, this._typeParameterSubstitutionMap);
                instantiatedMember.isOptional = referencedMember.isOptional;
            }
            this._instantiatedMemberNameCache[instantiatedMember.name] = instantiatedMember;
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

                    this._getResolver().resolveDeclaredSymbol(referencedMember);

                    if (!this._instantiatedMemberNameCache[referencedMember.name]) {
                        this.populateInstantiatedMemberFromReferencedMember(referencedMember);
                    }
                    
                    this._instantiatedMembers[this._instantiatedMembers.length] = this._instantiatedMemberNameCache[referencedMember.name];
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
                    this.populateInstantiatedMemberFromReferencedMember(referencedMemberSymbol);
                    memberSymbol = <PullSymbol>this._instantiatedMemberNameCache[name];
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

                this._getResolver().resolveDeclaredSymbol(referencedMember);

                if (this._allInstantiatedMemberNameCache[referencedMember.name]) {
                    requestedMembers[requestedMembers.length] = this._allInstantiatedMemberNameCache[referencedMember.name];
                }
                else {
                    if (!referencedMember.type.wrapsSomeTypeParameter(this._typeParameterSubstitutionMap)) {
                        this._allInstantiatedMemberNameCache[referencedMember.name] = referencedMember;
                        requestedMembers[requestedMembers.length] = referencedMember;
                    }
                    else {
                        requestedMember = new PullSymbol(referencedMember.name, referencedMember.kind);
                        requestedMember.setRootSymbol(referencedMember);

                        requestedMember.type = this._getResolver().instantiateType(referencedMember.type, this._typeParameterSubstitutionMap);
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
                this._instantiatedConstructorMethod.setRootSymbol(referencedConstructorMethod);
                this._instantiatedConstructorMethod.setResolved();

                this._instantiatedConstructorMethod.type = InstantiatedTypeReferenceSymbol.create(this._getResolver(), referencedConstructorMethod.type, this._typeParameterSubstitutionMap);
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
                    this._instantiatedAssociatedContainerType = InstantiatedTypeReferenceSymbol.create(this._getResolver(), referencedAssociatedContainerType, this._typeParameterSubstitutionMap);
                }
            }

            return this._instantiatedAssociatedContainerType;
        }

        public getCallSignatures(): PullSignatureSymbol[]{
            this.ensureReferencedTypeIsResolved();

            if (this.isInstanceReferenceType) {
                return this.referencedTypeSymbol.getCallSignatures();
            }

            if (this._instantiatedCallSignatures) {
                return this._instantiatedCallSignatures;
            }

            var referencedCallSignatures = this.referencedTypeSymbol.getCallSignatures();
            this._instantiatedCallSignatures = [];

            for (var i = 0; i < referencedCallSignatures.length; i++) {
                var referencedSignature = referencedCallSignatures[i];
                this._getResolver().resolveDeclaredSymbol(referencedSignature);

                if (!referencedSignature.wrapsSomeTypeParameter(this._typeParameterSubstitutionMap)) {
                    this._instantiatedCallSignatures[this._instantiatedCallSignatures.length] = referencedSignature;
                }
                else {
                    var signatureTypeParameterSubstitutionMap = this.augmentSignatureSubstitutionMapWithSynthesizedTypeParameters(referencedSignature);
                    this._instantiatedCallSignatures[this._instantiatedCallSignatures.length] = this._getResolver().getOrCreateSignatureWithSubstitution(referencedSignature, signatureTypeParameterSubstitutionMap);
                    this._instantiatedCallSignatures[this._instantiatedCallSignatures.length - 1].functionType = this;
                }
            }

            return this._instantiatedCallSignatures;
        }

        public getConstructSignatures(): PullSignatureSymbol[]{
            this.ensureReferencedTypeIsResolved();

            if (this.isInstanceReferenceType) {
                return this.referencedTypeSymbol.getConstructSignatures();
            }

            if (this._instantiatedConstructSignatures) {
                return this._instantiatedConstructSignatures;
            }

            var referencedConstructSignatures = this.referencedTypeSymbol.getConstructSignatures();
            this._instantiatedConstructSignatures = [];

            for (var i = 0; i < referencedConstructSignatures.length; i++) {
                var referencedSignature = referencedConstructSignatures[i];
                this._getResolver().resolveDeclaredSymbol(referencedSignature);

                if (!referencedSignature.wrapsSomeTypeParameter(this._typeParameterSubstitutionMap)) {
                    this._instantiatedConstructSignatures[this._instantiatedConstructSignatures.length] = referencedSignature;
                }
                else {
                    // Construct signatures only get new type parameters if they are not from
                    // class constructors. Otherwise, they must share the type parameters with
                    // the class itself, which means a generic base class reference would actually
                    // instantiate the base constructor with the type arguments of the base class
                    // reference.
                    if (this.isConstructor()) {
                        var signatureTypeParameterArgumentMap = this._typeParameterSubstitutionMap;
                        this._instantiatedConstructSignatures[this._instantiatedConstructSignatures.length] = this._getResolver().instantiateSignature(referencedSignature, signatureTypeParameterArgumentMap);
                    }
                    else {
                        var signatureTypeParameterArgumentMap = this.augmentSignatureSubstitutionMapWithSynthesizedTypeParameters(referencedSignature);
                        this._instantiatedConstructSignatures[this._instantiatedConstructSignatures.length] = this._getResolver().getOrCreateSignatureWithSubstitution(referencedSignature, signatureTypeParameterArgumentMap);
                    }
                    this._instantiatedConstructSignatures[this._instantiatedConstructSignatures.length - 1].functionType = this;
                }
            }

            return this._instantiatedConstructSignatures;
        }

        // This method takes a map of all substitutions that are in scope outside the signature.
        // The output is the composition of that map with all the new substitutions that result
        // from generating new type parameters to replace the root type parameters. Here is an
        // example of what this means:
        //
        // interface Foo<T> {
        //     method<U>(func: (t: T) => U): Foo<U>
        // }
        //
        // Suppose we are inside the reference Foo<U>. The map coming in (this._typeParameterSubstitutionMap)
        // might be [T -> U]. If we just left the signature alone, and performed this substitution, we would
        // get method<U>(func: (t: U) => U): Foo<U>, which is wrong because the U that came in needn't be
        // the same as the new U. So we have to generate a U' that is distinct from U, and then update the
        // map accordingly.
        private augmentSignatureSubstitutionMapWithSynthesizedTypeParameters(referencedSignature: PullSignatureSymbol): TypeSubstitutionMap {
            if (referencedSignature.isGeneric()) {
                // Collect the signature's root type parameters, and for each one, create a new
                // type parameter with the same name. In the above example, getTypeParameters
                // should return an array of U, and newOwnTypeParameters should be an array
                // of U' (a fresh type parameter). Note also that U' keeps track of U as its
                // root type parameter. We assert in order to be sure that all keys in the map
                // are IDs of root type parameters (all of our substitution maps are against the root
                // signature).
                var signaturesOwnTypeParameters = referencedSignature.getTypeParameters();
                var newOwnTypeParameters = new Array<SynthesizedTypeParameterSymbol>(signaturesOwnTypeParameters.length);
                for (var i = 0; i < signaturesOwnTypeParameters.length; i++) {
                    var ownRootTypeParameter = signaturesOwnTypeParameters[i];
                    // Asserts that ownRootTypeParameter is in fact a root type parameter.
                    // This is necessary as all substitution maps are internally based on
                    // root type parameters.
                    Debug.assert(ownRootTypeParameter.getRootSymbol() === ownRootTypeParameter);
                    newOwnTypeParameters[i] = new SynthesizedTypeParameterSymbol(<PullTypeParameterSymbol>ownRootTypeParameter, this._typeParameterSubstitutionMap);
                }
                // We make a copy of this._typeParameterSubstitutionMap that accounts for this new type
                // parameter. In the above example, we copy the map [T -> U], and we output the map
                // [T -> U, U -> U']. Similarly, if we instantiated the same signature inside
                // Foo<U'>, we would get the map [T -> U', U -> U'']. Note that this only works
                // because we do not do recursive lookups in the map when substituting. In other words,
                // we do not use the transitive closure of the map (doing so would cause us to substitute
                // U' for T in the first example, which would be incorrect).
                // See PullInstantiationHelpers.instantiateTypeArgument.
                var signaturesOwnTypeArgumentMap = new PullInstantiationHelpers.MutableTypeParameterSubstitutionMap(this._typeParameterSubstitutionMap);
                for (var i = 0; i < signaturesOwnTypeParameters.length; i++) {
                    signaturesOwnTypeArgumentMap.ensureCopyOfUnderlyingMap();
                    signaturesOwnTypeArgumentMap.typeParameterSubstitutionMap[signaturesOwnTypeParameters[i].pullSymbolID] = newOwnTypeParameters[i];
                }
                return signaturesOwnTypeArgumentMap.typeParameterSubstitutionMap;
            }
            else {
                return this._typeParameterSubstitutionMap;
            }
        }

        public getIndexSignatures(): PullSignatureSymbol[]{
            this.ensureReferencedTypeIsResolved();

            if (this.isInstanceReferenceType) {
                return this.referencedTypeSymbol.getIndexSignatures();
            }

            if (this._instantiatedIndexSignatures) {
                return this._instantiatedIndexSignatures;
            }

            var referencedIndexSignatures = this.referencedTypeSymbol.getIndexSignatures();
            this._instantiatedIndexSignatures = [];

            for (var i = 0; i < referencedIndexSignatures.length; i++) {
                this._getResolver().resolveDeclaredSymbol(referencedIndexSignatures[i]);

                if (!referencedIndexSignatures[i].wrapsSomeTypeParameter(this._typeParameterSubstitutionMap)) {
                    this._instantiatedIndexSignatures[this._instantiatedIndexSignatures.length] = referencedIndexSignatures[i];
                }
                else {
                    this._instantiatedIndexSignatures[this._instantiatedIndexSignatures.length] = this._getResolver().getOrCreateSignatureWithSubstitution(referencedIndexSignatures[i], this._typeParameterSubstitutionMap);
                    this._instantiatedIndexSignatures[this._instantiatedIndexSignatures.length - 1].functionType = this;
                }
            }

            return this._instantiatedIndexSignatures;
        }
    }

    // The following two classes are very similar. They are both variants of signatures with type
    // parameter substitution maps. The only difference is the InstantiatedSignatureSymbol appears
    // to have no type parameters, whereas the SignatureSymbolWithSubstitution does have type
    // parameters.
    // A signature can reference type parameters and have associated substitutions for those
    // type parameters. Consider the following:
    //
    // interface Foo<T> {
    //     bar<S>(x: T, y: S): Foo<S>; // bar itself is PullSignatureSymbol - it is the root symbol
    //                                 // Foo<S> has SignatureSymbolWithSubstitution with map [T -> S, S -> S'] (case 3 below)
    // }
    //
    // var a: Foo<string>;           // Member bar of Foo<S> has a SignatureSymbolWithSubstitution with map [T -> string] (case 1 below)
    // var b = a.bar<number>("", 0); // call to a.bar produces an InstantiatedSignatureSymbol with map [T -> string, S -> number] (case 2 below)
    //
    // There are 3 reasons a signature may have substitutions for referenced type parameters:
    // 1. There are surrounding type parameter substitutions that need to be applied inside the
    //    signature. For example, in Foo<string>, the parameter x should be of type string.
    //    The substitution map here is [T -> string]
    // 2. The signature is instantiated with type arguments. For example, in the above call to
    //    bar<number>("", 0) on Foo<string>, you'd get an InstantiatedSignatureSymbol
    //    bar(x: string, y: number): Foo<number>, which has map [T -> string, S -> number];
    // 3. We needed to synthesize a new type parameter for the signature (for the reason why,
    //    see the comment on SynthesizedTypeParameter). In this case, inside Foo<S>, bar would have
    //    the signature <S'>(x: S, y: S'): Foo<S'>. This is NOT an instantiated signature, but
    //    just a SignatureSymbolWithSubstitution. The map here is [T -> S, S -> S'].
    //
    // This distinction does not exist for types because the only way to substitute in a type
    // is to instantiate it. That's because types cannot be declared in a context where type
    // parameters are in scope.
    //
    // Note that InstantiatedSignatureSymbol could extend SignatureSymbolWithSubstitution,
    // but that would make the inheritance chain longer. These classes are small enough
    // that we have duplicated most of their logic, and they both just extend PullSignatureSymbol.
    export class InstantiatedSignatureSymbol extends PullSignatureSymbol {
        public getTypeParameterSubstitutionMap(): TypeSubstitutionMap {
            return this._typeParameterSubstitutionMap;
        }

        constructor(rootSignature: PullSignatureSymbol, private _typeParameterSubstitutionMap: TypeSubstitutionMap) {
            super(rootSignature.kind, rootSignature.isDefinition());
            this.setRootSymbol(rootSignature);
            nSpecializedSignaturesCreated++;
            
            // Store in the cache
            rootSignature.addSpecialization(this, _typeParameterSubstitutionMap);
        }

        public getIsSpecialized() {
            return true;
        }

        public getIsInstantiated() {
            return true;
        }

        public _getResolver(): PullTypeResolver {
            return this.getRootSymbol()._getResolver();
        }

        public getTypeParameters(): PullTypeParameterSymbol[] {
            return sentinelEmptyArray;
        }

        public getAllowedToReferenceTypeParameters(): PullTypeParameterSymbol[] {
            var rootSymbol = <PullSignatureSymbol>this.getRootSymbol();
            return rootSymbol.getAllowedToReferenceTypeParameters();
        }
    }

    // Copied example from above InstantiatedSignatureSymbol for convenience. See the explanation above 
    // for the exact difference between InstantiatedSignatureSymbol and SignatureSymbolWithSubstitution.
    //
    // interface Foo<T> {
    //     bar<S>(x: T, y: S): Foo<S>; // bar itself is PullSignatureSymbol - it is the root symbol
    //                                 // Foo<S> has SignatureSymbolWithSubstitution with map [T -> S, S -> S']
    // }
    //
    // var a: Foo<string>;           // Member bar of Foo<S> has a SignatureSymbolWithSubstitution with map [T -> string]
    // var b = a.bar<number>("", 0); // call to a.bar produces an InstantiatedSignatureSymbol with map [T -> string, S -> number]
    export class SignatureSymbolWithSubstitution extends PullSignatureSymbol {
        public getTypeParameterSubstitutionMap(): TypeSubstitutionMap {
            return this._typeParameterSubstitutionMap;
        }

        constructor(rootSignature: PullSignatureSymbol, private _typeParameterSubstitutionMap: TypeSubstitutionMap) {
            super(rootSignature.kind, rootSignature.isDefinition());
            this.setRootSymbol(rootSignature);
            nSpecializedSignaturesCreated++;

            // Store in the cache
            rootSignature.addSpecialization(this, _typeParameterSubstitutionMap);
        }

        public getIsSpecialized() { return true; }

        public _getResolver(): PullTypeResolver {
            return this.getRootSymbol()._getResolver();
        }

        public getTypeParameters(): PullTypeParameterSymbol[] {
            if (!this._typeParameters) {
                var rootSymbol = <PullSignatureSymbol>this.getRootSymbol();
                var rootTypeParameters = rootSymbol.getTypeParameters();

                if (rootTypeParameters.length) {
                    this._typeParameters = [];
                    for (var i = 0; i < rootTypeParameters.length; i++) {
                        // Sometimes, one of the root symbol's type parameters is itself a surrounding type argument
                        // For example
                        // interface Foo<T> {
                        //     boo<S>(x: T, y: S): Foo<S>;
                        // }
                        // In the inner instantiation of Foo<S>, the surrounding T will actually be an S.
                        // Unless we substitute this inner S with an S', the types of x and y will appear
                        // to be the same.
                        // If typeParameterSubstitution does not exist, that means we did not generate
                        // new type parameters (this happens when no surrounding type parameters are
                        // referenced in the signature). In this case, we can just use the root type
                        // parameters of the signature.
                        // If typeParameterSubstitution does exist, it means we have synthesized new
                        // type parameters for this signature, and we should return them instead of
                        // the root type parameters.
                        var typeParameterSubstitution = <SynthesizedTypeParameterSymbol>this._typeParameterSubstitutionMap[rootTypeParameters[i].pullSymbolID];
                        this._typeParameters[this._typeParameters.length] = typeParameterSubstitution || rootTypeParameters[i];
                    }
                }
                else {
                    this._typeParameters = sentinelEmptyArray;
                }
            }

            return this._typeParameters;
        }

        public getAllowedToReferenceTypeParameters(): PullTypeParameterSymbol[] {
            var rootSymbol = <PullSignatureSymbol>this.getRootSymbol();
            return rootSymbol.getAllowedToReferenceTypeParameters();
        }
    }

    
    // Sometimes, one of the root symbol's type parameters is itself a surrounding type argument
    // For example
    // interface Foo<T> {
    //     boo<S>(x: T, y: S): Foo<S>;
    // }
    // In the inner instantiation of Foo<S>, the surrounding T will actually be an S.
    // Unless we substitute this inner S with an S', the types of x and y will appear
    // to be the same. PullSynthesizedTypeParameterSymbol is the S' in this example.
    export class SynthesizedTypeParameterSymbol extends PullTypeParameterSymbol {
        // We specifically do not set a root symbol here. Root symbols are only for instantiation.
        // This is distinct from instantiation.
        constructor(private originalTypeParameter: PullTypeParameterSymbol, private _typeParameterSubstitutionMapForConstraint: TypeSubstitutionMap) {
            super(originalTypeParameter.name);
            var originalTypeParameterDeclarations = originalTypeParameter.getDeclarations();
            for (var i = 0; i < originalTypeParameterDeclarations.length; i++) {
                this.addDeclaration(originalTypeParameterDeclarations[i]);
            }
        }

        public _getResolver(): PullTypeResolver {
            return this.originalTypeParameter._getResolver();
        }

        public getConstraint(): PullTypeSymbol {
            var constraint = super.getConstraint();
            if (!constraint) {
                var originalConstraint = this.originalTypeParameter.getConstraint();
                if (originalConstraint) {
                    constraint = this._getResolver().instantiateType(originalConstraint, this._typeParameterSubstitutionMapForConstraint);
                    this.setConstraint(constraint);
                }
            }
            return constraint;
        }
   }
}