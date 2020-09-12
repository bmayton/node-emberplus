
const Enum = require('enum');

var ParameterAccess = new Enum({
    none: 0,
    read: 1,
    write: 2,
    readWrite: 3
});


module.exports = ParameterAccess;