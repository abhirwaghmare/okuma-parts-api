'use strict';

const { ValidationError } = require('./errors');

function checkField(value, rules, fieldName) {
    const absent = value === undefined || value === null || value === '';

    if (rules.required && absent) {
        return `${fieldName} is required`;
    }

    if (absent) return null;

    if (rules.type === 'integer') {
        const n = Number(value);
        if (!Number.isInteger(n) || Number.isNaN(n)) return `${fieldName} must be an integer`;
    } else if (rules.type === 'number') {
        if (Number.isNaN(Number(value))) return `${fieldName} must be a number`;
    }

    const coerced = rules.type === 'integer' || rules.type === 'number' ? Number(value) : value;

    if (rules.min !== undefined && coerced < rules.min) {
        return `${fieldName} must be at least ${rules.min}`;
    }

    if (rules.max !== undefined && coerced > rules.max) {
        return `${fieldName} must be at most ${rules.max}`;
    }

    if (rules.pattern && !rules.pattern.test(String(value))) {
        return `${fieldName} has an invalid format`;
    }

    if (rules.enum && !rules.enum.includes(String(value))) {
        return `${fieldName} must be one of: ${rules.enum.join(', ')}`;
    }

    return null;
}

function validateSource(source, schema) {
    const errors = [];
    for (const [field, rules] of Object.entries(schema)) {
        const msg = checkField(source[field], rules, field);
        if (msg) errors.push({ field, message: msg });
    }
    return errors;
}

/**
 * Returns Express middleware that validates req.query, req.params, and/or req.body.
 *
 * Supported rules per field: required, type ('string'|'integer'|'number'), min, max, pattern, enum.
 *
 * @param {{ query?: object, params?: object, body?: object }} schema
 */
function validate(schema) {
    return (req, res, next) => {
        const errors = [];

        if (schema.query) errors.push(...validateSource(req.query, schema.query));
        if (schema.params) errors.push(...validateSource(req.params, schema.params));
        if (schema.body) errors.push(...validateSource(req.body || {}, schema.body));

        if (errors.length > 0) {
            return next(new ValidationError('Validation failed', errors));
        }

        next();
    };
}

module.exports = validate;
