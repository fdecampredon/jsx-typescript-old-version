// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
// See LICENSE.txt in the project root for complete license information.

///<reference path='..\references.ts' />

module TypeScript {
    export class CandidateInferenceInfo {
        public typeParameter: PullTypeParameterSymbol = null;
        public _inferredTypeAfterFixing: PullTypeSymbol = null;
        public inferenceCandidates: PullTypeSymbol[] = [];

        public addCandidate(candidate: PullTypeSymbol) {
            if (!this._inferredTypeAfterFixing) {
                this.inferenceCandidates[this.inferenceCandidates.length] = candidate;
            }
        }

        public isFixed() {
            return !!this._inferredTypeAfterFixing;
        }

        public fixTypeParameter(resolver: PullTypeResolver, context: PullTypeResolutionContext): void {
            if (!this._inferredTypeAfterFixing) {
                // November 18, 2013: Section 4.12.2:
                // The inferred type argument for a particular type parameter is the widened form
                // (section 3.9) of the best common type(section 3.10) of a set of candidate types.
                var collection = {
                    getLength: () => this.inferenceCandidates.length,
                    getTypeAtIndex: (index: number) => this.inferenceCandidates[index].type
                };

                // Now widen (per the spec citation above)
                var bestCommonType = resolver.findBestCommonType(collection, context, new TypeComparisonInfo());
                this._inferredTypeAfterFixing = bestCommonType.widenedType(resolver, /*ast*/ null, context);
            }
        }
    }

    export class TypeArgumentInferenceContext {
        public inferenceCache: IBitMatrix = BitMatrix.getBitMatrix(/*allowUndefinedValues:*/ false);
        public candidateCache: CandidateInferenceInfo[] = [];

        constructor(public resolver: PullTypeResolver, public context: PullTypeResolutionContext, public signatureBeingInferred: PullSignatureSymbol) {
            var typeParameters = signatureBeingInferred.getTypeParameters();
            for (var i = 0; i < typeParameters.length; i++) {
                this.addInferenceRoot(typeParameters[i]);
            }
        }

        public alreadyRelatingTypes(objectType: PullTypeSymbol, parameterType: PullTypeSymbol) {
            if (this.inferenceCache.valueAt(objectType.pullSymbolID, parameterType.pullSymbolID)) {
                return true;
            }
            else {
                this.inferenceCache.setValueAt(objectType.pullSymbolID, parameterType.pullSymbolID, true);
                return false;
            }
        }

        public resetRelationshipCache() {
            this.inferenceCache.release();
            this.inferenceCache = BitMatrix.getBitMatrix(/*allowUndefinedValues:*/ false);
        }

        public addInferenceRoot(param: PullTypeParameterSymbol) {
            var info = this.candidateCache[param.pullSymbolID];

            if (!info) {
                info = new CandidateInferenceInfo();
                info.typeParameter = param;
                this.candidateCache[param.pullSymbolID] = info;
            }
        }

        public getInferenceInfo(param: PullTypeParameterSymbol): CandidateInferenceInfo {
            return this.candidateCache[param.pullSymbolID];
        }

        public addCandidateForInference(param: PullTypeParameterSymbol, candidate: PullTypeSymbol) {
            var info = this.getInferenceInfo(param);

            // Add the candidate to the CandidateInferenceInfo for this type parameter
            // only if the candidate is not already present.
            if (info && candidate && info.inferenceCandidates.indexOf(candidate) < 0) {
                info.addCandidate(candidate);
            }
        }

        public inferTypeArguments(): PullTypeSymbol[] {
            throw Errors.abstract();
        }

        public fixTypeParameter(typeParameter: PullTypeParameterSymbol) {
            var candidateInfo = this.candidateCache[typeParameter.pullSymbolID];
            if (candidateInfo) {
                candidateInfo.fixTypeParameter(this.resolver, this.context);
            }
        }

