import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

function check(search: string): void {
  if (new URLSearchParams(search).get('embed') === '1') {
    document.documentElement.setAttribute('data-embed', '1');
  }
}

if (ExecutionEnvironment.canUseDOM) {
  check(window.location.search);
}

export function onRouteDidUpdate({location}: {location: {search: string}}): void {
  check(location.search);
}
