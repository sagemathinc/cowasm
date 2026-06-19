const { existsSync } = require('fs');
const { resolve } = require('path');

const sageliteElectronResources = resolve(
  __dirname,
  '../../sagemath/sagelite/dist/wasi-sdk/electron-resources',
);

module.exports = {
  packagerConfig: {
    extraResource: existsSync(sageliteElectronResources)
      ? [sageliteElectronResources]
      : [],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
};
