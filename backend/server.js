const express = require('express');
const cors = require('cors');
const path = require('path');
const pdfRoutes = require('./routes/pdfRoutes');
const { handleUploadError } = require('./middleware/upload');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api', pdfRoutes);

// Handle multer upload errors
app.use(handleUploadError);

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    res.status(500).json({ 
        error: error.message || 'ಸರ್ವರ್ ದೋಷ ಸಂಭವಿಸಿದೆ' 
    });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ error: 'ಪುಟ ಕಂಡುಬಂದಿಲ್ಲ' });
});

app.listen(PORT, () => {
    console.log(`🚀 Kannada PDF Tools server running on port ${PORT}`);
    console.log(`📂 Frontend: http://localhost:${PORT}`);
    console.log(`🔧 API: http://localhost:${PORT}/api`);
});