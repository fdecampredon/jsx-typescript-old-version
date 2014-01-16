// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
// See LICENSE.txt in the project root for complete license information.

///<reference path='..\references.ts' />

module TypeScript {

    // This is the walker that walks the type and type reference associated with the declaration.
    // This will make sure that any time, generative classification is asked, we have the right type of the declaration
    // and we can evaluate it in the correct context
    // interface IList<T> {
    //     owner: IList<IList<T>>;
    //     owner2: IList<IList<string>>;
    // }
    // class List<U> implements IList<U> {
    //     owner: List<List<U>>;
    // }
    // In the above example, when checking if owner of List<U> is subtype of owner of IList<U>
    // we want to traverse IList<T> to make sure when generative classification is asked we know exactly 
    // which type parameters and which type need to be checked for infinite wrapping
    // This also is essential so that we dont incorrectly think owner2's type reference as infinitely expanding when 
    // checking members of IList<string>
    export class PullTypeEnclosingTypeWalker {
        // Symbols walked
        private currentSymbols: PullSymbol[] = null;

        // Enclosing type is the first symbol in the symbols visited
        public getEnclosingType() {
            if (this.currentSymbols && this.currentSymbols.length > 0) {
                return <PullTypeSymbol>this.currentSymbols[0];
            }

            return null;
        }

        // We can/should walk the structure only if the enclosing type is generic
        public _canWalkStructure() {
            var enclosingType = this.getEnclosingType();
            return !!enclosingType && enclosingType.isGeneric();
        }

        // Current symbol is the last symbol in the current symbols list
        public _getCurrentSymbol() {
            if (this.currentSymbols && this.currentSymbols.length) {
                return this.currentSymbols[this.currentSymbols.length - 1];
            }

            return null;
        }

        // Gets the generative classification of the current symbol in the enclosing type
        public getGenerativeClassification() {
            if (this._canWalkStructure()) {
                var currentType = <PullTypeSymbol>this.currentSymbols[this.currentSymbols.length - 1];
                if (!currentType) {
                    // This may occur if we are trying to walk type parameter in the original declaration
                    return GenerativeTypeClassification.Unknown;
                }

                var variableNeededToFixNodeJitterBug = this.getEnclosingType();

                return currentType.getGenerativeTypeClassification(variableNeededToFixNodeJitterBug);
            }

            return GenerativeTypeClassification.Closed;
        }

        private _pushSymbol(symbol: PullSymbol) {
            return this.currentSymbols.push(symbol);
        }

        private _popSymbol() {
            return this.currentSymbols.pop();
        }

        // Sets the enclosing type along with parent declaration symbols
        private _setEnclosingTypeOfParentDecl(decl: PullDecl, setSignature: boolean) {
            var parentDecl = decl.getParentDecl();
            if (parentDecl) {
                // Always set signatures in parents
                if (parentDecl.kind & PullElementKind.SomeInstantiatableType) {
                    this._setEnclosingTypeWorker(<PullTypeSymbol>parentDecl.getSymbol(), /*setSignature*/ true);
                } else {
                    this._setEnclosingTypeOfParentDecl(parentDecl, /*setSignature*/ true);
                }

                if (this._canWalkStructure()) {
                    // Update the current decl in the 
                    var symbol = decl.getSymbol();
                    if (symbol) {
                        if (symbol.kind == PullElementKind.Parameter ||
                            symbol.kind == PullElementKind.Property ||
                            symbol.kind == PullElementKind.Method ||
                            symbol.kind == PullElementKind.ConstructorMethod ||
                            symbol.kind == PullElementKind.FunctionExpression) {
                            symbol = symbol.type;
                        }

                        this._pushSymbol(symbol);
                    }

                    // Set signature symbol if asked
                    if (setSignature) {
                        var signature = decl.getSignatureSymbol();
                        if (signature) {
                            this._pushSymbol(signature);
                        }
                    }
                }
            }
        }

        // Set the enclosing type of the symbol
        private _setEnclosingTypeWorker(symbol: PullSymbol, setSignature: boolean) {
            if (symbol.isType() && (<PullTypeSymbol>symbol).isNamedTypeSymbol()) {
                this.currentSymbols = [PullHelpers.getRootType(<PullTypeSymbol>symbol)];
                return;
            }

            var decls = symbol.getDeclarations();
            for (var i = 0; i < decls.length; i++) {
                var decl = decls[i];
                this._setEnclosingTypeOfParentDecl(decl, setSignature);
                if (this._canWalkStructure()) {
                    return;
                }
            }
        }

        // Sets the current symbol with the symbol
        public setCurrentSymbol(symbol: PullSymbol) {
            Debug.assert(this._canWalkStructure());
            this.currentSymbols[this.currentSymbols.length - 1] = symbol;
        }

        // Start walking type
        public startWalkingType(symbol: PullTypeSymbol): PullSymbol[] {
            var currentSymbols = this.currentSymbols;

            // If we dont have enclosing type or the symbol is named type, we need to set the new enclosing type
            var setEnclosingType = !this.getEnclosingType() || symbol.isNamedTypeSymbol();
            if (setEnclosingType) {
                this.currentSymbols = null;
                this.setEnclosingType(symbol);
            }
            return currentSymbols;
        }

