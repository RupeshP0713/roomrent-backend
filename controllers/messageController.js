const Message = require('../models/Message');
const Malik = require('../models/Malik');
const Bhadot = require('../models/Bhadot');

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

// Get all conversations with last message and user details
exports.getConversations = async (req, res) => {
    try {
        const userId = req.user.role === 'admin' ? 'rohit' : req.user.id;

        // Aggregate to find all unique conversations
        const conversations = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { senderId: userId },
                        { receiverId: userId }
                    ]
                }
            },
            {
                $sort: { timestamp: -1 }
            },
            {
                $project: {
                    otherId: {
                        $cond: [{ $eq: ["$senderId", userId] }, "$receiverId", "$senderId"]
                    },
                    otherRole: {
                        $toLower: {
                            $cond: [{ $eq: ["$senderId", userId] }, "$receiverRole", "$senderRole"]
                        }
                    },
                    content: 1,
                    timestamp: 1,
                    isRead: 1,
                    isIncoming: { $eq: ["$receiverId", userId] }
                }
            },
            {
                $group: {
                    _id: { id: "$otherId", role: "$otherRole" },
                    lastMessage: { $first: "$content" },
                    timestamp: { $first: "$timestamp" },
                    unreadCount: {
                        $sum: {
                            $cond: [{ $and: ["$isIncoming", { $eq: ["$isRead", false] }] }, 1, 0]
                        }
                    }
                }
            },
            {
                $sort: { timestamp: -1 }
            }
        ]);

        // Populate user details
        const enrichedConversations = await Promise.all(conversations.map(async (conv) => {
            let userDetails = null;
            const role = conv._id.role.toLowerCase(); // Ensure lowercase comparison

            try {
                if (role === 'malik') {
                    userDetails = await Malik.findOne({ id: conv._id.id }).select('name whatsapp');
                } else if (role === 'bhadot') {
                    userDetails = await Bhadot.findOne({ id: conv._id.id }).select('name mobile');
                }
            } catch (err) {
                console.error(`Error fetching user details for ${conv._id.id} (${role}):`, err);
            }

            return {
                _id: conv._id.id,
                role: role.charAt(0).toUpperCase() + role.slice(1), // Capitalize for display
                lastMessage: conv.lastMessage,
                timestamp: conv.timestamp,
                unreadCount: conv.unreadCount,
                name: userDetails ? userDetails.name : 'Unknown User',
                contact: userDetails ? (userDetails.whatsapp || userDetails.mobile) : ''
            };
        }));

        res.json(enrichedConversations);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: error.message });
    }
};
