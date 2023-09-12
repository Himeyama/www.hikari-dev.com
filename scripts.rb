require 'nokogiri'

def minify_html(html)
  doc = Nokogiri::HTML(html)
  doc.xpath('//comment()').each(&:remove)
  html = doc.to_html(save_with: Nokogiri::XML::Node::SaveOptions::AS_HTML)
  html.gsub!(/\s{2,}/, '')
  html.gsub!('> <', '')
  html.gsub!(/[\r\n]/, '')
  html
end

def main
  html_files = Dir.glob('_site/**/*.html')
  html_files.each do |html_file|
    html = File.read(html_file)
    File.open(html_file, 'w') do |f|
      f.puts minify_html(html)
    end
  end
end

main