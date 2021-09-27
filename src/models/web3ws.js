'use strict'

const Web3 = require('web3')

const web3Ws = {
    Web3Ws: function () {
        let provider = new Web3.providers.WebsocketProvider("wss://ws.tomochain.com")
        let web3 = new Web3(provider)
        return web3
    },
    Web3WsInternal: function () {
        let provider = new Web3.providers.WebsocketProvider("wss://ws.tomochain.com")
        let web3 = new Web3(provider)
        return web3
    }
}

// function Web3Ws () {
//     let provider = new Web3.providers.WebsocketProvider("wss://ws.testnet.tomochain.com")
//     let web3 = new Web3(provider)
//     return web3
// }

module.exports = web3Ws