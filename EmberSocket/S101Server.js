"use strict";
const EventEmitter = require('events').EventEmitter;
const S101Client = require("./S101Client");
const net = require('net');

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
     * @param {Socket} socket 
     */
    addClient(socket) {
        const client = new S101Client(socket, this);
        this.emit("connection", client);
    }
    /**
     * 
     */
    listen () {
        if (this.status !== "disconnected") {
            return;
        }
    
        this.server = net.createServer((socket) => {
            this.addClient(socket);
        });
    
        this.server.on("error", (e) => {
            this.emit("error", e);
        });
    
        this.server.on("listening", () => {
            this.emit("listening");
            this.status = "listening";
        });
    
        this.server.listen(this.port, this.address);
    }
    
}

module.exports = S101Server;