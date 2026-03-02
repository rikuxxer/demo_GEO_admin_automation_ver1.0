import { Router } from 'express';
import { getBqService } from '../bigquery-client';
import { wrapAsync } from '../middleware/async-wrapper';

const router = Router();

// ==================== ユーザー ====================

router.get('/', async (req, res) => {
  try {
    const users = await getBqService().getUsers();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/email/:email', async (req, res) => {
  try {
    const user = await getBqService().getUserByEmail(req.params.email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    await getBqService().createUser(req.body);
    res.status(201).json({ message: 'User created successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:user_id', async (req, res) => {
  try {
    await getBqService().updateUser(req.params.user_id, req.body);
    res.json({ message: 'User updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:user_id', async (req, res) => {
  try {
    await getBqService().deleteUser(req.params.user_id);
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
