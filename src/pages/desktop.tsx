import {useEffect, useState} from 'react';
import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useHistory} from '@docusaurus/router';
import {translate} from '@docusaurus/Translate';
import {DesktopShell} from '@site/src/components/desktop/DesktopShell';

function isMobileLike(): boolean {
  return (
    /Android|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && window.matchMedia('(pointer: coarse)').matches)
  );
}

function DesktopGate(): ReactNode {
  const history = useHistory();
  const [blocked] = useState(() => isMobileLike());

  useEffect(() => {
    if (blocked) {
      history.replace('/mini-apps');
    }
  }, [blocked, history]);

  if (blocked) {
    return null;
  }
  return <DesktopShell />;
}

export default function DesktopPage(): ReactNode {
  return (
    <Layout
      noFooter
      title={translate({id: 'desktop.pageTitle', message: 'デスクトップ'})}
      description={translate({
        id: 'desktop.pageDescription',
        message: 'ミニアプリをデスクトップ風の画面で使う。',
      })}
    >
      <BrowserOnly>{() => <DesktopGate />}</BrowserOnly>
    </Layout>
  );
}
