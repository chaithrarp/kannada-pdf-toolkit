class PDFWorker {
    constructor() {
        this.pdfjsLib = null;
        this.PDFLib = null;
        this.initialized = false;
        this.init();
    }

    async init() {
        try {
            await this.loadLibraries();
            this.initialized = true;
            this.postMessage({ type: 'ready' });
        } catch (error) {
            this.postMessage({ type: 'error', message: 'ಲೈಬ್ರರಿಗಳನ್ನು ಲೋಡ್ ಮಾಡುವಲ್ಲಿ ದೋಷ', error: error.message });
        }
    }

    async loadLibraries() {
        if (typeof window !== 'undefined') {
            this.pdfjsLib = window.pdfjsLib;
            this.PDFLib = window.PDFLib;
        } else {
            importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js');
            importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js');
            this.PDFLib = PDFLib;
        }
    }

    postMessage(data) {
        if (typeof self !== 'undefined' && self.postMessage) {
            self.postMessage(data);
        } else if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('pdfWorkerMessage', { detail: data }));
        }
    }

    async processFiles(files, tool, options = {}) {
        if (!this.initialized) {
            throw new Error('Worker ಇನ್ನೂ ಸಿದ್ಧವಾಗಿಲ್ಲ');
        }

        try {
            switch (tool) {
                case 'merge':
                    return await this.mergePDFs(files, options);
                case 'split':
                    return await this.splitPDF(files[0], options);
                case 'compress':
                    return await this.compressPDF(files[0], options);
                case 'extract':
                    return await this.extractPages(files[0], options);
                case 'rotate':
                    return await this.rotatePDF(files[0], options);
                case 'delete':
                    return await this.deletePages(files[0], options);
                case 'encrypt':
                    return await this.encryptPDF(files[0], options);
                case 'decrypt':
                    return await this.decryptPDF(files[0], options);
                default:
                    throw new Error('ಅಜ್ಞಾತ ಉಪಕರಣ');
            }
        } catch (error) {
            this.postMessage({ type: 'error', message: error.message });
            throw error;
        }
    }

    async mergePDFs(files, options) {
        this.postMessage({ type: 'progress', message: 'PDF ಗಳನ್ನು ವಿಲೀನ ಮಾಡಲಾಗುತ್ತಿದೆ...', progress: 10 });
        
        const mergedPdf = await this.PDFLib.PDFDocument.create();
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const arrayBuffer = await this.fileToArrayBuffer(file);
            const pdf = await this.PDFLib.PDFDocument.load(arrayBuffer);
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            
            pages.forEach(page => mergedPdf.addPage(page));
            
            const progress = 10 + (i + 1) / files.length * 80;
            this.postMessage({ type: 'progress', progress, message: `${i + 1}/${files.length} ಫೈಲ್‌ಗಳು ಪ್ರಕ್ರಿಯೆಗೊಂಡಿವೆ` });
        }

        this.postMessage({ type: 'progress', message: 'ಫೈಲ್ ಅನ್ನು ಸೇವ್ ಮಾಡಲಾಗುತ್ತಿದೆ...', progress: 95 });
        const pdfBytes = await mergedPdf.save();
        
        return new Blob([pdfBytes], { type: 'application/pdf' });
    }

    async splitPDF(file, options) {
        this.postMessage({ type: 'progress', message: 'PDF ಅನ್ನು ವಿಭಜಿಸಲಾಗುತ್ತಿದೆ...', progress: 10 });
        
        const arrayBuffer = await this.fileToArrayBuffer(file);
        const pdf = await this.PDFLib.PDFDocument.load(arrayBuffer);
        const pageCount = pdf.getPageCount();
        
        if (options.splitType === 'pages') {
            const splitPDFs = [];
            
            for (let i = 0; i < pageCount; i++) {
                const newPdf = await this.PDFLib.PDFDocument.create();
                const [page] = await newPdf.copyPages(pdf, [i]);
                newPdf.addPage(page);
                
                const pdfBytes = await newPdf.save();
                splitPDFs.push(new Blob([pdfBytes], { type: 'application/pdf' }));
                
                const progress = 10 + (i + 1) / pageCount * 80;
                this.postMessage({ type: 'progress', progress, message: `${i + 1}/${pageCount} ಪುಟಗಳು ಪ್ರಕ್ರಿಯೆಗೊಂಡಿವೆ` });
            }
            
            return splitPDFs;
        } else if (options.splitType === 'range' && options.pageRange) {
            return await this.splitByRange(pdf, options.pageRange);
        }
        
        throw new Error('ಅಮಾನ್ಯ ವಿಭಜನೆ ಆಯ್ಕೆಗಳು');
    }

    async splitByRange(pdf, rangeString) {
        const ranges = this.parsePageRange(rangeString);
        const splitPDFs = [];
        
        for (let i = 0; i < ranges.length; i++) {
            const range = ranges[i];
            const newPdf = await this.PDFLib.PDFDocument.create();
            
            const pageIndices = [];
            for (let pageNum = range.start; pageNum <= range.end; pageNum++) {
                if (pageNum > 0 && pageNum <= pdf.getPageCount()) {
                    pageIndices.push(pageNum - 1);
                }
            }
            
            if (pageIndices.length > 0) {
                const pages = await newPdf.copyPages(pdf, pageIndices);
                pages.forEach(page => newPdf.addPage(page));
                
                const pdfBytes = await newPdf.save();
                splitPDFs.push(new Blob([pdfBytes], { type: 'application/pdf' }));
            }
            
            const progress = 10 + (i + 1) / ranges.length * 80;
            this.postMessage({ type: 'progress', progress, message: `${i + 1}/${ranges.length} ಶ್ರೇಣಿಗಳು ಪ್ರಕ್ರಿಯೆಗೊಂಡಿವೆ` });
        }
        
        return splitPDFs;
    }

    async compressPDF(file, options) {
        this.postMessage({ type: 'progress', message: 'PDF ಅನ್ನು ಸಂಕುಚಿತಗೊಳಿಸಲಾಗುತ್ತಿದೆ...', progress: 10 });
        
        const arrayBuffer = await this.fileToArrayBuffer(file);
        const pdf = await this.PDFLib.PDFDocument.load(arrayBuffer);
        
        const compressionLevel = options.compressionLevel || 'medium';
        const compressionOptions = this.getCompressionOptions(compressionLevel);
        
        this.postMessage({ type: 'progress', message: 'ಚಿತ್ರಗಳನ್ನು ಸಂಕುಚಿತಗೊಳಿಸಲಾಗುತ್ತಿದೆ...', progress: 50 });
        
        const pages = pdf.getPages();
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            await this.compressPageImages(page, compressionOptions);
            
            const progress = 50 + (i + 1) / pages.length * 40;
            this.postMessage({ type: 'progress', progress });
        }
        
        this.postMessage({ type: 'progress', message: 'ಫೈಲ್ ಅನ್ನು ಸೇವ್ ಮಾಡಲಾಗುತ್ತಿದೆ...', progress: 95 });
        const pdfBytes = await pdf.save(compressionOptions.saveOptions);
        
        return new Blob([pdfBytes], { type: 'application/pdf' });
    }

    async extractPages(file, options) {
        this.postMessage({ type: 'progress', message: 'ಪುಟಗಳನ್ನು ಹೊರತೆಗೆಯಲಾಗುತ್ತಿದೆ...', progress: 10 });
        
        const arrayBuffer = await this.fileToArrayBuffer(file);
        const pdf = await this.PDFLib.PDFDocument.load(arrayBuffer);
        
        const pageIndices = this.parsePageNumbers(options.pages, pdf.getPageCount());
        
        if (pageIndices.length === 0) {
            throw new Error('ಯಾವುದೇ ಮಾನ್ಯ ಪುಟ ಸಂಖ್ಯೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ');
        }
        
        const newPdf = await this.PDFLib.PDFDocument.create();
        const pages = await newPdf.copyPages(pdf, pageIndices);
        
        pages.forEach((page, index) => {
            newPdf.addPage(page);
            const progress = 10 + (index + 1) / pages.length * 80;
            this.postMessage({ type: 'progress', progress });
        });
        
        this.postMessage({ type: 'progress', message: 'ಫೈಲ್ ಅನ್ನು ಸೇವ್ ಮಾಡಲಾಗುತ್ತಿದೆ...', progress: 95 });
        const pdfBytes = await newPdf.save();
        
        return new Blob([pdfBytes], { type: 'application/pdf' });
    }

    async rotatePDF(file, options) {
        this.postMessage({ type: 'progress', message: 'ಪುಟಗಳನ್ನು ತಿರುಗಿಸಲಾಗುತ್ತಿದೆ...', progress: 10 });
        
        const arrayBuffer = await this.fileToArrayBuffer(file);
        const pdf = await this.PDFLib.PDFDocument.load(arrayBuffer);
        const pages = pdf.getPages();
        
        const angle = parseInt(options.angle) || 90;
        const rotation = this.PDFLib.degrees(angle);
        
        let pagesToRotate = [];
        if (options.pages === 'all') {
            pagesToRotate = pages.map((_, index) => index);
        } else if (options.pages === 'specific' && options.specificPages) {
            pagesToRotate = this.parsePageNumbers(options.specificPages, pages.length);
        }
        
        pagesToRotate.forEach((pageIndex, index) => {
            if (pageIndex < pages.length) {
                pages[pageIndex].setRotation(rotation);
            }
            const progress = 10 + (index + 1) / pagesToRotate.length * 80;
            this.postMessage({ type: 'progress', progress });
        });
        
        this.postMessage({ type: 'progress', message: 'ಫೈಲ್ ಅನ್ನು ಸೇವ್ ಮಾಡಲಾಗುತ್ತಿದೆ...', progress: 95 });
        const pdfBytes = await pdf.save();
        
        return new Blob([pdfBytes], { type: 'application/pdf' });
    }

    async deletePages(file, options) {
        this.postMessage({ type: 'progress', message: 'ಪುಟಗಳನ್ನು ಅಳಿಸಲಾಗುತ್ತಿದೆ...', progress: 10 });
        
        const arrayBuffer = await this.fileToArrayBuffer(file);
        const pdf = await this.PDFLib.PDFDocument.load(arrayBuffer);
        const totalPages = pdf.getPageCount();
        
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
        
        const newPdf = await this.PDFLib.PDFDocument.create();
        const pages = await newPdf.copyPages(pdf, pagesToKeep);
        
        pages.forEach((page, index) => {
            newPdf.addPage(page);
            const progress = 10 + (index + 1) / pages.length * 80;
            this.postMessage({ type: 'progress', progress });
        });
        
        this.postMessage({ type: 'progress', message: 'ಫೈಲ್ ಅನ್ನು ಸೇವ್ ಮಾಡಲಾಗುತ್ತಿದೆ...', progress: 95 });
        const pdfBytes = await newPdf.save();
        
        return new Blob([pdfBytes], { type: 'application/pdf' });
    }

    async encryptPDF(file, options) {
        this.postMessage({ type: 'progress', message: 'PDF ಅನ್ನು ಎನ್‌ಕ್ರಿಪ್ಟ್ ಮಾಡಲಾಗುತ್ತಿದೆ...', progress: 10 });
        
        const arrayBuffer = await this.fileToArrayBuffer(file);
        const pdf = await this.PDFLib.PDFDocument.load(arrayBuffer);
        
        const password = options.password || '';
        const permissions = options.permissions || {};
        
        this.postMessage({ type: 'progress', message: 'ಪಾಸ್‌ವರ್ಡ್ ಸೆಟ್ ಮಾಡಲಾಗುತ್ತಿದೆ...', progress: 70 });
        
        const pdfBytes = await pdf.save({
            userPassword: password,
            ownerPassword: options.ownerPassword || password,
            permissions: {
                printing: permissions.printing !== false,
                modifying: permissions.modifying !== false,
                copying: permissions.copying !== false,
                annotating: permissions.annotating !== false,
                fillingForms: permissions.fillingForms !== false,
                contentAccessibility: permissions.contentAccessibility !== false,
                documentAssembly: permissions.documentAssembly !== false
            }
        });
        
        return new Blob([pdfBytes], { type: 'application/pdf' });
    }

    async decryptPDF(file, options) {
        this.postMessage({ type: 'progress', message: 'PDF ಅನ್ನು ಡಿಕ್ರಿಪ್ಟ್ ಮಾಡಲಾಗುತ್ತಿದೆ...', progress: 10 });
        
        const arrayBuffer = await this.fileToArrayBuffer(file);
        const pdf = await this.PDFLib.PDFDocument.load(arrayBuffer, {
            password: options.password
        });
        
        this.postMessage({ type: 'progress', message: 'ಪಾಸ್‌ವರ್ಡ್ ತೆಗೆದುಹಾಕಲಾಗುತ್ತಿದೆ...', progress: 70 });
        
        const pdfBytes = await pdf.save();
        return new Blob([pdfBytes], { type: 'application/pdf' });
    }

    getCompressionOptions(level) {
        const options = {
            low: {
                saveOptions: { useObjectStreams: false },
                imageQuality: 0.9
            },
            medium: {
                saveOptions: { useObjectStreams: true },
                imageQuality: 0.7
            },
            high: {
                saveOptions: { useObjectStreams: true, compress: true },
                imageQuality: 0.5
            }
        };
        return options[level] || options.medium;
    }

    async compressPageImages(page, options) {
        try {
            const resources = page.node.Resources;
            if (!resources || !resources.XObject) return;
            
        } catch (error) {
            console.warn('ಚಿತ್ರ ಸಂಕೋಚನದಲ್ಲಿ ದೋಷ:', error);
        }
    }

    parsePageRange(rangeString) {
        const ranges = [];
        const parts = rangeString.split(',');
        
        parts.forEach(part => {
            part = part.trim();
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                if (!isNaN(start) && !isNaN(end) && start <= end) {
                    ranges.push({ start, end });
                }
            } else {
                const pageNum = parseInt(part);
                if (!isNaN(pageNum)) {
                    ranges.push({ start: pageNum, end: pageNum });
                }
            }
        });
        
        return ranges;
    }

    parsePageNumbers(pageString, totalPages) {
        if (!pageString) return [];
        
        const pageNumbers = [];
        const parts = pageString.split(',');
        
        parts.forEach(part => {
            part = part.trim();
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(n => parseInt(n.trim()));
                if (!isNaN(start) && !isNaN(end)) {
                    for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) {
                        pageNumbers.push(i - 1);
                    }
                }
            } else {
                const pageNum = parseInt(part);
                if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                    pageNumbers.push(pageNum - 1);
                }
            }
        });
        
        return [...new Set(pageNumbers)].sort((a, b) => a - b);
    }

    async fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    async getFileInfo(file) {
        try {
            const arrayBuffer = await this.fileToArrayBuffer(file);
            const pdf = await this.PDFLib.PDFDocument.load(arrayBuffer);
            
            return {
                pageCount: pdf.getPageCount(),
                title: pdf.getTitle() || '',
                author: pdf.getAuthor() || '',
                subject: pdf.getSubject() || '',
                creator: pdf.getCreator() || '',
                producer: pdf.getProducer() || '',
                creationDate: pdf.getCreationDate(),
                modificationDate: pdf.getModificationDate(),
                size: file.size,
                isEncrypted: false
            };
        } catch (error) {
            if (error.message.includes('password')) {
                return { isEncrypted: true, size: file.size };
            }
            throw error;
        }
    }

    async extractText(file, pageNumbers = []) {
        this.postMessage({ type: 'progress', message: 'ಪಠ್ಯವನ್ನು ಹೊರತೆಗೆಯಲಾಗುತ್ತಿದೆ...', progress: 10 });
        
        const arrayBuffer = await this.fileToArrayBuffer(file);
        
        if (this.pdfjsLib) {
            const pdf = await this.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const textContent = [];
            
            const pagesToExtract = pageNumbers.length > 0 ? pageNumbers : 
                Array.from({ length: pdf.numPages }, (_, i) => i + 1);
            
            for (let i = 0; i < pagesToExtract.length; i++) {
                const pageNum = pagesToExtract[i];
                if (pageNum > 0 && pageNum <= pdf.numPages) {
                    const page = await pdf.getPage(pageNum);
                    const textContentObj = await page.getTextContent();
                    const pageText = textContentObj.items.map(item => item.str).join(' ');
                    textContent.push(`ಪುಟ ${pageNum}:\n${pageText}\n\n`);
                }
                
                const progress = 10 + (i + 1) / pagesToExtract.length * 80;
                this.postMessage({ type: 'progress', progress });
            }
            
            return textContent.join('');
        }
        
        throw new Error('ಪಠ್ಯ ಹೊರತೆಗೆಯುವ ಲೈಬ್ರರಿ ಲೋಡ್ ಆಗಿಲ್ಲ');
    }
}

if (typeof self !== 'undefined' && self.importScripts) {
    const worker = new PDFWorker();
    
    self.onmessage = async function(e) {
        const { id, action, data } = e.data;
        
        try {
            let result;
            
            switch (action) {
                case 'process':
                    result = await worker.processFiles(data.files, data.tool, data.options);
                    break;
                case 'getInfo':
                    result = await worker.getFileInfo(data.file);
                    break;
                case 'extractText':
                    result = await worker.extractText(data.file, data.pageNumbers);
                    break;
                default:
                    throw new Error('ಅಜ್ಞಾತ ಕ್ರಿಯೆ');
            }
            
            self.postMessage({ id, type: 'success', result });
        } catch (error) {
            self.postMessage({ id, type: 'error', message: error.message });
        }
    };
} else if (typeof window !== 'undefined') {
    window.PDFWorker = PDFWorker;
}