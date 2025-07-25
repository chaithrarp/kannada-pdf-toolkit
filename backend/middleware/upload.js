const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory for processing

const fileFilter = (req, file, cb) => {
    // Check file types
    const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/msword' // .doc
    ];
    
    const allowedExtensions = ['.pdf', '.docx', '.doc'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error('ಅಮಾನ್ಯ ಫೈಲ್ ಪ್ರಕಾರ. ಕೇವಲ PDF, DOCX, ಮತ್ತು DOC ಫೈಲ್‌ಗಳು ಮಾತ್ರ ಅನುಮತಿಸಲಾಗಿದೆ.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 200 * 1024 * 1024, // 200MB limit
        files: 20 // Maximum 20 files at once
    }
});

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                error: 'ಫೈಲ್ ತುಂಬಾ ದೊಡ್ಡದಾಗಿದೆ. ಗರಿಷ್ಠ 200MB ಅನುಮತಿಸಲಾಗಿದೆ.' 
            });
        } else if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ 
                error: 'ತುಂಬಾ ಹೆಚ್ಚು ಫೈಲ್‌ಗಳು. ಗರಿಷ್ಠ 20 ಫೈಲ್‌ಗಳು ಅನುಮತಿಸಲಾಗಿದೆ.' 
            });
        } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ 
                error: 'ಅನಿರೀಕ್ಷಿತ ಫೈಲ್ ಫೀಲ್ಡ್.' 
            });
        }
    }
    
    return res.status(400).json({ 
        error: error.message || 'ಫೈಲ್ ಅಪ್‌ಲೋಡ್ ದೋಷ' 
    });
};

module.exports = upload;
module.exports.handleUploadError = handleUploadError;