#!/usr/bin/env python3
"""
Reads every published item out of the DynamoDB `Articles` table and
regenerates:

  - articles.html                       (the blog index / card grid)
  - articles/<slug>.html                (one full page per article)

This is the piece that makes the DynamoDB table the actual source of truth
for the site. Run it any time you add, edit, or unpublish an article in the
table, then commit + push the regenerated HTML files to GitHub Pages like
normal.

Usage:
    pip install boto3
    aws configure                # if you haven't already
    python3 scripts/generate_articles_pages.py

Run this from the project root (the folder that contains articles.html).
"""

import html
import os
import sys

import boto3
from botocore.exceptions import ClientError

REGION = "us-east-1"
TABLE_NAME = "Articles"
SITE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARTICLES_DIR = os.path.join(SITE_ROOT, "articles")

# ---------------------------------------------------------------------------
# category -> (human label, SVG path data)
# Add an entry here whenever a genuinely new category shows up in the table.
# Anything not listed falls back to a humanized label + a generic document icon.
# ---------------------------------------------------------------------------
CATEGORY_META = {
    "exposure-science": (
        "Exposure Science",
        'M8.5 14.5A2.5 2.5 0 0 0 11 17c1.5 0 2.5-1.3 2.5-2.5 0-1.4-1.2-2.3-1-4C13 8 15 6 15 6s2 3.5 2 6.5c0 3-2.4 5.5-5.5 5.5C8.4 18 6 15.6 6 12.5c0-2.4 1.5-4.2 2.5-5.5C8 9.5 8.5 12 8.5 14.5z',
    ),
    "early-detection": (
        "Early Detection",
        "M6 3c0 6 12 12 12 18M18 3c0 6-12 12-12 18M6.5 7h11M6.5 17h11",
    ),
}
DEFAULT_ICON_PATH = "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M9 13h6 M9 17h6"


def humanize(slug):
    return " ".join(w.capitalize() for w in slug.split("-"))


def category_label(cat):
    return CATEGORY_META.get(cat, (humanize(cat), None))[0]


def category_icon_path(cat):
    meta = CATEGORY_META.get(cat)
    return meta[1] if meta else DEFAULT_ICON_PATH


def esc(text):
    """Escape for text content (not inside an attribute)."""
    return html.escape(text or "", quote=False)


def esc_attr(text):
    """Escape for use inside a double-quoted HTML attribute."""
    return html.escape(text or "", quote=True)


def fetch_published_articles():
    table = boto3.resource("dynamodb", region_name=REGION).Table(TABLE_NAME)
    items = table.scan().get("Items", [])
    published = [i for i in items if i.get("status") == "published"]
    # Newest first.
    published.sort(key=lambda i: i.get("publishedDate", ""), reverse=True)
    return published


# ---------------------------------------------------------------------------
# Shared page chrome (identical across every page on the site already).
# {p} is "" on articles.html (root level) and "../" inside articles/*.html.
# ---------------------------------------------------------------------------

def header_html(p, active):
    return f"""<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="{p}index.html" aria-label="Project Pulmonary home">
      <img class="brand-logo" src="{p}assets/images/logo-mark.png" alt="" width="46" height="46">
      <span class="brand-name">Project Pulmonary</span>
    </a>
    <button class="mobile-toggle" data-menu-toggle aria-expanded="false" aria-label="Open navigation"><span></span></button>
    <div class="nav-shell" data-nav-shell>
      <nav class="nav-links" aria-label="Primary"><a href="{p}about.html">About</a><a href="{p}impact.html">Impact</a><a href="{p}press.html">Press</a><a href="{p}articles.html" class="active" aria-current="page">Articles</a><a href="{p}join-us.html">Get Involved</a><a href="{p}contact.html">Contact</a></nav>
      <div class="header-actions">
        <a class="icon-btn" href="https://www.instagram.com/projectpulmonary/" target="_blank" rel="noopener" aria-label="Project Pulmonary on Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1"/></svg></a>
        <a class="btn btn-donate btn-sm" href="{p}support-us.html"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.9-10-9.3C.5 8.6 2.4 4.5 6.3 4.5c2.3 0 3.9 1.3 5.7 3.3 1.8-2 3.4-3.3 5.7-3.3 3.9 0 5.8 4.1 4.3 7.2C19.5 16.1 12 21 12 21z"/></svg> Donate</a>
      </div>
    </div>
  </div>
</header>
"""


