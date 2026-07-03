import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errors';

interface FieldRules {
    required?: boolean;
    type?: 'string' | 'integer' | 'number';
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: string[];
}

interface Schema {
    query?: Record<string, FieldRules>;
    params?: Record<string, FieldRules>;
    body?: Record<string, FieldRules>;
}

function checkField(value: unknown, rules: FieldRules, fieldName: string): string | null {
    const absent = value === undefined || value === null || value === '';

    if (rules.required && absent) return `${fieldName} is required`;
    if (absent) return null;

    if (rules.type === 'integer') {
        const n = Number(value);
        if (!Number.isInteger(n) || Number.isNaN(n)) return `${fieldName} must be an integer`;
    } else if (rules.type === 'number') {
        if (Number.isNaN(Number(value))) return `${fieldName} must be a number`;
    }

    const coerced = rules.type === 'integer' || rules.type === 'number' ? Number(value) : value;

    if (rules.min !== undefined && (coerced as number) < rules.min) {
        return `${fieldName} must be at least ${rules.min}`;
    }
    if (rules.max !== undefined && (coerced as number) > rules.max) {
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

function validateSource(source: Record<string, unknown>, schema: Record<string, FieldRules>) {
    const errors: { field: string; message: string }[] = [];
    for (const [field, rules] of Object.entries(schema)) {
        const msg = checkField(source[field], rules, field);
        if (msg) errors.push({ field, message: msg });
    }
    return errors;
}

function validate(schema: Schema) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const errors: { field: string; message: string }[] = [];

        if (schema.query) errors.push(...validateSource(req.query as Record<string, unknown>, schema.query));
        if (schema.params) errors.push(...validateSource(req.params, schema.params));
        if (schema.body) errors.push(...validateSource((req.body as Record<string, unknown>) || {}, schema.body));

        if (errors.length > 0) {
            next(new ValidationError('Validation failed', errors));
            return;
        }

        next();
    };
}

export default validate;
