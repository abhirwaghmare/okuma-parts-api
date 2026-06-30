'use strict';

// Babel configuration used by Jest (babel-jest transform).
// The webpack build uses inline babel-loader options in webpack.common.js
// and does not read this file — webpack ignores babel.config.js by default
// when loader options are specified inline.
//
// The scripts/ directory uses CommonJS with no ES module syntax, so Babel
// only needs to handle module transform for the theme's ES module test files.
// Scripts are excluded from the preset-env transform to avoid applying
// Jest-injected plugins (babel-plugin-jest-hoist) to non-test files.

module.exports = {
    presets: [
        [
            '@babel/preset-env',
            {
                targets: { node: 'current' },
                modules: 'commonjs',
            },
        ],
    ],
    plugins: [
        '@babel/plugin-syntax-dynamic-import',
    ],
    // Exclude scripts/ from Jest-specific transforms that add plugins
    // incompatible with @babel/core 7.29.x (e.g. babel-plugin-jest-hoist).
    overrides: [
        {
            exclude: ['**/scripts/**'],
        },
    ],
};
