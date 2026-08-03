class Config {
  static const String _defaultBaseUrl =
      'https://api.simly.cloud/api/';

  static const String baseUrl = String.fromEnvironment(
    'SIMLY_API_BASE_URL',
    defaultValue: _defaultBaseUrl,
  );
}