def final_cta_html(p):
    return f"""<section class="cta-band">
  <div class="bg"><img src="{p}assets/images/field/group-scale.jpg" alt="" loading="lazy"></div>
  <div class="wrap">
    <h2>Every chapter starts with one student.</h2>
    <p>Start one at your school, fund the next delivery, or bring Project Pulmonary to your department.</p>
    <div class="btn-row">
      <a class="btn btn-donate" href="{p}support-us.html"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.9-10-9.3C.5 8.6 2.4 4.5 6.3 4.5c2.3 0 3.9 1.3 5.7 3.3 1.8-2 3.4-3.3 5.7-3.3 3.9 0 5.8 4.1 4.3 7.2C19.5 16.1 12 21 12 21z"/></svg> Donate</a>
      <a class="btn btn-ghost-light" href="https://docs.google.com/forms/d/1ozyfQ0EB1CHo-yMgzCIMyOmZ1Df-O7NJyY22K40L0c8/edit" target="_blank" rel="noopener">Start a chapter</a>
      <a class="btn btn-ghost-light" href="{p}support-us.html#partner">Partner with us</a>
    </div>
    <p class="fine">Project Pulmonary is a 501(c)(3). Every gift is tax-deductible.</p>
  </div>
</section>
"""


def footer_html(p):
    return f"""<footer class="footer">
  <div class="wrap">
    <div class="footer-top">
      <div>
        <a class="brand" href="{p}index.html"><img class="brand-logo" src="{p}assets/images/logo-mark.png" alt="" width="46" height="46"><span class="brand-name">Project Pulmonary</span></a>
        <p class="footer-lede">Youth-led and firefighter-focused. Students in 230+ chapters across 40+ countries protecting the people who protect us.</p>
        <div class="footer-socials">
          <a class="icon-btn" href="https://www.instagram.com/projectpulmonary/" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1"/></svg></a>
          <a class="icon-btn" href="https://linktr.ee/projectpulmonary" target="_blank" rel="noopener" aria-label="Linktree"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7"/><path d="M9 7h8v8"/></svg></a>
        </div>
      </div>
      <div>
        <h4>Organization</h4>
        <ul>
          <li><a href="{p}about.html">About</a></li>
          <li><a href="{p}impact.html">Impact</a></li>
          <li><a href="{p}press.html">Press</a></li>
          <li><a href="{p}articles.html">Research articles</a></li>
          <li><a href="{p}faq.html">FAQ</a></li>
        </ul>
      </div>
      <div>
        <h4>Get involved</h4>
        <ul>
          <li><a href="https://docs.google.com/forms/d/1ozyfQ0EB1CHo-yMgzCIMyOmZ1Df-O7NJyY22K40L0c8/edit" target="_blank" rel="noopener">Start a chapter</a></li>
          <li><a href="{p}join-us.html">Volunteer</a></li>
          <li><a href="{p}support-us.html#partner">Partner with us</a></li>
          <li><a href="{p}contact.html">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4>Contact</h4>
        <ul>
          <li><a href="mailto:projectpulmonary@gmail.com">projectpulmonary@gmail.com</a></li>
          <li>Los Angeles, California</li>
        </ul>
        <a class="btn btn-donate btn-sm" href="{p}support-us.html"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.9-10-9.3C.5 8.6 2.4 4.5 6.3 4.5c2.3 0 3.9 1.3 5.7 3.3 1.8-2 3.4-3.3 5.7-3.3 3.9 0 5.8 4.1 4.3 7.2C19.5 16.1 12 21 12 21z"/></svg> Donate</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; 2026 Project Pulmonary. All rights reserved.</span>
      <!-- TODO: add the EIN from the IRS determination letter, e.g. "EIN 12-3456789" -->
      <span>Project Pulmonary is a registered 501(c)(3) nonprofit. Donations are tax-deductible to the extent allowed by law.</span>
    </div>
  </div>
</footer>
<script src="{p}assets/js/main.js?v=202609272"></script>
"""


