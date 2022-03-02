import express from 'express';
import scores, { blockNumByNetwork, deleteScore } from './scores';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(blockNumByNetwork);
});

router.post('/scores', async (req, res) => {
  const { params } = req.body;
  const { space = '', network, snapshot = 'latest', strategies, addresses } = params;

  let result;
  try {
    result = await scores(
      {},
      {
        space,
        network,
        snapshot,
        strategies,
        addresses
      }
    );
  } catch (e) {
    console.log('Get scores failed', space, e);
    return res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: 500,
        data: e
      }
    });
  }

  return res.json({
    jsonrpc: '2.0',
    result
  });
});

router.post('/deleteScore', async (req, res) => {
  const { params } = req.body;
  const { key } = params;
  let result
  try {
    result = await deleteScore(key)
    return res.send(result)
  } catch (error) {
    return res.send(error)
  }
})

export default router;
