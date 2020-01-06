"use strict";

const Element = require("./Element");
const QualifiedNode = require("./QualifiedNode");
const NodeContents = require("./NodeContents");
const BER = require('../ber.js');

class Node extends Element {
    /**
     * 
     * @param {number} number 
     */
    constructor(number) {
        super(number);
        this._seqID = BER.APPLICATION(3);
    }

    /**
     * @returns {boolean}
     */
    isNode() {
        return true;
    }    

    /**
     * 
     * @param {function} callback 
     */
    subscribe(callback) {
        if (callback != null && this.isStream()) {
            this.contents._subscribers.add(callback);
        }
    }

    /**
     * @returns {QualifiedNode}
     */
    toQualified() {
        const qn = new QualifiedNode(this.getPath());
        qn.update(this);
        return qn;
    }

    /**
     * 
     * @param {BER} ber 
     * @returns {Node}
     */
    static decode(ber) {
        const n = new Node();
        ber = ber.getSequence(BER.APPLICATION(3));
    
        while(ber.remain > 0) {
            let tag = ber.peek();
            let seq = ber.getSequence(tag);
            if(tag == BER.CONTEXT(0)) {
                n.number = seq.readInt();
            } else if(tag == BER.CONTEXT(1)) {
                n.contents = NodeContents.decode(seq);
            } else if(tag == BER.CONTEXT(2)) {
                n.decodeChildren(seq);
            } else {
                throw new errors.UnimplementedEmberTypeError(tag);
            }
        }
        return n;
    }
};

module.exports = Node;
