import React, {useEffect, useState} from 'react';
import clsx from 'clsx';
import useIsBrowser from '@docusaurus/useIsBrowser';
import Translate from '@docusaurus/Translate';

export default function FontSwitcher(): JSX.Element | null {
  const isBrowser = useIsBrowser();
  const [font, setFont] = useState('default');

  useEffect(() => {
    if (isBrowser) {
      const savedFont = localStorage.getItem('theme-font') || 'default';
      setFont(savedFont);
      if (savedFont !== 'default') {
        document.documentElement.setAttribute('data-font', savedFont);
      }
    }
  }, [isBrowser]);

  const changeFont = (newFont: string) => {
    setFont(newFont);
    if (newFont === 'default') {
      document.documentElement.removeAttribute('data-font');
      localStorage.removeItem('theme-font');
    } else {
      document.documentElement.setAttribute('data-font', newFont);
      localStorage.setItem('theme-font', newFont);
    }
  };

  if (!isBrowser) {
    return null;
  }

  return (
    <div className="navbar__item dropdown dropdown--hoverable dropdown--right">
      <a
        className="navbar__link"
        href="#"
        onClick={(e) => e.preventDefault()}
        style={{display: 'flex', alignItems: 'center'}}>
        <span><Translate id="theme.fontSwitcher.label">フォント</Translate></span>
      </a>
      <ul className="dropdown__menu">
        <li>
          <a
            className={clsx('dropdown__link', {
              'dropdown__link--active': font === 'default',
            })}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              changeFont('default');
            }}>
            <Translate id="theme.fontSwitcher.default">標準</Translate>
          </a>
        </li>
        <li>
          <a
            className={clsx('dropdown__link', {
              'dropdown__link--active': font === 'ud-digi',
            })}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              changeFont('ud-digi');
            }}>
            <Translate id="theme.fontSwitcher.udDigi">UD デジタル 教科書体</Translate>
          </a>
        </li>
      </ul>
    </div>
  );
}
