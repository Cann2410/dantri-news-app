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
  try {
    const pathname = new URL(url).pathname;
    const fileName = pathname.split('/').filter(Boolean).pop() || '';
    return fileName.replace(/-\d+\.htm$/, '');
  } catch (e) {
    return 'bai-viet';
  }
}

/**
 * Lấy HTML từ URL bài báo sử dụng danh sách CORS Proxy dự phòng
 */
async function fetchHtmlWithProxy(articleUrl) {
  const proxies = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(articleUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(articleUrl)}`
  ];

  // 1. Thử Proxy AllOrigins
  try {
    const res = await fetch(proxies[0]);
    if (res.ok) {
      const data = await res.json();
      if (data.contents) return data.contents;
    }
  } catch (e) {
    console.warn('Proxy 1 hỏng, đang thử Proxy 2...', e);
  }

  // 2. Thử Proxy CorsProxy.io
  try {
    const res = await fetch(proxies[1]);
    if (res.ok) {
      return await res.text();
    }
  } catch (e) {
    console.warn('Proxy 2 hỏng...', e);
  }

  throw new Error('Không thể tải trang web qua các server Proxy trung gian.');
}

/**
 * Hàm Crawler cào dữ liệu bài viết Dân Trí
 */
async function crawlDantriArticle(articleUrl) {
  try {
    const htmlText = await fetchHtmlWithProxy(articleUrl);
    const doc = new DOMParser().parseFromString(htmlText, 'text/html');

    const getText = (selector, index = 0) => {
      const elements = doc.querySelectorAll(selector);
      return elements[index]?.textContent?.trim() || '';
    };

    // Lấy tên chuyên mục
    let category = 'Tin tức';
    try {
      const pathname = new URL(articleUrl).pathname;
      category = pathname.split('/').filter(Boolean)[0] || 'Tin tức';
    } catch (e) {}

    // Lấy Tiêu đề
    const title = getText('#articleContent [data-slot="title"]') || 
                  getText('.title-page, .detail-title, h1.title');

    // Lấy Sapo
    const excerpt = getText('#articleContent [data-slot="sapo"]') || 
                    getText('.singular-sapo, .detail-sapo, h2.sapo');

    // Lấy Nội dung & Ảnh
    const contentEl = doc.querySelector('#articleContent [data-slot="content"]') || 
                      doc.querySelector('.singular-content, .detail-content');
    let content = '';
    let image = '';

    if (contentEl) {
      contentEl.querySelectorAll('.related-news, .ads, script, style').forEach(el => el.remove());
      const paragraphs = Array.from(contentEl.querySelectorAll('p'))
                              .map(p => p.textContent.trim())
                              .filter(t => t.length > 0);
      content = paragraphs.join('\n\n') || contentEl.textContent.trim();

      const imgEl = contentEl.querySelector('img');
      if (imgEl) {
        image = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '';
      }
    }

    // Lấy Tác giả
    let author = getText('#articleContent [rel="author"]', 1) || 
                 getText('#articleContent [rel="author"]', 0) || 
                 getText('.author-name, .author-info');
    if (!author) author = 'Tổng hợp';

    // Lấy Thời gian
    const publishedAt = getText('time') || 
                        getText('.author-time, .detail-time') || 
                        new Date().toLocaleString('vi-VN');

    return {
      id: extractPostId(articleUrl),
      title: title || 'Bài viết Dân Trí',
      slug: extractSlug(articleUrl),
      excerpt: excerpt,
      content: content,
      image: image,
      author: author,
      category: category,
      publishedAt: publishedAt,
      source: 'dantri.com.vn',
      url: articleUrl
    };
  } catch (error) {
    console.error('Lỗi chi tiết khi cào:', error);
    throw error;
  }
}
