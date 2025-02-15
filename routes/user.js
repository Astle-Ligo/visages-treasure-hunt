const express = require('express');
const router = express.Router();
const userHelpers = require('../helpers/user-helpers');

/* GET users listing. */
router.get('/', (req, res) => {
    let user = req.session.user;
    if (user) {
        res.render('user/start', { user });
    } else {
        res.render('user/landing');
    }
});

router.get('/user-signup', (req, res) => {
    res.render('user/user-signup');
});

router.post('/user-signup', async (req, res) => {
    await userHelpers.doSignup(req.body);
    res.redirect('/');
});

router.get('/user-login', (req, res) => {
    res.render('user/user-login', { user: true });
});

router.post('/user-login', async (req, res) => {
    const response = await userHelpers.doLogin(req.body);
    if (response.status) {
        req.session.loggedIn = true;
        req.session.user = response.user;
        res.redirect('/');
    } else {
        res.redirect('/user/user-login');
    }
});

router.get('/user-log-out', (req, res) => {
    req.session.destroy();
    res.redirect('/user');
});

// 🔹 Fetch Game Start Timer from DB
router.get("/get-timer-status", async (req, res) => {
    try {
        const gameSettings = await userHelpers.getGameSettings();
        res.json({ success: !!gameSettings, startTime: gameSettings?.gameStartTime });
    } catch (error) {
        console.error("Error fetching game settings:", error);
        res.status(500).json({ success: false, message: "Error fetching timer status" });
    }
});

// 🔹 Start Game & Fetch First Clue
router.get('/start-game', async (req, res) => {
    const firstClue = await userHelpers.getFirstClue();
    if (firstClue) {
        res.render('user/clue-page', { clue: firstClue });
    } else {
        res.send("No clues found!");
    }
});

// 🔹 Submit Answer & Fetch Next Clue
router.post('/submit-answer', async (req, res) => {
    const { clueId, clueNumber, userAnswer } = req.body;
    const isCorrect = await userHelpers.checkAnswer(clueId, userAnswer);

    if (isCorrect) {
        const nextClue = await userHelpers.getNextClue(clueNumber);
        res.json(nextClue ? { success: true, nextClue } : { success: true, gameOver: true });
    } else {
        res.json({ success: false });
    }
});

module.exports = router;