        public getFixedTypeParameterSubstitutions(): PullTypeSymbol[] {
            var fixedTypeParametersToTypesMap: PullTypeSymbol[] = [];

            for (var infoKey in this.candidateCache) {
                if (this.candidateCache.hasOwnProperty(infoKey)) {
                    var info = this.candidateCache[infoKey];
                    fixedTypeParametersToTypesMap[info.typeParameter.pullSymbolID] = info._inferredTypeAfterFixing;
                }
            }

            return fixedTypeParametersToTypesMap;
        }

        public _finalizeInferredTypeArguments(): PullTypeSymbol[]{
            var results: PullTypeSymbol[] = [];
            var typeParameters = this.signatureBeingInferred.getTypeParameters();
            for (var i = 0; i < typeParameters.length; i++) {
                var info = this.candidateCache[typeParameters[i].pullSymbolID];

                info.fixTypeParameter(this.resolver, this.context);

                // is there already a substitution for this type?
                for (var i = 0; i < results.length; i++) {
                    if (results[i].type === info.typeParameter) {
                        results[i].type = info._inferredTypeAfterFixing;
                    }
                }

                results.push(info._inferredTypeAfterFixing);
            }

            return results;
        }

        public isInvocationInferenceContext(): boolean {
            throw Errors.abstract();
        }
    }

    export class InvocationTypeArgumentInferenceContext extends TypeArgumentInferenceContext {
        constructor(
            resolver: PullTypeResolver,
            context: PullTypeResolutionContext,
            signatureBeingInferred: PullSignatureSymbol,
            public argumentASTs: ISeparatedSyntaxList<IExpressionSyntax>) {
            super(resolver, context, signatureBeingInferred);
        }

        public isInvocationInferenceContext() {
            return true;
        }

        public inferTypeArguments(): PullTypeSymbol[] {
            // Resolve all of the argument ASTs in the callback
            this.signatureBeingInferred.forAllParameterTypes(/*length*/ this.argumentASTs.nonSeparatorCount(), (parameterType, argumentIndex) => {
                var argumentAST = this.argumentASTs.nonSeparatorAt(argumentIndex);

                this.context.pushInferentialType(parameterType, this);
                var argumentType = this.resolver.resolveAST(argumentAST, /*isContextuallyTyped*/ true, this.context).type;
                this.resolver.relateTypeToTypeParametersWithNewEnclosingTypes(argumentType, parameterType, this, this.context);
                this.context.popAnyContextualType();

                return true; // Continue iterating
            });

            return this._finalizeInferredTypeArguments();
        }
    }

    export class ContextualSignatureInstantiationTypeArgumentInferenceContext extends TypeArgumentInferenceContext {
        // for the shouldFixContextualSignatureParameterTypes flag, pass true during inferential typing
        // and false during signature relation checking
        constructor(
            resolver: PullTypeResolver,
            context: PullTypeResolutionContext,
            signatureBeingInferred: PullSignatureSymbol,
            private contextualSignature: PullSignatureSymbol,
            private shouldFixContextualSignatureParameterTypes: boolean) {
            super(resolver, context, signatureBeingInferred);
        }

        public isInvocationInferenceContext() {
            return false;
        }

        public inferTypeArguments(): PullTypeSymbol[] {
            // We are in contextual signature instantiation. This callback will be executed
            // for each parameter we are trying to relate in order to infer type arguments.
            var relateTypesCallback = (parameterTypeBeingInferred: PullTypeSymbol, contextualParameterType: PullTypeSymbol) => {
                if (this.shouldFixContextualSignatureParameterTypes) {
                    // Need to modify the callback to cause fixing. Per spec section 4.12.2
                    // 4th bullet of inferential typing:
                    // ... then any inferences made for type parameters referenced by the
                    // parameters of T's call signature are fixed
                    // (T here is the contextual signature)
                    contextualParameterType = this.context.fixAllTypeParametersReferencedByType(contextualParameterType, this.resolver, this);
                }
                this.resolver.relateTypeToTypeParametersWithNewEnclosingTypes(contextualParameterType, parameterTypeBeingInferred, this, this.context);

                return true; // continue iterating
            };

            this.signatureBeingInferred.forAllCorrespondingParameterTypesInThisAndOtherSignature(this.contextualSignature, relateTypesCallback);

            return this._finalizeInferredTypeArguments();
        }
    }

