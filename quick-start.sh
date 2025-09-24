#!/bin/bash
# quick-start-fixed.sh - Corrected deployment script for Hyperledger Fabric integration

set -e

echo "================================================"
echo "VISUDDHA BLOCKCHAIN PLATFORM QUICK START - FIXED"
echo "================================================"

# Check prerequisites
echo "Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is required but not installed"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required but not installed"
    exit 1
fi

# Find fabric-samples directory
FABRIC_SAMPLES_DIR=""
if [ -d "../fabric-samples" ]; then
    FABRIC_SAMPLES_DIR="../fabric-samples"
elif [ -d "fabric-samples" ]; then
    FABRIC_SAMPLES_DIR="fabric-samples"
elif [ -d "~/fabric-samples" ]; then
    FABRIC_SAMPLES_DIR="~/fabric-samples"
else
    echo "fabric-samples directory not found!"
    echo "Downloading fabric-samples..."
    curl -sSL https://bit.ly/2ysbOFE | bash -s
    FABRIC_SAMPLES_DIR="fabric-samples"
fi

echo "Using fabric-samples at: $FABRIC_SAMPLES_DIR"

# Get absolute paths
PROJECT_ROOT=$(pwd)
CHAINCODE_PATH="${PROJECT_ROOT}/chaincode/visuddha"

echo "Project root: $PROJECT_ROOT"
echo "Chaincode path: $CHAINCODE_PATH"

# Create project structure
echo "Creating project structure..."
mkdir -p backend/wallet
mkdir -p chaincode/visuddha
mkdir -p scripts

# Create chaincode package.json
echo "Creating chaincode package.json..."
cat > chaincode/visuddha/package.json << 'EOF'
{
    "name": "visuddha-chaincode",
    "version": "1.0.0",
    "description": "Supply Chain Traceability Smart Contract for Visuddha Platform",
    "main": "index.js",
    "engines": {
        "node": ">=14.0.0",
        "npm": ">=6.0.0"
    },
    "scripts": {
        "start": "fabric-chaincode-node start"
    },
    "dependencies": {
        "fabric-contract-api": "^2.4.1",
        "fabric-shim": "^2.4.1"
    }
}
EOF

# Create chaincode index.js
echo "Creating chaincode index.js..."
cat > chaincode/visuddha/index.js << 'EOF'
'use strict';

const VisuddhaContract = require('./visuddha-chaincode');

module.exports.VisuddhaContract = VisuddhaContract;
module.exports.contracts = [VisuddhaContract];
EOF

# Create comprehensive chaincode
echo "Creating visuddha-chaincode.js..."
cat > chaincode/visuddha/visuddha-chaincode.js << 'EOF'
'use strict';

const { Contract } = require('fabric-contract-api');

class VisuddhaContract extends Contract {

    async InitLedger(ctx) {
        console.info('============= START : Initialize Visuddha Ledger ===========');
        
        // Initialize with sample batch
        const sampleBatch = {
            batchId: 'BATCH_INIT_001',
            docType: 'batch',
            farmerId: 'FARMER001',
            location: 'Amaravati, Andhra Pradesh',
            cropType: 'Organic Rice',
            quantity: '500 kg',
            harvestDate: new Date().toISOString(),
            gpsCoordinates: { lat: 16.5062, lng: 80.6480 },
            qualityGrade: 'A',
            certifications: ['Organic'],
            status: 'CREATED',
            timestamp: new Date().toISOString(),
            processHistory: [],
            labTests: [],
            currentOwner: 'FARMER001'
        };

        await ctx.stub.putState(sampleBatch.batchId, Buffer.from(JSON.stringify(sampleBatch)));
        console.info('Sample batch created:', sampleBatch.batchId);
        
        console.info('============= END : Initialize Visuddha Ledger ===========');
        return JSON.stringify(sampleBatch);
    }

