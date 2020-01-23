"use strict";
const EventEmitter = require('events').EventEmitter;
const S101Socket = require("./S101Socket");
const net = require('net');
const Errors = require("../Errors");

class S101Server extends EventEmitter {
    /**
     * 
     * @param {string} address 
     * @param {number} port 
     */
    constructor(address, port) {
        super();
        this.address = address;
        this.port = Number(port);
        this.server = null;
        this.status = "disconnected";
    }
    /**
     * 
     * @param {Socket} socket - tcp socket
     */
    addClient(socket) {
        // Wrap the tcp socket into an S101Socket.
        const client = new S101Socket(socket);
        this.emit("connection", client);
    }
    /**
     * @returns {Promise}
     */
    listen() {
        return new Promise((resolve, reject) => {
            if (this.status !== "disconnected") {
                return reject(new Errors.S101SocketError("Already listening"));
            }        
            this.server = net.createServer((socket) => {
                this.addClient(socket);
            }).on("error", (e) => {
                this.emit("error", e);
                if (this.status === "disconnected") {
                    return reject(e);
                }
            }).on("listening", () => {
                this.emit("listening");
                this.status = "listening";
                resolve();
            });
            this.server.listen(this.port, this.address);
        });
    }
    
}

module.exports = S101Server;