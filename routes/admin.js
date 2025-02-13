var express = require('express');
var router = express.Router();

const adminHelpers = require('../helpers/admin-helpers');
const { log } = require('handlebars');

/* GET home page. */
router.get('/', (req, res)=> {
  console.log("hai");
  
  let adminUser = req.session.admin
  console.log(adminUser);
  
  if (adminUser) {
    res.render('admin/admin-dashboard',{admin:true,adminUser})
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


module.exports = router;
