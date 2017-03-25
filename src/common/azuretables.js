const azure = require('azure-storage');
const Promise = require('bluebird').Promise;


/** Creates a table with the given if it doesn't already exist */
const createTable = (tableName) => {
  return new Promise((resolve, reject) => {
    // todo: add retry policy filter
    const tableSvc = azure.createTableService();
    tableSvc.createTableIfNotExists(tableName, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

/** Adds a JSON object as an entity in a storage table */
const addEntityToTable = (tableName, entity) => {
  return new Promise((resolve, reject) => {
    // todo: add retry policy filter
    const tableSvc = azure.createTableService();

    // generate a tableentity object from the json payload
    const entGen = azure.TableUtilities.entityGenerator;
    let tableEntity = {};
    for (const prop in entity) {
      if (entity.hasOwnProperty(prop)) {
        switch (typeof entity[prop]) {
        case 'boolean':
          tableEntity[prop] = entGen.Boolean(entity[prop]);
          break;
        case 'number':
          tableEntity[prop] = entGen.Int64(entity[prop]);
          break;
        default:
          tableEntity[prop] = entGen.String(`${entity[prop]}`);
        }
      }
    }
    tableSvc.insertOrReplaceEntity(tableName, tableEntity, function(error) {
      if (!error) {
        resolve()
      } else {
        reject(error)
      }
    });
  });
}

/** Adds a JSON array of objects as an entities in a storage table */
const addBatchToTable = (tableName, items) => {
  return new Promise((resolve, reject) => {

    // todo: add retry policy filter
    const tableSvc = azure.createTableService();
    const entGen = azure.TableUtilities.entityGenerator;
    let batch = new azure.TableBatch();
    // azure supports a max of 100 operations per batch
    const MAX_BATCH = 100;
    const nextBatch = items.splice(0, MAX_BATCH);

    const processBatch = (entities) => {
      for (const entity of entities) {
        let tableEntity = {};
        for (const prop in entity) {
          if (entity.hasOwnProperty(prop)) {
            // todo: check the real type of the value instead of forcing String
            tableEntity[prop] = entGen.String(`${entity[prop]}`)
          }
        }
        batch.insertOrMergeEntity(tableEntity, {
          echoContent: false
        })
      }
      tableSvc.executeBatch(tableName, batch, function(error) {
        if (!error) {
          // operation successfull
          if (entities < MAX_BATCH) {
            // no more items remaining
            resolve()
          } else {
            // splice the next portion of items to process
            const next = items.splice(0, MAX_BATCH);
            if (next.length > 0) {
              batch.clear();
              processBatch(next)
            } else {
              // no more items remaining
              resolve()
            }
          }
        } else {
          reject(error)
        }
      });
    }
    // start the batch, MAX_BATCH items at a time
    processBatch(nextBatch)
  });
}

/** Downloads all entities from the specified partition */
const getEntitiesFromPartition = (tableId, partitionId, selectFields) => {
  return new Promise((resolve, reject) => {

    // todo: add retry policy filter
    const tableSvc = azure.createTableService();
    const query = new azure.TableQuery()
      .select(selectFields)
      .where('PartitionKey eq ?', partitionId);

    // Azure uses a continuationToken for paging
    const downloadResults = (continuationToken, lastPageData) => {
      tableSvc.queryEntities(tableId, query, continuationToken, (error, result) => {
        if (error) {
          reject(error)
        } else {
          let pageOfEntities = result.entries;
          if (lastPageData) {
            pageOfEntities = pageOfEntities.concat(lastPageData)
          }
          if (result.continuationToken) {
            // more data is available
            downloadResults(result.continuationToken, pageOfEntities)
          } else {
            // done loading
            resolve(pageOfEntities)
          }
        }
      });
    }
    downloadResults();
  });
}

module.exports = {
  createTable,
  addEntityToTable,
  addBatchToTable,
  getEntitiesFromPartition
}
