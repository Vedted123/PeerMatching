// Firebase setup
const firebaseConfig = {
  apiKey: "AIzaSyA9xmlbnn98hTKfWi5Of0OKHfy-nppTLNk",
  authDomain: "peer-2bd22.firebaseapp.com",
  databaseURL: "https://peer-2bd22-default-rtdb.firebaseio.com",
  projectId: "peer-2bd22",
  storageBucket: "peer-2bd22.appspot.com",
  messagingSenderId: "871101246393",
  appId: "1:871101246393:web:474ce51f90c8dff383a468"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();
let currentUser = null;
let username = null;

function emailify(name) {
  return `${name}@peerapp.com`;
}

function login() {
  username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  auth.signInWithEmailAndPassword(emailify(username), password).catch(e => alert(e.message));
}

function signup() {
  username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  auth.createUserWithEmailAndPassword(emailify(username), password).catch(e => alert(e.message));
}

function logout() {
  auth.signOut();
}

auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    username = user.email.split("@")[0];
    document.getElementById("authBox").classList.add("hide");
    document.getElementById("mainApp").classList.remove("hide");
    document.getElementById("displayUsername").textContent = username;
    syncData();
  } else {
    document.getElementById("authBox").classList.remove("hide");
    document.getElementById("mainApp").classList.add("hide");
  }
});

function toggleOther(select, otherId) {
  document.getElementById(otherId).style.display = select.value === "Other" ? "block" : "none";
}

function getSubject(selectId, otherId) {
  const select = document.getElementById(selectId);
  return select.value === "Other" ? document.getElementById(otherId).value.trim() : select.value;
}

function registerTutor() {
  const subject = getSubject("tutorSubject", "tutorOther");
  const grade = parseFloat(document.getElementById("tutorGrade").value);
  if (subject && !isNaN(grade)) {
    const id = db.ref("tutors").push().key;
    db.ref("tutors/" + id).set({ username, subject, grade });
    document.getElementById("tutorSubject").value = '';
    document.getElementById("tutorOther").value = '';
    document.getElementById("tutorGrade").value = '';
  }
}

function registerSeeker() {
  const subject = getSubject("seekerSubject", "seekerOther");
  const grade = parseFloat(document.getElementById("seekerGrade").value);
  if (subject && !isNaN(grade)) {
    const id = db.ref("seekers").push().key;
    db.ref("seekers/" + id).set({ username, subject, grade });
    document.getElementById("seekerSubject").value = '';
    document.getElementById("seekerOther").value = '';
    document.getElementById("seekerGrade").value = '';
  }
}

function matchSeeker(id, seeker) {
  db.ref("tutors").once("value", snap => {
    const tutors = snap.val();
    if (tutors) {
      const eligible = Object.entries(tutors).filter(([key, tutor]) =>
        tutor.subject.toLowerCase() === seeker.subject.toLowerCase() &&
        Math.abs(tutor.grade - seeker.grade) <= 3
      );

      if (eligible.length > 0) {
        eligible.sort((a, b) =>
          Math.abs(a[1].grade - seeker.grade) - Math.abs(b[1].grade - seeker.grade)
        );

        const [matchKey, matchTutor] = eligible[0];

        const matchId = db.ref("matches").push().key;
        db.ref("matches/" + matchId).set({
          seekerName: seeker.username,
          tutorName: matchTutor.username,
          subject: seeker.subject,
          seekerGrade: seeker.grade,
          tutorGrade: matchTutor.grade
        });

        db.ref("seekers/" + id).remove();
        db.ref("tutors/" + matchKey).remove();

        document.getElementById("matchMessage").textContent =
          `"${seeker.username}" matched with "${matchTutor.username}" successfully for "${seeker.subject}"`;
      } else {
        document.getElementById("matchMessage").textContent =
          `❌ No tutor found within 3 grades for "${seeker.subject}"`;
      }
    }
  });
}

function syncData() {
  db.ref("tutors").on("value", snap => {
    const data = snap.val() || {};
    document.getElementById("tutorList").innerHTML = Object.values(data).map(t => `
      <tr><td>${t.username}</td><td>${t.subject}</td><td>${t.grade}</td></tr>`).join('');
  });

  db.ref("seekers").on("value", snap => {
    const data = snap.val() || {};
    const list = Object.entries(data).map(([id, s]) => {
      const show = s.username === username;
      return `<tr>
        <td>${s.username}</td><td>${s.subject}</td><td>${s.grade}</td>
        <td>${show ? `<button onclick='matchSeeker("${id}", ${JSON.stringify(s)})'>Match Me</button>` : ""}</td>
      </tr>`;
    });
    document.getElementById("seekerList").innerHTML = list.join('');
  });

  db.ref("matches").on("value", snap => {
    const data = snap.val() || {};
    renderMatches(data);
  });
}

function renderMatches(data) {
  const list = document.getElementById("matchedList");
  list.innerHTML = '';
  for (let id in data) {
    const m = data[id];
    list.innerHTML += `<tr>
      <td>${m.seekerName}</td><td>${m.subject}</td><td>${m.seekerGrade}</td>
      <td>${m.tutorName}</td><td>${m.tutorGrade}</td>
      <td>
        <a href="chat.html?matchId=${id}"><button>Chat</button></a>
      </td>
    </tr>`;
  }
}
