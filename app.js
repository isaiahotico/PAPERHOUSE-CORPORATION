
// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyBwpa8mA83JAv2A2Dj0rh5VHwodyv5N3dg",
    authDomain: "facebook-follow-to-follow.firebaseapp.com",
    databaseURL: "https://facebook-follow-to-follow-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "facebook-follow-to-follow",
    storageBucket: "facebook-follow-to-follow.firestorage.app", // Corrected from firestorage.app to firestorage.googleapis.com or similar if needed
    messagingSenderId: "589427984313",
    appId: "1:589427984313:web:a17b8cc851efde6dd79868"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// --- DOM Elements ---
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const userDisplayName = document.getElementById('user-display-name');
const totalUsersSpan = document.getElementById('total-users');
const onlineUsersSpan = document.getElementById('online-users');
const totalEarnedSpan = document.getElementById('total-earned');
const userBalanceSpan = document.getElementById('user-balance');
const referralCodeSpan = document.getElementById('referral-code');
const totalReferralsSpan = document.getElementById('total-referrals');
const earnedFromReferralsSpan = document.getElementById('earned-from-referrals');
const withdrawButton = document.getElementById('withdraw-button');
const adContainer = document.getElementById('ad-container');
const adFrame = document.getElementById('ad-frame');
const adTimerDisplay = document.getElementById('ad-timer');
const closeAdButton = document.getElementById('close-ad-button');
const adOverlay = document.getElementById('ad-overlay');

const backgroundColorInput = document.getElementById('background-color');
const textColorInput = document.getElementById('text-color');
const currentYearSpan = document.getElementById('current-year');
const currentDateTimeSpan = document.getElementById('current-date-time');

const startAdButtons = document.querySelectorAll('.start-ad-button');

// --- Constants and Configuration ---
const AD_DURATION = 20; // seconds
const REWARD_AMOUNT = 0.00014; // USDT
const SOLANA_NETWORK = 'solana'; // Or your preferred Solana network identifier
const FAUCETPAY_MERCHANT_API_KEY = 'a92bb3fc17bf8476f2705f613ffc976dff7d8ed8f977c1e80294beb4f131a7f3'; // IMPORTANT: NEVER EXPOSE THIS CLIENT-SIDE IN PRODUCTION!
const AD_CLICK_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ADS_PER_USER = 3000; // Cooldown after this many ads
const REFERRAL_BONUS_PERCENTAGE = 0.12; // 12%

// --- State Variables ---
let currentUser = null;
let adTimerInterval = null;
let adClickCounter = 0;
let lastAdClickTime = 0;
let isAdShown = false; // To prevent multiple ad popups
let adRedirectUrl = ''; // To store the URL for the ad frame
let adType = ''; // 'premium' or 'turbo'

// --- Ad Network Scripts (Load dynamically or include in HTML) ---
// Using Adsterra example, you might need to adjust based on their documentation.
// The provided script examples might not be directly runnable without further setup on the ad network.

// Example for Adsterra (replace with actual Adsterra integration if needed)
// <script src='//libtl.com/sdk.js' data-zone='10555663' data-sdk='show_10555746'></script>
// The user reward logic will be called after the ad finishes.

// --- Functions ---

// --- User Authentication and Management ---
function loginWithFaucetPay() {
    // FaucetPay login typically involves a POST request to their login endpoint
    // or using OAuth if they support it. For simplicity, let's simulate it.
    // In a real app, you'd redirect to FaucetPay or handle their callback.
    alert("Please log in with FaucetPay. This is a simulated login.");
    // Simulate a successful login after user interaction (e.g., clicking a button)
    // For a true FaucetPay integration, you'd need to implement their specific auth flow.
    // Let's assume a dummy user for now.
    const dummyUser = {
        uid: 'faucetpay_user_' + Date.now(),
        email: 'user@example.com', // This would be from FaucetPay
        displayName: 'FaucetPay User',
        faucetpayId: 'YOUR_FAUCETPAY_ID' // You need to get this from FaucetPay
    };
    handleSuccessfulLogin(dummyUser);
}

function handleSuccessfulLogin(user) {
    currentUser = user;
    console.log('User logged in:', currentUser);
    loginButton.style.display = 'none';
    logoutButton.style.display = 'block';
    userDisplayName.textContent = currentUser.displayName || 'User';
    updateUIForLoggedInState();
    loadUserData(currentUser.uid);
    checkAndInitiateAutoWithdrawal(); // Check for auto withdrawal on login
}

