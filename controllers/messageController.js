const Message = require('../models/Message');

// Send a message
exports.sendMessage = async (req, res) => {
    try {
        const { receiverId, receiverRole, content } = req.body;
        const senderId = req.user.id;
        const senderRole = req.user.role;

        const newMessage = new Message({
            senderId,
            senderRole,
            receiverId,
            receiverRole,
            content
        });

        await newMessage.save();
        res.json({ success: true, message: 'Message sent successfully', data: newMessage });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get messages for a specific conversation
// For Admin: pass userId and userRole of the counterparty
// For User: explicitly fetching their own chat with admin
exports.getMessages = async (req, res) => {
    try {
        const requesterId = req.user.id;
        const requesterRole = req.user.role;

        let query = {};

        if (requesterRole === 'admin') {
            // Admin viewing chat with a specific user
            const { userId, userRole } = req.params;
            query = {
                $or: [
                    { senderId: 'rohit', receiverId: userId }, // Admin sent
                    { senderId: userId, receiverId: 'rohit' }  // Admin received
                ]
            };
        } else {
            // User viewing chat with Admin
            query = {
                $or: [
                    { senderId: requesterId, receiverId: 'rohit' },
                    { senderId: 'rohit', receiverId: requesterId }
                ]
            };
        }

        const messages = await Message.find(query).sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Mark messages as read
exports.markAsRead = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        // Update all messages where receiver is current user and isRead is false
        // For specific conversation context, we might want to filter by senderId too, 
        // but for now marking all incoming as read when creating simple chat view is acceptable or we can refine.

        let filter = { receiverId: userId, isRead: false };

        // If admin is reading, they might be reading a specific user's chat
        if (role === 'admin' && req.body.senderId) {
            filter.senderId = req.body.senderId;
        }

        await Message.updateMany(filter, { $set: { isRead: true } });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get unread counts
// For Admin: grouped by user
// For User: total unread from admin
exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        if (role === 'admin') {
            // Aggregate unread messages by sender
            const unreadCounts = await Message.aggregate([
                { $match: { receiverId: 'rohit', isRead: false } },
                { $group: { _id: "$senderId", count: { $sum: 1 }, role: { $first: "$senderRole" } } }
            ]);
            res.json(unreadCounts);
        } else {
            const count = await Message.countDocuments({ receiverId: userId, senderId: 'rohit', isRead: false });
            res.json({ count });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
