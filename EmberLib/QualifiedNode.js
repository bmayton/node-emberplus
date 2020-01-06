"user strict";
const QualifiedElement = require("./QualifiedElement");
const BER = require('../ber.js');
const NodeContents = require("./NodeContents");
const {COMMAND_GETDIRECTORY, COMMAND_SUBSCRIBE, COMMAND_UNSUBSCRIBE} = require("./constants");
const Command = require("./Command");

class QualifiedNode extends QualifiedElement {
    constructor (path) {  
        super(path);  
        this._seqID = BER.APPLICATION(10);
    }

    /**
     * @returns {boolean}
     */
    isNode() {
        return true;
    }

    /**
     * 
     * @param {boolean} complete
     * @returns {QualifiedNode}
     */
    getMinimal(complete = false) {
        const number = this.getNumber();
        const n = new Node(number);
        if (complete && (this.contents != null)) {
            n.contents = this.contents;
        }
        return n;
    }

    /**
     * 
     * @param {BER} ber 
     * @returns {QualifiedNode}
     */
    static decode(ber) {
        const qn = new QualifiedNode();
        ber = ber.getSequence(BER.APPLICATION(10));
        while(ber.remain > 0) {
            let tag = ber.peek();
            let seq = ber.getSequence(tag);
            if(tag == BER.CONTEXT(0)) {
                qn.path = seq.readRelativeOID(BER.EMBER_RELATIVE_OID); // 13 => relative OID
            }
            else if(tag == BER.CONTEXT(1)) {
                qn.contents = NodeContents.decode(seq);
            } else if(tag == BER.CONTEXT(2)) {
                qn.decodeChildren(seq);
            } else {
                throw new errors.UnimplementedEmberTypeError(tag);
            }
        }
        return qn;
    }
}

module.exports = QualifiedNode;