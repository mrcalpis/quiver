import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string
}

export default function MarkdownPreview({ content }: Props) {
  return (
    <div className="prose prose-invert prose-sm max-w-none px-6 py-4 text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-foreground mb-3 mt-0 border-b border-border pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold text-foreground mt-5 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-sm text-foreground/90 mb-3 leading-relaxed">{children}</p>
          ),
          code: ({ children, className, ...props }) => {
            const isBlock = className?.startsWith('language-')
            return isBlock ? (
              <code
                className="block bg-secondary text-foreground text-xs p-3 rounded-md font-mono overflow-x-auto"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code
                className="bg-secondary text-primary text-xs px-1 rounded font-mono"
                {...props}
              >
                {children}
              </code>
            )
          },
          pre: ({ children }) => <pre className="bg-secondary rounded-md overflow-hidden mb-4">{children}</pre>,
          ul: ({ children }) => <ul className="list-disc list-inside text-sm space-y-1 mb-3">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside text-sm space-y-1 mb-3">{children}</ol>,
          li: ({ children }) => <li className="text-foreground/90">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary pl-3 italic text-muted-foreground mb-3">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-border my-4" />,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          a: ({ href, children }) => (
            <a href={href} className="text-primary underline" target="_blank" rel="noreferrer">
              {children}
            </a>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
