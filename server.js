const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// CORS configuration - Allow frontend domains
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://roomrent-ten.vercel.app',
  process.env.FRONTEND_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // In production, allow specific origins; in development, allow all
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      // For production, be more permissive to avoid CORS issues
      callback(null, true);
    }
  },
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
const isProduction = process.env.NODE_ENV === 'production';
const LOCAL_MONGODB_URI = 'mongodb://127.0.0.1:27017/roomrent';

// In production (Vercel), MONGODB_URI MUST be provided via environment variables.
// In development, we fall back to a local MongoDB instance if not set.
const MONGODB_URI = process.env.MONGODB_URI || (isProduction ? null : LOCAL_MONGODB_URI);

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set. Please configure it in your environment variables.');
  // In serverless environments, it's better to fail fast if DB is not configured.
  throw new Error('MONGODB_URI is required in production environment');
}

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
  });

// Database Status Check
let dbStatus = {
  connected: false,
  lastCheck: null
};

mongoose.connection.on('connected', () => {
  dbStatus.connected = true;
  dbStatus.lastCheck = new Date();
});

mongoose.connection.on('disconnected', () => {
  dbStatus.connected = false;
  dbStatus.lastCheck = new Date();
});

// Models
const MalikSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  whatsapp: { type: String, required: true },
  address: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const BhadotSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  area: { type: String, default: '' },
  cast: { type: String, default: '' },
  totalFamilyMembers: { type: Number, default: 0 },
  status: { type: String, enum: ['Waiting', 'Approved'], default: 'Waiting' },
  createdAt: { type: Date, default: Date.now }
});

const RentRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  malikId: { type: String, required: true },
  bhadotId: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' },
  timestamp: { type: Date, default: Date.now }
});

