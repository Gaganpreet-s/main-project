const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken'); // Import the jsonwebtoken library

const app = express();

app.use(bodyParser.json());
app.use(cors());

// Set your JWT secret key (replace with your actual secret)
const JWT_SECRET = 'shinchanshinchanpyarapyara';

const uri = 'mongodb+srv://diksha01:g2PaviX31ul8xiyo@cluster0.znoo7l1.mongodb.net/;'
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function connectDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
  } catch (err) {
    console.error('Error connecting to MongoDB Atlas:', err);
  }
}

connectDB();

// Middleware for JWT token verification
function verifyToken(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(403).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Failed to authenticate token' });
    }

    // If the token is valid, store the decoded user information in the request object
    req.user = decoded;
    next();
  });
}

app.post('/login', (req, res) => {
  const { username, password } = req.body;

  fs.readFile('./users.json', 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading users data');
      return;
    }

    const users = JSON.parse(data);

    const user = users.find(
      (user) => user.username === username && user.password === password
    );

    if (!user) {
      res.status(401).send('Invalid credentials');
      return;
    }
     // Log the role here to ensure it's correctly retrieved from the user object
     console.log('User Role:', user.role);

    // If the user is authenticated, create a JWT token
    const token = jwt.sign({ username, role: user.role }, JWT_SECRET, {
      expiresIn: '1h', // Token expiration time (adjust as needed)
    });

    res.status(200).send({
      role: user.role,
      id: user.id,
      father_name: user.father_name,
      URN: user.URN,
      CRN: user.CRN,
      department: user.department,
      token: token, // Include the token in the response
    });
  });
});

// Routes that require authentication
app.post('/api/generate-request', verifyToken, async (req, res) => {
  const { studentId, requestDetails, fatherName, URN, CRN, department } = req.body;

  try {
    const collection = client.db('req').collection('pending');
    const result = await collection.insertOne({
      studentId,
      requestDetails,
      fatherName,
      URN,
      CRN,
      department,
      status: 'pending',
      createdAt: new Date(),
    });

    res.status(201).json({ success: true, message: 'Request generated successfully' });
  } catch (err) {
    console.error('Error generating request:', err);
    res.status(500).json({ success: false, message: 'Failed to generate request' });
  }
});

// Protected route example with token verification middleware
app.get('/api/data', verifyToken, async (req, res) => {
  try {
    const collection = client.db('req').collection('pending');
    const data = await collection.find().toArray();
    res.json(data);
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).json({ error: 'An error occurred while fetching data' });
  }
});


app.get('/api/pending-requests', verifyToken, async (req, res) => {
  try {
    const requestsCollection = client.db('req').collection('pending');
    const pendingRequests = await requestsCollection.find({ status: 'pending' }).toArray();

    res.status(200).send(pendingRequests);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).send('Error fetching pending requests');
  }
});

app.post('/api/approve-requests', verifyToken, async (req, res) => {
  const requestIds = req.body.requestIds;

  try {
    const requestsCollection = client.db('req').collection('pending');

    // Update requests with the given IDs
    await requestsCollection.updateMany(
      { _id: { $in: requestIds.map((id) => new ObjectId(id)) } },
      { $set: { status: 'approved' } }
    );

    const approvedRequests = await requestsCollection.find({ _id: { $in: requestIds.map((id) => new ObjectId(id)) } }).toArray();
    const approvedRequestsCollection = client.db('req').collection('approved_requests');
    await approvedRequestsCollection.insertMany(approvedRequests);
    await requestsCollection.deleteMany({ _id: { $in: requestIds.map((id) => new ObjectId(id)) } });

    res.sendStatus(200);
  } catch (error) {
    console.error('Error approving the request:', error);
    res.status(500).send('Error approving the request');
  }
});

app.get('/api/approved-requests', verifyToken, async (req, res) => {
  try {
    const approvedRequestsCollection = client.db('req').collection('approved_requests');
    const approvedRequests = await approvedRequestsCollection.find().toArray();

    res.status(200).send(approvedRequests);
  } catch (error) {
    console.error('Error fetching approved requests:', error);
    res.status(500).send('Error fetching approved requests');
  }
});

