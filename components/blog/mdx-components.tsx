import type { MDXComponents } from "mdx/types";

export const blogMdxComponents: MDXComponents = {
  h2: (props) => <h2 className="mt-8 mb-3 text-xl font-semibold" {...props} />,
  h3: (props) => <h3 className="mt-6 mb-2 text-lg font-semibold" {...props} />,
  p: (props) => <p className="mb-4 text-muted-foreground" {...props} />,
  ul: (props) => <ul className="mb-4 list-disc pl-5 text-muted-foreground" {...props} />,
  ol: (props) => <ol className="mb-4 list-decimal pl-5 text-muted-foreground" {...props} />,
  li: (props) => <li className="mb-1" {...props} />,
  a: (props) => <a className="text-primary underline underline-offset-4" {...props} />,
  strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
  table: (props) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props) => <th className="border-b p-2 text-left font-semibold" {...props} />,
  td: (props) => <td className="border-b p-2 text-muted-foreground" {...props} />,
};
