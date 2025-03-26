const express = require('express');
const vision = require('@google-cloud/vision');
const dotenv = require('dotenv');
const cors = require('cors'); // Add cors package
const app = express();
const port = 3000;

// Load environment variables from .env file
dotenv.config();

// Initialize Vision API client
const visionClient = new vision.ImageAnnotatorClient();

// Use cors middleware to allow requests from your frontend
app.use(cors({
  origin: 'https://5173-idx-environ-1742316025738.cluster-mwrgkbggpvbq6tvtviraw2knqg.cloudworkstations.dev', // Allow your frontend origin
  methods: ['GET', 'POST', 'OPTIONS'], // Allow these methods
  allowedHeaders: ['Content-Type'], // Allow these headers
}));

// Middleware to parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Endpoint to classify waste using Vision API
app.post('/classify-waste', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Use Google Cloud Vision API for label detection
    const [visionResult] = await visionClient.labelDetection({
      image: { content: imageBase64 },
    });

    const labels = visionResult.labelAnnotations.map((label) => label.description.toLowerCase());
    res.json({ labels });
  } catch (error) {
    console.error('Vision API Error:', error);
    res.status(500).json({ error: error.message || 'Failed to classify image' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});