/**
 * Gallery Lightbox Handler
 * 自动处理全站带有 #gallery-grid 的图片预览逻辑
 */
(function() {
    const initGallery = () => {
        const galleryGrid = document.getElementById('gallery-grid');
        const resultsTable = document.getElementById('results-table-body');

        // 1. 加载照片墙数据
        if (galleryGrid) {
            fetchGalleries(galleryGrid);
        }

        // 2. 加载比赛成绩数据
        if (resultsTable) {
            fetchResults(resultsTable);
        }

        // 3. 现有的点击放大逻辑 (保持不变，利用事件委托处理动态生成的图片)
        setupLightbox(galleryGrid);
    };

    async function fetchGalleries(container) {
        const { data, error } = await supabase.from('galleries').select('*').order('display_order', { ascending: true });
        if (error) return console.error('Error fetching gallery:', error);

        container.innerHTML = data.map(item => `
            <div class="col-4 col-6-small">
                <span class="image fit">
                    <picture>
                        <source srcset="${item.thumbnail_url}" type="image/webp">
                        <img src="${item.thumbnail_url}" data-full="${item.image_url}" alt="${item.alt_text}" style="cursor: pointer;" />
                    </picture>
                </span>
            </div>
        `).join('');
    }

    async function fetchResults(container) {
        const { data, error } = await supabase.from('results').select('*').order('event_date', { ascending: false });
        if (error) return console.error('Error fetching results:', error);

        container.innerHTML = data.map(row => {
            const eventDate = row.event_date ? new Date(row.event_date).toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
            return `
                <tr>
                    <td>${row.event_name}</td>
                    <td>${row.athlete_name}</td>
                    <td>${row.category}</td>
                    <td>${row.result_text}</td>
                    <td>${eventDate}</td>
                </tr>
            `;
        }).join('');
    }

    function setupLightbox(galleryGrid) {
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
    }

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