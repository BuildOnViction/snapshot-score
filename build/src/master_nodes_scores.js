"use strict";
/**
 * Get Voters Tomo balance by block
 */
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
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const moment_1 = __importDefault(require("moment"));
const Validator = require('./models/validator');
const db = require('./models');
const Web3Ws = require('./models/web3ws').Web3WsInternal;
const web3Rpc = require('./models/web3rpc').Web3RpcInternal();
// const logger = require('./helpers/logger')
const _ = require('lodash');
process.setMaxListeners(100);
let web3 = new Web3Ws();
let validator = new Validator(web3);
let cpValidator = 0;
let tweetedMN = '';
function watchValidator(blockNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            blockNumber = blockNumber || (yield web3.eth.getBlockNumber());
            console.log('TomoValidator %s - Listen events from block number %s ...', "0x0000000000000000000000000000000000000088", blockNumber);
            cpValidator = yield web3.eth.getBlockNumber();
            return validator.getPastEvents('allEvents', {
                fromBlock: blockNumber,
                // toBlock: blockNumber
            }).then((events) => __awaiter(this, void 0, void 0, function* () {
                console.log("events ", events);
                let voteList = [];
                let map = events.map((event) => {
                    let result = event;
                    console.log('Event %s in block %s', result.event, result.blockNumber);
                    let candidate = (result.returnValues._candidate || '').toLowerCase();
                    let voter = (result.returnValues._voter || '').toLowerCase();
                    if (result.event === 'Vote' || result.event === 'Unvote') {
                        voteList.push({
                            candidate: candidate,
                            voter: voter,
                            capacity: result.returnValues._cap,
                            action: result.event
                        });
                    }
                });
                yield updateVoterCap(voteList, blockNumber);
            })).catch(e => {
                console.error('watchValidator %s', e);
                cpValidator = blockNumber;
                web3 = new Web3Ws();
                validator = new Validator(web3);
            });
        }
        catch (e) {
            console.error('watchValidator2 %s', e);
            cpValidator = blockNumber;
        }
    });
}
function _getVotersCap(voteList) {
    return __awaiter(this, void 0, void 0, function* () {
        let result = [];
        return _.groupBy(voteList, (element) => element.voter);
    });
}
function updateVoterCap(voteList, blockNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        // get last voters
        let lastBlock = yield db.Block.findOne().sort({ field: 'asc', _id: -1 }).exec();
        if (!lastBlock || !lastBlock.voters) {
            lastBlock = {
                voters: {}
            };
        }
        // get new vote capacity
        let votersCap = yield _getVotersCap(voteList);
        for (var address in votersCap) {
            if (votersCap.hasOwnProperty(address)) {
                let changedList = votersCap[address];
                lastBlock.voters[address] = _.mergeWith(changedList, lastBlock.voters[address], (obj, src) => {
                    if (!src) {
                        return obj;
                    }
                    let result = Object.assign(Object.assign({}, obj), { capacity: new bignumber_js_1.default(0) });
                    if (obj.action == "Vote") {
                        result.capacity = result.capacity.plus(new bignumber_js_1.default(obj.capacity));
                        if (!src || !src.capacity) {
                            result.capacity.plus(new bignumber_js_1.default(src.capacity));
                        }
                    }
                    else {
                        result.capacity = new bignumber_js_1.default(src.capacity);
                        result.capacity = result.capacity.minus(new bignumber_js_1.default(obj.capacity));
                    }
                    return result;
                });
            }
        }
        console.log(lastBlock.voters);
        // update new vote list
        try {
            let block = yield db.Block.InsertOne({
                number: blockNumber,
                voters: lastBlock.voters,
            }).exec();
        }
        catch (e) {
            console.error('updateVoterCap %s', e);
        }
    });
}
let sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));
function watchNewBlock(n) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let blockNumber = yield web3.eth.getBlockNumber();
            n = n || blockNumber;
            if (blockNumber > n) {
                n = n + 1;
                blockNumber = n;
                console.log('Watch new block every 3 second blkNumber %s', n);
                // let blk = await web3.eth.getBlock(blockNumber)
                // check withdrawal status after 10 blocks
                yield watchValidator(blockNumber);
            }
        }
        catch (e) {
            console.error('watchNewBlock %s', e);
            web3 = new Web3Ws();
            validator = new Validator(web3);
        }
        yield sleep(3000);
        return watchNewBlock(n);
    });
}
// get event with 5k block range repeatedly
function getPastEvent(start) {
    return __awaiter(this, void 0, void 0, function* () {
        let blockNumber = yield web3.eth.getBlockNumber();
        let lb = start || 15740091;
        console.debug('Get all past event from block', lb, 'to block', lb + 5000);
        validator.getPastEvents('allEvents', { fromBlock: lb, toBlock: lb + 5000 }, function (error, events) {
            return __awaiter(this, void 0, void 0, function* () {
                if (error) {
                    console.error(error);
                }
                else {
                    let map = events.map(function (event) {
                        return __awaiter(this, void 0, void 0, function* () {
                            if (event.event === 'Withdraw') {
                                let owner = (event.returnValues._owner || '').toLowerCase();
                                let blockNumber = event.blockNumber;
                                let capacity = event.returnValues._cap;
                                yield db.Withdraw.findOneAndUpdate({ tx: event.transactionHash }, {
                                    smartContractAddress: "0x0000000000000000000000000000000000000088",
                                    blockNumber: blockNumber,
                                    tx: event.transactionHash,
                                    owner: owner,
                                    capacity: capacity
                                }, { upsert: true });
                            }
                            let candidate = (event.returnValues._candidate || '').toLowerCase();
                            let voter = (event.returnValues._voter || '').toLowerCase();
                            let owner = (event.returnValues._owner || '').toLowerCase();
                            if (!voter && (event.event === 'Resign' || event.event === 'Withdraw' || event.event === 'Propose')) {
                                voter = owner;
                            }
                            let capacity = event.returnValues._cap;
                            let blk = yield web3.eth.getBlock(event.blockNumber);
                            let createdAt = moment_1.default.unix(blk.timestamp).utc();
                            yield db.Transaction.findOneAndUpdate({ tx: event.transactionHash }, {
                                smartContractAddress: "0x0000000000000000000000000000000000000088",
                                tx: event.transactionHash,
                                blockNumber: event.blockNumber,
                                event: event.event,
                                voter: voter,
                                owner: owner,
                                candidate: candidate,
                                capacity: capacity,
                                createdAt: createdAt
                            }, { upsert: true });
                        });
                    });
                    Promise.all(map);
                    getPastEvent(lb + 5000);
                }
            });
        });
    });
}
function start(block) {
    return __awaiter(this, void 0, void 0, function* () {
        // watchNewBlock(block)
        console.log("1");
        getPastEvent(block);
    });
}
exports.default = start;
