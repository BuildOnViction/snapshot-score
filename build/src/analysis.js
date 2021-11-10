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
/**
 * Separate unique users
 */
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const db = require('./models');
const fs = require('fs');
const _ = require("lodash");
const XLSX = require("xlsx");
function uniqueUsers() {
    return __awaiter(this, void 0, void 0, function* () {
        db.Transaction.aggregate([
            { $group: { _id: "$voter", count: { $sum: 1 } } },
        ]).exec((err, voters) => {
            if (err)
                throw err;
            // fs.writeFileSync('student-2.json', JSON.stringify(voters));
            voters.forEach((voter) => __awaiter(this, void 0, void 0, function* () {
                if (voter.count > 0) {
                    let history = yield db.Transaction.find({
                        voter: voter._id.toString()
                    });
                    yield db.Voters.create({
                        address: voter._id.toString(),
                        count: voter.count,
                        history: JSON.stringify(history)
                    });
                }
            }));
        });
    });
}
function votedVolumnAndDuration() {
    return __awaiter(this, void 0, void 0, function* () {
        let voters = yield db.Voters.find({});
        voters.forEach((voter) => __awaiter(this, void 0, void 0, function* () {
            let history = JSON.parse(voter.history);
            history = _.sortBy(history, (event) => {
                return new Date(event.createdAt).valueOf();
            });
            let stakedDuration = [];
            let lastEvent;
            for (let index = 0; index < history.length; index++) {
                let currentEvent = history[index];
                currentEvent.capacity = new bignumber_js_1.default(currentEvent.capacity);
                let isTomoPoolOwner = false;
                if (currentEvent.event == "Propose") {
                    isTomoPoolOwner = isTomopoolCandidate(currentEvent.candidate);
                }
                if (!lastEvent) {
                    stakedDuration.push({
                        "capacity": currentEvent.capacity.toFixed(),
                        "startDate": currentEvent.createdAt,
                        "candidate": currentEvent.candidate,
                        "isTomoPoolOwner": isTomoPoolOwner,
                        "endDate": ""
                    });
                }
                else if (currentEvent.event == "Vote" || currentEvent.event == "Propose") {
                    let isTomoPoolOwner = false;
                    if (currentEvent.event == "Propose") {
                        isTomoPoolOwner = isTomopoolCandidate(currentEvent.candidate);
                    }
                    // find the current staking of this masternode
                    let currentStakedThisMasterNode;
                    for (let index = stakedDuration.length - 1; index >= 0; index--) {
                        if (stakedDuration[index].candidate == currentEvent.candidate) {
                            currentStakedThisMasterNode = stakedDuration[index];
                            break;
                        }
                    }
                    if (voter.address == "0x42791edabbfcee1e12fc826ef76be34ccfd7c890") {
                        if (currentEvent.candidate == "0x45b7bd987fa22c9bac89b71f0ded03f6e150ba31") {
                            console.log("vote currentStakedThisMasterNode ", currentStakedThisMasterNode);
                            console.log("currentEvent ", currentEvent);
                        }
                    }
                    if (currentStakedThisMasterNode) {
                        let lastStaking = Object.assign({}, currentStakedThisMasterNode);
                        currentStakedThisMasterNode.endDate = currentEvent.createdAt;
                        lastStaking.capacity = new bignumber_js_1.default(lastStaking.capacity);
                        stakedDuration.push({
                            "capacity": currentEvent.capacity.plus(lastStaking.capacity).toFixed(),
                            "startDate": currentEvent.createdAt,
                            "candidate": currentEvent.candidate,
                            "isTomoPoolOwner": isTomoPoolOwner,
                            "endDate": ""
                        });
                    }
                    else {
                        stakedDuration.push({
                            "capacity": currentEvent.capacity.toFixed(),
                            "startDate": currentEvent.createdAt,
                            "candidate": currentEvent.candidate,
                            "isTomoPoolOwner": isTomoPoolOwner,
                            "endDate": ""
                        });
                    }
                }
                else if (currentEvent.event == "Unvote" || currentEvent.event == "Resign") {
                    let currentStakedThisMasterNode;
                    for (let index = stakedDuration.length - 1; index >= 0; index--) {
                        if (stakedDuration[index].candidate == currentEvent.candidate) {
                            currentStakedThisMasterNode = stakedDuration[index];
                            break;
                        }
                    }
                    if (currentStakedThisMasterNode) {
                        let lastStaking = Object.assign({}, currentStakedThisMasterNode);
                        currentStakedThisMasterNode.endDate = currentEvent.createdAt;
                        lastStaking.capacity = new bignumber_js_1.default(lastStaking.capacity);
                        let capacity = lastStaking.capacity.minus(currentEvent.capacity).toFixed();
                        if (voter.address == "0x42791edabbfcee1e12fc826ef76be34ccfd7c890") {
                            if (currentEvent.candidate == "0x45b7bd987fa22c9bac89b71f0ded03f6e150ba31") {
                                console.log("unvote currentStakedThisMasterNode ", currentStakedThisMasterNode);
                                console.log("currentEvent ", currentEvent);
                                console.log("capacity ", capacity);
                            }
                        }
                        // if (capacity != "0") {
                        stakedDuration.push({
                            "capacity": capacity,
                            "startDate": currentEvent.createdAt,
                            "candidate": currentEvent.candidate,
                            "isTomoPoolOwner": false,
                            "endDate": ""
                        });
                        // }
                    }
                    else {
                        console.log("Something went wrong");
                        console.log("currentEvent.candidate ", currentEvent.candidate);
                    }
                }
                lastEvent = Object.assign({}, currentEvent);
            }
            yield db.Voters.findOneAndUpdate({ _id: voter._id }, {
                staked: stakedDuration
            }, { $set: true });
        }));
    });
}
const TOMO_POOL = [
    { "hash": "0xca9377d127e8774340148975be346a44d0613871", "name": "TomoPool", "coinbase": "0xa231bbc6095443c5993eb8964073e8eff6165ee9", "capacity": 79017.70228000003 },
    { "hash": "0x7b966461a67e06400e591be740e6fb4253410efc", "name": "SwimmingPool", "coinbase": "0x68c758f8f3ca448d895c40c847e1a9b9ca1220aa", "capacity": 77382.584 },
    { "hash": "0xe56ee03024bd5454431d6d25b368d1d7276d60dd", "name": "Coin98Pool", "coinbase": "0xd5b4855ffc9ebaa13a73de8762b9d3b37644b266", "capacity": 83817.81025 },
    { "hash": "0xd7d6634109572e3bed7cece7d1c90f18b7b1c10d", "name": "TomoStakePool", "coinbase": "0xe95bf19c54f8fab38a1ead1681a3e14a4d1c9db6", "capacity": 85847.778 },
    { "hash": "0x486184c3877a1e44fbdecd65d5246fb96a6c119d", "name": "InfinitePool", "coinbase": "0x05bd5dd832ebbb49fdde30d2d518d55cd964a500", "capacity": 75246.73 },
    { "hash": "0x937f6afdf475f21343d6e83e9a8f5024fc04423a", "name": "DeepPool", "coinbase": "0x8f6c23ca97e74a5d984803f46af1961988f11533", "capacity": 81787.553 },
    { "hash": "0xc2f4e7dbb871911b2ce7defffd3a14d3d788fe31", "name": "SummerPool", "coinbase": "0x66ca8b9eb5f50a362c797541881f609613c53689", "capacity": 77313.834 },
    { "hash": "0x58862427d5ea9a9c9b960b3b04b746c60f4659d3", "coinbase": "0x46c5e117e966f199fa5143dc085929eaea196aab", "name": "LongPool", "capacity": 59344.27 },
    { "hash": "0x86e85b99dc82cd5e7aab82808f35914279ae4dbe", "name": "WalkingPool", "coinbase": "0xdad88acb969c55a8b850eb81204b31081bafeccd", "capacity": 82076.780201 },
    { "hash": "0x827133d5d036ab97b195fc50668d02cac4d7ea58", "name": "AussiePool", "coinbase": "0x1a5837473d61799597315640f59786c22ae90373", "capacity": 84881.43 },
    { "hash": "0xfaf300cd57e7477f5e960f7fae3d93d172971c7e", "name": "SharePool", "coinbase": "0x1a58499ad60a9e3c18d5897cf83e5006ddaf4843", "capacity": 76607.22101 },
    { "hash": "0x3ac587278bdcf647fe8dc9245fa127c910cad382", "name": "HappyPool", "coinbase": "0x1a5866a742bb277c49d4eb7eb1b4190fed6ce3e0", "capacity": 79488.55 },
    { "hash": "0xa7d404805083cadffac0bcd0c74fa7dbdfd9055e", "name": "LuaPool", "coinbase": "0x1a589e6f3fbbf31baf6e7bf7e29ad318172d356e", "capacity": 76483.61 },
    { "hash": "0x794d9adc83c9280c03584e63b53bfed229e9a267", "name": "FarmPool", "coinbase": "0x1a590458d4316e3908673182c00d9ae30960fca6", "capacity": 81051.301 },
    { "hash": "0x4c6cf374e1ea6b431c3b51343ae82b5a85a204f3", "name": "LiverPool", "coinbase": "0x1a59145942801bde7ee29ce0530d4550044feaad", "capacity": 81494.278 },
    { "hash": "0x60b927af18af8a817256161a34e7b182bc5adcb0", "name": "NYSEPool", "coinbase": "0x1a593553768c99549edd1921e48ea7c1e2a701e6", "capacity": 83685.5301 },
    { "hash": "0x5d2bd17f51b04b4c893de678d51199febb86f240", "name": "KoiPool", "coinbase": "0x1a5945d8ae30e5e4006d385e3a9fe77747e946c5", "capacity": 84612.382 },
    { "hash": "0x39a52c51dbc2953748482e05caa2fa3978e5f2c0", "name": "YieldPool", "coinbase": "0x1a595f6de76d63ac3336f1368e681af39732904d", "capacity": 75671.2 },
    { "hash": "0x7378140261f2d5a21892b1a54492e52f69d9d0ff", "name": "BasePool", "coinbase": "0x1a59635680e67ebc4ec015daba8577c38a5f83cc", "capacity": 87815.3415 },
    { "hash": "0xbc0ccb2525b4d1bbade85c97d30108b0a89e686f", "name": "DenizPool", "coinbase": "0x1a597b5b3057393dd46bda8a0d8af35468bf53c1", "capacity": 82272.7901 },
    { "hash": "0x00fb106a584a1d41294359aac0dafebd6635f980", "name": "AzurePool", "coinbase": "0x1a598e55b18a3ce2032196fcb3e402abb2cfe532", "capacity": 88297.26 },
    { "hash": "0x59ead40af88f0d55647ed2d358165c65507edd2e", "name": "TealPool", "coinbase": "0x1a599af751326e918f320b1fe6c158d4791c21b1", "capacity": 85639.6403 },
    { "hash": "0x2038b4fc5374edf0f10d37cd4a93a299b03c22d3", "name": "SlatePool", "coinbase": "0x1a60044aba752b348f8127be0fa57fe171297ca4", "capacity": 85543.03351905274 },
    { "hash": "0xbdf6520641413994519aa20dc485c3f83193fc72", "name": "IndigoPool", "coinbase": "0x1a601b82e5c3a29df7f4a54c01bcf2c55a662c45", "capacity": 82055.76001 },
    { "hash": "0x2908e928cd9fac4427fc998efbc1f89dfdaaf05f", "name": "TurkishPool", "coinbase": "0x1a61f1b744fe1f078804e7ac8620378ca8740410", "capacity": 93686.45075 },
    { "hash": "0x518dff8396e314c88c6e1910e204e79385a490a1", "name": "DefiPool", "coinbase": "0x1a62c82003e4ca686b2426df54f04318ffa43ad5", "capacity": 81999.17 },
    { "hash": "0x3ebe5fdc3e56f995dd25a6f07569656ffb58ef86", "name": "IstanPool", "coinbase": "0x1a60290c7b18b73ac2d8bc41db18339117efc116", "capacity": 88569.62 },
    { "hash": "0x1bcfdec676a600fc581b0204d5ae1dfdc74c7fab", "name": "MartianPool", "coinbase": "0x1a636eab185cafb853523c4a7711c9e6a5023429", "capacity": 55000 },
    { "hash": "0x16904b2c6cec3d9990bf5a2fad0a0ad6df4b39e7", "name": "LabsPool", "coinbase": "0x1a6372498fc7a455a72ba56d664c25d0ffe2e26b", "capacity": 51000 },
    { "hash": "0xbe4eeb8ffd9246e656caac2d0f2245fc2a12f20a", "name": "GaneshPool", "coinbase": "0x1a638d60500a7599b449b9fdd0213e5031d72cc3", "capacity": 51000 },
    { "hash": "0x8f957d7e66b1f921010542b6b742aa5f72a2fae8", "name": "MilkersPool", "coinbase": "0x1a63936ff66235203fcba156136b13b167fd2cf3", "capacity": 53999.21 },
    { "hash": "0x8d3593b553107fadf3ebe9f75ac379a1522434cf", "name": "DarkPool", "coinbase": "0x1a640830Fcd34Bfe2d90a68f0161f3Cd70544ef5", "capacity": 84641.56 },
    { "hash": "0x1dc32149509b768bd50788170d2fc3266e3e484a", "name": "ZeroPool", "coinbase": "0x1a641f3c9c88c03d01c7e30f4bfae33a97488e8d", "capacity": 84293.92 },
    { "hash": "0x9be5172f709a8c2b99ae34ddf4ddbf2ccc975ded", "name": "RoyalPool", "coinbase": "0x1a64266f353132d65c74b7fec5120878ff4d04ee", "capacity": 108353.5 },
    { "hash": "0x6fbe193c19c6541fabb7b08a350022dfa842ca5e", "name": "SkyPool", "coinbase": "0x1a6455341ff9b5c88823623c5ca2b3d284719030", "capacity": 84400.325 },
    { "hash": "0xfcec4367d4c6a8a8c0e59c7e9492862c5c8547a0", "name": "MoonPool", "coinbase": "0x1a646f2e3330534a47a3d50fac7007207e3d9064", "capacity": 88814.62 },
    { "hash": "0xc0881b895837e907d47784162b08b80a5243afe1", "name": "SenpaiPool", "coinbase": "0x1a64733483127c0f9b1ddc5e4df3b85fa413e2bf", "capacity": 51000 },
    { "hash": "0x26e9d200b2e47523528c8d4d37449b0e0298228d", "name": "8ramenPool", "coinbase": "0x1a648073b5d9e287f77d0fd99f5eb2d3c22ab165", "capacity": 59000 },
    { "hash": "0x03b1797c52fa3ccfcf942266ab176209bf3c84b3", "name": "CarPool", "coinbase": "0x1a64923dc1c6a0cad164884032440c4094b80c07", "capacity": 72100 },
    { "hash": "0x81c5f6df1f2719409cea0202745aef0c6f31243c", "name": "IzmirPool", "coinbase": "0x1a650534dacc91c36179fffef0723703f3c77b52", "capacity": 51000 },
    { "hash": "0xce005161fdb93d08c1e3c69a590a0af2ea453603", "name": "AndyPool1", "coinbase": "0x1a64373c6e2991d7c954103a3049888b4e929074", "capacity": 0 },
    { "hash": "0x1dcfad56a8081269d2094d53fe07b36762fe51cd", "name": "AndyPool2", "coinbase": "0x1a644037ea73039b64f9cde929ea6c8dc3f1cd96", "capacity": 0 },
    { "hash": "0x4024fb87066079f3959d0734716f3dc3d7c0ea2c", "name": "WalkingPool", "coinbase": "0x5ff22c2e323295219dbfc67d8f72d981c5aadebd", "capacity": 0 },
    { "hash": "0x9dcfd381d03f203996518bc99f4657be0a2aaf4a", "name": "TeamPool", "coinbase": "0x46ea9df03be482e7684b4a6a0662836189bc1919", "capacity": 0 },
    { "hash": "0x1094d1cb06694cd75428e6482228d221be1ba952", "name": "DeadPool", "coinbase": "0x9955864b609531be8d1a094182f84aa120caf668", "capacity": 0 },
    { "hash": "0x6c8309789b6c5abc970cd122edad9ae250919ccc", "name": "BigPool", "coinbase": "0xc083609f8b5ee722053fca1bde9d5ae29c892855", "capacity": 0 },
    { "hash": "0x4e9b457abdaa4bcfe9a3535db3160bf81cd3eefd", "name": "BigPool", "coinbase": "0xa50461356093a07ab49419ec93c2d167d5d0a8de", "capacity": 0 },
    { "hash": "0xbe9a8ae02d619b5a391489701611c49f102bae06", "name": "LiverPool", "coinbase": "0x1a5858b4e5f2643eac2975e3f8983c3e30d3f742", "capacity": 0 },
    { "hash": "0xf415c582d635691700d03fb69007ad40601b5d1a", "name": "GroomPool", "coinbase": "0x1a5873c1e73a2fba69bc5c5a0763d1db972408b9", "capacity": 0 },
    { "hash": "0xf87d1af21523653cb534781758627937f61e8021", "name": "KeremPool", "coinbase": "0x1a5926257d4a63034f7aca047962d4e31e93cf86", "capacity": 0 }
];
function isTomopoolCandidate(candidate) {
    for (let index = 0; index < TOMO_POOL.length; index++) {
        const pool = TOMO_POOL[index];
        if (pool.coinbase.toString().toLowerCase() === candidate.toString().toLowerCase()) {
            return true;
        }
    }
    return false;
}
function doReport() {
    return __awaiter(this, void 0, void 0, function* () {
        let voters = yield db.Voters.find({});
        var unique_voters = "unique_voters.xlsx";
        var unique_voters_data = [
            ['#index', 'Voter'],
        ];
        var filename = "voters.xlsx";
        var data = [
            ['Voter', 'Capacity', 'Total Duration', 'Is TomoPool owner'],
        ];
        voters.forEach((voter) => {
            unique_voters_data.push([
                unique_voters_data.length,
                voter.address,
            ]);
            let time = new Date(voter.createdAt);
            let avg = [
                voter.address,
                0,
                0,
                false,
                false,
            ];
            let timeframe = 0;
            let stillActive = false;
            let avgCapacity = new bignumber_js_1.default(0);
            let isTomoPoolOnwer = false;
            voter.staked.forEach((duration) => {
                if (duration.endDate != "") {
                    timeframe += parseFloat(((new Date(duration.endDate).valueOf() - new Date(duration.startDate).valueOf()) / 86400000).toFixed(2));
                }
                stillActive = stillActive || (duration.endDate == "" ? true : false);
                if (duration.endDate == "" && duration.capacity != "NaN") {
                    avgCapacity = avgCapacity.plus(new bignumber_js_1.default(duration.capacity));
                }
                isTomoPoolOnwer = isTomoPoolOnwer || duration.isTomoPoolOwner;
            });
            if (stillActive) {
                let capacity = avgCapacity.div(new bignumber_js_1.default(1000000000000000000)).toFixed(2);
                if (capacity != "0.00") {
                    data.push([
                        voter.address,
                        avgCapacity.div(new bignumber_js_1.default(1000000000000000000)).toFixed(2),
                        timeframe,
                        isTomoPoolOnwer
                    ]);
                }
            }
        });
        // export unique users
        var ws_name = "Unique Users";
        var wb = XLSX.utils.book_new();
        var ws = XLSX.utils.aoa_to_sheet(unique_voters_data);
        XLSX.utils.book_append_sheet(wb, ws, ws_name);
        XLSX.writeFile(wb, "unique_users.xlsx");
        // export voter
        ws_name = "Voters";
        wb = XLSX.utils.book_new();
        ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, ws_name);
        XLSX.writeFile(wb, "voters_filtered_1.xlsx");
    });
}
// uniqueUsers()
// votedVolumnAndDuration()
// console.log(isTomopoolCandidate("0xa231bbc6095443c5993eb8964073e8eff6165ee9"))
doReport();
