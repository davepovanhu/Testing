const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static HTML
app.use(express.static(path.join(__dirname)));

/**
 * Fetch USD→ZAR rate with fallback
 */
async function getUSDToZARRate() {
  try {
    // Primary API
    let res = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=ZAR', { timeout: 5000 });
    if (!res.ok) throw new Error(`Primary API error: ${res.status}`);
    let data = await res.json();
    if (data && data.rates && data.rates.ZAR) return data.rates.ZAR;
    throw new Error('Primary API missing ZAR rate');
  } catch (err) {
    console.warn('Primary API failed, trying fallback...', err.message);
    try {
      // Fallback API
      let res = await fetch('https://open.er-api.com/v6/latest/USD', { timeout: 5000 });
      if (!res.ok) throw new Error(`Fallback API error: ${res.status}`);
      let data = await res.json();
      if (data && data.rates && data.rates.ZAR) return data.rates.ZAR;
      throw new Error('Fallback API missing ZAR rate');
    } catch (err2) {
      console.error('Both APIs failed:', err2.message);
      throw new Error('Currency conversion failed');
    }
  }
}

// Payment initiation endpoint
app.post('/api/initiate-payment', async (req, res) => {
  const { amount, plan } = req.body;

  if (!amount || !plan) {
    return res.status(400).json({ error: 'Missing amount or plan' });
  }

  try {
    const usdToZar = await getUSDToZARRate();
    const amountZAR = (amount * usdToZar).toFixed(2);

    const payload = {
      iss: "EDUTEC",
      cuid: "9BA5008C-08EE-4286-A349-54AF91A621B0",
      auid: "23ADADC0-DA2D-4DAC-A128-4845A5D71293",
      amount: amountZAR,
      mref: `SUB_${plan}_${Date.now()}`,
      jti: Math.random().toString(36).substring(2),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 600
    };

    const token = jwt.sign(payload, process.env.ADUMO_SECRET_KEY);
    res.json({ token, merchantReference: payload.mref, amountZAR });
  } catch (err) {
    console.error('Error initiating payment:', err.message);
    res.status(500).json({ error: 'Failed to convert currency or generate token' });
  }
});

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
