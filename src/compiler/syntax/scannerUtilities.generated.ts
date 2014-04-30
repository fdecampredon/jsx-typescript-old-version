///<reference path='references.ts' />

module TypeScript {
    export class ScannerUtilities {
        public static identifierKind(array: string, startIndex: number, length: number): SyntaxKind {
            switch (length) {
            case 2:
                // do, if, in
                switch(array.charCodeAt(startIndex)) {
                case CharacterCodes.d:
                    // do
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.o) ? SyntaxKind.DoKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.i:
                    // if, in
                    switch(array.charCodeAt(startIndex + 1)) {
                    case CharacterCodes.f:
                        // if
                        return SyntaxKind.IfKeyword;
                    case CharacterCodes.n:
                        // in
                        return SyntaxKind.InKeyword;
                    default:
                        return SyntaxKind.IdentifierName;
                    }

                default:
                    return SyntaxKind.IdentifierName;
                }

            case 3:
                // for, new, try, var, let, any, get, set
                switch(array.charCodeAt(startIndex)) {
                case CharacterCodes.f:
                    // for
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.o && array.charCodeAt(startIndex + 2) === CharacterCodes.r) ? SyntaxKind.ForKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.n:
                    // new
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.e && array.charCodeAt(startIndex + 2) === CharacterCodes.w) ? SyntaxKind.NewKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.t:
                    // try
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.r && array.charCodeAt(startIndex + 2) === CharacterCodes.y) ? SyntaxKind.TryKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.v:
                    // var
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.a && array.charCodeAt(startIndex + 2) === CharacterCodes.r) ? SyntaxKind.VarKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.l:
                    // let
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.e && array.charCodeAt(startIndex + 2) === CharacterCodes.t) ? SyntaxKind.LetKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.a:
                    // any
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.n && array.charCodeAt(startIndex + 2) === CharacterCodes.y) ? SyntaxKind.AnyKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.g:
                    // get
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.e && array.charCodeAt(startIndex + 2) === CharacterCodes.t) ? SyntaxKind.GetKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.s:
                    // set
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.e && array.charCodeAt(startIndex + 2) === CharacterCodes.t) ? SyntaxKind.SetKeyword : SyntaxKind.IdentifierName;
                default:
                    return SyntaxKind.IdentifierName;
                }

            case 4:
                // case, else, null, this, true, void, with, enum
                switch(array.charCodeAt(startIndex)) {
                case CharacterCodes.c:
                    // case
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.a && array.charCodeAt(startIndex + 2) === CharacterCodes.s && array.charCodeAt(startIndex + 3) === CharacterCodes.e) ? SyntaxKind.CaseKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.e:
                    // else, enum
                    switch(array.charCodeAt(startIndex + 1)) {
                    case CharacterCodes.l:
                        // else
                        return (array.charCodeAt(startIndex + 2) === CharacterCodes.s && array.charCodeAt(startIndex + 3) === CharacterCodes.e) ? SyntaxKind.ElseKeyword : SyntaxKind.IdentifierName;
                    case CharacterCodes.n:
                        // enum
                        return (array.charCodeAt(startIndex + 2) === CharacterCodes.u && array.charCodeAt(startIndex + 3) === CharacterCodes.m) ? SyntaxKind.EnumKeyword : SyntaxKind.IdentifierName;
                    default:
                        return SyntaxKind.IdentifierName;
                    }

                case CharacterCodes.n:
                    // null
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.u && array.charCodeAt(startIndex + 2) === CharacterCodes.l && array.charCodeAt(startIndex + 3) === CharacterCodes.l) ? SyntaxKind.NullKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.t:
                    // this, true
                    switch(array.charCodeAt(startIndex + 1)) {
                    case CharacterCodes.h:
                        // this
                        return (array.charCodeAt(startIndex + 2) === CharacterCodes.i && array.charCodeAt(startIndex + 3) === CharacterCodes.s) ? SyntaxKind.ThisKeyword : SyntaxKind.IdentifierName;
                    case CharacterCodes.r:
                        // true
                        return (array.charCodeAt(startIndex + 2) === CharacterCodes.u && array.charCodeAt(startIndex + 3) === CharacterCodes.e) ? SyntaxKind.TrueKeyword : SyntaxKind.IdentifierName;
                    default:
                        return SyntaxKind.IdentifierName;
                    }

                case CharacterCodes.v:
                    // void
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.o && array.charCodeAt(startIndex + 2) === CharacterCodes.i && array.charCodeAt(startIndex + 3) === CharacterCodes.d) ? SyntaxKind.VoidKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.w:
                    // with
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.i && array.charCodeAt(startIndex + 2) === CharacterCodes.t && array.charCodeAt(startIndex + 3) === CharacterCodes.h) ? SyntaxKind.WithKeyword : SyntaxKind.IdentifierName;
                default:
                    return SyntaxKind.IdentifierName;
                }

            case 5:
                // break, catch, false, throw, while, class, const, super, yield
                switch(array.charCodeAt(startIndex)) {
                case CharacterCodes.b:
                    // break
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.r && array.charCodeAt(startIndex + 2) === CharacterCodes.e && array.charCodeAt(startIndex + 3) === CharacterCodes.a && array.charCodeAt(startIndex + 4) === CharacterCodes.k) ? SyntaxKind.BreakKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.c:
                    // catch, class, const
                    switch(array.charCodeAt(startIndex + 1)) {
                    case CharacterCodes.a:
                        // catch
                        return (array.charCodeAt(startIndex + 2) === CharacterCodes.t && array.charCodeAt(startIndex + 3) === CharacterCodes.c && array.charCodeAt(startIndex + 4) === CharacterCodes.h) ? SyntaxKind.CatchKeyword : SyntaxKind.IdentifierName;
                    case CharacterCodes.l:
                        // class
                        return (array.charCodeAt(startIndex + 2) === CharacterCodes.a && array.charCodeAt(startIndex + 3) === CharacterCodes.s && array.charCodeAt(startIndex + 4) === CharacterCodes.s) ? SyntaxKind.ClassKeyword : SyntaxKind.IdentifierName;
                    case CharacterCodes.o:
                        // const
                        return (array.charCodeAt(startIndex + 2) === CharacterCodes.n && array.charCodeAt(startIndex + 3) === CharacterCodes.s && array.charCodeAt(startIndex + 4) === CharacterCodes.t) ? SyntaxKind.ConstKeyword : SyntaxKind.IdentifierName;
                    default:
                        return SyntaxKind.IdentifierName;
                    }

                case CharacterCodes.f:
                    // false
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.a && array.charCodeAt(startIndex + 2) === CharacterCodes.l && array.charCodeAt(startIndex + 3) === CharacterCodes.s && array.charCodeAt(startIndex + 4) === CharacterCodes.e) ? SyntaxKind.FalseKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.t:
                    // throw
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.h && array.charCodeAt(startIndex + 2) === CharacterCodes.r && array.charCodeAt(startIndex + 3) === CharacterCodes.o && array.charCodeAt(startIndex + 4) === CharacterCodes.w) ? SyntaxKind.ThrowKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.w:
                    // while
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.h && array.charCodeAt(startIndex + 2) === CharacterCodes.i && array.charCodeAt(startIndex + 3) === CharacterCodes.l && array.charCodeAt(startIndex + 4) === CharacterCodes.e) ? SyntaxKind.WhileKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.s:
                    // super
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.u && array.charCodeAt(startIndex + 2) === CharacterCodes.p && array.charCodeAt(startIndex + 3) === CharacterCodes.e && array.charCodeAt(startIndex + 4) === CharacterCodes.r) ? SyntaxKind.SuperKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.y:
                    // yield
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.i && array.charCodeAt(startIndex + 2) === CharacterCodes.e && array.charCodeAt(startIndex + 3) === CharacterCodes.l && array.charCodeAt(startIndex + 4) === CharacterCodes.d) ? SyntaxKind.YieldKeyword : SyntaxKind.IdentifierName;
                default:
                    return SyntaxKind.IdentifierName;
                }

            case 6:
                // delete, return, switch, typeof, export, import, public, static, module, number, string
                switch(array.charCodeAt(startIndex)) {
                case CharacterCodes.d:
                    // delete
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.e && array.charCodeAt(startIndex + 2) === CharacterCodes.l && array.charCodeAt(startIndex + 3) === CharacterCodes.e && array.charCodeAt(startIndex + 4) === CharacterCodes.t && array.charCodeAt(startIndex + 5) === CharacterCodes.e) ? SyntaxKind.DeleteKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.r:
                    // return
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.e && array.charCodeAt(startIndex + 2) === CharacterCodes.t && array.charCodeAt(startIndex + 3) === CharacterCodes.u && array.charCodeAt(startIndex + 4) === CharacterCodes.r && array.charCodeAt(startIndex + 5) === CharacterCodes.n) ? SyntaxKind.ReturnKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.s:
                    // switch, static, string
                    switch(array.charCodeAt(startIndex + 1)) {
                    case CharacterCodes.w:
                        // switch
                        return (array.charCodeAt(startIndex + 2) === CharacterCodes.i && array.charCodeAt(startIndex + 3) === CharacterCodes.t && array.charCodeAt(startIndex + 4) === CharacterCodes.c && array.charCodeAt(startIndex + 5) === CharacterCodes.h) ? SyntaxKind.SwitchKeyword : SyntaxKind.IdentifierName;
                    case CharacterCodes.t:
                        // static, string
                        switch(array.charCodeAt(startIndex + 2)) {
                        case CharacterCodes.a:
                            // static
                            return (array.charCodeAt(startIndex + 3) === CharacterCodes.t && array.charCodeAt(startIndex + 4) === CharacterCodes.i && array.charCodeAt(startIndex + 5) === CharacterCodes.c) ? SyntaxKind.StaticKeyword : SyntaxKind.IdentifierName;
                        case CharacterCodes.r:
                            // string
                            return (array.charCodeAt(startIndex + 3) === CharacterCodes.i && array.charCodeAt(startIndex + 4) === CharacterCodes.n && array.charCodeAt(startIndex + 5) === CharacterCodes.g) ? SyntaxKind.StringKeyword : SyntaxKind.IdentifierName;
                        default:
                            return SyntaxKind.IdentifierName;
                        }

                    default:
                        return SyntaxKind.IdentifierName;
                    }

                case CharacterCodes.t:
                    // typeof
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.y && array.charCodeAt(startIndex + 2) === CharacterCodes.p && array.charCodeAt(startIndex + 3) === CharacterCodes.e && array.charCodeAt(startIndex + 4) === CharacterCodes.o && array.charCodeAt(startIndex + 5) === CharacterCodes.f) ? SyntaxKind.TypeOfKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.e:
                    // export
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.x && array.charCodeAt(startIndex + 2) === CharacterCodes.p && array.charCodeAt(startIndex + 3) === CharacterCodes.o && array.charCodeAt(startIndex + 4) === CharacterCodes.r && array.charCodeAt(startIndex + 5) === CharacterCodes.t) ? SyntaxKind.ExportKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.i:
                    // import
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.m && array.charCodeAt(startIndex + 2) === CharacterCodes.p && array.charCodeAt(startIndex + 3) === CharacterCodes.o && array.charCodeAt(startIndex + 4) === CharacterCodes.r && array.charCodeAt(startIndex + 5) === CharacterCodes.t) ? SyntaxKind.ImportKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.p:
                    // public
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.u && array.charCodeAt(startIndex + 2) === CharacterCodes.b && array.charCodeAt(startIndex + 3) === CharacterCodes.l && array.charCodeAt(startIndex + 4) === CharacterCodes.i && array.charCodeAt(startIndex + 5) === CharacterCodes.c) ? SyntaxKind.PublicKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.m:
                    // module
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.o && array.charCodeAt(startIndex + 2) === CharacterCodes.d && array.charCodeAt(startIndex + 3) === CharacterCodes.u && array.charCodeAt(startIndex + 4) === CharacterCodes.l && array.charCodeAt(startIndex + 5) === CharacterCodes.e) ? SyntaxKind.ModuleKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.n:
                    // number
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.u && array.charCodeAt(startIndex + 2) === CharacterCodes.m && array.charCodeAt(startIndex + 3) === CharacterCodes.b && array.charCodeAt(startIndex + 4) === CharacterCodes.e && array.charCodeAt(startIndex + 5) === CharacterCodes.r) ? SyntaxKind.NumberKeyword : SyntaxKind.IdentifierName;
                default:
                    return SyntaxKind.IdentifierName;
                }

            case 7:
                // default, finally, extends, package, private, boolean, declare, require
                switch(array.charCodeAt(startIndex)) {
                case CharacterCodes.d:
                    // default, declare
                    switch(array.charCodeAt(startIndex + 1)) {
                    case CharacterCodes.e:
                        // default, declare
                        switch(array.charCodeAt(startIndex + 2)) {
                        case CharacterCodes.f:
                            // default
                            return (array.charCodeAt(startIndex + 3) === CharacterCodes.a && array.charCodeAt(startIndex + 4) === CharacterCodes.u && array.charCodeAt(startIndex + 5) === CharacterCodes.l && array.charCodeAt(startIndex + 6) === CharacterCodes.t) ? SyntaxKind.DefaultKeyword : SyntaxKind.IdentifierName;
                        case CharacterCodes.c:
                            // declare
                            return (array.charCodeAt(startIndex + 3) === CharacterCodes.l && array.charCodeAt(startIndex + 4) === CharacterCodes.a && array.charCodeAt(startIndex + 5) === CharacterCodes.r && array.charCodeAt(startIndex + 6) === CharacterCodes.e) ? SyntaxKind.DeclareKeyword : SyntaxKind.IdentifierName;
                        default:
                            return SyntaxKind.IdentifierName;
                        }

                    default:
                        return SyntaxKind.IdentifierName;
                    }

                case CharacterCodes.f:
                    // finally
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.i && array.charCodeAt(startIndex + 2) === CharacterCodes.n && array.charCodeAt(startIndex + 3) === CharacterCodes.a && array.charCodeAt(startIndex + 4) === CharacterCodes.l && array.charCodeAt(startIndex + 5) === CharacterCodes.l && array.charCodeAt(startIndex + 6) === CharacterCodes.y) ? SyntaxKind.FinallyKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.e:
                    // extends
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.x && array.charCodeAt(startIndex + 2) === CharacterCodes.t && array.charCodeAt(startIndex + 3) === CharacterCodes.e && array.charCodeAt(startIndex + 4) === CharacterCodes.n && array.charCodeAt(startIndex + 5) === CharacterCodes.d && array.charCodeAt(startIndex + 6) === CharacterCodes.s) ? SyntaxKind.ExtendsKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.p:
                    // package, private
                    switch(array.charCodeAt(startIndex + 1)) {
                    case CharacterCodes.a:
                        // package
                        return (array.charCodeAt(startIndex + 2) === CharacterCodes.c && array.charCodeAt(startIndex + 3) === CharacterCodes.k && array.charCodeAt(startIndex + 4) === CharacterCodes.a && array.charCodeAt(startIndex + 5) === CharacterCodes.g && array.charCodeAt(startIndex + 6) === CharacterCodes.e) ? SyntaxKind.PackageKeyword : SyntaxKind.IdentifierName;
                    case CharacterCodes.r:
                        // private
                        return (array.charCodeAt(startIndex + 2) === CharacterCodes.i && array.charCodeAt(startIndex + 3) === CharacterCodes.v && array.charCodeAt(startIndex + 4) === CharacterCodes.a && array.charCodeAt(startIndex + 5) === CharacterCodes.t && array.charCodeAt(startIndex + 6) === CharacterCodes.e) ? SyntaxKind.PrivateKeyword : SyntaxKind.IdentifierName;
                    default:
                        return SyntaxKind.IdentifierName;
                    }

                case CharacterCodes.b:
                    // boolean
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.o && array.charCodeAt(startIndex + 2) === CharacterCodes.o && array.charCodeAt(startIndex + 3) === CharacterCodes.l && array.charCodeAt(startIndex + 4) === CharacterCodes.e && array.charCodeAt(startIndex + 5) === CharacterCodes.a && array.charCodeAt(startIndex + 6) === CharacterCodes.n) ? SyntaxKind.BooleanKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.r:
                    // require
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.e && array.charCodeAt(startIndex + 2) === CharacterCodes.q && array.charCodeAt(startIndex + 3) === CharacterCodes.u && array.charCodeAt(startIndex + 4) === CharacterCodes.i && array.charCodeAt(startIndex + 5) === CharacterCodes.r && array.charCodeAt(startIndex + 6) === CharacterCodes.e) ? SyntaxKind.RequireKeyword : SyntaxKind.IdentifierName;
                default:
                    return SyntaxKind.IdentifierName;
                }

            case 8:
                // continue, debugger, function
                switch(array.charCodeAt(startIndex)) {
                case CharacterCodes.c:
                    // continue
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.o && array.charCodeAt(startIndex + 2) === CharacterCodes.n && array.charCodeAt(startIndex + 3) === CharacterCodes.t && array.charCodeAt(startIndex + 4) === CharacterCodes.i && array.charCodeAt(startIndex + 5) === CharacterCodes.n && array.charCodeAt(startIndex + 6) === CharacterCodes.u && array.charCodeAt(startIndex + 7) === CharacterCodes.e) ? SyntaxKind.ContinueKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.d:
                    // debugger
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.e && array.charCodeAt(startIndex + 2) === CharacterCodes.b && array.charCodeAt(startIndex + 3) === CharacterCodes.u && array.charCodeAt(startIndex + 4) === CharacterCodes.g && array.charCodeAt(startIndex + 5) === CharacterCodes.g && array.charCodeAt(startIndex + 6) === CharacterCodes.e && array.charCodeAt(startIndex + 7) === CharacterCodes.r) ? SyntaxKind.DebuggerKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.f:
                    // function
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.u && array.charCodeAt(startIndex + 2) === CharacterCodes.n && array.charCodeAt(startIndex + 3) === CharacterCodes.c && array.charCodeAt(startIndex + 4) === CharacterCodes.t && array.charCodeAt(startIndex + 5) === CharacterCodes.i && array.charCodeAt(startIndex + 6) === CharacterCodes.o && array.charCodeAt(startIndex + 7) === CharacterCodes.n) ? SyntaxKind.FunctionKeyword : SyntaxKind.IdentifierName;
                default:
                    return SyntaxKind.IdentifierName;
                }

            case 9:
                // interface, protected
                switch(array.charCodeAt(startIndex)) {
                case CharacterCodes.i:
                    // interface
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.n && array.charCodeAt(startIndex + 2) === CharacterCodes.t && array.charCodeAt(startIndex + 3) === CharacterCodes.e && array.charCodeAt(startIndex + 4) === CharacterCodes.r && array.charCodeAt(startIndex + 5) === CharacterCodes.f && array.charCodeAt(startIndex + 6) === CharacterCodes.a && array.charCodeAt(startIndex + 7) === CharacterCodes.c && array.charCodeAt(startIndex + 8) === CharacterCodes.e) ? SyntaxKind.InterfaceKeyword : SyntaxKind.IdentifierName;
                case CharacterCodes.p:
                    // protected
                    return (array.charCodeAt(startIndex + 1) === CharacterCodes.r && array.charCodeAt(startIndex + 2) === CharacterCodes.o && array.charCodeAt(startIndex + 3) === CharacterCodes.t && array.charCodeAt(startIndex + 4) === CharacterCodes.e && array.charCodeAt(startIndex + 5) === CharacterCodes.c && array.charCodeAt(startIndex + 6) === CharacterCodes.t && array.charCodeAt(startIndex + 7) === CharacterCodes.e && array.charCodeAt(startIndex + 8) === CharacterCodes.d) ? SyntaxKind.ProtectedKeyword : SyntaxKind.IdentifierName;
                default:
                    return SyntaxKind.IdentifierName;
                }

            case 10:
                // instanceof, implements
                switch(array.charCodeAt(startIndex)) {
                case CharacterCodes.i:
                    // instanceof, implements
                    switch(array.charCodeAt(startIndex + 1)) {
                    case CharacterCodes.n:
                        // instanceof
                        return (array.charCodeAt(startIndex + 2) === CharacterCodes.s && array.charCodeAt(startIndex + 3) === CharacterCodes.t && array.charCodeAt(startIndex + 4) === CharacterCodes.a && array.charCodeAt(startIndex + 5) === CharacterCodes.n && array.charCodeAt(startIndex + 6) === CharacterCodes.c && array.charCodeAt(startIndex + 7) === CharacterCodes.e && array.charCodeAt(startIndex + 8) === CharacterCodes.o && array.charCodeAt(startIndex + 9) === CharacterCodes.f) ? SyntaxKind.InstanceOfKeyword : SyntaxKind.IdentifierName;
                    case CharacterCodes.m:
                        // implements
                        return (array.charCodeAt(startIndex + 2) === CharacterCodes.p && array.charCodeAt(startIndex + 3) === CharacterCodes.l && array.charCodeAt(startIndex + 4) === CharacterCodes.e && array.charCodeAt(startIndex + 5) === CharacterCodes.m && array.charCodeAt(startIndex + 6) === CharacterCodes.e && array.charCodeAt(startIndex + 7) === CharacterCodes.n && array.charCodeAt(startIndex + 8) === CharacterCodes.t && array.charCodeAt(startIndex + 9) === CharacterCodes.s) ? SyntaxKind.ImplementsKeyword : SyntaxKind.IdentifierName;
                    default:
                        return SyntaxKind.IdentifierName;
                    }

                default:
                    return SyntaxKind.IdentifierName;
                }

            case 11:
                // constructor
                return (array.charCodeAt(startIndex) === CharacterCodes.c && array.charCodeAt(startIndex + 1) === CharacterCodes.o && array.charCodeAt(startIndex + 2) === CharacterCodes.n && array.charCodeAt(startIndex + 3) === CharacterCodes.s && array.charCodeAt(startIndex + 4) === CharacterCodes.t && array.charCodeAt(startIndex + 5) === CharacterCodes.r && array.charCodeAt(startIndex + 6) === CharacterCodes.u && array.charCodeAt(startIndex + 7) === CharacterCodes.c && array.charCodeAt(startIndex + 8) === CharacterCodes.t && array.charCodeAt(startIndex + 9) === CharacterCodes.o && array.charCodeAt(startIndex + 10) === CharacterCodes.r) ? SyntaxKind.ConstructorKeyword : SyntaxKind.IdentifierName;
            default:
                return SyntaxKind.IdentifierName;
            }
        }
    }
}