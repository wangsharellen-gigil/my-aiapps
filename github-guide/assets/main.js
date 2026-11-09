/* GitHub 中文入门指南 — 交互脚本（无依赖） */
(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;

  /* ---------------------------- 深色模式 ---------------------------- */
  var THEME_KEY = "gh-guide-theme";
  var saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
  if (saved === "dark" || saved === "light") {
    root.setAttribute("data-theme", saved);
  } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.setAttribute("data-theme", "dark");
  }
  var themeBtn = document.getElementById("theme-btn");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });
  }

  /* ---------------------------- 移动端抽屉 ---------------------------- */
  var menuBtn = document.getElementById("menu-btn");
  var scrim = document.getElementById("scrim");

  function setNav(open) {
    body.classList.toggle("nav-open", open);
    if (scrim) scrim.hidden = !open;
    if (menuBtn) menuBtn.setAttribute("aria-expanded", String(open));
    body.style.overflow = open ? "hidden" : "";
  }
  if (menuBtn) {
    menuBtn.addEventListener("click", function () {
      setNav(!body.classList.contains("nav-open"));
    });
  }
  if (scrim) scrim.addEventListener("click", function () { setNav(false); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && body.classList.contains("nav-open")) setNav(false);
  });

  /* ---------------------------- 代码复制 ---------------------------- */
  document.querySelectorAll(".doc-body pre").forEach(function (pre) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy-btn";
    btn.textContent = "复制";
    btn.addEventListener("click", function () {
      var code = pre.querySelector("code");
      var text = code ? code.innerText : pre.innerText;
      var done = function () {
        btn.textContent = "已复制";
        btn.classList.add("copied");
        setTimeout(function () { btn.textContent = "复制"; btn.classList.remove("copied"); }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      } else {
        var ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
    pre.appendChild(btn);
  });

  /* ---------------------------- 本页目录高亮 ---------------------------- */
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll(".toc a"));
  if (tocLinks.length) {
    var map = {};
    tocLinks.forEach(function (a) {
      var id = decodeURIComponent(a.hash.slice(1));
      var el = document.getElementById(id);
      if (el) map[id] = a;
    });
    var headings = Object.keys(map).map(function (id) { return document.getElementById(id); });
    var setActive = function (id) {
      tocLinks.forEach(function (a) { a.classList.remove("active"); });
      if (map[id]) map[id].classList.add("active");
    };
    if ("IntersectionObserver" in window) {
      var visible = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          visible[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0;
        });
        var best = null, bestRatio = 0;
        Object.keys(visible).forEach(function (id) {
          if (visible[id] > bestRatio) { bestRatio = visible[id]; best = id; }
        });
        if (best) setActive(best);
      }, { rootMargin: "-70px 0px -65% 0px", threshold: [0, 0.2, 0.6, 1] });
      headings.forEach(function (h) { io.observe(h); });
    }
  }

  /* ------------------------------- 搜索 ------------------------------- */
  var input = document.getElementById("search-input");
  var panel = document.getElementById("search-results");
  var indexData = null;
  var loading = false;
  var activeIdx = -1;
  var currentItems = [];

  function loadIndex() {
    if (indexData || loading) return;
    loading = true;
    fetch("search-index.json")
      .then(function (r) { return r.json(); })
      .then(function (data) { indexData = data; loading = false; if (input && input.value.trim()) doSearch(input.value); })
      .catch(function () { loading = false; });
  }

  function scoreItem(item, q) {
    var score = 0;
    var title = item.title.toLowerCase();
    var nav = item.nav.toLowerCase();
    if (title.indexOf(q) === 0) score += 40;
    if (title.indexOf(q) > -1) score += 22;
    if (nav.indexOf(q) > -1) score += 14;
    if (item.headings.join(" ").toLowerCase().indexOf(q) > -1) score += 8;
    var text = item.text.toLowerCase();
    if (text.indexOf(q) > -1) score += 4;
    if (item.section.toLowerCase().indexOf(q) > -1) score += 2;
    return score;
  }

  function doSearch(raw) {
    var q = raw.trim().toLowerCase();
    if (!panel) return;
    if (!indexData || q.length < 1) { panel.hidden = true; panel.innerHTML = ""; return; }
    var hits = indexData
      .map(function (it) { return { it: it, s: scoreItem(it, q) }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, 8)
      .map(function (x) { return x.it; });

    panel.innerHTML = "";
    currentItems = hits;
    activeIdx = -1;
    if (!hits.length) {
      var empty = document.createElement("div");
      empty.className = "sr-empty";
      empty.textContent = "没有找到相关内容，试试「分支」「Actions」「Token」等关键词";
      panel.appendChild(empty);
    } else {
      hits.forEach(function (it) {
        var a = document.createElement("a");
        a.className = "sr-item";
        a.href = it.slug + ".html";
        var t = document.createElement("div");
        t.className = "sr-title";
        t.textContent = it.title;
        var m = document.createElement("div");
        m.className = "sr-meta";
        m.textContent = it.section + " · " + (it.headings[0] || it.desc).slice(0, 34);
        a.appendChild(t); a.appendChild(m);
        panel.appendChild(a);
      });
    }
    panel.hidden = false;
  }

  if (input) {
    input.addEventListener("focus", loadIndex);
    input.addEventListener("input", function () { loadIndex(); doSearch(input.value); });
    input.addEventListener("keydown", function (e) {
      var items = panel ? panel.querySelectorAll(".sr-item") : [];
      if (e.key === "ArrowDown" && items.length) {
        e.preventDefault();
        activeIdx = (activeIdx + 1) % items.length;
        items.forEach(function (el, i) { el.classList.toggle("is-active", i === activeIdx); });
      } else if (e.key === "ArrowUp" && items.length) {
        e.preventDefault();
        activeIdx = (activeIdx - 1 + items.length) % items.length;
        items.forEach(function (el, i) { el.classList.toggle("is-active", i === activeIdx); });
      } else if (e.key === "Enter" && items.length) {
        e.preventDefault();
        (items[activeIdx >= 0 ? activeIdx : 0]).click();
      } else if (e.key === "Escape") {
        panel.hidden = true;
        input.blur();
      }
    });
    document.addEventListener("click", function (e) {
      if (panel && !panel.hidden && !e.target.closest(".search-box")) panel.hidden = true;
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && document.activeElement !== input &&
          !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
        e.preventDefault();
        input.focus();
      }
    });
  }
})();
