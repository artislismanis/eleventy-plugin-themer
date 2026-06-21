import { describe, it, expect } from 'vitest';

import { pairedShortcodes } from '../../lib/shortcodes.mjs';

describe('shortcodes.mjs', () => {
  describe('paired shortcodes', () => {
    describe('contentGrid', () => {
      it('should create grid with default options', () => {
        const result = pairedShortcodes.contentGrid('<div>content</div>');

        expect(result).toContain('class="content-grid');
        expect(result).toContain('--grid-cols: 3');
        expect(result).toContain('--grid-gap: 1rem');
        expect(result).toContain('<div>content</div>');
      });

      it('should use custom columns and gap', () => {
        const result = pairedShortcodes.contentGrid('<div>content</div>', {
          cols: 4,
          gap: '2rem',
        });

        expect(result).toContain('--grid-cols: 4');
        expect(result).toContain('--grid-gap: 2rem');
      });

      it('should include custom className', () => {
        const result = pairedShortcodes.contentGrid('<div>content</div>', {
          className: 'custom-grid',
        });

        expect(result).toContain('custom-grid');
      });
    });

    describe('box', () => {
      it('should create box with content', () => {
        const result = pairedShortcodes.box('Box content');

        expect(result).toContain('class="content-box');
        expect(result).toContain('Box content');
      });

      it('should include title when provided', () => {
        const result = pairedShortcodes.box('Content', { title: 'Box Title' });

        expect(result).toContain('<h3 class="content-box__title">Box Title</h3>');
      });

      it('should not include title element when not provided', () => {
        const result = pairedShortcodes.box('Content');

        expect(result).not.toContain('content-box__title');
      });

      it('should add a grid-column span when span is provided', () => {
        const result = pairedShortcodes.box('Content', { span: 2 });

        expect(result).toContain('style="grid-column: span 2;"');
      });

      it('should not add a span style by default', () => {
        const result = pairedShortcodes.box('Content');

        expect(result).not.toContain('grid-column');
      });

      it('should coerce span to a number (no injection)', () => {
        const result = pairedShortcodes.box('Content', { span: '2; color:red' });

        expect(result).not.toContain('color:red');
      });

      it('should include link when provided', () => {
        const result = pairedShortcodes.box('Content', {
          link: '/path',
          linkText: 'Click Here',
        });

        expect(result).toContain('href="/path"');
        expect(result).toContain('Click Here');
      });

      it('should use default link text', () => {
        const result = pairedShortcodes.box('Content', { link: '/path' });

        expect(result).toContain('Learn More');
      });

      it('should not include link when not provided', () => {
        const result = pairedShortcodes.box('Content');

        expect(result).not.toContain('content-box__link');
      });
    });

    describe('hero', () => {
      it('should create hero section with title and subtitle', () => {
        const result = pairedShortcodes.hero('', {
          title: 'Welcome',
          subtitle: 'A great site',
        });

        expect(result).toContain('class="hero');
        expect(result).toContain('<h1 class="hero__title">Welcome</h1>');
        expect(result).toContain('<p class="hero__subtitle">A great site</p>');
      });

      it('should include background image', () => {
        const result = pairedShortcodes.hero('', {
          background: '/images/hero.jpg',
        });

        expect(result).toContain("background-image: url('/images/hero.jpg')");
        expect(result).toContain('hero--overlay');
      });

      it('should not include overlay when disabled', () => {
        const result = pairedShortcodes.hero('', {
          background: '/images/hero.jpg',
          overlay: false,
        });

        expect(result).not.toContain('hero--overlay');
      });

      it('should use background color when no image', () => {
        const result = pairedShortcodes.hero('', {
          backgroundColor: '#333',
        });

        expect(result).toContain('background-color: #333');
      });

      it('should set alignment class', () => {
        const resultLeft = pairedShortcodes.hero('', { align: 'left' });
        const resultRight = pairedShortcodes.hero('', { align: 'right' });

        expect(resultLeft).toContain('hero--left');
        expect(resultRight).toContain('hero--right');
      });

      it('should set custom height', () => {
        const result = pairedShortcodes.hero('', { height: '80vh' });

        expect(result).toContain('--hero-height: 80vh');
      });

      it('should include content in actions div', () => {
        const result = pairedShortcodes.hero('<a href="#">Button</a>');

        expect(result).toContain('class="hero__actions"');
        expect(result).toContain('<a href="#">Button</a>');
      });
    });

    // Security tests - XSS prevention
    describe('security: XSS prevention', () => {
      it('contentGrid should escape className to prevent attribute injection', () => {
        const result = pairedShortcodes.contentGrid('<div>content</div>', {
          className: '" onmouseover="alert(1)',
        });

        // The output should have double quotes escaped so the attribute can't be broken out of
        // The &quot; prevents the class attribute from being closed prematurely
        expect(result).toContain('&quot;');
        // Ensure no unescaped double quote from className breaks the attribute
        expect(result).not.toMatch(/class="content-grid " onmouseover/);
      });

      it('box should reject javascript: protocol in link', () => {
        const result = pairedShortcodes.box('Content', {
          link: 'javascript:alert(1)',
          linkText: 'Click',
        });

        expect(result).not.toContain('javascript:');
      });

      it('heroButton should reject javascript: protocol in url', () => {
        const result = pairedShortcodes.heroButton('Click', {
          url: 'javascript:void(0)',
        });

        expect(result).not.toContain('javascript:');
      });

      it('hero should escape CSS injection in background', () => {
        const result = pairedShortcodes.hero('', {
          background: "'); background: url('data:text/html,<script>alert(1)</script>",
        });

        // The output should have the background value properly escaped
        expect(result).not.toContain('<script>');
      });

      it('box should escape HTML in title', () => {
        const result = pairedShortcodes.box('Content', {
          title: '<script>alert("xss")</script>',
        });

        expect(result).not.toContain('<script>alert');
      });

      it('hero should escape HTML in title and subtitle', () => {
        const result = pairedShortcodes.hero('', {
          title: '<img src=x onerror=alert(1)>',
          subtitle: '<script>alert(2)</script>',
        });

        expect(result).not.toContain('<img src=x');
        expect(result).toContain('&lt;img');
        expect(result).not.toContain('<script>alert');
      });

      it('box should reject data: protocol in link', () => {
        const result = pairedShortcodes.box('Content', {
          link: 'data:text/html,<script>alert(1)</script>',
        });

        expect(result).not.toContain('data:text/html');
      });
    });

    describe('heroButton', () => {
      it('should create button with default options', () => {
        const result = pairedShortcodes.heroButton('Click Me');

        expect(result).toContain('href="#"');
        expect(result).toContain('hero__button--primary');
        expect(result).toContain('Click Me');
      });

      it('should use custom URL', () => {
        const result = pairedShortcodes.heroButton('Click', { url: '/custom' });

        expect(result).toContain('href="/custom"');
      });

      it('should apply variant class', () => {
        const result = pairedShortcodes.heroButton('Click', { variant: 'secondary' });

        expect(result).toContain('hero__button--secondary');
      });

      it('should include custom className', () => {
        const result = pairedShortcodes.heroButton('Click', { className: 'special-btn' });

        expect(result).toContain('special-btn');
      });
    });
  });
});
