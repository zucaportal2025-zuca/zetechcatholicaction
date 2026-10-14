const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticateDM } = require('./helpers');

// POST - Save a draft message
router.post('/', authenticateDM, async (req, res) => {
  try {
    const { content, conversationId, recipientId, replyToId, files } = req.body;
    const userId = req.user.userId;

    // Validate: need either conversationId or recipientId
    if (!conversationId && !recipientId) {
      return res.status(400).json({ error: "Either conversationId or recipientId is required" });
    }

    let convId = conversationId;

    // If no conversationId, find or create one with recipient
    if (!convId && recipientId) {
      const [id1, id2] = [userId, recipientId].sort();
      const existingConv = await prisma.conversation.findFirst({
        where: {
          participant1Id: id1,
          participant2Id: id2
        }
      });
      
      if (existingConv) {
        convId = existingConv.id;
      } else {
        // Don't create conversation yet, just store draft without conversation
        convId = null;
      }
    }

    // Check if draft already exists for this conversation
    let draft = await prisma.dMDraft.findFirst({
      where: {
        userId,
        conversationId: convId,
        ...(replyToId && { replyToId })
      }
    });

    if (draft) {
      // Update existing draft
      const updated = await prisma.dMDraft.update({
        where: { id: draft.id },
        data: {
          content: content || null,
          files: files || null,
          updatedAt: new Date()
        }
      });
      
      return res.json({
        success: true,
        draft: updated,
        message: "Draft updated"
      });
    }

    // Create new draft
    const newDraft = await prisma.dMDraft.create({
      data: {
        userId,
        conversationId: convId,
        content: content || null,
        files: files || null,
        replyToId: replyToId || null
      }
    });

    res.status(201).json({
      success: true,
      draft: newDraft,
      message: "Draft saved"
    });

  } catch (err) {
    console.error("Save draft error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Get all drafts for current user
router.get('/', authenticateDM, async (req, res) => {
  try {
    const userId = req.user.userId;

    const drafts = await prisma.dMDraft.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participant1: { select: { id: true, fullName: true, profileImage: true } },
            participant2: { select: { id: true, fullName: true, profileImage: true } }
          }
        },
        replyTo: {
          include: {
            sender: { select: { id: true, fullName: true } }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Format drafts with participant info
    const formatted = drafts.map(draft => {
      let otherParticipant = null;
      if (draft.conversation) {
        otherParticipant = draft.conversation.participant1Id === userId 
          ? draft.conversation.participant2 
          : draft.conversation.participant1;
      }

      return {
        id: draft.id,
        content: draft.content,
        files: draft.files,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
        conversationId: draft.conversationId,
        recipient: otherParticipant,
        replyTo: draft.replyTo ? {
          id: draft.replyTo.id,
          content: draft.replyTo.content,
          sender: draft.replyTo.sender
        } : null
      };
    });

    res.json({
      success: true,
      count: formatted.length,
      drafts: formatted
    });

  } catch (err) {
    console.error("Get drafts error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Get single draft by ID
router.get('/:draftId', authenticateDM, async (req, res) => {
  try {
    const { draftId } = req.params;
    const userId = req.user.userId;

    const draft = await prisma.dMDraft.findFirst({
      where: {
        id: draftId,
        userId
      },
      include: {
        conversation: {
          include: {
            participant1: { select: { id: true, fullName: true, profileImage: true } },
            participant2: { select: { id: true, fullName: true, profileImage: true } }
          }
        },
        replyTo: {
          include: {
            sender: { select: { id: true, fullName: true } }
          }
        }
      }
    });

    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }

    // Get recipient info
    let recipient = null;
    if (draft.conversation) {
      recipient = draft.conversation.participant1Id === userId 
        ? draft.conversation.participant2 
        : draft.conversation.participant1;
    }

    res.json({
      success: true,
      draft: {
        id: draft.id,
        content: draft.content,
        files: draft.files,
        conversationId: draft.conversationId,
        recipient,
        replyTo: draft.replyTo,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt
      }
    });

  } catch (err) {
    console.error("Get draft error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT - Update a draft
router.put('/:draftId', authenticateDM, async (req, res) => {
  try {
    const { draftId } = req.params;
    const { content, files } = req.body;
    const userId = req.user.userId;

    const existingDraft = await prisma.dMDraft.findFirst({
      where: { id: draftId, userId }
    });

    if (!existingDraft) {
      return res.status(404).json({ error: "Draft not found" });
    }

    const updated = await prisma.dMDraft.update({
      where: { id: draftId },
      data: {
        content: content !== undefined ? content : existingDraft.content,
        files: files !== undefined ? files : existingDraft.files,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      draft: updated,
      message: "Draft updated"
    });

  } catch (err) {
    console.error("Update draft error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Delete a draft
router.delete('/:draftId', authenticateDM, async (req, res) => {
  try {
    const { draftId } = req.params;
    const userId = req.user.userId;

    const draft = await prisma.dMDraft.findFirst({
      where: { id: draftId, userId }
    });

    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }

    await prisma.dMDraft.delete({
      where: { id: draftId }
    });

    res.json({
      success: true,
      message: "Draft deleted successfully"
    });

  } catch (err) {
    console.error("Delete draft error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Send a draft as a message
router.post('/:draftId/send', authenticateDM, async (req, res) => {
  try {
    const { draftId } = req.params;
    const userId = req.user.userId;

    const draft = await prisma.dMDraft.findFirst({
      where: { id: draftId, userId },
      include: {
        conversation: true
      }
    });

    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }

    let conversationId = draft.conversationId;

    // If no conversation yet, create one
    if (!conversationId && draft.conversation === null) {
      // This draft was created without a conversation (just recipient)
      // We need to find or create conversation based on the draft's data
      return res.status(400).json({ 
        error: "Cannot send draft: missing recipient information. Please create a new message instead." 
      });
    }

    // Create the message
    const message = await prisma.directMessage.create({
      data: {
        content: draft.content || null,
        senderId: userId,
        conversationId: conversationId,
        replyToId: draft.replyToId || null
      },
      include: {
        sender: {
          select: { id: true, fullName: true, profileImage: true, role: true }
        },
        files: true
      }
    });

    // Update conversation last message
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });

    if (conversation) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessage: draft.content?.substring(0, 100) || "📎 File attached",
          lastMessageAt: new Date(),
          lastMessageBy: userId
        }
      });

      // Update unread count for recipient
      const isSenderParticipant1 = conversation.participant1Id === userId;
      const unreadField = isSenderParticipant1 ? 'unreadCount2' : 'unreadCount1';
      
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { [unreadField]: { increment: 1 } }
      });
    }

    // Link files to message if any
    if (draft.files && Array.isArray(draft.files) && draft.files.length > 0) {
      // Update file records to link to this message
      await prisma.directMessageFile.updateMany({
        where: {
          id: { in: draft.files.map(f => f.id) },
          userId
        },
        data: { messageId: message.id }
      });
    }

    // Delete the draft after sending
    await prisma.dMDraft.delete({
      where: { id: draftId }
    });

    // Notify via Socket.io
    const io = req.app.get('io');
    if (io && conversation) {
      const recipientId = conversation.participant1Id === userId 
        ? conversation.participant2Id 
        : conversation.participant1Id;
      
      io.to(recipientId).emit('new_dm_message', {
        ...message,
        conversationId
      });
      io.to(userId).emit('message_sent', message);
    }

    res.status(201).json({
      success: true,
      message: "Draft sent successfully",
      sentMessage: message
    });

  } catch (err) {
    console.error("Send draft error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;