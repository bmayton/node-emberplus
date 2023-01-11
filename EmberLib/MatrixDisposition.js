const Enum = require('enum');

// ConnectionDisposition ::=
//     INTEGER {
//     tally (0), -- default
//     modified (1), -- sources contains new current state
//     pending (2), -- sources contains future state
//     locked (3) -- error: target locked. sources contains current state
//     -- more tbd.
// }
const MatrixDisposition = new Enum({
    tally: 0,
    modified: 1,
    pending: 2,
    locked: 3
});

module.exports = MatrixDisposition;