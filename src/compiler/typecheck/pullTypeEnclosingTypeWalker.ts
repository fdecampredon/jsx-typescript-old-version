// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
// See LICENSE.txt in the project root for complete license information.

///<reference path='..\references.ts' />

module TypeScript {

    export class EnclosingTypeWalkerState {
        public _currentSymbols: PullSymbol[] = null;
        public _hasEnclosingType = false;
    }

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
        private enclosingTypeWalkerState = new EnclosingTypeWalkerState();

        public resetEnclosingTypeWalkerState(): EnclosingTypeWalkerState {
            var currentState = this.enclosingTypeWalkerState;
            this.enclosingTypeWalkerState = new EnclosingTypeWalkerState();
            return currentState;
        }

        public setEnclosingTypeWalkerState(enclosingTypeWalkerState: EnclosingTypeWalkerState) {
            if (enclosingTypeWalkerState) {
                this.enclosingTypeWalkerState = enclosingTypeWalkerState;
            }
            else {
                this.resetEnclosingTypeWalkerState();
            }
        }

        private setCurrentEnclosingType(type: PullTypeSymbol) {
            this.enclosingTypeWalkerState._hasEnclosingType = true;
            if (type.isGeneric()) {
                this.enclosingTypeWalkerState._currentSymbols = [PullHelpers.getRootType(type)];
            }
        }

        private canSymbolOrDeclBeUsedAsEnclosingTypeHelper(name: string, kind: PullElementKind) {
            return name !== null && (kind === PullElementKind.Class || kind === PullElementKind.Interface);
        }

        private canDeclBeUsedAsEnclosingType(decl: PullDecl) {
            return this.canSymbolOrDeclBeUsedAsEnclosingTypeHelper(decl.name, decl.kind);
        }

        private canSymbolBeUsedAsEnclosingType(symbol: PullSymbol) {
            return this.canSymbolOrDeclBeUsedAsEnclosingTypeHelper(symbol.name, symbol.kind);
        }
        
        // Enclosing type is the first symbol in the symbols visited
        public getEnclosingType() {
            var currentSymbols = this.enclosingTypeWalkerState._currentSymbols;
            if (currentSymbols && currentSymbols.length > 0) {
                return <PullTypeSymbol>currentSymbols[0];
            }

            return null;
        }

        // We can/should walk the structure only if the enclosing type is generic
        public _canWalkStructure() {
            var enclosingType = this.getEnclosingType();
            Debug.assert(!enclosingType || enclosingType.isGeneric());
            return !!enclosingType;
        }

        // Current symbol is the last symbol in the current symbols list
        public _getCurrentSymbol() {
            var currentSymbols = this.enclosingTypeWalkerState._currentSymbols;
            if (currentSymbols && currentSymbols.length) {
                return currentSymbols[currentSymbols.length - 1];
            }

            return null;
        }

        // Gets the generative classification of the current symbol in the enclosing type
        public getGenerativeClassification() {
            if (this._canWalkStructure()) {
                var currentType = <PullTypeSymbol>this._getCurrentSymbol();
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
            return this.enclosingTypeWalkerState._currentSymbols.push(symbol);
        }

        private _popSymbol() {
            return this.enclosingTypeWalkerState._currentSymbols.pop();
        }

        // Sets the enclosing type along with parent declaration symbols
        private _setEnclosingTypeOfParentDecl(decl: PullDecl, setSignature: boolean) {
            var parentDecl = decl.getParentDecl();
            // If we are already at module/script, we are done walking up the parent
            if (parentDecl && (parentDecl.kind & (PullElementKind.SomeContainer | PullElementKind.Script))) {
                // Always set signatures in parents
                if (this.canDeclBeUsedAsEnclosingType(parentDecl)) {
                    this.setCurrentEnclosingType(<PullTypeSymbol>parentDecl.getSymbol());
                } else {
                    this._setEnclosingTypeOfParentDecl(parentDecl, /*setSignature*/ true);
                }

                if (this._canWalkStructure()) {
                    // Update the current decl in the 
                    var symbol = decl.getSymbol();
                    if (symbol) {
                        // If symbol is raw PullSymbol (not a type or a signature, but
                        // rather a variable, function, etc), use its type instead
                        if (!symbol.isType() && !symbol.isSignature()) {
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
            if (this.canSymbolBeUsedAsEnclosingType(symbol)) {
                this.setCurrentEnclosingType(<PullTypeSymbol>symbol);
                return;
            }

            var decls = symbol.getDeclarations();
            for (var i = 0; i < decls.length; i++) {
                var decl = decls[i];
                this._setEnclosingTypeOfParentDecl(decl, setSignature);
                if (this.enclosingTypeWalkerState._hasEnclosingType) {
                    return;
                }
            }

            // We have started walking enclosing type, irrespective of whether there were any symbols set in the context
            this.enclosingTypeWalkerState._hasEnclosingType = true;
        }

        // Start walking type
        public startWalkingType(symbol: PullTypeSymbol): EnclosingTypeWalkerState {
            var currentState = this.enclosingTypeWalkerState;

            // If we dont have enclosing type or the symbol is named type, we need to set the new enclosing type
            var setEnclosingType = !this.enclosingTypeWalkerState._hasEnclosingType || this.canSymbolBeUsedAsEnclosingType(symbol);
            if (setEnclosingType) {
                this.resetEnclosingTypeWalkerState();
                this.setEnclosingType(symbol);
            }
            return currentState;
        }

        // Finish walking type
        public endWalkingType(stateWhenStartedWalkingTypes: EnclosingTypeWalkerState) {
            this.enclosingTypeWalkerState = stateWhenStartedWalkingTypes;
        }

        public setEnclosingType(symbol: PullSymbol) {
            Debug.assert(!this.enclosingTypeWalkerState._hasEnclosingType);
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