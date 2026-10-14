function extractPostId(url) {
  const match = url.match(/-(\d+)\.htm/);
  return match ? `dtri-${match[1]}` : `dtri-${Date.now()}`;
}

function extractSlug(url) {
  const parts = url.split('/');
  return parts[parts.length - 1].replace(/-\d+\.htm$/, '');
}

async function crawlDantriArticle(articleUrl) {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(articleUrl)}`;
  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error('Không thể tải trang web.');

  const data = await response.json();
  const parser = new DOMParser();
  const doc = parser.parseFromString(data.contents, 'text/html');

  const title = doc.querySelector('.title-page, .detail-title, h1.title')?.innerText.trim() || '';
  const excerpt = doc.querySelector('.singular-sapo, .detail-sapo, h2.sapo')?.innerText.trim() || '';
  const contentBody = doc.querySelector('.singular-content, .detail-content');

  let content = '';
  let image = '';

  if (contentBody) {
    contentBody.querySelectorAll('.related-news, .ads, script').forEach(el => el.remove());
    content = Array.from(contentBody.querySelectorAll('p'))
                   .map(p => p.innerText.trim())
                   .filter(t => t.length > 0)
                   .join('\n\n');

    const imgEl = contentBody.querySelector('img');
    if (imgEl) image = imgEl.getAttribute('src') || imgEl.getAttribute('data-src') || '';
  }

  const author = doc.querySelector('.author-name, .author-info, .author')?.innerText.trim() || 'Tổng hợp';
  const publishedAt = doc.querySelector('.author-time, .detail-time, .time')?.innerText.trim() || new Date().toISOString();
  const category = doc.querySelector('.breadcrumbs li:nth-child(2) a, .cate-name')?.innerText.trim() || 'Tin tức';

  return {
    id: extractPostId(articleUrl),
    title,
    slug: extractSlug(articleUrl),
    excerpt,
    content,
    image,
    author,
    category,
    publishedAt,
    source: 'dantri.com.vn',
    url: articleUrl
  };
}
