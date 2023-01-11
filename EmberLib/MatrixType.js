
const Enum = require('enum');

const MatrixType = new Enum({
    oneToN: 0,
    oneToOne: 1,
    nToN: 2
});

module.exports = MatrixType;