    export class PullContextualTypeContext {
        public provisionallyTypedSymbols: PullSymbol[] = [];
        public hasProvisionalErrors = false;
        private astSymbolMap: PullSymbol[] = [];

        constructor(public contextualType: PullTypeSymbol,
            public provisional: boolean,
            public isInferentiallyTyping: boolean,
            public typeArgumentInferenceContext: TypeArgumentInferenceContext) { }

        public recordProvisionallyTypedSymbol(symbol: PullSymbol) {
            this.provisionallyTypedSymbols[this.provisionallyTypedSymbols.length] = symbol;
        }

        public invalidateProvisionallyTypedSymbols() {
            for (var i = 0; i < this.provisionallyTypedSymbols.length; i++) {
                this.provisionallyTypedSymbols[i].setUnresolved();
            }
        }

        public setSymbolForAST(ast: ISyntaxElement, symbol: PullSymbol): void {
            Debug.assert(!ast.isShared());
            this.astSymbolMap[ast.syntaxID()] = symbol;
        }

        public getSymbolForAST(ast: ISyntaxElement): PullSymbol {
            return ast.isShared() ? null : this.astSymbolMap[ast.syntaxID()];
        }
    }

    export class PullTypeResolutionContext {
        private contextStack: PullContextualTypeContext[] = [];
        private typeCheckedNodes: IBitVector = null;
        public enclosingTypeWalker1: PullTypeEnclosingTypeWalker = null;
        public enclosingTypeWalker2: PullTypeEnclosingTypeWalker = null;

        constructor(private resolver: PullTypeResolver, public inTypeCheck = false, public fileName: string = null) {
            if (inTypeCheck) {
                Debug.assert(fileName, "A file name must be provided if you are typechecking");
                this.typeCheckedNodes = BitVector.getBitVector(/*allowUndefinedValues:*/ false);
            }
        }

        public setTypeChecked(ast: ISyntaxElement): void {
            if (!this.inProvisionalResolution()) {
                this.typeCheckedNodes.setValueAt(ast.syntaxID(), true);
            }
        }

        public canTypeCheckAST(ast: ISyntaxElement): boolean {
            // If we're in a context where we're type checking, and the ast we're typechecking
            // hasn't been typechecked in this phase yet, *and* the ast is from the file we're
            // currently typechecking, then we can typecheck.
            //
            // If the ast has been typechecked in this phase, then there's no need to typecheck
            // it again.  Also, if it's from another file, there's no need to typecheck it since
            // whatever host we're in will eventually get around to typechecking it.  This is 
            // also important as it's very possible to stack overflow when typechecking if we 
            // keep jumping around to ISyntaxElement nodes all around a large project.
            return !ast.isShared() &&
                this.typeCheck() &&
                !this.typeCheckedNodes.valueAt(ast.syntaxID()) &&
                this.fileName === ast.fileName();
        }

        private _pushAnyContextualType(type: PullTypeSymbol, provisional: boolean, isInferentiallyTyping: boolean, argContext: TypeArgumentInferenceContext) {
            this.contextStack.push(new PullContextualTypeContext(type, provisional, isInferentiallyTyping, argContext));
        }

        // Use this to push any kind of contextual type if it is NOT propagated inward from a parent
        // contextual type. This corresponds to the first series of bullets in Section 4.19 of the spec.
        public pushNewContextualType(type: PullTypeSymbol) {
            this._pushAnyContextualType(type, this.inProvisionalResolution(), /*isInferentiallyTyping*/ false, null);
        }

        // Use this when propagating a contextual type from a parent contextual type to a subexpression.
        // This corresponds to the second series of bullets in section 4.19 of the spec.
        public propagateContextualType(type: PullTypeSymbol) {
            this._pushAnyContextualType(type, this.inProvisionalResolution(), this.isInferentiallyTyping(), this.getCurrentTypeArgumentInferenceContext());
        }

