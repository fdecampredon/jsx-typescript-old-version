//
// Copyright (c) Microsoft Corporation.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

///<reference path='references.ts' />

module TypeScript {
    export function hasFlag(val: number, flag: number): boolean {
        return (val & flag) !== 0;
    }

    export enum ASTFlags {
        None = 0,
        SingleLine = 1 << 1,
        OptionalName = 1 << 2,
    }

    export enum DeclFlags {
        None = 0,
        Exported = 1,
        Private = 1 << 1,
        Public = 1 << 2,
        Ambient = 1 << 3,
        Static = 1 << 4,
    }

    export enum ModuleFlags {
        None = 0,
        Exported = 1,
        Private = 1 << 1,
        Public = 1 << 2,
        Ambient = 1 << 3,
        Static = 1 << 4,
        IsExternalModule = 1 << 8,
    }

    export function ToDeclFlags(moduleFlags: ModuleFlags): DeclFlags;
    export function ToDeclFlags(fncOrVarOrModuleFlags: any) {
        return <DeclFlags>fncOrVarOrModuleFlags;
    }

    export function ModifiersToDeclFlags(modifiers: PullElementFlags[]): DeclFlags {
        var flags = DeclFlags.None;

        for (var i = 0, n = modifiers.length; i < n; i++) {
            switch (modifiers[i]) {
                case PullElementFlags.Exported:
                    flags |= DeclFlags.Exported;
                    continue;
                case PullElementFlags.Ambient:
                    flags |= DeclFlags.Ambient;
                    continue;
                case PullElementFlags.Public:
                    flags |= DeclFlags.Public;
                    continue;
                case PullElementFlags.Private:
                    flags |= DeclFlags.Private;
                    continue;
                case PullElementFlags.Static:
                    flags |= DeclFlags.Static;
                    continue;
            }
        }

        return flags;
    }

    export enum TypeRelationshipFlags {
        SuccessfulComparison = 0,
        RequiredPropertyIsMissing = 1 << 1,
        IncompatibleSignatures = 1 << 2,
        SourceSignatureHasTooManyParameters = 3,
        IncompatibleReturnTypes = 1 << 4,
        IncompatiblePropertyTypes = 1 << 5,
        IncompatibleParameterTypes = 1 << 6,
        InconsistantPropertyAccesibility = 1 << 7,
    }

    export enum ModuleGenTarget {
        Unspecified = 0,
        Synchronous = 1,
        Asynchronous = 2,
    }
}