const Malik = mongoose.model('Malik', MalikSchema);
const Bhadot = mongoose.model('Bhadot', BhadotSchema);
const RentRequest = mongoose.model('RentRequest', RentRequestSchema);

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    res.json({
      status: 'ok',
      database: isConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Authentication
app.post('/api/admin/login', (req, res) => {
  const { id, password } = req.body;
  if (id === 'rohit' && password === 'rohit@6359') {
    res.json({ success: true, message: 'Admin authenticated' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Admin Dashboard Stats
app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalMaliks = await Malik.countDocuments();
    const totalBhadots = await Bhadot.countDocuments();
    const totalRequests = await RentRequest.countDocuments();
    const pendingRequests = await RentRequest.countDocuments({ status: 'Pending' });
    const acceptedRequests = await RentRequest.countDocuments({ status: 'Accepted' });
    
    res.json({
      totalMaliks,
      totalBhadots,
      totalRequests,
      pendingRequests,
      acceptedRequests
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Users (Master Database)
app.get('/api/admin/users', async (req, res) => {
  try {
    const maliks = await Malik.find().sort({ createdAt: -1 });
    const bhadots = await Bhadot.find().sort({ createdAt: -1 });
    
    res.json({
      maliks: maliks.map(m => ({
        id: m.id,
        name: m.name,
        whatsapp: m.whatsapp,
        address: m.address,
        role: 'Malik',
        createdAt: m.createdAt
      })),
      bhadots: bhadots.map(b => ({
        id: b.id,
        name: b.name,
        mobile: b.mobile,
        area: b.area,
        status: b.status,
        role: 'Bhadot',
        createdAt: b.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete User
app.delete('/api/admin/users/:role/:id', async (req, res) => {
  try {
    const { role, id } = req.params;
    
    if (role === 'Malik') {
      await Malik.deleteOne({ id });
      await RentRequest.deleteMany({ malikId: id });
    } else if (role === 'Bhadot') {
      await Bhadot.deleteOne({ id });
      await RentRequest.deleteMany({ bhadotId: id });
    } else {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Transaction Log
app.get('/api/admin/transactions', async (req, res) => {
  try {
    const requests = await RentRequest.find()
      .sort({ timestamp: -1 })
      .limit(100);
    
    const transactions = await Promise.all(requests.map(async (req) => {
      const malik = await Malik.findOne({ id: req.malikId });
      const bhadot = await Bhadot.findOne({ id: req.bhadotId });
      
      return {
        id: req.id,
        malikName: malik ? malik.name : 'Unknown',
        bhadotName: bhadot ? bhadot.name : 'Unknown',
        status: req.status,
        timestamp: req.timestamp
      };
    }));
    
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remote Search - Find user by mobile/whatsapp
app.get('/api/search/:number', async (req, res) => {
  try {
    const { number } = req.params;
    const cleanNumber = number.replace(/\D/g, '');
    
    if (cleanNumber.length !== 10) {
      return res.json({ found: false });
    }
    
    const malik = await Malik.findOne({ whatsapp: { $regex: cleanNumber } });
    const bhadot = await Bhadot.findOne({ mobile: { $regex: cleanNumber } });
    
    if (malik) {
      return res.json({
        found: true,
        role: 'Malik',
        user: {
          id: malik.id,
          name: malik.name,
          whatsapp: malik.whatsapp,
          address: malik.address
        }
      });
    }
    
    if (bhadot) {
      return res.json({
        found: true,
        role: 'Bhadot',
        user: {
          id: bhadot.id,
          name: bhadot.name,
          mobile: bhadot.mobile,
          area: bhadot.area,
          status: bhadot.status
        }
      });
    }
    
    res.json({ found: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Malik (Landlord) Routes
app.post('/api/malik/register', async (req, res) => {
  try {
    const { name, whatsapp, address } = req.body;
    
    // Check if already exists by WhatsApp
    const existing = await Malik.findOne({ whatsapp });
    if (existing) {
      return res.status(400).json({ error: 'Malik already exists with this WhatsApp number' });
    }
    
    // Auto-generate ID based on WhatsApp number
    const id = `MALIK_${whatsapp.replace(/\D/g, '')}`;
    
    const malik = new Malik({ id, name, whatsapp, address });
    await malik.save();
    
    res.json({ success: true, malik });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/malik/:id', async (req, res) => {
  try {
    const malik = await Malik.findOne({ id: req.params.id });
    if (!malik) {
      return res.status(404).json({ error: 'Malik not found' });
    }
    res.json(malik);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/malik/:id/address', async (req, res) => {
  try {
    const { address } = req.body;
    const malik = await Malik.findOneAndUpdate(
      { id: req.params.id },
      { address },
      { new: true }
    );
    if (!malik) {
      return res.status(404).json({ error: 'Malik not found' });
    }
    res.json({ success: true, malik });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/malik/:id', async (req, res) => {
  try {
    const { name, whatsapp, address } = req.body;
    const malik = await Malik.findOneAndUpdate(
      { id: req.params.id },
      { name, whatsapp, address },
      { new: true }
    );
    if (!malik) {
      return res.status(404).json({ error: 'Malik not found' });
    }
    res.json({ success: true, malik });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/malik/:id/bhadots', async (req, res) => {
  try {
    // Show all Bhadots to all Maliks regardless of status
    const bhadots = await Bhadot.find().sort({ createdAt: -1 });
    res.json(bhadots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/malik/request', async (req, res) => {
  try {
    const { malikId, bhadotId } = req.body;
    
    // Check if request already exists
    const existing = await RentRequest.findOne({ malikId, bhadotId, status: 'Pending' });
    if (existing) {
      return res.status(400).json({ error: 'Request already sent' });
    }
    
    // Get all pending requests for this Malik
    const pendingRequests = await RentRequest.find({ 
      malikId, 
      status: 'Pending' 
    }).sort({ timestamp: 1 }); // Sort by oldest first
    
    // Check for requests older than 24 hours
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Count active pending requests (not older than 24 hours)
    const activePendingRequests = pendingRequests.filter(req => {
      const requestTime = new Date(req.timestamp);
      return requestTime > twentyFourHoursAgo;
    });
    
    // Maximum 2 active pending requests allowed
    if (activePendingRequests.length >= 2) {
      // Find the oldest request to show when next request can be sent
      const oldestRequest = pendingRequests[0];
      const oldestRequestTime = new Date(oldestRequest.timestamp);
      const nextAvailableTime = new Date(oldestRequestTime.getTime() + 24 * 60 * 60 * 1000);
      const hoursRemaining = Math.ceil((nextAvailableTime - now) / (1000 * 60 * 60));
      
      return res.status(400).json({ 
        error: `Maximum 2 pending requests allowed. You can send more requests in ${hoursRemaining} hour(s).`,
        hoursRemaining
      });
    }
    
    const request = new RentRequest({
      id: `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      malikId,
      bhadotId,
      status: 'Pending'
    });
    
    await request.save();
    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/malik/:id/requests', async (req, res) => {
  try {
    const requests = await RentRequest.find({ malikId: req.params.id })
      .sort({ timestamp: -1 });
    
    const requestsWithDetails = await Promise.all(requests.map(async (req) => {
      const bhadot = await Bhadot.findOne({ id: req.bhadotId });
      return {
        id: req.id,
        bhadotId: req.bhadotId,
        bhadotName: bhadot ? bhadot.name : 'Unknown',
        bhadotMobile: bhadot ? bhadot.mobile : '',
        bhadotArea: bhadot ? bhadot.area : '',
        bhadotCast: bhadot ? bhadot.cast : '',
        bhadotTotalFamilyMembers: bhadot ? bhadot.totalFamilyMembers : 0,
        status: req.status,
        timestamp: req.timestamp
      };
    }));
    
    res.json(requestsWithDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bhadot (Tenant) Routes
app.post('/api/bhadot/register', async (req, res) => {
  try {
    const { name, mobile, cast, totalFamilyMembers } = req.body;
    
    // Check if already exists by mobile
    const existing = await Bhadot.findOne({ mobile });
    if (existing) {
      return res.status(400).json({ error: 'Bhadot already exists with this mobile number' });
    }
    
    // Validation
    if (!cast || !totalFamilyMembers || totalFamilyMembers < 1) {
      return res.status(400).json({ error: 'Cast and total family members are required' });
    }
    
    // Auto-generate ID based on mobile number
    const id = `BHADOT_${mobile.replace(/\D/g, '')}`;
    
    const bhadot = new Bhadot({ 
      id, 
      name, 
      mobile, 
      area: '', 
      cast: cast || '', 
      totalFamilyMembers: totalFamilyMembers || 0, 
      status: 'Waiting' 
    });
    await bhadot.save();
    
    res.json({ success: true, bhadot });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bhadot/:id', async (req, res) => {
  try {
    const bhadot = await Bhadot.findOne({ id: req.params.id });
    if (!bhadot) {
      return res.status(404).json({ error: 'Bhadot not found' });
    }
    res.json(bhadot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/bhadot/:id', async (req, res) => {
  try {
    const { name, mobile, status, cast, totalFamilyMembers } = req.body;
    const updateData = { name, mobile };
    if (status) {
      updateData.status = status;
    }
    if (cast !== undefined) {
      updateData.cast = cast;
    }
    if (totalFamilyMembers !== undefined) {
      updateData.totalFamilyMembers = totalFamilyMembers;
    }
    const bhadot = await Bhadot.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true }
    );
    if (!bhadot) {
      return res.status(404).json({ error: 'Bhadot not found' });
    }
    res.json({ success: true, bhadot });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bhadot/available-rooms', async (req, res) => {
  try {
    const count = await Bhadot.countDocuments({ status: 'Approved' });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bhadot/:id/requests', async (req, res) => {
  try {
    const requests = await RentRequest.find({ bhadotId: req.params.id })
      .sort({ timestamp: -1 });
    
    const requestsWithDetails = await Promise.all(requests.map(async (req) => {
      const malik = await Malik.findOne({ id: req.malikId });
      return {
        id: req.id,
        malikId: req.malikId,
        malikName: malik ? malik.name : 'Unknown',
        malikWhatsapp: req.status === 'Accepted' && malik ? malik.whatsapp : null,
        malikAddress: req.status === 'Accepted' && malik ? malik.address : null,
        status: req.status,
        timestamp: req.timestamp
      };
    }));
    
    res.json(requestsWithDetails);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/bhadot/request/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;
    
    if (!['Accepted', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const request = await RentRequest.findOneAndUpdate(
      { id: requestId },
      { status },
      { new: true }
    );
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export app for Vercel serverless functions
// For local development, start server manually
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;


