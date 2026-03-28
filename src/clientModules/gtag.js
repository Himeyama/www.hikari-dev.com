// GTM を window.load イベント後に遅延読み込みして
// 初期レンダリング時の未使用 JS を削減する

const GA_ID = 'G-6QLJRW2VM8';

function loadGtag() {
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID, {anonymize_ip: true, send_page_view: false});

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  // 初回ページビューを手動で発火
  gtag('event', 'page_view', {page_path: window.location.pathname});
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') {
    loadGtag();
  } else {
    window.addEventListener('load', loadGtag, {once: true});
  }
}

// SPA ページ遷移時のページビュー追跡
export function onRouteDidUpdate({location, previousLocation}) {
  if (previousLocation && location.pathname !== previousLocation.pathname) {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {page_path: location.pathname});
    }
  }
}