MARQUEE_HTML = """<section class="section tight">
  <div class="wrap">
    <div class="sec-head center"><span class="eyebrow">Supported by</span><h2 class="h-md">Partners who make every drive possible</h2></div>
    <div class="partners rv"><div class="partner"><img src="assets/images/sponsors/coffee-bean.png" alt="The Coffee Bean &amp; Tea Leaf" loading="lazy"></div><div class="partner"><img src="assets/images/sponsors/american-lung-association.png" alt="American Lung Association" loading="lazy"></div><div class="partner"><img src="assets/images/sponsors/mathnasium.png" alt="Mathnasium" loading="lazy"></div><div class="partner"><img src="assets/images/sponsors/c2-education.png" alt="C2 Education" loading="lazy"></div><div class="partner"><img src="assets/images/sponsors/rhapsody-education.png" alt="Rhapsody Education" loading="lazy"></div><div class="partner"><img src="assets/images/sponsors/origami-for-good.png" alt="Origami for Good" loading="lazy"></div><div class="partner"><img src="assets/images/sponsors/apricus-literacy.png" alt="Apricus Literacy" loading="lazy"></div></div>
  </div>
</section>
"""


# ---------------------------------------------------------------------------
# articles.html (index / grid)
# ---------------------------------------------------------------------------

def render_filter_pills(categories):
    pills = ['<button type="button" class="article-filter is-active" data-filter="all">All topics</button>']
    for cat in categories:
        pills.append(
            f'<button type="button" class="article-filter" data-filter="{esc_attr(cat)}">{esc(category_label(cat))}</button>'
        )
    return "\n        ".join(pills)


def render_blog_card(article, index):
    cat = article["category"]
    tone_class = " tone-b" if index % 2 == 1 else ""
    icon_path = category_icon_path(cat)
    slug = article["slug"]
    title = article["title"]
    href = f"articles/{slug}.html"
    read = f"{article.get('readTimeMinutes', '')} min read".strip()
    return f"""      <article class="blog-card rv" data-category="{esc_attr(cat)}">
        <div class="blog-card-banner{tone_class}">
          <span class="blog-card-cat">{esc(category_label(cat))}</span>
          <div class="blog-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="{icon_path}"/></svg></div>
        </div>
        <div class="blog-card-body">
          <h2><a href="{esc_attr(href)}">{esc(title)}</a></h2>
          <p class="blog-card-excerpt">{esc(article.get('excerpt', ''))}</p>
          <div class="blog-card-meta">
            <div class="voice-avatar">{esc(article.get('authorInitials', ''))}</div>
            <div class="blog-card-meta-text">
              <div class="blog-card-meta-name">{esc(article.get('authorName', ''))}</div>
              <div class="blog-card-meta-sub">{esc(article.get('authorRole', ''))} &middot; {esc(read)}</div>
            </div>
          </div>
        </div>
        <a class="blog-card-link" href="{esc_attr(href)}" aria-label="Read {esc_attr(title)}"></a>
      </article>"""


