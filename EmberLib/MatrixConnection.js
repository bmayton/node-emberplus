"use strict";
const BER = require('../ber.js');
const MatrixOperation = require("./MatrixOperation");
const MatrixDisposition = require("./MatrixDisposition");
const errors = require("../errors");

class MatrixConnection {
    /**
     * 
     * @param {number} target 
     */
    constructor(target) {
        if (target) {
            let _target = Number(target);
            if (isNaN(_target)) { _target = 0; }
            this.target = _target;
        }
        else {
            this.target = 0;
        }
        this._locked = false;
    }

    /**
     * 
     * @param {number[]} sources 
     */
    connectSources(sources) {
        if (sources == null) {
            return;
        }
        let s = new Set(this.sources);
        for(let item of sources) {
            s.add(item);
        }
        this.sources = [...s].sort();
    }

    /**
     * 
     * @param {number[]} sources 
     */
    disconnectSources(sources) {
        if (sources == null) {
            return;
        }
        let s = new Set(this.sources);
        for(let item of sources) {
            s.delete(item);
        }
        this.sources = [...s].sort();
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(BER.APPLICATION(16));
    
        ber.startSequence(BER.CONTEXT(0));
        ber.writeInt(this.target);
        ber.endSequence();
    
        if ((this.sources !== undefined)&& (this.sources.length > 0)) {
            ber.startSequence(BER.CONTEXT(1));
            ber.writeRelativeOID(this.sources.join("."), BER.EMBER_RELATIVE_OID);
            ber.endSequence();
        }
        if (this.operation !== undefined) {
            ber.startSequence(BER.CONTEXT(2));
            ber.writeInt(this.operation.value);
            ber.endSequence();
        }
        if (this.disposition !== undefined) {
            ber.startSequence(BER.CONTEXT(3));
            ber.writeInt(this.disposition.value);
            ber.endSequence();
        }
        ber.endSequence();
    }

    /**
     * @returns {boolean}
     */
    isLocked() {
        return this._locked;
    }

    /**
     * 
     */
    lock() {
        this._locked = true;
    }

    /**
     * 
     * @param {number[]} sources 
     */
    setSources(sources) {
        if (sources == null) {
            delete this.sources;
            return;
        }
        let s = new Set(sources.map(i => Number(i)));
        this.sources = [...s].sort(); // sources should be an array
    }

    /**
     * 
     */
    unlock() {
        this._locked = false;
    }
    
    /**
     * 
     * @param {BER} ber
     * @returns {MatrixConnection}
     */
    static decode(ber) {
        const c = new MatrixConnection();
        ber = ber.getSequence(BER.APPLICATION(16));
        while (ber.remain > 0) {
            let tag = ber.peek();
            let seq = ber.getSequence(tag);
            if (tag == BER.CONTEXT(0)) {
                c.target = seq.readInt();
            }
            else if (tag == BER.CONTEXT(1)) {
                const sources = seq.readRelativeOID(BER.EMBER_RELATIVE_OID);
                if (sources === "") {
                   c .sources = [];
                }
                else {                
                    c.sources = sources.split(".").map(i => Number(i));
                }
            } else if (tag == BER.CONTEXT(2)) {
                c.operation = MatrixOperation.get(seq.readInt());
    
            } else if (tag == BER.CONTEXT(3)) {
                c.disposition = MatrixDisposition.get(seq.readInt());
            }
            else {
                throw new errors.UnimplementedEmberTypeError(tag);
            }
        }
        return c;
    }
    
}

module.exports = MatrixConnection;