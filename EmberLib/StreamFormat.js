"use strict";
const Enum = require('enum');

const StreamFormat = new Enum({
    unsignedInt8: 0,
    unsignedInt16BigEndian: 2,
    unsignedInt16LittleEndian: 3,
    unsignedInt32BigEndian: 4,
    unsignedInt32LittleEndian: 5,
    unsignedInt64BigEndian: 6,
    unsignedInt64LittleENdian: 7,
    signedInt8: 8,
    signedInt16BigEndian: 10,
    signedInt16LittleEndian: 11,
    signedInt32BigEndian: 12,
    signedInt32LittleEndian: 13,
    signedInt64BigEndian: 14,
    signedInt64LittleEndian: 15,
    ieeeFloat32BigEndian: 20,
    ieeeFloat32LittleEndian: 21,
    ieeeFloat64BigEndian: 22,
    ieeeFloat64LittleEndian: 23
});

module.exports = StreamFormat;