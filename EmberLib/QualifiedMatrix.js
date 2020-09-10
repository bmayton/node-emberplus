"use strict";

const Matrix = require("./Matrix");
const BER = require('../ber.js');
const Command = require("./Command");
const MatrixContents = require("./MatrixContents");
const MatrixConnection = require("./MatrixConnection");
const errors = require("../Errors");

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
        const r = this.getNewTree();
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
        ber.startSequence(QualifiedMatrix.BERID);
    
        this.encodePath(ber);
    
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
     * @param {BER} ber 
     * @returns {QualifiedMatrix}
     */
    static decode(ber) {
        const qm = new QualifiedMatrix();
        ber = ber.getSequence(QualifiedMatrix.BERID);
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
                qm.targets = Matrix.decodeTargets(seq);
            } else if (tag == BER.CONTEXT(4)) {
                qm.sources = Matrix.decodeSources(seq);
            } else if (tag == BER.CONTEXT(5)) {
                qm.connections = {};
                seq = seq.getSequence(BER.EMBER_SEQUENCE);
                while(seq.remain > 0) {
                    let conSeq = seq.getSequence(BER.CONTEXT(0));
                    let con = MatrixConnection.decode(conSeq);
                    if (con.target != null) {
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

    /**
     * @returns {number}
     */
    static get BERID() {
        return BER.APPLICATION(17);
    }
}

module.exports = QualifiedMatrix;