class ImageProcessor {
    constructor() {
        this.files = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupSliders();
    }

    setupEventListeners() {
        // 文件上传
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // 处理按钮
        document.getElementById('processBtn').addEventListener('click', this.processImages.bind(this));

        // 尺寸调整相关事件
        this.setupResizeEventListeners();
    }

    setupSliders() {
        // 压缩质量滑块
        const qualitySlider = document.getElementById('qualitySlider');
        const qualityValue = document.getElementById('qualityValue');
        qualitySlider.addEventListener('input', (e) => {
            qualityValue.textContent = e.target.value + '%';
        });

        // WebP质量滑块
        const webpQualitySlider = document.getElementById('webpQualitySlider');
        const webpQualityValue = document.getElementById('webpQualityValue');
        webpQualitySlider.addEventListener('input', (e) => {
            webpQualityValue.textContent = e.target.value + '%';
        });
    }

    setupResizeEventListeners() {
        // 预设尺寸选择
        const resizePreset = document.getElementById('resizePreset');
        const customSizeSection = document.getElementById('customSizeSection');
        const customWidth = document.getElementById('customWidth');
        const customHeight = document.getElementById('customHeight');
        const maintainAspectRatio = document.getElementById('maintainAspectRatio');

        // 预设尺寸变化时更新自定义尺寸输入框
        resizePreset.addEventListener('change', (e) => {
            const preset = e.target.value;
            if (preset !== 'custom') {
                const [width, height] = this.getPresetDimensions(preset);
                customWidth.value = width;
                customHeight.value = height;
            }
        });

        // 保持宽高比功能
        let originalAspectRatio = 1;
        let isUpdatingFromWidth = false;
        let isUpdatingFromHeight = false;

        customWidth.addEventListener('input', (e) => {
            if (maintainAspectRatio.checked && !isUpdatingFromHeight) {
                isUpdatingFromWidth = true;
                const width = parseInt(e.target.value) || 0;
                const height = Math.round(width / originalAspectRatio);
                customHeight.value = height;
                isUpdatingFromWidth = false;
            }
        });

        customHeight.addEventListener('input', (e) => {
            if (maintainAspectRatio.checked && !isUpdatingFromWidth) {
                isUpdatingFromHeight = true;
                const height = parseInt(e.target.value) || 0;
                const width = Math.round(height * originalAspectRatio);
                customWidth.value = width;
                isUpdatingFromHeight = false;
            }
        });

        // 当图片加载时计算原始宽高比
        this.calculateOriginalAspectRatio = () => {
            if (this.files.length > 0) {
                const img = new Image();
                const objectUrl = URL.createObjectURL(this.files[0]);
                img.onload = () => {
                    originalAspectRatio = img.width / img.height;
                    // 释放内存
                    URL.revokeObjectURL(objectUrl);
                };
                img.onerror = () => {
                    // 出错时也要释放内存
                    URL.revokeObjectURL(objectUrl);
                };
                img.src = objectUrl;
            }
        };
    }