function logout() {
    auth.signOut().then(() => {
        currentUser = null;
        console.log('User logged out.');
        loginButton.style.display = 'block';
        logoutButton.style.display = 'none';
        userDisplayName.textContent = 'Guest';
        resetUIForLoggedOutState();
        // Clear any temporary data
        resetUserSessionData();
    }).catch((error) => {
        console.error('Logout failed:', error);
        alert('Logout failed. Please try again.');
    });
}

function updateUIForLoggedInState() {
    document.getElementById('main-nav').style.display = 'block';
    document.getElementById('user-info').style.display = 'block';
    document.getElementById('tasks').style.display = 'block';
    document.getElementById('referral').style.display = 'block';
    document.getElementById('balance').style.display = 'block';
    document.getElementById('settings').style.display = 'block';
}

function resetUIForLoggedOutState() {
    document.getElementById('main-nav').style.display = 'none';
    document.getElementById('user-info').style.display = 'none';
    document.getElementById('tasks').style.display = 'none';
    document.getElementById('referral').style.display = 'none';
    document.getElementById('balance').style.display = 'none';
    document.getElementById('settings').style.display = 'none';
    // Reset any displayed user data
    totalUsersSpan.textContent = '0';
    onlineUsersSpan.textContent = '0';
    totalEarnedSpan.textContent = '0.00000000';
    userBalanceSpan.textContent = '0.00000000';
    referralCodeSpan.textContent = '----------';
    totalReferralsSpan.textContent = '0';
    earnedFromReferralsSpan.textContent = '0.00000000';
}

function resetUserSessionData() {
    adClickCounter = 0;
    lastAdClickTime = 0;
    isAdShown = false;
    adRedirectUrl = '';
    adType = '';
}

// --- Data Loading and Saving ---
async function loadUserData(userId) {
    const userRef = database.ref(`users/${userId}`);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val();

    if (userData) {
        if (userData.balance) userBalanceSpan.textContent = userData.balance.toFixed(8);
        if (userData.adClickCount) adClickCounter = userData.adClickCount;
        if (userData.lastAdClickTime) lastAdClickTime = userData.lastAdClickTime;
        if (userData.referralCode) referralCodeSpan.textContent = userData.referralCode;
        if (userData.totalReferrals) totalReferralsSpan.textContent = userData.totalReferrals;
        if (userData.earnedFromReferrals) earnedFromReferralsSpan.textContent = userData.earnedFromReferrals.toFixed(8);

        // Load settings
        if (userData.settings) {
            if (userData.settings.backgroundColor) {
                document.body.style.backgroundColor = userData.settings.backgroundColor;
                backgroundColorInput.value = userData.settings.backgroundColor;
            }
            if (userData.settings.textColor) {
                document.body.style.color = userData.settings.textColor;
                textColorInput.value = userData.settings.textColor;
            }
        }
    } else {
        // New user, initialize data
        const newUserRef = userRef.set({
            uid: userId,
            email: currentUser.email,
            displayName: currentUser.displayName,
            faucetpayId: currentUser.faucetpayId, // Ensure this is captured
            balance: 0.0,
            adClickCount: 0,
            lastAdClickTime: 0,
            referralCode: generateReferralCode(),
            totalReferrals: 0,
            earnedFromReferrals: 0.0,
            settings: {
                backgroundColor: '#1f2937',
                textColor: '#d1d5db'
            }
        });
        referralCodeSpan.textContent = newUserRef.referralCode; // Assuming set returns the data
    }

    // Ensure buttons are enabled/disabled appropriately
    updateWithdrawButtonState();
}

function saveUserData() {
    if (!currentUser) return;
    const userRef = database.ref(`users/${currentUser.uid}`);
    userRef.update({
        balance: parseFloat(userBalanceSpan.textContent),
        adClickCount: adClickCounter,
        lastAdClickTime: lastAdClickTime,
        totalReferrals: parseInt(totalReferralsSpan.textContent),
        earnedFromReferrals: parseFloat(earnedFromReferralsSpan.textContent),
        settings: {
            backgroundColor: document.body.style.backgroundColor,
            textColor: document.body.style.color
        }
    }).then(() => console.log('User data saved.'))
      .catch(error => console.error('Error saving user data:', error));
}

function generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// --- Real-time Data Updates ---
function subscribeToGlobalStats() {
    // Total Users
    database.ref('users').on('value', (snapshot) => {
        const userCount = snapshot.numChildren();
        totalUsersSpan.textContent = userCount;
        // Also update total earned based on all user incomes
        let totalIncome = 0;
        snapshot.forEach((childSnapshot) => {
            const userData = childSnapshot.val();
            if (userData && userData.balance) {
                totalIncome += userData.balance;
            }
        });
        totalEarnedSpan.textContent = totalIncome.toFixed(8);
    });

    // Online Users (simple presence simulation)
    const onlineRef = database.ref('.info/connected');
    const usersRef = database.ref('users');
    const userStatusDatabase = database.ref('users_online');

    onlineRef.on('value', (snapshot) => {
        if (snapshot.val()) {
            const connectedRef = userStatusDatabase.child(currentUser.uid);
            connectedRef.set(true); // Mark as online
            connectedRef.onDisconnect().remove(); // Remove when disconnected

            // Count online users
            userStatusDatabase.on('value', (snap) => {
                onlineUsersSpan.textContent = snap.numChildren();
            });
        }
    });
}

// --- Ad Functionality ---
function startAd(type) {
    if (!currentUser) {
        alert('Please login to watch ads.');
        return;
    }

    const currentTime = Date.now();
    if (currentTime - lastAdClickTime < AD_CLICK_COOLDOWN_MS) {
        alert(`Please wait ${Math.ceil((AD_CLICK_COOLDOWN_MS - (currentTime - lastAdClickTime)) / 1000)} seconds before watching another ad.`);
        return;
    }

    if (adClickCounter >= MAX_ADS_PER_USER) {
        alert(`You have reached your daily limit of ${MAX_ADS_PER_USER} ads. Please wait for the cooldown period.`);
        return;
    }

    adType = type; // Store the type of ad
    adContainer.style.display = 'flex'; // Show the ad overlay
    isAdShown = true;
    adFrame.src = type === 'premium' ? "https://www.profitablecpmratenetwork.com/i2rx8svvds?key=ec449a85ea63cb0b7adf4cd90009cbca" : "https://www.anotheradsite.com/your/turbo/ad"; // Replace with actual URLs

    // Load Adsterra script (example)
    // This part is tricky. You might need to dynamically inject scripts or use their SDK methods.
    // For this example, let's assume the ad content loads within the iframe and the timer controls visibility.

    startAdTimer();
    // Simulate Adsterra's rewarded interstitial call
    showRewardedInterstitial(type);
}

function startAdTimer() {
    let secondsLeft = AD_DURATION;
    adTimerDisplay.textContent = secondsLeft;
    closeAdButton.disabled = true; // Disable close button during ad
    adOverlay.style.pointerEvents = 'none'; // Prevent clicking ad content directly during countdown

    adTimerInterval = setInterval(() => {
        secondsLeft--;
        adTimerDisplay.textContent = secondsLeft;
        if (secondsLeft <= 0) {
            clearInterval(adTimerInterval);
            adTimerDisplay.textContent = 'Finished!';
            closeAdButton.disabled = false; // Enable close button
            adOverlay.style.pointerEvents = 'auto'; // Allow interaction after timer
            // Automatically trigger claim reward if user doesn't close manually
            // This would typically happen when the ad is dismissed or closed by the network.
            // For now, we'll make it appear after the timer is done and user clicks close.
        }
    }, 1000);
}

function closeAd() {
    if (!isAdShown) return; // Don't do anything if ad isn't showing

    clearInterval(adTimerInterval);
    adContainer.style.display = 'none'; // Hide ad overlay
    isAdShown = false;

    // Check if the ad completed its duration
    if (parseInt(adTimerDisplay.textContent) <= 0) {
        claimReward();
    } else {
        // User closed the ad early, maybe re-prompt or penalize
        // For this example, we'll just close it and let them try again after cooldown.
        alert("Ad closed early. Try again after the cooldown.");
        lastAdClickTime = Date.now(); // Start cooldown even if closed early
    }
}

function handleAdClick() {
    // This function is called if the user clicks the ad overlay during the timer.
    // We prevent normal interaction during the timer via pointer-events.
    // If we wanted to allow clicks *on the ad link*, we'd handle it here.
    // For a simple ad watcher, we just want them to wait.
}

