// Keep the lazy codec and its pinned binary in the same deployed asset.
// A cached JS chunk must never refer to a separately missing root-level WASM file.
module.exports = function mochidashiRaptorQ() {
  return {
    name: 'mochidashi-raptorq',
    configureWebpack() {
      return {module: {rules: [{
        test: /raptorqr_raptorq_wasm_bg\.wasm$/,
        type: 'asset/inline',
        generator: {dataUrl: {mimetype: 'application/wasm'}},
      }]}};
    },
  };
};
