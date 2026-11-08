import baseConfig from './playwright.config';

/**
 * Konfiguracija ločenega sklopa tests_Anja.
 * Vse nastavitve (brskalnik, strežniki, čakanja in poročila) so skupne osnovnemu sklopu.
 */
export default {
  ...baseConfig,
  testDir: './tests_Anja/funkcionalni',
  outputDir: 'test-results-Anja',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report-Anja', open: 'never' }],
    ['junit', { outputFile: 'test-results-Anja/junit.xml' }],
  ],
};
