var express = require('express');
var router = express.Router();

const adminHelpers = require('../helpers/admin-helpers');
const userHelpers = require('../helpers/user-helpers');

const { log } = require('handlebars');

/* GET home page. */
router.get('/', (req, res) => {
  console.log("hai");

  let adminUser = req.session.admin
  console.log(adminUser);

  if (adminUser) {
    res.render('admin/admin-dashboard', { admin: true, adminUser })
  } else {
    adminHelpers.findAdminCount().then((result) => {
      if (result.status > 0) {
        res.render('admin/no-user', { admin: true, count: true })
      } else {
        res.render('admin/no-user', { admin: true, count: false })
      }
    })
  }
});


router.get('/admin-signup', (req, res) => {
  res.render('admin/admin-signup', { admin: true });
})

router.post('/admin-signup', (req, res) => {
  adminHelpers.doSignup(req.body).then((response) => {
    res.redirect('/admin')
  })
})

router.get('/admin-login', (req, res) => {
  res.render('admin/admin-login', { admin: true });
})


router.post('/admin-login', (req, res) => {
  adminHelpers.doLogin(req.body).then((response) => {
    console.log(response);

    if (response.status) {
      req.session.loggedIn = true
      req.session.admin = response.admin
      console.log(req.session.admin);
      res.redirect('/admin')
    } else {
      res.redirect('admin/admin-login')
    }
  })
})

router.get('/admin-log-out', (req, res) => {
  req.session.destroy()
  res.redirect('/admin')
})

router.get('/clues', (req, res) => {
  let adminUser = req.session.admin
  adminHelpers.getAllClues().then((clues) => {
    console.log(clues);
    res.render('admin/clues', { admin: true, adminUser, clues })
  })
})

router.get('/users', (req, res) => {
  let adminUser = req.session.admin
  adminHelpers.getAllUsers().then((users) => {
    console.log(users);
    res.render('admin/user-data', { admin: true, adminUser, users })
  })
})


router.get('/add-clue', (req, res) => {
  let adminUser = req.session.admin
  res.render('admin/add-clue', { admin: true, adminUser })
})

router.post('/add-clue', (req, res) => {
  console.log(req.body);

  let adminUser = req.session.admin
  adminHelpers.addClue(req.body, (id) => {
    res.render('admin/add-clue', { admin: true, adminUser })
  })
})

router.get('/delete-clue/:id', (req, res) => {
  let clueId = req.params.id
  adminHelpers.deleteClue(clueId).then((response) => {
    res.redirect('/admin/clues')
  })
})

router.get('/edit-clue/:id', async (req, res) => {
  let adminUser = req.session.admin
  let clue = await adminHelpers.getClueDetails(req.params.id)
  console.log(clue._id)
  res.render('admin/edit-clue', { clue, admin: true, adminUser })
})

router.post('/edit-clue/:id', (req, res) => {
  adminHelpers.updateClue(req.params.id, req.body).then(() => {
    res.redirect('/admin/clues')
  })
})

// timer

router.get("/game-settings", async (req, res) => {
  let adminUser = req.session.admin
  const settings = await adminHelpers.getGameSettings();
  res.render("admin/game-settings", { settings, admin: true, adminUser });
});

router.post("/game-settings", async (req, res) => {
  try {
    const { gameStartTime } = req.body;
    await adminHelpers.setGameStartTime(gameStartTime);
    res.redirect("/admin/game-settings");
  } catch (error) {
    console.error("Error setting game start time:", error);
    res.status(500).send("Error saving game start time.");
  }
});




module.exports = router;
