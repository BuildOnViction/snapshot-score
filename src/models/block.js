'use strict'

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var Vote = new Schema({
    candidate: String,
    amount: Number
}, { timestamps: true })


var Block = new Schema({
    number: {
        type: Number,
        index: true
    },
    voters: {
        type: Map,
        of: [Vote]
    },
}, { timestamps: true })

module.exports = mongoose.model('Block', Block)