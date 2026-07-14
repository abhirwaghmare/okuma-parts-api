"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../config/logger"));
const b2bClient = axios_1.default.create({
    baseURL: config_1.default.bc.b2bApiBaseUrl,
    headers: {
        'X-Auth-Token': config_1.default.bc.b2bAuthToken,
        'X-Store-Hash': config_1.default.bc.storeHash,
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
    timeout: 15000,
});
b2bClient.interceptors.response.use(res => res, (err) => {
    const status = err.response?.status;
    const message = err.response?.data?.message ?? err.message;
    logger_1.default.error(`B2B API error [${status}]: ${message}`);
    return Promise.reject(err);
});
exports.default = b2bClient;
//# sourceMappingURL=b2b.js.map