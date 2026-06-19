const { resolveSageliteExtraResources } = require('./sagelite-resources');

module.exports = {
  packagerConfig: {
    extraResource: resolveSageliteExtraResources(__dirname),
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
