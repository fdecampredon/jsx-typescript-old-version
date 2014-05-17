///<reference path='references.ts' />

/**
 * Represents an immutable snapshot of text.
 */
module TypeScript {
    export interface ISimpleText {
        /**
         * Total number of characters in the text source.
         */
        length(): number;

        substr(start: number, length: number): string;

        charCodeAt(index: number): number;
        lineMap(): LineMap;
    }

    /**
     * Represents an immutable snapshot of text.
     */
    export interface IText extends ISimpleText {
        /**
         * Total number of lines in the text.
         */
        lineCount(): number;

        /**
         * Returns the collection of line information for the IText instance.
         */
        lines(): ITextLine[];

        /**
         * Return the char at position in the IText.
         */
        charCodeAt(position: number): number;

        /**
         * Gets the line corresponding to the provided line number.
         */
        getLineFromLineNumber(lineNumber: number): ITextLine;

        /**
         * Gets the line which encompasses the provided position.
         */
        getLineFromPosition(position: number): ITextLine;

        /**
         * Gets the number of the line that contains the character at the specified position.
         */
        getLineNumberFromPosition(position: number): number;

        /**
         * Gets a line number, and position within that line, for the character at the 
         * specified position
         */
        getLinePosition(position: number): LineAndCharacter;

        /**
         * Returns a string representation of the contents of this IText within the given span.
         */
        toString(span?: TextSpan): string;
    }
}