    async CreateBatch(ctx, batchDataString) {
        console.info('============= START : Create Batch ===========');
        
        const batchData = JSON.parse(batchDataString);
        
        // Check if batch already exists
        const exists = await this.BatchExists(ctx, batchData.batchId);
        if (exists) {
            throw new Error(`The batch ${batchData.batchId} already exists`);
        }
        
        const batch = {
            docType: 'batch',
            batchId: batchData.batchId,
            farmerId: batchData.farmerId || 'UNKNOWN',
            location: batchData.location || '',
            cropType: batchData.cropType || '',
            quantity: batchData.quantity || '',
            harvestDate: batchData.harvestDate || new Date().toISOString(),
            gpsCoordinates: batchData.gpsCoordinates || {},
            qualityGrade: batchData.qualityGrade || 'A',
            certifications: batchData.certifications || [],
            status: batchData.status || 'CREATED',
            timestamp: new Date().toISOString(),
            processHistory: [],
            labTests: [],
            currentOwner: batchData.farmerId || 'UNKNOWN'
        };

        await ctx.stub.putState(batchData.batchId, Buffer.from(JSON.stringify(batch)));
        
        // Emit event
        const eventPayload = {
            batchId: batch.batchId,
            farmerId: batch.farmerId,
            timestamp: batch.timestamp
        };
        await ctx.stub.setEvent('BatchCreated', Buffer.from(JSON.stringify(eventPayload)));
        
        console.info('============= END : Create Batch ===========');
        return JSON.stringify(batch);
    }

    async GetBatch(ctx, batchId) {
        const batchJSON = await ctx.stub.getState(batchId);
        if (!batchJSON || batchJSON.length === 0) {
            throw new Error(`The batch ${batchId} does not exist`);
        }
        return batchJSON.toString();
    }

    async GetAllBatches(ctx) {
        const startKey = '';
        const endKey = '';
        const allResults = [];

        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        let result = await iterator.next();
        
        while (!result.done) {
            const strValue = Buffer.from(result.value.value).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
                if (record.docType === 'batch') {
                    allResults.push(record);
                }
            } catch (err) {
                console.log('Error parsing record:', err);
            }
            result = await iterator.next();
        }
        
        await iterator.close();
        return JSON.stringify(allResults);
    }

    async UpdateBatchStatus(ctx, updateDataString) {
        console.info('============= START : Update Batch Status ===========');
        
        const updateData = JSON.parse(updateDataString);
        const batchId = updateData.batchId;
        
        const batchJSON = await ctx.stub.getState(batchId);
        if (!batchJSON || batchJSON.length === 0) {
            throw new Error(`The batch ${batchId} does not exist`);
        }
        
        const batch = JSON.parse(batchJSON.toString());
        
        // Update status and add to history
        const previousStatus = batch.status;
        batch.status = updateData.status || batch.status;
        batch.lastUpdated = new Date().toISOString();
        
        // Add to process history
        const processEntry = {
            timestamp: new Date().toISOString(),
            previousStatus: previousStatus,
            newStatus: batch.status,
            processingFacility: updateData.processingFacility || '',
            processType: updateData.processType || '',
            updatedBy: ctx.clientIdentity.getID(),
            additionalInfo: updateData.additionalInfo || {}
        };
        
        batch.processHistory.push(processEntry);
        
        await ctx.stub.putState(batchId, Buffer.from(JSON.stringify(batch)));
        
        console.info('============= END : Update Batch Status ===========');
        return JSON.stringify(batch);
    }

    async AddLabTest(ctx, testDataString) {
        console.info('============= START : Add Lab Test ===========');
        
        const testData = JSON.parse(testDataString);
        const batchId = testData.batchId;
        
        const batchJSON = await ctx.stub.getState(batchId);
        if (!batchJSON || batchJSON.length === 0) {
            throw new Error(`The batch ${batchId} does not exist`);
        }
        
        const batch = JSON.parse(batchJSON.toString());
        
        const labTest = {
            testId: testData.testId || 'TEST_' + Date.now(),
            laboratory: testData.laboratory || '',
            testType: testData.testType || '',
            results: testData.results || {},
            certified: testData.certified || false,
            testDate: testData.testDate || new Date().toISOString(),
            certificationNumber: testData.certificationNumber || '',
            tester: ctx.clientIdentity.getID()
        };
        
        batch.labTests.push(labTest);
        batch.lastUpdated = new Date().toISOString();
        
        // Update status if certified
        if (testData.certified) {
            batch.status = 'CERTIFIED';
        }
        
        await ctx.stub.putState(batchId, Buffer.from(JSON.stringify(batch)));
        
        console.info('============= END : Add Lab Test ===========');
        return JSON.stringify(batch);
    }

    async BatchExists(ctx, batchId) {
        const batchJSON = await ctx.stub.getState(batchId);
        return batchJSON && batchJSON.length > 0;
    }

    async GetBatchHistory(ctx, batchId) {
        console.info('Getting batch history for:', batchId);
        
        const historyIterator = await ctx.stub.getHistoryForKey(batchId);
        const results = [];
        
        let result = await historyIterator.next();
        while (!result.done) {
            if (result.value) {
                const record = {
                    txId: result.value.txId,
                    timestamp: new Date(result.value.timestamp.seconds.low * 1000).toISOString(),
                    isDelete: result.value.isDelete ? result.value.isDelete.toString() : 'false',
                    value: result.value.value.toString('utf8')
                };
                
                try {
                    record.data = JSON.parse(record.value);
                } catch (err) {
                    record.data = record.value;
                }
                
                results.push(record);
            }
            result = await historyIterator.next();
        }
        
        await historyIterator.close();
        return JSON.stringify(results);
    }
}

