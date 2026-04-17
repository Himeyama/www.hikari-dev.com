import type { ReactNode } from 'react';
import Layout from '@theme/Layout';
import { translate } from '@docusaurus/Translate';
import HikariChat from '../components/Chat';

export default function ChatPage(): ReactNode {
  return (
    <Layout
      title={translate({ id: 'chat.title', message: 'ひかりチャット' })}
      description={translate({
        id: 'chat.description',
        message: 'AI と対話できるチャット',
      })}
      wrapperClassName="chat-page-wrapper"
    >
      <HikariChat />
    </Layout>
  );
}
