"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const products_1 = __importDefault(require("./products"));
const parts_book_1 = __importDefault(require("./parts-book"));
const dealers_1 = __importDefault(require("../dealers"));
const customers_1 = __importDefault(require("./customers"));
const router = (0, express_1.Router)();
router.use('/products', products_1.default);
router.use('/', parts_book_1.default);
router.use('/', dealers_1.default);
router.use('/', customers_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map