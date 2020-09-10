"user strict";
const QualifiedElement = require("./QualifiedElement");
const BER = require('../ber.js');
const NodeContents = require("./NodeContents");
const Errors = require("../Errors");

class QualifiedNode extends QualifiedElement {
    constructor (path) {  
        super(path);  
        this._seqID = QualifiedNode.BERID;
    }

    /**
     * @returns {boolean}
     */
    isNode() {
        return true;
    }

    /**
     * 
     * @param {BER} ber 
     * @returns {QualifiedNode}
     */
    static decode(ber) {
        const qn = new QualifiedNode();
        ber = ber.getSequence(QualifiedNode.BERID);
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
                throw new Errors.UnimplementedEmberTypeError(tag);
            }
        }
        return qn;
    }

    /**
     * @returns {number}
     */
    static get BERID() {
        return BER.APPLICATION(10);
    }
}

module.exports = QualifiedNode;