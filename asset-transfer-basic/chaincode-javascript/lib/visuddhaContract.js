'use strict';

const { Contract } = require('fabric-contract-api');

class VisuddhaContract extends Contract {

    /**
     * Creates a product record on the ledger. This mirrors your POST /products endpoint.
     * @param {string} productId - The unique ID from MongoDB.
     * @param {string} name - The product's name.
     * @param {number} price - The product's price.
     * @param {string} owner - The initial owner (e.g., the organization's MSP ID).
     */
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

    /**
     * Retrieves a product record from the ledger. Mirrors GET /products/{productId}.
     * @param {string} productId - The ID of the product to query.
     */
    async GetProduct(ctx, productId) {
        const productAsBytes = await ctx.stub.getState(productId);
        if (!productAsBytes || productAsBytes.length === 0) {
            throw new Error(`Product ${productId} does not exist`);
        }
        return productAsBytes.toString();
    }
    
    /**
     * Creates an order record on the ledger. Mirrors POST /orders.
     * @param {string} orderId - The unique ID of the order from MongoDB.
     * @param {string} productId - The ID of the product being ordered.
     * @param {number} quantity - The quantity ordered.
     */
    async CreateOrder(ctx, orderId, productId, quantity) {
        // First, verify the product exists
        const productAsBytes = await ctx.stub.getState(productId);
        if (!productAsBytes || productAsBytes.length === 0) {
            throw new Error(`Cannot create order: Product ${productId} does not exist`);
        }

        const order = {
            docType: 'Order',
            productId: productId,
            quantity: parseInt(quantity),
            orderer: ctx.clientIdentity.getID(), // Record who placed the order
            timestamp: new Date().toISOString(),
        };
        await ctx.stub.putState(orderId, Buffer.from(JSON.stringify(order)));
        return JSON.stringify({ orderId, txId: ctx.stub.getTxID() });
    }

    /**
     * Retrieves an order record from the ledger. Mirrors GET /orders/{orderId}.
     * @param {string} orderId - The ID of the order to query.
     */
    async GetOrder(ctx, orderId) {
        const orderAsBytes = await ctx.stub.getState(orderId);
        if (!orderAsBytes || orderAsBytes.length === 0) {
            throw new Error(`Order ${orderId} does not exist`);
        }
        return orderAsBytes.toString();
    }
}

module.exports = VisuddhaContract;