        // Use this if you are trying to infer type arguments.
        public pushInferentialType(type: PullTypeSymbol, typeArgumentInferenceContext: TypeArgumentInferenceContext) {
            this._pushAnyContextualType(type, /*provisional*/ true, /*isInferentiallyTyping*/ true, typeArgumentInferenceContext);
        }

        // Use this if you are trying to choose an overload and are trying a contextual type.
        public pushProvisionalType(type: PullTypeSymbol) {
            this._pushAnyContextualType(type, /*provisional*/ true, /*isInferentiallyTyping*/ false, null);
        }

        // Use this to pop any kind of contextual type
        public popAnyContextualType(): PullContextualTypeContext {
            var tc = this.contextStack.pop();

            tc.invalidateProvisionallyTypedSymbols();

            // If the context we just popped off had provisional errors, and we are *still* in a provisional context,
            // we need to not forget that we had provisional errors in a deeper context. We do this by setting the 
            // hasProvisioanlErrors flag on the now top context on the stack. 
            if (tc.hasProvisionalErrors && this.inProvisionalResolution()) {
                this.contextStack[this.contextStack.length - 1].hasProvisionalErrors = true;
            }

            return tc;
        }

        public hasProvisionalErrors() {
            return this.contextStack.length ? this.contextStack[this.contextStack.length - 1].hasProvisionalErrors : false;
        }

        // Gets the current contextual or inferential type
        public getContextualType(): PullTypeSymbol {
            var context = !this.contextStack.length ? null : this.contextStack[this.contextStack.length - 1];
            
            if (context) {
                var type = context.contextualType;

                if (!type) {
                    return null;
                }

                return type;
            }

            return null;
        }

        public fixAllTypeParametersReferencedByType(type: PullTypeSymbol, resolver: PullTypeResolver, argContext?: TypeArgumentInferenceContext): PullTypeSymbol {
            var argContext = this.getCurrentTypeArgumentInferenceContext();
            if (type.wrapsSomeTypeParameter(argContext.candidateCache)) {
                // Build up a type parameter argument map with which we will instantiate this type
                // after fixing type parameters
                var typeParameterArgumentMap: PullTypeSymbol[] = [];
                // Iterate over all the type parameters and fix any one that is wrapped
                for (var n in argContext.candidateCache) {
                    var typeParameter = argContext.candidateCache[n] && argContext.candidateCache[n].typeParameter;
                    if (typeParameter) {
                        var dummyMap: PullTypeSymbol[] = [];
                        dummyMap[typeParameter.pullSymbolID] = typeParameter;
                        if (type.wrapsSomeTypeParameter(dummyMap)) {
                            argContext.fixTypeParameter(typeParameter);
                            Debug.assert(argContext.candidateCache[n]._inferredTypeAfterFixing);
                            typeParameterArgumentMap[typeParameter.pullSymbolID] = argContext.candidateCache[n]._inferredTypeAfterFixing;
                        }
                    }
                }

                return resolver.instantiateType(type, typeParameterArgumentMap);
            }

            return type;
        }

        // If we are not in inferential typing, this will return null
        private getCurrentTypeArgumentInferenceContext() {
            return this.contextStack.length
                ? this.contextStack[this.contextStack.length - 1].typeArgumentInferenceContext
                : null;
        }

        public isInferentiallyTyping(): boolean {
            return this.contextStack.length > 0 && this.contextStack[this.contextStack.length - 1].isInferentiallyTyping;
        }

        public inProvisionalResolution() {
            return (!this.contextStack.length ? false : this.contextStack[this.contextStack.length - 1].provisional);
        }

        private inBaseTypeResolution = false;

        public isInBaseTypeResolution() { return this.inBaseTypeResolution; }

        public startBaseTypeResolution() {
            var wasInBaseTypeResoltion = this.inBaseTypeResolution;
            this.inBaseTypeResolution = true;
            return wasInBaseTypeResoltion;
        }

        public doneBaseTypeResolution(wasInBaseTypeResolution: boolean) {
            this.inBaseTypeResolution = wasInBaseTypeResolution;
        }

