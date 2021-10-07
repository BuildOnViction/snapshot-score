'use strict'

var mongoose = require('mongoose')
var Schema = mongoose.Schema

var Voters = new Schema({
    address: {
        type: String,
        // unique: true,
        index: true
    },
    count: Number,
    history: String,
    staked:  [{
        capacity: String,
        startDate: String,
        endDate: String,
        candidate: String,
        isTomoPoolOwner: Boolean,
    }],
}, { timestamps: true })

module.exports = mongoose.model('Voters', Voters)