const BER = require("../ber");
const StreamEntry = require("./StreamEntry");

class StreamCollection {
    /**
     * 
     */ 
    constructor() {
        /** @type {Map<number,StreamEntry>} */
        this.elements = new Map();
    }
    /**
     * 
     * @param {StreamEntry} entry 
     */
    addEntry(entry) {
        this.elements.set(entry.identifier, entry);
    }
     /**
     * 
     * @param {StreamEntry} entry 
     */
    removeEntry(entry) {
        this.elements.delete(entry.identifier);
    }
    /**
     * 
     * @param {number} identifier
     * @returns {StreamEntry}
     */
    getEntry(identifier) {
        return this.elements.get(identifier);
    }

    /**
     * @returns {StreamEntry}
     */
    [Symbol.iterator]() {
        return this.elements.values();
    }

    /**
     * @retuns {number}
     */
    size() {
        return this.elements.size;
    }

    /**
     * 
     * @param {BER.Writer} ber 
     */
    encode(ber) {
        ber.startSequence(StreamCollection.BERID);
        for(let [, entry] of this.elements) {
            ber.startSequence(BER.CONTEXT(0));
            entry.encode(ber);
            ber.endSequence();
        }
        ber.endSequence();
    }

    /**
     * @returns {
     * {identifier: number, value: string|number|boolean|Buffer}[]
     * }
     */
    toJSON() {
        const js = [];
        for(let [, entry] of this.elements) {
            js.push(entry.toJSON());
        }
        return js;
    }

    /**
     * @returns {number}
     */
    static get BERID() {
        return BER.APPLICATION(5);
    }

    /**
     * 
     * @param {BER.ExtendedReader} ber 
     * @returns {StreamCollection}
     */
    static decode(ber) {
        const streamCollection = new StreamCollection();
        const seq = ber.getSequence(this.BERID);                
        while (seq.remain > 0) {
            const rootReader = seq.getSequence(BER.CONTEXT(0));
            while (rootReader.remain > 0) {
                const entry = StreamEntry.decode(rootReader);
                streamCollection.addEntry(entry);
            }
        }
        return streamCollection;
    }
}

module.exports = StreamCollection;