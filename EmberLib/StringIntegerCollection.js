"use strict";
const Element = require("./Element");
const BER = require('../ber.js');
const errors = require("../errors");

class StringIntegerCollection extends Element {
    constructor() {
        super();
        this._seqID = BER.APPLICATION(8);
        this._collection = new Map();
    }

    addEntry(key, value) {
        this._collection.set(key, value);
    }

    get(key) {
        return this._collection.get(key);
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(BER.CONTEXT(15));
        ber.startSequence(BER.APPLICATION(8));
        ber.startSequence(BER.CONTEXT(0));
        for(let [key,value] of this._collection) {
            ber.startSequence(BER.APPLICATION(7));
            ber.startSequence(BER.CONTEXT(0));
            ber.writeString(key, BER.EMBER_STRING);
            ber.endSequence();
            ber.startSequence(BER.CONTEXT(1));
            ber.writeInt(value);
            ber.endSequence();
            ber.endSequence();
        }
        ber.endSequence();
        ber.endSequence();
        ber.endSequence();
    }

    /**
     * 
     * @param {BER} ber 
     */
    static decode(ber) {
        const sc = new StringIntegerCollection();
        ber = ber.getSequence(BER.APPLICATION(8));
        while(ber.remain > 0) {
            var seq = ber.getSequence(BER.CONTEXT(0));
            seq = seq.getSequence(BER.APPLICATION(7));
            var entryString, entryInteger;
            while(seq.remain > 0) {
                var tag = seq.peek();
                var dataSeq = seq.getSequence(tag);
                if(tag == BER.CONTEXT(0)) {
                    entryString = dataSeq.readString(BER.EMBER_STRING);
                } else if(tag == BER.CONTEXT(1)) {
                    entryInteger = dataSeq.readInt();
                } else {
                    throw new errors.UnimplementedEmberTypeError(tag);
                }
            }
    
            sc.addEntry(entryString,entryInteger);
        }
        return sc;
    }
}

module.exports = StringIntegerCollection;