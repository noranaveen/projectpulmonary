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
    def cls(name):
        return ' class="active"' if active == name else ""

    return f"""<a class="skip-link" href="#main">Skip to content</a>
<div class="ambient" aria-hidden="true"></div>
<div class="cursor-glow" aria-hidden="true"></div>
<div class="breath-line" aria-hidden="true">
<svg viewBox="0 0 64 1000" preserveAspectRatio="none">
<defs>
<linearGradient id="breathGrad" x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stop-color="#7C3AED"/>
<stop offset="50%" stop-color="#FF6A3D"/>
<stop offset="100%" stop-color="#FFC864"/>
</linearGradient>
</defs>
<path d="M20 0 C 20 60, 44 60, 44 120 S 20 180, 20 240 S 44 300, 44 360 S 20 420, 20 480 S 44 540, 44 600 S 20 660, 20 720 S 44 780, 44 840 S 20 900, 20 1000" />
</svg>
</div>
<header class="site-header" data-header>
<div class="wrap">
<a class="brand" href="{p}index.html" aria-label="Project Pulmonary home">
<img class="brand-logo" src="{p}assets/images/logo-square.png" alt="Project Pulmonary logo">
<span>PROJECT&nbsp;PULMONARY</span>
</a>
<button class="mobile-toggle" data-menu-toggle aria-expanded="false" aria-label="Open navigation"><span></span></button>
<div class="nav-shell" data-nav-shell>
<nav class="nav-links" aria-label="Primary"><a href="{p}index.html"{cls('home')}>Home</a><a href="{p}about.html"{cls('about')}>About</a><a href="{p}impact.html"{cls('impact')}>Impact</a><a href="{p}join-us.html"{cls('join')}>Get Involved</a><a href="{p}press.html"{cls('press')}>Press</a><a href="{p}articles.html"{cls('articles')}>Articles</a><a href="{p}support-us.html"{cls('support')}>Support Us</a><a href="{p}contact.html"{cls('contact')}>Contact</a></nav>
</div>
<div class="header-actions">
<a class="icon-btn" href="https://www.instagram.com/projectpulmonary?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener" aria-label="Project Pulmonary on Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1"/></svg></a>
<a class="btn btn-outline" href="{p}support-us.html">Support Us</a>
</div>
</div>
</header>
"""


def final_cta_html(p):
    return f"""<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="final-cta rv-scale">
      <div class="wrap">
        <span class="eyebrow on-navy">Get involved</span>
        <h2>Join a chapter, start one, or support the mission directly.</h2>
        <p>Whether you volunteer at a school drive, launch a chapter, or contribute resources, there are multiple ways to take part in Project Pulmonary.</p>
        <div class="hero-cta">
          <a class="btn btn-brand" href="{p}join-us.html">Get Involved</a>
        </div>
      </div>
    </div>
  </div>
</section>
"""


def footer_html(p):
    return f"""<footer class="footer">
<div class="wrap">
<div class="footer-top">
<div class="rv">
<div class="brand"><img class="brand-logo" src="{p}assets/images/logo-square.png" alt="Project Pulmonary logo"><span>PROJECT&nbsp;PULMONARY</span></div>
<p class="footer-lede">A youth-led 501(c)(3) nonprofit protecting the people who protect us through pulmonary-health education, hydration drives, Letters for Lungs, and student-led chapters nationwide.</p>
<div class="footer-socials">
<a class="icon-btn" href="https://linktr.ee/projectpulmonary" target="_blank" rel="noopener" aria-label="Linktree"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M9 7h8v8"/></svg></a>
<a class="icon-btn" href="https://www.instagram.com/projectpulmonary?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1"/></svg></a>
</div>
</div>
<div class="rv d1">
<h4>Navigate</h4>
<ul>
<li><a href="{p}about.html">About</a></li>
<li><a href="{p}impact.html">Impact</a></li>
<li><a href="{p}press.html">Press</a></li>
<li><a href="{p}articles.html">Articles</a></li>
<li><a href="{p}faq.html">FAQs</a></li>
</ul>
</div>
<div class="rv d2">
<h4>Get involved</h4>
<ul>
<li><a href="{p}join-us.html#chapter-application-section">Start a chapter</a></li>
<li><a href="{p}join-us.html#ways">Volunteer</a></li>
<li><a href="{p}support-us.html">Support Us</a></li>
</ul>
</div>
<div class="rv d3">
<h4>Contact</h4>
<ul>
<li><a href="mailto:projectpulmonary@gmail.com">projectpulmonary@gmail.com</a></li>
</ul>
</div>
</div>
<div class="footer-bottom">
<span>&copy; 2026 Project Pulmonary. All rights reserved.</span>
<span>501(c)(3) nonprofit organization</span>
</div>
</div>
</footer>
<script src="{p}assets/js/main.js"></script>
"""


