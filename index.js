require('dotenv').config();
const express = require('express');
const mongodb = require('mongodb');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { default: axios } = require('axios');


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
        const usersCollection = client.db('plantsDB').collection('users');


        // users apis

        app.post('/users', async (req, res) => {
            const { userInfo, deviceInfo } = req.body;

            const userEmail = userInfo?.providerData[0]?.email;
            const users = await usersCollection.find().toArray();

            console.log("user email->", userEmail);
            console.log('users from database->', users);

            // Get IP address
            let ipAddress = req.headers['x-forwarded-for'] || req.ip;
            if (ipAddress && ipAddress.includes(',')) {
                ipAddress = ipAddress.split(',')[0].trim();
            }
            if (ipAddress === '::1' || ipAddress === '127.0.0.1') {
                console.warn('Localhost detected. Request is coming from localhost!!');
                ipAddress = '8.8.8.8'; // fallback to public IP
            }

            console.log('user->', userInfo, 'device info->', deviceInfo, 'ipAddress->', ipAddress);

            // Check if user already exists based on email
            const isAlreadyExists = users.some(user => user.email === userEmail);

            if (!isAlreadyExists && userEmail) {
                const newUser = {
                    uid: userInfo.uid,
                    name: userInfo.providerData[0].displayName,
                    email: userEmail,
                    photoURL: userInfo.providerData[0].photoURL,
                    providerId: userInfo.providerData[0].providerId,
                    deviceInfo,
                    createdAt: new Date(),
                };

                try {
                    // Get geoLocation
                    const geoResponse = await axios.get(`http://ip-api.com/json/${ipAddress}`);
                    const geoData = geoResponse.data;

                    if (geoData?.status === 'fail') {
                        return res.status(400).send({ message: "Failed to fetch geoCalculation data!", error: geoData?.message });
                    }

                    // Attach geo data to user
                    newUser.location = {
                        country: geoData.country,
                        city: geoData.city,
                        region: geoData.regionName,
                        timezone: geoData.timezone,
                        ip: ipAddress
                    };

                    // Save user in DB
                    await usersCollection.insertOne(newUser);

                    console.log('geo calculation data->', geoData);
                    return res.status(200).send({ message: "Account Created Successfully and saved user data in the database" });

                } catch (error) {
                    console.error("Error fetching geoLocation.", error?.message);
                    return res.status(500).send({ message: 'Failed to process request!', error: error?.message });
                }
            } else {
                return res.status(200).send({ message: "User already exists or invalid user info!" });
            }
        });

        app.get('/allUsersCount', async (req, res) => {
            try {
                const count = await usersCollection.estimatedDocumentCount();
                res.status(200).send({ message: 'Successfully fetched all users count.', count });
            }
            catch (error) {
                res.status(400).send({ message: "Failed fetching all users data", error });
            }
        })



        // plant apis

        app.post('/plants', async (req, res) => {
            const data = req.body;
            const result = await plantCollection.insertOne(data);
            res.send(result);
        })

        app.get('/plants', async (req, res) => {
            const { sortParam } = req.query;
            // console.log('sort param',sortParam);

            let sortObj = {};
            if (sortParam === 'nextWateringDate') {
                sortObj[sortParam] = 1;
            }
            if (sortParam === 'lastWateredDate') {
                sortObj[sortParam] = -1;
            }

            const result = await plantCollection.find().sort(sortObj).toArray()
            res.send(result)

        })

        app.get('/plant=counts', async (req, res) => {
            const count = await plantCollection.estimatedDocumentCount()
            console.log('count->', count);
            res.status(200).send({ message: 'Successfully fetched plants count number.', count });
        })

        app.get('/plants/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await plantCollection.findOne(query);
            res.send(result);
        })

        app.get('/plants_added/:email', async (req, res) => {
            const id = req.params.email;
            // console.log(id);
            const filter = { email: id }

            const { count } = req.query;
            if (count === 'true') {
                const plants = await plantCollection.countDocuments(filter);
                console.log('plants->', plants);
                return res.status(200).send({ message: "Successfully fetched users plant counts.", plants });
            }


            const result = await plantCollection.find(filter).toArray();
            res.send(result);
        })


        app.put('/plants/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedPlant = {
                $set: req.body
            }
            const result = await plantCollection.updateOne(query, updatedPlant, options);
            res.send(result);
        })

        app.delete('/plants/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await plantCollection.deleteOne(filter);
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
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