class Config {
  static const String _defaultBaseUrl =
      'https://server-simly-2.servelink.space/api/';

  static const String baseUrl = String.fromEnvironment(
    'SIMLY_API_BASE_URL',
    defaultValue: _defaultBaseUrl,
  );
}
