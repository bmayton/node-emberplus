"use strict";

const TreeNode = require("./TreeNode");
const QualifiedNode = require("./QualifiedNode");
const NodeContents = require("./NodeContents");
const BER = require('../ber.js');

class Node extends TreeNode {
    /**
     * 
     * @param {number} number 
     */
    constructor(number) {
        super();
        this.number = number;
    }

    isNode() {
        return true;
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(BER.APPLICATION(3));
    
        ber.startSequence(BER.CONTEXT(0));
        ber.writeInt(this.number);
        ber.endSequence(); // BER.CONTEXT(0)
    
        if(this.contents != null) {
            ber.startSequence(BER.CONTEXT(1));
            this.contents.encode(ber);
            ber.endSequence(); // BER.CONTEXT(1)
        }
    
        this.encodeChildren(ber);
    
        ber.endSequence(); // BER.APPLICATION(3)
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
        if (DEBUG) { console.log("Node", n); }
        return n;
    }
};

module.exports = Node;
