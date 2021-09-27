"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.get = exports.set = void 0;
const AWS = __importStar(require("@aws-sdk/client-s3"));
function streamToString(stream) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new Promise((resolve, reject) => {
            const chunks = [];
            stream.on('data', chunk => chunks.push(chunk));
            stream.on('error', reject);
            stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        });
    });
}
const client = new AWS.S3({
    region: process.env.AWS_REGION
});
function set(key, value) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield client.putObject({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: `public/snapshot/1/${key}.json`,
                Body: JSON.stringify(value),
                ContentType: 'application/json; charset=utf-8'
            });
        }
        catch (e) {
            console.log(e);
            throw e;
        }
    });
}
exports.set = set;
function get(key) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { Body } = yield client.getObject({
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: `public/snapshot/1/${key}.json`
            });
            // @ts-ignore
            const str = yield streamToString(Body);
            return JSON.parse(str);
        }
        catch (e) {
            return false;
        }
    });
}
exports.get = get;
