'use strict'

const ValidatorABI = require('../../build/contracts/TomoValidator')

function Validator (web3) {
    const validator = new web3.eth.Contract(ValidatorABI.abi, "0x0000000000000000000000000000000000000088")
    return validator
}

module.exports = Validator