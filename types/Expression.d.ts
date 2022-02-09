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

    export namespace Expression {
        export interface Abs {
            /**
             * Returns the absolute value of a number.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/abs/#mongodb-expression-exp.-abs
             */
            $abs: string | ArithmeticExpressionOperators;
        }
        export interface Add {
            /**
             * Adds numbers to return the sum, or adds numbers and a date to return a new date. If adding numbers and a date, treats the numbers as milliseconds. Accepts any number of argument expressions, but at most, one expression can resolve to a date.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/add/#mongodb-expression-exp.-add
             */
            $add: (string | ArithmeticExpressionOperators | DateExpressionOperators)[];
        }
        export interface Subtract {
            /**
             * Returns the result of subtracting the second value from the first. If the two values are numbers, return the difference. If the two values are dates, return the difference in milliseconds. If the two values are a date and a number in milliseconds, return the resulting date. Accepts two argument expressions. If the two values are a date and a number, specify the date argument first as it is not meaningful to subtract a date from a number.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/subtract/#mongodb-expression-exp.-subtract
             */
            $subtract: (string | ArithmeticExpressionOperators | DateExpressionOperators)[];
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
                timezone?: string;
            };
        }
    }
    export type Expression = ArithmeticExpressionOperators | DateExpressionOperators;

    export type ArithmeticExpressionOperators =
        number |
        Expression.Abs |
        Expression.Add |
        Expression.Subtract;

    type DateUnit = 'year' | 'quarter' | 'week' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond';
    export type DateExpressionOperators = Expression.DateAdd;


}
