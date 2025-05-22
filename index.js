const express = require('express');
const mongodb = require('mongodb');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

require('dotenv').config();


const app = express();
app.use(cors());
app.use(express.json());
const port = process.env.PORT || 5000;


//
// 

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster-1.aronqxv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster-1`;


const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();


        const plantCollection = client.db('plantsDB').collection('plants');

        app.post('/plants', async (req, res) => {
            const data = req.body;
            const result = await plantCollection.insertOne(data);
            res.send(result);
        })

        app.get('/plants', async (req, res) => {
            const result = await plantCollection.find().toArray();
            res.send(result)
        })

        app.get('/plants/:id', async(req, res)=> {
            const id = req.params.id;
            const query = {_id : new ObjectId(id)};
            const result = await plantCollection.findOne(query);
            res.send(result);
        })

        app.get('/plants_added/:email', async(req,res)=> {
            const id = req.params.email;
            console.log(id);
            const query = {email : id}
            const result =  await plantCollection.find(query).toArray();
            res.send(result);
        })

        app.delete('/plants/:id', async (req, res)=> {
            const id = req.params.id;
            const filter = {_id: new ObjectId(id)};
            const result = await plantCollection.deleteOne(filter);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('_Plant server connected');
})

app.listen(port, () => {
    console.log(`server is running on port ${port}`)
})