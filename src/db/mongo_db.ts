import { MongoClient, ServerApiVersion, Db } from 'mongodb';

function setupMongoClient() {
  if (process.env.MONGO_CONNECTION_URI) {
    const client = new MongoClient(process.env.MONGO_CONNECTION_URI,
      {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true
        }
      }
    )
    return client
  }
  throw new Error("No connection uri to MongoDB provided")
}

// madden_db.ts only uses this module when MONGO_CONNECTION_URI is set
// (see the dbToUse ternary there), but this module is imported
// unconditionally. Connecting lazily on first real use - instead of at
// import time - means a deployment that never selects the Mongo backend
// doesn't need MONGO_CONNECTION_URI set just to boot.
let cachedDb: Db | undefined
function getDb(): Db {
  if (!cachedDb) {
    cachedDb = setupMongoClient().db("snallabot_data")
  }
  return cachedDb
}

const db = new Proxy({} as Db, {
  get(_target, prop, _receiver) {
    const realDb = getDb()
    const value = Reflect.get(realDb, prop, realDb)
    return typeof value === "function" ? value.bind(realDb) : value
  }
})
export default db
