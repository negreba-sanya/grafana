module.exports = {
  // Default namespace used in your i18next config
  defaultNamespace: 'grafana',
  // Adds changes only to en-US when extracting keys, every other language is provided by Crowdin
  locales: ['en-US'],

  output: './public/locales/$LOCALE/$NAMESPACE.json',

  sort: true,

  createOldCatalogs: false,

  failOnWarnings: true,

  verbose: false,

  // Don't include default values for English, they'll remain in the source code
  skipDefaultValues: (locale) => locale !== 'en-US',
};
