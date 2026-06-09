'use strict';

const ValidationError = require('../error/validation');

module.exports = function convertErrorToIssues(error) {
  if (error instanceof ValidationError) {
    return Object.keys(error.errors).map(path => {
      const err = error.errors[path];
      return {
        message: err.message,
        path: path.split('.').map(part => {
          const num = +part;
          return Number.isInteger(num) && String(num) === part ? num : part;
        })
      };
    });
  }

  return [{ message: error.message }];
};
