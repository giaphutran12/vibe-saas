import Prism from "prismjs";
import { useEffect, useRef } from "react";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-typescript";
import "./code-theme.css";

interface Props {
  code: string;
  lang: string;
}
export const CodeView = ({ code, lang }: Props) => {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [code]);

  return (
    <pre className="p-2 bg-transparent border-none rounded-none m-0 text-xs">
      <code ref={codeRef} className={`language-${lang}`}>
        {code}
      </code>
    </pre>
  );
};
