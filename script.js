/* ============================================================
   off-by-one — blog behaviour
   Edit POSTS to publish. Everything else reacts to it.
   ============================================================ */

const POSTS = [
{
    title: "Apple Introduces State-of-the-Art M6 and M5 Ultra Chips",
    excerpt: "Apple officially debuted its next-generation M6 and M5 Ultra processors. The M6 represents Apple's first state-of-the-art 2-nanometer chip, packing a 12-core CPU, 12-core GPU, and up to 170GB/s of unified memory bandwidth into a design that scales AI workflows. Simultaneously, the powerhouse M5 Ultra introduces a pioneering quad-die architecture to deliver up to 512GB of unified memory and extreme local AI capabilities.",
    date: "2026-08-27",
    minutes: 7,
    tags: ["react", "perf"],
    url: "https://share.google/el4QqaTUVxEajfqJi"
  },
   
  {
    title: "The cost of a re-render",
    excerpt: "A re-render is cheap until it isn't. How to tell the difference with the Profiler, and why memoizing everything made my dashboard measurably slower.",
    date: "2026-08-18",
    minutes: 7,
    tags: ["react", "perf"],
    url: "#"
  },
  {
    title: "Reading a flame graph without panicking",
    excerpt: "Look for wide bars, not tall ones. A short field guide to finding the one function eating your request budget.",
    date: "2026-08-04",
    minutes: 6,
    tags: ["perf", "tooling"],
    url: "#"
  },
  {
    title: "SQLite is a better default than you think",
    excerpt: "One file, no daemon, and it outlasts the traffic most teams will ever see. Here is what actually breaks first when you push it.",
    date: "2026-07-21",
    minutes: 11,
    tags: ["databases"],
    url: "#"
  },
  {
    title: "Why your Docker build takes four minutes",
    excerpt: "It's the layer order. A walkthrough of cache invalidation in Dockerfiles, plus the three lines that halved our CI time.",
    date: "2026-07-02",
    minutes: 8,
    tags: ["tooling"],
    url: "#"
  },
  {
    title: "Debounce and throttle are not the same thing",
    excerpt: "One waits for silence, the other keeps a beat. Two small functions, and the case where each is the wrong choice.",
    date: "2026-06-15",
    minutes: 5,
    tags: ["javascript"],
    url: "#"
  },
  {
    title: "What git rebase --onto actually does",
    excerpt: "The three-argument form looks cryptic until you draw it. Once you can draw it, rewriting history stops being frightening.",
    date: "2026-05-28",
    minutes: 9,
    tags: ["git"],
    url: "#"
  },
  {
    title: "Type-safe env vars, zero dependencies",
    excerpt: "Parse process.env once at boot, fail loudly with the missing key names, and let the compiler carry the guarantee everywhere else.",
    date: "2026-05-09",
    minutes: 6,
    tags: ["typescript"],
    url: "#"
  }
];

/* ------------------------------------------------------------
   1. Theme — light is the default, choice is remembered
   ------------------------------------------------------------ */
const root = document.documentElement;
const themeBtn = document.getElementById("theme-btn");

function applyTheme(theme) {
  root.setAttribute("data-theme", theme);
  themeBtn.setAttribute(
    "aria-label",
    theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
  );
  try { localStorage.setItem("obo-theme", theme); } catch (e) { /* private mode */ }
}

let savedTheme = "light";
try { savedTheme = localStorage.getItem("obo-theme") || "light"; } catch (e) {}
applyTheme(savedTheme);

themeBtn.addEventListener("click", () => {
  applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
});

/* ------------------------------------------------------------
   2. Mobile menu
   ------------------------------------------------------------ */
const menuBtn = document.getElementById("menu-btn");
const nav = document.getElementById("nav");

menuBtn.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
});

nav.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    nav.classList.remove("is-open");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-label", "Open menu");
  }
});

