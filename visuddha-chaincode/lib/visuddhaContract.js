'use strict';

const { Contract } = require('fabric-contract-api');

class VisuddhaContract extends Contract {

    async CreateProduct(ctx, productId, name, price, owner) {
        const product = {
            docType: 'Product',
            name: name,
            price: parseFloat(price),
            owner: owner,
        };
        await ctx.stub.putState(productId, Buffer.from(JSON.stringify(product)));
        return JSON.stringify({ productId, txId: ctx.stub.getTxID() });
    }

    async GetProduct(ctx, productId) {
        const productAsBytes = await ctx.stub.getState(productId);
        if (!productAsBytes || productAsBytes.length === 0) {
            throw new Error(`Product ${productId} does not exist`);
        }
        return productAsBytes.toString();
    }
    
    async CreateOrder(ctx, orderId, productId, quantity) {
        const productAsBytes = await ctx.stub.getState(productId);
        if (!productAsBytes || productAsBytes.length === 0) {
            throw new Error(`Cannot create order: Product ${productId} does not exist`);
        }
        const order = {
            docType: 'Order',
            productId: productId,
            quantity: parseInt(quantity),
            orderer: ctx.clientIdentity.getID(),
            timestamp: new Date().toISOString(),
        };
        await ctx.stub.putState(orderId, Buffer.from(JSON.stringify(order)));
        return JSON.stringify({ orderId, txId: ctx.stub.getTxID() });
    }

    async GetOrder(ctx, orderId) {
        const orderAsBytes = await ctx.stub.getState(orderId);
        if (!orderAsBytes || orderAsBytes.length === 0) {
            throw new Error(`Order ${orderId} does not exist`);
        }
        return orderAsBytes.toString();
    }
}

module.exports = VisuddhaContract;