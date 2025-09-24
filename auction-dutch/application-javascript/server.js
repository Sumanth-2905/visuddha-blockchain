'use strict';

const express = require('express');
const path = require('path');
const { Gateway, Wallets } = require('fabric-network');
const { buildCCPOrg1, buildWallet } = require('../../test-application/javascript/AppUtil');

// 1. Initialize the Express app
const app = express();

// 2. Use middleware
app.use(express.json());
const staticPath = path.join(__dirname, 'public');
app.use(express.static(staticPath));

// ----- Configuration Constants -----
const channelName = 'mychannel';
const chaincodeName = 'dutch';
const walletPath = path.join(__dirname, 'wallet', 'org1');


// Add global error handlers
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown();
});

// Modify the gateway handling in getContract
async function getContract(user) {
    const ccp = buildCCPOrg1();
    const wallet = await buildWallet(Wallets, walletPath);

    const gateway = new Gateway();
    try {
        await gateway.connect(ccp, {
            wallet,
            identity: user,
            discovery: { enabled: true, asLocalhost: true }
        });

        const network = await gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);
        
        return { contract, gateway };
    } catch (error) {
        gateway.disconnect();
        throw error;
    }
}

// ----- API Endpoints -----

app.get('/api/query/:auctionId', async (req, res) => {
    const { auctionId } = req.params;
    console.log(`--> Querying for Auction ID: ${auctionId}`);

    let contract, gateway;
    try {
        ({ contract, gateway } = await getContract('admin'));

        console.log('--> Evaluating transaction: QueryAuction');
        const resultBytes = await contract.evaluateTransaction('QueryAuction', auctionId);
        const resultJson = JSON.parse(resultBytes.toString());
        
        console.log('*** Result:', JSON.stringify(resultJson, null, 2));
        res.status(200).json(resultJson);

    } catch (error) {
        console.error(`Failed to evaluate transaction: ${error}`);
        res.status(500).json({ error: error.message });
    } finally {
        if (gateway) {
            gateway.disconnect();
        }
    }
});

app.post('/api/createAuction', async (req, res) => {
    const { auctionId, item, price } = req.body;
    console.log(`--> Submitting CreateAuction transaction for ID: ${auctionId}`);
    
    if (!auctionId || !item || !price) {
        return res.status(400).json({ error: 'auctionId, item, and price are required' });
    }

    let contract, gateway;
    try {
        // ***** THIS IS THE LINE WE CHANGED *****
        ({ contract, gateway } = await getContract('admin')); 

        console.log('--> Submitting transaction: CreateAuction');
        await contract.submitTransaction('CreateAuction', auctionId, item, String(price));

        console.log('*** Transaction committed successfully');
        res.status(201).json({ message: `Auction ${auctionId} created successfully.` });

    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        res.status(500).json({ error: error.message });
    } finally {
        if (gateway) {
            gateway.disconnect();
        }
    }
});

// Modified server startup
let server;
function shutdown() {
    console.log('Shutting down gracefully...');
    if (server) {
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });

        // Force close if graceful shutdown fails
        setTimeout(() => {
            console.error('Could not close connections in time, forcefully shutting down');
            process.exit(1);
        }, 10000);
    } else {
        process.exit(0);
    }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

const PORT = process.env.PORT || 3000;
const MAX_PORT_ATTEMPTS = 10;

async function startServer(port, attempt = 1) {
    try {
        server = app.listen(port, () => {
            console.log(`Good morning! Server is running on http://localhost:${port}`);
            console.log('Open your browser to access the UI.');
        });

        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE' && attempt < MAX_PORT_ATTEMPTS) {
                console.log(`Port ${port} is busy, trying port ${port + 1}...`);
                startServer(port + 1, attempt + 1);
            } else {
                console.error('Server error:', error);
                shutdown();
            }
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        shutdown();
    }
}

// Start the server
startServer(PORT);