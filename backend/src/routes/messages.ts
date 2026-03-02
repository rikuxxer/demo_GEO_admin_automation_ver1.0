import { Router } from 'express';
import { getBqService } from '../bigquery-client';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const messages = await getBqService().getAllMessages();
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:project_id', async (req, res) => {
  try {
    const messages = await getBqService().getMessages(req.params.project_id);
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    await getBqService().createMessage(req.body);
    res.status(201).json({ message: 'Message created successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/mark-read', async (req, res) => {
  try {
    await getBqService().markMessagesAsRead(req.body.message_ids);
    res.json({ message: 'Messages marked as read' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
