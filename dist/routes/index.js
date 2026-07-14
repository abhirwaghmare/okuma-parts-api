"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = require("express-rate-limit");
const auth_1 = __importDefault(require("../middleware/auth"));
const config_1 = __importDefault(require("../config"));
const health_1 = __importDefault(require("./health"));
const auth_2 = __importDefault(require("./auth"));
const webhooks_1 = __importDefault(require("./webhooks"));
const v1_1 = __importDefault(require("./v1"));
const customer_1 = __importDefault(require("./customer"));
const customers_1 = __importDefault(require("./customers"));
const cart_1 = __importDefault(require("./cart"));
const dashboard_1 = __importDefault(require("./dashboard"));
const router = (0, express_1.Router)();
// Rate limiter
const apiLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: config_1.default.rateLimit.windowMs,
    max: config_1.default.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    validate: { xForwardedForHeader: false },
});
// Public routes — not versioned
router.use('/health', health_1.default);
router.use('/auth', auth_2.default);
router.use('/webhooks', webhooks_1.default);
// Versioned API (auth-gated, server-to-server)
router.use('/v1/api', apiLimiter, auth_1.default, v1_1.default);
// Public v1 routes
router.use('/v1', customer_1.default);
router.use('/v1', customers_1.default);
router.use('/v1', apiLimiter, cart_1.default);
router.use('/v1/dashboard', apiLimiter, auth_1.default, dashboard_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map