"use strict";

const EventEmitter = require('events').EventEmitter;
const BER = require('../ber.js');
const ember = require('../EmberLib');
const S101Codec = require('../s101.js');


class S101Socket extends EventEmitter{
    /**
     * 
     * @param {Socket} socket 
     */
    constructor(socket = null) {
        super();
        this.socket = socket;
        this.keepaliveInterval = 10;
        this.keepaliveIntervalTimer = null;
        this.pendingRequests = [];
        this.activeRequest = null;
        this.status = this.isConnected() ? "connected" : "disconnected";

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

        this._initSocket();
    }

    _initSocket() {
        if (this.socket != null) {
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
        if (this.socket == null) {
            return "not connected";
        }
        return `${this.socket.remoteAddress}:${this.socket.remotePort}`
    }

    /**
     * @param {number} timeout=2
     */
    disconnect(timeout = 2) {
        if (!this.isConnected()) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            if (this.keepaliveIntervalTimer != null) {
                clearInterval(this.keepaliveIntervalTimer);
                this.keepaliveIntervalTimer = null;
            }
            let done  = false;
            const cb = (data, error) => {
                if (done) { return; }
                done = true;
                if (timer != null) {
                    clearTimeout(timer);
                    timer = null;
                }                    
                if (error == null) {
                    resolve();                        
                }
                else {
                    reject(error);
                }
            };
            let timer;
            if (timeout != null && (!isNaN(timeout)) && timeout > 0) {
                timer = setTimeout(cb, 100 * timeout);
            }
            this.socket.end(cb);
            this.status = "disconnected";
        });
    }

    /**
     * 
     */
    handleClose() {
        this.socket = null;
        clearInterval(this.keepaliveIntervalTimer);
        this.status = "disconnected";
        this.emit('disconnected');            
    }

    /**
     * @returns {boolean}
     */
    isConnected() {
        return ((this.socket !== null) && (this.socket != null));
    }

    /**
     * 
     * @param {Buffer} data 
     */
    sendBER(data) {
        if (this.isConnected()) {
            try {
                const frames = this.codec.encodeBER(data);
                for (let i = 0; i < frames.length; i++) {
                    this.socket.write(frames[i]);
                }   
            }
            catch(e){
                this.handleClose();
            }
        }
    }

    /**
     * 
     */
    sendKeepaliveRequest() {
        if (this.isConnected()) {
            try {
                this.socket.write(this.codec.keepAliveRequest());
            }
            catch(e){
                this.handleClose();
            }
        }
    }

    /**
     * 
     */
    sendKeepaliveResponse() {
        if (this.isConnected()) {
            try {
                this.socket.write(this.codec.keepAliveResponse());
            }
            catch(e){
                this.handleClose();
            }
        }
    }

    /**
     * 
     * @param {TreeNode} node 
     */
    sendBERNode(node) {
        if (!node) return;
        const writer = new BER.Writer();
        node.encode(writer);
        this.sendBER(writer.buffer);
    }

    startKeepAlive() {
        this.keepaliveIntervalTimer = setInterval(() => {
            try {
                this.sendKeepaliveRequest();
            } catch (e) {
                this.emit("error", e);
            }
        }, 1000 * this.keepaliveInterval);
    }
}

module.exports = S101Socket;