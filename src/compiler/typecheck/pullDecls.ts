// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
// See LICENSE.txt in the project root for complete license information.

///<reference path='..\typescript.ts' />

module TypeScript {
    export var pullDeclID = 0;
    export var lastBoundPullDeclId = 0;
    var sentinelEmptyPullDeclArray: any[] = [];

    export class PullDecl {
        // Properties that will not change over the lifetime of the decl
        public kind: PullElementKind;
        public name: string;
        private declDisplayName: string;
        public declID = pullDeclID++;
        public declIDString: string = null;
        public hashCode = -1;
        public flags: PullElementFlags = PullElementFlags.None;
        private span: TextSpan;

        // Properties that need to be cleaned after a change
        private _isBound: boolean = false;
        private symbol: PullSymbol = null;
        // use this to store the signature symbol for a function declaration
        private signatureSymbol: PullSignatureSymbol = null;
        private specializingSignatureSymbol: PullSignatureSymbol = null;
        private declGroups: BlockIntrinsics<PullDeclGroup> = null;

        // Child decls
        private childDecls: PullDecl[] = null;
        private typeParameters: PullDecl[] = null;
        // In the case of classes, initialized modules and enums, we need to track the implicit
        // value set to the constructor or instance type.  We can use this field to make sure that on
        // edits and updates we don't leak the val decl or symbol
        private synthesizedValDecl: PullDecl = null;

        // Caches
        // Mappings from names to decls.  Public only for diffing purposes.
        public childDeclTypeCache = new BlockIntrinsics<PullDecl[]>();
        public childDeclValueCache = new BlockIntrinsics<PullDecl[]>();
        public childDeclNamespaceCache = new BlockIntrinsics<PullDecl[]>();
        public childDeclTypeParameterCache = new BlockIntrinsics<PullDecl[]>();

        // This is used to store the AST directly on the decl, rather than in a data map,
        // if the useDirectTypeStorage flag is set
        public ast: AST = null;

        constructor(declName: string, displayName: string, kind: PullElementKind, declFlags: PullElementFlags, span: TextSpan) {
            this.name = declName;
            this.kind = kind;
            this.flags = declFlags;
            this.span = span;

            if (displayName !== this.name) {
                this.declDisplayName = displayName;
            }

            this.hashCode = this.declID ^ this.kind;
            this.declIDString = this.declID.toString();
        }

        public fileName(): string {
            throw Errors.abstract();
        }

        public getParentPath(): PullDecl[] {
            throw Errors.abstract();
        }

        public getParentDecl(): PullDecl {
            throw Errors.abstract();
        }

        public semanticInfoChain(): SemanticInfoChain {
            throw Errors.abstract();
        }

        public isExternalModule(): boolean {
            throw Errors.abstract();
        }

        public clean() {
            // Clean this decl
            this._isBound = false;
            this.symbol = null;
            this.signatureSymbol = null;
            this.specializingSignatureSymbol = null;
            this.declGroups = null;

            // Clean child decls
            var children = this.childDecls;
            if (children) {
                for (var i = 0; i < children.length; i++) {
                    children[i].clean();
                }
            }

            var typeParameters = this.typeParameters;
            if (typeParameters) {
                for (var i = 0; i < typeParameters.length; i++) {
                    typeParameters[i].clean();
                }
            }

            if (this.synthesizedValDecl) {
                this.synthesizedValDecl.clean();
            }
        }

        /** Use getName for type checking purposes, and getDisplayName to report an error or display info to the user.
         * They will differ when the identifier is an escaped unicode character or the identifier "__proto__".
         */

        public getDisplayName() {
            return this.declDisplayName === undefined ? this.name : this.declDisplayName;
        }

        public setSymbol(symbol: PullSymbol) { this.symbol = symbol; }

        public ensureSymbolIsBound(bindSignatureSymbol=false) {
            if (!((bindSignatureSymbol && this.signatureSymbol) || this.symbol) && !this._isBound && this.kind != PullElementKind.Script) {
                var binder = this.semanticInfoChain().getBinder();
                binder.bindDeclToPullSymbol(this);
            }
        }

        public getSymbol(): PullSymbol {
            if (this.kind == PullElementKind.Script) {
                return null;
            }

            this.ensureSymbolIsBound();

            return this.symbol;
        }

        public hasSymbol() {
            return this.symbol != null;
        }

        public setSignatureSymbol(signature: PullSignatureSymbol): void { this.signatureSymbol = signature; }
        public getSignatureSymbol(): PullSignatureSymbol { 
            this.ensureSymbolIsBound(true);

            return this.signatureSymbol;
        }

        public hasSignature() {
            return this.signatureSymbol != null;
        }

