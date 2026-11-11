/* Header: logo overflows at the top of the page, shrinks once scrolled */
(function () {
  var header = document.querySelector(".site-header");
  if (!header) return;

  function update() {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
  }

  update();
  window.addEventListener("scroll", update, { passive: true });
})();

/* Contact dropdown in the header + copy-email buttons */
(function () {
  var menu = document.querySelector(".contact-menu");

  if (menu) {
    var trigger = menu.querySelector(".contact-trigger");
    var panel = menu.querySelector(".contact-panel");

    var setOpen = function (open, returnFocus) {
      trigger.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
      if (!open && returnFocus) trigger.focus();
    };

    trigger.addEventListener("click", function () {
      setOpen(panel.hidden);
    });

    document.addEventListener("click", function (e) {
      if (!panel.hidden && !menu.contains(e.target)) setOpen(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) setOpen(false, true);
    });

    menu.addEventListener("focusout", function (e) {
      if (!panel.hidden && e.relatedTarget && !menu.contains(e.relatedTarget)) setOpen(false);
    });
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (err) {}
    document.body.removeChild(ta);
  }

  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    var label = btn.querySelector(".contact-hint, .copy-label");
    var defaultText = label.textContent;
    var doneText = btn.getAttribute("data-copied-label");
    var timer;

    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); });
      } else {
        fallbackCopy(text);
      }
      btn.classList.add("is-copied");
      label.textContent = doneText;
      clearTimeout(timer);
      timer = setTimeout(function () {
        btn.classList.remove("is-copied");
        label.textContent = defaultText;
      }, 2000);
    });
  });
})();

/* Interactive "How it works" walkthrough */
(function () {
  var wrap = document.querySelector(".mock-steps");
  if (!wrap) return;

  var steps = Array.prototype.slice.call(wrap.querySelectorAll(".mock-step"));
  if (steps.length < 2) return;

  var current = 0;
  wrap.classList.add("is-stepper");
  if (wrap.dataset.click) wrap.style.setProperty("--click-label", JSON.stringify(wrap.dataset.click));

  var nav = document.createElement("div");
  nav.className = "mock-nav";
  var count = document.createElement("p");
  count.className = "mock-count";
  count.setAttribute("aria-live", "polite");

  var prev = document.createElement("button");
  prev.type = "button";
  prev.className = "mock-ctl";
  prev.textContent = "← " + wrap.dataset.prev;
  prev.addEventListener("click", function () { show(current - 1, true); });

  var next = document.createElement("button");
  next.type = "button";
  next.className = "mock-ctl primary";
  next.addEventListener("click", function () {
    show(current === steps.length - 1 ? 0 : current + 1, true);
  });

  nav.appendChild(count);
  var ctl = document.createElement("div");
  ctl.className = "mock-ctls";
  ctl.appendChild(prev);
  ctl.appendChild(next);
  nav.appendChild(ctl);
  wrap.parentNode.insertBefore(nav, wrap);

  function show(n, focusTop) {
    if (n < 0) n = 0;
    if (n > steps.length - 1) n = steps.length - 1;
    current = n;
    steps.forEach(function (s, i) {
      s.hidden = i !== n;
      s.querySelectorAll(".mock-popover").forEach(function (p) { p.hidden = true; });
      s.querySelectorAll("[data-reveal]").forEach(function (r) { r.classList.remove("is-done"); });
    });
    count.textContent = wrap.dataset.step + " " + (n + 1) + " / " + steps.length;
    prev.disabled = n === 0;
    next.textContent = n === steps.length - 1 ? wrap.dataset.restart : wrap.dataset.next + " →";
    if (focusTop) {
      var top = nav.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.5) {
        nav.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }

  function reveal(r) {
    var step = r.closest(".mock-step");
    var pop = step && step.querySelector(".mock-popover");
    if (pop) pop.hidden = false;
    r.classList.add("is-done");
  }

  function closePopover(c) {
    var step = c.closest(".mock-step");
    if (!step) return;
    step.querySelectorAll(".mock-popover").forEach(function (p) { p.hidden = true; });
    step.querySelectorAll("[data-reveal]").forEach(function (r) { r.classList.remove("is-done"); });
  }

  wrap.addEventListener("click", function (e) {
    var c = e.target.closest("[data-close]");
    if (c) { closePopover(c); return; }
    var r = e.target.closest("[data-reveal]");
    if (r) { reveal(r); return; }
    var t = e.target.closest("[data-go]");
    if (t) show(parseInt(t.getAttribute("data-go"), 10) - 1, true);
  });

  wrap.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-close]")) {
      e.preventDefault();
      closePopover(e.target);
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-reveal]")) {
      e.preventDefault();
      reveal(e.target);
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-go]")) {
      e.preventDefault();
      show(parseInt(e.target.getAttribute("data-go"), 10) - 1, true);
    }
  });

  show(0, false);
})();

/* "On this page": highlight the section currently being read */
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll(".case-sidebar a[href^='#']"));
  if (!links.length) return;

  var items = links
    .map(function (a) {
      var el = document.getElementById(a.getAttribute("href").slice(1));
      return el ? { link: a, el: el } : null;
    })
    .filter(Boolean);
  if (!items.length) return;

  var ticking = false;

  function update() {
    ticking = false;
    var line = window.innerHeight * 0.3;
    var current = items[0];
    items.forEach(function (it) {
      if (it.el.getBoundingClientRect().top <= line) current = it;
    });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      current = items[items.length - 1];
    }
    items.forEach(function (it) {
      var on = it === current;
      it.link.classList.toggle("active", on);
      if (on) it.link.setAttribute("aria-current", "location");
      else it.link.removeAttribute("aria-current");
    });
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();

/* Case studies: show the first N cards, reveal the rest with a "Show more" button */
(function () {
  var grid = document.querySelector(".work-grid[data-visible]");
  if (!grid) return;

  var limit = parseInt(grid.getAttribute("data-visible"), 10);
  var extras = Array.prototype.slice.call(grid.querySelectorAll(".work-card")).slice(limit);
  if (!extras.length) return;

  var wrap = document.createElement("div");
  wrap.className = "work-more";
  var button = document.createElement("button");
  button.type = "button";
  button.className = "work-more__btn";
  button.setAttribute("aria-expanded", "false");
  wrap.appendChild(button);
  grid.insertAdjacentElement("afterend", wrap);

  var setExpanded = function (expanded) {
    extras.forEach(function (card) {
      card.hidden = !expanded;
    });
    wrap.classList.toggle("is-collapsed", !expanded);
    button.setAttribute("aria-expanded", String(expanded));
    button.textContent = grid.getAttribute(expanded ? "data-less" : "data-more");
  };

  button.addEventListener("click", function () {
    var expanded = button.getAttribute("aria-expanded") !== "true";
    setExpanded(expanded);
    if (expanded) extras[0].focus();
  });

  setExpanded(false);
})();

// Case-study embeds report their content height so the frame has no empty space below the prototype
window.addEventListener('message', function (event) {
  if (!event.data || event.data.type !== 'embed-height') return;
  document.querySelectorAll('iframe.case-embed').forEach(function (frame) {
    if (frame.contentWindow === event.source) frame.style.height = event.data.height + 'px';
  });
});
