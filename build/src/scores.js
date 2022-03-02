"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteScore = exports.blockNumByNetwork = void 0;
const crypto_1 = require("crypto");
const snapshot_js_1 = __importDefault(require("snapshot.js"));
const aws_1 = require("./aws");
exports.blockNumByNetwork = {};
const blockNumByNetworkTs = {};
const delay = 30;
function getBlockNum(network) {
    return __awaiter(this, void 0, void 0, function* () {
        const ts = parseInt((Date.now() / 1e3).toFixed());
        if (exports.blockNumByNetwork[network] && blockNumByNetworkTs[network] > ts - delay)
            return exports.blockNumByNetwork[network];
        const provider = snapshot_js_1.default.utils.getProvider(network);
        const blockNum = yield provider.getBlockNumber();
        exports.blockNumByNetwork[network] = blockNum;
        blockNumByNetworkTs[network] = ts;
        return blockNum;
    });
}
function scores(parent, args) {
    return __awaiter(this, void 0, void 0, function* () {
        const { space = '', strategies, network, addresses } = args;
        const key = crypto_1.createHash('sha256')
            .update(JSON.stringify(args))
            .digest('hex');
        let snapshotBlockNum = 'latest';
        if (args.snapshot !== 'latest') {
            const currentBlockNum = yield getBlockNum(network);
            snapshotBlockNum = currentBlockNum < args.snapshot ? 'latest' : args.snapshot;
        }
        const state = snapshotBlockNum === 'latest' ? 'pending' : 'final';
        let scores;
        if (state === 'final')
            scores = yield aws_1.get(key);
        if (!scores) {
            scores = yield snapshot_js_1.default.utils.getScoresDirect(space, strategies, network, snapshot_js_1.default.utils.getProvider(network), addresses, snapshotBlockNum);
            if (state === 'final') {
                aws_1.set(key, scores).then(() => console.log('Stored!'));
            }
        }
        return {
            state,
            scores
        };
    });
}
exports.default = scores;
function deleteScore(key) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield aws_1.deleteKey(key);
        return result;
    });
}
exports.deleteScore = deleteScore;
