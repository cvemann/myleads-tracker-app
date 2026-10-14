import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js"
import {
    getDatabase,
    ref,
    push,
    onValue,
    remove
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js"

const firebaseConfig = {
    databaseURL: "https://my-leads-tracker-d2c8f-default-rtdb.europe-west1.firebasedatabase.app/"
}

const app = initializeApp(firebaseConfig)
const database = getDatabase(app)
const referenceInDB = ref(database, "leads")

// console.log(firebaseConfig.databaseURL)


// let myLeads = []
const inputEl = document.getElementById("input-el")
const inputBtn = document.getElementById("input-btn")
const ulEl = document.getElementById("ul-el")
const deleteBtn = document.getElementById("delete-btn")
const countEl = document.getElementById("count")
const emptyEl = document.getElementById("empty")
const noteEl = document.getElementById("note")
// const leadsFromLocalStorage = JSON.parse( localStorage.getItem("myLeads") )
// const tabBtn = document.getElementById("tab-btn")

// if (leadsFromLocalStorage) {
//     myLeads = leadsFromLocalStorage
//     render(myLeads)
// }

// tabBtn.addEventListener("click", function(){    
//     chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
//         myLeads.push(tabs[0].url)
//         localStorage.setItem("myLeads", JSON.stringify(myLeads) )
//         render(myLeads)
//     })
// })

// how many leads were on screen last time, so a new one can animate in
let lastCount = -1

// I build each list item with createElement instead of innerHTML, so a
// saved link can only ever show up as text, never run as code
function render(leads) {
    ulEl.textContent = ""

    // newest first
    for (let i = leads.length - 1; i >= 0; i--) {
        const li = document.createElement("li")
        const a = document.createElement("a")
        a.href = leads[i]
        a.target = "_blank"
        a.rel = "noopener"

        const number = document.createElement("span")
        number.className = "number"
        number.textContent = String(i + 1).padStart(2, "0")

        const link = document.createElement("span")
        link.className = "link"
        let shortLink = leads[i].replace("https://", "").replace("http://", "").replace("www.", "")
        if (shortLink.endsWith("/")) {
            shortLink = shortLink.slice(0, -1)
        }
        link.textContent = shortLink

        const arrow = document.createElement("span")
        arrow.className = "arrow"
        arrow.textContent = "↗"

        a.append(number, link, arrow)
        li.append(a)
        ulEl.append(li)
    }

    // the newest lead prints in, but only when one was just added
    if (lastCount !== -1 && leads.length > lastCount) {
        ulEl.firstChild.classList.add("is-new")
    }
    lastCount = leads.length

    countEl.textContent = leads.length + (leads.length === 1 ? " lead" : " leads")
    emptyEl.hidden = leads.length > 0
    deleteBtn.hidden = leads.length === 0
}

onValue(referenceInDB, function (snapshot) {
    const snapshotDoesExist = snapshot.exists()
    if (snapshotDoesExist) {
        const snapshotValues = snapshot.val()
        const leads = Object.values(snapshotValues)
        render(leads)
    } else {
        render([])
    }
})

// "example.com" becomes "https://example.com"; anything without a dot or
// with spaces isn't a link
function fixLink(text) {
    text = text.trim()
    if (text === "" || text.includes(" ") || !text.includes(".")) {
        return ""
    }
    if (!text.startsWith("http://") && !text.startsWith("https://")) {
        text = "https://" + text
    }
    return text
}

function saveInput() {
    const link = fixLink(inputEl.value)
    if (link === "") {
        noteEl.textContent = inputEl.value.trim() === "" ? "Enter a link first." : "That doesn't look like a link."
        inputEl.classList.add("is-wrong")
        return
    }
    noteEl.textContent = ""
    inputEl.classList.remove("is-wrong")
    push(referenceInDB, link)
    inputEl.value = ""
}

inputBtn.addEventListener("click", saveInput)

inputEl.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        saveInput()
    }
})

inputEl.addEventListener("input", function () {
    noteEl.textContent = ""
    inputEl.classList.remove("is-wrong")
})

// delete all: hold the button for a second. the slanted lines fill it
// while you hold, and letting go early cancels it
let holdTimer = null
let progress = 0

function startHold(event) {
    if (event.type === "keydown" && event.key !== " " && event.key !== "Enter") return
    if (holdTimer) return
    event.preventDefault()
    deleteBtn.classList.add("is-holding")

    holdTimer = setInterval(function () {
        progress = progress + 2
        deleteBtn.style.setProperty("--progress", progress + "%")
        if (progress >= 100) {
            stopHold()
            deleteAll()
        }
    }, 20)
}

function stopHold() {
    clearInterval(holdTimer)
    holdTimer = null
    progress = 0
    deleteBtn.classList.remove("is-holding")
    deleteBtn.style.setProperty("--progress", "0%")
}

function deleteAll() {
    // the leads slide away first, then they're removed
    ulEl.classList.add("is-leaving")
    setTimeout(function () {
        remove(referenceInDB)
        ulEl.classList.remove("is-leaving")
    }, 300)
}

deleteBtn.addEventListener("pointerdown", startHold)
deleteBtn.addEventListener("pointerup", stopHold)
deleteBtn.addEventListener("pointerleave", stopHold)
deleteBtn.addEventListener("keydown", startHold)
deleteBtn.addEventListener("keyup", stopHold)

// theme switch: dark is the default. the choice is saved, so the lab
// and every project open in the same theme
const themeButton = document.querySelector(".theme-toggle")
const themeLabel = document.querySelector(".theme-label")

function showTheme() {
    if (document.documentElement.dataset.theme === "light") {
        themeLabel.textContent = "dark"
        themeButton.setAttribute("aria-label", "Switch to dark mode")
    } else {
        themeLabel.textContent = "light"
        themeButton.setAttribute("aria-label", "Switch to light mode")
    }
}

themeButton.addEventListener("click", function () {
    if (document.documentElement.dataset.theme === "light") {
        delete document.documentElement.dataset.theme
        localStorage.setItem("theme", "dark")
    } else {
        document.documentElement.dataset.theme = "light"
        localStorage.setItem("theme", "light")
    }
    showTheme()
})

showTheme()
