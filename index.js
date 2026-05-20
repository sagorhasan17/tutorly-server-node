import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';
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
async function server() {
  try {
    await client.connect();
    const db = client.db("tutorlyDB");
    const teacherCollection = db.collection("teachers");
    const bookingsCollection = db.collection("bookings");

    //create a new teacher
    app.post('/teachers', async (req, res) => {
        const teacher = req.body;
        const result = await teacherCollection.insertOne(teacher);
        res.send(result);
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