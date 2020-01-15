"use strict";
const BER = require('../ber.js');
const Errors = require("../Errors");

class Label {
    constructor(path, description) {
        if (path) {
            this.basePath = path;
        }
        if (description) {
            this.description = description;
        }
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(Label.BERID);
        if (this.basePath == null) {
            throw new Errors.InvalidEmberNode("", "Missing label base path");
        }
        ber.startSequence(BER.CONTEXT(0));
        ber.writeRelativeOID(this.basePath, BER.EMBER_RELATIVE_OID);
        ber.endSequence();
        if (this.description == null) { 
            throw new Errors.InvalidEmberNode("", "Missing label description");
        }
        ber.startSequence(BER.CONTEXT(1));
        ber.writeString(this.description, BER.EMBER_STRING);
        ber.endSequence();
        ber.endSequence();
    }

    /**
     * 
     * @param {BER} ber 
     * @returns {Label}
     */
    static decode(ber) {
        var l = new Label();
    
        ber = ber.getSequence(Label.BERID);
    
        while (ber.remain > 0) {
            var tag = ber.peek();
            var seq = ber.getSequence(tag);
            if (tag == BER.CONTEXT(0)) {
                l.basePath = seq.readRelativeOID(BER.EMBER_RELATIVE_OID);
            } else if (tag == BER.CONTEXT(1)) {
                l.description = seq.readString(BER.EMBER_STRING);
            }
            else {
                throw new Errors.UnimplementedEmberTypeError(tag);
            }
        }
        return l;
    }

    /**
     * 
     */
    static get BERID() {
        return BER.APPLICATION(18);
    }
}

module.exports = Label;