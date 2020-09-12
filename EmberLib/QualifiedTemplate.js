"use strict";
const TemplateElement = require("./TemplateElement");
const QualifiedElement = require("./QualifiedElement");
const Template = require("./Template");
const BER = require('../ber.js');
const Errors = require("../Errors");

class QualifiedTemplate extends QualifiedElement {
    /**
     * 
     * @param {string} path
     * @param {Node|Function|MatrixNode|Parameter} element
     */
    constructor(path, element) {
        super(path);
        this.element = element;
        this._seqID = QualifiedTemplate.BERID;
    }

    /**
     * @returns {boolean}
     */
    isTemplate() {
        return true;
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(QualifiedTemplate.BERID);
    
        this.encodePath(ber);
    
        TemplateElement.encodeContent(this, ber);
        
        ber.endSequence(); 
    }

    /**
     * 
     * @param {Template} other 
     */
    update(other) {
        this.element = other.element;
    }

    /**
     * 
     * @param {BER} ber 
     * @returns {QualifiedTemplate}
     */
    static decode(ber) {
        const qt = new QualifiedTemplate();
        ber = ber.getSequence(QualifiedTemplate.BERID);
        while(ber.remain > 0) {
            let tag = ber.peek();
            let seq = ber.getSequence(tag);
            if(tag == BER.CONTEXT(0)) {
                qt.path = seq.readRelativeOID(BER.EMBER_RELATIVE_OID); // 13 => relative OID
            }
            else {
                TemplateElement.decodeContent(qt, tag, seq);
            }
        }
        return qt;
    }

    /**
     * @returns {number}
     */
    static get BERID() {
        return BER.APPLICATION(25);
    }
}

module.exports = QualifiedTemplate;