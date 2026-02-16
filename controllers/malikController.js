const Malik = require('../models/Malik');
const Bhadot = require('../models/Bhadot');
const RentRequest = require('../models/RentRequest');

const jwt = require('jsonwebtoken');

// Helper to generate token
const generateToken = (id) => {
    return jwt.sign({ user: { id, role: 'malik' } }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

exports.registerMalik = async (req, res) => {
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

        res.json({ success: true, malik, token: generateToken(id) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.loginMalik = async (req, res) => {
    try {
        const { whatsapp } = req.body;
        const malik = await Malik.findOne({ whatsapp });
        if (!malik) {
            return res.status(404).json({ error: 'Malik not found' });
        }
        res.json({ success: true, malik, token: generateToken(malik.id) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.getMalikById = async (req, res) => {
    try {
        const malik = await Malik.findOne({ id: req.params.id });
        if (!malik) {
            return res.status(404).json({ error: 'Malik not found' });
        }
        res.json(malik);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateMalikAddress = async (req, res) => {
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
};

exports.updateMalik = async (req, res) => {
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
};

exports.getMalikBhadots = async (req, res) => {
    try {
        // Show only active Bhadots to Maliks, sorted by newest first (descending order)
        const bhadots = await Bhadot.find({ isActive: { $ne: false } }).sort({ createdAt: -1, _id: -1 });
        res.json(bhadots);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.createRentRequest = async (req, res) => {
    try {
        const { malikId, bhadotId } = req.body;

        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Per-tenant cooldown: check last request from this Malik to this specific Bhadot
        const lastRequestForPair = await RentRequest.findOne({ malikId, bhadotId })
            .sort({ timestamp: -1 });

        if (lastRequestForPair) {
            const lastTime = new Date(lastRequestForPair.timestamp);
            if (lastTime > twentyFourHoursAgo) {
                const nextAvailableTimeForPair = new Date(lastTime.getTime() + 24 * 60 * 60 * 1000);
                const hoursRemainingForPair = Math.ceil((nextAvailableTimeForPair - now) / (1000 * 60 * 60));
                return res.status(400).json({
                    error: `You can send a new request to this tenant after ${hoursRemainingForPair} hour(s).`,
                    hoursRemaining: hoursRemainingForPair
                });
            }
        }

        // Get all pending requests for this Malik
        const pendingRequests = await RentRequest.find({
            malikId,
            status: 'Pending'
        }).sort({ timestamp: 1 }); // Sort by oldest first

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
};

exports.getMalikRequests = async (req, res) => {
    try {
        const malikId = req.params.id;

        // Auto-expire requests older than 5 days for this Malik
        const now = new Date();
        const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
        await RentRequest.updateMany(
            {
                malikId,
                status: { $in: ['Pending', 'Accepted'] },
                timestamp: { $lt: fiveDaysAgo }
            },
            { $set: { status: 'Expired' } }
        );

        // Load only non-expired requests for Malik dashboard
        const requests = await RentRequest.find({ malikId, status: { $ne: 'Expired' } })
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
};
