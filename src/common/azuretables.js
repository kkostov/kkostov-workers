const azure = require('azure-storage');

/** Creates a table with the given if it doesn't already exist */
const createTable = (tableName, callback) => {
  // todo: add retry policy filter
  const tableSvc = azure.createTableService();
  tableSvc.createTableIfNotExists(tableName, (error, result, response) => callback(error, result))
}

/** Adds a JSON object as an entity in a storage table */
const addEntityToTable = (tableName, entity, callback) => {
  // todo: add retry policy filter
  const tableSvc = azure.createTableService();

  // generate a tableentity object from the json payload
  const entGen = azure.TableUtilities.entityGenerator;
  let tableEntity = {};
  for (const prop in entity) {
    if (entity.hasOwnProperty(prop)) {
      // todo: check the real type of the value instead of forcing String
      tableEntity[prop] = entGen.String(`${entity[prop]}`)
    }
  }
  tableSvc.insertOrReplaceEntity(tableName, tableEntity, function(error, result, response) {
    if (!error) {
      // Entity inserted
      callback()
    } else {
      callback(error)
    }
  });
}

/** Adds a JSON array of objects as an entities in a storage table */
const addBatchToTable = (tableName, items, callback) => {
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
      batch.insertOrReplaceEntity(tableEntity, {
        echoContent: false
      })
    }
    tableSvc.executeBatch(tableName, batch, function(error, result, response) {
      if (!error) {
        // operation successfull
        if(entities < MAX_BATCH) {
          // no more items remaining
          callback()
        } else {
          // splice the next portion of items to process
          const next = items.splice(0, MAX_BATCH);
          if(next.length > 0) {
            batch.clear();
            processBatch(next)
          } else {
            // no more items remaining
            callback()
          }
        }
      } else {
        callback(error)
      }
    });
  }

  // start the batch, MAX_BATCH items at a time
  processBatch(nextBatch)
}

/** Downloads all entities from the specified partition */
const getEntitiesFromPartition = (tableId, partitionId, selectFields, callback) => {
  // todo: add retry policy filter
  const tableSvc = azure.createTableService();
  const query = new azure.TableQuery()
    .select(selectFields)
    .where('PartitionKey eq ?', partitionId);

  // Azure uses a continuationToken for paging
  const downloadResults = (continuationToken, lastPageData) => {
    tableSvc.queryEntities(tableId, query, continuationToken, (error, result, response) => {
      if(error) {
        callback(error)
      } else {
        let pageOfEntities = result.entries;
        if (lastPageData) {
          pageOfEntities = pageOfEntities.concat(lastPageData)
        }
        if(result.continuationToken) {
          // more data is available
          downloadResults(result.continuationToken, pageOfEntities)
        } else {
          // done loading
          callback(undefined, pageOfEntities)
        }
      }
    })
  }

  downloadResults();
}

module.exports = {
  createTable,
  addEntityToTable,
  addBatchToTable,
  getEntitiesFromPartition
}
