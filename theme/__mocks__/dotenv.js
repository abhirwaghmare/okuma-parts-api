'use strict';

// Manual Jest mock for dotenv — prevents any file-system access during tests.
// process.env is pre-populated by each test file's beforeAll/beforeEach.
module.exports = {
    config: jest.fn(),
};
