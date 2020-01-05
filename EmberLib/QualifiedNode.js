"user strict";
const TreeNode = require("./TreeNode");
const BER = require('../ber.js');
const NodeContents = require("./NodeContents");
const {COMMAND_GETDIRECTORY, COMMAND_SUBSCRIBE, COMMAND_UNSUBSCRIBE} = require("./constants");
const Command = require("./Command");

class QualifiedNode extends TreeNode {
    constructor (path) {  
        super();  
        if (path != undefined) {
            this.path = path;
        }
    }

    isNode() {
        return true;
    }
    isQualified() {
        return true;
    }
    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(BER.APPLICATION(10));
    
        ber.startSequence(BER.CONTEXT(0));
        ber.writeRelativeOID(this.path, BER.EMBER_RELATIVE_OID);
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
     * @param {number} cmd 
     * @returns {TreeNode}
     */
    getCommand(cmd) {
        const r = new TreeNode();
        const qn = new QualifiedNode();
        qn.path = this.getPath();        
        r.addElement(qn);
        qn.addChild(new Command(cmd));
        return r;
    }

    /**
     * 
     * @param {function} callback 
     * @returns {TreeNode}
     */
    getDirectory(callback) {
        if (this.path === undefined) {
            throw new Error("Invalid path");
        }
        if (callback != null && this.contents != null && !this.isStream()) {
            this.contents._subscribers.add(callback);
        }
        return this.getCommand(COMMAND_GETDIRECTORY);
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
     * @param {function} callback 
     * @returns {TreeNode}
     */
    subscribe(callback) {
        if (this.path == null) {
            throw new Error("Invalid path");
        }
        if (callback != null && this.isStream()) {
            this.contents._subscribers.add(callback);
        }
        return this.getCommand(COMMAND_SUBSCRIBE);
    }

    /**
     * 
     * @param {function} callback
     * @returns {TreeNode}
     */
    unsubscribe(callback) {
        if (this.path == null) {
            throw new Error("Invalid path");
        }
        if (callback != null && this.isStream()) {
            this.contents._subscribers.delete(callback);
        }
        return this.getCommand(COMMAND_UNSUBSCRIBE);
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
        if (DEBUG) { console.log("QualifiedNode", qn); }
        return qn;
    }
}

module.exports = QualifiedNode;