const Enum = require('enum');

// ConnectionOperation ::=
//     INTEGER {
//     absolute (0), -- default. sources contains absolute information
//     connect (1), -- nToN only. sources contains sources to add to connection
//     disconnect (2) -- nToN only. sources contains sources to remove from
//     connection
// }

const MatrixOperation = new Enum({
    absolute: 0,
    connect: 1,
    disconnect: 2
});

module.exports = MatrixOperation;