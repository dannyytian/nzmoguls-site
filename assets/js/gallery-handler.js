/**
 * Gallery Lightbox Handler
 * 自动处理全站带有 #gallery-grid 的图片预览逻辑
 */
(function() {
    const initGallery = () => {
        const galleryGrid = document.getElementById('gallery-grid');
        if (!galleryGrid) return;

        galleryGrid.addEventListener('click', (e) => {
            const target = e.target;
            
            // 检查点击的是否是带有 data-full 属性的图片
            if (target.tagName === 'IMG' && target.dataset.full) {
                const fullSrc = target.dataset.full;
                const altText = target.alt || 'Gallery Image';
                
                let container = document.getElementById('modal-container');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'modal-container';
                    document.body.appendChild(container);
                }

                container.innerHTML = `
                    <div class="modal-box image-lightbox">
                        <img src="${fullSrc}" alt="${altText}">
                        <div style="text-align:center; padding: 1em 0 0.5em 0;">
                            <button class="button primary small" onclick="closeLightbox()">Close</button>
                        </div>
                    </div>
                `;

                // 点击背景关闭逻辑
                container.onclick = (e) => { if (e.target === container) closeLightbox(); };
                
                setTimeout(() => container.classList.add('visible'), 10);
            }
        });
    };

    window.closeLightbox = function() {
        const container = document.getElementById('modal-container');
        if (container) {
            container.classList.remove('visible');
            setTimeout(() => { container.innerHTML = ''; }, 300);
        }
    };

    // DOM 加载完成后初始化
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initGallery); } 
    else { initGallery(); }
})();