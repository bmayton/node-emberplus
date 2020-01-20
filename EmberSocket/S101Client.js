"use strict";
const net = require('net');
const S101Socket = require("./S101Socket");

const DEFAULT_PORT = 9000;
class S101Client extends S101Socket {
    /**
     * 
     * @param {string} address 
     * @param {number} port=9000
     */
    constructor(address, port=DEFAULT_PORT) {
        super();
        this.address = address;
        this.port = port;                
    }

        /**
     * 
     * @param {number} timeout 
     */
    connect(timeout = 2) {
        if (this.status !== "disconnected") {
            return;
        }
        this.emit('connecting');    
        const connectTimeoutListener = () => {
            this.socket.destroy();
            this.emit("error", new Error(`Could not connect to ${this.address}:${this.port} after a timeout of ${timeout} seconds`));
        };
    
        this.socket = net.createConnection({
                port: this.port,
                host: this.address,
                timeout: 1000 * timeout
            },
            () => {
                // Disable connect timeout to hand-over to keepalive mechanism
                this.socket.removeListener("timeout", connectTimeoutListener);
                this.socket.setTimeout(0);
                this.startKeepAlive();                
                this.emit('connected');
            })
            .on('error', (e) => {
                this.emit("error", e);
            })
            .once("timeout", connectTimeoutListener)
            .on('data', (data) => {
                if (this.isConnected()) {
                    this.codec.dataIn(data);
                }
            })
            .on('close', this.handleClose)
            .on("end", this.handleClose);
        this._initSocket();
    }
}

module.exports = S101Client;
