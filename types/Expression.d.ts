declare module 'mongoose' {

    /**
     * [Expressions reference](https://docs.mongodb.com/manual/meta/aggregation-quick-reference/#expressions)
     */
    type AggregationVariables =
        '$$NOW' |
        '$$CLUSTER_TIME' |
        '$$ROOT' |
        '$$CURRENT' |
        '$$REMOVE' |
        '$$DESCEND' |
        '$$PRUNE' |
        '$$KEEP';

    type Path = string;

    type NumberExpression = Path | ArithmeticExpressionOperators | DateExpressionOperators;

    export namespace Expression {
        export interface Abs {
            /**
             * Returns the absolute value of a number.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/abs/#mongodb-expression-exp.-abs
             */
            $abs: Path | ArithmeticExpressionOperators;
        }

        export interface Add {
            /**
             * Adds numbers to return the sum, or adds numbers and a date to return a new date. If adding numbers and a date, treats the numbers as milliseconds. Accepts any number of argument expressions, but at most, one expression can resolve to a date.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/add/#mongodb-expression-exp.-add
             */
            $add: NumberExpression[];
        }

        export interface Ceil {
            /**
             * Returns the smallest integer greater than or equal to the specified number.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/ceil/#mongodb-expression-exp.-ceil
             */
            $ceil: NumberExpression;
        }

        export interface Divide {
            /**
             * Returns the result of dividing the first number by the second. Accepts two argument expressions.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/divide/#mongodb-expression-exp.-divide
             */
            $divide: NumberExpression[];
        }

        export interface Exp {
            /**
             * Raises e to the specified exponent.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/exp/#mongodb-expression-exp.-exp
             */
            $exp: NumberExpression;
        }

        export interface Floor {
            /**
             * Returns the largest integer less than or equal to the specified number.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/floor/#mongodb-expression-exp.-floor
             */
            $floor: NumberExpression;
        }

        export interface Ln {
            /**
             * Calculates the natural log of a number.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/ln/#mongodb-expression-exp.-ln
             */
            $ln: NumberExpression;
        }

        export interface Log {
            /**
             * Calculates the log of a number in the specified base.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/log/#mongodb-expression-exp.-log
             */
            $log: [NumberExpression, NumberExpression];
        }

        export interface Log10 {
            /**
             * Calculates the log base 10 of a number.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/log10/#mongodb-expression-exp.-log10
             */
            $log10: NumberExpression;
        }

        export interface Mod {
            /**
             * Returns the remainder of the first number divided by the second. Accepts two argument expressions.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/mod/#mongodb-expression-exp.-mod
             */
            $mod: [NumberExpression, NumberExpression];
        }
        export interface Multiply {
            /**
             * Multiplies numbers to return the product. Accepts any number of argument expressions.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/multiply/#mongodb-expression-exp.-multiply
             */
            $multiply: NumberExpression[];
        }

        export interface Pow {
            /**
             * Raises a number to the specified exponent.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/pow/#mongodb-expression-exp.-pow
             */
            $pow: [NumberExpression, NumberExpression];
        }

        export interface Round {
            /**
             * Rounds a number to to a whole integer or to a specified decimal place.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/round/#mongodb-expression-exp.-round
             */
            $round: [NumberExpression, NumberExpression?];
        }

        export interface Sqrt {
            /**
             * Calculates the square root.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/sqrt/#mongodb-expression-exp.-sqrt
             */
            $sqrt: NumberExpression;
        }

        export interface Subtract {
            /**
             * Returns the result of subtracting the second value from the first. If the two values are numbers, return the difference. If the two values are dates, return the difference in milliseconds. If the two values are a date and a number in milliseconds, return the resulting date. Accepts two argument expressions. If the two values are a date and a number, specify the date argument first as it is not meaningful to subtract a date from a number.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/subtract/#mongodb-expression-exp.-subtract
             */
            $subtract: NumberExpression[];
        }

        export interface Trunc {
            /**
             * Truncates a number to a whole integer or to a specified decimal place.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/trunc/#mongodb-expression-exp.-trunc
             */
            $trunc: [NumberExpression, NumberExpression?];
        }

        export interface Meta {
            /**
             * Access available per-document metadata related to the aggregation operation.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/meta/#mongodb-expression-exp.-meta
             */
            $meta: 'textScore' | 'indexKey';
        }

        export interface DateAdd {
            /**
             * Adds a number of time units to a date object.
             *
             * @version 5.0.0
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/dateAdd/#mongodb-expression-exp.-dateAdd
             */
            $dateAdd: {
                startDate: Types.ObjectId | Date;
                unit: DateUnit;
                endDate: Types.ObjectId | Date;
                timezone?: Path;
            };
        }
    }
    export type Expression = ArithmeticExpressionOperators | DateExpressionOperators | TextExpressionOperators;

    export type ArithmeticExpressionOperators =
        number |
        Expression.Abs |
        Expression.Add |
        Expression.Ceil |
        Expression.Divide |
        Expression.Exp |
        Expression.Floor |
        Expression.Ln |
        Expression.Log |
        Expression.Log10 |
        Expression.Mod |
        Expression.Multiply |
        Expression.Pow |
        Expression.Round |
        Expression.Sqrt |
        Expression.Subtract |
        Expression.Trunc;

    export type TextExpressionOperators = 
        Expression.Meta;

    type DateUnit = 'year' | 'quarter' | 'week' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond';
    export type DateExpressionOperators = Expression.DateAdd;
}