function showRewardedInterstitial(adType) {
    // This is where you would integrate with Adsterra's SDK or display their ad unit.
    // The example code you provided is conceptual.
    // For Adsterra, you might use their `sdk.js` to display an interstitial.
    // Example using a placeholder for Adsterra SDK call:

    // Dynamically load Adsterra SDKs if not already present
    if (!window.libtl) {
        const script1 = document.createElement('script');
        script1.src = '//libtl.com/sdk.js';
        script1.async = true;
        script1.setAttribute('data-zone', '10555663');
        script1.setAttribute('data-sdk', 'show_10555663');
        document.body.appendChild(script1);

        const script2 = document.createElement('script');
        script2.src = '//libtl.com/sdk.js';
        script2.async = true;
        script2.setAttribute('data-zone', '10555746');
        script2.setAttribute('data-sdk', 'show_10555746');
        document.body.appendChild(script2);

        script1.onload = () => {
             if (window.show_10555663) {
                 show_10555663().then(() => {
                     console.log('Adsterra zone 10555663 shown.');
                     // The ad network handles showing the ad and then calling a callback
                     // or providing a way to detect completion.
                 }).catch(error => {
                     console.error('Error showing Adsterra ad:', error);
                     alert('Failed to load ad. Please try again.');
                     closeAd(); // Close the timer overlay if ad fails
                 });
             }
        };
         script2.onload = () => {
             if (window.show_10555746) {
                 show_10555746().then(() => {
                     console.log('Adsterra zone 10555746 shown.');
                     // This is for the *random ad* that shows together.
                     // This needs to be handled carefully, as it might interrupt the main ad.
                 }).catch(error => {
                     console.error('Error showing Adsterra ad:', error);
                 });
             }
         };
    } else {
        // SDK is already loaded
        if (window.show_10555663) {
            show_10555663().then(() => {
                console.log('Adsterra zone 10555663 shown.');
            }).catch(error => {
                console.error('Error showing Adsterra ad:', error);
                alert('Failed to load ad. Please try again.');
                closeAd();
            });
        }
         if (window.show_10555746) {
             show_10555746().then(() => {
                 console.log('Adsterra zone 10555746 shown.');
             }).catch(error => {
                 console.error('Error showing Adsterra ad:', error);
             });
         }
    }

    // The Adsterra SDK is expected to manage the ad display and call a callback
    // or provide a mechanism to know when it's done. For example, if they have an
    // `onAdComplete` or similar event.
    // Since the provided snippet doesn't detail this, we'll rely on the timer for now.
    // In a real integration, you'd get a signal from the ad network when the ad is viewed.
}

function claimReward() {
    if (!currentUser) return;

    adClickCounter++;
    lastAdClickTime = Date.now();
    let userBalance = parseFloat(userBalanceSpan.textContent);
    userBalance += REWARD_AMOUNT;
    userBalanceSpan.textContent = userBalance.toFixed(8);

    const totalEarned = parseFloat(totalEarnedSpan.textContent);
    totalEarnedSpan.textContent = (totalEarned + REWARD_AMOUNT).toFixed(8);

    saveUserData(); // Save updated balance and ad click count

    alert(`Congratulations! You've earned ${REWARD_AMOUNT} USDT. Keep inviting!`);

    // After claiming, update UI elements like total earned if they reflect current user's earnings.
    // For global total earned, the real-time listener handles it.
}

// --- Withdrawal ---
function updateWithdrawButtonState() {
    if (!currentUser || parseFloat(userBalanceSpan.textContent) < 0.00001) { // Minimum withdrawal threshold example
        withdrawButton.disabled = true;
    } else {
        withdrawButton.disabled = false;
    }
}

async function initiateAutoWithdrawal() {
    if (!currentUser || parseFloat(userBalanceSpan.textContent) === 0) {
        console.log('No balance to withdraw.');
        return;
    }

    const withdrawAmount = parseFloat(userBalanceSpan.textContent);
    const faucetPayUserId = currentUser.faucetpayId; // Get this from user data

    if (!faucetPayUserId) {
        alert('Your FaucetPay ID is not set. Please set it in your profile (if available) or contact support.');
        return;
    }

    console.log(`Attempting to withdraw ${withdrawAmount} USDT to FaucetPay ID: ${faucetPayUserId}`);

    // --- FaucetPay Merchant API Integration ---
    // This is a conceptual POST request. You'll need to consult FaucetPay's API docs.
    // A common approach is to send a POST request to their API endpoint.
    // NEVER expose your API key directly in client-side JavaScript for production.
    // This should ideally be handled by a server-side script.

    // Placeholder for the actual API call.
    // You would typically send a POST request like this:
    /*
    const apiUrl = 'https://faucetpay.io/api/v1/withdraw'; // Example URL
    const payload = {
        api_key: FAUCETPAY_MERCHANT_API_KEY, // **THIS IS UNSAFE CLIENT-SIDE**
        currency: 'USDT',
        amount: withdrawAmount,
        address: faucetPayUserId, // Assuming faucetPayUserId is their username or receiving ID
        // Optional: webhook_url, ip_address, etc.
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('FaucetPay Withdrawal API Error:', errorData);
            alert(`Withdrawal failed: ${errorData.error || response.statusText}`);
            return false; // Indicate failure
        }

        const result = await response.json();
        console.log('FaucetPay Withdrawal API Success:', result);

        // Update user's balance in your DB to 0 after successful withdrawal
        userBalanceSpan.textContent = '0.00000000';
        saveUserData();
        alert('Withdrawal successful! Funds sent to your FaucetPay account.');
        return true; // Indicate success

    } catch (error) {
        console.error('Error during FaucetPay withdrawal:', error);
        alert('An error occurred during withdrawal. Please try again later.');
        return false; // Indicate failure
    }
    */

    // --- Simulation for now ---
    console.warn("Simulating FaucetPay withdrawal. Replace with actual API call and NEVER expose API key client-side.");
    alert(`Simulating withdrawal of ${withdrawAmount} USDT to FaucetPay. This will be processed shortly.`);
    userBalanceSpan.textContent = '0.00000000';
    saveUserData(); // Save zero balance
    return true; // Simulate success
}

