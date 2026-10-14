// The leads live in a Firebase Realtime Database, under "leads".
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

// calls back with [[key, url], ...] in the order they were saved
export function watchLeads(callback) {
    onValue(referenceInDB, (snapshot) => {
        callback(snapshot.exists() ? Object.entries(snapshot.val()) : [])
    })
}

export function saveLead(url) {
    return push(referenceInDB, url)
}

export function deleteAllLeads() {
    return remove(referenceInDB)
}
