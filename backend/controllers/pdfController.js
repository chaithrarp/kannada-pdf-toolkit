const fs = require('fs');
const pdfUtils = require('../utils/pdfUtils');

const processFiles = async (req, res) => {
    try {
        const { tool, options } = req.body;
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'ಫೈಲ್‌ಗಳನ್ನು ಕಂಡುಹಿಡಿಯಲಾಗಲಿಲ್ಲ' });
        }

        if (!tool) {
            return res.status(400).json({ error: 'ಪರಿಕರವನ್ನು ನಿರ್ದಿಷ್ಟಪಡಿಸಲಾಗಿಲ್ಲ' });
        }

        let parsedOptions = {};
        try {
            parsedOptions = options ? JSON.parse(options) : {};
        } catch (e) {
            parsedOptions = {};
        }

        let result;
        let contentType = 'application/pdf';
        let filename = `processed_${tool}_${Date.now()}.pdf`;

        // 💡 Add the original filename for logging or further use
        const fileNames = files.map(f => f.originalname || 'unnamed.pdf');
        console.log('Uploaded files:', fileNames);

        switch (tool) {
            case 'merge':
                result = await pdfUtils.mergePDFs(files);
                break;
            case 'split':
                result = await pdfUtils.splitPDF(files[0], parsedOptions);
                break;
            case 'extract':
                result = await pdfUtils.extractPages(files[0], parsedOptions);
                break;
            case 'rotate':
                result = await pdfUtils.rotatePDF(files[0], parsedOptions);
                break;
            case 'crop':
                result = await pdfUtils.cropPDF(files[0], parsedOptions);
                break;
            case 'word-to-pdf':
                result = await pdfUtils.wordToPDF(files[0], parsedOptions);
                break;
            case 'pdf-to-word':
                result = await pdfUtils.pdfToWord(files[0], parsedOptions);
                contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                filename = `converted_${Date.now()}.docx`;
                break;
            case 'delete':
                result = await pdfUtils.deletePages(files[0], parsedOptions);
                break;
            default:
                return res.status(400).json({ error: 'ಅಮಾನ್ಯ ಪರಿಕರ' });
        }

        // ✅ Log result size for debugging
        const resultSize = result?.length || result?.byteLength || 0;
        console.log(`🔧 Result for tool "${tool}" - Size: ${resultSize} bytes`);

        // ✅ Save temp file for manual inspection
        const tempPath = `./temp_${tool}_${Date.now()}.pdf`;
        try {
            fs.writeFileSync(tempPath, result);
            console.log(`📝 Saved temporary result to: ${tempPath}`);
        } catch (writeErr) {
            console.error('❌ Error writing temp file:', writeErr);
        }

        if (tool === 'split') {
            const archiver = require('archiver');
            const archive = archiver('zip');

            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="split_pages_${Date.now()}.zip"`);

            archive.pipe(res);

            result.forEach((pdfBuffer, index) => {
                archive.append(pdfBuffer, { name: `page_${index + 1}.pdf` });
            });

            archive.finalize();
        } else {
            // ✅ Add content-length to avoid PDF rendering issues
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Length', resultSize); // 🔧 Important fix
            res.send(result);
        }

    } catch (error) {
        console.error('PDF processing error:', error);
        res.status(500).json({ error: error.message || 'ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿ ದೋಷ ಸಂಭವಿಸಿದೆ' });
    }
};

module.exports = {
    processFiles
};