function checkAndInitiateAutoWithdrawal() {
    // This function would check the user's balance and automatically trigger withdrawal
    // if conditions are met (e.g., balance above a certain threshold, user has opted in for auto-withdrawal).
    // For now, we'll just enable the button and let the user click.
    if (currentUser && parseFloat(userBalanceSpan.textContent) >= 0.0001) { // Example threshold
        // Initiate auto-withdrawal or just enable the button
        updateWithdrawButtonState();
        // If auto-withdrawal is enabled, you would call initiateAutoWithdrawal() here.
        // For this example, we'll just enable the button.
    }
}

// --- Settings ---
function updateSettings() {
    if (!currentUser) return;

    const backgroundColor = backgroundColorInput.value;
    const textColor = textColorInput.value;

    document.body.style.backgroundColor = backgroundColor;
    document.body.style.color = textColor;

    saveUserData(); // Save settings to Firebase
}

// --- Utility Functions ---
function updateDateTime() {
    const now = new Date();
    currentYearSpan.textContent = now.getFullYear();
    currentDateTimeSpan.textContent = now.toLocaleString();
}

function generateReferralLink() {
    const baseUrl = window.location.origin; // Or your domain
    return `${baseUrl}?ref=${referralCodeSpan.textContent}`;
}

// --- Event Listeners ---
loginButton.addEventListener('click', loginWithFaucetPay);
logoutButton.addEventListener('click', logout);

startAdButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const type = e.target.getAttribute('data-ad-type');
        startAd(type);
    });
});

withdrawButton.addEventListener('click', async () => {
    const success = await initiateAutoWithdrawal();
    if (success) {
        updateWithdrawButtonState(); // Re-check button state after withdrawal
    }
});

backgroundColorInput.addEventListener('change', updateSettings);
textColorInput.addEventListener('change', updateSettings);

document.getElementById('copy-referral-button').addEventListener('click', () => {
    const referralLink = generateReferralLink();
    navigator.clipboard.writeText(referralLink).then(() => {
        alert('Referral link copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy referral link: ', err);
        alert('Failed to copy link. Please copy it manually.');
    });
});

// --- Initialization ---
function initializeApp() {
    resetUIForLoggedOutState(); // Start with logged out UI
    updateDateTime(); // Set initial date and time

    // Check if user is already logged in (e.g., via Firebase session)
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in.
            // Fetch FaucetPay ID and display name from your DB or wherever stored.
            // For now, we assume currentUser will be populated by a previous login.
            // If you have persistent login, you might need to re-fetch user data here.
            // Let's simulate a refresh by calling loadUserData.
            // You'd ideally have a way to store FaucetPay ID persistently.
            currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || 'User',
                faucetpayId: user.faucetpayId || 'FETCH_FROM_DB' // Need to fetch this
            };
            handleSuccessfulLogin(currentUser); // Re-establish UI
            loadUserData(user.uid); // Load detailed user data
            subscribeToGlobalStats(); // Start real-time updates
        } else {
            // User is signed out.
            logout(); // Ensure UI is reset to logged-out state
        }
    });

    // Start interval for date/time updates
    setInterval(updateDateTime, 1000);

    // Handle potential referral query parameter on page load
    const urlParams = new URLSearchParams(window.location.search);
    const referrerCode = urlParams.get('ref');
    if (referrerCode) {
        console.log(`Referrer code found: ${referrerCode}`);
        // You would typically store this referrer code in session storage
        // or a cookie to associate the next signup with this referrer.
        // For now, just log it.
    }
}

initializeApp();
