const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

app.post('/api/initiate-payment', (req, res) => {
  const { amount, plan } = req.body;

  if (!amount || !plan) {
    return res.status(400).json({ error: 'Missing amount or plan' });
  }

  const payload = {
    iss: "EDUTEC",
    cuid: "9BA5008C-08EE-4286-A349-54AF91A621B0",
    auid: "23ADADC0-DA2D-4DAC-A128-4845A5D71293",
    amount: amount.toFixed(2),
    mref: `SUB_${plan}_${Date.now()}`,
    jti: Math.random().toString(36).substring(2),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 600
  };

  try {
    const token = jwt.sign(payload, process.env.ADUMO_SECRET_KEY);
    res.json({ token, merchantReference: payload.mref });
  } catch (err) {
    console.error('Token generation error:', err);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// Fallback to index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
