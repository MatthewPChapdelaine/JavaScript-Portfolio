// Game Constants
const INITIAL_GRANT = 10000;
const SPACE_COST = 1500;
const GROUNDED_COST = 600;
const LICENSE_RENEWAL_COST = 10000;
const MAX_FUNDS = 20000;
const MAX_WEEKS = 52;
const PROMOTION_THRESHOLD = 50000;
const VICTORY_THRESHOLD = 100000;

const empires = [
    "The Loporian Empire",
    "The Koretoretos Empire",
    "The New Akashmiran Empire",
    "The Drift Empire"
];

const starSystems = {
    "The Loporian Empire": ["Taeerrannor", "Cerrinnor", "Oaenalia", "FarOakes"],
    "The Koretoretos Empire": ["Lemmussria", "Rackvor", "Sabbaeo", "Shakatrixet"],
    "The New Akashmiran Empire": ["Iaxia", "Djinni", "Gnorrum", "Hurricanis"],
    "The Drift Empire": ["Shock", "Acadmium", "Shift", "Nerve"]
};

const planets = {};
for (let empire in starSystems) {
    starSystems[empire].forEach((planet, index) => {
        planets[planet] = {
            activities: [
                { name: "Trading", income: 2000 },
                { name: "Exploring", income: 1500 }
            ],
            missions: [
                { description: `Mission on ${planet}`, reward: 200 + (index + 1) * 200, difficulty: index + 1 }
            ]
        };
    });
}

// Game State
let week = 1;
let rank = "Captain";
let allegiance = "";
let opponent = "";
let state = "InSpace";
let currentStarSystem = "The Loporian Empire";
let currentPlanet = "Taeerrannor";
let funds = INITIAL_GRANT;
let travelWeeksLeft = 0;

// DOM Elements
const weekEl = document.getElementById("week");
const rankEl = document.getElementById("rank");
const allegianceEl = document.getElementById("allegiance");
const opponentEl = document.getElementById("opponent");
const stateEl = document.getElementById("state");
const locationEl = document.getElementById("location");
const fundsEl = document.getElementById("funds");
const messagesEl = document.getElementById("messages");
const travelSection = document.getElementById("travel-section");
const activitySection = document.getElementById("activity-section");
const missionSection = document.getElementById("mission-section");
const renewSection = document.getElementById("renew-section");
const nextWeekBtn = document.getElementById("next-week");
const replayBtn = document.getElementById("replay");
const fundsBar = document.getElementById("funds-bar");
const weeksBar = document.getElementById("weeks-bar");
const stateIndicator = document.getElementById("state-indicator");

