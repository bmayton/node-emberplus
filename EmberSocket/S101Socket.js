"use strict";

const EventEmitter = require('events').EventEmitter;
const net = require('net');
const BER = require('../ber.js');
const ember = require('../EmberLib');
const S101Codec = require('../s101.js');


class S101Socket extends EventEmitter{
    constructor(address, port) {
        super();
        this.address = address;
        this.port = port;
        this.socket = null;
        this.keepaliveInterval = 10;
        this.codec = null;
        this.status = "disconnected";
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
    
        this.codec = new S101Codec();
    
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
    
                this.keepaliveIntervalTimer = setInterval(() => {
                    try {
                        this.sendKeepaliveRequest();
                    } catch (e) {
                        this.emit("error", e);
                    }
                }, 1000 * this.keepaliveInterval);
    
                this.codec.on('keepaliveReq', () => {
                    this.sendKeepaliveResponse();
                });
    
                this.codec.on('emberPacket', (packet) => {
                    this.emit('emberPacket', packet);
    
                    const ber = new BER.Reader(packet);
                    try {
                        const root = ember.rootDecode(ber);
                        if (root !== undefined) {
                            this.emit('emberTree', root);
                        }
                    } catch (e) {
                        this.emit("error", e);
                    }
                });
    
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
    }

    /**
     * 
     */
    disconnect() {
        if (!this.isConnected()) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
                this.socket.once('close', () => {
                    this.codec = null;
                    this.socket = null;
                    resolve();
                });
                this.socket.once('error', reject);
                clearInterval(this.keepaliveIntervalTimer);
                this.socket.end();
                this.status = "disconnected";
            }
        );
    };

    /**
     * 
     */
    handleClose() {
        this.socket = null;
        clearInterval(this.keepaliveIntervalTimer);
        this.status = "disconnected";
        this.emit('disconnected');            
    };

    /**
     * @returns {boolean}
     */
    isConnected() {
        return ((this.socket !== null) && (this.socket !== undefined));
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
}

module.exports = S101Socket;