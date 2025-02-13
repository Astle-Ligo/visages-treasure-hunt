var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function (req, res, next) {
  let user = req.session.user
  if (user) {

    productHelpers.getAllProducts().then((products) => {
      res.render('admin/view-products', { admin: true, products, adminUser, homeStatus: true })
    })
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

module.exports = router;