        // Finish walking type
        public endWalkingType(currentSymbolsWhenStartedWalkingTypes: PullSymbol[]) {
            this.currentSymbols = currentSymbolsWhenStartedWalkingTypes;
        }

        public setEnclosingType(symbol: PullSymbol) {
            Debug.assert(!this.getEnclosingType());
            this._setEnclosingTypeWorker(symbol, symbol.isSignature());
        }

        // Walk members
        public walkMemberType(memberName: string, resolver: PullTypeResolver) {
            if (this._canWalkStructure()) {
                var currentType = <PullTypeSymbol>this._getCurrentSymbol();
                var memberSymbol = currentType ? resolver._getNamedPropertySymbolOfAugmentedType(memberName, currentType) : null;
                this._pushSymbol(memberSymbol ? memberSymbol.type : null);
            }
        }

        public postWalkMemberType() {
            if (this._canWalkStructure()) {
                this._popSymbol();
            }
        }

        // Walk signature
        public walkSignature(kind: PullElementKind, index: number) {
            if (this._canWalkStructure()) {
                var currentType = <PullTypeSymbol>this._getCurrentSymbol();
                var signatures: PullSignatureSymbol[];
                if (currentType) {
                    if (kind == PullElementKind.CallSignature) {
                        signatures = currentType.getCallSignatures();
                    }
                    else if (kind == PullElementKind.ConstructSignature) {
                        signatures = currentType.getConstructSignatures();
                    }
                    else {
                        signatures = currentType.getIndexSignatures();
                    }
                }

                this._pushSymbol(signatures ? signatures[index] : null);
            }
        }

        public postWalkSignature() {
            if (this._canWalkStructure()) {
                this._popSymbol();
            }
        }

        public walkTypeArgument(index: number): void {
            if (this._canWalkStructure()) {
                var typeArgument: PullTypeSymbol = null;
                var currentType = <PullTypeSymbol>this._getCurrentSymbol();
                if (currentType) {
                    var typeArguments = currentType.getTypeArguments();
                    typeArgument = typeArguments ? typeArguments[index] : null;
                }
                this._pushSymbol(typeArgument);
            }
        }

        public postWalkTypeArgument(): void {
            if (this._canWalkStructure()) {
                this._popSymbol();
            }
        }

        // Walk type parameter constraint
        public walkTypeParameterConstraint(index: number) {
            if (this._canWalkStructure()) {
                var typeParameters: PullTypeParameterSymbol[];
                var currentSymbol = this._getCurrentSymbol();
                if (currentSymbol) {
                    if (currentSymbol.isSignature()) {
                        typeParameters = (<PullSignatureSymbol>currentSymbol).getTypeParameters();
                    } else {
                        Debug.assert(currentSymbol.isType());
                        typeParameters = (<PullTypeSymbol>currentSymbol).getTypeParameters();
                    }
                }
                this._pushSymbol(typeParameters ? typeParameters[index].getConstraint() : null);
            }
        }

        public postWalkTypeParameterConstraint() {
            if (this._canWalkStructure()) {
                this._popSymbol();
            }
        }

        // Walk return type
        public walkReturnType() {
            if (this._canWalkStructure()) {
                var currentSignature = <PullSignatureSymbol>this._getCurrentSymbol();
                this._pushSymbol(currentSignature ? currentSignature.returnType : null);
            }
        }

        public postWalkReturnType() {
            if (this._canWalkStructure()) {
                this._popSymbol();
            }
        }

        // Walk parameter type
        public walkParameterType(iParam: number) {
            if (this._canWalkStructure()) {
                var currentSignature = <PullSignatureSymbol>this._getCurrentSymbol();
                this._pushSymbol(currentSignature ? currentSignature.getParameterTypeAtIndex(iParam) : null);
            }
        }
        public postWalkParameterType() {
            if (this._canWalkStructure()) {
                this._popSymbol();
            }
        }

        // Get both kind of index signatures
        public getBothKindOfIndexSignatures(resolver: PullTypeResolver, context: PullTypeResolutionContext, includeAugmentedType: boolean) {
            if (this._canWalkStructure()) {
                var currentType = <PullTypeSymbol>this._getCurrentSymbol();
                if (currentType) {
                    return resolver._getBothKindsOfIndexSignatures(currentType, context, includeAugmentedType);
                }
            }
            return null;
        }

        // Walk index signature return type
        public walkIndexSignatureReturnType(indexSigInfo: IndexSignatureInfo, useStringIndexSignature: boolean,
            onlySignature?: boolean) {
            if (this._canWalkStructure()) {
                var indexSig = indexSigInfo ? (useStringIndexSignature ? indexSigInfo.stringSignature : indexSigInfo.numericSignature) : null;
                this._pushSymbol(indexSig);
                if (!onlySignature) {
                    this._pushSymbol(indexSig ? indexSig.returnType : null);
                }
            }
        }

        public postWalkIndexSignatureReturnType(onlySignature?: boolean) {
            if (this._canWalkStructure()) {
                if (!onlySignature) {
                    this._popSymbol(); // return type
                }
                this._popSymbol(); // index signature type
            }
        }
    }
}