# frozen_string_literal: true

require "json"
require "nokogiri"
require "pathname"
require "uri"
require "yaml"

SITE_ROOT = Pathname.new(File.expand_path("../_site", __dir__))
PROJECT_ROOT = Pathname.new(File.expand_path("..", __dir__))
RASTER_EXTENSIONS = %w[.gif .jpeg .jpg .png .webp].freeze
MAX_REPORTED_ERRORS = 100

abort "_site does not exist. Run the Jekyll build first." unless SITE_ROOT.directory?

config = YAML.safe_load(
  PROJECT_ROOT.join("_config.yml").read(encoding: "UTF-8"),
  aliases: true
) || {}
critical_image_paths = [
  config["logo"],
  config.dig("author", "avatar")
].compact
site_uri = URI(config.fetch("url", "https://example.invalid"))

html_files = SITE_ROOT.glob("**/*.html")
errors = []
stats = {
  html_files: html_files.length,
  images: 0,
  images_without_dimensions: 0,
  images_without_loading: 0,
  inline_script_bytes: 0
}
package_data = JSON.parse(PROJECT_ROOT.join("package.json").read(encoding: "UTF-8"))
lock_data = JSON.parse(PROJECT_ROOT.join("package-lock.json").read(encoding: "UTF-8"))
theme_data = YAML.safe_load(
  PROJECT_ROOT.join("_data", "theme.yml").read(encoding: "UTF-8")
) || {}
release_version = package_data["version"]

unless release_version == lock_data["version"] &&
    release_version == lock_data.dig("packages", "", "version") &&
    release_version == theme_data["version"]
  errors << "version metadata is inconsistent across package.json, package-lock.json, and _data/theme.yml"
end

def add_error(errors, file, message)
  errors << "#{file.relative_path_from(SITE_ROOT)}: #{message}"
end

