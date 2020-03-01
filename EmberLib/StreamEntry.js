const BER = require("../ber");
const Errors = require("../Errors");

class StreamEntry {
    /**
     * 
     * @param {number} identifier 
     * @param {string|number|boolean|Buffer} value 
     */
    constructor(identifier, value ) {
        this.identifier = identifier;
        this.value = value;
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(StreamEntry.BERID);
        if (this.identifier != null) {
            ber.startSequence(BER.CONTEXT(0));
            ber.writeInt(this.identifier);
            ber.endSequence();
        }
        if (this.value != null) {
            ber.startSequence(BER.CONTEXT(1));
            ber.writeValue(this.value);
            ber.endSequence();
        }
        ber.endSequence();
    }

    /**
     * @returns {{
     * identifier: number,
     * value: string|number
     * }}
     */
    toJSON()  {
        return {
            identifier: this.identifier,
            value: this.value
        }
    }

    static get BERID() {
        return BER.APPLICATION(5);
    }

    static decode(ber) {
        const entry = new StreamEntry();
        const seq = ber.getSequence(this.BERID);
        while(seq.remain > 0) {
            const tag = seq.peek();
            const data = seq.getSequence(tag);
            if(tag == BER.CONTEXT(0)) {
                entry.identifier = data.readInt();
            } else if(tag == BER.CONTEXT(1)) {
                entry.value = data.readValue();
            }
            else {
                throw new Errors.UnimplementedEmberTypeError(tag);
            }
        }
        return entry;
    }
}

module.exports = StreamEntry;