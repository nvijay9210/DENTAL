const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const validate = require('../middlewares/validate');
// const { userSchema } = require('../validations/schemaValidation/userSchema');


// router.post('/', validate(userSchema), userController.create);
// router.get('/', userController.getAll);
// router.put('/:id', validate(userSchema), userController.update);
// router.delete('/:id', userController.delete);

module.exports = router;
