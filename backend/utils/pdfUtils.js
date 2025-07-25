const fs = require('fs').promises;
const path = require('path');
const PDFDocument = require('pdfkit');
const { PDFDocument: PDFLib, rgb } = require('pdf-lib');
const libre = require('libreoffice-convert');
const mammoth = require('mammoth');

class PDFUtils {
    // Merge multiple PDFs into one
    static async mergePDFs(files) {
        try {
            if (!files || files.length === 0) {
                throw new Error('ವಿಲೀನಗೊಳಿಸಲು ಯಾವುದೇ ಫೈಲ್‌ಗಳು ಕಂಡುಬಂದಿಲ್ಲ');
            }

            const mergedPdf = await PDFLib.create();

            for (const file of files) {
                const pdfBytes = file.buffer;
                const pdf = await PDFLib.load(pdfBytes);
                const pageIndices = pdf.getPageIndices();
                
                const pages = await mergedPdf.copyPages(pdf, pageIndices);
                pages.forEach((page) => mergedPdf.addPage(page));
            }

            const mergedPdfBytes = await mergedPdf.save();
            return Buffer.from(mergedPdfBytes);
        } catch (error) {
            console.error('Merge error:', error);
            throw new Error(`PDF ವಿಲೀನದಲ್ಲಿ ದೋಷ: ${error.message}`);
        }
    }

    // Split PDF into separate pages or ranges
    static async splitPDF(file, options = {}) {
        try {
            const pdfBytes = file.buffer;
            const pdf = await PDFLib.load(pdfBytes);
            const totalPages = pdf.getPageCount();
            const results = [];

            if (options.splitType === 'range' && options.pageRange) {
                // Parse page ranges like "1-5, 8, 10-15"
                const ranges = this.parsePageRanges(options.pageRange, totalPages);
                
                for (let i = 0; i < ranges.length; i++) {
                    const newPdf = await PDFLib.create();
                    const pages = await newPdf.copyPages(pdf, ranges[i]);
                    pages.forEach((page) => newPdf.addPage(page));
                    
                    const pdfBytes = await newPdf.save();
                    results.push(Buffer.from(pdfBytes));
                }
            } else {
                // Split into individual pages
                for (let i = 0; i < totalPages; i++) {
                    const newPdf = await PDFLib.create();
                    const [page] = await newPdf.copyPages(pdf, [i]);
                    newPdf.addPage(page);
                    
                    const pdfBytes = await newPdf.save();
                    results.push(Buffer.from(pdfBytes));
                }
            }

            return results;
        } catch (error) {
            console.error('Split error:', error);
            throw new Error(`PDF ವಿಭಜನೆಯಲ್ಲಿ ದೋಷ: ${error.message}`);
        }
    }

    // Extract specific pages
    static async extractPages(file, options = {}) {
        try {
            const pdfBytes = file.buffer;
            const pdf = await PDFLib.load(pdfBytes);
            const totalPages = pdf.getPageCount();
            
            if (!options.pages) {
                throw new Error('ಹೊರತೆಗೆಯಬೇಕಾದ ಪುಟಗಳನ್ನು ನಿರ್ದಿಷ್ಟಪಡಿಸಿ');
            }

            const pageNumbers = this.parsePageNumbers(options.pages, totalPages);
            const newPdf = await PDFLib.create();
            const pages = await newPdf.copyPages(pdf, pageNumbers);
            pages.forEach((page) => newPdf.addPage(page));

            const extractedPdfBytes = await newPdf.save();
            return Buffer.from(extractedPdfBytes);
        } catch (error) {
            console.error('Extract error:', error);
            throw new Error(`ಪುಟ ಹೊರತೆಗೆಯುವಿಕೆಯಲ್ಲಿ ದೋಷ: ${error.message}`);
        }
    }

    // Rotate PDF pages
    static async rotatePDF(file, options = {}) {
        try {
            const pdfBytes = file.buffer;
            const pdf = await PDFLib.load(pdfBytes);
            const pages = pdf.getPages();
            const angle = parseInt(options.angle) || 90;
            const rotation = this.getRotationDegrees(angle);

            if (options.pages === 'all') {
                pages.forEach(page => {
                    page.setRotation(rotation);
                });
            } else if (options.pages === 'specific' && options.specificPages) {
                const pageNumbers = this.parsePageNumbers(options.specificPages, pages.length);
                pageNumbers.forEach(pageIndex => {
                    if (pages[pageIndex]) {
                        pages[pageIndex].setRotation(rotation);
                    }
                });
            }

            const rotatedPdfBytes = await pdf.save();
            return Buffer.from(rotatedPdfBytes);
        } catch (error) {
            console.error('Rotate error:', error);
            throw new Error(`PDF ತಿರುಗಿಸುವಿಕೆಯಲ್ಲಿ ದೋಷ: ${error.message}`);
        }
    }

    // Crop PDF pages
    static async cropPDF(file, options = {}) {
        try {
            const pdfBytes = file.buffer;
            const pdf = await PDFLib.load(pdfBytes);
            const pages = pdf.getPages();
            const margin = parseInt(options.margin) || 20;

            pages.forEach(page => {
                const { width, height } = page.getSize();
                
                // Create crop box with margins
                page.setCropBox(
                    margin,                    // x
                    margin,                    // y
                    width - (margin * 2),      // width
                    height - (margin * 2)      // height
                );
            });

            const croppedPdfBytes = await pdf.save();
            return Buffer.from(croppedPdfBytes);
        } catch (error) {
            console.error('Crop error:', error);
            throw new Error(`PDF ಕ್ರಾಪ್ ಮಾಡುವಿಕೆಯಲ್ಲಿ ದೋಷ: ${error.message}`);
        }
    }

