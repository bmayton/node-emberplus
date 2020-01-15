"use strict";
const BER = require('../ber.js');
const Errors = require("../Errors");

class StringIntegerPair {
    constructor(key,value) {
        this.key = key;
        this.value = value;
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        if (this.key == null || this.value == null) {
            throw new Errors.InvalidEmberNode("", "Invalid key/value missing");
        }
        ber.startSequence(StringIntegerPair.BERID);        
        ber.startSequence(BER.CONTEXT(0));
        ber.writeString(this.key, BER.EMBER_STRING);
        ber.endSequence();
        ber.startSequence(BER.CONTEXT(1));
        ber.writeInt(this.value);
        ber.endSequence();
        ber.endSequence();            
    }

     /**
     * @typedef {{
        *  key: string
        *  value: number
        * }} JSON_StringPair
        */

    /**
     * @returns {{
     *  key: string
     *  value: number
     * }}
     */
    toJSON() {
        return {
            key: this.key,
            value: this.value
        }
    }
    /**
     * 
     * @param {BER} ber 
     * @returns {StringIntegerPair}
     */
    static decode(ber) {
        const sp = new StringIntegerPair();
        let seq = ber.getSequence(StringIntegerPair.BERID);
        while(seq.remain > 0) {
            const tag = seq.peek();
            const dataSeq = seq.getSequence(tag);
            if(tag == BER.CONTEXT(0)) {
                sp.key = dataSeq.readString(BER.EMBER_STRING);
            } else if(tag == BER.CONTEXT(1)) {
                sp.value = dataSeq.readInt();
            } else {
                throw new Errors.UnimplementedEmberTypeError(tag);
            }
        }
        return sp;
    }

    /**
     * @returns {number}
     */
    static get BERID() {
        return BER.APPLICATION(7);
    }
}

module.exports = StringIntegerPair;