/**
 * Trích xuất ID bài viết từ URL Dân trí
 */
function extractPostId(url) {
  const match = url.match(/-(\d+)\.htm/);
  return match ? `dtri-${match[1]}` : `dtri-${Date.now()}`;
}

/**
 * Trích xuất Slug từ URL
 */
function extractSlug(url) {
  const pathname = new URL(url).pathname;
  const fileName = pathname.split('/').filter(Boolean).pop() || '';
  return fileName.replace(/-\d+\.htm$/, '');
}

/**
 * Hàm Crawler lấy thông tin bài viết Dân trí trả về Object JSON chuẩn hóa
 * @param {string} articleUrl 
 * @returns {Promise<Object>}
 */
async function crawlDantriArticle(articleUrl) {
  try {
    // Dùng CORS Proxy để vượt qua rào cản Cross-Origin khi gọi trên trình duyệt
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(articleUrl)}`;
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const doc = new DOMParser().parseFromString(data.contents, 'text/html');

    // Các hàm helper trích xuất nội dung
    const getHTML = (selector, index = 0) => {
      const elements = doc.querySelectorAll(selector);
      return elements[index]?.innerHTML?.trim() || '';
    };

    const getText = (selector, index = 0) => {
      const elements = doc.querySelectorAll(selector);
      return elements[index]?.textContent?.trim() || '';
    };

    // Lấy chuyên mục từ pathname của URL
    const pathname = new URL(articleUrl).pathname;
    const category = pathname.split('/').filter(Boolean)[0] || '';

    // Lấy tác giả (ưu tiên index 1 theo selector mẫu, nếu rỗng lấy index 0)
    let author = getText('#articleContent [rel="author"]', 1) || getText('#articleContent [rel="author"]', 0);
    if (!author) author = 'Tổng hợp';

    // Lấy ảnh bài viết (nếu có) để hiển thị giao diện đẹp hơn
    const image = doc.querySelector('#articleContent [data-slot="content"] img')?.getAttribute('src') || '';

    return {
      id: extractPostId(articleUrl),
      title: getText('#articleContent [data-slot="title"]'),
      slug: extractSlug(articleUrl),
      excerpt: getText('#articleContent [data-slot="sapo"]'),
      content: doc.querySelector('#articleContent [data-slot="content"]')?.innerHTML?.trim() || '',
      image: image,
      author: author,
      category: category,
      publishedAt: getText('time'),
      source: 'dantri.com.vn',
      url: articleUrl
    };
  } catch (error) {
    console.error('Lỗi khi cào dữ liệu:', error);
    throw error;
  }
}
