'use strict';

class AppError extends Error {
    constructor(message, status = 500) {
        super(message);
        this.name = this.constructor.name;
        this.status = status;
    }
}

class ValidationError extends AppError {
    constructor(message, details = []) {
        super(message, 400);
        this.details = details;
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Not found') {
        super(message, 404);
    }
}

module.exports = { AppError, ValidationError, NotFoundError };
