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

///<reference path='formatting.ts' />

module TypeScript.Services.Formatting {
    export class RuleDescriptor {
        constructor(public LeftTokenRange: Shared.TokenRange, public RightTokenRange: Shared.TokenRange) {
        }

        public toString(): string {
            return "[leftRange=" + this.LeftTokenRange + "," +
                "rightRange=" + this.RightTokenRange + "]";
        }

        static create1(left: SyntaxKind, right: SyntaxKind): RuleDescriptor {
            return RuleDescriptor.create4(Shared.TokenRange.FromToken(left), Shared.TokenRange.FromToken(right))
        }

        static create2(left: Shared.TokenRange, right: SyntaxKind): RuleDescriptor {
            return RuleDescriptor.create4(left, Shared.TokenRange.FromToken(right));
        }

        static create3(left: SyntaxKind, right: Shared.TokenRange): RuleDescriptor
            //: this(TokenRange.FromToken(left), right)
        {
            return RuleDescriptor.create4(Shared.TokenRange.FromToken(left), right);
        }

        static create4(left: Shared.TokenRange, right: Shared.TokenRange): RuleDescriptor {
            return new RuleDescriptor(left, right);
        }
    }
}