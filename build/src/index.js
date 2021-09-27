"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const api_1 = __importDefault(require("./api"));
const app = express_1.default();
const PORT = process.env.PORT || 3000;
app.use(body_parser_1.default.json({ limit: '8mb' }));
app.use(body_parser_1.default.urlencoded({ limit: '8mb', extended: false }));
app.use(cors_1.default({ maxAge: 86400 }));
app.use('/api', api_1.default);
app.listen(PORT, () => console.log(`Listening at http://localhost:${PORT}`));
