#!/bin/bash
echo "Starting Hyperledger Fabric Test Network..."

cd ../fabric-samples/test-network

# Clean up previous network
echo "Cleaning previous network..."
./network.sh down

# Start network with CouchDB and CA
echo "Starting network with CouchDB..."
./network.sh up createChannel -ca -s couchdb

# Deploy chaincode with absolute path
echo "Deploying Visuddha chaincode..."
./network.sh deployCC -ccn visuddha-chaincode -ccp /home/burra/onelastledger/fabric-samples/chaincode/visuddha -ccl javascript

echo "Network started successfully!"
echo "CouchDB Fauxton UI available at: http://localhost:5984/_utils"

cd /home/burra/onelastledger/fabric-samples
