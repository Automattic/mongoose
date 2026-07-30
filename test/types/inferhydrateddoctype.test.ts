import mongoose, {
  InferHydratedDocType,
  InferHydratedDocTypeFromSchema
} from 'mongoose';
import { expect } from 'tstyche';

function gh16045() {
  const circleSchema = new mongoose.Schema({
    kind: { type: String, enum: ['Circle'] },
    name: { baseName: String },
    radius: Number
  });
  const squareSchema = new mongoose.Schema({
    kind: { type: String, enum: ['Square'] },
    side: Number
  });

  const shapeSchema = new mongoose.Schema({ name: String }, { discriminatorKey: 'kind' });
  const schemaDefinition = {
    shape: {
      type: shapeSchema,
      discriminators: {
        Circle: circleSchema,
        Square: squareSchema
      }
    }
  } as const;

  type ShapeType = NonNullable<InferHydratedDocType<typeof schemaDefinition>['shape']>;
  type BaseType = InferHydratedDocTypeFromSchema<typeof shapeSchema>;
  type BaseWithNullDiscriminator = Omit<BaseType, 'kind'> & { kind?: null };
  type CircleType = InferHydratedDocTypeFromSchema<typeof circleSchema> & { kind: 'Circle' };
  type SquareType = InferHydratedDocTypeFromSchema<typeof squareSchema> & { kind: 'Square' };

  type CircleTypeUnionMember = Omit<BaseType, keyof CircleType> & CircleType;
  type SquareTypeUnionMember = Omit<BaseType, keyof SquareType> & SquareType;
  expect<ShapeType>().type.toBe<
    BaseWithNullDiscriminator |
    CircleTypeUnionMember |
    SquareTypeUnionMember
  >();
  expect<ShapeType['kind']>().type.toBe<'Circle' | 'Square' | null | undefined>();
  expect<Extract<ShapeType, { kind: 'Circle' }>['radius']>().type.toBe<number | null | undefined>();
  expect<Extract<ShapeType, { kind: 'Square' }>['side']>().type.toBe<number | null | undefined>();
}

function gh16045RequiredDiscriminatorKey() {
  const baseSchema = new mongoose.Schema({
    kind: { type: String, required: true },
    name: String
  }, { discriminatorKey: 'kind' });
  const schemaDefinition = {
    shape: {
      type: baseSchema,
      discriminators: {}
    }
  } as const;

  type ShapeType = NonNullable<InferHydratedDocType<typeof schemaDefinition>['shape']>;
  expect<ShapeType['kind']>().type.toBe<string>();
}
