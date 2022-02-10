import { OlsonTimezoneCode } from './OlsonTimezoneCode';

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
            $abs: Path | ArithmeticExpressionOperator;
        }

        export interface Add {
            /**
             * Adds numbers to return the sum, or adds numbers and a date to return a new date. If adding numbers and a date, treats the numbers as milliseconds. Accepts any number of argument expressions, but at most, one expression can resolve to a date.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/add/#mongodb-expression-exp.-add
             */
            $add: (NumberExpression | DateExpression)[];
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
            $subtract: (NumberExpression | DateExpression)[];
        }

        export interface Trunc {
            /**
             * Truncates a number to a whole integer or to a specified decimal place.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/trunc/#mongodb-expression-exp.-trunc
             */
            $trunc: [NumberExpression, NumberExpression?];
        }

        export interface Sin {
            /**
             * Returns the sine of a value that is measured in radians.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/sin/#mongodb-expression-exp.-sin
             */
            $sin: NumberExpression;
        }

        export interface Cos {
            /**
             * Returns the cosine of a value that is measured in radians.
             *
             * @version 4.2
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/cos/#mongodb-expression-exp.-cos
             */
            $cos: NumberExpression;
        }

        export interface Tan {
            /**
             * Returns the tangent of a value that is measured in radians.
             *
             * @version 4.2
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/tan/#mongodb-expression-exp.-tan
             */
            $tan: NumberExpression;
        }

        export interface Asin {
            /**
             * Returns the inverse sin (arc sine) of a value in radians.
             *
             * @version 4.2
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/asin/#mongodb-expression-exp.-asin
             */
            $asin: NumberExpression;
        }

        export interface Acos {
            /**
             * Returns the inverse cosine (arc cosine) of a value in radians.
             *
             * @version 4.2
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/acos/#mongodb-expression-exp.-acos
             */
            $acos: NumberExpression;
        }

        export interface Atan {
            /**
             * Returns the inverse tangent (arc tangent) of a value in radians.
             *
             * @version 4.2
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/atan/#mongodb-expression-exp.-atan
             */
            $atan: NumberExpression;
        }

        export interface Atan2 {
            /**
             * Returns the inverse tangent (arc tangent) of y / x in radians, where y and x are the first and second values passed to the expression respectively.
             *
             * @version 4.2
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/atan2/#mongodb-expression-exp.-atan2
             */
            $atan2: NumberExpression;
        }

        export interface Asinh {
            /**
             * Returns the inverse hyperbolic sine (hyperbolic arc sine) of a value in radians.
             *
             * @version 4.2
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/asinh/#mongodb-expression-exp.-asinh
             */
            $asinh: NumberExpression;
        }

        export interface Acosh {
            /**
             * Returns the inverse hyperbolic cosine (hyperbolic arc cosine) of a value in radians.
             *
             * @version 4.2
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/acosh/#mongodb-expression-exp.-acosh
             */
            $acosh: NumberExpression;
        }

        export interface Atanh {

            /**
             * Returns the inverse hyperbolic tangent (hyperbolic arc tangent) of a value in radians.
             *
             * @version 4.2
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/atanh/#mongodb-expression-exp.-atanh
             */
            $atanh: NumberExpression;
        }

        export interface Sinh {
            /**
             * Returns the hyperbolic sine of a value that is measured in radians.
             *
             * @version 4.2
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/sinh/#mongodb-expression-exp.-sinh
             */
            $sinh: NumberExpression;
        }

        export interface Cosh {
            /**
             * Returns the hyperbolic cosine of a value that is measured in radians.
             *
             * @version 4.2
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/cosh/#mongodb-expression-exp.-cosh
             */
            $cosh: NumberExpression;
        }

        export interface Tanh {
            /**
             * Returns the hyperbolic tangent of a value that is measured in radians.
             *
             * @version 4.2
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/tanh/#mongodb-expression-exp.-tanh
             */
            $tanh: NumberExpression;
        }

        export interface DegreesToRadians {
            /**
             * Converts a value from degrees to radians.
             *
             * @version 4.2
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/degreesToRadians/#mongodb-expression-exp.-degreesToRadians
             */
            $degreesToRadians: NumberExpression;
        }

        export interface RadiansToDegrees {
            /**
             * Converts a value from radians to degrees.
             *
             * @version 4.2
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/radiansToDegrees/#mongodb-expression-exp.-radiansToDegrees
             */
            $radiansToDegrees: NumberExpression;
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
                /**
                 * The beginning date, in UTC, for the addition operation. The startDate can be any expression that resolves to a Date, a Timestamp, or an ObjectID.
                 */
                startDate: DateExpression;
                /**
                 * The unit used to measure the amount of time added to the startDate. The unit is an expression that resolves to one of the following strings:
                 * - year
                 * - quarter
                 * - week
                 * - month
                 * - day
                 * - hour
                 * - minute
                 * - second
                 * - millisecond
                 */
                unit: StringExpression<DateUnit>;
                /**
                 * The number of units added to the startDate. The amount is an expression that resolves to an integer or long. The amount can also resolve to an integral decimal or a double if that value can be converted to a long without loss of precision.
                 */
                amount: NumberExpression;
                /**
                 * The timezone to carry out the operation. <tzExpression> must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
                 */
                timezone?: tzExpression;
            };
        }

        export interface DateDiff {
            /**
             * Returns the difference between two dates.
             *
             * @version 5.0
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/dateDiff/#mongodb-expression-exp.-dateDiff
             */
            $dateDiff: {
                /**
                 * The start of the time period. The startDate can be any expression that resolves to a Date, a Timestamp, or an ObjectID.
                 */
                startDate: DateExpression;
                /**
                 * The end of the time period. The endDate can be any expression that resolves to a Date, a Timestamp, or an ObjectID.
                 */
                endDate: DateExpression;
                /**
                 * The time measurement unit between the startDate and endDate. It is an expression that resolves to a string:
                 * - year
                 * - quarter
                 * - week
                 * - month
                 * - day
                 * - hour
                 * - minute
                 * - second
                 * - millisecond
                 */
                unit: StringExpression<DateUnit>;
                /**
                 * The timezone to carry out the operation. <tzExpression> must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
                 */
                timezone?: tzExpression;
                /**
                 * Used when the unit is equal to week. Defaults to Sunday. The startOfWeek parameter is an expression that resolves to a case insensitive string:
                 * - monday (or mon)
                 * - tuesday (or tue)
                 * - wednesday (or wed)
                 * - thursday (or thu)
                 * - friday (or fri)
                 * - saturday (or sat)
                 * - sunday (or sun)
                 */
                startOfWeek?: StringExpression<StartOfWeek>;
            }
        }

        export interface DateFromParts {
            /**
             * Constructs a BSON Date object given the date's constituent parts.
             *
             * @version 3.6
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/dateFromParts/#mongodb-expression-exp.-dateFromParts
             */
            $dateFromParts: {

                /**
                 * The timezone to carry out the operation. <tzExpression> must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
                 */
                timezone?: tzExpression;
            };
        }

        export interface DateFromString {
            /**
             * Converts a date/time string to a date object.
             *
             * @version 3.6
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/dateFromString/#mongodb-expression-exp.-dateFromString
             */
            $dateFromString: {
                dateString: StringExpression<string>;
                /**
                 * The date format specification of the dateString. The format can be any expression that evaluates to a string literal, containing 0 or more format specifiers. For a list of specifiers available, see Format Specifiers.
                 *
                 * If unspecified, $dateFromString uses "%Y-%m-%dT%H:%M:%S.%LZ" as the default format.
                 * @version 4.0
                 */
                format?: FormatString;
                /**
                 * The time zone to use to format the date.
                 *
                 * Note: If the dateString argument is formatted like '2017-02-08T12:10:40.787Z', in which the 'Z' at the end indicates Zulu time (UTC time zone), you cannot specify the timezone argument.
                 */
                timezone?: tzExpression;
                /**
                 * Optional. If $dateFromString encounters an error while parsing the given dateString, it outputs the result value of the provided onError expression. This result value can be of any type.
                 *
                 * If you do not specify onError, $dateFromString throws an error if it cannot parse dateString.
                 */
                onError?: Expression;
                /**
                 * Optional. If the dateString provided to $dateFromString is null or missing, it outputs the result value of the provided onNull expression. This result value can be of any type.
                 *
                 * If you do not specify onNull and dateString is null or missing, then $dateFromString outputs null.
                 */
                onNull?: Expression;
            };
        }

        export interface DateSubtract {
            /**
             * Subtracts a number of time units from a date object.
             *
             * @version 5.0
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/dateSubtract/#mongodb-expression-exp.-dateSubtract
             */
            $dateSubtract: {
                /**
                 * The beginning date, in UTC, for the subtraction operation. The startDate can be any expression that resolves to a Date, a Timestamp, or an ObjectID.
                 */
                startDate: DateExpression;
                /**
                 * The unit of time, specified as an expression that must resolve to one of these strings:
                 * - year
                 * - quarter
                 * - week
                 * - month
                 * - day
                 * - hour
                 * - minute
                 * - second
                 * - millisecond
                 *
                 * Together, binSize and unit specify the time period used in the $dateTrunc calculation.
                 */
                unit: StringExpression<DateUnit>;
                /**
                 * The number of units subtracted from the startDate. The amount is an expression that resolves to an integer or long. The amount can also resolve to an integral decimal and or a double if that value can be converted to a long without loss of precision.
                 */
                amount: NumberExpression;
                /**
                 * The timezone to carry out the operation. <tzExpression> must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
                 */
                timezone?: tzExpression;
            };
        }

        export interface DateToParts {
            /**
             * Returns a document containing the constituent parts of a date.
             *
             * @version 3.6
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/dateToParts/#mongodb-expression-exp.-dateToParts
             */
            $dateToParts: {
                /**
                 * The input date for which to return parts. <dateExpression> can be any expression that resolves to a Date, a Timestamp, or an ObjectID. For more information on expressions, see Expressions.
                 */
                date : DateExpression;
                /**
                 * The timezone of the operation result. <tzExpression> must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
                 *
                 * @version 3.6
                 */
                timezone?: tzExpression;
                /**
                 * If set to true, modifies the output document to use ISO week date fields. Defaults to false.
                 */
                iso8601?: boolean;
            };
        }

        export interface DateToString {
            /**
             * Returns the date as a formatted string.
             *
             * @version 3.6
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/dateToString/#mongodb-expression-exp.-dateToString
             */
            $dateToString: {
                /**
                 * The date to convert to string. <dateExpression> must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
                 */
                date: DateExpression;
                /**
                 * The date format specification. <formatString> can be any string literal, containing 0 or more format specifiers. For a list of specifiers available, see Format Specifiers.
                 *
                 * If unspecified, $dateToString uses "%Y-%m-%dT%H:%M:%S.%LZ" as the default format.
                 *
                 * Changed in version 4.0: The format field is optional if featureCompatibilityVersion (fCV) is set to "4.0" or greater. For more information on fCV, see setFeatureCompatibilityVersion.
                 */
                format?: FormatString;
                /**
                 * The timezone of the operation result. <tzExpression> must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
                 *
                 * @version 3.6
                 */
                timezone?: tzExpression;
                /**
                 * The value to return if the date is null or missing. The arguments can be any valid expression.
                 *
                 * If unspecified, $dateToString returns null if the date is null or missing.
                 *
                 * Changed in version 4.0: Requires featureCompatibilityVersion (fCV) set to "4.0" or greater. For more information on fCV, see setFeatureCompatibilityVersion.
                 */
                onNull?: Expression;
            };
        }

        export interface DateTrunc {
            /**
             * Truncates a date.
             *
             * @version 5.0
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/dateTrunc/#mongodb-expression-exp.-dateTrunc
             */
            $dateTrunc: {
                /**
                 * The date to truncate, specified in UTC. The date can be any expression that resolves to a Date, a Timestamp, or an ObjectID.
                 */
                date: DateExpression;
                /**
                 * The unit of time, specified as an expression that must resolve to one of these strings:
                 * - year
                 * - quarter
                 * - week
                 * - month
                 * - day
                 * - hour
                 * - minute
                 * - second
                 * - millisecond
                 *
                 * Together, binSize and unit specify the time period used in the $dateTrunc calculation.
                 */
                unit: StringExpression<DateUnit>;
                /**
                 * The numeric time value, specified as an expression that must resolve to a positive non-zero number. Defaults to 1.
                 *
                 * Together, binSize and unit specify the time period used in the $dateTrunc calculation.
                 */
                binSize?: NumberExpression;
                /**
                 * The timezone of the operation result. <tzExpression> must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
                 */
                timezone?: tzExpression;
                /**
                 * Used when the unit is equal to week. Defaults to Sunday. The startOfWeek parameter is an expression that resolves to a case insensitive string:
                 * - monday (or mon)
                 * - tuesday (or tue)
                 * - wednesday (or wed)
                 * - thursday (or thu)
                 * - friday (or fri)
                 * - saturday (or sat)
                 * - sunday (or sun)
                 */
                startOfWeek?: StringExpression<StartOfWeek>;
            }
        }

        export interface DayOfMonth {
            /**
             * Returns the day of the month for a date as a number between 1 and 31.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/dayOfMonth/#mongodb-expression-exp.-dayOfMonth
             */
            $dayOfMonth: DateExpression | {
                /**
                 * The date to which the operator is applied. <dateExpression> must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
                 */
                date: DateExpression;
                /**
                 * The timezone of the operation result. <tzExpression> must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
                 */
                timezone?: tzExpression;
            };
        }

        export interface DayOfWeek {
            /**
             * Returns the day of the week for a date as a number between 1 (Sunday) and 7 (Saturday).
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/dayOfWeek/#mongodb-expression-exp.-dayOfWeek
             */
            $dayOfWeek: DateExpression | {
                /**
                 * The date to which the operator is applied. <dateExpression> must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
                 */
                date: DateExpression;
                /**
                 * The timezone of the operation result. <tzExpression> must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
                 */
                timezone?: tzExpression;
            };
        }

        export interface DayOfYear {
            /**
             * Returns the day of the year for a date as a number between 1 and 366 (leap year).
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/dayOfYear/#mongodb-expression-exp.-dayOfYear
             */
            $dayOfYear: DateExpression | {
                /**
                 * The date to which the operator is applied. <dateExpression> must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
                 */
                date: DateExpression;
                /**
                 * The timezone of the operation result. <tzExpression> must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
                 */
                timezone?: tzExpression;
            };
        }

        export interface Hour {
            /**
             * Returns the hour for a date as a number between 0 and 23.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/hour/#mongodb-expression-exp.-hour
             */
            $hour: DateExpression | {
                /**
                 * The date to which the operator is applied. <dateExpression> must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
                 */
                date: DateExpression;
                /**
                 * The timezone of the operation result. <tzExpression> must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
                 */
                timezone?: tzExpression;
            };
        }

        export interface IsoDayOfWeek {
            /**
             * Returns the weekday number in ISO 8601 format, ranging from 1 (for Monday) to 7 (for Sunday).
             *
             * @version 3.4
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/isoDayOfWeek/#mongodb-expression-exp.-isoDayOfWeek
             */
            $isoDayOfWeek: DateExpression | {
                /**
                 * The date to which the operator is applied. <dateExpression> must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
                 */
                date: DateExpression;
                /**
                 * The timezone of the operation result. <tzExpression> must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
                 */
                timezone?: tzExpression;
            };
        }

        export interface IsoWeek {
            /**
             * Returns the week number in ISO 8601 format, ranging from 1 to 53. Week numbers start at 1 with the week (Monday through Sunday) that contains the year's first Thursday.
             *
             * @version 3.4
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/isoWeek/#mongodb-expression-exp.-isoWeek
             */
            $isoWeek: DateExpression | {
                /**
                 * The date to which the operator is applied. <dateExpression> must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
                 */
                date: DateExpression;
                /**
                 * The timezone of the operation result. <tzExpression> must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
                 */
                timezone?: tzExpression;
            };
        }

        export interface IsoWeekYear {
            /**
             * Returns the year number in ISO 8601 format. The year starts with the Monday of week 1 (ISO 8601) and ends with the Sunday of the last week (ISO 8601).
             *
             * @version 3.4
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/isoWeekYear/#mongodb-expression-exp.-isoWeekYear
             */
            $isoWeekYear: DateExpression | {
                /**
                 * The date to which the operator is applied. <dateExpression> must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
                 */
                date: DateExpression;
                /**
                 * The timezone of the operation result. <tzExpression> must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
                 */
                timezone?: tzExpression;
            };
        }

        export interface Millisecond {
            /**
             * Returns the milliseconds of a date as a number between 0 and 999.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/millisecond/#mongodb-expression-exp.-millisecond
             */
            $millisecond: DateExpression | {
                /**
                 * The date to which the operator is applied. <dateExpression> must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
                 */
                date: DateExpression;
                /**
                 * The timezone of the operation result. <tzExpression> must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
                 */
                timezone?: tzExpression;
            };
        }

        export interface Minute {
            /**
             * Returns the minute for a date as a number between 0 and 59.
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/minute/#mongodb-expression-exp.-minute
             */
            $minute: DateExpression | {
                /**
                 * The date to which the operator is applied. <dateExpression> must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
                 */
                date: DateExpression;
                /**
                 * The timezone of the operation result. <tzExpression> must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
                 */
                timezone?: tzExpression;
            };
        }

        export interface Month {
            /**
             * Returns the month for a date as a number between 1 (January) and 12 (December).
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/month/#mongodb-expression-exp.-month
             */
            $month: DateExpression | {
                /**
                 * The date to which the operator is applied. <dateExpression> must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
                 */
                date: DateExpression;
                /**
                 * The timezone of the operation result. <tzExpression> must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
                 */
                timezone?: tzExpression;
            };
        }

        export interface Second {
            /**
             * Returns the seconds for a date as a number between 0 and 60 (leap seconds).
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/second/#mongodb-expression-exp.-second
             */
            $second: DateExpression | {
                /**
                 * The date to which the operator is applied. <dateExpression> must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
                 */
                date: DateExpression;
                /**
                 * The timezone of the operation result. <tzExpression> must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
                 */
                timezone?: tzExpression;
            };
        }

        export interface ToDate {
            /**
             * Converts value to a Date.
             *
             * @version 4.0
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/toDate/#mongodb-expression-exp.-toDate
             */
            $toDate: Expression;
        }

        export interface Week {
            /**
             * Returns the week number for a date as a number between 0 (the partial week that precedes the first Sunday of the year) and 53 (leap year).
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/week/#mongodb-expression-exp.-week
             */
            $week: DateExpression | {
                /**
                 * The date to which the operator is applied. <dateExpression> must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
                 */
                date: DateExpression;
                /**
                 * The timezone of the operation result. <tzExpression> must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
                 */
                timezone?: tzExpression;
            };
        }

        export interface Year {
            /**
             * Returns the year for a date as a number (e.g. 2014).
             *
             * @see https://docs.mongodb.com/manual/reference/operator/aggregation/year/#mongodb-expression-exp.-year
             */
            $year: DateExpression | {
                /**
                 * The date to which the operator is applied. <dateExpression> must be a valid expression that resolves to a Date, a Timestamp, or an ObjectID.
                 */
                date: DateExpression;
                /**
                 * The timezone of the operation result. <tzExpression> must be a valid expression that resolves to a string formatted as either an Olson Timezone Identifier or a UTC Offset. If no timezone is provided, the result is displayed in UTC.
                 */
                timezone?: tzExpression;
            };
        }
    }

    type Path = string;

    export type Expression =
        ArithmeticExpressionOperator |
        DateExpressionOperator |
        TextExpressionOperator |
        TrigonometryExpressionOperator;

    export type NumberExpression =
        number |
        Path |
        ArithmeticExpressionOperator |
        TrigonometryExpressionOperator;

    export type StringExpression<T> =
        Path |
        DateExpressionOperatorReturningString |
        T;

    export type DateExpression =
        Path |
        NativeDate |
        DateExpressionOperatorReturningDate;

    export type ArithmeticExpressionOperator =
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

    /**
     * Trigonometry expressions perform trigonometric operations on numbers.
     * Values that represent angles are always input or output in radians.
     * Use $degreesToRadians and $radiansToDegrees to convert between degree
     * and radian measurements.
     */
    export type TrigonometryExpressionOperator =
        Expression.Sin |
        Expression.Cos |
        Expression.Tan |
        Expression.Asin |
        Expression.Acos |
        Expression.Atan |
        Expression.Atan2 |
        Expression.Asinh |
        Expression.Acosh |
        Expression.Atanh |
        Expression.Sinh |
        Expression.Cosh |
        Expression.Tanh |
        Expression.DegreesToRadians |
        Expression.RadiansToDegrees;

    export type TextExpressionOperator =
        Expression.Meta;

    export type tzExpression = UTCOffset | OlsonTimezoneCode;

    type hh = '-00' | '-01' | '-02' | '-03' | '-04' | '-05' | '-06' | '-07' | '-08' | '-09' | '-10' | '-11' | '-12' |
        '+00' | '+01' | '+02' | '+03' | '+04' | '+05' | '+06' | '+07' | '+08' | '+09' | '+10' | '+11' | '+12' | '+13' | '+14';
    type mm = '00' | '30' | '45';

    type UTCOffset = `${hh}` | `${hh}${mm}` | `${hh}:${mm}`;

    type StartOfWeek =
        'monday' | 'mon' |
        'tuesday' | 'tue' |
        'wednesday' | 'wed' |
        'thursday' | 'thu' |
        'friday' | 'fri' |
        'saturday' | 'sat' |
        'sunday' | 'sun';

    type DateUnit = 'year' | 'quarter' | 'week' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond';

    type FormatString = string;

    export type DateExpressionOperator =
        DateExpressionOperatorReturningDate |
        DateExpressionOperatorReturningNumber |
        DateExpressionOperatorReturningString |
        DateExpressionOperatorReturningObject;

    export type DateExpressionOperatorReturningObject =
        Expression.DateToParts;

    export type DateExpressionOperatorReturningNumber =
        Expression.DateDiff |
        Expression.DayOfMonth |
        Expression.DayOfWeek |
        Expression.DayOfYear |
        Expression.IsoDayOfWeek |
        Expression.IsoWeek |
        Expression.IsoWeekYear |
        Expression.Millisecond |
        Expression.Second |
        Expression.Minute |
        Expression.Hour |
        Expression.Month |
        Expression.Year;

    export type DateExpressionOperatorReturningDate =
        Expression.DateAdd |
        Expression.DateFromParts |
        Expression.DateFromString |
        Expression.DateSubtract |
        Expression.DateTrunc |
        Expression.ToDate;

    export type DateExpressionOperatorReturningString =
        Expression.DateToString;

}