// Helper Functions
function addMessage(message) {
    messagesEl.innerHTML += `<p>${message}</p>`;
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function updateStatus() {
    weekEl.textContent = week;
    rankEl.textContent = rank;
    allegianceEl.textContent = allegiance || "None";
    opponentEl.textContent = opponent || "None";
    stateEl.textContent = state;
    locationEl.textContent = `${currentPlanet} in ${currentStarSystem}`;
    fundsEl.textContent = funds;
    updateBars();
}

function updateBars() {
    const fundsPercent = Math.min((funds / MAX_FUNDS) * 100, 100);
    fundsBar.style.width = `${fundsPercent}%`;
    const weeksPercent = Math.min((week / MAX_WEEKS) * 100, 100);
    weeksBar.style.width = `${weeksPercent}%`;
    stateIndicator.style.backgroundColor = 
        state === "InSpace" ? "green" : 
        state === "Grounded" ? "red" : "blue";
}

function payCosts() {
    let currentSpaceCost = SPACE_COST;
    let currentGroundedCost = GROUNDED_COST;
    if (rank === "Armada Admiral") {
        currentSpaceCost = Math.floor(SPACE_COST * 1.5);
        currentGroundedCost = Math.floor(GROUNDED_COST * 1.5);
        addMessage("As an Armada Admiral, your costs are higher due to commanding a fleet.");
    }
    if (state === "InSpace" || state === "Traveling") {
        if (funds < currentSpaceCost) {
            state = "Grounded";
            addMessage("Insufficient funds for space costs. Your starship is grounded.");
            return true;
        } else {
            funds -= currentSpaceCost;
            addMessage(`Paid ${currentSpaceCost} credits for space costs.`);
        }
    } else if (state === "Grounded") {
        if (funds < currentGroundedCost) {
            addMessage("Insufficient funds for grounded costs. Game Over.");
            nextWeekBtn.disabled = true;
            replayBtn.style.display = "block";
            travelSection.innerHTML = "";
            activitySection.innerHTML = "";
            missionSection.innerHTML = "";
            renewSection.innerHTML = "";
            return false;
        } else {
            funds -= currentGroundedCost;
            addMessage(`Paid ${currentGroundedCost} credits for grounded costs.`);
        }
    }
    return true;
}

function handleTravel() {
    if (state === "Traveling") {
        travelWeeksLeft -= 1;
        if (travelWeeksLeft === 0) {
            state = "InSpace";
            addMessage(`Arrived at ${currentPlanet} in ${currentStarSystem}.`);
        } else {
            addMessage(`Traveling... ${travelWeeksLeft} weeks left.`);
        }
    }
}

function buildTravelButtons() {
    travelSection.innerHTML = "<h3>Travel</h3>";
    const stayButton = document.createElement("button");
    stayButton.textContent = `Stay on ${currentPlanet}`;
    stayButton.onclick = () => {
        addMessage(`Decided to stay on ${currentPlanet}.`);
        updateUI();
    };
    travelSection.appendChild(stayButton);
    for (let empire in starSystems) {
        starSystems[empire].forEach(planet => {
            if (planet !== currentPlanet) {
                const button = document.createElement("button");
                button.textContent = `Travel to ${planet} in ${empire}`;
                button.onclick = () => {
                    if (empire === currentStarSystem) {
                        currentPlanet = planet;
                        addMessage(`Traveled instantly to ${planet} in ${empire}.`);
                    } else {
                        state = "Traveling";
                        travelWeeksLeft = 1;
                        currentStarSystem = empire;
                        currentPlanet = planet;
                        addMessage(`Traveling to ${planet} in ${empire}. Arrival in 1 week.`);
                    }
                    updateUI();
                };
                travelSection.appendChild(button);
            }
        });
    }
}

function buildActivityButtons() {
    activitySection.innerHTML = "<h3>Choose Activity</h3>";
    planets[currentPlanet].activities.forEach(activity => {
        const button = document.createElement("button");
        button.textContent = `${activity.name} - ${activity.income} credits`;
        button.onclick = () => {
            funds += activity.income;
            addMessage(`Completed ${activity.name} and earned ${activity.income} credits.`);
            button.disabled = true;
            updateStatus();
            checkPromotion();
        };
        activitySection.appendChild(button);
    });
}

function buildMissionButtons() {
    missionSection.innerHTML = "<h3>Accept Mission</h3>";
    let availableMissions = planets[currentPlanet].missions;
    if (rank === "Armada Admiral" && currentStarSystem === allegiance) {
        availableMissions = availableMissions.concat(getGranderMissions());
    }
    availableMissions.forEach(mission => {
        const button = document.createElement("button");
        button.textContent = `${mission.description} - Reward: ${mission.reward} credits`;
        button.onclick = () => {
            const successChance = 100 - (mission.difficulty * 10);
            const roll = Math.floor(Math.random() * 100);
            if (roll < successChance) {
                funds += mission.reward;
                addMessage(`Mission succeeded! Earned ${mission.reward} credits.`);
            } else {
                addMessage("Mission failed. No reward earned.");
            }
            button.disabled = true;
            updateStatus();
            checkPromotion();
            checkVictory();
        };
        missionSection.appendChild(button);
    });
    const skipButton = document.createElement("button");
    skipButton.textContent = "Skip Mission";
    skipButton.onclick = () => {
        addMessage("Mission skipped.");
        skipButton.disabled = true;
    };
    missionSection.appendChild(skipButton);
}

function getGranderMissions() {
    return [
        {
            description: `Lead a fleet assault on ${opponent}'s outpost`,
            reward: Math.floor(Math.random() * 10000) + 10000, // 10000-20000 credits
            difficulty: 7 // 30% success chance
        },
        {
            description: `Secure a trade route for ${allegiance}`,
            reward: Math.floor(Math.random() * 10000) + 5000, // 5000-15000 credits
            difficulty: 5 // 50% success chance
        }
    ];
}

function checkPromotion() {
    if (rank === "Captain" && funds >= PROMOTION_THRESHOLD) {
        rank = "Armada Admiral";
        allegiance = empires[Math.floor(Math.random() * empires.length)];
        do {
            opponent = empires[Math.floor(Math.random() * empires.length)];
        } while (opponent === allegiance);
        addMessage(`Congratulations! You’ve been promoted to Armada Admiral. You now command ${allegiance}’s fleet against ${opponent}. Costs are higher, but the stakes are greater.`);
        updateStatus();
    }
}

function checkVictory() {
    if (rank === "Armada Admiral" && funds >= VICTORY_THRESHOLD) {
        addMessage(`Victory! You’ve successfully led ${allegiance}’s fleet to win the war against ${opponent}. You’ve mastered the game!`);
        nextWeekBtn.disabled = true;
        replayBtn.style.display = "block";
    }
}

function buildRenewButton() {
    renewSection.innerHTML = "<h3>Renew License</h3>";
    if (funds >= LICENSE_RENEWAL_COST) {
        const button = document.createElement("button");
        button.textContent = `Renew License (${LICENSE_RENEWAL_COST} credits)`;
        button.onclick = () => {
            funds -= LICENSE_RENEWAL_COST;
            state = "InSpace";
            addMessage("License renewed successfully. You’re back in space!");
            updateUI();
        };
        renewSection.appendChild(button);
    } else {
        renewSection.innerHTML += `<p>Need ${LICENSE_RENEWAL_COST} credits to renew your license.</p>`;
    }
}

function updateUI() {
    updateStatus();
    if (state === "Traveling") {
        travelSection.innerHTML = `<p>Traveling to ${currentPlanet} in ${currentStarSystem}. ${travelWeeksLeft} weeks remaining.</p>`;
        activitySection.innerHTML = "";
        missionSection.innerHTML = "";
        renewSection.innerHTML = "";
    } else if (state === "InSpace") {
        buildTravelButtons();
        buildActivityButtons();
        buildMissionButtons();
        renewSection.innerHTML = "";
    } else if (state === "Grounded") {
        travelSection.innerHTML = "";
        buildActivityButtons();
        buildMissionButtons();
        buildRenewButton();
    }
    checkVictory();
}

nextWeekBtn.onclick = () => {
    if (Math.random() < 0.2) {
        const events = [
            { desc: "Pirate attack! Lost 500 credits.", effect: () => { funds = Math.max(0, funds - 500); } },
            { desc: "Found a derelict ship! Gained 1000 credits.", effect: () => { funds += 1000; } },
            { desc: "Engine malfunction! Paid 300 credits for repairs.", effect: () => { funds = Math.max(0, funds - 300); } }
        ];
        const event = events[Math.floor(Math.random() * events.length)];
        event.effect();
        addMessage(event.desc);
    }
    week += 1;
    handleTravel();
    if (payCosts()) {
        updateUI();
    }
};

replayBtn.onclick = () => {
    week = 1;
    rank = "Captain";
    allegiance = "";
    opponent = "";
    state = "InSpace";
    currentStarSystem = "The Loporian Empire";
    currentPlanet = "Taeerrannor";
    funds = INITIAL_GRANT;
    travelWeeksLeft = 0;
    nextWeekBtn.disabled = false;
    replayBtn.style.display = "none";
    addMessage("Game restarted. Welcome back to Orbspace!");
    updateUI();
};

addMessage("Welcome to Orbspace! You’ve received an initial grant of 10,000 credits. You start on Taeerrannor in The Loporian Empire.");
payCosts();
updateUI();
