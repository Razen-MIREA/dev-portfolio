/* =============================================================================
   app.js — ДВИЖОК ШАБЛОНА
   -----------------------------------------------------------------------------
   Читает window.SITE из js/data.js и собирает страницы, общие блоки
   (навбар, футер), а также отвечает за интерактив:
     • фиксированный навбар, переключение темы, прогресс чтения;
     • спокойные анимации появления;
     • фильтр и поиск по проектам, страница проекта, лайтбокс скриншотов;
     • валидация формы обратной связи и имитация отправки.

   Иконки берутся из локального набора js/icons.js (спрайт <symbol>).
   Точка интеграции с бэкендом — функция submitContactForm() в конце файла.
   ========================================================================== */

(function () {
  "use strict";

  const S = window.SITE || {};
  const page = document.body.dataset.page || "home";
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ===========================================================================
     0. УТИЛИТЫ
     ======================================================================== */

  /** Экранирование под HTML, чтобы данные можно было безопасно вставлять. */
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.prototype.slice.call(root.querySelectorAll(sel));

  /** Иконка из локального набора: <use href="#bi-name">. */
  const icon = (name, cls) =>
    name
      ? `<svg class="icon${cls ? " " + cls : ""}" aria-hidden="true" focusable="false"><use href="#${esc(name)}"></use></svg>`
      : "";

  /** Внутренняя ссылка с защитой от пустых значений. */
  const href = (url, fallback = "#") => (url && String(url).trim() ? esc(url) : fallback);

  /** Внешняя ли ссылка. */
  const isExternal = (url) => /^https?:\/\//i.test(url || "");

  /** Атрибуты для внешних ссылок. */
  const extAttrs = (url) => (isExternal(url) ? ' target="_blank" rel="noopener noreferrer"' : "");

  /** Плашка технологии. */
  const techBadge = (name) => `<span class="tech-badge">${esc(name)}</span>`;

  /** Номер проекта для подписи (01, 02, …). */
  const num = (i) => String(i + 1).padStart(2, "0");

  /** Подстановка года в строки футера. */
  function interpolate(str) {
    const year = (S.meta && S.meta.year) || new Date().getFullYear();
    return String(str || "").replace(/\{year\}/g, String(year));
  }

  /* ===========================================================================
     1. SEO И МЕТА
     ======================================================================== */

  function applyMeta() {
    if (!S.meta) return;
    /* Заголовок берём из HTML: у каждой страницы он свой.
       data-title на <body> позволяет переопределить его из разметки. */
    const title = document.body.dataset.title;
    if (title) document.title = title;

    const desc = document.querySelector('meta[name="description"]');
    const text = document.body.dataset.description || S.meta.defaultDescription;
    if (desc && text) desc.setAttribute("content", text);
  }

  /* ===========================================================================
     2. НАВБАР
     ======================================================================== */
    
     function topBarMarkup() {
      const links = navLinks();
      const socials = socialsMarkup("topbar__link");
      if (!links && !socials) return "";
    
      return `
        <div class="topbar">
          <div class="container">
            <ul class="topbar__nav">${links}</ul>
            ${socials ? `<div class="topbar__socials">${socials}</div>` : ""}
          </div>
        </div>`;
    }
    
    function brandMarkup() {
      const b = S.brand || {};
      const logo = b.logoImage
        ? `<img src="${href(b.logoImage)}" alt="" class="brand-logo-img" width="36" height="36">`
        : `<span class="brand-logo" aria-hidden="true">${esc(b.logoText || "ИИ")}</span>`;
    
      return `<a class="navbar-brand" href="index.html" aria-label="${esc(b.name)} — на главную">
          ${logo}
          <span class="brand-text">
            <span class="brand-name">${esc(b.name || "")}</span>
            <span class="brand-role">${esc(b.role || "")}</span>
          </span>
        </a>`;
    }
    
    function navLinks() {
      return (S.nav || []).map((item) => {
        const active = item.id === page;
        return `<li class="nav-item">
            <a class="nav-link${active ? " active" : ""}" href="${href(item.href)}"${active ? ' aria-current="page"' : ""}>${esc(item.label)}</a>
          </li>`;
      }).join("");
    }
    
    function socialsMarkup(cls = "btn-icon-ghost") {
      return (S.socials || []).map((s) =>
        `<a class="${cls}" href="${href(s.href)}"${extAttrs(s.href)} title="${esc(s.label)}" aria-label="${esc(s.label)}">${icon(s.icon)}</a>`
      ).join("");
    }
    
    function renderNavbar() {
      const mount = $("#site-navbar");
      if (!mount) return;
    
      const links = navLinks();
      const cta = S.cta
        ? `<a class="nav-cta d-none d-lg-inline-flex" href="${href(S.cta.href)}">${esc(S.cta.label)}</a>`
        : "";
    
      mount.innerHTML = `
        <div class="scroll-progress" id="scrollProgress" aria-hidden="true"></div>
    
        ${topBarMarkup()}
    
        <nav class="navbar fixed-top site-navbar" id="mainNav" aria-label="Главная навигация">
          <div class="container">
            ${brandMarkup()}
    
            <div class="navbar-actions">
              <button class="btn-icon-ghost theme-toggle" type="button" id="themeToggle"
                      aria-label="Переключить тему" aria-pressed="false" title="Светлая / тёмная тема"></button>
              ${cta}
              <button class="btn-icon-ghost d-lg-none" type="button" data-bs-toggle="offcanvas"
                      data-bs-target="#mobileMenu" aria-controls="mobileMenu" aria-label="Открыть меню">
                ${icon("bi-list")}
              </button>
            </div>
          </div>
        </nav>
    
        <div class="offcanvas offcanvas-end mobile-menu" tabindex="-1" id="mobileMenu" aria-label="Меню">
          <div class="offcanvas-header">
            <span class="menu-label">Меню</span>
            <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Закрыть"></button>
          </div>
          <div class="offcanvas-body">
            <ul class="menu-list">${links}</ul>
            ${S.cta ? `<a class="btn-accent w-100 mt-4" href="${href(S.cta.href)}">${esc(S.cta.label)}</a>` : ""}
            <div class="menu-socials">${socialsMarkup()}</div>
          </div>
        </div>`;
    }
    

  /* ===========================================================================
     3. ФУТЕР
     ======================================================================== */

  function renderFooter() {
    const mount = $("#site-footer");
    if (!mount) return;

    const f = S.footer || {};
    const columns = (f.columns || []).map((col) => `
      <div class="col-6 col-md-3 col-lg-2">
        <h2 class="footer-title">${esc(col.title)}</h2>
        <ul class="footer-list">
          ${(col.links || []).map((l) =>
            `<li><a href="${href(l.href)}"${extAttrs(l.href)}>${esc(l.label)}</a></li>`).join("")}
        </ul>
      </div>`).join("");

    const c = S.contacts || {};

    mount.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="row g-4">
            <div class="col-lg-5">
              ${brandMarkup()}
              <p class="footer-about">${esc(f.about || "")}</p>
              <div class="footer-socials">${socialsMarkup()}</div>
            </div>
            ${columns}
            <div class="col-12 col-md-6 col-lg-3">
              <h2 class="footer-title">Связаться</h2>
              <ul class="footer-list">
                <li><a href="mailto:${esc(c.email || "")}">${esc(c.email || "")}</a></li>
                ${c.phone ? `<li><a href="tel:${esc(String(c.phone).replace(/[^+\d]/g, ""))}">${esc(c.phone)}</a></li>` : ""}
                ${c.callHours ? `
                  <li class="footer-hours">
                    <span class="footer-hours__label">${esc(c.callHoursLabel || "")}</span>
                    <span class="footer-hours__value">${esc(c.callHours)}</span>
                  </li>` : ""
                }
                ${c.location ? `<li><span>${esc(c.location)}</span></li>` : ""}
              </ul>
            </div>
          </div>

          <div class="footer-cta">
            <a class="btn-accent mt-3" href="contacts.html">Написать ${icon("bi-arrow-right")}</a>
          </div>

          <div class="footer-bottom">
            <p class="footer-copy">${esc(interpolate(f.copyright))}</p>
            <div class="footer-meta">
              <span>${esc(f.builtWith || "")}</span>
              <button class="btn-to-top" type="button" id="backToTop">
                ${esc(f.backToTop || "Наверх")} ${icon("bi-arrow-up")}
              </button>
            </div>
          </div>
        </div>
      </footer>`;
  }

  /* ===========================================================================
     4. ГЛАВНАЯ: ГЕРОЙ
     ======================================================================== */

  function renderHero() {
    const mount = $("#hero-root");
    if (!mount || !S.hero) return;
    const h = S.hero;

    const primary = h.primaryCta
      ? `<a class="btn-accent" href="${href(h.primaryCta.href)}">${esc(h.primaryCta.label)} ${icon("bi-arrow-right")}</a>`
      : "";
    const secondary = h.secondaryCta
      ? `<a class="btn-line" href="${href(h.secondaryCta.href)}"${extAttrs(h.secondaryCta.href)}>${esc(h.secondaryCta.label)} ${icon(h.secondaryCta.icon)}</a>`
      : "";

    const facts = (h.facts || []).map((f) => `
      <div class="col-12 col-sm-4">
        <div class="fact">
          <span class="fact-label">${esc(f.label)}</span>
          <span class="fact-value">${esc(f.value)}</span>
        </div>
      </div>`).join("");

    const status = h.available
      ? `<p class="status"><span class="status-dot" aria-hidden="true"></span>${esc(h.availableText)}</p>`
      : "";

    mount.innerHTML = `
      <section class="hero" id="hero">
        <div class="container">
          <div class="hero-grid">
            <div class="hero-main">
              ${status}
              <h1 class="hero-title">
                <span class="hero-name">${esc(h.name)}</span>
                <em class="hero-role">${esc(h.position)}</em>
              </h1>
              <p class="hero-text">${esc(h.text)}</p>
              <div class="hero-actions">${primary}${secondary}</div>
            </div>

            <aside class="hero-side">
              <figure class="portrait">
                <img src="${href(h.photo, "assets/img/avatar.svg")}" alt="${esc(h.name)}"
                     width="480" height="560" loading="eager">
                <figcaption>${esc(h.photoCaption || "")}</figcaption>
              </figure>
            </aside>
          </div>

          <div class="hero-facts row g-0">${facts}</div>
        </div>
      </section>`;
  }

  /* ===========================================================================
     5. ГЛАВНАЯ: КОРОТКО ОБО МНЕ
     ======================================================================== */

  function renderAboutShort() {
    const mount = $("#about-short-root");
    if (!mount || !S.aboutShort) return;
    const a = S.aboutShort;

    mount.innerHTML = `
      <section class="section" id="about">
        <div class="container">
          <div class="row g-5">
            <div class="col-lg-3">
              <h2 class="kicker">${esc(a.title)}</h2>
            </div>
            <div class="col-lg-9">
              <p class="lede">${esc(a.lead)}</p>
              ${(a.paragraphs || []).map((p) => `<p class="body-text">${esc(p)}</p>`).join("")}

              <div class="stack">
                <h3 class="stack-title">${esc(a.badgesTitle)}</h3>
                <div class="stack-list">${(a.badges || []).map((b) => techBadge(b)).join("")}</div>
              </div>

              <a class="btn-accent mt-4" href="${href(a.cta && a.cta.href)}">
                ${esc((a.cta && a.cta.label) || "Смотреть проекты")} ${icon("bi-arrow-right")}
              </a>
            </div>
          </div>
        </div>
      </section>`;
  }

  /* ===========================================================================
     6. КАРТОЧКА ПРОЕКТА
     ======================================================================== */

  function projectCard(p, index) {
    const actions = [];
    if (p.demo) {
      actions.push(`<a class="link-arrow" href="${href(p.demo)}"${extAttrs(p.demo)}>Демо ${icon("bi-arrow-up-right")}</a>`);
    }
    if (p.repo) {
      actions.push(`<a class="link-arrow" href="${href(p.repo)}"${extAttrs(p.repo)}>Код ${icon("bi-github")}</a>`);
    }

    return `
      <li class="project-row" data-project="${esc(p.slug)}"
          data-tech="${esc((p.tech || []).join(" ").toLowerCase())}"
          data-title="${esc(p.title.toLowerCase())}"
          data-category="${esc(p.category || "")}">
        <a class="project-link" href="project.html?p=${encodeURIComponent(p.slug)}">
          <span class="project-index">${num(index)}</span>

          <span class="project-thumb">
            <img src="${href(p.cover, "assets/img/placeholder.svg")}"
                 alt="Обложка проекта «${esc(p.title)}»" loading="lazy" width="640" height="400">
          </span>

          <span class="project-info">
            <span class="project-head">
              <span class="project-title">${esc(p.title)}</span>
              <span class="project-year">${esc(p.year || "")}</span>
            </span>
            <span class="project-desc">${esc(p.short || p.description)}</span>
            <span class="project-tech">${(p.tech || []).join(" · ")}</span>
          </span>

          <span class="project-go">${icon("bi-arrow-right")}</span>
        </a>
        ${actions.length ? `<div class="project-extra">${actions.join("")}</div>` : ""}
      </li>`;
  }

  function renderFeaturedProjects() {
    const mount = $("#featured-projects-root");
    if (!mount) return;

    const list = (S.projects || []).filter((p) => p.featured);
    if (!list.length) return;

    mount.innerHTML = `
      <section class="section section-line" id="featured">
        <div class="container">
          <div class="section-head">
            <div>
              <h2 class="kicker">Избранное</h2>
              <p class="section-lead">Проекты, на которых удобно смотреть, как я работаю.</p>
            </div>
            <a class="link-arrow" href="projects.html">Все проекты ${icon("bi-arrow-right")}</a>
          </div>
          <ol class="project-list">
            ${list.map((p) => projectCard(p, (S.projects || []).indexOf(p))).join("")}
          </ol>
        </div>
      </section>`;
  }

  /* ===========================================================================
     7. ГЛАВНАЯ: БЛОК СВЯЗИ
     ======================================================================== */

  function renderHomeCta() {
    const mount = $("#home-cta-root");
    if (!mount) return;
    const c = S.contacts || {};

    const links = (c.cards || []).map((card) => `
      <li>
        <a class="contact-line" href="${href(card.href)}"${extAttrs(card.href)}>
          <span class="contact-line-label">${esc(card.label)}</span>
          <span class="contact-line-value">${esc(card.value)}</span>
          ${icon("bi-arrow-up-right")}
        </a>
      </li>`).join("");

    mount.innerHTML = `
      <section class="section" id="contact-cta">
        <div class="container">
          <div class="cta">
            <div class="cta-text">
              <h2 class="cta-title">Есть задача?</h2>
              <p>Напишите в любом удобном мессенджере или на почту — отвечу и скажу, берусь ли я за неё.</p>
              <a class="btn-accent mt-3" href="contacts.html">Написать ${icon("bi-arrow-right")}</a>
            </div>
            <ul class="cta-links">${links}</ul>
          </div>
        </div>
      </section>`;
  }

  /* ===========================================================================
     8. СТРАНИЦА «ОБО МНЕ»
     ======================================================================== */

  function renderAboutHero() {
    const mount = $("#about-hero-root");
    if (!mount || !S.about) return;
    const a = S.about;

    const facts = (a.facts || []).map((f) => `
      <div class="col-6 col-lg-3">
        <div class="fact">
          <span class="fact-label">${esc(f.label)}</span>
          <span class="fact-value">${esc(f.value)}</span>
        </div>
      </div>`).join("");

    mount.innerHTML = `
      <section class="page-hero">
        <div class="container">
          <nav class="crumbs" aria-label="Хлебные крошки">
            <a href="index.html">Главная</a><span aria-hidden="true">/</span><span aria-current="page">Обо мне</span>
          </nav>

          <div class="page-hero-grid">
            <div>
              <h1 class="page-title">${esc(a.title)}</h1>
              <p class="lede">${esc(a.lead)}</p>
            </div>
            <figure class="portrait portrait-sm">
              <img src="${href(a.photo, "assets/img/avatar.svg")}" alt="${esc((S.brand && S.brand.name) || "")}"
                   width="360" height="420" loading="lazy">
              <figcaption>${esc(a.photoCaption || "")}</figcaption>
            </figure>
          </div>

          <div class="page-facts row g-0">${facts}</div>
        </div>
      </section>`;
  }

  function renderStory() {
    const mount = $("#story-root");
    if (!mount || !S.about) return;

    const rows = (S.about.story || []).map((step) => `
      <li class="timeline-row">
        <span class="timeline-year">${esc(step.period)}</span>
        <div class="timeline-body">
          <h3>${esc(step.title)}</h3>
          <p>${esc(step.text)}</p>
        </div>
      </li>`).join("");

    mount.innerHTML = `
      <section class="section section-line" id="path">
        <div class="container">
          <div class="row g-5">
            <div class="col-lg-3">
              <h2 class="kicker">Путь и опыт</h2>
            </div>
            <div class="col-lg-9">
              <ol class="timeline">${rows}</ol>
            </div>
          </div>
        </div>
      </section>`;
  }

  function renderEducation() {
    const mount = $("#education-root");
    if (!mount || !S.about) return;

    const rows = (S.about.education || []).map((e) => `
      <li class="timeline-row">
        <span class="timeline-year">${esc(e.period)}</span>
        <div class="timeline-body">
          <h3>${esc(e.title)}</h3>
          <p class="timeline-place">${esc(e.place)}</p>
          <p>${esc(e.text)}</p>
        </div>
      </li>`).join("");

    mount.innerHTML = `
      <section class="section" id="education">
        <div class="container">
          <div class="row g-5">
            <div class="col-lg-3">
              <h2 class="kicker">Образование</h2>
            </div>
            <div class="col-lg-9">
              <ol class="timeline">${rows}</ol>
            </div>
          </div>
        </div>
      </section>`;
  }

  /* Навыки без процентов: шкала «уровень владения» словами. */
  function renderSkills() {
    const mount = $("#skills-root");
    if (!mount || !S.about) return;

    const groups = (S.about.skills || []).map((g) => `
      <div class="col-md-6 col-xl-4">
        <div class="skill-col">
          <h3 class="skill-title">${esc(g.group)}</h3>
          <ul class="skill-items">
            ${(g.items || []).map((it) => `
              <li class="skill-item">
                <span class="skill-name">${esc(it.name)}</span>
                ${it.note ? `<span class="skill-note">${esc(it.note)}</span>` : ""}
              </li>`).join("")}
          </ul>
        </div>
      </div>`).join("");

    mount.innerHTML = `
      <section class="section section-line" id="skills">
        <div class="container">
          <div class="row g-5">
            <div class="col-lg-3">
              <h2 class="kicker">Навыки</h2>
              <p class="kicker-note">${esc((S.about.skillsNote) || "")}</p>
            </div>
            <div class="col-lg-9">
              <div class="row g-4">${groups}</div>
            </div>
          </div>
        </div>
      </section>`;
  }

  function renderGrowth() {
    const mount = $("#growth-root");
    if (!mount || !S.about || !S.about.growth) return;
    const g = S.about.growth;

    mount.innerHTML = `
      <section class="section" id="growth">
        <div class="container">
          <div class="row g-5">
            <div class="col-lg-3">
              <h2 class="kicker">Чем интересно</h2>
            </div>
            <div class="col-lg-6">
              <h3 class="sub-title">${esc(g.title)}</h3>
              <p class="body-text">${esc(g.text)}</p>
            </div>
            <div class="col-lg-3">
              <h3 class="sub-title">Дальше</h3>
              <ul class="plain-list">
                ${(g.goals || []).map((goal) => `<li>${esc(goal)}</li>`).join("")}
              </ul>
            </div>
          </div>
        </div>
      </section>`;
  }

  function renderPrinciples() {
    const mount = $("#principles-root");
    if (!mount || !S.about) return;

    const items = (S.about.principles || []).map((p, i) => `
      <div class="col-md-6 col-lg-4">
        <div class="principle">
          <span class="principle-num">${num(i)}</span>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.text)}</p>
        </div>
      </div>`).join("");

    mount.innerHTML = `
      <section class="section section-line" id="principles">
        <div class="container">
          <div class="section-head">
            <div>
              <h2 class="kicker">Принципы</h2>
              <p class="section-lead">Несколько правил, по которым я работаю.</p>
            </div>
          </div>
          <div class="row g-4">${items}</div>
        </div>
      </section>`;
  }

  /* ===========================================================================
     9. СТРАНИЦА «ПРОЕКТЫ»
     ======================================================================== */

  function renderProjectsPage() {
    const heroMount = $("#projects-hero-root");
    const cfg = S.projectsPage || {};

    if (heroMount) {
      heroMount.innerHTML = `
        <section class="page-hero page-hero-flat">
          <div class="container">
            <nav class="crumbs" aria-label="Хлебные крошки">
              <a href="index.html">Главная</a><span aria-hidden="true">/</span><span aria-current="page">Проекты</span>
            </nav>
            <h1 class="page-title">${esc(cfg.title || "")}</h1>
            <p class="lede">${esc(cfg.lead || "")}</p>
          </div>
        </section>`;
    }

    const toolbar = $("#projects-toolbar-root");
    const grid = $("#projects-grid-root");
    if (!grid) return;

    const categories = [];
    (S.projects || []).forEach((p) => {
      if (p.category && categories.indexOf(p.category) === -1) categories.push(p.category);
    });

    if (toolbar) {
      toolbar.innerHTML = `
        <div class="projects-toolbar">
          <div class="filter-chips" role="group" aria-label="Фильтр по типу проекта">
            <button class="chip is-active" type="button" data-filter="all">${esc(cfg.allLabel || "Все")}</button>
            ${categories.map((c) => `<button class="chip" type="button" data-filter="${esc(c)}">${esc(c)}</button>`).join("")}
          </div>
          <label class="search">
            <span class="visually-hidden">Поиск по проектам</span>
            ${icon("bi-search")}
            <input type="search" id="projectSearch" placeholder="${esc(cfg.searchPlaceholder || "Поиск")}" autocomplete="off">
          </label>
        </div>`;
    }

    grid.innerHTML = `
      <ol class="project-list" id="projectsRow">
        ${(S.projects || []).map((p, i) => projectCard(p, i)).join("")}
      </ol>
      <p class="empty-state d-none" id="projectsEmpty">${esc(cfg.emptyText || "Ничего не найдено.")}</p>`;

    initProjectsFilter();
  }

  function initProjectsFilter() {
    const row = $("#projectsRow");
    const empty = $("#projectsEmpty");
    const search = $("#projectSearch");
    if (!row) return;

    let activeFilter = "all";

    function apply() {
      const query = ((search && search.value) || "").trim().toLowerCase();
      let shown = 0;

      $$(".project-row", row).forEach((li) => {
        const matchCategory = activeFilter === "all" || li.dataset.category === activeFilter;
        const haystack = `${li.dataset.title} ${li.dataset.tech} ${li.dataset.category}`.toLowerCase();
        const matchQuery = !query || haystack.indexOf(query) !== -1;
        const visible = matchCategory && matchQuery;
        li.classList.toggle("d-none", !visible);
        if (visible) shown += 1;
      });

      if (empty) empty.classList.toggle("d-none", shown !== 0);
    }

    $$(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        $$(".chip").forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");
        activeFilter = chip.dataset.filter;
        apply();
      });
    });

    if (search) {
      let timer;
      search.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(apply, 120);
      });
    }

    apply();
  }

  /* ===========================================================================
     10. СТРАНИЦА ПРОЕКТА
     ======================================================================== */

  function currentProject() {
    const list = S.projects || [];
    const slug = new URLSearchParams(window.location.search).get("p");
    if (slug) {
      const found = list.find((p) => p.slug === slug);
      if (found) return found;
    }
    return list[0] || null;
  }

  function renderProjectPage() {
    const mount = $("#project-root");
    if (!mount) return;

    const p = currentProject();
    if (!p) {
      mount.innerHTML = `<section class="section"><div class="container">
        <p class="body-text">Проект не найден. <a href="projects.html">Вернуться к списку</a>.</p>
      </div></section>`;
      return;
    }

    document.title = `${p.title} — ${(S.brand && S.brand.name) || ""}`;

    const list = S.projects || [];
    const index = list.indexOf(p);
    const prev = list[index - 1];
    const next = list[index + 1];

    const facts = (p.facts || []).map((f) => `
      <div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join("");

    const links = [];
    if (p.demo) links.push(`<a class="btn-accent w-100" href="${href(p.demo)}"${extAttrs(p.demo)}>Открыть демо ${icon("bi-box-arrow-up-right")}</a>`);
    if (p.repo) links.push(`<a class="btn-line w-100" href="${href(p.repo)}"${extAttrs(p.repo)}>Код на GitHub ${icon("bi-github")}</a>`);

    const gallery = (p.gallery || []).map((g, i) => `
      <li>
        <button class="shot" type="button" data-lightbox-index="${i}" aria-label="Открыть: ${esc(g.caption)}">
          <img src="${href(g.src)}" alt="${esc(g.caption)}" loading="lazy" width="640" height="400">
          <span class="shot-caption">${esc(g.caption)}</span>
        </button>
      </li>`).join("");

    mount.innerHTML = `
      <article class="case">
        <header class="case-head">
          <div class="container">
            <nav class="crumbs" aria-label="Хлебные крошки">
              <a href="index.html">Главная</a><span aria-hidden="true">/</span>
              <a href="projects.html">Проекты</a><span aria-hidden="true">/</span>
              <span aria-current="page">${esc(p.title)}</span>
            </nav>

            <div class="case-head-grid">
              <div>
                <p class="case-meta">${esc(p.category || "")}${p.year ? " · " + esc(p.year) : ""}</p>
                <h1 class="page-title">${esc(p.title)}</h1>
                <p class="lede">${esc(p.short || "")}</p>
                <div class="stack-list mt-4">${(p.tech || []).map((t) => techBadge(t)).join("")}</div>
              </div>
              <figure class="case-cover">
                <img src="${href(p.cover, "assets/img/placeholder.svg")}" alt="Обложка проекта «${esc(p.title)}»"
                     width="640" height="400">
              </figure>
            </div>
          </div>
        </header>

        <div class="container case-body">
          <div class="row g-5">
            <div class="col-lg-8">
              <section class="case-section">
                <h2 class="case-label">Задача</h2>
                <p class="case-text">${esc(p.task)}</p>
              </section>

              <section class="case-section">
                <h2 class="case-label">Решение</h2>
                <p class="case-text">${esc(p.solution)}</p>
              </section>

              <section class="case-section">
                <h2 class="case-label">Результат</h2>
                <p class="case-text">${esc(p.result)}</p>
                ${facts ? `<dl class="case-facts">${facts}</dl>` : ""}
              </section>
            </div>

            <aside class="col-lg-4">
              <div class="case-aside">
                <h2 class="case-aside-title">Детали</h2>
                <dl class="case-spec">
                  <div><dt>Тип</dt><dd>${esc(p.category || "—")}</dd></div>
                  <div><dt>Год</dt><dd>${esc(p.year || "—")}</dd></div>
                  <div><dt>Роль</dt><dd>${esc(p.role || "Frontend-разработчик")}</dd></div>
                </dl>
                <div class="case-links">${links.join("") || '<p class="case-note">Ссылки не указаны</p>'}</div>
              </div>
            </aside>
          </div>

          ${gallery ? `
          <section class="case-gallery">
            <h2 class="case-label">Экраны</h2>
            <ul class="shots">${gallery}</ul>
          </section>` : ""}

          <nav class="case-nav" aria-label="Другие проекты">
            ${prev ? `<a href="project.html?p=${encodeURIComponent(prev.slug)}" class="case-nav-item">
              <span>${icon("bi-arrow-left")} Предыдущий</span><strong>${esc(prev.title)}</strong></a>` : "<span></span>"}
            ${next ? `<a href="project.html?p=${encodeURIComponent(next.slug)}" class="case-nav-item case-nav-next">
              <span>Следующий ${icon("bi-arrow-right")}</span><strong>${esc(next.title)}</strong></a>` : ""}
          </nav>
        </div>
      </article>`;

    initLightbox(p.gallery || []);
  }

  /** Лайтбокс скриншотов на нативном Bootstrap Modal. */
  function initLightbox(items) {
    if (!items.length) return;

    const modal = document.createElement("div");
    modal.className = "modal fade lightbox";
    modal.tabIndex = -1;
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <span class="lightbox-caption" id="lightboxCaption"></span>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
          </div>
          <div class="modal-body">
            <img src="" alt="" id="lightboxImage">
          </div>
          <div class="modal-footer">
            <button class="btn-line" type="button" id="lightboxPrev">${icon("bi-arrow-left")} Назад</button>
            <span class="lightbox-counter" id="lightboxCounter"></span>
            <button class="btn-line" type="button" id="lightboxNext">Вперёд ${icon("bi-arrow-right")}</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);

    const instance = new bootstrap.Modal(modal);
    const img = $("#lightboxImage", modal);
    const caption = $("#lightboxCaption", modal);
    const counter = $("#lightboxCounter", modal);
    let current = 0;

    function show(i) {
      current = (i + items.length) % items.length;
      const item = items[current];
      img.src = item.src;
      img.alt = item.caption || "";
      caption.textContent = item.caption || "";
      counter.textContent = `${current + 1} / ${items.length}`;
    }

    $$("[data-lightbox-index]").forEach((btn) => {
      btn.addEventListener("click", () => {
        show(Number(btn.dataset.lightboxIndex) || 0);
        instance.show();
      });
    });

    $("#lightboxPrev", modal).addEventListener("click", () => show(current - 1));
    $("#lightboxNext", modal).addEventListener("click", () => show(current + 1));

    modal.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(current - 1);
      if (e.key === "ArrowRight") show(current + 1);
    });
  }

  /* ===========================================================================
     11. КОНТАКТЫ
     ======================================================================== */

  function renderContacts() {
    const heroMount = $("#contacts-hero-root");
    const c = S.contacts || {};

    if (heroMount) {
      heroMount.innerHTML = `
        <section class="page-hero page-hero-flat">
          <div class="container">
            <nav class="crumbs" aria-label="Хлебные крошки">
              <a href="index.html">Главная</a><span aria-hidden="true">/</span><span aria-current="page">Контакты</span>
            </nav>
            <h1 class="page-title">${esc(c.title || "")}</h1>
            <p class="lede">${esc(c.lead || "")}</p>
          </div>
        </section>`;
    }

    const cardsMount = $("#contact-cards-root");
    if (cardsMount) {
      cardsMount.innerHTML = `
        <section class="section pt-0">
          <div class="container">
            <ul class="contact-grid">
              ${(c.cards || []).map((card) => `
                <li>
                  <a class="contact-card" href="${href(card.href)}"${extAttrs(card.href)}>
                    <span class="contact-card-label">${esc(card.label)}</span>
                    <span class="contact-card-value">${esc(card.value)}</span>
                    <span class="contact-card-note">${esc(card.note || "")}</span>
                    ${icon("bi-arrow-up-right", "contact-card-icon")}
                  </a>
                </li>`).join("")}
            </ul>
          </div>
        </section>`;
    }

    const formMount = $("#contact-form-root");
    if (formMount && c.form) renderContactForm(formMount, c);
  }

  function renderContactForm(mount, c) {
    const f = c.form;

    mount.innerHTML = `
      <section class="section section-line" id="form">
        <div class="container">
          <div class="row g-5">
            <div class="col-lg-4">
              <h2 class="kicker">${esc(f.title)}</h2>
              <p class="kicker-note">${esc(f.note)}</p>
              <ul class="plain-list mt-4">
                <li><a href="mailto:${esc(c.email || "")}">${esc(c.email || "")}</a></li>
                ${c.phone ? `<li><a href="tel:${esc(String(c.phone).replace(/[^+\d]/g, ""))}">${esc(c.phone)}</a></li>` : ""}
                ${c.callHours ? `
                  <li class="footer-hours">
                    <span class="footer-hours__label">${esc(c.callHoursLabel || "")}</span>
                    <span class="footer-hours__value">${esc(c.callHours)}</span>
                  </li>` : ""
                }
                <li>${esc(c.location || "")}</li>
              </ul>
            </div>

            <div class="col-lg-8">
              <form class="form" id="contactForm" novalidate>
                <div class="row g-4">
                  <div class="col-md-6">
                    <label class="field-label" for="cfName">${esc(f.nameLabel)}</label>
                    <input type="text" class="field" id="cfName" name="name"
                           placeholder="${esc(f.namePlaceholder)}" required minlength="2" autocomplete="name">
                    <p class="field-error">Укажите имя, минимум 2 символа.</p>
                  </div>

                  <div class="col-md-6">
                    <label class="field-label" for="cfEmail">${esc(f.emailLabel)}</label>
                    <input type="email" class="field" id="cfEmail" name="email"
                           placeholder="${esc(f.emailPlaceholder)}" required autocomplete="email">
                    <p class="field-error">Проверьте адрес: нужен формат name@mail.ru.</p>
                  </div>

                  <div class="col-md-6">
                    <label class="field-label" for="cfSubject">${esc(f.subjectLabel)}</label>
                    <select class="field" id="cfSubject" name="subject" required>
                      <option value="" selected disabled>Выберите тему</option>
                      ${(f.subjects || []).map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("")}
                    </select>
                    <p class="field-error">Выберите тему обращения.</p>
                  </div>

                  <div class="col-md-6">
                    <label class="field-label" for="cfBudget">${esc(f.budgetLabel)}</label>
                    <select class="field" id="cfBudget" name="budget">
                      <option value="" selected>Не выбрано</option>
                      ${(f.budgets || []).map((b) => `<option value="${esc(b)}">${esc(b)}</option>`).join("")}
                    </select>
                  </div>

                  <div class="col-12">
                    <label class="field-label" for="cfMessage">${esc(f.messageLabel)}</label>
                    <textarea class="field" id="cfMessage" name="message" rows="5"
                              placeholder="${esc(f.messagePlaceholder)}" required minlength="20"></textarea>
                    <p class="field-error">Опишите задачу подробнее — не меньше 20 символов.</p>
                    <p class="field-hint"><span id="cfCounter">0</span> / 1000</p>
                  </div>

                  <div class="col-12">
                    <label class="consent">
                      <input type="checkbox" id="cfConsent" name="consent" required>
                      <span>${esc(f.consent)}</span>
                    </label>
                    <p class="field-error">Без согласия отправка невозможна.</p>
                  </div>

                  <div class="col-12 form-actions">
                    <button class="btn-accent" type="submit" id="cfSubmit">
                      <span class="spinner d-none" id="cfSpinner" aria-hidden="true"></span>
                      <span id="cfSubmitText">${esc(f.submitLabel)}</span>
                    </button>
                  </div>
                </div>

                <p class="form-success d-none" id="cfSuccess" role="status">
                  <strong>${esc(f.successTitle)}</strong> ${esc(f.successText)}
                </p>
                <p class="form-error d-none" id="cfError" role="alert">${esc(f.errorText)}</p>
              </form>
            </div>
          </div>
        </div>
      </section>`;

    initContactForm(f);
  }

  /** Валидация и имитация отправки. */
  function initContactForm(cfg) {
    const form = $("#contactForm");
    if (!form) return;

    const message = $("#cfMessage");
    const counter = $("#cfCounter");
    const success = $("#cfSuccess");
    const error = $("#cfError");
    const submit = $("#cfSubmit");
    const spinner = $("#cfSpinner");
    const submitText = $("#cfSubmitText");

    if (message && counter) {
      const sync = () => {
        if (message.value.length > 1000) message.value = message.value.slice(0, 1000);
        counter.textContent = String(message.value.length);
      };
      message.addEventListener("input", sync);
      sync();
    }

    /* Живая валидация после первой попытки отправки. */
    form.addEventListener("input", (e) => {
      if (form.dataset.tried === "1" && e.target.checkValidity) {
        setFieldState(e.target, e.target.checkValidity());
      }
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      success.classList.add("d-none");
      error.classList.add("d-none");
      form.dataset.tried = "1";

      let valid = true;

      Array.prototype.forEach.call(form.elements, (el) => {
        if (!el.checkValidity) return;
        let fieldValid = el.checkValidity();

        /* Дополнительная проверка email: нативный type=email пропускает "a@b". */
        if (el.id === "cfEmail") {
          const ok = /^[^\s@]+@[^\s@]+\.[a-zA-Zа-яА-Я]{2,}$/.test(el.value.trim());
          el.setCustomValidity(ok ? "" : "invalid");
          fieldValid = ok;
        }

        setFieldState(el, fieldValid);
        if (!fieldValid) valid = false;
      });

      if (!valid) {
        const firstInvalid = form.querySelector(".field.is-invalid, input.is-invalid");
        if (firstInvalid) {
          firstInvalid.focus({ preventScroll: true });
          firstInvalid.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "center" });
        }
        return;
      }

      submitContactForm(new FormData(form), { submit, spinner, submitText, success, error, form, cfg });
    });
  }

  function setFieldState(el, ok) {
    // Класс вешаем на поле и на обёртку, чтобы подсветить и чекбокс, и select
    el.classList.toggle("is-invalid", !ok);
    el.classList.toggle("is-valid", ok);
  }

  /**
   * ИМИТАЦИЯ ОТПРАВКИ.
   * Чтобы подключить реальный бэкенд, замените setTimeout на fetch:
   *   fetch("/api/contact", { method: "POST", body: data })
   */
  function submitContactForm(data, ui) {
    const { submit, spinner, submitText, success, error, form, cfg } = ui;

    submit.disabled = true;
    spinner.classList.remove("d-none");
    submitText.textContent = (cfg && cfg.sendingLabel) || "Отправляем…";

    const payload = Object.fromEntries(data.entries());

    setTimeout(() => {
      submit.disabled = false;
      spinner.classList.add("d-none");
      submitText.textContent = (cfg && cfg.submitLabel) || "Отправить";

      success.classList.remove("d-none");
      success.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "center" });

      if (window.console) console.info("[demo] Данные формы (никуда не отправлены):", payload);

      form.reset();
      delete form.dataset.tried;
      Array.prototype.forEach.call(form.elements, (el) => {
        el.classList.remove("is-valid", "is-invalid");
        if (el.setCustomValidity) el.setCustomValidity("");
      });

      const counter = $("#cfCounter");
      if (counter) counter.textContent = "0";
    }, 1200);
  }

  /* ===========================================================================
     12. ОБЩИЙ ИНТЕРАКТИВ
     ======================================================================== */

  function initTheme() {
    const KEY = "portfolio-theme";
    const root = document.documentElement;
    const toggle = $("#themeToggle");
    if (!toggle) return;

    const sync = () => {
      const dark = root.getAttribute("data-bs-theme") === "dark";
      toggle.innerHTML = icon(dark ? "bi-sun" : "bi-moon-stars");
      toggle.setAttribute("aria-pressed", String(dark));
    };

    const apply = (mode) => {
      root.setAttribute("data-bs-theme", mode);
      try { localStorage.setItem(KEY, mode); } catch (e) {}
      sync();
    };

    let themeTimer;
    const withFade = (fn) => {
      if (prefersReduced) { fn(); return; }
      clearTimeout(themeTimer);
      root.classList.add("theme-transition");
      fn();
      themeTimer = setTimeout(() => root.classList.remove("theme-transition"), 420);
    };

    toggle.addEventListener("click", () => {
      const current = root.getAttribute("data-bs-theme") === "dark" ? "dark" : "light";
      const next = current === "dark" ? "light" : "dark";

      if (document.startViewTransition && !prefersReduced) {
        const t = document.startViewTransition(() => apply(next));
        t.ready.then(() => {
          root.animate(
            {
              clipPath: ["inset(0 0 100% 0)", "inset(0 0 0 0)"]
            },
            {
              duration: 600,
              easing: "cubic-bezier(0.65, 0, 0.35, 1)",
              pseudoElement: "::view-transition-new(root)"
            }
          );
        });
        return;
      }

      withFade(() => apply(next));
    });

    sync();
  }

  function initNavScroll() {
    const nav = $("#mainNav");
    const progress = $("#scrollProgress");
    const top = $("#backToTop");

    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop;
      if (nav) nav.classList.toggle("is-scrolled", y > 12);
      if (top) top.classList.toggle("is-visible", y > 700);
      if (progress) {
        const height = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = `${height > 0 ? Math.min(100, (y / height) * 100) : 0}%`;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (top) {
      top.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
      });
    }
  }

  /**
   * Спокойное появление блоков при прокрутке.
   * Атрибут data-reveal проставляется здесь, чтобы не засорять разметку:
   * правило в CSS срабатывает на сам факт наличия атрибута.
   */
  function initReveal() {
    const selector = [
      "[data-reveal]",
      ".hero-main", ".hero-side",
      ".timeline-row", ".project-row",
      ".principle", ".skill-col",
      ".contact-card", ".case-section"
    ].join(", ");

    const items = $$(selector);
    if (!items.length) return;

    if (prefersReduced || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    items.forEach((el) => { el.dataset.reveal = ""; });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });

    items.forEach((el) => observer.observe(el));
  }

  function initSmoothAnchors() {
    $$('a[href^="#"]').forEach((link) => {
      const target = link.getAttribute("href");
      if (!target || target === "#") return;
      link.addEventListener("click", (e) => {
        const el = document.querySelector(target);
        if (!el) return;
        e.preventDefault();
        el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
      });
    });
  }

  /* ===========================================================================
     13. ЗАПУСК
     ======================================================================== */

  function init() {
    applyMeta();
    renderNavbar();
    renderFooter();

    switch (page) {
      case "home":
        renderHero();
        renderAboutShort();
        renderFeaturedProjects();
        renderHomeCta();
        break;
      case "about":
        renderAboutHero();
        renderStory();
        renderEducation();
        renderSkills();
        renderGrowth();
        renderPrinciples();
        break;
      case "projects":
        renderProjectsPage();
        break;
      case "project":
        renderProjectPage();
        break;
      case "contacts":
        renderContacts();
        break;
      default:
        break;
    }

    initTheme();
    initNavScroll();
    initReveal();
    initSmoothAnchors();

    document.body.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
