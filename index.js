require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
var jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cookieParser());
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.54rjrr8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const jobsCollection = client.db("JobPortal").collection("jobs");
    const applicationCollection = client
      .db("JobPortal")
      .collection("applications");

    // Auth related APIs

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1h" });
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
      });
      res.send({ success: true });
    });

    // Jobs APIs
    app.get("/jobs", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { hr_email: email };
      }
      const jobs = jobsCollection.find(query);
      const result = await jobs.toArray();
      res.send(result);
    });

    app.get("/job/:id", async (req, res) => {
      const { id } = req.params;
      const job = await jobsCollection.findOne({ _id: new ObjectId(id) });
      res.send(job);
    });

    app.post("/jobs", async (req, res) => {
      const newJob = req.body;
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    });

    // Applications APIs

    app.get("/job-applications/jobs/:job_id", async (req, res) => {
      const jobId = req.params.job_id;
      const query = { job_id: jobId };
      const result = await applicationCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/job-application", async (req, res) => {
      const newApplication = req.body;
      const result = await applicationCollection.insertOne(newApplication);
      res.send(result);
    });

    app.get("/job-application", async (req, res) => {
      const email = req.query.email;
      const query = email ? { applicant_email: email } : {};
      const result = await applicationCollection.find(query).toArray();

      // wrost way to aggregate data
      for (const application of result) {
        // console.log(application.job_id)
        const query1 = { _id: new ObjectId(application.job_id) };
        const job = await jobsCollection.findOne(query1);
        if (job) {
          application.title = job.title;
          application.company = job.company;
          application.company_logo = job.company_logo;
        }
      }
      res.send(result);
    });

    app.delete("/job-application/:id", async (req, res) => {
      const id = req.params.id;
      const result = await applicationCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // update application status

    app.patch("/job-applications/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: data.status,
        },
      };
      const result = await applicationCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}/`);
});
