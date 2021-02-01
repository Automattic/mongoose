import { Schema } from 'mongoose';

enum Genre {
  Action,
  Adventure,
  Comedy
}

const movieSchema: Schema = new Schema({
  title: String,
  featuredIn: {
    type: String,
    enum: ['Favorites', null],
    default: null
  },
  rating: {
    type: Number,
    required: [true, 'Required'],
    min: [0, 'MinValue'],
    max: [5, 'MaxValue']
  },
  genre: {
    type: String,
    enum: Genre,
    required: true
  }
});
