/**
 * Renders text with simple markdown-like formatting:
 * - **bold** → <strong>
 * - Preserves newlines as <br/>
 * - • bullet points get indent styling
 */
export default function MarkdownText({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.split("\n");

  return (
    <div className={className}>
      {lines.map((line, i) => {
        const isBullet = line.trimStart().startsWith("•") || line.trimStart().startsWith("-");
        const content = renderInline(line);

        if (line.trim() === "") {
          return <div key={i} className="h-2" />;
        }

        return (
          <p
            key={i}
            className={`text-sm leading-relaxed ${
              isBullet ? "pl-2 text-muted-foreground" : "text-foreground"
            }`}
          >
            {content}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    parts.push(
      <strong key={match.index} className="font-bold text-foreground">
        {match[1]}
      </strong>
    );
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return parts;
}
