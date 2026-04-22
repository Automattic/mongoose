import { Projector, ArrayOperators, QueryResultType, PluginFunction, Query, Schema } from 'mongoose';
import { expect } from 'tstyche';

// Test Projector is exported and works correctly
type TestProjection = Projector<{ name: string; age: number }, true>;
expect<TestProjection['name']>().type.toBe<true | undefined>();
expect<TestProjection['age']>().type.toBe<true | undefined>();

// Test ArrayOperators is exported
expect<ArrayOperators['$slice']>().type.toBe<number | [number, number] | undefined>();

// Test QueryResultType is exported
type TestQuery = Query<string[], string>;
expect<QueryResultType<TestQuery>>().type.toBe<string[]>();

// Test PluginFunction is exported
type TestPlugin = PluginFunction<{ name: string }, any, any, any, any, any>;
expect<ReturnType<TestPlugin>>().type.toBe<void>();