app.post('/api/pause-requests', verifyToken, async (req, res) => {
  const requestIds = req.body.requestIds;

  try {
    const requestsCollection = client.db('req').collection('pending');

    // Update requests with the given IDs
    await requestsCollection.updateMany(
      { _id: { $in: requestIds.map((id) => new ObjectId(id)) } },
      { $set: { status: 'paused' } }
    );

    const pausedRequests = await requestsCollection.find({ _id: { $in: requestIds.map((id) => new ObjectId(id)) } }).toArray();
    const pausedRequestsCollection = client.db('req').collection('paused');
    await pausedRequestsCollection.insertMany(pausedRequests);
    await requestsCollection.deleteMany({ _id: { $in: requestIds.map((id) => new ObjectId(id)) } });

    res.sendStatus(200);
  } catch (error) {
    console.error('Error pausing the request:', error);
    res.status(500).send('Error pausing the request');
  }
});

app.get('/api/paused-requests', verifyToken, async (req, res) => {
  try {
    const pausedRequestsCollection = client.db('req').collection('paused');
    const pausedRequests = await pausedRequestsCollection.find().toArray();

    res.status(200).send(pausedRequests);
  } catch (error) {
    console.error('Error fetching paused requests:', error);
    res.status(500).send('Error fetching paused requests');
  }
});

app.post('/api/approved-requests-from-paused', verifyToken, async (req, res) => {
  const requestIds = req.body.requestIds;

  try {
    const pausedRequestsCollection = client.db('req').collection('paused');
    const approvedRequestsCollection = client.db('req').collection('approved_requests');

    // Update paused requests with the given IDs
    await pausedRequestsCollection.updateMany(
      { _id: { $in: requestIds.map((id) => new ObjectId(id)) } },
      { $set: { status: 'approved' } }
    );

    const pausedRequests = await pausedRequestsCollection.find({ _id: { $in: requestIds.map((id) => new ObjectId(id)) } }).toArray();
    await approvedRequestsCollection.insertMany(pausedRequests);

    await pausedRequestsCollection.deleteMany({ _id: { $in: requestIds.map((id) => new ObjectId(id)) } });

    res.sendStatus(200);
  } catch (error) {
    console.error('Error approving the request:', error);
    res.status(500).send('Error approving the request');
  }
});

app.get('/api/approved-requests-from-paused', verifyToken, async (req, res) => {
  try {
    const approvedRequestsCollection = client.db('req').collection('approved_requests');
    const approvedRequests = await approvedRequestsCollection.find().toArray();

    res.status(200).send(approvedRequests);
  } catch (error) {
    console.error('Error fetching approved requests:', error);
    res.status(500).send('Error fetching approved requests');
  }
});

app.post('/api/revert-requests', verifyToken, async (req, res) => {
  const requestIds = req.body.requestIds;

  try {
    const pausedRequestsCollection = client.db('req').collection('paused');
    const pendingRequestsCollection = client.db('req').collection('pending');

    await pausedRequestsCollection.updateMany(
      { _id: { $in: requestIds.map((id) => new ObjectId(id)) } },
      { $set: { status: 'pending' } }
    );

    const pausedRequests = await pausedRequestsCollection.find({ _id: { $in: requestIds.map((id) => new ObjectId(id)) } }).toArray();
    await pendingRequestsCollection.insertMany(pausedRequests);

    await pausedRequestsCollection.deleteMany({ _id: { $in: requestIds.map((id) => new ObjectId(id)) } });

    res.sendStatus(200);
  } catch (error) {
    console.error('Error reverting the request:', error);
    res.status(500).send('Error reverting the request');
  }
});

app.get('/api/paused-requests', verifyToken, async (req, res) => {
  try {
    const pausedRequestsCollection = client.db('req').collection('paused');
    const pausedRequests = await pausedRequestsCollection.find().toArray();

    res.status(200).send(pausedRequests);
  } catch (error) {
    console.error('Error fetching paused requests:', error);
    res.status(500).send('Error fetching paused requests');
  }
});

const PORT = process.env.PORT || 3001;
app.listen(3001, () => {
  console.log(`Server running on port ${PORT}`);
});