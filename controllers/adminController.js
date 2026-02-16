const Malik = require('../models/Malik');
const Bhadot = require('../models/Bhadot');
const RentRequest = require('../models/RentRequest');

const jwt = require('jsonwebtoken');

exports.login = (req, res) => {
    const { id, password } = req.body;
    if (id === 'rohit' && password === 'rohit@6359') {
        // Generate Token
        const payload = {
            user: {
                id: id,
                role: 'admin'
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '5d' },
            (err, token) => {
                if (err) throw err;
                res.json({ success: true, message: 'Admin authenticated', token });
            }
        );
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
};

exports.getStats = async (req, res) => {
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
};

exports.getUsers = async (req, res) => {
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
};

exports.deleteUser = async (req, res) => {
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
};

exports.getTransactions = async (req, res) => {
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
};
