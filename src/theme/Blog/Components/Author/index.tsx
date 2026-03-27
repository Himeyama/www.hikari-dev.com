import React, {type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import type {Props} from '@theme/Blog/Components/Author';

export default function BlogAuthor({author}: Props): ReactNode {
  const {name, url, email, page} = author;
  const link = page?.permalink || url || (email && `mailto:${email}`) || undefined;

  if (!name) return null;

  return (
    <div className="avatar margin-bottom--sm">
      <div className="avatar__intro">
        <div className="avatar__name">
          {link ? <Link href={link}>{name}</Link> : <span>{name}</span>}
        </div>
      </div>
    </div>
  );
}
