// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
// See LICENSE.txt in the project root for complete license information.

///<reference path='..\references.ts' />

module TypeScript {
    export var pullDeclID = 0;
    var sentinelEmptyPullDeclArray: any[] = [];

    export class PullDecl {
        // Properties that will not change over the lifetime of the decl
        public kind: PullElementKind;
        public name: string;
        private declDisplayName: string;

        public declID = pullDeclID++;
        public flags: PullElementFlags = PullElementFlags.None;
        private span: TextSpan;

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

        constructor(declName: string, displayName: string, kind: PullElementKind, declFlags: PullElementFlags, span: TextSpan) {
            this.name = declName;
            this.kind = kind;
            this.flags = declFlags;
            this.span = span;

            if (displayName !== this.name) {
                this.declDisplayName = displayName;
            }
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

        /** Use getName for type checking purposes, and getDisplayName to report an error or display info to the user.
         * They will differ when the identifier is an escaped unicode character or the identifier "__proto__".
         */

        public getDisplayName() {
            return this.declDisplayName === undefined ? this.name : this.declDisplayName;
        }

        public setSymbol(symbol: PullSymbol) {
            this.semanticInfoChain().setSymbolForDecl(this, symbol);
        }

        public ensureSymbolIsBound(bindSignatureSymbol=false) {
            if (!((bindSignatureSymbol && this.hasSignatureSymbol()) || this.hasSymbol()) && this.kind != PullElementKind.Script) {
                var binder = this.semanticInfoChain().getBinder();
                binder.bindDeclToPullSymbol(this);
            }
        }

        public getSymbol(): PullSymbol {
            if (this.kind == PullElementKind.Script) {
                return null;
            }

            this.ensureSymbolIsBound();

            return this.semanticInfoChain().getSymbolForDecl(this);
        }

        public hasSymbol() {
            var symbol = this.semanticInfoChain().getSymbolForDecl(this);
            return !!symbol;
        }

        public setSignatureSymbol(signatureSymbol: PullSignatureSymbol): void {
            this.semanticInfoChain().setSignatureSymbolForDecl(this, signatureSymbol);
        }

        public getSignatureSymbol(): PullSignatureSymbol { 
            this.ensureSymbolIsBound(true);

            return this.semanticInfoChain().getSignatureSymbolForDecl(this);
        }

        public hasSignatureSymbol() {
            var signatureSymbol = this.semanticInfoChain().getSignatureSymbolForDecl(this);
            return !!signatureSymbol;
        }

        public setFlags(flags: PullElementFlags) { this.flags = flags; }

        public setFlag(flags: PullElementFlags) { this.flags |= flags; }

        public getSpan(): TextSpan { return this.span; }

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

        public hasBeenBound() {
            return this.hasSymbol() || this.hasSignatureSymbol();
        }

        public isSynthesized(): boolean {
            return false;
        }

        public ast(): AST {
            var semanticInfoChain = this.semanticInfoChain();
            return semanticInfoChain ? semanticInfoChain.getASTForDecl(this) : null;
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
        private _fileName: string;

        constructor(name: string, fileName: string, kind: PullElementKind, declFlags: PullElementFlags, span: TextSpan, semanticInfoChain: SemanticInfoChain, isExternalModule: boolean) {
            super(name, name, kind, declFlags, span);
            this._semanticInfoChain = semanticInfoChain;
            this._isExternalModule = isExternalModule;
            this._fileName = fileName;
        }

        public fileName(): string {
            return this._fileName;
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
            if (addToParent) {
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
            var parent = this.getParentDecl();
            return parent ? parent.semanticInfoChain() : null;
        }

        public isExternalModule(): boolean {
            return false;
        }
    }

    export class PullFunctionExpressionDecl extends NormalPullDecl {
        private functionExpressionName: string;

        constructor(expressionName: string, declFlags: PullElementFlags, parentDecl: PullDecl, span: TextSpan, displayName: string = "") {
            super("", displayName, PullElementKind.FunctionExpression, declFlags, parentDecl, span);
            this.functionExpressionName = expressionName;
        }

        public getFunctionExpressionName(): string {
            return this.functionExpressionName;
        }
    }

    export class PullSynthesizedDecl extends NormalPullDecl {
        private _semanticInfoChain: SemanticInfoChain;

        // This is a synthesized decl; its life time should match that of the symbol using it, and 
        // not that of its parent decl. To enforce this we are not making it reachable from its 
        // parent, but will set the parent link.
        constructor(declName: string, displayName: string, kind: PullElementKind, declFlags: PullElementFlags, parentDecl: PullDecl, span: TextSpan, semanticInfoChain: SemanticInfoChain) {
            super(declName, displayName, kind, declFlags, parentDecl, span, /*addToParent*/ false);
            this._semanticInfoChain = semanticInfoChain
        }

        public semanticInfoChain(): SemanticInfoChain {
            return this._semanticInfoChain;
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