import type { Expression } from 'mongoose';
import { expectError, expectType } from 'tsd';

// ArithmeticExpressionOperators

const abs1: Expression = { $abs: '$date' };
const abs2: Expression = { $abs: { $add: ['$price', '$fee'] } };

const add1: Expression = { $add: ['$date', 3 * 24 * 60 * 60000] };
const add2: Expression = { $add: ['$price', '$fee'] };

const ceil: Expression = { $ceil: '$value' };

const divide: Expression = { $divide: ['$hours', 8] };

const exp: Expression = { $exp: '$rate' };

const floor: Expression = { $floor: '$value' };

const ln: Expression = { $ln: '$sales' };

const log: Expression = { $log: ['$positiveInt', 2] };

const log10: Expression = { $log10: '$H3O' };

const mod: Expression = { $mod: ['$hours', '$tasks'] };

const multiply1: Expression = { $multiply: ['$price', '$quantity'] };
const multiply2: Expression = { $multiply: ['$price', '$quantity', '$quantity'] };

const pow: Expression = { $pow: [{ $stdDevPop: '$scores.score' }, 2] };

const round1: Expression = { $round: ['$value'] };
const round2: Expression = { $round: ['$value', 1] };
const round3: Expression = { $round: ['$value', -1] };

const sqrt: Expression = {
  $sqrt: {
    $add: [
      { $pow: [{ $subtract: ['$p2.y', '$p1.y'] }, 2] },
      { $pow: [{ $subtract: ['$p2.x', '$p1.x'] }, 2] }
    ]
  }
};

const subtract1: Expression = { $subtract: ['$date', 3 * 24 * 60 * 60000] };
const subtract2: Expression = { $subtract: ['$price', '$fee'] };

const trunc1: Expression = { $trunc: ['$value', 1] };
const trunc2: Expression = { $trunc: ['$value'] };

// TextExpressionOperators

const meta1: Expression = { $meta: 'textScore' };
const meta2: Expression = { $meta: 'indexKey' };

// TrigonometryExpressionOperators
const tanh1: Expression = { $tanh: { $degreesToRadians: '$angle' } };

const isoWeekYear: Expression = { $isoWeekYear: { date: new Date('2017-01-02T00:00:00Z'), timezone: '-0500' } };

const millisecond1: Expression = { $millisecond: new Date('2016-01-01') };
const millisecond2: Expression = { $millisecond: { date: new Date('Jan 7, 2003') } };
const millisecond3: Expression = { $millisecond: { date: new Date('August 14, 2011'), timezone: 'America/Chicago' } };
const millisecond4: Expression = { $millisecond: '$date' };

const dateTrunc: Expression = {
  $dateTrunc: {
    date: '$orderDate', unit: 'week', binSize: 2,
    timezone: 'America/Los_Angeles', startOfWeek: 'Monday'
  }
};


const yearMonthDayUTCDateToString: Expression = { $dateToString: { format: '%Y-%m-%d', date: '$date' } };
const timewithOffsetNYDateToString: Expression = { $dateToString: { format: '%H:%M:%S:%L%z', date: '$date', timezone: 'America/New_York' } };
const timewithOffset430DateToString: Expression = { $dateToString: { format: '%H:%M:%S:%L%z', date: '$date', timezone: '+04:30' } };
const minutesOffsetNYDateToString: Expression = { $dateToString: { format: '%Z', date: '$date', timezone: 'America/New_York' } };
const minutesOffset430DateToString: Expression = { $dateToString: { format: '%Z', date: '$date', timezone: '+04:30' } };

const dateSubtract1: Expression = {
  $dateSubtract:
  {
    startDate: new Date('2021-03-31T12:10:05Z'),
    unit: 'month',
    amount: 1
  }
};

const dateSubtract2: Expression = {
  $dateSubtract:
  {
    startDate: '$logout',
    unit: 'hour',
    amount: 3,
    timezone: 'Europe/Amsterdam'
  }
};
