# frozen_string_literal: true

# Prefer a deploy-time search-only key without making local builds depend on
# external secrets. The static browser key is public by design; never inject an
# Algolia Admin API key here.
Jekyll::Hooks.register :site, :after_init do |site|
  search_key = ENV.fetch("ALGOLIA_SEARCH_API_KEY", "").strip
  next if search_key.empty?

  algolia = site.config["algolia"] ||= {}
  algolia["search_only_api_key"] = search_key
end
