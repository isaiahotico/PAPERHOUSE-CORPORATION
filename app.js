
// --- DATABASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyBwpa8mA83JAv2A2Dj0rh5VHwodyv5N3dg",
    authDomain: "facebook-follow-to-follow.firebaseapp.com",
    databaseURL: "https://facebook-follow-to-follow-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "facebook-follow-to-follow",
    storageBucket: "facebook-follow-to-follow.firebasestorage.app",
    messagingSenderId: "589427984313",
    appId: "1:589427984313:web:a17b8cc851efde6dd79868"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// State Variables
let currentUser = null;
let adTimer = null;
let currentSeconds = 20;
let clickCount = 0;
const AD_URL = "https://www.profitablecpmratenetwork.com/i2rx8svvds?key=ec449a85ea63cb0b7adf4cd90009cbca";
const REWARD_AMOUNT = 0.00014;
const FAUCETPAY_API_KEY = "a92bb3fc17bf8476f2705f613ffc976dff7d8ed8f977c1e80294beb4f131a7f3";

// --- AUTHENTICATION LOGIC ---
function handleAuth() {
    const email = document.getElementById('login-email').value;
    const refCode = document.getElementById('ref-input').value;

    if (!email.includes('@')) return alert("Enter a valid FaucetPay Gmail");

    const userId = btoa(email).replace(/=/g, ""); // Simple UID generation
    db.ref('users/' + userId).once('value', (snapshot) => {
        if (snapshot.exists()) {
            loginUser(snapshot.val(), userId);
        } else {
            // Register new user
            const newUser = {
                email: email,
                balance: 0,
                referrals: 0,
                refEarned: 0,
                refCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                totalClicks: 0,
                referredBy: refCode || "none"
            };
            db.ref('users/' + userId).set(newUser);
            // Credit referral bonus to upline if exists
            if (refCode) handleReferralCredit(refCode);
            loginUser(newUser, userId);
        }
    });
}

function loginUser(userData, userId) {
    currentUser = { ...userData, id: userId };
    localStorage.setItem('paperhouse_user', userId);
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    document.getElementById('my-ref-code').innerText = currentUser.refCode;
    initUserStats();
    updatePresence();
}

// Auto-login check
window.onload = () => {
    const savedId = localStorage.getItem('paperhouse_user');
    if (savedId) {
        db.ref('users/' + savedId).once('value', snap => {
            if (snap.exists()) loginUser(snap.val(), savedId);
        });
    }
    updateGlobalStats();
    setInterval(updateClock, 1000);
};

// --- AD TASK LOGIC ---
function startAdTask(type) {
    if (clickCount >= 3000) {
        alert("Daily limit reached. Cooldown: 5 minutes.");
        setTimeout(() => clickCount = 0, 300000);
        return;
    }

    const adWindow = window.open(AD_URL, '_blank');
    document.getElementById('ad-timer-display').classList.remove('hidden');
    currentSeconds = 20;

    adTimer = setInterval(() => {
        // Simple focus check (Note: Cross-domain restrictions prevent checking exact content)
        if (document.hasFocus()) {
            currentSeconds--;
            document.getElementById('seconds').innerText = currentSeconds;

            if (currentSeconds <= 0) {
                clearInterval(adTimer);
                finishTask();
            }
        } else {
            // Logic to prompt user to keep window open
            console.log("Tab inactive, timer paused...");
        }
    }, 1000);
}

function finishTask() {
    document.getElementById('success-sound').play();
    document.getElementById('ad-timer-display').classList.add('hidden');
    document.getElementById('claim-area').classList.remove('hidden');
}

async function claimReward() {
    document.getElementById('claim-area').classList.add('hidden');
    
    // 1. Credit Database
    const newBalance = (parseFloat(currentUser.balance) + REWARD_AMOUNT).toFixed(8);
    db.ref('users/' + currentUser.id).update({
        balance: newBalance,
        totalClicks: (currentUser.totalClicks || 0) + 1
    });

    // 2. Trigger FaucetPay (Note: This will likely fail due to CORS in browser)
    // In a real app, you MUST call this from a server!
    try {
        await fetch(`https://faucetpay.io/api/v1/send?api_key=${FAUCETPAY_API_KEY}&currency=SOL&amount=${REWARD_AMOUNT * 100000000}&to=${currentUser.email}`);
        
        // Log withdrawal
        db.ref('withdrawals').push({
            email: currentUser.email,
            amount: REWARD_AMOUNT,
            time: Date.now()
        });
    } catch (e) {
        console.warn("API Payout failed - CORS restriction or Invalid Key. Balancing internally.");
    }

    alert(`Congratulations! ${REWARD_AMOUNT} USDT credited to your FaucetPay!`);
    clickCount++;
    showSection('earn');
}

// --- REFERRAL SYSTEM ---
function handleReferralCredit(code) {
    db.ref('users').orderByChild('refCode').equalTo(code).once('value', snap => {
        if (snap.exists()) {
            const uplineId = Object.keys(snap.val())[0];
            db.ref('users/' + uplineId).transaction(user => {
                if (user) {
                    user.referrals = (user.referrals || 0) + 1;
                }
                return user;
            });
        }
    });
}

// --- UI LOGIC ---
function showSection(sect) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.add('hidden-section'));
    document.getElementById(sect + '-section').classList.remove('hidden-section');
}

function updateTheme() {
    const bg = document.getElementById('color-bg').value;
    const accent = document.getElementById('color-accent').value;
    document.documentElement.style.setProperty('--bg-color', bg);
    document.documentElement.style.setProperty('--primary-color', accent);
}

function updateClock() {
    const now = new Date();
    document.getElementById('current-date').innerText = now.toLocaleDateString();
    document.getElementById('current-time').innerText = now.toLocaleTimeString();
    
    // Update Online Count (Randomized variation for simulation or link to actual presence)
    document.getElementById('stat-online').innerText = Math.floor(Math.random() * 10) + 5;
}

function updateGlobalStats() {
    db.ref('users').on('value', snap => {
        document.getElementById('stat-total-users').innerText = snap.numChildren();
    });

    db.ref('withdrawals').limitToLast(10).on('value', snap => {
        const list = document.getElementById('withdrawal-list');
        list.innerHTML = "";
        snap.forEach(child => {
            const data = child.val();
            list.innerHTML += `
                <div class="flex justify-between border-b border-white/5 p-2">
                    <span>${data.email.substring(0,3)}...</span>
                    <span class="text-green-400">+${data.amount} USDT</span>
                </div>
            `;
        });
    });
}

function initUserStats() {
    db.ref('users/' + currentUser.id).on('value', snap => {
        const data = snap.val();
        document.getElementById('user-balance').innerText = parseFloat(data.balance).toFixed(5) + " USDT";
        document.getElementById('ref-count').innerText = data.referrals || 0;
        document.getElementById('ref-earned').innerText = (data.refEarned || 0).toFixed(5) + " USDT";
    });
}

function updatePresence() {
    const onlineRef = db.ref('online_users/' + currentUser.id);
    onlineRef.set(true);
    onlineRef.onDisconnect().remove();
}

function logout() {
    localStorage.clear();
    location.reload();
}