        public setTypeInContext(symbol: PullSymbol, type: PullTypeSymbol) {
            symbol.type = type;

            if (this.contextStack.length && this.inProvisionalResolution()) {
                this.contextStack[this.contextStack.length - 1].recordProvisionallyTypedSymbol(symbol);
            }
        }

        public postDiagnostic(diagnostic: Diagnostic): void {
            if (diagnostic) {
                if (this.inProvisionalResolution()) {
                    (this.contextStack[this.contextStack.length - 1]).hasProvisionalErrors = true;
                }
                else if (this.inTypeCheck && this.resolver) {
                    this.resolver.semanticInfoChain.addDiagnostic(diagnostic);
                }
            }
        }

        public typeCheck() {
            return this.inTypeCheck && !this.inProvisionalResolution();
        }

        public setSymbolForAST(ast: ISyntaxElement, symbol: PullSymbol): void {
            this.contextStack[this.contextStack.length - 1].setSymbolForAST(ast, symbol);
        }

        public getSymbolForAST(ast: ISyntaxElement): PullSymbol {
            for (var i = this.contextStack.length - 1; i >= 0; i--) {
                var typeContext = this.contextStack[i];
                if (!typeContext.provisional) {
                    // Only provisional contexts have caches
                    break;
                }

                var symbol = typeContext.getSymbolForAST(ast);
                if (symbol) {
                    return symbol;
                }
            }

            return null;
        }

        public startWalkingTypes(symbol1: PullTypeSymbol, symbol2: PullTypeSymbol) {
            if (!this.enclosingTypeWalker1) {
                this.enclosingTypeWalker1 = new PullTypeEnclosingTypeWalker();
            }
            var symbolsWhenStartedWalkingTypes1 = this.enclosingTypeWalker1.startWalkingType(symbol1);
            if (!this.enclosingTypeWalker2) {
                this.enclosingTypeWalker2 = new PullTypeEnclosingTypeWalker();
            }
            var symbolsWhenStartedWalkingTypes2 = this.enclosingTypeWalker2.startWalkingType(symbol2);            
            return { symbolsWhenStartedWalkingTypes1: symbolsWhenStartedWalkingTypes1, symbolsWhenStartedWalkingTypes2: symbolsWhenStartedWalkingTypes2 };
        }

        public endWalkingTypes(symbolsWhenStartedWalkingTypes: { symbolsWhenStartedWalkingTypes1: PullSymbol[]; symbolsWhenStartedWalkingTypes2: PullSymbol[]; }) {
            this.enclosingTypeWalker1.endWalkingType(symbolsWhenStartedWalkingTypes.symbolsWhenStartedWalkingTypes1);
            this.enclosingTypeWalker2.endWalkingType(symbolsWhenStartedWalkingTypes.symbolsWhenStartedWalkingTypes2);
        }

        public setEnclosingTypes(symbol1: PullSymbol, symbol2: PullSymbol) {
            if (!this.enclosingTypeWalker1) {
                this.enclosingTypeWalker1 = new PullTypeEnclosingTypeWalker();
            }
            this.enclosingTypeWalker1.setEnclosingType(symbol1);
            if (!this.enclosingTypeWalker2) {
                this.enclosingTypeWalker2 = new PullTypeEnclosingTypeWalker();
            }
            this.enclosingTypeWalker2.setEnclosingType(symbol2);
        }

        public walkMemberTypes(memberName: string) {
            this.enclosingTypeWalker1.walkMemberType(memberName, this.resolver);
            this.enclosingTypeWalker2.walkMemberType(memberName, this.resolver);
        }

        public postWalkMemberTypes() {
            this.enclosingTypeWalker1.postWalkMemberType();
            this.enclosingTypeWalker2.postWalkMemberType();
        }

        public walkSignatures(kind: PullElementKind, index: number, index2?: number) {
            this.enclosingTypeWalker1.walkSignature(kind, index);
            this.enclosingTypeWalker2.walkSignature(kind, index2 == undefined ? index : index2);
        }

        public postWalkSignatures() {
            this.enclosingTypeWalker1.postWalkSignature();
            this.enclosingTypeWalker2.postWalkSignature();
        }

