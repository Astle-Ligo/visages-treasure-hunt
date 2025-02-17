const express = require('express');
const router = express.Router();
const userHelpers = require('../helpers/user-helpers');
const { ObjectId } = require('mongodb');

// GET users listing
router.get('/', async (req, res) => {
    let user = req.session.user;
    if (user) {
        // Fetch the first clue from the database using the helper
        const firstClue = await userHelpers.getFirstClue();
        console.log("hai:", firstClue);

        res.render('user/start', { user, firstClue: firstClue[0] });
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
    console.log("Clue ID received:", req.params.id);

    try {
        // Validate ObjectId
        const clueId = req.params.id;
        if (!ObjectId.isValid(clueId)) {
            return res.status(400).send("Invalid clue ID");
        }

        const clue = await userHelpers.getClue(clueId); // Fetch clue by ID using helper

        if (!clue) {
            return res.status(404).send("Clue not found");
        }

        res.render("user/clue-page", { clue });
    } catch (error) {
        console.error("Error retrieving clue:", error);
        res.status(500).send("Error retrieving clue");
    }
});

// Check Clue Answer (Form Submission)
router.post("/clue/:id", async (req, res) => {
    const result = await userHelpers.checkClueAnswer(req.params.id, req.body.answer);
    console.log(result);

    if (result.error) {
        return res.render('user/clue-page', { error: result.error, clueId: req.params.id, clue: result.clue });
    }

    res.redirect(result.nextStep);
});

// Get Task Page (Refactored to use helpers)
router.get("/task/:taskName/:clueId", async (req, res) => {
    const taskName = req.params.taskName;
    const clueId = req.params.clueId;  // Access clueId directly from the URL path

    if (!clueId) {
        return res.status(400).send("Clue ID is missing in the URL path.");
    }

    try {
        // Validate ObjectId (optional but recommended)
        if (!ObjectId.isValid(clueId)) {
            return res.status(400).send("Invalid clue ID");
        }

        // Fetch clue details based on clueId using helper
        const clue = await userHelpers.getClue(clueId);
        if (!clue) {
            return res.status(404).send("Clue not found");
        }

        // Render the task page
        res.render(`user/tasks/${taskName}`, { clueId: clue._id, taskAnswer: clue.taskAnswer });
    } catch (error) {
        console.error("Error fetching task details:", error);
        res.status(500).send("Error fetching task details");
    }
});


router.post("/task/:id", async (req, res) => {
    try {
        const result = await userHelpers.checkTaskAnswer(req.params.id, req.body.taskAnswer);
        console.log(result);

        if (result.error) {
            return res.render('user/tasks/snake-and-ladder', { error: result.error, clueId: req.params.id });
        }

        if (result.celebration) {
            return res.render('user/celebration', { message: result.message });
        }

        res.redirect(result.nextClue);
    } catch (error) {
        console.error("Error in task submission:", error);
        res.status(500).send("Internal Server Error");
    }
});


module.exports = router;
