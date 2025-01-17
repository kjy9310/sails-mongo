/**
 * Module dependencies
 */

var async = require("async"),
  MongoClient = require("mongodb").MongoClient;

/**
 * Manage a connection to a Mongo Server
 *
 * @param {Object} config
 * @return {Object}
 * @api private
 */

var Connection = (module.exports = function Connection(config, cb) {
  var self = this;

  // Hold the config object
  this.config = config || {};

  // Build Database connection
  this._buildConnection(function (err, db, client) {
    if (err) return cb(err);
    if (!db) return cb(new Error("no db object"));

    // Store the DB object
    self.db = db;

    // Store the client - for teardown
    self.client = client;

    // Return the connection
    cb(null, self);
  });
});

/////////////////////////////////////////////////////////////////////////////////
// PUBLIC METHODS
/////////////////////////////////////////////////////////////////////////////////

/**
 * Create A Collection
 *
 * @param {String} name
 * @param {Object} collection
 * @param {Function} callback
 * @api public
 */

Connection.prototype.createCollection = async function createCollection(
  name,
  collection,
  cb
) {
  var self = this;

  // Create the Collection
  try {
    const result = await this.db.collection(name);
    self._ensureIndexes(result, collection.indexes, cb);
  } catch (e) {
    cb(e);
  }
};

/**
 * Drop A Collection
 *
 * @param {String} name
 * @param {Function} callback
 * @api public
 */

Connection.prototype.dropCollection = async function dropCollection(name, cb) {
  const success = await this.db.dropCollection(name);
  cb(success);
};

/////////////////////////////////////////////////////////////////////////////////
// PRIVATE METHODS
/////////////////////////////////////////////////////////////////////////////////

/**
 * Build Server and Database Connection Objects
 *
 * @param {Function} callback
 * @api private
 */

Connection.prototype._buildConnection = async function _buildConnection(cb) {
  // Set the configured options
  var connectionOptions = {};

  // connectionOptions.mongos = this.config.mongos || {};
  // connectionOptions.replSet = this.config.replSet || {};

  connectionOptions = {
    appname: this.config.appname,
    authMechanism: this.config.authMechanism,
    authMechanismProperties: this.config.authMechanismProperties,
    authSource: this.config.authSource,
    compressors: this.config.compressors,
    connectTimeoutMS: this.config.connectTimeoutMS,
    directConnection: this.config.directConnection,
    heartbeatFrequencyMS: this.config.heartbeatFrequencyMS,
    journal: this.config.journal,
    loadBalanced: this.config.loadBalanced,
    localThresholdMS: this.config.localThresholdMS,
    maxIdleTimeMS: this.config.maxIdleTimeMS,
    maxPoolSize: this.config.maxPoolSize,
    maxConnecting: this.config.maxConnecting,
    maxStalenessSeconds: this.config.maxStalenessSeconds,
    minPoolSize: this.config.minPoolSize,
    proxyHost: this.config.proxyHost,
    proxyPort: this.config.proxyPort,
    proxyUsername: this.config.proxyUsername,
    proxyPassword: this.config.proxyPassword,
    readConcernLevel: this.config.readConcernLevel,
    readPreference: this.config.readPreference,
    readPreferenceTags: this.config.readPreferenceTags,
    replicaSet: this.config.replicaSet,
    retryReads: this.config.retryReads,
    retryWrites: this.config.retryWrites,
    serverSelectionTimeoutMS: this.config.serverSelectionTimeoutMS,
    serverSelectionTryOnce: this.config.serverSelectionTryOnce,
    socketTimeoutMS: this.config.socketTimeoutMS,
    srvMaxHosts: this.config.srvMaxHosts,
    srvServiceName: this.config.srvServiceName,
    ssl: this.config.ssl,
    timeoutMS: this.config.timeoutMS,
    tls: this.config.tls,
    tlsAllowInvalidCertificates: this.config.tlsAllowInvalidCertificates,
    tlsAllowInvalidHostnames: this.config.tlsAllowInvalidHostnames,
    tlsCAFile: this.config.tlsCAFile,
    tlsCertificateKeyFile: this.config.tlsCertificateKeyFile,
    tlsCertificateKeyFilePassword: this.config.tlsCertificateKeyFilePassword,
    tlsInsecure: this.config.tlsInsecure,
    w: this.config.w,
    waitQueueTimeoutMS: this.config.waitQueueTimeoutMS,
    wTimeoutMS: this.config.wTimeout, //
    zlibCompressionLevel: this.config.zlibCompressionLevel,
  };

  // Build up options used for creating a Server instance
  // connectionOptions.server = {
  //   readPreference: this.config.readPreference,
  //   // ssl: this.config.ssl,
  //   sslValidate: this.config.sslValidate,
  //   sslCA: this.config.sslCA,
  //   sslCert: this.config.sslCert,
  //   sslKey: this.config.sslKey,
  //   poolSize: this.config.poolSize,
  //   socketOptions: this.config.socketOptions,
  //   autoReconnect: this.config.auto_reconnect,
  //   disableDriverBSONSizeCheck: this.config.disableDriverBSONSizeCheck,
  //   reconnectInterval: this.config.reconnectInterval,
  //   reconnectTries: this.config.reconnectTries,
  // };

  // Build up options used for creating a Database instance
  // connectionOptions.db = {
  //   // w: this.config.w,
  //   // wtimeout: this.config.wtimeout,
  //   fsync: this.config.fsync,
  //   // journal: this.config.journal,
  //   readPreference: this.config.readPreference,
  //   native_parser: this.config.nativeParser,
  //   forceServerObjectId: this.config.forceServerObjectId,
  //   recordQueryStats: this.config.recordQueryStats,
  //   retryMiliSeconds: this.config.retryMiliSeconds,
  //   numberOfRetries: this.config.numberOfRetries,
  // };

  // Support for encoded auth credentials
  // connectionOptions.uri_decode_auth = this.config.uri_decode_auth || false;

  // Build A Mongo Connection String
  var connectionString = "mongodb://";

  // If auth is used, append it to the connection string
  if (this.config.user && this.config.password) {
    // Ensure a database was set if auth in enabled
    if (!this.config.database) {
      throw new Error(
        "The MongoDB Adapter requires a database config option if authentication is used."
      );
    }

    connectionString += this.config.user + ":" + this.config.password + "@";
  }

  // Append the host and port
  connectionString += this.config.host + ":" + this.config.port + "/";

  if (this.config.database) {
    connectionString += this.config.database;
  }

  // Use config connection string if available
  if (this.config.url) connectionString = this.config.url;

  // Open a Connection
  const client = await MongoClient.connect(connectionString, connectionOptions);
  const database = client.db();
  cb(null, database, client);
};

/**
 * Ensure Indexes
 *
 * @param {String} collection
 * @param {Array} indexes
 * @param {Function} callback
 * @api private
 */

Connection.prototype._ensureIndexes = async function _ensureIndexes(
  collection,
  indexes,
  cb
) {
  for (const i in indexes) {
    const item = indexes[i];
    await collection.createIndex(item.index, item.options);
  }
  cb();
};
