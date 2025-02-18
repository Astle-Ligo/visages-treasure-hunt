const express = require('express');
const router = express.Router();
const userHelpers = require('../helpers/user-helpers');
const { ObjectId } = require('mongodb');

// GET users listing
router.get('/', async (req, res) => {
    let User = req.session.user;
    if (User) {
<<<<<<< HEAD
        // Fetch the first clue from the database using the helper
        const firstClue = await userHelpers.getFirstClue();
        console.log("hai:", firstClue);
        console.log(User);

        res.render('user/start', { User, user: true, firstClue: firstClue[0] });
=======
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
>>>>>>> 312e538 (backend 95% done)
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
<<<<<<< HEAD
    res.render('user/user-login',);
=======
    res.render('user/user-login');
>>>>>>> 312e538 (backend 95% done)
});

router.post('/user-login', async (req, res) => {
    const response = await userHelpers.doLogin(req.body);
    if (response.status) {
        req.session.loggedIn = true;
        req.session.user = response.user;

        // ✅ Fetch user's current clue to resume from there
        const user = await userHelpers.getUser(response.user._id);
        if (user.currentClueId) {
            res.redirect(`/clue/${user.currentClueId}`);
        } else {
            res.redirect('/');
        }
    } else {
        res.redirect('/user/user-login');
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
    let User = req.session.user;

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

        res.render("user/clue-page", { clue, User, user: true });
    } catch (error) {
        console.error("Error retrieving clue:", error);
        res.status(500).send("Error retrieving clue");
    }
});

// Check Clue Answer (Form Submission)
router.post("/clue/:id", async (req, res) => {
<<<<<<< HEAD
    let User = req.session.user;
    const result = await userHelpers.checkClueAnswer(req.params.id, req.body.answer);
    console.log(result);

    if (result.error) {
        return res.render('user/clue-page', { error: result.error, clueId: req.params.id, clue: result.clue, User, user: true });
=======
    const userId = req.session.user._id;
    const clueId = req.params.id;
    const startTime = req.session.startTime;

    const result = await userHelpers.checkClueAnswer(userId, clueId, req.body.answer, startTime);

    if (result.error) {
        // Fetch the clue again before rendering
        const clue = await userHelpers.getClue(clueId);
        if (!clue) {
            return res.status(404).send("Clue not found");
        }

        return res.render('user/clue-page', {
            error: result.error,
            clueId: clueId,
            clue: clue // Ensure clue details are passed
        });
>>>>>>> 312e538 (backend 95% done)
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
        res.render(`user/tasks/${taskName}`, { clueId: clue._id, taskAnswer: clue.taskAnswer, taskName: taskName });
    } catch (error) {
        console.error("Error fetching task details:", error);
        res.status(500).send("Error fetching task details");
    }
});


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

<<<<<<< HEAD
    router.post("/start-game", async (req, res) => {
        if (!req.session.user) return res.json({ success: false, message: "User not logged in" });

        const startTime = await userHelpers.startGameTimer(req.session.user._id);
        res.json({ success: true, startTime });
    });

    router.get("/get-timer", async (req, res) => {
        if (!req.session.user) return res.json({ success: false });

        const startTime = await userHelpers.getGameTimer(req.session.user._id);
        if (!startTime) return res.json({ success: false });

        res.json({ success: true, startTime });
    });

=======
    if (result.celebration) {
        return res.render('user/celebration', { message: result.message });
    }

    res.redirect(result.nextStep);
>>>>>>> 312e538 (backend 95% done)
});




module.exports = router;
