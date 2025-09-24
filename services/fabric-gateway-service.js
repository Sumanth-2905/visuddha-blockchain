// fabric-gateway-service.js
// Hyperledger Fabric Gateway Integration Service

const grpc = require('@grpc/grpc-js');
const { connect, Identity, Signer, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class FabricGatewayService {
    constructor() {
        this.gateway = null;
        this.network = null;
        this.contract = null;
        this.channelName = 'mychannel';
        this.chaincodeName = 'basic'; // Update this to match your chaincode
        
        // Update these paths to match your fabric-samples location
        this.cryptoPath = path.resolve(__dirname, '..', 'fabric-samples', 'test-network', 'organizations');
        this.tlsCertPath = path.resolve(this.cryptoPath, 'peerOrganizations', 'org1.example.com', 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt');
        this.certPath = path.resolve(this.cryptoPath, 'peerOrganizations', 'org1.example.com', 'users', 'User1@org1.example.com', 'msp', 'signcerts');
        this.keyDirPath = path.resolve(this.cryptoPath, 'peerOrganizations', 'org1.example.com', 'users', 'User1@org1.example.com', 'msp', 'keystore');
        
        this.peerEndpoint = 'localhost:7051';
        this.peerHostAlias = 'peer0.org1.example.com';
        this.mspId = 'Org1MSP';
    }

    async initialize() {
        try {
            // Read the TLS certificate
            const tlsRootCert = await fs.readFile(this.tlsCertPath);

            // Create gRPC connection to the Gateway
            const client = new grpc.Client(this.peerEndpoint, grpc.credentials.createSsl(tlsRootCert), {
                'grpc.ssl_target_name_override': this.peerHostAlias,
            });

            // Get the gateway identity and signer
            const identity = await this.newIdentity();
            const signer = await this.newSigner();

            // Connect to the Gateway
            this.gateway = connect({
                client,
                identity,
                signer,
                evaluateOptions: () => ({ deadline: Date.now() + 5000 }), // 5 seconds
                endorseOptions: () => ({ deadline: Date.now() + 15000 }), // 15 seconds
                submitOptions: () => ({ deadline: Date.now() + 5000 }), // 5 seconds
                commitStatusOptions: () => ({ deadline: Date.now() + 60000 }), // 1 minute
            });

            // Get the network and contract
            this.network = this.gateway.getNetwork(this.channelName);
            this.contract = this.network.getContract(this.chaincodeName);

            console.log('Fabric Gateway initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Fabric Gateway:', error);
            throw error;
        }
    }

    async newIdentity() {
        const certFiles = await fs.readdir(this.certPath);
        const certFile = certFiles.find(file => file.endsWith('.pem'));
        if (!certFile) {
            throw new Error('No certificate file found');
        }
        
        const credentials = await fs.readFile(path.resolve(this.certPath, certFile));
        return { mspId: this.mspId, credentials };
    }

    async newSigner() {
        const keyFiles = await fs.readdir(this.keyDirPath);
        const keyFile = keyFiles.find(file => file.endsWith('_sk'));
        if (!keyFile) {
            throw new Error('No private key file found');
        }
        
        const privateKeyPem = await fs.readFile(path.resolve(this.keyDirPath, keyFile));
        const privateKey = crypto.createPrivateKey(privateKeyPem);
        return signers.newPrivateKeySigner(privateKey);
    }

    // Initialize all assets (example function - customize based on your chaincode)
    async initLedger() {
        try {
            console.log('Initializing ledger with sample data...');
            const result = await this.contract.submitTransaction('InitLedger');
            console.log('Ledger initialized successfully');
            return result.toString();
        } catch (error) {
            console.error('Failed to initialize ledger:', error);
            throw error;
        }
    }

    // Get all assets (example function - customize based on your chaincode)
    async getAllAssets() {
        try {
            console.log('Getting all assets from ledger...');
            const resultBytes = await this.contract.evaluateTransaction('GetAllAssets');
            const resultJson = Buffer.from(resultBytes).toString('utf8');
            return JSON.parse(resultJson);
        } catch (error) {
            console.error('Failed to get all assets:', error);
            throw error;
        }
    }

    // Create a new asset (example function - customize based on your chaincode)
    async createAsset(id, color, size, owner, appraisedValue) {
        try {
            console.log(`Creating asset: ${id}`);
            const result = await this.contract.submitTransaction(
                'CreateAsset',
                id,
                color,
                size,
                owner,
                appraisedValue
            );
            console.log('Asset created successfully');
            return result.toString();
        } catch (error) {
            console.error('Failed to create asset:', error);
            throw error;
        }
    }

    // Read an asset (example function - customize based on your chaincode)
    async readAsset(id) {
        try {
            console.log(`Reading asset: ${id}`);
            const resultBytes = await this.contract.evaluateTransaction('ReadAsset', id);
            const resultJson = Buffer.from(resultBytes).toString('utf8');
            return JSON.parse(resultJson);
        } catch (error) {
            console.error('Failed to read asset:', error);
            throw error;
        }
    }

    // Update an asset (example function - customize based on your chaincode)
    async updateAsset(id, color, size, owner, appraisedValue) {
        try {
            console.log(`Updating asset: ${id}`);
            const result = await this.contract.submitTransaction(
                'UpdateAsset',
                id,
                color,
                size,
                owner,
                appraisedValue
            );
            console.log('Asset updated successfully');
            return result.toString();
        } catch (error) {
            console.error('Failed to update asset:', error);
            throw error;
        }
    }

    // Delete an asset (example function - customize based on your chaincode)
    async deleteAsset(id) {
        try {
            console.log(`Deleting asset: ${id}`);
            const result = await this.contract.submitTransaction('DeleteAsset', id);
            console.log('Asset deleted successfully');
            return result.toString();
        } catch (error) {
            console.error('Failed to delete asset:', error);
            throw error;
        }
    }

    // Transfer asset ownership (example function - customize based on your chaincode)
    async transferAsset(id, newOwner) {
        try {
            console.log(`Transferring asset ${id} to ${newOwner}`);
            const result = await this.contract.submitTransaction('TransferAsset', id, newOwner);
            console.log('Asset transferred successfully');
            return result.toString();
        } catch (error) {
            console.error('Failed to transfer asset:', error);
            throw error;
        }
    }

    // Get asset history (example function - customize based on your chaincode)
    async getAssetHistory(id) {
        try {
            console.log(`Getting history for asset: ${id}`);
            const resultBytes = await this.contract.evaluateTransaction('GetAssetHistory', id);
            const resultJson = Buffer.from(resultBytes).toString('utf8');
            return JSON.parse(resultJson);
        } catch (error) {
            console.error('Failed to get asset history:', error);
            throw error;
        }
    }

    // Generic function to submit any transaction
    async submitTransaction(functionName, ...args) {
        try {
            console.log(`Submitting transaction: ${functionName}`);
            const result = await this.contract.submitTransaction(functionName, ...args);
            return result.toString();
        } catch (error) {
            console.error(`Failed to submit transaction ${functionName}:`, error);
            throw error;
        }
    }

    // Generic function to evaluate any transaction (read-only)
    async evaluateTransaction(functionName, ...args) {
        try {
            console.log(`Evaluating transaction: ${functionName}`);
            const resultBytes = await this.contract.evaluateTransaction(functionName, ...args);
            const resultJson = Buffer.from(resultBytes).toString('utf8');
            
            try {
                return JSON.parse(resultJson);
            } catch (parseError) {
                // If it's not JSON, return as string
                return resultJson;
            }
        } catch (error) {
            console.error(`Failed to evaluate transaction ${functionName}:`, error);
            throw error;
        }
    }

    // Close the gateway connection
    async disconnect() {
        if (this.gateway) {
            this.gateway.close();
            console.log('Gateway connection closed');
        }
    }
}

module.exports = FabricGatewayService;