    // Convert Word to PDF
    static async wordToPDF(file, options = {}) {
        try {
            const docxBuffer = file.buffer;
            
            // Convert DOCX to PDF using libreoffice-convert
            return new Promise((resolve, reject) => {
                libre.convert(docxBuffer, '.pdf', undefined, (err, done) => {
                    if (err) {
                        reject(new Error(`Word ನಿಂದ PDF ಪರಿವರ್ತನೆಯಲ್ಲಿ ದೋಷ: ${err.message}`));
                    } else {
                        resolve(done);
                    }
                });
            });
        } catch (error) {
            console.error('Word to PDF error:', error);
            throw new Error(`Word ನಿಂದ PDF ಪರಿವರ್ತನೆಯಲ್ಲಿ ದೋಷ: ${error.message}`);
        }
    }

    // Convert PDF to Word
    static async pdfToWord(file, options = {}) {
        try {
            // Note: This is a basic implementation
            // For better results, consider using commercial services like Adobe API
            throw new Error('PDF ನಿಂದ Word ಪರಿವರ್ತನೆ ಪ್ರಸ್ತುತ ಲಭ್ಯವಿಲ್ಲ. ಇದು ಸಂಕೀರ್ಣ ಕಾರ್ಯವಾಗಿದೆ.');
        } catch (error) {
            console.error('PDF to Word error:', error);
            throw new Error(`PDF ನಿಂದ Word ಪರಿವರ್ತನೆಯಲ್ಲಿ ದೋಷ: ${error.message}`);
        }
    }

    // Delete specific pages
    static async deletePages(file, options = {}) {
        try {
            const pdfBytes = file.buffer;
            const pdf = await PDFLib.load(pdfBytes);
            const totalPages = pdf.getPageCount();
            
            if (!options.pages) {
                throw new Error('ಅಳಿಸಬೇಕಾದ ಪುಟಗಳನ್ನು ನಿರ್ದಿಷ್ಟಪಡಿಸಿ');
            }

            const pagesToDelete = this.parsePageNumbers(options.pages, totalPages);
            const pagesToKeep = [];
            
            for (let i = 0; i < totalPages; i++) {
                if (!pagesToDelete.includes(i)) {
                    pagesToKeep.push(i);
                }
            }

            if (pagesToKeep.length === 0) {
                throw new Error('ಎಲ್ಲಾ ಪುಟಗಳನ್ನು ಅಳಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ');
            }

            const newPdf = await PDFLib.create();
            const pages = await newPdf.copyPages(pdf, pagesToKeep);
            pages.forEach((page) => newPdf.addPage(page));

            const resultPdfBytes = await newPdf.save();
            return Buffer.from(resultPdfBytes);
        } catch (error) {
            console.error('Delete pages error:', error);
            throw new Error(`ಪುಟ ಅಳಿಸುವಿಕೆಯಲ್ಲಿ ದೋಷ: ${error.message}`);
        }
    }

    // Helper method to parse page numbers
    static parsePageNumbers(pageString, totalPages) {
        const pages = [];
        const ranges = pageString.split(',').map(s => s.trim());
        
        ranges.forEach(range => {
            if (range.includes('-')) {
                const [start, end] = range.split('-').map(n => parseInt(n.trim()));
                for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
                    pages.push(i - 1); // Convert to 0-based index
                }
            } else {
                const pageNum = parseInt(range);
                if (pageNum >= 1 && pageNum <= totalPages) {
                    pages.push(pageNum - 1); // Convert to 0-based index
                }
            }
        });
        
        return [...new Set(pages)].sort((a, b) => a - b); // Remove duplicates and sort
    }

    // Helper method to parse page ranges for splitting
    static parsePageRanges(rangeString, totalPages) {
        const ranges = [];
        const parts = rangeString.split(',').map(s => s.trim());
        
        parts.forEach(part => {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                const pageRange = [];
                for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
                    pageRange.push(i - 1); // Convert to 0-based index
                }
                if (pageRange.length > 0) {
                    ranges.push(pageRange);
                }
            } else {
                const pageNum = parseInt(part);
                if (pageNum >= 1 && pageNum <= totalPages) {
                    ranges.push([pageNum - 1]); // Convert to 0-based index
                }
            }
        });
        
        return ranges;
    }

    // Helper method to convert angle to PDF-lib rotation
    static getRotationDegrees(angle) {
        const rotations = {
            90: { type: 'degrees', angle: 90 },
            180: { type: 'degrees', angle: 180 },
            270: { type: 'degrees', angle: 270 }
        };
        return rotations[angle] || rotations[90];
    }
}

module.exports = {
    mergePDFs: PDFUtils.mergePDFs.bind(PDFUtils),
    splitPDF: PDFUtils.splitPDF.bind(PDFUtils),
    extractPages: PDFUtils.extractPages.bind(PDFUtils),
    rotatePDF: PDFUtils.rotatePDF.bind(PDFUtils),
    cropPDF: PDFUtils.cropPDF.bind(PDFUtils),
    wordToPDF: PDFUtils.wordToPDF.bind(PDFUtils),
    pdfToWord: PDFUtils.pdfToWord.bind(PDFUtils),
    deletePages: PDFUtils.deletePages.bind(PDFUtils)
};