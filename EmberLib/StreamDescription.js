"use strict";
const Element = require("./Element");
const BER = require('../ber.js');
const StreamFormat = require("./StreamFormat");
const Errors = require("../Errors");

class StreamDescription extends Element{
    /**
     * 
     */
    constructor() {
        super();
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(StreamDescription.BERID);
    
        ber.writeIfDefinedEnum(this.format, StreamFormat, ber.writeInt, 0);
        ber.writeIfDefined(this.offset, ber.writeInt, 1);
    
        ber.endSequence();
    }

    /**
     * 
     */
    toJSON() {
        return {
            format: this.format == null ? null : this.format.key,
            offset: this.offset
        };
    }

    /**
     * 
     * @param {BER} ber
     * @returns {StreamDescription}
     */
    static decode(ber) {
        const sd = new StreamDescription();
        ber = ber.getSequence(StreamDescription.BERID);
    
        while(ber.remain > 0) {
            var tag = ber.peek();
            var seq =ber.getSequence(tag);
            if(tag == BER.CONTEXT(0)) {
                sd.format = StreamFormat.get(seq.readInt());
            } else if(tag == BER.CONTEXT(1)) {
                sd.offset = seq.readInt();
            } else {
                throw new Errors.UnimplementedEmberTypeError(tag);
            }
        }    
        return sd;
    }

    /**
     * @returns {number}
     */
    static get BERID() {
        return BER.APPLICATION(12);
    }
}

module.exports = StreamDescription;