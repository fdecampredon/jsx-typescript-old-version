// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
// See LICENSE.txt in the project root for complete license information.

///<reference path='..\references.ts' />

module TypeScript {
    export class DataMap<T> {
        public map: any = {};

        public link(id: string, data: T) {
            this.map[id] = data;
        }

        public read(id: string): T {
            var result = <T>this.map[id];
            return result ? result : null;
        }
    }
}