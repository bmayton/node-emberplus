"use strict";
const BER = require('../ber.js');
const MatrixOperation = require("./MatrixOperation");
const MatrixDisposition = require("./MatrixDisposition");
const Errors = require("../Errors");

class MatrixConnection {
    /**
     * 
     * @param {number} target 
     */
    constructor(target) {
        if (target) {
            let _target = Number(target);
            if (isNaN(_target)) { 
                throw new Errors.InvalidMatrixSignal(target, "Can't create connection with invalid target.")
             }
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
        this.sources = this.validateSources(sources);
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
        ber.startSequence(MatrixConnection.BERID);
    
        ber.startSequence(BER.CONTEXT(0));
        ber.writeInt(this.target);
        ber.endSequence();
    
        if (this.sources != null) {
            ber.startSequence(BER.CONTEXT(1));
            ber.writeRelativeOID(this.sources.join("."), BER.EMBER_RELATIVE_OID);
            ber.endSequence();
        }
        if (this.operation != null) {
            ber.startSequence(BER.CONTEXT(2));
            ber.writeInt(this.operation.value);
            ber.endSequence();
        }
        if (this.disposition != null) {
            ber.startSequence(BER.CONTEXT(3));
            ber.writeInt(this.disposition.value);
            ber.endSequence();
        }
        ber.endSequence();
    }
    
    /**
     * 
     * @param {number[]|null} sources 
     */
    isDifferent(sources) {
        const newSources = this.validateSources(sources);
        
        if (this.sources == null && newSources == null) {
            return false;
        }

        if ((this.sources == null && newSources != null)||
            (this.sources != null && newSources == null) ||
            (this.sources.length != newSources.length)) {
            return true;
        }
        // list are ordered, so we can simply parse 1 by 1.
        for(let i = 0; i < this.sources.length; i++) {
            if (this.sources[i] !== newSources[i]) {
                return true;
            }
        }
        return false;
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
        this.sources = this.validateSources(sources);
    }

    /**
     * 
     * @param {number[]} sources 
     * @returns {number[]} - uniq and sorted
     */
    validateSources(sources) {
        if (sources == null) {
            return null;
        }
        const s = new Set(sources.map(i => Number(i)));
        return [...s].sort();
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
        ber = ber.getSequence(MatrixConnection.BERID);
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
                throw new Errors.UnimplementedEmberTypeError(tag);
            }
        }
        return c;
    }
    
    /**
     * 
     */
    static get BERID() {
        return BER.APPLICATION(16);
    }
}

module.exports = MatrixConnection;