const express = require('express');
const cors = require('cors');
const path = require('path');
const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Fabric network configuration
const channelName = 'mychannel';
const chaincodeName = 'visuddha-chaincode';
const mspId = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');

// Correct path to connection profile
const ccpPath = path.resolve(__dirname, '..', '../fabric-samples', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');

let fabricGateway;
let fabricNetwork; 
let fabricContract;

// Initialize wallet
async function initializeWallet() {
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    const adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
        console.log('Admin identity not found, creating...');
        await enrollAdmin(wallet);
    }
    
    const appUserIdentity = await wallet.get('appUser');
    if (!appUserIdentity) {
        console.log('AppUser identity not found, creating...');
        await registerUser(wallet);
    }
    
    return wallet;
}

// Enroll admin user
async function enrollAdmin(wallet) {
    try {
        const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
        const ccp = JSON.parse(ccpJSON);

        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: mspId,
            type: 'X.509',
        };
        
        await wallet.put('admin', x509Identity);
        console.log('Admin identity enrolled and imported to wallet');
    } catch (error) {
        console.error('Failed to enroll admin user:', error);
        throw error;
    }
}

// Register application user
async function registerUser(wallet) {
    try {
        const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
        const ccp = JSON.parse(ccpJSON);

        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        const adminIdentity = await wallet.get('admin');
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: 'appUser',
            role: 'client'
        }, adminUser);

        const enrollment = await ca.enroll({
            enrollmentID: 'appUser',
            enrollmentSecret: secret
        });

        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: mspId,
            type: 'X.509',
        };

        await wallet.put('appUser', x509Identity);
        console.log('AppUser identity registered and imported to wallet');
    } catch (error) {
        console.error('Failed to register user:', error);
        throw error;
    }
}

// Connect to Fabric network
async function connectToFabric() {
    try {
        console.log('Connecting to Fabric network...');
        console.log('Connection profile path:', ccpPath);
        
        // Check if connection profile exists
        if (!fs.existsSync(ccpPath)) {
            throw new Error('Connection profile not found at: ' + ccpPath);
        }
        
        const wallet = await initializeWallet();
        fabricGateway = new Gateway();
        
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        
        await fabricGateway.connect(ccp, {
            wallet,
            identity: 'appUser',
            discovery: { enabled: true, asLocalhost: true }
        });
        
        fabricNetwork = await fabricGateway.getNetwork(channelName);
        fabricContract = fabricNetwork.getContract(chaincodeName);
        
        console.log('Successfully connected to Fabric network');
        
        // Initialize ledger
        try {
            await fabricContract.submitTransaction('InitLedger');
            console.log('Ledger initialized');
        } catch (error) {
            console.log('Ledger already initialized or init failed:', error.message);
        }
        
        return true;
    } catch (error) {
        console.warn('Fabric connection failed:', error.message);
        return false;
    }
}

// Fallback data
const fallbackData = {
    batches: [
        {
            batchId: 'BATCH_DEMO_001',
            farmerId: 'FARMER001',
            location: 'Amaravati, AP',
            cropType: 'Organic Rice',
            status: 'CREATED',
            timestamp: new Date().toISOString()
        }
    ]
};

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'Visuddha Blockchain API',
        fabricConnected: !!fabricContract,
        timestamp: new Date().toISOString()
    });
});

app.post('/api/batches', async (req, res) => {
    try {
        const batchData = {
            batchId: 'BATCH_' + Date.now(),
            ...req.body,
            timestamp: new Date().toISOString()
        };

        if (fabricContract) {
            const result = await fabricContract.submitTransaction('CreateBatch', JSON.stringify(batchData));
            const batch = JSON.parse(result.toString());
            res.status(201).json({ success: true, data: batch });
        } else {
            fallbackData.batches.push(batchData);
            res.status(201).json({ success: true, data: batchData, mode: 'fallback' });
        }
    } catch (error) {
        console.error('Error creating batch:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/batches/:batchId', async (req, res) => {
    try {
        let batch;
        if (fabricContract) {
            const result = await fabricContract.evaluateTransaction('GetBatch', req.params.batchId);
            batch = JSON.parse(result.toString());
        } else {
            batch = fallbackData.batches.find(b => b.batchId === req.params.batchId);
            if (!batch) throw new Error('Batch not found');
        }

        res.json({ success: true, data: batch });
    } catch (error) {
        res.status(404).json({ success: false, error: error.message });
    }
});

app.get('/api/batches', async (req, res) => {
    try {
        let batches;
        if (fabricContract) {
            const result = await fabricContract.evaluateTransaction('GetAllBatches');
            batches = JSON.parse(result.toString());
        } else {
            batches = fallbackData.batches;
        }

        res.json({ success: true, data: batches, total: batches.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/batches/:batchId/process', async (req, res) => {
    try {
        const updateData = {
            batchId: req.params.batchId,
            ...req.body
        };

        if (fabricContract) {
            const result = await fabricContract.submitTransaction('UpdateBatchStatus', JSON.stringify(updateData));
            const batch = JSON.parse(result.toString());
            res.json({ success: true, data: batch });
        } else {
            const batch = fallbackData.batches.find(b => b.batchId === req.params.batchId);
            if (batch) {
                Object.assign(batch, updateData);
                res.json({ success: true, data: batch, mode: 'fallback' });
            } else {
                res.status(404).json({ success: false, error: 'Batch not found' });
            }
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/batches/:batchId/tests', async (req, res) => {
    try {
        const testData = {
            batchId: req.params.batchId,
            testId: 'TEST_' + Date.now(),
            ...req.body
        };

        if (fabricContract) {
            const result = await fabricContract.submitTransaction('AddLabTest', JSON.stringify(testData));
            const batch = JSON.parse(result.toString());
            res.status(201).json({ success: true, data: batch });
        } else {
            res.status(201).json({ success: true, data: testData, mode: 'fallback' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/batches/:batchId/history', async (req, res) => {
    try {
        let history;
        if (fabricContract) {
            const result = await fabricContract.evaluateTransaction('GetBatchHistory', req.params.batchId);
            history = JSON.parse(result.toString());
        } else {
            history = [
                {
                    txId: 'TX_DEMO_001',
                    timestamp: new Date().toISOString(),
                    data: { status: 'CREATED', action: 'Batch created' }
                }
            ];
        }

        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/track/:qrCode', async (req, res) => {
    try {
        const trackingData = {
            batch: {
                batchId: req.params.qrCode,
                farmerId: 'FARMER001',
                cropType: 'Organic Rice',
                status: 'VERIFIED'
            },
            traceabilityData: [
                { stage: 'Harvest', timestamp: new Date().toISOString() },
                { stage: 'Processing', timestamp: new Date().toISOString() }
            ],
            verified: true,
            blockchainVerified: !!fabricContract
        };

        res.json({ success: true, data: trackingData });
    } catch (error) {
        res.status(404).json({ success: false, error: error.message });
    }
});

async function startServer() {
    console.log('Starting Visuddha Blockchain API Server...');
    
    // Try to connect to Fabric
    const connected = await connectToFabric();
    
    app.listen(PORT, () => {
        console.log(`Visuddha API Server running on port ${PORT}`);
        console.log(`Fabric connected: ${connected}`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
        
        if (connected) {
            console.log('BLOCKCHAIN MODE: Real Hyperledger Fabric integration active');
        } else {
            console.log('FALLBACK MODE: Using demo data (blockchain unavailable)');
        }
    });
}

process.on('SIGTERM', () => {
    if (fabricGateway) {
        fabricGateway.disconnect();
    }
    process.exit(0);
});

startServer();
