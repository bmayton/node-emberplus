"use strict";

const Element = require("./Element");
const QualifiedNode = require("./QualifiedNode");
const NodeContents = require("./NodeContents");
const BER = require('../ber.js');
const Errors = require("../Errors");

class Node extends Element {
    /**
     * 
     * @param {number} number 
     */
    constructor(number) {
        super(number);
        this._seqID = Node.BERID;
        /** @type {NodeContents} */
        this.contents = null;
    }

    /**
     * @returns {boolean}
     */
    isNode() {
        return true;
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
        ber = ber.getSequence(Node.BERID);
    
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
                throw new Errors.UnimplementedEmberTypeError(tag);
            }
        }
        return n;
    }

    /**
     * @returns {number}
     */
    static get BERID() {
        return BER.APPLICATION(3);
    }
}

module.exports = Node;
