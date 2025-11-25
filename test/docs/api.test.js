'use strict';

const assert = require('assert');
const api = require('../../docs/source/api');
const fs = require('fs');
const path = require('path');

describe('API Documentation Parser', function () {
    const fixturesDir = path.join(__dirname, '../fixtures');

    // Ensure fixtures directory exists
    before(function () {
        fs.mkdirSync(fixturesDir, { recursive: true });
    });

    it('should handle JSDoc comments without tags', function () {
        // Create a temporary test file with JSDoc lacking tags
        const testFilePath = path.join(fixturesDir, 'test-no-tags.js');
        const testContent = `'use strict';

/*!
 * This is a comment without any JSDoc tags
 * It should not crash the parser
 */

/**
 * This is a function without any JSDoc tags
 */
function testFunction() {
  return true;
}

/**
 * Another function with description only
 * No parameters, no return tags
 */
function anotherFunction() {
  return false;
}

module.exports = { testFunction, anotherFunction };
`;

        // Write test file
        fs.writeFileSync(testFilePath, testContent);

        try {
            // This should not throw
            assert.doesNotThrow(
                () => api.parseFile(testFilePath, false),
                'Parser should handle files with tagless JSDoc comments'
            );
        } finally {
            // Cleanup
            fs.unlinkSync(testFilePath);
        }
    });

    it('should successfully parse JSDoc with tags', function () {
        // Create a temporary test file with proper JSDoc
        const testFilePath = path.join(fixturesDir, 'test-with-tags.js');
        const testContent = `'use strict';

/**
 * A properly documented function
 * @param {String} name The name parameter
 * @param {Number} age The age parameter
 * @return {Object} An object with the data
 */
function properFunction(name, age) {
  return { name, age };
}

/**
 * Another documented function
 * @api public
 * @param {String} value Input value
 */
function publicFunction(value) {
  return value;
}

module.exports = { properFunction, publicFunction };
`;

        fs.writeFileSync(testFilePath, testContent);

        try {
            assert.doesNotThrow(
                () => api.parseFile(testFilePath, false),
                'Parser should handle properly documented functions'
            );
        } finally {
            fs.unlinkSync(testFilePath);
        }
    });

    it('should handle mixed JSDoc comments', function () {
        // Create a test file with both tagged and untagged comments
        const testFilePath = path.join(fixturesDir, 'test-mixed.js');
        const testContent = `'use strict';

/**
 * Function with tags
 * @param {String} x First parameter
 * @return {String} returns x
 */
function withTags(x) {
  return x;
}

/**
 * Function without tags
 */
function withoutTags() {
  return true;
}

/**
 * Another function with tags
 * @param {Number} num A number
 * @param {Boolean} flag A flag
 * @return {Number} The modified number
 */
function moreWithTags(num, flag) {
  return flag ? num : 0;
}

module.exports = { withTags, withoutTags, moreWithTags };
`;

        fs.writeFileSync(testFilePath, testContent);

        try {
            assert.doesNotThrow(
                () => api.parseFile(testFilePath, false),
                'Parser should handle files with mixed JSDoc styles'
            );
        } finally {
            fs.unlinkSync(testFilePath);
        }
    });

    it('should handle files with only description blocks', function () {
        const testFilePath = path.join(fixturesDir, 'test-desc-only.js');
        const testContent = `'use strict';

/**
 * Just a description
 * Multiple lines
 * No tags at all
 */

/**
 * Another description block
 */

module.exports = {};
`;

        fs.writeFileSync(testFilePath, testContent);

        try {
            assert.doesNotThrow(
                () => api.parseFile(testFilePath, false),
                'Parser should handle files with description-only JSDoc'
            );
        } finally {
            fs.unlinkSync(testFilePath);
        }
    });
});
