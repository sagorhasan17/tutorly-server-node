import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
dotenv.config();

const uri = process.env.MONGODB_URI;

const app = express();
const PORT = process.env.PORT || 5000;
// Middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//middleware function
const jwks = createRemoteJWKSet(new URL(`${process.env.LOCALHOST_URI}/api/auth/jwks`));
const verifyToken = async(req, res, next) => {
    const authHeader = await req.headers.authorization;
    console.log(authHeader)
    if(!authHeader){
        return res.status(401).send({message: 'unauthorized access'})
    }
    const token = authHeader.split(' ')[1];
    if(!token){
        return res.status(401).send({message: 'unauthorized access'})
    }

    try {
        const {payload} = await jwtVerify(token, jwks)
        next()
    } catch (error) {
        return res.status(401).send({message: 'unauthorized access'})
    }
    
}
async function server() {
  try {
    await client.connect();
    const db = client.db("tutorlyDB");
    const teacherCollection = db.collection("teachers");
    const bookingsCollection = db.collection("bookings");

    //create a new teacher
    app.post('/teachers',verifyToken, async (req, res) => {
        const teacher = req.body;
        const result = await teacherCollection.insertOne(teacher);
        res.send(result);
    });

    //get all teachers
    app.get('/teachers/all',verifyToken, async (req, res) => {
        const teachers = await teacherCollection.find().toArray();
        res.send(teachers);
    });

    //popular 
    app.get('/teachers/popular',verifyToken, async (req, res) => {
        const teachers = await teacherCollection.find().limit(6).toArray();
        res.send(teachers);
    });

    //get single teacher
    app.get('/teachers/:id',verifyToken, async (req, res) => {
        const id = req.params.id;
        const queryID = { _id: new ObjectId(id) };
        const teacher = await teacherCollection.findOne(queryID);
        res.send(teacher);
    });




    await client.db("tutorlyDB").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
server().catch(console.dir);

app.listen(PORT, () => {
    console.log(`This Server is Running on Port ${PORT}`);
});