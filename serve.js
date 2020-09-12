const yargs = require('yargs');
const { EmberServer, Decoder } = require('./index');
const { readFileSync } = require('fs');

const argv = yargs.options({
    host: {
        alias: 'h',
        description: 'host name|ip',
        default: '0.0.0.0'
    },

    port: {
        alias: 'p',
        default: 9000,
        type: 'number',
        description: 'port',
        demandOption: true
    },

    file: {
        alias: 'f',
        description: 'file containing the ber (default) or json tree',
        demandOption: true
    },

    json: {
        alias: 'j',
        type: 'boolean',
        description: 'file format is json'
    },
    debug: {
        alias: 'd',
        type: 'boolean',
        description: 'debug'
    }

}).help().argv;

const main = async () => {
    const data = readFileSync(argv.file);
    const tree = argv.json ? EmberServer.JSONtoTree(JSON.parse(data.toString())) : Decoder(data);
    const server = new EmberServer(argv.host, argv.port, tree);
    server._debug = true;
    console.log(Date.now(), 'starting server');
    if (argv.debug) {
        server._debug = true;
    }
    try {
        server.listen();
    } catch (e) {
        console.log(e);
    }
};

main();