    getPresetDimensions(preset) {
        const presetMap = {
            '1920x1080': [1920, 1080],
            '1280x720': [1280, 720],
            '800x600': [800, 600],
            '640x480': [640, 480],
            '320x240': [320, 240],
            'square': [1000, 1000], // 正方形，可以根据需要调整
            'portrait': [900, 1200], // 3:4 比例
            'landscape': [1200, 900] // 4:3 比例
        };
        return presetMap[preset] || [800, 600];
    }

    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        this.addFiles(files);
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.addFiles(files);
    }

    addFiles(newFiles) {
        this.files = [...this.files, ...newFiles];
        this.updateFileList();
        this.calculateOriginalAspectRatio();
    }

    updateFileList() {
        const uploadArea = document.getElementById('uploadArea');
        if (this.files.length > 0) {
            uploadArea.innerHTML = `
                <i class="fas fa-check-circle" style="color: #28a745;"></i>
                <h3>已选择 ${this.files.length} 个文件</h3>
                <p>点击"开始处理"按钮开始处理图片</p>
                <input type="file" id="fileInput" accept="image/*" multiple>
            `;
            // 重新绑定文件输入事件
            document.getElementById('fileInput').addEventListener('change', this.handleFileSelect.bind(this));
        }
    }

    async processImages() {
        if (this.files.length === 0) {
            this.showNotification('请先选择图片文件', 'warning');
            return;
        }

        const compressOption = document.getElementById('compressOption').checked;
        const convertOption = document.getElementById('convertOption').checked;
        const webpOption = document.getElementById('webpOption').checked;
        const resizeOption = document.getElementById('resizeOption').checked;

        if (!compressOption && !convertOption && !webpOption && !resizeOption) {
            this.showNotification('请至少选择一个处理选项', 'warning');
            return;
        }

        this.showLoading(true);
        this.updateProgress(0, `准备处理 ${this.files.length} 个文件...`);

        try {
            const results = [];
            const failedFiles = [];
            const totalFiles = this.files.length;
            
            for (let i = 0; i < this.files.length; i++) {
                const file = this.files[i];
                const progress = Math.round((i / totalFiles) * 100);
                this.updateProgress(progress, `正在处理: ${file.name} (${i + 1}/${totalFiles})`);
                
                try {
                    // 验证文件大小和类型
                    if (file.size > 50 * 1024 * 1024) { // 50MB
                        throw new Error('文件过大，请选择小于50MB的图片');
                    }
                    
                    if (!file.type.startsWith('image/')) {
                        throw new Error('不支持的文件类型');
                    }
                    
                    const result = await this.processSingleImage(file, {
                        compress: compressOption,
                        convert: convertOption,
                        webp: webpOption,
                        resize: resizeOption,
                        quality: parseInt(document.getElementById('qualitySlider').value),
                        webpQuality: parseInt(document.getElementById('webpQualitySlider').value),
                        targetFormat: document.getElementById('targetFormat').value,
                        resizeMode: document.getElementById('resizeMode').value,
                        resizePreset: document.getElementById('resizePreset').value,
                        customWidth: parseInt(document.getElementById('customWidth').value) || 0,
                        customHeight: parseInt(document.getElementById('customHeight').value) || 0
                    });
                    results.push(result);
                } catch (fileError) {
                    console.error(`处理文件 ${file.name} 失败:`, fileError);
                    failedFiles.push({
                        file: file,
                        error: fileError.message
                    });
                }
            }

            this.updateProgress(100, '处理完成！');
            
            // 延迟一下显示完成状态
            setTimeout(() => {
                this.displayResults(results);
                
                // 显示处理结果通知
                if (failedFiles.length === 0) {
                    this.showNotification(`成功处理了 ${results.length} 个文件！`, 'success');
                } else if (results.length > 0) {
                    this.showNotification(
                        `成功处理了 ${results.length} 个文件，${failedFiles.length} 个文件处理失败`, 
                        'warning', 
                        8000
                    );
                    // 显示失败详情
                    console.warn('失败的文件:', failedFiles);
                } else {
                    this.showNotification('所有文件处理失败，请检查文件格式和大小', 'error', 10000);
                }
            }, 500);
        } catch (error) {
            console.error('处理图片时出错:', error);
            this.showNotification('处理图片时出错: ' + error.message, 'error', 8000);
        } finally {
            this.showLoading(false);
        }
    }

    async processSingleImage(file, options) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            const objectUrl = URL.createObjectURL(file);
            
            img.onload = async () => {
                try {
                    // 释放内存
                    URL.revokeObjectURL(objectUrl);
                    
                    // 设置画布尺寸
                    canvas.width = img.width;
                    canvas.height = img.height;

                    // 绘制图片
                    ctx.drawImage(img, 0, 0);

                    const results = [];
                    const originalSize = file.size;

                    // 压缩处理
                    if (options.compress) {
                        const compressedBlob = await this.compressImage(canvas, options.quality);
                        results.push({
                            type: 'compressed',
                            blob: compressedBlob,
                            originalSize: originalSize,
                            newSize: compressedBlob.size,
                            filename: this.generateFilename(file.name, 'compressed', 'jpeg')
                        });
                    }

                    // 格式转换
                    if (options.convert) {
                        const convertedBlob = await this.convertFormat(canvas, options.targetFormat, options.quality);
                        results.push({
                            type: 'converted',
                            blob: convertedBlob,
                            originalSize: originalSize,
                            newSize: convertedBlob.size,
                            filename: this.generateFilename(file.name, 'converted', options.targetFormat)
                        });
                    }

                    // WebP转换
                    if (options.webp) {
                        const webpBlob = await this.convertToWebP(canvas, options.webpQuality);
                        results.push({
                            type: 'webp',
                            blob: webpBlob,
                            originalSize: originalSize,
                            newSize: webpBlob.size,
                            filename: this.generateFilename(file.name, 'webp', 'webp')
                        });
                    }

                    // 尺寸调整
                    if (options.resize) {
                        const resizeCanvas = await this.resizeImage(canvas, options);
                        const resizeBlob = await this.canvasToBlob(resizeCanvas, options.quality);
                        results.push({
                            type: 'resized',
                            blob: resizeBlob,
                            originalSize: originalSize,
                            newSize: resizeBlob.size,
                            filename: this.generateFilename(file.name, 'resized', 'jpeg')
                        });
                        // 清理resize canvas
                        this.cleanCanvas(resizeCanvas);
                    }

                    // 清理主canvas
                    this.cleanCanvas(canvas);

                    resolve({
                        originalFile: file,
                        results: results
                    });
                } catch (error) {
                    URL.revokeObjectURL(objectUrl);
                    this.cleanCanvas(canvas);
                    reject(error);
                }
            };

            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                this.cleanCanvas(canvas);
                reject(new Error('无法加载图片'));
            };
            img.src = objectUrl;
        });
    }

    // Canvas内存清理方法
    cleanCanvas(canvas) {
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            // 重置尺寸来释放内存
            canvas.width = 0;
            canvas.height = 0;
        }
    }

    compressImage(canvas, quality) {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', quality / 100);
        });
    }

    convertFormat(canvas, format, quality) {
        return new Promise((resolve) => {
            let mimeType;
            switch (format) {
                case 'jpeg':
                    mimeType = 'image/jpeg';
                    break;
                case 'png':
                    mimeType = 'image/png';
                    break;
                case 'webp':
                    mimeType = 'image/webp';
                    break;
                case 'gif':
                    mimeType = 'image/gif';
                    break;
                default:
                    mimeType = 'image/jpeg';
            }

            canvas.toBlob((blob) => {
                resolve(blob);
            }, mimeType, quality / 100);
        });
    }

    convertToWebP(canvas, quality) {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/webp', quality / 100);
        });
    }

    async resizeImage(canvas, options) {
        const { resizeMode, resizePreset, customWidth, customHeight } = options;
        
        // 获取目标尺寸
        let targetWidth, targetHeight;
        if (resizePreset === 'custom') {
            targetWidth = customWidth;
            targetHeight = customHeight;
        } else {
            [targetWidth, targetHeight] = this.getPresetDimensions(resizePreset);
        }

        if (targetWidth <= 0 || targetHeight <= 0) {
            throw new Error('请设置有效的目标尺寸（宽度和高度必须大于0）');
        }

        const originalWidth = canvas.width;
        const originalHeight = canvas.height;

        // 创建新的画布
        const newCanvas = document.createElement('canvas');
        const newCtx = newCanvas.getContext('2d');

        if (resizeMode === 'scale') {
            // 等比例缩放
            const scale = Math.min(targetWidth / originalWidth, targetHeight / originalHeight);
            const newWidth = Math.round(originalWidth * scale);
            const newHeight = Math.round(originalHeight * scale);

            newCanvas.width = newWidth;
            newCanvas.height = newHeight;

            // 使用高质量的图像平滑
            newCtx.imageSmoothingEnabled = true;
            newCtx.imageSmoothingQuality = 'high';

            newCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
        } else if (resizeMode === 'crop') {
            // 居中裁剪
            newCanvas.width = targetWidth;
            newCanvas.height = targetHeight;

            // 计算缩放比例，使图片至少填满目标尺寸
            const scale = Math.max(targetWidth / originalWidth, targetHeight / originalHeight);
            const scaledWidth = originalWidth * scale;
            const scaledHeight = originalHeight * scale;

            // 计算居中偏移量
            const offsetX = (targetWidth - scaledWidth) / 2;
            const offsetY = (targetHeight - scaledHeight) / 2;

            // 使用高质量的图像平滑
            newCtx.imageSmoothingEnabled = true;
            newCtx.imageSmoothingQuality = 'high';

            // 直接绘制缩放和居中的图片
            newCtx.drawImage(
                canvas,
                0, 0, originalWidth, originalHeight,
                offsetX, offsetY, scaledWidth, scaledHeight
            );
        }

        return newCanvas;
    }

    canvasToBlob(canvas, quality) {
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', quality / 100);
        });
    }

    generateFilename(originalName, suffix, extension) {
        const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.'));
        return `${nameWithoutExt}_${suffix}.${extension}`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    displayResults(allResults) {
        const resultsSection = document.getElementById('resultsSection');
        const resultsContainer = document.getElementById('resultsContainer');
        
        resultsContainer.innerHTML = '';

        allResults.forEach((fileResult, fileIndex) => {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'result-item';
            
            let html = `<h4>${fileResult.originalFile.name}</h4>`;
            
            fileResult.results.forEach((result, resultIndex) => {
                const sizeReduction = ((result.originalSize - result.newSize) / result.originalSize * 100).toFixed(1);
                const sizeReductionText = sizeReduction > 0 ? `减少 ${sizeReduction}%` : `增加 ${Math.abs(sizeReduction)}%`;
                
                html += `
                    <div class="result-info">
                        <div class="info-item">
                            <span>处理类型:</span>
                            <span>${this.getTypeText(result.type)}</span>
                        </div>
                        <div class="info-item">
                            <span>原始大小:</span>
                            <span>${this.formatFileSize(result.originalSize)}</span>
                        </div>
                        <div class="info-item">
                            <span>处理后大小:</span>
                            <span>${this.formatFileSize(result.newSize)}</span>
                        </div>
                        <div class="info-item">
                            <span>大小变化:</span>
                            <span style="color: ${sizeReduction > 0 ? '#28a745' : '#dc3545'}">${sizeReductionText}</span>
                        </div>
                    </div>
                    <a href="${URL.createObjectURL(result.blob)}" 
                       download="${result.filename}" 
                       class="download-btn">
                        <i class="fas fa-download"></i> 下载 ${result.filename}
                    </a>
                `;
            });
            
            fileDiv.innerHTML = html;
            resultsContainer.appendChild(fileDiv);
        });

        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    getTypeText(type) {
        const typeMap = {
            'compressed': '图片压缩',
            'converted': '格式转换',
            'webp': 'WebP转换',
            'resized': '尺寸调整'
        };
        return typeMap[type] || type;
    }

    updateProgress(percentage, message) {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const loadingText = document.getElementById('loadingText');
        
        if (progressFill) {
            progressFill.style.width = percentage + '%';
        }
        
        if (progressText) {
            progressText.textContent = percentage + '%';
        }
        
        if (loadingText && message) {
            loadingText.textContent = message;
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        const processBtn = document.getElementById('processBtn');
        
        if (show) {
            loading.style.display = 'flex';
            processBtn.disabled = true;
            // 重置进度
            this.updateProgress(0, '准备处理...');
        } else {
            loading.style.display = 'none';
            processBtn.disabled = false;
        }
    }

    // 通知系统
    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.getElementById('notification');
        const messageEl = notification.querySelector('.notification-message');
        const iconEl = notification.querySelector('.notification-icon');
        
        // 设置消息
        messageEl.textContent = message;
        
        // 设置图标
        let iconClass = 'fas fa-info-circle';
        switch (type) {
            case 'success':
                iconClass = 'fas fa-check-circle';
                break;
            case 'error':
                iconClass = 'fas fa-exclamation-triangle';
                break;
            case 'warning':
                iconClass = 'fas fa-exclamation-circle';
                break;
        }
        iconEl.className = `notification-icon ${iconClass}`;
        
        // 设置样式
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        // 自动隐藏
        if (duration > 0) {
            setTimeout(() => {
                this.hideNotification();
            }, duration);
        }
    }

    hideNotification() {
        const notification = document.getElementById('notification');
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            notification.style.display = 'none';
            notification.style.animation = 'slideIn 0.3s ease-out';
        }, 300);
    }
}

// 全局函数供HTML调用
function hideNotification() {
    const notification = document.getElementById('notification');
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => {
        notification.style.display = 'none';
        notification.style.animation = 'slideIn 0.3s ease-out';
    }, 300);
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new ImageProcessor();
}); 