        public setSpecializingSignatureSymbol(signature: PullSignatureSymbol): void { this.specializingSignatureSymbol = signature; }
        public getSpecializingSignatureSymbol() {
            if (this.specializingSignatureSymbol) {
                return this.specializingSignatureSymbol;
            }

            return this.signatureSymbol;
        }

        public setFlags(flags: PullElementFlags) { this.flags = flags; }
        public setFlag(flags: PullElementFlags) { this.flags |= flags; }

        public getSpan(): TextSpan { return this.span; }
        public setSpan(span: TextSpan) { this.span = span; }

        public setValueDecl(valDecl: PullDecl) { this.synthesizedValDecl = valDecl; }
        public getValueDecl() { return this.synthesizedValDecl; }

        public isEqual(other: PullDecl) {
            return  (this.name === other.name) &&
                    (this.kind === other.kind) &&
                    (this.flags === other.flags) &&
                    (this.fileName() === other.fileName()) &&
                    (this.span.start() === other.span.start()) &&
                    (this.span.end() === other.span.end());
        }

        private getChildDeclCache(declKind: PullElementKind): any {
            return declKind === PullElementKind.TypeParameter
                ? this.childDeclTypeParameterCache
                : hasFlag(declKind, PullElementKind.SomeContainer)
                ? this.childDeclNamespaceCache
                    : hasFlag(declKind, PullElementKind.SomeType)
                        ? this.childDeclTypeCache
                        : this.childDeclValueCache;
        }
        
        // Should only be called by subclasses.
        public addChildDecl(childDecl: PullDecl): void {
            if (childDecl.kind === PullElementKind.TypeParameter) {
                if (!this.typeParameters) {
                    this.typeParameters = [];
                }
                this.typeParameters[this.typeParameters.length] = childDecl;
            }
            else {
                if (!this.childDecls) {
                    this.childDecls = [];
                }
                this.childDecls[this.childDecls.length] = childDecl;
            }

            // add to the appropriate cache
            var declName = childDecl.name;

            if (!(childDecl.kind & PullElementKind.SomeSignature)) {
                var cache = this.getChildDeclCache(childDecl.kind);
                var childrenOfName = <PullDecl[]>cache[declName];
                if (!childrenOfName) {
                    childrenOfName = [];
                }

                childrenOfName.push(childDecl);
                cache[declName] = childrenOfName;
            }
        }

        //public lookupChildDecls(declName: string, declKind: PullElementKind): PullDecl[] {
        //    // find the decl with the optional type
        //    // if necessary, cache the decl
        //    // may be wise to return a chain of decls, or take a parent decl as a parameter
        //    var cache = this.getChildDeclCache(declKind);
        //    var childrenOfName = <PullDecl[]>cache[declName];

        //    return childrenOfName ? childrenOfName : [];
        //}

        // Search for a child decl with the given name.  'isType' is used to specify whether or 
        // not child types or child values are returned.
        public searchChildDecls(declName: string, searchKind: PullElementKind): PullDecl[]{
            // find the decl with the optional type
            // if necessary, cache the decl
            // may be wise to return a chain of decls, or take a parent decl as a parameter

            var cacheVal: PullDecl[] = null;

            if (searchKind & PullElementKind.SomeType) {
                cacheVal = <PullDecl[]>this.childDeclTypeCache[declName];
            }
            else if (searchKind & PullElementKind.SomeContainer) {
                cacheVal = <PullDecl[]>this.childDeclNamespaceCache[declName];
            }
            else {
                cacheVal = <PullDecl[]>this.childDeclValueCache[declName];
            }

            if (cacheVal) {
                return cacheVal;
            }
            else {
                // If we didn't find it, and they were searching for types, then also check the 
                // type parameter cache.
                if (searchKind & PullElementKind.SomeType) {
                    cacheVal = this.childDeclTypeParameterCache[declName];

                    if (cacheVal) {
                        return cacheVal;
                    }
                }

                return sentinelEmptyPullDeclArray;
            }
         }

        public getChildDecls(): PullDecl[] {
            return this.childDecls ? this.childDecls : sentinelEmptyPullDeclArray;
        }

        public getTypeParameters() { return this.typeParameters ? this.typeParameters : sentinelEmptyPullDeclArray; }

        public addVariableDeclToGroup(decl: PullDecl) {
            if (!this.declGroups) {
                this.declGroups = new BlockIntrinsics<PullDeclGroup>();
            }

            var declGroup = this.declGroups[decl.name];
            if (declGroup) {
                declGroup.addDecl(decl);
            }
            else {
                declGroup = new PullDeclGroup(decl.name);
                declGroup.addDecl(decl);
                this.declGroups[decl.name] = declGroup;
            }
        }

