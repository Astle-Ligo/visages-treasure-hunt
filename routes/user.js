const express = require('express');
const router = express.Router();
const userHelpers = require('../helpers/user-helpers');

// GET users listing
router.get('/', (req, res) => {
    let user = req.session.user;
    if (user) {
        res.render('user/start', { user });
    } else {
        res.render('user/landing');
    }
});

// User signup
router.get('/user-signup', (req, res) => {
    res.render('user/user-signup');
});

router.post('/user-signup', async (req, res) => {
    await userHelpers.doSignup(req.body);
    res.redirect('/');
});

// User login
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

// User log out
router.get('/user-log-out', (req, res) => {
    req.session.destroy();
    res.redirect('/user');
});

// Fetch Game Start Timer from DB
router.get("/get-timer-status", async (req, res) => {
    try {
        const gameSettings = await userHelpers.getGameSettings();
        if (!gameSettings || !gameSettings.gameStartTime) {
            res.json({ success: false });
        } else {
            res.json({ success: true, startTime: gameSettings.gameStartTime });
        }
    } catch (error) {
        console.error("Error fetching game settings:", error);
        res.json({ success: false });
    }
});


// Get Clue Page
router.get("/clue/:id", async (req, res) => {
    try {
        const clue = await userHelpers.getClue(req.params.id); // Fetch the clue by ID from the database
        if (!clue) {
            return res.status(404).send("Clue not found"); // Return error if clue is not found
        }

        // Render the clue page with the clue text and clue ID
        res.render("clue-page", { clue: clue.clue, clueId: clue._id });
    } catch (error) {
        console.error("Error retrieving clue:", error);
        res.status(500).send("Error retrieving clue");
    }
});


// Check Clue Answer (Form Submission)
router.post("/check-clue/:id", async (req, res) => {
    const result = await userHelpers.checkClueAnswer(req.params.id, req.body.answer);

    if (result.error) {
        return res.render('clue-page', { error: result.error, clueId: req.params.id, clue: result.clue });
    }

    res.redirect(result.nextStep);
});

// Get Task Page
router.get("/task/:taskName", (req, res) => {
    res.render(`tasks/${req.params.taskName}`, { clueId: req.query.clueId });
});

// Check Task Answer (Form Submission)
router.post("/check-task/:id", async (req, res) => {
    const result = await userHelpers.checkTaskAnswer(req.params.id, req.body.taskAnswer);

    if (result.error) {
        return res.render('tasks/' + result.taskName, { error: result.error, clueId: req.params.id });
    }

    res.redirect(result.nextClue);
});

module.exports = router;
