class KannadaPDFTools {
    constructor() {
        this.files = [];
        this.currentTool = null;
        this.processedFiles = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupToolCards();
        this.setupModal();
        this.animateCards();
    }

    animateCards() {
        const cards = document.querySelectorAll('.tool-card');
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
            card.classList.add('animate-in');
        });
    }

    setupEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        
        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', () => fileInput.click());
            
            // FIXED: Only one file change listener
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
            
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            });
            
            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                this.handleFileSelect(e);
            });
        }
    }

    // REMOVED: Duplicate setupFileUpload method that was causing double event listeners

    setupToolCards() {
        const toolCards = document.querySelectorAll('.tool-card');
        toolCards.forEach(card => {
            card.addEventListener('click', () => {
                if (card.classList.contains('disabled')) {
                    this.showNotification('ಮೊದಲು ಫೈಲ್‌ಗಳನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ', 'warning');
                    return;
                }
                const tool = card.dataset.tool;
                this.openToolModal(tool);
            });
            
            card.addEventListener('mouseenter', () => {
                if (!card.classList.contains('disabled')) {
                    card.style.transform = 'translateY(-10px) scale(1.05)';
                }
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0) scale(1)';
            });
        });
    }

    setupModal() {
        const modal = document.getElementById('toolModal');
        const closeBtn = document.querySelector('.close');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }
        
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    handleFileSelect(e) {
        const files = e.target.files || e.dataTransfer.files;
        if (files) {
            // FIXED: Check for duplicates before adding
            Array.from(files).forEach(file => {
                if (this.isValidFile(file) && !this.isDuplicateFile(file)) {
                    this.files.push(file);
                }
            });
            this.updateUploadArea();
            this.updateToolCards();
        }
    }

    // NEW: Method to check for duplicate files
    isDuplicateFile(newFile) {
        return this.files.some(existingFile => 
            existingFile.name === newFile.name && 
            existingFile.size === newFile.size &&
            existingFile.lastModified === newFile.lastModified
        );
    }

    isValidFile(file) {
        const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
        const validExtensions = ['.pdf', '.docx', '.doc'];
        
        // IMPROVED: Better file size validation with user-friendly message
        const maxSize = 200 * 1024 * 1024; // 200MB
        if (file.size > maxSize) {
            this.showNotification(`ಫೈಲ್ "${file.name}" ತುಂಬಾ ದೊಡ್ಡದಾಗಿದೆ. ಗರಿಷ್ಠ 200MB ಅನುಮತಿಸಲಾಗಿದೆ.`, 'error');
            return false;
        }
        
        return validTypes.includes(file.type) || validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    }

    updateUploadArea() {
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea && this.files.length > 0) {
            uploadArea.innerHTML = `
                <i class="fas fa-check-circle upload-icon success" style="color: #28a745;"></i>
                <h3>${this.files.length} ಫೈಲ್(ಗಳು) ಅಪ್‌ಲೋಡ್ ಆಗಿದೆ</h3>
                <div class="file-list" style="margin: 20px 0;">
                    ${this.files.map(file => `<span class="file-tag" style="display: inline-block; background: var(--primary-gold); color: var(--dark-brown); padding: 5px 10px; margin: 5px; border-radius: 15px; font-size: 0.9rem;">${file.name}</span>`).join('')}
                </div>
                <button class="btn secondary" onclick="pdfTools.clearFiles()" style="background: #dc3545; color: white;">ಕ್ಲಿಯರ್ ಮಾಡಿ</button>
                <input type="file" id="fileInput" multiple accept=".pdf,.docx,.doc" hidden>
            `;
            // FIXED: Re-setup event listeners after DOM update
            this.setupFileInputListener();
        }
    }

    // NEW: Separate method to setup file input listener
    setupFileInputListener() {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
    }

    updateToolCards() {
        const toolCards = document.querySelectorAll('.tool-card');
        toolCards.forEach(card => {
            if (this.files.length > 0) {
                card.classList.remove('disabled');
                card.style.opacity = '1';
                card.style.pointerEvents = 'auto';
            } else {
                card.classList.add('disabled');
                card.style.opacity = '0.5';
                card.style.pointerEvents = 'none';
            }
        });
    }

    clearFiles() {
        this.files = [];
        this.processedFiles = [];
        const uploadArea = document.getElementById('uploadArea');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <i class="fas fa-cloud-upload-alt upload-icon"></i>
                <p>PDF ಫೈಲ್‌ಗಳನ್ನು ಇಲ್ಲಿ ಎಳೆದು ಬಿಡಿ ಅಥವಾ ಕ್ಲಿಕ್ ಮಾಡಿ</p>
                <input type="file" id="fileInput" multiple accept=".pdf,.docx,.doc" hidden>
            `;
            this.setupFileInputListener();
            this.updateToolCards();
        }
    }

    openToolModal(tool) {
        const modal = document.getElementById('toolModal');
        const modalBody = document.getElementById('modalBody');
        
        if (modal && modalBody) {
            this.currentTool = tool;
            modalBody.innerHTML = this.getToolHTML(tool);
            modal.style.display = 'block';
            modal.classList.add('show');
            
            setTimeout(() => {
                this.setupToolEventListeners(tool);
            }, 100);
        }
    }

    closeModal() {
        const modal = document.getElementById('toolModal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }

    getToolHTML(tool) {
        const toolConfigs = {
            merge: {
                title: 'PDF ವಿಲೀನ',
                content: `
                    <div class="tool-content">
                        <h3><i class="fas fa-object-group"></i> PDF ಫೈಲ್‌ಗಳನ್ನು ವಿಲೀನ ಮಾಡಿ</h3>
                        <p>ಬಹು PDF ಫೈಲ್‌ಗಳನ್ನು ಒಂದೇ ಫೈಲ್‌ನಲ್ಲಿ ಸಂಯೋಜಿಸಿ</p>
                        <div class="file-order">
                            <h4>ಫೈಲ್ ಕ್ರಮ:</h4>
                            <div id="fileOrder" class="sortable-list"></div>
                        </div>
                        <button class="btn primary" onclick="pdfTools.processTool('merge')">
                            <i class="fas fa-magic"></i> ವಿಲೀನ ಮಾಡಿ
                        </button>
                    </div>
                `
            },
            split: {
                title: 'PDF ವಿಭಜನೆ',
                content: `
                    <div class="tool-content">
                        <h3><i class="fas fa-cut"></i> PDF ಅನ್ನು ವಿಭಜಿಸಿ</h3>
                        <p>PDF ಅನ್ನು ಪ್ರತ್ಯೇಕ ಪುಟಗಳಾಗಿ ಅಥವಾ ನಿರ್ದಿಷ್ಟ ಶ್ರೇಣಿಗಳಾಗಿ ವಿಭಜಿಸಿ</p>
                        <div class="split-options">
                            <label><input type="radio" name="splitType" value="pages" checked> ಪ್ರತಿ ಪುಟ</label>
                            <label><input type="radio" name="splitType" value="range"> ಪುಟ ಶ್ರೇಣಿ</label>
                        </div>
                        <div id="rangeInput" class="range-input" style="display:none;">
                            <input type="text" placeholder="ಉದಾಹರಣೆ: 1-5, 8, 10-15" id="pageRange">
                        </div>
                        <button class="btn primary" onclick="pdfTools.processTool('split')">
                            <i class="fas fa-scissors"></i> ವಿಭಜಿಸಿ
                        </button>
                    </div>
                `
            },
            extract: {
                title: 'ಪುಟಗಳನ್ನು ಹೊರತೆಗೆಯಿರಿ',
                content: `
                    <div class="tool-content">
                        <h3><i class="fas fa-file-export"></i> ಪುಟಗಳನ್ನು ಹೊರತೆಗೆಯಿರಿ</h3>
                        <p>ನಿರ್ದಿಷ್ಟ ಪುಟಗಳನ್ನು ಹೊಸ PDF ಆಗಿ ಹೊರತೆಗೆಯಿರಿ</p>
                        <div class="form-group">
                            <label>ಪುಟ ಸಂಖ್ಯೆಗಳು:</label>
                            <input type="text" id="extractPages" placeholder="ಉದಾಹರಣೆ: 1,3,5-8,10">
                        </div>
                        <button class="btn primary" onclick="pdfTools.processTool('extract')">
                            <i class="fas fa-download"></i> ಹೊರತೆಗೆಯಿರಿ
                        </button>
                    </div>
                `
            },
            rotate: {
                title: 'PDF ತಿರುಗಿಸಿ',
                content: `
                    <div class="tool-content">
                        <h3><i class="fas fa-redo"></i> PDF ಪುಟಗಳನ್ನು ತಿರುಗಿಸಿ</h3>
                        <p>ಪುಟಗಳನ್ನು 90°, 180°, ಅಥವಾ 270° ತಿರುಗಿಸಿ</p>
                        <div class="rotate-options" style="margin: 20px 0;">
                            <button class="rotate-btn btn" data-angle="90" style="margin: 5px;"><i class="fas fa-undo"></i> 90°</button>
                            <button class="rotate-btn btn" data-angle="180" style="margin: 5px;"><i class="fas fa-sync"></i> 180°</button>
                            <button class="rotate-btn btn" data-angle="270" style="margin: 5px;"><i class="fas fa-redo"></i> 270°</button>
                        </div>
                        <div class="page-selection">
                            <label><input type="radio" name="rotatePages" value="all" checked> ಎಲ್ಲಾ ಪುಟಗಳು</label>
                            <label><input type="radio" name="rotatePages" value="specific"> ನಿರ್ದಿಷ್ಟ ಪುಟಗಳು</label>
                        </div>
                        <div id="specificPages" class="form-group" style="display:none;">
                            <input type="text" placeholder="ಪುಟ ಸಂಖ್ಯೆಗಳು" id="rotatePagesInput">
                        </div>
                        <button class="btn primary" onclick="pdfTools.processTool('rotate')">
                            <i class="fas fa-sync-alt"></i> ತಿರುಗಿಸಿ
                        </button>
                    </div>
                `
            },
            crop: {
                title: 'PDF ಕ್ರಾಪ್',
                content: `
                    <div class="tool-content">
                        <h3><i class="fas fa-crop"></i> PDF ಪುಟಗಳನ್ನು ಕ್ರಾಪ್ ಮಾಡಿ</h3>
                        <p>PDF ಪುಟಗಳ ಅನಗತ್ಯ ಭಾಗಗಳನ್ನು ತೆಗೆದುಹಾಕಿ</p>
                        <div class="form-group">
                            <label>ಕ್ರಾಪ್ ಮಾರ್ಜಿನ್ (ಪಿಕ್ಸೆಲ್‌ಗಳು):</label>
                            <input type="number" id="cropMargin" placeholder="20" value="20">
                        </div>
                        <button class="btn primary" onclick="pdfTools.processTool('crop')">
                            <i class="fas fa-crop"></i> ಕ್ರಾಪ್ ಮಾಡಿ
                        </button>
                    </div>
                `
            },
            'word-to-pdf': {
                title: 'Word ನಿಂದ PDF',
                content: `
                    <div class="tool-content">
                        <h3><i class="fas fa-file-word"></i> Word ಅನ್ನು PDF ಆಗಿ ಮಾರ್ಪಡಿಸಿ</h3>
                        <p>DOCX/DOC ಫೈಲ್‌ಗಳನ್ನು PDF ಆಗಿ ಪರಿವರ್ತಿಸಿ</p>
                        <div class="form-group">
                            <label>ಗುಣಮಟ್ಟ:</label>
                            <select id="pdfQuality" class="form-control">
                                <option value="high" selected>ಉತ್ತಮ</option>
                                <option value="medium">ಮಧ್ಯಮ</option>
                                <option value="low">ಕಡಿಮೆ</option>
                            </select>
                        </div>
                        <button class="btn primary" onclick="pdfTools.processTool('word-to-pdf')">
                            <i class="fas fa-exchange-alt"></i> ಪರಿವರ್ತಿಸಿ
                        </button>
                    </div>
                `
            },
            'pdf-to-word': {
                title: 'PDF ನಿಂದ Word',
                content: `
                    <div class="tool-content">
                        <h3><i class="fas fa-file-pdf"></i> PDF ಅನ್ನು Word ಆಗಿ ಮಾರ್ಪಡಿಸಿ</h3>
                        <p>PDF ಫೈಲ್‌ಗಳನ್ನು ಎಡಿಟ್ ಮಾಡಬಹುದಾದ Word ಡಾಕ್ಯುಮೆಂಟ್‌ಆಗಿ ಮಾರ್ಪಡಿಸಿ</p>
                        <div class="conversion-options">
                            <label><input type="checkbox" id="preserveLayout" checked> ಲೇಔಟ್ ಉಳಿಸಿ</label><br>
                            <label><input type="checkbox" id="extractImages" checked> ಚಿತ್ರಗಳನ್ನು ಒಳಗೊಂಡಿರಿ</label>
                        </div>
                        <button class="btn primary" onclick="pdfTools.processTool('pdf-to-word')">
                            <i class="fas fa-exchange-alt"></i> ಪರಿವರ್ತಿಸಿ
                        </button>
                    </div>
                `
            },
            delete: {
                title: 'ಪುಟಗಳನ್ನು ಅಳಿಸಿ',
                content: `
                    <div class="tool-content">
                        <h3><i class="fas fa-trash"></i> ಪುಟಗಳನ್ನು ಅಳಿಸಿ</h3>
                        <p>PDF ನಿಂದ ಅನಗತ್ಯ ಪುಟಗಳನ್ನು ತೆಗೆದುಹಾಕಿ</p>
                        <div class="form-group">
                            <label>ಅಳಿಸಬೇಕಾದ ಪುಟಗಳು:</label>
                            <input type="text" id="deletePages" placeholder="ಉದಾಹರಣೆ: 2,4,6-8">
                        </div>
                        <button class="btn danger" onclick="pdfTools.processTool('delete')" style="background: #dc3545;">
                            <i class="fas fa-trash-alt"></i> ಅಳಿಸಿ
                        </button>
                    </div>
                `
            }
        };

        const config = toolConfigs[tool];
        return `
            <div class="modal-header">
                <h2>${config.title}</h2>
            </div>
            ${config.content}
        `;
    }

    setupToolEventListeners(tool) {
        if (tool === 'merge') {
            this.setupFileOrder();
        } else if (tool === 'split') {
            this.setupSplitOptions();
        } else if (tool === 'rotate') {
            this.setupRotateOptions();
        }
    }

    setupFileOrder() {
        const fileOrder = document.getElementById('fileOrder');
        if (fileOrder) {
            fileOrder.innerHTML = this.files.map((file, index) => `
                <div class="file-item" data-index="${index}" style="display: flex; align-items: center; padding: 10px; margin: 5px 0; background: rgba(212, 175, 55, 0.1); border-radius: 8px;">
                    <i class="fas fa-grip-vertical" style="margin-right: 10px; color: var(--primary-gold);"></i>
                    <span>${file.name}</span>
                </div>
            `).join('');
        }
    }

    setupSplitOptions() {
        const radioButtons = document.querySelectorAll('input[name="splitType"]');
        const rangeInput = document.getElementById('rangeInput');
        
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (rangeInput) {
                    if (e.target.value === 'range') {
                        rangeInput.style.display = 'block';
                    } else {
                        rangeInput.style.display = 'none';
                    }
                }
            });
        });
    }

    setupRotateOptions() {
        const rotateButtons = document.querySelectorAll('.rotate-btn');
        const radioButtons = document.querySelectorAll('input[name="rotatePages"]');
        const specificPages = document.getElementById('specificPages');
        
        rotateButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                rotateButtons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
        
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (specificPages) {
                    if (e.target.value === 'specific') {
                        specificPages.style.display = 'block';
                    } else {
                        specificPages.style.display = 'none';
                    }
                }
            });
        });
    }

    async processTool(tool) {
        if (this.files.length === 0) {
            this.showNotification('ಫೈಲ್‌ಗಳನ್ನು ಮೊದಲು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ', 'error');
            return;
        }

        this.showLoader(true);
        
        try {
            const formData = new FormData();
            this.files.forEach(file => formData.append('files', file));
            formData.append('tool', tool);
            formData.append('options', JSON.stringify(this.getToolOptions(tool)));

            const response = await fetch('/api/pdf/process', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿ ದೋಷ ಸಂಭವಿಸಿದೆ');
            }

            const blob = await response.blob();
            this.downloadFile(blob, `processed_${tool}_${Date.now()}.${tool === 'pdf-to-word' ? 'docx' : 'pdf'}`);
            this.showNotification('ಫೈಲ್ ಯಶಸ್ವಿಯಾಗಿ ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲಾಗಿದೆ', 'success');
            this.closeModal();
        } catch (error) {
            console.error('Error:', error);
            this.showNotification(error.message || 'ದೋಷ ಸಂಭವಿಸಿದೆ', 'error');
        } finally {
            this.showLoader(false);
        }
    }

    getToolOptions(tool) {
        const options = {};
        
        switch (tool) {
            case 'split':
                const splitType = document.querySelector('input[name="splitType"]:checked');
                options.splitType = splitType ? splitType.value : 'pages';
                if (options.splitType === 'range') {
                    const pageRange = document.getElementById('pageRange');
                    options.pageRange = pageRange ? pageRange.value : '';
                }
                break;
            case 'extract':
                const extractPages = document.getElementById('extractPages');
                options.pages = extractPages ? extractPages.value : '';
                break;
            case 'rotate':
                const selectedAngle = document.querySelector('.rotate-btn.selected');
                options.angle = selectedAngle ? selectedAngle.dataset.angle : '90';
                const rotatePages = document.querySelector('input[name="rotatePages"]:checked');
                options.pages = rotatePages ? rotatePages.value : 'all';
                if (options.pages === 'specific') {
                    const specificPages = document.getElementById('rotatePagesInput');
                    options.specificPages = specificPages ? specificPages.value : '';
                }
                break;
            case 'crop':
                const cropMargin = document.getElementById('cropMargin');
                options.margin = cropMargin ? cropMargin.value : '20';
                break;
            case 'word-to-pdf':
                const pdfQuality = document.getElementById('pdfQuality');
                options.quality = pdfQuality ? pdfQuality.value : 'high';
                break;
            case 'pdf-to-word':
                const preserveLayout = document.getElementById('preserveLayout');
                const extractImages = document.getElementById('extractImages');
                options.preserveLayout = preserveLayout ? preserveLayout.checked : true;
                options.extractImages = extractImages ? extractImages.checked : true;
                break;
            case 'delete':
                const deletePages = document.getElementById('deletePages');
                options.pages = deletePages ? deletePages.value : '';
                break;
        }
        
        return options;
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showLoader(show) {
        const loader = document.getElementById('loadingOverlay');
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#ffc107'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-weight: 500;
            max-width: 300px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}" style="margin-right: 8px;"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.pdfTools = new KannadaPDFTools();
});

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

document.addEventListener('selectstart', (e) => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
    }
});
