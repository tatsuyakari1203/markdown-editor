import React, { useMemo, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import remarkToc from 'remark-toc'
import remarkWikiLink from 'remark-wiki-link'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import { defaultSchema } from 'hast-util-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeKatex from 'rehype-katex'
import CodeBlock from './CodeBlock'
import './MarkdownPreview.css'
import 'katex/dist/katex.min.css'

interface MarkdownPreviewProps {
  markdown: string
  isDarkMode: boolean
  previewRef?: React.MutableRefObject<HTMLDivElement | null>
}

/**
 * Optimized MarkdownPreview Component using react-markdown
 * 
 * Performance improvements:
 * - Direct AST rendering without dangerouslySetInnerHTML
 * - No DOM manipulation or useEffect for post-processing
 * - React manages DOM updates efficiently
 * - Eliminates layout shift issues
 * - Better security with built-in XSS protection
 * - Custom renderers for seamless component integration
 */

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ 
  markdown, 
  isDarkMode, 
  previewRef: externalPreviewRef 
}) => {
  const internalPreviewRef = useRef<HTMLDivElement>(null)
  const previewRef = externalPreviewRef || internalPreviewRef

  // Memoize plugins configuration
  const remarkPlugins = useMemo(() => [
    remarkGfm,
    remarkBreaks,
    remarkMath,
    remarkToc,
    [remarkWikiLink, {
      pageResolver: (name: string) => [name.replace(/ /g, '_').toLowerCase()],
      hrefTemplate: (permalink: string) => `#/page/${permalink}`,
      wikiLinkClassName: 'wiki-link',
      newClassName: 'wiki-link-new'
    }]
  ], [])

  const rehypePlugins = useMemo(() => {
    // Create a custom schema that allows KaTeX elements
    const katexSchema = {
      ...defaultSchema,
      tagNames: [
        ...defaultSchema.tagNames || [],
        'math',
        'semantics',
        'mrow',
        'mi',
        'mo',
        'mn',
        'mfrac',
        'msup',
        'msub',
        'msubsup',
        'msqrt',
        'mroot',
        'mtext',
        'mspace',
        'mtable',
        'mtr',
        'mtd',
        'mover',
        'munder',
        'munderover',
        'annotation'
      ],
      attributes: {
        ...defaultSchema.attributes,
        '*': [
          ...(defaultSchema.attributes?.['*'] || []),
          'className',
          'style'
        ],
        math: ['display'],
        semantics: [],
        mrow: [],
        mi: ['mathvariant'],
        mo: ['stretchy', 'fence', 'separator', 'lspace', 'rspace'],
        mn: [],
        mfrac: ['linethickness'],
        msup: [],
        msub: [],
        msubsup: [],
        msqrt: [],
        mroot: [],
        mtext: [],
        mspace: ['width', 'height', 'depth'],
        mtable: ['columnalign', 'rowalign'],
        mtr: [],
        mtd: ['columnspan', 'rowspan'],
        mover: ['accent'],
        munder: ['accentunder'],
        munderover: ['accent', 'accentunder'],
        annotation: ['encoding']
      }
    }

    return [
      rehypeRaw,
      rehypeSlug,
      [rehypeAutolinkHeadings, {
        behavior: 'wrap',
        properties: {
          className: ['heading-link']
        }
      }],
      [rehypeSanitize, katexSchema],
      rehypeKatex
    ]
  }, [])

  // Custom components for rendering different markdown elements
  const components = useMemo(() => ({
    // Code blocks with syntax highlighting
    code: ({ node, inline, className, children, ...props }: any) => {
      // Check if this is inline code (single backticks) vs code block (triple backticks)
      const isInline = inline === true || !className?.includes('language-')
      
      if (isInline) {
        return (
          <code 
            className={`inline-code px-1.5 py-0.5 rounded text-sm font-mono ${
              isDarkMode 
                ? 'bg-gray-700 text-gray-200' 
                : 'bg-gray-100 text-gray-800'
            }`} 
            {...props}
          >
            {children}
          </code>
        )
      }
      
      // This is a code block
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : 'text'
      const code = String(children).replace(/\n$/, '')
      
      return (
        <CodeBlock
          code={code}
          language={language}
          isDarkMode={isDarkMode}
          showLineNumbers={true}
        />
      )
    },
    
    // Enhanced links
    a: ({ href, children, ...props }: any) => {
      const isExternal = href?.startsWith('http')
      return (
        <a
          href={href}
          className={`markdown-link text-blue-600 hover:text-blue-800 underline ${
            isDarkMode ? 'text-blue-400 hover:text-blue-300' : ''
          }`}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          {...props}
        >
          {children}
        </a>
      )
    },
    
    // Enhanced tables
    table: ({ children, ...props }: any) => (
      <div className="table-wrapper overflow-x-auto my-4">
        <table 
          className={`markdown-table w-full border-collapse ${
            isDarkMode 
              ? 'border-gray-600' 
              : 'border-gray-300'
          }`}
          {...props}
        >
          {children}
        </table>
      </div>
    ),
    
    th: ({ children, ...props }: any) => (
      <th 
        className={`border px-4 py-2 text-left font-semibold ${
          isDarkMode 
            ? 'border-gray-600 bg-gray-700' 
            : 'border-gray-300 bg-gray-50'
        }`}
        {...props}
      >
        {children}
      </th>
    ),
    
    td: ({ children, ...props }: any) => (
      <td 
        className={`border px-4 py-2 ${
          isDarkMode 
            ? 'border-gray-600' 
            : 'border-gray-300'
        }`}
        {...props}
      >
        {children}
      </td>
    ),
    
    // Enhanced blockquotes
    blockquote: ({ children, ...props }: any) => (
      <blockquote 
        className={`markdown-blockquote border-l-4 pl-4 py-2 my-4 italic ${
          isDarkMode 
            ? 'border-gray-500 bg-gray-800/30 text-gray-300' 
            : 'border-gray-400 bg-gray-50 text-gray-700'
        }`}
        {...props}
      >
        {children}
      </blockquote>
    ),
    
    // Enhanced images
    img: ({ src, alt, ...props }: any) => (
      <img 
        src={src}
        alt={alt}
        className="markdown-image max-w-full h-auto rounded-lg shadow-sm my-4"
        loading="eager"
        {...props}
      />
    ),
    
    // Enhanced headings
    h1: ({ children, ...props }: any) => (
      <h1 
        className={`text-3xl font-bold mb-4 mt-6 pb-2 border-b ${
          isDarkMode 
            ? 'border-gray-600 text-gray-100' 
            : 'border-gray-300 text-gray-900'
        }`}
        {...props}
      >
        {children}
      </h1>
    ),
    
    h2: ({ children, ...props }: any) => (
      <h2 
        className={`text-2xl font-semibold mb-3 mt-5 pb-1 border-b ${
          isDarkMode 
            ? 'border-gray-700 text-gray-100' 
            : 'border-gray-200 text-gray-900'
        }`}
        {...props}
      >
        {children}
      </h2>
    ),
    
    h3: ({ children, ...props }: any) => (
      <h3 
        className={`text-xl font-semibold mb-2 mt-4 ${
          isDarkMode ? 'text-gray-100' : 'text-gray-900'
        }`}
        {...props}
      >
        {children}
      </h3>
    ),
    
    // Enhanced paragraphs
    p: ({ children, ...props }: any) => (
      <p 
        className={`mb-4 leading-relaxed ${
          isDarkMode ? 'text-gray-200' : 'text-gray-800'
        }`}
        {...props}
      >
        {children}
      </p>
    ),
    
    // Enhanced lists
    ul: ({ children, ...props }: any) => (
      <ul 
        className={`list-disc list-inside mb-4 space-y-1 ${
          isDarkMode ? 'text-gray-200' : 'text-gray-800'
        }`}
        {...props}
      >
        {children}
      </ul>
    ),
    
    ol: ({ children, ...props }: any) => (
      <ol 
        className={`list-decimal list-inside mb-4 space-y-1 ${
          isDarkMode ? 'text-gray-200' : 'text-gray-800'
        }`}
        {...props}
      >
        {children}
      </ol>
    ),
    
    li: ({ children, ...props }: any) => (
      <li className="mb-1" {...props}>
        {children}
      </li>
    ),

    // Wiki links styling
    wikiLink: ({ children, href, className, ...props }: any) => (
      <a
        href={href}
        className={`wiki-link ${className || ''}`}
        {...props}
      >
        {children}
      </a>
    )
  }), [isDarkMode])

  // Memoize class names for better performance
  const previewClassName = useMemo(() => 
    `flex-1 p-6 pb-16 overflow-auto markdown-preview-content transition-colors duration-300 ${
      isDarkMode 
        ? 'dark bg-transparent text-gray-100' 
        : 'light bg-transparent text-gray-900'
    }`, [isDarkMode]
  )

  const statusClassName = useMemo(() => 
    `px-4 py-2 border-t text-xs flex justify-between transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-gray-800/50 border-gray-600 text-gray-400' 
        : 'bg-gray-50/50 border-gray-200 text-gray-500'
    }`, [isDarkMode]
  )

  // Memoize current time to avoid unnecessary re-renders
  const currentTime = useMemo(() => new Date().toLocaleTimeString(), [markdown])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div 
        ref={previewRef}
        className={previewClassName}
      >
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={components}
        >
          {markdown}
        </ReactMarkdown>
      </div>
      
      {/* Preview Status */}
      <div className={statusClassName}>
        <span>Preview rendered</span>
        <span>{currentTime}</span>
      </div>
    </div>
  )
}

export default MarkdownPreview
