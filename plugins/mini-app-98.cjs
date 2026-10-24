// Scope the upstream stylesheet at build time, including its media-query rules.
// Keep the original asset paths so the bundler can include the bundled fonts.
module.exports = function miniApp98() {
  return {
    name: 'mini-app-98',
    configurePostCss(options) {
      options.plugins.push({
        postcssPlugin: 'scope-98-css',
        Once(root) {
          if (!/[\\/]98\.css[\\/]dist[\\/]98\.css$/.test(root.source?.input.file ?? '')) return;
          root.walkRules((rule) => {
            // Existing apps use both wrapping and adjacent labels. Preserve native
            // checkboxes/radios rather than hiding inputs without an adjacent label.
            const selectors = rule.selectors.filter((selector) =>
              !/^(body|h[1-6]|label)$/.test(selector) &&
              !/\[type=(checkbox|radio)\]/.test(selector));
            if (!selectors.length) {
              rule.remove();
              return;
            }
            rule.selectors = selectors.flatMap((selector) => {
              const scoped = `html body .mini-app-98 ${selector}`;
              // Viewport scrollbars belong to <html>, outside the app wrapper.
              // :has also removes this styling immediately on non-app routes.
              return selector.startsWith('::-webkit-scrollbar')
                ? [`html:has(.mini-app-98)${selector}`, scoped]
                : [scoped];
            });
          });
        },
      });
      return options;
    },
  };
};