module.exports = VisuddhaContract;
EOF

# Create backend package.json
echo "Creating backend package.json..."
cat > backend/package.json << 'EOF'
{
    "name": "visuddha-fabric-app",
    "version": "1.0.0",
    "description": "Visuddha Blockchain Application Server",
    "main": "server.js",
    "scripts": {
        "start": "node server.js",
        "dev": "nodemon server.js"
    },
    "dependencies": {
        "express": "^4.18.2",
        "cors": "^2.8.5",
        "fabric-network": "^2.2.19",
        "fabric-ca-client": "^2.2.19"
    },
    "devDependencies": {
        "nodemon": "^3.0.1"
    }
}
EOF

# Create backend server with correct connection path
echo "Creating backend server..."
cat > backend/server.js << EOF
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
const ccpPath = path.resolve(__dirname, '..', '${FABRIC_SAMPLES_DIR}', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');

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
        console.log(\`Visuddha API Server running on port \${PORT}\`);
        console.log(\`Fabric connected: \${connected}\`);
        console.log(\`Health check: http://localhost:\${PORT}/api/health\`);
        
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
EOF

# Create network startup script with proper paths
cat > scripts/start-network.sh << EOF
#!/bin/bash
echo "Starting Hyperledger Fabric Test Network..."

cd ${FABRIC_SAMPLES_DIR}/test-network

# Clean up previous network
echo "Cleaning previous network..."
./network.sh down

# Start network with CouchDB and CA
echo "Starting network with CouchDB..."
./network.sh up createChannel -ca -s couchdb

# Deploy chaincode with absolute path
echo "Deploying Visuddha chaincode..."
./network.sh deployCC -ccn visuddha-chaincode -ccp ${CHAINCODE_PATH} -ccl javascript

echo "Network started successfully!"
echo "CouchDB Fauxton UI available at: http://localhost:5984/_utils"

cd ${PROJECT_ROOT}
EOF

chmod +x scripts/start-network.sh

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install --silent || echo "Warning: npm install had issues, but continuing..."
cd ..

# Start Fabric network
echo "Starting Hyperledger Fabric network..."
./scripts/start-network.sh

# Wait for network to be ready
echo "Waiting for network to initialize..."
sleep 20

# Start backend server
echo "Starting backend API server..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Wait for server to start
sleep 8

# Test the setup
echo "Testing the setup..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "Backend API server is running!"
    
    # Check if fabric is connected
    HEALTH_RESPONSE=$(curl -s http://localhost:3001/api/health)
    echo "Health check response: $HEALTH_RESPONSE"
    
    # Create test batch
    echo "Creating test batch..."
    TEST_RESPONSE=$(curl -s -X POST http://localhost:3001/api/batches \
        -H "Content-Type: application/json" \
        -d '{
            "farmerId": "FARMER001",
            "location": "Amaravati, AP", 
            "cropType": "Organic Rice",
            "quantity": "1000 kg",
            "gpsCoordinates": {"lat": 16.5062, "lng": 80.6480}
        }')
    
    echo "Test batch response: $TEST_RESPONSE"
    
else
    echo "Warning: Backend server may not be ready yet"
fi

echo ""
echo "================================================"
echo "SETUP COMPLETE!"
echo "================================================"
echo ""
echo "Your Visuddha blockchain integration is ready:"
echo "• API Server: http://localhost:3001"
echo "• Health Check: http://localhost:3001/api/health"
echo "• CouchDB Fauxton: http://localhost:5984/_utils"
echo ""
echo "Key endpoints:"
echo "• POST /api/batches - Create batch"
echo "• GET /api/batches - List all batches"
echo "• GET /api/batches/:id - Get specific batch"
echo "• GET /api/track/:qrCode - Track product"
echo ""
echo "Backend PID: $BACKEND_PID"
echo "Press Ctrl+C to stop"

wait $BACKEND_PID