/* ------------------------------------------------------------
   3. Reveal on scroll (skipped when motion is reduced)
   ------------------------------------------------------------ */
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const observer = reducedMotion
  ? null
  : new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (!entry.isIntersecting) return;
          entry.target.style.transitionDelay = Math.min(i * 60, 240) + "ms";
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );

function watch(el) {
  if (observer) observer.observe(el);
  else el.classList.add("is-in");
}

document.querySelectorAll(".reveal").forEach(watch);

/* ------------------------------------------------------------
   4. Render, search, filter
   ------------------------------------------------------------ */
const list = document.getElementById("posts");
const tagBar = document.getElementById("tags");
const search = document.getElementById("search");
const empty = document.getElementById("empty");
const count = document.getElementById("count");

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const newest = POSTS.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
const allTags = [...new Set(POSTS.flatMap((p) => p.tags))].sort();

let activeTag = "all";
let firstRender = true;

/* tag chips */
["all", ...allTags].forEach((tag) => {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.textContent = tag === "all" ? "all" : "#" + tag;
  chip.setAttribute("aria-pressed", String(tag === "all"));
  chip.addEventListener("click", () => {
    activeTag = tag;
    tagBar.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
    chip.setAttribute("aria-pressed", "true");
    render();
  });
  tagBar.appendChild(chip);
});

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}

function card(post, isLatest) {
  const d = new Date(post.date);
  const li = document.createElement("li");
  li.className = "post reveal";
  li.innerHTML = `
    <a class="post-link" href="${post.url}">
      <div class="post-when">
        <span class="mo">${MONTHS[d.getMonth()]}</span>
        <span class="yr">${d.getFullYear()}</span>
      </div>
      <div class="post-body">
        <h3 class="post-title">${escapeHtml(post.title)}${
          isLatest ? '<span class="badge">latest</span>' : ""
        }</h3>
        <p class="post-ex">${escapeHtml(post.excerpt)}</p>
        <p class="post-meta">
          <span class="tag-list">${post.tags.map((t) => "#" + t).join(" ")}</span>
          <span aria-hidden="true">·</span>
          <span>${post.minutes} min read</span>
        </p>
      </div>
      <span class="post-go" aria-hidden="true">&rarr;</span>
    </a>`;
  return li;
}

function render() {
  const q = search.value.trim().toLowerCase();

  const matches = newest.filter((post) => {
    const byTag = activeTag === "all" || post.tags.includes(activeTag);
    const haystack = (post.title + " " + post.excerpt + " " + post.tags.join(" ")).toLowerCase();
    return byTag && (q === "" || haystack.includes(q));
  });

  list.innerHTML = "";
  matches.forEach((post) => {
    const el = card(post, post === newest[0] && activeTag === "all" && q === "");
    list.appendChild(el);
    // Animate on first paint only — filter results should appear instantly.
    if (firstRender) watch(el);
    else el.classList.add("is-in");
  });

  empty.hidden = matches.length > 0;
  count.textContent = matches.length;
  firstRender = false;
}

let timer;
search.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(render, 120);
});

document.getElementById("clear").addEventListener("click", () => {
  search.value = "";
  activeTag = "all";
  tagBar.querySelectorAll(".chip").forEach((c, i) => c.setAttribute("aria-pressed", String(i === 0)));
  render();
  search.focus();
});

render();

/* ------------------------------------------------------------
   5. Subscribe form
   ------------------------------------------------------------ */
const form = document.getElementById("sub-form");
const email = document.getElementById("email");
const msg = document.getElementById("form-msg");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = email.value.trim();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

  msg.classList.remove("is-ok", "is-err");

  if (!valid) {
    msg.textContent = "Enter an email address like you@example.com.";
    msg.classList.add("is-err");
    email.focus();
    return;
  }

  // Point this at your mailing-list endpoint.
  msg.textContent = "You're on the list. Next post lands Tuesday.";
  msg.classList.add("is-ok");
  form.reset();
});
