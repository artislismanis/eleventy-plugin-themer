import { escapeHtml, escapeCssValue, safeUrl } from './escape.mjs';

// Simple shortcodes (non-paired)
export default {};

// Paired shortcodes (have opening and closing tags with content between)
export const pairedShortcodes = {
  /**
   * Content Grid - Creates a responsive grid layout for content boxes
   *
   * Usage:
   * {% contentGrid cols=3, gap="1rem" %}
   *   {% box title="Feature 1" %}Content{% endbox %}
   * {% endcontentGrid %}
   *
   * @param {string} content - The inner content (box shortcodes)
   * @param {Object} options - Configuration options
   * @param {number} options.cols - Number of columns (default: 3)
   * @param {string} options.gap - Gap between items (default: "1rem")
   * @param {string} options.className - Additional CSS class
   */
  contentGrid: function (content, { cols = 3, gap = '1rem', className = '' } = {}) {
    return `<div class="content-grid ${escapeHtml(className)}" style="--grid-cols: ${Number(cols)}; --grid-gap: ${escapeCssValue(gap)};">
	${content}
</div>`;
  },

  /**
   * Box - A content box for use within contentGrid
   *
   * Usage:
   * {% box title="Feature", link="/path", linkText="Learn More" %}
   *   Description content here
   * {% endbox %}
   *
   * @param {string} content - The box content
   * @param {Object} options - Configuration options
   * @param {string} options.title - Box heading
   * @param {string} options.link - URL for the call-to-action link
   * @param {string} options.linkText - Text for the link (default: "Learn More")
   * @param {number} options.span - Number of grid columns to span (default: 1).
   *   Combine unequal spans within a contentGrid for layouts like 2/3 + 1/3
   *   (cols=3, spans 2 and 1) or 1/4 + 3/4 (cols=4, spans 1 and 3).
   * @param {string} options.className - Additional CSS class
   */
  box: function (
    content,
    { title = '', link = '', linkText = 'Learn More', span = 0, className = '' } = {},
  ) {
    const safeLink = link ? escapeHtml(safeUrl(link)) : '';
    const linkHtml = safeLink
      ? `<a href="${safeLink}" class="content-box__link">${escapeHtml(linkText)}</a>`
      : '';
    const spanStyle = Number(span) > 0 ? ` style="grid-column: span ${Number(span)};"` : '';

    return `<div class="content-box ${escapeHtml(className)}"${spanStyle}>
	${title ? `<h3 class="content-box__title">${escapeHtml(title)}</h3>` : ''}
	<div class="content-box__content">${content}</div>
	${linkHtml}
</div>`;
  },

  /**
   * Hero - A hero section with title, subtitle, and action buttons
   *
   * Usage:
   * {% hero title="Welcome", subtitle="A great subtitle", background="/images/hero.jpg" %}
   *   {% heroButton url="/start", variant="primary" %}Get Started{% endheroButton %}
   * {% endhero %}
   *
   * @param {string} content - Inner content (usually heroButton shortcodes)
   * @param {Object} options - Configuration options
   * @param {string} options.title - Main heading
   * @param {string} options.subtitle - Subtitle/blurb
   * @param {string} options.background - Background image URL
   * @param {string} options.backgroundColor - Background color (fallback)
   * @param {string} options.align - Text alignment: left, center, right (default: center)
   * @param {string} options.height - Minimum height (default: auto)
   * @param {boolean} options.overlay - Show dark overlay on background image (default: true)
   * @param {string} options.className - Additional CSS class
   */
  hero: function (content, options = {}) {
    const {
      title = '',
      subtitle = '',
      background = '',
      backgroundColor = '',
      align = 'center',
      height = 'auto',
      overlay = true,
      className = '',
    } = options;

    let styleStr = '';
    if (background) {
      styleStr += `background-image: url('${escapeCssValue(background)}');`;
    } else if (backgroundColor) {
      styleStr += `background-color: ${escapeCssValue(backgroundColor)};`;
    }
    if (height !== 'auto') {
      styleStr += ` --hero-height: ${escapeCssValue(height)};`;
    }

    const safeAlign = escapeCssValue(align);
    const overlayClass = background && overlay ? 'hero--overlay' : '';

    return `<section class="hero hero--${safeAlign} ${overlayClass} ${escapeHtml(className)}" style="${styleStr}">
	<div class="hero__content">
		${title ? `<h1 class="hero__title">${escapeHtml(title)}</h1>` : ''}
		${subtitle ? `<p class="hero__subtitle">${escapeHtml(subtitle)}</p>` : ''}
		${content ? `<div class="hero__actions">${content}</div>` : ''}
	</div>
</section>`;
  },

  /**
   * Hero Button - An action button for use within hero sections
   *
   * Usage:
   * {% heroButton url="/path", variant="primary" %}Button Text{% endheroButton %}
   *
   * @param {string} content - Button text
   * @param {Object} options - Configuration options
   * @param {string} options.url - Link URL
   * @param {string} options.variant - Button style: primary, secondary (default: primary)
   * @param {string} options.className - Additional CSS class
   */
  heroButton: function (content, { url = '#', variant = 'primary', className = '' } = {}) {
    return `<a href="${escapeHtml(safeUrl(url))}" class="hero__button hero__button--${escapeHtml(variant)} ${escapeHtml(className)}">${content}</a>`;
  },
};
