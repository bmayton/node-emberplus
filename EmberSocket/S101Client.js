"use strict";

const S101Socket = require("./S101Socket");
const S101Codec = require('../s101.js');
const BER = require('../ber.js');
const ember = require("../EmberLib");

class S101Client extends S101Socket {
    /**
     * 
     * @param {Socket} socket 
     * @param {S101Server} server 
     */
    constructor(socket, server) {
        super()
        this.request = null;
        /** @type {S101Server} */
        this.server = server;
        /** @type {Socket} */
        this.socket = socket;

        this.pendingRequests = [];
        this.activeRequest = null;

        this.status = "connected";

        this.codec = new S101Codec();
        this.codec.on('keepaliveReq', () => {
            this.sendKeepaliveResponse();
        });

        this.codec.on('emberPacket', (packet) => {
            this.emit('emberPacket', packet);
            const ber = new BER.Reader(packet);
            try {
                const root = ember.rootDecode(ber);
                if (root != null) {
                    this.emit('emberTree', root);
                }
            } catch (e) {
                this.emit("error", e);
            }
        });

        if (socket != null) {
            this.socket.on('data', (data) => {
                this.codec.dataIn(data);
            });

            this.socket.on('close', () => {
                this.emit('disconnected');
                this.status = "disconnected";
                this.socket = null;
            });

            this.socket.on('error', (e) => {
                this.emit("error", e);
            });
        }
    }

    /**
     * 
     * @param {function} cb 
     */
    addRequest(cb) {
        this.pendingRequests.push(cb);
        this._makeRequest();
    }

    _makeRequest() {
        if (this.activeRequest === null && this.pendingRequests.length > 0) {
            this.activeRequest = this.pendingRequests.shift();
            this.activeRequest();
            this.activeRequest = null;
        }
    }

    /**
     * 
     * @param {TreeNode} node 
     */
    queueMessage(node) {
        this.addRequest(() => this.sendBERNode(node));
    }

    /**
     * @returns {string} - ie: "10.1.1.1:9000"
     */
    remoteAddress() {
        if (this.socket === undefined) {
            return;
        }
        return `${this.socket.remoteAddress}:${this.socket.remotePort}`
    }
}

module.exports = S101Client;
