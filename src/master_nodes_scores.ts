/**
 * Get Voters Tomo balance by block
 */

 import BigNumber from 'bignumber.js'
 import moment from 'moment'
const Validator = require('./models/validator')
const db = require('./models')
const Web3Ws = require('./models/web3ws').Web3WsInternal
const web3Rpc = require('./models/web3rpc').Web3RpcInternal()

// const logger = require('./helpers/logger')
const _ = require('lodash')

process.setMaxListeners(100)

let web3 = new Web3Ws()
let validator = new Validator(web3)
let cpValidator = 0

let tweetedMN = ''

async function watchValidator (blockNumber) {
    try {
        blockNumber = blockNumber || await web3.eth.getBlockNumber()
        console.log('TomoValidator %s - Listen events from block number %s ...',
            "0x0000000000000000000000000000000000000088", blockNumber)

        cpValidator = await web3.eth.getBlockNumber()
        return validator.getPastEvents('allEvents', {
            fromBlock: blockNumber,
            // toBlock: blockNumber
        }).then(async events => {
            console.log("events ", events)
            let voteList : any[] = [];
            let map = events.map((event) => {
                let result = event
                console.log('Event %s in block %s', result.event, result.blockNumber)
                let candidate = (result.returnValues._candidate || '').toLowerCase()
                let voter = (result.returnValues._voter || '').toLowerCase()
                              
                if (result.event === 'Vote' || result.event === 'Unvote') {
                    voteList.push({
                        candidate: candidate,
                        voter: voter,
                        capacity: result.returnValues._cap,
                        action: result.event
                    })
                    
                }
            })

            await updateVoterCap(voteList, blockNumber);
        }).catch(e => {
            console.error('watchValidator %s', e)
            cpValidator = blockNumber
            web3 = new Web3Ws()
            validator = new Validator(web3)
        })
    } catch (e) {
        console.error('watchValidator2 %s', e)
        cpValidator = blockNumber
    }
}

async function _getVotersCap(voteList: any[]) {
    let result: any[] = [];
    return _.groupBy(voteList, (element) =>  element.voter);
}

async function updateVoterCap (voteList: any[], blockNumber: Number) {
    // get last voters
    let lastBlock = await db.Block.findOne().sort({ field: 'asc', _id: -1 }).exec()
    if (!lastBlock || !lastBlock.voters) {
        lastBlock = {
            voters: {}
        }
    }
    // get new vote capacity
    let votersCap = await _getVotersCap(voteList)

    for (var address in votersCap) {
        if (votersCap.hasOwnProperty(address)) {
            let changedList = votersCap[address];
            lastBlock.voters[address] = _.mergeWith(changedList, lastBlock.voters[address], (obj, src) => {
                if (!src) {
                    return obj;
                }
                let result = {
                    ...obj,
                    capacity: new BigNumber(0)
                }

                if (obj.action == "Vote") {
                    result.capacity = result.capacity.plus(new BigNumber(obj.capacity))
                    if (!src || !src.capacity) {
                        result.capacity.plus(new BigNumber(src.capacity))
                    }
                } else {
                    result.capacity = new BigNumber(src.capacity)
                    result.capacity = result.capacity.minus(new BigNumber(obj.capacity))
                }
                return result;
            });
        }
    }
    console.log(lastBlock.voters)
    // update new vote list
    try {
        let block = await db.Block.InsertOne({
           number: blockNumber,
            voters: lastBlock.voters,
        }).exec()
    
    } catch (e) {
        console.error('updateVoterCap %s', e)
    }
}

let sleep = (time) => new Promise((resolve) => setTimeout(resolve, time))
async function watchNewBlock (n) {
    try {
        let blockNumber = await web3.eth.getBlockNumber()
        n = n || blockNumber
        if (blockNumber > n) {
            n = n + 1
            blockNumber = n
            console.log('Watch new block every 3 second blkNumber %s', n)
            // let blk = await web3.eth.getBlock(blockNumber)
            // check withdrawal status after 10 blocks

            await watchValidator(blockNumber)
        }
    } catch (e) {
        console.error('watchNewBlock %s', e)
        web3 = new Web3Ws()
        validator = new Validator(web3)
    }
    await sleep(3000)
    return watchNewBlock(n)
}


// get event with 5k block range repeatedly
async function getPastEvent (start) {
    let blockNumber = await web3.eth.getBlockNumber()
    let lb = start ||  	15740091

    console.debug('Get all past event from block', lb, 'to block', lb+5000)
    validator.getPastEvents('allEvents', { fromBlock: lb, toBlock: lb+5000 }, async function (error, events) {
        if (error) {
            console.error(error)
        } else {
            let map = events.map(async function (event) {
                if (event.event === 'Withdraw') {
                    let owner = (event.returnValues._owner || '').toLowerCase()
                    let blockNumber = event.blockNumber
                    let capacity = event.returnValues._cap
                    await db.Withdraw.findOneAndUpdate({ tx: event.transactionHash }, {
                        smartContractAddress: "0x0000000000000000000000000000000000000088",
                        blockNumber: blockNumber,
                        tx: event.transactionHash,
                        owner: owner,
                        capacity: capacity
                    }, { upsert: true })
                }
                let candidate = (event.returnValues._candidate || '').toLowerCase()
                let voter = (event.returnValues._voter || '').toLowerCase()
                let owner = (event.returnValues._owner || '').toLowerCase()
                if (!voter && (event.event === 'Resign' || event.event === 'Withdraw' || event.event === 'Propose')) {
                    voter = owner
                }
                let capacity = event.returnValues._cap
                let blk = await web3.eth.getBlock(event.blockNumber)
                let createdAt = moment.unix(blk.timestamp).utc()
                await db.Transaction.findOneAndUpdate({ tx: event.transactionHash }, {
                    smartContractAddress: "0x0000000000000000000000000000000000000088",
                    tx: event.transactionHash,
                    blockNumber: event.blockNumber,
                    event: event.event,
                    voter: voter,
                    owner: owner,
                    candidate: candidate,
                    capacity: capacity,
                    createdAt: createdAt
                }, { upsert: true })
            })
            Promise.all(map);
            getPastEvent(lb+5000);
        }
    })    
}

export default async function start(block) {
    // watchNewBlock(block)
    console.log("1")
    getPastEvent(block)
}

