// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
// See LICENSE.txt in the project root for complete license information.

///<reference path='..\references.ts' />

module TypeScript {
    export class CandidateInferenceInfo {
        public typeParameter: PullTypeParameterSymbol = null;
        public isFixed = false;
        public inferenceCandidates: PullTypeSymbol[] = [];

        public addCandidate(candidate: PullTypeSymbol) {
            if (!this.isFixed) {
                this.inferenceCandidates[this.inferenceCandidates.length] = candidate;
            }
        }
    }

    export class ArgumentInferenceContext {
        public inferenceCache: IBitMatrix = BitMatrix.getBitMatrix(/*allowUndefinedValues:*/ false);
        public candidateCache: CandidateInferenceInfo[] = [];

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

        public addCandidateForInference(param: PullTypeParameterSymbol, candidate: PullTypeSymbol, fix: boolean) {
            var info = this.getInferenceInfo(param);

            if (info) {

                if (candidate) {
                    info.addCandidate(candidate);
                }

                if (!info.isFixed) {
                    info.isFixed = fix;
                }
            }
        }

        public getInferenceCandidates(): PullTypeSymbol[][] {
            var inferenceCandidates: PullTypeSymbol[][] = [];

            for (var infoKey in this.candidateCache) {
                if (this.candidateCache.hasOwnProperty(infoKey)) {
                    var info = this.candidateCache[infoKey];

                    for (var i = 0; i < info.inferenceCandidates.length; i++) {
                        var val: PullTypeSymbol[] = [];
                        val[info.typeParameter.pullSymbolID] = info.inferenceCandidates[i];
                        inferenceCandidates.push(val);
                    }
                }
            }

            return inferenceCandidates;
        }

        public inferArgumentTypes(resolver: PullTypeResolver, context: PullTypeResolutionContext): { results: { param: PullTypeParameterSymbol; type: PullTypeSymbol; }[]; unfit: boolean; } {
            var collection: IPullTypeCollection;

            var bestCommonType: PullTypeSymbol;

            var results: { param: PullTypeParameterSymbol; type: PullTypeSymbol; }[] = [];

            var unfit = false;

            for (var infoKey in this.candidateCache) {
                if (this.candidateCache.hasOwnProperty(infoKey)) {
                    var info = this.candidateCache[infoKey];

                    if (!info.inferenceCandidates.length) {
                        results[results.length] = { param: info.typeParameter, type: null };
                        continue;
                    }

                    collection = {
                        getLength: () => { return info.inferenceCandidates.length; },
                        getTypeAtIndex: (index: number) => {
                            return info.inferenceCandidates[index].type;
                        }
                    };

                    bestCommonType = resolver.widenType(resolver.findBestCommonType(collection, context, new TypeComparisonInfo()));

                    if (!bestCommonType) {
                        unfit = true;
                    }
                    else {
                        // is there already a substitution for this type?
                        for (var i = 0; i < results.length; i++) {
                            if (results[i].type == info.typeParameter) {
                                results[i].type = bestCommonType;
                            }
                        }
                    }

                    results[results.length] = { param: info.typeParameter, type: bestCommonType };
                }
            }

            return { results: results, unfit: unfit };
        }
    }

    export class PullContextualTypeContext {
        public provisionallyTypedSymbols: PullSymbol[] = [];
        public hasProvisionalErrors = false;
        private astSymbolMap: PullSymbol[] = []

        constructor(public contextualType: PullTypeSymbol,
                    public provisional: boolean,
                    public substitutions: PullTypeSymbol[]) { }

        public recordProvisionallyTypedSymbol(symbol: PullSymbol) {
            this.provisionallyTypedSymbols[this.provisionallyTypedSymbols.length] = symbol;
        }

        public invalidateProvisionallyTypedSymbols() {
            for (var i = 0; i < this.provisionallyTypedSymbols.length; i++) {
                this.provisionallyTypedSymbols[i].setUnresolved();
            }
        }

        public setSymbolForAST(ast: AST, symbol: PullSymbol): void {
            this.astSymbolMap[ast.astID()] = symbol;
        }

        public getSymbolForAST(ast: AST): PullSymbol {
            return this.astSymbolMap[ast.astID()];
        }
    }

    export class PullTypeResolutionContext {
        private contextStack: PullContextualTypeContext[] = [];

        constructor(private resolver: PullTypeResolver, public inTypeCheck = false, public fileName: string = null) {
            if (inTypeCheck) {
                Debug.assert(fileName, "A file name must be provided if you are typechecking");
            }
        }

        public pushContextualType(type: PullTypeSymbol, provisional: boolean, substitutions: PullTypeSymbol[]) {
            this.contextStack.push(new PullContextualTypeContext(type, provisional, substitutions));
        }

        public popContextualType(): PullContextualTypeContext {
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
            var substitution: PullTypeSymbol = null;

            if (this.contextStack.length) {
                for (var i = this.contextStack.length - 1; i >= 0; i--) {
                    if (this.contextStack[i].substitutions) {
                        substitution = this.contextStack[i].substitutions[type.pullSymbolID];

                        if (substitution) {
                            break;
                        }
                    }
                }
            }

            return substitution;
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

                return substitution ? substitution : type;
            }

            return null;
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

            symbol.type = substitution ? substitution : type;

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

        public setSymbolForAST(ast: AST, symbol: PullSymbol): void {
            this.contextStack[this.contextStack.length - 1].setSymbolForAST(ast, symbol);
        }

        public getSymbolForAST(ast: AST): PullSymbol {
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