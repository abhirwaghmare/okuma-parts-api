'use strict';

// Manual Jest mock for axios.
// Tests override individual methods via jest.fn() assignments.
const axios = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
};

module.exports = axios;