def build_articles_index(articles):
    categories = sorted({a["category"] for a in articles}, key=category_label)
    count = len(articles)
    count_text = f"{count} article{'' if count == 1 else 's'}"
    cards = "\n\n".join(render_blog_card(a, i) for i, a in enumerate(articles))

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-254P9HKWLQ"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', 'G-254P9HKWLQ');
</script>
<title>Project Pulmonary | Articles</title>
<meta name="description" content="Research articles from the Project Pulmonary team on wildfire smoke exposure, biomarkers, and firefighter lung health.">
<meta name="theme-color" content="#162C9F">
<meta property="og:title" content="Project Pulmonary | Articles">
<meta property="og:description" content="Research articles from the Project Pulmonary team on wildfire smoke exposure, biomarkers, and firefighter lung health.">
<meta property="og:type" content="website">
<meta property="og:image" content="https://www.projectpulmonary.com/assets/images/field/letters-turnout-crew.jpg">
<meta property="og:url" content="https://www.projectpulmonary.com/articles.html">
<link rel="canonical" href="https://www.projectpulmonary.com/articles.html">
<link rel="icon" href="assets/images/logo-square.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,500;1,600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap">
<link rel="stylesheet" href="assets/css/style.css?v=202609273">
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"NGO","name":"Project Pulmonary","email":"projectpulmonary@gmail.com","sameAs":["https://linktr.ee/projectpulmonary","https://www.instagram.com/projectpulmonary?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="]}}</script>
</head>
<body>
{header_html("", "articles")}
<main id="main">

<section class="page-hero ">
  <div class="bg"><img src="assets/images/field/letters-writing.jpg" alt="" fetchpriority="high"></div>
  <div class="wrap">
    <span class="eyebrow light">Research</span>
    <h1>Firefighter lung health, in plain language.</h1>
    <p class="lede">Peer-reviewed research on wildfire smoke exposure, translated by our student research team.</p>
    
  </div>
</section>

<section class="section">
  <div class="wrap" style="max-width:1100px">

    <div class="articles-toolbar rv">
      <span class="articles-count">{count_text}</span>
      <div class="article-filters" role="group" aria-label="Filter articles by topic">
        {render_filter_pills(categories)}
      </div>
    </div>

    <div class="articles-grid" data-articles-grid>

{cards}

    </div>
  </div>
</section>

