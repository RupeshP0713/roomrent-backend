const Malik = require('../models/Malik');
const Bhadot = require('../models/Bhadot');

exports.searchUser = async (req, res) => {
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
};
