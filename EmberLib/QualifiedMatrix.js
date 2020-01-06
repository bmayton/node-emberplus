"use strict";

const Matrix = require("./Matrix");
const {COMMAND_GETDIRECTORY, COMMAND_SUBSCRIBE, COMMAND_UNSUBSCRIBE} = require("./constants");
const BER = require('../ber.js');
const Command = require("./Command");

class QualifiedMatrix extends Matrix {
    /**
     * 
     * @param {string} path 
     */
    constructor(path) {       
        super(); 
        this.path = path;
    }

    isQualified() {
        return true;
    }
    /**
     * 
     * @param {Object<number,MatrixConnection>} connections
     * @returns {Root}
     */
    connect(connections) {
        const r = new Root();
        const qn = new QualifiedMatrix();
        qn.path = this.path;
        r.addElement(qn);
        qn.connections = connections;
        return r;
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(BER.APPLICATION(17));
    
        ber.startSequence(BER.CONTEXT(0));
        ber.writeRelativeOID(this.path, BER.EMBER_RELATIVE_OID);
        ber.endSequence(); // BER.CONTEXT(0)
    
        if(this.contents != null) {
            ber.startSequence(BER.CONTEXT(1));
            this.contents.encode(ber);
            ber.endSequence(); // BER.CONTEXT(1)
        }
    
        this.encodeChildren(ber);
        this.encodeTargets(ber);
        this.encodeSources(ber);
        this.encodeConnections(ber);
    
        ber.endSequence(); // BER.APPLICATION(3)
    }

    /**
     * 
     * @param {number} cmd
     * @returns {TreeNode}
     */
    getCommand(cmd) {
        const r = new TreeNode();
        const qn = new QualifiedMatrix();
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
        if (callback != null && !this.isStream()) {
            this.contents._subscribers.add(callback);
        }
        return this.getCommand(COMMAND_GETDIRECTORY);
    }

    /**
     * 
     * @param {function} callback
     * @returns {TreeNode}
     */
    subscribe(callback) {
        if (this.path === undefined) {
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
        if (this.path === undefined) {
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
     * @returns {QualifiedMatrix}
     */
    static decode(ber) {
        const qm = new QualifiedMatrix();
        ber = ber.getSequence(BER.APPLICATION(17));
        while(ber.remain > 0) {
            let tag = ber.peek();
            let seq = ber.getSequence(tag);
            if(tag == BER.CONTEXT(0)) {
                qm.path = seq.readRelativeOID(BER.EMBER_RELATIVE_OID); // 13 => relative OID
            }
            else if(tag == BER.CONTEXT(1)) {
                qm.contents = MatrixContents.decode(seq);
            } else if(tag == BER.CONTEXT(2)) {
                qm.decodeChildren(seq);
            } else if (tag == BER.CONTEXT(3)) {
                qm.targets = decodeTargets(seq);
            } else if (tag == BER.CONTEXT(4)) {
                qm.sources = decodeSources(seq);
            } else if (tag == BER.CONTEXT(5)) {
                qm.connections = {};
                seq = seq.getSequence(BER.EMBER_SEQUENCE);
                while(seq.remain > 0) {
                    let conSeq = seq.getSequence(BER.CONTEXT(0));
                    let con = MatrixConnection.decode(conSeq);
                    if (con.target !== undefined) {
                        qm.connections[con.target] = con;
                    }
                }
            }
            else {
                throw new errors.UnimplementedEmberTypeError(tag);
            }
        }
        return qm;
    }
}

module.exports = QualifiedMatrix;