{final_cta_html("")}
{MARQUEE_HTML}
</main>
{footer_html("")}
</body>
</html>
"""


# ---------------------------------------------------------------------------
# articles/<slug>.html (detail page)
# ---------------------------------------------------------------------------

def render_body_block(block):
    t = block.get("type")
    if t == "p":
        return f"      <p>{esc(block.get('text', ''))}</p>"
    if t == "stat":
        return f"      <div class=\"article-stat\"><strong>{esc(block.get('label', 'Statistic'))}:</strong> {esc(block.get('text', ''))}</div>"
    if t == "flow":
        return f"      <p class=\"article-flow\">{esc(block.get('text', ''))}</p>"
    if t == "bullets":
        items = "\n".join(
            f"        <li><strong>{esc(item.get('term', ''))}</strong> &mdash; {esc(item.get('text', ''))}</li>"
            for item in block.get("items", [])
        )
        return f"      <ul class=\"bullets\">\n{items}\n      </ul>"
    return ""


def render_nav_strip(articles, index):
    cards = []
    if index + 1 < len(articles):
        nxt = articles[index + 1]
        cards.append(
            f'      <a class="article-nav-card prev" href="{esc_attr(nxt["slug"])}.html">\n'
            f'        <span class="dir">Next article &rarr;</span>\n'
            f'        <span class="ttl">{esc(nxt["title"])}</span>\n'
            f"      </a>"
        )
    elif index > 0:
        prv = articles[index - 1]
        cards.append(
            f'      <a class="article-nav-card prev" href="{esc_attr(prv["slug"])}.html">\n'
            f'        <span class="dir">&larr; Previous article</span>\n'
            f'        <span class="ttl">{esc(prv["title"])}</span>\n'
            f"      </a>"
        )
    cards.append(
        '      <a class="article-nav-card next" href="../articles.html">\n'
        '        <span class="dir">All articles</span>\n'
        '        <span class="ttl">Back to Research &amp; Articles</span>\n'
        "      </a>"
    )
    return "\n".join(cards)


def build_article_page(article, articles, index):
    slug = article["slug"]
    title = article["title"]
    cat = article["category"]
    icon_path = category_icon_path(cat)
    excerpt = article.get("excerpt", "")
    cover = article.get("coverImageUrl", "").lstrip("/")
    cover_alt = article.get("coverImageAlt", title)
    read = f"{article.get('readTimeMinutes', '')} min read".strip()
    sources = " &middot; ".join(esc(s) for s in article.get("sources", []))
    body = "\n".join(render_body_block(b) for b in article.get("bodyBlocks", []))

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-254P9HKWLQ"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());
  gtag('config', 'G-254P9HKWLQ');
</script>
<title>{esc(title)} | Project Pulmonary</title>
<meta name="description" content="{esc_attr(excerpt)}">
<meta name="theme-color" content="#162C9F">
<meta property="og:title" content="{esc_attr(title)} | Project Pulmonary">
<meta property="og:description" content="{esc_attr(excerpt)}">
<meta property="og:type" content="article">
<meta property="og:image" content="https://www.projectpulmonary.com/assets/images/field/letters-turnout-crew.jpg">
<meta property="og:url" content="https://www.projectpulmonary.com/articles/{esc_attr(slug)}.html">
<link rel="canonical" href="https://www.projectpulmonary.com/articles/{esc_attr(slug)}.html">
<link rel="icon" href="../assets/images/logo-square.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,500;1,600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap">
<link rel="stylesheet" href="../assets/css/style.css?v=202609273">
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"Article","headline":"{esc_attr(title)}","author":{{"@type":"Person","name":"{esc_attr(article.get('authorName', ''))}"}},"publisher":{{"@type":"Organization","name":"Project Pulmonary"}}}}</script>
</head>
<body class="header-solid">
{header_html("../", "articles")}
<main id="main">

<section class="article-hero">
  <div class="wrap" style="max-width:860px">
    <a class="back-link" href="../articles.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> All articles</a>
    <div class="rv">
      <span class="article-hero-tag"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="{icon_path}"/></svg> {esc(category_label(cat))}</span>
      <h1>{esc(title)}</h1>
      <p class="article-hero-lede">Original research write-up translating peer-reviewed studies on wildfire smoke exposure into a plain-language explainer.</p>
    </div>
    <div class="article-meta-row rv d1">
      <div class="voice-avatar">{esc(article.get('authorInitials', ''))}</div>
      <div>
        <div class="article-meta-name">{esc(article.get('authorName', ''))}</div>
        <div class="article-meta-sub">{esc(article.get('authorRole', ''))} &middot; {esc(read)}</div>
      </div>
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap" style="max-width:860px">
    <div class="article-cover rv">
      <img src="../{cover}" alt="{esc_attr(cover_alt)}">
    </div>

    <div class="article-prose rv d1">
{body}
      <p class="article-sources"><strong>Sources:</strong> {sources}</p>
    </div>

    <div class="article-nav-strip rv">
{render_nav_strip(articles, index)}
    </div>
  </div>
</section>

{final_cta_html("../")}
</main>
{footer_html("../")}
</body>
</html>
"""


def main():
    try:
        articles = fetch_published_articles()
    except ClientError as e:
        print(f"AWS error: {e}", file=sys.stderr)
        sys.exit(1)

    if not articles:
        print("No published articles found in the Articles table — nothing to generate.")
        return

    with open(os.path.join(SITE_ROOT, "articles.html"), "w", encoding="utf-8") as f:
        f.write(build_articles_index(articles))
    print(f"Wrote articles.html ({len(articles)} article card(s)).")

    os.makedirs(ARTICLES_DIR, exist_ok=True)
    for i, article in enumerate(articles):
        out_path = os.path.join(ARTICLES_DIR, f"{article['slug']}.html")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(build_article_page(article, articles, i))
        print(f"Wrote articles/{article['slug']}.html")

    print("\nDone. articles.html and every article detail page now reflect the Articles table.")
    print("Review the changes, then commit + push to deploy.")


if __name__ == "__main__":
    main()
