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
    export function scriptIsElided(script: Script): boolean {
        return scriptOrModuleIsElided(script.getModuleFlags(), script.moduleElements);
    }

    export function moduleIsElided(declaration: ModuleDeclaration): boolean {
        return scriptOrModuleIsElided(declaration.getModuleFlags(), declaration.members);
    }

    function scriptOrModuleIsElided(moduleFlags: ModuleFlags, moduleMembers: ASTList): boolean {
        if (hasFlag(moduleFlags, ModuleFlags.Ambient)) {
            return true;
        }

        return moduleMembersAreElided(moduleMembers);
    }

    function moduleMembersAreElided(members: ASTList): boolean {
        for (var i = 0, n = members.members.length; i < n; i++) {
            var member = members.members[i];

            // We should emit *this* module if it contains any non-interface types. 
            // Caveat: if we have contain a module, then we should be emitted *if we want to
            // emit that inner module as well.
            if (member.nodeType() === NodeType.ModuleDeclaration) {
                if (!moduleIsElided(<ModuleDeclaration>member)) {
                    return false;
                }
            }
            else if (member.nodeType() !== NodeType.InterfaceDeclaration) {
                return false;
            }
        }

        return true;
    }

    export function enumIsElided(declaration: EnumDeclaration): boolean {
        if (hasFlag(declaration.getModuleFlags(), ModuleFlags.Ambient)) {
            return true;
        }

        return false;
    }

    export function importDeclarationIsElided(importDeclAST: ImportDeclaration, semanticInfoChain: SemanticInfoChain, compilationSettings: ImmutableCompilationSettings = null) {
        var isExternalModuleReference = importDeclAST.isExternalImportDeclaration();
        var importDecl = semanticInfoChain.getDeclForAST(importDeclAST);
        var isExported = hasFlag(importDecl.flags, PullElementFlags.Exported);
        var isAmdCodeGen = compilationSettings && compilationSettings.moduleGenTarget() == ModuleGenTarget.Asynchronous;

        if (!isExternalModuleReference || // Any internal reference needs to check if the emit can happen
            isExported || // External module reference with export modifier always needs to be emitted
            !isAmdCodeGen) {// commonjs needs the var declaration for the import declaration
            var importSymbol = <PullTypeAliasSymbol>importDecl.getSymbol();
            if (!importDeclAST.isExternalImportDeclaration()) {
                if (importSymbol.getExportAssignedValueSymbol()) {
                    return true;
                }
                var containerSymbol = importSymbol.getExportAssignedContainerSymbol();
                if (containerSymbol && containerSymbol.getInstanceSymbol()) {
                    return true;
                }
            }

            return importSymbol.isUsedAsValue();
        }

        return false;
    }
}