import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

export function renderMarkdown(source: string): string {
  const html = marked.parse(source, { async: false, breaks: true, gfm: true })
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'em', 'del', 'a', 'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre', 'hr'],
    allowedAttributes: { a: ['href', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      h1: 'h2',
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
    },
  })
}
