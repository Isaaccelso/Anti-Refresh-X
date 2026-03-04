(() => {
  const MAX_KNOWN_TWEETS = 4000;
  const knownTweetIds = new Set();
  let observerStarted = false;

  const NEW_POSTS_TEXT = /(new posts?|novos posts?|novas publica(?:c|ç)(?:o|õ)es|show \d+ posts?)/i;

  function getTweetIdFromArticle(article) {
    const links = article.querySelectorAll('a[href*="/status/"]');
    for (const link of links) {
      const match = link.getAttribute("href")?.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    return null;
  }

  function getArticles(node) {
    if (!(node instanceof Element)) return [];
    const articles = [];
    if (node.matches("article")) articles.push(node);
    articles.push(...node.querySelectorAll("article"));
    return articles;
  }

  function rememberTweetId(id) {
    if (!id) return;
    knownTweetIds.add(id);
    if (knownTweetIds.size > MAX_KNOWN_TWEETS) {
      const keep = Array.from(knownTweetIds).slice(-Math.floor(MAX_KNOWN_TWEETS * 0.75));
      knownTweetIds.clear();
      for (const item of keep) knownTweetIds.add(item);
    }
  }

  function seedKnownTweets() {
    const articles = document.querySelectorAll("article");
    for (const article of articles) {
      rememberTweetId(getTweetIdFromArticle(article));
    }
  }

  function isNearTop() {
    return window.scrollY < 120;
  }

  function isTopInsertion(article) {
    const rect = article.getBoundingClientRect();
    const absoluteTop = window.scrollY + rect.top;
    return absoluteTop <= window.scrollY + 280;
  }

  function hideNewPostsBanners(root = document) {
    const spans = root.querySelectorAll("span");
    for (const span of spans) {
      const text = (span.textContent || "").trim();
      if (!text || !NEW_POSTS_TEXT.test(text)) continue;
      const clickable = span.closest('div[role="button"], a[role="link"], a');
      if (clickable) clickable.style.display = "none";
    }
  }

  function processAddedArticle(article) {
    const id = getTweetIdFromArticle(article);
    if (!id) return;
    if (knownTweetIds.has(id)) return;

    const shouldBlock = !isNearTop() && isTopInsertion(article);
    if (shouldBlock) {
      article.remove();
      return;
    }

    rememberTweetId(id);
  }

  function startObserver() {
    if (observerStarted || !document.body) return;
    observerStarted = true;
    seedKnownTweets();
    hideNewPostsBanners();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          for (const article of getArticles(node)) {
            processAddedArticle(article);
          }
          if (node instanceof Element) hideNewPostsBanners(node);
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    window.addEventListener("scroll", () => {
      if (isNearTop()) seedKnownTweets();
    }, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver, { once: true });
  } else {
    startObserver();
  }
})();
