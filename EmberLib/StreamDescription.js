"use strict";
const Element = require("./Element");
const BER = require('../ber.js');
const StreamFormat = require("./StreamFormat");
const errors = require("../errors");

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
        ber.startSequence(BER.APPLICATION(12));
    
        ber.writeIfDefinedEnum(this.format, StreamFormat, ber.writeInt, 0);
        ber.writeIfDefined(this.offset, ber.writeInt, 1);
    
        ber.endSequence();
    }
    
    static decode(ber) {
        const sd = new StreamDescription();
        ber = ber.getSequence(BER.APPLICATION(12));
    
        while(ber.remain > 0) {
            var tag = ber.peek();
            var seq =ber.getSequence(tag);
            if(tag == BER.CONTEXT(0)) {
                sd.format = StreamFormat.get(seq.readInt());
            } else if(tag == BER.CONTEXT(1)) {
                sd.offset = seq.readInt();
            } else {
                throw new errors.UnimplementedEmberTypeError(tag);
            }
        }    
        return sd;
    }
}

module.exports = StreamDescription;