MARQUEE_HTML = """<div class="marquee-head">
  <span class="eyebrow" style="justify-content:center">Backed &amp; Funded By</span>
  <p>Project Pulmonary's programs are made possible with support from these partners.</p>
</div>
<div class="marquee">
  <div class="marquee-track">
    <span class="marquee-plate"><img src="assets/images/sponsors/coffee-bean.png" alt="The Coffee Bean & Tea Leaf" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="sponsor-fallback">Coffee Bean</span></span>
    <span class="marquee-plate plate-dark"><img src="assets/images/sponsors/mathnasium.png" alt="Mathnasium" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="sponsor-fallback">Mathnasium</span></span>
    <span class="marquee-plate"><img src="assets/images/sponsors/c2-education.png" alt="C2 Education" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="sponsor-fallback">C2 Education</span></span>
    <span class="marquee-plate"><img src="assets/images/sponsors/rhapsody-education.png" alt="Rhapsody Education" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="sponsor-fallback">Rhapsody Education</span></span>
    <span class="marquee-plate"><img src="assets/images/sponsors/american-lung-association.png" alt="American Lung Association" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="sponsor-fallback">American Lung Association</span></span>
    <span class="marquee-plate"><img src="assets/images/sponsors/origami-for-good.png" alt="Origami for Good" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="sponsor-fallback">Origami for Good</span></span>
    <span class="marquee-plate"><img src="assets/images/sponsors/apricus-literacy.png" alt="Apricus Literacy" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="sponsor-fallback">Apricus Literacy</span></span>
    <span class="marquee-plate"><img src="assets/images/sponsors/coffee-bean.png" alt="The Coffee Bean & Tea Leaf" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="sponsor-fallback">Coffee Bean</span></span>
    <span class="marquee-plate plate-dark"><img src="assets/images/sponsors/mathnasium.png" alt="Mathnasium" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="sponsor-fallback">Mathnasium</span></span>
    <span class="marquee-plate"><img src="assets/images/sponsors/c2-education.png" alt="C2 Education" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="sponsor-fallback">C2 Education</span></span>
    <span class="marquee-plate"><img src="assets/images/sponsors/rhapsody-education.png" alt="Rhapsody Education" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="sponsor-fallback">Rhapsody Education</span></span>
    <span class="marquee-plate"><img src="assets/images/sponsors/american-lung-association.png" alt="American Lung Association" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="sponsor-fallback">American Lung Association</span></span>
    <span class="marquee-plate"><img src="assets/images/sponsors/origami-for-good.png" alt="Origami for Good" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="sponsor-fallback">Origami for Good</span></span>
    <span class="marquee-plate"><img src="assets/images/sponsors/apricus-literacy.png" alt="Apricus Literacy" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="sponsor-fallback">Apricus Literacy</span></span>
  </div>
</div>
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
<title>Project Pulmonary | Articles</title>
<meta name="description" content="Research articles from the Project Pulmonary team on wildfire smoke exposure, biomarkers, and firefighter lung health.">
<meta name="theme-color" content="#100D28">
<meta property="og:title" content="Project Pulmonary | Articles">
<meta property="og:description" content="Research articles from the Project Pulmonary team on wildfire smoke exposure, biomarkers, and firefighter lung health.">
<meta property="og:type" content="website">
<meta property="og:image" content="https://www.projectpulmonary.com/assets/images/hero-firestation.jpeg">
<meta property="og:url" content="https://www.projectpulmonary.com/articles.html">
<link rel="canonical" href="https://www.projectpulmonary.com/articles.html">
<link rel="icon" href="assets/images/logo-square.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="assets/css/style.css">
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"NGO","name":"Project Pulmonary","email":"projectpulmonary@gmail.com","sameAs":["https://linktr.ee/projectpulmonary","https://www.instagram.com/projectpulmonary?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="]}}</script>
</head>
<body>
{header_html("", "articles")}
<main id="main">

<section class="page-hero">
  <div class="wrap page-hero-grid">
    <div class="rv">
      <span class="eyebrow">Research &amp; Articles</span>
      <h1>The science behind why firefighter lung health can't wait.</h1>
      <p class="lede">Original research write-ups from the Project Pulmonary team, translating peer-reviewed studies on wildfire smoke exposure into plain-language explainers.</p>
    </div>
    <div class="page-hero-media rv-r"><img src="assets/images/hero-firestation.jpeg" alt="Project Pulmonary students and firefighters standing in front of a fire truck"></div>
  </div>
</section>

<section class="section" style="padding-top:0">
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
<title>{esc(title)} | Project Pulmonary</title>
<meta name="description" content="{esc_attr(excerpt)}">
<meta name="theme-color" content="#100D28">
<meta property="og:title" content="{esc_attr(title)} | Project Pulmonary">
<meta property="og:description" content="{esc_attr(excerpt)}">
<meta property="og:type" content="article">
<meta property="og:image" content="https://www.projectpulmonary.com/assets/images/hero-firestation.jpeg">
<meta property="og:url" content="https://www.projectpulmonary.com/articles/{esc_attr(slug)}.html">
<link rel="canonical" href="https://www.projectpulmonary.com/articles/{esc_attr(slug)}.html">
<link rel="icon" href="../assets/images/logo-square.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="../assets/css/style.css">
<script type="application/ld+json">{{"@context":"https://schema.org","@type":"Article","headline":"{esc_attr(title)}","author":{{"@type":"Person","name":"{esc_attr(article.get('authorName', ''))}"}},"publisher":{{"@type":"Organization","name":"Project Pulmonary"}}}}</script>
</head>
<body>
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
