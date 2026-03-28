import React from 'react';
import CodeBlock from '@theme-original/CodeBlock';
import type {Props} from '@theme/CodeBlock';

export default function CodeBlockWrapper(props: Props) {
  return <CodeBlock showLineNumbers {...props} />;
}
