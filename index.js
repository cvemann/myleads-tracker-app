import { watchLeads, saveLead, deleteAllLeads } from "./store.js"

// Theme toggle: dark by default; the choice is shared with the lab.
(() => {
  const button = document.querySelector(".theme-toggle");
  if (!button) return;
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const label = () => button.setAttribute("aria-label", root.dataset.theme === "light" ? "Switch to dark mode" : "Switch to light mode");
  function apply(theme) {
    if (theme === "light") root.dataset.theme = "light";
    else delete root.dataset.theme;
    try { localStorage.setItem("theme", theme); } catch (e) {}
    label();
  }
  button.addEventListener("click", () => {
    const next = root.dataset.theme === "light" ? "dark" : "light";
    if (document.startViewTransition && !reduceMotion.matches) document.startViewTransition(() => apply(next));
    else apply(next);
  });
  label();
})();

const form = document.getElementById("save-form")
const inputEl = document.getElementById("input-el")
const note = document.getElementById("save-note")
const ulEl = document.getElementById("ul-el")
const countEl = document.getElementById("count")
const emptyEl = document.getElementById("empty")
const deleteBtn = document.getElementById("delete-btn")
const motion = document.documentElement.classList.contains("motion")

let known = null // keys already on screen, so only new leads print in

// accept "example.com" as well as full links; only web links are kept
function normalise(value) {
    const text = value.trim()
    if (!text) return null
    const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : "https://" + text
    try {
        const url = new URL(withScheme)
        if (url.protocol !== "http:" && url.protocol !== "https:") return null
        if (!url.hostname.includes(".")) return null
        return url.href
    } catch (e) {
        return null
    }
}

function row(key, href, index, total) {
    const li = document.createElement("li")
    li.className = "lead"
    li.dataset.key = key
    const a = document.createElement("a")
    a.href = href
    a.target = "_blank"
    a.rel = "noopener"

    const no = document.createElement("span")
    no.className = "lead-no"
    no.textContent = String(total - index).padStart(2, "0")

    let host = href
    let rest = ""
    try {
        const url = new URL(href)
        host = url.hostname.replace(/^www\./, "")
        rest = (url.pathname === "/" ? "" : url.pathname) + url.search
    } catch (e) {}

    const name = document.createElement("span")
    name.className = "lead-url"
    const strong = document.createElement("b")
    strong.textContent = host
    const path = document.createElement("span")
    path.textContent = rest
    name.append(strong, path)

    const arrow = document.createElement("span")
    arrow.className = "lead-arrow"
    arrow.setAttribute("aria-hidden", "true")
    arrow.textContent = "↗"

    a.append(no, name, arrow)
    li.append(a)
    return li
}

function render(entries) {
    const leads = entries.slice().reverse() // newest first
    const items = leads.map(([key, href], i) => {
        const li = row(key, String(href), i, leads.length)
        if (known && !known.has(key) && motion) li.classList.add("is-new")
        return li
    })
    ulEl.replaceChildren(...items)
    known = new Set(leads.map(([key]) => key))
    countEl.textContent = leads.length === 1 ? "1 lead" : `${leads.length} leads`
    emptyEl.hidden = leads.length > 0
    deleteBtn.hidden = leads.length === 0
}

watchLeads(render)

form.addEventListener("submit", (e) => {
    e.preventDefault()
    const href = normalise(inputEl.value)
    if (!href) {
        note.textContent = inputEl.value.trim() ? "That doesn't look like a web link." : "Enter a link first."
        form.classList.remove("is-wrong")
        void form.offsetWidth
        form.classList.add("is-wrong")
        inputEl.focus()
        return
    }
    note.textContent = ""
    form.classList.remove("is-wrong")
    saveLead(href)
    inputEl.value = ""
})

inputEl.addEventListener("input", () => {
    if (note.textContent) note.textContent = ""
    form.classList.remove("is-wrong")
})

// Delete all: press and hold for a second while the hatch fills the
// button. Letting go early cancels it.
const HOLD = 1000
let holdStart = 0
let holdFrame = 0

function setProgress(p) {
    deleteBtn.style.setProperty("--p", p.toFixed(3))
}

function startHold(e) {
    if (holdStart || (e.type === "keydown" && e.key !== " " && e.key !== "Enter")) return
    if (e.type === "keydown") e.preventDefault()
    holdStart = performance.now()
    deleteBtn.classList.add("is-holding")
    const step = (now) => {
        const p = Math.min(1, (now - holdStart) / HOLD)
        setProgress(p)
        if (p < 1) holdFrame = requestAnimationFrame(step)
        else finishHold()
    }
    holdFrame = requestAnimationFrame(step)
}

function cancelHold() {
    if (!holdStart) return
    cancelAnimationFrame(holdFrame)
    holdStart = 0
    deleteBtn.classList.remove("is-holding")
    setProgress(0)
}

function finishHold() {
    holdStart = 0
    deleteBtn.classList.remove("is-holding")
    const rows = [...ulEl.children]
    if (motion) rows.forEach((li, i) => {
        li.style.animationDelay = `${i * 30}ms`
        li.classList.add("is-leaving")
    })
    setTimeout(() => {
        deleteAllLeads()
        setProgress(0)
    }, motion ? 260 + rows.length * 30 : 0)
}

deleteBtn.addEventListener("pointerdown", startHold)
deleteBtn.addEventListener("keydown", startHold)
;["pointerup", "pointerleave", "pointercancel"].forEach((type) => deleteBtn.addEventListener(type, cancelHold))
deleteBtn.addEventListener("keyup", cancelHold)
deleteBtn.addEventListener("blur", cancelHold)
deleteBtn.addEventListener("contextmenu", (e) => e.preventDefault())
