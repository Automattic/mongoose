import type { Expression } from 'mongoose';
import { expectError, expectType } from 'tsd';

const abs1: Expression = { $abs: '$date' };
const abs2: Expression = { $abs: { $add: ['$price', '$fee'] } };

const add1: Expression = { $add: ['$date', 3 * 24 * 60 * 60000] };
const add2: Expression = { $add: ['$price', '$fee'] };

const subtract1: Expression = { $subtract: ['$date', 3 * 24 * 60 * 60000] };
const subtract2: Expression = { $subtract: ['$price', '$fee'] };

