'use strict';

module.exports = function msgFunction(msg) {
    const tokens = msg.split(/(\{.+?\})/g);
    let fnBody = 'return \'';
    for (let i = 0, len = tokens.length; i < len; ++i) {
        const token = tokens[i];
        if (token[0] === '{' && token[token.length - 1] === '}') {
            fnBody += '\' + properties.' + token.slice(1, -1).toLowerCase()  + ' + \'';
        } else {
            fnBody += token;
        }
    }
    fnBody += '\';';
    return new Function('properties', fnBody);
}
