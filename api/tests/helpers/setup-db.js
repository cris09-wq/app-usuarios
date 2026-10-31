import { afterAll, afterEach, beforeAll } from "vitest";
import mongoose from "mongoose"
import { MongoMemoryServer} from "mongodb-memory-server"

let mongoServer

beforeAll(async ()=>{
    mongoServer = await MongoMemoryServer.create()

    await mongoose.connect(mongoServer.getUri())
})

afterAll(async ()=>{
    const collections = await mongoose.connection.db.collections()

    for(const collections of collections){
        await collections.deleteMany({})
    }
})

afterAll( async () =>{
    await mongoose.disconnect()
    await mongoServer.stop()
})