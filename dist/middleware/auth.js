"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../config/logger"));
const errors_1 = require("./errors");
function authenticateBCToken(req, _res, next) {
    const rawToken = req.headers['x-auth-token'];
    if (!rawToken || Array.isArray(rawToken)) {
        next(new errors_1.UnauthorizedError('Missing X-Auth-Token header'));
        return;
    }
    const token = rawToken;
    const expected = config_1.default.bc.accessToken ?? '';
    const tokenBuf = Buffer.from(token);
    const expectedBuf = Buffer.from(expected);
    const valid = tokenBuf.length === expectedBuf.length &&
        crypto_1.default.timingSafeEqual(tokenBuf, expectedBuf);
    if (!valid) {
        logger_1.default.warn(`Invalid X-Auth-Token from ${req.ip}`);
        next(new errors_1.UnauthorizedError('Invalid X-Auth-Token'));
        return;
    }
    next();
}
exports.default = authenticateBCToken;
//# sourceMappingURL=auth.js.map