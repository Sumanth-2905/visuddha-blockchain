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
