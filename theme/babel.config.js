'use strict';

// Babel configuration used by Jest (babel-jest transform).
// The webpack build uses inline babel-loader options in webpack.common.js
// and does not read this file.
module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: { node: 'current' },
                // Let babel-jest handle CommonJS transform; webpack handles its own
                modules: 'commonjs',
            },
        ],
    ],
    plugins: [
        '@babel/plugin-syntax-dynamic-import',
    ],
};
