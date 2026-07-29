---
layout: archive
title: "网站地图"
description: "浏览 PeaceEdu 的主要页面、文章与公开内容。"
permalink: /sitemap/
author_profile: false
---

这里列出站内主要页面和文章。搜索引擎可使用 [XML 版本]({{ "sitemap.xml" | relative_url }})。

<h2>主要页面</h2>
{% for post in site.pages %}
  {% unless post.sitemap == false or post.hidden == true or post.title == nil %}
    {% include archive-single.html %}
  {% endunless %}
{% endfor %}

<h2>文章</h2>
{% for post in site.posts %}
  {% include archive-single.html %}
{% endfor %}

{% capture written_label %}'None'{% endcapture %}

{% for collection in site.collections %}
{% unless collection.output == false or collection.label == "posts" %}
  {% capture label %}{{ collection.label }}{% endcapture %}
  {% if label != written_label %}
  <h2>{{ label }}</h2>
  {% capture written_label %}{{ label }}{% endcapture %}
  {% endif %}
{% endunless %}
{% for post in collection.docs %}
  {% unless collection.output == false or collection.label == "posts" or post.sitemap == false %}
  {% include archive-single.html %}
  {% endunless %}
{% endfor %}
{% endfor %}