def relative_local_asset(file, url)
  value = url.to_s.split(/[?#]/, 2).first
  return nil if value.empty? || value.start_with?("data:", "//", "#")
  return nil if value.match?(%r{\A[a-z][a-z0-9+.-]*:}i)

  decoded = URI::DEFAULT_PARSER.unescape(value)
  decoded.start_with?("/") ? SITE_ROOT.join(decoded.delete_prefix("/")) : file.dirname.join(decoded)
rescue ArgumentError
  nil
end

html_files.each do |file|
  html = file.read(encoding: "UTF-8")
  document = Nokogiri::HTML(html)
  redirect_page = document.at_css('meta[http-equiv="refresh"]')
  if html.include?("link-to-whatever-social-network.com")
    add_error(errors, file, "placeholder domain was published")
  end

  titles = document.css("head > title")
  if titles.length != 1 || titles.first&.text.to_s.strip.empty?
    add_error(errors, file, "expected exactly one non-empty title")
  end

  html_language = document.at_css("html")&.[]("lang").to_s.strip
  add_error(errors, file, "html element is missing lang") if html_language.empty?

  headings = document.css("h1")
  unless headings.length == 1 || redirect_page
    add_error(errors, file, "expected exactly one h1, found #{headings.length}")
  end

  canonicals = document.css('link[rel~="canonical"]')
  if canonicals.length != 1
    add_error(errors, file, "expected exactly one canonical link, found #{canonicals.length}")
  else
    begin
      canonical_uri = URI(canonicals.first["href"])
      unless canonical_uri.is_a?(URI::HTTPS) && canonical_uri.host == site_uri.host
        add_error(errors, file, "canonical link must use the configured HTTPS host")
      end
    rescue URI::InvalidURIError
      add_error(errors, file, "canonical link is invalid")
    end
  end

  document.css('[src^="http://"], link[href^="http://"], a[href^="http://"]').each do |node|
    value = node["src"] || node["href"]
    add_error(errors, file, "insecure HTTP resource or link: #{value}")
  end

  ids = Hash.new(0)
  document.css("[id]").each do |node|
    ids[node["id"]] += 1 unless node["id"].to_s.empty?
  end
  ids.select { |_id, count| count > 1 }.each_key do |id|
    add_error(errors, file, %(duplicate id="#{id}"))
  end

  document.css("img").each do |image|
    stats[:images] += 1
    add_error(errors, file, "image is missing alt") unless image.key?("alt")

    local_asset = relative_local_asset(file, image["src"])
    raster = local_asset && RASTER_EXTENSIONS.include?(local_asset.extname.downcase)
    if raster && local_asset.file? && (!image.key?("width") || !image.key?("height"))
      stats[:images_without_dimensions] += 1
      add_error(errors, file, "local raster image is missing width/height: #{image['src']}")
    end

    image_path = image["src"].to_s.split(/[?#]/, 2).first
    critical = critical_image_paths.include?(image_path) ||
      image["loading"] == "eager" ||
      image["fetchpriority"] == "high" ||
      image["class"].to_s.split.any? do |name|
        %w[page__hero-image site-logo author__avatar].include?(name)
      end
    unless critical || image.key?("loading")
      stats[:images_without_loading] += 1
      add_error(errors, file, "non-critical image is missing loading: #{image['src']}")
    end
  end

  label_targets = document.css("label[for]").to_h { |label| [label["for"], true] }
  document.css("button, input, select, textarea").each do |control|
    next if control.name == "input" && control["type"].to_s.downcase == "hidden"

    labelled = !control["aria-label"].to_s.strip.empty? ||
      !control["aria-labelledby"].to_s.strip.empty? ||
      !control["title"].to_s.strip.empty? ||
      !control["value"].to_s.strip.empty? ||
      !control.text.strip.empty? ||
      control.ancestors("label").any? ||
      label_targets[control["id"]]
    add_error(errors, file, "form control has no accessible name: #{control.name}") unless labelled
  end

  document.css(%(a[target="_blank"])).each do |link|
    rel_tokens = link["rel"].to_s.downcase.split
    next if rel_tokens.include?("noopener") || rel_tokens.include?("noreferrer")

    add_error(errors, file, %(target="_blank" link is missing rel="noopener"))
  end

  document.css("script:not([src])").each do |script|
    stats[:inline_script_bytes] += script.content.bytesize
    if script.content.include?("initAlgoliaSearch")
      add_error(errors, file, "the Algolia initializer was inlined")
    end
  end

end

compiled_css = SITE_ROOT.join("assets", "css", "main.css")
if !compiled_css.file? || compiled_css.size < 1_000
  errors << "assets/css/main.css: compiled CSS is missing or unexpectedly small"
end

compiled_javascript = SITE_ROOT.join("assets", "js", "main.min.js")
if !compiled_javascript.file? ||
    !compiled_javascript.read(encoding: "UTF-8").start_with?("/*!\n * PeaceEdu #{release_version}")
  errors << "assets/js/main.min.js: release banner does not match version #{release_version}"
end

[
  ["assets/scripts", "private build scripts were published"],
  ["assets/js/main.min.js.map", "JavaScript source map was published"],
  ["scripts", "private validation scripts were published"],
  ["docs/engineering", "private engineering documents were published"],
  ["_most_popular", "raw collection source was published"],
  ["docs/management", "retired management content was published"],
  ["docs/organization", "retired organization content was published"],
  ["docs/talents", "retired talents content was published"]
].each do |relative_path, message|
  candidate = SITE_ROOT.join(relative_path)
  errors << "#{relative_path}: #{message}" if candidate.exist?
end

SITE_ROOT.glob("**/*").select(&:file?).each do |published_file|
  next unless published_file.basename.to_s.end_with?(".bak")

  errors << "#{published_file.relative_path_from(SITE_ROOT)}: backup file was published"
end

sitemap_file = SITE_ROOT.join("sitemap.xml")
begin
  sitemap = Nokogiri::XML(sitemap_file.read(encoding: "UTF-8"))
  sitemap.remove_namespaces!
  sitemap_urls = sitemap.css("url > loc").map { |node| node.text.strip }
  sitemap_urls.tally.select { |_url, count| count > 1 }.each_key do |url|
    errors << "sitemap.xml: duplicate URL #{url}"
  end
rescue Errno::ENOENT, Nokogiri::XML::SyntaxError => e
  errors << "sitemap.xml: #{e.message}"
end

records_file = SITE_ROOT.join("algolia-records.json")
begin
  records = JSON.parse(records_file.read(encoding: "UTF-8"))
  errors << "algolia-records.json: expected an array" unless records.is_a?(Array)
rescue Errno::ENOENT, JSON::ParserError => e
  errors << "algolia-records.json: #{e.message}"
end

if errors.any?
  warn "Generated HTML audit failed with #{errors.length} error(s):"
  errors.first(MAX_REPORTED_ERRORS).each { |error| warn "- #{error}" }
  warn "...and #{errors.length - MAX_REPORTED_ERRORS} more." if errors.length > MAX_REPORTED_ERRORS
  exit 1
end

puts [
  "Generated HTML OK:",
  "#{stats[:html_files]} files,",
  "#{stats[:images]} images,",
  "#{stats[:images_without_dimensions]} dimension issues,",
  "#{stats[:images_without_loading]} loading issues,",
  "#{stats[:inline_script_bytes]} inline script bytes."
].join(" ")
