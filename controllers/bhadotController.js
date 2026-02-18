const Malik = require('../models/Malik');
const Bhadot = require('../models/Bhadot');
const RentRequest = require('../models/RentRequest');

const jwt = require('jsonwebtoken');

// Helper to generate token
const generateToken = (id) => {
    return jwt.sign({ user: { id, role: 'bhadot' } }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

exports.registerBhadot = async (req, res) => {
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

        res.json({ success: true, bhadot, token: generateToken(id) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.loginBhadot = async (req, res) => {
    try {
        const { mobile } = req.body;
        const bhadot = await Bhadot.findOne({ mobile });
        if (!bhadot) {
            return res.status(404).json({ error: 'Bhadot not found' });
        }
        res.json({ success: true, bhadot, token: generateToken(bhadot.id) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.getBhadotById = async (req, res) => {
    try {
        const bhadot = await Bhadot.findOne({ id: req.params.id });
        if (!bhadot) {
            return res.status(404).json({ error: 'Bhadot not found' });
        }
        res.json(bhadot);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateBhadot = async (req, res) => {
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
};

exports.toggleBhadotActive = async (req, res) => {
    try {
        const { isActive } = req.body;
        const bhadotId = req.params.id;

        const bhadot = await Bhadot.findOneAndUpdate(
            { id: bhadotId },
            { isActive: !!isActive },
            { new: true }
        );

        if (!bhadot) {
            return res.status(404).json({ error: 'Bhadot not found' });
        }

        // When Bhadot is set to inactive, auto-reject all active requests
        if (!bhadot.isActive) {
            await RentRequest.updateMany(
                {
                    bhadotId,
                    status: { $in: ['Pending', 'Accepted'] }
                },
                { $set: { status: 'Rejected' } }
            );
        }

        res.json({ success: true, bhadot });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAvailableRooms = async (req, res) => {
    try {
        const count = await Malik.countDocuments();
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getBhadotRequests = async (req, res) => {
    try {
        const bhadotId = req.params.id;

        // Auto-expire requests older than 5 days for this Bhadot
        const now = new Date();
        const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
        await RentRequest.updateMany(
            {
                bhadotId,
                status: { $in: ['Pending', 'Accepted'] },
                timestamp: { $lt: fiveDaysAgo }
            },
            { $set: { status: 'Expired' } }
        );

        const requests = await RentRequest.find({ bhadotId })
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
};

exports.updateRentRequestStatus = async (req, res) => {
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
};
