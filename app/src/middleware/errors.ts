export class AppError extends Error {
    status: number;

    constructor(message: string, status = 500) {
        super(message);
        this.name = this.constructor.name;
        this.status = status;
    }
}

export class ValidationError extends AppError {
    details: { field: string; message: string }[];

    constructor(message: string, details: { field: string; message: string }[] = []) {
        super(message, 400);
        this.details = details;
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Not found') {
        super(message, 404);
    }
}
