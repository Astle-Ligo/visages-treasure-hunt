const express = require('express');
const router = express.Router();
const userHelpers = require('../helpers/user-helpers');
const { ObjectId } = require('mongodb');

// GET users listing
router.get('/', async (req, res) => {
    let User = req.session.user;
    if (User) {
        if (!req.session.startTime) {
            req.session.startTime = Date.now(); // Store start time in session
        }

        const firstClue = await userHelpers.getFirstClue();

        res.render('user/start', {
            User,
            firstClue: firstClue[0],
            user: true,
            startTime: req.session.startTime
        });
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
    res.render('user/user-login');
});

router.post('/user-login', async (req, res) => {
    const response = await userHelpers.doLogin(req.body);

    if (response.status) {
        req.session.loggedIn = true;
        req.session.user = response.user;

        req.session.success = `✅ Welcome back, ${response.user.Name}!`;

        // Fetch user details and game timer from the database
        const user = await userHelpers.getUser(response.user._id);
        const timerData = await userHelpers.getGameTimer(response.user._id);

        req.session.gameStartTime = timerData.gameStartTime || null;  // Store the game start time in session
        req.session.elapsedTime = timerData.elapsedTime || 0;         // Store the elapsed time in session

        if (user.currentClueId) {
            return res.redirect(`/clue/${user.currentClueId}`);
        }
        return res.redirect('/');
    } else {
        req.session.error = '❌ Invalid email or password!';
        return res.redirect('/user-login');
    }
});




// User log out
router.get('/user-log-out', (req, res) => {
    console.log("hai");
    res.clearCookie("gameStartTime"); // Clear any related cookies
    // res.json({ success: true }); // Notify frontend
    req.session.destroy();
    res.redirect('/');
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
        const clueId = req.params.id;
        if (!ObjectId.isValid(clueId)) {
            return res.status(400).send("Invalid clue ID");
        }

        const clue = await userHelpers.getClue(clueId);

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
    const userId = req.session.user._id;
    const clueId = req.params.id;
    const startTime = req.session.startTime;

    const result = await userHelpers.checkClueAnswer(userId, clueId, req.body.answer, startTime);

    if (result.error) {
        const clue = await userHelpers.getClue(clueId);
        if (!clue) {
            return res.status(404).send("Clue not found");
        }

        return res.render('user/clue-page', {
            error: result.error,
            clueId: clueId,
            clue: clue
        });
    }

    req.session.success = result.success; // Store success message in session
    res.redirect(result.nextStep);
});


// Get Task Page
router.get("/task/:taskName/:clueId", async (req, res) => {
    const taskName = req.params.taskName;
    const clueId = req.params.clueId;

    if (!clueId) {
        return res.status(400).send("Clue ID is missing in the URL path.");
    }

    try {
        if (!ObjectId.isValid(clueId)) {
            return res.status(400).send("Invalid clue ID");
        }

        const clue = await userHelpers.getClue(clueId);
        if (!clue) {
            return res.status(404).send("Clue not found");
        }

        res.render(`user/tasks/${taskName}`, { clueId: clue._id, taskAnswer: clue.taskAnswer, taskName: taskName });
    } catch (error) {
        console.error("Error fetching task details:", error);
        res.status(500).send("Error fetching task details");
    }
});

// Check Task Answer (Form Submission)
router.post("/task/:taskName/:id", async (req, res) => {
    const userId = req.session.user._id;
    const clueId = req.params.id;
    const taskName = req.params.taskName;
    const startTime = req.session.startTime;

    const result = await userHelpers.checkTaskAnswer(userId, clueId, req.body.taskAnswer, startTime);

    if (result.error) {
        const clue = await userHelpers.getClue(clueId);
        if (!clue) {
            return res.status(404).send("Clue not found");
        }

        return res.render(`user/tasks/${taskName}`, {
            error: result.error,
            clueId: clue._id,
            taskAnswer: clue.taskAnswer,
            taskName
        });
    }

    if (result.celebration) {
        req.session.gameCompleted = true; // Store flag in session
        return res.redirect("/celebration"); // Redirect to GET route
    }

    req.session.success = result.success; // Store success message in session
    res.redirect(result.nextStep);
});


// GET Method for Celebration Page
router.get("/celebration", async (req, res) => {
    if (!req.session.gameCompleted) {
        return res.redirect("/"); // Redirect to home if game isn't complete
    }

    const userId = req.session.user._id;
    const finalResults = await userHelpers.getFinalResults(userId);

    if (finalResults.error) {
        return res.status(404).send(finalResults.error);
    }

    res.render("user/celebration", {
        teamName: finalResults.teamName,
        totalTime: finalResults.totalTime
    });

    // Clear session after rendering
    req.session.gameCompleted = false;
});



module.exports = router;
