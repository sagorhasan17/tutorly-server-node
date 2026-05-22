import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
dotenv.config();

const uri = process.env.MONGODB_URI;

const app = express();
const PORT = process.env.PORT || 5000;
// Middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

//middleware function
const jwks = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`),
);
const verifyToken = async (req, res, next) => {
  const authHeader = await req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  try {
    const { payload } = await jwtVerify(token, jwks);
    next();
  } catch (error) {
    return res.status(401).send({ message: "unauthorized access" });
  }
};
async function server() {
  try {
    // await client.connect();
    const db = client.db("tutorlyDB");
    const teacherCollection = db.collection("teachers");
    const bookingsCollection = db.collection("bookings");

    //create a new teacher
    app.post("/add-tutor", async (req, res) => {
      const teacher = req.body;
      const result = await teacherCollection.insertOne(teacher);
      res.send(result);
    });

    //create a new booking
    app.post("/bookings/create", async (req, res) => {
      try {
        const bookingData = req.body;
        // check already booked
        const alreadyBooked = await bookingsCollection.findOne({
          email: bookingData.email,
          tutorName: bookingData.tutorName,
        });
        if (alreadyBooked) {
          return res.status(400).send({
            success: false,
            message: "You already booked this tutor",
          });
        }
        // get teacher
        const teacher = await teacherCollection.findOne({
          _id: new ObjectId(bookingData.tutorId),
        });

        // teacher not found
        if (!teacher) {
          return res.status(404).send({
            success: false,
            message: "Tutor not found",
          });
        }
        // slot check
        if (Number(teacher.totalSlots) <= 0) {
          return res.status(400).send({
            success: false,
            message: "No slots available",
          });
        }
        // booking date check
        const today = new Date();
        const sessionStartDate = new Date(teacher.sessionStartDate);
        if (today > sessionStartDate) {
          return res.status(400).send({
            success: false,
            message: "Booking date expired",
          });
        }
        // create booking
        const result = await bookingsCollection.insertOne(bookingData);
        // decrease slot
        await teacherCollection.updateOne(
          {
            _id: new ObjectId(bookingData.tutorId),
          },
          {
            $inc: {
              totalSlots: -1,
            },
          },
        );
        res.status(201).send({
          success: true,
          message: "Booking successful",
          result,
        });
      } catch (error) {
        console.log(error);
        res.status(500).send({
          success: false,
          message: "Failed to create booking",
        });
      }
    });

    //get all teachers
    app.get("/teachers/all", async (req, res) => {
      const teachers = await teacherCollection.find().toArray();
      res.send(teachers);
    });

    //popular
    app.get("/teachers/popular", async (req, res) => {
      const teachers = await teacherCollection.find().limit(6).toArray();
      res.send(teachers);
    });

    //get single teacher
    app.get("/teachers/:id", async (req, res) => {
      const id = req.params.id;
      const queryID = { _id: new ObjectId(id) };
      const teacher = await teacherCollection.findOne(queryID);
      res.send(teacher);
    });

    //get my booking
    app.get("/my-bookings", async (req, res) => {
      const email = req.query.email;

      const bookings = await bookingsCollection
        .find({ email: email })
        .toArray();

      console.log(bookings);

      res.send(bookings);
    });

    // cancel booking route

    app.patch("/bookings/cancel/:id", async (req, res) => {
      try {
        const {id} = await req.params;

        // get booking

        const booking = await bookingsCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!booking) {
          return res.status(404).send({
            success: false,
            message: "Booking not found",
          });
        }

        // update booking status
        const result = await bookingsCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              currentStatus: "cancelled",
            },
          },
        );

        // increase slot again
        await teacherCollection.updateOne(
          {
            _id: new ObjectId(booking.tutorId),
          },
          {
            $inc: {
              totalSlots: 1,
            },
          },
        );
        res.send({
          success: true,
          message: "Booking cancelled",
          result,
        });
      } catch (error) {
        console.log(error);
        res.status(500).send({
          success: false,
          message: "Failed to cancel booking",
        });
      }
    });


    

    // await client.db("tutorlyDB").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!",);
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
server().catch(console.dir);

app.listen(PORT, () => {
  console.log(`This Server is Running on Port ${PORT}`);
});