        public getVariableDeclGroups(): PullDecl[][] {
            var declGroups: PullDecl[][] = null;

            if (this.declGroups) {
                for (var declName in this.declGroups) {
                    if (this.declGroups[declName]) {
                        if (declGroups === null) {
                            declGroups = [];
                        }

                        declGroups.push(this.declGroups[declName].getDecls());
                    }
                }
            }

            return declGroups ? declGroups : sentinelEmptyPullDeclArray;
        }

        public setIsBound(isBinding: boolean) {
            this._isBound = isBinding;
        }

        public isBound() {
            return this._isBound;
        }

        public isSynthesized(): boolean {
            return false;
        }
    }

    // A root decl represents the top level decl for a file.  By specializing this decl, we 
    // provide a location, per file, to store data that all decls in the file would otherwise
    // have to duplicate.  For example, there is no need to store the 'fileName' in each decl.
    // Instead, only the root decl needs to store this data.  Decls underneath it can determine
    // the file name by queryign their parent.  In other words, a Root Decl allows us to trade
    // space for logarithmic speed. 
    export class RootPullDecl extends PullDecl {
        private _semanticInfoChain: SemanticInfoChain;
        private _isExternalModule: boolean;

        constructor(fileName: string, kind: PullElementKind, declFlags: PullElementFlags, span: TextSpan, semanticInfoChain: SemanticInfoChain, isExternalModule: boolean) {
            super(fileName, fileName, kind, declFlags, span);
            this._semanticInfoChain = semanticInfoChain;
            this._isExternalModule = isExternalModule;
        }

        public fileName(): string {
            return this.name;
        }

        public getParentPath(): PullDecl[]{
            return [this];
        }

        public getParentDecl(): PullDecl {
            return null;
        }

        public semanticInfoChain(): SemanticInfoChain {
            return this._semanticInfoChain;
        }

        public isExternalModule(): boolean {
            return this._isExternalModule;
        }
    }

    export class NormalPullDecl extends PullDecl {
        private parentDecl: PullDecl = null;
        private parentPath: PullDecl[] = null;

        constructor(declName: string, displayName: string, kind: PullElementKind, declFlags: PullElementFlags, parentDecl: PullDecl, span: TextSpan, addToParent = true) {
            super(declName, displayName, kind, declFlags, span);

            // Link to parent
            this.parentDecl = parentDecl;
            if (parentDecl && addToParent) {
                parentDecl.addChildDecl(this);
            }

            if (!parentDecl && !this.isSynthesized() && kind !== PullElementKind.Global && kind !== PullElementKind.Script && kind !== PullElementKind.Primitive) {
                throw Errors.invalidOperation("Orphaned decl " + PullElementKind[kind]);
            }
        }

        public fileName(): string {
            return this.parentDecl ? this.parentDecl.fileName() : "";
        }

        public getParentDecl(): PullDecl {
            return this.parentDecl;
        }

        public getParentPath(): PullDecl[] {
            if (!this.parentPath) {
                var path: PullDecl[] = [this];
                var parentDecl = this.parentDecl;

                while (parentDecl) {
                    if (parentDecl && path[path.length - 1] != parentDecl && !(parentDecl.kind & PullElementKind.ObjectLiteral)) {
                        path.unshift(parentDecl);
                    }

                    parentDecl = parentDecl.getParentDecl();
                }

                this.parentPath = path;
            }

            return this.parentPath;
        }

        public semanticInfoChain(): SemanticInfoChain {
            Debug.assert(this.getParentDecl());
            return this.getParentDecl().semanticInfoChain();
        }

        public isExternalModule(): boolean {
            return false;
        }
    }

    export class PullFunctionExpressionDecl extends NormalPullDecl {
        private functionExpressionName: string;

        constructor(expressionName: string, declFlags: PullElementFlags, parentDecl: PullDecl, span: TextSpan) {
            super("", "", PullElementKind.FunctionExpression, declFlags, parentDecl, span);
            this.functionExpressionName = expressionName;
        }

        public getFunctionExpressionName(): string {
            return this.functionExpressionName;
        }
    }

    export class PullSynthesizedDecl extends NormalPullDecl {
        // This is a synthesized decl; its life time should match that of the symbol using it, and 
        // not that of its parent decl. To enforce this we are not making it reachable from its 
        // parent, but will set the parent link.
        constructor(declName: string, displayName: string, kind: PullElementKind, declFlags: PullElementFlags, parentDecl: PullDecl, span: TextSpan) {
            super(declName, displayName, kind, declFlags, parentDecl, span, /*addToParent*/ false);
        }

        public isSynthesized(): boolean {
            return true;
        }
    }

    export class PullDeclGroup {

        private _decls: PullDecl[] = [];

        constructor(public name: string) {
        }

        public addDecl(decl: PullDecl) {
            if (decl.name === this.name) {
                this._decls[this._decls.length] = decl;
            }
        }

        public getDecls() {
            return this._decls;
        }
    }
}