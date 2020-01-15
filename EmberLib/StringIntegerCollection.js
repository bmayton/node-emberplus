"use strict";
const BER = require('../ber.js');
const StringIntegerPair = require("./StringIntegerPair");
const Errors = require("../Errors");

class StringIntegerCollection {
    constructor() {
        this._collection = new Map();
    }

    /**
     * 
     * @param {string} key 
     * @param {StringIntegerPair} value 
     */
    addEntry(key, value) {
        if (!(value instanceof StringIntegerPair)) {
            throw new Errors.InvalidStringPair();
        }
        this._collection.set(key, value);
    }

    /**
     * 
     * @param {string} key 
     * @returns {StringIntegerPair}
     */
    get(key) {
        return this._collection.get(key);
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(StringIntegerCollection.BERID);        
        for(let [,sp] of this._collection) {
            ber.startSequence(BER.CONTEXT(0));
            sp.encode(ber);
            ber.endSequence();
        }        
        ber.endSequence();
    }

    /**
     * @returns {JSON_StringPair[]}
     */
    toJSON() {
        const collection = [];
        for(let [,sp] of this._collection) {
            collection.push(sp.toJSON());
        }
        return collection;
    }

    /**
     * 
     * @param {BER} ber 
     * @returns {StringIntegerCollection}
     */
    static decode(ber) {
        const sc = new StringIntegerCollection();
        const seq = ber.getSequence(StringIntegerCollection.BERID);
        while(seq.remain > 0) {
            const tag = seq.peek();
            if (tag != BER.CONTEXT(0)) {
                throw new Errors.UnimplementedEmberTypeError(tag);
            }
            const data = seq.getSequence(BER.CONTEXT(0));
            const sp = StringIntegerPair.decode(data)
            sc.addEntry(sp.key, sp);
        }
        return sc;
    }

    /**
     * @returns {number}
     */
    static get BERID() {
        return BER.APPLICATION(8);
    }
}

module.exports = StringIntegerCollection;