        public walkTypeParameterConstraints(index: number) {
            this.enclosingTypeWalker1.walkTypeParameterConstraint(index);
            this.enclosingTypeWalker2.walkTypeParameterConstraint(index);
        }

        public postWalkTypeParameterConstraints() {
            this.enclosingTypeWalker1.postWalkTypeParameterConstraint();
            this.enclosingTypeWalker2.postWalkTypeParameterConstraint();
        }

        public walkReturnTypes() {
            this.enclosingTypeWalker1.walkReturnType();
            this.enclosingTypeWalker2.walkReturnType();
        }

        public postWalkReturnTypes() {
            this.enclosingTypeWalker1.postWalkReturnType();
            this.enclosingTypeWalker2.postWalkReturnType();
        }

        public walkParameterTypes(iParam: number) {
            this.enclosingTypeWalker1.walkParameterType(iParam);
            this.enclosingTypeWalker2.walkParameterType(iParam);
        }

        public postWalkParameterTypes() {
            this.enclosingTypeWalker1.postWalkParameterType();
            this.enclosingTypeWalker2.postWalkParameterType();
        }

        public getBothKindOfIndexSignatures(includeAugmentedType1: boolean, includeAugmentedType2: boolean) {
            var indexSigs1 = this.enclosingTypeWalker1.getBothKindOfIndexSignatures(this.resolver, this, includeAugmentedType1);
            var indexSigs2 = this.enclosingTypeWalker2.getBothKindOfIndexSignatures(this.resolver, this, includeAugmentedType2);
            return { indexSigs1: indexSigs1, indexSigs2: indexSigs2 };
        }

        public walkIndexSignatureReturnTypes(indexSigs: { indexSigs1: IndexSignatureInfo; indexSigs2: IndexSignatureInfo; },
            useStringIndexSignature1: boolean, useStringIndexSignature2: boolean, onlySignature?: boolean) {
            this.enclosingTypeWalker1.walkIndexSignatureReturnType(indexSigs.indexSigs1, useStringIndexSignature1, onlySignature);
            this.enclosingTypeWalker2.walkIndexSignatureReturnType(indexSigs.indexSigs2, useStringIndexSignature2, onlySignature);
        }

        public postWalkIndexSignatureReturnTypes(onlySignature?: boolean) {
            this.enclosingTypeWalker1.postWalkIndexSignatureReturnType(onlySignature);
            this.enclosingTypeWalker2.postWalkIndexSignatureReturnType(onlySignature);
        }

        public swapEnclosingTypeWalkers() {
            var tempEnclosingWalker1 = this.enclosingTypeWalker1;
            this.enclosingTypeWalker1 = this.enclosingTypeWalker2;
            this.enclosingTypeWalker2 = tempEnclosingWalker1;
        }

        public getGenerativeClassifications() {
            var generativeClassification1 = this.enclosingTypeWalker1.getGenerativeClassification();
            var generativeClassification2 = this.enclosingTypeWalker2.getGenerativeClassification();
            return { generativeClassification1: generativeClassification1, generativeClassification2: generativeClassification2 };
        }

        public resetEnclosingTypeWalkers() {
            var enclosingTypeWalker1 = this.enclosingTypeWalker1;
            var enclosingTypeWalker2 = this.enclosingTypeWalker2;
            this.enclosingTypeWalker1 = null;
            this.enclosingTypeWalker2 = null;
            return {
                enclosingTypeWalker1: enclosingTypeWalker1,
                enclosingTypeWalker2: enclosingTypeWalker2
            }
        }

        public setEnclosingTypeWalkers(enclosingTypeWalkers: { enclosingTypeWalker1: PullTypeEnclosingTypeWalker; enclosingTypeWalker2: PullTypeEnclosingTypeWalker; }) {
            this.enclosingTypeWalker1 = enclosingTypeWalkers.enclosingTypeWalker1;
            this.enclosingTypeWalker2 = enclosingTypeWalkers.enclosingTypeWalker2;
        }
    }
}