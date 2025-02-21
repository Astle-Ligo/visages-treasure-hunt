var express = require('express');
var router = express.Router();
const adminHelpers = require('../helpers/admin-helpers');

/* Middleware to check if admin is logged in */
function isAdminLoggedIn(req, res, next) {
  if (!req.session.admin) {
    return res.redirect('/admin/admin-login');
  }
  next();
}

/* GET Admin Dashboard */
router.get('/', async (req, res) => {
  console.log("Admin Dashboard Loaded");

  let adminUser = req.session.admin;

  if (!adminUser) {
    try {
      const adminCount = await adminHelpers.findAdminCount();
      return res.render('admin/no-user', { admin: true, count: adminCount.status > 0 });
    } catch (error) {
      console.error("Error checking admin count:", error);
      return res.status(500).send("Internal Server Error");
    }
  }

  try {
    const leaderboard = await adminHelpers.getLeaderboard();

    res.render('admin/admin-dashboard', {
      admin: true,
      adminUser,
      leaderboard,
      homeStatus: true
    });
  } catch (error) {
    console.error("Error loading admin dashboard:", error);
    res.status(500).send("Internal Server Error");
  }
});

/* Admin Signup */
router.get('/admin-signup', (req, res) => {
  res.render('admin/admin-signup', { admin: true });
});

router.post('/admin-signup', async (req, res) => {
  try {
    await adminHelpers.doSignup(req.body);
    res.redirect('/admin');
  } catch (error) {
    console.error("Error signing up admin:", error);
    res.status(500).send("Error signing up admin.");
  }
});

/* Admin Login */
router.get('/admin-login', (req, res) => {
  res.render('admin/admin-login', { admin: true });
});

router.post('/admin-login', async (req, res) => {
  try {
    const response = await adminHelpers.doLogin(req.body);

    if (response.status) {
      req.session.loggedIn = true;
      req.session.admin = response.admin;
      res.redirect('/admin');
    } else {
      res.redirect('/admin-login');
    }
  } catch (error) {
    console.error("Error during admin login:", error);
    res.status(500).send("Error during admin login.");
  }
});

/* Admin Logout */
router.get('/admin-log-out', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error logging out:", err);
      return res.status(500).send("Error logging out.");
    }
    res.redirect('/admin');
  });
});

/* Clues Management */
router.get('/clues', isAdminLoggedIn, async (req, res) => {
  try {
    let adminUser = req.session.admin;
    const clues = await adminHelpers.getAllClues();
    res.render('admin/clues', { admin: true, adminUser, clues });
  } catch (error) {
    console.error("Error fetching clues:", error);
    res.status(500).send("Error fetching clues.");
  }
});

router.get('/add-clue', isAdminLoggedIn, (req, res) => {
  res.render('admin/add-clue', { admin: true, adminUser: req.session.admin });
});

router.post('/add-clue', isAdminLoggedIn, async (req, res) => {
  try {
    await adminHelpers.addClue(req.body);
    res.redirect('/admin/clues');
  } catch (error) {
    console.error("Error adding clue:", error);
    res.status(500).send("Error adding clue.");
  }
});

router.get('/edit-clue/:id', isAdminLoggedIn, async (req, res) => {
  try {
    let clue = await adminHelpers.getClueDetails(req.params.id);
    res.render('admin/edit-clue', { clue, admin: true, adminUser: req.session.admin });
  } catch (error) {
    console.error("Error fetching clue details:", error);
    res.status(500).send("Error fetching clue details.");
  }
});

router.post('/edit-clue/:id', isAdminLoggedIn, async (req, res) => {
  try {
    await adminHelpers.updateClue(req.params.id, req.body);
    res.redirect('/admin/clues');
  } catch (error) {
    console.error("Error updating clue:", error);
    res.status(500).send("Error updating clue.");
  }
});

router.get('/delete-clue/:id', isAdminLoggedIn, async (req, res) => {
  try {
    await adminHelpers.deleteClue(req.params.id);
    res.redirect('/admin/clues');
  } catch (error) {
    console.error("Error deleting clue:", error);
    res.status(500).send("Error deleting clue.");
  }
});

/* Users Management */
router.get('/users', isAdminLoggedIn, async (req, res) => {
  try {
    let adminUser = req.session.admin;
    const users = await adminHelpers.getAllUsers();
    res.render('admin/user-data', { admin: true, adminUser, users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send("Error fetching users.");
  }
});

/* Game Settings */
router.get('/game-settings', isAdminLoggedIn, async (req, res) => {
  try {
    let adminUser = req.session.admin;
    const settings = await adminHelpers.getGameSettings();
    res.render('admin/game-settings', { settings, admin: true, adminUser });
  } catch (error) {
    console.error("Error fetching game settings:", error);
    res.status(500).send("Error fetching game settings.");
  }
});

router.post('/game-settings', isAdminLoggedIn, async (req, res) => {
  try {
    const { gameStartTime } = req.body;
    await adminHelpers.setGameStartTime(gameStartTime);
    res.redirect('/admin/game-settings');
  } catch (error) {
    console.error("Error setting game start time:", error);
    res.status(500).send("Error saving game start time.");
  }
});

/* User Responses */
router.get('/responses', isAdminLoggedIn, async (req, res) => {
  try {
    let adminUser = req.session.admin;
    const responses = await adminHelpers.getUserResponses();
    res.render('admin/responses', { adminUser, admin: true, responses });
  } catch (error) {
    console.error("Error fetching user responses:", error);
    res.status(500).send("Error fetching user responses.");
  }
});

module.exports = router;
