'use strict';
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const { buildCCPOrg1, buildWallet } = require('../fabric-utils/AppUtil');

const channelName = 'mychannel';
const chaincodeName = 'visuddha';
const walletPath = path.resolve(__dirname, '..', '..', 'wallet');

async function getContract(user = 'admin') {
    const ccp = buildCCPOrg1();
    const wallet = await buildWallet(Wallets, walletPath);
    const gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet, identity: user, discovery: { enabled: true, asLocalhost: true }
    });
    const network = await gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);
    return { contract, gateway };
}

async function createProductOnChain(productId, name, price, owner) {
    let { contract, gateway } = await getContract();
    try {
        const resultBytes = await contract.submitTransaction('CreateProduct', productId, name, String(price), owner);
        const result = JSON.parse(resultBytes.toString());
        return result.txId;
    } finally {
        gateway.disconnect();
    }
}

async function getProductFromChain(productId) {
    let { contract, gateway } = await getContract();
    try {
        const resultBytes = await contract.evaluateTransaction('GetProduct', productId);
        return JSON.parse(resultBytes.toString());
    } finally {
        gateway.disconnect();
    }
}

async function createOrderOnChain(orderId, productId, quantity) {
    let { contract, gateway } = await getContract();
    try {
        const resultBytes = await contract.submitTransaction('CreateOrder', orderId, productId, String(quantity));
        const result = JSON.parse(resultBytes.toString());
        return result.txId;
    } finally {
        gateway.disconnect();
    }
}

async function getOrderFromChain(orderId) {
    let { contract, gateway } = await getContract();
    try {
        const resultBytes = await contract.evaluateTransaction('GetOrder', orderId);
        return JSON.parse(resultBytes.toString());
    } finally {
        gateway.disconnect();
    }
}

module.exports = {
    createProductOnChain,
    getProductFromChain,
    createOrderOnChain,
    getOrderFromChain
};