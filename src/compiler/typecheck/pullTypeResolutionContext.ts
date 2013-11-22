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

        // TODO: We need the context because the sourceIsRelatableToTarget needs the context.
        // Investigate removing this dependency
        public tryToFix(resolver: PullTypeResolver, context: PullTypeResolutionContext) {
            if (this._inferredTypeAfterFixing) {
                // Already fixed
                return;
            }

            // November 18, 2013: Section 4.12.2:
            // The inferred type argument for a particular type parameter is the widened form
            // (section 3.9) of the best common type(section 3.10) of a set of candidate types.
            var collection = {
                getLength: () => this.inferenceCandidates.length,
                getTypeAtIndex: (index: number) =>  this.inferenceCandidates[index].type
            };

            // Now widen (per the spec citation above)
            var bestCommonType = resolver.findBestCommonType(collection, context, new TypeComparisonInfo());
            this._inferredTypeAfterFixing = bestCommonType.widenedType(resolver, /*ast*/ null, context);
        }
    }

    export class ArgumentInferenceContext {
        public inferenceCache: IBitMatrix = BitMatrix.getBitMatrix(/*allowUndefinedValues:*/ false);
        public candidateCache: CandidateInferenceInfo[] = [];
        public fixedParameterTypes: PullTypeSymbol[] = null;
        public resolver: PullTypeResolver = null;
        public argumentASTs: ISeparatedSyntaxList<IExpressionSyntax> = null;

        // When inferences are being performed at function call sites, use this overloads
        constructor(resolver: PullTypeResolver, argumentASTs: ISeparatedSyntaxList<IExpressionSyntax>);

        // during contextual instantiation, use this overload
        constructor(resolver: PullTypeResolver, fixedParameterTypes: PullTypeSymbol[]);
        constructor(resolver: PullTypeResolver, argumentsOrParameters: any) {
            this.resolver = resolver;

            if (argumentsOrParameters.nonSeparatorAt != undefined) {
                this.argumentASTs = argumentsOrParameters;
            }
            else {
                this.fixedParameterTypes = argumentsOrParameters;
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

        public getInferenceArgumentCount(): number {
            if (this.fixedParameterTypes) {
                return this.fixedParameterTypes.length;
            }
            else {
                return this.argumentASTs.nonSeparatorCount();
            }
        }

        public getArgumentTypeSymbolAtIndex(i: number, context: PullTypeResolutionContext): PullTypeSymbol {

            Debug.assert(i >= 0, "invalid inference argument position");

            if (this.fixedParameterTypes && i < this.getInferenceArgumentCount()) {
                return this.fixedParameterTypes[i];
            }
            else if (i < this.getInferenceArgumentCount()) {
                return this.resolver.resolveAST(this.argumentASTs.nonSeparatorAt(i), true, context).type;
            }

            return null;
        }

        public tryToFixTypeParameter(typeParameter: PullTypeParameterSymbol, resolver: PullTypeResolver, context: PullTypeResolutionContext) {
            var candidateInfo = this.candidateCache[typeParameter.pullSymbolID];
            if (candidateInfo) {
                candidateInfo.tryToFix(resolver, context);
            }
        }

        public getFixedTypeParameterSubstitutions(): PullTypeSymbol[] {
            var fixedTypeParametersToTypesMap: PullTypeSymbol[] = [];

            for (var infoKey in this.candidateCache) {
                if (this.candidateCache.hasOwnProperty(infoKey)) {
                    var info = this.candidateCache[infoKey];
                    // We only want to substitute types for *fixed* type parameters
                    // TODO: We fix type parameters too late. Therefore, sometimes we want the
                    // inferred type of a type parameter that hasn't yet been fixed. For now,
                    // we fall back on the first inference candidate (which might be null).
                    // This means that in the common case with one candidate, we will have the
                    // right type if the type parameter appears in a lambda parameter.
                    fixedTypeParametersToTypesMap[info.typeParameter.pullSymbolID] = info._inferredTypeAfterFixing ||
                        info.inferenceCandidates[0];
                }
            }

            return fixedTypeParametersToTypesMap;
        }

        public inferArgumentTypes(resolver: PullTypeResolver, context: PullTypeResolutionContext): { param: PullTypeParameterSymbol; type: PullTypeSymbol; }[] {
            var results: { param: PullTypeParameterSymbol; type: PullTypeSymbol; }[] = [];

            for (var infoKey in this.candidateCache) {
                if (this.candidateCache.hasOwnProperty(infoKey)) {
                    var info = this.candidateCache[infoKey];

                    info.tryToFix(resolver, context);

                    // is there already a substitution for this type?
                    for (var i = 0; i < results.length; i++) {
                        if (results[i].type == info.typeParameter) {
                            results[i].type = info._inferredTypeAfterFixing;
                        }
                    }

                    results[results.length] = { param: info.typeParameter, type: info._inferredTypeAfterFixing };
                }
            }

            return results;
        }
    }

    export class PullContextualTypeContext {
        public provisionallyTypedSymbols: PullSymbol[] = [];
        public hasProvisionalErrors = false;
        private astSymbolMap: PullSymbol[] = [];

        constructor(public contextualType: PullTypeSymbol,
            public provisional: boolean,
            public isInferentiallyTyping: boolean,
            public substitutions: PullTypeSymbol[]) { }

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

        private _pushAnyContextualType(type: PullTypeSymbol, provisional: boolean, isInferentiallyTyping: boolean, substitutions: PullTypeSymbol[]) {
            this.contextStack.push(new PullContextualTypeContext(type, provisional, isInferentiallyTyping, substitutions));
        }

        // Use this to push any kind of contextual type if it is NOT propagated inward from a parent
        // contextual type. This corresponds to the first series of bullets in Section 4.19 of the spec.
        public pushNewContextualType(type: PullTypeSymbol) {
            this._pushAnyContextualType(type, this.inProvisionalResolution(), /*isInferentiallyTyping*/ false, null);
        }

        // Use this when propagating a contextual type from a parent contextual type to a subexpression.
        // This corresponds to the second series of bullets in section 4.19 of the spec.
        public propagateContextualType(type: PullTypeSymbol) {
            this._pushAnyContextualType(type, this.inProvisionalResolution(), this.isInferentiallyTyping(), null);
        }

        // Use this if you are trying to infer type arguments.
        // substitutions is information about what you have inferred so far.
        public pushInferentialType(type: PullTypeSymbol, substitutions: PullTypeSymbol[]) {
            this._pushAnyContextualType(type, /*provisional*/ true, /*isInferentiallyTyping*/ true, substitutions);
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

        public findSubstitution(type: PullTypeSymbol) {
            if (this.contextStack.length) {
                for (var i = this.contextStack.length - 1; i >= 0; i--) {
                    if (this.contextStack[i].substitutions) {
                        return this.contextStack[i].substitutions[type.pullSymbolID];
                    }
                }
            }

            return null;
        }

        public getContextualType(): PullTypeSymbol {
            var context = !this.contextStack.length ? null : this.contextStack[this.contextStack.length - 1];
            
            if (context) {
                var type = context.contextualType;

                if (!type) {
                    return null;
                }

                // if it's a type parameter, return the upper bound
                if (type.isTypeParameter() && (<PullTypeParameterSymbol>type).getConstraint()) {
                    type = (<PullTypeParameterSymbol>type).getConstraint();
                }

                var substitution = this.findSubstitution(type);

                return substitution || type;
            }

            return null;
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
            var substitution: PullTypeSymbol = this.findSubstitution(type);

            symbol.type = substitution || type;

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
    }
}