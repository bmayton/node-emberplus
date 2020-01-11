const Enum = require('enum');
const BER = require('../ber.js');
const Errors = require("../errors");

function ParameterTypetoBERTAG(type) {
    switch (type.value) {
        case 1: return BER.EMBER_INTEGER;
        case 2: return BER.EMBER_REAL;
        case 3: return BER.EMBER_STRING;
        case 4: return BER.EMBER_BOOLEAN;
        case 7: return BER.EMBER_OCTETSTRING;
        default:
            throw new Errors.InvalidBERFormat(`Unhandled ParameterType ${type}`);
    }    
}

function ParameterTypefromBERTAG(tag) {
    switch (tag) {
        case BER.EMBER_INTEGER: return ParameterType.integer;
        case BER.EMBER_REAL: return ParameterType.real;
        case BER.EMBER_STRING: return ParameterType.string;
        case BER.EMBER_BOOLEAN: return ParameterType.boolean;
        case BER.EMBER_OCTETSTRING: return ParameterType.octets;
        default:
            throw new Errors.InvalidBERFormat(`Unhandled BER TAB ${tag}`);
    }    
}

/*
BER VAlue
Value ::=
 CHOICE {
 integer Integer64,
 real REAL,
 string EmberString,
 boolean BOOLEAN,
 octets OCTET STRING,
 null NULL
 }*/

 var ParameterType = new Enum({
    integer: 1,
    real: 2,
    string: 3,
    boolean: 4,
    trigger: 5,
    enum: 6,
    octets: 7
});

module.exports = {
    ParameterType, ParameterTypetoBERTAG, ParameterTypefromBERTAG
};