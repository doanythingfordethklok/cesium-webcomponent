
// this global is used internall by requireJS to load optional parts of cesium on demand
// the path is relative to the dist folder. depends on copy_cesium script in package.json
window.CESIUM_BASE_URL = '/Build/Cesium';

// this attaches to window.
// this path is aliased in package.json
require('cesium/Build/Cesium/Cesium.js');
